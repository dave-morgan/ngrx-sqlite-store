import { InjectionToken } from '@angular/core';

export type SqlValue = string | number | null | Uint8Array;
export type Row = Record<string, SqlValue>;

export interface SqlDriver {
  /** `firstQuery`: an optional parameterless read the driver may pipeline with open. */
  open(firstQuery?: string): Promise<void>;
  close(): Promise<void>;
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<{ changes: number; lastId?: number }>;
  query<R = Row>(sql: string, params?: SqlValue[]): Promise<R[]>;
  batch?(
    statements: { sql: string; params?: SqlValue[] }[],
    opts: { transaction: boolean },
  ): Promise<void>;
  /**
   * True when the transport executes calls strictly in call order, so a transaction may
   * issue the next `batch` before the previous one resolves (Phase 15f, ADR-0066).
   */
  readonly pipelined?: boolean;
  /** Internal RowWriter deletes may bypass native sync-metadata rewriting. */
  readonly directDeletes?: boolean;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  /** Optional best-effort allocator/WAL reclamation, outside a committed bulk transaction. */
  releaseBulkMemory?(): Promise<void>;
  /** Optional hint before a transaction streams bulk batches; must not await a round trip. */
  beginBulk?(): void;
  /** Optional non-blocking WAL checkpoint, run by the engine when its queue is idle. */
  checkpoint?(): Promise<void>;
}

export const SQL_DRIVER = new InjectionToken<SqlDriver>('ngrx-sqlite-store SqlDriver');
