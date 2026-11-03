# Phase15o promoted entity membership index

ADR0077 records a collection-wide scan for each promoted-row check, even when no entities are promoted. The initial successful single-index diagnostic measures8.657->2.490ms mean; the corrected setup measures8.993->2.390ms, six alternating pairs, identical results. The partial index on `coll WHERE data=''` provides a covering membership lookup. Full corrected raw data: [native query ladder](android-promoted-index-ladder-15o-2026-10-24.json). The other JSON-type covering and forced-count probes remain diagnostic and are excluded from production. None of these numbers are application acceptance results.

Initial multi-DDL probe setup used the wrong delimiter for this plugin; later statements were skipped. The failed first covering probe also did not export completed in-memory samples. All available logs/source remain in `.tmp/15o-query-index-*`; these incomplete records support no covering-index comparison. Corrected v2 executes DDL separately, checks index definitions, saves each completed record immediately to JSONL and verifies all scratch indexes removed. No acceptance trial was discarded.

Migration4 adds only the promoted-membership index. A populated-v3 upgrade regression failed before implementation, then passes with exact rows, collection isolation, covering plan and inline/promoted/delete transitions verified.348 library tests,26e2e tests,library/sqliteAPK builds pass. Logs `.tmp/15o-{red,tests,tests-confirm,e2e,library-build,apk-build}.log`; the first full test run required updating the schema inventory expectation for the new index.

Application timing pending. Active `.tmp/15o-ab.sh` PID39212: explicitly installs candidate and proves schema4/50000 rows/covering query plan in `.tmp/15o-candidate-proof.json`; then50k A1/B1/B2/A2 with separate verified coldboot+60s settle EACH. Baseline `.tmp/15o-baseline/sqlite.apk` is15n; candidate `.tmp/15o-candidate/sqlite.apk`. Raw `.tmp/15o-fresh-{A1,B1,B2,A2}.json`. Single-trial verdicts invalid for acceptance. Latest full15l10PASS/12PB/3CB/8FAIL remains; Phase16 gated, CODE-BOUND separate.

## Reversed APK result

All4 observations verified: matching session/APK SHA-256, one50k SQLite trial each,30 finite toggles/200 finite emissions,11 finite metrics,4 distinct coldboot IDs and exit0.

| Metric | A1 | B1 | B1 - A1 | B2 | A2 | B2 - A2 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| firstReadyMs | 2035.700 | 1968.600 | -67.100 | 1874.500 | 1947.700 | -73.200 |
| relaunchReadyMs | 2272.400 | 2043.600 | -228.800 | 2190.300 | 2046.100 | 144.200 |
| toggleP50 | 16.200 | 19.700 | 3.500 | 17.100 | 16.800 | 0.300 |
| toggleP95 | 43.600 | 46.100 | 2.500 | 55.200 | 47.400 | 7.800 |
| emitP50 | 4.000 | 4.000 | 0.000 | 3.900 | 4.200 | -0.300 |
| pssTotalMb | 242.314 | 242.385 | 0.070 | 242.862 | 244.397 | -1.535 |
| pssRelaunchTotalMb | 226.051 | 225.833 | -0.218 | 223.637 | 223.982 | -0.346 |

First-ready improves67.1/73.2ms in both directions. Relaunch is mixed(-228.8/+144.2ms), toggleP95 is worse2.5/7.8ms, emission roughly unchanged0/-0.3ms. Single-trial differences do not establish a causal improvement/regression for each metric. Retain the candidate for native scan elimination and repeated first-ready direction, then run fresh matched controls and full acceptance; no verdict based on these one-trial reports. Baseline SHA-256 `052d511bd6f9d13c5ffafbb82e9dc23e16f346540cbf0cd820fe654db5de8f00`; candidate `47ae02d0d89e7dbfdddc65946550b89ae5a0e3ded2367d7fc611a67f3ee2f65a`. All observations retained.

## Fresh full acceptance in progress

Runner `.tmp/15o-audit.sh` PID13260, logs `.tmp/15o-audit.stdout.log/.stderr.log`: verified coldboot, explicit installation of both cached APKs, five paired workload code controls, floor controls, empty-plugin controls and render controls; then verified reboot and five acceptance trial pairs with reboot-between. Verify all4controls/session/APK provenance,30 valid observations,66 means/sample-SD summaries and33 verdicts when PIPELINE_DONE appears. Keep all errors/samples and compare15l/f honestly. No builds/tests/profilers alongside device measurement. Latest full score remains15l pending completion; no success claim.

## Full acceptance outcome

**12 PASS /10 PLATFORM-BOUND /0 BRIDGE-BOUND /3 CODE-BOUND /8 FAIL**. PIPELINE_DONE and exit0; all30 observations,66 independently recomputed means/sample SDs,33 unique verdicts, four control session/device/APK provenances and six distinct boot IDs verified. [Session verification](android-session-15o-2026-10-24.json).

