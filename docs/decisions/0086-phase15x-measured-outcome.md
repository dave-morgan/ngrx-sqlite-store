# ADR-0086: Phase 15x measured outcome and control noise

Status: Accepted (Agent, 2026-10-25). Parity is still incomplete; Phase 16 remains gated.

## Changes measured (all retained as proven redundant-work removal)
- **`PathCache.owner()` in O(path depth).** It checks the exact key and then ancestor prefixes. If more than one candidate matches, it falls back to the original first-in-insertion-order scan.
- **Shared defaults view.** It is built once per cache generation and feature seed/readiness state, instead of once per selector per generation. The 15w emission profile attributed about 0.08 ms per dispatch to the per-selector rebuild.
- **`StoreTx.prefetch`.** A reducer's returned multi-key partial reads its previous values through one batched transport, not one round trip per key. A regression test pins one read where there were three.

## Result
Session `15x-audit-1792878166`, APKs archived in `.tmp/15x-apks/`. The classic hash `72cd2fc5…` is unchanged from 15w.

Verification (`.tmp/15x-verify.cjs`) covers 30 observations, 66 summaries, 33 verdicts, four controls with matching provenance and six boots.

**11 PASS / 13 PLATFORM-BOUND / 3 CODE-BOUND / 6 FAIL** (15w: 12 / 15 / 3 / 3).

FAIL rows:
- 1k, 10k and 50k emitP50;
- 10k pssTotalMb;
- 50k firstReadyMs;
- 50k relaunchReadyMs.

Rows that changed relative to 15w:
- **FAIL → PLATFORM-BOUND:** 1k toggleP50, 10k firstReadyMs.
- **PLATFORM-BOUND → FAIL:** 1k emitP50, 10k emitP50, 10k pssTotalMb, 50k firstReadyMs, 50k relaunchReadyMs.
- **PASS → PLATFORM-BOUND:** 1k pssRelaunchTotalMb.

## Honest comparison
The sqlite means are the same as 15w or better. Selected sqlite means, 15w → 15x:

| Metric | 15w | 15x |
|---|---:|---:|
| 1k emitP50 | 3.88 ms | 3.88 ms |
| 10k emitP50 | 3.90 ms | 3.90 ms |
| 50k emitP50 | 4.04 ms | 3.88 ms |
| 10k relaunch | 1891 ms | 1768 ms |
| 50k firstReady | 1759 ms | 1699 ms |
| 10k pssTotalMb | 244.19 MB | 244.19 MB |

The new FAILs come from the same-session controls and classic statistics:

| Control | 15w (1k / 10k / 50k) | 15x (1k / 10k / 50k) |
|---|---|---|
| F_commit p50 (20 samples) | 3.8 / 4.4 / 3.5 ms | 3.1 / 3.3 / 3.3 ms |
| F_open mean (5 samples) | 105 / 92 / 143 ms | 93 / 83 / 100 ms |

- 50k firstReady: classic mean 663 → 472 ms.
- 10k post-seed memory allowance (a single seed-memory bracket): 19.3 → 10.8 MiB.

The remaining metrics sit at the noise boundary of low-sample controls. Emission p50 is the exception: it is consistently about 0.5–0.7 ms above F_commit p50, and needs a real store improvement.

## Next
- **Control precision.** Increase control sample counts so the same estimators are measured with less noise: F_commit 20 → 100, F_open 5 → 10, seed-memory bracket 1 → 3. Floor definitions are unchanged and nothing is widened (ADR-0087).
- **Emission store JS.** Continue reducing it.
