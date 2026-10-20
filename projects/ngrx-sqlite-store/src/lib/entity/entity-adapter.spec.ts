import { createEntityAdapter as createClassicAdapter } from '@ngrx/entity';
import type { EntityAdapter as ClassicAdapter, EntityMapOne, EntityState, Update } from '@ngrx/entity';
import { createAction, props, Store as NgrxStore } from '@ngrx/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEntityAdapter } from '../../../entity/src/entity-adapter';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { createReducer, on, onState, runHandlers } from '../reducer/reducer';
import { StoreTx } from '../reducer/store-tx';
import { brandEntityState, NSS_ENTITY_BRAND } from '../schema/entity-brand';
import { SCHEMA_MIGRATIONS } from '../schema/migrations';
import { NodeStore } from '../schema/node-store';
import { createFeatureSelector } from '../selectors/selectors';
import { StorageEngine } from '../storage/storage-engine';
import { SqliteStoreCore } from '../store/core';
import { provideStore } from '../store/provide';
import { Store } from '../store/store';

interface Item { id: string | number; rank: number; name: string; payload?: string }
type Adapter = ReturnType<typeof createEntityAdapter<Item>>;

describe('dual-form entity adapter', () => {
  let engine: StorageEngine;
  let nodes: NodeStore;
  beforeEach(async () => {
    engine = new StorageEngine(new SqlJsDriver(), { migrations: SCHEMA_MIGRATIONS });
    nodes = new NodeStore();
    await engine.open();
  });
  afterEach(async () => { await engine.close(); });

  async function seed(value: unknown) {
    if (value && typeof value === 'object' && 'ids' in value && 'entities' in value && !(NSS_ENTITY_BRAND in value)) brandEntityState(value);
    await engine.transaction((sql) => nodes.write(sql, 'items', value, sql.changes));
  }

  for (const sorted of [false, true]) {
    for (const numeric of [false, true]) {
      for (const randomOrder of [false, true]) {
      it(`matches 200 real NgRx operations (${sorted ? 'sorted' : 'insertion order'}, ${numeric ? 'numeric' : 'string'} IDs, ${randomOrder ? 'random operation order' : 'all operations'})`, async () => {
        const options = { sortComparer: sorted ? (a: Item, b: Item) => a.rank - b.rank : false as const };
        const adapter = createEntityAdapter<Item>(options);
        const classic = createClassicAdapter<Item>(options);
        let expected = classic.getInitialState();
        await seed(adapter.getInitialState());
        let randomState = 0x12345678;
        const random = () => {
          randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
          return randomState / 0x100000000;
        };
        const id = (value: number) => numeric ? value : `item/${value}~`;
        const selectors = adapter.getSelectors();
        const globalSelectors = adapter.getSelectors((state: { items: EntityState<Item> }) => state.items);
        for (let step = 0; step < 200; step++) {
          const entity: Item = { id: id(Math.floor(random() * 15)), rank: Math.floor(random() * 4), name: `step ${step}` };
          const existing = expected.ids[Math.floor(random() * expected.ids.length)] ?? entity.id;
          const nextId = id(Math.floor(random() * 15));
          const second = { ...entity, id: nextId === entity.id ? id(10000 + step) : nextId, name: `other ${step}` };
          const operation = randomOrder
            ? random() < 0.95 ? Math.floor(random() * 13) : 13 + Math.floor(random() * 2)
            : step % 15;
          await engine.transaction(async (sql) => {
            const tx = new StoreTx('items', nodes, sql, sql.changes);
            // Populate the identity cache before every write to verify invalidation.
            await tx.get('');
            expected = await apply(operation, adapter, classic, tx, expected, entity, second, existing, id(1000 + step));
            const actual = await tx.get<EntityState<Item>>('');
            expect(actual, `operation ${operation}, step ${step}`).toEqual(expected);
            const expectedAll = classic.getSelectors().selectAll(expected);
            expect(selectors.selectAll(actual)).toEqual(expectedAll);
            expect(selectors.selectIds(actual)).toEqual(expected.ids);
            expect(selectors.selectEntities(actual)).toEqual(expected.entities);
            expect(selectors.selectTotal(actual)).toBe(expected.ids.length);
            const root = { items: actual };
            expect(globalSelectors.selectAll(root)).toEqual(expectedAll);
            expect(globalSelectors.selectIds(root)).toEqual(expected.ids);
            expect(globalSelectors.selectEntities(root)).toEqual(expected.entities);
            expect(globalSelectors.selectTotal(root)).toBe(expected.ids.length);
          });
          expect(await engine.read((sql) => nodes.read(sql, 'items'))).toEqual(expected);
        }
      });
      }
    }
  }

  it('returns a non-enumerable branded initial state with extra properties', () => {
    const initial = createEntityAdapter<Item>().getInitialState({ loading: false });
    expect(initial).toEqual({ ids: [], entities: {}, loading: false });
    expect(Object.getOwnPropertyDescriptor(initial, NSS_ENTITY_BRAND)).toMatchObject({ value: true, enumerable: false });
  });

  it('filters updateMany IDs against the state before applying any updates', async () => {
    const adapter = createEntityAdapter<Item>();
    const classic = createClassicAdapter<Item>();
    const entity = { id: 1, rank: 0, name: 'a' };
    const updates = [{ id: 1, changes: { id: 2 } }, { id: 2, changes: { name: 'b' } }];
    const initial = classic.addOne(entity, classic.getInitialState());
    const expected = classic.updateMany(updates, initial);
    expect(expected.entities[2]?.name).toBe('a');
    await seed(adapter.addOne(entity, adapter.getInitialState()));
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('items', nodes, sql, sql.changes);
      await adapter.updateMany(tx, updates);
      expect(await tx.get('')).toEqual(expected);
    });
  });

  for (const operation of ['updateMany', 'map'] as const) {
    it(`resolves sorted ${operation} collisions against pending updated targets`, async () => {
      const adapter = createEntityAdapter<Item>({ sortComparer: (a, b) => a.rank - b.rank });
      const rows = [
        { id: 1, rank: 1, name: 'target' },
        { id: 2, rank: 2, name: 'source' },
      ];
      await seed(adapter.setAll(rows, adapter.getInitialState()));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        await engine.transaction(async (sql) => {
          const tx = new StoreTx('items', nodes, sql, sql.changes);
          const positions = await sql.query<{ pos: number }>('SELECT pos FROM nss_entity WHERE coll = ? ORDER BY pos', ['items']);
          if (operation === 'updateMany') {
            await adapter.updateMany(tx, [
              { id: 1, changes: { name: 'updated target' } },
              { id: 2, changes: { id: 1, name: 'renamed source' } },
            ]);
          } else {
            await adapter.map(tx, (entity) => entity.id === 1
              ? { ...entity, name: 'updated target' }
              : { ...entity, id: 1, name: 'renamed source' });
          }
          expect(await tx.get('')).toEqual({ ids: [1], entities: { 1: { id: 1, rank: 2, name: 'renamed source' } } });
          expect(await sql.query<{ pos: number }>('SELECT pos FROM nss_entity WHERE coll = ?', ['items'])).toEqual([positions[1]]);
        });
        expect(warn).toHaveBeenCalledTimes(1);
      } finally { warn.mockRestore(); }
    });
  }

  it('refreshes live entity selectors through the original Store DI token', async () => {
    const adapter = createEntityAdapter<Item>();
    const add = createAction('[entity integration] add', props<{ entity: Item }>());
    const remove = createAction('[entity integration] remove');
    const reducer = createReducer(
      adapter.getInitialState(),
      on(add, async (tx, action) => { await adapter.addOne(tx, action.entity); }),
      on(remove, async (tx) => { await adapter.removeMany(tx, (entity) => entity.rank === 1); }),
    );
    TestBed.configureTestingModule({ providers: [provideStore({ items: reducer }, { sqlite: { driver: new SqlJsDriver() } })] });
    const store = TestBed.inject(Store);
    const core = TestBed.inject(SqliteStoreCore);
    const selectors = adapter.getSelectors(createFeatureSelector<EntityState<Item>>('items'));
    const all: Item[][] = [];
    const ids: (string[] | number[])[] = [];
    const entities: EntityState<Item>['entities'][] = [];
    const totals: number[] = [];
    const subscriptions = [
      TestBed.inject(NgrxStore).select(selectors.selectAll).subscribe((value) => all.push(value)),
      store.select(selectors.selectIds).subscribe((value) => ids.push(value)),
      store.select(selectors.selectEntities).subscribe((value) => entities.push(value)),
      store.select(selectors.selectTotal).subscribe((value) => totals.push(value)),
    ];
    try {
      await store.settle();
      await expect.poll(() => totals.at(-1)).toBe(0);
      const entity = { id: 'live', rank: 1, name: 'live' };
      await store.dispatchAsync(add({ entity }));
      expect(all.at(-1)).toEqual([entity]);
      expect(ids.at(-1)).toEqual(['live']);
      expect(entities.at(-1)).toEqual({ live: entity });
      expect(totals.at(-1)).toBe(1);
      await store.dispatchAsync(remove());
      expect(all.at(-1)).toEqual([]);
      expect(ids.at(-1)).toEqual([]);
      expect(entities.at(-1)).toEqual({});
      expect(totals).toEqual([0, 1, 0]);
    } finally {
      for (const subscription of subscriptions) subscription.unsubscribe();
      TestBed.resetTestingModule();
      await core.engine.close();
    }
  });

  it('keeps classic operations pure and supports onState handlers unchanged', async () => {
    const adapter = createEntityAdapter<Item>();
    const initial = adapter.getInitialState<EntityState<Item> & { loading: boolean }>({ loading: false });
    const add = createAction('add entity', props<{ entity: Item }>());
    const reducer = createReducer(initial, onState(add, (state, action) => adapter.addOne(action.entity, state)));
    const entity = { id: 1, rank: 1, name: 'one' };
    const pure = adapter.addOne(entity, initial);
    expect(initial.ids).toEqual([]);
    expect(pure.loading).toBe(false);
    await seed(initial);
    await engine.transaction(async (sql) => {
      await runHandlers(reducer, new StoreTx('items', nodes, sql, sql.changes), add({ entity }));
    });
    expect(await engine.read((sql) => nodes.read(sql, 'items'))).toEqual(pure);
  });

  it('updates nested collections and invalidates cached ancestors', async () => {
    const adapter = createEntityAdapter<Item>();
    await seed({ title: 'nested', items: adapter.getInitialState() });
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('items', nodes, sql, sql.changes);
      await tx.get('');
      await adapter.at(tx, 'items').addOne({ id: 'a', rank: 1, name: 'nested' });
      expect(await tx.get('')).toEqual({ title: 'nested', items: { ids: ['a'], entities: { a: { id: 'a', rank: 1, name: 'nested' } } } });
      expect(adapter.getSelectors().selectTotal(await tx.get('items'))).toBe(1);
    });
  });

  it('promotes a 2 MB entity and reads it back through the adapter and schema', async () => {
    const adapter = createEntityAdapter<Item>();
    const entity = { id: 'large/~', rank: 1, name: 'large', payload: 'x'.repeat(2 * 1024 * 1024) };
    await seed(adapter.getInitialState());
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('items', nodes, sql, sql.changes);
      await adapter.addOne(tx, entity);
      expect(await tx.entities<Item>('').get(entity.id)).toEqual(entity);
      expect((await tx.get<EntityState<Item>>('')).entities[entity.id]).toEqual(entity);
      const [row] = await sql.query<{ data: string }>('SELECT data FROM nss_entity WHERE coll = ?', ['items']);
      expect(row.data).toBe('');
    });
    expect(await engine.read((sql) => nodes.read(sql, 'items'))).toEqual({ ids: [entity.id], entities: { [entity.id]: entity } });
  });

  for (const sorted of [false, true]) {
    it(`overwrites id-change collisions once, retaining the renamed position (${sorted ? 'sorted' : 'unsorted'})`, async () => {
      const adapter = createEntityAdapter<Item>({ sortComparer: sorted ? (a, b) => a.rank - b.rank : false });
      const rows = [
        { id: 1, rank: 1, name: 'source' },
        { id: 2, rank: 2, name: 'middle' },
        { id: 3, rank: 3, name: 'target' },
      ];
      await seed(adapter.setAll(rows, adapter.getInitialState()));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        await engine.transaction(async (sql) => {
          const tx = new StoreTx('items', nodes, sql, sql.changes);
          await adapter.updateOne(tx, { id: 1, changes: { id: 3 } });
          expect(await tx.get('')).toEqual({ ids: [3, 2], entities: { 3: { ...rows[0], id: 3 }, 2: rows[1] } });
        });
        expect(warn).toHaveBeenCalledTimes(1);
      } finally { warn.mockRestore(); }
    });
  }

  it('keeps unsorted updateOne to one entity read and one UPDATE', async () => {
    const adapter = createEntityAdapter<Item>();
    await seed(adapter.addOne({ id: 1, rank: 1, name: 'one' }, adapter.getInitialState()));
    await engine.transaction(async (sql) => {
      const query = vi.spyOn(sql, 'query');
      const run = vi.spyOn(sql, 'run');
      await adapter.updateOne(new StoreTx('items', nodes, sql, sql.changes), { id: 1, changes: { name: 'updated' } });
      const entityReads = query.mock.calls.filter(([statement]) => /\bFROM nss_entity\b/i.test(statement));
      const writes = run.mock.calls.filter(([statement]) => /\b(?:UPDATE|INSERT INTO|DELETE FROM) nss_entity\b/i.test(statement));
      expect(entityReads).toHaveLength(1);
      expect(writes).toHaveLength(1);
      expect(writes[0][0]).toMatch(/^UPDATE nss_entity\b/i);
    });
  });

  it('streams predicate removals over multiple pages and keeps selectTotal correct', async () => {
    const adapter = createEntityAdapter<Item>();
    const rows = Array.from({ length: 1201 }, (_, id) => ({ id, rank: id % 3, name: `item ${id}` }));
    await seed(adapter.setAll(rows, adapter.getInitialState()));
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('items', nodes, sql, sql.changes);
      await adapter.removeMany(tx, (entity) => entity.rank === 0);
      const state = await tx.get<EntityState<Item>>('');
      const remaining = rows.filter((entity) => entity.rank !== 0);
      expect(adapter.getSelectors().selectTotal(state)).toBe(remaining.length);
      expect(adapter.getSelectors().selectAll(state)).toEqual(remaining);
    });
  });

  it('inserts sorted addOne with logarithmic single-row probes and one INSERT', async () => {
    const adapter = createEntityAdapter<Item>({ sortComparer: (a, b) => a.rank - b.rank });
    const rows = Array.from({ length: 128 }, (_, id) => ({ id, rank: id * 2, name: `item ${id}` }));
    await seed(adapter.setAll(rows, adapter.getInitialState()));
    await engine.transaction(async (sql) => {
      const query = vi.spyOn(sql, 'query');
      const run = vi.spyOn(sql, 'run');
      await adapter.addOne(new StoreTx('items', nodes, sql, sql.changes), { id: 1000, rank: 127, name: 'between' });
      const probes = query.mock.calls.filter(([statement]) => /LIMIT 1 OFFSET/i.test(statement));
      expect(probes.length).toBeGreaterThan(0);
      expect(probes.length).toBeLessThanOrEqual(10);
      expect(query.mock.calls.filter(([statement]) => /\bFROM nss_entity\b/i.test(statement)).length).toBeLessThanOrEqual(14);
      const inserts = run.mock.calls.filter(([statement]) => /INSERT\b.*\bnss_entity\b/i.test(statement));
      expect(inserts).toHaveLength(1);
      expect(run.mock.calls.some(([statement]) => /(?:UPDATE|DELETE FROM) nss_entity\b/i.test(statement))).toBe(false);
    });
  });

  it('removes one inline entity with one DELETE and no entity reads', async () => {
    const adapter = createEntityAdapter<Item>();
    await seed(adapter.addOne({ id: 1, rank: 1, name: 'one' }, adapter.getInitialState()));
    await engine.transaction(async (sql) => {
      const query = vi.spyOn(sql, 'query');
      const run = vi.spyOn(sql, 'run');
      await adapter.removeOne(new StoreTx('items', nodes, sql, sql.changes), 1);
      expect(query.mock.calls.filter(([statement]) => /^SELECT\b.*\bFROM nss_entity\b/is.test(statement))).toHaveLength(0);
      expect([...run.mock.calls, ...query.mock.calls].filter(([statement]) => /^DELETE FROM nss_entity\b/i.test(statement))).toHaveLength(1);
    });
  });
});

