> INCOMPLETE: only8of10paired trial rows were saved. SQLite trials1and5 failed. All verdict counts below are INVALID for acceptance. Original report/raw/logs preserved in `.tmp/16j-incomplete-20261027-1915/`. See ADR0097; corrected protocol is a separate16j2 run.

# Phase 16 shapes — flat objects & hybrid workflow (2026-10-27)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.21 ms, p95 9.09 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 2 / PLATFORM-BOUND 0 / CODE-BOUND 0 / FAIL 84

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.40 ± 0.00 | 7.53 ± 0.15 | 18.8× | FAIL | no control |
| flat | 50.setKey.emitP95 | 1.60 ± 1.12 | 17.60 ± 4.74 | 11.0× | FAIL | no control |
| flat | 50.setKey.domP50 | 2.68 ± 1.73 | 8.37 ± 0.64 | 3.1× | FAIL | no control |
| flat | 50.setKey.domP95 | 9.66 ± 1.02 | 18.30 ± 4.64 | 1.9× | FAIL | no control |
| flat | 50.setKeys.emitP50 | 0.44 ± 0.05 | 8.60 ± 0.46 | 19.5× | FAIL | no control |
| flat | 50.setKeys.emitP95 | 2.40 ± 2.81 | 28.67 ± 5.10 | 11.9× | FAIL | no control |
| flat | 50.setKeys.domP50 | 1.78 ± 0.80 | 9.10 ± 0.35 | 5.1× | FAIL | no control |
| flat | 50.setKeys.domP95 | 8.04 ± 1.40 | 29.30 ± 5.20 | 3.6× | FAIL | no control |
| flat | 50.replace.emitP50 | 0.34 ± 0.05 | 9.23 ± 1.60 | 27.2× | FAIL | no control |
| flat | 50.replace.emitP95 | 2.88 ± 3.60 | 29.43 ± 13.38 | 10.2× | FAIL | no control |
| flat | 50.replace.domP50 | 1.46 ± 0.30 | 9.77 ± 1.66 | 6.7× | FAIL | no control |
| flat | 50.replace.domP95 | 10.60 ± 4.68 | 30.13 ± 13.57 | 2.8× | FAIL | no control |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 7.47 ± 2.89 | 24.9× | FAIL | no control |
| flat | 50.burst.lagP95 | 0.62 ± 0.11 | 14.73 ± 9.08 | 23.8× | FAIL | no control |
| flat | 50.burst.endLag | 0.30 ± 0.07 | 9.47 ± 4.09 | 31.6× | FAIL | no control |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 1.00 ± 0.00 | 1000000000.0× | FAIL |  |
| flat | 50.heapMb | 3.54 ± 0.05 | 4.63 ± 0.00 | 1.3× | FAIL |  |
| flat | 50.pssTotalMb | 223.64 ± 1.44 | 236.56 ± 0.42 | 1.1× | FAIL | allow 4.7 (plugin baseline 2.8 MB) |
| flat | 500.setKey.emitP50 | 0.54 ± 0.13 | 8.17 ± 0.40 | 15.1× | FAIL | no control |
| flat | 500.setKey.emitP95 | 3.14 ± 1.78 | 18.27 ± 2.81 | 5.8× | FAIL | no control |
| flat | 500.setKey.domP50 | 3.70 ± 1.61 | 8.63 ± 0.42 | 2.3× | FAIL | no control |
| flat | 500.setKey.domP95 | 8.16 ± 1.09 | 18.60 ± 2.66 | 2.3× | FAIL | no control |
| flat | 500.setKeys.emitP50 | 0.46 ± 0.05 | 9.70 ± 1.25 | 21.1× | FAIL | no control |
| flat | 500.setKeys.emitP95 | 2.18 ± 2.16 | 17.57 ± 4.34 | 8.1× | FAIL | no control |
| flat | 500.setKeys.domP50 | 1.26 ± 0.27 | 10.37 ± 1.31 | 8.2× | FAIL | no control |
| flat | 500.setKeys.domP95 | 12.16 ± 7.50 | 18.13 ± 4.60 | 1.5× | PASS |  |
| flat | 500.replace.emitP50 | 0.32 ± 0.04 | 8.23 ± 0.87 | 25.7× | FAIL | no control |
| flat | 500.replace.emitP95 | 3.28 ± 2.41 | 23.63 ± 2.65 | 7.2× | FAIL | no control |
| flat | 500.replace.domP50 | 1.30 ± 0.44 | 8.73 ± 0.97 | 6.7× | FAIL | no control |
| flat | 500.replace.domP95 | 8.82 ± 1.18 | 24.07 ± 2.51 | 2.7× | FAIL | no control |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 6.03 ± 0.06 | 15.1× | FAIL | no control |
| flat | 500.burst.lagP95 | 0.88 ± 0.36 | 9.80 ± 1.91 | 11.1× | FAIL | no control |
| flat | 500.burst.endLag | 0.38 ± 0.16 | 7.63 ± 2.10 | 20.1× | FAIL | no control |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 1.00 ± 0.00 | 1000000000.0× | FAIL |  |
| flat | 500.heapMb | 3.95 ± 0.05 | 5.09 ± 0.02 | 1.3× | FAIL |  |
| flat | 500.pssTotalMb | 227.36 ± 1.57 | 237.50 ± 0.59 | 1.0× | FAIL | allow 5.0 (plugin baseline 2.8 MB) |
| flat | 5000.setKey.emitP50 | 1.20 ± 0.23 | 10.13 ± 1.16 | 8.4× | FAIL | no control |
| flat | 5000.setKey.emitP95 | 2.56 ± 1.94 | 23.20 ± 1.51 | 9.1× | FAIL | no control |
| flat | 5000.setKey.domP50 | 6.14 ± 1.49 | 10.97 ± 1.40 | 1.8× | FAIL | no control |
| flat | 5000.setKey.domP95 | 9.26 ± 1.63 | 24.10 ± 2.09 | 2.6× | FAIL | no control |
| flat | 5000.setKeys.emitP50 | 1.52 ± 0.22 | 9.50 ± 0.20 | 6.2× | FAIL | no control |
| flat | 5000.setKeys.emitP95 | 5.52 ± 2.94 | 17.70 ± 3.73 | 3.2× | FAIL | no control |
| flat | 5000.setKeys.domP50 | 3.06 ± 0.42 | 10.50 ± 0.60 | 3.4× | FAIL | no control |
| flat | 5000.setKeys.domP95 | 9.42 ± 3.54 | 18.37 ± 3.52 | 1.9× | FAIL | no control |
| flat | 5000.replace.emitP50 | 0.40 ± 0.07 | 12.53 ± 0.90 | 31.3× | FAIL | no control |
| flat | 5000.replace.emitP95 | 3.08 ± 2.50 | 47.73 ± 13.63 | 15.5× | FAIL | no control |
| flat | 5000.replace.domP50 | 1.82 ± 0.30 | 13.10 ± 0.96 | 7.2× | FAIL | no control |
| flat | 5000.replace.domP95 | 7.92 ± 1.54 | 48.17 ± 13.57 | 6.1× | FAIL | no control |
| flat | 5000.burst.lagP50 | 1.32 ± 0.04 | 7.87 ± 0.38 | 6.0× | FAIL | no control |
| flat | 5000.burst.lagP95 | 2.10 ± 0.37 | 15.23 ± 1.62 | 7.3× | FAIL | no control |
| flat | 5000.burst.endLag | 1.26 ± 0.18 | 9.67 ± 1.12 | 7.7× | FAIL | no control |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 7.96 ± 0.11 | 9.32 ± 0.00 | 1.2× | FAIL |  |
| flat | 5000.pssTotalMb | 230.70 ± 1.80 | 240.10 ± 0.31 | 1.0× | FAIL | allow 4.9 (plugin baseline 2.8 MB) |
| workflow | edit_d1.emitP50 | 0.44 ± 0.09 | 7.90 ± 0.79 | 18.0× | FAIL | no control |
| workflow | edit_d1.emitP95 | 1.22 ± 0.61 | 21.90 ± 5.84 | 18.0× | FAIL | no control |
| workflow | edit_d1.domP50 | 3.08 ± 1.75 | 8.47 ± 0.86 | 2.7× | FAIL | no control |
| workflow | edit_d1.domP95 | 8.80 ± 1.63 | 22.53 ± 6.02 | 2.6× | FAIL | no control |
| workflow | edit_d4.emitP50 | 0.40 ± 0.00 | 8.03 ± 0.25 | 20.1× | FAIL | no control |
| workflow | edit_d4.emitP95 | 1.06 ± 0.40 | 18.17 ± 1.10 | 17.1× | FAIL | no control |
| workflow | edit_d4.domP50 | 3.46 ± 1.55 | 8.80 ± 0.56 | 2.5× | FAIL | no control |
| workflow | edit_d4.domP95 | 9.64 ± 1.22 | 18.63 ± 1.21 | 1.9× | FAIL | no control |
| workflow | edit_d10.emitP50 | 0.40 ± 0.00 | 7.57 ± 0.55 | 18.9× | FAIL | no control |
| workflow | edit_d10.emitP95 | 1.14 ± 0.24 | 15.43 ± 2.35 | 13.5× | FAIL | no control |
| workflow | edit_d10.domP50 | 2.18 ± 1.71 | 8.07 ± 0.65 | 3.7× | FAIL | no control |
| workflow | edit_d10.domP95 | 9.30 ± 3.21 | 17.03 ± 2.54 | 1.8× | FAIL | no control |
| workflow | loadCycle.emitP50 | 8.32 ± 7.23 | 19.20 ± 1.01 | 2.3× | FAIL | no control |
| workflow | loadCycle.emitP95 | 34.00 ± 0.88 | 49.20 ± 3.42 | 1.4× | FAIL | no control |
| workflow | loadCycle.domP50 | 10.06 ± 8.69 | 19.53 ± 0.96 | 1.9× | FAIL | no control |
| workflow | loadCycle.domP95 | 34.40 ± 0.90 | 49.83 ± 3.31 | 1.4× | FAIL | no control |
| workflow | step.emitP50 | 0.34 ± 0.05 | 7.23 ± 0.93 | 21.3× | FAIL | no control |
| workflow | step.emitP95 | 1.44 ± 0.78 | 19.60 ± 4.53 | 13.6× | FAIL | no control |
| workflow | step.domP50 | 2.34 ± 1.69 | 7.63 ± 0.76 | 3.3× | FAIL | no control |
| workflow | step.domP95 | 7.00 ± 0.44 | 19.87 ± 4.57 | 2.8× | FAIL | no control |
| workflow | reset.emitP50 | 0.22 ± 0.04 | 9.10 ± 0.96 | 41.4× | FAIL | no control |
| workflow | reset.emitP95 | 0.78 ± 0.34 | 18.53 ± 7.03 | 23.8× | FAIL | no control |
| workflow | reset.domP50 | 0.24 ± 0.05 | 9.27 ± 1.01 | 38.6× | FAIL | no control |
| workflow | reset.domP95 | 1.46 ± 0.36 | 18.63 ± 7.03 | 12.8× | FAIL | no control |
| workflow | append100.emitP50 | 0.34 ± 0.05 | 12.70 ± 0.35 | 37.4× | FAIL | no control |
| workflow | append100.emitP95 | 0.76 ± 0.53 | 21.30 ± 4.59 | 28.0× | FAIL | no control |
| workflow | append100.domP50 | 1.12 ± 0.36 | 13.13 ± 0.21 | 11.7× | FAIL | no control |
| workflow | append100.domP95 | 5.24 ± 1.95 | 21.73 ± 4.47 | 4.1× | FAIL | no control |
| workflow | heapMb | 3.76 ± 0.04 | 5.05 ± 0.01 | 1.3× | FAIL |  |
| workflow | pssTotalMb | 225.59 ± 1.65 | 241.36 ± 0.23 | 1.1× | FAIL | allow 4.7 (plugin baseline 2.8 MB) |
| workflow | relaunchReadyMs | 1086.58 ± 413.24 | 408.47 ± 20.72 | 0.4× | PASS |  |
| workflow | relaunchHeapMb | 3.28 ± 0.04 | 4.16 ± 0.00 | 1.3× | FAIL |  |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 5.60 | 6.07 | 16.17 | 7.53 | 8.37 | 18.30 |
| 500 | 5.37 | 5.80 | 16.20 | 8.17 | 8.63 | 18.60 |
| 5000 | 6.17 | 6.73 | 17.40 | 10.13 | 10.97 | 24.10 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 127.7 | 135.5 | 95.9 | 101.0 |
| flat 500 | 127.6 | 135.7 | 99.7 | 101.8 |
| flat 5000 | 126.0 | 132.9 | 104.7 | 107.2 |
| workflow | 128.3 | 138.1 | 97.3 | 103.3 |

