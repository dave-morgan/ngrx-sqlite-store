# ADR-0050: Retain evidenced Phase 15b parity gaps

Status: Accepted as evidenced gaps, not universal statistical acceptance.
Date: 2026-10-22. Authority: Phase 15b brief's explicit remaining-FAIL exception.
Supersedes ADR-0044 for the current implementation and measurements.

## Decision

Retain every remaining FAIL in the final five-trial report and its JSON
sidecar. Do not increase minimum calls to observed calls, promote actual wire
bytes to minimum bytes, or count native SQL work as echo latency. Do not add
SQLite workload variance to memory allowances. The Phase 15 checklist can
close under the user's explicit evidenced-ADR exception; the universal parity
goal remains unmet. These are results for this emulator, WebView and plugin,
not proof that no future implementation can improve them.

The report is [android-parity-final-2026-10-22.md](../benchmarks/android-parity-final-2026-10-22.md).
It contains 30 independent observations (both implementations, 1k/10k/50k,
five alternating trials), 33 acceptance rows and same-session echo/intercept/
bandwidth samples. The logging-off re-baseline is
[android-parity-logging-off-2026-10-22.md](../benchmarks/android-parity-logging-off-2026-10-22.md).
No observations are dropped, including the final classic 50k first-ready
outlier of 1,685.4 ms. Its sample SD is retained under ADR-0038.

## Attempts and startup evidence

ADR-0045 disables bridge logging for both APKs. ADR-0046 removes two redundant
fresh-connection probes (six to four native calls), while preserving the
consistency sweep, web/retrieved-handle recovery and readonly correctness.
ADR-0049 batches feature version markers (the harness's five markers now use
one query). Initial query selectors already share PathCache refresh/queryBatch;
dependent container loads and writes remain ordered in the FIFO. Racing
those operations would weaken the committed-state contract. No native check
is removed on the assumption that a WebView reload implies process death.

The [persisted 50k startup trace](../benchmarks/android-startup-final-2026-10-22.json)
records readiness at 1,741.8 ms. First native invocation is at 1,360.8 ms;
the preceding WebView/application work is not charged as SQLite bridge cost.
Consistency/create/open/WAL take 10.6/19.1/43.6/14.8 ms. isConnection is local
JS work; fresh isDBOpen/isTransactionActive calls are absent. Schema-version
check is 3.0 ms; one five-marker query is 4.3 ms. Session-router reseeding
includes begin 3.9, delete batch 19.4, marker write 3.9 and commit 8.1 ms.
Router preload is 4.0 ms, initial count-query transport 99.9 ms, and the next
small eager/path transport 7.1 ms. Further path transports and scheduling
continue to first render. Eighteen calls start before readiness, including
one that ends after it; this does not prove eighteen serialized minimum calls.
Post-ready settling is recorded separately in the same trace, not charged
to readiness. Generic path reads can be expensive; the trace does not prove
all observed range reads are irreducible or identify them as native CPU time.

The empty-plugin controls also time open alone. These are complete bridge
open durations, not isolated native CPU times, and are not added wholesale
to an RTT allowance. Even crediting the traced 43.6 ms open cannot establish
a hard bound for all residual startup work. Final relaunch mean excesses are
241.320/454.820/316.580 ms. The report retains the conservative minimum of
one open and one subsequent persisted read (two calls, zero claimed bytes).
These rows remain FAIL rather than inflating the minimum to observed probes,
session commits, feature loads or render work. Further startup path/loading
work remains possible; NgRx bootstrap and notification ordering are retained.

## Seed attribution and attempts

ADR-0047 hoists shared collection bindings, omits null sortkeys and compacts
raw JSON envelopes while preserving lexical text, conflicts, row caps and
streamed atomic chunks. The uninstrumented wire protocol is unchanged apart
from those bytes. Same-session diagnostic CPU traces (including reset) show:

| 50k diagnostic | Before compact transport | After |
| --- | ---: | ---: |
| JS generation, ms | 61.9 | 52.1 |
| Timed reduction, ms | 3,090.2 | 3,079.8 |
| executeSet calls | 46 | 42 |
| executeSet option bytes | 10,404,954 | 9,352,630 |
| executeSet elapsed including bridge/SQL, ms | 1,413.8 | 1,335.5 |
| jsonInsertBatches sampled self-time, ms | 122.631 | 117.428 |
| GC sampled self-time, ms | 357.676 | 335.115 |

