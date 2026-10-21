import { releaseWrites } from './committed-writes';
import { Inject, Injectable, InjectionToken, Optional, signal } from '@angular/core';
import { Subject } from 'rxjs';

import { SQL_DRIVER } from '../driver/sql-driver';
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
        await this.driver.begin();
        began = true;
        const sql = this.executor();
        await INITIAL_MIGRATION.up(sql);
        const [row] = await sql.query<{ value: string }>(
          'SELECT value FROM nss_meta WHERE key = ?',
          ['schema_version'],
        );
        const current = row ? Number(row.value) : 0;
        if (
          !Number.isSafeInteger(current) ||
          current < 0 ||
          current > migrations[migrations.length - 1].version
        ) {
          throw new Error(`Unsupported schema version: ${row?.value}`);
        }
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
      let began = false;
      const begin = async () => {
        if (!began) {
          await this.driver.begin();
          began = true;
        }
      };
      const flush = async () => {
        if (!pending.length) return;
        await begin();
        if (this.driver.batch) await this.driver.batch(pending, { transaction: false });
        else for (const { sql, params } of pending) await this.driver.run(sql, params);
        pending.length = 0;
      };
      const tx: TxContext = {
        write: async (sql, params) => {
          pending.push({ sql, params });
        },
        query: async (sql, params) => {
          await flush();
          if (!/^\s*(SELECT|EXPLAIN)\b/i.test(sql)) await begin();
          return this.driver.query(sql, params);
        },
        run: async (sql, params) => {
          await flush();
          await begin();
          return this.driver.run(sql, params);
        },
        exec: async (sql) => {
          await flush();
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
          await flush();
          if (began) await this.driver.commit();
        }
      } catch (error) {
        pending.length = 0;
        releaseWrites(changes);
        if (began) await this.rollback(error);
        throw error;
      }
      try {
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

  close(): Promise<void> {
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
