# Brief: Phase 4a — Store contract, write side and DI

Repo: `C:\Development\ngrx-sqlite-store`. Before writing code, read:
- `CLAUDE.md`, especially the DEADLOCK RULE
- `docs/architecture.md` §3 and §7
- `docs/public-api-contract.md` §1 and §4
- ADR-0003, 0010, 0013, 0014 and **0017** (the spec for this phase)

Phases 2–3 already exist under `projects/ngrx-sqlite-store/src/lib/{driver,storage,schema}`: `StorageEngine`, `NodeStore`, `StoragePolicy`, `SCHEMA_MIGRATIONS`, meta, and the entity brand. Reuse them.

Phase 4b (read side: selector sources, `select`/`selectSignal`, `createSelector`, `createFeature`) comes next. **This phase must leave clean seams for it** (§6).

## 1. Reducer authoring API (`lib/reducer/`)
- **`createReducer(initialState, ...ons)`** returns a function typed `ActionReducer<S, A>` and branded with the non-enumerable `NSS_TX_REDUCER` symbol. The brand carries `{ initialState, handlers: Map<string, Handler[]> }`.
  - Called synchronously (ADR-0017 §5), it returns `state ?? initialState` and warns once in dev.
- **`on(...creators, async (tx: StoreTx<S>, action) => void | Partial<S>)`** produces a tx handler (ADR-0013).
- **`onState(...creators, (state: S, action) => S)`** produces a classic handler. It runs by doing `tx.get('')`, applying the reducer, then diff-writing (ADR-0014).
- Typing: copy NgRx's `on` / `ReducerTypes` inference style so `action` is typed from the creators. Reference: `node_modules/@ngrx/store/types/ngrx-store.d.ts`, `on` around line 762.
- **`fromSyncReducer(reducer)`** wraps any classic `ActionReducer` into a branded reducer. Its seed is `reducer(undefined, { type: INIT })`.
- **`isTxReducer(fn)`** checks for the brand.
- **`combineReducers` / `compose` / `createReducerFactory`**: re-export NgRx's versions. They are used only for bridge reducers.

## 2. `StoreTx<S>` (`lib/reducer/store-tx.ts`)
One `StoreTx` is scoped to one feature. Paths are feature-relative, and `''` means the feature root.

| Method | Behaviour |
| --- | --- |
| `get<T>(path?)` | Reads through a **per-transaction identity cache** shared across features. Lookup order: tx cache → `CommittedCache.peek(fullPath)` (a phase 4b hook; default no-op) → `NodeStore.read`. A sub-path of a cached ancestor is derived from the ancestor value; use meta for array hidden ids if needed. Same path gives the same reference. |
| `set(path, value)` | `NodeStore.diffWrite(prev = get(path), next)`. Then updates the cache: sets the path, drops descendants, and rebuilds or drops ancestors. Rebuilding with structural sharing is preferred; dropping is acceptable if it is documented. |
| `patch(path, partial)` | Shallow merge into an object, then `set`. |
| `delete(path)` | Deletes the subtree. |
| Array ops: `insert(arrayPath, value, index?)`, `removeAt(arrayPath, index)`, `move(arrayPath, from, to)` | Implemented via `get` + `set` (diff makes them minimal). |
| `resetFeature()`, `resetAll()` | Rewrite to the initial state. |
| `sql` | Raw `SqlExecutor`, as an escape hatch. |

- A tx handler that returns a partial: each key goes through `set(key, value)` **after** any imperative writes.
- Every write records its path in the transaction's `ChangeSet`. NodeStore already does this.
- Each feature gets its own `NodeStore` and `StoragePolicy`, built from that feature's config hints.

