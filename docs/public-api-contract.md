# Public API contract

Verified against **@ngrx/store 22.0.1** (`types/ngrx-store.d.ts`, `ngrx-store-testing.d.ts`), @ngrx/effects, entity, router-store, and store-devtools 22.0.1, on 2026-10-20. Re-verify this on every NgRx major release.

Legend: **=** re-exported unchanged from `@ngrx/store` · **R** reimplemented with identical signature and semantics · **R\*** reimplemented with a documented difference · **T** provided under the original DI token (ADR-0010) · **—** out of scope (noted).

Implementation checkpoint: phases 4a/4b provide the store contract, original DI
tokens and selector read side (ADR-0017/0018). Selector helpers wrap the real NgRx
functions with hidden dependency metadata and retain their exact overloads.
Internal schema and storage implementation values have no public unprefixed exports.

`Store.materialize(): Promise<object>` reads every registered feature for debugging.
Whole-store subscriptions pin all registered features for their subscription lifetime.
`sqlite.eager` pins and preloads named features before bootstrap releases actions;
`sqlite.lruSize` defaults to 32 inactive cache entries. `select()` emits synchronously
on subscription when its dependencies are loaded and fresh, including LRU hits.
Stale entries wait for their refresh before emitting. `selectSignal()` uses initial
defaults for unloaded branches and releases its leases with the calling injection
context (or the store lifetime when called outside a context).

Default router-store snapshots are persisted as JSON (ADR-0020): undefined fields
are omitted and Angular UrlSegments become plain data. Cyclic full snapshots need
a custom JSON-safe serializer. Reference-only immutable replacements retain NgRx
projector-count semantics through transient commit hints (ADR-0021).

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

ADR-0019 defines the dual-form adapter. Classic overloads retain the real
`@ngrx/entity` signatures and delegate unchanged to that adapter. Transaction
operations return `Promise<void>` and use the feature-root collection;
`adapter.at(tx, 'items')` binds the same operations to a nested collection.

| Export | Status | Notes |
| --- | --- | --- |
| `createEntityAdapter<T>({ selectId?, sortComparer? })` | **R\*** | Retains NgRx's default-id and custom string/numeric-id overloads. |
| `getInitialState()` / `getInitialState<S>(extra: Omit<S, keyof EntityState<T>>): S` | **R\*** | Non-enumerable entity brand directs persistence to `nss_entity`. |
| `getSelectors()` / `getSelectors(selectState)` | **R** | `selectIds`, `selectEntities`, `selectAll`, `selectTotal` use our `createSelector`; plain-callable with dependency metadata. Total derives from the stored ordered IDs. |
| `Dictionary`, `EntityState`, `Update`, `Predicate`, `EntityMap`, `EntityMapOne`, `IdSelector`, `Comparer` | types **=** | Re-exported from real NgRx. |
| `EntityAdapter<T, IdType>` | **R\*** | All classic overloads plus transaction overloads and `at(tx, path)`. |

Transaction signatures (the bound form omits the first `tx` argument):

```ts
addOne(tx: StoreTx, entity: T): Promise<void>;
addMany(tx: StoreTx, entities: T[]): Promise<void>;
setOne(tx: StoreTx, entity: T): Promise<void>;
setMany(tx: StoreTx, entities: T[]): Promise<void>;
setAll(tx: StoreTx, entities: T[]): Promise<void>;
upsertOne(tx: StoreTx, entity: T): Promise<void>;
upsertMany(tx: StoreTx, entities: T[]): Promise<void>;
updateOne(tx: StoreTx, update: Update<T>): Promise<void>;
updateMany(tx: StoreTx, updates: Update<T>[]): Promise<void>;
removeOne(tx: StoreTx, id: string | number): Promise<void>;
removeMany(tx: StoreTx, idsOrPredicate: string[] | number[] | Predicate<T>): Promise<void>;
removeAll(tx: StoreTx): Promise<void>;
mapOne(tx: StoreTx, map: EntityMapOne<T>): Promise<void>;
map(tx: StoreTx, map: EntityMap<T>): Promise<void>;
at(tx: StoreTx, path: string): EntityOperations<T>;
```

`tx.entities<T>(path = '')` exposes the lower-level collection operations:
`get(id)`, `getMany(ids)` (input order, missing entries are `undefined`), `has(id)`,
`count()`, `ids()`, `page(offset, limit)` (rows `{ id, entity, pos }`),
`insert(rows, { pos }?)`, `upsert(rows)`, `update(id, entity)`, `remove(ids)`,
`clear()`, and `positionFor(entity, comparer)`. Input rows are
`{ id: string | number, entity: T, pos?: number }`; optional insert positions
are a starting number or an array of positions. All methods are asynchronous.

