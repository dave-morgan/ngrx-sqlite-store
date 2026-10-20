import {
  ApplicationInitStatus,
  EnvironmentInjector,
  Injector,
  NgZone,
  createEnvironmentInjector,
  inject,
  signal,
} from '@angular/core';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Actions, createEffect, ofType, provideEffects } from '@ngrx/effects';
import { ROUTER_NAVIGATION, routerReducer } from '@ngrx/router-store';
import * as ngrx from '@ngrx/store';
import type { Action, ActionReducer } from '@ngrx/store';
import { mergeMap } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { createReducer, on, onState } from '../reducer/reducer';
import { NodeStore } from '../schema/node-store';
import { StorageEngine } from '../storage/storage-engine';
import { nssReducerError, SqliteStoreCore } from './core';
import {
  provideState,
  provideStore,
  StoreFeatureModule,
  StoreModule,
  StoreRootModule,
} from './provide';
import type { SqliteRootConfig } from './provide';
import { ReducerManager } from './reducer-manager';
import { State } from './state';
import { Store } from './store';
import { POST_COMMIT_HOOK } from './tokens';

const engines = new Set<StorageEngine>();
async function boot(
  reducers: Record<string, ActionReducer<any>>,
  config: SqliteRootConfig<any> = {},
  extras: Array<Provider | EnvironmentProviders> = [],
) {
  const driver = config.sqlite?.driver ?? new SqlJsDriver();
  TestBed.configureTestingModule({
    providers: [
      provideStore(reducers, { ...config, sqlite: { ...config.sqlite, driver } }),
      ...extras,
    ],
  });
  const store = TestBed.inject(Store);
  const core = TestBed.inject(SqliteStoreCore);
  engines.add(core.engine);
  await core.initialize();
  await store.settle();
  return { core, driver, engine: core.engine, store };
}
function read(engine: StorageEngine, path: string): Promise<unknown> {
  return engine.read((sql) => new NodeStore().read(sql, path));
}
afterEach(async () => {
  TestBed.resetTestingModule();
  for (const engine of engines) await engine.close();
  engines.clear();
});

const increment = ngrx.createAction('[contract] increment', ngrx.props<{ amount: number }>());
const counter = ngrx.createReducer(
  { count: 0 },
  ngrx.on(increment, (state, { amount }) => ({ count: state.count + amount })),
);

