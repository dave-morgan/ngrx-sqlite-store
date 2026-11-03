# Phase15s static scope reuse

ADR0079 precomputes non-query static source paths and reuses the scoped state tree while input identities remain unchanged. Existing readiness/default/query/dynamic/error and replacement-identity paths are retained. No schema/persistence/notification-order change.

The corrected regression fails with4 redundant scoped-root freezes after a sibling filter commit; candidate0, and append still updates selected items. Earlier relative-module spy attempts are unsupported by the Angular test runner and are retained in `.tmp/15s-red*.log`; the valid red is `.tmp/15s-red-freeze.log`.350 library tests/26e2e/library+SQLite APK builds pass; `.tmp/15s-{tests,e2e,library-build,apk-build}.log`.

ACTIVE `.tmp/15s-ab.sh` PID19792, logs `.tmp/15s-ab.stdout.log/.stderr.log`. A1/B1/B2/A2 at1k+10k EACH separate verified coldboot+60s settle; raw `.tmp/15s-fresh-{A1,B1,B2,A2}.json`. After each leg, a separate sequential1k200sample emission/native/JS probe writes `.tmp/15s-emission-{A1,B1,B2,A2}.json`. Its native wrapper is restored and raw updates replay only after measurement, harness data only; next leg clears the app. It is diagnostic, not acceptance or a floor.

Baseline `.tmp/15s-baseline/sqlite.apk` is15q SHA256fba1155916ec89c2621f5b598c92eb5018d942319b1418a67a4577eababf4376; candidate `.tmp/15s-candidate/sqlite.apk` SHA25695311386e048f6f1aee6535e1e6fbaaaf1eccffa29ce212cf19b1539165f751c. Timing pending; no speedup claimed. Latest full15q11PASS/10PB/3CB/9FAIL verified30observations/66summaries/33verdicts/all4controls. Postdevice349lib/20tools/1harness/26e2e/librarybuildpassed. Goal unmet,Phase16 gated,CODE-BOUND separate.

## Reversed APK and emission probes

Verified8 size observations/hash/session/4boots and200 finite samples per probe channel per leg; exit0. All raw reports preserved, one-trial verdicts unused.

| Size | Metric | A1 | B1 | B1 - A1 | B2 | A2 | B2 - A2 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1000 | firstReadyMs | 614.900 | 864.000 | 249.100 | 595.500 | 747.800 | -152.300 |
| 1000 | relaunchReadyMs | 1922.900 | 1820.000 | -102.900 | 1840.100 | 1853.900 | -13.800 |
| 1000 | toggleP50 | 14.000 | 17.100 | 3.100 | 17.600 | 18.200 | -0.600 |
| 1000 | toggleP95 | 43.800 | 49.400 | 5.600 | 58.200 | 33.900 | 24.300 |
| 1000 | emitP50 | 4.000 | 3.900 | -0.100 | 4.000 | 4.000 | 0.000 |
| 1000 | pssTotalMb | 238.078 | 237.966 | -0.112 | 239.306 | 237.512 | 1.794 |
| 1000 | pssRelaunchTotalMb | 223.617 | 223.310 | -0.308 | 223.111 | 222.845 | 0.267 |
| 10000 | firstReadyMs | 766.900 | 761.000 | -5.900 | 759.600 | 766.600 | -7.000 |
| 10000 | relaunchReadyMs | 2273.300 | 1817.800 | -455.500 | 1839.500 | 1878.400 | -38.900 |
| 10000 | toggleP50 | 16.800 | 14.100 | -2.700 | 13.400 | 15.800 | -2.400 |
| 10000 | toggleP95 | 42.200 | 54.400 | 12.200 | 34.200 | 49.000 | -14.800 |
| 10000 | emitP50 | 5.100 | 3.900 | -1.200 | 3.900 | 4.000 | -0.100 |
| 10000 | pssTotalMb | 247.385 | 247.295 | -0.090 | 249.940 | 247.051 | 2.890 |
| 10000 | pssRelaunchTotalMb | 223.217 | 223.929 | 0.712 | 223.756 | 223.090 | 0.666 |

| Probe median(ms) | A1 | B1 | B2 | A2 |
| --- | ---: | ---: | ---: | ---: |
| emission | 4.000 | 4.300 | 4.000 | 4.000 |
| native | 3.400 | 3.700 | 3.300 | 3.400 |
| overhead | 0.600 | 0.600 | 0.500 | 0.600 |
| rawSameStatement | 3.300 | 3.300 | 3.200 | 3.200 |

