import { utf8ByteLength } from '../schema/utf8';
import { serializedStringSize } from '../schema/size';
import type { SqlValue } from './sql-driver';

/** Soft native executeSet transport limit; a single legal row may exceed it. */
export const BATCH_BYTE_BUDGET = 256 * 1024;

/** Includes native field names, UTF-8 and JSON escaping, excluding outer array. */
export function statementByteLength(sql: string, params: SqlValue[] = []): number {
  let bytes = '{"statement":'.length + serializedStringSize(sql) + ',"values":['.length + ']}'.length;
  for (const [index, value] of params.entries()) {
    if (index) bytes++;
    if (typeof value === 'string') bytes += serializedStringSize(value);
    else if (typeof value === 'number') bytes += Number.isFinite(value) ? String(value).length : 4;
    else if (value === null) bytes += 4;
    else bytes += utf8ByteLength(JSON.stringify(value));
  }
  return bytes;
}
