import { afterEach, describe, expect, it } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { StorageEngine } from '../storage/storage-engine';
import { SCHEMA_MIGRATIONS } from './migrations';

describe('promoted entity index upgrade', () => {
  const driver = new SqlJsDriver();
  const engine = new StorageEngine(driver, { migrations: SCHEMA_MIGRATIONS });
  afterEach(async () => engine.close());

  it('upgrades a populated v3 database without changing rows and indexes only promoted rows', async () => {
    await driver.open();
    await driver.exec("CREATE TABLE nss_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL); INSERT INTO nss_meta VALUES('schema_version','3')");
    for (const migration of SCHEMA_MIGRATIONS.filter((migration) => migration.version <= 3))
      await migration.up(driver);
    const rows = [
      { coll: 'todos', id: 'inline', pos: 1, sortkey: null, data: '{"title":"unchanged"}' },
      { coll: 'todos', id: 'promoted', pos: 2, sortkey: 'a', data: '' },
      { coll: 'other', id: 'promoted', pos: 3, sortkey: null, data: '' },
    ];
    for (const row of rows)
      await driver.run('INSERT INTO nss_entity(coll,id,pos,sortkey,data) VALUES (?,?,?,?,?)', Object.values(row));
    await engine.open();
    expect(await driver.query('SELECT * FROM nss_entity ORDER BY coll,id'))
      .toEqual([rows[2], rows[0], rows[1]]);
    const plan = await driver.query<{ detail: string }>(
      "EXPLAIN QUERY PLAN SELECT id FROM nss_entity WHERE coll=? AND data=''", ['todos']);
    expect(plan.some((row) => row.detail.includes('COVERING INDEX nss_entity_promoted'))).toBe(true);
    expect(await driver.query("SELECT id FROM nss_entity WHERE coll=? AND data=''", ['todos']))
      .toEqual([{ id: 'promoted' }]);
    await driver.run("UPDATE nss_entity SET data=? WHERE coll=? AND id=?", ['', 'todos', 'inline']);
    await driver.run("UPDATE nss_entity SET data=? WHERE coll=? AND id=?", ['null', 'todos', 'promoted']);
    expect(await driver.query("SELECT id FROM nss_entity WHERE coll=? AND data=''", ['todos']))
      .toEqual([{ id: 'inline' }]);
    await driver.run('DELETE FROM nss_entity WHERE coll=? AND id=?', ['todos', 'inline']);
    expect(await driver.query("SELECT id FROM nss_entity WHERE coll=? AND data=''", ['todos'])).toEqual([]);
    expect(await driver.query("SELECT value FROM nss_meta WHERE key='schema_version'"))
      .toEqual([{ value: '4' }]);
  });
});
