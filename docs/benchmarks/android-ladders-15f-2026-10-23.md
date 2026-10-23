# Phase 15f decomposition evidence, 2026-10-23

**13 PASS / 12 PLATFORM-BOUND / 0 BRIDGE-BOUND / 2 CODE-BOUND / 6 FAIL**, compared with 15e's 10 PASS / 9 PLATFORM-BOUND / 0 CODE-BOUND / 14 FAIL. Acceptance execution finished; Phase 15f parity remains incomplete and Phase 16 stays gated.

## Seed ladder

Source: [six-sample ladder](android-seed-ladder-50000-2026-10-23.json). SQLite 3.53.3, 50,000 rows, WAL, synchronous=NORMAL, 2,000 KiB cache. These diagnostics precede the final acceptance session. Elapsed times include bridge transport; they are not native CPU measurements.

| Variant | Mean ms | Sample SD ms | Calls | Wire bytes | Encode ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| floor | 1335.500 | 20.324 | 43 | 11112512 | 262.600 |
| int-embed | 985.083 | 24.278 | 34 | 8691663 | 250.100 |
| ent-string | 1498.400 | 18.636 | 46 | 11751789 | 312.200 |
| ent-embed | 1146.417 | 23.510 | 36 | 9330855 | 297.900 |
| ent-embed-order | 1209.333 | 15.257 | 36 | 9330855 | 274.300 |
| production | 1406.567 | 15.166 | 36 | 9330855 | 273.700 |
| ent-string-order-expr | 1760.983 | 21.602 | 46 | 11751789 | 274.300 |
| ent-string-order-cols | 1785.350 | 40.122 | 48 | 12396643 | 414.300 |
| ent-embed-order-cols | 1506.683 | 96.200 | 39 | 9975722 | 356.400 |
| entrow-embed-order-expr | 1371.733 | 17.252 | 36 | 9330855 | 245.400 |

The embedded minimal-table mean is 985.083 ms; production is 1406.567 ms. Their 421.483 ms difference locates key/index overhead. The rowid alternative is modestly faster in this isolated ladder; these data alone do not establish a repeatable end-to-end benefit or justify a persisted-schema change. ADR-0066 retains the production layout.

## Paired seed diagnostic

Sources: [before trace](android-seed-trace-50000-2026-10-23-p15f-before.json), [after trace](android-seed-trace-50000-2026-10-23-p15f-after.json). CPU profiling and byte counting perturb these runs; acceptance timings must be assessed independently.

| Span | Before ms | After ms |
| --- | ---: | ---: |
| Generate | 70.400 | 64.900 |
| Reduce | 2361.900 | 1696.600 |
| Total diagnostic hook | 2500.700 | 2147.800 |

Native calls overlap after pipelining, so summing their elapsed durations does not yield wall time or a speed comparison. ADR-0066 records the measured checkpoint and per-entity encoding costs and retained changes.

## Workload code control

Source: [five paired code-control trials](android-code-control-15f-2026-10-23.json). Session `15f-resume-1792751019`; 30 observations cover five trials, two implementations and three heap points. All three control files share this session and APK hashes. Measurements are MiB; data excludes V8 code, native backing stores and synthetic roots.

| Point | Classic code | SQLite code | Code delta | Classic data | SQLite data |
| --- | ---: | ---: | ---: | ---: | ---: |
| todos | 1.911 | 2.748 | 0.837 | 2.248 | 2.115 |
| notes | 2.177 | 3.056 | 0.879 | 2.264 | 2.135 |
| relaunch | 1.877 | 2.412 | 0.535 | 2.240 | 2.084 |

SQLite data means are below classic at all three control points. CODE-BOUND still requires the separate acceptance metric to satisfy ADR-0067; these control results alone do not assign a verdict.

## Acceptance provenance and interrupted setup

The original session `15f-final-1792750377` timed out at the profiled 10k reload in `android-floor-controls.mjs:87`. Its trace showed an unresolved createConnection. The partial floor output and original log are retained in `.tmp/android-floors-15f-interrupted.json` and `.tmp/15f-interrupted.log`. A separate 10k diagnostic completed with unchanged APKs; the startup hang has not been proven fixed. These observations are excluded from resumed acceptance.

Resumed session: `15f-resume-1792751019`. The runner reboots and settles the emulator before controls, then reboots and settles again before acceptance. No additional device runner, build, test suite or profiler is launched concurrently. Raw runner logs: `.tmp/15f-resume.stdout.log` and `.tmp/15f-resume.stderr.log`.

APK SHA-256:

- Classic: `5d70344ce90a2e8137ebfc0a7db49239bc0a4b86e2b23de2c7bed8a10fd4dc1a`
- SQLite: `cb2a50137da7dae400a892fbdd0d3ff2de099ab79e9dc502aef8e4bc21470d19`

The completed [floor controls](android-floors-15f-2026-10-23.json) cover 1k, 10k and 50k; the [empty-plugin controls](android-empty-15f-2026-10-23.json) have 20 observations. Acceptance verification confirmed matching hashes and 30 complete workload observations. Group means and sample SDs were recomputed from all raw observations. See the [session record](android-session-15f-2026-10-23.json).

## Outstanding evidence

The source artifacts currently linked here do not provide a full startup dependency graph, the complete commit ladder, or per-mapping native PSS attribution requested by the brief. Any remaining failures need further measured work; none is declared impossible by this report.

## Final acceptance and comparison

