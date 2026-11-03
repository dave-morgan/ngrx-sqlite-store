# Phase 16 baseline — flat objects & hybrid workflow (2026-10-25)

**PRELIMINARY.** Measured on `emulator-5554` in parallel with phase 15 work, on a shared host (6 cores). Trials wait for phase 15 device runners to be idle, but other host load such as Codex builds can still perturb absolute numbers. Relative verdicts come from alternating classic/sqlite trials. The library is at the phase 15c state; phase 16 optimisations have not been applied.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.01 ms, p95 4.17 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND: latency excess ≤ classic SD + F_commit × commits + sqlite SD.
  - FAIL: everything else. Memory has no platform control yet.

**Acceptance (preliminary):** PASS 1 / PLATFORM-BOUND 1 / FAIL 84

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.42 ± 0.04 | 9.14 ± 0.89 | 21.8× | FAIL | allow 3.9 (F_commit×1) |
| flat | 50.setKey.emitP95 | 2.90 ± 1.85 | 22.34 ± 4.60 | 7.7× | FAIL | allow 10.6 (F_commit×1) |
| flat | 50.setKey.domP50 | 3.22 ± 1.99 | 9.90 ± 0.77 | 3.1× | FAIL | allow 5.8 (F_commit×1) |
| flat | 50.setKey.domP95 | 9.08 ± 1.29 | 23.26 ± 4.14 | 2.6× | FAIL | allow 9.6 (F_commit×1) |
| flat | 50.setKeys.emitP50 | 0.38 ± 0.04 | 76.28 ± 4.44 | 200.7× | FAIL | allow 7.5 (F_commit×1) |
| flat | 50.setKeys.emitP95 | 3.20 ± 3.40 | 107.90 ± 27.14 | 33.7× | FAIL | allow 34.7 (F_commit×1) |
| flat | 50.setKeys.domP50 | 2.20 ± 1.70 | 76.74 ± 4.52 | 34.9× | FAIL | allow 9.2 (F_commit×1) |
| flat | 50.setKeys.domP95 | 10.10 ± 2.94 | 108.42 ± 27.04 | 10.7× | FAIL | allow 34.2 (F_commit×1) |
| flat | 50.replace.emitP50 | 0.36 ± 0.05 | 9.26 ± 1.15 | 25.7× | FAIL | allow 4.2 (F_commit×1) |
| flat | 50.replace.emitP95 | 1.88 ± 1.40 | 82.22 ± 1.80 | 43.7× | FAIL | allow 7.4 (F_commit×1) |
| flat | 50.replace.domP50 | 2.08 ± 1.30 | 9.72 ± 1.16 | 4.7× | FAIL | allow 5.5 (F_commit×1) |
| flat | 50.replace.domP95 | 11.72 ± 3.29 | 82.62 ± 1.84 | 7.0× | FAIL | allow 9.3 (F_commit×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 6.68 ± 0.61 | 22.3× | FAIL | allow 3.6 (F_commit×1) |
| flat | 50.burst.lagP95 | 0.72 ± 0.16 | 16.72 ± 5.23 | 23.2× | FAIL | allow 9.6 (F_commit×1) |
| flat | 50.burst.endLag | 0.28 ± 0.04 | 7.98 ± 3.32 | 28.5× | FAIL | allow 6.4 (F_commit×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 50.heapMb | 3.64 ± 0.10 | 4.60 ± 0.00 | 1.3× | FAIL |  |
| flat | 50.pssTotalMb | 220.34 ± 1.20 | 232.91 ± 0.65 | 1.1× | FAIL |  |
| flat | 500.setKey.emitP50 | 0.54 ± 0.05 | 9.54 ± 1.23 | 17.7× | FAIL | allow 4.3 (F_commit×1) |
| flat | 500.setKey.emitP95 | 5.30 ± 4.25 | 25.56 ± 3.47 | 4.8× | FAIL | allow 11.9 (F_commit×1) |
| flat | 500.setKey.domP50 | 5.30 ± 1.91 | 10.30 ± 1.37 | 1.9× | PLATFORM-BOUND | allow 6.3 (F_commit×1) |
| flat | 500.setKey.domP95 | 10.98 ± 2.12 | 26.54 ± 2.71 | 2.4× | FAIL | allow 9.0 (F_commit×1) |
| flat | 500.setKeys.emitP50 | 0.52 ± 0.04 | 74.26 ± 1.16 | 142.8× | FAIL | allow 4.2 (F_commit×1) |
| flat | 500.setKeys.emitP95 | 3.62 ± 5.07 | 90.06 ± 5.55 | 24.9× | FAIL | allow 14.8 (F_commit×1) |
| flat | 500.setKeys.domP50 | 3.42 ± 2.11 | 74.68 ± 1.16 | 21.8× | FAIL | allow 6.3 (F_commit×1) |
| flat | 500.setKeys.domP95 | 12.08 ± 3.78 | 90.82 ± 5.72 | 7.5× | FAIL | allow 13.7 (F_commit×1) |
| flat | 500.replace.emitP50 | 0.38 ± 0.04 | 46.08 ± 2.48 | 121.3× | FAIL | allow 5.5 (F_commit×1) |
| flat | 500.replace.emitP95 | 3.18 ± 4.54 | 120.56 ± 9.97 | 37.9× | FAIL | allow 18.7 (F_commit×1) |
| flat | 500.replace.domP50 | 2.18 ± 1.96 | 47.04 ± 1.44 | 21.6× | FAIL | allow 6.4 (F_commit×1) |
| flat | 500.replace.domP95 | 9.98 ± 3.83 | 121.02 ± 9.85 | 12.1× | FAIL | allow 17.8 (F_commit×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 7.20 ± 0.73 | 18.0× | FAIL | allow 3.7 (F_commit×1) |
| flat | 500.burst.lagP95 | 0.98 ± 0.25 | 22.24 ± 6.44 | 22.7× | FAIL | allow 10.9 (F_commit×1) |
| flat | 500.burst.endLag | 0.60 ± 0.33 | 8.16 ± 3.28 | 13.6× | FAIL | allow 6.6 (F_commit×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.60 ± 0.55 | 2600000000.0× | FAIL |  |
| flat | 500.heapMb | 3.93 ± 0.06 | 5.05 ± 0.00 | 1.3× | FAIL |  |
| flat | 500.pssTotalMb | 223.96 ± 0.38 | 234.73 ± 1.19 | 1.0× | FAIL |  |
| flat | 5000.setKey.emitP50 | 1.34 ± 0.33 | 12.80 ± 0.99 | 9.6× | FAIL | allow 4.3 (F_commit×1) |
| flat | 5000.setKey.emitP95 | 3.02 ± 2.01 | 27.86 ± 3.05 | 9.2× | FAIL | allow 9.2 (F_commit×1) |
| flat | 5000.setKey.domP50 | 6.18 ± 0.92 | 13.44 ± 1.13 | 2.2× | FAIL | allow 5.1 (F_commit×1) |
| flat | 5000.setKey.domP95 | 11.12 ± 3.78 | 29.72 ± 2.66 | 2.7× | FAIL | allow 10.6 (F_commit×1) |
| flat | 5000.setKeys.emitP50 | 1.54 ± 0.05 | 82.90 ± 0.74 | 53.8× | FAIL | allow 3.8 (F_commit×1) |
| flat | 5000.setKeys.emitP95 | 8.78 ± 3.32 | 161.40 ± 15.55 | 18.4× | FAIL | allow 23.0 (F_commit×1) |
| flat | 5000.setKeys.domP50 | 3.64 ± 0.52 | 83.72 ± 0.76 | 23.0× | FAIL | allow 4.3 (F_commit×1) |
| flat | 5000.setKeys.domP95 | 13.36 ± 3.80 | 161.90 ± 15.50 | 12.1× | FAIL | allow 23.5 (F_commit×1) |
| flat | 5000.replace.emitP50 | 0.38 ± 0.04 | 344.76 ± 3.05 | 907.3× | FAIL | allow 6.1 (F_commit×1) |
| flat | 5000.replace.emitP95 | 4.48 ± 3.91 | 502.64 ± 10.37 | 112.2× | FAIL | allow 18.4 (F_commit×1) |
| flat | 5000.replace.domP50 | 2.24 ± 0.48 | 345.24 ± 2.99 | 154.1× | FAIL | allow 6.5 (F_commit×1) |
| flat | 5000.replace.domP95 | 11.70 ± 4.03 | 503.18 ± 10.24 | 43.0× | FAIL | allow 18.4 (F_commit×1) |
| flat | 5000.burst.lagP50 | 1.34 ± 0.05 | 8.38 ± 0.92 | 6.3× | FAIL | allow 4.0 (F_commit×1) |
| flat | 5000.burst.lagP95 | 2.62 ± 1.46 | 16.26 ± 3.65 | 6.2× | FAIL | allow 9.3 (F_commit×1) |
| flat | 5000.burst.endLag | 1.36 ± 0.17 | 10.44 ± 3.45 | 7.7× | FAIL | allow 6.6 (F_commit×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 1.00 ± 0.00 | 1000000000.0× | FAIL |  |
| flat | 5000.heapMb | 7.98 ± 0.09 | 9.35 ± 0.00 | 1.2× | FAIL |  |
| flat | 5000.pssTotalMb | 228.97 ± 1.09 | 240.87 ± 2.35 | 1.1× | FAIL |  |
| workflow | edit_d1.emitP50 | 0.48 ± 0.04 | 10.24 ± 1.46 | 21.3× | FAIL | allow 4.5 (F_commit×1) |
| workflow | edit_d1.emitP95 | 2.30 ± 0.82 | 20.86 ± 0.92 | 9.1× | FAIL | allow 5.9 (F_commit×1) |
| workflow | edit_d1.domP50 | 3.82 ± 1.72 | 10.78 ± 1.42 | 2.8× | FAIL | allow 6.1 (F_commit×1) |
| workflow | edit_d1.domP95 | 10.22 ± 1.42 | 21.34 ± 0.93 | 2.1× | FAIL | allow 6.5 (F_commit×1) |
| workflow | edit_d4.emitP50 | 0.42 ± 0.04 | 10.66 ± 1.69 | 25.4× | FAIL | allow 4.7 (F_commit×1) |
| workflow | edit_d4.emitP95 | 1.26 ± 0.63 | 18.42 ± 1.86 | 14.6× | FAIL | allow 6.7 (F_commit×1) |
| workflow | edit_d4.domP50 | 2.40 ± 1.43 | 11.32 ± 1.65 | 4.7× | FAIL | allow 6.1 (F_commit×1) |
| workflow | edit_d4.domP95 | 10.32 ± 2.15 | 19.44 ± 1.54 | 1.9× | FAIL | allow 7.9 (F_commit×1) |
| workflow | edit_d10.emitP50 | 0.42 ± 0.04 | 8.68 ± 1.28 | 20.7× | FAIL | allow 4.3 (F_commit×1) |
| workflow | edit_d10.emitP95 | 1.72 ± 0.83 | 21.32 ± 3.91 | 12.4× | FAIL | allow 8.9 (F_commit×1) |
| workflow | edit_d10.domP50 | 3.20 ± 1.51 | 9.48 ± 1.38 | 3.0× | FAIL | allow 5.9 (F_commit×1) |
| workflow | edit_d10.domP95 | 9.02 ± 1.60 | 22.32 ± 3.64 | 2.5× | FAIL | allow 9.4 (F_commit×1) |
| workflow | loadCycle.emitP50 | 3.48 ± 6.44 | 31.40 ± 2.24 | 9.0× | FAIL | allow 14.7 (F_commit×2) |
| workflow | loadCycle.emitP95 | 36.10 ± 4.09 | 74.92 ± 0.78 | 2.1× | FAIL | allow 13.2 (F_commit×2) |
| workflow | loadCycle.domP50 | 5.20 ± 6.15 | 31.78 ± 2.26 | 6.1× | FAIL | allow 14.4 (F_commit×2) |
| workflow | loadCycle.domP95 | 36.50 ± 4.14 | 75.38 ± 0.82 | 2.1× | FAIL | allow 13.3 (F_commit×2) |
| workflow | step.emitP50 | 0.34 ± 0.05 | 8.50 ± 0.62 | 25.0× | FAIL | allow 3.7 (F_commit×1) |
| workflow | step.emitP95 | 1.84 ± 0.79 | 25.18 ± 5.06 | 13.7× | FAIL | allow 10.0 (F_commit×1) |
| workflow | step.domP50 | 2.64 ± 1.67 | 8.98 ± 0.63 | 3.4× | FAIL | allow 5.3 (F_commit×1) |
| workflow | step.domP95 | 9.48 ± 1.48 | 25.74 ± 4.75 | 2.7× | FAIL | allow 10.4 (F_commit×1) |
| workflow | reset.emitP50 | 0.24 ± 0.05 | 15.60 ± 2.44 | 65.0× | FAIL | allow 5.5 (F_commit×1) |
| workflow | reset.emitP95 | 0.52 ± 0.15 | 32.76 ± 13.30 | 63.0× | FAIL | allow 17.6 (F_commit×1) |
| workflow | reset.domP50 | 0.24 ± 0.05 | 15.68 ± 2.43 | 65.3× | FAIL | allow 5.5 (F_commit×1) |
| workflow | reset.domP95 | 3.48 ± 2.86 | 32.86 ± 13.31 | 9.4× | FAIL | allow 20.3 (F_commit×1) |
| workflow | append100.emitP50 | 0.48 ± 0.16 | 15.60 ± 2.12 | 32.5× | FAIL | allow 5.3 (F_commit×1) |
| workflow | append100.emitP95 | 2.52 ± 3.06 | 27.68 ± 5.10 | 11.0× | FAIL | allow 12.3 (F_commit×1) |
| workflow | append100.domP50 | 1.16 ± 0.18 | 16.52 ± 2.05 | 14.2× | FAIL | allow 5.2 (F_commit×1) |
| workflow | append100.domP95 | 8.62 ± 4.30 | 28.46 ± 5.44 | 3.3× | FAIL | allow 13.9 (F_commit×1) |
| workflow | heapMb | 3.78 ± 0.00 | 5.01 ± 0.00 | 1.3× | FAIL |  |
| workflow | pssTotalMb | 222.18 ± 0.11 | 237.83 ± 1.19 | 1.1× | FAIL |  |
| workflow | relaunchReadyMs | 1135.32 ± 424.73 | 741.44 ± 422.30 | 0.7× | PASS |  |
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
          "emitP50": 0.5,
          "emitP95": 2.6999999999970896,
          "domP50": 5,
          "domP95": 9.900000000008731
        },
        "setKeys": {
          "emitP50": 0.40000000000873115,
          "emitP95": 2.599999999991269,
          "domP50": 1.3000000000029104,
          "domP95": 6.7999999999883585
        },
        "replace": {
          "emitP50": 0.3000000000029104,
          "emitP95": 0.8000000000029104,
          "domP50": 1.3000000000029104,
          "domP95": 9.10000000000582
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.3000000000029104,
          "lagP95": 0.5,
          "endLag": 0.3000000000029104,
          "maxBacklog": 0
        },
        "heapMb": 3.74798583984375,
        "pssTotalMb": 219.1787109375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 3.8999999999941792,
          "domP50": 6.899999999994179,
          "domP95": 12.69999999999709
        },
        "setKeys": {
          "emitP50": 0.6000000000058208,
          "emitP95": 12.599999999991269,
          "domP50": 5.80000000000291,
          "domP95": 15.30000000000291
        },
        "replace": {
          "emitP50": 0.40000000000873115,
          "emitP95": 1.2999999999883585,
          "domP50": 1.3999999999941792,
          "domP95": 7.399999999994179
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.39999999999417923,
          "lagP95": 0.8000000000029104,
          "endLag": 0.3000000000029104,
          "maxBacklog": 0
        },
        "heapMb": 3.9736175537109375,
        "pssTotalMb": 224.27734375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6999999999970896,
          "emitP95": 6.399999999994179,
          "domP50": 5,
          "domP95": 17.10000000000582
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 6.80000000000291,
          "domP50": 4.099999999991269,
          "domP95": 15.10000000000582
        },
        "replace": {
          "emitP50": 0.40000000000873115,
          "emitP95": 9.39999999999418,
          "domP50": 2.900000000008731,
          "domP95": 10.799999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999941792,
          "lagP95": 2.2999999999883585,
          "endLag": 1.5,
          "maxBacklog": 0
        },
        "heapMb": 7.9355010986328125,
        "pssTotalMb": 228.7900390625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.39999999999417923,
        "emitP95": 2.7999999999883585,
        "domP50": 2.5,
        "domP95": 10.700000000011642
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000174623,
        "domP50": 1.5,
        "domP95": 12.800000000017462
      },
      "edit_d10": {
        "emitP50": 0.39999999999417923,
        "emitP95": 0.6000000000058208,
        "domP50": 1.2999999999883585,
        "domP95": 8.10000000000582
      },
      "loadCycle": {
        "emitP50": 0.8999999999941792,
        "emitP95": 35.5,
        "domP50": 6.800000000017462,
        "domP95": 35.80000000001746
      },
      "step": {
        "emitP50": 0.3000000000174623,
        "emitP95": 2.7000000000116415,
        "domP50": 1.1000000000058208,
        "domP95": 7.300000000017462
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 0.7000000000116415,
        "domP50": 0.20000000001164153,
        "domP95": 6.7000000000116415
      },
      "append100": {
        "emitP50": 0.39999999999417923,
        "emitP95": 0.6000000000058208,
        "domP50": 0.8999999999941792,
        "domP95": 6
      },
      "heapMb": 3.7761192321777344,
      "pssTotalMb": 222.0126953125,
      "relaunchReadyMs": 1366.0999999999767,
      "relaunchHeapMb": 3.257579803466797
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10.699999999982538,
          "emitP95": 19.70000000001164,
          "domP50": 11,
          "domP95": 20.20000000001164
        },
        "setKeys": {
          "emitP50": 74.5,
          "emitP95": 98.60000000000582,
          "domP50": 74.89999999999418,
          "domP95": 99
        },
        "replace": {
          "emitP50": 9.800000000017462,
          "emitP95": 81.80000000001746,
          "domP50": 10.300000000017462,
          "domP95": 82.39999999999418
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.7999999999883585,
          "lagP95": 11.699999999982538,
          "endLag": 6,
          "maxBacklog": 2
        },
        "heapMb": 4.601585388183594,
        "pssTotalMb": 232.9736328125,
        "fCommitP50": 3.7999999999883585,
        "fCommitP95": 4.7999999999883585
      },
      "500": {
        "setKey": {
          "emitP50": 9,
          "emitP95": 26.39999999999418,
          "domP50": 10,
          "domP95": 27.60000000000582
        },
        "setKeys": {
          "emitP50": 75.89999999999418,
          "emitP95": 86.89999999999418,
          "domP50": 76.29999999998836,
          "domP95": 87.39999999999418
        },
        "replace": {
          "emitP50": 47.19999999998254,
          "emitP95": 137.70000000001164,
          "domP50": 47.69999999998254,
          "domP95": 138
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.2000000000116415,
          "lagP95": 28.29999999998836,
          "endLag": 5.899999999994179,
          "maxBacklog": 3
        },
        "heapMb": 5.04644775390625,
        "pssTotalMb": 234.6298828125,
        "fCommitP50": 2.8999999999941792,
        "fCommitP95": 4.400000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 13.300000000017462,
          "emitP95": 29.10000000000582,
          "domP50": 14.200000000011642,
          "domP95": 31.29999999998836
        },
        "setKeys": {
          "emitP50": 83.70000000001164,
          "emitP95": 172.89999999999418,
          "domP50": 84.39999999999418,
          "domP95": 173.39999999999418
        },
        "replace": {
          "emitP50": 348.4000000000233,
          "emitP95": 517.7999999999884,
          "domP50": 348.80000000001746,
          "domP95": 518.1999999999825
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.900000000023283,
          "lagP95": 18.900000000023283,
          "endLag": 6.100000000005821,
          "maxBacklog": 1
        },
        "heapMb": 9.356292724609375,
        "pssTotalMb": 241.06640625,
        "fCommitP50": 2.7999999999883585,
        "fCommitP95": 4
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.800000000017462,
        "emitP95": 20,
        "domP50": 9.200000000011642,
        "domP95": 20.5
      },
      "edit_d4": {
        "emitP50": 9.700000000011642,
        "emitP95": 20,
        "domP50": 10.39999999999418,
        "domP95": 20.39999999999418
      },
      "edit_d10": {
        "emitP50": 7.399999999994179,
        "emitP95": 26.5,
        "domP50": 8.10000000000582,
        "domP95": 26.89999999999418
      },
      "loadCycle": {
        "emitP50": 31,
        "emitP95": 74.79999999998836,
        "domP50": 31.89999999999418,
        "domP95": 75.29999999998836
      },
      "step": {
        "emitP50": 8.300000000017462,
        "emitP95": 29.10000000000582,
        "domP50": 9.5,
        "domP95": 29.5
      },
      "reset": {
        "emitP50": 14.89999999999418,
        "emitP95": 29.900000000023283,
        "domP50": 15,
        "domP95": 30.10000000000582
      },
      "append100": {
        "emitP50": 14.10000000000582,
        "emitP95": 27.10000000000582,
        "domP50": 14.39999999999418,
        "domP95": 27.60000000000582
      },
      "heapMb": 5.013130187988281,
      "pssTotalMb": 237.533203125,
      "relaunchReadyMs": 413.8999999999942,
      "relaunchHeapMb": 4.137561798095703
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.5,
          "emitP95": 22.5,
          "domP50": 9,
          "domP95": 23.10000000000582
        },
        "setKeys": {
          "emitP50": 70.69999999998254,
          "emitP95": 93.80000000001746,
          "domP50": 71.09999999997672,
          "domP95": 94.39999999999418
        },
        "replace": {
          "emitP50": 7.800000000017462,
          "emitP95": 80.69999999998254,
          "domP50": 8.299999999988358,
          "domP95": 80.89999999999418
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.099999999976717,
          "lagP95": 12.39999999999418,
          "endLag": 5.800000000017462,
          "maxBacklog": 2
        },
        "heapMb": 4.601890563964844,
        "pssTotalMb": 232.80078125,
        "fCommitP50": 2.7999999999883585,
        "fCommitP95": 4.300000000017462
      },
      "500": {
        "setKey": {
          "emitP50": 8.799999999988358,
          "emitP95": 26.29999999998836,
          "domP50": 9.300000000017462,
          "domP95": 26.79999999998836
        },
        "setKeys": {
          "emitP50": 74.70000000001164,
          "emitP95": 87.10000000000582,
          "domP50": 75.10000000000582,
          "domP95": 87.80000000001746
        },
        "replace": {
          "emitP50": 45.60000000000582,
          "emitP95": 113.59999999997672,
          "domP50": 45.89999999999418,
          "domP95": 114.39999999999418
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.2999999999883585,
          "lagP95": 13.799999999988358,
          "endLag": 5.100000000005821,
          "maxBacklog": 2
        },
        "heapMb": 5.047088623046875,
        "pssTotalMb": 234.30078125,
        "fCommitP50": 3.3000000000174623,
        "fCommitP95": 3.8999999999941792
      },
      "5000": {
        "setKey": {
          "emitP50": 11.200000000011642,
          "emitP95": 24.29999999998836,
          "domP50": 11.60000000000582,
          "domP95": 25.099999999976717
        },
        "setKeys": {
          "emitP50": 81.69999999998254,
          "emitP95": 162.10000000000582,
          "domP50": 82.70000000001164,
          "domP95": 162.60000000000582
        },
        "replace": {
          "emitP50": 344,
          "emitP95": 503.5,
          "domP50": 344.6000000000058,
          "domP95": 503.9000000000233
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.900000000023283,
          "lagP95": 10.599999999976717,
          "endLag": 9.5,
          "maxBacklog": 1
        },
        "heapMb": 9.354690551757812,
        "pssTotalMb": 241.0859375,
        "fCommitP50": 2.7999999999883585,
        "fCommitP95": 4.2000000000116415
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 11.900000000023283,
        "emitP95": 20.20000000001164,
        "domP50": 12.400000000023283,
        "domP95": 20.79999999998836
      },
      "edit_d4": {
        "emitP50": 11.200000000011642,
        "emitP95": 17.79999999998836,
        "domP50": 11.700000000011642,
        "domP95": 18.300000000046566
      },
      "edit_d10": {
        "emitP50": 9.5,
        "emitP95": 23.899999999965075,
        "domP50": 10,
        "domP95": 24.800000000046566
      },
      "loadCycle": {
        "emitP50": 30.79999999998836,
        "emitP95": 74.69999999995343,
        "domP50": 30.899999999965075,
        "domP95": 75.09999999997672
      },
      "step": {
        "emitP50": 7.699999999953434,
        "emitP95": 27,
        "domP50": 8.099999999976717,
        "domP95": 27.20000000001164
      },
      "reset": {
        "emitP50": 17,
        "emitP95": 23.099999999976717,
        "domP50": 17,
        "domP95": 23.199999999953434
      },
      "append100": {
        "emitP50": 13.400000000023283,
        "emitP95": 26.400000000023283,
        "domP50": 14.400000000023283,
        "domP95": 27.70000000001164
      },
      "heapMb": 5.009189605712891,
      "pssTotalMb": 237.4794921875,
      "relaunchReadyMs": 1144.5999999999767,
      "relaunchHeapMb": 4.198619842529297
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 5.5,
          "domP50": 1.2999999999883585,
          "domP95": 8.799999999988358
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 9.100000000034925,
          "domP50": 1.2000000000116415,
          "domP95": 14.5
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 1.099999999976717,
          "domP50": 1.5,
          "domP95": 15.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.8999999999650754,
          "endLag": 0.20000000001164153,
          "maxBacklog": 0
        },
        "heapMb": 3.5626602172851562,
        "pssTotalMb": 220.140625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 7.099999999976717,
          "domP50": 5.600000000034925,
          "domP95": 10.899999999965075
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 0.9000000000232831,
          "domP50": 5.2000000000116415,
          "domP95": 6.600000000034925
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 11.300000000046566,
          "domP50": 1.1000000000349246,
          "domP95": 15.600000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.3999999999650754,
          "lagP95": 1.400000000023283,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.8715362548828125,
        "pssTotalMb": 224.046875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.5,
          "domP50": 6.7000000000116415,
          "domP95": 8.099999999976717
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 14.200000000011642,
          "domP50": 3.8999999999650754,
          "domP95": 15.300000000046566
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 8,
          "domP50": 2.2000000000116415,
          "domP95": 9.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999650754,
          "lagP95": 5.199999999953434,
          "endLag": 1.5,
          "maxBacklog": 0
        },
        "heapMb": 7.937705993652344,
        "pssTotalMb": 228.7763671875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.7000000000116415,
        "domP50": 3.7000000000116415,
        "domP95": 8.099999999976717
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7000000000116415,
        "domP50": 2.2000000000116415,
        "domP95": 10.599999999976717
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.6000000000349246,
        "domP50": 2.5,
        "domP95": 7.7999999999883585
      },
      "loadCycle": {
        "emitP50": 15,
        "emitP95": 32.5,
        "domP50": 15.300000000046566,
        "domP95": 32.79999999998836
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 5.399999999965075,
        "domP95": 9.099999999976717
      },
      "reset": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.5999999999767169,
        "domP50": 0.29999999998835847,
        "domP95": 6.5
      },
      "append100": {
        "emitP50": 0.5999999999767169,
        "emitP95": 7.899999999965075,
        "domP50": 1.3999999999650754,
        "domP95": 15.899999999965075
      },
      "heapMb": 3.776073455810547,
      "pssTotalMb": 222.2158203125,
      "relaunchReadyMs": 1534.7999999999884,
      "relaunchHeapMb": 3.2575645446777344
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 2.2000000000116415,
          "domP95": 7.2000000000116415
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5999999999767169,
          "domP50": 5.2000000000116415,
          "domP95": 8.099999999976717
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 0.7999999999883585,
          "domP50": 1.6999999999534339,
          "domP95": 14.299999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.8000000000465661,
          "endLag": 0.29999999998835847,
          "maxBacklog": 0
        },
        "heapMb": 3.5626296997070312,
        "pssTotalMb": 219.9833984375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 11.800000000046566,
          "domP50": 5.900000000023283,
          "domP95": 12.300000000046566
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.6000000000349246,
          "domP50": 3.5,
          "domP95": 15.799999999988358
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.9000000000232831,
          "domP50": 2,
          "domP95": 6.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7999999999883585,
          "endLag": 0.6000000000349246,
          "maxBacklog": 0
        },
        "heapMb": 3.9734573364257812,
        "pssTotalMb": 224.2392578125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.7000000000116415,
          "emitP95": 3.2999999999883585,
          "domP50": 5.400000000023283,
          "domP95": 12.599999999976717
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 5.5,
          "domP50": 4,
          "domP95": 9.200000000011642
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 1.900000000023283,
          "domP95": 8.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999883585,
          "lagP95": 1.7000000000116415,
          "endLag": 1.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 8.130847930908203,
        "pssTotalMb": 230.8515625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.1999999999534339,
        "domP50": 5.600000000034925,
        "domP95": 11.299999999988358
      },
      "edit_d4": {
        "emitP50": 0.3999999999650754,
        "emitP95": 1,
        "domP50": 1.5,
        "domP95": 11.899999999965075
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.2000000000116415,
        "domP50": 5.099999999976717,
        "domP95": 8.700000000011642
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 43.09999999997672,
        "domP50": 2.1000000000349246,
        "domP95": 43.59999999997672
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.2999999999883585,
        "domP50": 2.5,
        "domP95": 10.199999999953434
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 0.5,
        "domP50": 0.20000000001164153,
        "domP95": 1.400000000023283
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.5999999999767169,
        "domP50": 1.2000000000116415,
        "domP95": 5.7000000000116415
      },
      "heapMb": 3.7761497497558594,
      "pssTotalMb": 222.3125,
      "relaunchReadyMs": 671.7999999999884,
      "relaunchHeapMb": 3.3515167236328125
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9,
          "emitP95": 16.400000000023283,
          "domP50": 9.599999999976717,
          "domP95": 18.5
        },
        "setKeys": {
          "emitP50": 74.79999999998836,
          "emitP95": 88.29999999998836,
          "domP50": 75.29999999998836,
          "domP95": 89.09999999997672
        },
        "replace": {
          "emitP50": 10.5,
          "emitP95": 80.70000000001164,
          "domP50": 11,
          "domP95": 81.20000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 18.099999999976717,
          "endLag": 7,
          "maxBacklog": 2
        },
        "heapMb": 4.6015167236328125,
        "pssTotalMb": 232.640625,
        "fCommitP50": 2.8999999999650754,
        "fCommitP95": 4.100000000034925
      },
      "500": {
        "setKey": {
          "emitP50": 9.400000000023283,
          "emitP95": 20.099999999976717,
          "domP50": 9.900000000023283,
          "domP95": 22.600000000034925
        },
        "setKeys": {
          "emitP50": 73.30000000004657,
          "emitP95": 85.70000000001164,
          "domP50": 73.60000000003492,
          "domP95": 86.5
        },
        "replace": {
          "emitP50": 47.300000000046566,
          "emitP95": 115.69999999995343,
          "domP50": 47.70000000001164,
          "domP95": 116
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.199999999953434,
          "lagP95": 18.20000000001164,
          "endLag": 6.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.046195983886719,
        "pssTotalMb": 234.1240234375,
        "fCommitP50": 3,
        "fCommitP95": 4.699999999953434
      },
      "5000": {
        "setKey": {
          "emitP50": 12.5,
          "emitP95": 25,
          "domP50": 13.099999999976717,
          "domP95": 30.399999999965075
        },
        "setKeys": {
          "emitP50": 83.20000000001164,
          "emitP95": 145.20000000001164,
          "domP50": 83.70000000001164,
          "domP95": 145.70000000001164
        },
        "replace": {
          "emitP50": 347.5,
          "emitP95": 492.29999999998836,
          "domP50": 347.8999999999651,
          "domP95": 493.20000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.099999999976717,
          "lagP95": 14.799999999988358,
          "endLag": 13.699999999953434,
          "maxBacklog": 1
        },
        "heapMb": 9.35434341430664,
        "pssTotalMb": 237.2607421875,
        "fCommitP50": 2.7999999999883585,
        "fCommitP95": 3.400000000023283
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 10.400000000023283,
        "emitP95": 21.70000000001164,
        "domP50": 10.900000000023283,
        "domP95": 22.20000000001164
      },
      "edit_d4": {
        "emitP50": 8.5,
        "emitP95": 15.5,
        "domP50": 9.400000000023283,
        "domP95": 17.5
      },
      "edit_d10": {
        "emitP50": 9.900000000023283,
        "emitP95": 17.099999999976717,
        "domP50": 10.700000000011642,
        "domP95": 17.5
      },
      "loadCycle": {
        "emitP50": 28.70000000001164,
        "emitP95": 75.79999999998836,
        "domP50": 29.100000000034925,
        "domP95": 76.29999999998836
      },
      "step": {
        "emitP50": 8.899999999965075,
        "emitP95": 27.699999999953434,
        "domP50": 9.099999999976717,
        "domP95": 28.099999999976717
      },
      "reset": {
        "emitP50": 13.099999999976717,
        "emitP95": 30.099999999976717,
        "domP50": 13.200000000011642,
        "domP95": 30.20000000001164
      },
      "append100": {
        "emitP50": 18,
        "emitP95": 21.29999999998836,
        "domP50": 18.79999999998836,
        "domP95": 21.70000000001164
      },
      "heapMb": 5.009754180908203,
      "pssTotalMb": 237.12890625,
      "relaunchReadyMs": 450,
      "relaunchHeapMb": 4.198818206787109
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.800000000046566,
          "emitP95": 24.70000000001164,
          "domP50": 9.600000000034925,
          "domP95": 25.70000000001164
        },
        "setKeys": {
          "emitP50": 79.40000000002328,
          "emitP95": 103.39999999996508,
          "domP50": 79.70000000001164,
          "domP95": 103.79999999998836
        },
        "replace": {
          "emitP50": 8.299999999988358,
          "emitP95": 82.89999999996508,
          "domP50": 8.700000000011642,
          "domP95": 83.09999999997672
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.400000000023283,
          "lagP95": 24.70000000001164,
          "endLag": 7.2999999999883585,
          "maxBacklog": 2
        },
        "heapMb": 4.602031707763672,
        "pssTotalMb": 232.1748046875,
        "fCommitP50": 3,
        "fCommitP95": 4
      },
      "500": {
        "setKey": {
          "emitP50": 8.799999999988358,
          "emitP95": 25.29999999998836,
          "domP50": 9.599999999976717,
          "domP95": 25.70000000001164
        },
        "setKeys": {
          "emitP50": 73,
          "emitP95": 91.40000000002328,
          "domP50": 73.5,
          "domP95": 92.10000000003492
        },
        "replace": {
          "emitP50": 42,
          "emitP95": 114.90000000002328,
          "domP50": 45.20000000001164,
          "domP95": 115.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.399999999965075,
          "lagP95": 22.20000000001164,
          "endLag": 11.299999999988358,
          "maxBacklog": 3
        },
        "heapMb": 5.047359466552734,
        "pssTotalMb": 233.8095703125,
        "fCommitP50": 2.800000000046566,
        "fCommitP95": 4.2000000000116415
      },
      "5000": {
        "setKey": {
          "emitP50": 13.599999999976717,
          "emitP95": 29.600000000034925,
          "domP50": 14.099999999976717,
          "domP95": 30.100000000034925
        },
        "setKeys": {
          "emitP50": 83,
          "emitP95": 180.19999999995343,
          "domP50": 83.29999999998836,
          "domP95": 180.59999999997672
        },
        "replace": {
          "emitP50": 341.9000000000233,
          "emitP95": 493.5999999999767,
          "domP50": 342.4000000000233,
          "domP95": 494.0999999999767
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.5,
          "lagP95": 17.5,
          "endLag": 14.199999999953434,
          "maxBacklog": 1
        },
        "heapMb": 9.354171752929688,
        "pssTotalMb": 241.1005859375,
        "fCommitP50": 2.8999999999650754,
        "fCommitP95": 4.300000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.700000000011642,
        "emitP95": 22,
        "domP50": 9.5,
        "domP95": 22.5
      },
      "edit_d4": {
        "emitP50": 10.899999999965075,
        "emitP95": 18.899999999965075,
        "domP50": 11.299999999988358,
        "domP95": 19.70000000001164
      },
      "edit_d10": {
        "emitP50": 7.2000000000116415,
        "emitP95": 18.20000000001164,
        "domP50": 7.899999999965075,
        "domP95": 21
      },
      "loadCycle": {
        "emitP50": 31.600000000034925,
        "emitP95": 75.5,
        "domP50": 31.70000000001164,
        "domP95": 76
      },
      "step": {
        "emitP50": 8.300000000046566,
        "emitP95": 25.70000000001164,
        "domP50": 8.600000000034925,
        "domP95": 26.399999999965075
      },
      "reset": {
        "emitP50": 13.899999999965075,
        "emitP95": 24.79999999998836,
        "domP50": 14,
        "domP95": 24.79999999998836
      },
      "append100": {
        "emitP50": 17.70000000001164,
        "emitP95": 35.5,
        "domP50": 18.099999999976717,
        "domP95": 36.899999999965075
      },
      "heapMb": 5.013641357421875,
      "pssTotalMb": 237.09765625,
      "relaunchReadyMs": 439.9000000000233,
      "relaunchHeapMb": 4.198966979980469
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.900000000023283,
          "domP50": 1.900000000023283,
          "domP95": 8.900000000023283
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.3000000000465661,
          "domP50": 1.400000000023283,
          "domP95": 10.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.799999999930151,
          "domP50": 4.400000000023283,
          "domP95": 7.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.5627059936523438,
        "pssTotalMb": 220.0126953125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 2.599999999976717,
          "domP50": 6.099999999976717,
          "domP95": 11.599999999976717
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.099999999976717,
          "domP50": 1.2000000000698492,
          "domP95": 12.300000000046566
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1.3000000000465661,
          "domP50": 0.8000000000465661,
          "domP95": 8.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 3.9735336303710938,
        "pssTotalMb": 223.919921875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1000000000931323,
          "emitP95": 2.099999999976717,
          "domP50": 7.099999999976717,
          "domP95": 8.599999999976717
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 8.899999999906868,
          "domP50": 3.299999999930151,
          "domP95": 17.699999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.7999999999301508,
          "domP50": 1.6999999999534339,
          "domP95": 10.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 1.900000000023283,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 7.937648773193359,
        "pssTotalMb": 228.236328125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 3.200000000069849,
        "domP50": 1.8000000000465661,
        "domP95": 11.5
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.200000000069849,
        "domP50": 4.899999999906868,
        "domP95": 7.699999999953434
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 2.099999999976717,
        "domP50": 4.299999999930151,
        "domP95": 11.79999999993015
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 35.29999999993015,
        "domP50": 0.6000000000931323,
        "domP95": 35.59999999997672
      },
      "step": {
        "emitP50": 0.2999999999301508,
        "emitP95": 2.199999999953434,
        "domP50": 2.599999999976717,
        "domP95": 11.300000000046566
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.30000000004656613,
        "domP50": 0.2999999999301508,
        "domP95": 1.6999999999534339
      },
      "append100": {
        "emitP50": 0.6999999999534339,
        "emitP95": 1.900000000023283,
        "domP50": 1.099999999976717,
        "domP95": 9.199999999953434
      },
      "heapMb": 3.7760238647460938,
      "pssTotalMb": 222.1728515625,
      "relaunchReadyMs": 677.7999999999302,
      "relaunchHeapMb": 3.2574729919433594
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.400000000023283,
          "domP50": 5.700000000069849,
          "domP95": 10.599999999976717
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.3999999999068677,
          "domP50": 1.8999999999068677,
          "domP95": 10.599999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.900000000023283,
          "domP50": 1.5,
          "domP95": 11.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.7999999999301508,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.752826690673828,
        "pssTotalMb": 222.3642578125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.099999999976717,
          "domP50": 2,
          "domP95": 7.400000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 0.9000000000232831,
          "domP50": 1.400000000023283,
          "domP95": 10.400000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.099999999976717,
          "domP50": 5.599999999976717,
          "domP95": 12.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.9000000000232831,
          "endLag": 0.6999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 3.8714599609375,
        "pssTotalMb": 223.326171875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.7999999999301508,
          "domP50": 6.699999999953434,
          "domP95": 9.20000000006985
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 8.5,
          "domP50": 2.900000000023283,
          "domP95": 9.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.199999999953434,
          "domP50": 2.5,
          "domP95": 18.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999301508,
          "lagP95": 2,
          "endLag": 1.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 7.937591552734375,
        "pssTotalMb": 228.193359375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 2.599999999976717,
        "domP50": 5.5,
        "domP95": 9.5
      },
      "edit_d4": {
        "emitP50": 0.5,
        "emitP95": 1.599999999976717,
        "domP50": 1.8999999999068677,
        "domP95": 8.600000000093132
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 2.800000000046566,
        "domP95": 8.699999999953434
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 34.09999999997672,
        "domP50": 1.1999999999534339,
        "domP95": 34.699999999953434
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.9000000000232831,
        "domP50": 1.599999999976717,
        "domP95": 9.5
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5,
        "domP50": 0.2000000000698492,
        "domP95": 1.099999999976717
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.599999999976717,
        "domP50": 1.1999999999534339,
        "domP95": 6.300000000046566
      },
      "heapMb": 3.7756271362304688,
      "pssTotalMb": 222.1748046875,
      "relaunchReadyMs": 1426.1000000000931,
      "relaunchHeapMb": 3.3514404296875
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.70000000006985,
          "emitP95": 28.400000000023283,
          "domP50": 10.300000000046566,
          "domP95": 28.800000000046566
        },
        "setKeys": {
          "emitP50": 82,
          "emitP95": 155.40000000002328,
          "domP50": 82.69999999995343,
          "domP95": 155.80000000004657
        },
        "replace": {
          "emitP50": 9.900000000023283,
          "emitP95": 85,
          "domP50": 10.29999999993015,
          "domP95": 85.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.100000000093132,
          "lagP95": 16.699999999953434,
          "endLag": 13.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 4.601902008056641,
        "pssTotalMb": 233.9375,
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 4.099999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 11.70000000006985,
          "emitP95": 29.699999999953434,
          "domP50": 12.699999999953434,
          "domP95": 30
        },
        "setKeys": {
          "emitP50": 74.40000000002328,
          "emitP95": 99.19999999995343,
          "domP50": 74.90000000002328,
          "domP95": 100.29999999993015
        },
        "replace": {
          "emitP50": 48.29999999993015,
          "emitP95": 120.89999999990687,
          "domP50": 48.699999999953434,
          "domP95": 121.19999999995343
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.900000000023283,
          "lagP95": 28.699999999953434,
          "endLag": 12.099999999976717,
          "maxBacklog": 3
        },
        "heapMb": 5.046443939208984,
        "pssTotalMb": 236.7822265625,
        "fCommitP50": 3,
        "fCommitP95": 3.900000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 13.400000000023283,
          "emitP95": 31.300000000046566,
          "domP50": 14.20000000006985,
          "domP95": 31.70000000006985
        },
        "setKeys": {
          "emitP50": 82.90000000002328,
          "emitP95": 146.59999999997672,
          "domP50": 84.5,
          "domP95": 147.19999999995343
        },
        "replace": {
          "emitP50": 342,
          "emitP95": 506,
          "domP50": 342.5,
          "domP95": 506.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.5,
          "lagP95": 19.5,
          "endLag": 8.70000000006985,
          "maxBacklog": 1
        },
        "heapMb": 9.35477066040039,
        "pssTotalMb": 243.84765625,
        "fCommitP50": 3.299999999930151,
        "fCommitP95": 4.199999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 11.399999999906868,
        "emitP95": 20.399999999906868,
        "domP50": 11.900000000023283,
        "domP95": 20.699999999953434
      },
      "edit_d4": {
        "emitP50": 13,
        "emitP95": 19.900000000023283,
        "domP50": 13.800000000046566,
        "domP95": 21.300000000046566
      },
      "edit_d10": {
        "emitP50": 9.400000000023283,
        "emitP95": 20.900000000023283,
        "domP50": 10.699999999953434,
        "domP95": 21.400000000023283
      },
      "loadCycle": {
        "emitP50": 34.90000000002328,
        "emitP95": 73.79999999993015,
        "domP50": 35.300000000046566,
        "domP95": 74.19999999995343
      },
      "step": {
        "emitP50": 9.300000000046566,
        "emitP95": 16.400000000023283,
        "domP50": 9.600000000093132,
        "domP95": 17.5
      },
      "reset": {
        "emitP50": 19.099999999976717,
        "emitP95": 55.90000000002328,
        "domP50": 19.20000000006985,
        "domP95": 56
      },
      "append100": {
        "emitP50": 14.800000000046566,
        "emitP95": 28.099999999976717,
        "domP50": 16.900000000023283,
        "domP95": 28.400000000023283
      },
      "heapMb": 5.011692047119141,
      "pssTotalMb": 239.9326171875,
      "relaunchReadyMs": 1258.7999999999302,
      "relaunchHeapMb": 4.201007843017578
    }
  }
]
```
</details>
