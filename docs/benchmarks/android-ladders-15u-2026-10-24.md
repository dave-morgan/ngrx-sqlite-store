# Phase15u direct internal deletes

ADR0080 tests a native-plugin first-token heuristic: ordinary DELETE performs sync-metadata catalog checks although the three reserved nss tables have no sync columns. Prefixing the no-return RowWriter write with `/*nss*/ ` retains the SQLite operation and bindings while avoiding that rewrite path on writable Android. Optional driver/executor capability defaultsfalse; other platforms/custom drivers/arbitrary SQL/returning-query deletes keep current paths. Prefix occurs before engine transport-byte accounting, preserving transaction/caps/notifications and stored representation.

Native diagnostic:60 alternating pairs of six no-op internal deletes, zero changes and identical before/after table counts. Plain/comment mean17.147/7.257ms,median16.8/7.1ms,p95 20.1/8.3ms; all60 pairs improve. [Raw ladder](android-delete-ladder-15u-2026-10-24.json). No application qualification inferred.

Two regressions fail before implementation (missing Android capability/prefix). Full RowWriter suite runs false/true, with actual subtree deletion, quoted bound paths, neighbor preservation and failed-batch rollback.371 library tests/26e2e/library+SQLiteAPKbuilds pass; `.tmp/15u-{red,tests,e2e,library-build,apk-build}.log`.

Completed `.tmp/15u-ab.sh` PID40840 logs `.tmp/15u-ab.stdout.log/.stderr.log`. First explicitly installs candidate and proves1000 rows survive deliberate rollback, then library Reset deletes them and actual no-return DELETE statements carry the prefix (`.tmp/15u-candidate-proof.json`). Then reversed A1/B1/B2/A2 at1k+10k+50k EACH separate verified coldboot+60s settle. Raw `.tmp/15u-fresh-{A1,B1,B2,A2}.json`,12sizeobservations expected. Baseline `.tmp/15u-baseline/sqlite.apk` is15s; candidate `.tmp/15u-candidate/sqlite.apk`. Single-trial verdicts invalid; compare both directions and preserve regressions. No full acceptance or general speedup claim yet.

15t Java capture cannot pair60JS writes with only initial native entries; raw trace/error/initial analysis/SDK dump retained. Its open stack and installed source locate the DELETE checks, but no whole-run CPU attribution is claimed. Latest FULL15s11PASS/11PB/3CB/8FAIL,22/33qualified;Phase16gated,CODE-BOUND separate.

## Reversed application result

All12 observations/APK hashes/sessions/finite metrics/30toggles+200emissions each and4distinct boot IDs verified; exit0. Actual candidate delete/rollback proof matches candidatehash. Single-trial verdicts unused.

