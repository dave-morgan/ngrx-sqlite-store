# ADR-0095: Phase 16f–16h outcome and list check 16L3

Status: Accepted (Agent, 2026-10-27).

## Changes, all retained with on-device evidence
| Fix | Change | Evidence |
|---|---|---|
| 4 | Catalog read pipelined with create/open (`SqlDriver.open(firstQuery)`). A read that reaches a stale handle after a WebView reload is discarded and issued again. | Relaunch A/B, store → ready 304 → 280 ms |
| 5 | Runs of consecutive single-row `nss_node` updates coalesce into one `UPDATE … FROM json_each` (`storage/coalesce-updates.ts`; the last write per path wins; real-DB equivalence spec). | 10-key write ~15 → 8.5–10 ms; K=5000 replace 47 → 20.8 ms; reset 17.6 → 11.1 ms |
| 6 | `runHandlers` compares a partial's keys against `StoreTx.currentRoot()`: one root lookup instead of a path lookup per key. | K=5000 replace 20.8 → 14.3 ms |
| 7 | Inserts of ≥16 rows use the single-binding `json_each` path. | append100 15.2 → 14.1 ms |

## Tooling
`tools/android-bench-shapes.mjs` now:
- writes raw rows before reporting;
- tolerates a missing platform control;
- supports `--report-only`;
- records a PSS split into app and renderer.

`.tmp/warmup.mjs` runs after each reboot. It removes failures that only happen right after a cold boot: two shapes runs were incomplete and were archived, not reported.

## Shapes
Under ADR-0093, with the empty control in the same session:

| Run | PASS | PLATFORM-BOUND | CODE-BOUND | FAIL |
|---|---:|---:|---:|---:|
| 16e | 1 | 47 | 0 | 38 |
| 16g | 1 | 52 | 0 | 33 |
| 16h | 3 | 57 | 0 | 26 |

Workflow edits at depth 1/4/10, step and the load cycle are now PLATFORM-BOUND.

Latency FAILs that remain:
| Row | sqlite | Allowance | Over |
|---|---:|---:|---:|
| Flat single/10-key/replace, K=50/500 | – | – | 0.4–1 ms |
| K=5000 setKey | 10.7 ms | 7.1 ms | 3.6 ms |
| K=5000 replace | 14.3 ms | 7.0 ms | 7.3 ms |
| Reset | 11.4 ms | 11.0 ms | 0.4 ms |
| append100 | 14.1 ms | 9.4 ms | 4.7 ms |

Also failing: burst backlog, heap data parity and PSS.

## List check 16L3 (ADR-0091)
Verified with `.tmp/16L3-verify.cjs`.

**13 PASS / 14 PLATFORM-BOUND / 3 CODE-BOUND / 3 FAIL** (16L2: 13 / 14 / 3 / 3).

Sqlite means improved against 16L2 on almost every row:
| Metric | 16L2 | 16L3 |
|---|---:|---:|
| 10k relaunch | 1580 ms | 1464 ms |
| 50k relaunch | 1647 ms | 1470 ms |
| 50k firstReady | 1305 ms | 1191 ms |
| Emit p50 (all sizes) | 3.56–3.64 ms | 3.28–3.36 ms |
| Toggles | – | equal or better |

No regression.

Remaining list FAILs:
| Row | Excess | Allowance | Over |
|---|---:|---:|---:|
| 10k relaunch | 205 ms | 180 ms | 25 ms |
| 50k emitP50 | 3.28 ms | 3.01 ms | 0.27 ms |
| 50k emitP95 | 5.32 ms | 4.64 ms | 0.68 ms |

At 50k the session F_commit p50 is 2.9 ms, against 3.2–3.3 ms at 1k/10k.
