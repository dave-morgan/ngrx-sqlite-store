# Workflow reset wall diagnostic 16bh

Unchanged restored 16aw APK, one scoped cold boot plus 60-second settle on isolated emulator-5556. No application/APK change or CPU/heap/PSS/GC capture. This identifies a read-path cost; it is not acceptance, a floor, a comparative gain or proof of native CPU cost.

Independently verified 30 reset actions and 30 untimed dirty actions, 600 finite spans, 30 subtree queries returning 66 node rows each, 60 atomic writes, actual APK/boot/session plus 14 source/tool hashes, and genuine parent/reboot exits 0. Debugger disabled before timing; seven original method descriptors and temporary Store reference restored before persisted-name and all-table-count proof. Original prelude retained: 30 edits each at d1/d4/d10, 15 loads, 30 steps and one untimed setup reset. Events/drafts are empty at this point; no large entity payload claim.

| Reset phase (ms) | Mean | Sample SD | P50 | P95 | Max |
|---|---:|---:|---:|---:|---:|
| Reset emit | 25.716667 | 9.384583 | 24.300000 | 47.500000 | 50.500000 |
| Reset DOM text wait | 25.753333 | 9.399367 | 24.300000 | 47.600000 | 50.500000 |
| Enqueue to transaction callback | 0.310000 | 0.426978 | 0.200000 | 1.000000 | 2.300000 |
| Previous work observer | 0.223333 | 0.411627 | 0.100000 | 1.000000 | 2.200000 |
| Whole workflow read | 14.870000 | 5.462862 | 13.900000 | 21.800000 | 34.100000 |
| Native subtree query | 14.413333 | 5.427372 | 13.600000 | 21.200000 | 33.800000 |
| Read wall outside native query | 0.456667 | 0.353976 | 0.400000 | 1.000000 | 2.100000 |
| Node diff write | 0.256667 | 0.169550 | 0.200000 | 0.700000 | 0.900000 |
| Native atomic write | 8.693333 | 5.870260 | 6.400000 | 24.400000 | 26.900000 |
| Selection refresh | 0.686667 | 0.216131 | 0.700000 | 1.100000 | 1.400000 |

Each reset queries all of workflow before its onState reducer executes, although current cache owners cover status/loading/step/events/drafts/validation/form. The workflow owner itself is absent. Its six-arm node/entity/chunk query returns 66 source-0 rows and no entity/chunk rows. Reset writes one coalesced statement affecting five rows; dirty writes one scalar row. Coalesced JSON target paths were not captured, so exact five targets are source attribution, not raw-binding proof. Persisted name is Ada Lovelace; counts remain nodes142/chunks0/entities62/todos50/drafts0/meta8.

The read query is the largest located reset wall span. Small diff/publication costs do not justify another speculative allocation/refcount fix. A future complete-read plan may omit payloads for fresh complete cached descendant owners while retaining actual root/membership/parent/position rows and reading unknown children. Cached fragments/defaults alone cannot establish completeness. No root cache/lease change or altered onState workload is implemented.

All spans include instrumentation/scheduling. Nested wall is not additive CPU, SQLCPU, an exact queue block, or an authorized floor. Dirty selector emission precedes its pipeline tail, which is bracketed separately. The hook DOM wait may observe old Ada text before dirty paint and is not paint proof. This single instrumented session does not replace any full verdict, startup guard or historical mean/heap debt.

Verifier's first attempt mistakenly expected630 spans; the per-label counts correctly total600. Original verifier and assertion are preserved at .tmp/16bh-verify-first.cjs and .tmp/16bh-verifier-count-assertion.json. The corrected verifier passed without changing raw evidence or repeating device work.

Raw, provenance and verification: [JSON](android-workflow-reset-wall-16bh-2026-10-30.json), [analysis](android-workflow-reset-wall-16bh-2026-10-30-analysis.json). Sources are archived in .tmp/16bh-source. ADR0135 records the limits. Both goals and all mean/heap guards remain open; retained performance reference remains16av/16L20 (31/33 lists,57/86 shapes). Latest16be full16bf/16L22 failed30/33 lists,53/86 shapes and was reverted, with444 library/40 tools/1 harness/30 E2E/library build passing.
