# Phase15q watched signal dependency

ADR0078 removes a global cache-generation dependency from the returned selectSignal computed. Its watcher already updates a private value signal. Always reading that value before throwing keeps error recovery reactive. No persistence/commit/notification/schema change.

A selected-items signal previously reran custom equality when only its filter sibling changed: regression fails with1call instead of0 before implementation. It now skips the unrelated comparison and updates on an appended item. Existing selector error/recovery coverage passes.349 library tests,26e2e tests,library/SQLite APK builds pass. Logs `.tmp/15q-{red,tests,e2e,library-build,apk-build}.log`.

Active reversed runner `.tmp/15q-ab.sh` PID23684, logs `.tmp/15q-ab.stdout.log/.stderr.log`: A1/B1/B2/A2 at1k+10k, EACH separate verified coldboot and60s settle. Baseline `.tmp/15q-baseline/sqlite.apk` is15o SHA25647ae02d0d89e7dbfdddc65946550b89ae5a0e3ded2367d7fc611a67f3ee2f65a; candidate `.tmp/15q-candidate/sqlite.apk` SHA256fba1155916ec89c2621f5b598c92eb5018d942319b1418a67a4577eababf4376. Raw `.tmp/15q-fresh-{A1,B1,B2,A2}.json`. One-trial verdicts invalid for acceptance; compare both directions, including regressions. No timing benefit claimed before results.

Latest FULL15o12PASS/10PB/3CB/8FAIL verified30 observations/66 summaries/33 verdicts/all4controls/session/APK provenance. Post-device348library/20tool/1harness/26e2e tests and librarybuild pass. Phase16 gated; CODE-BOUND remains separate from required success.

## Reversed APK outcome

All8 size observations,session/APK hashes,11 finite metrics,30toggles/200emissions each and4distinct coldboot IDs verified; exit0. No samples discarded, single-trial verdicts unused.

| Size | Metric | A1 | B1 | B1 - A1 | B2 | A2 | B2 - A2 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1000 | firstReadyMs | 627.000 | 598.500 | -28.500 | 608.500 | 601.600 | 6.900 |
| 1000 | relaunchReadyMs | 1891.300 | 1774.500 | -116.800 | 1913.700 | 2038.300 | -124.600 |
| 1000 | toggleP50 | 15.900 | 20.000 | 4.100 | 14.300 | 16.700 | -2.400 |
| 1000 | toggleP95 | 43.200 | 78.000 | 34.800 | 50.700 | 51.200 | -0.500 |
| 1000 | emitP50 | 4.000 | 4.000 | 0.000 | 3.900 | 4.000 | -0.100 |
| 1000 | pssTotalMb | 238.152 | 237.093 | -1.060 | 239.093 | 237.674 | 1.419 |
| 1000 | pssRelaunchTotalMb | 223.733 | 222.427 | -1.307 | 223.952 | 223.181 | 0.771 |
| 10000 | firstReadyMs | 780.400 | 779.200 | -1.200 | 792.200 | 789.500 | 2.700 |
| 10000 | relaunchReadyMs | 1833.500 | 1789.600 | -43.900 | 1857.500 | 1810.600 | 46.900 |
| 10000 | toggleP50 | 15.800 | 16.300 | 0.500 | 15.000 | 14.800 | 0.200 |
| 10000 | toggleP95 | 59.000 | 39.800 | -19.200 | 43.600 | 47.600 | -4.000 |
| 10000 | emitP50 | 4.000 | 3.900 | -0.100 | 3.900 | 4.000 | -0.100 |
| 10000 | pssTotalMb | 247.965 | 246.784 | -1.181 | 248.799 | 247.125 | 1.674 |
| 10000 | pssRelaunchTotalMb | 223.924 | 223.171 | -0.753 | 224.597 | 223.407 | 1.189 |

10k emitP50 improves0.1ms in both directions and toggleP95 improves19.2/4.0ms.1k results are mixed:toggleP95 worsens34.8ms then improves0.5ms; toggleP50 worsens4.1ms then improves2.4ms. Retain for proven redundant signal equality removal and repeated10k direction; a fresh full acceptance must evaluate all metrics. These single-trial differences are not causal proof for each metric and do not establish success. Full matching controls and5trial pairs follow; all unfavorable observations retained.

## Full matched acceptance in progress

Runner `.tmp/15q-audit.sh` PID8640 logs `.tmp/15q-audit.stdout.log/.stderr.log`: verified coldboot, matchingAPK installations, five paired workload code controls, floors, empty-plugin and render controls, then verified reboot and five acceptance trial pairs with reboot-between. Final verification requires30 observations/66 recomputed summaries/33 verdicts/allfour control provenances. No builds/tests/profilers alongside the device run. Latest full score remains15o12PASS/10PB/3CB/8FAIL until completion.

## Full acceptance outcome

**11 PASS /10 PLATFORM-BOUND /0 BRIDGE-BOUND /3 CODE-BOUND /9 FAIL**. All30 observations/66 independently recomputed means and sample SDs/33 verdicts/four matching controls/six boot IDs verified, PIPELINE_DONE/exit0. [Session verification](android-session-15q-2026-10-24.json).

