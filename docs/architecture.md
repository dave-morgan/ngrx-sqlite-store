# Architecture

> Status: design baseline. Sections marked **(provisional)** depend on an open question in `open-questions.md`. Their current conservative choice is described here.

## 1. Layering

```
┌────────────────────────────────────────────────────────────────────────┐
│ App code / @ngrx/effects / @ngrx/router-store / @ngrx/store-devtools    │
│   inject(Store) · inject(Actions) · createSelector · createFeature ...  │
├────────────────────────────────────────────────────────────────────────┤
│ Contract layer (ADR-0001, ADR-0010)                                     │
│   Store · ActionsSubject · ScannedActionsSubject · StateObservable      │
│   ReducerManager · provideStore/provideState · StoreModule · creators   │
│   Provided under the *same DI tokens* as @ngrx/store                    │
├───────────────────────────────┬────────────────────────────────────────┤
│ Write side                    │ Read side                              │
│  Dispatcher → WriteQueue      │  SelectorSource (resource-like, D2)    │
│  → Transaction(tx) → reducers │  PathCache (structural sharing)        │
│  → commit → ChangeSet         │  ← Invalidation bus (post-commit)      │
├───────────────────────────────┴────────────────────────────────────────┤
│ Schema engine (D4–D8): path-keyed node rows, JSON columns, array/entity │
│ tables, promotion, 1 MB row cap, scalar chunking, recursive-CTE reads   │
├────────────────────────────────────────────────────────────────────────┤
│ Driver abstraction (SqlDriver)                                          │
│   CapacitorSqliteDriver (Android/iOS; web via jeep-sqlite)              │
│   SqlJsDriver (Node unit tests, web dev)                                │
└────────────────────────────────────────────────────────────────────────┘
```

Each layer only talks to the layer directly below it. The contract layer never builds SQL. It works with paths, transactions, and selector sources.

## 2. Driver abstraction

```ts
interface SqlDriver {
  open(): Promise<void>;
  close(): Promise<void>;
  exec(sql: string): Promise<void>;                       // DDL / multi-statement
  run(sql: string, params?: SqlValue[]): Promise<{ changes: number; lastId?: number }>;
  query<R = Row>(sql: string, params?: SqlValue[]): Promise<R[]>;
  begin(): Promise<void>; commit(): Promise<void>; rollback(): Promise<void>;
}
type SqlValue = string | number | null | Uint8Array;
```

- **CapacitorSqliteDriver** wraps `SQLiteConnection` / `SQLiteDBConnection` from `@capacitor-community/sqlite`. It always passes `transaction: false` to `run`/`execute`, because the store owns transaction boundaries through `BEGIN IMMEDIATE`/`COMMIT`/`ROLLBACK`. Plugin 8.x `query` has no transaction parameter; its third argument is `isSQL92`, so queries use the default signature. On web the app sets up `jeep-sqlite`; the driver calls `initWebStore()` before opening and `saveToStore()` after commit.
- **SqlJsDriver** uses `sql.js` (WASM). It needs no native build, so it runs in Vitest under Node/jsdom and in the browser. It is the default for unit tests (ADR-0012).
- Under Node 22.12+ the sql.js driver uses `process.getBuiltinModule('module').createRequire()` to load the native Node package entry and resolve `sql.js/dist/sql-wasm.wasm` from `node_modules`. This bypasses the Angular test builder's browser-conditioned bundle in jsdom; no test helper or copied WASM asset is required. Browser apps supply `locateFile` and serve the WASM asset, or inject an initialized module factory with `sqlJs`.
- Every value crossing the Capacitor bridge is JSON-serialized. That makes the bridge cost proportional to bytes moved, which is another reason to keep rows small (D8).
- Driver runtimes load lazily so importing the package does not require unused optional peers. The published package includes `@types/sql.js` because the sql.js factory option exposes its module type.
- A web `saveToStore()` failure after SQLite commits leaves IndexedDB durability uncertain. The commit promise rejects, no changes are emitted, and a failed rollback places the engine in `error`; callers must close and recover rather than retry the write blindly.

## 3. Write side

Phase 2 implements `StorageEngine` with one FIFO queue shared by lifecycle operations, transactions, and reads. Reads are queued because a single SQLite connection can see its own uncommitted writes. Inside a transaction or queued callback, use its supplied executor; awaiting another queued engine operation from there would deadlock. Non-empty change sets emit after commit, followed by awaited `afterCommit` callbacks, before the transaction promise resolves. Callback failures reject the promise without rolling back committed data.

