# Public API contract

Verified against **@ngrx/store 22.0.1** (`types/ngrx-store.d.ts`, `ngrx-store-testing.d.ts`), @ngrx/effects, entity, router-store, and store-devtools 22.0.1, on 2026-10-20. Re-verify this on every NgRx major release.

Legend: **=** re-exported unchanged from `@ngrx/store` · **R** reimplemented with identical signature and semantics · **R\*** reimplemented with a documented difference · **T** provided under the original DI token (ADR-0010) · **—** out of scope (noted).

## 1. `@ngrx/store` runtime exports

| Export | Kind | Status | Notes |
| --- | --- | --- | --- |
| `Store` | class/token | **R, T** | `extends Observable<T> implements Observer<Action>`. Must implement: `select(mapFn)`, `select(mapFn, props)`, `select(...keys)` (up to 6 keys plus rest), `selectSignal(selector, { equal? })`, `lift`, `dispatch(action)`, `dispatch(() => Action, { injector })` → `EffectRef` (reactive dispatch), `next`, `error`, `complete`, `addReducer(key, reducer)`, `removeReducer(key)`. Subscribing to `store` itself emits the lazy whole-state view (Q4). Extension: `dispatchAsync(action): Promise<void>`, `status`. |
| `ActionsSubject` | class/token | **R, T** | `BehaviorSubject<Action>` seeded with `{ type: INIT }`. Rejects `undefined` or function actions, like NgRx. |
| `ScannedActionsSubject` | class/token | **R\*, T** | `Subject<Action>`. Emits **post-commit** (ADR-0003). Not emitted for failed actions (Q13). |
| `StateObservable` | class/token | **R\*, T** | Emits a lazy whole-state view (Q4). devtools overrides this token. |
| `State` | class | **R\*, T** | `BehaviorSubject`-like with `.value` → lazy view. |
| `ReducerManager` | class/token | **R\*, T** | `addFeature(s)`, `removeFeature(s)`, `addReducer(s)`, `removeReducer(s)`, `currentReducers`. Emits a compat reducer (Q4). |
| `ReducerObservable`, `ReducerManagerDispatcher` | tokens | **T** | `ReducerManagerDispatcher` is an `ActionsSubject` used for `UPDATE` actions. devtools injects both. |
| `INIT`, `UPDATE` | consts | **=** | `'@ngrx/store/init'`, `'@ngrx/store/update-reducers'` |
| `INITIAL_STATE`, `INITIAL_REDUCERS`, `REDUCER_FACTORY`, `META_REDUCERS`, `USER_PROVIDED_META_REDUCERS`, `STORE_FEATURES`, `FEATURE_REDUCERS`, `USER_RUNTIME_CHECKS`, `ACTIVE_RUNTIME_CHECKS`, `ROOT_STORE_PROVIDER`, `FEATURE_STATE_PROVIDER` | tokens | **= (values T)** | Re-export the original tokens and provide our values. effects injects `ROOT_STORE_PROVIDER` and `FEATURE_STATE_PROVIDER`. router-store injects `ACTIVE_RUNTIME_CHECKS`. |
| `provideStore(reducers?, config?)` | fn | **R\*** | Returns `EnvironmentProviders`. Also takes `sqlite: SqliteStoreConfig` (driver, db name, eager features, LRU size). |
| `provideState(name, reducer(s), config?)` / `provideState(slice)` | fn | **R\*** | Accepts `tx` reducers and classic reducers. |
| `StoreModule.forRoot/forFeature`, `StoreRootModule`, `StoreFeatureModule` | NgModule | **R\*** | Wrap the same providers. |
| `createAction`, `props`, `emptyProps`, `union`, `createActionGroup` | fn | **=** | Pure, so cross-package interchangeable. |
| `createReducer(initialState, ...ons)`, `on(...creators, reducer)` | fn | **R\*** | Accept `tx` reducers (form decided by Q6). The reducer function carries `initialState` metadata. |
| `combineReducers`, `compose`, `createReducerFactory` | fn | **R\*** | For compat-bridge (classic) reducers only. |
| `createSelector`, `createSelectorFactory`, `defaultMemoize`, `resultMemoize`, `createFeatureSelector`, `select` | fn | **R** | Identical memoization: `release()`, `projector`, `setResult`, `clearResult`, `memoized`. Extra hidden `[NSS_SOURCE]` metadata. **Must remain callable as a plain function on a plain state object**, so that `MockStore` and plain unit tests work. |
| `createFeature({ name, reducer, extraSelectors? })` | fn | **R** | Generates `selectXState` plus per-property selectors as **source selectors** (`name/prop`). Property names are taken from `reducer`'s `initialState` metadata. |
| `isNgrxMockEnvironment`, `setNgrxMockEnvironment` | fn | **=** | |
| `defaultStateFn`, `reduceState` | fn | **—** | NgRx internals, re-exported for completeness only. |
| Types: `Action`, `ActionCreator`, `ActionReducer`, `ActionReducerMap`, `MemoizedSelector`, `MemoizedSelectorWithProps`, `MetaReducer`, `Selector`, `SelectorWithProps`, `StoreConfig`, `RootStoreConfig`, `RuntimeChecks`, `SelectSignalOptions`, `FeatureConfig`, `FeatureSlice`, ... | types | **=** | Re-exported. New: `TxReducer`, `StoreTx`, `SqliteStoreConfig`. |

