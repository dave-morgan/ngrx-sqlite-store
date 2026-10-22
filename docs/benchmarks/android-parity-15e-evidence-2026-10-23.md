## Phase 15e method and diagnostic evidence

Local report date: 2026-10-23 (Australia/Brisbane); raw UTC provenance may say 2026-10-22. The comparison baseline is android-parity-15d-clean-2026-10-23, 11 PASS / 9 PLATFORM-BOUND / 13 FAIL. The contended 15d report is not the acceptance baseline.

Final acceptance uses tools/android-phase15e-acceptance.mjs, adapted from /tmp/run15d-clean.sh: final APKs are built before reboot; emulator-5556 is shut down if present; 5554 is killed and cold-booted with snapshots disabled; boot_id must change; wait for boot completion plus 60 seconds. Controls and five paired workload trials run sequentially with no host build/test/profiler or second emulator. See the matching android-session-15e-2026-10-23.json for timestamps, hardware, APK hashes, commands and boot IDs.

The sandbox denies writes to the original AVD lock files. A top-level-file copy of Pixel_9_Pro.avd plus a rewritten .ini lives under .tmp/phase15e/avd; the emulator uses the same SDK/system image, effective 4 cores, 3072 MiB, 1280x2856/480 dpi and swiftshader_indirect settings. The copy excludes snapshots/lock directories. The original AVD remains intact. adb emu kill can fail authentication in this environment; the controller records and falls back to the same authenticated console kill command, then verifies shutdown and a different boot_id. No device or SQL durability setting is relaxed.

### A: Seed transport, indexes and JavaScript

Three diagnostic sweeps on emulator-5554, reversing order in sweep two, measured the following reset-excluded reduce/refresh times. The bridge wrapper restores indexes before reads and commit, and restores cache size in finally. It copies/transforms diagnostic payloads, includes reset native calls in its native totals, and is not an acceptance observation or a platform floor. Positions are assigned before physical insertion sorting, so logical ids ordering is preserved. Primary-key comparison uses the harness ASCII typed ids. Cache applies during the diagnostic bulk operation and is restored before post-seed memory capture.

| Mode | Reduce/refresh samples (ms) | Mean (ms) | Decision |
| --- | --- | ---: | --- |
| baseline | 3069.200, 2302.400, 2728.900, 2688.000, 2647.000, 2348.400 | 2630.650 | Control |
| sorted | 2382.400, 2937.900, 2545.100 | 2621.800 | Reject: no repeatable end-to-end win across reversed sweeps |
| cache | 2382.800, 2985.800, 2511.700 | 2626.767 | Reject: no repeatable end-to-end win across reversed sweeps |
| sorted-cache | 2417.600, 3360.900, 2571.700 | 2783.400 | Reject: no repeatable end-to-end win across reversed sweeps |
| indexes | 2594.900, 3095.400, 2398.400 | 2696.233 | Reject: no repeatable end-to-end win across reversed sweeps |
| sorted-cache-indexes | 2385.000, 3072.100, 2384.900 | 2614.000 | Reject: no repeatable end-to-end win across reversed sweeps |

Sources: [bulk sweeps](android-targeted-15e-before.json), [bounded VALUES retry](android-targeted-15e-values-bounded.json). The initial VALUES sweep did not reapply the transport cap after expanding JSON into bindings; it is excluded from the decision. The bounded retry uses 999-parameter statements and <=256 KiB executeSet groups, inside the existing transaction.
- Bounded retry baseline: 2825.700, 2622.500, 2476.300, 2517.200 ms; native calls 60, 60, 60, 60.
- Bounded retry values: 3299.300, 3515.100 ms; native calls 95, 95.

All collection indexes are global: (coll,pos), (coll,sortkey,pos), and the declared done/userId expression indexes. The experiment drops/rebuilds them within the bulk transaction and rebuilds before a query/commit; rebuild cost is included. Rebuilding unrelated collection indexes and extra transport removes the apparent unindexed benefit. No production index suspension, cache increase or VALUES substitution is retained.

The seed CPU profile identified double deep-freezing: dispatch validates, then ActionsSubject validates direct callers again. The new traversal uses NgRx's existing frozen-child guard. It still freezes every newly encountered child and keeps direct subject validation. The regression failed before the guard and passes after; mutation remains prohibited. Full CPU profiles show sampled freeze self-time 97.909 -> 43.614 ms across all recursion nodes. Instrumented reduce/refresh was 2668.2 -> 2393.6 ms, while executeSet elapsed was 1581.1 -> 1770.8 ms; those perturbed single observations are not a causal uninstrumented wall-time estimate. Encoding/validation, row caps, payload sizes and SQL remain unchanged. See [before profile summary](android-seed-trace-50000-2026-10-22-phase15e-before.json) and [guard profile summary](android-seed-trace-50000-2026-10-22-phase15e-freeze-after.json), with adjacent .cpuprofile files.