Internal migrations run atomically at open, ordered by version, with `schema_version` in `nss_meta`. Built-in migration v1 creates only `nss_meta`; additional migrations extend v1 with unique positive integer versions. Failed opens roll back and close the connection, exposing `error` status. Phase 3 exports `SCHEMA_MIGRATIONS` (v2), registered through the existing `migrations` option or `STORAGE_ENGINE_OPTIONS`, to create the approved node/entity/chunk tables.

### 3.1 Dispatch pipeline

```
store.dispatch(a)
  → ActionsSubject.next(a)                       (sync, same as NgRx)
  → WriteQueue.enqueue(a)                        (serial; one at a time; FIFO)
      BEGIN
        for each registered feature reducer handling a.type:
          await reducer(tx, a)                    (async, reads only what it needs)
        tx.flush()                                (diff + batched writes, D9)
      COMMIT
  → ChangeSet {paths touched}
  → PathCache.invalidate(changeSet) → SelectorSources re-query (post-commit)
  → ScannedActionsSubject.next(a)                (effects see post-commit state)
```

Guarantees (ADR-0003):

1. **Serial.** Only one transaction is in flight at a time. Actions never interleave, and dispatch order equals commit order.
2. **Notify after commit.** Nothing outside the transaction can see half-applied state. The selector cache is only touched after `COMMIT` resolves.
3. **Effects after commit.** `ScannedActionsSubject` emits once the selector sources affected by that action have refreshed. That way `withLatestFrom(store.select(x))` in an effect reads the post-action value. Implementation: invalidation → await the re-queries of the *currently subscribed* sources that overlap the change set → emit the scanned action.
4. **Re-entrancy.** A `dispatch` called from an effect or a selector subscriber while the queue is busy is just enqueued. Reducers cannot dispatch.
5. **Failure (provisional, Q13).** If a reducer throws or the SQL fails, the transaction is rolled back. The change set is discarded, and no selector is invalidated. The action is **not** forwarded to `ScannedActionsSubject`. A `[ngrx-sqlite-store] Reducer Error` action carrying `{ action, error }` is dispatched, and the queue continues.

`store.dispatch` stays synchronous and returns `void`, the same as NgRx. Callers that need completion can use an opt-in `store.dispatchAsync(action): Promise<void>` extension. The harness uses it for e2e determinism.

### 3.2 Reducers and the `tx` handle (ADR-0013, ADR-0014)

```ts
export const todosReducer = createReducer(
  initialState,
  on(addTodo, async (tx, { todo }) => {
    await adapter.addOne(tx, todo);                       // compiles to INSERT (D5)
  }),
  on(setFilter, async (tx, { status }) => {
    await tx.set('filters/status', status);                // path relative to feature root
  }),
  on(renameList, async (tx, { name }) => {
    const meta = await tx.get<ListMeta>('meta');
    await tx.set('meta', { ...meta, name });               // diffed write (D9)
  }),
);
```

The `tx` handle is scoped to one feature. Paths are relative to the feature key.

| Method | Semantics |
| --- | --- |
| `get<T>(path?)` | Read a subtree. Goes through the transaction's **identity cache**, so repeated reads return the same reference and diffing works (ADR-0014). `get()` with no path returns the whole slice, which is expensive and should be avoided in hot paths. |
| `set(path, value)` | Replace the subtree at `path`. Structurally diffed against the identity-cached previous value. Only changed paths are written. |
| `patch(path, partial)` | Shallow merge into an object node. |
| `delete(path)` | Remove a subtree (prefix delete). |
| `insert(arrayPath, value, index?)` / `move` / `removeAt` | Array element ops using fractional positions (D6). |
| `sql` | Escape hatch: raw `run`/`query` on the open transaction, for advanced users. |

**Classic sync reducers (compat bridge).** `(state, action) => state` reducers, such as `routerReducer` from `@ngrx/router-store`, third-party reducers, or not-yet-migrated user reducers, are wrapped by `fromSyncReducer()`. The wrapper loads the slice with `tx.get()`, runs the reducer, and `tx.set('', next)` diffs the result. That costs memory proportional to the slice, so it is meant for small slices. See Q7. `on()` is always a tx handler. Classic handlers use `onState()`, and unbranded foreign reducers are auto-wrapped (ADR-0013). A tx handler may also resolve to a partial state that gets diffed (ADR-0014).

