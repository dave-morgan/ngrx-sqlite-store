# Phase 15k Android create/open experiment

Two reversed sweeps use baseline A (15j) and candidate B (Android create/open send pipeline) in A1/B1/B2/A2 order on one verified boot. All eight size observations completed without errors. One-trial reports are diagnostic, not acceptance verdicts.

| Size | Metric | A1 | B1 | B1 - A1 | B2 | A2 | B2 - A2 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1000 | firstReadyMs | 567.800 | 587.700 | 19.900 | 500.400 | 505.100 | -4.700 |
| 1000 | relaunchReadyMs | 1611.700 | 1600.600 | -11.100 | 1620.600 | 1658.900 | -38.300 |
| 1000 | heapRelaunchMb | 4.918 | 4.981 | 0.062 | 4.982 | 4.919 | 0.063 |
| 1000 | pssRelaunchTotalMb | 223.572 | 224.174 | 0.602 | 224.079 | 224.354 | -0.275 |
| 1000 | toggleP50 | 15.100 | 17.600 | 2.500 | 23.900 | 16.500 | 7.400 |
| 1000 | toggleP95 | 52.600 | 55.600 | 3.000 | 54.700 | 57.700 | -3.000 |
| 10000 | firstReadyMs | 733.300 | 701.400 | -31.900 | 690.700 | 708.200 | -17.500 |
| 10000 | relaunchReadyMs | 1793.400 | 1631.400 | -162.000 | 1606.700 | 1607.900 | -1.200 |
| 10000 | heapRelaunchMb | 4.918 | 4.920 | 0.002 | 4.983 | 4.980 | 0.002 |
| 10000 | pssRelaunchTotalMb | 224.564 | 224.160 | -0.404 | 224.637 | 224.239 | 0.397 |
| 10000 | toggleP50 | 17.500 | 16.700 | -0.800 | 18.500 | 15.900 | 2.600 |
| 10000 | toggleP95 | 52.200 | 40.500 | -11.700 | 62.700 | 50.200 | 12.500 |

Baseline SHA-256: `c5778281c6ee310476b10fe51647e0248f01abba9590a8021c6fce74a03009b3`. Candidate SHA-256: `0284a6e0879685afdd9b3a117c9d3495c52a4d1f29eaebd829b57828e948c1be`. Both A legs match their hash; both B legs match their hash. Raw data: `.tmp/15k-ab-{A1,B1,B2,A2}.json`; logs `.tmp/15k-ab.stdout.log` and `.tmp/15k-ab.stderr.log`.

At 10k, first-ready is lower in both reversed comparisons (31.9 and 17.5 ms). Relaunch is lower at both sizes in both comparisons, but differences range from 1.2 to 162 ms; this small diagnostic does not establish a reliable effect size. The 1k first-ready direction differs. A candidate startup trace will verify whether native sends overlap, and a full five-trial acceptance with matching controls is required before any parity claim.

## Full acceptance

Session `15k-audit-1792810706`: **10 PASS / 12 PLATFORM-BOUND / 3 CODE-BOUND / 8 FAIL**. All30 observations,66 summary groups,33 verdicts and four control provenances verified. Six distinct verified reboot IDs are in the [session record](android-session-15k-2026-10-24.json). These separate clean sessions do not isolate causal speedup; keep diagnostic A/B findings separate from classification changes.

| Size | Metric | 15f SQLite | 15i SQLite | 15k SQLite | 15k verdict |
| --- | --- | ---: | ---: | ---: | --- |
| 1000 | firstReadyMs | 613.300 | 570.960 | 589.480 | PLATFORM-BOUND |
| 1000 | relaunchReadyMs | 1666.660 | 1659.660 | 1770.520 | PLATFORM-BOUND |
| 1000 | heapTodosMb | 5.388 | 5.390 | 5.394 | CODE-BOUND |
| 1000 | heapNotesMb | 6.106 | 6.105 | 6.104 | CODE-BOUND |
| 1000 | heapRelaunchMb | 4.979 | 4.980 | 4.956 | CODE-BOUND |
| 1000 | pssTotalMb | 238.683 | 237.756 | 237.388 | PLATFORM-BOUND |
| 1000 | pssRelaunchTotalMb | 223.637 | 222.545 | 222.420 | PLATFORM-BOUND |
| 1000 | toggleP50 | 19.800 | 18.820 | 17.160 | FAIL |
| 1000 | toggleP95 | 62.760 | 51.400 | 53.400 | FAIL |
| 1000 | emitP50 | 4.940 | 4.100 | 4.240 | FAIL |
| 1000 | emitP95 | 8.840 | 6.820 | 7.200 | PLATFORM-BOUND |
| 10000 | firstReadyMs | 807.040 | 740.500 | 826.920 | PLATFORM-BOUND |
| 10000 | relaunchReadyMs | 1689.720 | 1670.340 | 1803.620 | FAIL |
| 10000 | heapTodosMb | 5.403 | 5.402 | 5.401 | PASS |
| 10000 | heapNotesMb | 6.118 | 6.115 | 6.122 | PASS |
| 10000 | heapRelaunchMb | 4.987 | 4.984 | 4.981 | PASS |
| 10000 | pssTotalMb | 246.026 | 246.268 | 245.707 | PLATFORM-BOUND |
| 10000 | pssRelaunchTotalMb | 225.483 | 222.820 | 222.500 | PASS |
| 10000 | toggleP50 | 19.100 | 16.780 | 16.620 | PLATFORM-BOUND |
| 10000 | toggleP95 | 55.420 | 55.940 | 49.780 | FAIL |
| 10000 | emitP50 | 4.560 | 4.120 | 4.200 | FAIL |
| 10000 | emitP95 | 7.600 | 7.000 | 7.180 | PLATFORM-BOUND |
| 50000 | firstReadyMs | 1831.220 | 1755.640 | 1834.660 | PLATFORM-BOUND |
| 50000 | relaunchReadyMs | 1886.040 | 1715.000 | 2027.200 | FAIL |
| 50000 | heapTodosMb | 5.400 | 5.405 | 5.412 | PASS |
| 50000 | heapNotesMb | 6.125 | 6.132 | 6.134 | PASS |
| 50000 | heapRelaunchMb | 4.993 | 4.981 | 4.983 | PASS |
| 50000 | pssTotalMb | 243.352 | 244.230 | 243.565 | PLATFORM-BOUND |
| 50000 | pssRelaunchTotalMb | 225.502 | 222.782 | 222.528 | PASS |
| 50000 | toggleP50 | 19.000 | 17.900 | 16.220 | PASS |
| 50000 | toggleP95 | 59.620 | 56.840 | 50.540 | PASS |
| 50000 | emitP50 | 4.700 | 4.180 | 4.320 | FAIL |
| 50000 | emitP95 | 8.060 | 6.920 | 7.800 | PLATFORM-BOUND |

Units: latency ms, memory MiB. User completion requirement remains unmet:8 FAIL and3 CODE-BOUND. No additional allowance adopted. Phase16 remains gated. Next experiment attributes emission overhead to native execution versus JS/store work; no unchanged-build acceptance rerun planned.
