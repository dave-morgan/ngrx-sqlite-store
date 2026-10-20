# ngrx-sqlite-store — state file (hard-linked to AGENTS.md)

SQLite-backed replacement for @ngrx/store (Capacitor/Android). Design: `docs/` (start `docs/architecture.md`, `docs/open-questions.md`, `docs/decisions/`).

## Workspace
- Angular 22.2 CLI workspace. Library `projects/ngrx-sqlite-store` (ng-packagr, entry points `/entity`, `/testing` planned). Harness app `projects/harness` (Angular 22 + Capacitor Android, planned).
- NgRx 22.0.1, @capacitor-community/sqlite 8.1.1, jeep-sqlite 2.8, sql.js 1.15 (test driver), TS 6.0, Vitest via `@angular/build:unit-test`.
- Tests: `npx ng test ngrx-sqlite-store --watch=false`. Build: `npx ng build ngrx-sqlite-store`.

## Rules for agents
- Docs first: update `docs/` when design changes; resolved open question → new ADR in `docs/decisions/`.
- Implementations bind to ORIGINAL `@ngrx/store` DI tokens (ADR-0010). `@ngrx/store` is a peer dep.
- All row writes through `RowWriter` (1 MB UTF-8 cap, ADR-0008).
- Agent has authority to decide (incl. API/schema) — log every decision in `docs/decisions/README.md` (register) + ADR. Only hard rule: stay compatible with other NgRx libs (effects, router-store, devtools, Store consumers). Exception: `@ngrx/entity` is folded in and may diverge.

## Progress
- [x] Phase 1 docs
- [x] Phase 2 storage core (driver abstraction, serial write queue, tx, post-commit notifications)
- [x] Phase 3 schema engine (v2 migration, range/CTE reads, capped full/diff writes, entities)
- [ ] Phase 4 store contract
- [x] Phase 4a store write side and DI (ADR-0017)
- [ ] Phase 5 selectors
- [ ] Phase 6 entity
- [ ] Phase 7 compat tests + harness e2e
- [ ] Phase 8 spikes Q1/Q2/Q3/Q4
- [ ] Phase 9 Android benchmarks

## Harness (orchestrator-owned; agents don't touch unless briefed)
- `projects/harness`: README there. Aliases `@store`, `@store/entity`, `@impl` per build config (`-c classic|sqlite`). Shared code in `src/app/state`, pages in `src/app/pages`; only reducers differ (`store-impl/{classic,sqlite}`).
- Classic: builds, 1 unit test + 11/11 Playwright e2e pass (`npm run e2e:classic`). Sqlite build waits on phases 4b + 6 (`createFeature`, `ngrx-sqlite-store/entity` dual-form adapter, `tx.resetFeature`).
- Android: `android/` added (Capacitor 8). Gradle needs JDK 21: `JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`.
- Briefs for pending phases: `docs/briefs/phase-4b-selectors.md`, `docs/briefs/phase-6-entity.md` (ADR-0019).

## Blocking / awaiting user
- None. Q6 → ADR-0013/0014; schema v1 → ADR-0015.

## Next steps
- Phase 4b read side: selector sources, committed cache, select/selectSignal and selector authoring helpers.

## Storage core notes
- Tests load sql.js through Node's native createRequire and resolve its WASM from node_modules; no copied WASM or test helper is needed.
- Capacitor 8 query has no transaction flag; run/execute pass false, and web commits call saveToStore (apps set up jeep-sqlite).
- Reads, writes, open and close share a FIFO queue; use the supplied executor inside callbacks to avoid nested queue waits.
- DEADLOCK RULE: `changes$` emits and `afterCommit` runs INSIDE the queue task. Never await `engine.read/transaction` there; phase 4 must trigger selector re-queries + ScannedActions emission outside the task (after `transaction()` resolves).
- Extra migrations via `STORAGE_ENGINE_OPTIONS` token or constructor `{ migrations }`.
- Internal migration v1 creates only nss_meta. Post-commit callback failures reject after commit and cannot undo persisted data.

## Schema engine notes
- Register `SCHEMA_MIGRATIONS` via StorageEngine `{ migrations }` or `STORAGE_ENGINE_OPTIONS`; v2 adds the approved v1-format schema tables.
- `NodeStore` takes the supplied executor and ChangeSet; it never nests engine queue operations.
- All schema mutations pass through RowWriter; inserts batch at 999 parameters and every value is UTF-8 capped.
- Reads attach WeakMap metadata and freeze recursively in dev mode. Diff inputs must preserve immutable references; entity replacements must retain the brand or use an entity hint.
- Object children use pos too. Arrays/entities retain LIS positions and renormalise when gaps fall below 1e-9.
- Oversized entity data uses `data = ''` and promoted nodes at `coll/~2<escaped typed id>` (ADR-0016).
- Windows PowerShell may block npx.ps1; use npx.cmd for the same npm CLI commands.

## Store write-side notes
- Phase 4a reuses real NgRx subjects and binds Store, State and ReducerManager to the original tokens. Bootstrap seeds versioned features before releasing INIT and buffered actions.
- Each action runs every feature handler in one transaction. Scanned emissions and awaited refresh hooks run after transaction resolution, outside the engine FIFO. dispatchAsync rejects reducer failures; plain dispatch reports nssReducerError and continues.
- StoreTx shares an identity cache across features. Writes drop overlapping cached ancestors/descendants and reload containers to preserve hidden array IDs. Unknown paths under inline nodes resolve through the owning container.
- Removing/destroying features keeps their data. purgeFeature deletes the subtree and version marker; settle includes purge work, refresh hooks and the engine queue.
- Foreign reducers with undefined initial state (routerReducer) seed only their version marker; reset/reseed deletes their subtree. State is still a placeholder, and Store selection methods explicitly throw until phase 4b.
- Phase 4b hooks: internal ɵSELECTION_ENGINE, ɵCOMMITTED_CACHE, and multi ɵPOST_COMMIT_HOOK. NgRx selector creation helpers are temporary re-exports.
