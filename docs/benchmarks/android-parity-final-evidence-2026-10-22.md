## Phase 15b evidence and reproducibility

Final verdicts: **11 PASS / 0 BRIDGE-BOUND / 1 PLATFORM-BOUND / 21 FAIL**. All remaining FAILs are retained and evidenced in [ADR-0050](../decisions/0050-phase15b-evidenced-parity-gaps.md), which supersedes ADR-0044. Completion uses the brief's explicit evidenced-ADR exception; universal parity remains unmet.

Both statistical runs used loggingBehavior=none, 30 independent process observations, five alternating paired trials and 1k/10k/50k sizes. The emulator was rebooted before each run. Old benchmark APKs were uninstalled before installation; both final uninstall commands succeeded. All builds and library/browser tests finished before final timed observations. No CPU profiling or dumpsys peak polling ran during them; lightweight host-only statistics and SQL syntax checks ran during the loop. All 30 final observations succeeded. No samples or outliers were removed.

The logging-off [re-baseline](android-parity-logging-off-2026-10-22.md) and the final run have different classic distributions. For example, baseline 1k first-ready passed with a much larger classic SD, while the faster final SQLite result fails against the tighter final classic bound. Verdict counts alone are not a causal before/after performance comparison.

| Size | SQLite first-ready baseline / final, ms | SQLite relaunch baseline / final, ms |
| --- | ---: | ---: |
| 1000 | 764.960 / 585.440 | 1816.880 / 1604.700 |
| 10000 | 1252.860 / 1090.060 | 2412.560 / 1787.940 |
| 50000 | 4102.800 / 3572.240 | 2034.540 / 1676.240 |

### Same-session bridge calibration

Every SQLite observation includes 200 echo calls and five repeats of executeSet payloads at 64 KiB, 256 KiB, 1 MiB and 4 MiB. Values below are averages of the five trial fits for that size. Raw echo SDs, intercepts, individual payload bytes/timings and settings are in the JSON sidecar. Effective bandwidth includes native insertion; it is not theoretical wire speed.

| Size | Echo RTT p50, ms | Fitted intercept, ms | Effective bytes/ms | Minimum Todo JSON bytes | Minimum byte transfer term, ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1000 | 2.080 | 8.735 | 31275.718 | 136210 | 4.355 |
| 10000 | 2.040 | 9.458 | 30852.003 | 1380887 | 44.758 |
| 50000 | 2.060 | 8.826 | 30074.333 | 6992197 | 232.497 |

Seed arithmetic uses two minimum calls at measured executeSet intercept plus minimum stored Todo JSON bytes/bandwidth. Relaunch uses one open and one subsequent read, without inventing native CPU/open allowances. Toggle and emit use one atomic commit at echo RTT. A toggle's effect also writes a count, but its overlapping call is not charged as a serialized DOM requirement. No dispatch metric qualifies for BRIDGE-BOUND in this run.

### Empty-plugin platform controls

Five alternating paired fresh-process controls ran in each APK (20 observations). The controls skip Angular bootstrap and store/schema/data creation, retaining the same loaded application bundle within each pair. The classic mode opens no database; sqlite mode opens an empty native database. All PSS values include app and WebView renderer, with inactive apps stopped; only JS GC is forced, matching acceptance. Full meminfo is in [the control JSON](android-empty-platform-2026-10-22.json).

| APK | Empty mode | N | JS heap mean ± SD, MiB | Device PSS mean ± SD, MiB |
| --- | --- | ---: | ---: | ---: |
| classic | classic | 5 | 1.972 ± 0.000 | 209.254 ± 0.491 |
| classic | sqlite | 5 | 1.981 ± 0.000 | 212.546 ± 0.655 |
| sqlite | classic | 5 | 2.120 ± 0.001 | 210.147 ± 0.316 |
| sqlite | sqlite | 5 | 2.129 ± 0.001 | 212.783 ± 0.241 |

The identical classic-APK native increment is **0.009123 MiB JS heap and 3.291992 MiB device-total PSS**. Only that isolated increment enters PLATFORM-BOUND arithmetic. The corresponding same-SQLite-APK increments are 0.008882 MiB and 2.636133 MiB; they are reported as a cross-check, not added or maximized. Empty classic-mode heap differs by 0.147590 MiB between APKs, exposing a bundle/metadata component separate from native loading. The 10k relaunch PSS excess of 1.647852 MiB is within classic SD 0.179668 + measured native cost 3.291992 = 3.471661 MiB and is PLATFORM-BOUND. Other small-data overhead is not automatically attributed to the platform. Neither platform-control SD nor workload SQLite SD is added to memory allowances.

Isolated empty-plugin open round trips in the classic APK measured 32.740 ± 5.400 ms (N=5). These include bridge and native open, and are not claimed as native-only CPU time or added on top of RTT. Process controls wait six seconds after writing/removing localStorage flags because immediate force-stop can discard Chromium's pending storage commit. The measured restart begins after that wait. Startup outputs validate that the profiling flag and actual calls survived restart.

