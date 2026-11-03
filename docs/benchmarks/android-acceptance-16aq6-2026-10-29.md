# Acceptance 16aq6 / 16L19 (isolated emulator-5556), 2026-10-29

This is the first complete matched acceptance on the isolated AVD `Ngrx_SQLite_Benchmark_API35`. It ran the frozen 16aq2 candidate APKs (sqlite `0076a0ad...`, classic `58ad9c2a...`) with fresh controls in the same session.

16aq4 was aborted when the shared ADB daemon dropped during sqlite trial 1 (an infrastructure failure). 16aq5 was aborted at setup because a renamed script path was missing. No measurements were lost. The raw files from both are preserved and not merged.

## Verified counts
| Suite | Retained reference | 16aq6 / 16L19 candidate |
|---|---|---|
| Shapes (86 rows) | 16r: 1 PASS / 48 PB / 0 CB / 37 FAIL | 2 PASS / 54 PB / 0 CB / 30 FAIL |
| Lists (33 rows) | 16L8: 14 PASS / 14 PB / 3 CB / 2 FAIL | 13 PASS / 15 PB / 3 CB / 2 FAIL |

## List mean guard (ADR-0091): fails
sqlite means rose by more than the sum of SDs against 16L8:

| Metric | Increase | Sum of SDs |
|---|---:|---:|
| 1k firstReady | +87.7 ms | 64.7 |
| 1k toggleP50 | +5.26 ms | 2.50 |
| 10k relaunch | +254.0 ms | 184.7 |
| 50k relaunch | +245.2 ms | 138.0 |
| 50k firstReady | +148.3 ms | 141.2 |

List FAILs:
- 50k emitP50: excess 3.40 against allowance 3.07 (was PB).
- 50k emitP95: excess 5.12 against allowance 4.72.

10k emitP95 moved from FAIL to PB.

## Shapes FAILs (30)
- K=50/500/5000 setKey, setKeys and replace emit (about 7.5–14 ms against the control allowance).
- Workflow edits and step.
- Reset (24–29 ms).
- append100 (13 ms).
- Burst maxBacklog (2–2.6 against 0).
- Heap data parity.
- PSS (+9–16 MB).

## Conclusion
The candidate is not retainable: the relaunch/firstReady regression is consistent with 16aq3 and 16at. The shapes gain does not override the list mean guard.

The environment changed (isolated AVD), so causal comparison with history is confounded. All adverse rows are kept.

Full comparison: android-acceptance-16aq6-2026-10-29.json (from .tmp/16aq6-accept-comparison.json).