Raw [before](../benchmarks/android-seed-trace-50000-2026-10-22-phase15b-before.json)
and [after](../benchmarks/android-seed-trace-50000-2026-10-22-phase15b-after.json)
JSON and adjacent cpuprofiles retain the observations. These individual
diagnostics show byte/call savings, not a statistically isolated causal
estimate for every readiness difference. Sampling, byte counting, reset,
JIT and GC perturb them; they do not replace acceptance trials.

The separate [native SQL clock probe](../benchmarks/android-seed-trace-50000-2026-10-22-phase15b-native-clock.json)
brackets batches with temporary-table timestamps inside SQLite, as specified
in ADR-0048. Across 37 entity batches (including the small users batch), SQL/
preparation windows total 384.990 ms, versus 1,157.700 ms bridge-call elapsed.
All 42 batch windows total 562.016 ms. The final seed commit takes 135.900 ms;
the earlier 141.900 ms commit belongs to reset. SQL windows exclude bridge
transfer, native JSON parsing before the first timestamp and commit after
the last timestamp; they include timestamp overhead and millisecond clock
quantization. They are diagnostic elapsed windows, not native CPU or a floor.

The [fresh-seed startup trace](../benchmarks/android-seed-startup-final-2026-10-22.json)
separately records generation marks at 3,222.5 and 3,295.5 ms and readiness
at 6,331.6 ms. Seed commit completes at 5,686.9 ms; first render follows
644.7 ms later, with a 135.1 ms count-query batch, further path work and JS/
scheduling intervals. This tail is not attributed entirely to bridge transfer.
This reset-based diagnostic also exposes two pre-generation range transports
of 708.0 and 851.2 ms; they are additional bootstrap/path work, not seed
payload transfer or unavoidable bridge calls. They warrant further loading
optimization rather than being hidden in an expanded bridge allowance.

The seed's minimum stored Todo JSON bytes are 136,210 / 1,380,887 / 6,992,197.
The final effective bandwidths are 31,275.718 / 30,852.003 / 30,074.333 bytes/ms;
minimum transfer terms are therefore approximately 4.36 / 44.76 / 232.50 ms.
The actual 50k executeSet option bytes imply about 311 ms at that measured
rate, but actual bytes are not substituted for minimum bytes in acceptance.
The effective bandwidth fit already includes native insert work; adding it
to the SQL clock windows would double-count some costs. Report arithmetic
uses two minimum calls at measured intercept plus minimum bytes/bandwidth.

WAL/NORMAL remains as explicitly authorized in ADR-0042; no weaker durability
regime is introduced. SQLite JSON1 already reduces native binding/preparation
versus scalar row transport, and compact chunks reduce preparations further.
Deferring required writes, abandoning atomic seed transactions, disabling
indices required by reads, or increasing native cache/spill memory merely to
move work beyond first render is not a justified parity fix. Remaining JSON,
journal, SQL/index and path-loading work is not established as a hard floor.

## Toggle and emission evidence

The [toggle trace](../benchmarks/android-toggle-trace-2026-10-22-phase15b.json)
contains one atomic entity UPDATE per toggle and a later effect's count UPDATE.
Both calls start before DOM observation, but only the entity commit finishes
before it. Therefore the minimum DOM critical path remains one commit call.
Entity commits take 4.6/7.0/78.2 ms; DOM changes take 14.3/13.0/84.7 ms.
The outlier demonstrates real scheduling/commit variability; it is not a
reason to count the effect's overlapping call as serialized necessary latency.
DOM observation is not a paint timestamp. The final 50k toggle rows PASS;
small-size toggle rows exceed the one-call bound and remain FAIL.

The [emission trace](../benchmarks/android-emission-trace-2026-10-22-phase15b.json)
shows exactly one atomic batch with `UPDATE nss_node SET value = ? WHERE path = ?`
per emission, no reads and no separate commit bridge call. Its three diagnostic
batch calls take 5.3/7.7/10.5 ms. Acceptance p50 is 4.18â€“4.34 ms and p95
6.36â€“6.66 ms, versus measured echo RTT 2.04â€“2.08 ms. SQL/atomic commit work
and scheduling exceed the empty echo allowance; all six emission rows stay
FAIL. Charging the larger executeSet regression intercept to scalar dispatches
would relax ADR-0038's echo rule, so it is not done. WAL is already enabled;
skipping committed storage or notifying before commit is incompatible.

## Memory attribution

The paired empty controls isolate plugin loading in the identical classic
APK, with no Angular injector, store, schema or data; corresponding controls
in the SQLite APK expose bundle differences separately. Heap and device-total
PSS are measured in matching units with the same JS GC policy as acceptance,
without forced native GC. ADR-0048's strictly measured platform allowance is
applied only when the observed cost actually covers the workload excess.
The final report includes the means, sample SDs, raw meminfo and arithmetic.

