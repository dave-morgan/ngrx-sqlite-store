# Phase15v shared concurrent entity counts

Latest full15u remains11PASS/11PLATFORM-BOUND/3CODE-BOUND/8FAIL,22/33qualified; goal unmet and Phase16 gated. [15u evidence](android-ladders-15u-2026-10-24.md).

Current unchanged15u50k startup trace `.tmp/startup-15u-current-50000.json` verifies candidate15u hash and50000ready; pre-ready header count transport154.9ms. Raw native count diagnostic alternates30pairs with the same valid-inline predicates: independent total/open aggregates mean92.860ms/p50 90.0ms, shared aggregate53.067ms/p50 51.7ms;30/30 paired wins. All60 records agree50000total/32487open. [Native raw](android-count-ladder-15v-2026-10-24.json). Initial verification assumed33333open incorrectly; actual saved values were unchanged and the corrected comparison verifies equality across all records. No rerun/discard.

ADR0081 candidate carries internal optional count plans through SqlReader/PathCache. At least two counts for the same collection share an inline scan only if one predicate is unfiltered (1). This avoids expanding selective-only indexed searches. Shared promoted membership preserves each reader's exact existing fallback. Group CTEs are scoped inside a subquery so arbitrary readers' SQL names remain isolated; original requests remain fallback on unsupported SQL or oversized JSON. Existing batch limits/predicates/atomicity/notification order unchanged, no schema/index change.

Regression red4table scans versus2 expected, then passes with promoted/invalid JSON and exact count results. Mixed collection/quoted bindings/empty counts/fallback tests pass. A second regression requires selective-only filters to retain indexed searches before enabling the scope guard. No application timing claim before reversed APK measurements.

Guarded candidate375library/26e2e/library+SQLiteAPKbuilds pass (earlier20tools/1harness pass). ACTIVE `.tmp/15v-ab.sh` PID45352 logs `.tmp/15v-ab.stdout.log/.stderr.log`: explicitly installs candidate and verifies actual50k grouped count transport, then reversed A1/B1/B2/A2 each separate verified coldboot+60s settle at1k/10k/50k. Candidate SHA256`bdb5b0b95bd13ca5c9c989d6339883bf4733c22dae915f093738b8c6521acd2a`; baseline15u`6831fc61c3bdbe89ccecfb59cb89b9d5dff39357709d11ccb22ecf9d43f282aa`. One-trial verdict counts invalid; compare raw measurements both directions. No application benefit claim yet.

Actual installed guarded APK proof completed: hash matches,50000ready and captured `WITH counts AS MATERIALIZED` query (`.tmp/15v-candidate-proof.json`). Diagnostic native probe used `json_extract(done)=0` on this boolean fixture; production preserves the complete compiled boolean type guard/predicate verbatim. Thus native53.1ms is a located-cost diagnostic, not an exact production-query speedup prediction. Actual startup trace timings are perturbed and not acceptance. Reversed application measurements remain pending.

## Reversed application outcome

AB_DONE/AB_EXIT=0;12observations (three sizes per leg), four distinct boot IDs, session/APK provenance,30finite toggles and200finite emissions each and actual candidate grouped-query proof verified independently. `.tmp/15v-ab-validation.json` records the verification. No one-trial verdicts used. All raw reports preserved.

| Size | Metric | A1 | B1 | B1 - A1 | B2 | A2 | B2 - A2 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1000 | firstReadyMs | 712.300 | 618.100 | -94.200 | 521.700 | 561.000 | -39.300 |
| 1000 | relaunchReadyMs | 2204.900 | 1788.600 | -416.300 | 1836.200 | 1792.800 | 43.400 |
| 1000 | toggleP50 | 16.200 | 14.900 | -1.300 | 16.900 | 16.600 | 0.300 |
| 1000 | toggleP95 | 62.400 | 52.600 | -9.800 | 75.100 | 54.800 | 20.300 |
| 1000 | emitP50 | 4.500 | 3.800 | -0.700 | 3.900 | 4.000 | -0.100 |
| 1000 | pssTotalMb | 234.904 | 231.499 | -3.405 | 235.720 | 234.705 | 1.015 |
| 1000 | pssRelaunchTotalMb | 222.354 | 219.229 | -3.125 | 221.963 | 221.505 | 0.458 |
| 10000 | firstReadyMs | 826.500 | 745.800 | -80.700 | 733.300 | 731.200 | 2.100 |
| 10000 | relaunchReadyMs | 1804.200 | 1770.300 | -33.900 | 1793.100 | 1993.300 | -200.200 |
| 10000 | toggleP50 | 22.900 | 15.800 | -7.100 | 14.600 | 15.400 | -0.800 |
| 10000 | toggleP95 | 61.100 | 41.700 | -19.400 | 48.100 | 33.100 | 15.000 |
| 10000 | emitP50 | 4.000 | 4.000 | 0.000 | 3.900 | 4.000 | -0.100 |
| 10000 | pssTotalMb | 243.562 | 240.740 | -2.821 | 244.060 | 243.731 | 0.328 |
| 10000 | pssRelaunchTotalMb | 222.138 | 219.255 | -2.883 | 225.573 | 222.040 | 3.533 |
| 50000 | firstReadyMs | 1912.000 | 1703.700 | -208.300 | 1699.300 | 1732.400 | -33.100 |
| 50000 | relaunchReadyMs | 2059.100 | 1734.100 | -325.000 | 1832.200 | 2022.000 | -189.800 |
| 50000 | toggleP50 | 15.600 | 14.000 | -1.600 | 14.900 | 16.800 | -1.900 |
| 50000 | toggleP95 | 54.500 | 73.700 | 19.200 | 49.900 | 43.500 | 6.400 |
| 50000 | emitP50 | 3.900 | 3.900 | 0.000 | 4.000 | 3.800 | 0.200 |
| 50000 | pssTotalMb | 241.047 | 239.775 | -1.271 | 243.336 | 240.982 | 2.354 |
| 50000 | pssRelaunchTotalMb | 222.072 | 219.345 | -2.728 | 223.179 | 221.986 | 1.192 |

At50k first-ready improves208.3/33.1ms and relaunch325.0/189.8ms in both directions. ToggleP95 worsens19.2/6.4ms at50k;1k/10k tails mixed, and memory changes direction between pairs. BaselineA1/A2 startup drift is visible; do not attribute every difference to code. Retain for proven repeated-scan removal and repeated50k startup direction, then fresh matched controls/full acceptance must assess all metrics. Qualified total still refers to full15u22/33;3CODE-BOUND remain separate. No floor expansion or variance rerun.

Post-A/B375library/20tools/1harness/26e2e/librarybuild checks pass, `.tmp/15v-post-*`, cached candidate hash unchanged. ACTIVE fresh matched full acceptance `.tmp/15v-audit.sh` PID34224 session`15v-audit-1792842484`, logs `.tmp/15v-audit.stdout.log/.stderr.log`:5pairedcodecontrols/floors/empty/render, verifiedreboot and5trialpairswithreboot-between. Verify30/66/33/fourcontrolprovenances/boots on completion. No competing device work/builds/tests/profilers.

## Full acceptance outcome

[Report](android-parity-15v-2026-10-24.md): **11 PASS / 13 PLATFORM-BOUND / 3 CODE-BOUND / 6 FAIL**, verified (30 observations, 66 summaries, 33 verdicts, four controls, six boots). FAIL: 1k toggleP50/P95, 10k/50k relaunch, 10k/50k emitP50. See ADR-0081 outcome.
