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
| [0016](0016-schema-engine-encoding.md) | Schema engine ordering, encoding, hints and opt-in migration | Phase 3 brief / Agent | 2026-10-20 | Accepted |
| [0017](0017-store-composition.md) | Store composition: reuse NgRx subjects, 1 tx/action, scanned ordering, seeding, removeReducer keeps data, meta-reducers on bridge only | Agent | 2026-10-20 | Accepted |
| [0018](0018-selector-engine.md) | Selector engine: reuse NgRx memoize + metadata, PathCache w/ staleness, view state, feature-level dynamic tracking | Agent | 2026-10-20 | Accepted |
| [0019](0019-entity-adapter.md) | Entity adapter: dual-form ops (classic pure / tx SQL), `adapter.at(tx, path)`, write-time sort order via binary search (Q1); unique-ID collision overwrite policy (§7) | Agent / User (§7) | 2026-10-20 | Accepted |
| [0020](0020-router-json-snapshots.md) | Persist default router-store snapshots as JSON in the classic bridge | Agent | 2026-10-20 | Accepted |
| [0021](0021-selector-reference-replacements.md) | Preserve reference-only reducer replacements with transient commit hints | Agent | 2026-10-20 | Accepted |
| [0022](0022-devtools-compat.md) | Display-only devtools with guarded scanned actions and committed-view reducer; resolves Q4 | Agent / Phase 7 brief | 2026-10-20 | Accepted |
| [0023](0023-async-ecosystem-ordering.md) | Commit/refresh/emission serialization, bootstrap lifecycle ordering and router feedback transport | Agent | 2026-10-20 | Accepted |
| [0024](0024-declarative-entity-sort-key.md) | Declarative sortKey with IEEE-754/UTF-8 encoding, stable insertion ties and migration v3; resolves Q1 | Phase 10 brief / Agent | 2026-10-20 | Accepted |
| [0025](0025-promotion-threshold-findings.md) | Retain configurable 16 KiB promotion and existing changed-write demotion | Agent / Phase 8 spike | 2026-10-20 | Provisional |
| [0026](0026-adjacency-readers-and-array-identity.md) | Retain range reads and hidden array ids; object moves rewrite subtree paths (resolves Q3) | Agent / Phase 8 spike | 2026-10-20 | Accepted |
| [0027](0027-query-selectors.md) | SQL-backed query selectors (count/page/ids/exists, declarative where, createQuerySelector) | Agent | 2026-10-20 | Accepted |
| [0028](0028-query-filter-and-classic-order-semantics.md) | Two-valued scalar query filters, accessor paths, generic fallback and classic ordering metadata | Agent / Phase 10 | 2026-10-20 | Accepted |
| [0029](0029-batched-bridge-transport.md) | Batch independent writes, combine subtree transport and reuse fresh transaction metadata | Agent / Phase 11 brief | 2026-10-20 | Accepted |
| [0030](0030-session-scoped-features.md) | `persist: false` session-scoped features; router-store slice not persisted by default | Agent | 2026-10-21 | Accepted |
| [0031](0031-granular-entity-refresh.md) | Typed entity changes, indexed refresh, structural sharing and unchanged-reference fast paths | Phase 12 brief / Agent | 2026-10-21 | Accepted |
| [0032](0032-retained-cache-budget.md) | Compact collection metadata and byte-budgeted inactive cache | Phase 12 brief / Agent | 2026-10-21 | Accepted |

## Provisional choices (still open questions; listed so they're visible)

| Q | Current choice | Decided by |
| --- | --- | --- |
| Q2 | Retain 16 KiB + hints and changed-write demotion (ADR-0025); Android workload/threshold migration validation pending | Agent |
| Q5 | `select` waits for first load; `selectSignal` falls back to `initialState`; LRU 32 | Agent |
| Q7 | No in-memory slices; classic reducers via SQLite-backed bridge | Agent |
| Q8 | Path-level, segment-boundary prefix invalidation; foreign selectors tracked by proxy | Agent |
| Q9 | Seed from `initialState` when the feature version is missing; registration goes through the write queue | Agent |
| Q10 | Per-feature version; `onVersionMismatch: 'error'` default | Agent |
| Q11 | Action-level meta-reducers; state meta-reducers only on bridge reducers; `tx.resetAll()` | Agent |
| Q13 | Rollback, error action, skip ScannedActions, queue continues | Agent |
