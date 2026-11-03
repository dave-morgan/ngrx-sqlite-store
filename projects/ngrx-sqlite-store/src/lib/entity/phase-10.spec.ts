import { TestBed } from '@angular/core/testing';
import { inject, EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { Actions, createEffect, ofType, provideEffects } from '@ngrx/effects';
import { createEntityAdapter as realAdapter } from '@ngrx/entity';
import type { EntityState } from '@ngrx/entity';
import { createAction } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, tap, withLatestFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEntityAdapter } from '../../../entity/src/entity-adapter';
import { createFeatureSelector, createSelector } from '../selectors/selectors';
import { createQuerySelector } from '../selectors/query-selector';
import { PathCache } from '../selectors/path-cache';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { createReducer, on } from '../reducer/reducer';
import { StoreTx } from '../reducer/store-tx';
import { SCHEMA_MIGRATIONS } from '../schema/migrations';
import { NodeStore } from '../schema/node-store';
import { encodeSortKey, decodeSortKey } from '../schema/sort-key';
import { StorageEngine } from '../storage/storage-engine';
import { SqliteStoreCore } from '../store/core';
import { provideStore } from '../store/provide';
import { Store } from '../store/store';
import type { Where } from '../../../entity/src/query';
import { querySources } from '../selectors/metadata';
import { StoragePolicy } from '../schema/policy';

interface Item {
  id: number;
  rank: number;
  done: boolean;
  name: string;
  nested?: { value: number | null };
}
const items: Item[] = Array.from({ length: 40 }, (_, id) => ({
  id,
  rank: ((id * 17) % 41) - 20,
  done: id % 3 === 0,
  name: `Item ${id}`,
  ...(id % 4 ? { nested: { value: id % 5 ? id / 3 : null } } : {}),
}));
let engine: StorageEngine | undefined;
afterEach(async () => {
  TestBed.resetTestingModule();
  await engine?.close();
  engine = undefined;
});

