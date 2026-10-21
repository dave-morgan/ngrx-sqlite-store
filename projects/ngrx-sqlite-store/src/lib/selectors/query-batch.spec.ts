import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { learnedColumns, queryBatch } from './query-batch';

describe('bounded query transport', () => {
  let driver: SqlJsDriver;
  beforeEach(async () => {
    driver = new SqlJsDriver();
    await driver.open();
  });
  afterEach(async () => {
    await driver.close();
  });

  it.each([40, 70])('splits independent reads at the statement/bind limits (%s)', async (width) => {
    let calls = 0;
    const reader = queryBatch({
      query: (sql, params) => {
        calls++;
        return driver.query(sql, params);
      },
    });
    const count = width === 40 ? 40 : 20;
    const bindings = width === 40 ? 1 : 70;
    const results = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        reader.query<{ total: number }>(
          `SELECT ${Array.from({ length: bindings }, () => '?').join('+')} AS total`,
          Array.from({ length: bindings }, () => i),
          ['total'],
        ),
      ),
    );
    expect(results).toEqual(Array.from({ length: count }, (_, i) => [{ total: i * bindings }]));
    expect(calls).toBe(2);
  });

  it('binds values and JSON keys while quoting transport column names', async () => {
    const reader = queryBatch(driver);
    const value = "x'; DROP TABLE test; -- ? 😀";
    expect(await reader.query('SELECT ? AS "a""b"', [value], ['a"b'])).toEqual([{ 'a"b': value }]);
  });

  it('preserves BLOB results when JSON transport is unavailable', async () => {
    const reader = queryBatch(driver);
    const results = await Promise.all([
      reader.query('SELECT CAST(? AS BLOB) AS value', ['abc'], ['value']),
      reader.query('SELECT ? AS value', [7], ['value']),
    ]);
    expect(results).toEqual([[{ value: new Uint8Array([97, 98, 99]) }], [{ value: 7 }]]);
  });

  it('learns explicit unique aliases with nested expressions and quoted strings only', () => {
    expect(
      learnedColumns('SELECT coalesce(?, ?) AS "from", \'comma, from\' AS text FROM nss_entity', {
        from: 2,
        text: 'comma, from',
      }),
    ).toEqual(['from', 'text']);
    expect(learnedColumns('SELECT 1 AS x, 2 AS X', { x: 1, X: 2 })).toBeUndefined();
    expect(learnedColumns('SELECT * FROM a JOIN b', { x: 2 })).toBeUndefined();
    expect(learnedColumns('SELECT 1 AS x /* comment */', { x: 1 })).toBeUndefined();
    expect(learnedColumns('SELECT ? AS x', { x: new Uint8Array() })).toBeUndefined();
  });
});