15l was10 PASS/12 PB/3 CB/8 FAIL;15f was13 PASS/12 PB/2 CB/6 FAIL. These are independent sessions, not causal A/B estimates.1k/10k first-ready become PASS;1k relaunchPSS and10k relaunch qualify, while1k/10k emission p50 regress to FAIL as allowances change. Qualified metrics remain22/33 versus15l; CODE-BOUND remains separate, so the goal is unmet and Phase16 stays gated.

| Size | Metric | 15f SQLite | 15l SQLite | 15o SQLite | 15l verdict | 15o verdict |
| --- | --- | ---: | ---: | ---: | --- | --- |
| 1000 | firstReadyMs | 613.300 | 581.800 | 573.580 | PLATFORM-BOUND | PASS |
| 1000 | relaunchReadyMs | 1666.660 | 1913.320 | 1772.540 | PLATFORM-BOUND | PLATFORM-BOUND |
| 1000 | heapTodosMb | 5.388 | 5.381 | 5.385 | CODE-BOUND | CODE-BOUND |
| 1000 | heapNotesMb | 6.106 | 6.087 | 6.088 | CODE-BOUND | CODE-BOUND |
| 1000 | heapRelaunchMb | 4.979 | 4.943 | 4.929 | CODE-BOUND | CODE-BOUND |
| 1000 | pssTotalMb | 238.683 | 238.907 | 237.623 | PLATFORM-BOUND | PLATFORM-BOUND |
| 1000 | pssRelaunchTotalMb | 223.637 | 222.777 | 222.687 | FAIL | PLATFORM-BOUND |
| 1000 | toggleP50 | 19.800 | 16.920 | 18.020 | FAIL | FAIL |
| 1000 | toggleP95 | 62.760 | 52.040 | 50.340 | FAIL | FAIL |
| 1000 | emitP50 | 4.940 | 4.060 | 4.000 | PLATFORM-BOUND | FAIL |
| 1000 | emitP95 | 8.840 | 7.020 | 6.600 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | firstReadyMs | 807.040 | 782.120 | 825.840 | PLATFORM-BOUND | PASS |
| 10000 | relaunchReadyMs | 1689.720 | 1860.720 | 1803.480 | FAIL | PLATFORM-BOUND |
| 10000 | heapTodosMb | 5.403 | 5.385 | 5.394 | PASS | PASS |
| 10000 | heapNotesMb | 6.118 | 6.097 | 6.105 | PASS | PASS |
| 10000 | heapRelaunchMb | 4.987 | 4.940 | 4.947 | PASS | PASS |
| 10000 | pssTotalMb | 246.026 | 247.100 | 246.238 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | pssRelaunchTotalMb | 225.483 | 223.713 | 223.284 | PASS | PASS |
| 10000 | toggleP50 | 19.100 | 15.000 | 15.840 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | toggleP95 | 55.420 | 47.800 | 49.640 | FAIL | FAIL |
| 10000 | emitP50 | 4.560 | 4.000 | 4.020 | PLATFORM-BOUND | FAIL |
| 10000 | emitP95 | 7.600 | 7.460 | 6.820 | PLATFORM-BOUND | PLATFORM-BOUND |
| 50000 | firstReadyMs | 1831.220 | 1877.940 | 1820.780 | FAIL | FAIL |
| 50000 | relaunchReadyMs | 1886.040 | 2138.460 | 2057.820 | FAIL | FAIL |
| 50000 | heapTodosMb | 5.400 | 5.394 | 5.398 | PASS | PASS |
| 50000 | heapNotesMb | 6.125 | 6.104 | 6.116 | PASS | PASS |
| 50000 | heapRelaunchMb | 4.993 | 4.961 | 4.949 | PASS | PASS |
| 50000 | pssTotalMb | 243.352 | 244.788 | 243.945 | PLATFORM-BOUND | PLATFORM-BOUND |
| 50000 | pssRelaunchTotalMb | 225.502 | 223.256 | 222.732 | PASS | PASS |
| 50000 | toggleP50 | 19.000 | 16.460 | 14.800 | PASS | PASS |
| 50000 | toggleP95 | 59.620 | 50.420 | 48.660 | PASS | PASS |
| 50000 | emitP50 | 4.700 | 4.060 | 4.100 | FAIL | FAIL |
| 50000 | emitP95 | 8.060 | 7.340 | 7.200 | PLATFORM-BOUND | PLATFORM-BOUND |

Remaining FAILs:1k toggleP50/P95; allthree emitP50;10k toggleP95;50k firstReady/relaunchReady. Three1k heap metrics remain CODE-BOUND. No floor broadened; render pair samples remain diagnostic only. Continue measured implementation attempts.

Post-device validation:348 library/20 tool/1 harness/26e2e tests pass; library build passes. Logs `.tmp/15o-post-*`. Verification script `.tmp/15o-verify.cjs` recomputes all summaries and validates provenance/counts.
