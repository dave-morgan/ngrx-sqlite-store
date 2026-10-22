import { afterEach, describe, expect, it, vi } from 'vitest';

import { SqlJsDriver } from '../driver/sqljs-driver';
import { StorageEngine } from '../storage/storage-engine';
import { SCHEMA_MIGRATIONS } from './migrations';
import { RowWriter } from './row-writer';
import type { EntityRow } from './row-writer';

describe('RowWriter bounded bridge groups', () => {
  const driver = new SqlJsDriver();
  const engine = new StorageEngine(driver, { migrations: SCHEMA_MIGRATIONS });
  afterEach(async () => { await engine.close(); vi.restoreAllMocks(); });

  it('reuses canonical entity JSON without parsing again and preserves exact transport bytes and deep values', async () => {
    await engine.open();
    const values = [JSON.stringify({ text: '"\\\n😀', value: [1, null, true] }),
      '['.repeat(950) + '0' + ']'.repeat(950), '"escaped\\u0061"', 'null', 'false', '12'];
    const rows = Array.from({ length: 220 }, (_, id) => ({
      coll: 'todos', id: String(id), pos: id, data: values[id % values.length], sortkey: null,
    }));
    const statements: string[][] = [[], []];
    let phase = 0;
    const batch = driver.batch.bind(driver);
    vi.spyOn(driver, 'batch').mockImplementation(async (pending, options) => {
      statements[phase].push(...pending.map((statement) => JSON.stringify(statement)));
      await batch(pending, options);
    });
    await engine.transaction(async (tx) => {
      await new RowWriter(tx, tx.changes, 1_000_000).writeEntityRows(rows, true);
    });
    phase = 1;
    const parse = vi.spyOn(JSON, 'parse');
    await engine.transaction(async (tx) => {
      await new RowWriter(tx, tx.changes, 1_000_000).writeEntityRows(rows, true, undefined, false, { canonicalJson: true });
    });
    expect(parse.mock.calls.filter(([text]) => values.includes(text))).toEqual([]);
    parse.mockRestore();
    expect(statements[1]).toEqual(statements[0]);
    expect(await engine.read((sql) => sql.query('SELECT coll,id,pos,data,sortkey FROM nss_entity ORDER BY pos'))).toEqual(rows);
  });

  it('enforces the hard UTF-8 cap for canonical entity data before writing', async () => {
    await engine.open();
    await expect(engine.transaction(async (tx) => {
      await new RowWriter(tx, tx.changes, 10).writeEntityRows([
        { coll: 'todos', id: '1', pos: 1, data: JSON.stringify({ value: '😀'.repeat(5) }) },
      ], false, undefined, false, { canonicalJson: true });
    })).rejects.toThrow(/cap/i);
    expect(await engine.read((sql) => sql.query('SELECT * FROM nss_entity'))).toEqual([]);
  });

  it.each([false, true])('bounds multirow insert JSON including escaping (upsert: %s)', async (upsert) => {
    await engine.open();
    const sizes: number[] = [];
    const batch = driver.batch.bind(driver);
    vi.spyOn(driver, 'batch').mockImplementation(async (statements, options) => {
      for (const { sql, params } of statements) {
        sizes.push(new TextEncoder().encode(JSON.stringify([{ statement: sql, values: params ?? [] }])).length);
        expect(params!.length).toBeLessThanOrEqual(999);
      }
      await batch(statements, options);
    });
    const rows = Array.from({ length: 20 }, (_, id) => ({ coll: 'todos', id: String(id), pos: id, data: JSON.stringify({ text: '\"\\\n😀'.repeat(3_000) }) }));
    await engine.transaction(async (tx) => {
      const writer = new RowWriter(tx, tx.changes, 1_000_000);
      if (upsert) await writer.writeEntityRows(rows, true);
      else {
        for (const row of rows) writer.insertEntity(row);
        await writer.flush();
      }
    });
    expect(sizes.length).toBeGreaterThan(1);
    expect(sizes.every((size) => size <= 256 * 1024)).toBe(true);
    expect(await engine.read((sql) => sql.query('SELECT COUNT(*) AS count FROM nss_entity'))).toEqual([{ count: 20 }]);
  });

  it('sends a legal row above the soft transport budget alone', async () => {
    await engine.open();
    const data = '😀'.repeat(100_000);
    await engine.transaction(async (tx) => {
      const writer = new RowWriter(tx, tx.changes, 1_000_000);
      writer.insertEntity({ coll: 'todos', id: '1', pos: 1, data });
      await writer.flush();
    });
    expect(await engine.read((sql) => sql.query('SELECT data FROM nss_entity'))).toEqual([{ data }]);
  });

  it.each(['insert', 'upsert'] as const)('uses bounded JSON bindings with a shared collection for bulk %s with exact stored values', async (mode) => {
    await engine.open();
    const statements: { sql: string; params?: unknown[] }[] = [];
    const batch = driver.batch.bind(driver);
    vi.spyOn(driver, 'batch').mockImplementation(async (pending, options) => {
      statements.push(...pending.map(({ sql, params }) => ({ sql, params: params?.slice() })));
      await batch(pending, options);
    });
    const rows = Array.from({ length: 1_200 }, (_, id) => ({
      coll: 'todos/~escaped',
      id: `${id}/"\\\n😀`,
      pos: id / 3 - 500.25,
      data: id % 17 ? JSON.stringify({ text: '"\\\n😀\u0000'.repeat(8), id }) : '',
      sortkey: id % 2 ? `sort\t${id}😀` : null,
    }));
    await engine.transaction(async (tx) => {
      const writer = new RowWriter(tx, tx.changes, 1_000_000);
      if (mode === 'upsert') await writer.writeEntityRows(rows, true);
      else {
        for (const row of rows) writer.insertEntity(row);
        await writer.flush();
      }
    });
    expect(statements.length).toBeLessThan(Math.ceil(rows.length / 199));
    for (const { sql, params } of statements) {
      expect(sql).toContain('json_each');
      expect(params).toHaveLength(2);
      expect(params![0]).toBe('todos/~escaped');
      expect(new TextEncoder().encode(JSON.stringify([{ statement: sql, values: params }])).length).toBeLessThanOrEqual(256 * 1024);
    }
    expect(await engine.read((sql) => sql.query<EntityRow>('SELECT coll,id,pos,data,sortkey FROM nss_entity ORDER BY pos'))).toEqual(rows);
  });

  it.each([false, true])('preserves duplicate order and conflicts in JSON bulk writes (upsert: %s)', async (upsert) => {
    await engine.open();
    const rows = Array.from({ length: 450 }, (_, index) => ({
      coll: 'todos', id: String(index % 211), pos: index + 0.125,
      data: JSON.stringify({ index }), sortkey: index % 2 ? 'a' : null,
    }));
    await engine.transaction(async (tx) => {
      await new RowWriter(tx, tx.changes, 1_000_000).writeEntityRows(rows, upsert);
    });
    const expected = new Map<string, EntityRow>();
    for (const row of rows) if (upsert || !expected.has(row.id)) expected.set(row.id, row);
    const stored = await engine.read((sql) => sql.query<EntityRow>('SELECT coll,id,pos,data,sortkey FROM nss_entity'));
    expect(new Map(stored.map((row) => [row.id, row]))).toEqual(expected);
  });

  it.each([false, true])('transports raw JSON entity cells without double-escaping their data (upsert: %s)', async (upsert) => {
    await engine.open();
    const data = [
      '{"quoted":"\\\"\\\\😀","nested":[1,null,true]}', '[1,"x",null]',
      '"\\u0061😀"', 'null', 'true', 'false', '1e+20', '-2.50',
      '', 'opaque non-JSON "text"', '{ "x" :  1 }',
    ];
    const rows = Array.from({ length: 450 }, (_, id) => ({ coll: 'todos', id: String(id), pos: id, data: data[id % data.length] }));
    const batch = driver.batch.bind(driver);
    const payloads: unknown[][] = [];
    vi.spyOn(driver, 'batch').mockImplementation(async (pending, options) => {
      for (const { sql, params } of pending) {
        expect(sql).toContain("value -> '$[2][0]'");
        expect(params![0]).toBe('todos');
        payloads.push(...JSON.parse(params![1] as string));
        expect(new TextEncoder().encode(JSON.stringify([{ statement: sql, values: params }])).length).toBeLessThanOrEqual(256 * 1024);
      }
      await batch(pending, options);
    });
    await engine.transaction(async (tx) => {
      const writer = new RowWriter(tx, tx.changes, 1_000_000);
      if (upsert) await writer.writeEntityRows(rows, true);
      else { for (const row of rows) writer.insertEntity(row); await writer.flush(); }
    });
    expect(payloads[0]).toEqual(['0', 0, [JSON.parse(data[0])]]);
    expect(payloads[8][2]).toBeNull();
    expect(payloads[9][2]).toBe(data[9]);
    expect(await engine.read((sql) => sql.query('SELECT coll,id,pos,data FROM nss_entity ORDER BY pos'))).toEqual(rows);
  });

  it('preserves deeply nested valid JSON without adding JSON1 parser depth', async () => {
    await engine.open();
    const data = '['.repeat(1_000) + '0' + ']'.repeat(1_000);
    const rows = Array.from({ length: 200 }, (_, id) => ({ coll: 'todos', id: String(id), pos: id, data }));
    await engine.transaction(async (tx) => {
      const writer = new RowWriter(tx, tx.changes, 1_000_000);
      for (const row of rows) writer.insertEntity(row);
      await writer.flush();
    });
    expect(await engine.read((sql) => sql.query('SELECT data FROM nss_entity'))).toEqual(rows.map(() => ({ data })));
  });

  it.each([false, true])('keeps mixed collections in one ordered transport group (upsert: %s)', async (upsert) => {
    await engine.open();
    const rows = Array.from({ length: 450 }, (_, index) => ({
      coll: index % 2 ? 'other' : 'todos', id: String(index % 17), pos: index,
      data: index % 3 ? JSON.stringify({ index }) : 'opaque',
      sortkey: index % 5 ? null : `sort${index}`,
    }));
    const executeBatch = driver.batch.bind(driver);
    const statements: { sql: string; params?: unknown[] }[] = [];
    const batch = vi.spyOn(driver, 'batch').mockImplementation(async (pending, options) => {
      statements.push(...pending.map(({ sql, params }) => ({ sql, params: params?.slice() })));
      await executeBatch(pending, options);
    });
    await engine.transaction(async (tx) => {
      await new RowWriter(tx, tx.changes, 1_000_000).writeEntityRows(rows, upsert);
    });
    expect(batch).toHaveBeenCalledTimes(1);
    expect(statements).toHaveLength(1);
    expect(statements[0].params).toHaveLength(1);
    const expected = new Map<string, EntityRow>();
    for (const row of rows) {
      const key = `${row.coll}/${row.id}`;
      if (upsert || !expected.has(key)) expected.set(key, row);
    }
    const stored = await engine.read((sql) => sql.query<EntityRow>('SELECT coll,id,pos,data,sortkey FROM nss_entity'));
    expect(new Map(stored.map((row) => [`${row.coll}/${row.id}`, row]))).toEqual(expected);
  });

  it('keeps a legal oversized JSON bulk row alone and rolls back every flushed chunk', async () => {
    await engine.open();
    const lengths: { bytes: number; rows: number }[] = [];
    const batch = driver.batch.bind(driver);
    vi.spyOn(driver, 'batch').mockImplementation(async (pending, options) => {
      for (const { sql, params } of pending) {
        expect(params).toHaveLength(2);
        lengths.push({
          bytes: new TextEncoder().encode(JSON.stringify([{ statement: sql, values: params }])).length,
          rows: JSON.parse(params![1] as string).length,
        });
      }
      await batch(pending, options);
    });
    const rows = Array.from({ length: 450 }, (_, id) => ({
      coll: 'todos', id: String(id), pos: id, data: id === 212 ? '😀'.repeat(100_000) : 'small',
    }));
    const notify = vi.fn();
    engine.changes$.subscribe(notify);
    await expect(engine.transaction(async (tx) => {
      const writer = new RowWriter(tx, tx.changes, 1_000_000);
      for (const row of rows) writer.insertEntity(row);
      await writer.flush();
      expect(await tx.query('SELECT COUNT(*) AS count FROM nss_entity')).toEqual([{ count: rows.length }]);
      throw new Error('after all chunks');
    })).rejects.toThrow('after all chunks');
    expect(lengths.some(({ bytes, rows }) => bytes > 256 * 1024 && rows === 1)).toBe(true);
    expect(lengths.every(({ bytes, rows }) => bytes <= 256 * 1024 || rows === 1)).toBe(true);
    expect(await engine.read((sql) => sql.query('SELECT * FROM nss_entity'))).toEqual([]);
    expect(notify).not.toHaveBeenCalled();
  });
});
