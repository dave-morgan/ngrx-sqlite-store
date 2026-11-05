# Decision register

**Authority (user, 2026-10-20):** the agent may make design decisions on its own, including about public API shape and the on-disk schema, provided each one is logged here. There is one hard rule: **integration with the other NgRx libraries (`@ngrx/effects`, `@ngrx/router-store`, `@ngrx/store-devtools`, and any consumer of `Store`) must stay compatible.** The single accepted exception is `@ngrx/entity`, which is folded into this store (ADR-0005), so its API may diverge.

Rule for every decision: add an ADR (context, decision, consequences) and a row below. If it resolves an open question, also update `../open-questions.md`. A provisional choice that is still listed in open-questions also gets a row, marked *Provisional*.

| # | Decision | Decided by | Date | Status |
| --- | --- | --- | --- | --- |
| [0001](0001-preserve-public-ngrx-contract.md) | Preserve public NgRx contract | Brief (D1) | 2026-10-20 | Accepted |
| [0002](0002-async-backed-selectors.md) | Async-backed selectors that emit like normal ones | Brief (D2) | 2026-10-20 | Accepted |
| [0003](0003-async-transactional-reducers.md) | Async transactional reducers, serial queue, post-commit notify | Brief (D3) | 2026-10-20 | Accepted |
| [0004](0004-json-shaped-state-fixed-schema.md) | JSON-shaped state Ã¢â€ â€™ fixed path-keyed schema | Brief (D4) | 2026-10-20 | Accepted |
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
| [0019](0019-entity-adapter.md) | Entity adapter: dual-form ops (classic pure / tx SQL), `adapter.at(tx, path)`, write-time sort order via binary search (Q1); unique-ID collision overwrite policy (Ã‚Â§7) | Agent / User (Ã‚Â§7) | 2026-10-20 | Accepted |
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
| [0061](0061-persistence-is-the-product.md) | Persistence is the product: no in-memory feature mode (resolves Q7); optimisation priority large lists Ã¢â€ â€™ flat objects Ã¢â€ â€™ hybrid | User | 2026-10-22 | Accepted |
| [0062](0062-code-bound-heap.md) | CODE-BOUND heap verdict against an empty-store control, plus mandatory startup code diet (amends ADR-0038) | Agent | 2026-10-23 | Accepted |
| [0063](0063-explicit-startup-prewarm.md) | Explicit prewarm adoption and startup metadata batching | Agent | 2026-10-23 | Accepted |
| [0064](0064-bulk-memory-and-render-experiments.md) | Bulk memory reclamation; measured render and code-split experiments | Agent | 2026-10-23 | Accepted |

