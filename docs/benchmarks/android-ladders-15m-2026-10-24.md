# Phase 15m binary row iterator experiment

## Scratch result

Six alternating native scratch samples:1317.867?19.212ms for production json_each,1236.283?9.053ms for jsonb_each. Same36calls/9330855parameterbytes,50000 valid JSON TEXT rows. See [raw ladder](android-jsonb-ladder-15m-2026-10-24.json) and ADR0075.

## First application A/B (shared boot, inconclusive)

All8 size observations completed; candidate startup does not improve in both directions. Baseline drift prevents attributing the apparent improvements to code. All raw observations are retained, including slow values.

| Size | Metric | A1 | B1 | B1 - A1 | B2 | A2 | B2 - A2 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 10000 | firstReadyMs | 862.400 | 1346.000 | 483.600 | 1336.500 | 1442.600 | -106.100 |
| 10000 | relaunchReadyMs | 1877.900 | 2868.200 | 990.300 | 2780.500 | 3399.000 | -618.500 |
| 10000 | emitP50 | 5.700 | 9.500 | 3.800 | 9.900 | 10.400 | -0.500 |
| 10000 | pssTotalMb | 244.108 | 246.155 | 2.047 | 246.040 | 237.386 | 8.654 |
| 50000 | firstReadyMs | 2842.700 | 2871.900 | 29.200 | 2766.500 | 3142.600 | -376.100 |
| 50000 | relaunchReadyMs | 3055.800 | 2872.800 | -183.000 | 2997.000 | 3954.200 | -957.200 |
| 50000 | emitP50 | 10.700 | 9.700 | -1.000 | 10.300 | 10.600 | -0.300 |
| 50000 | pssTotalMb | 238.146 | 236.911 | -1.235 | 241.731 | 235.969 | 5.763 |

Latency ms,memory MiB. Baseline SHA-256 `312eebbdc6e80b52743a0e84a1bd4bffadfc6e64b69799d3f4b28de7538778b4`; candidate `c1faa012b3d08f7349cc9a44f2132539368f048ed39e1bd51e5d9a71fc2eb4c5`. Single-trial verdict counts are invalid and unused. No speedup or acceptance success is claimed.

The post-run resource snapshot showed guest swap566MiB, one emulator, host available RAM~12GiB, zero host page input at that instant and high-performance power scheme. It was not collected during timed trials, so it does not prove a cause. A fresh-boot-per-leg50k comparison will isolate session-age effects; original data remain preserved. Raw shared-boot files `.tmp/15m-ab-{A1,B1,B2,A2}.json`; fresh protocol files `.tmp/15m-fresh-{A1,B1,B2,A2}.json`.


## Fresh boot before each leg: candidate rejected

All four observations validate: correct session/APK SHA-256, one 50k SQLite trial per leg, 30 toggle samples and 200 emission samples, finite metrics, four distinct boot IDs and exit0. No samples discarded. Single-trial verdict counts remain unused.

| Metric | A1 | B1 | B1 - A1 | B2 | A2 | B2 - A2 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| firstReadyMs | 1920.600 | 1954.700 | 34.100 | 1930.700 | 1988.700 | -58.000 |
| relaunchReadyMs | 2119.000 | 2077.000 | -42.000 | 2148.400 | 2278.000 | -129.600 |
| toggleP50 | 12.600 | 16.200 | 3.600 | 13.700 | 13.100 | 0.600 |
| toggleP95 | 46.500 | 48.200 | 1.700 | 70.800 | 56.200 | 14.600 |
| emitP50 | 4.000 | 4.100 | 0.100 | 4.500 | 4.500 | 0.000 |
| pssTotalMb | 241.027 | 244.136 | 3.108 | 242.118 | 241.494 | 0.624 |
| pssRelaunchTotalMb | 220.731 | 223.757 | 3.025 | 222.910 | 221.020 | 1.891 |

The startup effect changes direction (+34.1/-58.0ms); relaunch improves42.0/129.6ms, but the iterator only changes writes and no causal relaunch benefit is established. Toggle p95 worsens1.7/14.6ms; PSS also rises in both directions. This does not justify retaining the application integration or running full acceptance. Remove the optional capability/probe/iterator wiring; preserve candidate APK, sources under `.tmp/15m-source-candidate`, native scratch prototype and all raw reports. The isolated native insert win remains evidence for a possible future design, not application parity. After removal345 library tests pass. Latest full acceptance remains15l10 PASS/12 PB/3 CB/8 FAIL.
