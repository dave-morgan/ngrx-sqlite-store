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
export class CapacitorSqliteDriver implements SqlDriver {
  private sqlite?: SQLiteConnection;
  private web = false;
  private db?: SQLiteDBConnection;
  private android = false;

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
    // Native connections outlive the WebView. With an empty JS registry this sweep
    // closes surviving native handles (including interrupted transactions) before
    // creating a new one. isConnection/retrieveConnection are local JS lookups.
    const consistent = (await this.sqlite.checkConnectionsConsistency()).result ?? false;
    const exists = (await this.sqlite.isConnection(database, readonly)).result ?? false;
    const reused = consistent && exists;
    const db =
      reused
        ? await this.sqlite.retrieveConnection(database, readonly)
        : await this.sqlite.createConnection(database, encrypted, mode, version, readonly);
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
        const mode = await db.query('PRAGMA journal_mode=WAL');
        if (mode.values?.[0]?.journal_mode !== 'wal') {
          throw new Error('Android SQLite connection did not enable WAL');
        }
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
  }

  async releaseBulkMemory(): Promise<void> {
    if (!this.android || this.options.readonly) return;
    await this.database.query('PRAGMA wal_checkpoint(TRUNCATE)');
    await this.database.query('PRAGMA shrink_memory');
  }

  async exec(sql: string): Promise<void> {
    await this.database.execute(sql, false);
  }

  async run(sql: string, params: SqlValue[] = []): Promise<{ changes: number; lastId?: number }> {
    const result = await this.database.run(sql, params, false);
    return { changes: result.changes?.changes ?? 0, lastId: result.changes?.lastId };
  }

  async batch(
    statements: { sql: string; params?: SqlValue[] }[],
    opts: { transaction: boolean },
  ): Promise<void> {
    await this.database.executeSet(
      statements.map(({ sql, params }) => ({
        statement: sql,
        values: params ?? [],
      })),
      opts.transaction,
    );
    if (this.web && opts.transaction) await this.connection.saveToStore(this.options.database);
  }

  async query<R = Row>(sql: string, params: SqlValue[] = []): Promise<R[]> {
    // Plugin 8.x query has no transaction parameter (its third flag is isSQL92).
    return ((await this.database.query(sql, params)).values as R[]) ?? [];
  }

  // Use the plugin's transaction API rather than raw BEGIN/COMMIT so the plugin's own
  // "transaction active" flag stays in sync. On web, jeep-sqlite otherwise treats each
  // statement as standalone and may persist (sql.js export()) mid-transaction, which
  // silently ends it ("cannot commit - no transaction is active").
  async begin(): Promise<void> {
    await this.database.beginTransaction();
  }

  async commit(): Promise<void> {
    await this.database.commitTransaction();
    if (this.web) await this.connection.saveToStore(this.options.database);
  }

  async rollback(): Promise<void> {
    await this.database.rollbackTransaction();
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
