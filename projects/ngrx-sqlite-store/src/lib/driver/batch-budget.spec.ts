import { describe, expect, it, vi } from 'vitest';
import { statementByteLength } from './batch-budget';
import type { SqlValue } from './sql-driver';

describe('statement byte accounting', () => {
  it('counts escaped UTF-8 bindings exactly without allocating their JSON envelope', () => {
    const sql = 'INSERT INTO sample VALUES ("quoted", ?)';
    const params = ['ascii', '\u0000\n"\\\ud800\udc00\ud800\udc00\udfff😀é', 1.25, -0, NaN, Infinity, null];
    const expected = new TextEncoder().encode(JSON.stringify({ statement: sql, values: params })).length;
    const stringify = vi.spyOn(JSON, 'stringify');
    try {
      expect(statementByteLength(sql, params)).toBe(expected);
      expect(stringify).not.toHaveBeenCalled();
    } finally { stringify.mockRestore(); }
  });

  it('preserves Uint8Array and empty-parameter accounting', () => {
    for (const params of [[], [new Uint8Array([0, 12, 255])], [new Uint8Array()]] satisfies SqlValue[][]) {
      expect(statementByteLength('SELECT ?', params)).toBe(
        new TextEncoder().encode(JSON.stringify({ statement: 'SELECT ?', values: params })).length,
      );
    }
  });
});