| [0065](0065-phase15e-measured-outcomes.md) | Measured Phase 15e outcomes and all 14 residual FAILs | Agent | 2026-10-23 | Accepted |
| [0066](0066-phase15f-located-costs.md) | Phase 15f decomposition: real-row F_seed, pipelined bulk batches, idle WAL maintenance, optimistic native open, NgRx production runtime-check semantics | Agent / Phase 15f | 2026-10-23 | Accepted |
| [0067](0067-workload-code-control.md) | CODE-BOUND uses same-session, same-workload V8 code-space controls with data parity (amends ADR-0062) | Agent / Phase 15f | 2026-10-23 | Accepted |
| [0068](0068-phase15f-measured-outcomes.md) | Measured Phase 15f outcomes: 13 PASS / 12 PB / 2 CB / 6 FAIL; Phase 16 remains gated | Agent | 2026-10-24 | Accepted |
| [0069](0069-render-bridge-and-real-row-memory-floors.md) | Toggle floor measured under the real WebView repaint (Capacitor main-thread bridge); seed memory floor brackets real-row bridge payloads | Agent / Phase 15g | 2026-10-24 | Accepted |
| [0070](0070-phase15h-read-plans-and-write-through.md) | UNION ALL subtree predicates (MULTI-INDEX OR was 20x slower), router write-through fix, startup release-on-send, 512 KiB steady page cache, bench-matched additive memory floor | Agent / Phase 15h | 2026-10-24 | Accepted |
| [0071](0071-workload-control-audit.md) | Match notes control toggle history; keep repaint pairs diagnostic; validate independent render trials | Agent | 2026-10-24 | Accepted |
| [0072](0072-known-absent-transaction-reads.md) | Reuse fresh cached absence; device trace confirms four pre-ready router reads removed; general latency gain unproven | Agent | 2026-10-24 | Accepted |
| [0073](0073-pipelined-android-open.md) | Experiment: pipeline native Android create/open sends with settled failure recovery | Agent | 2026-10-24 | Experiment |
| [0074](0074-loaded-static-signal-views.md) | Experiment: avoid rebuilding fallback views when all static signal sources are ready | Agent | 2026-10-24 | Experiment |
| [0075](0075-binary-json-row-iteration.md) | Rejected application integration: native JSONB iterator scratch win did not establish repeatable application benefit | Agent | 2026-10-24 | Rejected |
| [0076](0076-known-write-locations.md) | Preserve known write locations; trace proves two root-position reads removed, general timing benefit unproven | Agent | 2026-10-24 | Accepted |
| [0077](0077-promoted-row-index.md) | Partial promoted-row index removes collection scans; full15o12PASS/10PB/3CB/8FAIL, parity incomplete | Agent | 2026-10-24 | Accepted |
| [0078](0078-signal-value-dependency.md) | Watched-value signal avoids redundant equality work; full15q11PASS/10PB/3CB/9FAIL, no parity improvement | Agent | 2026-10-24 | Accepted |
| [0079](0079-static-selector-scopes.md) | Reuse unchanged static scopes; full15s11PASS/11PB/3CB/8FAIL, parity incomplete | Agent | 2026-10-24 | Accepted |
| [0080](0080-direct-internal-deletes.md) | Android internal deletes avoid plugin metadata rewriting; full15u11PASS/11PB/3CB/8FAIL, parity incomplete | Agent | 2026-10-24 | Accepted |
| [0081](0081-shared-entity-count-scans.md) | Share concurrent entity-count scans; full 15v 11 PASS / 13 PB / 3 CB / 6 FAIL, parity incomplete | Agent | 2026-10-24 | Accepted |
| [0082](0082-startup-warm-rejected.md) | Startup working-set warm rejected: delayed first render (ready 490 -> 619-688 ms); owner() allocation removal retained | Agent | 2026-10-24 | Rejected |
| [0083](0083-remaining-gap-evidence.md) | Evidence record for the 6 FAIL + 3 CB after 15v; toggle gap within the no-store two-commit repaint control; no floor change | Agent | 2026-10-24 | Accepted |
| [0084](0084-user-decisions-toggle-floor-and-code-heap.md) | User decisions: store-free pair-repaint control is the toggle floor (supersedes ADR-0071 diagnostic status); CODE-BOUND code heap accepted as evidenced limit; 15v re-reported 11 PASS / 15 PB / 3 CB / 4 FAIL | User | 2026-10-24 | Accepted |
| [0085](0085-phase15w-measured-outcome.md) | Full 15w 12 PASS / 15 PB / 3 CB / 3 FAIL (1k toggleP50, 10k firstReady, 50k emitP50); parity incomplete | Agent | 2026-10-25 | Accepted |
| [0086](0086-phase15x-measured-outcome.md) | Full 15x 11 PASS / 13 PB / 3 CB / 6 FAIL; sqlite means equal/better than 15w, flips driven by low-sample controls; retain owner index, shared defaults view, partial prefetch | Agent | 2026-10-25 | Accepted |
| [0087](0087-control-precision.md) | Control precision: F_commit 100 samples, F_open 10 trials, seed-memory 3 fresh-process brackets; same estimators and floor definitions | User | 2026-10-25 | Accepted |
| [0088](0088-phase15y-measured-outcome.md) | Full 15y (precise controls) 13 PASS / 13 PB / 3 CB / 4 FAIL; remaining FAILs all 50k (firstReady, relaunch, emitP50/P95) and real store cost; retain incremental publish | Agent | 2026-10-25 | Accepted |
| [0089](0089-phase15z-measured-outcome.md) | Full 15z 12 PASS / 11 PB / 3 CB / 7 FAIL; sqlite means improved vs 15y (50k firstReady -143 ms, relaunch -112..-119 ms) but classic/control references moved; retain JS replacement recount, INDEXED BY promoted, pipelined reload open | Agent | 2026-10-25 | Accepted |
| [0090](0090-phase15aa-parity-reached.md) | Full 15aa 16 PASS / 14 PB / 3 CB / 0 FAIL: every large-list metric qualifies; retain boot catalog, prewarm-cleared read skip, streamed SAVEPOINT replacement with full batches; Phase 16 ungated | Agent | 2026-10-26 | Accepted |
| [0091](0091-phase16-list-profile-guard.md) | Phase 16 start: shapes workloads lazy/route-scoped (/shapes/*), 15aa is the list reference, every change needs lib tests + on-device 50k list probe, full list acceptance 0 FAIL before Phase 16 closes | User | 2026-10-26 | Accepted |
| [0092](0092-phase16c-list-check.md) | Phase 16 flat-write fixes retained (one row per key, putMany refresh, identical-key skip); shapes 1/7/78; full list check 16L1 12/12/3/6: no regression (sqlite means equal/better than 15aa) but tighter session references expose emit (~0.4 ms) and relaunch (~40 ms) gaps | Agent | 2026-10-26 | Accepted |
| [0093](0093-phase16-shapes-floors.md) | Shapes: store-free commit+render control is the latency floor (per K/workflow, x commits); heap CODE-BOUND via code-space split (ADR-0067 method); PSS PLATFORM-BOUND via empty-plugin baseline (ADR-0070 method) | User | 2026-10-27 | Accepted |
| [0094](0094-phase16e-outcome.md) | 16e shapes 1/47/0/38 under ADR-0093 floors; list 16L2 13/14/3/3 (no regression; FAIL 10k relaunch +64 ms, 50k emit p50 +0.33/p95 +0.97); fix 3 path/publish fast paths retained | Agent | 2026-10-27 | Accepted |
| [0095](0095-phase16h-outcome.md) | Fixes 4-7 retained (pipelined catalog read, coalesced node updates, root-compare partial filter, json_each inserts >=16 rows); shapes 16h 3/57/0/26; list 16L3 13/14/3/3 with means better than 16L2 (FAIL 10k relaunch +25 ms, 50k emit p50 +0.27/p95 +0.68) | Agent | 2026-10-27 | Accepted |
| [0096](0096-changed-key-reducer-scan.md) | Experiment: allocate partial-handler tuples only for changed keys; device16j pending | Agent | 2026-10-27 | Experiment |
| [0097](0097-shapes-startup-barrier.md) | Correct shapes startup barrier; journal partials and reject incomplete paired trials | Agent | 2026-10-27 | Accepted |
| [0098](0098-shapes-dataset-normalization.md) | Correct todos-specific readiness wait and normalize identical background data for shapes | Agent | 2026-10-27 | Accepted |
| [0099](0099-append-ordering-fast-path.md) | Experiment: consume unchanged array prefixes and skip LIS for exact appends | Agent | 2026-10-27 | Experiment |
| [0100](0100-lazy-action-transaction-handles.md) | Rejected lazy transaction handles: allocation-only gain, no repeatable application benefit | Agent | 2026-10-27 | Rejected |
| [0101](0101-single-cache-refresh-publication.md) | Experiment: defer intermediate cache publication to selection refresh final notification | Agent | 2026-10-28 | Experiment |
| [0102](0102-boolean-shared-count-predicates.md) | Experiment: single JSON type lookup for Boolean predicates in shared count scans; selective SQL unchanged | Agent | 2026-10-28 | Experiment |
| [0103](0103-incremental-selector-lease-accounting.md) | Rejected incremental selector lease counts: no repeated latency gain and full list guard uncleared | Agent | 2026-10-28 | Rejected |
| [0104](0104-skip-idle-reducer-awaits.md) | Rejected16u idle awaits: no general benefit; full regression guard uncleared; reverted with all evidence preserved | Agent | 2026-10-28 | Rejected |
| [0106](0106-compact-child-position-index.md) | Rejected16v compact positions: small aggregate saving, repeated replacement tail regressions; targeted revert | Agent | 2026-10-28 | Rejected |
| [0105](0105-burst-backlog-async-lower-bound.md) | Evidenced Phase16 maxBacklog lower bound1 versus classic0; observed2-3 not proved optimal, no new floor | Agent | 2026-10-28 | Evidence |

| [0107](0107-copy-on-change-child-positions.md) | Rejected16w position reuse: synthetic work removed, full regression guard uncleared; reverted | Agent | 2026-10-28 | Rejected |

| [0108](0108-scalar-transaction-cache-invalidation.md) | Rejected16x scalar invalidation: repeated residual gain but full regression guard uncleared; reverted | Agent | 2026-10-28 | Rejected |

| [0109](0109-fifty-thousand-emission-attribution.md) | Diagnostic16y: attribute remaining50k list emission on retained16r before next fix; no floor change | Agent | 2026-10-28 | Evidence |

| [0110](0110-no-return-sdk-facade-diagnostic.md) | Rejected SDK bypass hypothesis: 2400identicalcalls,30/60wins,medianunchanged;driverunchanged | Agent | 2026-10-28 | Rejected |

| [0111](0111-static-readiness-pass-reuse.md) | Rejected16aa static readiness reuse: synthetic3->1checks but no repeated workload benefit; reverted | Agent | 2026-10-28 | Rejected |

| [0112](0112-gate-catalog-prefetch-on-create.md) | Rejected16ab gated catalog: one discarded read removed but no repeated startup/relaunch benefit; reverted | Agent | 2026-10-28 | Rejected |

| [0113](0113-narrow-boolean-count-index-diagnostic.md) | Diagnostic16ac: changed Boolean-only shared count SQL with narrow partial type index; no production index/hint | Agent | 2026-10-28 | Evidence |

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


| [0114](0114-conditional-count-filter.md) | Rejected16ae: fewer conditional aggregate instructions but slower native reads in both orders; production unchanged | Agent | 2026-10-28 | Rejected |

| [0115](0115-stable-published-root-index.md) | Rejected16af: private Map allocation removed but full list/shape guards unmet; reverted | Agent | 2026-10-28 | Rejected |

| [0116](0116-skip-empty-insert-flushes.md) | Rejected16ag: 100?0 empty drains but no repeatable device benefit; reverted | Agent | 2026-10-28 | Rejected |

| [0117](0117-flat-phase-wall-attribution.md) | Diagnostic16ah: targeted debugger setup then method wall spans on unchanged16r; no CPU/heap/floor change | Agent | 2026-10-28 | Evidence |

| [0118](0118-lazy-static-signal-projections.md) | Rejected16ai lazy static signals: residual gain did not clear full list/DOM/heap guards | Agent | 2026-10-28 | Rejected |

| [0119](0119-validation-diff-wall-attribution.md) | Diagnostic16aj locates flat validation/diff wall cost on unchanged16r | Agent | 2026-10-29 | Evidence |

| [0120](0120-reuse-primitive-kind.md) | Rejected16ak primitive kind reuse: no repeatable residual benefit; reverted | Agent | 2026-10-29 | Rejected |

| [0121](0121-update-parser-diagnostic.md) | Rejected16al UPDATE parser bypass: 2400 calls, no native-wall benefit | Agent | 2026-10-29 | Rejected |

| [0122](0122-wide-frozen-object-copy.md) | Rejected16an2 wide pointer copy: reversed means lower but full list/mean guards unmet; reverted | Agent | 2026-10-29 | Rejected |

| [0123](0123-emission-pipeline-boundary.md) | Diagnostic16ao attributes predecessor pipeline/native/refresh on unchanged16r | Agent | 2026-10-29 | Evidence |

| [0124](0124-stable-registered-feature-set.md) | Candidate16ap existing registry-set reuse: tiny repeated residual benefit; full matched acceptance pending | Agent | 2026-10-29 | In progress |

| [0125](0125-bounded-shapes-setup.md) | Bound stalled shapes setup/settle evaluations; incomplete16ap and native/storage investigation preserved | Agent | 2026-10-29 | Failure handling |

| [0126](0126-native-reopen-handle-investigation.md) | Gated-open candidate: ownership model and isolated diagnostics verified; full16aq4 acceptance pending | Agent | 2026-10-29 | Investigation |

| [0127](0127-reserved-benchmark-device-data.md) | User reserved emulator; isolated16GiB data preserves original apps; native setup validation | Agent | 2026-10-29 | In progress |

| [0128](0128-isolated-benchmark-emulator.md) | Separate5556 AVD; scoped targeting/setup verified; first matched16aq4 acceptance active | Agent | 2026-10-29 | In progress |

| [0128](0128-isolated-benchmark-emulator.md) addendum | 16aq6/16L19: first complete matched acceptance on emulator-5556. Shapes 2/54/0/30 (16r 1/48/0/37); lists 13/15/3/2 with list mean guard FAIL (relaunch +245-254 ms, firstReady +88/+148 ms); 16aq2 gated-open candidate not retained | Agent | 2026-10-29 | Accepted |
| [0129](0129-fresh-process-pipelined-open.md) | Fresh-process pipelined native open (sessionStorage marker; ADR-0126 gate on reload). Retained; 16av/16L20 (shapes 3/54/0/29, lists 12/16/3/2) is the isolated-environment baseline | Agent | 2026-10-29 | Accepted |
| [0130](0130-native-marker-recording.md) | Candidate16aw: gate failed marker writes; native aliases share markers; host regressions pass | Agent | 2026-10-30 | In progress |

| [0131](0131-queued-android-open-settings.md) | Rejected16az earlier settings send: native order confirmed, target app gain mixed; restored16aw | Agent | 2026-10-30 | Rejected |

| [0132](0132-transient-selector-wall.md) | Unchanged16aw transient watch wall attribution:201 lifetimes/200 writes; eviction/recount small, no production optimization or new limit | Agent | 2026-10-30 | Diagnostic complete |

| [0133](0133-batched-static-selector-scopes.md) | Rejected16be batched scopes: full16bf/16L22 failed; exact SelectionEngine baseline restored, correctness tests kept | Agent | 2026-10-30 | Rejected |

| [0134](0134-single-statement-native-route.md) | Rejected16bg public single-statement run vs executeSet:2400calls/60pairs, both-order run wall adverse; driver unchanged | Agent | 2026-10-30 | Rejected |

| [0135](0135-workflow-reset-wall.md) | Workflow reset read/write wall attribution | Diagnostic complete; full-root read located, no floor/gain claim |

| [0136](0136-complete-object-shell-reads.md) | Complete object shell reads with canonical cached-child metadata | Rejected: full16bj/16L23 lists32/33,shapes56/86,mean/heap guards failed |

| [0137](0137-known-write-parent-positions.md) | Authoritative reload for structurally changed known pointer parents; preserve canonical metadata and key order | Rejected16bk SQL reload: diagnostic startup/heap adverse; exact baseline restored, correctness bug remains open |

| [0138](0138-canonical-known-pointer-values.md) | Canonicalize selected complete known pointer values before sharing, without structural SQL reload |Rejected16bl2 prewalk after diagnostic startup/heap adversity;16bl incomplete; integrated correctness repair next |

| [0139](0139-canonical-known-reconciliation.md) | Canonical known pointer ordering/metadata isolation inside existing sharing traversal | Full16bn/16L24 FAILED: lists29/33,shapes53/86; unaccepted for retention, scope isolation next |

| [0140](0140-known-pointer-sharing-isolation.md) | Isolate canonical complete-known-pointer reconciliation; restore ordinary sharing exact baseline |Full16bp/16L25 FAILED:lists32/33,shapes53/86;16bo unaccepted for retention, singleton scope source work next |

| [0141](0141-single-primitive-selector-scope.md) | Avoid duplicate synthetic wrapper copies for one loaded primitive selector source |16bq REJECTED:guard all3pairs and both PSS channels adverse; source restored, full16br/16L26 held |

| [0142](0142-lazy-query-batch-screen.md) | 16bs lazy queryBatch in PathCache.refresh: removed work is microseconds per physical-only refresh, below device resolution; rejected at host screen, baseline restored, behaviour tests kept | Agent | 2026-11-03 | Rejected |
| [0143](0143-static-plugin-imports.md) | 16bu static Capacitor/SQLite plugin imports in CapacitorSqliteDriver (16bt: first native call waits on lazy plugin chunks). Rejected at validation: per-file vi.mock cannot intercept a statically bound plugin in shared test bundles; baseline restored | Agent | 2026-11-03 | Rejected |
| [0144](0144-harness-plugin-preload.md) | 16bv harness static SQLite plugin import: 10k relaunch -29/-261 ms, but the 50k guard regressed (mean 1535 vs 1464, 2/3 pairs adverse) and toggleP50 and native memory were worse in both orders; rejected, driver restored | Agent | 2026-11-05 | Rejected |
| [0145](0145-relaunch-startup-limit-accepted.md) | User accepts the 10k relaunch startup gap (+48 ms over allowance, a one-time cold-launch cost) as a limitation for the list goal; startup options deferred; 50k emitP95 stays open | User | 2026-11-05 | Accepted |
| [0146](0146-onstate-reset-evidenced-limit.md) | Workflow reset via the onState bridge (4 shapes rows) is an evidenced limit: the classic reducer needs the whole feature, so uncached parts must be read (16bh 14.9 ms read; the 16bi shell fix still failed at 17.5 ms and was rejected on memory gates) | Agent | 2026-11-05 | Accepted |
| [0147](0147-bulk-write-evidenced-limits.md) | append100 and K5000 replace (4 shapes rows) are evidenced limits: multi-row native writes plus diff, copy and size work inherent to persistence (16k native 7.7-8.9 ms; 16ah replace 7.66 native + 2.56 diff + 1.87 refresh); a bounded size estimator (~1.7 ms) is noted but cannot close the gap | Agent | 2026-11-05 | Accepted |
| [0148](0148-burst-backlog-platform-tail.md) | Burst maxBacklog (3 shapes rows) is an evidenced limit: the store-free commit+render control at 30 Hz shows the same backlog (1,1,1,2,1 vs store 2,1,1,1,1; control lagMax up to 47 ms); minimum 1 per ADR-0105 | Agent | 2026-11-05 | Accepted |
| [0149](0149-small-write-post-commit-limit.md) | Small shape writes (9 emitP50 rows, 0.4-3.2 ms over) are an evidenced limit: one native commit (~5 ms) plus a mandatory serial post-commit refresh/notify (~3.3 ms, 16ah); the optimisation series 0100-0142 was rejected | Agent | 2026-11-05 | Accepted |
| [0150](0150-shape-heap-metadata-limit.md) | Shape heap rows (5) are an evidenced limit: code +0.7-1.3 MB (CODE-BOUND by method) plus +0.1-0.5 MB of persistence metadata (node meta, childPos) required by the write path; compaction attempts (0106/0107/0136) were rejected | Agent | 2026-11-05 | Accepted |
| [0151](0151-shape-pss-working-set-limit.md) | Shape PSS rows (4) are an evidenced limit of the persistent-store working set: app +5.7-13.7 MB (native SQLite/plugin/bridge, grows with data), renderer +3.4-7.3 MB (of which +1.3-1.8 MB is JS heap); partial attribution stated, the real-row bracket was not implemented | Agent | 2026-11-05 | Accepted |
| [0152](0152-50k-emit-p95-accepted.md) | User accepts 50k emitP95 (+0.18 ms) as a limitation; with ADR-0145 and ADR-0146..0151 both Phase 16 goals are met as defined | User | 2026-11-05 | Accepted |