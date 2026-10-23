import type { SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

import type { Row, SqlDriver, SqlValue } from './sql-driver';

export interface CapacitorSqliteDriverOptions {
  database: string;
  encrypted?: boolean;
  mode?: string;
  version?: number;
  readonly?: boolean;
}

/**
 * Thin Capacitor adapter. On web the app must register the jeep-sqlite custom
 * element, mount <jeep-sqlite>, await its readiness, and serve sql-wasm.wasm
 * before opening this driver. Web commits are saved to the IndexedDB store.
 */
/**
 * ADR-0066: during streamed bulk transactions the automatic checkpoint is raised so the
 * bulk commit does not checkpoint inline; idle bulk maintenance restores the default.
 * Normal commits keep SQLite's default so the WAL stays bounded if the process dies.
 */
const BULK_AUTOCHECKPOINT_PAGES = 10_000;
const DEFAULT_AUTOCHECKPOINT_PAGES = 1000;

export class CapacitorSqliteDriver implements SqlDriver {
  private sqlite?: SQLiteConnection;
  private web = false;
  private db?: SQLiteDBConnection;
  private android = false;
  /** Pending open-time verification, checked before the next operation resolves. */
  private verification?: Promise<void>;
  /** wal_autocheckpoint is raised for a bulk transaction until idle maintenance. */
  private bulk = false;

  constructor(private readonly options: CapacitorSqliteDriverOptions) {}

  async open(): Promise<void> {
    if (this.db) return;
    const [{ Capacitor }, { CapacitorSQLite, SQLiteConnection }] = await Promise.all([
      import('@capacitor/core'),
      import('@capacitor-community/sqlite'),
    ]);
    this.sqlite ??= new SQLiteConnection(CapacitorSQLite);
    this.web = Capacitor.getPlatform() === 'web';
    this.android = Capacitor.getPlatform() === 'android';
    if (this.web) await this.sqlite.initWebStore();
    const {
      database,
      encrypted = false,
      mode = 'no-encryption',
      version = 1,
      readonly = false,
    } = this.options;
    // isConnection/retrieveConnection are local JS lookups.
    const exists = (await this.sqlite.isConnection(database, readonly)).result ?? false;
    const create = () => this.sqlite!.createConnection(database, encrypted, mode, version, readonly);
    let reused = false;
    let db: SQLiteDBConnection;
    if (!exists && !this.web) {
      // ADR-0066: a fresh process has no native handles, so create optimistically.
      // Native connections outlive the WebView: after a reload, creation reports the
      // surviving handle and the sweep below (ADR-0046) closes it, including any
      // interrupted transaction, before creating again.
      try {
        db = await create();
      } catch (error) {
        if (!/already exists/i.test(error instanceof Error ? error.message : String(error))) throw error;
        await this.sqlite.checkConnectionsConsistency();
        db = await create();
      }
    } else {
      // With an empty JS registry this sweep closes surviving native handles before
      // creating a new one.
      const consistent = (await this.sqlite.checkConnectionsConsistency()).result ?? false;
      reused = consistent && exists;
      db = reused ? await this.sqlite.retrieveConnection(database, readonly) : await create();
    }
    try {
      // ADR-0046: native createConnection allocates a fresh closed handle. Web
      // creation can share an existing underlying DB, so preserve its probes.
      if (reused || this.web) {
        if (!((await db.isDBOpen()).result ?? false)) await db.open();
        // Transaction APIs resolve writable handles only, including on web.
        if (!readonly && (await db.isTransactionActive()).result) await db.rollbackTransaction();
      } else {
        await db.open();
      }
      // ADR-0042: retain the connection's synchronous level; WAL avoids the
      // populated database's rollback-journal cost on every small commit.
      if (Capacitor.getPlatform() === 'android' && !readonly) {
        // ADR-0066: journal mode persists in the file; issue it in order and verify it
        // before the next operation resolves rather than awaiting a round trip here.
        const wal = db.query('PRAGMA journal_mode=WAL').then((mode) => {
          if (mode.values?.[0]?.journal_mode !== 'wal') {
            throw new Error('Android SQLite connection did not enable WAL');
          }
        });
        wal.catch(() => undefined);
        this.verification = wal;
      }
      this.db = db;
    } catch (error) {
      await this.sqlite.closeConnection(database, readonly);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (!this.db) return;
    await this.database.close();
    await this.connection.closeConnection(this.options.database, this.options.readonly ?? false);
    this.db = undefined;
    this.verification = undefined;
    this.bulk = false;
  }

  /** Native Capacitor runs plugin calls in post order on one plugin thread/queue. */
  get pipelined(): boolean {
    return !!this.db && !this.web;
  }

  /** Ordered and unawaited: precedes the bulk transaction's next statements. */
  beginBulk(): void {
    if (!this.android || this.options.readonly || this.bulk) return;
    this.bulk = true;
    this.database.query(`PRAGMA wal_autocheckpoint=${BULK_AUTOCHECKPOINT_PAGES}`).catch((error) =>
      console.error('SQLite wal_autocheckpoint configuration failed', error));
  }

  async releaseBulkMemory(): Promise<void> {
    if (!this.android || this.options.readonly) return;
    await this.verified(this.database.query('PRAGMA wal_checkpoint(TRUNCATE)'));
    await this.database.query('PRAGMA shrink_memory');
    if (this.bulk) {
      this.bulk = false;
      await this.database.query(`PRAGMA wal_autocheckpoint=${DEFAULT_AUTOCHECKPOINT_PAGES}`);
    }
  }

  async checkpoint(): Promise<void> {
    if (!this.android || this.options.readonly) return;
    await this.verified(this.database.query('PRAGMA wal_checkpoint(PASSIVE)'));
  }

  async exec(sql: string): Promise<void> {
    await this.verified(this.database.execute(sql, false));
  }

  async run(sql: string, params: SqlValue[] = []): Promise<{ changes: number; lastId?: number }> {
    const result = await this.verified(this.database.run(sql, params, false));
    return { changes: result.changes?.changes ?? 0, lastId: result.changes?.lastId };
  }

  async batch(
    statements: { sql: string; params?: SqlValue[] }[],
    opts: { transaction: boolean },
  ): Promise<void> {
    await this.verified(this.database.executeSet(
      statements.map(({ sql, params }) => ({
        statement: sql,
        values: params ?? [],
      })),
      opts.transaction,
    ));
    if (this.web && opts.transaction) await this.connection.saveToStore(this.options.database);
  }

  async query<R = Row>(sql: string, params: SqlValue[] = []): Promise<R[]> {
    // Plugin 8.x query has no transaction parameter (its third flag is isSQL92).
    return ((await this.verified(this.database.query(sql, params))).values as R[]) ?? [];
  }

  // Use the plugin's transaction API rather than raw BEGIN/COMMIT so the plugin's own
  // "transaction active" flag stays in sync. On web, jeep-sqlite otherwise treats each
  // statement as standalone and may persist (sql.js export()) mid-transaction, which
  // silently ends it ("cannot commit - no transaction is active").
  async begin(): Promise<void> {
    await this.verified(this.database.beginTransaction());
  }

  async commit(): Promise<void> {
    await this.verified(this.database.commitTransaction());
    if (this.web) await this.connection.saveToStore(this.options.database);
  }

  async rollback(): Promise<void> {
    await this.verified(this.database.rollbackTransaction());
  }

  /** Issue first (ordered), then surface a failed open-time verification instead. */
  private async verified<T>(operation: Promise<T>): Promise<T> {
    if (this.verification) {
      try {
        await this.verification;
        this.verification = undefined;
      } catch (error) {
        operation.catch(() => undefined);
        throw error;
      }
    }
    return operation;
  }

  private get connection(): SQLiteConnection {
    if (!this.sqlite) throw new Error('CapacitorSqliteDriver is not open');
    return this.sqlite;
  }

  private get database(): SQLiteDBConnection {
    if (!this.db) throw new Error('CapacitorSqliteDriver is not open');
    return this.db;
  }
}
