# ADR-0068: Measured Phase 15f acceptance and six remaining gaps

Status: Accepted (Agent, 2026-10-24)

## Outcome

**13 PASS / 12 PLATFORM-BOUND / 0 BRIDGE-BOUND / 2 CODE-BOUND / 6 FAIL**, compared with 15e's 10 PASS / 9 PLATFORM-BOUND / 0 CODE-BOUND / 14 FAIL. Acceptance execution finished; Phase 15f parity remains incomplete and Phase 16 stays gated.

Use [acceptance raw data](../benchmarks/android-parity-15f-2026-10-23.json), [report](../benchmarks/android-parity-15f-2026-10-23.md), [decomposition evidence](../benchmarks/android-ladders-15f-2026-10-23.md) and [session verification](../benchmarks/android-session-15f-2026-10-23.json). Session `15f-resume-1792751019` contains five independent trials per implementation and size (30 total); all controls match the session and APK hashes. Both verified emulator boot IDs are recorded. The original timed-out setup is retained and excluded.

These are independent clean sessions, not isolated causal A/B estimates. The 50k SQLite first-ready mean fell 2928.440 -> 1831.220 ms (37.5%); relaunch means fell 1798.180 -> 1666.660, 1797.920 -> 1689.720 and 2013.600 -> 1886.040 ms at 1k/10k/50k. Classification changes also reflect classic SD and the ADR-0066 real-row/paced floors and ADR-0067 workload code control. The 10k first-ready PASS has a 536.886 ms classic SD. The 1k post-seed PSS becomes FAIL despite a lower SQLite mean because the same-session allowance narrowed. The 1k notes heap still exceeds the code allowance by 0.061 MiB; smaller control data does not justify widening the allowance.

## Remaining failures

| Size | Metric | 15e SQLite mean | 15f SQLite mean | Excess | Allowance | Uncovered |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1000 | heapNotesMb | 6.125 | 6.106 | 0.941 | 0.880 | 0.061 |
| 1000 | pssTotalMb | 239.284 | 238.683 | 14.041 | 4.385 | 9.656 |
| 1000 | toggleP50 | 21.560 | 19.800 | 16.580 | 11.800 | 4.780 |
| 1000 | toggleP95 | 64.160 | 62.760 | 53.460 | 22.169 | 31.291 |
| 10000 | pssTotalMb | 248.160 | 246.026 | 15.488 | 10.214 | 5.274 |
| 10000 | toggleP95 | 59.460 | 55.420 | 38.180 | 24.700 | 13.480 |

Latency units are ms; heap and PSS are MiB. Uncovered is excess minus the existing allowance, without adding a new tolerance.

## Decision and next work

Retain the changes and control definitions in ADR-0066/0067. Do not mark Phase 15f complete, start Phase 16, or declare any remaining gap impossible. Prioritize 1k toggle commit-to-DOM attribution and the 10k tail; obtain exact native/process PSS ownership at 1k and 10k; reconcile the notes control and acceptance workload before attributing its remaining heap excess. The brief's full startup dependency graph, complete commit ladder and per-mapping PSS ownership remain incomplete. The earlier createConnection hang has not been proven fixed.

## Validation

Post-acceptance validation on 2026-10-24: 336 library tests, 18 tool tests, 1 harness test and 26 Playwright tests passed; library and both production-configured harness APK builds passed. Measured APKs are preserved under `.tmp/15f-accepted-apks/`; later build validation does not replace acceptance provenance. No commit.
