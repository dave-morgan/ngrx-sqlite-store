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
- Hard-to-reverse (public API shape, on-disk schema): ask user.

## Progress
- [x] Phase 1 docs
- [x] Phase 2 storage core (driver abstraction, serial write queue, tx, post-commit notifications)
- [x] Phase 3 schema engine (v2 migration, range/CTE reads, capped full/diff writes, entities)
- [ ] Phase 4 store contract
- [ ] Phase 5 selectors
- [ ] Phase 6 entity
- [ ] Phase 7 compat tests + harness e2e
- [ ] Phase 8 spikes Q1/Q2/Q3/Q4
- [ ] Phase 9 Android benchmarks

## Blocking / awaiting user
- None. Q6 → ADR-0013/0014; schema v1 → ADR-0015.

## Next steps
- Phase 4 store contract, using NodeStore and the transaction identity cache.

## Storage core notes
- Tests load sql.js through Node's native createRequire and resolve its WASM from node_modules; no copied WASM or test helper is needed.
- Capacitor 8 query has no transaction flag; run/execute pass false, and web commits call saveToStore (apps set up jeep-sqlite).
- Reads, writes, open and close share a FIFO queue; use the supplied executor inside callbacks to avoid nested queue waits.
- DEADLOCK RULE: changes$ and afterCommit run inside the FIFO task. Await selector re-queries only after transaction() resolves.
- Internal migration v1 creates only nss_meta. Post-commit callback failures reject after commit and cannot undo persisted data.

## Schema engine notes
- Register SCHEMA_MIGRATIONS through StorageEngine `{ migrations }` or STORAGE_ENGINE_OPTIONS.
- NodeStore takes the supplied executor and ChangeSet. All schema mutations go through RowWriter (999 parameters per insert batch).
- Reads attach WeakMap metadata and freeze recursively in dev mode. Diffs require immutable references; replacement entity values need the brand or an entity hint.
- Object children use pos; arrays/entities retain LIS positions and renormalise small gaps. Oversized entities use the reserved `coll/~2<escaped typed id>` path (ADR-0016).
- On Windows, use npx.cmd if PowerShell blocks npx.ps1.