<details><summary>Raw per-trial data</summary>

```json
[
  {
    "impl": "classic",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.3999999999650754,
          "emitP95": 2.5,
          "domP50": 3.400000000023283,
          "domP95": 8.900000000023283
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8999999999650754,
          "domP50": 1.2000000000116415,
          "domP95": 7.2999999999883585
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 1.400000000023283,
          "domP50": 1.8000000000465661,
          "domP95": 8.299999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.6000000000349246,
          "endLag": 0.29999999998835847,
          "maxBacklog": 0
        },
        "heapMb": 3.563030242919922,
        "heapCode": 1.6881332397460938,
        "heapData": 1.5023841857910156,
        "pssTotalMb": 221.0849609375,
        "pssApp": 126.0126953125,
        "pssRenderer": 95.072265625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 5.7000000000116415,
          "domP50": 5.099999999976717,
          "domP95": 8.5
        },
        "setKeys": {
          "emitP50": 0.3999999999650754,
          "emitP95": 1.3999999999650754,
          "domP50": 1.7000000000116415,
          "domP95": 24.79999999998836
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 6.599999999976717,
          "domP50": 0.9000000000232831,
          "domP95": 7.7999999999883585
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1.5,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.973896026611328,
        "heapCode": 1.6957931518554688,
        "heapData": 1.8916740417480469,
        "pssTotalMb": 224.6171875,
        "pssApp": 125.646484375,
        "pssRenderer": 98.970703125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.400000000023283,
          "domP50": 6.5,
          "domP95": 7.7000000000116415
        },
        "setKeys": {
          "emitP50": 1.400000000023283,
          "emitP95": 9.599999999976717,
          "domP50": 3.099999999976717,
          "domP95": 10.5
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 3.3999999999650754,
          "domP50": 2.2000000000116415,
          "domP95": 9.700000000011642
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999883585,
          "lagP95": 1.900000000023283,
          "endLag": 1.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 7.938030242919922,
        "heapCode": 1.6913642883300781,
        "heapData": 5.722068786621094,
        "pssTotalMb": 228.2900390625,
        "pssApp": 125.01953125,
        "pssRenderer": 103.2705078125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.099999999976717,
        "domP50": 1.7000000000116415,
        "domP95": 9.299999999988358
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1,
        "domP95": 10.200000000011642
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.3999999999650754,
        "domP50": 1.2000000000116415,
        "domP95": 14.799999999988358
      },
      "loadCycle": {
        "emitP50": 14.100000000034925,
        "emitP95": 35.29999999998836,
        "domP50": 16.70000000001164,
        "domP95": 35.79999999998836
      },
      "step": {
        "emitP50": 0.3999999999650754,
        "emitP95": 0.8999999999650754,
        "domP50": 0.7999999999883585,
        "domP95": 6.7000000000116415
      },
      "reset": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.6000000000349246,
        "domP50": 0.29999999998835847,
        "domP95": 1.2000000000116415
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.40000000002328306,
        "domP50": 0.7999999999883585,
        "domP95": 2.2000000000116415
      },
      "heapMb": 3.68280029296875,
      "heapCode": 1.6844482421875,
      "heapData": 1.6282730102539062,
      "pssTotalMb": 222.654296875,
      "pssApp": 126.7919921875,
      "pssRenderer": 95.8623046875,
      "relaunchReadyMs": 626.2999999999884,
      "relaunchHeapMb": 3.2578582763671875,
      "relaunchHeapCode": 1.4545974731445312,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.5,
          "emitP95": 14.099999999976717,
          "domP50": 8.099999999976717,
          "domP95": 15
        },
        "setKeys": {
          "emitP50": 8.699999999953434,
          "emitP95": 33.699999999953434,
          "domP50": 9.300000000046566,
          "domP95": 34.40000000002328
        },
        "replace": {
          "emitP50": 9.099999999976717,
          "emitP95": 39.29999999993015,
          "domP50": 9.599999999976717,
          "domP95": 39.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 10.099999999976717,
          "endLag": 10.099999999976717,
          "maxBacklog": 1
        },
        "heapMb": 4.632007598876953,
        "heapCode": 2.594593048095703,
        "heapData": 1.6097793579101562,
        "pssTotalMb": 236.1220703125,
        "pssApp": 135.1396484375,
        "pssRenderer": 100.982421875,
        "control": {
          "emitP50": 5.600000000093132,
          "emitP95": 16.199999999953434,
          "domP50": 5.900000000023283,
          "domP95": 16.300000000046566
        },
        "fCommitP50": 3.1000000000931323,
        "fCommitP95": 10.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 8.599999999976717,
          "emitP95": 20.899999999906868,
          "domP50": 9.099999999976717,
          "domP95": 21.099999999976717
        },
        "setKeys": {
          "emitP50": 11,
          "emitP95": 22.399999999906868,
          "domP50": 11.599999999976717,
          "domP95": 23.29999999993015
        },
        "replace": {
          "emitP50": 7.5,
          "emitP95": 26.599999999976717,
          "domP50": 7.900000000023283,
          "domP95": 26.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 8.79999999993015,
          "endLag": 10,
          "maxBacklog": 1
        },
        "heapMb": 5.076473236083984,
        "heapCode": 2.6075439453125,
        "heapData": 2.026683807373047,
        "pssTotalMb": 236.8916015625,
        "pssApp": 135.119140625,
        "pssRenderer": 101.7724609375,
        "control": {
          "emitP50": 5.100000000093132,
          "emitP95": 11.600000000093132,
          "domP50": 5.600000000093132,
          "domP95": 11.900000000023283
        },
        "fCommitP50": 3.299999999930151,
        "fCommitP95": 5
      },
      "5000": {
        "setKey": {
          "emitP50": 10.70000000006985,
          "emitP95": 24.900000000023283,
          "domP50": 11.100000000093132,
          "domP95": 26.5
        },
        "setKeys": {
          "emitP50": 9.5,
          "emitP95": 13.400000000023283,
          "domP50": 9.900000000023283,
          "domP95": 14.300000000046566
        },
        "replace": {
          "emitP50": 12.599999999976717,
          "emitP95": 32.09999999997672,
          "domP50": 13.5,
          "domP95": 32.59999999997672
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.600000000093132,
          "lagP95": 13.5,
          "endLag": 8.699999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.315101623535156,
        "heapCode": 2.6438140869140625,
        "heapData": 6.0852203369140625,
        "pssTotalMb": 239.73828125,
        "pssApp": 132.6748046875,
        "pssRenderer": 107.0634765625,
        "control": {
          "emitP50": 5.900000000023283,
          "emitP95": 15.800000000046566,
          "domP50": 6.800000000046566,
          "domP95": 16.800000000046566
        },
        "fCommitP50": 3.200000000069849,
        "fCommitP95": 5.700000000069849
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.300000000046566,
        "emitP95": 15.400000000023283,
        "domP50": 7.700000000069849,
        "domP95": 15.800000000046566
      },
      "edit_d4": {
        "emitP50": 8.300000000046566,
        "emitP95": 19.400000000023283,
        "domP50": 8.900000000023283,
        "domP95": 20
      },
      "edit_d10": {
        "emitP50": 7.599999999976717,
        "emitP95": 13.400000000023283,
        "domP50": 8.100000000093132,
        "domP95": 14.099999999976717
      },
      "loadCycle": {
        "emitP50": 20.099999999976717,
        "emitP95": 53.09999999997672,
        "domP50": 20.400000000023283,
        "domP95": 53.59999999997672
      },
      "step": {
        "emitP50": 7.5,
        "emitP95": 16.5,
        "domP50": 7.800000000046566,
        "domP95": 16.70000000006985
      },
      "reset": {
        "emitP50": 9.5,
        "emitP95": 25.899999999906868,
        "domP50": 9.900000000023283,
        "domP95": 26
      },
      "append100": {
        "emitP50": 12.300000000046566,
        "emitP95": 18.599999999976717,
        "domP50": 12.900000000023283,
        "domP95": 19.099999999976717
      },
      "control": {
        "emitP50": 5.900000000023283,
        "emitP95": 12.900000000023283,
        "domP50": 6.099999999976717,
        "domP95": 13.400000000023283
      },
      "heapMb": 5.047412872314453,
      "heapCode": 2.7611122131347656,
      "heapData": 1.8511009216308594,
      "pssTotalMb": 241.4609375,
      "pssApp": 138.2724609375,
      "pssRenderer": 103.1884765625,
      "relaunchReadyMs": 419,
      "relaunchHeapMb": 4.160064697265625,
      "relaunchHeapCode": 2.0291824340820312,
      "relaunchHeapData": 1.7611541748046875
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7000000000698492,
          "domP50": 1.5,
          "domP95": 11.199999999953434
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.2000000000698492,
          "domP50": 1.2999999999301508,
          "domP95": 8.70000000006985
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.5,
          "domP50": 1.6999999999534339,
          "domP95": 17
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.8000000000465661,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.5631065368652344,
        "heapCode": 1.6882095336914062,
        "heapData": 1.5023841857910156,
        "pssTotalMb": 224.4384765625,
        "pssApp": 128.2705078125,
        "pssRenderer": 96.16796875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 3.599999999976717,
          "domP50": 2.5,
          "domP95": 9.400000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 6,
          "domP50": 1,
          "domP95": 6.700000000069849
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 4.899999999906868,
          "domP50": 1.6000000000931323,
          "domP95": 7.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6999999999534339,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.869709014892578,
        "heapCode": 1.6002349853515625,
        "heapData": 1.8889617919921875,
        "pssTotalMb": 228.181640625,
        "pssApp": 128.53125,
        "pssRenderer": 99.650390625
      },
      "5000": {
        "setKey": {
          "emitP50": 1,
          "emitP95": 1.7999999999301508,
          "domP50": 6.799999999930151,
          "domP95": 9.199999999953434
        },
        "setKeys": {
          "emitP50": 1.7000000000698492,
          "emitP95": 6.200000000069849,
          "domP50": 3.299999999930151,
          "domP95": 7.300000000046566
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.900000000023283,
          "domP50": 1.6999999999534339,
          "domP95": 6.200000000069849
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 2.099999999976717,
          "endLag": 1.5,
          "maxBacklog": 0
        },
        "heapMb": 7.938091278076172,
        "heapCode": 1.6914253234863281,
        "heapData": 5.722068786621094,
        "pssTotalMb": 230.2490234375,
        "pssApp": 125.6796875,
        "pssRenderer": 104.5693359375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 2.099999999976717,
        "domP50": 1.8999999999068677,
        "domP95": 9
      },
      "edit_d4": {
        "emitP50": 0.39999999990686774,
        "emitP95": 1.5,
        "domP50": 4.299999999930151,
        "domP95": 9.20000000006985
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.2999999999301508,
        "domP50": 5.199999999953434,
        "domP95": 8.099999999976717
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 34.5,
        "domP50": 0.5,
        "domP95": 34.79999999993015
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1,
        "domP50": 4.900000000023283,
        "domP95": 6.400000000023283
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 0.6999999999534339,
        "domP50": 0.19999999995343387,
        "domP95": 1.599999999976717
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.7000000000698492,
        "domP50": 1.1999999999534339,
        "domP95": 5.200000000069849
      },
      "heapMb": 3.7761268615722656,
      "heapCode": 1.7696037292480469,
      "heapData": 1.6309852600097656,
      "pssTotalMb": 226.34765625,
      "pssApp": 128.6572265625,
      "pssRenderer": 97.6904296875,
      "relaunchReadyMs": 1480.7000000000698,
      "relaunchHeapMb": 3.2578811645507812,
      "relaunchHeapCode": 1.4545745849609375,
      "relaunchHeapData": 1.443756103515625
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.9000000000232831,
          "domP50": 1.7000000000698492,
          "domP95": 9.70000000006985
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.6000000000931323,
          "domP50": 2.699999999953434,
          "domP95": 10
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 9.29999999993015,
          "domP50": 1.5,
          "domP95": 14.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.5630760192871094,
        "heapCode": 1.6881790161132812,
        "heapData": 1.5023841857910156,
        "pssTotalMb": 224.35546875,
        "pssApp": 128.1474609375,
        "pssRenderer": 96.2080078125
      },
      "500": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.8000000000465661,
          "domP50": 5.599999999976717,
          "domP95": 6.400000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.3000000000465661,
          "domP50": 1.3000000000465661,
          "domP95": 12.20000000006985
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.099999999976717,
          "domP50": 1.1999999999534339,
          "domP95": 10.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7999999999301508,
          "endLag": 0.5999999999767169,
          "maxBacklog": 0
        },
        "heapMb": 3.973896026611328,
        "heapCode": 1.6957931518554688,
        "heapData": 1.8916740417480469,
        "pssTotalMb": 227.845703125,
        "pssApp": 127.9521484375,
        "pssRenderer": 99.8935546875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.5,
          "domP50": 6.900000000023283,
          "domP95": 8
        },
        "setKeys": {
          "emitP50": 1.400000000023283,
          "emitP95": 3.300000000046566,
          "domP50": 2.599999999976717,
          "domP95": 4.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.5,
          "domP50": 1.8000000000465661,
          "domP95": 7.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.1000000000931323,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 7.833648681640625,
        "heapCode": 1.5957756042480469,
        "heapData": 5.719356536865234,
        "pssTotalMb": 231.7021484375,
        "pssApp": 127.046875,
        "pssRenderer": 104.6552734375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.40000000002328306,
        "domP50": 5.5,
        "domP95": 6.200000000069849
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.5,
        "domP50": 3.699999999953434,
        "domP95": 8.5
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1999999999534339,
        "domP50": 1.5,
        "domP95": 9.099999999976717
      },
      "loadCycle": {
        "emitP50": 12.20000000006985,
        "emitP95": 33.59999999997672,
        "domP50": 16,
        "domP95": 33.89999999990687
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.400000000023283,
        "domP50": 1.900000000023283,
        "domP95": 7.5
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 1.3000000000465661,
        "domP50": 0.2000000000698492,
        "domP95": 2
      },
      "append100": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.5999999999767169,
        "domP50": 1.7000000000698492,
        "domP95": 7.599999999976717
      },
      "heapMb": 3.776531219482422,
      "heapCode": 1.7695503234863281,
      "heapData": 1.6309852600097656,
      "pssTotalMb": 226.0771484375,
      "pssApp": 128.4033203125,
      "pssRenderer": 97.673828125,
      "relaunchReadyMs": 656,
      "relaunchHeapMb": 3.2579421997070312,
      "relaunchHeapCode": 1.45465087890625,
      "relaunchHeapData": 1.443756103515625
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.399999999906868,
          "emitP95": 15.70000000006985,
          "domP50": 7.899999999906868,
          "domP95": 16.300000000046566
        },
        "setKeys": {
          "emitP50": 9,
          "emitP95": 23.5,
          "domP50": 9.300000000046566,
          "domP95": 24
        },
        "replace": {
          "emitP50": 7.699999999953434,
          "emitP95": 14.20000000006985,
          "domP50": 8.199999999953434,
          "domP95": 14.600000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.599999999976717,
          "lagP95": 8.900000000023283,
          "endLag": 5.099999999976717,
          "maxBacklog": 1
        },
        "heapMb": 4.630863189697266,
        "heapCode": 2.5933380126953125,
        "heapData": 1.6097793579101562,
        "pssTotalMb": 236.9501953125,
        "pssApp": 135.857421875,
        "pssRenderer": 101.0927734375,
        "control": {
          "emitP50": 5.5,
          "emitP95": 15.29999999993015,
          "domP50": 6.400000000023283,
          "domP95": 15.5
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 12.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 7.799999999930151,
          "emitP95": 15.300000000046566,
          "domP50": 8.300000000046566,
          "domP95": 15.800000000046566
        },
        "setKeys": {
          "emitP50": 8.5,
          "emitP95": 16.300000000046566,
          "domP50": 9,
          "domP95": 16.599999999976717
        },
        "replace": {
          "emitP50": 8,
          "emitP95": 21.5,
          "domP50": 8.5,
          "domP95": 22.100000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.099999999976717,
          "lagP95": 8.599999999976717,
          "endLag": 6.900000000023283,
          "maxBacklog": 1
        },
        "heapMb": 5.0756378173828125,
        "heapCode": 2.6067657470703125,
        "heapData": 2.026683807373047,
        "pssTotalMb": 237.55859375,
        "pssApp": 135.6923828125,
        "pssRenderer": 101.8662109375,
        "control": {
          "emitP50": 5.700000000069849,
          "emitP95": 20.400000000023283,
          "domP50": 6,
          "domP95": 20.800000000046566
        },
        "fCommitP50": 3.1000000000931323,
        "fCommitP95": 11.300000000046566
      },
      "5000": {
        "setKey": {
          "emitP50": 10.900000000023283,
          "emitP95": 22.699999999953434,
          "domP50": 12.300000000046566,
          "domP95": 23.099999999976717
        },
        "setKeys": {
          "emitP50": 9.29999999993015,
          "emitP95": 20,
          "domP50": 11.099999999976717,
          "domP95": 20.5
        },
        "replace": {
          "emitP50": 13.400000000023283,
          "emitP95": 54,
          "domP50": 13.79999999993015,
          "domP95": 54.40000000002328
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.300000000046566,
          "lagP95": 15.5,
          "endLag": 10.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.316974639892578,
        "heapCode": 2.645660400390625,
        "heapData": 6.085224151611328,
        "pssTotalMb": 240.2685546875,
        "pssApp": 133.0390625,
        "pssRenderer": 107.2294921875,
        "control": {
          "emitP50": 7.400000000023283,
          "emitP95": 20.699999999953434,
          "domP50": 7.699999999953434,
          "domP95": 21
        },
        "fCommitP50": 3.800000000046566,
        "fCommitP95": 7.599999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.800000000046566,
        "emitP95": 23.599999999976717,
        "domP50": 9.400000000023283,
        "domP95": 24.400000000023283
      },
      "edit_d4": {
        "emitP50": 7.800000000046566,
        "emitP95": 17.79999999993015,
        "domP50": 8.199999999953434,
        "domP95": 18.199999999953434
      },
      "edit_d10": {
        "emitP50": 7,
        "emitP95": 18,
        "domP50": 7.400000000023283,
        "domP95": 18.400000000023283
      },
      "loadCycle": {
        "emitP50": 19.400000000023283,
        "emitP95": 47.800000000046566,
        "domP50": 19.70000000006985,
        "domP95": 48.5
      },
      "step": {
        "emitP50": 6.200000000069849,
        "emitP95": 17.5,
        "domP50": 6.800000000046566,
        "domP95": 17.800000000046566
      },
      "reset": {
        "emitP50": 9.800000000046566,
        "emitP95": 11.900000000023283,
        "domP50": 9.800000000046566,
        "domP95": 12
      },
      "append100": {
        "emitP50": 12.900000000023283,
        "emitP95": 26.599999999976717,
        "domP50": 13.20000000006985,
        "domP95": 26.900000000023283
      },
      "control": {
        "emitP50": 7.300000000046566,
        "emitP95": 17.899999999906868,
        "domP50": 7.599999999976717,
        "domP95": 18.099999999976717
      },
      "heapMb": 5.0570220947265625,
      "heapCode": 2.7607650756835938,
      "heapData": 1.8610382080078125,
      "pssTotalMb": 241.5205078125,
      "pssApp": 138.12109375,
      "pssRenderer": 103.3994140625,
      "relaunchReadyMs": 421.80000000004657,
      "relaunchHeapMb": 4.156379699707031,
      "relaunchHeapCode": 2.026397705078125,
      "relaunchHeapData": 1.7603683471679688
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.699999999953434,
          "emitP95": 23,
          "domP50": 9.099999999976717,
          "domP95": 23.599999999976717
        },
        "setKeys": {
          "emitP50": 8.099999999976717,
          "emitP95": 28.800000000046566,
          "domP50": 8.699999999953434,
          "domP95": 29.5
        },
        "replace": {
          "emitP50": 10.900000000023283,
          "emitP95": 34.79999999993015,
          "domP50": 11.5,
          "domP95": 36.09999999997672
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 10.800000000046566,
          "lagP95": 25.199999999953434,
          "endLag": 13.199999999953434,
          "maxBacklog": 1
        },
        "heapMb": 4.631099700927734,
        "heapCode": 2.593402862548828,
        "heapData": 1.6097984313964844,
        "pssTotalMb": 236.6162109375,
        "pssApp": 135.5849609375,
        "pssRenderer": 101.03125,
        "control": {
          "emitP50": 5.700000000069849,
          "emitP95": 16.29999999993015,
          "domP50": 5.900000000023283,
          "domP95": 16.699999999953434
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 8.300000000046566
      },
      "500": {
        "setKey": {
          "emitP50": 8.099999999976717,
          "emitP95": 18.599999999976717,
          "domP50": 8.5,
          "domP95": 18.900000000023283
        },
        "setKeys": {
          "emitP50": 9.599999999976717,
          "emitP95": 14,
          "domP50": 10.5,
          "domP95": 14.5
        },
        "replace": {
          "emitP50": 9.199999999953434,
          "emitP95": 22.79999999993015,
          "domP50": 9.800000000046566,
          "domP95": 23.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 12,
          "endLag": 6,
          "maxBacklog": 1
        },
        "heapMb": 5.113861083984375,
        "heapCode": 2.6056785583496094,
        "heapData": 2.0636367797851562,
        "pssTotalMb": 238.05859375,
        "pssApp": 136.197265625,
        "pssRenderer": 101.861328125,
        "control": {
          "emitP50": 5.299999999930151,
          "emitP95": 15.699999999953434,
          "domP50": 5.800000000046566,
          "domP95": 15.900000000023283
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 12.099999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 8.79999999993015,
          "emitP95": 22,
          "domP50": 9.5,
          "domP95": 22.699999999953434
        },
        "setKeys": {
          "emitP50": 9.70000000006985,
          "emitP95": 19.70000000006985,
          "domP50": 10.5,
          "domP95": 20.300000000046566
        },
        "replace": {
          "emitP50": 11.599999999976717,
          "emitP95": 57.10000000009313,
          "domP50": 12,
          "domP95": 57.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.700000000069849,
          "lagP95": 16.699999999953434,
          "endLag": 9.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.317390441894531,
        "heapCode": 2.646137237548828,
        "heapData": 6.0852203369140625,
        "pssTotalMb": 240.283203125,
        "pssApp": 132.880859375,
        "pssRenderer": 107.40234375,
        "control": {
          "emitP50": 5.200000000069849,
          "emitP95": 14.099999999976717,
          "domP50": 5.700000000069849,
          "domP95": 14.400000000023283
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 8
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.599999999976717,
        "emitP95": 26.699999999953434,
        "domP50": 8.300000000046566,
        "domP95": 27.400000000023283
      },
      "edit_d4": {
        "emitP50": 8,
        "emitP95": 17.29999999993015,
        "domP50": 9.300000000046566,
        "domP95": 17.699999999953434
      },
      "edit_d10": {
        "emitP50": 8.099999999976717,
        "emitP95": 14.900000000023283,
        "domP50": 8.70000000006985,
        "domP95": 18.599999999976717
      },
      "loadCycle": {
        "emitP50": 18.100000000093132,
        "emitP95": 46.699999999953434,
        "domP50": 18.5,
        "domP95": 47.39999999990687
      },
      "step": {
        "emitP50": 8,
        "emitP95": 24.800000000046566,
        "domP50": 8.300000000046566,
        "domP95": 25.099999999976717
      },
      "reset": {
        "emitP50": 8,
        "emitP95": 17.800000000046566,
        "domP50": 8.099999999976717,
        "domP95": 17.900000000023283
      },
      "append100": {
        "emitP50": 12.900000000023283,
        "emitP95": 18.70000000006985,
        "domP50": 13.300000000046566,
        "domP95": 19.20000000006985
      },
      "control": {
        "emitP50": 6.799999999930151,
        "emitP95": 20.599999999976717,
        "domP50": 7,
        "domP95": 20.900000000023283
      },
      "heapMb": 5.057399749755859,
      "heapCode": 2.7611312866210938,
      "heapData": 1.8610382080078125,
      "pssTotalMb": 241.091796875,
      "pssApp": 137.7890625,
      "pssRenderer": 103.302734375,
      "relaunchReadyMs": 384.5999999999767,
      "relaunchHeapMb": 4.156349182128906,
      "relaunchHeapCode": 2.0264205932617188,
      "relaunchHeapData": 1.76031494140625
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.099999999976717,
          "domP50": 5.400000000023283,
          "domP95": 9.900000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 0.8999999999068677,
          "domP50": 1.099999999976717,
          "domP95": 6.299999999930151
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.3000000000465661,
          "domP50": 1.1999999999534339,
          "domP95": 6.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.46087646484375,
        "heapCode": 1.5946884155273438,
        "heapData": 1.4996719360351562,
        "pssTotalMb": 224.017578125,
        "pssApp": 128.1484375,
        "pssRenderer": 95.869140625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 3.099999999976717,
          "domP50": 3.400000000023283,
          "domP95": 8.199999999953434
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6999999999534339,
          "domP50": 1.099999999976717,
          "domP95": 10.70000000006985
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.2000000000698492,
          "domP50": 1.8999999999068677,
          "domP95": 10
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.5999999999767169,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.973857879638672,
        "heapCode": 1.6957550048828125,
        "heapData": 1.8916740417480469,
        "pssTotalMb": 228.515625,
        "pssApp": 128.38671875,
        "pssRenderer": 100.12890625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.2000000000698492,
          "emitP95": 2.099999999976717,
          "domP50": 7,
          "domP95": 9.599999999976717
        },
        "setKeys": {
          "emitP50": 1.8000000000465661,
          "emitP95": 6.400000000023283,
          "domP50": 3.6000000000931323,
          "domP95": 11.300000000046566
        },
        "replace": {
          "emitP50": 0.5,
          "emitP95": 7.299999999930151,
          "domP50": 2,
          "domP95": 9.399999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 2.700000000069849,
          "endLag": 1.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 7.938091278076172,
        "heapCode": 1.6914253234863281,
        "heapData": 5.722068786621094,
        "pssTotalMb": 230.171875,
        "pssApp": 125.6611328125,
        "pssRenderer": 104.5107421875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.099999999976717,
        "domP50": 1.900000000023283,
        "domP95": 8.79999999993015
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7999999999301508,
        "domP50": 5.100000000093132,
        "domP95": 8.800000000046566
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1.1999999999534339,
        "domP95": 8
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33.40000000002328,
        "domP50": 0.5999999999767169,
        "domP95": 33.800000000046566
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.800000000046566,
        "domP50": 3.099999999976717,
        "domP95": 7.199999999953434
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.40000000002328306,
        "domP50": 0.30000000004656613,
        "domP95": 1.099999999976717
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.5999999999767169,
        "domP50": 1,
        "domP95": 5.799999999930151
      },
      "heapMb": 3.7760887145996094,
      "heapCode": 1.7695655822753906,
      "heapData": 1.6309852600097656,
      "pssTotalMb": 226.626953125,
      "pssApp": 129.009765625,
      "pssRenderer": 97.6171875,
      "relaunchReadyMs": 1275.3000000000466,
      "relaunchHeapMb": 3.3520736694335938,
      "relaunchHeapCode": 1.5398712158203125,
      "relaunchHeapData": 1.4465255737304688
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8000000000465661,
          "domP50": 1.400000000023283,
          "domP95": 8.600000000093132
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 7.399999999906868,
          "domP50": 2.599999999976717,
          "domP95": 7.899999999906868
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.9000000000232831,
          "domP50": 1.099999999976717,
          "domP95": 7
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.563068389892578,
        "heapCode": 1.68817138671875,
        "heapData": 1.5023841857910156,
        "pssTotalMb": 224.302734375,
        "pssApp": 127.974609375,
        "pssRenderer": 96.328125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 2.5,
          "domP50": 1.8999999999068677,
          "domP95": 8.300000000046566
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.5,
          "domP50": 1.2000000000698492,
          "domP95": 6.399999999906868
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.599999999976717,
          "domP50": 0.9000000000232831,
          "domP95": 8.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7999999999301508,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.973896026611328,
        "heapCode": 1.6957931518554688,
        "heapData": 1.8916740417480469,
        "pssTotalMb": 227.65625,
        "pssApp": 127.6904296875,
        "pssRenderer": 99.9658203125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 6,
          "domP50": 3.5,
          "domP95": 11.800000000046566
        },
        "setKeys": {
          "emitP50": 1.3000000000465661,
          "emitP95": 2.099999999976717,
          "domP50": 2.699999999953434,
          "domP95": 13.5
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1.3000000000465661,
          "domP50": 1.400000000023283,
          "domP95": 7
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999301508,
          "lagP95": 1.7000000000698492,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.129283905029297,
        "heapCode": 1.8736457824707031,
        "heapData": 5.725597381591797,
        "pssTotalMb": 233.083984375,
        "pssApp": 126.7509765625,
        "pssRenderer": 106.3330078125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.400000000023283,
        "domP50": 4.400000000023283,
        "domP95": 10.70000000006985
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7000000000698492,
        "domP50": 3.199999999953434,
        "domP95": 11.5
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 1.8000000000465661,
        "domP95": 6.5
      },
      "loadCycle": {
        "emitP50": 14.400000000023283,
        "emitP95": 33.199999999953434,
        "domP50": 16.5,
        "domP95": 33.699999999953434
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.1000000000931323,
        "domP50": 1,
        "domP95": 7.199999999953434
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 0.9000000000232831,
        "domP50": 0.19999999995343387,
        "domP95": 1.400000000023283
      },
      "append100": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.5,
        "domP50": 0.9000000000232831,
        "domP95": 5.399999999906868
      },
      "heapMb": 3.7765464782714844,
      "heapCode": 1.7695655822753906,
      "heapData": 1.6309852600097656,
      "pssTotalMb": 226.2568359375,
      "pssApp": 128.6396484375,
      "pssRenderer": 97.6171875,
      "relaunchReadyMs": 1394.5999999999767,
      "relaunchHeapMb": 3.25787353515625,
      "relaunchHeapCode": 1.4546127319335938,
      "relaunchHeapData": 1.4437255859375
    }
  }
]
```
</details>
