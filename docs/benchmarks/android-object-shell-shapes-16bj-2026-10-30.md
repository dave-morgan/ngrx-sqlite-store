# Object-shell shapes acceptance 16bj (lists pending)

Verified 10 complete paired observations, all86 means/sampleSD/verdicts,20 paired empty controls, APK/session/control hash and journal agreement. Counts:2PASS/54PLATFORM-BOUND/0CODE-BOUND/30FAIL (56/86 qualify), versus retained16av57/86, provisional16ay55/86 and rejected16bf53/86. All existing statuses remain unchanged. Full list acceptance and retention are pending.

Every SQLite mean increase beyond summed sampleSD against those references is below. Units are milliseconds for timing, MiB for heap and action count for backlog. All86 comparisons, classical changes, every raw control/component series and raw observations are retained in JSON.

| Reference | Metric | SQLite mean increase | Summed sample SD |
|---|---|---:|---:|
| retained16av | flat.50.burst.maxBacklog | +0.800000000 | 0.447213595 |
| retained16av | flat.50.heapMb | +0.021466827 | 0.009995618 |
| retained16av | flat.500.heapMb | +0.022498322 | 0.010599836 |
| retained16av | flat.5000.heapMb | +0.016295624 | 0.009991381 |
| retained16av | workflow.heapMb | +0.014047241 | 0.011345273 |
| provisional16ay | flat.50.heapMb | +0.021311188 | 0.010526365 |
| provisional16ay | flat.500.heapMb | +0.018286896 | 0.011707679 |
| provisional16ay | flat.5000.heapMb | +0.017346191 | 0.009524956 |
| provisional16ay | workflow.reset.emitP95 | +29.260000000 | 24.381201755 |
| provisional16ay | workflow.reset.domP95 | +29.260000000 | 24.381201755 |
| provisional16ay | workflow.heapMb | +0.010081482 | 0.009101350 |
| rejected16bf | workflow.heapMb | +0.013381195 | 0.009682787 |

Current SQLite heap components:

| Scope | Total heap MiB | Code MiB | Data MiB | Data excess over classic MiB | Data parity |
|---|---:|---:|---:|---:|---|
| flat.50.heapMb | 5.081758881 | 3.025402069 | 1.616667938 | +0.112420654 | FAIL |
| flat.500.heapMb | 5.570317078 | 3.044919586 | 2.069623566 | +0.177806854 | FAIL |
| flat.5000.heapMb | 9.955358124 | 3.096121979 | 6.261373901 | +0.536083984 | FAIL |
| workflow.heapMb | 5.508386993 | 3.193316650 | 1.867450714 | +0.234035492 | FAIL |
| workflow.relaunchHeapMb | 4.386389923 | 2.190136719 | 1.820226288 | +0.374060822 | FAIL |

All five data-parity checks fail, so code-space movement cannot dismiss them as CODE-BOUND. Against retained16av the three flat heaps and workflow heap exceed summedSD. Code components track much of total heap increase observationally; three flat data components also increase by roughly0.00054–0.00068MiB beyond their small summedSDs. No source causality, mean-heap clearance or numerical floor is established.

K5000 single10.44/ten-key10.90/replacement13.70ms, workflow reset17.46ms and append10011.88ms remainFAIL. ResetP9570.56ms remainsFAIL, and exceeds provisional16ay's mean by29.26ms beyond summedSD24.381202 in both emit and DOM channels. Targeted repeated diagnostic mean benefit does not clear full tails/heap/list guards.

List16L23 controls/workloads continue under the existing parent. Code control30rows is independently verified; no partial list verdict is accepted. Both goals and historical mean/heap debt remain open. No added CPU/heap/PSS/GC diagnostic capture, retry, changed floors or commit. Standard approved acceptance memory controls remain unchanged.

All raw evidence and comparisons: [JSON](android-object-shell-shapes-16bj-2026-10-30.json). ADR0136 remains provisional until full results and postchecks are assessed.

Independent read-only audit also reproduced688 classic/SQLite statistics objects and344 verdicts across all four sessions, with raw/MD/journal/hash agreement. All24 empty-control component/timing series and72 comparator rows are retained in [additional components](android-object-shell-shapes-components-16bj-2026-10-30.json). Existing pluginPSS allowance changed to4.003320MiB from16av2.757227/16ay2.777344/16bf1.400977; current classic/classic PSS SD3.460161MiB versus classic/SQLite.315247MiB. Empty-control component increases beyond summedSD: SQLite/SQLite heap vs16av; classic/SQLite and SQLite/SQLite total+appPSS vs16ay; SQLite/SQLite rendererPSS vs16bf. No shape control increase exceeds summedSD; K500 control emit/DOMP50 decreases versus16ay do exceed it, so changing allowances qualify verdict transitions. No source causality or guard dismissal.