describe('phase 4a integration contract', () => {
  it('seeds reducer state and gives configured initialState precedence', async () => {
    const { engine } = await boot(
      { seeded: counter, overridden: counter },
      { initialState: { overridden: { count: 12 } } },
    );
    expect(await read(engine, 'seeded')).toEqual({ count: 0 });
    expect(await read(engine, 'overridden')).toEqual({ count: 12 });
  });

  it('processes mixed tx writes, partials, onState and real classic reducers', async () => {
    const reducer = createReducer(
      { count: 0, other: 1 },
      on(increment, async (tx, { amount }) => {
        await tx.set('count', amount);
        return { count: (await tx.get<number>('count')) + 1 };
      }),
      onState(increment, (state, { amount }) => ({ ...state, count: state.count + amount })),
    );
    const { engine, store } = await boot({ tx: reducer, classic: counter });
    await store.dispatchAsync(increment({ amount: 2 }));
    expect(await read(engine, 'tx')).toEqual({ count: 5, other: 1 });
    expect(await read(engine, 'classic')).toEqual({ count: 2 });
  });

  it('supports the unmodified real routerReducer with its undefined INIT state', async () => {
    const { engine, store } = await boot({ router: routerReducer });
    const action = {
      type: ROUTER_NAVIGATION,
      payload: { routerState: { url: '/todos' }, event: { id: 7 } },
    };
    await store.dispatchAsync(action);
    expect(await read(engine, 'router')).toEqual({ state: { url: '/todos' }, navigationId: 7 });
  });

  it('retains exported database state across another boot', async () => {
    const driver = new SqlJsDriver();
    const first = await boot({ counter }, { sqlite: { driver } });
    await first.store.dispatchAsync(increment({ amount: 9 }));
    const data = driver.export();
    TestBed.resetTestingModule();
    await first.engine.close();
    engines.delete(first.engine);
    const second = await boot(
      { counter },
      { initialState: { counter: { count: 100 } }, sqlite: { driver: new SqlJsDriver({ data }) } },
    );
    expect(await read(second.engine, 'counter')).toEqual({ count: 9 });
  });

  it('rejects a persisted version mismatch and sets error status', async () => {
    const driver = new SqlJsDriver();
    const first = await boot({ counter }, { sqlite: { driver } });
    const data = driver.export();
    TestBed.resetTestingModule();
    await first.engine.close();
    engines.delete(first.engine);
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          { counter },
          { sqlite: { driver: new SqlJsDriver({ data }), features: { counter: { version: 2 } } } },
        ),
      ],
    });
    const core = TestBed.inject(SqliteStoreCore);
    engines.add(core.engine);
    await Promise.all([
      expect(core.initialize()).rejects.toThrow('Feature version mismatch: counter'),
      expect(TestBed.inject(ApplicationInitStatus).donePromise).rejects.toThrow(
        'Feature version mismatch: counter',
      ),
    ]);
    expect(core.status()).toBe('error');
  });

  it('reseeds a version mismatch when explicitly configured', async () => {
    const driver = new SqlJsDriver();
    const first = await boot({ counter }, { sqlite: { driver } });
    await first.store.dispatchAsync(increment({ amount: 9 }));
    const data = driver.export();
    TestBed.resetTestingModule();
    await first.engine.close();
    engines.delete(first.engine);
    const next = await boot(
      { counter },
      {
        initialState: { counter: { count: 20 } },
        sqlite: {
          driver: new SqlJsDriver({ data }),
          features: { counter: { version: 2, onVersionMismatch: 'reseed' } },
        },
      },
    );
    expect(await read(next.engine, 'counter')).toEqual({ count: 20 });
  });

  it('serializes 50 rapid random-delay handlers and scanned emissions', async () => {
    const append = ngrx.createAction('[contract] append', ngrx.props<{ index: number }>());
    const committed: number[] = [];
    const reducer = createReducer(
      { order: [] as number[] },
      on(append, async (tx, { index }) => {
        await new Promise<void>((resolve) => setTimeout(resolve, Math.floor(Math.random() * 4)));
        const previous = await tx.get<number[]>('order');
        await tx.set('order', [...previous, index]);
        committed.push(index);
      }),
    );
    const { engine, store } = await boot({ ordering: reducer });
    const scanned: number[] = [];
    const subscription = TestBed.inject(ngrx.ScannedActionsSubject).subscribe((action) => {
      if (action.type === append.type) scanned.push((action as ReturnType<typeof append>).index);
    });
    const expected = Array.from({ length: 50 }, (_, index) => index);
    await Promise.all(expected.map((index) => store.dispatchAsync(append({ index }))));
    subscription.unsubscribe();
    expect(committed).toEqual(expected);
    expect(scanned).toEqual(expected);
    expect(await read(engine, 'ordering')).toEqual({ order: expected });
  });

  it('rolls back every feature, rejects dispatchAsync, dispatches error and continues', async () => {
    const fail = ngrx.createAction('[contract] fail');
    const first = createReducer(
      { count: 0 },
      on(fail, async (tx) => {
        await tx.set('count', 100);
      }),
      on(increment, async (tx) => {
        await tx.set('count', 1);
      }),
    );
    const second = createReducer(
      { count: 0 },
      on(fail, async (tx) => {
        await tx.set('count', 100);
        throw new Error('broken reducer');
      }),
    );
    const { engine, store } = await boot({ first, second });
    const scanned: Action[] = [];
    const actions: Action[] = [];
    TestBed.inject(ngrx.ScannedActionsSubject).subscribe((action) => scanned.push(action));
    TestBed.inject(ngrx.ActionsSubject).subscribe((action) => actions.push(action));
    await expect(store.dispatchAsync(fail())).rejects.toThrow('broken reducer');
    await store.settle();
    expect(await read(engine, 'first')).toEqual({ count: 0 });
    expect(await read(engine, 'second')).toEqual({ count: 0 });
    expect(scanned.some((action) => action.type === fail.type)).toBe(false);
    expect(actions.find((action) => action.type === nssReducerError.type)).toMatchObject({
      action: fail(),
      error: expect.any(Error),
    });
    await store.dispatchAsync(increment({ amount: 1 }));
    expect(await read(engine, 'first')).toEqual({ count: 1 });
  });

  it('plain dispatch reports reducer failure without throwing synchronously', async () => {
    const fail = ngrx.createAction('[contract] plain failure');
    const reducer = createReducer(
      { count: 0 },
      on(fail, async () => {
        throw new Error('plain error');
      }),
    );
    const { store } = await boot({ counter: reducer });
    const errors: Action[] = [];
    TestBed.inject(ngrx.ActionsSubject).subscribe((action) => {
      if (action.type === nssReducerError.type) errors.push(action);
    });
    expect(() => store.dispatch(fail())).not.toThrow();
    await store.settle();
    expect(errors).toHaveLength(1);
  });

  it('emits UPDATE on add/remove and keeps persisted data through re-registration', async () => {
    const { engine, store } = await boot({});
    const updates: Action[] = [];
    TestBed.inject(ngrx.ReducerManagerDispatcher).subscribe((action) => {
      if (action.type === ngrx.UPDATE) updates.push(action);
    });
    store.addReducer('counter', counter);
    await store.dispatchAsync(increment({ amount: 5 }));
    store.removeReducer('counter');
    await store.dispatchAsync(increment({ amount: 20 }));
    expect(await read(engine, 'counter')).toEqual({ count: 5 });
    store.addReducer('counter', counter);
    await store.dispatchAsync(increment({ amount: 1 }));
    expect(await read(engine, 'counter')).toEqual({ count: 6 });
    expect(updates).toHaveLength(3);
    expect(updates).toEqual(
      Array.from({ length: 3 }, () => ({ type: ngrx.UPDATE, features: ['counter'] })),
    );
  });

  it('runs real functional NgRx effects only after the triggering write commits', async () => {
    const start = ngrx.createAction('[contract] effects start');
    const finish = ngrx.createAction('[contract] effects finish');
    const reducer = createReducer(
      { count: 0 },
      on(start, async (tx) => {
        await tx.set('count', 1);
      }),
      on(finish, async (tx) => {
        await tx.set('count', 2);
      }),
    );
    const observed: unknown[] = [];
    const effect = createEffect(
      (actions = inject(Actions), engine = inject(StorageEngine)) =>
        actions.pipe(
          ofType(start),
          mergeMap(async () => {
            observed.push(await read(engine, 'effects'));
            return finish();
          }),
        ),
      { functional: true },
    );
    const { engine, store } = await boot({ effects: reducer }, {}, [provideEffects({ effect })]);
    const scanned: string[] = [];
    TestBed.inject(ngrx.ScannedActionsSubject).subscribe((action) => scanned.push(action.type));
    await store.dispatchAsync(start());
    // The effect performs an asynchronous read before dispatching its response.
    await expect
      .poll(async () => {
        await store.settle();
        return read(engine, 'effects');
      })
      .toEqual({ count: 2 });
    expect(observed).toEqual([{ count: 1 }]);
    expect(scanned.filter((type) => type === start.type || type === finish.type)).toEqual([
      start.type,
      finish.type,
    ]);
  });

  it('runs post-commit hooks outside the engine queue and awaits every hook before scanning', async () => {
    let engine!: StorageEngine;
    const observed: unknown[] = [];
    let hookCount = 0;
    const { store } = await boot({ counter }, {}, [
      {
        provide: POST_COMMIT_HOOK,
        multi: true,
        useValue: async () => {
          if (engine) {
            observed.push(await read(engine, 'counter'));
            hookCount++;
          }
        },
      },
      {
        provide: POST_COMMIT_HOOK,
        multi: true,
        useValue: async () => {
          if (engine) hookCount++;
        },
      },
    ]);
    engine = TestBed.inject(StorageEngine);
    const countsAtEmission: number[] = [];
    TestBed.inject(ngrx.ScannedActionsSubject).subscribe((action) => {
      if (action.type === increment.type) countsAtEmission.push(hookCount);
    });
    await store.dispatchAsync(increment({ amount: 1 }));
    expect(observed).toEqual([{ count: 1 }]);
    expect(countsAtEmission).toEqual([2]);
  });

  it('provides the same instances under original NgRx tokens and compat reducers', async () => {
    const { store } = await boot({ counter });
    const manager = TestBed.inject(ReducerManager);
    expect(TestBed.inject(ngrx.Store)).toBe(store);
    expect(TestBed.inject(ngrx.ReducerManager)).toBe(manager);
    expect(TestBed.inject(ngrx.ReducerObservable)).toBe(manager);
    expect(TestBed.inject(ngrx.State)).toBe(TestBed.inject(State));
    expect(TestBed.inject(ngrx.StateObservable)).toBe(TestBed.inject(State));
    expect(manager.currentReducers['counter']).toBe(counter);
    expect(manager.value(undefined, { type: ngrx.INIT })).toEqual({ counter: { count: 0 } });
  });

  it('provides the phase 4b selection engine through the original store', async () => {
    const { store } = await boot({ counter });
    expect(store.select((state) => state)).toBeDefined();
    expect(store.selectSignal((state) => state)()).toEqual({ counter: { count: 0 } });
  });

  it('reactively dispatches from a signal with an explicit injector', async () => {
    const amount = signal(1);
    const { engine, store } = await boot({ counter });
    const reference = store.dispatch(() => increment({ amount: amount() }), {
      injector: TestBed.inject(Injector),
    });
    TestBed.tick();
    await store.settle();
    expect(await read(engine, 'counter')).toEqual({ count: 1 });
    amount.set(3);
    TestBed.tick();
    await store.settle();
    expect(await read(engine, 'counter')).toEqual({ count: 4 });
    reference.destroy();
    amount.set(10);
    TestBed.tick();
    await store.settle();
    expect(await read(engine, 'counter')).toEqual({ count: 4 });
  });

  it('registers every provideState declaration in the same environment', async () => {
    const { engine, store } = await boot({}, {}, [
      provideState('one', counter),
      provideState({ name: 'two', reducer: counter }),
    ]);
    await store.dispatchAsync(increment({ amount: 1 }));
    expect(await read(engine, 'one')).toEqual({ count: 1 });
    expect(await read(engine, 'two')).toEqual({ count: 1 });
  });

  it('freezes dispatched actions and reducer reads by default in dev', async () => {
    let frozenRead = false;
    const reducer = createReducer(
      { nested: { value: 1 } },
      on(increment, async (tx) => {
        const state = await tx.get<{ nested: { value: number } }>();
        frozenRead = Object.isFrozen(state) && Object.isFrozen(state.nested);
      }),
    );
    const { store } = await boot({ frozen: reducer });
    const action = { ...increment({ amount: 1 }), payload: { nested: true } };
    await store.dispatchAsync(action);
    expect(Object.isFrozen(action)).toBe(true);
    expect(Object.isFrozen(action.payload)).toBe(true);
    expect(frozenRead).toBe(true);
    expect(TestBed.inject(ngrx.ACTIVE_RUNTIME_CHECKS).strictStateSerializability).toBe(true);
  });

  it('honors opt-in action serializability checks', async () => {
    const { store } = await boot(
      { counter },
      { runtimeChecks: { strictActionSerializability: true } },
    );
    const action = { type: '[contract] non-serializable', callback: () => undefined };
    expect(() => store.dispatch(action)).toThrow();
    await store.dispatchAsync(increment({ amount: 2 }));
  });

  it('honors opt-in action NgZone checks', async () => {
    const { store } = await boot(
      { counter },
      { runtimeChecks: { strictActionWithinNgZone: true } },
    );
    expect(NgZone.isInAngularZone()).toBe(false);
    expect(() => store.dispatch(increment({ amount: 1 }))).toThrow('outside NgZone');
  });

  it('uses the native NgRx uniqueness check for duplicated action creators', () => {
    ngrx.createAction('[contract] duplicate uniqueness');
    ngrx.createAction('[contract] duplicate uniqueness');
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          {},
          {
            sqlite: { driver: new SqlJsDriver() },
            runtimeChecks: { strictActionTypeUniqueness: true },
          },
        ),
      ],
    });
    expect(() => TestBed.inject(Store)).toThrow(/Action types are registered more than once/);
  });

  it('reactively dispatches using the store injector when no config is supplied', async () => {
    const amount = signal(2);
    const { engine, store } = await boot({ counter });
    const reference = store.dispatch(() => increment({ amount: amount() }));
    TestBed.tick();
    await store.settle();
    expect(await read(engine, 'counter')).toEqual({ count: 2 });
    reference.destroy();
  });

  it('unregisters child environment features on destruction and preserves their data', async () => {
    const { engine, store } = await boot({});
    const child = createEnvironmentInjector(
      [provideState('lazy', counter)],
      TestBed.inject(EnvironmentInjector),
    );
    try {
      await store.dispatchAsync(increment({ amount: 3 }));
      expect(await read(engine, 'lazy')).toEqual({ count: 3 });
    } finally {
      child.destroy();
    }
    await store.dispatchAsync(increment({ amount: 5 }));
    expect(await read(engine, 'lazy')).toEqual({ count: 3 });
    expect(TestBed.inject(ReducerManager).currentReducers['lazy']).toBeUndefined();
  });
  it('registers module features and aliases original module tokens', async () => {
    TestBed.configureTestingModule({
      imports: [
        StoreModule.forRoot({}, { sqlite: { driver: new SqlJsDriver() } }),
        StoreModule.forFeature('moduleFeature', counter),
      ],
    });
    const store = TestBed.inject(Store);
    const core = TestBed.inject(SqliteStoreCore);
    engines.add(core.engine);
    await core.initialize();
    await store.dispatchAsync(increment({ amount: 2 }));
    expect(await read(core.engine, 'moduleFeature')).toEqual({ count: 2 });
    expect(TestBed.inject(ngrx.StoreRootModule)).toBe(TestBed.inject(StoreRootModule));
    expect(TestBed.inject(ngrx.StoreFeatureModule)).toBe(TestBed.inject(StoreFeatureModule));
  });
});