### 3.3 Diffing (D9)

`tx.set(path, next)` walks `next` against `prev`, which is the identity-cached value from `tx.get` or the PathCache:

- `next === prev` → skip the subtree.
- Scalar change → `UPDATE` one row.
- Object → recurse by key. Keys that were added or removed become inserts or prefix deletes.
- Array → match objects by reference and primitives by value, greedily in order. Entity collections match typed ids. A longest increasing subsequence keeps existing positions; moved or new elements get fractional positions. Removed elements are deleted. Exhausted position precision triggers integer renormalisation.
- All resulting SQL is buffered and flushed as prepared statement batches at the end of the reducer.

## 4. Schema engine (D4–D8)

### 4.1 On-disk schema v1 (ADR-0015)

```sql
CREATE TABLE nss_meta   (key TEXT PRIMARY KEY, value TEXT NOT NULL);
-- 'schema_version' = '2' after the schema engine migration; format remains v1
-- 'feature:<key>:version' = '<n>'

CREATE TABLE nss_node (
  path    TEXT PRIMARY KEY,           -- 'todos/filters/status' (JSON-Pointer escaped segments)
  parent  TEXT,                       -- parent path; NULL for a feature root
  kind    INTEGER NOT NULL,           -- see kind table
  pos     REAL,                       -- object/array child order (fractional); root NULL
  value   TEXT                        -- scalar (JSON-encoded) or JSON blob; NULL for pointer rows
) WITHOUT ROWID;
CREATE INDEX nss_node_parent ON nss_node(parent, pos);

CREATE TABLE nss_chunk  (path TEXT NOT NULL, seq INTEGER NOT NULL, data TEXT NOT NULL,
                         PRIMARY KEY(path, seq)) WITHOUT ROWID;

CREATE TABLE nss_entity (
  coll    TEXT NOT NULL,              -- path of the EntityState, e.g. 'todos' or 'todos/items'
  id      TEXT NOT NULL,              -- selectId(entity), stringified with a type prefix
  pos     REAL NOT NULL,              -- ids[] order (insertion / fractional)
  sortkey TEXT,                       -- optional encoded scalar key (ADR-0024)
  data    TEXT NOT NULL,              -- JSON ≤ 1 MB; '' marks a promoted entity value
  PRIMARY KEY (coll, id)
) WITHOUT ROWID;
CREATE INDEX nss_entity_order ON nss_entity(coll, pos);
```

| kind | meaning | `value` |
| --- | --- | --- |
| 0 | null | NULL |
| 1 | boolean | JSON `false`/`true` |
| 2 | number | numeric text |
| 3 | string | JSON-encoded text |
| 4 | inline JSON (small object/array, D7) | JSON text |
| 5 | object pointer (children are rows) | NULL |
| 6 | array pointer (children are rows with `pos`) | NULL |
| 7 | chunked string (D8) | NULL; data in `nss_chunk` |
| 8 | entity collection pointer | NULL; rows in `nss_entity` |

**Paths.** A path is `feature/seg/seg`. Each segment is escaped JSON-Pointer style (`~` → `~0`, `/` → `~1`). Array elements use a hidden, stable segment `#<base36 id>`, never their index, so reordering never rewrites paths. A subtree is `path = :p OR path >= :p || '/' AND path < :p || '0'`. The `'0'` bound works because `'0'` is the character after `'/'`, so this is an index range scan.

Object children also have positions, preserving key insertion order. Diff writes ignore
reordering existing keys and append new keys after existing positions. Entity ids use
`s:`/`n:` prefixes to distinguish strings and numbers. Oversized entity data uses an
empty-string marker in `nss_entity.data` and normal promoted nodes at
`coll/~2<escaped typed id>`; the reserved `~2` prefix cannot collide with escaped extra
property keys. Entity extra properties remain ordinary child nodes. See ADR-0016.

**Why one generic node table instead of a table per feature?** Feature registration stays DDL-free, which matters for lazy features and Q9. Path prefixes become cheap. Migrations become data-only (Q10). Entities get their own table because they have a natural PK and an order column (D5).

### 4.2 Storage policy