describe('Phase 10', () => {
  it('encodes numeric keys in numeric order and round trips random IEEE doubles', () => {
    let seed = 901;
    const values = [
      -Infinity,
      -Number.MAX_VALUE,
      -1,
      -Number.MIN_VALUE,
      0,
      Number.MIN_VALUE,
      1,
      Infinity,
    ];
    for (let i = 0; i < 1000; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      values.push((seed - 0x80000000) * 10 ** ((seed % 600) - 300));
    }
    for (const value of values) expect(decodeSortKey(encodeSortKey(value))).toBe(value);
    expect([...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map(encodeSortKey)).toEqual(
      values.map(encodeSortKey).sort(),
    );
    expect(encodeSortKey(-0)).toBe(encodeSortKey(0));
    expect(() => encodeSortKey(NaN)).toThrow();
  });

  it('round trips Unicode keys and preserves code-point ordering', () => {
    let seed = 67;
    const strings = ['', 'a', 'aa', '😀', '\ue000'];
    for (let i = 0; i < 300; i++) {
      let value = '';
      for (let j = 0; j < i % 7; j++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const code = seed % 0x110000;
        value += String.fromCodePoint(code >= 0xd800 && code <= 0xdfff ? 0xfffd : code);
      }
      strings.push(value);
    }
    for (const value of strings) expect(decodeSortKey(encodeSortKey(value))).toBe(value);
    const compare = (a: string, b: string) => {
      const left = [...a].map((c) => c.codePointAt(0)!);
      const right = [...b].map((c) => c.codePointAt(0)!);
      for (let i = 0; i < Math.min(left.length, right.length); i++)
        if (left[i] !== right[i]) return left[i] - right[i];
      return left.length - right.length;
    };
    expect([...strings].sort(compare).map(encodeSortKey)).toEqual(
      strings.map(encodeSortKey).sort(),
    );
  });

  it('keeps classic and tx sortKey ordering stable through key changes and new ties', async () => {
    const adapter = createEntityAdapter<Item>({ sortKey: (e) => e.rank });
    engine = new StorageEngine(new SqlJsDriver(), { migrations: SCHEMA_MIGRATIONS });
    await engine.open();
    const nodes = new NodeStore();
    let state = adapter.getInitialState();
    await engine.transaction((sql) => nodes.write(sql, 'items', state, sql.changes));
    for (let step = 0; step < 80; step++) {
      const entity = { ...items[step % items.length], rank: step % 5 };
      state = adapter.upsertOne(entity, state);
      await engine.transaction(async (sql) => {
        const tx = new StoreTx('items', nodes, sql, sql.changes);
        await adapter.upsertOne(tx, entity);
        expect(await tx.entities().ids()).toEqual(state.ids);
        expect(await tx.get('')).toEqual(state);
        expect((await tx.entities<Item>().page(3, 6)).map((r) => r.id)).toEqual(
          state.ids.slice(3, 9),
        );
      });
    }
  });

  for (const mode of ['none', 'comparer', 'key'] as const) {
    it(`matches JS and SQL queries over seeded filter trees (${mode})`, async () => {
      const adapter = createEntityAdapter<Item>({
        ...(mode === 'key' ? { sortKey: (e: Item) => e.rank } : {}),
        ...(mode === 'comparer' ? { sortComparer: (a: Item, b: Item) => a.rank - b.rank } : {}),
      });
      engine = new StorageEngine(new SqlJsDriver(), { migrations: SCHEMA_MIGRATIONS });
      await engine.open();
      const nodes = new NodeStore();
      let seed = 0x103fab;
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 0x100000000;
      };
      const models = items.map((e) => ({
        ...e,
        rank: Math.floor(random() * 15) / 3 - 2,
        done: random() < 0.5,
        name: ['A', 'a', '😀', '', 'Item 1'][Math.floor(random() * 5)],
        ...(random() < 0.5 ? { nested: { value: random() < 0.3 ? null : random() * 100 } } : {}),
      }));
      await engine.transaction(async (sql) => {
        await nodes.write(sql, 'items', adapter.getInitialState(), sql.changes);
        await adapter.setAll(new StoreTx('items', nodes, sql, sql.changes), models);
      });
      const state = adapter.setAll(models, adapter.getInitialState());
      const queries = adapter.query(createFeatureSelector<EntityState<Item>>('items'));
      // Run metadata readers directly to exercise SQL independently of selection DI.
      const { querySources } = await import('../selectors/metadata');
      const tree = (depth = 0): Where => {
        if (depth < 3 && random() < 0.6) {
          const children = Array.from({ length: Math.floor(random() * 4) }, () => tree(depth + 1));
          return random() < 0.3
            ? { not: tree(depth + 1) }
            : random() < 0.5
              ? { and: children }
              : { or: children };
        }
        const fields = ['rank', 'done', 'name', 'nested.value', 'missing'];
        const field = fields[Math.floor(random() * fields.length)];
        const values = [null, true, false, -1, 0, 2.5, 'A', 'a', '😀'];
        const value = values[Math.floor(random() * values.length)];
        const op = ['eq', 'ne', 'lt', 'lte', 'gt', 'gte', 'in', 'like'][Math.floor(random() * 8)];
        return {
          [field]: { [op]: op === 'in' ? [value, null, 1] : op === 'like' ? '%a_' : value },
        };
      };
      for (let i = 0; i < 120; i++) {
        const leaves = [
          { rank: { gte: (i % 23) - 12 } },
          { done: i % 2 === 0 },
          { 'nested.value': { ne: null } },
          { name: { like: `Item ${i % 4}%` } },
          { id: { in: [i % 40, (i * 7) % 40] } },
        ];
        const where =
          i < 20
            ? i % 3 === 0
              ? { or: leaves }
              : i % 3 === 1
                ? { and: leaves.slice(0, 2) }
                : { not: leaves[i % leaves.length] }
            : tree();
        for (const selector of [
          queries.count(where),
          queries.ids(where),
          queries.page({ where, offset: 2, limit: 7 }),
          queries.exists(where),
        ]) {
          const source = querySources(selector)[0];
          expect(await engine.read((sql) => source.reader(sql))).toEqual(
            selector({ items: state }),
          );
        }
      }
    });
  }

  it('counts without loading entities; refreshes, composes, and emits synchronously when fresh', async () => {
    const adapter = createEntityAdapter<Item>();
    const add = createAction('query add');
    const count = adapter
      .query(createFeatureSelector<EntityState<Item>>('items'))
      .count({ done: false });
    const driver = new SqlJsDriver();
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          {
            items: createReducer(
              adapter.getInitialState(),
              on(add, (tx) => adapter.addOne(tx, items[1])),
            ),
          },
          { sqlite: { driver } },
        ),
      ],
    });
    const store = TestBed.inject(Store);
    engine = TestBed.inject(SqliteStoreCore).engine;
    await store.settle();
    const spy = vi.spyOn(driver, 'query');
    const values: number[] = [];
    const selected = createSelector(count, (n) => n * 2);
    const subscription = store.select(selected).subscribe((n) => values.push(n));
    await expect.poll(() => values).toEqual([0]);
    await store.dispatchAsync(add());
    expect(values).toEqual([0, 2]);
    const sync: number[] = [];
    store
      .select(count)
      .subscribe((n) => sync.push(n))
      .unsubscribe();
    expect(sync).toEqual([1]);
    expect(TestBed.inject(PathCache).peek('items')).toBeUndefined();
    expect(spy.mock.calls.some(([sql]) => sql.includes('SELECT path, parent'))).toBe(false);
    subscription.unsubscribe();
  });

  it('works with MockStore overrideSelector and rejects injected field paths', () => {
    const adapter = createEntityAdapter<Item>();
    const query = adapter.query();
    expect(() => query.count({ ['id) OR 1=1 --']: 1 })).toThrow();
    const selector = query.count();
    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState: adapter.getInitialState() })],
    });
    const mock = TestBed.inject(MockStore);
    mock.overrideSelector(selector, 12);
    expect(selector(adapter.getInitialState())).toBe(12);
    mock.resetSelectors();
  });

  it('exposes a generic query selector with an initial signal value', async () => {
    const selector = createQuerySelector(
      { path: 'items', key: 'literal', initial: -1 },
      async (sql) => {
        const [row] = await sql.query<{ value: number }>('SELECT 17 AS value');
        return row.value;
      },
    );
    TestBed.configureTestingModule({
      providers: [provideStore({}, { sqlite: { driver: new SqlJsDriver() } })],
    });
    const store = TestBed.inject(Store);
    engine = TestBed.inject(SqliteStoreCore).engine;
    const value = TestBed.runInInjectionContext(() => store.selectSignal(selector));
    expect(value()).toBe(-1);
    await expect.poll(() => value()).toBe(17);
    expect(await firstValueFrom(store.select(selector))).toBe(17);
  });

  it('matches scalar truth tables, nested boolean trees, missing fields and bound malicious values', async () => {
    const driver = new SqlJsDriver();
    engine = new StorageEngine(driver, { migrations: SCHEMA_MIGRATIONS });
    await engine.open();
    const nodes = new NodeStore();
    const adapter = createEntityAdapter<{ id: number; value?: unknown }>();
    const scalars = [
      null,
      false,
      true,
      -1,
      0,
      1,
      '',
      'A',
      'a',
      '😀',
      '\ue000',
      'a\0ignored',
      "x' OR 1=1 --",
      {},
      [],
    ];
    const models = [{ id: 0 }, ...scalars.map((value, i) => ({ id: i + 1, value }))];
    const state = adapter.setAll(models, adapter.getInitialState());
    await engine.transaction((sql) => nodes.write(sql, 'items', state, sql.changes));
    const q = adapter.query(
      (s: { items: EntityState<{ id: number; value?: unknown }> }) => s.items,
    );
    const spy = vi.spyOn(driver, 'query');
    for (const operand of scalars.slice(0, -2)) {
      for (const op of ['eq', 'ne', 'lt', 'lte', 'gt', 'gte', 'in', 'like']) {
        if (op === 'like' && typeof operand !== 'string') continue;
        const where = { value: { [op]: op === 'in' ? [operand, null] : operand } } as Where;
        const selector = q.ids({ not: { or: [where, { and: [{ value: 999 }, { id: -1 }] }] } });
        expect(
          await engine.read((sql) => querySources(selector)[0].reader(sql)),
          JSON.stringify(where),
        ).toEqual(selector({ items: state }));
      }
    }
    expect(spy.mock.calls.some(([sql]) => sql.includes("x' OR 1=1"))).toBe(false);
    expect(spy.mock.calls.some(([, params]) => params?.includes("x' OR 1=1 --"))).toBe(true);
  });

  it('evaluates promoted rows in JS and merges them into ordered counts, ids and pages', async () => {
    const adapter = createEntityAdapter<Item>({ sortKey: (e) => e.rank });
    engine = new StorageEngine(new SqlJsDriver(), { migrations: SCHEMA_MIGRATIONS });
    await engine.open();
    const nodes = new NodeStore(new StoragePolicy({ rowCap: 160 }));
    const models = items
      .slice(0, 8)
      .map((e, i) => ({ ...e, name: i % 2 ? 'x'.repeat(600) : e.name }));
    const state = adapter.setAll(models, adapter.getInitialState());
    await engine.transaction((sql) => nodes.write(sql, 'items', state, sql.changes));
    const q = adapter.query(createFeatureSelector<EntityState<Item>>('items'));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      for (const selector of [
        q.count({ done: false }),
        q.ids(),
        q.page({ where: { done: false }, offset: 1, limit: 3 }),
        q.exists({ rank: { gt: 100 } }),
      ]) {
        expect(await engine.read((sql) => querySources(selector)[0].reader(sql))).toEqual(
          selector({ items: state }),
        );
      }
      expect(warning).toHaveBeenCalledTimes(1);
    } finally {
      warning.mockRestore();
    }
  });

  it('migrates a v2 database without changing order and backfills keys on the first write', async () => {
    const driver = new SqlJsDriver();
    await driver.open();
    await driver.exec(
      "CREATE TABLE nss_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL); INSERT INTO nss_meta VALUES('schema_version','2')",
    );
    await SCHEMA_MIGRATIONS[0].up(driver);
    const nodes = new NodeStore();
    const unsorted = createEntityAdapter<Item>();
    const initial = unsorted.setAll(items.slice(0, 5), unsorted.getInitialState());
    const { ChangeSet } = await import('../storage/change-set');
    await nodes.write(driver, 'items', initial, new ChangeSet());
    engine = new StorageEngine(driver, { migrations: SCHEMA_MIGRATIONS });
    await engine.open();
    expect(await engine.read((sql) => nodes.read(sql, 'items'))).toEqual(initial);
    expect(await driver.query("SELECT value FROM nss_meta WHERE key='schema_version'")).toEqual([
      { value: '4' },
    ]);
    const adapter = createEntityAdapter<Item>({ sortKey: (e) => e.rank });
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('items', nodes, sql, sql.changes);
      await adapter.addOne(tx, items[5]);
      expect(await tx.entities().ids()).toEqual(
        items
          .slice(0, 6)
          .sort((a, b) => a.rank - b.rank)
          .map((e) => e.id),
      );
    });
    expect(
      (
        await driver.query<{ count: number }>(
          'SELECT COUNT(*) AS count FROM nss_entity WHERE sortkey IS NULL',
        )
      )[0].count,
    ).toBe(0);
  });

  it('uses binary string order, stable ties, and validates invalid/mixed keys and mutually exclusive options', async () => {
    const adapter = createEntityAdapter<{ id: number; key: string | number }>({
      sortKey: (e) => e.key,
    });
    const models = ['😀', '\ue000', 'a', 'A', '', 'a'].map((key, id) => ({ key, id }));
    const classic = adapter.setAll(models, adapter.getInitialState());
    expect(classic.ids).toEqual([4, 3, 2, 5, 1, 0]);
    expect(() => adapter.addOne({ id: 9, key: 1 }, classic)).toThrow();
    expect(() => adapter.addOne({ id: 9, key: NaN }, adapter.getInitialState())).toThrow();
    expect(() =>
      createEntityAdapter<Item>({
        sortKey: (e) => e.rank,
        sortComparer: (a, b) => a.rank - b.rank,
      }),
    ).toThrow();
    engine = new StorageEngine(new SqlJsDriver(), { migrations: SCHEMA_MIGRATIONS });
    await engine.open();
    const nodes = new NodeStore();
    await engine.transaction(async (sql) => {
      await nodes.write(sql, 'items', classic, sql.changes);
      const tx = new StoreTx('items', nodes, sql, sql.changes);
      await adapter.updateOne(tx, { id: 0, changes: { key: 'a' } });
      expect(await tx.entities().ids()).toEqual([4, 3, 0, 2, 5, 1]);
    });
    await expect(
      engine.transaction((sql) =>
        adapter.addOne(new StoreTx('items', nodes, sql, sql.changes), { id: 9, key: 1 }),
      ),
    ).rejects.toThrow();
  });

  it('matches real NgRx through seeded mutations and ties with an insertion-order comparer', async () => {
    const adapter = createEntityAdapter<Item>({ sortKey: (e) => e.rank });
    const real = realAdapter<Item>({ sortComparer: (a, b) => a.rank - b.rank || a.id - b.id });
    let state = adapter.getInitialState();
    let expected = real.getInitialState();
    engine = new StorageEngine(new SqlJsDriver(), { migrations: SCHEMA_MIGRATIONS });
    await engine.open();
    const nodes = new NodeStore();
    await engine.transaction((sql) => nodes.write(sql, 'items', state, sql.changes));
    for (const entity of items) {
      state = adapter.addOne(entity, state);
      expected = real.addOne(entity, expected);
      expect(state).toEqual(expected);
      await engine.transaction(async (sql) => {
        const tx = new StoreTx('items', nodes, sql, sql.changes);
        await adapter.addOne(tx, entity);
        expect(await tx.get('')).toEqual(expected);
      });
    }
    let seed = 0xb0a10;
    let nextId = 40;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    for (let step = 0; step < 160; step++) {
      const id = Number(expected.ids[Math.floor(random() * expected.ids.length)] ?? -1);
      const rank = Math.floor(random() * 5) - 2;
      const entity = { ...items[0], id: nextId++, rank };
      const update = { id, changes: { rank } };
      const op = Math.floor(random() * 8);
      await engine.transaction(async (sql) => {
        const tx = new StoreTx('items', nodes, sql, sql.changes);
        switch (op) {
          case 0:
            state = adapter.addOne(entity, state);
            expected = real.addOne(entity, expected);
            await adapter.addOne(tx, entity);
            break;
          case 1: {
            const batch = [entity, { ...entity, id: nextId++ }];
            state = adapter.addMany(batch, state);
            expected = real.addMany(batch, expected);
            await adapter.addMany(tx, batch);
            break;
          }
          case 2:
            state = adapter.updateOne(update, state);
            expected = real.updateOne(update, expected);
            await adapter.updateOne(tx, update);
            break;
          case 3:
            state = adapter.updateMany([update], state);
            expected = real.updateMany([update], expected);
            await adapter.updateMany(tx, [update]);
            break;
          case 4:
            state = adapter.removeOne(id, state);
            expected = real.removeOne(id, expected);
            await adapter.removeOne(tx, id);
            break;
          case 5: {
            const replacement = expected.entities[id]
              ? { ...expected.entities[id]!, rank }
              : entity;
            state = adapter.setOne(replacement, state);
            expected = real.setOne(replacement, expected);
            await adapter.setOne(tx, replacement);
            break;
          }
          case 6: {
            const map = (e: Item) => ({ ...e, rank: e.id % 4 });
            state = adapter.map(map, state);
            expected = real.map(map, expected);
            await adapter.map(tx, map);
            break;
          }
          case 7:
            state = adapter.setAll([entity], state);
            expected = real.setAll([entity], expected);
            await adapter.setAll(tx, [entity]);
            break;
        }
        expect(state, `classic step ${step}, op ${op}`).toEqual(expected);
        expect(await tx.get(''), `tx step ${step}, op ${op}`).toEqual(expected);
      });
    }
  });

  it('refreshes every adapter operation before effects see the post-commit query result', async () => {
    const adapter = createEntityAdapter<Item>({ sortKey: (e) => e.rank });
    const action = createAction('query mutate', (op: number) => ({ op }));
    const queries = adapter.query(createFeatureSelector<EntityState<Item>>('items'));
    const count = queries.count({ done: false });
    const observed: number[] = [];
    const effect = createEffect(
      (actions = inject(Actions), store = inject(Store)) =>
        actions.pipe(
          ofType(action),
          withLatestFrom(store.select(count)),
          tap(([, n]) => observed.push(n)),
        ),
      { functional: true, dispatch: false },
    );
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          {
            items: createReducer(
              adapter.getInitialState(),
              on(action, async (tx, { op }) => {
                const ops = adapter.at(tx, '');
                switch (op) {
                  case 0:
                    return ops.addOne(items[1]);
                  case 1:
                    return ops.addMany(items.slice(2, 5));
                  case 2:
                    return ops.setOne({ ...items[1], done: true });
                  case 3:
                    return ops.setMany(items.slice(0, 3));
                  case 4:
                    return ops.updateOne({ id: 1, changes: { done: true } });
                  case 5:
                    return ops.updateMany([{ id: 2, changes: { done: true } }]);
                  case 6:
                    return ops.upsertOne({ ...items[2], done: false });
                  case 7:
                    return ops.upsertMany(items.slice(5, 8));
                  case 8:
                    return ops.mapOne({ id: 2, map: (e) => ({ ...e, done: true }) });
                  case 9:
                    return ops.map((e) => ({ ...e, done: !e.done }));
                  case 10:
                    return ops.removeOne(1);
                  case 11:
                    return ops.removeMany((e) => e.done);
                  case 12:
                    return ops.setAll(items.slice(0, 8));
                  case 13:
                    return ops.removeMany([0, 1]);
                  default:
                    return ops.removeAll();
                }
              }),
            ),
          },
          { sqlite: { driver: new SqlJsDriver() } },
        ),
        provideEffects({ effect }),
      ],
    });
    const store = TestBed.inject(Store);
    engine = TestBed.inject(SqliteStoreCore).engine;
    await store.settle();
    const selectors = [
      queries.ids(),
      queries.page({ offset: 1, limit: 3 }),
      queries.exists({ done: true }),
    ];
    const values: unknown[] = [];
    const subscriptions = selectors.map((s, i) =>
      store.select(s as (state: object) => unknown).subscribe((v) => (values[i] = v)),
    );
    for (let op = 0; op < 15; op++) {
      await store.dispatchAsync(action(op));
      const state = (await engine.read((sql) =>
        new NodeStore().read(sql, 'items'),
      )) as EntityState<Item>;
      expect(observed.at(-1)).toBe(count({ items: state }));
      selectors.forEach((s, i) => expect(values[i]).toEqual(s({ items: state })));
    }
    subscriptions.forEach((s) => s.unsubscribe());
  });

  it('shares query identities and evicts inactive queries with the same LRU as paths', async () => {
    let reads = 0;
    const make = (key: string) =>
      createQuerySelector({ path: 'items', key, initial: -1 }, async () => ++reads);
    TestBed.configureTestingModule({
      providers: [provideStore({}, { sqlite: { driver: new SqlJsDriver(), lruSize: 0 } })],
    });
    const store = TestBed.inject(Store);
    engine = TestBed.inject(SqliteStoreCore).engine;
    await store.settle();
    const child = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
    const selector = make('shared');
    const value = child.runInContext(() => store.selectSignal(selector));
    await expect.poll(() => value()).toBe(1);
    expect(await firstValueFrom(store.select(make('shared')))).toBe(1);
    expect(reads).toBe(1);
    child.destroy();
    expect(await firstValueFrom(store.select(selector))).toBe(2);
  });

  it('composes query sources with dynamic selectors without materializing collections', async () => {
    const adapter = createEntityAdapter<Item>();
    const count = adapter.query(createFeatureSelector<EntityState<Item>>('items')).count();
    const summary = createSelector(
      count,
      (state: { flags: { label: string } }) => state.flags.label,
      (n, label) => `${label}:${n}`,
    );
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          {
            items: createReducer(adapter.setAll(items, adapter.getInitialState())),
            flags: createReducer({ label: 'all' }),
          },
          { sqlite: { driver: new SqlJsDriver() } },
        ),
      ],
    });
    const store = TestBed.inject(Store);
    engine = TestBed.inject(SqliteStoreCore).engine;
    await store.settle();
    expect(await firstValueFrom(store.select(summary))).toBe('all:40');
    expect(TestBed.inject(PathCache).peek('items')).toBeUndefined();
  });

  it('allows a cleared collection to change key type consistently in classic and tx forms', async () => {
    const adapter = createEntityAdapter<{ id: number; key: string | number }>({
      sortKey: (e) => e.key,
    });
    engine = new StorageEngine(new SqlJsDriver(), { migrations: SCHEMA_MIGRATIONS });
    await engine.open();
    const nodes = new NodeStore();
    await engine.transaction(async (sql) => {
      await nodes.write(sql, 'items', adapter.getInitialState(), sql.changes);
      const tx = new StoreTx('items', nodes, sql, sql.changes);
      await adapter.addOne(tx, { id: 1, key: 1 });
      await adapter.setAll(tx, [{ id: 2, key: 'a' }]);
      expect(await tx.get('')).toEqual(
        adapter.setAll([{ id: 2, key: 'a' }], adapter.getInitialState()),
      );
      await adapter.updateOne(tx, { id: 2, changes: { key: 1 } });
      await adapter.addOne(tx, { id: 3, key: 2 });
      await adapter.updateMany(tx, [
        { id: 2, changes: { key: 'a' } },
        { id: 3, changes: { key: 'b' } },
      ]);
      expect(await tx.get('')).toEqual(
        adapter.setAll(
          [
            { id: 2, key: 'a' },
            { id: 3, key: 'b' },
          ],
          adapter.getInitialState(),
        ),
      );
    });
  });

  it('preserves non-JSON generic reader results', async () => {
    const selector = createQuerySelector(
      { path: 'items', key: 'map', initial: new Map<string, number>() },
      async () => new Map([['value', 17]]),
    );
    TestBed.configureTestingModule({
      providers: [provideStore({}, { sqlite: { driver: new SqlJsDriver() } })],
    });
    const store = TestBed.inject(Store);
    engine = TestBed.inject(SqliteStoreCore).engine;
    const value = TestBed.runInInjectionContext(() => store.selectSignal(selector));
    await expect.poll(() => value().get('value'), { timeout: 1000 }).toBe(17);
  });

  it('retains classic insertion positions and sort keys through full and diff writes', async () => {
    const adapter = createEntityAdapter<Item>({ sortKey: (e) => e.rank });
    engine = new StorageEngine(new SqlJsDriver(), { migrations: SCHEMA_MIGRATIONS });
    await engine.open();
    const nodes = new NodeStore();
    const initial = adapter.setAll(items.slice(0, 5), adapter.getInitialState());
    await engine.transaction((sql) => nodes.write(sql, 'items', initial, sql.changes));
    await engine.transaction(async (sql) => {
      const loaded = (await nodes.read(sql, 'items')) as EntityState<Item>;
      let next = adapter.map((e) => ({ ...e, rank: 1 }), loaded);
      next = adapter.addOne({ ...items[5], rank: 1 }, next);
      await nodes.diffWrite(sql, 'items', loaded, next, sql.changes);
      expect(((await nodes.read(sql, 'items')) as EntityState<Item>).ids).toEqual([
        0, 1, 2, 3, 4, 5,
      ]);
      const tx = new StoreTx('items', nodes, sql, sql.changes);
      await adapter.updateOne(tx, { id: 0, changes: { rank: 2 } });
      expect(await tx.entities().ids()).toEqual([1, 2, 3, 4, 5, 0]);
      await adapter.updateOne(tx, { id: 0, changes: { rank: 1 } });
      expect(await tx.entities().ids()).toEqual([0, 1, 2, 3, 4, 5]);
    });
  });

  it('treats arrays as terminal JSON values in field paths in both evaluators', async () => {
    const adapter = createEntityAdapter<{ id: number; tags: string[] }>();
    engine = new StorageEngine(new SqlJsDriver(), { migrations: SCHEMA_MIGRATIONS });
    await engine.open();
    const nodes = new NodeStore();
    const state = adapter.setAll([{ id: 1, tags: ['a', 'b'] }], adapter.getInitialState());
    await engine.transaction((sql) => nodes.write(sql, 'items', state, sql.changes));
    const selector = adapter
      .query((s: { items: typeof state }) => s.items)
      .ids({ 'tags.length': 2 });
    expect(selector({ items: state })).toEqual([]);
    expect(await engine.read((sql) => querySources(selector)[0].reader(sql))).toEqual([]);
  });
});
