# Open questions & spikes

Status values: **Open** (no direction yet) Â· **Provisional** (conservative choice in use, revisit) Â· **Needs approval** (hard to reverse, user must decide) Â· **Resolved â†’ ADR-xxxx**.

When a question is resolved, move it to an ADR and leave a one-line pointer here.

---

### Q1. `sortComparer` for entities. Status: **Resolved â†’ ADR-0024**
Optional sortKey uses typed order-preserving encoding, stable insertion ties and migration v3; arbitrary sortComparer remains available. [Q1](spikes/q1.md) measures the production adapter. Android performance validation remains Phase 9. See [ADR-0024](decisions/0024-declarative-entity-sort-key.md).

### Q2. Promotion threshold rules. Status: **Provisional â†’ ADR-0025**
[Threshold sweep and boundary-crossing results](spikes/q2.md) retain configurable 16 KiB as a compromise; hot small-leaf workloads can use 2â€“8 KiB or collection hints. Keep existing changed-write promotion/demotion and the hard cap; no new background demoter. Device access-pattern costs and a threshold migration story (Q10) remain before a universal default can be validated. See [ADR-0025](decisions/0025-promotion-threshold-findings.md).

### Q3. Nested structure spike. Status: **Resolved â†’ ADR-0026**
[Range/CTE, reassembly, five seeded depth-12/100k-node round trips and rename measurements](spikes/q3.md) validate the current structural model. Retain the range reader and hidden array ids; object renames/moves still rewrite descendant paths. See [ADR-0026](decisions/0026-adjacency-readers-and-array-identity.md). Android performance targets remain Q14/phase 9.

### Q4. `StateObservable` and whole-state consumers. Status: **Resolved â†’ ADR-0022**
Devtools, router-store, and some meta-reducers expect one full state object.
- Options: a lazy proxy that loads on access; a degraded/partial mode; an explicit debug-only "materialize full state".
- Findings (NgRx 22.0.1):
  - **router-store** only `select`s its own `router` slice and dispatches. It works through ordinary selectors, with the `router` slice handled by a classic reducer through the compat bridge.
  - **store-devtools** injects `ActionsSubject`, `ReducerObservable`, `ReducerManagerDispatcher`, `ScannedActionsSubject`, and `INITIAL_STATE`, recomputes state *in memory* by running the combined reducer, and **overrides `StateObservable`**. That is fundamentally at odds with async `tx` reducers.
- Verified in phase 7: whole-store subscriptions pin registered features; services read our State directly. Devtools overrides StateObservable for display only, receives the current committed loaded view through the compat reducer, and cannot inject pre-commit or duplicate scanned actions. Monitor control actions never enter the application queue. Time travel and monitor dispatch do not change SQLite state. See [ADR-0022](decisions/0022-devtools-compat.md) and [ADR-0023](decisions/0023-async-ecosystem-ordering.md) for router preactivation transport ordering.

### Q5. Selector loading semantics. Status: **Provisional**
- Options: emit nothing until loaded; emit `initialState` defaults; serve the last value from an LRU.
- Current: `select()` emits nothing until loaded. `selectSignal()` computes from `initialState` defaults until loaded. An app initializer opens and seeds the DB before bootstrap and preloads/pins `eager` features. Released sources stay in a small LRU (default 32 inactive entries). Re-subscribing emits synchronously if fresh; stale entries refresh before emitting (ADR-0018 and the Phase 4b addendum).
- Resolves when: harness UX on device is acceptable, with no flash-of-default for eager features.

### Q6. Reducer API shape. Status: **Resolved â†’ ADR-0013, ADR-0014**
`on()` handlers are tx reducers, and `onState()` / `fromSyncReducer()` cover classic ones. Handlers can write imperatively and/or return a partial that gets diffed. Reads go through the identity cache. The detailed `tx` method list is in architecture Â§3.2.

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

### Q12. Web/dev platform. Status: **Provisional** (test driver â†’ ADR-0012)
- `@capacitor-community/sqlite` on web uses `jeep-sqlite`, which persists to IndexedDB.
- Current: unit tests use `SqlJsDriver`. Web dev of the harness uses jeep-sqlite through the Capacitor driver. Whether web is a *supported production* target is undecided.

### Q13. Error handling. Status: **Provisional**
- Current: roll back, discard the change set, don't emit to `ScannedActionsSubject` (effects skip the action), dispatch `[ngrx-sqlite-store] Reducer Error` with `{ action, error }`, and continue the queue. The queue is never blocked by a failing reducer. A driver-level failure (DB closed or corrupt) puts the store in an `error` status, surfaced via `store.status`.

### Q14. Performance targets. Status: **Open**
- Proposed targets (to confirm on a mid-range Android device): dispatch â†’ selector emission p95 < 16 ms for a single-row change; JS heap with 50k entities and one visible list of 50 < 20% of classic; cold start to first eager emission < 300 ms.
- Resolves when: the phase 9 benchmark harness runs on a real device.

### Q15. Path alias `@ngrx/store` â†’ this package. Status: **Open**
- Our library imports the real `@ngrx/store` for tokens (ADR-0010). A global alias could redirect those imports to us.
- Options: (a) verify that esbuild's tsconfig `paths` don't apply inside `node_modules` (likely) and ship the library prebuilt in `node_modules`; (b) ship an internal re-export of the needed tokens via a separate specifier; (c) recommend changing imports only.
- Resolves when: tested in a sample app with a published (packed) build of the library.

### Q16. Aggregates over large collections. Status: **Resolved â†’ ADR-0027**
Selectors derived from `selectAll` materialize and pin the whole collection (found while designing the phase 9 benchmark). Counts, pages and filters move into SQL as query selectors.
Phase 10 implements query-source caching, post-commit refresh, parameterized filters
and promoted-row fallback, with JS/SQL equivalence and effect-timing tests.
See [ADR-0027](decisions/0027-query-selectors.md) and
[ADR-0028](decisions/0028-query-filter-and-classic-order-semantics.md).

### Q17. Bridge payload peak memory. Status: **Resolved â†’ ADR-0039 / ADR-0041**
Bound executeSet JSON to 256 KiB and stream writes inside one atomic transaction;
single legal oversized rows retain the existing 1 MB value cap. Bulk JSON1
transport also reduces native binding and statement objects. The 50k before/after
profile reduced sampled app-process peak PSS from 195.7 to 141.6 MiB, with Java
heap at that peak falling from 69.2 to 18.7 MiB. After-GC device-total PSS was
255.3 MiB against classic's 250.0 MiB (+2.1%, within Q17's original 10% target).
The old unbounded payload was reclaimed by explicit GC too; the earlier claim
that it necessarily survived until restart was too strong. The fix removes the
large transient allocation without relying on GC timing.

See [ADR-0039](decisions/0039-bounded-bulk-bridge-payloads.md),
[ADR-0041](decisions/0041-json-bulk-and-current-schema-open.md), and the
[before](benchmarks/android-q17-before-2026-10-22.md) /
[after](benchmarks/android-q17-after-2026-10-22.md) profiles with raw meminfo.
The stricter five-trial ADR-0038 memory acceptance remains independently reported
in `benchmarks/android-parity-2026-10-22.md`; resolving peak transport retention
does not turn a statistical memory FAIL into PASS. The logging-off Phase 15b
final report is `benchmarks/android-parity-final-2026-10-22.md`: 11 PASS,
0 BRIDGE-BOUND, 1 PLATFORM-BOUND and 21 evidenced FAILs (ADR-0050).
ADR-0048 isolates the empty-plugin platform increment; it is not a blanket
allowance for store-created memory.
