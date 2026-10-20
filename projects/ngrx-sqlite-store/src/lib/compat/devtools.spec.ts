import { inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Actions, createEffect, ofType, provideEffects } from '@ngrx/effects';
import * as ngrx from '@ngrx/store';
import { REDUX_DEVTOOLS_EXTENSION, provideStoreDevtools } from '@ngrx/store-devtools';
import { tap, withLatestFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { createReducer, on } from '../reducer/reducer';
import { provideStore } from '../store/provide';
import { ReducerManager } from '../store/reducer-manager';
import { State } from '../store/state';
import { Store } from '../store/store';
import { SqliteStoreCore } from '../store/core';
import { createFeature } from '../selectors/selectors';

const increment = ngrx.createAction('[devtools] increment');
const reducer = createReducer(
  { count: 0 },
  on(increment, async (tx) => {
    await tx.set('count', (await tx.get<number>('count')) + 1);
  }),
);
let core: SqliteStoreCore | undefined;
afterEach(async () => {
  TestBed.resetTestingModule();
  await core?.engine.close();
  core = undefined;
  vi.restoreAllMocks();
});

async function scenario(devtools: boolean) {
  const warnings = vi.spyOn(console, 'warn');
  const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  let receive!: (message: unknown) => void;
  const connection = {
    subscribe: (listener: typeof receive) => {
      receive = listener;
    },
    unsubscribe: vi.fn(),
    send: vi.fn(),
    init: vi.fn(),
    error: vi.fn(),
  };
  const extension = { connect: () => connection, send: vi.fn() };
  const observed: number[] = [];
  const effect = createEffect(
    (actions = inject(Actions), store = inject(ngrx.Store<{ counter: { count: number } }>)) =>
      actions.pipe(
        ofType(increment),
        withLatestFrom(store.select((s) => s.counter.count)),
        tap(([, count]) => observed.push(count)),
      ),
    { functional: true, dispatch: false },
  );
  TestBed.configureTestingModule({
    providers: [
      provideStore(
        { counter: reducer },
        { sqlite: { driver: new SqlJsDriver(), eager: ['counter'] } },
      ),
      ...(devtools
        ? [
            provideStoreDevtools({ maxAge: 30 }),
            { provide: REDUX_DEVTOOLS_EXTENSION, useValue: extension },
          ]
        : []),
      provideEffects({ effect }),
    ],
  });
  const store = TestBed.inject(Store<{ counter: { count: number } }>);
  core = TestBed.inject(SqliteStoreCore);
  if (devtools) {
    receive({ type: 'START' });
  }
  await store.settle();
  const selected: number[] = [];
  const whole: number[] = [];
  const subscriptions = [
    store.select((s) => s.counter.count).subscribe((n) => selected.push(n)),
    store.subscribe((s) => {
      if (s.counter) whole.push(s.counter.count);
    }),
  ];
  await store.settle();
  await store.dispatchAsync(increment());
  await store.dispatchAsync(increment());
  await store.settle();
  expect(observed).toEqual([1, 2]);
  expect(selected).toEqual([0, 1, 2]);
  expect(whole).toEqual([0, 1, 2]);
  const manager = TestBed.inject(ReducerManager);
  expect(manager.value({ counter: { count: 999 } }, increment())).toBe(TestBed.inject(State).value);
  if (devtools) {
    expect(
      connection.send.mock.calls.filter(
        (call) => (call[0] as unknown as { action?: ngrx.Action }).action?.type === increment.type,
      ),
    ).toHaveLength(2);
    receive({ type: 'DISPATCH', payload: { type: 'JUMP_TO_STATE', index: 0 } });
    receive({ type: 'ACTION', payload: JSON.stringify(increment()) });
    TestBed.inject(ngrx.ReducerManagerDispatcher).next({
      type: 'PERFORM_ACTION',
      action: increment(),
    } as ngrx.Action);
    await store.settle();
    expect(await store.materialize()).toEqual({ counter: { count: 2 } });
    expect(observed).toEqual([1, 2]);
    // Foreign callers cannot publish pre-commit actions into effects.
    TestBed.inject(ngrx.ScannedActionsSubject).next(increment());
    expect(observed).toEqual([1, 2]);
    expect(debug).toHaveBeenCalled();
  }
  expect(
    warnings.mock.calls
      .flat()
      .some((value) => String(value).includes('Transaction reducers run through')),
  ).toBe(false);
  for (const subscription of subscriptions) subscription.unsubscribe();
  const result = { observed, selected, whole, state: await store.materialize() };
  TestBed.resetTestingModule();
  await core.engine.close();
  core = undefined;
  vi.restoreAllMocks();
  return result;
}

describe('ADR-0022 devtools compatibility', () => {
  it('builds transaction feature selectors without synchronously running the reducer', () => {
    const warnings = vi.spyOn(console, 'warn');
    const feature = createFeature({ name: 'counter', reducer });
    expect(feature.reducer).toBe(reducer);
    expect(feature.selectCount({ counter: { count: 3 } })).toBe(3);
    expect(warnings).not.toHaveBeenCalled();
  });
  it('preserves effects, selections and whole-store state with display-only devtools', async () => {
    expect(await scenario(true)).toEqual(await scenario(false));
  });
});