The first sorting sweep above orders individual transport chunks and is exploratory only. The full-collection hypothesis was then tested correctly before final acceptance. The diagnostic buffers every chunk of a collection in the already-open transaction, preserves positions, sorts the complete collection by typed id before rechunking, and flushes before any read or commit. A buffered-original-order control isolates diagnostic buffering/reencoding; all modes restore indexes/cache in finally. It uses bounded transport and no production behavior change.

| Full-collection mode | Reduce/refresh samples (ms) | Mean (ms) | Native elapsed mean (ms) |
| --- | --- | ---: | ---: |
| baseline | 2459.200, 2364.300, 2329.800, 2417.400, 2230.400, 2306.400 | 2351.250 | 2293.317 |
| buffered | 2467.600, 2394.600, 2417.000 | 2426.400 | 2181.233 |
| global | 2701.700, 2348.500, 2394.800 | 2481.667 | 2231.400 |
| global-cache | 2418.300, 2567.900, 2398.900 | 2461.700 | 2208.967 |
| global-cache-indexes | 2436.800, 2383.900, 2422.000 | 2414.233 | 2140.367 |

Source: [full-collection sweeps](android-targeted-15e-global.json). Global sort alone is slower than buffered original order on mean (2481.667 vs 2426.400 ms); global+cache is 2461.700 ms. Adding deferred indexes gives 2414.233 ms, a noisy 0.5% difference from buffered control and slower than the original streamed baseline (2351.250 ms). No repeatable end-to-end win is established, so none is retained. Sorting the primary tree also makes the original-pos secondary index insert order non-monotonic; append behavior of the primary tree alone does not establish an overall gain.

An initial acceptance attempt was deliberately aborted during native empty controls when this experimental gap was found. None of its observations are used. The final report uses the subsequent fresh boot and new session ID only.

### B: Relaunch and prewarm

prewarmSqliteStore starts recovery/WAL/schema work before bootstrap and adopts the same original operation. The provider-array form clears known session roots atomically before DI without invoking reducers or initial factories; registration completes reseeding and gates selectors/INIT/buffered actions. Config-only calls cannot know registrations. Explicit persistent router data survives. Unknown lazy/injection-token registrations wait for DI. A rejection is handled until adoption and surfaces through the existing startup error behavior, without another open. Tests exercise success, reuse, original failure, early session clearing and persistent router preservation.

Feature versions and the index catalog now share one native query, and declarations are checked as a union. The regression proves one transport instead of two. Earlier three paired prewarm off/on diagnostics measured off [1820.6,1756.8,2001.3] and on [1811.0,1860.0,1829.9] ms: means 1859.567 -> 1833.633 ms. This small difference is noisy and is not a bound or proof of a 300 ms startup win. The final session-reset version measured 1851.1 -> 1830.8 ms in a separate off/on pair, first native call 1512.0 -> 1465.1 ms, and 15 -> 14 calls starting before ready. This is diagnostic, not an acceptance floor; acceptance supplies the final five-trial relaunch means. No bootstrap read or session-reset cost is declared unavoidable.

The earlier writer split worsened startup/heap and was reverted. App/config module loading is deferred in both builds while native prewarm begins only for sqlite. See ADR-0063 and android-startup-15e-session-off/on.json. This keeps classic's store behavior and default NgRx tokens unchanged.

### C: Five-toggle CPU attribution

Five 1k toggles were profiled only in separate diagnostic runs. Native commit timing, DOM MutationObserver time, and effect-write start/end are recorded. The final trace anchors Profiler timestamps to CDP Performance.NavigationStart. Source maps were generated separately; tools/android-profile-spans.mjs maps frames only after emitted-script equality validation (apart from equal-length chunk hashes and source-map footer metadata). Source-map builds never supplied the acceptance APKs.

See [before trace](android-toggle-trace-2026-10-22-phase15e-before-1000.json), [yield candidate](android-toggle-trace-2026-10-22-phase15e-candidate-1000.json), and [normal final trace](android-toggle-trace-2026-10-22-phase15e-final-1000.json), adjacent CPU profiles, and [mapped spans](android-toggle-trace-2026-10-22-phase15e-final-1000-spans.json). Categories include query patching, selector publication/notifications, Angular signals/scheduling/render, effect write/queue preparation, bridge JS, other store cleanup, and explicit idle/program/unattributed intervals.

| Toggle | Dispatch -> native (ms) | Todo commit (ms) | Commit -> DOM (ms) | Effect native overlap before DOM (ms) |
| --- | ---: | ---: | ---: | ---: |
| 1 | 3.600 | 5.700 | 8.100 | 2.400 |
| 2 | 0.400 | 8.300 | 8.400 | 3.900 |
| 3 | 0.900 | 6.600 | 6.000 | 1.900 |
| 4 | 0.400 | 81.300 | 14.800 | 2.100 |
| 5 | 0.700 | 11.600 | 5.600 | 2.600 |

There are two executeSet calls per toggle and no query transport. Query patching was not sampled separately at 1 ms resolution; this does not mean zero work. Notifications are synchronous after refresh; there is no gratuitous notification timer to remove. The immutable 100-row page array must receive a new reference when a row changes; mutating it would break selector equality.