- The feature root is an object pointer (kind 5), or an explicitly branded entity. Root arrays are rejected; subtree arrays retain their array kind. Each top-level property is its own scalar, object, array, or entity row. This is the unit of change-notification granularity (§6).
- Nested objects stay inline JSON (kind 4) until either:
  - their serialized UTF-8 size exceeds the **promotion threshold** (default 16 KB, provisional Q2), or
  - the feature config marks the path as `collection`.
  Promoted values become pointer rows (adjacency list, D7). Phase 3 recomputes policy
  on changed values, including demotion. Feature-relative path hints accept exact
  escaped paths, `*` (one segment), and `**` (any depth). `inline` overrides the
  threshold but never the hard row cap. `entity` opts in to structural EntityState
  detection; otherwise detection requires the non-enumerable `NSS_ENTITY_BRAND`.
- Arrays that are rows (top-level or promoted) are stored as element rows with fractional `pos` (D6). Arrays *inside* inline JSON stay JSON.
- An `EntityState`-shaped value created via `adapter.getInitialState()` is detected by a brand in its initial state and stored in `nss_entity` (D5).
- **1 MB cap (D8).** Every row write measures `utf8ByteLength(value)`. If an object/array is over the cap, it is promoted. If a single string is over the cap, it is split into ≤ 1 MB chunks in `nss_chunk` (kind 7). This is enforced in one place, `RowWriter`, so no code path can skip it.
- Policies may lower the cap to at least 32 bytes (enough for non-string scalars),
  but cannot raise it above 1,048,576 bytes.
- Strings are chunked as JSON-encoded text, retaining Unicode and lone surrogates.
  `serializedSize` validates and memoizes immutable objects in one recursive walk,
  without constructing JSON text. Invalid values, cycles, accessors, class instances,
  and custom `toJSON` hooks fail with `NonSerializableStateError` naming their path.

### 4.3 Reads

- `readSubtree(exec, path)` runs one prefix range query over `nss_node`, plus ordered
  `nss_entity`/`nss_chunk` lookups. It allocates containers and links each child once
  in `(parent, pos)` order. `readSubtreeCte` provides equivalent recursive-CTE reads
  for the Q3 comparison. Results are branded where applicable, carry WeakMap node
  metadata, and are recursively frozen in dev mode.
- Reads go through the **PathCache**, which gives structural sharing: an unchanged subtree returns the same reference across reads.

Phase 3's `NodeStore` takes the supplied `SqlExecutor` and `ChangeSet` directly;
Phase 4a adds the shared transaction identity cache; Phase 4b adds the committed
PathCache. Repeated reads reuse references, including descendants derived from
cached containers and hidden array ids. Writes invalidate overlapping ancestors
and descendants; containers are reloaded to retain generated ids and positions.
All schema INSERT/UPDATE/DELETE statements originate in `RowWriter`, which records
paths and batches inserts with at most 999 parameters. Never await a nested engine
operation in an engine callback, `changes$` subscriber, or `afterCommit` callback:
they execute inside the FIFO task. Selector re-queries must start after the outer
transaction resolves.

## 5. Read side: selectors (D2)

### 5.1 SelectorSource

Selector sources are represented internally by refcounted PathCache entries keyed
by path (`todos` or `todos/items`), subscription leases, and a generation signal.
On first subscription they query SQLite; no public resource object is exposed.
After a commit, active overlapping entries refresh only their changed branches.
Released entries stay in the inactive LRU (default 32); entries beyond the limit
are evicted immediately. A fresh entry emits synchronously when resubscribed.
Logical array indices and inline/entity children cache their nearest physical
container so physical row changes also invalidate logical dependencies.

### 5.2 Selector composition

