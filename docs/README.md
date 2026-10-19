# ngrx-sqlite-store

A SQLite-backed replacement for `@ngrx/store`, aimed at Capacitor apps (primarily Android) where the in-memory NgRx state tree uses too much RAM.

SQLite, via `@capacitor-community/sqlite`, is the **source of truth**. It is not a persistence cache sitting behind an in-memory store. Only data that is currently selected lives in JS memory.

## Repository layout

| Path | What |
| --- | --- |
| `projects/ngrx-sqlite-store` | The library (ng-packagr). Secondary entry points: `/entity`, `/testing`. |
| `projects/harness` | Angular 22 + Capacitor (Android) test harness. It runs the same seeded NgRx app against either the classic `@ngrx/store` or `ngrx-sqlite-store`. |
| `docs/` | Design docs. Start with `architecture.md`. |
| `docs/decisions/` | ADRs, one per decision. |
| `docs/open-questions.md` | Unresolved design questions and spikes. |
| `docs/public-api-contract.md` | The NgRx surface we must stay compatible with (verified against NgRx 22.0.1). |

## Goals

- **Full replacement of `@ngrx/store` internals.** This is not a hybrid and not a cache layer. Reducers write to SQLite, and selectors read from SQLite.
- **Ecosystem compatibility without migration.** `@ngrx/effects`, `@ngrx/router-store`, `@ngrx/store-devtools`, and component code that uses `store.select`, `selectSignal`, and `dispatch` keep working unchanged.
- **Internal mechanisms may change.** Reducers are internal to the store, so some reducer migration is accepted. They become async and transactional (ADR-0003).
- **Low RAM.** Only what is actively selected stays in memory.
- **Switchable.** Users switch by changing imports or with an import path alias. The harness can swap the two implementations at build time.

## Non-goals (for now)

- A 100% zero-change drop-in for user reducers.
- Non-JSON state (Map, Set, class instances, Date objects). NgRx state is already expected to be plain serializable JS.

## Versions targeted

Angular 22.2, NgRx 22.0.1, `@capacitor/core` 8.5, `@capacitor-community/sqlite` 8.1, `jeep-sqlite` 2.8 (web), and `sql.js` 1.15 (Node/test driver). TypeScript 6.0.

## Status

See `/CLAUDE.md` at the repo root for current phase, progress, and next steps.