async function apply(
  operation: number, adapter: Adapter, classic: ClassicAdapter<Item>, tx: StoreTx,
  state: EntityState<Item>, entity: Item, second: Item, existing: string | number, freshId: string | number,
): Promise<EntityState<Item>> {
  switch (operation) {
    case 0: await adapter.addOne(tx, entity); return classic.addOne(entity, state);
    case 1: await adapter.addMany(tx, [entity, second]); return classic.addMany([entity, second], state);
    case 2: await adapter.setOne(tx, entity); return classic.setOne(entity, state);
    case 3: await adapter.setMany(tx, [entity, second]); return classic.setMany([entity, second], state);
    case 4: await adapter.upsertOne(tx, entity); return classic.upsertOne(entity, state);
    case 5: await adapter.upsertMany(tx, [entity, second]); return classic.upsertMany([entity, second], state);
    case 6: {
      const update = { id: existing, changes: { id: freshId, rank: entity.rank } } as Update<Item>;
      await adapter.updateOne(tx, update); return classic.updateOne(update, state);
    }
    case 7: {
      const updates = [{ id: existing, changes: { name: entity.name } }, { id: second.id, changes: { rank: entity.rank } }] as Update<Item>[];
      await adapter.updateMany(tx, updates); return classic.updateMany(updates, state);
    }
    case 8: await adapter.removeOne(tx, existing); return typeof existing === 'string' ? classic.removeOne(existing, state) : classic.removeOne(existing, state);
    case 9: {
      const keys = [entity.id, second.id] as string[] | number[];
      await adapter.removeMany(tx, keys); return classic.removeMany(keys as string[], state);
    }
    case 10: {
      const predicate = (item: Item) => item.rank === entity.rank;
      await adapter.removeMany(tx, predicate); return classic.removeMany(predicate, state);
    }
    case 11: {
      const map = (item: Item) => ({ ...item, rank: (item.rank + 1) % 4 });
      await adapter.map(tx, map); return classic.map(map, state);
    }
    case 12: {
      const map = { id: existing, map: (item: Item) => ({ ...item, rank: entity.rank, name: entity.name }) } as EntityMapOne<Item>;
      await adapter.mapOne(tx, map); return classic.mapOne(map, state);
    }
    case 13: await adapter.setAll(tx, [entity, second]); return classic.setAll([entity, second], state);
    default: await adapter.removeAll(tx); return classic.removeAll(state);
  }
}
import { TestBed } from '@angular/core/testing';
