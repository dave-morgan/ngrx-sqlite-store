import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import type { SqlExecutor } from '../storage/storage-engine';
import { StorageEngine } from '../storage/storage-engine';
import { brandEntityState, NSS_ENTITY_BRAND } from './entity-brand';
import { getNodeMeta } from './meta';
import { SCHEMA_MIGRATIONS } from './migrations';
import { readSubtreeCte } from './node-reader';
import { NodeStore } from './node-store';
import { StoragePolicy } from './policy';
import { serializedSize } from './size';
import { utf8ByteLength } from './utf8';
import { ChangeSet } from '../storage/change-set';
import { RowWriter } from './row-writer';
import { RowCapExceededError } from './errors';
import { NodeKind } from './kinds';
import { between, initial, needsRenormalise } from './positions';

// Deterministic property generator: failures reproduce without external tooling.
let seed = 0x12345678;
function random(): number {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 0x100000000;
}
const strings = ['', 'a/b', '~', '#key', '😀漢字', '\ud800', '\udfff', '\u0000\n"\\'];
function tree(depth = 0): unknown {
  const choice = Math.floor(random() * (depth >= 6 ? 4 : 6));
  if (choice === 0) return null;
  if (choice === 1) return random() < 0.5;
  if (choice === 2) return (random() - 0.5) * 1e30;
  if (choice === 3) return strings[Math.floor(random() * strings.length)];
  const items = Array.from({ length: Math.floor(random() * 5) }, () => tree(depth + 1));
  return choice === 4 ? items : Object.fromEntries(items.map((v, i) => [strings[i], v]));
}
function assertKeyOrder(actual: unknown, expected: unknown): void {
  if (expected && typeof expected === 'object') {
    expect(Object.keys(actual as object)).toEqual(Object.keys(expected));
    for (const key of Object.keys(expected)) {
      assertKeyOrder(
        (actual as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
      );
    }
  }
}

describe('serialized sizing', () => {
  it('equals JSON UTF-8 bytes for random trees and every UTF-16 code unit', () => {
    for (let i = 0; i < 500; i++) {
      const value = tree();
      expect(serializedSize(value)).toBe(new TextEncoder().encode(JSON.stringify(value)).length);
    }
    for (let i = 0; i <= 0xffff; i++) {
      const value = String.fromCharCode(i);
      expect(serializedSize(value)).toBe(utf8ByteLength(JSON.stringify(value)));
      expect(utf8ByteLength(value)).toBe(new TextEncoder().encode(value).length);
    }
    for (const value of [-0, 1e-7, 1e21, Number.MIN_VALUE, '😀\ud800😀']) {
      expect(serializedSize(value)).toBe(utf8ByteLength(JSON.stringify(value)));
    }
  });

  it('exposes fractional position helpers and detects exhausted precision', () => {
    expect(initial(3)).toEqual([1, 2, 3]);
    expect(between()).toBe(1);
    expect(between(undefined, 1)).toBe(0);
    expect(between(1)).toBe(2);
    expect(between(1, 2)).toBe(1.5);
    expect(needsRenormalise([1, 1 + 1e-10])).toBe(true);
    expect(needsRenormalise([1, 2, 3])).toBe(false);
  });

  it('keeps configurable caps within the hard limit and large enough for scalar JSON', () => {
    expect(() => new StoragePolicy({ rowCap: 2_097_152 })).toThrow('Invalid storage policy');
    expect(() => new StoragePolicy({ rowCap: 6 })).toThrow('Invalid storage policy');
    expect(new StoragePolicy({ rowCap: 32 }).decideKind('f/n', -1.2345678901234567e-123, 1)).toBe(
      NodeKind.Num,
    );
  });
});

describe('schema engine', () => {
  let engine: StorageEngine;
  let store: NodeStore;
  beforeEach(async () => {
    engine = new StorageEngine(new SqlJsDriver(), { migrations: SCHEMA_MIGRATIONS });
    await engine.open();
    store = new NodeStore();
  });
  afterEach(async () => engine.close());
  const path = 'feature';
  async function write(value: unknown) {
    return engine.transaction((tx) => store.write(tx, path, value, tx.changes));
  }
  async function read(): Promise<unknown> {
    return engine.read((sql) => store.read(sql, path));
  }
  async function diff(prev: unknown, next: unknown): Promise<string[]> {
    const statements: string[] = [];
    await engine.transaction(async (tx) => {
      const sql: SqlExecutor = {
        query: tx.query,
        exec: async (text) => {
          statements.push(text);
          await tx.exec(text);
        },
        run: async (text, params) => {
          statements.push(text);
          return tx.run(text, params);
        },
      };
      await store.diffWrite(sql, path, prev, next, tx.changes);
    });
    return statements;
  }

  it('registers exactly the v2 tables and indexes without changing v1', async () => {
    const rows = await engine.read((sql) =>
      sql.query<{ name: string; sql: string }>(
        "SELECT name, sql FROM sqlite_master WHERE name LIKE 'nss_%' ORDER BY name",
      ),
    );
    expect(rows.map((row) => row.name)).toEqual([
      'nss_chunk',
      'nss_entity',
      'nss_entity_order',
      'nss_meta',
      'nss_node',
      'nss_node_parent',
    ]);
    for (const name of ['nss_chunk', 'nss_entity', 'nss_node']) {
      expect(rows.find((row) => row.name === name)?.sql).toContain('WITHOUT ROWID');
    }
  });

  it('round trips random JSON, preserves keys, and agrees with CTE at varied thresholds', async () => {
    for (const threshold of [0, 30, 16_384]) {
      store = new NodeStore(new StoragePolicy({ promotionThreshold: threshold }));
      for (let i = 0; i < 80; i++) {
        const value = { z: tree(), a: tree(), '#key': tree(), 'a/b~': tree(), empty: {}, list: [] };
        await write(value);
        const actual = await read();
        expect(actual).toEqual(value);
        assertKeyOrder(actual, value);
        expect(await engine.read((sql) => readSubtreeCte(sql, path))).toEqual(actual);
        expect(Object.isFrozen(actual)).toBe(true);
        expect(getNodeMeta(actual as object)?.path).toBe(path);
      }
    }
  });

  it('round trips 3 MB strings, large collections and oversize entities without exceeding cap', async () => {
    const huge = '😀"\\\ud800'.repeat(300_000);
    const value = {
      huge,
      items: Array.from({ length: 3000 }, (_, i) => ({ i, text: 'x'.repeat(1024) })),
      entity: brandEntityState({ ids: ['big'], entities: { big: { huge } }, extra: { ok: true } }),
    };
    await write(value);
    expect(await read()).toEqual(value);
    const rows = await engine.read((sql) =>
      sql.query<{ text: string }>(
        'SELECT value AS text FROM nss_node WHERE value IS NOT NULL UNION ALL SELECT data FROM nss_chunk UNION ALL SELECT data FROM nss_entity',
      ),
    );
    expect(rows.every((row) => utf8ByteLength(row.text) <= 1_048_576)).toBe(true);
  }, 30_000);

  it('diffs a leaf with one UPDATE and no-op references with no SQL', async () => {
    await write({ branch: { a: 1, b: 2 } });
    const prev = (await read()) as { branch: { a: number; b: number } };
    expect(await diff(prev, prev)).toEqual([]);
    expect(await diff(prev, { branch: { ...prev.branch, a: 3 } })).toEqual([
      expect.stringMatching(/^UPDATE nss_node SET value/),
    ]);
    expect(await read()).toEqual({ branch: { a: 3, b: 2 } });
  });

  it('keeps arrays minimal for append, prepend, move, remove and duplicate primitive matching', async () => {
    await write({ items: [1, 2, 2, 3] });
    let prev = (await read()) as { items: number[] };
    for (const [next, verb] of [
      [[1, 2, 2, 3, 4], 'INSERT'],
      [[0, 1, 2, 2, 3, 4], 'INSERT'],
      [[4, 0, 1, 2, 2, 3], 'UPDATE'],
      [[4, 0, 1, 2, 3], 'DELETE'],
    ] as const) {
      const sql = await diff(prev, { items: [...next] });
      expect(sql).toHaveLength(1);
      expect(sql[0]).toMatch(
        new RegExp(`^${verb} nss_node|^${verb} INTO nss_node|^${verb} FROM nss_node`),
      );
      expect(await read()).toEqual({ items: next });
      prev = (await read()) as { items: number[] };
    }
  });

  it('matches object array elements by reference and preserves their ids on moves', async () => {
    await write({ items: [{ a: 1 }, { a: 2 }, { a: 3 }] });
    const prev = (await read()) as { items: object[] };
    const ids = getNodeMeta(prev.items)?.elementIds;
    const sql = await diff(prev, { items: [prev.items[2], prev.items[0], prev.items[1]] });
    expect(sql).toHaveLength(1);
    const next = (await read()) as { items: object[] };
    expect(getNodeMeta(next.items)?.elementIds).toEqual([ids?.[2], ids?.[0], ids?.[1]]);
  });

  it('brands entities, keeps typed ids, diffs one entity UPDATE, and diffs extras', async () => {
    await write(
      brandEntityState({
        ids: [1, '1', 'x'],
        entities: { '1': { v: 1 }, x: { v: 2 } },
        extra: true,
      }),
    );
    const prev = (await read()) as {
      ids: (string | number)[];
      entities: Record<string, unknown>;
      extra: boolean;
    };
    expect((prev as unknown as Record<symbol, unknown>)[NSS_ENTITY_BRAND]).toBe(true);
    expect(prev.ids).toEqual([1, '1', 'x']);
    const next = brandEntityState({ ...prev, entities: { ...prev.entities, x: { v: 3 } } });
    expect(await diff(prev, next)).toEqual([expect.stringMatching(/^UPDATE nss_entity SET data/)]);
    expect(await read()).toEqual(next);
    const current = (await read()) as typeof prev;
    await diff(current, brandEntityState({ ...current, ids: ['x', 1], extra: false }));
    expect(await read()).toEqual({
      ids: ['x', 1],
      entities: { x: { v: 3 }, '1': { v: 1 } },
      extra: false,
    });
  });

  it('renormalises repeated insertions and keeps order', async () => {
    await write({ items: [0, 1] });
    for (let i = 2; i < 65; i++) {
      const prev = (await read()) as { items: number[] };
      await diff(prev, { items: [0, i, ...prev.items.slice(1)] });
    }
    const value = (await read()) as { items: number[] };
    expect(value.items).toEqual([0, ...Array.from({ length: 63 }, (_, i) => 64 - i), 1]);
    const positions = [...getNodeMeta(value.items)!.childPos!.values()].sort((a, b) => a - b);
    expect(positions.every((pos, i) => i === 0 || pos > positions[i - 1])).toBe(true);
  });

  it('records the exact changed path and deletes prefixes on segment boundaries', async () => {
    await write({ a: { x: 1 }, ab: { x: 2 } });
    const prev = (await read()) as { a: { x: number }; ab: { x: number } };
    const result = await engine.transaction((tx) =>
      store.diffWrite(tx, path, prev, { ...prev, a: { x: 3 } }, tx.changes),
    );
    expect(result.changes.paths()).toEqual(['feature/a/x']);
    const deleted = await engine.transaction((tx) => store.delete(tx, 'feature/a', tx.changes));
    expect(deleted.changes.paths()).toEqual(['feature/a']);
    expect(await read()).toEqual({ ab: { x: 2 } });
    expect(await engine.read((sql) => store.read(sql, 'feature/a'))).toBeUndefined();
  });

  it('rejects non-JSON values with the exact path and rolls back', async () => {
    const cycle: Record<string, unknown> = {};
    cycle['self'] = cycle;
    for (const bad of [
      NaN,
      Infinity,
      undefined,
      () => 1,
      new Date(),
      new Map(),
      new Set(),
      1n,
      cycle,
    ]) {
      await expect(write({ nested: { bad } })).rejects.toThrow('feature/nested/bad');
      expect(await read()).toBeUndefined();
    }
    await expect(write({ array: [undefined] })).rejects.toThrow('feature/array/0');
  });

  it('honours hints and inline hard caps, handles promotion/demotion, and structural entity opt-in', async () => {
    store = new NodeStore(
      new StoragePolicy({
        rowCap: 100,
        promotionThreshold: 10,
        hints: {
          'obj/nested': 'inline',
          'obj/collection': 'collection',
          entity: 'entity',
        },
      }),
    );
    const value = {
      obj: { nested: { text: 'longer than threshold' }, collection: [] },
      entity: { ids: ['a'], entities: { a: 3 } },
    };
    await write(value);
    let prev = (await read()) as typeof value;
    expect(getNodeMeta(prev.obj.nested)?.kind).toBe(4);
    expect(getNodeMeta(prev.obj.collection)?.kind).toBe(6);
    expect(getNodeMeta(prev.entity)?.kind).toBe(8);
    await diff(prev, { ...prev, obj: { ...prev.obj, nested: { text: '😀'.repeat(100) } } });
    prev = (await read()) as typeof value;
    expect(getNodeMeta(prev.obj.nested)?.kind).toBe(5);
    await diff(prev, value);
    expect(await read()).toEqual(value);
  });

  it('keeps full-write object order, ignores diff reordering and appends added keys', async () => {
    await write({ z: 1, a: 2, m: { __proto__: null, a: 1 } });
    const prev = (await read()) as Record<string, unknown>;
    expect(await diff(prev, { a: 2, z: 1, m: prev['m'] })).toEqual([]);
    await diff(prev, { q: 4, a: 2, z: 1, m: prev['m'] });
    expect(Object.keys((await read()) as object)).toEqual(['z', 'a', 'm', 'q']);
    const unusual = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":1,"#x":{},"":[],"a/b~":2}',
    );
    await write(unusual);
    expect(await read()).toEqual(unusual);
    expect(Object.getPrototypeOf(await read())).toBe(Object.prototype);
  });

  it('updates chunked strings, deletes every backing table, and isolates sibling features', async () => {
    store = new NodeStore(new StoragePolicy({ rowCap: 100 }));
    await write({
      huge: '😀'.repeat(100),
      coll: brandEntityState({ ids: ['a'], entities: { a: 1 } }),
    });
    const prev = (await read()) as { huge: string; coll: object };
    const changed = await engine.transaction((tx) =>
      store.diffWrite(tx, path, prev, { ...prev, huge: '漢'.repeat(100) }, tx.changes),
    );
    expect(changed.changes.paths()).toEqual(['feature/huge']);
    expect(await engine.read((sql) => readSubtreeCte(sql, path))).toEqual(await read());
    await engine.transaction((tx) => store.write(tx, 'feature2', { ok: 1 }, tx.changes));
    await engine.transaction((tx) => store.delete(tx, path, tx.changes));
    expect(await read()).toBeUndefined();
    expect(await engine.read((sql) => store.read(sql, 'feature2'))).toEqual({ ok: 1 });
    for (const table of ['nss_chunk', 'nss_entity']) {
      expect(await engine.read((sql) => sql.query(`SELECT * FROM ${table}`))).toEqual([]);
    }
  });

  it('diffs random duplicate arrays and reports element path changes', async () => {
    await write({ items: [0, 1, 2, 2] });
    for (let i = 0; i < 120; i++) {
      const prev = (await read()) as { items: number[] };
      const next = Array.from({ length: Math.floor(random() * 15) }, () =>
        Math.floor(random() * 6),
      );
      const result = await engine.transaction((tx) =>
        store.diffWrite(tx, path, prev, { items: next }, tx.changes),
      );
      expect(result.changes.paths().every((p) => p.startsWith('feature/items/#'))).toBe(true);
      expect(await read()).toEqual({ items: next });
    }
  });

  it('diffs oversized entities through promotion, demotion, reorder and removal without colliding with extras', async () => {
    store = new NodeStore(new StoragePolicy({ rowCap: 100 }));
    let value = brandEntityState({
      ids: ['x', 'y'],
      entities: { x: { v: 'small' }, y: { v: 'ok' } },
      's:x': true,
      '~2s:x': true,
    });
    await write(value);
    for (const ids of [['y', 'x', 'new'], ['new', 'x'], ['new'], []]) {
      const prev = (await read()) as typeof value;
      const entities = Object.fromEntries(
        ids.map((id) => [id, { v: (id === 'x' ? '😀' : 'z').repeat(iLength(ids.length)) }]),
      );
      value = brandEntityState({ ...value, ids, entities }) as typeof value;
      await diff(prev, value);
      expect(await read()).toEqual(value);
      expect(await engine.read((sql) => readSubtreeCte(sql, path))).toEqual(value);
    }
    function iLength(length: number) {
      return length === 3 ? 300 : 1;
    }
  });

  it('checks all RowWriter value paths and never sends more than 999 parameters', async () => {
    const calls: number[] = [];
    await engine.transaction(async (tx) => {
      const sql: SqlExecutor = {
        ...tx,
        run: (text, params) => {
          calls.push(params?.length ?? 0);
          return tx.run(text, params);
        },
      };
      await store.write(
        sql,
        path,
        { list: Array.from({ length: 1200 }, (_, i) => ({ i })) },
        tx.changes,
      );
      const rows = new RowWriter(sql, new ChangeSet(), 10);
      expect(() =>
        rows.insertNode({
          path: 'bad',
          parent: null,
          kind: NodeKind.Str,
          pos: null,
          value: 'x'.repeat(11),
        }),
      ).toThrow(RowCapExceededError);
      expect(() => rows.insertChunk('bad', 0, 'x'.repeat(11))).toThrow(RowCapExceededError);
      expect(() =>
        rows.insertEntity({ coll: 'bad', id: 's:x', pos: 1, data: 'x'.repeat(11) }),
      ).toThrow(RowCapExceededError);
      await expect(rows.updateValue('bad', 'x'.repeat(11))).rejects.toThrow(RowCapExceededError);
      await expect(rows.updateEntity('bad', 's:x', 'x'.repeat(11))).rejects.toThrow(
        RowCapExceededError,
      );
    });
    expect(Math.max(...calls)).toBeLessThanOrEqual(999);
  });

  it('rejects hidden toJSON hooks rather than measuring a different value than it stores', async () => {
    const value = { a: 1 };
    Object.defineProperty(value, 'toJSON', { value: () => 'different' });
    await expect(write({ value })).rejects.toThrow('feature/value');
  });

  it('attaches metadata and freezes every reconstructed entity container', async () => {
    await write(brandEntityState({ ids: ['x'], entities: { x: { nested: [] } } }));
    const value = (await read()) as { ids: string[]; entities: Record<string, object> };
    for (const container of [value, value.ids, value.entities, value.entities['x']]) {
      expect(getNodeMeta(container)).toBeDefined();
      expect(Object.isFrozen(container)).toBe(true);
    }
  });

  it('enforces the object feature root contract and rejects class array instances', async () => {
    await expect(write([])).rejects.toThrow('feature');
    class CustomArray extends Array {}
    await expect(write({ array: new CustomArray() })).rejects.toThrow('feature/array');
  });

  it('diffs a large promoted dictionary without passing its positions as function arguments', async () => {
    const dictionary = Object.fromEntries(Array.from({ length: 140_000 }, (_, i) => [`k${i}`, i]));
    await write({ dictionary });
    const prev = (await read()) as { dictionary: Record<string, number> };
    const next = { dictionary: { ...prev.dictionary, k1: -1 } };
    expect(await diff(prev, next)).toEqual([expect.stringMatching(/^UPDATE nss_node SET value/)]);
    expect(await engine.read((sql) => store.read(sql, 'feature/dictionary/k1'))).toBe(-1);
  }, 30_000);
});
