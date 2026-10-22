# ADR-0065: Phase 15e measured outcomes and residual gaps

Status: Accepted, 2026-10-23. This accepts the measurement record and follow-up decisions, not parity or new allowances.

The clean Phase 15d baseline is 11 PASS / 9 PLATFORM-BOUND / 13 FAIL. Final clean acceptance is **10 PASS / 9 PLATFORM-BOUND / 0 BRIDGE-BOUND / 0 CODE-BOUND / 14 FAIL**. The brief explicitly permits remaining FAILs when an ADR provides before/after evidence; this is that record. The performance goal remains unmet.

Use the [final report](../benchmarks/android-parity-15e-2026-10-23.md), [raw results and all acceptance arithmetic](../benchmarks/android-parity-15e-2026-10-23.json), [clean baseline](../benchmarks/android-parity-15d-clean-2026-10-23.json), [session provenance](../benchmarks/android-session-15e-2026-10-23.json) and [individual experiment evidence](../benchmarks/android-parity-15e-evidence-2026-10-23.md). Final acceptance has five observations per implementation and size, following a cold boot and 60-second settle with no other emulator, build, test or profiler. No samples were discarded. Earlier aborted attempts and diagnostics are excluded from acceptance.

## Every remaining FAIL

Latency units are ms; heap and PSS units are MiB. Excess is SQLite mean minus classic mean. Allowance is the largest applicable existing rule, never a sum of alternative code/native bounds. Uncovered is final excess minus that allowance. Categories identify measured work or an unresolved area; they do not establish an irreducible platform cost.

| Size | Metric | Before SQLite | Final SQLite | Before excess | Final excess | Final allowance | Uncovered | Evidence category |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1000 | relaunchReadyMs | 1824.660 | 1798.180 | 363.040 | 316.180 | 177.055 | 139.125 | B: remaining framework/native startup serialization |
| 1000 | heapTodosMb | 5.378 | 5.404 | 0.779 | 0.778 | 0.204 | 0.574 | D: live store/selection state beyond empty-code control |
| 1000 | heapNotesMb | 6.094 | 6.125 | 0.964 | 0.962 | 0.207 | 0.755 | D: live store/selection state beyond empty-code control |
| 1000 | heapRelaunchMb | 4.991 | 4.976 | 0.442 | 0.405 | 0.203 | 0.201 | D: live store/selection state beyond empty-code control |
| 1000 | pssRelaunchTotalMb | 226.653 | 226.453 | 4.439 | 4.268 | 3.054 | 1.214 | E: process/native memory, exact owner unresolved |
| 1000 | toggleP50 | 25.000 | 21.560 | 20.080 | 17.340 | 8.437 | 8.903 | C: commit/refresh/render/effect work and scheduling |
| 1000 | toggleP95 | 68.820 | 64.160 | 56.840 | 51.280 | 19.164 | 32.116 | C: commit/refresh/render/effect work and scheduling |
| 10000 | firstReadyMs | 1025.060 | 1057.020 | 476.460 | 641.320 | 541.846 | 99.474 | A: schema write and JS seed work |
| 10000 | relaunchReadyMs | 1885.020 | 1797.920 | 382.760 | 288.100 | 206.336 | 81.764 | B: remaining framework/native startup serialization |
| 10000 | pssTotalMb | 250.951 | 248.160 | 17.416 | 16.676 | 6.856 | 9.820 | E: process/native memory, exact owner unresolved |
| 10000 | toggleP50 | 25.380 | 19.980 | 17.520 | 11.580 | 9.616 | 1.964 | C: commit/refresh/render/effect work and scheduling |
| 10000 | toggleP95 | 62.940 | 59.460 | 46.180 | 39.560 | 31.139 | 8.421 | C: commit/refresh/render/effect work and scheduling |
| 50000 | firstReadyMs | 2900.760 | 2928.440 | 2522.020 | 2500.200 | 965.521 | 1534.679 | A: schema write and JS seed work |
| 50000 | relaunchReadyMs | 2058.700 | 2013.600 | 489.660 | 415.080 | 255.145 | 159.935 | B: remaining framework/native startup serialization |

