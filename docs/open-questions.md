# Open questions & spikes

Status values: **Open** (no direction yet) · **Provisional** (conservative choice in use, revisit) · **Needs approval** (hard to reverse, user must decide) · **Resolved → ADR-xxxx**.

When a question is resolved, move it to an ADR and leave a one-line pointer here.

---

### Q1. `sortComparer` for entities. Status: **Open (parked)**
A JS comparator can't run inside SQLite.
- Options: (a) compute and store an indexed `sortkey` column at write time, using a user-supplied `sortKey(entity) => string|number`; (b) a declarative sort spec (`{ field, direction }[]`) compiled to `ORDER BY json_extract(...)`; (c) sort in JS on read, only for small collections; (d) a combination: a declarative spec preferred, with a function comparator allowed but warned about and applied in JS.
- Current: the `nss_entity.sortkey` column is reserved. `sortComparer` is accepted but applied in JS on read, with a dev warning.
- Resolves when: a spike measures (a) vs (b) on 10k entities on Android, and the API shape is agreed.

### Q2. Promotion threshold rules. Status: **Provisional**
When does nested data move from a JSON column to child rows (beyond the hard 1 MB cap, ADR-0008)?
- Options: a size threshold; per-feature config hints (`paths: { 'items': 'collection' }`); access frequency; dynamic promotion/demotion at runtime.
- Current: a 16 KB serialized threshold plus config hints. Promotion happens on write. No demotion.
- Resolves when: spike Q3 gives read/write costs by size, and a migration story for changing promotion exists (with Q10).

### Q3. Nested structure spike. Status: **Open (spike, phase 8)**
Validate adjacency list + recursive CTE: read/write performance at depth, reassembly cost, how pointer rows interact with path-as-ID, and whether arrays-in-objects-in-arrays round-trip.
- Resolves when: a benchmark plus round-trip property tests are in `projects/ngrx-sqlite-store/spikes/`.

### Q4. `StateObservable` and whole-state consumers. Status: **Provisional (decide per consumer)**
Devtools, router-store, and some meta-reducers expect one full state object.
- Options: a lazy proxy that loads on access; a degraded/partial mode; an explicit debug-only "materialize full state".
- Findings (NgRx 22.0.1):
  - **router-store** only `select`s its own `router` slice and dispatches. It works through ordinary selectors, with the `router` slice handled by a classic reducer through the compat bridge.
  - **store-devtools** injects `ActionsSubject`, `ReducerObservable`, `ReducerManagerDispatcher`, `ScannedActionsSubject`, and `INITIAL_STATE`, recomputes state *in memory* by running the combined reducer, and **overrides `StateObservable`**. That is fundamentally at odds with async `tx` reducers.
- Current: `StateObservable` emits a lazy view, containing only loaded features, plus `materialize()`. For devtools, the plan is a debug-only mode where `ReducerObservable` emits a sync reducer that returns post-commit materialized snapshots, so the devtools timeline is display-only. Time travel and jump are unsupported. To be confirmed in phase 7.

### Q5. Selector loading semantics. Status: **Provisional**
- Options: emit nothing until loaded; emit `initialState` defaults; serve the last value from an LRU.
- Current: `select()` emits nothing until loaded. `selectSignal()` computes from `initialState` defaults until loaded. An app initializer opens and seeds the DB before bootstrap and preloads `eager` features. Released sources stay in a small LRU (default 32 entries), so re-subscribing emits immediately while a refresh runs.
- Resolves when: harness UX on device is acceptable, with no flash-of-default for eager features.

### Q6. Reducer API shape. Status: **Needs approval (public API)**
- Options: (a) imperative `tx` (`tx.set(path, v)`, adapter ops); (b) return a new partial state that is diffed (ADR-0009); (c) both.
- Constraint: values read from SQLite are fresh objects, so (b) requires reads through a per-transaction identity cache. That is planned regardless.
- Open sub-question: how `on()` distinguishes `(tx, action)` from classic `(state, action)` reducers. Same arity, and async detection is unreliable after transpilation. Candidates: separate helpers (`on` vs `onTx`), a marker wrapper (`tx(async (tx, a) => ...)`), or reducer-level opt-in (`createTxReducer`).
- Proposed `tx` API: see architecture §3.2.

