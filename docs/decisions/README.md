# Decision register

**Authority (user, 2026-10-20):** the agent may make design decisions on its own, including about public API shape and the on-disk schema, provided each one is logged here. There is one hard rule: **integration with the other NgRx libraries (`@ngrx/effects`, `@ngrx/router-store`, `@ngrx/store-devtools`, and any consumer of `Store`) must stay compatible.** The single accepted exception is `@ngrx/entity`, which is folded into this store (ADR-0005), so its API may diverge.

Rule for every decision: add an ADR (context, decision, consequences) and a row below. If it resolves an open question, also update `../open-questions.md`. A provisional choice that is still listed in open-questions also gets a row, marked *Provisional*.

| # | Decision | Decided by | Date | Status |
| --- | --- | --- | --- | --- |
| [0001](0001-preserve-public-ngrx-contract.md) | Preserve public NgRx contract | Brief (D1) | 2026-10-20 | Accepted |
| [0002](0002-async-backed-selectors.md) | Async-backed selectors that emit like normal ones | Brief (D2) | 2026-10-20 | Accepted |
| [0003](0003-async-transactional-reducers.md) | Async transactional reducers, serial queue, post-commit notify | Brief (D3) | 2026-10-20 | Accepted |
| [0004](0004-json-shaped-state-fixed-schema.md) | JSON-shaped state â†’ fixed path-keyed schema | Brief (D4) | 2026-10-20 | Accepted |
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
| [0019](0019-entity-adapter.md) | Entity adapter: dual-form ops (classic pure / tx SQL), `adapter.at(tx, path)`, write-time sort order via binary search (Q1); unique-ID collision overwrite policy (Â§7) | Agent / User (Â§7) | 2026-10-20 | Accepted |
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
| [0033](0033-lazy-batch-and-write-through.md) | Lazy atomic driver batches and exact committed cache write-through | Phase 13 brief / Agent | 2026-10-21 | Accepted |
| [0034](0034-seed-retention-contracts.md) | Device retainer paths; preserve action/history/active-lease contracts and scope write journals | Phase 13 brief / Agent | 2026-10-21 | Accepted |
| [0035](0035-scoped-query-view-retention.md) | Scope query memo metadata to declared sources so evicted pages can collect | Agent / Library retention fix | 2026-10-21 | Accepted |
| [0036](0036-whole-store-subscriptions-loaded-view.md) | Whole-store subscriptions see loaded-path view by default (`sqlite.wholeStore: loaded|pin-all`); router-store storeState payloads partial | Agent | 2026-10-21 | Accepted |
| [0037](0037-change-aware-query-refresh.md) | Change-aware entity query maintenance and bounded batched refresh | Agent | 2026-10-22 | Accepted |
| [0038](0038-performance-acceptance-criteria.md) | Performance acceptance: within 1 SD of classic, else bridge-bound with measured RTT/bandwidth arithmetic, else FAIL | User goal / Agent | 2026-10-22 | Accepted |
| [0039](0039-bounded-bulk-bridge-payloads.md) | Bound bulk bridge JSON to 256 KiB with atomic streaming and byte-bounded row groups | Agent / Phase 15 Q17 | 2026-10-22 | Accepted |
| [0040](0040-parity-measurement-protocol.md) | Independent alternating Android trials, full-precision observations and measured bridge bounds | Agent | 2026-10-22 | Accepted |
| [0041](0041-json-bulk-and-current-schema-open.md) | Single-binding JSON1 bulk inserts and read-only current-schema open, retaining atomic migration fallback | Agent / Phase 15 parity | 2026-10-22 | Accepted |
| [0042](0042-android-wal.md) | Writable Android connections use WAL with the existing synchronous level; power-loss durability tradeoff documented | Agent / Phase 15 parity | 2026-10-22 | Accepted |
| [0043](0043-raw-json-bulk-and-insert-journals.md) | Raw JSON bulk entity cells and shared empty non-update field sets reduce seed transport and allocation | Agent / Phase 15 trace | 2026-10-22 | Accepted |
| [0044](0044-parity-residual-gaps.md) | Earlier parity residual gaps; superseded by ADR-0050 logging-off measurements | Agent / Phase 15 | 2026-10-22 | Superseded |
| [0045](0045-capacitor-bridge-logging.md) | Capacitor loggingBehavior none for benchmarks/production: debug bridge logging retained payloads and skewed store metrics | Agent | 2026-10-22 | Accepted |
| [0046](0046-fresh-native-connection-startup.md) | Skip redundant open/transaction probes on freshly created native connections; preserve reload recovery | Agent / Phase 15b | 2026-10-22 | Accepted |
| [0047](0047-compact-entity-transport.md) | Compact raw JSON entity cells, omit null sortkeys and share collection bindings without changing bulk ordering or byte caps | Agent / Phase 15b | 2026-10-22 | Accepted |
| [0048](0048-platform-baseline-and-startup-profiling.md) | Isolated empty-plugin controls, opt-in startup tracing and strictly measured PLATFORM-BOUND memory acceptance | Agent / Phase 15b | 2026-10-22 | Accepted |
| [0049](0049-batched-feature-version-reads.md) | Batch feature-version reads inside registration transactions with bounded bindings and unchanged seed ordering | Agent / Phase 15b | 2026-10-22 | Accepted |
| [0050](0050-phase15b-evidenced-parity-gaps.md) | Retain measured residual FAILs with startup, seed, native SQL, dispatch and memory evidence; supersedes ADR-0044 | Agent / Phase 15b | 2026-10-22 | Accepted as evidenced gaps |
| [0051](0051-platform-floor-controls.md) | Platform-floor controls (durable commit, raw seed insert, DB open) bound latency; amends ADR-0038 | Agent | 2026-10-22 | Accepted |
| [0052](0052-floor-control-methodology.md) | Measure same-database commit, byte-identical seed chunks and fresh-process open controls with provenance-checked ADR-0051 acceptance | Agent / Phase 15c | 2026-10-22 | Accepted |
| [0053](0053-declarative-query-indexes.md) | Bounded declarative query-field indexes installed during registration, with indexed typed equality and persisted upgrades | Agent / Phase 15c | 2026-10-22 | Accepted |
| [0054](0054-bulk-replacement-and-byte-accounting.md) | Coalesce unmaterialized bulk replacement bookkeeping and count escaped transport bytes without allocating copies | Agent / Phase 15c | 2026-10-22 | Accepted |
| [0055](0055-session-seed-batching.md) | Skip identical session reseeds and buffer feature markers into atomic registration batches | Agent / Phase 15c | 2026-10-22 | Accepted |
| [0056](0056-production-bundle-and-memory-audits.md) | Defer optional devtools loading and distinguish static bundles, shallow heap and native-cache diagnostic evidence | Agent / Phase 15c | 2026-10-22 | Accepted |
| [0057](0057-post-write-memory-floor.md) | Post-bulk-write memory floor = max(empty delta, same-session F_seed PSS growth) | Agent | 2026-10-22 | Accepted |
| [0058](0058-startup-preload-batching.md) | Batch independent router and eager feature preloads after registration commits | Agent / Phase 15d | 2026-10-22 | Accepted |
| [0059](0059-canonical-entity-bulk-json.md) | Skip redundant parsing of validated canonical EntityTx bulk JSON; preserve wire bytes and row caps | Agent | 2026-10-22 | Accepted |
| [0060](0060-phase15d-residual-overhead.md) | Evidence for eleven remaining Phase 15d FAILs; retain thresholds and labels | Agent / Phase 15d | 2026-10-22 | Accepted |
| [0061](0061-persistence-is-the-product.md) | Persistence is the product: no in-memory feature mode (resolves Q7); optimisation priority large lists â†’ flat objects â†’ hybrid | User | 2026-10-22 | Accepted |
| [0062](0062-code-bound-heap.md) | CODE-BOUND heap verdict against an empty-store control, plus mandatory startup code diet (amends ADR-0038) | Agent | 2026-10-23 | Accepted |
| [0063](0063-explicit-startup-prewarm.md) | Explicit prewarm adoption and startup metadata batching | Agent | 2026-10-23 | Accepted |
| [0064](0064-bulk-memory-and-render-experiments.md) | Bulk memory reclamation; measured render and code-split experiments | Agent | 2026-10-23 | Accepted |

| [0065](0065-phase15e-measured-outcomes.md) | Measured Phase 15e outcomes and all 14 residual FAILs | Agent | 2026-10-23 | Accepted |
| [0066](0066-phase15f-located-costs.md) | Phase 15f decomposition: real-row F_seed, pipelined bulk batches, idle WAL maintenance, optimistic native open, NgRx production runtime-check semantics | Agent / Phase 15f | 2026-10-23 | Accepted |
| [0067](0067-workload-code-control.md) | CODE-BOUND uses same-session, same-workload V8 code-space controls with data parity (amends ADR-0062) | Agent / Phase 15f | 2026-10-23 | Accepted |
| [0068](0068-phase15f-measured-outcomes.md) | Measured Phase 15f outcomes: 13 PASS / 12 PB / 2 CB / 6 FAIL; Phase 16 remains gated | Agent | 2026-10-24 | Accepted |

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
