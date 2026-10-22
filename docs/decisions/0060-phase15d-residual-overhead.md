# ADR-0060: Evidenced Phase 15d residual store overhead

Status: Accepted as a record of remaining gaps, 2026-10-22. Authority: Phase 15d's explicit remaining-FAIL-with-ADR completion rule. This does not amend the acceptance thresholds.

## Measurement and decision

The [final report](../benchmarks/android-parity-15d-2026-10-22.md) records session `15d-final-20261022-03`: 30 successful observations, five independent trials per implementation and size, with same-session APK-hash-validated floors and paired empty controls. Counts: **13 PASS / 9 PLATFORM-BOUND / 0 BRIDGE-BOUND / 11 FAIL**.

Retain every FAIL below. These are store/integration costs or unresolved gaps, not newly granted platform allowances. ADR-0057 changes only post-seed device-total PSS; workload SQLite SD is not added to memory allowances. Its F_seed memory diagnostic is one before/after app-PSS bracket around five seed repetitions per size, not five independent memory-growth samples. The report exposes the raw bracket and pre-shrink growth.

| Size | Remaining FAIL | Excess to classic | Allowed excess | Uncovered excess | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| 1000 | heapTodosMb | 0.787 MiB | 0.015 MiB | 0.771 MiB | Loaded code and heap below |
| 1000 | heapNotesMb | 0.968 MiB | 0.015 MiB | 0.953 MiB | Loaded code and heap below |
| 1000 | heapRelaunchMb | 0.414 MiB | 0.014 MiB | 0.400 MiB | Loaded code and heap below |
| 1000 | pssTotalMb | 13.947 MiB | 12.552 MiB | 1.395 MiB | Post-seed PSS below |
| 1000 | toggleP50 | 23.580 ms | 21.438 ms | 2.142 ms | Toggle below |
| 1000 | toggleP95 | 67.420 ms | 66.513 ms | 0.907 ms | Toggle below |
| 10000 | firstReadyMs | 732.560 ms | 623.442 ms | 109.118 ms | Seed below |
| 10000 | pssTotalMb | 16.563 MiB | 9.786 MiB | 6.777 MiB | Post-seed PSS below |
| 10000 | toggleP50 | 22.080 ms | 11.960 ms | 10.120 ms | Toggle below |
| 10000 | toggleP95 | 53.140 ms | 37.986 ms | 15.154 ms | Toggle below |
| 50000 | firstReadyMs | 2780.400 ms | 1071.063 ms | 1709.337 ms | Seed below |

## Toggle

Final device traces at [1k](../benchmarks/android-toggle-trace-2026-10-22-phase15d-after-1000.json) and [10k](../benchmarks/android-toggle-trace-2026-10-22-phase15d-after-10000.json), with companion CPU profiles, each observe three toggles. All six perform exactly two native executeSet calls: one atomic todo UPDATE, then an effectObserved UI write. There is no mapOne SELECT and no query refresh transport. The fresh in-page entity row is already reused; the count delta and page patch already suffice. Removing an imagined read would change no device work.

| Size / diagnostic iteration | Dispatch to native start | Todo commit | Commit end to DOM | Dispatch to DOM | Dispatch to settled |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1000 / 1 | 8.800 | 8.300 | 21.200 | 38.300 | 53.500 |
| 1000 / 2 | 0.600 | 16.600 | 9.500 | 26.700 | 36.200 |
| 1000 / 3 | 1.300 | 13.600 | 3.500 | 18.400 | 141.000 |
| 10000 / 1 | 10.800 | 13.000 | 54.200 | 78.000 | 87.800 |
| 10000 / 2 | 4.800 | 10.000 | 30.200 | 45.000 | 263.700 |
| 10000 / 3 | 0.400 | 40.900 | 10.800 | 52.100 | 72.100 |

All values are ms. These are diagnostic spans, not percentile acceptance samples. Commit-end-to-DOM includes JS invalidation, query patching, signal notification, Angular scheduling and DOM work; the call trace alone does not identify how much belongs to each. CPU profiles retain sampled call stacks. The first notification occurs after the todo commit and does not await effect-commit completion. The separate effect is enqueued after ScannedActions emission, as required by ADR-0023. Do not merge that write into the preceding transaction or publish before durability. No forced global ApplicationRef.tick, scheduler override or weaker notification contract is introduced to make a benchmark pass. Further profiling of the post-commit/render span remains work; its whole duration is not asserted to be an unavoidable platform limit.

## Seed

[ADR-0059](0059-canonical-entity-bulk-json.md) removes redundant parsing of EntityTx's validated canonical JSON. Regression tests prove identical SQL and wire bytes for identical inputs, including deep, escaped and Unicode data. The before/after instrumented 50k profiles sample jsonInsertBatches self time at 77.245 / 23.399 ms and data serialization at 80.705 / 62.038 ms. Different sessions and profiler sampling prevent treating those deltas as a causal latency estimate.

The [final 50k seed trace](../benchmarks/android-seed-trace-50000-2026-10-22-phase15d-after.json) records generation 62.900 ms, timed reduce/refresh 2778.100 ms, 44 executeSet calls and 9353163 executeSet option bytes. Its executeSet elapsed sum is 2017.900 ms. The trace includes reset calls outside timed generation/reduction; byte counting, CPU profiling and native instrumentation perturb timing. Native call elapsed includes bridge and SQL, not native-only CPU. Extra operations include collection clearing, feature scalar changes, users, notes/promoted structures, and the post-seed reads/refresh. The scratch floor intentionally lacks that schema, expression-index maintenance and JSON extraction work.

