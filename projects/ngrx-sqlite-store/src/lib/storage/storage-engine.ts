import { releaseWrites } from './committed-writes';
import { Inject, Injectable, InjectionToken, Optional, signal } from '@angular/core';
import { Subject } from 'rxjs';

import { SQL_DRIVER } from '../driver/sql-driver';
import { BATCH_BYTE_BUDGET, statementByteLength } from '../driver/batch-budget';
import type { SqlDriver, SqlValue } from '../driver/sql-driver';
import { ChangeSet } from './change-set';
import { WriteQueue } from './write-queue';

export type SqlExecutor = Pick<SqlDriver, 'exec' | 'run' | 'query'> & {
  write?(sql: string, params?: SqlValue[]): Promise<void>;
};

export interface Migration {
  version: number;
  up: (exec: SqlExecutor) => Promise<void>;
}

export interface TxContext extends SqlExecutor {
  changes: ChangeSet;
  afterCommit(callback: () => void | Promise<void>): void;
}

export interface StorageEngineOptions {
  migrations?: Migration[];
}
export const STORAGE_ENGINE_OPTIONS = new InjectionToken<StorageEngineOptions>(
  'ngrx-sqlite-store storage options',
);
const INITIAL_MIGRATION: Migration = {
  version: 1,
  up: async (sql) => {
    await sql.exec(
      'CREATE TABLE IF NOT EXISTS nss_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
    );
  },
};
const BULK_RECLAIM_BYTES = 128 * 1024;
/** Issued-but-unresolved pipelined batches; bounds bridge payload memory (ADR-0039). */
const MAX_INFLIGHT_BATCHES = 2;
/** Queue idle time before WAL maintenance runs (ADR-0066). */
const MAINTENANCE_IDLE_MS = 200;
/** Small commits between idle PASSIVE checkpoints; bounds WAL growth off the commit path. */
const CHECKPOINT_EVERY_COMMITS = 64;

/**
 * Owns a single connection. All lifecycle operations, reads and writes share a
 * FIFO queue so reads only observe committed state. Use the supplied executor
 * inside callbacks: awaiting a nested engine operation would block the queue.
 * afterCommit failures reject the operation but cannot undo a successful commit.
 */
@Injectable()
export class StorageEngine {
  private readonly queue = new WriteQueue();
  private readonly state = signal<'closed' | 'opening' | 'ready' | 'error'>('closed');
  private readonly notifications = new Subject<ChangeSet>();
  readonly status = this.state.asReadonly();
  readonly changes$ = this.notifications.asObservable();
  private maintenance?: Promise<void>;
  private finishMaintenance?: () => void;
  private maintenanceTimer?: ReturnType<typeof setTimeout>;
  private maintenanceKind?: 'bulk' | 'checkpoint';
  private commitsSinceCheckpoint = 0;

  constructor(
    @Inject(SQL_DRIVER) private readonly driver: SqlDriver,
    @Optional() @Inject(STORAGE_ENGINE_OPTIONS) private readonly options?: StorageEngineOptions,
  ) {}

  open(): Promise<void> {
    return this.queue.enqueue(async () => {
      if (this.state() === 'ready') return;
      this.state.set('opening');
      let began = false;
      try {
        const migrations = [INITIAL_MIGRATION, ...(this.options?.migrations ?? [])].sort(
          (a, b) => a.version - b.version,
        );
        const versions = new Set<number>();
        for (const migration of migrations) {
          if (
            !Number.isSafeInteger(migration.version) ||
            migration.version < 1 ||
            versions.has(migration.version)
          ) {
            throw new Error(`Invalid or duplicate migration version: ${migration.version}`);
          }
          versions.add(migration.version);
        }
        await this.driver.open();
        const sql = this.executor();
        const latest = migrations[migrations.length - 1].version;
        const validateVersion = (value: string | undefined) => {
          const version = value === undefined ? 0 : Number(value);
          if (!Number.isSafeInteger(version) || version < 0 || version > latest) {
            throw new Error(`Unsupported schema version: ${value}`);
          }
          return version;
        };
        let existing: { value: string } | undefined;
        try {
          [existing] = await sql.query<{ value: string }>(
            'SELECT value FROM nss_meta WHERE key = ?', ['schema_version'],
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!/no such table:\s*(?:main\.)?nss_meta\b/i.test(message)) throw error;
        }
        if (validateVersion(existing?.value) === latest) {
          this.state.set('ready');
          return;
        }
        await this.driver.begin();
        began = true;
        await INITIAL_MIGRATION.up(sql);
        const [row] = await sql.query<{ value: string }>(
          'SELECT value FROM nss_meta WHERE key = ?',
          ['schema_version'],
        );
        const current = validateVersion(row?.value);
        for (const migration of migrations) {
          if (migration.version <= current) continue;
          if (migration.version !== 1) await migration.up(sql);
          await sql.run('INSERT OR REPLACE INTO nss_meta (key, value) VALUES (?, ?)', [
            'schema_version',
            String(migration.version),
          ]);
        }
        await this.driver.commit();
        began = false;
        this.state.set('ready');
      } catch (error) {
        this.state.set('error');
        try {
          if (began) await this.rollback(error);
        } finally {
          await this.driver.close();
        }
        throw error;
      }
    });
  }