## 3. Core (`lib/store/`)
### `SqliteStoreCore` (internal, root)
- Owns the `StorageEngine` (with `SCHEMA_MIGRATIONS`) and the feature registry.
- Subscribes to `ActionsSubject` and enqueues each action:
  - `engine.transaction(tx => run handlers of every feature for action.type)`, following ADR-0017 §2.
  - **After** that resolves, *outside* the queue task:
    - `await postCommitHook(changes)` (a phase 4b seam; default resolves immediately),
    - then `ScannedActionsSubject.next(action)`.
  - Emissions are chained to keep dispatch order.
  - On failure, follow ADR-0017 §4: dispatch `nssReducerError`, which is exported, so add it to the public API.
- Registration (`addFeature(s)` / `removeFeature(s)`) follows ADR-0017 §7–8. It dispatches `{ type: UPDATE, features }` through `ReducerManagerDispatcher` *and* `ActionsSubject`, matching NgRx.
- `status` signal. `purgeFeature(key)`. `settle(): Promise<void>` resolves when the queue and the emission chain are idle.

### Store classes
- **`Store`** (our class, exported as `Store`): extends `Observable<T>`, implements `Observer<Action>`. It provides:
  - `dispatch(action)`, with NgRx validation: reject `undefined`, functions passed as actions, and missing `type`.
  - The reactive `dispatch(() => Action, { injector })` → `EffectRef` form, mirroring NgRx's implementation (`effect` + `untracked`).
  - `dispatchAsync`, `next`, `error`, `complete`, `lift`, `addReducer`, `removeReducer`, `purgeFeature`, `settle`, `status`.
  - `select` / `selectSignal` delegate to an injected `SelectionEngine` interface (the phase 4b seam). Its default implementation throws `Error('select is implemented in phase 4b')`.
- **`ReducerManager`**: `BehaviorSubject<ActionReducer>`. It emits a combined *compat* reducer built from `currentReducers` (sync calls return state; see ADR-0017 §5). It exposes `currentReducers`, `addFeature(s)`, `removeFeature(s)`, `addReducer(s)`, `removeReducer(s)`, and delegates to the core.
- **`State`**: `BehaviorSubject<any>` holding a placeholder `{}` until phase 4b. Bind `StateObservable` to it.

## 4. Providers (`lib/store/provide.ts`)
### `provideStore(reducers?, config?)`
- `config` is NgRx's `RootStoreConfig` plus `sqlite?: SqliteStoreConfig`:
  - `driver: SqlDriver | (() => SqlDriver)`; default `CapacitorSqliteDriver({ database: 'ngrx-sqlite-store' })`
  - `features?: Record<string, { hints?: Record<string, StorageHint>; version?: number; onVersionMismatch?: 'error' | 'reseed' }>`
  - `eager?: string[]`
  - `actionHooks?`
- Provide all of the following, binding the NgRx tokens imported from `@ngrx/store` via `useExisting` (ADR-0010):
  - our `Store` + NgRx `Store`
  - NgRx `ActionsSubject`, `ScannedActionsSubject`, `ReducerManagerDispatcher` classes
  - our `ReducerManager` + NgRx `ReducerManager` + `ReducerObservable`
  - our `State` + NgRx `State` + `StateObservable`
  - `INITIAL_STATE`, `INITIAL_REDUCERS`, `META_REDUCERS`, `USER_PROVIDED_META_REDUCERS`, `USER_RUNTIME_CHECKS`, `ACTIVE_RUNTIME_CHECKS`
  - `ROOT_STORE_PROVIDER`, with a factory that initializes the core, plus `provideEnvironmentInitializer(() => inject(ROOT_STORE_PROVIDER))`
- Also `provideAppInitializer`: opens the engine, then registers and seeds the root features before bootstrap completes. On the engine open failure path, status becomes `'error'`; rethrow in dev.

### `provideState(name, reducer, config?)` / `provideState(slice)`
Binds `FEATURE_STATE_PROVIDER` + an environment initializer that registers the feature. `config` accepts `initialState`, `metaReducers` and the `sqlite` feature options.

