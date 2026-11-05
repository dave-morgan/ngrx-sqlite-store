# 16bn completed shapes component audit

Shapes are complete and verified; list acceptance is still active. No final retention, source-causal improvement or mean/heap guard clearance.

| Session | PASS | PLATFORM-BOUND | CODE-BOUND | FAIL |
| --- | ---: | ---: | ---: | ---: |
| retained16av | 3 | 54 | 0 | 29 |
| provisional16ay | 1 | 54 | 0 | 31 |
| rejected16bf | 1 | 52 | 0 | 33 |
| rejected16bj | 2 | 54 | 0 | 30 |
| current16bn | 1 | 52 | 0 | 33 |

All86 means/sampleSD/verdicts, all raw rows/empty controls and scalar heap/code/data/PSS/control statistics are retained in the JSON companion. Every mean increase is retained even when it is within summed sampleSD.

retained16av increases beyond summed sampleSD:
- flat 50.heapMb: delta+0.015840149, summedSD0.009763789; classic delta+0.000460052.
- flat 500.heapMb: delta+0.017388916, summedSD0.010133563; classic delta+0.064513397.
- flat 5000.burst.lagP50: delta+0.880000000, summedSD0.642180389; classic delta+0.080000000.
- flat 5000.heapMb: delta+0.012371826, summedSD0.010836007; classic delta-0.000048065.
- workflow heapMb: delta+0.021666718, summedSD0.014782539; classic delta+0.062813568.

provisional16ay increases beyond summed sampleSD:
- flat 50.heapMb: delta+0.015684509, summedSD0.010294536; classic delta-0.000180054.
- flat 500.setKeys.domP50: delta+1.920000000, summedSD1.892903377; classic delta+1.240000000.
- flat 500.heapMb: delta+0.013177490, summedSD0.011241406; classic delta+0.032351685.
- flat 5000.heapMb: delta+0.013422394, summedSD0.010369582; classic delta-0.000634003.
- workflow reset.emitP95: delta+33.340000000, summedSD26.423320367; classic delta+0.040000000.
- workflow reset.domP95: delta+33.440000000, summedSD26.534128290; classic delta+0.040000000.
- workflow heapMb: delta+0.017700958, summedSD0.012538616; classic delta-0.000160217.

rejected16bf increases beyond summed sampleSD:
- workflow heapMb: delta+0.021000671, summedSD0.013120053; classic delta+0.031423187.

rejected16bj increases beyond summed sampleSD:
- workflow reset.emitP50: delta+9.480000000, summedSD6.411735775; classic delta+0.000000000.
- workflow reset.domP50: delta+9.440000000, summedSD6.354495984; classic delta+0.020000000.

Heap components and data-parity checks remain explicit; raw data parity is not dismissed by code-component movement. Existing floors and numeric verdicts are unchanged. Cross-session controls/SD and both VMs sharing host resources qualify comparisons; no source-causal attribution.

Fresh list workload-code control is independently verified30rows/5distincttrials*2implementations*3points/finiteheap-code-data/session-device-SDK-WebView-APK. Floor, empty and render controls and full list results remain pending. No extra captures, new floors, active source/tool edits, duplicate run, automatic retry or commit. Both goals and historical mean/heap debt remain open.

Independent audit agrees across five sessions:860 metric-stat objects,430 verdicts,430 component-stat objects,five Markdown raw blocks and five journals. No artifact discrepancies. Existing pluginPSS allowance is2.587890625MiB versus16av2.757226563/16ay2.777343750/16bf1.400976563/16bj4.003320313. All24 empty-control component/timing series per session and all comparator rows are preserved in the shapes-components JSON.

Workflow control emit/DOMP95 increases versus16av(+6.38/+6.46ms) exceed summedSD6.213953610/6.203980377; no other workload-control change exceeds summedSD in either direction. Empty sqlite/sqlite PSS versus16ay increases+.581640625MiB beyond summedSD.562585325. Component movements qualify comparisons, not source causality or guard dismissal. All five heap data-parity checks remain FAIL, with no CODE-BOUND dismissal.

The independent offline audit initially shadowed built-in all with a dictionary, raising TypeError before comparisons completed. Renaming it sessions produced the complete passing audit. Error preserved separately in .tmp/16bn-offline-shapes-audit-error.json; no raw/device/verifier mutation or retry.
