# Phase 15i control audit and acceptance

Session `15i-audit-1792807443` completed all 30 observations with no measurement errors. APK hashes match all four control files and 15h. No runtime library change was made between 15h and 15i.

Result: **10 PASS / 9 PLATFORM-BOUND / 3 CODE-BOUND / 11 FAIL**. Phase 15h was 12 PASS / 6 PB / 2 CB / 13 FAIL; Phase 15f was 13 PASS / 12 PB / 2 CB / 6 FAIL. Verdict counts vary with same-session controls and classic SD; this is not a causal performance comparison. The code-control workload correction explains the notes CODE-BOUND change; it is not a library memory reduction. Repaint pairs were recorded but not used as the toggle floor (ADR-0071).

| Size | Metric | 15f SQLite | 15h SQLite | 15i SQLite | 15i verdict |
| --- | --- | ---: | ---: | ---: | --- |
| 1000 | firstReadyMs | 613.300 | 687.800 | 570.960 | FAIL |
| 1000 | relaunchReadyMs | 1666.660 | 2003.800 | 1659.660 | FAIL |
| 1000 | heapTodosMb | 5.388 | 5.394 | 5.390 | CODE-BOUND |
| 1000 | heapNotesMb | 6.106 | 6.106 | 6.105 | CODE-BOUND |
| 1000 | heapRelaunchMb | 4.979 | 4.949 | 4.980 | CODE-BOUND |
| 1000 | pssTotalMb | 238.683 | 238.733 | 237.756 | PLATFORM-BOUND |
| 1000 | pssRelaunchTotalMb | 223.637 | 222.993 | 222.545 | FAIL |
| 1000 | toggleP50 | 19.800 | 24.840 | 18.820 | FAIL |
| 1000 | toggleP95 | 62.760 | 70.060 | 51.400 | FAIL |
| 1000 | emitP50 | 4.940 | 4.860 | 4.100 | PLATFORM-BOUND |
| 1000 | emitP95 | 8.840 | 7.580 | 6.820 | PLATFORM-BOUND |
| 10000 | firstReadyMs | 807.040 | 874.280 | 740.500 | PLATFORM-BOUND |
| 10000 | relaunchReadyMs | 1689.720 | 1948.580 | 1670.340 | FAIL |
| 10000 | heapTodosMb | 5.403 | 5.397 | 5.402 | PASS |
| 10000 | heapNotesMb | 6.118 | 6.125 | 6.115 | PASS |
| 10000 | heapRelaunchMb | 4.987 | 4.993 | 4.984 | PASS |
| 10000 | pssTotalMb | 246.026 | 246.458 | 246.268 | PLATFORM-BOUND |
| 10000 | pssRelaunchTotalMb | 225.483 | 223.454 | 222.820 | PASS |
| 10000 | toggleP50 | 19.100 | 22.500 | 16.780 | PLATFORM-BOUND |
| 10000 | toggleP95 | 55.420 | 72.900 | 55.940 | FAIL |
| 10000 | emitP50 | 4.560 | 4.800 | 4.120 | FAIL |
| 10000 | emitP95 | 7.600 | 7.720 | 7.000 | PLATFORM-BOUND |
| 50000 | firstReadyMs | 1831.220 | 1900.000 | 1755.640 | FAIL |
| 50000 | relaunchReadyMs | 1886.040 | 2089.300 | 1715.000 | FAIL |
| 50000 | heapTodosMb | 5.400 | 5.412 | 5.405 | PASS |
| 50000 | heapNotesMb | 6.125 | 6.130 | 6.132 | PASS |
| 50000 | heapRelaunchMb | 4.993 | 4.981 | 4.981 | PASS |
| 50000 | pssTotalMb | 243.352 | 243.298 | 244.230 | PLATFORM-BOUND |
| 50000 | pssRelaunchTotalMb | 225.502 | 223.847 | 222.782 | PASS |
| 50000 | toggleP50 | 19.000 | 20.000 | 17.900 | PASS |
| 50000 | toggleP95 | 59.620 | 59.540 | 56.840 | PASS |
| 50000 | emitP50 | 4.700 | 4.820 | 4.180 | FAIL |
| 50000 | emitP95 | 8.060 | 8.640 | 6.920 | PLATFORM-BOUND |

Latency units are ms; memory units are MiB. The three CODE-BOUND results are separate from PASS/platform-bound and do not satisfy the user's stated completion requirement. Eleven FAILs remain. Phase 16 stays gated.

## Next located cost

The 1k startup trace in `.tmp/startup-15i-1000.json` shows repeated reads of the absent router root. A regression in `compat/router-readback.spec.ts` reproduces two extra SQL reads for two unrelated actions even when PathCache already knows the router slice is absent. The next experiment avoids these reads by checking cache freshness separately from its undefined value; uncommitted writes still bypass the committed cache. No device speedup is claimed before paired measurement.
