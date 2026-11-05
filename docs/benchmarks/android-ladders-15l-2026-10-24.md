# Phase 15l loaded static signal views

Two reversed sweeps A1/B1/B2/A2 compare baseline15k with the loaded-static-source fallback-view optimization. All eight size observations and four200-emission probes completed. Diagnostic one-trial verdicts are not acceptance.

| Size | Metric | A1 | B1 | B1 - A1 | B2 | A2 | B2 - A2 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1000 | firstReadyMs | 641.300 | 547.100 | -94.200 | 558.600 | 554.400 | 4.200 |
| 1000 | relaunchReadyMs | 2006.400 | 1873.800 | -132.600 | 2009.800 | 2051.300 | -41.500 |
| 1000 | emitP50 | 4.200 | 4.100 | -0.100 | 4.000 | 4.200 | -0.200 |
| 1000 | emitP95 | 7.600 | 6.600 | -1.000 | 6.600 | 7.000 | -0.400 |
| 1000 | heapRelaunchMb | 4.982 | 4.973 | -0.009 | 4.973 | 4.919 | 0.053 |
| 10000 | firstReadyMs | 814.200 | 804.600 | -9.600 | 757.400 | 761.200 | -3.800 |
| 10000 | relaunchReadyMs | 1780.700 | 1807.400 | 26.700 | 1882.200 | 1852.200 | 30.000 |
| 10000 | emitP50 | 4.400 | 4.000 | -0.400 | 4.000 | 4.300 | -0.300 |
| 10000 | emitP95 | 7.600 | 6.800 | -0.800 | 7.000 | 10.100 | -3.100 |
| 10000 | heapRelaunchMb | 4.919 | 4.973 | 0.054 | 4.977 | 4.980 | -0.004 |

## Instrumented 1k emission probe

| Step | Total p50 ms | Native p50 ms | Non-native overhead p50 ms |
| --- | ---: | ---: | ---: |
| A1 | 4.300 | 3.500 | 0.900 |
| B1 | 4.300 | 3.500 | 0.700 |
| B2 | 4.100 | 3.500 | 0.600 |
| A2 | 4.400 | 3.500 | 0.900 |

Non-native overhead is computed per emission before taking its percentile; it is not the difference between marginal medians. Wrapper instrumentation perturbs these diagnostics. Raw replay of the same UPDATE happens only after store emissions and is not a new floor.

The candidate removes six unnecessary default-view rebuilds in the regression. Native medians remain3.5ms in all four probes, while non-native medians fall0.9->0.7 and0.9->0.6ms. Normal benchmark emission medians improve in both directions at both sizes. Startup results remain mixed; no general startup gain is claimed. Retain for measured reduction in emission work and run full clean-session acceptance with fresh matching controls.

Baseline SHA-256: `0284a6e0879685afdd9b3a117c9d3495c52a4d1f29eaebd829b57828e948c1be`. Candidate SHA-256: `312eebbdc6e80b52743a0e84a1bd4bffadfc6e64b69799d3f4b28de7538778b4`. Raw observations `.tmp/15l-ab-{A1,B1,B2,A2}.json`; probes `.tmp/15l-emission-{A1,B1,B2,A2}.json`; logs `.tmp/15l-ab.stdout.log` and `.tmp/15l-ab.stderr.log`.

## Full acceptance

Session `15l-audit-1792814281`: **10 PASS /12 PLATFORM-BOUND /3 CODE-BOUND /8 FAIL**. All30 observations,66 summary groups,33 verdicts,4 control files and APK hashes verified. See [session record](android-session-15l-2026-10-24.json). CODE-BOUND is separate from the user's required categories, so the goal remains unmet.

| Size | Metric | 15k SQLite | 15l SQLite | 15k verdict | 15l verdict |
| --- | --- | ---: | ---: | --- | --- |
| 1000 | firstReadyMs | 589.480 | 581.800 | PLATFORM-BOUND | PLATFORM-BOUND |
| 1000 | relaunchReadyMs | 1770.520 | 1913.320 | PLATFORM-BOUND | PLATFORM-BOUND |
| 1000 | heapTodosMb | 5.394 | 5.381 | CODE-BOUND | CODE-BOUND |
| 1000 | heapNotesMb | 6.104 | 6.087 | CODE-BOUND | CODE-BOUND |
| 1000 | heapRelaunchMb | 4.956 | 4.943 | CODE-BOUND | CODE-BOUND |
| 1000 | pssTotalMb | 237.388 | 238.907 | PLATFORM-BOUND | PLATFORM-BOUND |
| 1000 | pssRelaunchTotalMb | 222.420 | 222.777 | PLATFORM-BOUND | FAIL |
| 1000 | toggleP50 | 17.160 | 16.920 | FAIL | FAIL |
| 1000 | toggleP95 | 53.400 | 52.040 | FAIL | FAIL |
| 1000 | emitP50 | 4.240 | 4.060 | FAIL | PLATFORM-BOUND |
| 1000 | emitP95 | 7.200 | 7.020 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | firstReadyMs | 826.920 | 782.120 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | relaunchReadyMs | 1803.620 | 1860.720 | FAIL | FAIL |
| 10000 | heapTodosMb | 5.401 | 5.385 | PASS | PASS |
| 10000 | heapNotesMb | 6.122 | 6.097 | PASS | PASS |
| 10000 | heapRelaunchMb | 4.981 | 4.940 | PASS | PASS |
| 10000 | pssTotalMb | 245.707 | 247.100 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | pssRelaunchTotalMb | 222.500 | 223.713 | PASS | PASS |
| 10000 | toggleP50 | 16.620 | 15.000 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | toggleP95 | 49.780 | 47.800 | FAIL | FAIL |
| 10000 | emitP50 | 4.200 | 4.000 | FAIL | PLATFORM-BOUND |
| 10000 | emitP95 | 7.180 | 7.460 | PLATFORM-BOUND | PLATFORM-BOUND |
| 50000 | firstReadyMs | 1834.660 | 1877.940 | PLATFORM-BOUND | FAIL |
| 50000 | relaunchReadyMs | 2027.200 | 2138.460 | FAIL | FAIL |
| 50000 | heapTodosMb | 5.412 | 5.394 | PASS | PASS |
| 50000 | heapNotesMb | 6.134 | 6.104 | PASS | PASS |
| 50000 | heapRelaunchMb | 4.983 | 4.961 | PASS | PASS |
| 50000 | pssTotalMb | 243.565 | 244.788 | PLATFORM-BOUND | PLATFORM-BOUND |
| 50000 | pssRelaunchTotalMb | 222.528 | 223.256 | PASS | PASS |
| 50000 | toggleP50 | 16.220 | 16.460 | PASS | PASS |
| 50000 | toggleP95 | 50.540 | 50.420 | PASS | PASS |
| 50000 | emitP50 | 4.320 | 4.060 | FAIL | FAIL |
| 50000 | emitP95 | 7.800 | 7.340 | PLATFORM-BOUND | PLATFORM-BOUND |

Units: latency ms,memory MiB. Comparisons across independent sessions are not causal estimates. 1k/10k emission p50 now qualifies; eight other metrics still fail, including50k emission and startup/relaunch. No floor was broadened. Next scratch-database experiment compares JSON-text row iteration with binary JSON iteration while preserving stored JSON text, schema, indexes, wire format and byte caps.