Ordering is persisted at write time. Sorted inserts binary-search indexed rows;
unsorted inserts retain insertion order. All mutations pass through `RowWriter`
and invalidate the transaction cache and collection dependencies. Values over the
row cap use the ADR-0016 promotion marker.

**ID collision divergence (ADR-0019 §7):** transaction updates/maps that rename
an entity to an existing ID overwrite the target, retain the renamed entity's
position, and keep `ids` unique. Dev mode logs one warning per operation with a
collision. Classic operations preserve NgRx behavior, including its duplicate-ID
edge cases. Transaction insert batches ignore repeated IDs; parity tests use
unique IDs within batch inputs because sorted NgRx batches can create duplicate
`ids` even when adding repeated new IDs.

## 4. Ecosystem dependencies on the store (verified by phase 7 contract tests)

| Package | Imports from `@ngrx/store` | Injects | Requirement for us |
| --- | --- | --- | --- |
| `@ngrx/effects` | `ScannedActionsSubject`, `createAction`, `ROOT_STORE_PROVIDER`, `FEATURE_STATE_PROVIDER`, `Store` | `Actions` (built on `ScannedActionsSubject`), `Store` | Post-commit `ScannedActionsSubject`. Provide both tokens so that `provideEffects` initialization runs after the store. Effects dispatch through `Store`. |
| `@ngrx/router-store` | `createAction`, `props`, `isNgrxMockEnvironment`, `select`, `ACTIVE_RUNTIME_CHECKS`, `createFeatureSelector`, `createSelector` | `Store`, `Router`, `RouterStateSerializer`, `ACTIVE_RUNTIME_CHECKS` | `store.pipe(select(featureSelector))` must work with selectors built by the *real* `createFeatureSelector` (foreign selectors, Q8). `routerReducer` is classic (compat bridge). `RouterState.Minimal` is recommended, because the full serializer is not JSON-safe. |
| `@ngrx/store-devtools` | `ActionsSubject`, `UPDATE`, `INIT`, `INITIAL_STATE`, `StateObservable`, `ReducerManagerDispatcher` | plus `ReducerObservable`, `ScannedActionsSubject` | Verified display-only compatibility (ADR-0022). Guarded scanned subject guarantees exactly-once post-commit effects; compat reducer returns our committed loaded view. |
| `@ngrx/entity` | `createSelector` | — | Replaced by `/entity`. |

Verified against NgRx 22.0.1 with real packages, not substitutes:

- Effects: classic/SQLite parity for class and functional effects, non-dispatching
  effects, multiple-creator `ofType`, `withLatestFrom` and installed
  `@ngrx/operators` `concatLatestFrom`, ROOT_EFFECTS_INIT, default error-handler
  resubscription, multiple dispatched actions and a 61-action chain. Lazy Router
  providers and NgModule root/feature registration are covered too.
- Router-store: parity for default minimal and Full/custom JSON-safe serializers,
  both navigation timings, URL/route/query selectors, guard cancellation and
  resolver errors, including action sequences and rollback state (ADR-0020).
- Devtools: fake extension integration compares effects, selections and final
  state with/without devtools. Browser coverage checks the real harness provider,
  exactly one observation per triggering action and no synchronous tx warnings.
- Real MockStore: wrapped selectors, createFeature selectors, overrides, setState,
  refresh/reset and scannedActions$. Runtime checks reject duplicate action types
  and function-valued action fields.

**Devtools limitations (Q4 resolved, ADR-0022):** the timeline displays the loaded
committed view available at synchronous processing time and may lag one action.
Time travel, jump, skip, commit, import and monitor dispatch do not mutate SQLite.
Third-party StateObservable consumers see the devtools display state; our Store,
core and selection engine consume our State directly. The root provider resolves
the overridden token only to activate devtools, without consuming its values.

**Async ordering (ADR-0023):** each commit, refresh and scanned emission finishes
before the next action's transaction. Lifecycle actions (INIT, UPDATE and
ROOT_EFFECTS_INIT) are not replayed
to effects that attach later. Whole-store subscriptions defer transient router
preactivation and superseded terminal views until the latest requested navigation
completes, cancels or errors, preventing
router-store feedback; normal selectors and effects retain intermediate values.

## 5. Behavioural contract (tested in phase 7)

1. `dispatch` is synchronous. `ActionsSubject` emits synchronously.
2. `ScannedActionsSubject` emits in dispatch order, after commit, and after live affected sources refresh.
3. `withLatestFrom(store.select(sel))` in an effect sees the state after the triggering action.
4. `select` emits distinct values only (`distinctUntilChanged`). Derived selectors only recompute when their inputs change by reference.
5. `selectSignal` returns a `Signal` that honours `equal`.
6. `addReducer`/`removeReducer`/`provideState` dispatch `UPDATE` with `features`.
7. `INIT` is the first action.
