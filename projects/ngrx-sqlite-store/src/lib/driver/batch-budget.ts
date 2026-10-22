import { utf8ByteLength } from '../schema/utf8';
import type { SqlValue } from './sql-driver';

/** Soft native executeSet transport limit; a single legal row may exceed it. */
export const BATCH_BYTE_BUDGET = 256 * 1024;

/** Includes native field names, UTF-8 and JSON escaping, excluding outer array. */
export function statementByteLength(sql: string, params: SqlValue[] = []): number {
  return utf8ByteLength(JSON.stringify({ statement: sql, values: params }));
}
