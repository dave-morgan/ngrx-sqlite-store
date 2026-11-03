# 16bp completed shapes component audit

Shapes are complete and verified; list acceptance is still active. No final retention, source-causal improvement or mean/heap guard clearance.

| Session | PASS | PLATFORM-BOUND | CODE-BOUND | FAIL |
| --- | ---: | ---: | ---: | ---: |
| retained16av | 3 | 54 | 0 | 29 |
| provisional16ay | 1 | 54 | 0 | 31 |
| rejected16bf | 1 | 52 | 0 | 33 |
| rejected16bj | 2 | 54 | 0 | 30 |
| unaccepted16bn | 1 | 52 | 0 | 33 |
| current16bp | 1 | 52 | 0 | 33 |

All86 means/sampleSD/verdicts, all raw rows/empty controls and scalar heap/code/data/PSS/control statistics are retained in the JSON companion. Every mean increase is retained even when it is within summed sampleSD.

retained16av increases beyond summed sampleSD:
- flat 50.replace.emitP50: delta+2.340000000, summedSD1.566677775; classic delta-0.020000000.
- flat 50.replace.domP50: delta+2.600000000, summedSD1.770861581; classic delta-1.300000000.
- flat 50.burst.maxBacklog: delta+0.800000000, summedSD0.447213595; classic delta+0.000000000.
- flat 50.heapMb: delta+0.014636993, summedSD0.010693761; classic delta+0.000649261.
- flat 500.heapMb: delta+0.018515778, summedSD0.010075183; classic delta+0.065522766.
- flat 5000.burst.lagP50: delta+1.900000000, summedSD1.713023954; classic delta+0.060000000.
- workflow edit_d4.emitP50: delta+2.040000000, summedSD1.332879142; classic delta+0.020000000.
- workflow edit_d4.domP50: delta+1.940000000, summedSD1.352447093; classic delta+2.300000000.
- workflow heapMb: delta+0.015859985, summedSD0.013255895; classic delta+0.062639618.

provisional16ay increases beyond summed sampleSD:
- flat 50.heapMb: delta+0.014481354, summedSD0.011224507; classic delta+0.000009155.
- flat 500.heapMb: delta+0.014304352, summedSD0.011183026; classic delta+0.033361053.
- flat 5000.heapMb: delta+0.012199402, summedSD0.011088340; classic delta-0.053335571.
- workflow heapMb: delta+0.011894226, summedSD0.011011971; classic delta-0.000334167.

rejected16bf increases beyond summed sampleSD:
- flat 50.replace.emitP50: delta+2.160000000, summedSD1.481218590; classic delta-0.040000000.
- flat 50.replace.domP50: delta+2.580000000, summedSD1.785835044; classic delta-2.900000000.
- flat 50.burst.lagP95: delta+4.320000000, summedSD4.251130290; classic delta-0.000000000.
- flat 500.burst.lagP95: delta+3.980000000, summedSD3.496318786; classic delta+0.160000000.
- workflow edit_d4.emitP50: delta+2.280000000, summedSD1.587332767; classic delta+0.040000000.
- workflow edit_d4.domP50: delta+1.860000000, summedSD1.718908534; classic delta+1.080000000.
- workflow heapMb: delta+0.015193939, summedSD0.011593408; classic delta+0.031249237.

rejected16bj increases beyond summed sampleSD:
- flat 50.burst.lagP50: delta+1.240000000, summedSD0.729592466; classic delta+0.000000000.
- flat 50.burst.lagP95: delta+6.720000000, summedSD4.854979999; classic delta+0.060000000.
- workflow edit_d4.emitP95: delta+6.980000000, summedSD5.656596228; classic delta+0.340000000.
- workflow edit_d4.domP95: delta+6.680000000, summedSD5.668876795; classic delta+2.940000000.
- workflow reset.emitP50: delta+11.940000000, summedSD5.287696021; classic delta+0.000000000.
- workflow reset.domP50: delta+11.940000000, summedSD5.237126811; classic delta-0.020000000.

unaccepted16bn increases beyond summed sampleSD:
- flat 50.burst.lagP95: delta+5.100000000, summedSD3.984957803; classic delta+0.220000000.
- flat 500.setKey.emitP50: delta+2.060000000, summedSD1.222290159; classic delta-0.080000000.
- flat 500.setKey.domP50: delta+2.140000000, summedSD1.734656593; classic delta+0.680000000.
- flat 5000.setKeys.domP50: delta+2.100000000, summedSD1.850434248; classic delta-1.200000000.

Heap components and data-parity checks remain explicit; raw data parity is not dismissed by code-component movement. Existing floors and numeric verdicts are unchanged. Cross-session controls/SD and both VMs sharing host resources qualify comparisons; no source-causal attribution.

Fresh list workload-code control is independently verified30rows/5distincttrials*2implementations*3points/finiteheap-code-data/session-device-SDK-WebView-APK. Floor, empty and render controls and full list results remain pending. No extra captures, new floors, active source/tool edits, duplicate run, automatic retry or commit. Both goals and historical mean/heap debt remain open.
