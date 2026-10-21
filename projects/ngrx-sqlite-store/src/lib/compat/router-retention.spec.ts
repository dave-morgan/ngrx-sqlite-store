import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Actions, ROOT_EFFECTS_INIT, createEffect, ofType, provideEffects } from '@ngrx/effects';
import {
  ROUTER_CANCEL,
  ROUTER_ERROR,
  ROUTER_NAVIGATED,
  provideRouterStore,
  routerReducer,
} from '@ngrx/router-store';
import { createAction } from '@ngrx/store';
import { firstValueFrom, switchMap, take, tap, withLatestFrom } from 'rxjs';
import { expect, it } from 'vitest';
import { createEntityAdapter } from '../../../entity/src/entity-adapter';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { createReducer, on } from '../reducer/reducer';
import { PathCache } from '../selectors/path-cache';
import { createFeature } from '../selectors/selectors';
import { StorageEngine } from '../storage/storage-engine';
import { provideStore } from '../store/provide';
import { State } from '../store/state';
import { Store } from '../store/store';

@Component({ template: 'retention page' })
class Page {}

it.each([
  { wholeStore: 'loaded', harnessSubscriptions: false },
  { wholeStore: 'loaded', harnessSubscriptions: true },
  { wholeStore: 'pin-all', harnessSubscriptions: false },
  { wholeStore: 'pin-all', harnessSubscriptions: true },
] as const)(
  'bounds router-store retention ($wholeStore, harness subscriptions: $harnessSubscriptions)',
  async ({ wholeStore, harnessSubscriptions }) => {
    const adapter = createEntityAdapter<{ id: string; title: string; done: boolean }>();
    const usersAdapter = createEntityAdapter<{ id: string; name: string }>();
    const seed = createAction('[Seed] Loaded');
    const reset = createAction('[Seed] Reset');
    const tick = createAction('[Seed] Applied');
    const initial: ReturnType<typeof adapter.getInitialState> & {
      filter: string;
      query: string;
      userId: string | null;
      seedVersion: number;
    } = adapter.getInitialState({ filter: 'all', query: '', userId: null, seedVersion: 0 });
    const todos = createFeature({
      name: 'todos',
      reducer: createReducer<typeof initial>(
        initial,
        on(seed, async (tx) => {
          await adapter.setAll(
            tx,
            Array.from({ length: 50000 }, (_, i) => ({
              id: `t${i}`,
              title: `Todo #${i}`,
              done: false,
            })),
          );
          return { seedVersion: 1 };
        }),
        on(reset, (tx) => tx.resetFeature()),
      ),
    });
    const users = createFeature({
      name: 'users',
      reducer: createReducer(usersAdapter.getInitialState()),
    });
    const ui = createFeature({ name: 'ui', reducer: createReducer({ lastObservation: null }) });
    const queries = adapter.query(todos.selectTodosState);
    const total = queries.count();
    const open = queries.count({ done: false });
    const page = queries.page({ offset: 0, limit: 100 });
    const effects = {
      seedOnInit: createEffect(
        (actions = inject(Actions), store = inject(Store)) =>
          actions.pipe(
            ofType(ROOT_EFFECTS_INIT),
            switchMap(() => store.select(todos.selectSeedVersion).pipe(take(1))),
            tap(() => {}),
          ),
        { functional: true, dispatch: false },
      ),
      observe: createEffect(
        (actions = inject(Actions), store = inject(Store)) =>
          actions.pipe(
            withLatestFrom(store.select(open), store.select(total)),
            tap(() => {}),
          ),
        { functional: true, dispatch: false },
      ),
    };
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          { todos: todos.reducer, users: users.reducer, ui: ui.reducer, router: routerReducer },
          { sqlite: { driver: new SqlJsDriver(), wholeStore } },
        ),
        provideRouter([
          { path: 'todos', component: Page },
          { path: 'blocked', component: Page, canActivate: [() => false] },
          {
            path: 'broken',
            component: Page,
            resolve: {
              value: () => {
                throw new Error('retention navigation error');
              },
            },
          },
        ]),
        provideRouterStore(),
        provideEffects(effects),
      ],
    });
    const store = TestBed.inject(Store);
    const engine = TestBed.inject(StorageEngine);
    const subscriptions: Array<{ unsubscribe(): void }> = [];
    try {
      const routerActions: Array<{ type: string; payload?: { storeState?: object } }> = [];
      subscriptions.push(TestBed.inject(Actions).subscribe((action) => routerActions.push(action)));
      await store.settle();
      // The heap tool resets before reloading; retain the same subscriptions through reset/reseed.
      await store.dispatchAsync(reset());
      const relativeUsers = usersAdapter.getSelectors(users.selectUsersState);
      for (const selected of [
        total,
        open,
        page,
        ...(harnessSubscriptions
          ? [
              total,
              todos.selectFilter,
              todos.selectQuery,
              todos.selectUserId,
              relativeUsers.selectAll,
              relativeUsers.selectEntities,
              ui.selectLastObservation,
            ]
          : []),
      ]) {
        subscriptions.push(store.select(selected as (state: object) => unknown).subscribe());
      }
      const harness = await RouterTestingHarness.create('/todos');
      await store.settle();
      await store.dispatchAsync(seed());
      await store.dispatchAsync(tick());
      expect(await firstValueFrom(store.select(total))).toBe(50000);
      expect(await firstValueFrom(store.select(page))).toHaveLength(100);
      await harness.navigateByUrl('/blocked');
      await store.settle();
      await expect(harness.navigateByUrl('/broken')).rejects.toThrow('retention navigation error');
      await store.settle();
      await harness.navigateByUrl('/todos');
      await store.settle();
      expect(routerActions.some((action) => action.type === ROUTER_NAVIGATED)).toBe(true);
      for (const type of [ROUTER_CANCEL, ROUTER_ERROR]) {
        const action = routerActions.find((action) => action.type === type);
        expect(action).toBeDefined();
        expect(
          !!(action?.payload?.storeState as { todos?: { entities?: object } })?.todos?.entities,
        ).toBe(wholeStore === 'pin-all');
      }
      const cache = TestBed.inject(PathCache);
      if (wholeStore === 'loaded') {
        expect(
          'entities' in ((TestBed.inject(State).value as { todos?: object }).todos ?? {}),
        ).toBe(false);
        expect('entities' in ((cache.view as { todos?: object }).todos ?? {})).toBe(false);
        expect(cache.peek('todos')).toBeUndefined();
      } else {
        expect((cache.peek('todos') as { ids: string[] }).ids).toHaveLength(50000);
      }
      expect(cache.ready('router')).toBe(true);
      expect(harness.routeNativeElement?.textContent).toContain('retention page');
    } finally {
      for (const subscription of subscriptions) subscription.unsubscribe();
      TestBed.resetTestingModule();
      await engine.close();
    }
  },
  60000,
);