### Q7. Mixed mode. Status: **Provisional**
Can small UI slices stay fully in memory with classic sync reducers?
- Current: no in-memory slices. Classic reducers are supported only through the SQLite-backed compat bridge, which loads, reduces, and diffs. A true in-memory mode would be a flag per feature, `storage: 'memory'`, deferred.

### Q8. Change notification granularity. Status: **Provisional**
- Options: table-level, path-level, or row-level. Dependencies declared statically or recorded at query time.
- Current: path-level with segment-boundary prefix overlap. Source selectors declare static paths. Foreign selectors record their dependencies through a tracking proxy at call time.

### Q9. Startup and initial state. Status: **Provisional**
- Current: on open, run migrations, then for each registered feature, if `nss_meta` has no `feature:<key>:version`, seed from `initialState` inside one transaction. Lazy features seed on registration, before their first action is processed, because the write queue processes registration as a queue item. DDL is fixed (ADR-0004), so features never wait on tables.

### Q10. Schema/state-shape migrations. Status: **Open**
- Options: a per-feature `version` plus `migrations: { [v]: async (tx) => void }`; reset-on-mismatch (dev only); export/import JSON.
- Current (conservative): per-feature version stored in `nss_meta`. If the version is higher and no migration exists, a dev warning is raised and the slice is re-seeded from `initialState` (destructive, so opt-in only: `onVersionMismatch: 'reseed' | 'error'`, default `'error'`).

### Q11. Meta-reducers and runtime checks. Status: **Open**
- Meta-reducers wrap a reducer function. With `tx` reducers they could wrap `(tx, action) => Promise<void>`, but logging/hydration/reset-on-logout libraries assume `(state, action) => state`.
- Current: support `metaReducers` that work on the *action* (logging, reset). Reset-on-logout gets a first-party `tx.resetFeature()`/`resetAll()`. State-transforming meta-reducers apply only to compat-bridge reducers. Runtime checks: action serializability and `strictActionWithinNgZone` keep working. State immutability and serializability checks run on values passed to `tx.set` in dev mode.

### Q12. Web/dev platform. Status: **Provisional** (test driver → ADR-0012)
- `@capacitor-community/sqlite` on web uses `jeep-sqlite`, which persists to IndexedDB.
- Current: unit tests use `SqlJsDriver`. Web dev of the harness uses jeep-sqlite through the Capacitor driver. Whether web is a *supported production* target is undecided.

### Q13. Error handling. Status: **Provisional**
- Current: roll back, discard the change set, don't emit to `ScannedActionsSubject` (effects skip the action), dispatch `[ngrx-sqlite-store] Reducer Error` with `{ action, error }`, and continue the queue. The queue is never blocked by a failing reducer. A driver-level failure (DB closed or corrupt) puts the store in an `error` status, surfaced via `store.status`.

### Q14. Performance targets. Status: **Open**
- Proposed targets (to confirm on a mid-range Android device): dispatch → selector emission p95 < 16 ms for a single-row change; JS heap with 50k entities and one visible list of 50 < 20% of classic; cold start to first eager emission < 300 ms.
- Resolves when: the phase 9 benchmark harness runs on a real device.

### Q15. Path alias `@ngrx/store` → this package. Status: **Open**
- Our library imports the real `@ngrx/store` for tokens (ADR-0010). A global alias could redirect those imports to us.
- Options: (a) verify that esbuild's tsconfig `paths` don't apply inside `node_modules` (likely) and ship the library prebuilt in `node_modules`; (b) ship an internal re-export of the needed tokens via a separate specifier; (c) recommend changing imports only.
- Resolves when: tested in a sample app with a published (packed) build of the library.
