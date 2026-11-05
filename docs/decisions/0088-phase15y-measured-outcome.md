# ADR-0088: Phase 15y measured outcome (precise controls)

Status: Accepted (Agent, 2026-10-25). Parity is still incomplete; Phase 16 remains gated.

## Changes measured
- **Incremental `PathCache.publish`.** When the set of published paths is unchanged, only paths whose value reference changed are re-put into the shared view. Retained as proven redundant-work removal; the full rebuild remains the fallback.
- **ADR-0087 control precision.** F_commit 100 samples, F_open 10 fresh-process trials, three fresh-process seed-memory brackets.
- All earlier retained changes (ADR-0086) are included.

## Result
Session `15y-audit-1792881600`, APKs archived in `.tmp/15y-apks/` (classic `72cd2fc5…` unchanged, sqlite `e616e95b…`).

Verification (`.tmp/15y-verify.cjs`) covers 30 observations, 66 summaries, 33 verdicts, four controls with matching provenance and six boots. Evidence: `docs/benchmarks/android-parity-15y-2026-10-24.md`, `android-session-15y-2026-10-24.json`.

**13 PASS / 13 PLATFORM-BOUND / 3 CODE-BOUND / 4 FAIL** (15x: 11 / 13 / 3 / 6; 15w: 12 / 15 / 3 / 3).

FAIL rows, all at 50k:
| Metric | classic | sqlite | Limit | Over |
|---|---:|---:|---:|---:|
| firstReadyMs | 442.9 ± 46.7 | 1771.0 ± 39.4 | 1460.3 | 311 ms |
| relaunchReadyMs | 1672.5 ± 75.7 | 1975.9 ± 99.4 | 1927.1 | 49 ms |
| emitP50 | 0.10 ± 0.00 | 4.00 ± 0.07 | 3.47 | 0.53 ms |
| emitP95 | 0.34 ± 0.11 | 5.76 ± 0.21 | 5.12 | 0.64 ms |

Changes relative to 15x: 1k/10k emitP50 and 10k pssTotalMb FAIL → PLATFORM-BOUND; 1k firstReadyMs and 1k pssRelaunchTotalMb → PASS; 50k emitP95 PLATFORM-BOUND → FAIL.

## Honest comparison
Sqlite means are within run-to-run noise of 15x (1k emitP50 3.88 → 4.06 ms, 50k emitP50 3.88 → 4.00 ms, 50k firstReady 1699 → 1771 ms, 50k relaunch 1933 → 1976 ms). The improvement in verdicts at 1k/10k comes from the more precise controls (1k/10k F_commit p50 4.2/4.1 ms over 100 samples), not from a faster store.

With 100 samples the 50k F_commit p50 is 3.4 ms, consistent with 15w/15x (3.5/3.3 ms). The ten-trial F_open mean (79.5 ms, no outlier) removes the 15w outlier (357 ms) that made 50k firstReady PLATFORM-BOUND then. The remaining 50k FAILs are therefore real store costs:
- about 0.5–0.6 ms of emission work per dispatch above the commit floor;
- about 300 ms of 50k first-ready work above the real-row seed and open controls;
- about 50 ms of 50k relaunch work above F_open.

## Next
Profile and reduce the 50k first-ready path (entity row construction, index maintenance on `nss_entity`, post-seed query) and the per-dispatch emission path. No floors are changed.
