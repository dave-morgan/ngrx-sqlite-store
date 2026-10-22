import { InjectionToken } from '@angular/core';

export type SqlValue = string | number | null | Uint8Array;
export type Row = Record<string, SqlValue>;

export interface SqlDriver {
  open(): Promise<void>;
  close(): Promise<void>;
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<{ changes: number; lastId?: number }>;
  query<R = Row>(sql: string, params?: SqlValue[]): Promise<R[]>;
  batch?(
    statements: { sql: string; params?: SqlValue[] }[],
    opts: { transaction: boolean },
  ): Promise<void>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  /** Optional best-effort allocator/WAL reclamation, outside a committed bulk transaction. */
  releaseBulkMemory?(): Promise<void>;
}

export const SQL_DRIVER = new InjectionToken<SqlDriver>('ngrx-sqlite-store SqlDriver');
