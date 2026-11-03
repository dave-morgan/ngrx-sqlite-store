# Phase 16 baseline — flat objects & hybrid workflow (2026-10-25)

**PRELIMINARY.** Measured on `emulator-5554` in parallel with phase 15 work, on a shared host (6 cores). Trials wait for phase 15 device runners to be idle, but other host load such as Codex builds can still perturb absolute numbers. Relative verdicts come from alternating classic/sqlite trials. The library is at the phase 15c state; phase 16 optimisations have not been applied.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.03 ms, p95 4.29 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND: latency excess ≤ classic SD + F_commit × commits + sqlite SD.
  - FAIL: everything else. Memory has no platform control yet.

**Acceptance (preliminary):** PASS 1 / PLATFORM-BOUND 4 / FAIL 81

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.38 ± 0.04 | 9.90 ± 0.98 | 26.1× | FAIL | allow 4.1 (F_commit×1) |
| flat | 50.setKey.emitP95 | 2.56 ± 2.57 | 20.55 ± 2.22 | 8.0× | FAIL | allow 9.1 (F_commit×1) |
| flat | 50.setKey.domP50 | 5.08 ± 0.84 | 10.55 ± 0.68 | 2.1× | FAIL | allow 4.6 (F_commit×1) |
| flat | 50.setKey.domP95 | 8.92 ± 1.84 | 22.32 ± 1.89 | 2.5× | FAIL | allow 8.0 (F_commit×1) |
| flat | 50.setKeys.emitP50 | 0.38 ± 0.04 | 13.97 ± 0.68 | 36.8× | FAIL | allow 3.8 (F_commit×1) |
| flat | 50.setKeys.emitP95 | 1.84 ± 1.57 | 27.90 ± 5.52 | 15.2× | FAIL | allow 11.4 (F_commit×1) |
| flat | 50.setKeys.domP50 | 2.50 ± 1.80 | 14.47 ± 0.56 | 5.8× | FAIL | allow 5.4 (F_commit×1) |
| flat | 50.setKeys.domP95 | 8.86 ± 1.59 | 28.50 ± 5.65 | 3.2× | FAIL | allow 11.5 (F_commit×1) |
| flat | 50.replace.emitP50 | 0.32 ± 0.04 | 9.32 ± 0.52 | 29.1× | FAIL | allow 3.6 (F_commit×1) |
| flat | 50.replace.emitP95 | 3.74 ± 3.26 | 19.12 ± 1.99 | 5.1× | FAIL | allow 9.5 (F_commit×1) |
| flat | 50.replace.domP50 | 2.20 ± 1.73 | 10.32 ± 1.24 | 4.7× | FAIL | allow 6.0 (F_commit×1) |
| flat | 50.replace.domP95 | 8.70 ± 1.08 | 19.57 ± 2.05 | 2.3× | FAIL | allow 7.4 (F_commit×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 6.85 ± 0.58 | 22.8× | FAIL | allow 3.6 (F_commit×1) |
| flat | 50.burst.lagP95 | 0.72 ± 0.11 | 13.50 ± 0.99 | 18.7× | FAIL | allow 5.4 (F_commit×1) |
| flat | 50.burst.endLag | 0.32 ± 0.08 | 7.98 ± 2.13 | 24.9× | FAIL | allow 5.2 (F_commit×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 1.00 ± 0.00 | 1000000000.0× | FAIL |  |
| flat | 50.heapMb | 3.60 ± 0.08 | 4.60 ± 0.00 | 1.3× | FAIL |  |
| flat | 50.pssTotalMb | 220.12 ± 1.50 | 233.86 ± 2.56 | 1.1× | FAIL |  |
| flat | 500.setKey.emitP50 | 0.54 ± 0.05 | 10.35 ± 1.80 | 19.2× | FAIL | allow 4.9 (F_commit×1) |
| flat | 500.setKey.emitP95 | 2.28 ± 1.71 | 23.97 ± 4.72 | 10.5× | FAIL | allow 10.7 (F_commit×1) |
| flat | 500.setKey.domP50 | 4.20 ± 1.63 | 10.88 ± 1.79 | 2.6× | FAIL | allow 6.5 (F_commit×1) |
| flat | 500.setKey.domP95 | 9.18 ± 1.60 | 24.55 ± 4.78 | 2.7× | FAIL | allow 10.7 (F_commit×1) |
| flat | 500.setKeys.emitP50 | 0.54 ± 0.05 | 16.15 ± 0.75 | 29.9× | FAIL | allow 3.8 (F_commit×1) |
| flat | 500.setKeys.emitP95 | 2.24 ± 1.58 | 29.82 ± 5.97 | 13.3× | FAIL | allow 11.8 (F_commit×1) |
| flat | 500.setKeys.domP50 | 2.72 ± 1.61 | 16.77 ± 0.68 | 6.2× | FAIL | allow 5.3 (F_commit×1) |
| flat | 500.setKeys.domP95 | 11.32 ± 6.09 | 30.67 ± 5.77 | 2.7× | FAIL | allow 16.1 (F_commit×1) |
| flat | 500.replace.emitP50 | 0.34 ± 0.05 | 14.37 ± 1.42 | 42.3× | FAIL | allow 4.5 (F_commit×1) |
| flat | 500.replace.emitP95 | 2.12 ± 1.03 | 31.45 ± 7.18 | 14.8× | FAIL | allow 12.5 (F_commit×1) |
| flat | 500.replace.domP50 | 1.86 ± 0.88 | 15.25 ± 1.74 | 8.2× | FAIL | allow 5.7 (F_commit×1) |
| flat | 500.replace.domP95 | 9.32 ± 2.12 | 32.15 ± 7.02 | 3.4× | FAIL | allow 13.4 (F_commit×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 7.30 ± 0.42 | 18.2× | FAIL | allow 3.5 (F_commit×1) |
| flat | 500.burst.lagP95 | 1.04 ± 0.36 | 16.05 ± 1.90 | 15.4× | FAIL | allow 6.6 (F_commit×1) |
| flat | 500.burst.endLag | 2.34 ± 4.23 | 14.80 ± 8.43 | 6.3× | PLATFORM-BOUND | allow 15.7 (F_commit×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 1.25 ± 0.50 | 1250000000.0× | FAIL |  |
| flat | 500.heapMb | 3.97 ± 0.00 | 5.04 ± 0.00 | 1.3× | FAIL |  |
| flat | 500.pssTotalMb | 223.71 ± 1.36 | 233.56 ± 2.29 | 1.0× | FAIL |  |
| flat | 5000.setKey.emitP50 | 1.18 ± 0.13 | 12.28 ± 1.80 | 10.4× | FAIL | allow 5.0 (F_commit×1) |
| flat | 5000.setKey.emitP95 | 2.16 ± 0.72 | 26.55 ± 2.62 | 12.3× | FAIL | allow 7.6 (F_commit×1) |
| flat | 5000.setKey.domP50 | 6.82 ± 0.16 | 13.17 ± 2.06 | 1.9× | FAIL | allow 5.3 (F_commit×1) |
| flat | 5000.setKey.domP95 | 8.26 ± 0.27 | 27.47 ± 2.75 | 3.3× | FAIL | allow 7.3 (F_commit×1) |
| flat | 5000.setKeys.emitP50 | 1.58 ± 0.08 | 28.13 ± 2.45 | 17.8× | FAIL | allow 5.6 (F_commit×1) |
| flat | 5000.setKeys.emitP95 | 6.08 ± 3.53 | 62.15 ± 19.12 | 10.2× | FAIL | allow 26.9 (F_commit×1) |
| flat | 5000.setKeys.domP50 | 4.76 ± 0.88 | 28.88 ± 2.55 | 6.1× | FAIL | allow 6.5 (F_commit×1) |
| flat | 5000.setKeys.domP95 | 13.72 ± 2.14 | 62.77 ± 19.05 | 4.6× | FAIL | allow 25.5 (F_commit×1) |
| flat | 5000.replace.emitP50 | 0.38 ± 0.08 | 110.97 ± 9.74 | 292.0× | FAIL | allow 12.9 (F_commit×1) |
| flat | 5000.replace.emitP95 | 5.28 ± 2.97 | 147.20 ± 12.40 | 27.9× | FAIL | allow 19.7 (F_commit×1) |
| flat | 5000.replace.domP50 | 2.04 ± 0.27 | 111.62 ± 10.05 | 54.7× | FAIL | allow 13.4 (F_commit×1) |
| flat | 5000.replace.domP95 | 9.26 ± 2.10 | 147.85 ± 12.43 | 16.0× | FAIL | allow 18.8 (F_commit×1) |
| flat | 5000.burst.lagP50 | 1.42 ± 0.04 | 8.22 ± 0.42 | 5.8× | FAIL | allow 3.5 (F_commit×1) |
| flat | 5000.burst.lagP95 | 2.56 ± 0.59 | 17.22 ± 1.81 | 6.7× | FAIL | allow 6.7 (F_commit×1) |
| flat | 5000.burst.endLag | 1.66 ± 0.43 | 8.47 ± 1.53 | 5.1× | FAIL | allow 5.0 (F_commit×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 7.92 ± 0.05 | 9.36 ± 0.08 | 1.2× | FAIL |  |
| flat | 5000.pssTotalMb | 228.75 ± 1.64 | 243.52 ± 1.49 | 1.1× | FAIL |  |
| workflow | edit_d1.emitP50 | 0.38 ± 0.04 | 10.08 ± 0.46 | 26.5× | FAIL | allow 3.5 (F_commit×1) |
| workflow | edit_d1.emitP95 | 1.60 ± 0.91 | 21.10 ± 1.90 | 13.2× | FAIL | allow 7.1 (F_commit×1) |
| workflow | edit_d1.domP50 | 3.28 ± 1.84 | 10.75 ± 0.49 | 3.3× | FAIL | allow 5.4 (F_commit×1) |
| workflow | edit_d1.domP95 | 8.94 ± 2.35 | 22.05 ± 1.99 | 2.5× | FAIL | allow 8.6 (F_commit×1) |
| workflow | edit_d4.emitP50 | 0.42 ± 0.04 | 9.65 ± 1.42 | 23.0× | FAIL | allow 4.5 (F_commit×1) |
| workflow | edit_d4.emitP95 | 2.94 ± 2.17 | 20.33 ± 1.25 | 6.9× | FAIL | allow 7.7 (F_commit×1) |
| workflow | edit_d4.domP50 | 2.82 ± 1.70 | 10.67 ± 1.51 | 3.8× | FAIL | allow 6.2 (F_commit×1) |
| workflow | edit_d4.domP95 | 11.12 ± 2.19 | 21.83 ± 2.55 | 2.0× | FAIL | allow 9.0 (F_commit×1) |
| workflow | edit_d10.emitP50 | 0.50 ± 0.07 | 10.58 ± 2.03 | 21.2× | FAIL | allow 5.1 (F_commit×1) |
| workflow | edit_d10.emitP95 | 1.50 ± 0.60 | 19.70 ± 2.61 | 13.1× | FAIL | allow 7.5 (F_commit×1) |
| workflow | edit_d10.domP50 | 3.06 ± 1.56 | 11.73 ± 1.74 | 3.8× | FAIL | allow 6.3 (F_commit×1) |
| workflow | edit_d10.domP95 | 9.30 ± 0.60 | 20.13 ± 2.76 | 2.2× | FAIL | allow 7.6 (F_commit×1) |
| workflow | loadCycle.emitP50 | 3.16 ± 5.67 | 21.10 ± 6.09 | 6.7× | FAIL | allow 17.8 (F_commit×2) |
| workflow | loadCycle.emitP95 | 36.36 ± 5.35 | 50.35 ± 5.04 | 1.4× | PLATFORM-BOUND | allow 19.0 (F_commit×2) |
| workflow | loadCycle.domP50 | 4.88 ± 6.34 | 21.60 ± 6.35 | 4.4× | PLATFORM-BOUND | allow 18.8 (F_commit×2) |
| workflow | loadCycle.domP95 | 36.86 ± 5.69 | 50.85 ± 5.11 | 1.4× | PLATFORM-BOUND | allow 19.4 (F_commit×2) |
| workflow | step.emitP50 | 0.30 ± 0.00 | 9.88 ± 1.14 | 32.9× | FAIL | allow 4.2 (F_commit×1) |
| workflow | step.emitP95 | 1.44 ± 0.68 | 24.17 ± 6.11 | 16.8× | FAIL | allow 11.1 (F_commit×1) |
| workflow | step.domP50 | 2.74 ± 2.07 | 10.85 ± 0.79 | 4.0× | FAIL | allow 5.9 (F_commit×1) |
| workflow | step.domP95 | 8.18 ± 2.34 | 24.72 ± 6.02 | 3.0× | FAIL | allow 12.6 (F_commit×1) |
| workflow | reset.emitP50 | 0.28 ± 0.04 | 19.55 ± 7.33 | 69.8× | FAIL | allow 10.4 (F_commit×1) |
| workflow | reset.emitP95 | 0.68 ± 0.47 | 42.90 ± 5.00 | 63.1× | FAIL | allow 9.8 (F_commit×1) |
| workflow | reset.domP50 | 0.32 ± 0.04 | 19.80 ± 7.21 | 61.9× | FAIL | allow 10.3 (F_commit×1) |
| workflow | reset.domP95 | 1.42 ± 0.50 | 42.95 ± 4.96 | 30.2× | FAIL | allow 9.8 (F_commit×1) |
| workflow | append100.emitP50 | 0.38 ± 0.04 | 16.50 ± 0.70 | 43.4× | FAIL | allow 3.8 (F_commit×1) |
| workflow | append100.emitP95 | 2.58 ± 2.64 | 24.02 ± 0.95 | 9.3× | FAIL | allow 7.9 (F_commit×1) |
| workflow | append100.domP50 | 1.76 ± 1.77 | 17.03 ± 0.62 | 9.7× | FAIL | allow 5.4 (F_commit×1) |
| workflow | append100.domP95 | 5.28 ± 1.35 | 24.60 ± 0.97 | 4.7× | FAIL | allow 6.6 (F_commit×1) |
| workflow | heapMb | 3.76 ± 0.04 | 5.01 ± 0.01 | 1.3× | FAIL |  |
| workflow | pssTotalMb | 222.61 ± 1.80 | 236.44 ± 2.98 | 1.1× | FAIL |  |
| workflow | relaunchReadyMs | 1383.78 ± 39.39 | 441.62 ± 16.44 | 0.3× | PASS |  |
| workflow | relaunchHeapMb | 3.30 ± 0.05 | 4.19 ± 0.03 | 1.3× | FAIL |  |

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
          "emitP95": 0.5,
          "domP50": 5.400000000008731,
          "domP95": 7
        },
        "setKeys": {
          "emitP50": 0.3000000000029104,
          "emitP95": 1.5,
          "domP50": 5.19999999999709,
          "domP95": 7.5
        },
        "replace": {
          "emitP50": 0.3000000000029104,
          "emitP95": 2,
          "domP50": 2.5,
          "domP95": 10.10000000000582
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.3000000000029104,
          "lagP95": 0.6000000000058208,
          "endLag": 0.39999999999417923,
          "maxBacklog": 0
        },
        "heapMb": 3.747283935546875,
        "pssTotalMb": 219.2197265625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999912689,
          "emitP95": 5.30000000000291,
          "domP50": 2.1000000000058208,
          "domP95": 11.5
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 4.80000000000291,
          "domP50": 1.1999999999970896,
          "domP95": 5.5
        },
        "replace": {
          "emitP50": 0.3000000000029104,
          "emitP95": 3.5,
          "domP50": 2.1000000000058208,
          "domP95": 12.099999999991269
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000000873115,
          "lagP95": 0.8999999999941792,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.9713287353515625,
        "pssTotalMb": 223.2685546875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.3999999999941792,
          "emitP95": 3.1999999999970896,
          "domP50": 6.900000000008731,
          "domP95": 8.30000000000291
        },
        "setKeys": {
          "emitP50": 1.6000000000058208,
          "emitP95": 11.900000000008731,
          "domP50": 4.600000000005821,
          "domP95": 13.89999999999418
        },
        "replace": {
          "emitP50": 0.39999999999417923,
          "emitP95": 3.8999999999941792,
          "domP50": 2.1999999999970896,
          "domP95": 8.69999999999709
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999941792,
          "lagP95": 2,
          "endLag": 1.3000000000029104,
          "maxBacklog": 0
        },
        "heapMb": 7.937751770019531,
        "pssTotalMb": 227.732421875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.39999999999417923,
        "emitP95": 1.400000000023283,
        "domP50": 2.1000000000058208,
        "domP95": 6.600000000005821
      },
      "edit_d4": {
        "emitP50": 0.5,
        "emitP95": 6.5,
        "domP50": 3.599999999976717,
        "domP95": 11.60000000000582
      },
      "edit_d10": {
        "emitP50": 0.5999999999767169,
        "emitP95": 2.1999999999825377,
        "domP50": 3.2000000000116415,
        "domP95": 8.5
      },
      "loadCycle": {
        "emitP50": 0.39999999999417923,
        "emitP95": 33.70000000001164,
        "domP50": 0.6000000000058208,
        "domP95": 34
      },
      "step": {
        "emitP50": 0.29999999998835847,
        "emitP95": 1.7999999999883585,
        "domP50": 1.1999999999825377,
        "domP95": 6.2999999999883585
      },
      "reset": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.5,
        "domP50": 0.39999999999417923,
        "domP95": 1.099999999976717
      },
      "append100": {
        "emitP50": 0.3000000000174623,
        "emitP95": 0.5,
        "domP50": 0.7000000000116415,
        "domP95": 3.400000000023283
      },
      "heapMb": 3.7761917114257812,
      "pssTotalMb": 221.451171875,
      "relaunchReadyMs": 1351.5,
      "relaunchHeapMb": 3.3514404296875
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10.5,
          "emitP95": 21.70000000001164,
          "domP50": 10.89999999999418,
          "domP95": 22.20000000001164
        },
        "setKeys": {
          "emitP50": 14.60000000000582,
          "emitP95": 31,
          "domP50": 15,
          "domP95": 31.60000000000582
        },
        "replace": {
          "emitP50": 9.700000000011642,
          "emitP95": 17.29999999998836,
          "domP50": 10.39999999999418,
          "domP95": 17.70000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.600000000005821,
          "lagP95": 14.39999999999418,
          "endLag": 6.899999999994179,
          "maxBacklog": 1
        },
        "heapMb": 4.599132537841797,
        "pssTotalMb": 233.8837890625,
        "fCommitP50": 2.8000000000174623,
        "fCommitP95": 4.100000000005821
      },
      "500": {
        "setKey": {
          "emitP50": 9.299999999988358,
          "emitP95": 20.099999999976717,
          "domP50": 9.60000000000582,
          "domP95": 20.5
        },
        "setKeys": {
          "emitP50": 16.699999999982538,
          "emitP95": 27.79999999998836,
          "domP50": 17.39999999999418,
          "domP95": 28.10000000000582
        },
        "replace": {
          "emitP50": 15.39999999999418,
          "emitP95": 26.800000000017462,
          "domP50": 16.900000000023283,
          "domP95": 27.300000000017462
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.899999999994179,
          "lagP95": 17.599999999976717,
          "endLag": 25.29999999998836,
          "maxBacklog": 1
        },
        "heapMb": 5.044429779052734,
        "pssTotalMb": 230.935546875,
        "fCommitP50": 3.2999999999883585,
        "fCommitP95": 4.2000000000116415
      },
      "5000": {
        "setKey": {
          "emitP50": 10,
          "emitP95": 26.39999999999418,
          "domP50": 10.699999999982538,
          "domP95": 28.29999999998836
        },
        "setKeys": {
          "emitP50": 27,
          "emitP95": 61.29999999998836,
          "domP50": 27.5,
          "domP95": 61.69999999998254
        },
        "replace": {
          "emitP50": 103.5,
          "emitP95": 139.79999999998836,
          "domP50": 103.89999999999418,
          "domP95": 140.20000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.10000000000582,
          "lagP95": 19.199999999982538,
          "endLag": 9.5,
          "maxBacklog": 2
        },
        "heapMb": 9.319683074951172,
        "pssTotalMb": 242.125,
        "fCommitP50": 3,
        "fCommitP95": 4.600000000005821
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 10.099999999976717,
        "emitP95": 20.5,
        "domP50": 11,
        "domP95": 22.70000000001164
      },
      "edit_d4": {
        "emitP50": 9.299999999988358,
        "emitP95": 20.89999999999418,
        "domP50": 9.799999999988358,
        "domP95": 21.39999999999418
      },
      "edit_d10": {
        "emitP50": 9.60000000000582,
        "emitP95": 22.60000000000582,
        "domP50": 10.700000000011642,
        "domP95": 23.300000000017462
      },
      "loadCycle": {
        "emitP50": 27.199999999982538,
        "emitP95": 57.89999999999418,
        "domP50": 28,
        "domP95": 58.5
      },
      "step": {
        "emitP50": 9.800000000017462,
        "emitP95": 28,
        "domP50": 10.700000000011642,
        "domP95": 28.60000000000582
      },
      "reset": {
        "emitP50": 30.39999999999418,
        "emitP95": 43.5,
        "domP50": 30.5,
        "domP95": 43.5
      },
      "append100": {
        "emitP50": 16.79999999998836,
        "emitP95": 24.39999999999418,
        "domP50": 17.39999999999418,
        "domP95": 24.79999999998836
      },
      "heapMb": 5.017826080322266,
      "pssTotalMb": 237.767578125,
      "relaunchReadyMs": 458.79999999998836,
      "relaunchHeapMb": 4.19970703125
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10.800000000017462,
          "emitP95": 19,
          "domP50": 11.300000000017462,
          "domP95": 19.699999999982538
        },
        "setKeys": {
          "emitP50": 14.5,
          "emitP95": 23.5,
          "domP50": 14.89999999999418,
          "domP95": 23.89999999999418
        },
        "replace": {
          "emitP50": 9.699999999982538,
          "emitP95": 19.39999999999418,
          "domP50": 12,
          "domP95": 19.70000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 12.5,
          "endLag": 5.899999999994179,
          "maxBacklog": 1
        },
        "heapMb": 4.5987396240234375,
        "pssTotalMb": 233.818359375,
        "fCommitP50": 3.2000000000116415,
        "fCommitP95": 4.2000000000116415
      },
      "500": {
        "setKey": {
          "emitP50": 10.299999999988358,
          "emitP95": 20.10000000000582,
          "domP50": 10.89999999999418,
          "domP95": 20.800000000017462
        },
        "setKeys": {
          "emitP50": 16.79999999998836,
          "emitP95": 27.699999999982538,
          "domP50": 17.29999999998836,
          "domP95": 28.099999999976717
        },
        "replace": {
          "emitP50": 13.200000000011642,
          "emitP95": 26.39999999999418,
          "domP50": 13.900000000023283,
          "domP95": 27.10000000000582
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.199999999982538,
          "lagP95": 15,
          "endLag": 11.60000000000582,
          "maxBacklog": 1
        },
        "heapMb": 5.044651031494141,
        "pssTotalMb": 232.3447265625,
        "fCommitP50": 3,
        "fCommitP95": 3.6000000000058208
      },
      "5000": {
        "setKey": {
          "emitP50": 11.699999999982538,
          "emitP95": 24.70000000001164,
          "domP50": 12.39999999999418,
          "domP95": 25.5
        },
        "setKeys": {
          "emitP50": 31.800000000017462,
          "emitP95": 74,
          "domP50": 32.70000000001164,
          "domP95": 74.60000000000582
        },
        "replace": {
          "emitP50": 125.29999999998836,
          "emitP95": 165.59999999997672,
          "domP50": 126.39999999999418,
          "domP95": 166.29999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.7999999999883585,
          "lagP95": 16.89999999999418,
          "endLag": 6.199999999982538,
          "maxBacklog": 2
        },
        "heapMb": 9.485626220703125,
        "pssTotalMb": 242.376953125,
        "fCommitP50": 2.900000000023283,
        "fCommitP95": 5.100000000005821
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.60000000000582,
        "emitP95": 22.89999999999418,
        "domP50": 10.200000000011642,
        "domP95": 23.39999999999418
      },
      "edit_d4": {
        "emitP50": 10.900000000023283,
        "emitP95": 18.5,
        "domP50": 11.89999999999418,
        "domP95": 19
      },
      "edit_d10": {
        "emitP50": 8.200000000011642,
        "emitP95": 16.29999999998836,
        "domP50": 9.799999999988358,
        "domP95": 16.60000000000582
      },
      "loadCycle": {
        "emitP50": 20.29999999998836,
        "emitP95": 48,
        "domP50": 21,
        "domP95": 48.60000000000582
      },
      "step": {
        "emitP50": 9.200000000011642,
        "emitP95": 17.70000000001164,
        "domP50": 11,
        "domP95": 18.5
      },
      "reset": {
        "emitP50": 15.199999999982538,
        "emitP95": 48.60000000000582,
        "domP50": 15.299999999988358,
        "domP95": 48.60000000000582
      },
      "append100": {
        "emitP50": 17.10000000000582,
        "emitP95": 24.60000000000582,
        "domP50": 17.60000000000582,
        "domP95": 25
      },
      "heapMb": 5.006263732910156,
      "pssTotalMb": 236.025390625,
      "relaunchReadyMs": 442.69999999995343,
      "relaunchHeapMb": 4.138545989990234
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.2000000000116415,
          "domP50": 5.2000000000116415,
          "domP95": 9.099999999976717
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.599999999976717,
          "domP50": 1.099999999976717,
          "domP95": 8.699999999953434
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 1.5,
          "domP50": 1.1000000000349246,
          "domP95": 7.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.7000000000116415,
          "endLag": 0.20000000001164153,
          "maxBacklog": 0
        },
        "heapMb": 3.5626296997070312,
        "pssTotalMb": 219.5693359375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.7999999999883585,
          "domP50": 3.900000000023283,
          "domP95": 8
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.1000000000349246,
          "domP50": 2,
          "domP95": 19.5
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.099999999976717,
          "domP50": 1.2999999999883585,
          "domP95": 9.700000000011642
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1.2000000000116415,
          "endLag": 0.3999999999650754,
          "maxBacklog": 0
        },
        "heapMb": 3.9735336303710938,
        "pssTotalMb": 223.0185546875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.2000000000116415,
          "emitP95": 1.900000000023283,
          "domP50": 7,
          "domP95": 8.5
        },
        "setKeys": {
          "emitP50": 1.6999999999534339,
          "emitP95": 7,
          "domP50": 6,
          "domP95": 12.600000000034925
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 7.900000000023283,
          "domP50": 1.8000000000465661,
          "domP95": 8.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 3.099999999976717,
          "endLag": 1.599999999976717,
          "maxBacklog": 0
        },
        "heapMb": 7.835456848144531,
        "pssTotalMb": 227.1787109375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.2000000000116415,
        "domP50": 1.2999999999883585,
        "domP95": 9.699999999953434
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.2000000000116415,
        "domP50": 5.2999999999883585,
        "domP95": 11.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1,
        "domP50": 1.5,
        "domP95": 10.099999999976717
      },
      "loadCycle": {
        "emitP50": 13.299999999988358,
        "emitP95": 36,
        "domP50": 15.799999999988358,
        "domP95": 36.5
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 1.1000000000349246,
        "domP95": 6.2999999999883585
      },
      "reset": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.5,
        "domP50": 0.29999999998835847,
        "domP95": 1.2999999999883585
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 0.9000000000232831,
        "domP95": 4.599999999976717
      },
      "heapMb": 3.7757034301757812,
      "pssTotalMb": 221.60546875,
      "relaunchReadyMs": 1422.4000000000233,
      "relaunchHeapMb": 3.2575035095214844
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 7,
          "domP50": 5.600000000034925,
          "domP95": 11.5
        },
        "setKeys": {
          "emitP50": 0.3999999999650754,
          "emitP95": 1.2000000000116415,
          "domP50": 1.099999999976717,
          "domP95": 8.399999999965075
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 0.7999999999883585,
          "domP50": 1.1000000000349246,
          "domP95": 8.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.8999999999650754,
          "endLag": 0.29999999998835847,
          "maxBacklog": 0
        },
        "heapMb": 3.5627288818359375,
        "pssTotalMb": 219.5439453125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.5,
          "domP50": 3.7999999999883585,
          "domP95": 7.399999999965075
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 0.9000000000232831,
          "domP50": 4.400000000023283,
          "domP95": 16
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 1.1000000000349246,
          "domP50": 1.400000000023283,
          "domP95": 6.7000000000116415
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7999999999883585,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.97357177734375,
        "pssTotalMb": 223.1005859375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 2.599999999976717,
          "domP50": 6.899999999965075,
          "domP95": 8.400000000023283
        },
        "setKeys": {
          "emitP50": 1.6000000000349246,
          "emitP95": 3.7000000000116415,
          "domP50": 4.2999999999883585,
          "domP95": 13
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 1.1999999999534339,
          "domP50": 2.2999999999883585,
          "domP95": 12.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999650754,
          "lagP95": 2.199999999953434,
          "endLag": 1.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 7.9384918212890625,
        "pssTotalMb": 227.7939453125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 3.2000000000116415,
        "domP50": 4.5,
        "domP95": 12.099999999976717
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2,
        "domP50": 2.599999999976717,
        "domP95": 10.200000000011642
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.1000000000349246,
        "domP50": 1.599999999976717,
        "domP95": 9
      },
      "loadCycle": {
        "emitP50": 1,
        "emitP95": 45.70000000001164,
        "domP50": 4.7999999999883585,
        "domP95": 46.800000000046566
      },
      "step": {
        "emitP50": 0.29999999998835847,
        "emitP95": 1.3999999999650754,
        "domP50": 1.400000000023283,
        "domP95": 11.900000000023283
      },
      "reset": {
        "emitP50": 0.29999999998835847,
        "emitP95": 1.5,
        "domP50": 0.29999999998835847,
        "domP95": 2.2999999999883585
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 6.400000000023283,
        "domP50": 4.899999999965075,
        "domP95": 7
      },
      "heapMb": 3.6821212768554688,
      "pssTotalMb": 220.896484375,
      "relaunchReadyMs": 1416.399999999965,
      "relaunchHeapMb": 3.257488250732422
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.700000000011642,
          "emitP95": 18.399999999965075,
          "domP50": 10.200000000011642,
          "domP95": 23.599999999976717
        },
        "setKeys": {
          "emitP50": 13.200000000011642,
          "emitP95": 34.100000000034925,
          "domP50": 14.100000000034925,
          "domP95": 34.90000000002328
        },
        "replace": {
          "emitP50": 9.299999999988358,
          "emitP95": 21.79999999998836,
          "domP50": 9.799999999988358,
          "domP95": 22.399999999965075
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7,
          "lagP95": 14.299999999988358,
          "endLag": 8.299999999988358,
          "maxBacklog": 1
        },
        "heapMb": 4.598400115966797,
        "pssTotalMb": 230.7490234375,
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 4.800000000046566
      },
      "500": {
        "setKey": {
          "emitP50": 8.900000000023283,
          "emitP95": 29.70000000001164,
          "domP50": 9.599999999976717,
          "domP95": 30.399999999965075
        },
        "setKeys": {
          "emitP50": 15.899999999965075,
          "emitP95": 38.600000000034925,
          "domP50": 16.399999999965075,
          "domP95": 39.300000000046566
        },
        "replace": {
          "emitP50": 13.099999999976717,
          "emitP95": 41.800000000046566,
          "domP50": 13.599999999976717,
          "domP95": 42.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.199999999953434,
          "lagP95": 13.900000000023283,
          "endLag": 16.900000000023283,
          "maxBacklog": 1
        },
        "heapMb": 5.044559478759766,
        "pssTotalMb": 235.6025390625,
        "fCommitP50": 2.900000000023283,
        "fCommitP95": 3.800000000046566
      },
      "5000": {
        "setKey": {
          "emitP50": 14,
          "emitP95": 30.300000000046566,
          "domP50": 15.399999999965075,
          "domP95": 31
        },
        "setKeys": {
          "emitP50": 27,
          "emitP95": 35.5,
          "domP50": 27.800000000046566,
          "domP95": 36.29999999998836
        },
        "replace": {
          "emitP50": 107.5,
          "emitP95": 143.59999999997672,
          "domP50": 108,
          "domP95": 144.20000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.799999999988358,
          "lagP95": 14.899999999965075,
          "endLag": 9,
          "maxBacklog": 2
        },
        "heapMb": 9.318923950195312,
        "pssTotalMb": 244.5087890625,
        "fCommitP50": 3,
        "fCommitP95": 3.6000000000349246
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 10.700000000011642,
        "emitP95": 22.300000000046566,
        "domP50": 11.299999999988358,
        "domP95": 23
      },
      "edit_d4": {
        "emitP50": 10.599999999976717,
        "emitP95": 20.599999999976717,
        "domP50": 12,
        "domP95": 25.20000000001164
      },
      "edit_d10": {
        "emitP50": 12.5,
        "emitP95": 19.5,
        "domP50": 13.099999999976717,
        "domP95": 19.900000000023283
      },
      "loadCycle": {
        "emitP50": 23.900000000023283,
        "emitP95": 47.40000000002328,
        "domP50": 24.29999999998836,
        "domP95": 47.800000000046566
      },
      "step": {
        "emitP50": 11.5,
        "emitP95": 20.399999999965075,
        "domP50": 11.799999999988358,
        "domP95": 20.79999999998836
      },
      "reset": {
        "emitP50": 15,
        "emitP95": 36.399999999965075,
        "domP50": 15.700000000011642,
        "domP95": 36.5
      },
      "append100": {
        "emitP50": 16.600000000034925,
        "emitP95": 24.5,
        "domP50": 16.900000000023283,
        "domP95": 25.400000000023283
      },
      "heapMb": 5.006038665771484,
      "pssTotalMb": 232.4892578125,
      "relaunchReadyMs": 419.30000000004657,
      "relaunchHeapMb": 4.202079772949219
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.199999999953434,
          "domP50": 3.599999999976717,
          "domP95": 7.300000000046566
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.2000000000698492,
          "domP50": 1.599999999976717,
          "domP95": 11.599999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 8.199999999953434,
          "domP50": 5.099999999976717,
          "domP95": 9.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.6999999999534339,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.562744140625,
        "pssTotalMb": 219.466796875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.099999999976717,
          "domP50": 6.599999999976717,
          "domP95": 9.300000000046566
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 2.599999999976717,
          "domP50": 4.5,
          "domP95": 7.199999999953434
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.599999999976717,
          "domP50": 3.300000000046566,
          "domP95": 10.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1.6000000000931323,
          "endLag": 9.900000000023283,
          "maxBacklog": 0
        },
        "heapMb": 3.9735336303710938,
        "pssTotalMb": 223.015625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.5,
          "domP50": 6.600000000093132,
          "domP95": 7.799999999930151
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 3.799999999930151,
          "domP50": 3.699999999953434,
          "domP95": 17.300000000046566
        },
        "replace": {
          "emitP50": 0.5,
          "emitP95": 5,
          "domP50": 1.7000000000698492,
          "domP95": 6.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.199999999953434,
          "endLag": 1.599999999976717,
          "maxBacklog": 0
        },
        "heapMb": 7.937549591064453,
        "pssTotalMb": 230.5341796875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1999999999534339,
        "domP50": 2.699999999953434,
        "domP95": 9.699999999953434
      },
      "edit_d4": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.7999999999301508,
        "domP50": 1.5,
        "domP95": 8
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 2.099999999976717,
        "domP50": 5.199999999953434,
        "domP95": 9.5
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 33.199999999953434,
        "domP50": 0.6999999999534339,
        "domP95": 33.5
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 5,
        "domP95": 7.5
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.30000000004656613,
        "domP50": 0.2999999999301508,
        "domP95": 1.099999999976717
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 4.300000000046566,
        "domP50": 1.099999999976717,
        "domP95": 5.700000000069849
      },
      "heapMb": 3.776103973388672,
      "pssTotalMb": 224.357421875,
      "relaunchReadyMs": 1333.9000000000233,
      "relaunchHeapMb": 3.35162353515625
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
          "domP50": 5.599999999976717,
          "domP95": 9.70000000006985
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6999999999534339,
          "domP50": 3.5,
          "domP95": 8.100000000093132
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 6.200000000069849,
          "domP50": 1.2000000000698492,
          "domP95": 8.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.7000000000698492,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.562652587890625,
        "pssTotalMb": 222.78125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.6999999999534339,
          "domP50": 4.599999999976717,
          "domP95": 9.70000000006985
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.7999999999301508,
          "domP50": 1.5,
          "domP95": 8.400000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.299999999930151,
          "domP50": 1.1999999999534339,
          "domP95": 7.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6999999999534339,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.9735336303710938,
        "pssTotalMb": 226.1220703125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1000000000931323,
          "emitP95": 1.599999999976717,
          "domP50": 6.699999999953434,
          "domP95": 8.300000000046566
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 4,
          "domP50": 5.199999999953434,
          "domP95": 11.800000000046566
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 8.399999999906868,
          "domP50": 2.199999999953434,
          "domP95": 9.899999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 3.299999999930151,
          "endLag": 2.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 7.937690734863281,
        "pssTotalMb": 230.53515625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1,
        "domP50": 5.799999999930151,
        "domP95": 6.599999999976717
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 3.199999999953434,
        "domP50": 1.099999999976717,
        "domP95": 13.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 3.799999999930151,
        "domP95": 9.400000000023283
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33.20000000006985,
        "domP50": 2.5,
        "domP95": 33.5
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 2.400000000023283,
        "domP50": 5,
        "domP95": 8.900000000023283
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 0.30000000004656613,
        "domP95": 1.3000000000465661
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1.2000000000698492,
        "domP95": 5.699999999953434
      },
      "heapMb": 3.775524139404297,
      "pssTotalMb": 224.7509765625,
      "relaunchReadyMs": 1394.6999999999534,
      "relaunchHeapMb": 3.2575721740722656
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.599999999976717,
          "emitP95": 23.099999999976717,
          "domP50": 9.800000000046566,
          "domP95": 23.79999999993015
        },
        "setKeys": {
          "emitP50": 13.599999999976717,
          "emitP95": 23,
          "domP50": 13.899999999906868,
          "domP95": 23.600000000093132
        },
        "replace": {
          "emitP50": 8.599999999976717,
          "emitP95": 18,
          "domP50": 9.099999999976717,
          "domP95": 18.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.300000000046566,
          "lagP95": 12.800000000046566,
          "endLag": 10.800000000046566,
          "maxBacklog": 1
        },
        "heapMb": 4.598690032958984,
        "pssTotalMb": 237.0078125,
        "fCommitP50": 3,
        "fCommitP95": 3.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 12.900000000023283,
          "emitP95": 26,
          "domP50": 13.400000000023283,
          "domP95": 26.5
        },
        "setKeys": {
          "emitP50": 15.199999999953434,
          "emitP95": 25.199999999953434,
          "domP50": 16,
          "domP95": 27.199999999953434
        },
        "replace": {
          "emitP50": 15.79999999993015,
          "emitP95": 30.79999999993015,
          "domP50": 16.599999999976717,
          "domP95": 32.09999999997672
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.900000000023283,
          "lagP95": 17.70000000006985,
          "endLag": 5.399999999906868,
          "maxBacklog": 2
        },
        "heapMb": 5.044750213623047,
        "pssTotalMb": 235.3505859375,
        "fCommitP50": 3,
        "fCommitP95": 5.400000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 13.400000000023283,
          "emitP95": 24.79999999993015,
          "domP50": 14.199999999953434,
          "domP95": 25.099999999976717
        },
        "setKeys": {
          "emitP50": 26.70000000006985,
          "emitP95": 77.79999999993015,
          "domP50": 27.5,
          "domP95": 78.5
        },
        "replace": {
          "emitP50": 107.59999999997672,
          "emitP95": 139.80000000004657,
          "domP50": 108.19999999995343,
          "domP95": 140.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.199999999953434,
          "lagP95": 17.900000000023283,
          "endLag": 9.199999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.319664001464844,
        "pssTotalMb": 245.087890625,
        "fCommitP50": 3.1000000000931323,
        "fCommitP95": 4.199999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.900000000023283,
        "emitP95": 18.70000000006985,
        "domP50": 10.5,
        "domP95": 19.099999999976717
      },
      "edit_d4": {
        "emitP50": 7.799999999930151,
        "emitP95": 21.300000000046566,
        "domP50": 9,
        "domP95": 21.70000000006985
      },
      "edit_d10": {
        "emitP50": 12,
        "emitP95": 20.399999999906868,
        "domP50": 13.300000000046566,
        "domP95": 20.70000000006985
      },
      "loadCycle": {
        "emitP50": 13,
        "emitP95": 48.09999999997672,
        "domP50": 13.099999999976717,
        "domP95": 48.5
      },
      "step": {
        "emitP50": 9,
        "emitP95": 30.599999999976717,
        "domP50": 9.900000000023283,
        "domP95": 31
      },
      "reset": {
        "emitP50": 17.599999999976717,
        "emitP95": 43.09999999997672,
        "domP50": 17.699999999953434,
        "domP95": 43.199999999953434
      },
      "append100": {
        "emitP50": 15.5,
        "emitP95": 22.599999999976717,
        "domP50": 16.20000000006985,
        "domP95": 23.199999999953434
      },
      "heapMb": 5.006870269775391,
      "pssTotalMb": 239.4619140625,
      "relaunchReadyMs": 445.69999999995343,
      "relaunchHeapMb": 4.202362060546875
    }
  }
]
```
</details>