All three 10k and 50k workload JS heaps PASS; 50k SQLite heaps remain around
5 MiB, rather than retaining the collection. At 1k, JS excesses are roughly
0.806/0.962/0.346 MiB on todos/notes/relaunch. Native plugin loading cannot
automatically explain store-created JS state. Library code and eagerly
constructed selector metadata, feature registry, leases, transaction/journal
and cache machinery are store costs. Production initial bundle sizes were
324.86 kB classic versus 422.33 kB SQLite; that code-size difference is not
equated byte-for-byte with live JS heap. The cross-APK empty controls bound
the observed code/metadata component without inventing retained-object sizes.

Small-data post-seed PSS excess includes native allocation/collection and
store activity beyond the empty-plugin baseline. It remains FAIL wherever
that baseline cannot cover it. Peak transport memory resolution (Q17) and
bounded 256 KiB chunks do not establish statistical PSS parity; no explicit
native GC is inserted into workload acceptance to improve its verdicts.
Remaining store-attributable overhead is retained with this evidence, rather
than removing committed-state caches or claiming an unmeasured platform floor.

## Final residual rows

The final table below is regenerated from the unchanged full-precision trial
observations after applying the measured empty-plugin controls. Units match
the report (ms or MiB). Allowance is the complete justified allowance; excess
is SQLite mean minus classic mean. Every row here remains FAIL, not accepted
as PASS, BRIDGE-BOUND or PLATFORM-BOUND.

| Size | Metric | Classic mean ± SD | SQLite mean ± SD | Excess | Allowance |
| --- | --- | ---: | ---: | ---: | ---: |
| 1000 | firstReadyMs | 289.620 ± 15.276 | 585.440 ± 9.693 | 295.820 | 46.794 |
| 1000 | relaunchReadyMs | 1363.380 ± 54.785 | 1604.700 ± 58.021 | 241.320 | 116.966 |
| 1000 | heapTodosMb | 4.617 ± 0.003 | 5.423 ± 0.003 | 0.806 | 0.012 |
| 1000 | heapNotesMb | 5.154 ± 0.002 | 6.116 ± 0.007 | 0.961 | 0.011 |
| 1000 | heapRelaunchMb | 4.568 ± 0.003 | 4.914 ± 0.020 | 0.346 | 0.012 |
| 1000 | pssTotalMb | 223.727 ± 0.786 | 237.992 ± 1.246 | 14.265 | 4.078 |
| 1000 | toggleP50 | 2.840 ± 0.378 | 17.480 ± 1.432 | 14.640 | 3.891 |
| 1000 | toggleP95 | 9.760 ± 2.644 | 53.320 ± 5.297 | 43.560 | 10.022 |
| 1000 | emitP50 | 0.100 ± 0.000 | 4.340 ± 0.114 | 4.240 | 2.194 |
| 1000 | emitP95 | 0.400 ± 0.100 | 6.640 ± 0.770 | 6.240 | 2.950 |
| 10000 | firstReadyMs | 272.320 ± 53.130 | 1090.060 ± 32.204 | 817.740 | 149.008 |
| 10000 | relaunchReadyMs | 1333.120 ± 97.789 | 1787.940 ± 166.191 | 454.820 | 268.060 |
| 10000 | pssTotalMb | 229.970 ± 0.096 | 247.760 ± 1.201 | 17.790 | 3.388 |
| 10000 | toggleP50 | 6.280 ± 0.390 | 18.880 ± 3.134 | 12.600 | 5.564 |
| 10000 | toggleP95 | 13.640 ± 1.820 | 54.780 ± 6.572 | 41.140 | 10.432 |
| 10000 | emitP50 | 0.100 ± 0.000 | 4.180 ± 0.084 | 4.080 | 2.124 |
| 10000 | emitP95 | 0.460 ± 0.114 | 6.360 ± 0.602 | 5.900 | 2.757 |
| 50000 | firstReadyMs | 638.960 ± 587.349 | 3572.240 ± 75.979 | 2933.280 | 913.477 |
| 50000 | relaunchReadyMs | 1359.660 ± 39.785 | 1676.240 ± 61.135 | 316.580 | 105.040 |
| 50000 | emitP50 | 0.100 ± 0.000 | 4.260 ± 0.055 | 4.160 | 2.115 |
| 50000 | emitP95 | 0.480 ± 0.164 | 6.660 ± 0.532 | 6.180 | 2.756 |

Final verdict counts: **11 PASS / 0 BRIDGE-BOUND / 1 PLATFORM-BOUND / 21 FAIL**.