**13 PASS / 12 PLATFORM-BOUND / 0 BRIDGE-BOUND / 2 CODE-BOUND / 6 FAIL**, compared with 15e's 10 PASS / 9 PLATFORM-BOUND / 0 CODE-BOUND / 14 FAIL. Acceptance execution finished; Phase 15f parity remains incomplete and Phase 16 stays gated.

These are independent clean sessions, not isolated causal A/B estimates. The 50k SQLite first-ready mean fell 2928.440 -> 1831.220 ms (37.5%); relaunch means fell 1798.180 -> 1666.660, 1797.920 -> 1689.720 and 2013.600 -> 1886.040 ms at 1k/10k/50k. Classification changes also reflect classic SD and the ADR-0066 real-row/paced floors and ADR-0067 workload code control. The 10k first-ready PASS has a 536.886 ms classic SD. The 1k post-seed PSS becomes FAIL despite a lower SQLite mean because the same-session allowance narrowed. The 1k notes heap still exceeds the code allowance by 0.061 MiB; smaller control data does not justify widening the allowance.

| Size | Metric | 15e SQLite mean | 15f SQLite mean | 15e verdict | 15f verdict |
| --- | --- | ---: | ---: | --- | --- |
| 1000 | firstReadyMs | 652.600 | 613.300 | PASS | PLATFORM-BOUND |
| 1000 | relaunchReadyMs | 1798.180 | 1666.660 | FAIL | PLATFORM-BOUND |
| 1000 | heapTodosMb | 5.404 | 5.388 | FAIL | CODE-BOUND |
| 1000 | heapNotesMb | 6.125 | 6.106 | FAIL | FAIL |
| 1000 | heapRelaunchMb | 4.976 | 4.979 | FAIL | CODE-BOUND |
| 1000 | pssTotalMb | 239.284 | 238.683 | PLATFORM-BOUND | FAIL |
| 1000 | pssRelaunchTotalMb | 226.453 | 223.637 | FAIL | PASS |
| 1000 | toggleP50 | 21.560 | 19.800 | FAIL | FAIL |
| 1000 | toggleP95 | 64.160 | 62.760 | FAIL | FAIL |
| 1000 | emitP50 | 4.880 | 4.940 | PLATFORM-BOUND | PLATFORM-BOUND |
| 1000 | emitP95 | 7.280 | 8.840 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | firstReadyMs | 1057.020 | 807.040 | FAIL | PASS |
| 10000 | relaunchReadyMs | 1797.920 | 1689.720 | FAIL | PLATFORM-BOUND |
| 10000 | heapTodosMb | 5.413 | 5.403 | PASS | PASS |
| 10000 | heapNotesMb | 6.137 | 6.118 | PASS | PASS |
| 10000 | heapRelaunchMb | 4.975 | 4.987 | PASS | PASS |
| 10000 | pssTotalMb | 248.160 | 246.026 | FAIL | FAIL |
| 10000 | pssRelaunchTotalMb | 228.330 | 225.483 | PLATFORM-BOUND | PASS |
| 10000 | toggleP50 | 19.980 | 19.100 | FAIL | PLATFORM-BOUND |
| 10000 | toggleP95 | 59.460 | 55.420 | FAIL | FAIL |
| 10000 | emitP50 | 4.760 | 4.560 | PLATFORM-BOUND | PLATFORM-BOUND |
| 10000 | emitP95 | 7.300 | 7.600 | PLATFORM-BOUND | PLATFORM-BOUND |
| 50000 | firstReadyMs | 2928.440 | 1831.220 | FAIL | PLATFORM-BOUND |
| 50000 | relaunchReadyMs | 2013.600 | 1886.040 | FAIL | PLATFORM-BOUND |
| 50000 | heapTodosMb | 5.413 | 5.400 | PASS | PASS |
| 50000 | heapNotesMb | 6.149 | 6.125 | PASS | PASS |
| 50000 | heapRelaunchMb | 4.987 | 4.993 | PASS | PASS |
| 50000 | pssTotalMb | 245.019 | 243.352 | PLATFORM-BOUND | PASS |
| 50000 | pssRelaunchTotalMb | 228.485 | 225.502 | PASS | PASS |
| 50000 | toggleP50 | 19.500 | 19.000 | PASS | PASS |
| 50000 | toggleP95 | 62.720 | 59.620 | PASS | PASS |
| 50000 | emitP50 | 4.960 | 4.700 | PLATFORM-BOUND | PLATFORM-BOUND |
| 50000 | emitP95 | 7.760 | 8.060 | PLATFORM-BOUND | PLATFORM-BOUND |

## Remaining acceptance failures

| Size | Metric | 15e SQLite mean | 15f SQLite mean | Excess | Allowance | Uncovered |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1000 | heapNotesMb | 6.125 | 6.106 | 0.941 | 0.880 | 0.061 |
| 1000 | pssTotalMb | 239.284 | 238.683 | 14.041 | 4.385 | 9.656 |
| 1000 | toggleP50 | 21.560 | 19.800 | 16.580 | 11.800 | 4.780 |
| 1000 | toggleP95 | 64.160 | 62.760 | 53.460 | 22.169 | 31.291 |
| 10000 | pssTotalMb | 248.160 | 246.026 | 15.488 | 10.214 | 5.274 |
| 10000 | toggleP95 | 59.460 | 55.420 | 38.180 | 24.700 | 13.480 |

## Post-acceptance validation

Post-acceptance validation on 2026-10-24: 336 library tests, 18 tool tests, 1 harness test and 26 Playwright tests passed; library and both production-configured harness APK builds passed. Measured APKs are preserved under `.tmp/15f-accepted-apks/`; later build validation does not replace acceptance provenance. No commit.
