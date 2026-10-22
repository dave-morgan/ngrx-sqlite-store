import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compileWhere } from '../../../entity/src/query';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { createEntityAdapter } from '../../../entity/src/entity-adapter';
import { ensureQueryIndexes } from './query-indexes';

describe('declarative entity query indexes', () => {
  let driver: SqlJsDriver;
  beforeEach(async () => {
    driver = new SqlJsDriver();
    await driver.open();
    await driver.exec(`CREATE TABLE nss_entity(coll TEXT,id TEXT,data TEXT);
      CREATE INDEX test_done ON nss_entity(coll,json_extract(data,'$.done')) WHERE data != '' AND json_valid(data);`);
    for (const [id, value] of [false, true, 0, null, 'false', {}].entries())
      await driver.run('INSERT INTO nss_entity VALUES (?,?,?)', [
        'todos',
        String(id),
        JSON.stringify({ done: value }),
      ]);
    await driver.run('INSERT INTO nss_entity VALUES (?,?,?)', ['todos', 'promoted', '']);
  });
  afterEach(async () => driver.close());

  it('indexes nested collection extras without indexing opaque rows', async () => {
    await driver.exec('DROP INDEX test_done');
    const outer = createEntityAdapter<{ id: number }>({ query: { index: ['done'] } });
    const nested = createEntityAdapter<{ id: number }>({ query: { index: ['userId'] } });
    await ensureQueryIndexes(driver, outer.getInitialState({ nested: nested.getInitialState() }));
    const indexes = await driver.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE name GLOB 'nss_query_*'",
    );
    expect(indexes).toHaveLength(2);
    await expect(
      driver.run('INSERT INTO nss_entity VALUES (?,?,?)', ['opaque', '1', 'not JSON']),
    ).resolves.toMatchObject({ changes: 1 });
  });

  it('upgrades populated databases once and bounds declared fields', async () => {
    const adapter = createEntityAdapter<{ id: number; done: boolean }>({
      query: { index: ['done'] },
    });
    const initial = { todos: adapter.getInitialState() };
    await ensureQueryIndexes(driver, initial);
    await ensureQueryIndexes(driver, initial);
    const indexes = await driver.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'nss_query_%'",
    );
    expect(indexes).toHaveLength(1);
    expect(() =>
      createEntityAdapter({ query: { index: ["done'); DROP TABLE nss_entity;--"] } }),
    ).toThrow();
    expect(() =>
      createEntityAdapter({ query: { index: Array.from({ length: 9 }, (_, i) => `field${i}`) } }),
    ).toThrow();
  });

  it('rejects a persisted index name with a conflicting definition', async () => {
    const adapter = createEntityAdapter<{ id: number }>({ query: { index: ['done'] } });
    await driver.exec('CREATE INDEX nss_query_646f6e65 ON nss_entity(id)');
    await expect(ensureQueryIndexes(driver, adapter.getInitialState())).rejects.toThrow(
      'Conflicting query index',
    );
  });

  it('uses the declared expression index for typed equality', async () => {
    const filter = compileWhere({ done: false });
    const sql = `SELECT id FROM nss_entity WHERE coll = ? AND data != '' AND json_valid(data) AND ${filter.sql}`;
    expect(await driver.query(sql, ['todos', ...filter.params])).toEqual([{ id: '0' }]);
    const plan = await driver.query<{ detail: string }>(`EXPLAIN QUERY PLAN ${sql}`, [
      'todos',
      ...filter.params,
    ]);
    expect(plan.map((row) => row.detail).join(' ')).toContain('<expr>=?');
  });

  it.each([
    { not: { done: false } },
    { done: { ne: false } },
    { done: null },
    { done: { in: [false, null, 0] } },
  ])('keeps SQL predicates two valued and type strict: %j', async (where) => {
    const filter = compileWhere(where);
    const rows = await driver.query<{ id: string; data: string }>(
      `SELECT id,data FROM nss_entity WHERE data != ''`,
    );
    const actual = await driver.query<{ id: string }>(
      `SELECT id FROM nss_entity WHERE data != '' AND ${filter.sql}`,
      filter.params,
    );
    expect(actual.map((row) => row.id).sort()).toEqual(
      rows
        .filter((row) => filter.test(JSON.parse(row.data)))
        .map((row) => row.id)
        .sort(),
    );
  });
});