  transaction<T>(fn: (tx: TxContext) => Promise<T>): Promise<{ result: T; changes: ChangeSet }> {
    return this.queue.enqueue(async () => {
      this.assertReady();
      const changes = new ChangeSet();
      const callbacks: Array<() => void | Promise<void>> = [];
      const pending: { sql: string; params?: SqlValue[] }[] = [];
      let pendingBytes = 2; // outer JSON array
      let writtenBytes = 0;
      let began = false;
      const begin = async () => {
        if (!began) {
          await this.driver.begin();
          began = true;
        }
      };
      // Pipelined bulk writes (ADR-0066): with an order-preserving transport the next
      // batch is issued while the previous one executes natively, overlapping JS row
      // encoding with SQLite work. Every read, statement, commit and rollback first
      // drains these, so ordering and atomicity are unchanged.
      const inflight: Promise<void>[] = [];
      let bulk = false;
      const drain = async () => {
        while (inflight.length) await inflight.shift();
      };
      const flush = async () => {
        if (!pending.length) return;
        await begin();
        const statements = pending.splice(0);
        pendingBytes = 2;
        if (this.driver.batch && this.driver.pipelined) {
          if (!bulk) {
            bulk = true;
            this.driver.beginBulk?.();
          }
          const sent = this.driver.batch(statements, { transaction: false });
          sent.catch(() => undefined); // surfaced by drain(); avoid an unhandled rejection
          inflight.push(sent);
          if (inflight.length > MAX_INFLIGHT_BATCHES) await inflight.shift();
        } else if (this.driver.batch) await this.driver.batch(statements, { transaction: false });
        else for (const { sql, params } of statements) await this.driver.run(sql, params);
      };
      const settle = async () => {
        await flush();
        await drain();
      };
      const tx: TxContext = {
        write: async (sql, params) => {
          const bytes = statementByteLength(sql, params);
          writtenBytes += bytes;
          if (pending.length && pendingBytes + 1 + bytes > BATCH_BYTE_BUDGET) await flush();
          pendingBytes += bytes + (pending.length ? 1 : 0);
          pending.push({ sql, params });
          // A single row can legally exceed the soft transport limit.
          if (pendingBytes >= BATCH_BYTE_BUDGET) await flush();
        },
        query: async (sql, params) => {
          await settle();
          if (!/^\s*(SELECT|EXPLAIN)\b/i.test(sql)) await begin();
          return this.driver.query(sql, params);
        },
        run: async (sql, params) => {
          await settle();
          await begin();
          return this.driver.run(sql, params);
        },
        exec: async (sql) => {
          await settle();
          await begin();
          await this.driver.exec(sql);
        },
        changes,
        afterCommit: (callback) => {
          callbacks.push(callback);
        },
      };
      let result: T;
      try {
        // Legacy drivers retain explicit transactions, including read-only ones.
        if (!this.driver.batch) await begin();
        result = await fn(tx);
        if (!began && pending.length && this.driver.batch) {
          await this.driver.batch(pending, { transaction: true });
          pending.length = 0;
        } else {
          await settle();
          if (began) await this.driver.commit();
        }
      } catch (error) {
        pending.length = 0;
        // Native executes in call order; settle every issued batch before rollback.
        await Promise.allSettled(inflight.splice(0));
        releaseWrites(changes);
        if (began) await this.rollback(error);
        // Restore the bulk transaction's checkpoint configuration (ADR-0066).
        if (bulk) this.requestMaintenance('bulk');
        throw error;
      }
      try {
        // ADR-0066: WAL checkpoints and bulk reclamation run when the queue is idle,
        // never between a commit and its notification.
        if (writtenBytes >= BULK_RECLAIM_BYTES || bulk) this.requestMaintenance('bulk');
        else if (writtenBytes > 0 && ++this.commitsSinceCheckpoint >= CHECKPOINT_EVERY_COMMITS)
          this.requestMaintenance('checkpoint');
        else if (this.maintenanceTimer !== undefined) this.postponeMaintenance();
        if (!changes.isEmpty) this.notifications.next(changes);
        for (const callback of callbacks) await callback();
        return { result, changes };
      } finally {
        // Subscribers copied the journal synchronously. A consumer may retain
        // ChangeSet for diagnostics; it must not retain committed input objects.
        releaseWrites(changes);
      }
    });
  }