- `createFeatureSelector('todos')` and the selectors that `createFeature` generates per property (`selectItems` → `todos/items`) are **source selectors**. They carry a hidden `[NSS_SOURCE]` path.
- `createSelector(...inputs, projector)` is the ordinary NgRx memoized selector (same `defaultMemoize`, `resultMemoize`, `release`, `projector`, `setResult`, `clearResult`). It also records the union of its inputs' source paths.
- `store.select(sel)` / `store.selectSignal(sel)` evaluate selectors against a plain frozen view containing exactly the loaded paths. The view is rebuilt with structural sharing, preserving plain NgRx memoization. Reference-only immutable replacements carry transient commit hints so they also cause the appropriate projector calls (ADR-0021).
- **Foreign selectors** (built with the real `@ngrx/store`, for example router-store's `getRouterSelectors`, or plain `state => state.x` lambdas) have no metadata. A tracking proxy records feature-level dependencies on every evaluation (Q8). Newly discovered conditional branches load before the scanned action is emitted. Identity selectors pin all registered features and return the plain view.
- **Before the first load (provisional, Q5).** `select()` emits nothing until the sources are ready. `selectSignal()` returns the value computed from `initialState` defaults until then. `provideStore` registers an app initializer that opens the DB, runs migrations, seeds, and preloads root features that are marked `eager`.

### 5.3 Query sources (ADR-0027/0028)

`adapter.query(selectState?)` supplies count, ids, exists and ordered page selectors.
Each is an ordinary NgRx memoized selector with a query source keyed by the pair
(collectionPath, queryKey). Derived selectors retain these sources, including
compositions with dynamic selectors. Query values live outside the materialized
state tree; a count subscription never loads or pins the collection path.

PathCache shares refcounting and its inactive LRU budget between path and query
entries. changes$ only marks overlapping collection queries stale. The existing
post-commit hook re-runs active queries through engine.read, after transaction
resolution and before scanned actions/effects. Fresh results emit synchronously;
unloaded query signals use the query's initial value. Equal JSON results retain
references; non-JSON generic reader results retain their actual types.

Fields are validated against the ADR-0027 identifier grammar. Both JSON paths and
values are bound SQL parameters. Two-valued scalar filters distinguish booleans,
numbers and strings; missing fields are null-equivalent. Promoted rows alone use
JS evaluation with a development warning. Counts aggregate inline rows without
loading entities; pages bound inline reads even when merging promoted rows.

Keyed entity reads order by sortkey, pos using the migration v3 index. Non-keyed
collections have NULL keys and keep stored pos order. The first write by a keyed
adapter backfills keys through RowWriter; migration alone never reorders data.
See ADR-0024 for encoding and insertion-order ties.

## 6. Change notification (Q8, provisional)

- During a transaction, the `RowWriter` records each written or deleted path in a `ChangeSet`. A prefix delete is recorded as its prefix.
- After commit, a source at path `S` is invalidated if any change path `C` satisfies `C startsWith S` or `S startsWith C`, compared on segment boundaries.
- Entity writes record `coll` plus `coll/#ids` (order changed) or `coll/<id>`.

## 7. Contract layer (ADR-0001, ADR-0010)

The library implements every class and token that ecosystem libraries inject, and provides it **under the original `@ngrx/store` DI tokens**:

| Token (from `@ngrx/store`) | Provided as |
| --- | --- |
| `Store` | `SqliteStore` (extends `Observable`, same method surface) |
| `ActionsSubject` | `SqliteActionsSubject` (sync, like NgRx) |
| `ScannedActionsSubject` | post-commit subject (§3.1) |
| `StateObservable` / `State` | `SqliteState`: emits a lazy whole-state view (Q4) |
| `ReducerManager`, `ReducerObservable`, `ReducerManagerDispatcher` | `SqliteReducerManager`: feature registry + compat |
| `INITIAL_STATE`, `INIT`, `UPDATE`, `ROOT_STORE_PROVIDER`, `FEATURE_STATE_PROVIDER`, `ACTIVE_RUNTIME_CHECKS`, ... | same tokens, our values |

Pure helpers (`createAction`, `props`, `createActionGroup`, `union`, `emptyProps`, `compose`, `combineReducers`) are re-exported so that action creators are interchangeable with ones built by the real package. The pipeable `select` routes direct store selections through the selection engine and delegates ordinary Observable pipelines to NgRx. Effects' `ofType` matches on `type` strings, so they work across both.

Phase 4a implements the write side and original DI token aliases. Root bootstrap
opens and migrates the database, seeds versioned features, then releases buffered
actions with `INIT` first. Feature registrations during bootstrap are also seeded
before actions run. Removing a feature (including destroying its environment)
unregisters handlers and retains data; `purgeFeature` deletes data and its version
marker. `settle()` waits for writes, purges, refresh hooks and scanned emissions.
Foreign reducers whose seed is `undefined`, including `routerReducer`, retain only
the feature version marker until they produce state. Reset/reseed removes their
persisted subtree rather than writing an invalid JSON value.

ADR-0030 adds `sqlite.features[key].persist` (default `true`). A value of `false`
re-seeds the feature from its initial state during registration on every store
open, regardless of its stored version. Root and bootstrap feature seeds finish
before INIT and buffered actions; lazy `provideState` registration queues its seed
before UPDATE and subsequent actions. Writes use the existing NodeStore/RowWriter
path and ChangeSet notifications, so selectors never receive stale session data.
Session feature reads remain gated until their registration seed commits, including
when a lazy seed waits behind an earlier action's commit and refresh.
The feature remains SQLite-backed and transactional throughout the session.
Feature-local SQLite options override the corresponding root feature options.

A foreign/bridge reducer under the default key `router` defaults to
`persist: false`, without importing the optional router-store peer. This removes
the previous router subtree before router-store can navigate to a stale URL.
Explicit `persist: true` opts into route restoration; explicit `false` also works
for other slices. Transaction reducers named `router` retain the normal `true`
default. A custom router-store state key requires explicit configuration, for
example `sqlite: { features: { myRouter: { persist: false } } }`.

`StoreTx` scopes paths to one feature. Action hooks run once before feature
handlers, receiving the first registered feature's handle; `resetAll()` on that
handle resets every registered feature in the same transaction. Classic reducer
maps and meta-reducers use the compatibility bridge. Transaction reducers are
registered individually; NgRx's synchronous composition helpers remain bridge-only.
The opt-in action-type uniqueness check delegates to NgRx's private action
registry through a temporary empty store using its public providers, at root and
feature registration. No private NgRx symbols are imported.

The phase 4b implementation uses internal `ɵSELECTION_ENGINE`, `ɵCOMMITTED_CACHE`,
and multi-provider `ɵPOST_COMMIT_HOOK`. Cache invalidation is synchronous inside
`changes$`; refresh hooks query after transactions resolve, including seeding and
purge transactions. `State`/`StateObservable` emit the loaded view. Whole-store
subscriptions pin registered features; `materialize()` reads all features for
debugging. Default minimal router-store snapshots are normalized to JSON in the
classic bridge (ADR-0020), preserving default router navigation integration.

### 7.1 Import strategies

1. **Change imports.** `import { Store } from 'ngrx-sqlite-store'`, and `ngrx-sqlite-store/entity` in place of `@ngrx/entity`.
2. **Path alias.** Map `@ngrx/store` and `@ngrx/entity` to this package in `tsconfig` `paths`. Ecosystem libs in `node_modules` must still resolve the real `@ngrx/store` for token identity. Whether the Angular esbuild builder applies `paths` to `node_modules` imports must be verified (Q15).
3. **Harness.** It uses its own alias `@store` (and `@store/entity`), which points at either implementation through per-configuration tsconfig files. See `projects/harness/README.md`.

## 8. Harness

`projects/harness` is an Angular 22 standalone app, packaged with Capacitor for Android. It uses every integration: `provideStore`, `provideState`, `createFeature`, `createActionGroup`, entity adapters, class-based and functional `provideEffects` (including `withLatestFrom`), `provideRouterStore` with `getRouterSelectors`, `provideStoreDevtools`, `selectSignal`, and `provideMockStore` in unit tests. It seeds a deterministic dataset (N todos/users/large blobs).

Two build configurations, `classic` and `sqlite`, swap the implementation behind `@store`. The same e2e test suite runs against both, and its results must be identical.

## 9. Testing strategy

- **Unit (Vitest via `@angular/build:unit-test`).** Library tests run against `SqlJsDriver` in memory.
- **Contract tests.** Real `@ngrx/effects`, `@ngrx/router-store`, and `@ngrx/store-devtools` run against both implementations.
- **E2E.** The harness runs in the browser (jeep-sqlite or sql.js driver) and on an Android emulator or device (Capacitor).
- **Benchmarks (Phase 9, Q14).** These measure Android RAM and dispatch→emit latency, comparing classic against sqlite.

### Phase 11: bridge statement budgets (ADR-0029)

Subtree range reads transport node, entity and chunk rows in one flat ordered UNION query; the CTE comparison reader retains its traversal. RowWriter batches removed array leaves, deleted entity IDs and independent changed entity rows within 999 bind parameters, retaining minimal single-row UPDATEs and UTF-8 row caps. Explicit feature reset replaces the prefix without materializing previous state; ordinary set remains a diff. Prefix reset records replacement identity hints without reading the old subtree. Transaction reads retain physical locations, containers reload lazily after writes, and targeted entity operations can reuse fresh committed collection metadata. Invalidations cover overlapping identities and cached locations. Acceptance budgets include BEGIN/COMMIT, internal sql.js queries and active whole-store refresh; the same workload generates `spikes/bridge-cost.md`.
