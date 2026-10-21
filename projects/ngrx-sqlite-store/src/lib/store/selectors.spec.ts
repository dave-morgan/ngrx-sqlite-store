import {
  Component,
  EnvironmentInjector,
  computed,
  createEnvironmentInjector,
  inject,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Actions, ROOT_EFFECTS_INIT, createEffect, ofType, provideEffects } from '@ngrx/effects';
import { getRouterSelectors, provideRouterStore, routerReducer } from '@ngrx/router-store';
import * as ngrx from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, map, tap, withLatestFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createFeature,
  createFeatureSelector,
  createSelector,
  createSelectorFactory,
  defaultMemoize,
  resultMemoize,
  select,
} from '../../public-api';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { createReducer, on } from '../reducer/reducer';
import { SqliteStoreCore } from './core';
import { provideStore } from './provide';
import { Store } from './store';
import { State } from './state';
import { NSS_DEPS, NSS_SOURCE } from '../selectors/metadata';
import { PathCache } from '../selectors/path-cache';
import { NodeStore } from '../schema/node-store';
import { brandEntityState } from '../schema/entity-brand';
import { share } from '../selectors/view-state';

const filter = ngrx.createAction('[selectors] filter');
const append = ngrx.createAction('[selectors] append');
const copy = ngrx.createAction('[selectors] copy');
const feature = createFeature({
  name: 'todos',
  reducer: ngrx.createReducer(
    { items: ['one'], filter: 'all' },
    ngrx.on(filter, (s) => ({ ...s, filter: 'done' })),
    ngrx.on(append, (s) => ({ ...s, items: [...s.items, 'two'] })),
    ngrx.on(copy, (s) => ({ ...s, items: [...s.items] })),
  ),
  extraSelectors: ({ selectItems }) => ({
    selectCount: createSelector(selectItems, (items) => items.length),
  }),
});
let core: SqliteStoreCore;
afterEach(async () => {
  TestBed.resetTestingModule();
  if (core) await core.engine.close();
});
async function boot(eager: string[] = []) {
  const driver = new SqlJsDriver();
  TestBed.configureTestingModule({
    providers: [provideStore({ todos: feature.reducer }, { sqlite: { driver, eager } })],
  });
  const store = TestBed.inject(Store);
  core = TestBed.inject(SqliteStoreCore);
  await store.settle();
  return { store, driver };
}