  /** Queued to avoid seeing uncommitted data on the shared connection. */
  read<T>(fn: (query: SqlExecutor) => Promise<T>): Promise<T> {
    return this.queue.enqueue(async () => {
      this.assertReady();
      return fn(this.executor());
    });
  }

  /** Resolves once no idle maintenance is scheduled or running. */
  async maintained(): Promise<void> {
    while (this.maintenance) await this.maintenance;
  }

  private requestMaintenance(kind: 'bulk' | 'checkpoint'): void {
    if (!(kind === 'bulk' ? this.driver.releaseBulkMemory : this.driver.checkpoint)) return;
    if (kind === 'bulk' || !this.maintenanceKind) this.maintenanceKind = kind;
    this.commitsSinceCheckpoint = 0;
    if (!this.maintenance) {
      let finish!: () => void;
      this.maintenance = new Promise<void>((resolve) => (finish = resolve));
      this.finishMaintenance = finish;
    }
    this.postponeMaintenance();
  }

  /** Debounce: maintenance waits for MAINTENANCE_IDLE_MS without any commit. */
  private postponeMaintenance(): void {
    clearTimeout(this.maintenanceTimer);
    this.maintenanceTimer = setTimeout(() => this.runMaintenance(), MAINTENANCE_IDLE_MS);
  }

  private runMaintenance(): void {
    this.maintenanceTimer = undefined;
    // Busy: retry once the queue has drained and stayed idle.
    if (this.queue.size > 0) {
      this.maintenanceTimer = setTimeout(() => this.runMaintenance(), MAINTENANCE_IDLE_MS);
      return;
    }
    const kind = this.maintenanceKind;
    this.maintenanceKind = undefined;
    void this.queue
      .enqueue(async () => {
        if (this.state() !== 'ready') return;
        try {
          if (kind === 'bulk') await this.driver.releaseBulkMemory?.();
          else await this.driver.checkpoint?.();
        } catch (error) {
          // Maintenance cannot undo a commit or suppress its notifications.
          console.error('SQLite idle maintenance failed', error);
        }
      })
      .finally(() => {
        if (this.maintenanceTimer !== undefined || this.maintenanceKind) return;
        const finish = this.finishMaintenance;
        this.maintenance = undefined;
        this.finishMaintenance = undefined;
        finish?.();
      });
  }

  close(): Promise<void> {
    clearTimeout(this.maintenanceTimer);
    this.maintenanceTimer = undefined;
    this.maintenanceKind = undefined;
    const finish = this.finishMaintenance;
    this.maintenance = undefined;
    this.finishMaintenance = undefined;
    finish?.();
    return this.queue.enqueue(async () => {
      try {
        await this.driver.close();
        this.state.set('closed');
      } catch (error) {
        this.state.set('error');
        throw error;
      }
    });
  }

  private executor(): SqlExecutor {
    return {
      exec: (sql) => this.driver.exec(sql),
      run: (sql, params) => this.driver.run(sql, params),
      query: (sql, params) => this.driver.query(sql, params),
    };
  }

  private assertReady(): void {
    if (this.state() !== 'ready') throw new Error('StorageEngine is not ready');
  }

  private async rollback(original: unknown): Promise<void> {
    try {
      await this.driver.rollback();
    } catch (error) {
      this.state.set('error');
      throw new AggregateError([original, error], 'Transaction and rollback failed');
    }
  }
}
