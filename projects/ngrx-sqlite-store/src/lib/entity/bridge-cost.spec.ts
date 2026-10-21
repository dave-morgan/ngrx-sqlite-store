// Counts driver invocations, including transaction boundaries, batches and
// refresh reads. SQL statements inside a driver batch count as one call.
import { TestBed } from '@angular/core/testing';
import { createAction } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import {
  bridgeBudgets,
  bridgeReducers,
  countingDriver,
  exerciseBridgeCost,
} from '../../../spikes/bridge-cost-workload';
import { provideStore } from '../store/provide';
import { createReducer, on } from '../reducer/reducer';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { Store } from '../store/store';
import { createEntityAdapter } from '../../../entity/src/entity-adapter';
import { createFeatureSelector } from '../selectors/selectors';
import type { SqlDriver } from '../driver/sql-driver';
import { source as pathSource } from '../selectors/metadata';
import { PathCache } from '../selectors/path-cache';
import { NodeStore } from '../schema/node-store';
import { StorageEngine } from '../storage/storage-engine';

describe('phase 13 bridge invocations', () => {
  afterEach(() => TestBed.resetTestingModule());
  it.each(['ui', 'leaf', 'cold', 'cached', 'row'] as const)(
    'budgets %s including subscribed refresh',
    async (mode) => {
      const scalar = mode === 'ui' || mode === 'leaf';
      const raw = new SqlJsDriver();
      let calls = 0;
      const driver = new Proxy(raw, {
        get(target, key) {
          const value = Reflect.get(target, key);
          if (typeof value !== 'function') return value;
          return (...args: unknown[]) => {
            calls++;
            return value.apply(target, args);
          };
        },
      }) as SqlDriver;
      const adapter = createEntityAdapter<{ id: string; done: boolean }>();
      const initial = adapter.getInitialState();
      const seed = createAction('[Floor] seed');
      const change = createAction('[Floor] change');
      const source = createFeatureSelector<typeof initial>('todos');
      TestBed.configureTestingModule({
        providers: [
          provideStore(
            {
              todos: createReducer(
                initial,
                on(seed, (tx) => adapter.setAll(tx, [{ id: 't1', done: false }])),
                on(change, (tx) =>
                  scalar
                    ? undefined
                    : adapter.mapOne(tx, {
                        id: 't1',
                        map: (t) => ({ ...t, done: !t.done }),
                      }),
                ),
              ),
              ui: createReducer(
                { value: 0 },
                on(change, (tx) => (scalar ? tx.set('value', 1) : undefined)),
              ),
            },
            { sqlite: { driver } },
          ),
        ],
      });
      const store = TestBed.inject(Store);
      await store.settle();
      await store.dispatchAsync(seed());
      const selected =
        mode === 'leaf'
          ? store.select(pathSource((s: { ui: { value: number } }) => s.ui.value, 'ui/value'))
          : mode === 'ui'
            ? store.select(createFeatureSelector('ui'))
            : mode === 'cached'
              ? store.select(source)
              : mode === 'row'
                ? store.select(adapter.query(source).page({ offset: 0, limit: 1 }))
                : store.select(adapter.query(source).count());
      const sub = selected.subscribe();
      const count =
        mode === 'cached' ? store.select(adapter.query(source).count()).subscribe() : undefined;
      await firstValueFrom(selected);
      await store.settle();
      calls = 0;
      await store.dispatchAsync(change());
      const observed = await firstValueFrom(selected);
      if (mode === 'leaf') expect(observed).toBe(1);
      else if (mode === 'ui') expect(observed).toEqual({ value: 1 });
      else if (mode === 'row') expect(observed).toEqual([{ id: 't1', done: true }]);
      else if (mode === 'cached')
        expect(observed).toEqual({ ids: ['t1'], entities: { t1: { id: 't1', done: true } } });
      console.log('[phase13 calls]', mode, calls);
      expect(calls).toBeLessThanOrEqual(scalar ? 1 : mode === 'cold' ? 3 : 2);
      sub.unsubscribe();
      count?.unsubscribe();
      await raw.close();
    },
  );

  it('seeds 50k with bounded bridge calls and no collection read-back', async () => {
    const { driver, counts } = countingDriver();
    const adapter = createEntityAdapter<{ id: string; done: boolean }>();
    const initial = adapter.getInitialState();
    const source = createFeatureSelector<typeof initial>('todos');
    const seed = createAction('[Floor] seed 50k');
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          {
            todos: createReducer(
              initial,
              on(seed, (tx) =>
                adapter.setAll(
                  tx,
                  Array.from({ length: 50000 }, (_, i) => ({ id: `t${i}`, done: false })),
                ),
              ),
            ),
          },
          { sqlite: { driver } },
        ),
      ],
    });
    const store = TestBed.inject(Store);
    await store.settle();
    const sub = store.select(source).subscribe();
    await firstValueFrom(store.select(source));
    counts.statements = 0;
    counts.trace.length = 0;
    await store.dispatchAsync(seed());
    expect(counts.statements).toBeLessThanOrEqual(Math.ceil((50000 * 5) / 900));
    expect(counts.trace.filter((sql) => sql.startsWith('SELECT path, parent'))).toEqual([]);
    expect((await firstValueFrom(store.select(source))).ids).toHaveLength(50000);
    console.log('[phase13 seed calls]', counts.statements);
    sub.unsubscribe();
    await driver.close();
  }, 60000);

  it.each([false, true])(
    'keeps mixed journals consistent with SQLite (keyed: %s)',
    async (keyed) => {
      const adapter = createEntityAdapter<{ id: string; done: boolean }>({
        ...(keyed ? { sortKey: (row: { id: string }) => row.id } : {}),
      });
      const initial = adapter.getInitialState();
      const source = createFeatureSelector<typeof initial>('todos');
      const duplicate = createAction('[Floor] duplicate');
      const update = createAction('[Floor] insert then update');
      const reorder = createAction('[Floor] reorder then update');
      TestBed.configureTestingModule({
        providers: [
          provideStore(
            {
              todos: createReducer(
                initial,
                on(duplicate, async (tx) => {
                  await adapter.addOne(tx, { id: 't1', done: false });
                  await adapter.addOne(tx, { id: 't1', done: true });
                }),
                on(update, async (tx) => {
                  await adapter.addOne(tx, { id: 't2', done: false });
                  await adapter.updateOne(tx, { id: 't2', changes: { done: true } });
                  await adapter.addOne(tx, { id: 't2', done: false });
                }),
                on(reorder, async (tx) => {
                  await tx.entities('').setPosition('t1', 10);
                  await adapter.updateOne(tx, { id: 't1', changes: { done: true } });
                }),
              ),
            },
            { sqlite: { driver: new SqlJsDriver() } },
          ),
        ],
      });
      const store = TestBed.inject(Store);
      await store.settle();
      const sub = store.select(source).subscribe();
      await firstValueFrom(store.select(source));
      for (const action of [duplicate(), update(), reorder()]) {
        await store.dispatchAsync(action);
        const persisted = await TestBed.inject(StorageEngine).read((sql) =>
          new NodeStore().read(sql, 'todos'),
        );
        expect(TestBed.inject(PathCache).peek('todos')).toEqual(persisted);
      }
      const previous = TestBed.inject(PathCache).peek('todos');
      await store.dispatchAsync(duplicate());
      expect(TestBed.inject(PathCache).peek('todos')).toBe(previous);
      sub.unsubscribe();
      await TestBed.inject(StorageEngine).close();
    },
  );
});