10k toggleP50 improves2.7/2.4ms;1k toggleP95 worsens5.6/24.3ms. Probe non-native p50 .6->.6/.5ms; native differs .3ms in the first pair and-.1ms in the second. These mixed observations do not establish general improvement or causal regression. Preserve all data and investigate1k dispatch/native/DOM spans with an explicitly diagnostic protocol before deciding on full acceptance. No floor changes and no repeated unchanged acceptance.

## Diagnostic1k tail attribution in progress

Runner `.tmp/15s-span-ab.sh` PID29140 logs `.tmp/15s-span-ab.stdout.log/.stderr.log`: explicitly installs each archived APK, reversed A1/B1/B2/A2 with a verified coldboot+60s settle per leg,120toggles at20ms gap. `.tmp/15s-toggle-spans-{A1,B1,B2,A2}.json` records dispatch/native-start/native-end/DOM spans, other native calls andrAFcallback timestamps. No CPU sampling. DOM mutations andrAF callbacks are not proof of painted frames and will not expand any floor. Errors preserve available partial records; spans are diagnostic only. Full acceptance deferred pending this investigation.

## Completed diagnostic toggle spans

All4hash-verified reports contain120 valid toggles each; four boot IDs verified. The wrapper exited2 after completing A2 because its script was edited while Bash was reading it, corrupting the subsequent read position. Original log is retained unchanged. Validate existing reports and restore cached candidate in a separate finalization (`.tmp/15s-span-finalization.json`); no timed measurements rerun and no fake exit0 marker.

| Phase median/p95(ms) | A1 | B1 | B2 | A2 |
| --- | ---: | ---: | ---: | ---: |
| total | 14.300 / 51.200 | 14.000 / 56.900 | 15.100 / 49.400 | 13.700 / 47.700 |
| toNative | 0.400 / 23.400 | 0.400 / 14.100 | 0.300 / 19.000 | 0.300 / 3.800 |
| native | 10.400 / 40.100 | 10.500 / 50.600 | 11.100 / 32.700 | 10.100 / 39.400 |
| afterNative | 2.100 / 5.500 | 1.900 / 5.500 | 1.800 / 7.600 | 2.000 / 6.600 |

Previous effect native response still pending at dispatch in11/9/10/6 of120 toggles(A1/B1/B2/A2). Candidate post-native median1.9/1.8ms versusbaseline2.1/2.0ms; native-response medians10.4/10.5/11.1/10.1ms and variable tails dominate. Native spans include bridge/UI scheduling and waiting, not just SQLite CPU; no exact cause or painted-frame claim. This does not establish a systematic JS post-commit slowdown from the scope change. Retain for proven allocation removal and proceed to fresh matched full acceptance, keeping all prior regressions in the evidence. No floor changed.

## Fresh full acceptance in progress

Runner `.tmp/15s-audit.sh` PID32920 logs `.tmp/15s-audit.stdout.log/.stderr.log`: matching code/floor/empty/render controls then5trialpairs withreboot-between. No other builds/tests/profilers/device work alongside it. Final checks:30observations/66recomputed summaries/33verdicts/allfour control provenances; compare15q/o/l/f and runpost-device validation before claiming results. Latest full remains15q11PASS/10PB/3CB/9FAIL until finished.

## Full acceptance outcome

**11 PASS /11 PLATFORM-BOUND /0 BRIDGE-BOUND /3 CODE-BOUND /8 FAIL**. Verified30observations/66independently recomputed means+sampleSD/33unique verdicts/four matching control provenances/six boot IDs; PIPELINE_DONE/exit0. [Session verification](android-session-15s-2026-10-24.json).

Qualified22/33 versus15q21/33 and15o22/33.1k relaunchReady andemitP50 qualify;10k relaunch and50k emitP50 becomeFAIL. Classification changes include same-session controls and classic variance, so independent sessions are not causal speedup estimates.10k firstReady PASS has a large classic SD; do not interpret it as robust startup parity. Keep only proven scoped allocation removal, goal unmet and Phase16 gated.