## Retention and rejected hypotheses

A: Retain the original NgRx frozen-child recursion guard: sampled freeze CPU fell from 97.909 to 43.614 ms while nested action immutability remains enforced. Complete-collection sorting, a 16 MiB transaction cache, global index suspension/rebuild and bounded VALUES were measured individually and in combinations; none established a repeatable throughput win. Full sorting preserved original positions and flushed buffered statements before reads/commit. Native schema/index work remains substantial. The 50k acceptance first-ready mean increased 27.680 ms; no seed-floor claim is justified.

B: Retain explicit prewarm, early declared session deletion and one version/catalog query (ADR-0063). The direct final on/off startup probe improved 1851.1 -> 1830.8 ms and 15 -> 14 calls before ready. Relauch excess improves at every size but still exceeds F_open. Further work should profile actual critical-path dependencies rather than raise the allowance or treat the first plugin timestamp as a floor.

C: Five-toggle CPU attribution covers prepare, native commit wait and post-commit DOM intervals, including query patch/signal/Angular/effect work and explicitly unassigned runtime samples. The effect's second write overlaps the pending DOM update. Yielding it changed that ordering but did not give a repeatable joint latency win, so it was reverted. No forced tick, notification timer, mutable selector page or speculative scheduler floor is retained. Final lower 1k/10k toggle means cannot be attributed to the rejected yield; both sizes still fail.

D: Defer app/config loading around prewarm; initial classic/SQLite byte delta fell 101845 -> 96850 and todos-ready delta 101946 -> 96987. This is not a claim that required store code vanished. Splitting NodeWriter increased heap/startup cost and was reverted. Real empty-store post-GC means are 2.047553 / 2.250403 MiB, giving only 0.202850 MiB code delta. CODE-BOUND follows ADR-0062 exactly: classic workload SD plus the nonnegative measured delta, with no added SQLite/control SD. All three 1k heap gaps remain outside that bound; additional live-state retention remains unresolved and needs a retainer experiment rather than code-byte attribution alone.

E: Retain Android-only checkpoint/truncate then shrink after at least 128 KiB encoded writes (ADR-0064). Direct probes recover 2.731 / 6.784 MiB at 1k/10k with 21.167 / 26.333 ms added latency. Final absolute post-seed PSS is lower by 2.017 / 2.791 MiB, but relative excess changes 13.492 / 17.416 -> 13.852 / 16.676 MiB. Neither native allocations nor their release are fully attributed; small-cache restoration after shrink adds latency without meaningful extra recovery. 1k relaunch PSS also remains outside its tighter same-session bound. No GC, cache-policy or Java/plugin change is retained without evidence.

## Interpretation and next work

Relative classifications depend on same-session controls and classic SD. 1k first-ready becomes PASS under a 518.859 ms classic SD; 10k first-ready loses its earlier broad allowance; 1k relaunch PSS becomes FAIL despite a slightly lower SQLite mean. 1k post-seed PSS becomes PLATFORM-BOUND with a larger measured seed-memory allowance. All these results are retained, not normalized to the previous counts. The final report exposes every raw sample and control SD, including the 50k emission control outlier.

Next work: reduce or redesign measured schema/index bulk cost; trace startup dependencies with early open adopted; obtain live-state heap retainers at 1k; isolate native/process PSS ownership; and compare commit/DOM scheduling on a real device. These are open performance questions, not reasons to label the remaining FAILs platform-bound. Preserve original NgRx tokens, action/selector ordering, session reset and persistent router behavior, transaction atomicity and RowWriter caps.

Validation: 333 library, 17 tool, 1 harness and 26 Playwright tests pass, as do the library and both production APK builds. Final review was read-only and found no concrete correctness defect. No commit.
