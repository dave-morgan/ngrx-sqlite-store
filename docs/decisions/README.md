# Decision register

**Authority (user, 2026-10-20):** the agent may make design decisions on its own, including about public API shape and the on-disk schema, provided each one is logged here. There is one hard rule: **integration with the other NgRx libraries (`@ngrx/effects`, `@ngrx/router-store`, `@ngrx/store-devtools`, and any consumer of `Store`) must stay compatible.** The single accepted exception is `@ngrx/entity`, which is folded into this store (ADR-0005), so its API may diverge.

Rule for every decision: add an ADR (context, decision, consequences) and a row below. If it resolves an open question, also update `../open-questions.md`. A provisional choice that is still listed in open-questions also gets a row, marked *Provisional*.

| # | Decision | Decided by | Date | Status |
| --- | --- | --- | --- | --- |
| [0001](0001-preserve-public-ngrx-contract.md) | Preserve public NgRx contract | Brief (D1) | 2026-10-20 | Accepted |
| [0002](0002-async-backed-selectors.md) | Async-backed selectors that emit like normal ones | Brief (D2) | 2026-10-20 | Accepted |
| [0003](0003-async-transactional-reducers.md) | Async transactional reducers, serial queue, post-commit notify | Brief (D3) | 2026-10-20 | Accepted |
| [0004](0004-json-shaped-state-fixed-schema.md) | JSON-shaped state → fixed path-keyed schema | Brief (D4) | 2026-10-20 | Accepted |
| [0005](0005-entity-as-first-party-primitive.md) | Entity folded into store; may diverge from `@ngrx/entity` | Brief (D5) | 2026-10-20 | Accepted |
| [0006](0006-arrays-as-tables.md) | Arrays as tables with hidden ids + fractional pos | Brief (D6) | 2026-10-20 | Accepted |
| [0007](0007-hybrid-nested-storage.md) | Hybrid inline-JSON / adjacency-list storage | Brief (D7) | 2026-10-20 | Accepted |
| [0008](0008-one-megabyte-row-cap.md) | Hard 1 MB UTF-8 per-row cap, chunking | Brief (D8) | 2026-10-20 | Accepted |
| [0009](0009-immutability-cheap-diffs.md) | Reference-equality diff writes | Brief (D9) | 2026-10-20 | Accepted |
| [0010](0010-reuse-ngrx-di-tokens.md) | Provide impls under original `@ngrx/store` DI tokens; peer dep | Agent | 2026-10-20 | Accepted |
| [0011](0011-harness-swap-alias.md) | Harness swaps impls via private `@store` alias | Agent | 2026-10-20 | Accepted |
| [0012](0012-sqljs-test-driver.md) | sql.js as Node/unit-test driver | Agent | 2026-10-20 | Accepted |
| [0013](0013-reducer-api-on-tx.md) | `on()` = tx reducer; `onState()` / `fromSyncReducer()` classic | User | 2026-10-20 | Accepted |
| [0014](0014-tx-write-style-both.md) | tx reducers write imperatively and/or return partial (diffed) | User | 2026-10-20 | Accepted |
| [0015](0015-on-disk-schema-v1.md) | Generic on-disk schema v1 | User | 2026-10-20 | Accepted |

## Provisional choices (still open questions; listed so they're visible)

| Q | Current choice | Decided by |
| --- | --- | --- |
| Q1 | `sortComparer` applied in JS on read, dev warning; `sortkey` column reserved | Agent |
| Q2 | 16 KB promotion threshold + path hints; depth-1 props always rows; no demotion | Agent |
| Q4 | Lazy whole-state view; devtools display-only mode (no time travel) | Agent |
| Q5 | `select` waits for first load; `selectSignal` falls back to `initialState`; LRU 32 | Agent |
| Q7 | No in-memory slices; classic reducers via SQLite-backed bridge | Agent |
| Q8 | Path-level, segment-boundary prefix invalidation; foreign selectors tracked by proxy | Agent |
| Q9 | Seed from `initialState` when the feature version is missing; registration goes through the write queue | Agent |
| Q10 | Per-feature version; `onVersionMismatch: 'error'` default | Agent |
| Q11 | Action-level meta-reducers; state meta-reducers only on bridge reducers; `tx.resetAll()` | Agent |
| Q13 | Rollback, error action, skip ScannedActions, queue continues | Agent |