### `StoreModule.forRoot/forFeature`, `StoreRootModule`, `StoreFeatureModule`
Same providers. Alias NgRx's `StoreRootModule`/`StoreFeatureModule` tokens.

### Runtime checks
ADR-0017 §10.

## 5. Re-exports (`public-api.ts`)
- From `@ngrx/store`, re-export unchanged:
  - functions: `createAction`, `props`, `emptyProps`, `union`, `createActionGroup`, `INIT`, `UPDATE`, `isNgrxMockEnvironment`, `setNgrxMockEnvironment`, `ActionsSubject`, `ScannedActionsSubject`, `ReducerManagerDispatcher`, `ReducerObservable`, `StateObservable`, all `*_TOKEN`-like InjectionTokens, `combineReducers`, `compose`, `createReducerFactory`, `defaultStateFn`, `reduceState`
  - all types listed in the contract
- Selector functions (`createSelector`, `createSelectorFactory`, `defaultMemoize`, `resultMemoize`, `createFeatureSelector`, `select`, `createFeature`) are **temporarily** re-exported from NgRx with a `// replaced in phase 4b` comment.
- Export our `Store`, `State`, `ReducerManager`, `createReducer`, `on`, `onState`, `fromSyncReducer`, `StoreTx`, `provideStore`, `provideState`, `StoreModule`, `nssReducerError`, and `SqliteStoreConfig`.
- Keep internal schema/storage exports minimal. Move non-public items behind `ɵ`-prefixed exports or drop them from `public-api.ts` where nothing outside needs them; tests can import relative paths.

## 6. Seams for phase 4b (export as internal tokens)
- `SELECTION_ENGINE` provides `{ select(...), selectSignal(...) }`.
- `POST_COMMIT_HOOK` is `(changes: ChangeSet) => Promise<void>`. Multi-provider: run them all and await.
- `COMMITTED_CACHE` provides `{ peek(fullPath): unknown | undefined }`.

## 7. Tests (Vitest, `SqlJsDriver` in memory; use `TestBed` with `provideStore({...}, { sqlite: { driver } })`)
- The `INIT` action comes first.
- Seeding from the reducer initialState and from the `provideStore` `initialState`. A second boot on the same exported DB doesn't reseed. The version mismatch behaviour is covered.
- A tx handler with imperative writes. A handler that returns a partial. Mixed imperative and returned writes. An `onState` handler. A foreign classic reducer, using **the real `createReducer` from `@ngrx/store`** and also `routerReducer` from `@ngrx/router-store`.
- **Identity cache:** `get` twice gives the same ref, and a write followed by `get` reflects the write.
- Serial order: 50 rapid dispatches with random-delay handlers commit in order, and the scanned emission order equals the dispatch order.
- **Scanned emission happens post-commit:** in a `ScannedActionsSubject` subscriber, a direct `engine.read` shows the new data.
- **Rollback:** a throwing handler leaves no data and produces no scanned emission. `nssReducerError` is dispatched. `dispatchAsync` rejects. The queue continues.
- One transaction per action across two features: if feature B throws, feature A's writes are rolled back too.
- `addReducer`/`removeReducer` dispatch `UPDATE`. `removeReducer` keeps data, and re-adding it does not reseed.
- **Real `@ngrx/effects` smoke test:** `provideEffects` with a functional effect that `ofType(a)` → maps to `b`. Both get processed, and the effect only sees `a` after `a`'s commit.
- Calling a tx reducer synchronously returns the state.
- `dispatch(() => action)` reactive form with a signal.
- The DI token identity check: `TestBed.inject(NgrxStore) === TestBed.inject(OurStore)`, and the same for `ReducerManager` and `State`.

## Done when
- Tests and the library build pass.
- Update `CLAUDE.md`: tick "Phase 4a" (add the line) and add notes.
- If you add new decisions, update the register `docs/decisions/README.md` with a new ADR.
- **Do not git commit.** The sandbox can't write `.git`, and the orchestrator commits.
- Return a summary of 15 lines or fewer.
