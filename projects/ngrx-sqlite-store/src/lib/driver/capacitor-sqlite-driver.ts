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

  constructor(private readonly options: CapacitorSqliteDriverOptions) {}

  async open(): Promise<void> {
    if (this.db) return;
    const [{ Capacitor }, { CapacitorSQLite, SQLiteConnection }] = await Promise.all([
      import('@capacitor/core'),
      import('@capacitor-community/sqlite'),
    ]);
    this.sqlite ??= new SQLiteConnection(CapacitorSQLite);
    this.web = Capacitor.getPlatform() === 'web';
    if (this.web) await this.sqlite.initWebStore();
    const {
      database,
      encrypted = false,
      mode = 'no-encryption',
      version = 1,
      readonly = false,
    } = this.options;
    const db = await this.sqlite.createConnection(database, encrypted, mode, version, readonly);
    try {
      await db.open();
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

  async exec(sql: string): Promise<void> {
    await this.database.execute(sql, false);
  }

  async run(sql: string, params: SqlValue[] = []): Promise<{ changes: number; lastId?: number }> {
    const result = await this.database.run(sql, params, false);
    return { changes: result.changes?.changes ?? 0, lastId: result.changes?.lastId };
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
