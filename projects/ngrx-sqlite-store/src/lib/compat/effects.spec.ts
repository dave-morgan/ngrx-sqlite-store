import { Component, ErrorHandler, Injectable, InjectionToken, inject } from '@angular/core';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  Actions,
  EffectsModule,
  ROOT_EFFECTS_INIT,
  createEffect,
  ofType,
  provideEffects,
} from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import * as ngrx from '@ngrx/store';
import { Subscription, filter, firstValueFrom, map, mergeMap, tap, withLatestFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { createReducer, on } from '../reducer/reducer';
import { SqliteStoreCore } from '../store/core';
import { StoreModule, provideState, provideStore } from '../store/provide';
import { Store } from '../store/store';

const add = ngrx.createAction('[effects parity] add', ngrx.props<{ amount: number }>());
const classStart = ngrx.createAction('[effects parity] class');
const functionalStart = ngrx.createAction('[effects parity] functional');
const several = ngrx.createAction('[effects parity] several');
const retry = ngrx.createAction('[effects parity] retry');
const step = ngrx.createAction('[effects parity] step', ngrx.props<{ index: number }>());
interface Counter {
  count: number;
}
interface State {
  counter: Counter;
  lazy?: Counter;
}
interface Observations {
  actions: ngrx.Action[];
  latest: number[];
  concat: number[];
  rootInit: number[];
  errors: string[];
  attempts: number;
}
const OBSERVED = new InjectionToken<Observations>('effects parity observations');
const selectCount = (state: State) => state.counter.count;

function reducer(sqlite: boolean) {
  return sqlite
    ? createReducer(
        { count: 0 },
        on(add, async (tx, { amount }) => {
          await tx.set('count', (await tx.get<number>('count')) + amount);
        }),
        on(step, async (tx) => {
          await tx.set('count', (await tx.get<number>('count')) + 1);
        }),
      )
    : ngrx.createReducer(
        { count: 0 },
        ngrx.on(add, (state, { amount }) => ({ count: state.count + amount })),
        ngrx.on(step, (state) => ({ count: state.count + 1 })),
      );
}

@Injectable()
class ClassEffects {
  private readonly actions = inject(Actions);
  private readonly store = inject(ngrx.Store<State>);
  private readonly observed = inject(OBSERVED);
  readonly observe = createEffect(
    () => this.actions.pipe(tap((action) => this.observed.actions.push(action))),
    { dispatch: false },
  );
  readonly class = createEffect(() =>
    this.actions.pipe(
      ofType(classStart),
      map(() => add({ amount: 10 })),
    ),
  );
  readonly rootInit = createEffect(
    () =>
      this.actions.pipe(
        ofType(ROOT_EFFECTS_INIT),
        withLatestFrom(this.store.select(selectCount)),
        tap(([, count]) => this.observed.rootInit.push(count)),
      ),
    { dispatch: false },
  );
  readonly latest = createEffect(
    () =>
      this.actions.pipe(
        ofType(add, step),
        withLatestFrom(this.store.select(selectCount)),
        tap(([, count]) => this.observed.latest.push(count)),
      ),
    { dispatch: false },
  );
  readonly concat = createEffect(
    () =>
      this.actions.pipe(
        ofType(add, step),
        concatLatestFrom(() => this.store.select(selectCount)),
        tap(([, count]) => this.observed.concat.push(count)),
      ),
    { dispatch: false },
  );
  readonly several = createEffect(() =>
    this.actions.pipe(
      ofType(several),
      mergeMap(() => [add({ amount: 1 }), add({ amount: 2 })]),
    ),
  );
  readonly recovery = createEffect(() =>
    this.actions.pipe(
      ofType(retry),
      map(() => {
        if (++this.observed.attempts === 1) throw new Error('expected effect failure');
        return add({ amount: 100 });
      }),
    ),
  );
  readonly chain = createEffect(() =>
    this.actions.pipe(
      ofType(step),
      filter(({ index }) => index < 60),
      map(({ index }) => step({ index: index + 1 })),
    ),
  );
}
const functional = createEffect(
  (actions = inject(Actions)) =>
    actions.pipe(
      ofType(functionalStart),
      map(() => add({ amount: 20 })),
    ),
  { functional: true },
);

@Injectable()
class FeatureEffects {
  readonly respond = createEffect(() =>
    inject(Actions).pipe(
      ofType(classStart),
      map(() => add({ amount: 7 })),
    ),
  );
}
@Component({ template: 'lazy effects page' })
class LazyPage {}

async function scenario(sqlite: boolean, kind: 'standalone' | 'lazy' | 'module') {
  const observed: Observations = {
    actions: [],
    latest: [],
    concat: [],
    rootInit: [],
    errors: [],
    attempts: 0,
  };
  const subscriptions = new Subscription();
  let core: SqliteStoreCore | undefined;
  const values: number[] = [];
  const lazyValues: number[] = [];
  const extras: Array<Provider | EnvironmentProviders> = [
    { provide: OBSERVED, useValue: observed },
    {
      provide: ErrorHandler,
      useValue: { handleError: (error: Error) => observed.errors.push(error.message) },
    },
  ];
  try {
    if (kind === 'module') {
      TestBed.configureTestingModule({
        imports: [
          sqlite
            ? StoreModule.forRoot(
                { counter: reducer(true) },
                { sqlite: { driver: new SqlJsDriver() } },
              )
            : ngrx.StoreModule.forRoot({ counter: reducer(false) }),
          sqlite
            ? StoreModule.forFeature('lazy', reducer(true))
            : ngrx.StoreModule.forFeature('lazy', reducer(false)),
          EffectsModule.forRoot([ClassEffects]),
          EffectsModule.forFeature([FeatureEffects]),
        ],
        providers: extras,
      });
    } else {
      TestBed.configureTestingModule({
        providers: [
          sqlite
            ? provideStore({ counter: reducer(true) }, { sqlite: { driver: new SqlJsDriver() } })
            : ngrx.provideStore({ counter: reducer(false) }),
          provideEffects(ClassEffects, { functional }),
          ...extras,
          ...(kind === 'lazy'
            ? [
                provideRouter([
                  {
                    path: 'lazy',
                    component: LazyPage,
                    providers: [
                      sqlite
                        ? provideState({ name: 'lazy', reducer: reducer(true) })
                        : ngrx.provideState({ name: 'lazy', reducer: reducer(false) }),
                      provideEffects(FeatureEffects),
                    ],
                  },
                ]),
              ]
            : []),
        ],
      });
    }
    const store = TestBed.inject(ngrx.Store<State>);
    if (sqlite) {
      core = TestBed.inject(SqliteStoreCore);
      await core.initialize();
      await TestBed.inject(Store).settle();
    }
    const settle = async () => {
      if (sqlite) await TestBed.inject(Store).settle();
    };
    const dispatch = async (action: ngrx.Action) => {
      store.dispatch(action);
      await settle();
    };
    subscriptions.add(store.select(selectCount).subscribe((value) => values.push(value)));
    await firstValueFrom(store.select(selectCount));
    if (kind === 'standalone') {
      await dispatch(classStart());
      await dispatch(functionalStart());
      await dispatch(several());
      await dispatch(retry());
      await dispatch(retry());
      await dispatch(step({ index: 0 }));
    } else {
      if (kind === 'lazy') {
        // The effect must not run before Router creates the route injector.
        await dispatch(classStart());
        expect(await firstValueFrom(store.select(selectCount))).toBe(10);
        const router = await RouterTestingHarness.create();
        await router.navigateByUrl('/lazy', LazyPage);
        await settle();
      }
      subscriptions.add(
        store
          .select((state) => state.lazy?.count)
          .pipe(filter((value): value is number => value !== undefined))
          .subscribe((value) => lazyValues.push(value)),
      );
      await firstValueFrom(store.select((state) => state.lazy).pipe(filter(Boolean)));
      await dispatch(classStart());
    }
    return {
      ...observed,
      values,
      lazyValues,
      state: await firstValueFrom(store.select((state) => state)),
    };
  } finally {
    subscriptions.unsubscribe();
    TestBed.resetTestingModule();
    if (core) await core.engine.close();
  }
}

describe('real NgRx effects compatibility', () => {
  it('preserves an observed lazy UPDATE while SQLite is still opening', async () => {
    const run = async (sqlite: boolean) => {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      class OpeningDriver extends SqlJsDriver {
        override async open() {
          await gate;
          await super.open();
        }
      }
      const actions: ngrx.Action[] = [];
      const lazyActions: ngrx.Action[] = [];
      const observe = createEffect(
        (source = inject(Actions<ngrx.Action>)) =>
          source.pipe(tap((action: ngrx.Action) => actions.push(action))),
        { functional: true, dispatch: false },
      );
      const observeLazy = createEffect(
        (source = inject(Actions<ngrx.Action>)) =>
          source.pipe(tap((action: ngrx.Action) => lazyActions.push(action))),
        { functional: true, dispatch: false },
      );
      let core: SqliteStoreCore | undefined;
      try {
        TestBed.configureTestingModule({
          providers: [
            sqlite
              ? provideStore(
                  { counter: reducer(true) },
                  { sqlite: { driver: new OpeningDriver() } },
                )
              : ngrx.provideStore({ counter: reducer(false) }),
            provideEffects({ observe }),
            provideRouter([
              {
                path: 'lazy',
                component: LazyPage,
                providers: [
                  sqlite
                    ? provideState('lazy', reducer(true))
                    : ngrx.provideState('lazy', reducer(false)),
                  provideEffects(FeatureEffects, { observeLazy }),
                ],
              },
            ]),
          ],
        });
        const store = TestBed.inject(ngrx.Store<State>);
        if (sqlite) {
          core = TestBed.inject(SqliteStoreCore);
          void core.initialize();
          expect(core.status()).toBe('opening');
        }
        expect(await TestBed.inject(Router).navigateByUrl('/lazy')).toBe(true);
        if (sqlite) {
          expect(core!.status()).toBe('opening');
          expect(actions).toEqual([]);
          expect(TestBed.inject(ngrx.ActionsSubject).value).toEqual({
            type: ngrx.UPDATE,
            features: ['lazy'],
          });
        }
        release();
        if (sqlite) await TestBed.inject(Store).settle();
        store.dispatch(classStart());
        if (sqlite) await TestBed.inject(Store).settle();
        return {
          actions,
          lazyActions,
          state: await firstValueFrom(store.select((state) => state)),
        };
      } finally {
        release();
        TestBed.resetTestingModule();
        await core?.engine.close();
      }
    };
    const classic = await run(false);
    expect(await run(true)).toEqual(classic);
    expect(classic.actions).toEqual([
      { type: ROOT_EFFECTS_INIT },
      { type: ngrx.UPDATE, features: ['lazy'] },
      classStart(),
      add({ amount: 7 }),
    ]);
    expect(classic.state).toEqual({ counter: { count: 7 }, lazy: { count: 7 } });
    expect(classic.lazyActions).toEqual([classStart(), add({ amount: 7 })]);
  });
  it('matches class/functional effects, multi-ofType, latest state, multiple dispatches, errors and a 61-action chain', async () => {
    const classic = await scenario(false, 'standalone');
    const sqlite = await scenario(true, 'standalone');
    expect(sqlite).toEqual(classic);
    expect(classic.state).toEqual({ counter: { count: 194 } });
    expect(classic.errors).toEqual(['expected effect failure']);
    expect(classic.attempts).toBe(2);
    expect(classic.actions[0]).toEqual({ type: ROOT_EFFECTS_INIT });
    expect(classic.rootInit).toEqual([0]);
    expect(classic.actions.filter(({ type }) => type === step.type)).toEqual(
      Array.from({ length: 61 }, (_, index) => step({ index })),
    );
    expect(classic.latest).toEqual(classic.values.slice(1));
    expect(classic.concat).toEqual(classic.latest);
    expect(classic.actions.slice(1, 9)).toEqual([
      classStart(),
      add({ amount: 10 }),
      functionalStart(),
      add({ amount: 20 }),
      several(),
      add({ amount: 1 }),
      add({ amount: 2 }),
      retry(),
    ]);
  });
  it('matches lazy route provideState and provideEffects after real Router navigation', async () => {
    const classic = await scenario(false, 'lazy');
    expect(await scenario(true, 'lazy')).toEqual(classic);
    expect(classic.state).toEqual({ counter: { count: 27 }, lazy: { count: 17 } });
    expect(classic.lazyValues).toEqual([0, 10, 17]);
  });
  it('matches StoreModule and EffectsModule root and feature registration', async () => {
    const classic = await scenario(false, 'module');
    expect(await scenario(true, 'module')).toEqual(classic);
    expect(classic.state).toEqual({ counter: { count: 17 }, lazy: { count: 17 } });
    expect(classic.lazyValues).toEqual([0, 10, 17]);
  });
});
