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
- [ ] Phase 2 storage core (driver abstraction, serial write queue, tx, post-commit notifications)
- [ ] Phase 3 schema engine
- [ ] Phase 4 store contract
- [ ] Phase 5 selectors
- [ ] Phase 6 entity
- [ ] Phase 7 compat tests + harness e2e
- [ ] Phase 8 spikes Q1/Q2/Q3/Q4
- [ ] Phase 9 Android benchmarks

## Blocking / awaiting user
- Q6 reducer API shape (`on` tx vs classic detection).
- On-disk schema v1 approval (architecture §4.1).

## Next steps
- Phase 2 implementation.
