import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SqlJsDriver } from './sqljs-driver';

describe('SqlJsDriver', () => {
  let driver: SqlJsDriver;
  beforeEach(async () => {
    driver = new SqlJsDriver();
    await driver.open();
    await driver.exec(
      'CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT, data BLOB, optional TEXT)',
    );
  });
  afterEach(async () => {
    await driver.close();
  });

  it('performs parameterized CRUD and returns changes and lastId', async () => {
    const bytes = new Uint8Array([0, 128, 255]);
    expect(
      await driver.run('INSERT INTO test(name, data, optional) VALUES (?, ?, ?)', [
        "a' quote",
        bytes,
        null,
      ]),
    ).toEqual({ changes: 1, lastId: 1 });
    expect(await driver.query('SELECT * FROM test WHERE id = ?', [1])).toEqual([
      { id: 1, name: "a' quote", data: bytes, optional: null },
    ]);
    expect(
      (await driver.run('UPDATE test SET name = ? WHERE id = ?', ['updated', 1])).changes,
    ).toBe(1);
    expect(await driver.query<{ name: string }>('SELECT name FROM test')).toEqual([
      { name: 'updated' },
    ]);
    expect((await driver.run('DELETE FROM test WHERE id = ?', [1])).changes).toBe(1);
    expect(await driver.query('SELECT * FROM test')).toEqual([]);
  });

  it('rolls back and commits explicit transactions', async () => {
    await driver.begin();
    await driver.run('INSERT INTO test(name) VALUES (?)', ['rollback']);
    await driver.rollback();
    expect(await driver.query('SELECT * FROM test')).toEqual([]);
    await driver.begin();
    await driver.run('INSERT INTO test(name) VALUES (?)', ['commit']);
    await driver.commit();
    expect(await driver.query('SELECT name FROM test')).toEqual([{ name: 'commit' }]);
  });

  it('exports data and opens it in another instance', async () => {
    await driver.run('INSERT INTO test(name) VALUES (?)', ['saved']);
    const restored = new SqlJsDriver({ data: driver.export() });
    await restored.open();
    try {
      expect(await restored.query('SELECT name FROM test')).toEqual([{ name: 'saved' }]);
    } finally {
      await restored.close();
    }
  });

  it('frees statements after errors so the database stays usable', async () => {
    await expect(driver.run('INSERT INTO test(id) VALUES (?)', [1])).resolves.toMatchObject({
      changes: 1,
    });
    await expect(driver.run('INSERT INTO test(id) VALUES (?)', [1])).rejects.toThrow();
    expect(await driver.query('SELECT id FROM test')).toEqual([{ id: 1 }]);
  });

  it('rejects operations on a closed connection', async () => {
    await driver.close();
    await expect(driver.query('SELECT 1')).rejects.toThrow('not open');
    expect(() => driver.export()).toThrow('not open');
  });
});