15o was12PASS/10PB/3CB/8FAIL,15l10PASS/12PB/3CB/8FAIL,15f13PASS/12PB/2CB/6FAIL. Qualified metrics fall22->21 versus15o. These independent sessions do not isolate causality; changed classic SDs/controls affect classification. Keep the code only for regression-proven removal of unrelated equality work; no general timing or parity improvement claim. Phase16 remains gated.

| Size | Metric | 15f SQLite | 15l SQLite | 15o SQLite | 15q SQLite | 15o verdict | 15q verdict |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1000 | firstReadyMs | 613.300 | 581.800 | 573.580 | 573.160 | PASS | PLATFORM-BOUND |
| 1000 | relaunchReadyMs | 1666.660 | 1913.320 | 1772.540 | 1886.960 | PLATFORM-BOUND | FAIL |
| 1000 | heapTodosMb | 5.388 | 5.381 | 5.385 | 5.358 | CODE-BOUND | CODE-BOUND |
| 1000 | heapNotesMb | 6.106 | 6.087 | 6.088 | 6.083 | CODE-BOUND | CODE-BOUND |
| 1000 | heapRelaunchMb | 4.979 | 4.943 | 4.929 | 4.933 | CODE-BOUND | CODE-BOUND |
| 1000 | pssTotalMb | 238.683 | 238.907 | 237.623 | 238.364 | PLATFORM-BOUND | PLATFORM-BOUND |
| 1000 | pssRelaunchTotalMb | 223.637 | 222.777 | 222.687 | 222.486 | PLATFORM-BOUND | PASS |
| 1000 | toggleP50 | 19.800 | 16.920 | 18.020 | 17.000 | FAIL | FAIL |
| 1000 | toggleP95 | 62.760 | 52.040 | 50.340 | 54.020 | FAIL | FAIL |
| 1000 | emitP50 | 4.940 | 4.060 | 4.000 | 4.040 | FAIL | FAIL |
| 1000 | emitP95 | 8.840 | 7.020 | 6.600 | 6.100 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | firstReadyMs | 807.040 | 782.120 | 825.840 | 778.580 | PASS | FAIL |
| 10000 | relaunchReadyMs | 1689.720 | 1860.720 | 1803.480 | 1852.920 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | heapTodosMb | 5.403 | 5.385 | 5.394 | 5.363 | PASS | PASS |
| 10000 | heapNotesMb | 6.118 | 6.097 | 6.105 | 6.094 | PASS | PASS |
| 10000 | heapRelaunchMb | 4.987 | 4.940 | 4.947 | 4.921 | PASS | PASS |
| 10000 | pssTotalMb | 246.026 | 247.100 | 246.238 | 246.804 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | pssRelaunchTotalMb | 225.483 | 223.713 | 223.284 | 223.392 | PASS | PASS |
| 10000 | toggleP50 | 19.100 | 15.000 | 15.840 | 16.300 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | toggleP95 | 55.420 | 47.800 | 49.640 | 48.500 | FAIL | FAIL |
| 10000 | emitP50 | 4.560 | 4.000 | 4.020 | 3.960 | FAIL | FAIL |
| 10000 | emitP95 | 7.600 | 7.460 | 6.820 | 6.200 | PLATFORM-BOUND | PLATFORM-BOUND |
| 50000 | firstReadyMs | 1831.220 | 1877.940 | 1820.780 | 1804.440 | FAIL | FAIL |
| 50000 | relaunchReadyMs | 1886.040 | 2138.460 | 2057.820 | 2031.920 | FAIL | FAIL |
| 50000 | heapTodosMb | 5.400 | 5.394 | 5.398 | 5.368 | PASS | PASS |
| 50000 | heapNotesMb | 6.125 | 6.104 | 6.116 | 6.106 | PASS | PASS |
| 50000 | heapRelaunchMb | 4.993 | 4.961 | 4.949 | 4.921 | PASS | PASS |
| 50000 | pssTotalMb | 243.352 | 244.788 | 243.945 | 244.243 | PLATFORM-BOUND | PLATFORM-BOUND |
| 50000 | pssRelaunchTotalMb | 225.502 | 223.256 | 222.732 | 223.284 | PASS | PASS |
| 50000 | toggleP50 | 19.000 | 16.460 | 14.800 | 16.660 | PASS | PASS |
| 50000 | toggleP95 | 59.620 | 50.420 | 48.660 | 52.680 | PASS | PASS |
| 50000 | emitP50 | 4.700 | 4.060 | 4.100 | 4.280 | FAIL | PLATFORM-BOUND |
| 50000 | emitP95 | 8.060 | 7.340 | 7.200 | 6.240 | PLATFORM-BOUND | PLATFORM-BOUND |

Remaining FAIL:1k relaunchReady,toggleP50/P95,emitP50;10k firstReady,toggleP95,emitP50;50k firstReady,relaunchReady. Three1k heap metrics remainCODE-BOUND and do not satisfy the user requirement. All unfavorable samples retained. Continue located-cost investigations; no unchanged acceptance rerun.

Post-device checks pass:349library/20tool/1harness/26e2e tests andlibrarybuild; logs `.tmp/15q-post-*`. Verification `.tmp/15q-verify.cjs` validates all means/sampleSD/controlprovenance/counts; its printed status comparison uses15l, while the outcome table above explicitly includes15o/l/f.