| Size | Metric | A1 | B1 | B1 - A1 | B2 | A2 | B2 - A2 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1000 | firstReadyMs | 621.300 | 550.200 | -71.100 | 526.800 | 612.900 | -86.100 |
| 1000 | relaunchReadyMs | 1685.300 | 1763.500 | 78.200 | 1811.300 | 2097.400 | -286.100 |
| 1000 | toggleP50 | 15.600 | 16.200 | 0.600 | 20.300 | 17.400 | 2.900 |
| 1000 | toggleP95 | 42.300 | 44.300 | 2.000 | 47.700 | 70.400 | -22.700 |
| 1000 | emitP50 | 4.700 | 3.900 | -0.800 | 4.000 | 3.900 | 0.100 |
| 1000 | pssTotalMb | 237.959 | 235.586 | -2.373 | 233.103 | 237.078 | -3.976 |
| 1000 | pssRelaunchTotalMb | 223.068 | 223.042 | -0.026 | 220.536 | 222.035 | -1.499 |
| 10000 | firstReadyMs | 874.700 | 740.400 | -134.300 | 762.900 | 787.900 | -25.000 |
| 10000 | relaunchReadyMs | 1882.700 | 1833.800 | -48.900 | 1983.100 | 2460.500 | -477.400 |
| 10000 | toggleP50 | 15.600 | 16.600 | 1.000 | 14.700 | 14.100 | 0.600 |
| 10000 | toggleP95 | 38.700 | 56.900 | 18.200 | 45.800 | 55.900 | -10.100 |
| 10000 | emitP50 | 3.900 | 3.900 | 0.000 | 4.000 | 3.900 | 0.100 |
| 10000 | pssTotalMb | 247.663 | 244.196 | -3.467 | 242.093 | 246.367 | -4.274 |
| 10000 | pssRelaunchTotalMb | 225.040 | 222.887 | -2.153 | 220.664 | 222.354 | -1.690 |
| 50000 | firstReadyMs | 1814.600 | 1712.600 | -102.000 | 1726.500 | 1814.200 | -87.700 |
| 50000 | relaunchReadyMs | 1995.300 | 1925.300 | -70.000 | 1957.400 | 2183.300 | -225.900 |
| 50000 | toggleP50 | 15.800 | 16.100 | 0.300 | 16.800 | 16.000 | 0.800 |
| 50000 | toggleP95 | 50.000 | 58.800 | 8.800 | 45.900 | 51.800 | -5.900 |
| 50000 | emitP50 | 3.900 | 3.900 | 0.000 | 3.900 | 3.800 | 0.100 |
| 50000 | pssTotalMb | 245.721 | 242.081 | -3.640 | 239.729 | 243.318 | -3.590 |
| 50000 | pssRelaunchTotalMb | 223.272 | 222.788 | -0.484 | 220.902 | 222.102 | -1.199 |

First-ready improves in both directions at every size:1k71.1/86.1ms,10k134.3/25.0ms,50k102.0/87.7ms. Relaunch/toggle tails are mixed; A2 relaunch is materially slower than A1 even for the unchanged baseline, so do not attribute all relaunch differences to code. All regressions retained. Retain for native work elimination and repeated startup improvement, then run fresh matched controls/full acceptance to evaluate all metrics. No application qualification inferred from one-trial verdict counts.

## Full matched acceptance outcome

Runner completed PIPELINE_DONE/PIPELINE_EXIT=0. Independent verification checks30 unique valid observations (five per implementation/size),66 recomputed means/sample SDs,33 unique verdicts, all four controls with matching session/device/SDK/WebView/APK provenance, six distinct boot IDs and cached/archived APK hashes. [Verification](android-session-15u-2026-10-24.json); [full report](android-parity-15u-2026-10-24.md).

| Phase | PASS | PLATFORM-BOUND | CODE-BOUND | FAIL | Qualified /33 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 15f | 13 | 12 | 2 | 6 | 25 |
| 15l | 10 | 12 | 3 | 8 | 22 |
| 15o | 12 | 10 | 3 | 8 | 22 |
| 15q | 11 | 10 | 3 | 9 | 21 |
| 15s | 11 | 11 | 3 | 8 | 22 |
| 15u | 11 | 11 | 3 | 8 | 22 |

All33 SQLite means and statuses versus15s follow. Separate sessions and newly measured controls/classic SDs prevent attributing every difference to implementation. Historical15f used earlier workload controls; its counts are historical evidence, not interchangeable acceptance.