## 2. `@ngrx/store/testing` → `ngrx-sqlite-store/testing`

| Export | Status | Notes |
| --- | --- | --- |
| `provideMockStore`, `MockStore`, `createMockStore`, `MockState`, `MockReducerManager` | **=** | `MockStore` is purely in-memory and binds the `Store` token. It works unchanged as long as our selectors are plain-callable (above). Re-exported. |
| new: `provideSqliteTestingStore()` | new | Real store on an in-memory `SqlJsDriver`, plus `settle()`. |

## 3. `@ngrx/entity` → `ngrx-sqlite-store/entity`

| Export | Status | Notes |
| --- | --- | --- |
| `createEntityAdapter({ selectId?, sortComparer? })` | **R\*** | `getInitialState(extra?)` is branded so it is detected as an entity collection (D5). |
| adapter ops: `addOne`, `addMany`, `setAll`, `setOne`, `setMany`, `removeOne`, `removeMany` (ids or predicate), `removeAll`, `updateOne`, `updateMany`, `upsertOne`, `upsertMany`, `mapOne`, `map` | **R\*** | In `tx` reducers the ops run as SQL against the transaction. The classic `(…, state) => state` form is kept for compat-bridge reducers. Q6 decides the exact form. |
| `getSelectors()` / `getSelectors(selectState)` → `selectIds`, `selectEntities`, `selectAll`, `selectTotal` | **R** | Source selectors on `nss_entity`. `selectTotal` uses `COUNT(*)`. |
| `Dictionary`, `EntityState`, `EntityAdapter`, `Update`, `Predicate`, `EntityMap`, `EntityMapOne`, `IdSelector`, `Comparer` | types **=** | |

## 4. Ecosystem dependencies on the store (verified by FESM import scan)

| Package | Imports from `@ngrx/store` | Injects | Requirement for us |
| --- | --- | --- | --- |
| `@ngrx/effects` | `ScannedActionsSubject`, `createAction`, `ROOT_STORE_PROVIDER`, `FEATURE_STATE_PROVIDER`, `Store` | `Actions` (built on `ScannedActionsSubject`), `Store` | Post-commit `ScannedActionsSubject`. Provide both tokens so that `provideEffects` initialization runs after the store. Effects dispatch through `Store`. |
| `@ngrx/router-store` | `createAction`, `props`, `isNgrxMockEnvironment`, `select`, `ACTIVE_RUNTIME_CHECKS`, `createFeatureSelector`, `createSelector` | `Store`, `Router`, `RouterStateSerializer`, `ACTIVE_RUNTIME_CHECKS` | `store.pipe(select(featureSelector))` must work with selectors built by the *real* `createFeatureSelector` (foreign selectors, Q8). `routerReducer` is classic (compat bridge). `RouterState.Minimal` is recommended, because the full serializer is not JSON-safe. |
| `@ngrx/store-devtools` | `ActionsSubject`, `UPDATE`, `INIT`, `INITIAL_STATE`, `StateObservable`, `ReducerManagerDispatcher` | plus `ReducerObservable`, `ScannedActionsSubject` | Recomputes state in memory and overrides `StateObservable`. Compatibility mode in Q4. |
| `@ngrx/entity` | `createSelector` | — | Replaced by `/entity`. |

## 5. Behavioural contract (tested in phase 7)

1. `dispatch` is synchronous. `ActionsSubject` emits synchronously.
2. `ScannedActionsSubject` emits in dispatch order, after commit, and after live affected sources refresh.
3. `withLatestFrom(store.select(sel))` in an effect sees the state after the triggering action.
4. `select` emits distinct values only (`distinctUntilChanged`). Derived selectors only recompute when their inputs change by reference.
5. `selectSignal` returns a `Signal` that honours `equal`.
6. `addReducer`/`removeReducer`/`provideState` dispatch `UPDATE` with `features`.
7. `INIT` is the first action.
