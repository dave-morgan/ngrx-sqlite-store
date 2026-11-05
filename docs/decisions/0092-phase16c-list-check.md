# ADR-0092: Phase 16 flat-write fixes and the 16L1 list check

Status: Accepted (Agent, 2026-10-26).

## Changes (Phase 16, all retained)
1. **One row per changed key.**
   - A row-free leaf changing kind (null/scalar/inline JSON) becomes one `UPDATE nss_node SET kind, value` (`RowWriter.updateKindValue`). Before, it was a subtree delete of 6 statements plus a re-insert.
   - StoreTx keeps each parent's child positions across child writes (`childPositions`), so later keys need no `SELECT parent,pos` round trip.
   - Measured in sql.js:
     - 10-key partial: 81 → 10 statements;
     - 1% replace: 77 → 11–14.
   - Spec: `flat-writes.spec.ts`.
2. **O(changed) refresh and handler work.**
   - `PathCache.refreshEntry` splices write-through targets with `putMany`, which copies each container once, and finds known ancestors by walking up instead of scanning every key.
   - `runHandlers` skips keys whose value is identical (`StoreTx.isCurrent`), which `set()` already treated as no-ops.
   - Measured in Node at K=5000: replace 232 → 38 ms/action.
   - Spec: `put-many.spec.ts`.

## Shapes evidence (emit p50, sqlite)
| Scenario | 16a (before) | 16b (fix 1) | 16c (fixes 1+2) |
|---|---|---|---|
| 10-key write, K=5000 | 83 ms | 28 ms | 16 ms |
| Replace, K=5000 | 345 ms | 111 ms | 49 ms |

Verdicts:
| Run | PASS | PLATFORM-BOUND | FAIL |
|---|---:|---:|---:|
| 16a | 1 | 1 | 84 |
| 16b | 1 | 4 | 81 |
| 16c | 1 | 7 | 78 |

## List check (ADR-0091)
Full acceptance `16L1`, verified with `.tmp/16L1-verify.cjs`: 30 observations, 66 summaries, 33 verdicts, controls, APK hashes and six boots.

**Result: 12 PASS / 12 PLATFORM-BOUND / 3 CODE-BOUND / 6 FAIL** (15aa: 16 / 14 / 3 / 0).

**No list regression.** Every sqlite mean is equal to or better than 15aa:

| Metric | 15aa | 16L1 |
|---|---:|---:|
| 50k firstReady | 1440 ms | 1283 ms |
| 50k relaunch | 1744 ms | 1611 ms |
| 10k relaunch | 1714 ms | 1532 ms |
| 10k/50k emitP50 | 4.36/4.42 ms | 3.66/3.56 ms |
| 10k/50k toggleP50 | 18.4/20.0 ms | 14.3/13.9 ms |

The FAIL rows come from this session's tighter references:
- classic relaunch 1352–1386 ms (15aa: 1446–1505 ms);
- F_commit p50 3.1–3.3 ms (15aa: 3.7 ms);
- no slow trial, so the SDs are small.

The real remaining list gaps are:
| Gap | Size |
|---|---|
| emitP50/P95 at 10k/50k | about 0.36–0.46 ms (p50) and 0.8–1.1 ms (p95) of store work above the commit floor |
| relaunchReady at 1k/50k | 34–44 ms over the limit |

15aa's 0 FAIL depended in part on that session's SDs (ADR-0090 noted the 0.05–0.25 ms emission margins). The list goal is therefore not robustly met. Phase 16 cannot be ticked until a full list acceptance is 0 FAIL again (ADR-0091).

## Next
1. List emission store JS and relaunch, as the list priority.
2. A store-free single-commit + repaint control, to test whether the about 9–10 ms single shapes writes are platform-bound. Applying it as a floor needs the user's decision.
3. A shapes memory control.
