import { TestBed } from '@angular/core/testing';
import { createAction } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEntityAdapter } from '../../../entity/src/entity-adapter';
import { countingDriver } from '../../../spikes/bridge-cost-workload';
import { createReducer, on } from '../reducer/reducer';
import { createFeatureSelector, createSelector } from '../selectors/selectors';
import { PathCache } from '../selectors/path-cache';
import { source as pathSource } from '../selectors/metadata';
import { querySources } from '../selectors/metadata';
import { createQuerySelector } from '../selectors/query-selector';
import { brandEntityState } from '../schema/entity-brand';
import { StorageEngine } from '../storage/storage-engine';
import { provideStore } from '../store/provide';
import { State } from '../store/state';
import { Store } from '../store/store';

const adapter = createEntityAdapter<{ id: string; done: boolean; title: string }>();
const initial = adapter.getInitialState({ filter: 'all' });
const seed = createAction('[Scale test] seed');
const toggle = createAction('[Scale test] toggle');
const ui = createAction('[Scale test] ui');
const extra = createAction('[Scale test] extra');
const extraBranded = createAction('[Scale test] branded extra');
const source = createFeatureSelector<typeof initial>('todos');
const all = adapter.getSelectors(source).selectAll;
let engine: StorageEngine;
afterEach(async () => {
  vi.restoreAllMocks();
  TestBed.resetTestingModule();
  if (engine) await engine.close();
  all.release();
});
async function setup(n = 1000, budget?: number, lruSize = 32, collision = false, keyed = false) {
  const { driver, counts } = countingDriver();
  const operations = keyed
    ? createEntityAdapter<{ id: string; done: boolean; title: string }>({
        sortKey: (todo) => todo.title,
      })
    : adapter;
  TestBed.configureTestingModule({
    providers: [
      provideStore(
        {
          todos: createReducer(
            collision ? adapter.getInitialState({ filter: 'all', 's:t1': 0 }) : initial,
            on(seed, (tx) =>
              operations.setAll(
                tx,
                Array.from({ length: n }, (_, i) => ({
                  id: `t${i}`,
                  done: false,
                  title: 'x'.repeat(60),
                })),
              ),
            ),
            on(toggle, (tx) => operations.updateOne(tx, { id: 't1', changes: { done: true } })),
            on(extra, (tx) => tx.set('s:t1', 1)),
            on(extraBranded, async (tx) =>
              tx.set(
                '',
                brandEntityState({
                  ...(await tx.get<Record<string, unknown>>()),
                  's:t1': 2,
                }),
              ),
            ),
          ),
          ui: createReducer(
            { value: 0 },
            on(ui, () => ({ value: 1 })),
          ),
        },
        {
          sqlite: {
            driver,
            lruSize,
            ...(budget === undefined ? {} : { cacheBudgetBytes: budget }),
          },
        },
      ),
    ],
  });
  const store = TestBed.inject(Store);
  engine = TestBed.inject(StorageEngine);
  await store.settle();
  await store.dispatchAsync(seed());
  return { store, counts, cache: TestBed.inject(PathCache) };
}
describe('phase 12 scale', () => {
  it('distinguishes a new physical scalar from an entity id in a branded replacement', async () => {
    const { store, cache } = await setup(10);
    const sub = store.select(all).subscribe();
    await firstValueFrom(store.select(all));
    await store.dispatchAsync(extraBranded());
    expect((cache.peek('todos') as { 's:t1': number })['s:t1']).toBe(2);
    sub.unsubscribe();
  });
  it('budgets Map query values and cycles without retaining or recursively looping', async () => {
    const { store, cache } = await setup(10, 1024);
    const value = new Map<string, unknown>([['big', 'x'.repeat(5000)]]);
    value.set('cycle', value);
    const query = createQuerySelector(
      { path: 'todos', key: 'cyclic-map', initial: new Map<string, unknown>() },
      async () => value,
    );
    const sub = store.select(query).subscribe();
    expect(await firstValueFrom(store.select(query))).toBe(value);
    const id = querySources(query)[0].id;
    expect(cache.ready(id)).toBe(true);
    sub.unsubscribe();
    expect(cache.ready(id)).toBe(false);
  });
  it('keeps keyed collections granular when the sort key is unchanged', async () => {
    const { store, cache, counts } = await setup(1000, undefined, 32, false, true);
    const sub = store.select(all).subscribe();
    await firstValueFrom(store.select(all));
    await store.settle();
    const previous = cache.peek('todos') as typeof initial;
    counts.trace.length = 0;
    await store.dispatchAsync(toggle());
    const next = cache.peek('todos') as typeof initial;
    expect(next.ids).toBe(previous.ids);
    expect(counts.trace.some((sql) => /WHERE coll = \? AND id IN/.test(sql))).toBe(false);
    sub.unsubscribe();
  });
  it('releases the complete entity selector memo graph', () => {
    const selected = adapter.getSelectors(source).selectAll;
    const state = { todos: adapter.setAll([{ id: 'a', done: false, title: 'a' }], initial) };
    const before = selected(state);
    selected.release();
    expect(selected(state)).not.toBe(before);
    selected.release();
  });
  it.each([false, true])(
    'refreshes colliding extra scalars (already present: %s)',
    async (present) => {
      const { store, cache } = await setup(10, undefined, 32, present);
      const sub = store.select(all).subscribe();
      await firstValueFrom(store.select(all));
      await store.dispatchAsync(extra());
      expect((cache.peek('todos') as { 's:t1': number })['s:t1']).toBe(1);
      sub.unsubscribe();
    },
  );
  it('releases selector memos on later LRU eviction, after their subscriber has gone', async () => {
    const { store, cache } = await setup(10, undefined, 1);
    const release = vi.spyOn(all, 'release');
    const sub = store.select(all).subscribe();
    await firstValueFrom(store.select(all));
    await store.settle();
    for (let i = 0; i < 20; i++) await firstValueFrom(store.select(all));
    sub.unsubscribe();
    expect(cache.ready('todos')).toBe(true);
    expect(release).not.toHaveBeenCalled();
    const other = store.select('ui').subscribe();
    await firstValueFrom(store.select('ui'));
    await store.settle();
    other.unsubscribe();
    expect(cache.ready('todos')).toBe(false);
    expect(release).toHaveBeenCalledTimes(1);
  });
  it('reads only the changed entity and preserves ids and every unchanged entity', async () => {
    const { store, counts, cache } = await setup();
    const sub = store.select(all).subscribe();
    const query = store.select(adapter.query(source).count({ done: false })).subscribe();
    await firstValueFrom(store.select(all));
    await store.settle();
    const previous = cache.peek('todos') as typeof initial;
    counts.trace.length = 0;
    const changes: string[][] = [];
    const commits = engine.changes$.subscribe((c) => changes.push([...c.paths()]));
    await store.dispatchAsync(toggle());
    const next = cache.peek('todos') as typeof initial;
    expect(next.ids).toBe(previous.ids);
    expect(next.entities).not.toBe(previous.entities);
    expect(next.entities['t1']).not.toBe(previous.entities['t1']);
    for (const id of previous.ids)
      if (id !== 't1') expect(next.entities[id]).toBe(previous.entities[id]);
    const refresh = counts.trace.slice(counts.trace.indexOf('COMMIT') + 1);
    expect(refresh.length).toBeLessThanOrEqual(3);
    expect(refresh.some((sql) => /WHERE coll = \? AND id IN/.test(sql))).toBe(false);
    expect(changes.at(-1)).toEqual(['todos/s:t1']);
    commits.unsubscribe();
    sub.unsubscribe();
    query.unsubscribe();
  });
  it('does not freeze, reconcile or recompute unchanged loaded collections on ui commits', async () => {
    const { store, counts, cache } = await setup();
    const projector = vi.fn((value: typeof initial) => value.ids.length);
    const input = pathSource(vi.fn(source), 'todos');
    const selected = createSelector(input, projector);
    const sub = store.select(selected).subscribe();
    const uiSub = store.select('ui', 'value').subscribe();
    await firstValueFrom(store.select(selected));
    await store.settle();
    const previous = cache.peek('todos') as typeof initial;
    const values = vi.spyOn(Object, 'values');
    const keys = vi.spyOn(Object, 'keys');
    projector.mockClear();
    input.mockClear();
    counts.trace.length = 0;
    await store.dispatchAsync(ui());
    expect(cache.peek('todos')).toBe(previous);
    expect(projector).not.toHaveBeenCalled();
    expect(input).not.toHaveBeenCalled();
    for (const spy of [values, keys])
      expect(
        spy.mock.calls.filter(
          ([value]) => value === previous || value === previous.ids || value === previous.entities,
        ),
      ).toHaveLength(0);
    expect(counts.trace.some((sql) => /SELECT coll,id,pos,data FROM nss_entity/.test(sql))).toBe(
      false,
    );
    sub.unsubscribe();
    uiSub.unsubscribe();
    selected.release();
  });
  it('evicts released collections immediately over the default byte budget and drops view retention', async () => {
    const { store, cache } = await setup(50000);
    const sub = store.select(all).subscribe();
    await firstValueFrom(store.select(all));
    await store.settle();
    expect(cache.ready('todos')).toBe(true);
    sub.unsubscribe();
    expect(cache.ready('todos')).toBe(false);
    expect(cache.view).not.toHaveProperty('todos');
    expect(TestBed.inject(State).value).not.toHaveProperty('todos');
  }, 30000);
  it('applies the byte budget to inactive entries while active sources stay pinned', async () => {
    const { store, cache } = await setup(10, 0);
    const sub = store.select(all).subscribe();
    await firstValueFrom(store.select(all));
    await store.settle();
    expect(cache.ready('todos')).toBe(true);
    sub.unsubscribe();
    expect(cache.ready('todos')).toBe(false);
  });
});