describe('phase 4b selectors', () => {
  it('shares only own state properties, never inherited containers', () => {
    const inherited = { value: 1 };
    const previous = Object.create({ nested: inherited });
    const result = share(previous, { nested: { value: 1 } }) as { nested: object };
    expect(result.nested).not.toBe(inherited);
    expect(Object.isFrozen(inherited)).toBe(false);
  });
  it('preserves NgRx selector helpers, metadata, overrides and feature extras typing', () => {
    const source = createFeatureSelector<{ items: string[] }>('a/b');
    expect((source as unknown as { [NSS_SOURCE]: { path: string } })[NSS_SOURCE]).toEqual({
      path: 'a~1b',
    });
    expect(Object.keys(source)).not.toContain(String(NSS_SOURCE));
    const selector = createSelector({ items: feature.selectItems, count: feature.selectCount });
    expect((selector as unknown as { [NSS_DEPS]: string[] })[NSS_DEPS]).toEqual(['todos/items']);
    expect(selector({ todos: { items: ['x'], filter: 'all' } })).toEqual({
      items: ['x'],
      count: 1,
    });
    selector.setResult({ items: [], count: 8 });
    expect(selector({})).toEqual({ items: [], count: 8 });
    selector.clearResult();
    selector.release();
    const factory = createSelectorFactory(defaultMemoize);
    const wrapped = factory([feature.selectItems], (items: string[]) => items.length);
    expect((wrapped as unknown as { [NSS_DEPS]: string[] })[NSS_DEPS]).toEqual(['todos/items']);
    expect(wrapped({ todos: { items: ['a', 'b'] } })).toBe(2);
    const memo = resultMemoize(
      (n: number) => [n],
      (a: number[], b: number[]) => a[0] === b[0],
    );
    expect(memo.memoized(1)).toBe(memo.memoized(1));
    const name: 'todos' = feature.name;
    const items: string[] = feature.selectItems({ todos: { items: [], filter: 'all' } });
    const count: number = feature.selectCount({ todos: { items, filter: 'all' } });
    expect([name, count]).toEqual(['todos', 0]);
  });
  it('loads only the selected property and reuses it synchronously after unsubscribe', async () => {
    const { store, driver } = await boot();
    const query = vi.spyOn(driver, 'query');
    const values: unknown[] = [];
    const subscription = store.select(feature.selectItems).subscribe((value) => values.push(value));
    expect(values).toEqual([]);
    await expect.poll(() => values.length).toBe(1);
    const reads = query.mock.calls.filter(([sql]) => sql.startsWith('SELECT path, parent'));
    expect(reads.map(([, params]) => params?.[0])).toEqual(['todos/items']);
    subscription.unsubscribe();
    query.mockClear();
    const again = store.select(feature.selectItems).subscribe((value) => values.push(value));
    expect(values).toEqual([['one'], ['one']]);
    expect(query).not.toHaveBeenCalled();
    again.unsubscribe();
  });

  it('keeps item references and projector memoization through a sibling change', async () => {
    const { store } = await boot(['todos']);
    const project = vi.fn((items: string[]) => items.length);
    const count = createSelector(feature.selectItems, project);
    const values: number[] = [];
    const subscription = store.select(count).subscribe((value) => values.push(value));
    expect(values).toEqual([1]);
    await store.dispatchAsync(filter());
    expect(project).toHaveBeenCalledTimes(1);
    await store.dispatchAsync(append());
    expect(values).toEqual([1, 2]);
    subscription.unsubscribe();
  });

  it('loads a dynamic lambda and foreign feature selector', async () => {
    const { store } = await boot();
    const typed = store as Store<{ todos: { items: string[]; filter: string } }>;
    expect(await firstValueFrom(typed.select((s) => s.todos.items.length))).toBe(1);
    expect(await firstValueFrom(store.select(ngrx.createFeatureSelector('todos')))).toEqual({
      items: ['one'],
      filter: 'all',
    });
  });

  it('returns signal defaults before loading and committed values after loading', async () => {
    const { store } = await boot();
    await store.dispatchAsync(append());
    const count = TestBed.runInInjectionContext(() => store.selectSignal(feature.selectCount));
    expect(count()).toBe(1);
    await expect.poll(() => count()).toBe(2);
  });

  it('invalidates committed values synchronously before the next transaction reads', async () => {
    const seen: number[] = [];
    const increment = ngrx.createAction('[selectors] increment');
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          {
            counter: createReducer(
              { count: 0 },
              on(increment, async (tx) => {
                const value = await tx.get<number>('count');
                seen.push(value);
                await tx.set('count', value + 1);
              }),
            ),
          },
          { sqlite: { driver: new SqlJsDriver(), eager: ['counter'] } },
        ),
      ],
    });
    const store = TestBed.inject(Store);
    core = TestBed.inject(SqliteStoreCore);
    await store.settle();
    await Promise.all([store.dispatchAsync(increment()), store.dispatchAsync(increment())]);
    expect(seen).toEqual([0, 1]);
  });

  it('matches real NgRx projector counts and emissions across the same dispatch sequence', async () => {
    async function run(sqlite: boolean) {
      const makeFeature = sqlite ? createFeature : ngrx.createFeature;
      const makeSelector = sqlite ? createSelector : ngrx.createSelector;
      const own = makeFeature({ name: 'todos', reducer: feature.reducer });
      const itemsProjector = vi.fn((items: string[]) => items.length);
      const filterProjector = vi.fn((count: number, value: string) => `${value}:${count}`);
      const count = makeSelector(own.selectItems, itemsProjector);
      const summary = makeSelector(count, own.selectFilter, filterProjector);
      TestBed.configureTestingModule({
        providers: [
          sqlite
            ? provideStore(
                { todos: feature.reducer },
                { sqlite: { driver: new SqlJsDriver(), eager: ['todos'] } },
              )
            : ngrx.provideStore({ todos: feature.reducer }),
        ],
      });
      const store = TestBed.inject(ngrx.Store);
      if (sqlite) {
        core = TestBed.inject(SqliteStoreCore);
        await core.initialize();
        await TestBed.inject(Store).settle();
      }
      const emitted: string[] = [];
      const subscription = store.select(summary).subscribe((value) => emitted.push(value));
      const counts: number[][] = [
        [itemsProjector.mock.calls.length, filterProjector.mock.calls.length],
      ];
      for (const action of [filter(), filter(), append(), { type: 'noop' }, copy(), append()]) {
        store.dispatch(action);
        if (sqlite) await TestBed.inject(Store).settle();
        counts.push([itemsProjector.mock.calls.length, filterProjector.mock.calls.length]);
      }
      subscription.unsubscribe();
      TestBed.resetTestingModule();
      if (sqlite) await core.engine.close();
      return { counts, emitted };
    }
    expect(await run(true)).toEqual(await run(false));
  });

  it('refreshes before real effects use withLatestFrom, including ROOT_EFFECTS_INIT', async () => {
    const observed: number[] = [];
    const root: number[] = [];
    const synchronous: number[] = [];
    const effect = createEffect(
      (actions = inject(Actions), store = inject(ngrx.Store)) =>
        actions.pipe(
          ofType(append),
          withLatestFrom(store.select(feature.selectCount)),
          tap(([, count]) => observed.push(count)),
        ),
      { functional: true, dispatch: false },
    );
    const init = createEffect(
      (actions = inject(Actions), store = inject(ngrx.Store)) =>
        actions.pipe(
          ofType(ROOT_EFFECTS_INIT),
          withLatestFrom(store.select(feature.selectCount)),
          tap(([, count]) => root.push(count)),
          tap(() => {
            const selected = store
              .select(feature.selectCount)
              .subscribe((count) => synchronous.push(count));
            expect(synchronous).toEqual([1]);
            selected.unsubscribe();
          }),
        ),
      { functional: true, dispatch: false },
    );
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          { todos: feature.reducer },
          { sqlite: { driver: new SqlJsDriver(), eager: ['todos'] } },
        ),
        provideEffects({ effect, init }),
      ],
    });
    const store = TestBed.inject(Store);
    core = TestBed.inject(SqliteStoreCore);
    await store.settle();
    expect(root).toEqual([1]);
    expect(synchronous).toEqual([1]);
    await store.dispatchAsync(append());
    expect(observed).toEqual([2]);
  });

  it('works with real router-store selectors through RouterTestingHarness navigation', async () => {
    @Component({ template: 'route' })
    class Page {}
    TestBed.configureTestingModule({
      providers: [
        provideStore({ router: routerReducer }, { sqlite: { driver: new SqlJsDriver() } }),
        provideRouter([
          { path: 'one', component: Page },
          { path: 'two', component: Page },
        ]),
        provideRouterStore(),
      ],
    });
    const store = TestBed.inject(Store);
    core = TestBed.inject(SqliteStoreCore);
    const urls: unknown[] = [];
    const failures: unknown[] = [];
    TestBed.inject(ngrx.ActionsSubject).subscribe((action) => {
      if ('error' in action) failures.push(action);
    });
    const subscription = store
      .select(getRouterSelectors().selectUrl)
      .subscribe((url) => urls.push(url));
    const harness = await RouterTestingHarness.create('/one');
    await store.settle();
    await harness.navigateByUrl('/two');
    await store.settle();
    expect(failures).toEqual([]);
    expect(urls).toContain('/one');
    expect(urls.at(-1)).toBe('/two');
    subscription.unsubscribe();
  });

  it('supports MockStore overrideSelector in a component using our selector', () => {
    @Component({ template: '{{ count() }}' })
    class Counter {
      readonly count = inject(ngrx.Store).selectSignal(feature.selectCount);
    }
    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState: { todos: { items: [] } } })],
    });
    const mock = TestBed.inject(MockStore);
    const override = mock.overrideSelector(feature.selectCount, 7);
    const fixture = TestBed.createComponent(Counter);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('7');
    override.setResult(9);
    mock.refreshState();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('9');
    mock.resetSelectors();
  });

  it('honors selectSignal equal and releases sources when its context is destroyed', async () => {
    const { store } = await boot(['todos']);
    const count = TestBed.runInInjectionContext(() =>
      store.selectSignal(feature.selectCount, {
        equal: (a, b) => Math.floor(a / 3) === Math.floor(b / 3),
      }),
    );
    const render = vi.fn((n: number) => n);
    const displayed = computed(() => render(count()));
    expect(displayed()).toBe(1);
    await store.dispatchAsync(append());
    expect(displayed()).toBe(1);
    expect(render).toHaveBeenCalledTimes(1);
    await store.dispatchAsync(append());
    expect(displayed()).toBe(3);
  });

  it('evicts inactive paths beyond lruSize while retaining active and eager paths', async () => {
    const driver = new SqlJsDriver();
    TestBed.configureTestingModule({
      providers: [provideStore({ todos: feature.reducer }, { sqlite: { driver, lruSize: 1 } })],
    });
    const store = TestBed.inject(Store);
    core = TestBed.inject(SqliteStoreCore);
    await store.settle();
    await firstValueFrom(store.select(feature.selectItems));
    await firstValueFrom(store.select(feature.selectFilter));
    const query = vi.spyOn(driver, 'query');
    const values: unknown[] = [];
    const subscription = store.select(feature.selectItems).subscribe((value) => values.push(value));
    expect(values).toEqual([]);
    await expect.poll(() => values.length).toBe(1);
    expect(query.mock.calls.some(([, params]) => params?.[0] === 'todos/items')).toBe(true);
    subscription.unsubscribe();
  });

  it('pins whole store subscriptions and materializes every registered feature', async () => {
    const { store } = await boot();
    const values: unknown[] = [];
    const subscription = store.subscribe((state) => values.push(state));
    await expect.poll(() => values.at(-1)).toEqual({ todos: { items: ['one'], filter: 'all' } });
    await store.dispatchAsync(append());
    expect(values.at(-1)).toEqual({ todos: { items: ['one', 'two'], filter: 'all' } });
    expect(TestBed.inject(State).value).toEqual(values.at(-1));
    expect(await store.materialize()).toEqual(values.at(-1));
    subscription.unsubscribe();
  });

  it('accepts key strings, deprecated selector props and our pipeable operator', async () => {
    const { store } = await boot();
    expect(await firstValueFrom(store.select('todos', 'items'))).toEqual(['one']);
    expect(
      await firstValueFrom(
        store.select((s: any, props: { index: number }) => s.todos.items[props.index], {
          index: 0,
        }),
      ),
    ).toBe('one');
    expect(await firstValueFrom(store.pipe(select(feature.selectCount)))).toBe(1);
    expect(await firstValueFrom(store.pipe(select(ngrx.createFeatureSelector('todos'))))).toEqual({
      items: ['one'],
      filter: 'all',
    });
  });

  it('coalesces overlapping loads and only refreshes a changed child of an active feature', async () => {
    const { store, driver } = await boot();
    const items = await firstValueFrom(store.select(feature.selectItems));
    const subscription = store.select(feature.selectTodosState).subscribe();
    await expect.poll(() => TestBed.inject(PathCache).ready('todos')).toBe(true);
    expect(TestBed.inject(PathCache).peek('todos/items')).toBe(items);
    const query = vi.spyOn(driver, 'query');
    let committedAt = 0;
    const commits = core.engine.changes$.subscribe(() => {
      committedAt = query.mock.calls.length;
    });
    await store.dispatchAsync(filter());
    const reads = query.mock.calls
      .slice(committedAt)
      .filter(([sql]) => sql.startsWith('SELECT path, parent'));
    expect(reads).toEqual([]);
    expect(TestBed.inject(PathCache).peek('todos/filter')).toBe('done');
    expect(TestBed.inject(PathCache).peek('todos/items')).toBe(items);
    subscription.unsubscribe();
    commits.unsubscribe();
  });

  it('round-trips nss_entity values without introducing an entity selector implementation', async () => {
    const state = brandEntityState({ ids: [1], entities: { 1: { id: 1, text: 'one' } } });
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          {
            collection: ngrx.createReducer(state),
          },
          { sqlite: { driver: new SqlJsDriver() } },
        ),
      ],
    });
    const store = TestBed.inject(Store);
    core = TestBed.inject(SqliteStoreCore);
    await store.settle();
    expect(await firstValueFrom(store.select(createFeatureSelector('collection')))).toEqual(state);
    expect(await core.engine.read((sql) => new NodeStore().read(sql, 'collection'))).toEqual(state);
  });

  it('loads the full view for an identity lambda and preserves plain frozen state', async () => {
    const { store } = await boot();
    const state = await firstValueFrom(store.select((s) => s));
    expect(state).toEqual({ todos: { items: ['one'], filter: 'all' } });
    expect(Object.isFrozen(state)).toBe(true);
  });

  it('fills unloaded signal siblings from defaults when a different sibling is cached', async () => {
    const { store } = await boot();
    await firstValueFrom(store.select(feature.selectItems));
    const value = store.selectSignal(feature.selectFilter);
    expect(value()).toBe('all');
    await expect.poll(() => value()).toBe('all');
  });

  it('loads a newly selected dynamic branch before scanned effects see the result', async () => {
    const switchBranch = ngrx.createAction('[selectors] switch branch');
    const observed: number[] = [];
    const projection = (s: any) => (s.control.other ? s.right.value : s.left.value);
    const effect = createEffect(
      (actions = inject(Actions), store = inject(ngrx.Store)) =>
        actions.pipe(
          ofType(switchBranch),
          withLatestFrom(store.select(projection)),
          tap(([, value]) => observed.push(value)),
        ),
      { functional: true, dispatch: false },
    );
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          {
            control: ngrx.createReducer(
              { other: false },
              ngrx.on(switchBranch, () => ({ other: true })),
            ),
            left: ngrx.createReducer({ value: 1 }),
            right: ngrx.createReducer({ value: 2 }),
          },
          { sqlite: { driver: new SqlJsDriver() } },
        ),
        provideEffects({ effect }),
      ],
    });
    const store = TestBed.inject(Store);
    core = TestBed.inject(SqliteStoreCore);
    await store.settle();
    await store.dispatchAsync(switchBranch());
    expect(observed).toEqual([2]);
  });

  it('pins late features for whole-store subscribers and hides unregistered features', async () => {
    const { store } = await boot();
    const views: object[] = [];
    const subscription = store.subscribe((view) => views.push(view));
    await expect.poll(() => views.at(-1)).toEqual({ todos: { items: ['one'], filter: 'all' } });
    store.addReducer('late', ngrx.createReducer({ value: 5 }));
    await store.settle();
    expect(views.at(-1)).toEqual({ todos: { items: ['one'], filter: 'all' }, late: { value: 5 } });
    store.removeReducer('late');
    await store.settle();
    expect(views.at(-1)).toEqual({ todos: { items: ['one'], filter: 'all' } });
    expect(await store.materialize()).toEqual(views.at(-1));
    subscription.unsubscribe();
  });

  it('releases a signal source with its injection context so lruSize zero can evict it', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          { todos: feature.reducer },
          { sqlite: { driver: new SqlJsDriver(), lruSize: 0 } },
        ),
      ],
    });
    const store = TestBed.inject(Store);
    core = TestBed.inject(SqliteStoreCore);
    await store.settle();
    const child = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
    const value = child.runInContext(() => store.selectSignal(feature.selectItems));
    await expect.poll(() => TestBed.inject(PathCache).ready('todos/items')).toBe(true);
    expect(value()).toEqual(['one']);
    child.destroy();
    expect(TestBed.inject(PathCache).ready('todos/items')).toBe(false);
  });

  it('retains array shape when loading an ancestor after an array-element path', async () => {
    const { store } = await boot();
    expect(await firstValueFrom(store.select('todos', 'items', '0'))).toBe('one');
    const items = await firstValueFrom(store.select(feature.selectItems));
    expect(Array.isArray(items)).toBe(true);
    expect(items).toEqual(['one']);
  });

  it('refreshes logical array indices when hidden physical element ids change', async () => {
    const reverse = ngrx.createAction('[selectors] reverse');
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          {
            todos: ngrx.createReducer(
              { items: ['one', 'two'] },
              ngrx.on(reverse, (s) => ({ items: [...s.items].reverse() })),
            ),
          },
          { sqlite: { driver: new SqlJsDriver() } },
        ),
      ],
    });
    const store = TestBed.inject(Store);
    core = TestBed.inject(SqliteStoreCore);
    await store.settle();
    const values: unknown[] = [];
    const subscription = store
      .select('todos', 'items', '0')
      .subscribe((value) => values.push(value));
    await expect.poll(() => values).toEqual(['one']);
    await store.dispatchAsync(reverse());
    expect(values).toEqual(['one', 'two']);
    subscription.unsubscribe();
  });

  it('applies pipeable selection after prior RxJS operators', async () => {
    const { store } = await boot(['todos']);
    expect(
      await firstValueFrom(
        store.pipe(
          map((s: any) => ({ value: s.todos.items.length })),
          select('value'),
        ),
      ),
    ).toBe(1);
    const lifted = store.pipe(map((s: any) => ({ value: s.todos.items.length }))) as Store<{
      value: number;
    }>;
    expect(await firstValueFrom(lifted.select('value'))).toBe(1);
  });

  it('lets a signal recover from errors even when the next result equals its earlier value', async () => {
    const fail = ngrx.createAction('[selectors] signal error');
    const recover = ngrx.createAction('[selectors] signal recover');
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          {
            status: ngrx.createReducer(
              { error: false },
              ngrx.on(fail, () => ({ error: true })),
              ngrx.on(recover, () => ({ error: false })),
            ),
          },
          { sqlite: { driver: new SqlJsDriver(), eager: ['status'] } },
        ),
      ],
    });
    const store = TestBed.inject(Store);
    core = TestBed.inject(SqliteStoreCore);
    await store.settle();
    const value = store.selectSignal((s: any) => {
      if (s.status.error) throw new Error('temporary failure');
      return 42;
    });
    expect(value()).toBe(42);
    await store.dispatchAsync(fail());
    expect(value).toThrow('temporary failure');
    await store.dispatchAsync(recover());
    expect(value()).toBe(42);
  });
});