### Startup, seed, native SQL and rendering attribution

[Persisted startup](android-startup-final-2026-10-22.json) records open 43.6 ms, WAL 14.8 ms, schema check 3.0 ms, one five-feature marker query 4.3 ms, router reseed begin/delete/marker/commit 3.9/19.4/3.9/8.1 ms, router preload 4.0 ms, initial count query batch 99.9 ms, and the next eager/path transport 7.1 ms. Readiness is 1741.8 ms; first native work starts at 1360.8 ms. There are 18 calls starting before readiness, not 18 proven minimum calls. isConnection is local; the fresh isDBOpen/isTransactionActive probes are absent. Further dependent path reads stay serialized.

[Seed startup](android-seed-startup-final-2026-10-22.json) exposes generation marks (73.0 ms), seed commit completion at 5686.9 ms and summary render at 6331.6 ms (644.7 ms later). That tail includes a 135.1 ms count batch, path reads and JS/scheduling, not pure bridge transfer. Two expensive pre-generation range transports (708.0/851.2 ms) are additional path/bootstrap work. This cold-process, reset-based diagnostic is distinct from the timed first-ready navigation protocol.

Uninstrumented-transport CPU traces: [before](android-seed-trace-50000-2026-10-22-phase15b-before.json) and [after](android-seed-trace-50000-2026-10-22-phase15b-after.json), with adjacent cpuprofiles. executeSet options fell from 10,404,954 to 9,352,630 bytes and 46 to 42 calls; elapsed in those calls fell 1413.8 to 1335.5 ms. Timed generation/reduction after the change is 52.1/3079.8 ms; sampled jsonInsertBatches self-time is 117.428 ms and GC self-time 335.115 ms. Profiles include reset and perturb timing; they are not replacement acceptance observations.

[Native SQL-clock probe](android-seed-trace-50000-2026-10-22-phase15b-native-clock.json): 37 entity-batch native SQL/preparation windows total 384.990 ms, compared with 1157.700 ms elapsed in the matching bridge calls. All 42 batch windows total 562.016 ms; seed commit alone is 135.900 ms. Temporary-table timestamps exclude transport and pre-first-statement native JSON parsing, include timestamp overhead and millisecond quantization, and exclude commit. Measured bandwidth already includes native insert work, so its transfer estimate and these SQL windows must not be blindly added.

[Toggle trace](android-toggle-trace-2026-10-22-phase15b.json): entity commits 4.6/7.0/78.2 ms, DOM changes 14.3/13.0/84.7 ms; the follow-up count commit overlaps and is not part of a proven two-call serial path. [Emission trace](android-emission-trace-2026-10-22-phase15b.json): one atomic UPDATE batch per dispatch, no read or separate commit call. Actual SQL/commit and scheduling costs above echo remain FAIL. DOM observation is not a paint timestamp.

ADR-0046 preserves reload recovery while removing two fresh probes; ADR-0047 compacts transport while retaining exact JSON, byte caps and atomicity; ADR-0049 replaces per-feature marker reads with bounded IN queries. WAL/NORMAL durability remains ADR-0042's explicit policy. No more aggressive durability or cache-memory tradeoff is used to manufacture parity. ADR-0050 records remaining startup/path, journal/encoding, SQL/commit, scheduling and store-created memory costs without asserting they are irreducible.

### Validation and reproduction

Library tests: **300/300**; harness unit tests: **1/1**; statistics tests: **6/6**. Library build and both production harness builds (`production,classic` and `production,sqlite`) pass. `npx.cmd playwright test` exits 0 with **26/26** passing. The earlier test-run server shutdown hang was resolved by running against an explicitly managed classic server; the server started for this work was stopped afterward. No Git commit was made.

Benchmark command: `node tools/android-bench.mjs --trials 5 --bounds-json docs/benchmarks/android-parity-final-bounds-2026-10-22.json --session phase15b-20261022 --output docs/benchmarks/android-parity-final-2026-10-22.md`. The APKs were rebuilt before measurement. The runner records APK SHA-256, device, WebView, date and session; platform controls must match them and are recomputed from raw paired observations.

Controls: `node tools/android-parity-profile.mjs --empty --session phase15b-20261022`. Startup: the same tool without --empty (add `--seed 50000` for fresh seed, and distinct --output paths). Seed: `node tools/android-trace.mjs --seed 50000 --cpu-profile --label phase15b-after`; SQL clock: replace --cpu-profile with --native-sql-clock and use label phase15b-native-clock. Toggle/emission use --toggle / no --seed and label phase15b. Diagnostics run separately from acceptance.

Report replay preserves raw trial data: add `--report-only docs/benchmarks/android-parity-final-2026-10-22.json --platform-json docs/benchmarks/android-empty-platform-2026-10-22.json --gap-adr ../decisions/0050-phase15b-evidenced-parity-gaps.md --evidence-md docs/benchmarks/android-parity-final-evidence-2026-10-22.md` to the benchmark arguments. The full acceptance table below uses the unchanged observations.
