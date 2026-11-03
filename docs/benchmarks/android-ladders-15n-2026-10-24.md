# Phase15n known write locations

Baseline50k persisted startup diagnostic `.tmp/startup-15n-50000.json` found two router root-position reads. Source inspection identified a repeated lookup when `diffWrite` discarded a known location on subtree replacement. A proven-absent feature root also already determines its default null parent/position. ADR0076 records the compatibility limits and design.

Both regressions failed before implementation:2/1 redundant SQL queries instead of0. After implementation347 library tests and26 e2e tests pass; library and SQLite APK builds pass. Logs `.tmp/15n-{red,tests,e2e-confirm,library-build,apk-build}.log`. The first e2e wrapper reported exit1 despite26 passed; rerunning through cmd captured explicit exit0 and26 passed. No failing test was hidden.

Runner `.tmp/15n-ab.sh` first installs the candidate and captures50k persisted startup diagnostic `.tmp/startup-15n-candidate-50000.json`. Its validation requires matching hash/session/readiness and router position queries2->0 before continuing. Then50k A1/B1/B2/A2 each receive a separate verified coldboot and60s settle. Raw `.tmp/15n-fresh-{A1,B1,B2,A2}.json`, plus outside-timing memory/CPU snapshots. One-trial verdict counts are invalid for acceptance. Outcome pending; no latency benefit claimed. Latest full acceptance remains15l10 PASS/12 PB/3 CB/8 FAIL; CODE-BOUND is separate and Phase16 remains gated.

Candidate trace verified:50k ready, matching SHA-256 `052d511bd6f9d13c5ffafbb82e9dc23e16f346540cbf0cd820fe654db5de8f00`, router position reads2->0 (`.tmp/15n-startup-proof.json`). Initial runner stopped before any A/B trial because the validation script incorrectly expected boolean readiness rather than `{total,ms}`. Logs `.tmp/15n-ab.stdout.log/.stderr.log` retained. Corrected the assertion to validate50000 rows and finite time; resumed ONLY the A/B legs via `.tmp/15n-ab-resume.sh` PID35272 logs `.tmp/15n-ab-resume.stdout.log/.stderr.log`. No diagnostic or acceptance sample discarded or rerun.

## Reversed APK outcome

All4 observations,APK/session provenance,finite metrics,30 toggles/200 emissions each and4 distinct boot IDs verified; exit0.

| Metric | A1 | B1 | B1 - A1 | B2 | A2 | B2 - A2 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| firstReadyMs | 1941.700 | 1909.400 | -32.300 | 2128.400 | 1940.200 | 188.200 |
| relaunchReadyMs | 2071.800 | 2120.000 | 48.200 | 2309.700 | 2261.900 | 47.800 |
| toggleP50 | 22.400 | 17.200 | -5.200 | 15.400 | 17.100 | -1.700 |
| toggleP95 | 48.100 | 58.700 | 10.600 | 53.500 | 47.200 | 6.300 |
| emitP50 | 4.100 | 4.100 | -0.000 | 5.000 | 4.100 | 0.900 |
| pssTotalMb | 241.755 | 241.621 | -0.134 | 241.113 | 243.437 | -2.323 |
| pssRelaunchTotalMb | 222.793 | 222.891 | 0.098 | 222.353 | 222.248 | 0.104 |

Startup is mixed(-32.3/+188.2ms); relaunch is slower48.2/47.8ms and toggleP95 slower10.6/6.3ms in both pairs. No general timing win is established, and these single-trial differences do not establish causality. Retain only for proven duplicate SQL removal and honoring an explicitly supplied location, not claimed speedup. No immediate unchanged full acceptance is justified by these timings. Continue investigating remaining costs before the next matched acceptance. All raw reports retained; latest full score unchanged.
