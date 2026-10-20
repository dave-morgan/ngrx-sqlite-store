import { TestBed } from '@angular/core/testing';
import * as ngrx from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Subscription, firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { createFeature, createFeatureSelector, createSelector } from '../selectors/selectors';
import { SqliteStoreCore } from '../store/core';
import { provideStore } from '../store/provide';
import { Store } from '../store/store';

interface State {
  counter: { count: number };
}
const counter = ngrx.createReducer({ count: 0 });
const feature = createFeature({ name: 'counter', reducer: counter });
const selectCounter = createFeatureSelector<State['counter']>('counter');
const selectDouble = createSelector(selectCounter, ({ count }) => count * 2);

afterEach(() => {
  TestBed.inject(MockStore, null)?.resetSelectors();
  TestBed.resetTestingModule();
  ngrx.setNgrxMockEnvironment(false);
});

describe('real NgRx MockStore with SQLite selector helpers', () => {
  it('selects wrapped and createFeature selectors and reacts to setState', () => {
    TestBed.configureTestingModule({
      providers: [provideMockStore<State>({ initialState: { counter: { count: 2 } } })],
    });
    const store = TestBed.inject(MockStore<State>);
    expect(TestBed.inject(ngrx.Store)).toBe(store);
    const doubled: number[] = [];
    const counts: number[] = [];
    const subscription = new Subscription();
    subscription.add(store.select(selectDouble).subscribe((value) => doubled.push(value)));
    subscription.add(store.select(feature.selectCount).subscribe((value) => counts.push(value)));
    store.setState({ counter: { count: 3 } });
    store.setState({ counter: { count: 3 } });
    store.setState({ counter: { count: 5 } });
    expect(doubled).toEqual([4, 6, 10]);
    expect(counts).toEqual([2, 3, 5]);
    subscription.unsubscribe();
  });

  it('supports configured overrides, overrideSelector, refreshState and resetSelectors', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore<State>({
          initialState: { counter: { count: 2 } },
          selectors: [{ selector: selectDouble, value: 50 }],
        }),
      ],
    });
    const store = TestBed.inject(MockStore<State>);
    const values: number[] = [];
    const subscription = store.select(feature.selectCount).subscribe((value) => values.push(value));
    expect(await firstValueFrom(store.select(selectDouble))).toBe(50);
    const override = store.overrideSelector(feature.selectCount, 20);
    store.refreshState();
    override.setResult(30);
    store.refreshState();
    store.setState({ counter: { count: 4 } });
    expect(values).toEqual([2, 20, 30]);
    store.resetSelectors();
    store.refreshState();
    expect(values).toEqual([2, 20, 30, 4]);
    expect(await firstValueFrom(store.select(selectDouble))).toBe(8);
    subscription.unsubscribe();
  });

  it('exposes dispatched actions through MockStore.scannedActions$', () => {
    TestBed.configureTestingModule({
      providers: [provideMockStore<State>({ initialState: { counter: { count: 2 } } })],
    });
    const store = TestBed.inject(MockStore<State>);
    const actions: ngrx.Action[] = [];
    const subscription = store.scannedActions$.subscribe((action) => actions.push(action));
    const dispatched = { type: '[mock compatibility] example', value: 7 };
    store.dispatch(dispatched);
    expect(actions).toEqual([{ type: ngrx.INIT }, dispatched]);
    subscription.unsubscribe();
  });
});

describe('SQLite NgRx runtime check compatibility', () => {
  it('uses the original uniqueness guard to reject duplicate action types', async () => {
    const duplicate = '[compat runtime] duplicate';
    ngrx.createAction(duplicate);
    ngrx.createAction(duplicate);
    const driver = new SqlJsDriver();
    try {
      TestBed.configureTestingModule({
        providers: [
          provideStore(
            {},
            {
              sqlite: { driver },
              runtimeChecks: { strictActionTypeUniqueness: true },
            },
          ),
        ],
      });
      expect(() => TestBed.inject(ngrx.Store)).toThrow(
        /Action types are registered more than once/,
      );
    } finally {
      TestBed.resetTestingModule();
      await driver.close();
    }
  });

  it('rejects a function in an action before emission and accepts a later valid action', async () => {
    let core: SqliteStoreCore | undefined;
    try {
      TestBed.configureTestingModule({
        providers: [
          provideStore(
            { counter },
            {
              sqlite: { driver: new SqlJsDriver() },
              runtimeChecks: { strictActionSerializability: true },
            },
          ),
        ],
      });
      const store = TestBed.inject(Store);
      core = TestBed.inject(SqliteStoreCore);
      await store.settle();
      const actions: ngrx.Action[] = [];
      const subscription = TestBed.inject(ngrx.ActionsSubject).subscribe((action) =>
        actions.push(action),
      );
      const invalid = { type: '[compat runtime] invalid', callback: () => undefined };
      expect(() => store.dispatch(invalid)).toThrow(/serializ/i);
      expect(actions.some(({ type }) => type === invalid.type)).toBe(false);
      const valid = { type: '[compat runtime] valid', value: 3 };
      await store.dispatchAsync(valid);
      expect(actions.at(-1)).toEqual(valid);
      expect(await store.materialize()).toEqual({ counter: { count: 0 } });
      subscription.unsubscribe();
    } finally {
      TestBed.resetTestingModule();
      await core?.engine.close();
    }
  });
});