| Size | Metric | 15s mean | 15u mean | Delta | 15s status | 15u status |
| --- | --- | ---: | ---: | ---: | --- | --- |
| 1000 | firstReadyMs | 575.460 | 523.960 | -51.500 | PLATFORM-BOUND | PLATFORM-BOUND |
| 1000 | relaunchReadyMs | 1821.440 | 1756.100 | -65.340 | PLATFORM-BOUND | PLATFORM-BOUND |
| 1000 | heapTodosMb | 5.358 | 5.348 | -0.010 | CODE-BOUND | CODE-BOUND |
| 1000 | heapNotesMb | 6.080 | 6.097 | 0.017 | CODE-BOUND | CODE-BOUND |
| 1000 | heapRelaunchMb | 4.938 | 4.940 | 0.002 | CODE-BOUND | CODE-BOUND |
| 1000 | pssTotalMb | 238.426 | 236.509 | -1.917 | PLATFORM-BOUND | PLATFORM-BOUND |
| 1000 | pssRelaunchTotalMb | 222.952 | 224.728 | 1.776 | PLATFORM-BOUND | FAIL |
| 1000 | toggleP50 | 15.900 | 17.400 | 1.500 | FAIL | PLATFORM-BOUND |
| 1000 | toggleP95 | 51.580 | 49.400 | -2.180 | FAIL | FAIL |
| 1000 | emitP50 | 3.920 | 3.940 | 0.020 | PLATFORM-BOUND | PLATFORM-BOUND |
| 1000 | emitP95 | 6.080 | 5.780 | -0.300 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | firstReadyMs | 781.740 | 728.380 | -53.360 | PASS | PLATFORM-BOUND |
| 10000 | relaunchReadyMs | 1881.960 | 1808.880 | -73.080 | FAIL | PLATFORM-BOUND |
| 10000 | heapTodosMb | 5.372 | 5.357 | -0.015 | PASS | PASS |
| 10000 | heapNotesMb | 6.103 | 6.107 | 0.004 | PASS | PASS |
| 10000 | heapRelaunchMb | 4.937 | 4.915 | -0.022 | PASS | PASS |
| 10000 | pssTotalMb | 246.869 | 244.651 | -2.218 | PLATFORM-BOUND | FAIL |
| 10000 | pssRelaunchTotalMb | 222.785 | 223.678 | 0.893 | PASS | PASS |
| 10000 | toggleP50 | 16.700 | 15.320 | -1.380 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | toggleP95 | 51.800 | 42.800 | -9.000 | FAIL | FAIL |
| 10000 | emitP50 | 3.960 | 3.980 | 0.020 | FAIL | FAIL |
| 10000 | emitP95 | 6.000 | 5.760 | -0.240 | PLATFORM-BOUND | PLATFORM-BOUND |
| 50000 | firstReadyMs | 1802.680 | 1833.580 | 30.900 | FAIL | FAIL |
| 50000 | relaunchReadyMs | 2044.220 | 1973.260 | -70.960 | FAIL | FAIL |
| 50000 | heapTodosMb | 5.380 | 5.379 | -0.002 | PASS | PASS |
| 50000 | heapNotesMb | 6.107 | 6.117 | 0.010 | PASS | PASS |
| 50000 | heapRelaunchMb | 4.926 | 4.952 | 0.026 | PASS | PASS |
| 50000 | pssTotalMb | 244.763 | 242.942 | -1.821 | PLATFORM-BOUND | PASS |
| 50000 | pssRelaunchTotalMb | 222.849 | 223.916 | 1.068 | PASS | PASS |
| 50000 | toggleP50 | 16.300 | 16.240 | -0.060 | PASS | PASS |
| 50000 | toggleP95 | 43.320 | 49.240 | 5.920 | PASS | PASS |
| 50000 | emitP50 | 3.920 | 3.960 | 0.040 | FAIL | FAIL |
| 50000 | emitP95 | 5.980 | 5.800 | -0.180 | PLATFORM-BOUND | PLATFORM-BOUND |

Qualified total stays22/33. ToggleP50 at1k and relaunch at10k newly qualify, while1k relaunch PSS and10k PSS now fail.50k PSS changes PB to PASS. Eight failures and three heap CODE-BOUND results remain; CODE-BOUND does not satisfy the requested outcome. No floor changes or discarded samples. Retain15u for measured native work elimination and repeated reversed startup improvement; the full run does not establish general parity or a causal improvement for every metric. Phase16 remains gated.

Post-device validation passes371library/20tools/1harness/26e2e/librarybuild; logs `.tmp/15u-post-*`. No commit.
