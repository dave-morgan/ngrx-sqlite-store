import type { Database, InitSqlJsStatic, SqlJsStatic } from 'sql.js';

import type { Row, SqlDriver, SqlValue } from './sql-driver';

export interface SqlJsDriverOptions {
  sqlJs?: () => Promise<SqlJsStatic>;
  data?: Uint8Array;
  locateFile?: (file: string) => string;
}

/** SQLite in WASM. Browser apps must serve the WASM file and supply locateFile. */
export class SqlJsDriver implements SqlDriver {
  private db?: Database;

  constructor(private readonly options: SqlJsDriverOptions = {}) {}

  async open(): Promise<void> {
    if (this.db) return;
    const sql = this.options.sqlJs ? await this.options.sqlJs() : await this.loadSqlJs();
    this.db = new sql.Database(this.options.data);
  }

  async close(): Promise<void> {
    this.db?.close();
    this.db = undefined;
  }

  async exec(sql: string): Promise<void> {
    this.database.exec(sql);
  }

  async run(sql: string, params: SqlValue[] = []): Promise<{ changes: number; lastId?: number }> {
    const db = this.database;
    const statement = db.prepare(sql);
    try {
      statement.bind(params);
      while (statement.step()) {
        /* Drain statements with RETURNING clauses. */
      }
    } finally {
      statement.free();
    }
    const changes = db.getRowsModified();
    const [row] = await this.query<{ lastId: number }>('SELECT last_insert_rowid() AS lastId');
    return { changes, lastId: row.lastId };
  }

  async query<R = Row>(sql: string, params: SqlValue[] = []): Promise<R[]> {
    const statement = this.database.prepare(sql);
    try {
      statement.bind(params);
      const rows: R[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as R);
      return rows;
    } finally {
      statement.free();
    }
  }

  begin(): Promise<void> {
    return this.exec('BEGIN IMMEDIATE');
  }
  commit(): Promise<void> {
    return this.exec('COMMIT');
  }
  rollback(): Promise<void> {
    return this.exec('ROLLBACK');
  }

  export(): Uint8Array {
    return this.database.export();
  }

  private get database(): Database {
    if (!this.db) throw new Error('SqlJsDriver is not open');
    return this.db;
  }

  private async loadSqlJs(): Promise<SqlJsStatic> {
    // Keep Node builtins out of browser bundles. Native require also bypasses
    // Angular's browser-conditioned sql.js bundle when running under jsdom.
    const node = (
      globalThis as typeof globalThis & {
        process?: {
          getBuiltinModule?: (name: string) => {
            createRequire: (url: string) => {
              (name: string): InitSqlJsStatic;
              resolve: (name: string) => string;
            };
          };
        };
      }
    ).process;
    if (node?.getBuiltinModule) {
      const require = node.getBuiltinModule('module').createRequire(import.meta.url);
      return require('sql.js')({
        locateFile: this.options.locateFile ?? (() => require.resolve('sql.js/dist/sql-wasm.wasm')),
      });
    }
    const { default: initSqlJs } = await import('sql.js');
    return initSqlJs({ locateFile: this.options.locateFile });
  }
}
