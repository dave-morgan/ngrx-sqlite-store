import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createEntityAdapter } from '../../../entity/src/entity-adapter';
import { createFeatureSelector } from './selectors';
import { querySources } from './metadata';
import type { Where } from '../../../entity/src/query';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { learnedColumns, queryBatch } from './query-batch';
import type { SqlValue } from '../driver/sql-driver';

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

  it('shares inline scans while preserving promoted IDs and bound conditional counts', async () => {
    await driver.exec('CREATE TABLE nss_entity(coll TEXT, id TEXT, data TEXT)');
    for (const [coll, id, data] of [
      ['todos', 'one', '{"done":false}'], ['todos', 'two', '{"done":true}'],
      ['todos', 'three', '{"done":null}'], ['todos', 'large', ''],
      ['todos', 'invalid', 'invalid JSON'], ['other', 'one', '{"done":false}'],
    ]) await driver.run('INSERT INTO nss_entity VALUES (?,?,?)', [coll, id, data]);
    let scans = 0;
    const reader = queryBatch({ query: async <R>(sql: string, params?: SqlValue[]) => {
      const plan = await driver.query<{ detail: string }>('EXPLAIN QUERY PLAN ' + sql, params);
      scans += plan.filter((row) => row.detail.includes('SCAN nss_entity')).length;
      return driver.query<R>(sql, params);
    } });
    const count = (predicate: string, params: SqlValue[]) =>
      reader.query(
        `SELECT id, NULL AS value FROM nss_entity WHERE coll=? AND data='' UNION ALL
         SELECT NULL, COUNT(*) FROM nss_entity WHERE coll=? AND data!='' AND json_valid(data) AND ${predicate}`,
        ['todos', 'todos', ...params], ['id', 'value'], { path: 'todos', predicate, params },
      );
    const [total, open] = await Promise.all([count('1', []), count("json_extract(data,'$.done')=?", [0])]);
    expect(total).toEqual([{ id: 'large', value: null }, { id: null, value: 3 }]);
    expect(open).toEqual([{ id: 'large', value: null }, { id: null, value: 1 }]);
    expect(scans).toBe(2); // one inline scan and one promoted-membership scan, shared by both readers
  });

  it.each([false, true])('keeps collection boundaries and mixed bindings, with SQL fallback=%s', async (fallback) => {
    await driver.exec('CREATE TABLE nss_entity(coll TEXT, id TEXT, data TEXT)');
    await driver.run('INSERT INTO nss_entity VALUES (?,?,?)', ["quoted'collection", 'one', '{"done":false}']);
    const reader = queryBatch({ query: <R>(sql: string, params?: SqlValue[]) => {
      if (fallback && sql.includes('AS MATERIALIZED')) return Promise.reject(new Error('Unsupported CTE'));
      return driver.query<R>(sql, params);
    } });
    const count = (path: string, predicate: string, params: SqlValue[]) => reader.query(
      `SELECT id,NULL AS value FROM nss_entity WHERE coll=? AND data='' UNION ALL
       SELECT NULL,COUNT(*) FROM nss_entity WHERE coll=? AND data!='' AND json_valid(data) AND ${predicate}`,
      [path, path, ...params], ['id', 'value'], { path, predicate, params },
    );
    expect(await Promise.all([
      reader.query('SELECT ? AS label', ['before'], ['label']),
      count("quoted'collection", '1', []), count('missing', '1', []),
      reader.query('SELECT ? AS label', ['between'], ['label']),
      count("quoted'collection", "json_extract(data,'$.done')=?", [0]),
      count('missing', "json_extract(data,'$.done')=?", [1]),
    ])).toEqual([
      [{ label: 'before' }], [{ id: null, value: 1 }], [{ id: null, value: 0 }],
      [{ label: 'between' }], [{ id: null, value: 1 }], [{ id: null, value: 0 }],
    ]);
  });

  it('retains indexed searches when every count is selective', async () => {
    await driver.exec(`CREATE TABLE nss_entity(coll TEXT,id TEXT,data TEXT);
      CREATE INDEX by_done ON nss_entity(coll,json_extract(data,'$.done')) WHERE data!='' AND json_valid(data);`);
    await driver.run('INSERT INTO nss_entity VALUES (?,?,?)', ['todos', 'one', '{"done":false}']);
    let indexedFilters = 0;
    const reader = queryBatch({ query: async <R>(sql: string, params?: SqlValue[]) => {
      const plan = await driver.query<{ detail: string }>('EXPLAIN QUERY PLAN ' + sql, params);
      indexedFilters += plan.filter((row) => row.detail.includes('by_done') && row.detail.includes('<expr>=?')).length;
      return driver.query<R>(sql, params);
    } });
    const count = (done: number) => reader.query(
      `SELECT id,NULL AS value FROM nss_entity WHERE coll=? AND data='' UNION ALL
       SELECT NULL,COUNT(*) FROM nss_entity WHERE coll=? AND data!='' AND json_valid(data) AND json_extract(data,'$.done')=?`,
      ['todos', 'todos', done], ['id', 'value'],
      { path: 'todos', predicate: "json_extract(data,'$.done')=?", params: [done] },
    );
    expect(await Promise.all([count(0), count(1)])).toEqual([[{ id: null, value: 1 }], [{ id: null, value: 0 }]]);
    expect(indexedFilters).toBe(2);
  });

  it.each([false, true])('uses one Boolean JSON lookup in shared counts, preserving scalar semantics and fallback=%s', async (fallback) => {
    await driver.exec('CREATE TABLE nss_entity(coll TEXT,id TEXT,data TEXT)');
    const adapter = createEntityAdapter<{ id: number; value?: unknown }>();
    const rows = [false, true, 0, 1, null, 'false', [], {}, undefined].map((value, id) => ({ id, value }));
    const state = adapter.setAll(rows, adapter.getInitialState());
    const queries = adapter.query(createFeatureSelector<typeof state>('items'));
    for (const row of rows) await driver.run('INSERT INTO nss_entity VALUES (?,?,?)', ['items', String(row.id), JSON.stringify(row)]);
    const statements: string[] = [];
    const reader = queryBatch({ query: <R>(sql: string, params?: SqlValue[]) => {
      statements.push(sql);
      if (fallback && sql.includes('AS MATERIALIZED')) return Promise.reject(new Error('Unsupported CTE'));
      return driver.query<R>(sql, params);
    } });
    const filters: Where[] = [
      { value: false }, { value: true }, { value: { ne: false } },
      { value: { in: [false, 1, null] } }, { not: { or: [{ value: true }, { value: 0 }] } },
    ];
    for (const where of filters) {
      const selected = queries.count(where);
      const results = await Promise.all([
        querySources(queries.count())[0].reader(reader), querySources(selected)[0].reader(reader),
      ]);
      expect(results).toEqual([rows.length, selected({ items: state })]);
    }
    const shared = statements.find((sql) => sql.includes('AS MATERIALIZED'))!;
    expect(shared).toContain("json_type(data, '$.value') = ?");
    expect(shared).not.toContain('json_extract');
    // Fallback still uses the original indexed predicate rather than aggregate metadata.
    if (fallback) expect(statements.some((sql) => sql.includes("json_extract(data, '$.value') IS ?"))).toBe(true);
  });

  it('keeps generated Boolean count filters indexed when no full count is requested', async () => {
    await driver.exec(`CREATE TABLE nss_entity(coll TEXT,id TEXT,data TEXT);
      CREATE INDEX by_done ON nss_entity(coll,json_extract(data,'$.done')) WHERE data!='' AND json_valid(data);`);
    await driver.run('INSERT INTO nss_entity VALUES (?,?,?)', ['todos', 'one', '{"id":1,"done":false}']);
    const adapter = createEntityAdapter<{ id: number; done: boolean }>();
    const initial = adapter.getInitialState();
    const queries = adapter.query(createFeatureSelector<typeof initial>('todos'));
    let searches = 0;
    const reader = queryBatch({ query: async <R>(sql: string, params?: SqlValue[]) => {
      const plan = await driver.query<{ detail: string }>('EXPLAIN QUERY PLAN ' + sql, params);
      searches += plan.filter((row) => row.detail.includes('by_done') && row.detail.includes('<expr>=?')).length;
      return driver.query<R>(sql, params);
    } });
    expect(await Promise.all([false, true].map((done) => querySources(queries.count({ done }))[0].reader(reader)))).toEqual([1, 0]);
    expect(searches).toBe(2);
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