A candidate yielding the synchronous ScannedActions effect moved its second write after the DOM in all five profiled toggles, but two-trial workload results were 1k p50/p95 28.25/68.55 ms and 10k 20.00/70.75 ms, versus the clean baseline 25.00/68.82 and 25.38/62.94. It did not establish a repeatable p50/p95 win and was reverted. No timer or render-scheduler override remains. The 81.3 ms native commit in final diagnostic toggle four accounts for most of that toggle's 96.5 ms DOM latency; other post-commit spans still include measured store and scheduling work and are not granted a new floor. Sampling cannot identify the causal owner of every idle/program interval; these stay explicit residual evidence rather than invented attribution.

### D: Startup code and empty-store control

See [every-module audit](android-code-audit-15e.md) and [bundle graph](android-bundle-15e.json). Optional runtimes/devtools are already absent. The attempted writer split reduced initial bytes but did not improve post-seed heap and was reverted. Required fresh-seed/schema/query modules cannot be moved past first-ready without changing that metric. Final paired post-GC heap and the clean five-trial metrics are retained even if worse.

--empty-store boots an actual Angular application via bootstrapApplication and the real provideStore with zero features, effects or workload data. sqlite opens/migrates its empty DB; the tool verifies nss_node+nss_entity+nss_chunk row count is zero. It uses each workload APK, five alternating paired fresh processes, stable shell, and two post-GC collections at the same measurement stage. This is distinct from --empty native-plugin controls, which bypass Angular. No MockStore or fabricated means are used.

CODE-BOUND is implemented only for heap and only with complete same-session five-pair provenance. The allowance is classic workload SD + max(0, empty-store sqlite mean - empty-store classic mean), without adding control or workload SQLite SD. Latency/PSS cannot borrow it. Tool tests cover trial pairing, missing/duplicate/invalid observations, heap-only enforcement, PASS precedence and no SD inflation. Code executed/compiled by the workload beyond the empty-store delta remains FAIL; a code-size observation alone cannot relabel it.

### E: Post-bulk device-total PSS

Three baseline probes per size measured app+renderer PSS before and after each maintenance stage; there is no Java/native GC. These are sequential brackets, not independent acceptance trials. The renderer stayed essentially unchanged during each bracket. A permanent 512 KiB cache after shrink did not recover meaningful memory and was rejected. Raising the cache to 16 MiB did not improve the large-seed sweeps and is not retained.

| Size | Checkpoint mean latency (ms) | Checkpoint recovered MiB | Shrink mean latency (ms) | Shrink additional MiB | Bound-cache latency (ms) | Bound-cache additional MiB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1000 | 17.333 | 1.787 | 3.833 | 0.944 | 3.367 | -0.030 |
| 10000 | 21.600 | 4.634 | 4.733 | 2.150 | 3.333 | 0.002 |

Retain checkpoint(TRUNCATE)+shrink_memory for Android transactions with >=128 KiB of buffered row writes: mean bracket recovery 2.731 MiB at 1k and 6.784 MiB at 10k for 21.167/26.333 ms total latency. The first 10k checkpoint cost 56.5 ms, so its full latency samples remain visible. It runs after commit inside the FIFO, never on ordinary small toggles, with best-effort failure reporting that cannot roll back or suppress a commit. Web/iOS/readonly are unchanged. Cache size remains -2000/default; no unmeasured cache increase is installed. Tests cover the threshold, commit order, failure notification and platform/readonly guard.

The separate two-trial original/candidate APK brackets on the cold-booted emulator measured 1k PSS 234.940 -> 234.389 MiB and heapTodos 5.386 -> 5.403 MiB; these are diagnostic and not acceptance. Later activity refills caches/allocators, so the instantaneous 2.731/6.784 MiB recovery is not promised at the workload sampling point. Final same-session device-total PSS is decisive. ADR-0057 continues to use the pre-shrink F_seed growth; no new memory allowance or forced allocator GC is introduced.

### Verification and retention

333 library tests, 17 tool tests, 1 harness test and all 26 Playwright tests passed. Library and both production/configuration APK builds passed with JDK 21 and cached offline Gradle 8.14.3. No git commit. The final report contains all 33 acceptance rows, raw trials, same-session native and empty-store controls, and numerical bound arithmetic. Remaining FAIL rows are recorded with before/after evidence in ADR-0065 rather than reclassified.

The host has ADB clients v32, v35 and v37. A failed earlier attempt used v32 and tried to start another daemon on occupied port 5037 after a dropped connection. Its partial controls are excluded. Final acceptance pins BENCH_ADB to the workspace SDK v37 client and records that executable/version in the session file. The runners retry only transient ADB transport errors at most three times with 250/500 ms backoff; package/permission failures are never retried, and no helper restarts or kills the shared daemon. These commands drive/attach/read the device; timed native SQLite operations remain in-page. Two tool tests verify the retry boundary.
