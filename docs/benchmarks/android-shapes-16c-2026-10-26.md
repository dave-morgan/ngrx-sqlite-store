# Phase 16 baseline — flat objects & hybrid workflow (2026-10-26)

**PRELIMINARY.** Measured on `emulator-5554` in parallel with phase 15 work, on a shared host (6 cores). Trials wait for phase 15 device runners to be idle, but other host load such as Codex builds can still perturb absolute numbers. Relative verdicts come from alternating classic/sqlite trials. The library is at the phase 15c state; phase 16 optimisations have not been applied.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.11 ms, p95 4.60 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND: latency excess ≤ classic SD + F_commit × commits + sqlite SD.
  - FAIL: everything else. Memory has no platform control yet.

**Acceptance (preliminary):** PASS 1 / PLATFORM-BOUND 7 / FAIL 78

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.38 ± 0.04 | 8.75 ± 0.89 | 23.0× | FAIL | allow 4.0 (F_commit×1) |
| flat | 50.setKey.emitP95 | 1.50 ± 1.64 | 24.40 ± 3.84 | 16.3× | FAIL | allow 10.1 (F_commit×1) |
| flat | 50.setKey.domP50 | 4.40 ± 1.82 | 9.40 ± 1.07 | 2.1× | PLATFORM-BOUND | allow 6.0 (F_commit×1) |
| flat | 50.setKey.domP95 | 9.86 ± 3.48 | 25.38 ± 3.92 | 2.6× | FAIL | allow 12.0 (F_commit×1) |
| flat | 50.setKeys.emitP50 | 0.40 ± 0.00 | 16.02 ± 1.32 | 40.1× | FAIL | allow 4.4 (F_commit×1) |
| flat | 50.setKeys.emitP95 | 4.60 ± 3.67 | 29.87 ± 0.70 | 6.5× | FAIL | allow 9.0 (F_commit×1) |
| flat | 50.setKeys.domP50 | 3.94 ± 2.24 | 16.55 ± 1.30 | 4.2× | FAIL | allow 6.7 (F_commit×1) |
| flat | 50.setKeys.domP95 | 12.26 ± 3.58 | 30.35 ± 0.81 | 2.5× | FAIL | allow 9.0 (F_commit×1) |
| flat | 50.replace.emitP50 | 0.32 ± 0.04 | 9.28 ± 0.84 | 29.0× | FAIL | allow 4.0 (F_commit×1) |
| flat | 50.replace.emitP95 | 5.30 ± 5.04 | 26.13 ± 2.68 | 4.9× | FAIL | allow 12.3 (F_commit×1) |
| flat | 50.replace.domP50 | 2.64 ± 1.37 | 10.35 ± 0.90 | 3.9× | FAIL | allow 5.4 (F_commit×1) |
| flat | 50.replace.domP95 | 12.66 ± 3.42 | 26.62 ± 2.64 | 2.1× | FAIL | allow 10.7 (F_commit×1) |
| flat | 50.burst.lagP50 | 0.34 ± 0.05 | 6.45 ± 0.47 | 19.0× | FAIL | allow 3.6 (F_commit×1) |
| flat | 50.burst.lagP95 | 0.96 ± 0.47 | 14.33 ± 0.92 | 14.9× | FAIL | allow 6.0 (F_commit×1) |
| flat | 50.burst.endLag | 0.86 ± 0.84 | 9.03 ± 2.23 | 10.5× | FAIL | allow 6.2 (F_commit×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 1.00 ± 0.00 | 1000000000.0× | FAIL |  |
| flat | 50.heapMb | 3.58 ± 0.11 | 4.61 ± 0.00 | 1.3× | FAIL |  |
| flat | 50.pssTotalMb | 220.54 ± 1.52 | 235.57 ± 2.13 | 1.1× | FAIL |  |
| flat | 500.setKey.emitP50 | 0.54 ± 0.09 | 9.95 ± 1.12 | 18.4× | FAIL | allow 4.3 (F_commit×1) |
| flat | 500.setKey.emitP95 | 1.74 ± 0.65 | 21.70 ± 3.10 | 12.5× | FAIL | allow 8.4 (F_commit×1) |
| flat | 500.setKey.domP50 | 5.56 ± 0.15 | 10.63 ± 1.19 | 1.9× | FAIL | allow 4.4 (F_commit×1) |
| flat | 500.setKey.domP95 | 9.88 ± 2.25 | 22.65 ± 3.48 | 2.3× | FAIL | allow 10.3 (F_commit×1) |
| flat | 500.setKeys.emitP50 | 0.54 ± 0.05 | 15.85 ± 1.38 | 29.4× | FAIL | allow 4.5 (F_commit×1) |
| flat | 500.setKeys.emitP95 | 1.88 ± 0.80 | 30.02 ± 4.64 | 16.0× | FAIL | allow 10.0 (F_commit×1) |
| flat | 500.setKeys.domP50 | 2.76 ± 2.01 | 16.25 ± 1.31 | 5.9× | FAIL | allow 6.4 (F_commit×1) |
| flat | 500.setKeys.domP95 | 11.26 ± 3.11 | 30.60 ± 4.61 | 2.7× | FAIL | allow 12.3 (F_commit×1) |
| flat | 500.replace.emitP50 | 0.36 ± 0.05 | 12.87 ± 1.50 | 35.8× | FAIL | allow 4.7 (F_commit×1) |
| flat | 500.replace.emitP95 | 1.62 ± 0.70 | 27.65 ± 3.51 | 17.1× | FAIL | allow 8.8 (F_commit×1) |
| flat | 500.replace.domP50 | 2.40 ± 1.91 | 13.40 ± 1.53 | 5.6× | FAIL | allow 6.6 (F_commit×1) |
| flat | 500.replace.domP95 | 11.08 ± 3.53 | 28.10 ± 3.70 | 2.5× | FAIL | allow 11.8 (F_commit×1) |
| flat | 500.burst.lagP50 | 0.42 ± 0.04 | 6.83 ± 0.39 | 16.2× | FAIL | allow 3.5 (F_commit×1) |
| flat | 500.burst.lagP95 | 0.92 ± 0.11 | 14.80 ± 0.89 | 16.1× | FAIL | allow 5.6 (F_commit×1) |
| flat | 500.burst.endLag | 0.68 ± 0.36 | 8.33 ± 4.04 | 12.2× | FAIL | allow 7.5 (F_commit×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 1.00 ± 0.00 | 1000000000.0× | FAIL |  |
| flat | 500.heapMb | 4.03 ± 0.13 | 5.06 ± 0.00 | 1.3× | FAIL |  |
| flat | 500.pssTotalMb | 225.21 ± 1.44 | 235.78 ± 2.76 | 1.0× | FAIL |  |
| flat | 5000.setKey.emitP50 | 1.16 ± 0.05 | 13.10 ± 0.88 | 11.3× | FAIL | allow 4.0 (F_commit×1) |
| flat | 5000.setKey.emitP95 | 1.84 ± 0.21 | 31.92 ± 3.91 | 17.4× | FAIL | allow 8.7 (F_commit×1) |
| flat | 5000.setKey.domP50 | 6.78 ± 0.11 | 13.87 ± 0.93 | 2.0× | FAIL | allow 4.2 (F_commit×1) |
| flat | 5000.setKey.domP95 | 8.12 ± 0.19 | 32.72 ± 3.65 | 4.0× | FAIL | allow 8.4 (F_commit×1) |
| flat | 5000.setKeys.emitP50 | 1.60 ± 0.12 | 16.07 ± 0.66 | 10.0× | FAIL | allow 3.9 (F_commit×1) |
| flat | 5000.setKeys.emitP95 | 7.46 ± 3.82 | 81.45 ± 10.20 | 10.9× | FAIL | allow 18.6 (F_commit×1) |
| flat | 5000.setKeys.domP50 | 3.50 ± 0.16 | 17.20 ± 0.32 | 4.9× | FAIL | allow 3.6 (F_commit×1) |
| flat | 5000.setKeys.domP95 | 15.18 ± 4.12 | 82.45 ± 9.59 | 5.4× | FAIL | allow 18.3 (F_commit×1) |
| flat | 5000.replace.emitP50 | 0.36 ± 0.05 | 48.53 ± 0.90 | 134.8× | FAIL | allow 4.1 (F_commit×1) |
| flat | 5000.replace.emitP95 | 3.74 ± 5.15 | 59.93 ± 5.46 | 16.0× | FAIL | allow 15.2 (F_commit×1) |
| flat | 5000.replace.domP50 | 2.04 ± 0.51 | 49.18 ± 1.08 | 24.1× | FAIL | allow 4.7 (F_commit×1) |
| flat | 5000.replace.domP95 | 15.78 ± 10.99 | 60.55 ± 5.38 | 3.8× | FAIL | allow 21.0 (F_commit×1) |
| flat | 5000.burst.lagP50 | 1.40 ± 0.00 | 7.80 ± 0.59 | 5.6× | FAIL | allow 3.7 (F_commit×1) |
| flat | 5000.burst.lagP95 | 2.28 ± 0.31 | 16.20 ± 3.53 | 7.1× | FAIL | allow 8.4 (F_commit×1) |
| flat | 5000.burst.endLag | 1.44 ± 0.21 | 10.60 ± 6.02 | 7.4× | PLATFORM-BOUND | allow 9.3 (F_commit×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 7.90 ± 0.06 | 9.29 ± 0.00 | 1.2× | FAIL |  |
| flat | 5000.pssTotalMb | 229.70 ± 1.29 | 242.42 ± 1.87 | 1.1× | FAIL |  |
| workflow | edit_d1.emitP50 | 0.42 ± 0.04 | 9.03 ± 1.32 | 21.5× | FAIL | allow 4.5 (F_commit×1) |
| workflow | edit_d1.emitP95 | 2.70 ± 2.25 | 19.68 ± 1.37 | 7.3× | FAIL | allow 8.2 (F_commit×1) |
| workflow | edit_d1.domP50 | 3.66 ± 2.07 | 9.68 ± 1.13 | 2.6× | PLATFORM-BOUND | allow 6.3 (F_commit×1) |
| workflow | edit_d1.domP95 | 9.54 ± 3.43 | 20.50 ± 1.44 | 2.1× | FAIL | allow 9.5 (F_commit×1) |
| workflow | edit_d4.emitP50 | 0.46 ± 0.05 | 8.88 ± 0.90 | 19.3× | FAIL | allow 4.1 (F_commit×1) |
| workflow | edit_d4.emitP95 | 1.74 ± 1.23 | 18.23 ± 1.71 | 10.5× | FAIL | allow 7.5 (F_commit×1) |
| workflow | edit_d4.domP50 | 3.34 ± 2.22 | 9.45 ± 0.84 | 2.8× | PLATFORM-BOUND | allow 6.2 (F_commit×1) |
| workflow | edit_d4.domP95 | 9.76 ± 2.02 | 18.83 ± 1.43 | 1.9× | FAIL | allow 8.1 (F_commit×1) |
| workflow | edit_d10.emitP50 | 0.44 ± 0.05 | 8.10 ± 0.48 | 18.4× | FAIL | allow 3.6 (F_commit×1) |
| workflow | edit_d10.emitP95 | 1.50 ± 0.33 | 18.80 ± 2.63 | 12.5× | FAIL | allow 7.6 (F_commit×1) |
| workflow | edit_d10.domP50 | 3.04 ± 2.33 | 8.65 ± 0.48 | 2.8× | PLATFORM-BOUND | allow 5.9 (F_commit×1) |
| workflow | edit_d10.domP95 | 11.52 ± 4.73 | 20.55 ± 2.25 | 1.8× | PLATFORM-BOUND | allow 11.6 (F_commit×1) |
| workflow | loadCycle.emitP50 | 0.56 ± 0.09 | 20.12 ± 1.96 | 35.9× | FAIL | allow 8.3 (F_commit×2) |
| workflow | loadCycle.emitP95 | 34.14 ± 2.39 | 50.55 ± 2.01 | 1.5× | FAIL | allow 13.6 (F_commit×2) |
| workflow | loadCycle.domP50 | 0.84 ± 0.30 | 20.53 ± 2.01 | 24.4× | FAIL | allow 8.5 (F_commit×2) |
| workflow | loadCycle.domP95 | 34.50 ± 2.37 | 50.95 ± 2.04 | 1.5× | FAIL | allow 13.6 (F_commit×2) |
| workflow | step.emitP50 | 0.32 ± 0.04 | 10.35 ± 1.71 | 32.3× | FAIL | allow 4.9 (F_commit×1) |
| workflow | step.emitP95 | 1.08 ± 0.52 | 21.35 ± 3.44 | 19.8× | FAIL | allow 8.6 (F_commit×1) |
| workflow | step.domP50 | 4.32 ± 1.99 | 10.83 ± 1.41 | 2.5× | PLATFORM-BOUND | allow 6.5 (F_commit×1) |
| workflow | step.domP95 | 9.88 ± 2.74 | 22.43 ± 3.27 | 2.3× | FAIL | allow 10.6 (F_commit×1) |
| workflow | reset.emitP50 | 0.28 ± 0.08 | 18.12 ± 5.08 | 64.7× | FAIL | allow 8.3 (F_commit×1) |
| workflow | reset.emitP95 | 1.60 ± 2.08 | 39.60 ± 6.30 | 24.7× | FAIL | allow 13.0 (F_commit×1) |
| workflow | reset.domP50 | 0.28 ± 0.08 | 18.12 ± 5.08 | 64.7× | FAIL | allow 8.3 (F_commit×1) |
| workflow | reset.domP95 | 2.10 ± 1.87 | 39.70 ± 6.30 | 18.9× | FAIL | allow 12.8 (F_commit×1) |
| workflow | append100.emitP50 | 0.38 ± 0.08 | 16.95 ± 4.22 | 44.6× | FAIL | allow 7.4 (F_commit×1) |
| workflow | append100.emitP95 | 3.68 ± 5.10 | 27.00 ± 3.14 | 7.3× | FAIL | allow 12.8 (F_commit×1) |
| workflow | append100.domP50 | 1.18 ± 0.41 | 17.35 ± 4.34 | 14.7× | FAIL | allow 7.9 (F_commit×1) |
| workflow | append100.domP95 | 7.30 ± 3.37 | 27.70 ± 3.07 | 3.8× | FAIL | allow 11.0 (F_commit×1) |
| workflow | heapMb | 3.81 ± 0.08 | 5.03 ± 0.01 | 1.3× | FAIL |  |
| workflow | pssTotalMb | 222.94 ± 1.52 | 237.03 ± 1.54 | 1.1× | FAIL |  |
| workflow | relaunchReadyMs | 1237.88 ± 522.72 | 962.12 ± 334.43 | 0.8× | PASS |  |
| workflow | relaunchHeapMb | 3.31 ± 0.05 | 4.22 ± 0.03 | 1.3× | FAIL |  |

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
          "emitP95": 0.40000000000873115,
          "domP50": 5.600000000005821,
          "domP95": 7
        },
        "setKeys": {
          "emitP50": 0.39999999999417923,
          "emitP95": 10.80000000000291,
          "domP50": 5.400000000008731,
          "domP95": 17.30000000000291
        },
        "replace": {
          "emitP50": 0.3000000000029104,
          "emitP95": 4.5,
          "domP50": 2.1999999999970896,
          "domP95": 14.30000000000291
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.3000000000029104,
          "lagP95": 1.5999999999912689,
          "endLag": 2.3000000000029104,
          "maxBacklog": 0
        },
        "heapMb": 3.7519149780273438,
        "pssTotalMb": 219.380859375
      },
      "500": {
        "setKey": {
          "emitP50": 0.6000000000058208,
          "emitP95": 2.3000000000029104,
          "domP50": 5.5,
          "domP95": 13.400000000008731
        },
        "setKeys": {
          "emitP50": 0.6000000000058208,
          "emitP95": 1.6999999999970896,
          "domP50": 5.100000000005821,
          "domP95": 12.5
        },
        "replace": {
          "emitP50": 0.39999999999417923,
          "emitP95": 1.1000000000058208,
          "domP50": 5.2000000000116415,
          "domP95": 9
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.39999999999417923,
          "lagP95": 0.8000000000029104,
          "endLag": 0.3000000000029104,
          "maxBacklog": 0
        },
        "heapMb": 3.8714218139648438,
        "pssTotalMb": 222.8037109375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1999999999970896,
          "emitP95": 2,
          "domP50": 6.69999999999709,
          "domP95": 8.19999999999709
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 9.80000000000291,
          "domP50": 3.6999999999970896,
          "domP95": 16.40000000000873
        },
        "replace": {
          "emitP50": 0.3000000000029104,
          "emitP95": 1.6000000000058208,
          "domP50": 2,
          "domP95": 5.80000000000291
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999941792,
          "lagP95": 2.2000000000116415,
          "endLag": 1.5,
          "maxBacklog": 0
        },
        "heapMb": 7.937690734863281,
        "pssTotalMb": 230.5751953125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.39999999999417923,
        "emitP95": 0.8999999999941792,
        "domP50": 1.7999999999883585,
        "domP95": 7.7000000000116415
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8999999999941792,
        "domP50": 1.7999999999883585,
        "domP95": 7.599999999976717
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.5,
        "domP50": 1.900000000023283,
        "domP95": 8.60000000000582
      },
      "loadCycle": {
        "emitP50": 0.6000000000058208,
        "emitP95": 32.69999999998254,
        "domP50": 0.8000000000174623,
        "domP95": 33
      },
      "step": {
        "emitP50": 0.39999999999417923,
        "emitP95": 0.8000000000174623,
        "domP50": 5.399999999994179,
        "domP95": 9.599999999976717
      },
      "reset": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.40000000002328306,
        "domP50": 0.3000000000174623,
        "domP95": 1.2999999999883585
      },
      "append100": {
        "emitP50": 0.39999999999417923,
        "emitP95": 12.39999999999418,
        "domP50": 1.8999999999941792,
        "domP95": 13.099999999976717
      },
      "heapMb": 3.776233673095703,
      "pssTotalMb": 221.3046875,
      "relaunchReadyMs": 1498.3000000000175,
      "relaunchHeapMb": 3.3514785766601562
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.60000000000582,
          "emitP95": 28.70000000001164,
          "domP50": 10.700000000011642,
          "domP95": 29.400000000023283
        },
        "setKeys": {
          "emitP50": 16.29999999998836,
          "emitP95": 29.29999999998836,
          "domP50": 17.199999999982538,
          "domP95": 29.60000000000582
        },
        "replace": {
          "emitP50": 10.299999999988358,
          "emitP95": 27.5,
          "domP50": 11.39999999999418,
          "domP95": 28
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.100000000005821,
          "lagP95": 14.400000000023283,
          "endLag": 11.60000000000582,
          "maxBacklog": 1
        },
        "heapMb": 4.6146240234375,
        "pssTotalMb": 236.462890625,
        "fCommitP50": 3,
        "fCommitP95": 4.5
      },
      "500": {
        "setKey": {
          "emitP50": 9.299999999988358,
          "emitP95": 21.5,
          "domP50": 9.89999999999418,
          "domP95": 22.10000000000582
        },
        "setKeys": {
          "emitP50": 14.800000000017462,
          "emitP95": 23.39999999999418,
          "domP50": 15.299999999988358,
          "domP95": 24
        },
        "replace": {
          "emitP50": 14.89999999999418,
          "emitP95": 30.89999999999418,
          "domP50": 15.39999999999418,
          "domP95": 31.60000000000582
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.599999999976717,
          "lagP95": 13.700000000011642,
          "endLag": 4.600000000005821,
          "maxBacklog": 1
        },
        "heapMb": 5.057319641113281,
        "pssTotalMb": 236.02734375,
        "fCommitP50": 3.3999999999941792,
        "fCommitP95": 5.5
      },
      "5000": {
        "setKey": {
          "emitP50": 13.5,
          "emitP95": 28.099999999976717,
          "domP50": 14,
          "domP95": 29.699999999982538
        },
        "setKeys": {
          "emitP50": 15.299999999988358,
          "emitP95": 87.60000000000582,
          "domP50": 16.800000000017462,
          "domP95": 88.5
        },
        "replace": {
          "emitP50": 48.20000000001164,
          "emitP95": 55.70000000001164,
          "domP50": 48.70000000001164,
          "domP95": 56.40000000002328
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.2999999999883585,
          "lagP95": 13.5,
          "endLag": 19.300000000017462,
          "maxBacklog": 2
        },
        "heapMb": 9.296043395996094,
        "pssTotalMb": 241.21875,
        "fCommitP50": 2.7999999999883585,
        "fCommitP95": 4.100000000005821
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.799999999988358,
        "emitP95": 19.70000000001164,
        "domP50": 10.199999999982538,
        "domP95": 20.60000000000582
      },
      "edit_d4": {
        "emitP50": 8.200000000011642,
        "emitP95": 16.20000000001164,
        "domP50": 9,
        "domP95": 17.29999999998836
      },
      "edit_d10": {
        "emitP50": 7.899999999994179,
        "emitP95": 17,
        "domP50": 8.39999999999418,
        "domP95": 19.5
      },
      "loadCycle": {
        "emitP50": 20.10000000000582,
        "emitP95": 49.10000000000582,
        "domP50": 20.70000000001164,
        "domP95": 49.40000000002328
      },
      "step": {
        "emitP50": 9.799999999988358,
        "emitP95": 18.699999999982538,
        "domP50": 10.10000000000582,
        "domP95": 19.60000000000582
      },
      "reset": {
        "emitP50": 16.400000000023283,
        "emitP95": 43.5,
        "domP50": 16.400000000023283,
        "domP95": 43.59999999997672
      },
      "append100": {
        "emitP50": 13.200000000011642,
        "emitP95": 25.29999999998836,
        "domP50": 13.60000000000582,
        "domP95": 25.79999999998836
      },
      "heapMb": 5.033359527587891,
      "pssTotalMb": 236.4169921875,
      "relaunchReadyMs": 1165.5999999999767,
      "relaunchHeapMb": 4.202659606933594
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.39999999999418,
          "emitP95": 19.60000000000582,
          "domP50": 9.800000000017462,
          "domP95": 20.60000000000582
        },
        "setKeys": {
          "emitP50": 17.5,
          "emitP95": 29.599999999976717,
          "domP50": 17.79999999998836,
          "domP95": 30.199999999982538
        },
        "replace": {
          "emitP50": 8.300000000017462,
          "emitP95": 29,
          "domP50": 9.199999999982538,
          "domP95": 29.39999999999418
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.100000000005821,
          "lagP95": 15,
          "endLag": 6.2000000000116415,
          "maxBacklog": 1
        },
        "heapMb": 4.613971710205078,
        "pssTotalMb": 233.921875,
        "fCommitP50": 2.8999999999941792,
        "fCommitP95": 4.5
      },
      "500": {
        "setKey": {
          "emitP50": 9.200000000011642,
          "emitP95": 24.300000000017462,
          "domP50": 10.10000000000582,
          "domP95": 26.300000000017462
        },
        "setKeys": {
          "emitP50": 17.70000000001164,
          "emitP95": 33.30000000001746,
          "domP50": 18,
          "domP95": 34
        },
        "replace": {
          "emitP50": 12.799999999988358,
          "emitP95": 25.70000000001164,
          "domP50": 13.5,
          "domP95": 26.10000000000582
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.2000000000116415,
          "lagP95": 15.700000000011642,
          "endLag": 13.5,
          "maxBacklog": 1
        },
        "heapMb": 5.057003021240234,
        "pssTotalMb": 232.2861328125,
        "fCommitP50": 2.900000000023283,
        "fCommitP95": 4
      },
      "5000": {
        "setKey": {
          "emitP50": 12.099999999976717,
          "emitP95": 37.09999999997672,
          "domP50": 12.89999999999418,
          "domP95": 37.69999999998254
        },
        "setKeys": {
          "emitP50": 15.800000000017462,
          "emitP95": 66.69999999998254,
          "domP50": 17.5,
          "domP95": 68.69999999998254
        },
        "replace": {
          "emitP50": 49.20000000001164,
          "emitP95": 67.79999999998836,
          "domP50": 49.80000000001746,
          "domP95": 68.39999999999418
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.899999999994179,
          "lagP95": 12.799999999988358,
          "endLag": 9.39999999999418,
          "maxBacklog": 2
        },
        "heapMb": 9.294918060302734,
        "pssTotalMb": 241.904296875,
        "fCommitP50": 3,
        "fCommitP95": 4.600000000005821
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 10.39999999999418,
        "emitP95": 21.5,
        "domP50": 10.89999999999418,
        "domP95": 21.89999999999418
      },
      "edit_d4": {
        "emitP50": 10.200000000011642,
        "emitP95": 20.300000000017462,
        "domP50": 10.700000000011642,
        "domP95": 20.70000000001164
      },
      "edit_d10": {
        "emitP50": 8,
        "emitP95": 18,
        "domP50": 8.699999999982538,
        "domP95": 21.29999999998836
      },
      "loadCycle": {
        "emitP50": 20,
        "emitP95": 50.80000000001746,
        "domP50": 20.300000000017462,
        "domP95": 51.30000000001746
      },
      "step": {
        "emitP50": 12.299999999988358,
        "emitP95": 23.300000000017462,
        "domP50": 12.5,
        "domP95": 24.39999999999418
      },
      "reset": {
        "emitP50": 15.299999999988358,
        "emitP95": 43.5,
        "domP50": 15.299999999988358,
        "domP95": 43.60000000000582
      },
      "append100": {
        "emitP50": 16.699999999982538,
        "emitP95": 25.70000000001164,
        "domP50": 17.099999999976717,
        "domP95": 27.10000000000582
      },
      "heapMb": 5.033378601074219,
      "pssTotalMb": 236.3818359375,
      "relaunchReadyMs": 1102.2000000000116,
      "relaunchHeapMb": 4.204872131347656
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.3999999999650754,
          "emitP95": 0.7999999999883585,
          "domP50": 1.8000000000465661,
          "domP95": 7.800000000046566
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.300000000046566,
          "domP50": 1.7999999999883585,
          "domP95": 14.600000000034925
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 6.300000000046566,
          "domP50": 2.6000000000349246,
          "domP95": 13.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 1.3000000000465661,
          "endLag": 0.29999999998835847,
          "maxBacklog": 0
        },
        "heapMb": 3.5627059936523438,
        "pssTotalMb": 219.158203125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.2000000000116415,
          "domP50": 5.7999999999883585,
          "domP95": 9.700000000011642
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.2999999999883585,
          "domP50": 4.7999999999883585,
          "domP95": 12.399999999965075
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 2.6000000000349246,
          "domP50": 1.099999999976717,
          "domP95": 7
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.5,
          "lagP95": 1,
          "endLag": 0.3999999999650754,
          "maxBacklog": 0
        },
        "heapMb": 4.166664123535156,
        "pssTotalMb": 225.076171875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.7000000000116415,
          "domP50": 6.899999999965075,
          "domP95": 7.800000000046566
        },
        "setKeys": {
          "emitP50": 1.8000000000465661,
          "emitP95": 11.799999999988358,
          "domP50": 3.400000000023283,
          "domP95": 18
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.2999999999883585,
          "domP50": 1.599999999976717,
          "domP95": 7.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999650754,
          "lagP95": 2.2999999999883585,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 7.835552215576172,
        "pssTotalMb": 228.400390625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.6000000000349246,
        "domP50": 6.099999999976717,
        "domP95": 15.599999999976717
      },
      "edit_d4": {
        "emitP50": 0.5,
        "emitP95": 3.8999999999650754,
        "domP50": 1.8000000000465661,
        "domP95": 10.799999999988358
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.400000000023283,
        "domP50": 6.599999999976717,
        "domP95": 18.79999999998836
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 38.399999999965075,
        "domP50": 0.7000000000116415,
        "domP95": 38.70000000001164
      },
      "step": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.8000000000465661,
        "domP50": 3.5,
        "domP95": 8.299999999988358
      },
      "reset": {
        "emitP50": 0.3999999999650754,
        "emitP95": 5.300000000046566,
        "domP50": 0.3999999999650754,
        "domP95": 5.400000000023283
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7999999999883585,
        "domP50": 1,
        "domP95": 4.400000000023283
      },
      "heapMb": 3.7761688232421875,
      "pssTotalMb": 221.2705078125,
      "relaunchReadyMs": 1399.5,
      "relaunchHeapMb": 3.3515281677246094
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.1000000000349246,
          "domP50": 3.2000000000116415,
          "domP95": 9
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.400000000023283,
          "domP50": 5.5,
          "domP95": 10.799999999988358
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 13.399999999965075,
          "domP50": 4.900000000023283,
          "domP95": 14
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.3999999999650754,
          "lagP95": 0.7000000000116415,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.5623703002929688,
        "pssTotalMb": 219.8173828125
      },
      "500": {
        "setKey": {
          "emitP50": 0.3999999999650754,
          "emitP95": 0.9000000000232831,
          "domP50": 5.599999999976717,
          "domP95": 7.100000000034925
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.900000000023283,
          "domP50": 1.5,
          "domP95": 9.099999999976717
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 1.7000000000116415,
          "domP50": 3.599999999976717,
          "domP95": 11.799999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 4.1675872802734375,
        "pssTotalMb": 225.5576171875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.6000000000349246,
          "domP50": 6.7000000000116415,
          "domP95": 8.200000000011642
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 3.2000000000116415,
          "domP50": 3.5,
          "domP95": 17.20000000001164
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.2000000000116415,
          "domP50": 2.900000000023283,
          "domP95": 33.20000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999650754,
          "lagP95": 1.7999999999883585,
          "endLag": 1.3999999999650754,
          "maxBacklog": 0
        },
        "heapMb": 7.9376678466796875,
        "pssTotalMb": 228.341796875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 6.600000000034925,
        "domP50": 2.099999999976717,
        "domP95": 7.300000000046566
      },
      "edit_d4": {
        "emitP50": 0.5,
        "emitP95": 1.6000000000349246,
        "domP50": 6.099999999976717,
        "domP95": 12.5
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.7999999999883585,
        "domP50": 1.2999999999883585,
        "domP95": 13
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 33.09999999997672,
        "domP50": 0.8999999999650754,
        "domP95": 33.59999999997672
      },
      "step": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.9000000000232831,
        "domP50": 1.1999999999534339,
        "domP95": 6.400000000023283
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 0.6000000000349246,
        "domP50": 0.20000000001164153,
        "domP95": 0.8000000000465661
      },
      "append100": {
        "emitP50": 0.5,
        "emitP95": 0.5999999999767169,
        "domP50": 1,
        "domP95": 5.7000000000116415
      },
      "heapMb": 3.9588241577148438,
      "pssTotalMb": 223.744140625,
      "relaunchReadyMs": 1886.9000000000233,
      "relaunchHeapMb": 3.2575340270996094
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.800000000046566,
          "emitP95": 23.5,
          "domP50": 8.300000000046566,
          "domP95": 23.900000000023283
        },
        "setKeys": {
          "emitP50": 14.29999999993015,
          "emitP95": 29.70000000006985,
          "domP50": 14.79999999993015,
          "domP95": 30.100000000093132
        },
        "replace": {
          "emitP50": 9,
          "emitP95": 22.900000000023283,
          "domP50": 10.29999999993015,
          "domP95": 23.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 13,
          "endLag": 8.800000000046566,
          "maxBacklog": 1
        },
        "heapMb": 4.614612579345703,
        "pssTotalMb": 233.736328125,
        "fCommitP50": 3.1000000000931323,
        "fCommitP95": 4.099999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 9.699999999953434,
          "emitP95": 17.399999999906868,
          "domP50": 10.100000000093132,
          "domP95": 18.099999999976717
        },
        "setKeys": {
          "emitP50": 14.800000000046566,
          "emitP95": 30.199999999953434,
          "domP50": 15.20000000006985,
          "domP95": 30.900000000023283
        },
        "replace": {
          "emitP50": 11.29999999993015,
          "emitP95": 23.70000000006985,
          "domP50": 11.699999999953434,
          "domP95": 23.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.100000000093132,
          "lagP95": 15.300000000046566,
          "endLag": 9.5,
          "maxBacklog": 1
        },
        "heapMb": 5.057270050048828,
        "pssTotalMb": 235.76953125,
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 4.699999999953434
      },
      "5000": {
        "setKey": {
          "emitP50": 14.099999999976717,
          "emitP95": 32.59999999997672,
          "domP50": 15.099999999976717,
          "domP95": 33.199999999953434
        },
        "setKeys": {
          "emitP50": 16.800000000046566,
          "emitP95": 88.90000000002328,
          "domP50": 17.400000000023283,
          "domP95": 89.5
        },
        "replace": {
          "emitP50": 47.40000000002328,
          "emitP95": 59.300000000046566,
          "domP50": 47.90000000002328,
          "domP95": 59.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.400000000023283,
          "lagP95": 19.199999999953434,
          "endLag": 5.5,
          "maxBacklog": 2
        },
        "heapMb": 9.293792724609375,
        "pssTotalMb": 241.376953125,
        "fCommitP50": 4.300000000046566,
        "fCommitP95": 6.800000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.400000000023283,
        "emitP95": 18.20000000006985,
        "domP50": 9.300000000046566,
        "domP95": 18.5
      },
      "edit_d4": {
        "emitP50": 8.5,
        "emitP95": 17.800000000046566,
        "domP50": 8.900000000023283,
        "domP95": 18.300000000046566
      },
      "edit_d10": {
        "emitP50": 8.800000000046566,
        "emitP95": 22.699999999953434,
        "domP50": 9.300000000046566,
        "domP95": 23.300000000046566
      },
      "loadCycle": {
        "emitP50": 17.79999999993015,
        "emitP95": 49,
        "domP50": 18.099999999976717,
        "domP95": 49.40000000002328
      },
      "step": {
        "emitP50": 8.29999999993015,
        "emitP95": 18.20000000006985,
        "domP50": 9.300000000046566,
        "domP95": 19.70000000006985
      },
      "reset": {
        "emitP50": 15.099999999976717,
        "emitP95": 30.29999999993015,
        "domP50": 15.099999999976717,
        "domP95": 30.399999999906868
      },
      "append100": {
        "emitP50": 15,
        "emitP95": 25.300000000046566,
        "domP50": 15.199999999953434,
        "domP95": 25.70000000006985
      },
      "heapMb": 5.022907257080078,
      "pssTotalMb": 236.013671875,
      "relaunchReadyMs": 1118.5999999999767,
      "relaunchHeapMb": 4.204307556152344
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8000000000465661,
          "domP50": 5.400000000023283,
          "domP95": 15.800000000046566
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.099999999976717,
          "domP50": 5.799999999930151,
          "domP95": 9.900000000023283
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.1999999999534339,
          "domP50": 2.300000000046566,
          "domP95": 15.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.39999999990686774,
          "lagP95": 0.5,
          "endLag": 0.9000000000232831,
          "maxBacklog": 0
        },
        "heapMb": 3.460205078125,
        "pssTotalMb": 221.990234375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 2.299999999930151,
          "domP50": 5.5,
          "domP95": 9.5
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1,
          "domP50": 1.2000000000698492,
          "domP95": 15.099999999976717
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.8000000000465661,
          "domP50": 1.099999999976717,
          "domP95": 11.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8000000000465661,
          "endLag": 0.5999999999767169,
          "maxBacklog": 0
        },
        "heapMb": 3.9734573364257812,
        "pssTotalMb": 226.3017578125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.2000000000698492,
          "emitP95": 1.8000000000465661,
          "domP50": 6.699999999953434,
          "domP95": 8.300000000046566
        },
        "setKeys": {
          "emitP50": 1.6000000000931323,
          "emitP95": 3.700000000069849,
          "domP50": 3.599999999976717,
          "domP95": 7.900000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 12.900000000023283,
          "domP50": 1.6999999999534339,
          "domP95": 13.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.599999999976717,
          "endLag": 1.6000000000931323,
          "maxBacklog": 0
        },
        "heapMb": 7.835475921630859,
        "pssTotalMb": 231.2138671875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.400000000023283,
        "domP50": 5.700000000069849,
        "domP95": 8.599999999976717
      },
      "edit_d4": {
        "emitP50": 0.5,
        "emitP95": 1.2000000000698492,
        "domP50": 1.599999999976717,
        "domP95": 8
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1,
        "domP50": 1.1999999999534339,
        "domP95": 10.699999999953434
      },
      "loadCycle": {
        "emitP50": 0.6000000000931323,
        "emitP95": 33.40000000002328,
        "domP50": 1.3000000000465661,
        "domP95": 33.79999999993015
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 2,
        "domP50": 6.099999999976717,
        "domP95": 11.800000000046566
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.9000000000232831,
        "domP50": 0.30000000004656613,
        "domP95": 1.5
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 4.099999999976717,
        "domP50": 1.099999999976717,
        "domP95": 6.800000000046566
      },
      "heapMb": 3.7761573791503906,
      "pssTotalMb": 224.0654296875,
      "relaunchReadyMs": 656.5,
      "relaunchHeapMb": 3.2575416564941406
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.400000000023283,
          "domP50": 6,
          "domP95": 9.699999999953434
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.400000000023283,
          "domP50": 1.1999999999534339,
          "domP95": 8.70000000006985
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.099999999976717,
          "domP50": 1.1999999999534339,
          "domP95": 6.700000000069849
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.6999999999534339,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.5627059936523438,
        "pssTotalMb": 222.3642578125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 2,
          "domP50": 5.400000000023283,
          "domP95": 9.699999999953434
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.5,
          "domP50": 1.2000000000698492,
          "domP95": 7.200000000069849
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.900000000023283,
          "domP50": 1,
          "domP95": 16.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1,
          "endLag": 1,
          "maxBacklog": 0
        },
        "heapMb": 3.9735336303710938,
        "pssTotalMb": 226.3037109375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1999999999534339,
          "emitP95": 2.1000000000931323,
          "domP50": 6.900000000023283,
          "domP95": 8.099999999976717
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 8.800000000046566,
          "domP50": 3.300000000046566,
          "domP95": 16.400000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7000000000698492,
          "domP50": 2,
          "domP95": 18.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.5,
          "endLag": 1.6000000000931323,
          "maxBacklog": 0
        },
        "heapMb": 7.937591552734375,
        "pssTotalMb": 229.9765625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2,
        "domP50": 2.6000000000931323,
        "domP95": 8.5
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 5.400000000023283,
        "domP95": 9.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.8000000000465661,
        "domP50": 4.200000000069849,
        "domP95": 6.5
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 33.09999999997672,
        "domP50": 0.5,
        "domP95": 33.40000000002328
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8999999999068677,
        "domP50": 5.400000000023283,
        "domP95": 13.29999999993015
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.7999999999301508,
        "domP50": 0.2000000000698492,
        "domP95": 1.5
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.5,
        "domP50": 0.9000000000232831,
        "domP95": 6.5
      },
      "heapMb": 3.7761306762695312,
      "pssTotalMb": 224.3125,
      "relaunchReadyMs": 748.2000000000698,
      "relaunchHeapMb": 3.3517532348632812
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.199999999953434,
          "emitP95": 25.79999999993015,
          "domP50": 8.800000000046566,
          "domP95": 27.599999999976717
        },
        "setKeys": {
          "emitP50": 16,
          "emitP95": 30.899999999906868,
          "domP50": 16.400000000023283,
          "domP95": 31.5
        },
        "replace": {
          "emitP50": 9.5,
          "emitP95": 25.099999999976717,
          "domP50": 10.5,
          "domP95": 25.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.100000000093132,
          "lagP95": 14.900000000023283,
          "endLag": 9.5,
          "maxBacklog": 1
        },
        "heapMb": 4.614654541015625,
        "pssTotalMb": 238.16015625,
        "fCommitP50": 2.900000000023283,
        "fCommitP95": 4.5
      },
      "500": {
        "setKey": {
          "emitP50": 11.599999999976717,
          "emitP95": 23.599999999976717,
          "domP50": 12.400000000023283,
          "domP95": 24.099999999976717
        },
        "setKeys": {
          "emitP50": 16.099999999976717,
          "emitP95": 33.199999999953434,
          "domP50": 16.5,
          "domP95": 33.5
        },
        "replace": {
          "emitP50": 12.5,
          "emitP95": 30.300000000046566,
          "domP50": 13,
          "domP95": 30.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.400000000023283,
          "lagP95": 14.5,
          "endLag": 5.700000000069849,
          "maxBacklog": 1
        },
        "heapMb": 5.057193756103516,
        "pssTotalMb": 239.0390625,
        "fCommitP50": 2.900000000023283,
        "fCommitP95": 3.900000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 12.699999999953434,
          "emitP95": 29.900000000023283,
          "domP50": 13.5,
          "domP95": 30.300000000046566
        },
        "setKeys": {
          "emitP50": 16.399999999906868,
          "emitP95": 82.60000000009313,
          "domP50": 17.099999999976717,
          "domP95": 83.10000000009313
        },
        "replace": {
          "emitP50": 49.300000000046566,
          "emitP95": 56.90000000002328,
          "domP50": 50.300000000046566,
          "domP95": 57.90000000002328
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.599999999976717,
          "lagP95": 19.29999999993015,
          "endLag": 8.199999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.294288635253906,
        "pssTotalMb": 245.197265625,
        "fCommitP50": 3,
        "fCommitP95": 4
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.5,
        "emitP95": 19.300000000046566,
        "domP50": 8.300000000046566,
        "domP95": 21
      },
      "edit_d4": {
        "emitP50": 8.599999999976717,
        "emitP95": 18.599999999976717,
        "domP50": 9.199999999953434,
        "domP95": 19
      },
      "edit_d10": {
        "emitP50": 7.700000000069849,
        "emitP95": 17.5,
        "domP50": 8.20000000006985,
        "domP95": 18.099999999976717
      },
      "loadCycle": {
        "emitP50": 22.599999999976717,
        "emitP95": 53.300000000046566,
        "domP50": 23,
        "domP95": 53.70000000006985
      },
      "step": {
        "emitP50": 11,
        "emitP95": 25.20000000006985,
        "domP50": 11.400000000023283,
        "domP95": 26
      },
      "reset": {
        "emitP50": 25.699999999953434,
        "emitP95": 41.10000000009313,
        "domP50": 25.699999999953434,
        "domP95": 41.20000000006985
      },
      "append100": {
        "emitP50": 22.899999999906868,
        "emitP95": 31.699999999953434,
        "domP50": 23.5,
        "domP95": 32.199999999953434
      },
      "heapMb": 5.026611328125,
      "pssTotalMb": 239.3232421875,
      "relaunchReadyMs": 462.0999999999767,
      "relaunchHeapMb": 4.255809783935547
    }
  }
]
```
</details>