The [separate native-clock probe](../benchmarks/android-seed-trace-50000-2026-10-22-phase15d-after-native.json) totals 1096.997 ms in timestamp-bracketed SQL windows, including reset and timestamp overhead. It excludes parts of native parsing and commit, and cannot be subtracted from another trace as an exact decomposition or used as an acceptance floor.

The [index suspension probe](../benchmarks/android-index-probe-15d-2026-10-22.json) runs one ordered indexed/unindexed/indexed 50k sequence after acceptance and restores both declarative indexes in finally:

| Index probe mode | Generate (ms) | Reset-excluded reduce/refresh (ms) | Index rebuild before next seed (ms) |
| --- | ---: | ---: | ---: |
| indexed-before | 89.100 | 3276.700 | 0.000 |
| unindexed | 98.200 | 3071.500 | 0.000 |
| indexed-after | 83.000 | 3074.500 | 158.300 |

The unindexed run also pays for scan-based post-seed queries; rebuilding indexes is additional required work. This single sequence does not establish a reproducible end-to-end win or a safe production transaction protocol. Global indexes cover every collection, so dropping them for one collection can rebuild unrelated data. Defer production index suspension rather than changing catch-and-continue behavior or leaving indexes absent when a reducer catches a failure. This is an evidenced tradeoff, not proof that the remaining seed work is irreducible. Both first-ready FAILs remain explicit.

## Startup and batching

[ADR-0058](0058-startup-preload-batching.md) batches independent router/eager roots after registration commits. Regressions show two transports become one and cover duplicate requests, escaped roots, session gating and oversized flat-read fallback. Final [1k](../benchmarks/android-startup-15d-after-1000-2026-10-22.json) and [50k](../benchmarks/android-startup-15d-after-50000-2026-10-22.json) startup traces show the new JSON batch:

| Size | Ready (ms) | First plugin call (ms) | Calls starting before ready | Ready minus first plugin call (ms) |
| --- | ---: | ---: | ---: | ---: |
| 1000 | 2282.300 | 1662.700 | 14 | 619.600 |
| 50000 | 2707.100 | 1838.200 | 15 | 868.900 |

Only calls starting before first-ready are counted here; later settle/background calls are not all attributed to first-ready. Open/recovery, WAL verification, schema/version/catalog checks, router session reset, active query batches and logical path reads remain. Some checks depend on earlier results. Independent preload batching does not eliminate registration/reset and subscriber-driven work. Current relaunch rows are PASS or PLATFORM-BOUND under the prescribed SD rule, not evidence that startup now costs only F_open.

## Loaded code and heap

The final [bundle graph](../benchmarks/android-bundle-15d-2026-10-22.json) has 101845 extra initial JS bytes versus classic, 772 more than Phase 15c; including /todos gives 101946 extra bytes. NSS contributes 117341 initial module bytes. sql.js, jeep-sqlite, the plugin web driver, devtools and spikes each contribute zero initial bytes. Optional files in the APK are not evidence of initial loading.

The paired post-GC 1k [heap snapshots summary](../benchmarks/android-heap-15d-after-2026-10-22.json) has 970049 extra shallow bytes: V8 code accounts for +821736 bytes and +7056 nodes; arrays are -80604 bytes and ordinary objects -28536 bytes overall. This supports loaded/compiled code as a substantial fixed cost, rather than an enormous eager entity cache. Counts are shallow, not dominator retention, PSS or an exact attribution to individual source modules. Minified class names differ between builds.

The query compiler runs before initial page/count queries, and bulk/schema paths run before first-ready seeding; moving those same required modules behind import() still loads them before the post-seed heap samples. Optional driver/devtools paths are already lazy or tree-shaken. No speculative cache-size change or unmeasured import split is used to hide these three FAILs. A smaller module/method boundary may still improve relaunch footprint; complete irreducibility has not been proven. Retain the measured gaps as library responsibility.

## Post-seed PSS

The two remaining post-seed PSS excesses exceed ADR-0057 even after its pre-shrink floor: 1k is 13.947 vs 12.552 MiB allowed; 10k is 16.563 vs 9.786 MiB allowed. The report retains raw app meminfo and renderer PSS. Separate app meminfo observations show mean native heap classic/sqlite of 22.271/25.116 MiB at 1k and 23.464/26.631 MiB at 10k, plus code and Java differences; device-total differences also include the renderer. These categories do not establish a complete causal decomposition of the remaining device-total excess.

Raw floor shrink_memory probes recover native memory, but do not demonstrate the same device-total recovery or latency tradeoff in the workload. No native GC is forced in acceptance, no SQLite SD is added to memory headroom, and no unmeasured automatic shrink is installed. The unexplained remainder stays FAIL and requires allocator/renderer retention work; it is not relabelled platform cost.

## Verification and consequences

Library tests: 322/322 across 29 files. Tool tests: 13/13. Harness tests: 1/1. Playwright: 26/26, clean exit 0. Library and both production APK builds pass. Compatibility, notify-after-commit and effect ordering are retained. No commits were made.

The emulator was rebooted before the final trials, with no host tests/builds concurrent. Earlier noisy diagnostic controls are excluded. Classic variability is material: first-ready at 1k has SD 493.051 ms and relaunch at 1k SD 902.040 ms. Their PASS labels follow ADR-0038 exactly, but do not prove a startup optimization. Across-session means are not causal before/after comparisons. The brief's ADR fallback closes this phase's evidence requirement; these eleven performance gaps remain visible future work.
