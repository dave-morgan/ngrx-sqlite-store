import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { getNodeMeta } from '../schema/meta';
import { NodeStore } from '../schema/node-store';
import { StoragePolicy } from '../schema/policy';
import { PathCache } from '../selectors/path-cache';
import { StorageEngine } from '../storage/storage-engine';
import { provideStore } from '../store/provide';
import { SqliteStoreCore } from '../store/core';
import { Store } from '../store/store';
import { StoreTx } from './store-tx';

describe('known-write cache metadata', () => {
  let driver: SqlJsDriver;
  let engine: StorageEngine;
  let cache: PathCache;
  let nodes: NodeStore;
  beforeEach(async () => {
    driver = new SqlJsDriver();
    TestBed.configureTestingModule({ providers: [provideStore({}, { sqlite: { driver } })] });
    await TestBed.inject(Store).settle();
    engine = TestBed.inject(SqliteStoreCore).engine;
    cache = TestBed.inject(PathCache);
    nodes = new NodeStore(new StoragePolicy({ hints: { '**': 'collection' } }));
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
    await engine.close();
    vi.restoreAllMocks();
  });
  const initial = () => ({
    form: { name: 'Ada', details: { city: 'London' } },
    validation: { one: true, two: false },
    error: null,
    status: 'idle',
  });
  async function seed(value: unknown = initial()) {
    await engine.transaction((sql) => nodes.write(sql, 'flow', value, sql.changes));
    await cache.ensure('flow/form');
    await cache.ensure('flow/validation');
  }
  for (const active of [false, true]) {
    it(`keeps canonical child positions after ${active ? 'active' : 'inactive'} known-write splicing`, async () => {
      await seed();
      const old = cache.peek('flow/form');
      const oldPositions = [...getNodeMeta(old)!.childPos!];
      const release = active ? cache.retain('flow/form') : undefined;
      await engine.transaction(async (sql) => {
        const tx = new StoreTx('flow', nodes, sql, sql.changes, new Map(), cache);
        const form = await tx.get<Record<string, unknown>>('form');
        await tx.set('form', { ...form, added: 7 });
      });
      await cache.refresh();
      const current = cache.peek('flow/form');
      expect(current).toEqual({ ...initial().form, added: 7 });
      expect([...getNodeMeta(current)!.childPos!]).toEqual([
        ['name', 1], ['details', 2], ['added', 3],
      ]);
      expect([...getNodeMeta(old)!.childPos!]).toEqual(oldPositions);
      await engine.transaction(async (sql) => {
        const tx = new StoreTx('flow', nodes, sql, sql.changes, new Map(), cache);
        await tx.set('form', { ...await tx.get<Record<string, unknown>>('form'), before: 8 });
      });
      expect(await engine.read((sql) => nodes.read(sql, 'flow/form')))
        .toEqual({ ...initial().form, added: 7, before: 8 });
      const rows = await engine.read((sql) => sql.query<{ path: string; pos: number }>(
        'SELECT path,pos FROM nss_node WHERE parent=? ORDER BY pos', ['flow/form']));
      expect(rows.map(row => row.pos)).toEqual([1, 2, 3, 4]);
      release?.();
    });
  }
  it('keeps same-key delete/re-add positions canonical without changing prior metadata', async () => {
    await seed();
    const release = cache.retain('flow/form');
    const old = cache.peek('flow/form');
    const oldMeta = getNodeMeta(old)!;
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('flow', nodes, sql, sql.changes, new Map(), cache);
      await tx.set('form', { ...initial().form, tail: 1 });
    });
    await cache.refresh();
    const before = cache.peek('flow/form');
    expect(getNodeMeta(before)!.childPos!.get('tail')).toBe(3);
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('flow', nodes, sql, sql.changes, new Map(), cache);
      await tx.delete('form/name');
      await tx.set('form', { ...await tx.get<Record<string, unknown>>('form'), name: 'Ada' });
    });
    await cache.refresh();
    const current = cache.peek('flow/form');
    const loaded = await engine.read((sql) => nodes.read(sql, 'flow/form'));
    expect([...getNodeMeta(current)!.childPos!]).toEqual([...getNodeMeta(loaded)!.childPos!]);
    expect([...getNodeMeta(old)!.childPos!]).toEqual([...oldMeta.childPos!]);
    expect(getNodeMeta(before)!.childPos!.get('name')).toBe(1);
    expect(getNodeMeta(current)!.childPos!.get('name')).toBe(4);
    release();
  });
  it('reconciles a nested changed parent while keeping prior metadata isolated', async () => {
    await seed();
    const release = cache.retain('flow/form');
    const old = cache.peek('flow/form') as ReturnType<typeof initial>['form'];
    const oldPositions = [...getNodeMeta(old.details)!.childPos!];
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('flow', nodes, sql, sql.changes, new Map(), cache);
      const form = await tx.get<ReturnType<typeof initial>['form']>('form');
      await tx.set('form', { ...form, details: { ...form.details, extra: 4 } });
    });
    await cache.refresh();
    const current = cache.peek('flow/form') as { details: object };
    expect([...getNodeMeta(current.details)!.childPos!]).toEqual([['city', 1], ['extra', 2]]);
    expect([...getNodeMeta(old.details)!.childPos!]).toEqual(oldPositions);
    release();
  });
  it('uses canonical positions for same-count replacements from a known ancestor above the owner', async () => {
    await seed();
    const release = cache.retain('flow/form');
    const old = cache.peek('flow/form');
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('flow', nodes, sql, sql.changes, new Map(), cache);
      const value = await tx.get<ReturnType<typeof initial>>();
      await tx.set('', { ...value, form: { name: value.form.name, replacement: { city: 'Paris' } } });
    });
    await cache.refresh();
    const current = cache.peek('flow/form');
    expect(current).toEqual({ name: 'Ada', replacement: { city: 'Paris' } });
    expect([...getNodeMeta(current)!.childPos!]).toEqual([['name', 1], ['replacement', 3]]);
    expect([...getNodeMeta(old)!.childPos!]).toEqual([['name', 1], ['details', 2]]);
    expect(Object.keys(current as object)).toEqual(['name', 'replacement']);
    release();
  });
  it('keeps cached enumeration in persisted order when an added key is prepended in the input', async () => {
    await seed();
    const release = cache.retain('flow/form');
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('flow', nodes, sql, sql.changes, new Map(), cache);
      const form = await tx.get<Record<string, unknown>>('form');
      await tx.set('form', { added: 7, ...form });
    });
    await cache.refresh();
    const current = cache.peek('flow/form') as object;
    const persisted = await engine.read((sql) => nodes.read(sql, 'flow/form')) as object;
    expect(Object.keys(current)).toEqual(['name', 'details', 'added']);
    expect(Object.keys(current)).toEqual(Object.keys(persisted));
    expect([...getNodeMeta(current)!.childPos!]).toEqual([...getNodeMeta(persisted)!.childPos!]);
    release();
  });
  it('keeps persisted order for an exact known object replacement with unchanged positions', async () => {
    await seed();
    const release = cache.retain('flow/form');
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('flow', nodes, sql, sql.changes, new Map(), cache);
      const form = await tx.get<ReturnType<typeof initial>['form']>('form');
      await tx.set('form', { details: form.details, name: form.name });
    });
    await cache.refresh();
    expect(Object.keys(cache.peek('flow/form') as object)).toEqual(['name', 'details']);
    release();
  });
  it('keeps ordinary known scalar writes on the existing read-free splice path', async () => {
    await seed();
    const release = cache.retain('flow/form');
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('flow', nodes, sql, sql.changes, new Map(), cache);
      await tx.set('form', { ...await tx.get<Record<string, unknown>>('form'), name: 'Grace' });
    });
    const queries = vi.spyOn(driver, 'query');
    await cache.refresh();
    expect(cache.peek('flow/form')).toEqual({ ...initial().form, name: 'Grace' });
    expect(queries).not.toHaveBeenCalled();
    release();
  });
  for (const mode of ['addition', 'readd', 'reorder'] as const) {
    it(`repairs known ${mode} metadata and order without a refresh SQL read`, async () => {
      await seed();
      const release = cache.retain('flow/form');
      await engine.transaction(async (sql) => {
        const tx = new StoreTx('flow', nodes, sql, sql.changes, new Map(), cache);
        const form = await tx.get<ReturnType<typeof initial>['form']>('form');
        if (mode === 'addition') await tx.set('form', { added: 7, ...form });
        else if (mode === 'reorder') await tx.set('form', { details: form.details, name: form.name });
        else {
          await tx.delete('form/name');
          await tx.set('form', { ...await tx.get<Record<string, unknown>>('form'), name: 'Ada' });
        }
      });
      const queries = vi.spyOn(driver, 'query');
      await cache.refresh();
      expect(queries).not.toHaveBeenCalled();
      const current = cache.peek('flow/form') as object;
      const persisted = await engine.read((sql) => nodes.read(sql, 'flow/form')) as object;
      expect(current).toEqual(persisted);
      expect(Object.keys(current)).toEqual(Object.keys(persisted));
      expect([...getNodeMeta(current)!.childPos!]).toEqual([...getNodeMeta(persisted)!.childPos!]);
      release();
    });
  }
  it('preserves escaped, integer and own __proto__ keys in canonical known object order', async () => {
    const form = JSON.parse('{"2":2,"10":10,"a/b":1,"~slot":2,"__proto__":3}');
    await seed({ ...initial(), form });
    const release = cache.retain('flow/form');
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('flow', nodes, sql, sql.changes, new Map(), cache);
      await tx.set('form', { added: 7, ...await tx.get<Record<string, unknown>>('form') });
    });
    await cache.refresh();
    const current = cache.peek('flow/form') as Record<string, unknown>;
    const persisted = await engine.read((sql) => nodes.read(sql, 'flow/form')) as object;
    expect(current).toEqual(persisted);
    expect(Object.keys(current)).toEqual(Object.keys(persisted));
    expect(Object.hasOwn(current, '__proto__')).toBe(true);
    expect(current['__proto__']).toBe(3);
    expect(Object.getPrototypeOf(current)).toBe(Object.prototype);
    expect([...getNodeMeta(current)!.childPos!]).toEqual([...getNodeMeta(persisted)!.childPos!]);
    release();
  });
  for (const nested of [false, true]) {
    it(`keeps new descendants immutable after ${nested ? 'nested' : 'root'} canonical ordering in production`, async () => {
      await seed({ ...initial(), form: null });
      const release = cache.retain('flow/form');
      vi.stubGlobal('ngDevMode', false);
      await engine.transaction(async (sql) => {
        const tx = new StoreTx('flow', nodes, sql, sql.changes, new Map(), cache);
        if (nested) {
          await tx.set('form', { a: { first: { x: 0 }, last: 0 }, b: 0 });
          await tx.set('form', { a: { last: 0, first: { x: 1 } }, b: 0 });
        } else {
          await tx.set('form', { a: { x: 0 }, b: 0 });
          await tx.set('form', { b: 0, a: { x: 1 } });
        }
      });
      await cache.refresh();
      const current = cache.peek('flow/form') as { a: { x: number; first: { x: number } } };
      const descendant = nested ? current.a.first : current.a;
      expect(Reflect.set(descendant, 'x', 99)).toBe(false);
      expect(descendant.x).toBe(1);
      expect(current).toEqual(await engine.read((sql) => nodes.read(sql, 'flow/form')));
      release();
    });
  }
});
