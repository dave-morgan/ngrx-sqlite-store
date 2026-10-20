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
- [ ] Phase 3 schema engine
- [ ] Phase 4 store contract
- [ ] Phase 5 selectors
- [ ] Phase 6 entity
- [ ] Phase 7 compat tests + harness e2e
- [ ] Phase 8 spikes Q1/Q2/Q3/Q4
- [ ] Phase 9 Android benchmarks

## Blocking / awaiting user
- None. Q6 → ADR-0013/0014; schema v1 → ADR-0015.

## Next steps
- Phase 3 schema engine, after on-disk schema approval.

## Storage core notes
- Tests load sql.js through Node's native createRequire and resolve its WASM from node_modules; no copied WASM or test helper is needed.
- Capacitor 8 query has no transaction flag; run/execute pass false, and web commits call saveToStore (apps set up jeep-sqlite).
- Reads, writes, open and close share a FIFO queue; use the supplied executor inside callbacks to avoid nested queue waits.
- DEADLOCK RULE: `changes$` emits and `afterCommit` runs INSIDE the queue task. Never await `engine.read/transaction` there; phase 4 must trigger selector re-queries + ScannedActions emission outside the task (after `transaction()` resolves).
- Extra migrations via `STORAGE_ENGINE_OPTIONS` token or constructor `{ migrations }`.
- Internal migration v1 creates only nss_meta. Post-commit callback failures reject after commit and cannot undo persisted data.