describe('bridge cost (statement budgets)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('preserves replacement identities on equal-content feature resets', async () => {
    const reset = createAction('[Bridge regression] Reset');
    const initial = { nested: { value: 1 }, items: [{ id: 1 }] };
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          {
            sample: createReducer(
              initial,
              on(reset, (tx) => tx.resetFeature()),
            ),
          },
          { sqlite: { driver: new SqlJsDriver() } },
        ),
      ],
    });
    const store = TestBed.inject(Store);
    await store.settle();
    const values: unknown[] = [];
    const selected = store.select((state: { sample: typeof initial }) => state.sample.nested);
    const subscription = selected.subscribe((value) => values.push(value));
    try {
      await firstValueFrom(selected);
      await store.dispatchAsync(reset());
      expect(values).toEqual([{ value: 1 }, { value: 1 }]);
      expect(values[1]).not.toBe(values[0]);
    } finally {
      subscription.unsubscribe();
    }
  });

  it.each([false, true])('enforces all budgets (active sources: %s)', async (active) => {
    const { driver, counts } = countingDriver();
    TestBed.configureTestingModule({
      providers: [provideStore(bridgeReducers, { sqlite: { driver, wholeStore: 'pin-all' } })],
    });
    const { report, traces } = await exerciseBridgeCost(
      TestBed.inject(Store),
      counts,
      active,
      (actual, expected, label) => expect(actual, label).toEqual(expected),
    );
    console.log('[bridge-cost]', JSON.stringify({ active, ...report }));
    if (active) expect(report['setScalar']).toBe(1);
    for (const [operation, budget] of Object.entries(bridgeBudgets))
      expect
        .soft(report[operation], `${operation}: ${JSON.stringify(traces)}`)
        .toBeLessThanOrEqual(budget);
  });
});