| Size | Metric | 15f SQLite | 15l SQLite | 15o SQLite | 15q SQLite | 15s SQLite | 15q verdict | 15s verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1000 | firstReadyMs | 613.300 | 581.800 | 573.580 | 573.160 | 575.460 | PLATFORM-BOUND | PLATFORM-BOUND |
| 1000 | relaunchReadyMs | 1666.660 | 1913.320 | 1772.540 | 1886.960 | 1821.440 | FAIL | PLATFORM-BOUND |
| 1000 | heapTodosMb | 5.388 | 5.381 | 5.385 | 5.358 | 5.358 | CODE-BOUND | CODE-BOUND |
| 1000 | heapNotesMb | 6.106 | 6.087 | 6.088 | 6.083 | 6.080 | CODE-BOUND | CODE-BOUND |
| 1000 | heapRelaunchMb | 4.979 | 4.943 | 4.929 | 4.933 | 4.938 | CODE-BOUND | CODE-BOUND |
| 1000 | pssTotalMb | 238.683 | 238.907 | 237.623 | 238.364 | 238.426 | PLATFORM-BOUND | PLATFORM-BOUND |
| 1000 | pssRelaunchTotalMb | 223.637 | 222.777 | 222.687 | 222.486 | 222.952 | PASS | PLATFORM-BOUND |
| 1000 | toggleP50 | 19.800 | 16.920 | 18.020 | 17.000 | 15.900 | FAIL | FAIL |
| 1000 | toggleP95 | 62.760 | 52.040 | 50.340 | 54.020 | 51.580 | FAIL | FAIL |
| 1000 | emitP50 | 4.940 | 4.060 | 4.000 | 4.040 | 3.920 | FAIL | PLATFORM-BOUND |
| 1000 | emitP95 | 8.840 | 7.020 | 6.600 | 6.100 | 6.080 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | firstReadyMs | 807.040 | 782.120 | 825.840 | 778.580 | 781.740 | FAIL | PASS |
| 10000 | relaunchReadyMs | 1689.720 | 1860.720 | 1803.480 | 1852.920 | 1881.960 | PLATFORM-BOUND | FAIL |
| 10000 | heapTodosMb | 5.403 | 5.385 | 5.394 | 5.363 | 5.372 | PASS | PASS |
| 10000 | heapNotesMb | 6.118 | 6.097 | 6.105 | 6.094 | 6.103 | PASS | PASS |
| 10000 | heapRelaunchMb | 4.987 | 4.940 | 4.947 | 4.921 | 4.937 | PASS | PASS |
| 10000 | pssTotalMb | 246.026 | 247.100 | 246.238 | 246.804 | 246.869 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | pssRelaunchTotalMb | 225.483 | 223.713 | 223.284 | 223.392 | 222.785 | PASS | PASS |
| 10000 | toggleP50 | 19.100 | 15.000 | 15.840 | 16.300 | 16.700 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | toggleP95 | 55.420 | 47.800 | 49.640 | 48.500 | 51.800 | FAIL | FAIL |
| 10000 | emitP50 | 4.560 | 4.000 | 4.020 | 3.960 | 3.960 | FAIL | FAIL |
| 10000 | emitP95 | 7.600 | 7.460 | 6.820 | 6.200 | 6.000 | PLATFORM-BOUND | PLATFORM-BOUND |
| 50000 | firstReadyMs | 1831.220 | 1877.940 | 1820.780 | 1804.440 | 1802.680 | FAIL | FAIL |
| 50000 | relaunchReadyMs | 1886.040 | 2138.460 | 2057.820 | 2031.920 | 2044.220 | FAIL | FAIL |
| 50000 | heapTodosMb | 5.400 | 5.394 | 5.398 | 5.368 | 5.380 | PASS | PASS |
| 50000 | heapNotesMb | 6.125 | 6.104 | 6.116 | 6.106 | 6.107 | PASS | PASS |
| 50000 | heapRelaunchMb | 4.993 | 4.961 | 4.949 | 4.921 | 4.926 | PASS | PASS |
| 50000 | pssTotalMb | 243.352 | 244.788 | 243.945 | 244.243 | 244.763 | PLATFORM-BOUND | PLATFORM-BOUND |
| 50000 | pssRelaunchTotalMb | 225.502 | 223.256 | 222.732 | 223.284 | 222.849 | PASS | PASS |
| 50000 | toggleP50 | 19.000 | 16.460 | 14.800 | 16.660 | 16.300 | PASS | PASS |
| 50000 | toggleP95 | 59.620 | 50.420 | 48.660 | 52.680 | 43.320 | PASS | PASS |
| 50000 | emitP50 | 4.700 | 4.060 | 4.100 | 4.280 | 3.920 | PLATFORM-BOUND | FAIL |
| 50000 | emitP95 | 8.060 | 7.340 | 7.200 | 6.240 | 5.980 | PLATFORM-BOUND | PLATFORM-BOUND |

RemainingFAIL:1k toggleP50/P95;10k relaunchReady,toggleP95,emitP50;50k firstReady,relaunchReady,emitP50. Three1k heap metrics remainCODE-BOUND, separate from required success. Post-device350library/20tool/1harness/26e2e tests andlibrarybuild pass, `.tmp/15s-post-*`. Continue native attribution before further implementation changes; no floor broadened.
