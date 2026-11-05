# Phase 16 shapes — flat objects & hybrid workflow (2026-10-26)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.60 ms, p95 10.71 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND: latency excess ≤ classic SD + F_commit × commits + sqlite SD.
  - FAIL: everything else. Memory has no platform control yet.

**Acceptance (preliminary):** PASS 1 / PLATFORM-BOUND 19 / FAIL 66

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.38 ± 0.08 | 10.34 ± 1.71 | 27.2× | FAIL | allow 5.4 (F_commit×1) |
| flat | 50.setKey.emitP95 | 1.48 ± 1.19 | 22.60 ± 5.83 | 15.3× | FAIL | allow 17.7 (F_commit×1) |
| flat | 50.setKey.domP50 | 4.30 ± 1.79 | 11.30 ± 1.84 | 2.6× | PLATFORM-BOUND | allow 7.2 (F_commit×1) |
| flat | 50.setKey.domP95 | 9.86 ± 2.18 | 23.40 ± 5.68 | 2.4× | PLATFORM-BOUND | allow 18.6 (F_commit×1) |
| flat | 50.setKeys.emitP50 | 0.36 ± 0.05 | 16.32 ± 0.94 | 45.3× | FAIL | allow 4.6 (F_commit×1) |
| flat | 50.setKeys.emitP95 | 2.00 ± 0.90 | 30.64 ± 3.61 | 15.3× | FAIL | allow 15.2 (F_commit×1) |
| flat | 50.setKeys.domP50 | 3.74 ± 2.11 | 17.00 ± 0.91 | 4.5× | FAIL | allow 6.6 (F_commit×1) |
| flat | 50.setKeys.domP95 | 8.12 ± 1.61 | 31.96 ± 4.62 | 3.9× | FAIL | allow 16.9 (F_commit×1) |
| flat | 50.replace.emitP50 | 0.34 ± 0.05 | 9.36 ± 1.46 | 27.5× | FAIL | allow 5.1 (F_commit×1) |
| flat | 50.replace.emitP95 | 2.10 ± 1.67 | 20.70 ± 4.56 | 9.9× | FAIL | allow 16.9 (F_commit×1) |
| flat | 50.replace.domP50 | 1.68 ± 1.22 | 10.32 ± 1.83 | 6.1× | FAIL | allow 6.6 (F_commit×1) |
| flat | 50.replace.domP95 | 8.94 ± 2.60 | 21.56 ± 4.95 | 2.4× | PLATFORM-BOUND | allow 18.3 (F_commit×1) |
| flat | 50.burst.lagP50 | 0.32 ± 0.04 | 7.74 ± 0.89 | 24.2× | FAIL | allow 4.5 (F_commit×1) |
| flat | 50.burst.lagP95 | 0.86 ± 0.26 | 14.76 ± 3.78 | 17.2× | PLATFORM-BOUND | allow 14.8 (F_commit×1) |
| flat | 50.burst.endLag | 0.32 ± 0.15 | 18.36 ± 17.87 | 57.4× | PLATFORM-BOUND | allow 21.6 (F_commit×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 1.20 ± 0.45 | 1200000000.0× | FAIL |  |
| flat | 50.heapMb | 3.64 ± 0.10 | 4.61 ± 0.00 | 1.3× | FAIL |  |
| flat | 50.pssTotalMb | 218.37 ± 1.13 | 231.25 ± 1.60 | 1.1× | FAIL |  |
| flat | 500.setKey.emitP50 | 0.54 ± 0.05 | 10.24 ± 0.98 | 19.0× | FAIL | allow 4.6 (F_commit×1) |
| flat | 500.setKey.emitP95 | 1.62 ± 0.58 | 23.40 ± 5.48 | 14.4× | FAIL | allow 16.8 (F_commit×1) |
| flat | 500.setKey.domP50 | 3.74 ± 1.56 | 10.94 ± 0.81 | 2.9× | FAIL | allow 6.0 (F_commit×1) |
| flat | 500.setKey.domP95 | 9.82 ± 2.01 | 24.14 ± 5.49 | 2.5× | PLATFORM-BOUND | allow 18.2 (F_commit×1) |
| flat | 500.setKeys.emitP50 | 0.50 ± 0.07 | 15.30 ± 0.74 | 30.6× | FAIL | allow 4.4 (F_commit×1) |
| flat | 500.setKeys.emitP95 | 5.42 ± 3.45 | 25.30 ± 2.36 | 4.7× | FAIL | allow 16.5 (F_commit×1) |
| flat | 500.setKeys.domP50 | 2.80 ± 1.33 | 16.10 ± 0.85 | 5.7× | FAIL | allow 5.8 (F_commit×1) |
| flat | 500.setKeys.domP95 | 11.76 ± 4.40 | 25.80 ± 2.22 | 2.2× | PLATFORM-BOUND | allow 17.3 (F_commit×1) |
| flat | 500.replace.emitP50 | 0.32 ± 0.04 | 13.08 ± 1.13 | 40.9× | FAIL | allow 4.8 (F_commit×1) |
| flat | 500.replace.emitP95 | 3.40 ± 2.98 | 25.60 ± 3.53 | 7.5× | FAIL | allow 17.2 (F_commit×1) |
| flat | 500.replace.domP50 | 2.36 ± 1.65 | 13.70 ± 0.87 | 5.8× | FAIL | allow 6.1 (F_commit×1) |
| flat | 500.replace.domP95 | 11.02 ± 1.73 | 26.20 ± 3.45 | 2.4× | PLATFORM-BOUND | allow 15.9 (F_commit×1) |
| flat | 500.burst.lagP50 | 0.44 ± 0.05 | 8.04 ± 0.80 | 18.3× | FAIL | allow 4.5 (F_commit×1) |
| flat | 500.burst.lagP95 | 0.90 ± 0.12 | 18.28 ± 5.47 | 20.3× | FAIL | allow 16.3 (F_commit×1) |
| flat | 500.burst.endLag | 0.38 ± 0.15 | 16.32 ± 18.62 | 42.9× | PLATFORM-BOUND | allow 22.4 (F_commit×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 1.40 ± 0.89 | 1400000000.0× | FAIL |  |
| flat | 500.heapMb | 3.95 ± 0.05 | 5.08 ± 0.02 | 1.3× | FAIL |  |
| flat | 500.pssTotalMb | 222.01 ± 0.15 | 232.45 ± 1.73 | 1.0× | FAIL |  |
| flat | 5000.setKey.emitP50 | 1.14 ± 0.05 | 13.06 ± 2.47 | 11.5× | FAIL | allow 6.1 (F_commit×1) |
| flat | 5000.setKey.emitP95 | 1.96 ± 0.38 | 29.26 ± 5.34 | 14.9× | FAIL | allow 16.4 (F_commit×1) |
| flat | 5000.setKey.domP50 | 6.86 ± 0.18 | 14.10 ± 2.32 | 2.1× | FAIL | allow 6.1 (F_commit×1) |
| flat | 5000.setKey.domP95 | 8.36 ± 0.36 | 32.36 ± 4.53 | 3.9× | FAIL | allow 15.6 (F_commit×1) |
| flat | 5000.setKeys.emitP50 | 1.58 ± 0.15 | 16.44 ± 0.84 | 10.4× | FAIL | allow 4.6 (F_commit×1) |
| flat | 5000.setKeys.emitP95 | 6.60 ± 2.24 | 58.00 ± 23.06 | 8.8× | FAIL | allow 36.0 (F_commit×1) |
| flat | 5000.setKeys.domP50 | 4.42 ± 1.46 | 17.20 ± 0.75 | 3.9× | FAIL | allow 5.8 (F_commit×1) |
| flat | 5000.setKeys.domP95 | 15.42 ± 2.20 | 58.54 ± 22.92 | 3.8× | FAIL | allow 35.8 (F_commit×1) |
| flat | 5000.replace.emitP50 | 0.40 ± 0.07 | 48.90 ± 1.44 | 122.2× | FAIL | allow 5.1 (F_commit×1) |
| flat | 5000.replace.emitP95 | 4.86 ± 4.54 | 72.74 ± 23.83 | 15.0× | FAIL | allow 39.1 (F_commit×1) |
| flat | 5000.replace.domP50 | 1.66 ± 0.27 | 49.42 ± 1.55 | 29.8× | FAIL | allow 5.4 (F_commit×1) |
| flat | 5000.replace.domP95 | 9.54 ± 2.63 | 73.14 ± 23.83 | 7.7× | FAIL | allow 37.2 (F_commit×1) |
| flat | 5000.burst.lagP50 | 1.44 ± 0.05 | 8.98 ± 0.94 | 6.2× | FAIL | allow 4.6 (F_commit×1) |
| flat | 5000.burst.lagP95 | 3.32 ± 1.96 | 21.22 ± 8.97 | 6.4× | PLATFORM-BOUND | allow 21.6 (F_commit×1) |
| flat | 5000.burst.endLag | 1.50 ± 0.31 | 11.42 ± 4.34 | 7.6× | FAIL | allow 8.3 (F_commit×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 7.92 ± 0.05 | 9.33 ± 0.07 | 1.2× | FAIL |  |
| flat | 5000.pssTotalMb | 226.72 ± 0.23 | 241.47 ± 1.36 | 1.1× | FAIL |  |
| workflow | edit_d1.emitP50 | 0.40 ± 0.00 | 9.72 ± 0.86 | 24.3× | FAIL | allow 4.5 (F_commit×1) |
| workflow | edit_d1.emitP95 | 2.02 ± 0.82 | 23.18 ± 3.64 | 11.5× | FAIL | allow 15.2 (F_commit×1) |
| workflow | edit_d1.domP50 | 2.04 ± 0.97 | 10.46 ± 1.10 | 5.1× | FAIL | allow 5.7 (F_commit×1) |
| workflow | edit_d1.domP95 | 9.88 ± 0.92 | 24.46 ± 3.97 | 2.5× | PLATFORM-BOUND | allow 15.6 (F_commit×1) |
| workflow | edit_d4.emitP50 | 0.40 ± 0.00 | 9.92 ± 1.16 | 24.8× | FAIL | allow 4.8 (F_commit×1) |
| workflow | edit_d4.emitP95 | 1.76 ± 0.90 | 20.58 ± 3.07 | 11.7× | FAIL | allow 14.7 (F_commit×1) |
| workflow | edit_d4.domP50 | 3.46 ± 1.92 | 10.48 ± 1.22 | 3.0× | FAIL | allow 6.7 (F_commit×1) |
| workflow | edit_d4.domP95 | 9.18 ± 2.36 | 21.44 ± 2.88 | 2.3× | PLATFORM-BOUND | allow 15.9 (F_commit×1) |
| workflow | edit_d10.emitP50 | 0.44 ± 0.05 | 9.44 ± 0.79 | 21.5× | FAIL | allow 4.4 (F_commit×1) |
| workflow | edit_d10.emitP95 | 3.22 ± 1.39 | 18.58 ± 2.25 | 5.8× | FAIL | allow 14.3 (F_commit×1) |
| workflow | edit_d10.domP50 | 1.70 ± 0.44 | 10.42 ± 0.92 | 6.1× | FAIL | allow 5.0 (F_commit×1) |
| workflow | edit_d10.domP95 | 9.12 ± 1.37 | 19.66 ± 1.80 | 2.2× | PLATFORM-BOUND | allow 13.9 (F_commit×1) |
| workflow | loadCycle.emitP50 | 5.74 ± 7.09 | 20.82 ± 2.66 | 3.6× | PLATFORM-BOUND | allow 16.9 (F_commit×2) |
| workflow | loadCycle.emitP95 | 34.40 ± 3.15 | 61.14 ± 7.10 | 1.8× | PLATFORM-BOUND | allow 31.7 (F_commit×2) |
| workflow | loadCycle.domP50 | 6.82 ± 8.20 | 21.06 ± 2.80 | 3.1× | PLATFORM-BOUND | allow 18.2 (F_commit×2) |
| workflow | loadCycle.domP95 | 34.96 ± 3.05 | 61.72 ± 6.90 | 1.8× | PLATFORM-BOUND | allow 31.4 (F_commit×2) |
| workflow | step.emitP50 | 0.30 ± 0.00 | 8.82 ± 1.08 | 29.4× | FAIL | allow 4.7 (F_commit×1) |
| workflow | step.emitP95 | 1.16 ± 0.45 | 20.98 ± 3.20 | 18.1× | FAIL | allow 14.4 (F_commit×1) |
| workflow | step.domP50 | 2.78 ± 1.92 | 9.26 ± 1.18 | 3.3× | PLATFORM-BOUND | allow 6.7 (F_commit×1) |
| workflow | step.domP95 | 10.60 ± 2.44 | 22.94 ± 5.65 | 2.2× | PLATFORM-BOUND | allow 18.8 (F_commit×1) |
| workflow | reset.emitP50 | 0.22 ± 0.04 | 18.38 ± 7.11 | 83.5× | FAIL | allow 10.8 (F_commit×1) |
| workflow | reset.emitP95 | 0.86 ± 0.27 | 43.48 ± 9.78 | 50.6× | FAIL | allow 20.8 (F_commit×1) |
| workflow | reset.domP50 | 0.26 ± 0.05 | 18.48 ± 7.22 | 71.1× | FAIL | allow 10.9 (F_commit×1) |
| workflow | reset.domP95 | 2.04 ± 2.33 | 43.56 ± 9.75 | 21.4× | FAIL | allow 22.8 (F_commit×1) |
| workflow | append100.emitP50 | 0.38 ± 0.08 | 17.44 ± 1.75 | 45.9× | FAIL | allow 5.4 (F_commit×1) |
| workflow | append100.emitP95 | 1.78 ± 1.60 | 29.10 ± 3.34 | 16.3× | FAIL | allow 15.6 (F_commit×1) |
| workflow | append100.domP50 | 0.92 ± 0.04 | 18.10 ± 1.48 | 19.7× | FAIL | allow 5.1 (F_commit×1) |
| workflow | append100.domP95 | 6.66 ± 1.87 | 29.56 ± 3.35 | 4.4× | FAIL | allow 15.9 (F_commit×1) |
| workflow | heapMb | 3.81 ± 0.08 | 5.03 ± 0.00 | 1.3× | FAIL |  |
| workflow | pssTotalMb | 220.82 ± 0.78 | 236.35 ± 1.13 | 1.1× | FAIL |  |
| workflow | relaunchReadyMs | 1447.06 ± 46.77 | 715.30 ± 362.06 | 0.5× | PASS |  |
| workflow | relaunchHeapMb | 3.31 ± 0.05 | 4.14 ± 0.11 | 1.3× | FAIL |  |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 8.04 | 8.32 | 24.12 | 10.34 | 11.30 | 23.40 |
| 500 | 8.10 | 8.42 | 24.60 | 10.24 | 10.94 | 24.14 |
| 5000 | 8.74 | 9.08 | 21.28 | 13.06 | 14.10 | 32.36 |

<details><summary>Raw per-trial data</summary>

```json
[
  {
    "impl": "classic",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.3000000000029104,
          "emitP95": 0.6000000000058208,
          "domP50": 5.30000000000291,
          "domP95": 6.69999999999709
        },
        "setKeys": {
          "emitP50": 0.3000000000029104,
          "emitP95": 0.6000000000058208,
          "domP50": 5.2000000000116415,
          "domP95": 10.30000000000291
        },
        "replace": {
          "emitP50": 0.3000000000029104,
          "emitP95": 1,
          "domP50": 1,
          "domP95": 5.7000000000116415
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.3000000000029104,
          "lagP95": 0.8999999999941792,
          "endLag": 0.3000000000029104,
          "maxBacklog": 0
        },
        "heapMb": 3.7536354064941406,
        "pssTotalMb": 218.15625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 2.5,
          "domP50": 1.6999999999970896,
          "domP95": 13
        },
        "setKeys": {
          "emitP50": 0.40000000000873115,
          "emitP95": 1.6000000000058208,
          "domP50": 2.1000000000058208,
          "domP95": 11.599999999991269
        },
        "replace": {
          "emitP50": 0.3000000000029104,
          "emitP95": 2.1999999999970896,
          "domP50": 5.099999999991269,
          "domP95": 8.299999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.5,
          "lagP95": 0.9000000000087311,
          "endLag": 0.39999999999417923,
          "maxBacklog": 0
        },
        "heapMb": 3.9737892150878906,
        "pssTotalMb": 222.1142578125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1999999999970896,
          "emitP95": 1.7999999999883585,
          "domP50": 7.100000000005821,
          "domP95": 8.19999999999709
        },
        "setKeys": {
          "emitP50": 1.6000000000058208,
          "emitP95": 5,
          "domP50": 3.1000000000058208,
          "domP95": 12.5
        },
        "replace": {
          "emitP50": 0.39999999999417923,
          "emitP95": 1.1999999999970896,
          "domP50": 1.5,
          "domP95": 11.39999999999418
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.4000000000087311,
          "lagP95": 2.1000000000058208,
          "endLag": 1.6999999999825377,
          "maxBacklog": 0
        },
        "heapMb": 7.938053131103516,
        "pssTotalMb": 226.8466796875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.39999999999417923,
        "emitP95": 1.7999999999883585,
        "domP50": 1.1999999999825377,
        "domP95": 11
      },
      "edit_d4": {
        "emitP50": 0.39999999999417923,
        "emitP95": 0.7999999999883585,
        "domP50": 5.5,
        "domP95": 9.800000000017462
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.1999999999825377,
        "domP50": 1.6000000000058208,
        "domP95": 8.10000000000582
      },
      "loadCycle": {
        "emitP50": 13.60000000000582,
        "emitP95": 32.5,
        "domP50": 15.60000000000582,
        "domP95": 33.39999999999418
      },
      "step": {
        "emitP50": 0.3000000000174623,
        "emitP95": 0.7999999999883585,
        "domP50": 1,
        "domP95": 7.600000000005821
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 0.8999999999941792,
        "domP50": 0.20000000001164153,
        "domP95": 0.8999999999941792
      },
      "append100": {
        "emitP50": 0.3000000000174623,
        "emitP95": 0.6000000000058208,
        "domP50": 0.8999999999941792,
        "domP95": 5.7999999999883585
      },
      "heapMb": 3.776073455810547,
      "pssTotalMb": 220.4150390625,
      "relaunchReadyMs": 1414.7000000000116,
      "relaunchHeapMb": 3.2579345703125
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 11,
          "emitP95": 23.29999999998836,
          "domP50": 13.10000000000582,
          "domP95": 23.89999999999418
        },
        "setKeys": {
          "emitP50": 16.599999999976717,
          "emitP95": 33.40000000002328,
          "domP50": 17.800000000017462,
          "domP95": 36
        },
        "replace": {
          "emitP50": 11.300000000017462,
          "emitP95": 20.70000000001164,
          "domP50": 11.60000000000582,
          "domP95": 21.20000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 15.60000000000582,
          "endLag": 25.60000000000582,
          "maxBacklog": 1
        },
        "heapMb": 4.614738464355469,
        "pssTotalMb": 230.1728515625,
        "control": {
          "emitP50": 10.700000000011642,
          "emitP95": 22.599999999976717,
          "domP50": 10.89999999999418,
          "domP95": 22.89999999999418
        },
        "fCommitP50": 3.8999999999941792,
        "fCommitP95": 12.10000000000582
      },
      "500": {
        "setKey": {
          "emitP50": 8.799999999988358,
          "emitP95": 19.60000000000582,
          "domP50": 10.10000000000582,
          "domP95": 20.800000000017462
        },
        "setKeys": {
          "emitP50": 16.199999999982538,
          "emitP95": 26.60000000000582,
          "domP50": 16.5,
          "domP95": 27.10000000000582
        },
        "replace": {
          "emitP50": 12.39999999999418,
          "emitP95": 27.60000000000582,
          "domP50": 13.700000000011642,
          "domP95": 28.29999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.5,
          "lagP95": 16.199999999982538,
          "endLag": 7.899999999994179,
          "maxBacklog": 1
        },
        "heapMb": 5.05755615234375,
        "pssTotalMb": 231.443359375,
        "control": {
          "emitP50": 7.5,
          "emitP95": 26,
          "domP50": 7.699999999982538,
          "domP95": 26.300000000017462
        },
        "fCommitP50": 3.2999999999883585,
        "fCommitP95": 11.39999999999418
      },
      "5000": {
        "setKey": {
          "emitP50": 11,
          "emitP95": 25.60000000000582,
          "domP50": 11.5,
          "domP95": 32.5
        },
        "setKeys": {
          "emitP50": 17.79999999998836,
          "emitP95": 36.89999999999418,
          "domP50": 18.199999999982538,
          "domP95": 37.79999999998836
        },
        "replace": {
          "emitP50": 51.39999999999418,
          "emitP95": 115.10000000000582,
          "domP50": 52.10000000000582,
          "domP95": 115.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.60000000000582,
          "lagP95": 18.79999999998836,
          "endLag": 5.899999999994179,
          "maxBacklog": 2
        },
        "heapMb": 9.457576751708984,
        "pssTotalMb": 239.744140625,
        "control": {
          "emitP50": 7.7000000000116415,
          "emitP95": 19.199999999982538,
          "domP50": 8.300000000017462,
          "domP95": 19.60000000000582
        },
        "fCommitP50": 3.8999999999941792,
        "fCommitP95": 11.099999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.60000000000582,
        "emitP95": 19.20000000001164,
        "domP50": 10.10000000000582,
        "domP95": 19.60000000000582
      },
      "edit_d4": {
        "emitP50": 8.5,
        "emitP95": 17.60000000000582,
        "domP50": 9,
        "domP95": 19.39999999999418
      },
      "edit_d10": {
        "emitP50": 9.300000000017462,
        "emitP95": 20.79999999998836,
        "domP50": 9.900000000023283,
        "domP95": 21.599999999976717
      },
      "loadCycle": {
        "emitP50": 21.60000000000582,
        "emitP95": 51.09999999997672,
        "domP50": 21.70000000001164,
        "domP95": 52.19999999998254
      },
      "step": {
        "emitP50": 8.299999999988358,
        "emitP95": 18.39999999999418,
        "domP50": 8.5,
        "domP95": 18.79999999998836
      },
      "reset": {
        "emitP50": 15.300000000017462,
        "emitP95": 32.5,
        "domP50": 15.300000000017462,
        "domP95": 32.60000000000582
      },
      "append100": {
        "emitP50": 15.60000000000582,
        "emitP95": 25.599999999976717,
        "domP50": 16.5,
        "domP95": 26
      },
      "heapMb": 5.025920867919922,
      "pssTotalMb": 235.4658203125,
      "relaunchReadyMs": 462.5,
      "relaunchHeapMb": 4.144306182861328
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.39999999999418,
          "emitP95": 20,
          "domP50": 10.799999999988358,
          "domP95": 21.900000000023283
        },
        "setKeys": {
          "emitP50": 16.39999999999418,
          "emitP95": 28.5,
          "domP50": 17,
          "domP95": 28.89999999999418
        },
        "replace": {
          "emitP50": 10.10000000000582,
          "emitP95": 27.89999999999418,
          "domP50": 12.299999999988358,
          "domP95": 29.70000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 16.10000000000582,
          "endLag": 6.7000000000116415,
          "maxBacklog": 1
        },
        "heapMb": 4.614826202392578,
        "pssTotalMb": 233.0244140625,
        "control": {
          "emitP50": 7.2999999999883585,
          "emitP95": 23,
          "domP50": 7.5,
          "domP95": 23.20000000001164
        },
        "fCommitP50": 3.7000000000116415,
        "fCommitP95": 8.5
      },
      "500": {
        "setKey": {
          "emitP50": 10,
          "emitP95": 33,
          "domP50": 10.400000000023283,
          "domP95": 33.79999999998836
        },
        "setKeys": {
          "emitP50": 14.39999999999418,
          "emitP95": 21.699999999982538,
          "domP50": 15,
          "domP95": 22.5
        },
        "replace": {
          "emitP50": 13.10000000000582,
          "emitP95": 25,
          "domP50": 13.300000000017462,
          "domP95": 25.60000000000582
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.89999999999418,
          "lagP95": 19,
          "endLag": 4.7999999999883585,
          "maxBacklog": 1
        },
        "heapMb": 5.0931243896484375,
        "pssTotalMb": 235.50390625,
        "control": {
          "emitP50": 9.299999999988358,
          "emitP95": 20.300000000017462,
          "domP50": 9.799999999988358,
          "domP95": 22.300000000017462
        },
        "fCommitP50": 3.5,
        "fCommitP95": 8.200000000011642
      },
      "5000": {
        "setKey": {
          "emitP50": 13.39999999999418,
          "emitP95": 24.10000000000582,
          "domP50": 14.299999999988358,
          "domP95": 27.79999999998836
        },
        "setKeys": {
          "emitP50": 16.10000000000582,
          "emitP95": 76.10000000000582,
          "domP50": 16.800000000017462,
          "domP95": 76.5
        },
        "replace": {
          "emitP50": 48.29999999998836,
          "emitP95": 62.89999999999418,
          "domP50": 48.89999999999418,
          "domP95": 63.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.899999999994179,
          "lagP95": 12,
          "endLag": 7.600000000005821,
          "maxBacklog": 2
        },
        "heapMb": 9.295589447021484,
        "pssTotalMb": 240.8212890625,
        "control": {
          "emitP50": 8.199999999982538,
          "emitP95": 16.39999999999418,
          "domP50": 8.599999999976717,
          "domP95": 16.79999999998836
        },
        "fCommitP50": 3.7999999999883585,
        "fCommitP95": 14.799999999988358
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 10.800000000017462,
        "emitP95": 21,
        "domP50": 11.900000000023283,
        "domP95": 22.60000000000582
      },
      "edit_d4": {
        "emitP50": 10.599999999976717,
        "emitP95": 18.29999999998836,
        "domP50": 11.10000000000582,
        "domP95": 18.79999999998836
      },
      "edit_d10": {
        "emitP50": 8.800000000017462,
        "emitP95": 16.79999999998836,
        "domP50": 10.800000000017462,
        "domP95": 17.29999999998836
      },
      "loadCycle": {
        "emitP50": 22,
        "emitP95": 60.20000000001164,
        "domP50": 22.39999999999418,
        "domP95": 60.60000000000582
      },
      "step": {
        "emitP50": 9.89999999999418,
        "emitP95": 23.79999999998836,
        "domP50": 10.5,
        "domP95": 25.199999999982538
      },
      "reset": {
        "emitP50": 19.10000000000582,
        "emitP95": 52.19999999998254,
        "domP50": 19.20000000001164,
        "domP95": 52.29999999998836
      },
      "append100": {
        "emitP50": 18.60000000000582,
        "emitP95": 29.70000000001164,
        "domP50": 19,
        "domP95": 30.599999999976717
      },
      "heapMb": 5.023479461669922,
      "pssTotalMb": 236.2939453125,
      "relaunchReadyMs": 462.4000000000233,
      "relaunchHeapMb": 4.213649749755859
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.29999999998835847,
          "emitP95": 0.7999999999883585,
          "domP50": 6,
          "domP95": 10
        },
        "setKeys": {
          "emitP50": 0.29999999998835847,
          "emitP95": 1.599999999976717,
          "domP50": 5.400000000023283,
          "domP95": 6.599999999976717
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 1.1000000000349246,
          "domP50": 1.2999999999883585,
          "domP95": 11.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 1,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.75341796875,
        "pssTotalMb": 220.3515625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.7000000000116415,
          "domP50": 4.600000000034925,
          "domP95": 8.5
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 10.599999999976717,
          "domP50": 4.7000000000116415,
          "domP95": 11
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 5.800000000046566,
          "domP50": 0.8000000000465661,
          "domP95": 10.600000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000116415,
          "endLag": 0.20000000001164153,
          "maxBacklog": 0
        },
        "heapMb": 3.973896026611328,
        "pssTotalMb": 222.1884765625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1000000000349246,
          "emitP95": 1.5,
          "domP50": 6.7999999999883585,
          "domP95": 9
        },
        "setKeys": {
          "emitP50": 1.400000000023283,
          "emitP95": 4,
          "domP50": 3,
          "domP95": 15.5
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 9.099999999976717,
          "domP50": 2,
          "domP95": 11.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999650754,
          "lagP95": 2.400000000023283,
          "endLag": 1.5,
          "maxBacklog": 0
        },
        "heapMb": 7.938030242919922,
        "pssTotalMb": 226.625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 3.400000000023283,
        "domP50": 2,
        "domP95": 10.5
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.7000000000116415,
        "domP50": 2.7000000000116415,
        "domP95": 8.299999999988358
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 4.7000000000116415,
        "domP50": 1.599999999976717,
        "domP95": 8.800000000046566
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33,
        "domP50": 1.2000000000116415,
        "domP95": 33.399999999965075
      },
      "step": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.9000000000232831,
        "domP50": 3.900000000023283,
        "domP95": 8.400000000023283
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7999999999883585,
        "domP50": 0.30000000004656613,
        "domP95": 6.2000000000116415
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 3.900000000023283,
        "domP50": 0.8999999999650754,
        "domP95": 6.2999999999883585
      },
      "heapMb": 3.7765579223632812,
      "pssTotalMb": 221.5888671875,
      "relaunchReadyMs": 1416.2000000000116,
      "relaunchHeapMb": 3.3520355224609375
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7000000000116415,
          "domP50": 5.399999999965075,
          "domP95": 12.699999999953434
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.6000000000349246,
          "domP50": 1.1000000000349246,
          "domP95": 8.300000000046566
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 4.199999999953434,
          "domP50": 3.7999999999883585,
          "domP95": 10.700000000011642
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.6000000000349246,
          "endLag": 0.1000000000349246,
          "maxBacklog": 0
        },
        "heapMb": 3.563098907470703,
        "pssTotalMb": 217.9970703125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1,
          "domP50": 5.7999999999883585,
          "domP95": 10.5
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 3.599999999976717,
          "domP50": 3.099999999976717,
          "domP95": 8.799999999988358
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 7.2999999999883585,
          "domP50": 1.8999999999650754,
          "domP95": 11.299999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.5,
          "lagP95": 0.9000000000232831,
          "endLag": 0.6000000000349246,
          "maxBacklog": 0
        },
        "heapMb": 3.9739341735839844,
        "pssTotalMb": 222.0068359375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.2000000000116415,
          "emitP95": 1.7999999999883585,
          "domP50": 6.899999999965075,
          "domP95": 8.299999999988358
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 9.799999999988358,
          "domP50": 4.2000000000116415,
          "domP95": 14.200000000011642
        },
        "replace": {
          "emitP50": 0.5,
          "emitP95": 10.5,
          "domP50": 1.400000000023283,
          "domP95": 11.600000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 6.7999999999883585,
          "endLag": 1.2000000000116415,
          "maxBacklog": 0
        },
        "heapMb": 7.938053131103516,
        "pssTotalMb": 226.93359375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.900000000023283,
        "domP50": 1.7000000000116415,
        "domP95": 9.599999999976717
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.7999999999883585,
        "domP50": 5.399999999965075,
        "domP95": 13
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 3.599999999976717,
        "domP50": 1.900000000023283,
        "domP95": 7.600000000034925
      },
      "loadCycle": {
        "emitP50": 0.8000000000465661,
        "emitP95": 33.20000000001164,
        "domP50": 0.8000000000465661,
        "domP95": 34
      },
      "step": {
        "emitP50": 0.29999999998835847,
        "emitP95": 1.599999999976717,
        "domP50": 2.400000000023283,
        "domP95": 13
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 1.2999999999883585,
        "domP50": 0.29999999998835847,
        "domP95": 1.2999999999883585
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 3.099999999976717,
        "domP50": 0.8999999999650754,
        "domP95": 4.7000000000116415
      },
      "heapMb": 3.9652786254882812,
      "pssTotalMb": 221.7197265625,
      "relaunchReadyMs": 1513.7000000000116,
      "relaunchHeapMb": 3.3518028259277344
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.600000000034925,
          "emitP95": 16.599999999976717,
          "domP50": 10.200000000011642,
          "domP95": 17
        },
        "setKeys": {
          "emitP50": 15.399999999965075,
          "emitP95": 32.600000000034925,
          "domP50": 16.300000000046566,
          "domP95": 32.800000000046566
        },
        "replace": {
          "emitP50": 7.599999999976717,
          "emitP95": 15.700000000011642,
          "domP50": 8.100000000034925,
          "domP95": 16.70000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.199999999953434,
          "lagP95": 8.5,
          "endLag": 6.7999999999883585,
          "maxBacklog": 1
        },
        "heapMb": 4.615146636962891,
        "pssTotalMb": 232.978515625,
        "control": {
          "emitP50": 7.7000000000116415,
          "emitP95": 29.900000000023283,
          "domP50": 8.099999999976717,
          "domP95": 30.20000000001164
        },
        "fCommitP50": 3.800000000046566,
        "fCommitP95": 7.100000000034925
      },
      "500": {
        "setKey": {
          "emitP50": 11.299999999988358,
          "emitP95": 21.099999999976717,
          "domP50": 11.900000000023283,
          "domP95": 21.70000000001164
        },
        "setKeys": {
          "emitP50": 15.899999999965075,
          "emitP95": 24.5,
          "domP50": 16.599999999976717,
          "domP95": 24.899999999965075
        },
        "replace": {
          "emitP50": 12.200000000011642,
          "emitP95": 22.5,
          "domP50": 13.099999999976717,
          "domP95": 23
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.100000000034925,
          "lagP95": 27.099999999976717,
          "endLag": 49.20000000001164,
          "maxBacklog": 3
        },
        "heapMb": 5.095462799072266,
        "pssTotalMb": 232.0595703125,
        "control": {
          "emitP50": 7.2000000000116415,
          "emitP95": 18.900000000023283,
          "domP50": 7.5,
          "domP95": 19.29999999998836
        },
        "fCommitP50": 3.6000000000349246,
        "fCommitP95": 12.299999999988358
      },
      "5000": {
        "setKey": {
          "emitP50": 12,
          "emitP95": 27.5,
          "domP50": 13.700000000011642,
          "domP95": 27.899999999965075
        },
        "setKeys": {
          "emitP50": 16.600000000034925,
          "emitP95": 81.60000000003492,
          "domP50": 17.800000000046566,
          "domP95": 82
        },
        "replace": {
          "emitP50": 48.5,
          "emitP95": 58.899999999965075,
          "domP50": 48.90000000002328,
          "domP95": 59.29999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 10.399999999965075,
          "lagP95": 36.20000000001164,
          "endLag": 14.399999999965075,
          "maxBacklog": 2
        },
        "heapMb": 9.294418334960938,
        "pssTotalMb": 241.3974609375,
        "control": {
          "emitP50": 7,
          "emitP95": 24.20000000001164,
          "domP50": 7.2000000000116415,
          "domP95": 25.400000000023283
        },
        "fCommitP50": 3.7999999999883585,
        "fCommitP95": 8.200000000011642
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 10.299999999988358,
        "emitP95": 24.70000000001164,
        "domP50": 11.299999999988358,
        "domP95": 28.099999999976717
      },
      "edit_d4": {
        "emitP50": 9.700000000011642,
        "emitP95": 21.599999999976717,
        "domP50": 10.099999999976717,
        "domP95": 22.599999999976717
      },
      "edit_d10": {
        "emitP50": 10.799999999988358,
        "emitP95": 19.800000000046566,
        "domP50": 11.799999999988358,
        "domP95": 20.300000000046566
      },
      "loadCycle": {
        "emitP50": 16.20000000001164,
        "emitP95": 68,
        "domP50": 16.20000000001164,
        "domP95": 68.5
      },
      "step": {
        "emitP50": 9.900000000023283,
        "emitP95": 25.100000000034925,
        "domP50": 10.400000000023283,
        "domP95": 31.900000000023283
      },
      "reset": {
        "emitP50": 30.400000000023283,
        "emitP95": 55,
        "domP50": 30.70000000001164,
        "domP95": 55
      },
      "append100": {
        "emitP50": 17.100000000034925,
        "emitP95": 26.5,
        "domP50": 17.400000000023283,
        "domP95": 26.79999999998836
      },
      "heapMb": 5.034809112548828,
      "pssTotalMb": 237.240234375,
      "relaunchReadyMs": 1106.2000000000116,
      "relaunchHeapMb": 4.203643798828125
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 13,
          "emitP95": 32.09999999997672,
          "domP50": 13.300000000046566,
          "domP95": 32.5
        },
        "setKeys": {
          "emitP50": 15.5,
          "emitP95": 25.29999999998836,
          "domP50": 15.900000000023283,
          "domP95": 25.70000000001164
        },
        "replace": {
          "emitP50": 8.299999999988358,
          "emitP95": 21,
          "domP50": 8.699999999953434,
          "domP95": 21.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 14.899999999965075,
          "endLag": 6,
          "maxBacklog": 1
        },
        "heapMb": 4.614616394042969,
        "pssTotalMb": 230.0927734375,
        "control": {
          "emitP50": 6.599999999976717,
          "emitP95": 19.79999999998836,
          "domP50": 7,
          "domP95": 23.400000000023283
        },
        "fCommitP50": 3.7000000000116415,
        "fCommitP95": 14.200000000011642
      },
      "500": {
        "setKey": {
          "emitP50": 10.099999999976717,
          "emitP95": 20.600000000034925,
          "domP50": 10.599999999976717,
          "domP95": 21.100000000034925
        },
        "setKeys": {
          "emitP50": 14.900000000023283,
          "emitP95": 27.900000000023283,
          "domP50": 15.400000000023283,
          "domP95": 28.29999999998836
        },
        "replace": {
          "emitP50": 15,
          "emitP95": 22.300000000046566,
          "domP50": 15.200000000011642,
          "domP95": 23.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7,
          "lagP95": 12.400000000023283,
          "endLag": 12.899999999965075,
          "maxBacklog": 1
        },
        "heapMb": 5.095699310302734,
        "pssTotalMb": 231.92578125,
        "control": {
          "emitP50": 7,
          "emitP95": 26.79999999998836,
          "domP50": 7.300000000046566,
          "domP95": 27.599999999976717
        },
        "fCommitP50": 3.2000000000116415,
        "fCommitP95": 11.299999999988358
      },
      "5000": {
        "setKey": {
          "emitP50": 17.20000000001164,
          "emitP95": 37.29999999998836,
          "domP50": 17.79999999998836,
          "domP95": 37.79999999998836
        },
        "setKeys": {
          "emitP50": 16.099999999976717,
          "emitP95": 30.599999999976717,
          "domP50": 16.600000000034925,
          "domP95": 31.099999999976717
        },
        "replace": {
          "emitP50": 48.600000000034925,
          "emitP95": 66,
          "domP50": 49.100000000034925,
          "domP95": 66.30000000004657
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.299999999988358,
          "lagP95": 20.20000000001164,
          "endLag": 15.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.295341491699219,
        "pssTotalMb": 242.013671875,
        "control": {
          "emitP50": 10.199999999953434,
          "emitP95": 21.20000000001164,
          "domP50": 10.5,
          "domP95": 22
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 14.700000000011642
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.599999999976717,
        "emitP95": 22.400000000023283,
        "domP50": 9.299999999988358,
        "domP95": 23
      },
      "edit_d4": {
        "emitP50": 11.5,
        "emitP95": 20.100000000034925,
        "domP50": 12.200000000011642,
        "domP95": 20.5
      },
      "edit_d10": {
        "emitP50": 9,
        "emitP95": 19.900000000023283,
        "domP50": 9.400000000023283,
        "domP95": 20.800000000046566
      },
      "loadCycle": {
        "emitP50": 21.300000000046566,
        "emitP95": 58.5,
        "domP50": 21.70000000001164,
        "domP95": 58.90000000002328
      },
      "step": {
        "emitP50": 8.599999999976717,
        "emitP95": 18.79999999998836,
        "domP50": 9.099999999976717,
        "domP95": 19.5
      },
      "reset": {
        "emitP50": 14.200000000011642,
        "emitP95": 36.59999999997672,
        "domP50": 14.200000000011642,
        "domP95": 36.699999999953434
      },
      "append100": {
        "emitP50": 19.79999999998836,
        "emitP95": 34.100000000034925,
        "domP50": 20.20000000001164,
        "domP95": 34.40000000002328
      },
      "heapMb": 5.030422210693359,
      "pssTotalMb": 235.04296875,
      "relaunchReadyMs": 428.4000000000233,
      "relaunchHeapMb": 3.9468231201171875
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 3.400000000023283,
          "domP50": 1.900000000023283,
          "domP95": 9.299999999988358
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.7000000000116415,
          "domP50": 1.7999999999883585,
          "domP95": 6.5
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 0.6000000000349246,
          "domP50": 0.7999999999883585,
          "domP95": 6.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.3999999999650754,
          "lagP95": 1.2000000000116415,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.5631065368652344,
        "pssTotalMb": 217.638671875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.2000000000116415,
          "domP50": 3.599999999976717,
          "domP95": 8
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 4.5,
          "domP50": 1.1000000000349246,
          "domP95": 8.199999999953434
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 0.7000000000116415,
          "domP50": 2.5,
          "domP95": 12.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1,
          "endLag": 0.29999999998835847,
          "maxBacklog": 0
        },
        "heapMb": 3.8696327209472656,
        "pssTotalMb": 221.828125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1000000000931323,
          "emitP95": 2.299999999930151,
          "domP50": 6.900000000023283,
          "domP95": 8.099999999976717
        },
        "setKeys": {
          "emitP50": 1.8000000000465661,
          "emitP95": 7.099999999976717,
          "domP50": 5.5,
          "domP95": 18.199999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.7000000000698492,
          "domP50": 1.8999999999068677,
          "domP95": 5.700000000069849
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.799999999930151,
          "endLag": 1.1999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 7.8358612060546875,
        "pssTotalMb": 226.3583984375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.7999999999301508,
        "domP50": 1.599999999976717,
        "domP95": 9.699999999953434
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.6000000000931323,
        "domP50": 2.599999999976717,
        "domP95": 7.100000000093132
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 4.099999999976717,
        "domP50": 1.099999999976717,
        "domP95": 10.599999999976717
      },
      "loadCycle": {
        "emitP50": 13.400000000023283,
        "emitP95": 40,
        "domP50": 16,
        "domP95": 40.39999999990687
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7999999999301508,
        "domP50": 1.099999999976717,
        "domP95": 12.400000000023283
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5999999999767169,
        "domP50": 0.2000000000698492,
        "domP95": 0.9000000000232831
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.6000000000931323,
        "domP50": 1,
        "domP95": 9.70000000006985
      },
      "heapMb": 3.776508331298828,
      "pssTotalMb": 220.3837890625,
      "relaunchReadyMs": 1411.4000000000233,
      "relaunchHeapMb": 3.3518028259277344
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.900000000023283,
          "domP50": 2.900000000023283,
          "domP95": 10.599999999976717
        },
        "setKeys": {
          "emitP50": 0.39999999990686774,
          "emitP95": 2.5,
          "domP50": 5.199999999953434,
          "domP95": 8.900000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.6000000000931323,
          "domP50": 1.5,
          "domP95": 10.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.5629539489746094,
        "pssTotalMb": 217.7138671875
      },
      "500": {
        "setKey": {
          "emitP50": 0.6000000000931323,
          "emitP95": 1.6999999999534339,
          "domP50": 3,
          "domP95": 9.099999999976717
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 6.800000000046566,
          "domP50": 3,
          "domP95": 19.199999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 1.5,
          "domP95": 12.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.973896026611328,
        "pssTotalMb": 221.8955078125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 2.3999999999068677,
          "domP50": 6.599999999976717,
          "domP95": 8.20000000006985
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 7.099999999976717,
          "domP50": 6.299999999930151,
          "domP95": 16.699999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.7999999999301508,
          "domP50": 1.5,
          "domP95": 7.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.5,
          "endLag": 1.900000000023283,
          "maxBacklog": 0
        },
        "heapMb": 7.938098907470703,
        "pssTotalMb": 226.818359375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1999999999534339,
        "domP50": 3.700000000069849,
        "domP95": 8.599999999976717
      },
      "edit_d4": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.9000000000232831,
        "domP50": 1.099999999976717,
        "domP95": 7.699999999953434
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.5,
        "domP50": 2.300000000046566,
        "domP95": 10.5
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 33.29999999993015,
        "domP50": 0.5,
        "domP95": 33.59999999997672
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.6999999999534339,
        "domP50": 5.5,
        "domP95": 11.600000000093132
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.7000000000698492,
        "domP50": 0.30000000004656613,
        "domP95": 0.9000000000232831
      },
      "append100": {
        "emitP50": 0.5,
        "emitP95": 0.6999999999534339,
        "domP50": 0.9000000000232831,
        "domP95": 6.799999999930151
      },
      "heapMb": 3.7764053344726562,
      "pssTotalMb": 219.986328125,
      "relaunchReadyMs": 1479.3000000000466,
      "relaunchHeapMb": 3.2579269409179688
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.699999999953434,
          "emitP95": 21,
          "domP50": 9.099999999976717,
          "domP95": 21.699999999953434
        },
        "setKeys": {
          "emitP50": 17.699999999953434,
          "emitP95": 33.40000000002328,
          "domP50": 18,
          "domP95": 36.39999999990687
        },
        "replace": {
          "emitP50": 9.5,
          "emitP95": 18.199999999953434,
          "domP50": 10.900000000023283,
          "domP95": 18.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.5,
          "lagP95": 18.70000000006985,
          "endLag": 46.699999999953434,
          "maxBacklog": 2
        },
        "heapMb": 4.61474609375,
        "pssTotalMb": 229.9814453125,
        "control": {
          "emitP50": 7.900000000023283,
          "emitP95": 20.599999999976717,
          "domP50": 8.099999999976717,
          "domP95": 20.900000000023283
        },
        "fCommitP50": 3,
        "fCommitP95": 10.399999999906868
      },
      "500": {
        "setKey": {
          "emitP50": 11,
          "emitP95": 22.699999999953434,
          "domP50": 11.70000000006985,
          "domP95": 23.29999999993015
        },
        "setKeys": {
          "emitP50": 15.099999999976717,
          "emitP95": 25.79999999993015,
          "domP50": 17,
          "domP95": 26.199999999953434
        },
        "replace": {
          "emitP50": 12.699999999953434,
          "emitP95": 30.600000000093132,
          "domP50": 13.199999999953434,
          "domP95": 31
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.699999999953434,
          "lagP95": 16.70000000006985,
          "endLag": 6.799999999930151,
          "maxBacklog": 1
        },
        "heapMb": 5.05743408203125,
        "pssTotalMb": 231.3291015625,
        "control": {
          "emitP50": 9.5,
          "emitP95": 27.199999999953434,
          "domP50": 9.79999999993015,
          "domP95": 27.5
        },
        "fCommitP50": 3.5,
        "fCommitP95": 10.100000000093132
      },
      "5000": {
        "setKey": {
          "emitP50": 11.699999999953434,
          "emitP95": 31.800000000046566,
          "domP50": 13.199999999953434,
          "domP95": 35.800000000046566
        },
        "setKeys": {
          "emitP50": 15.599999999976717,
          "emitP95": 64.80000000004657,
          "domP50": 16.599999999976717,
          "domP95": 65.30000000004657
        },
        "replace": {
          "emitP50": 47.699999999953434,
          "emitP95": 60.79999999993015,
          "domP50": 48.09999999997672,
          "domP95": 61.09999999997672
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.699999999953434,
          "lagP95": 18.900000000023283,
          "endLag": 13.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.294872283935547,
        "pssTotalMb": 243.3837890625,
        "control": {
          "emitP50": 10.599999999976717,
          "emitP95": 22.400000000023283,
          "domP50": 10.79999999993015,
          "domP95": 22.599999999976717
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 6.200000000069849
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.29999999993015,
        "emitP95": 28.600000000093132,
        "domP50": 9.699999999953434,
        "domP95": 29
      },
      "edit_d4": {
        "emitP50": 9.29999999993015,
        "emitP95": 25.300000000046566,
        "domP50": 10,
        "domP95": 25.900000000023283
      },
      "edit_d10": {
        "emitP50": 9.29999999993015,
        "emitP95": 15.599999999976717,
        "domP50": 10.20000000006985,
        "domP95": 18.300000000046566
      },
      "loadCycle": {
        "emitP50": 23,
        "emitP95": 67.90000000002328,
        "domP50": 23.300000000046566,
        "domP95": 68.40000000002328
      },
      "step": {
        "emitP50": 7.400000000023283,
        "emitP95": 18.800000000046566,
        "domP50": 7.799999999930151,
        "domP95": 19.300000000046566
      },
      "reset": {
        "emitP50": 12.900000000023283,
        "emitP95": 41.09999999997672,
        "domP50": 13,
        "domP95": 41.199999999953434
      },
      "append100": {
        "emitP50": 16.099999999976717,
        "emitP95": 29.600000000093132,
        "domP50": 17.400000000023283,
        "domP95": 30
      },
      "heapMb": 5.023384094238281,
      "pssTotalMb": 237.6865234375,
      "relaunchReadyMs": 1117,
      "relaunchHeapMb": 4.212993621826172
    }
  }
]
```
</details>
