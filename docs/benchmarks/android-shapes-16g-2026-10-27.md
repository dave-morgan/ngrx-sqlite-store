# Phase 16 shapes — flat objects & hybrid workflow (2026-10-27)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.37 ms, p95 8.72 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 52 / CODE-BOUND 0 / FAIL 33

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.34 ± 0.09 | 9.08 ± 1.34 | 26.7× | FAIL | allow 7.7 (control emitP50 6.3×1) |
| flat | 50.setKey.emitP95 | 2.04 ± 2.74 | 19.74 ± 2.49 | 9.7× | PLATFORM-BOUND | allow 21.8 (control emitP95 16.6×1) |
| flat | 50.setKey.domP50 | 4.62 ± 1.58 | 9.82 ± 1.31 | 2.1× | PLATFORM-BOUND | allow 9.5 (control domP50 6.6×1) |
| flat | 50.setKey.domP95 | 7.62 ± 0.67 | 20.82 ± 2.45 | 2.7× | PLATFORM-BOUND | allow 20.2 (control domP95 17.1×1) |
| flat | 50.setKeys.emitP50 | 0.40 ± 0.10 | 8.84 ± 0.91 | 22.1× | FAIL | allow 7.3 (control emitP50 6.3×1) |
| flat | 50.setKeys.emitP95 | 3.02 ± 2.27 | 22.32 ± 3.30 | 7.4× | PLATFORM-BOUND | allow 22.1 (control emitP95 16.6×1) |
| flat | 50.setKeys.domP50 | 3.64 ± 2.32 | 9.34 ± 0.88 | 2.6× | PLATFORM-BOUND | allow 9.8 (control domP50 6.6×1) |
| flat | 50.setKeys.domP95 | 10.08 ± 2.14 | 22.96 ± 3.21 | 2.3× | PLATFORM-BOUND | allow 22.5 (control domP95 17.1×1) |
| flat | 50.replace.emitP50 | 0.34 ± 0.05 | 7.72 ± 0.95 | 22.7× | FAIL | allow 7.3 (control emitP50 6.3×1) |
| flat | 50.replace.emitP95 | 2.90 ± 3.84 | 18.76 ± 5.24 | 6.5× | PLATFORM-BOUND | allow 25.7 (control emitP95 16.6×1) |
| flat | 50.replace.domP50 | 1.10 ± 0.22 | 8.20 ± 0.90 | 7.5× | PLATFORM-BOUND | allow 7.7 (control domP50 6.6×1) |
| flat | 50.replace.domP95 | 8.56 ± 2.81 | 19.34 ± 5.16 | 2.3× | PLATFORM-BOUND | allow 25.1 (control domP95 17.1×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 6.26 ± 0.37 | 20.9× | PLATFORM-BOUND | allow 6.7 (control emitP50 6.3×1) |
| flat | 50.burst.lagP95 | 0.66 ± 0.15 | 12.14 ± 4.00 | 18.4× | PLATFORM-BOUND | allow 20.7 (control emitP95 16.6×1) |
| flat | 50.burst.endLag | 0.26 ± 0.05 | 5.24 ± 1.02 | 20.2× | PLATFORM-BOUND | allow 7.4 (control emitP50 6.3×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 1.00 ± 0.00 | 1000000000.0× | FAIL |  |
| flat | 50.heapMb | 3.50 ± 0.06 | 4.62 ± 0.00 | 1.3× | FAIL | code +0.95 MB; data 1.50 -> 1.61 MB |
| flat | 50.pssTotalMb | 222.59 ± 1.50 | 235.75 ± 1.60 | 1.1× | FAIL | allow 5.6 (plugin baseline 2.5 MB) |
| flat | 500.setKey.emitP50 | 0.44 ± 0.13 | 8.46 ± 1.05 | 19.2× | PLATFORM-BOUND | allow 8.1 (control emitP50 7.0×1) |
| flat | 500.setKey.emitP95 | 2.70 ± 2.82 | 20.14 ± 2.41 | 7.5× | PLATFORM-BOUND | allow 23.6 (control emitP95 18.4×1) |
| flat | 500.setKey.domP50 | 3.36 ± 2.04 | 8.94 ± 0.93 | 2.7× | PLATFORM-BOUND | allow 10.2 (control domP50 7.3×1) |
| flat | 500.setKey.domP95 | 10.82 ± 5.78 | 21.62 ± 1.73 | 2.0× | PLATFORM-BOUND | allow 26.3 (control domP95 18.8×1) |
| flat | 500.setKeys.emitP50 | 0.46 ± 0.09 | 8.46 ± 0.62 | 18.4× | FAIL | allow 7.7 (control emitP50 7.0×1) |
| flat | 500.setKeys.emitP95 | 1.78 ± 0.92 | 20.58 ± 5.10 | 11.6× | PLATFORM-BOUND | allow 24.4 (control emitP95 18.4×1) |
| flat | 500.setKeys.domP50 | 3.38 ± 2.14 | 9.00 ± 0.58 | 2.7× | PLATFORM-BOUND | allow 10.0 (control domP50 7.3×1) |
| flat | 500.setKeys.domP95 | 11.60 ± 5.37 | 21.12 ± 5.02 | 1.8× | PLATFORM-BOUND | allow 29.1 (control domP95 18.8×1) |
| flat | 500.replace.emitP50 | 0.34 ± 0.05 | 9.00 ± 0.58 | 26.5× | FAIL | allow 7.6 (control emitP50 7.0×1) |
| flat | 500.replace.emitP95 | 4.08 ± 4.78 | 20.46 ± 3.11 | 5.0× | PLATFORM-BOUND | allow 26.3 (control emitP95 18.4×1) |
| flat | 500.replace.domP50 | 1.20 ± 0.41 | 9.58 ± 0.61 | 8.0× | FAIL | allow 8.3 (control domP50 7.3×1) |
| flat | 500.replace.domP95 | 11.00 ± 3.23 | 20.98 ± 3.23 | 1.9× | PLATFORM-BOUND | allow 25.2 (control domP95 18.8×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 6.08 ± 0.40 | 15.2× | PLATFORM-BOUND | allow 7.4 (control emitP50 7.0×1) |
| flat | 500.burst.lagP95 | 0.60 ± 0.00 | 12.10 ± 2.10 | 20.2× | PLATFORM-BOUND | allow 20.5 (control emitP95 18.4×1) |
| flat | 500.burst.endLag | 0.34 ± 0.05 | 10.66 ± 4.58 | 31.4× | PLATFORM-BOUND | allow 11.6 (control emitP50 7.0×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 1.00 ± 0.00 | 1000000000.0× | FAIL |  |
| flat | 500.heapMb | 4.05 ± 0.11 | 5.08 ± 0.00 | 1.3× | FAIL | code +0.84 MB; data 1.89 -> 2.03 MB |
| flat | 500.pssTotalMb | 227.55 ± 1.35 | 236.48 ± 1.33 | 1.0× | FAIL | allow 5.2 (plugin baseline 2.5 MB) |
| flat | 5000.setKey.emitP50 | 1.18 ± 0.18 | 10.40 ± 1.58 | 8.8× | FAIL | allow 7.8 (control emitP50 6.0×1) |
| flat | 5000.setKey.emitP95 | 2.58 ± 2.14 | 24.10 ± 2.48 | 9.3× | FAIL | allow 21.0 (control emitP95 16.4×1) |
| flat | 5000.setKey.domP50 | 6.06 ± 1.50 | 11.02 ± 1.54 | 1.8× | PLATFORM-BOUND | allow 9.3 (control domP50 6.3×1) |
| flat | 5000.setKey.domP95 | 9.12 ± 2.80 | 24.82 ± 2.63 | 2.7× | PLATFORM-BOUND | allow 22.1 (control domP95 16.7×1) |
| flat | 5000.setKeys.emitP50 | 1.58 ± 0.04 | 10.10 ± 1.03 | 6.4× | FAIL | allow 7.1 (control emitP50 6.0×1) |
| flat | 5000.setKeys.emitP95 | 5.90 ± 2.75 | 18.40 ± 0.82 | 3.1× | PLATFORM-BOUND | allow 19.9 (control emitP95 16.4×1) |
| flat | 5000.setKeys.domP50 | 3.00 ± 0.14 | 10.84 ± 1.15 | 3.6× | FAIL | allow 7.6 (control domP50 6.3×1) |
| flat | 5000.setKeys.domP95 | 11.98 ± 2.75 | 19.36 ± 1.51 | 1.6× | PLATFORM-BOUND | allow 20.9 (control domP95 16.7×1) |
| flat | 5000.replace.emitP50 | 0.34 ± 0.05 | 20.84 ± 1.83 | 61.3× | FAIL | allow 7.9 (control emitP50 6.0×1) |
| flat | 5000.replace.emitP95 | 2.86 ± 1.73 | 60.36 ± 6.07 | 21.1× | FAIL | allow 24.2 (control emitP95 16.4×1) |
| flat | 5000.replace.domP50 | 1.70 ± 0.14 | 21.46 ± 1.71 | 12.6× | FAIL | allow 8.2 (control domP50 6.3×1) |
| flat | 5000.replace.domP95 | 8.22 ± 5.25 | 61.06 ± 6.30 | 7.4× | FAIL | allow 28.2 (control domP95 16.7×1) |
| flat | 5000.burst.lagP50 | 1.30 ± 0.07 | 7.32 ± 0.08 | 5.6× | PLATFORM-BOUND | allow 6.2 (control emitP50 6.0×1) |
| flat | 5000.burst.lagP95 | 1.96 ± 0.24 | 11.44 ± 1.00 | 5.8× | PLATFORM-BOUND | allow 17.6 (control emitP95 16.4×1) |
| flat | 5000.burst.endLag | 1.24 ± 0.28 | 7.14 ± 1.00 | 5.8× | PLATFORM-BOUND | allow 7.3 (control emitP50 6.0×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 7.95 ± 0.10 | 9.31 ± 0.00 | 1.2× | FAIL | code +0.93 MB; data 5.72 -> 6.08 MB |
| flat | 5000.pssTotalMb | 231.49 ± 1.49 | 239.26 ± 1.47 | 1.0× | FAIL | allow 5.4 (plugin baseline 2.5 MB) |
| workflow | edit_d1.emitP50 | 0.34 ± 0.05 | 7.74 ± 0.36 | 22.8× | FAIL | allow 7.4 (control emitP50 7.0×1) |
| workflow | edit_d1.emitP95 | 0.94 ± 0.33 | 16.16 ± 1.75 | 17.2× | PLATFORM-BOUND | allow 20.6 (control emitP95 18.5×1) |
| workflow | edit_d1.domP50 | 4.04 ± 2.08 | 8.46 ± 0.40 | 2.1× | PLATFORM-BOUND | allow 9.8 (control domP50 7.3×1) |
| workflow | edit_d1.domP95 | 8.78 ± 3.33 | 16.80 ± 1.54 | 1.9× | PLATFORM-BOUND | allow 23.9 (control domP95 19.0×1) |
| workflow | edit_d4.emitP50 | 0.40 ± 0.00 | 8.10 ± 0.75 | 20.2× | PLATFORM-BOUND | allow 7.7 (control emitP50 7.0×1) |
| workflow | edit_d4.emitP95 | 1.84 ± 2.28 | 19.34 ± 3.21 | 10.5× | PLATFORM-BOUND | allow 24.0 (control emitP95 18.5×1) |
| workflow | edit_d4.domP50 | 2.56 ± 1.10 | 8.74 ± 1.07 | 3.4× | PLATFORM-BOUND | allow 9.5 (control domP50 7.3×1) |
| workflow | edit_d4.domP95 | 7.68 ± 1.39 | 21.32 ± 5.88 | 2.8× | PLATFORM-BOUND | allow 26.3 (control domP95 19.0×1) |
| workflow | edit_d10.emitP50 | 0.42 ± 0.04 | 7.28 ± 0.75 | 17.3× | PLATFORM-BOUND | allow 7.8 (control emitP50 7.0×1) |
| workflow | edit_d10.emitP95 | 1.20 ± 0.51 | 17.66 ± 5.30 | 14.7× | PLATFORM-BOUND | allow 24.3 (control emitP95 18.5×1) |
| workflow | edit_d10.domP50 | 1.58 ± 1.08 | 7.86 ± 0.59 | 5.0× | PLATFORM-BOUND | allow 9.0 (control domP50 7.3×1) |
| workflow | edit_d10.domP95 | 7.10 ± 1.29 | 18.16 ± 5.38 | 2.6× | PLATFORM-BOUND | allow 25.7 (control domP95 19.0×1) |
| workflow | loadCycle.emitP50 | 6.16 ± 7.89 | 18.06 ± 1.54 | 2.9× | PLATFORM-BOUND | allow 23.3 (control emitP50 7.0×2) |
| workflow | loadCycle.emitP95 | 33.98 ± 2.31 | 51.44 ± 5.26 | 1.5× | PLATFORM-BOUND | allow 44.6 (control emitP95 18.5×2) |
| workflow | loadCycle.domP50 | 6.78 ± 8.33 | 18.54 ± 1.55 | 2.7× | PLATFORM-BOUND | allow 24.5 (control domP50 7.3×2) |
| workflow | loadCycle.domP95 | 34.52 ± 2.33 | 52.94 ± 7.38 | 1.5× | PLATFORM-BOUND | allow 47.8 (control domP95 19.0×2) |
| workflow | step.emitP50 | 0.34 ± 0.05 | 7.44 ± 0.40 | 21.9× | PLATFORM-BOUND | allow 7.4 (control emitP50 7.0×1) |
| workflow | step.emitP95 | 1.42 ± 0.86 | 17.16 ± 2.92 | 12.1× | PLATFORM-BOUND | allow 22.3 (control emitP95 18.5×1) |
| workflow | step.domP50 | 2.00 ± 1.82 | 7.90 ± 0.34 | 4.0× | PLATFORM-BOUND | allow 9.5 (control domP50 7.3×1) |
| workflow | step.domP95 | 7.82 ± 1.76 | 18.82 ± 3.32 | 2.4× | PLATFORM-BOUND | allow 24.1 (control domP95 19.0×1) |
| workflow | reset.emitP50 | 0.22 ± 0.04 | 11.14 ± 1.87 | 50.6× | FAIL | allow 8.9 (control emitP50 7.0×1) |
| workflow | reset.emitP95 | 0.66 ± 0.25 | 33.50 ± 7.67 | 50.8× | FAIL | allow 26.4 (control emitP95 18.5×1) |
| workflow | reset.domP50 | 0.24 ± 0.05 | 11.38 ± 1.92 | 47.4× | FAIL | allow 9.3 (control domP50 7.3×1) |
| workflow | reset.domP95 | 1.14 ± 0.09 | 33.54 ± 7.62 | 29.4× | FAIL | allow 26.8 (control domP95 19.0×1) |
| workflow | append100.emitP50 | 0.38 ± 0.13 | 15.18 ± 1.61 | 39.9× | FAIL | allow 8.7 (control emitP50 7.0×1) |
| workflow | append100.emitP95 | 1.26 ± 1.00 | 23.44 ± 3.86 | 18.6× | PLATFORM-BOUND | allow 23.4 (control emitP95 18.5×1) |
| workflow | append100.domP50 | 0.90 ± 0.20 | 15.46 ± 1.63 | 17.2× | FAIL | allow 9.1 (control domP50 7.3×1) |
| workflow | append100.domP95 | 5.86 ± 1.32 | 23.92 ± 3.83 | 4.1× | PLATFORM-BOUND | allow 24.2 (control domP95 19.0×1) |
| workflow | heapMb | 3.78 ± 0.12 | 5.05 ± 0.01 | 1.3× | FAIL | code +0.99 MB; data 1.63 -> 1.85 MB |
| workflow | pssTotalMb | 225.83 ± 1.98 | 240.90 ± 1.33 | 1.1× | FAIL | allow 5.8 (plugin baseline 2.5 MB) |
| workflow | relaunchReadyMs | 1058.42 ± 403.05 | 521.16 ± 274.47 | 0.5× | PASS |  |
| workflow | relaunchHeapMb | 3.28 ± 0.04 | 4.17 ± 0.03 | 1.3× | FAIL | code +0.55 MB; data 1.44 -> 1.77 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 6.30 | 6.60 | 17.10 | 9.08 | 9.82 | 20.82 |
| 500 | 6.96 | 7.26 | 18.76 | 8.46 | 8.94 | 21.62 |
| 5000 | 6.04 | 6.30 | 16.68 | 10.40 | 11.02 | 24.82 |

<details><summary>Raw per-trial data</summary>

```json
[
  {
    "impl": "classic",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.20000000001164153,
          "emitP95": 0.40000000002328306,
          "domP50": 5.600000000034925,
          "domP95": 7
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 4.5,
          "domP50": 1.3000000000465661,
          "domP95": 10.299999999988358
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 1.7000000000116415,
          "domP50": 1.099999999976717,
          "domP95": 8.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.9000000000232831,
          "endLag": 0.29999999998835847,
          "maxBacklog": 0
        },
        "heapMb": 3.562694549560547,
        "heapCode": 1.6877975463867188,
        "heapData": 1.5023841857910156,
        "pssTotalMb": 221.3955078125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 7.5,
          "domP50": 2.5,
          "domP95": 20.699999999953434
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.400000000023283,
          "domP50": 5.7999999999883585,
          "domP95": 20.600000000034925
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 11.900000000023283,
          "domP50": 1,
          "domP95": 16.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.3999999999650754,
          "lagP95": 0.5999999999767169,
          "endLag": 0.29999999998835847,
          "maxBacklog": 0
        },
        "heapMb": 4.161663055419922,
        "heapCode": 1.8756637573242188,
        "heapData": 1.8946266174316406,
        "pssTotalMb": 227.4609375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1000000000349246,
          "emitP95": 1.5,
          "domP50": 7,
          "domP95": 7.800000000046566
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 4.400000000023283,
          "domP50": 3.099999999976717,
          "domP95": 14.900000000023283
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7999999999883585,
          "domP50": 1.5,
          "domP95": 17.29999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999883585,
          "lagP95": 2.1000000000349246,
          "endLag": 1.1000000000349246,
          "maxBacklog": 0
        },
        "heapMb": 7.938053131103516,
        "heapCode": 1.6913871765136719,
        "heapData": 5.722068786621094,
        "pssTotalMb": 230.087890625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.6000000000349246,
        "domP50": 5.5,
        "domP95": 6.599999999976717
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 5.900000000023283,
        "domP50": 1.900000000023283,
        "domP95": 10.100000000034925
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2,
        "domP50": 3.5,
        "domP95": 7.2999999999883585
      },
      "loadCycle": {
        "emitP50": 15.099999999976717,
        "emitP95": 32.800000000046566,
        "domP50": 15.799999999988358,
        "domP95": 33.20000000001164
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.2999999999883585,
        "domP50": 1.599999999976717,
        "domP95": 7.900000000023283
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 1.1000000000349246,
        "domP50": 0.20000000001164153,
        "domP95": 1.1000000000349246
      },
      "append100": {
        "emitP50": 0.3999999999650754,
        "emitP95": 1.099999999976717,
        "domP50": 0.7999999999883585,
        "domP95": 5.599999999976717
      },
      "heapMb": 3.6828842163085938,
      "heapCode": 1.6845321655273438,
      "heapData": 1.6282730102539062,
      "pssTotalMb": 223.5673828125,
      "relaunchReadyMs": 1426.9000000000233,
      "relaunchHeapMb": 3.352062225341797,
      "relaunchHeapCode": 1.5398712158203125,
      "relaunchHeapData": 1.4465255737304688
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7,
          "emitP95": 17.400000000023283,
          "domP50": 7.7000000000116415,
          "domP95": 17.70000000001164
        },
        "setKeys": {
          "emitP50": 8.900000000023283,
          "emitP95": 18.70000000001164,
          "domP50": 9.299999999988358,
          "domP95": 19.20000000001164
        },
        "replace": {
          "emitP50": 8.799999999988358,
          "emitP95": 17.199999999953434,
          "domP50": 9.199999999953434,
          "domP95": 17.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.199999999953434,
          "lagP95": 12.099999999976717,
          "endLag": 6.2999999999883585,
          "maxBacklog": 1
        },
        "heapMb": 4.622230529785156,
        "heapCode": 2.5846099853515625,
        "heapData": 1.6091957092285156,
        "pssTotalMb": 234.0517578125,
        "control": {
          "emitP50": 6.100000000034925,
          "emitP95": 21.29999999998836,
          "domP50": 6.399999999965075,
          "domP95": 21.899999999965075
        },
        "fCommitP50": 3,
        "fCommitP95": 6.599999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 7.7999999999883585,
          "emitP95": 19.5,
          "domP50": 8.200000000011642,
          "domP95": 19.900000000023283
        },
        "setKeys": {
          "emitP50": 7.600000000034925,
          "emitP95": 18.300000000046566,
          "domP50": 8.400000000023283,
          "domP95": 18.900000000023283
        },
        "replace": {
          "emitP50": 8.899999999965075,
          "emitP95": 15.799999999988358,
          "domP50": 9.700000000011642,
          "domP95": 16.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.2000000000116415,
          "lagP95": 13.299999999988358,
          "endLag": 16.100000000034925,
          "maxBacklog": 1
        },
        "heapMb": 5.077777862548828,
        "heapCode": 2.6084251403808594,
        "heapData": 2.0262718200683594,
        "pssTotalMb": 234.8125,
        "control": {
          "emitP50": 5.899999999965075,
          "emitP95": 21.20000000001164,
          "domP50": 6.2999999999883585,
          "domP95": 21.5
        },
        "fCommitP50": 3.1000000000349246,
        "fCommitP95": 13.900000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 9,
          "emitP95": 27.400000000023283,
          "domP50": 9.799999999988358,
          "domP95": 27.900000000023283
        },
        "setKeys": {
          "emitP50": 10.600000000034925,
          "emitP95": 17.399999999965075,
          "domP50": 10.900000000023283,
          "domP95": 17.70000000001164
        },
        "replace": {
          "emitP50": 23,
          "emitP95": 50.70000000001164,
          "domP50": 23.399999999965075,
          "domP95": 51.09999999997672
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.2999999999883585,
          "lagP95": 10.600000000034925,
          "endLag": 7.2999999999883585,
          "maxBacklog": 2
        },
        "heapMb": 9.313106536865234,
        "heapCode": 2.641368865966797,
        "heapData": 6.085056304931641,
        "pssTotalMb": 238.78125,
        "control": {
          "emitP50": 6,
          "emitP95": 18,
          "domP50": 6.2000000000116415,
          "domP95": 18.600000000034925
        },
        "fCommitP50": 2.900000000023283,
        "fCommitP95": 7.2999999999883585
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.2000000000116415,
        "emitP95": 18.5,
        "domP50": 8,
        "domP95": 18.79999999998836
      },
      "edit_d4": {
        "emitP50": 8,
        "emitP95": 22.900000000023283,
        "domP50": 8.600000000034925,
        "domP95": 30.79999999998836
      },
      "edit_d10": {
        "emitP50": 6.900000000023283,
        "emitP95": 12.600000000034925,
        "domP50": 7.400000000023283,
        "domP95": 13
      },
      "loadCycle": {
        "emitP50": 15.799999999988358,
        "emitP95": 49.199999999953434,
        "domP50": 16.199999999953434,
        "domP95": 49.5
      },
      "step": {
        "emitP50": 7,
        "emitP95": 19.100000000034925,
        "domP50": 7.5,
        "domP95": 19.5
      },
      "reset": {
        "emitP50": 9.800000000046566,
        "emitP95": 21.600000000034925,
        "domP50": 9.900000000023283,
        "domP95": 21.70000000001164
      },
      "append100": {
        "emitP50": 14.400000000023283,
        "emitP95": 23.20000000001164,
        "domP50": 14.600000000034925,
        "domP95": 23.600000000034925
      },
      "control": {
        "emitP50": 8.5,
        "emitP95": 21.600000000034925,
        "domP50": 8.899999999965075,
        "domP95": 21.900000000023283
      },
      "heapMb": 5.045310974121094,
      "heapCode": 2.7599334716796875,
      "heapData": 1.8501396179199219,
      "pssTotalMb": 239.3720703125,
      "relaunchReadyMs": 1011.7000000000116,
      "relaunchHeapMb": 4.156574249267578,
      "relaunchHeapCode": 2.0266342163085938,
      "relaunchHeapData": 1.7601966857910156
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.599999999976717,
          "emitP95": 18.600000000034925,
          "domP50": 9.700000000011642,
          "domP95": 19
        },
        "setKeys": {
          "emitP50": 9.899999999965075,
          "emitP95": 21.900000000023283,
          "domP50": 10.200000000011642,
          "domP95": 22.5
        },
        "replace": {
          "emitP50": 8.700000000011642,
          "emitP95": 11.899999999965075,
          "domP50": 9.100000000034925,
          "domP95": 12.799999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.400000000023283,
          "lagP95": 11.700000000011642,
          "endLag": 4.599999999976717,
          "maxBacklog": 1
        },
        "heapMb": 4.622283935546875,
        "heapCode": 2.5848464965820312,
        "heapData": 1.6089553833007812,
        "pssTotalMb": 233.970703125,
        "control": {
          "emitP50": 6.099999999976717,
          "emitP95": 14.799999999988358,
          "domP50": 6.399999999965075,
          "domP95": 15
        },
        "fCommitP50": 3.2999999999883585,
        "fCommitP95": 6.599999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 7.7000000000116415,
          "emitP95": 17.100000000034925,
          "domP50": 8.5,
          "domP95": 22.100000000034925
        },
        "setKeys": {
          "emitP50": 9.299999999988358,
          "emitP95": 29.29999999998836,
          "domP50": 9.900000000023283,
          "domP95": 29.699999999953434
        },
        "replace": {
          "emitP50": 9.400000000023283,
          "emitP95": 24.400000000023283,
          "domP50": 9.900000000023283,
          "domP95": 25
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.699999999953434,
          "lagP95": 15.200000000011642,
          "endLag": 14.099999999976717,
          "maxBacklog": 1
        },
        "heapMb": 5.076618194580078,
        "heapCode": 2.6071510314941406,
        "heapData": 2.0264968872070312,
        "pssTotalMb": 235.2998046875,
        "control": {
          "emitP50": 10.5,
          "emitP95": 22.300000000046566,
          "domP50": 10.799999999988358,
          "domP95": 22.800000000046566
        },
        "fCommitP50": 4.7999999999883585,
        "fCommitP95": 7.300000000046566
      },
      "5000": {
        "setKey": {
          "emitP50": 9.199999999953434,
          "emitP95": 23.5,
          "domP50": 9.699999999953434,
          "domP95": 24
        },
        "setKeys": {
          "emitP50": 10.099999999976717,
          "emitP95": 18.100000000034925,
          "domP50": 10.799999999988358,
          "domP95": 18.900000000023283
        },
        "replace": {
          "emitP50": 19.400000000023283,
          "emitP95": 64.79999999998836,
          "domP50": 20.399999999965075,
          "domP95": 66.10000000003492
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.2000000000116415,
          "lagP95": 10.600000000034925,
          "endLag": 7.899999999965075,
          "maxBacklog": 2
        },
        "heapMb": 9.312217712402344,
        "heapCode": 2.6407623291015625,
        "heapData": 6.084812164306641,
        "pssTotalMb": 237.0361328125,
        "control": {
          "emitP50": 6.7000000000116415,
          "emitP95": 16.899999999965075,
          "domP50": 7,
          "domP95": 17.099999999976717
        },
        "fCommitP50": 3.2999999999883585,
        "fCommitP95": 10.200000000011642
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.100000000034925,
        "emitP95": 14,
        "domP50": 8.800000000046566,
        "domP95": 14.799999999988358
      },
      "edit_d4": {
        "emitP50": 8,
        "emitP95": 16.20000000001164,
        "domP50": 8.600000000034925,
        "domP95": 16.70000000001164
      },
      "edit_d10": {
        "emitP50": 7.7000000000116415,
        "emitP95": 13.5,
        "domP50": 8.099999999976717,
        "domP95": 14
      },
      "loadCycle": {
        "emitP50": 19.699999999953434,
        "emitP95": 54.29999999998836,
        "domP50": 20.199999999953434,
        "domP95": 54.899999999965075
      },
      "step": {
        "emitP50": 7.2000000000116415,
        "emitP95": 19.29999999998836,
        "domP50": 7.7000000000116415,
        "domP95": 22.29999999998836
      },
      "reset": {
        "emitP50": 13.79999999993015,
        "emitP95": 38.39999999990687,
        "domP50": 13.899999999906868,
        "domP95": 38.39999999990687
      },
      "append100": {
        "emitP50": 17.300000000046566,
        "emitP95": 21.70000000006985,
        "domP50": 17.599999999976717,
        "domP95": 22.099999999976717
      },
      "control": {
        "emitP50": 7,
        "emitP95": 24,
        "domP50": 7.300000000046566,
        "domP95": 24.29999999993015
      },
      "heapMb": 5.045124053955078,
      "heapCode": 2.7594985961914062,
      "heapData": 1.8503875732421875,
      "pssTotalMb": 239.525390625,
      "relaunchReadyMs": 379.80000000004657,
      "relaunchHeapMb": 4.154544830322266,
      "relaunchHeapCode": 2.0245742797851562,
      "relaunchHeapData": 1.7603607177734375
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.7000000000698492,
          "domP50": 5.799999999930151,
          "domP95": 6.800000000046566
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 5.599999999976717,
          "domP50": 5.400000000023283,
          "domP95": 11.800000000046566
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5,
          "domP50": 1.3999999999068677,
          "domP95": 6.100000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.2999999999301508,
          "lagP95": 0.5999999999767169,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.562793731689453,
        "heapCode": 1.687896728515625,
        "heapData": 1.5023841857910156,
        "pssTotalMb": 221.529296875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 2.599999999976717,
          "domP50": 1.5,
          "domP95": 11
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.7999999999301508,
          "domP50": 1,
          "domP95": 12.20000000006985
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.599999999976717,
          "domP50": 1.2000000000698492,
          "domP95": 10.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.5999999999767169,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.971729278564453,
        "heapCode": 1.6936264038085938,
        "heapData": 1.8916740417480469,
        "pssTotalMb": 225.3935546875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.5,
          "emitP95": 6.400000000023283,
          "domP50": 3.400000000023283,
          "domP95": 14.099999999976717
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 9,
          "domP50": 3.099999999976717,
          "domP95": 14.099999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.400000000023283,
          "domP50": 1.8000000000465661,
          "domP95": 5.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999301508,
          "lagP95": 1.900000000023283,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.122711181640625,
        "heapCode": 1.8682632446289062,
        "heapData": 5.7250213623046875,
        "pssTotalMb": 232.9560546875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.5999999999767169,
        "domP50": 5.5,
        "domP95": 6.5
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 3.900000000023283,
        "domP95": 7.400000000023283
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1.099999999976717,
        "domP95": 8.900000000023283
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 33.79999999993015,
        "domP50": 0.5,
        "domP95": 34.59999999997672
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6999999999534339,
        "domP50": 1.3999999999068677,
        "domP95": 10.400000000023283
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5,
        "domP50": 0.2000000000698492,
        "domP95": 1
      },
      "append100": {
        "emitP50": 0.2999999999301508,
        "emitP95": 3,
        "domP50": 1,
        "domP95": 5.700000000069849
      },
      "heapMb": 3.7765541076660156,
      "heapCode": 1.769561767578125,
      "heapData": 1.6309852600097656,
      "pssTotalMb": 224.0849609375,
      "relaunchReadyMs": 1277.4000000000233,
      "relaunchHeapMb": 3.2578506469726562,
      "relaunchHeapCode": 1.45458984375,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.2999999999301508,
          "domP50": 1.900000000023283,
          "domP95": 8
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.6999999999534339,
          "domP50": 0.9000000000232831,
          "domP95": 12.20000000006985
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.8000000000465661,
          "domP50": 0.7999999999301508,
          "domP95": 5.799999999930151
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.4609031677246094,
        "heapCode": 1.5947647094726562,
        "heapData": 1.4996528625488281,
        "pssTotalMb": 221.5712890625
      },
      "500": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7999999999301508,
          "domP50": 5.699999999953434,
          "domP95": 8.5
        },
        "setKeys": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.40000000002328306,
          "domP50": 5.5,
          "domP95": 7.099999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 5.400000000023283,
          "domP50": 1.900000000023283,
          "domP95": 10.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.5999999999767169,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.173503875732422,
        "heapCode": 1.8863182067871094,
        "heapData": 1.8946266174316406,
        "pssTotalMb": 227.9873046875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.599999999976717,
          "domP50": 6.400000000023283,
          "domP95": 7.5
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 8.400000000023283,
          "domP50": 2.800000000046566,
          "domP95": 9.199999999953434
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 4.199999999953434,
          "domP50": 1.599999999976717,
          "domP95": 6.299999999930151
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2000000000698492,
          "lagP95": 1.7999999999301508,
          "endLag": 1,
          "maxBacklog": 0
        },
        "heapMb": 7.835838317871094,
        "heapCode": 1.5979652404785156,
        "heapData": 5.719356536865234,
        "pssTotalMb": 229.689453125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.2999999999301508,
        "emitP95": 1,
        "domP50": 5.599999999976717,
        "domP95": 6.100000000093132
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 2.400000000023283,
        "domP95": 7.399999999906868
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1,
        "domP50": 1.1999999999534339,
        "domP95": 7.599999999976717
      },
      "loadCycle": {
        "emitP50": 14.5,
        "emitP95": 33,
        "domP50": 16,
        "domP95": 33.59999999997672
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 2.800000000046566,
        "domP50": 0.8000000000465661,
        "domP95": 6
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5999999999767169,
        "domP50": 0.2000000000698492,
        "domP95": 1.1999999999534339
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 0.7999999999301508,
        "domP95": 6.699999999953434
      },
      "heapMb": 3.7764968872070312,
      "heapCode": 1.7695274353027344,
      "heapData": 1.6309852600097656,
      "pssTotalMb": 226.1259765625,
      "relaunchReadyMs": 604.9000000000233,
      "relaunchHeapMb": 3.2573814392089844,
      "relaunchHeapCode": 1.45452880859375,
      "relaunchHeapData": 1.443511962890625
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.599999999976717,
          "emitP95": 22.900000000023283,
          "domP50": 9.900000000023283,
          "domP95": 23.29999999993015
        },
        "setKeys": {
          "emitP50": 8.800000000046566,
          "emitP95": 27.699999999953434,
          "domP50": 9.400000000023283,
          "domP95": 28
        },
        "replace": {
          "emitP50": 6.800000000046566,
          "emitP95": 19.29999999993015,
          "domP50": 7.200000000069849,
          "domP95": 20
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.799999999930151,
          "lagP95": 8.699999999953434,
          "endLag": 4.400000000023283,
          "maxBacklog": 1
        },
        "heapMb": 4.622013092041016,
        "heapCode": 2.584636688232422,
        "heapData": 1.6089515686035156,
        "pssTotalMb": 237.21484375,
        "control": {
          "emitP50": 5.400000000023283,
          "emitP95": 16.900000000023283,
          "domP50": 5.599999999976717,
          "domP95": 17.29999999993015
        },
        "fCommitP50": 3.5,
        "fCommitP95": 5.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 7.699999999953434,
          "emitP95": 23.699999999953434,
          "domP50": 8.199999999953434,
          "domP95": 24.300000000046566
        },
        "setKeys": {
          "emitP50": 8.29999999993015,
          "emitP95": 16.5,
          "domP50": 8.599999999976717,
          "domP95": 17
        },
        "replace": {
          "emitP50": 9,
          "emitP95": 21.099999999976717,
          "domP50": 9.5,
          "domP95": 21.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.800000000046566,
          "lagP95": 11.20000000006985,
          "endLag": 9.900000000023283,
          "maxBacklog": 1
        },
        "heapMb": 5.0764617919921875,
        "heapCode": 2.6071815490722656,
        "heapData": 2.0262718200683594,
        "pssTotalMb": 237.677734375,
        "control": {
          "emitP50": 6.299999999930151,
          "emitP95": 16.20000000006985,
          "domP50": 6.599999999976717,
          "domP95": 16.70000000006985
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 10.800000000046566
      },
      "5000": {
        "setKey": {
          "emitP50": 12.599999999976717,
          "emitP95": 23.900000000023283,
          "domP50": 13.099999999976717,
          "domP95": 24.400000000023283
        },
        "setKeys": {
          "emitP50": 9.800000000046566,
          "emitP95": 19.599999999976717,
          "domP50": 10.5,
          "domP95": 21.699999999953434
        },
        "replace": {
          "emitP50": 19.099999999976717,
          "emitP95": 58.10000000009313,
          "domP50": 19.5,
          "domP95": 58.60000000009313
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.300000000046566,
          "lagP95": 11.099999999976717,
          "endLag": 5.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.312313079833984,
        "heapCode": 2.640613555908203,
        "heapData": 6.085056304931641,
        "pssTotalMb": 239.802734375,
        "control": {
          "emitP50": 6,
          "emitP95": 15.300000000046566,
          "domP50": 6.300000000046566,
          "domP95": 15.5
        },
        "fCommitP50": 3.5,
        "fCommitP95": 6.099999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.800000000046566,
        "emitP95": 16.300000000046566,
        "domP50": 8.5,
        "domP95": 16.900000000023283
      },
      "edit_d4": {
        "emitP50": 8,
        "emitP95": 19.79999999993015,
        "domP50": 8.400000000023283,
        "domP95": 20.399999999906868
      },
      "edit_d10": {
        "emitP50": 6.800000000046566,
        "emitP95": 19.300000000046566,
        "domP50": 7.200000000069849,
        "domP95": 20
      },
      "loadCycle": {
        "emitP50": 17.300000000046566,
        "emitP95": 59.10000000009313,
        "domP50": 17.900000000023283,
        "domP95": 64.90000000002328
      },
      "step": {
        "emitP50": 8,
        "emitP95": 19.20000000006985,
        "domP50": 8.199999999953434,
        "domP95": 19.70000000006985
      },
      "reset": {
        "emitP50": 10.900000000023283,
        "emitP95": 29.899999999906868,
        "domP50": 11.300000000046566,
        "domP95": 30
      },
      "append100": {
        "emitP50": 14,
        "emitP95": 20.300000000046566,
        "domP50": 14.400000000023283,
        "domP95": 20.699999999953434
      },
      "control": {
        "emitP50": 7.699999999953434,
        "emitP95": 18.699999999953434,
        "domP50": 7.900000000023283,
        "domP95": 20.300000000046566
      },
      "heapMb": 5.0452423095703125,
      "heapCode": 2.7596168518066406,
      "heapData": 1.8503875732421875,
      "pssTotalMb": 241.888671875,
      "relaunchReadyMs": 412.0999999999767,
      "relaunchHeapMb": 4.215961456298828,
      "relaunchHeapCode": 2.0244064331054688,
      "relaunchHeapData": 1.8219451904296875
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.699999999953434,
          "emitP95": 17.900000000023283,
          "domP50": 10.79999999993015,
          "domP95": 21.099999999976717
        },
        "setKeys": {
          "emitP50": 9.199999999953434,
          "emitP95": 21.199999999953434,
          "domP50": 9.900000000023283,
          "domP95": 21.79999999993015
        },
        "replace": {
          "emitP50": 7.100000000093132,
          "emitP95": 18.900000000023283,
          "domP50": 7.600000000093132,
          "domP95": 19.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.099999999976717,
          "lagP95": 9.400000000023283,
          "endLag": 4.5,
          "maxBacklog": 1
        },
        "heapMb": 4.622215270996094,
        "heapCode": 2.5845909118652344,
        "heapData": 1.6091995239257812,
        "pssTotalMb": 236.728515625,
        "control": {
          "emitP50": 7.5,
          "emitP95": 15.29999999993015,
          "domP50": 7.700000000069849,
          "domP95": 16
        },
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 9.5
      },
      "500": {
        "setKey": {
          "emitP50": 10,
          "emitP95": 19.5,
          "domP50": 10.300000000046566,
          "domP95": 20.400000000023283
        },
        "setKeys": {
          "emitP50": 8.400000000023283,
          "emitP95": 18.099999999976717,
          "domP50": 9,
          "domP95": 18.79999999993015
        },
        "replace": {
          "emitP50": 8.099999999976717,
          "emitP95": 19.79999999993015,
          "domP50": 8.599999999976717,
          "domP95": 20.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.699999999953434,
          "lagP95": 10.599999999976717,
          "endLag": 8.70000000006985,
          "maxBacklog": 1
        },
        "heapMb": 5.0767364501953125,
        "heapCode": 2.6067428588867188,
        "heapData": 2.0262680053710938,
        "pssTotalMb": 237.1474609375,
        "control": {
          "emitP50": 6.300000000046566,
          "emitP95": 14.599999999976717,
          "domP50": 6.599999999976717,
          "domP95": 14.900000000023283
        },
        "fCommitP50": 3.5,
        "fCommitP95": 13
      },
      "5000": {
        "setKey": {
          "emitP50": 9.699999999953434,
          "emitP95": 20.599999999976717,
          "domP50": 10.300000000046566,
          "domP95": 21.099999999976717
        },
        "setKeys": {
          "emitP50": 8.599999999976717,
          "emitP95": 18.20000000006985,
          "domP50": 9.399999999906868,
          "domP95": 18.70000000006985
        },
        "replace": {
          "emitP50": 20.099999999976717,
          "emitP95": 63.300000000046566,
          "domP50": 20.900000000023283,
          "domP95": 64.09999999997672
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.400000000023283,
          "lagP95": 12,
          "endLag": 7.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.313404083251953,
        "heapCode": 2.6417999267578125,
        "heapData": 6.0847930908203125,
        "pssTotalMb": 240.9599609375,
        "control": {
          "emitP50": 5.900000000023283,
          "emitP95": 16.800000000046566,
          "domP50": 6.199999999953434,
          "domP95": 17.099999999976717
        },
        "fCommitP50": 3.299999999930151,
        "fCommitP95": 9.400000000023283
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8,
        "emitP95": 15,
        "domP50": 8.900000000023283,
        "domP95": 15.900000000023283
      },
      "edit_d4": {
        "emitP50": 7.199999999953434,
        "emitP95": 15.899999999906868,
        "domP50": 7.600000000093132,
        "domP95": 16.300000000046566
      },
      "edit_d10": {
        "emitP50": 6.599999999976717,
        "emitP95": 17.099999999976717,
        "domP50": 7.900000000023283,
        "domP95": 17.400000000023283
      },
      "loadCycle": {
        "emitP50": 18.5,
        "emitP95": 45.800000000046566,
        "domP50": 19,
        "domP95": 46.20000000006985
      },
      "step": {
        "emitP50": 7.300000000046566,
        "emitP95": 12.900000000023283,
        "domP50": 7.799999999930151,
        "domP95": 13.300000000046566
      },
      "reset": {
        "emitP50": 12.099999999976717,
        "emitP95": 39.40000000002328,
        "domP50": 12.599999999976717,
        "domP95": 39.40000000002328
      },
      "append100": {
        "emitP50": 16.5,
        "emitP95": 30.099999999976717,
        "domP50": 16.79999999993015,
        "domP95": 30.5
      },
      "control": {
        "emitP50": 6,
        "emitP95": 15.099999999976717,
        "domP50": 6.299999999930151,
        "domP95": 15.300000000046566
      },
      "heapMb": 5.058189392089844,
      "heapCode": 2.762065887451172,
      "heapData": 1.8603057861328125,
      "pssTotalMb": 241.72265625,
      "relaunchReadyMs": 402.79999999993015,
      "relaunchHeapMb": 4.1544189453125,
      "relaunchHeapCode": 2.024250030517578,
      "relaunchHeapData": 1.760467529296875
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 6.900000000023283,
          "domP50": 4.799999999930151,
          "domP95": 8
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.700000000069849,
          "domP50": 5.199999999953434,
          "domP95": 6.900000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 9.70000000006985,
          "domP50": 1,
          "domP95": 10.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.6999999999534339,
          "endLag": 0.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 3.4609527587890625,
        "heapCode": 1.5947647094726562,
        "heapData": 1.4996719360351562,
        "pssTotalMb": 224.138671875
      },
      "500": {
        "setKey": {
          "emitP50": 0.6000000000931323,
          "emitP95": 2.099999999976717,
          "domP50": 1.7000000000698492,
          "domP95": 7.5
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.799999999930151,
          "domP50": 2.299999999930151,
          "domP95": 9.599999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.8999999999068677,
          "domP50": 0.9000000000232831,
          "domP95": 10.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.5999999999767169,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.971691131591797,
        "heapCode": 1.6935882568359375,
        "heapData": 1.8916740417480469,
        "pssTotalMb": 229.099609375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1000000000931323,
          "emitP95": 1.5,
          "domP50": 6.800000000046566,
          "domP95": 8
        },
        "setKeys": {
          "emitP50": 1.6000000000931323,
          "emitP95": 2.5,
          "domP50": 2.900000000023283,
          "domP95": 12.699999999953434
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 3.1000000000931323,
          "domP50": 1.7999999999301508,
          "domP95": 4.100000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.300000000046566,
          "endLag": 1.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 7.940357208251953,
        "heapCode": 1.6936683654785156,
        "heapData": 5.722068786621094,
        "pssTotalMb": 232.3955078125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.3000000000465661,
        "domP50": 2.300000000046566,
        "domP95": 13.29999999993015
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7999999999301508,
        "domP50": 1.1999999999534339,
        "domP95": 6.800000000046566
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.400000000023283,
        "domP50": 1,
        "domP95": 5.699999999953434
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 38,
        "domP50": 1.099999999976717,
        "domP95": 38.5
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.599999999976717,
        "domP50": 5.199999999953434,
        "domP95": 8.400000000023283
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.5999999999767169,
        "domP50": 0.2999999999301508,
        "domP95": 1.1999999999534339
      },
      "append100": {
        "emitP50": 0.5999999999767169,
        "emitP95": 1,
        "domP50": 1.1999999999534339,
        "domP95": 3.8999999999068677
      },
      "heapMb": 3.9677658081054688,
      "heapCode": 1.952239990234375,
      "heapData": 1.6339683532714844,
      "pssTotalMb": 228.232421875,
      "relaunchReadyMs": 1346,
      "relaunchHeapMb": 3.257305145263672,
      "relaunchHeapCode": 1.4544525146484375,
      "relaunchHeapData": 1.443511962890625
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8999999999068677,
          "domP50": 5,
          "domP95": 8.300000000046566
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5999999999767169,
          "domP50": 5.400000000023283,
          "domP95": 9.199999999953434
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7999999999301508,
          "domP50": 1.2000000000698492,
          "domP95": 12.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 3.4608917236328125,
        "heapCode": 1.5947036743164062,
        "heapData": 1.4996719360351562,
        "pssTotalMb": 224.3359375
      },
      "500": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5,
          "domP50": 5.400000000023283,
          "domP95": 6.400000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.5,
          "domP50": 2.299999999930151,
          "domP95": 8.5
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.6000000000931323,
          "domP50": 1,
          "domP95": 7.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.5999999999767169,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.973896026611328,
        "heapCode": 1.6957931518554688,
        "heapData": 1.8916740417480469,
        "pssTotalMb": 227.8115234375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1000000000931323,
          "emitP95": 1.900000000023283,
          "domP50": 6.700000000069849,
          "domP95": 8.199999999953434
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 5.200000000069849,
          "domP50": 3.1000000000931323,
          "domP95": 9
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 4.800000000046566,
          "domP50": 1.8000000000465661,
          "domP95": 7.799999999930151
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 1.7000000000698492,
          "endLag": 1.6999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 7.938030242919922,
        "heapCode": 1.6913642883300781,
        "heapData": 5.722068786621094,
        "pssTotalMb": 232.322265625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.2000000000698492,
        "domP50": 1.2999999999301508,
        "domP95": 11.400000000023283
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.5999999999767169,
        "domP50": 3.400000000023283,
        "domP95": 6.700000000069849
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1.099999999976717,
        "domP95": 6
      },
      "loadCycle": {
        "emitP50": 0.30000000004656613,
        "emitP95": 32.29999999993015,
        "domP50": 0.5,
        "domP95": 32.699999999953434
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.7000000000698492,
        "domP50": 1,
        "domP95": 6.399999999906868
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5,
        "domP50": 0.30000000004656613,
        "domP95": 1.1999999999534339
      },
      "append100": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.6999999999534339,
        "domP50": 0.6999999999534339,
        "domP95": 7.400000000023283
      },
      "heapMb": 3.6828765869140625,
      "heapCode": 1.6845245361328125,
      "heapData": 1.6282730102539062,
      "pssTotalMb": 227.123046875,
      "relaunchReadyMs": 636.9000000000233,
      "relaunchHeapMb": 3.25787353515625,
      "relaunchHeapCode": 1.4546127319335938,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10.5,
          "emitP95": 21.900000000023283,
          "domP50": 11,
          "domP95": 23
        },
        "setKeys": {
          "emitP50": 7.399999999906868,
          "emitP95": 22.099999999976717,
          "domP50": 7.899999999906868,
          "domP95": 23.300000000046566
        },
        "replace": {
          "emitP50": 7.200000000069849,
          "emitP95": 26.5,
          "domP50": 7.900000000023283,
          "domP95": 27.100000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.800000000046566,
          "lagP95": 18.800000000046566,
          "endLag": 6.400000000023283,
          "maxBacklog": 1
        },
        "heapMb": 4.623805999755859,
        "heapCode": 2.5861778259277344,
        "heapData": 1.6091957092285156,
        "pssTotalMb": 236.78125,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 14.599999999976717,
          "domP50": 6.900000000023283,
          "domP95": 15.300000000046566
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 12.800000000046566
      },
      "500": {
        "setKey": {
          "emitP50": 9.099999999976717,
          "emitP95": 20.899999999906868,
          "domP50": 9.5,
          "domP95": 21.399999999906868
        },
        "setKeys": {
          "emitP50": 8.699999999953434,
          "emitP95": 20.699999999953434,
          "domP50": 9.099999999976717,
          "domP95": 21.199999999953434
        },
        "replace": {
          "emitP50": 9.600000000093132,
          "emitP95": 21.20000000006985,
          "domP50": 10.199999999953434,
          "domP95": 21.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 10.20000000006985,
          "endLag": 4.5,
          "maxBacklog": 1
        },
        "heapMb": 5.076412200927734,
        "heapCode": 2.6069259643554688,
        "heapData": 2.0265159606933594,
        "pssTotalMb": 237.4658203125,
        "control": {
          "emitP50": 5.800000000046566,
          "emitP95": 17.599999999976717,
          "domP50": 6,
          "domP95": 17.900000000023283
        },
        "fCommitP50": 3.3999999999068677,
        "fCommitP95": 5.099999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 11.5,
          "emitP95": 25.100000000093132,
          "domP50": 12.20000000006985,
          "domP95": 26.70000000006985
        },
        "setKeys": {
          "emitP50": 11.400000000023283,
          "emitP95": 18.70000000006985,
          "domP50": 12.599999999976717,
          "domP95": 19.800000000046566
        },
        "replace": {
          "emitP50": 22.599999999976717,
          "emitP95": 64.89999999990687,
          "domP50": 23.099999999976717,
          "domP95": 65.39999999990687
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.399999999906868,
          "lagP95": 12.900000000023283,
          "endLag": 7.699999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.31512451171875,
        "heapCode": 2.6433448791503906,
        "heapData": 6.085056304931641,
        "pssTotalMb": 239.740234375,
        "control": {
          "emitP50": 5.600000000093132,
          "emitP95": 14.79999999993015,
          "domP50": 5.800000000046566,
          "domP95": 15.099999999976717
        },
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 6.300000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.599999999976717,
        "emitP95": 17,
        "domP50": 8.099999999976717,
        "domP95": 17.599999999976717
      },
      "edit_d4": {
        "emitP50": 9.300000000046566,
        "emitP95": 21.900000000023283,
        "domP50": 10.5,
        "domP95": 22.400000000023283
      },
      "edit_d10": {
        "emitP50": 8.400000000023283,
        "emitP95": 25.800000000046566,
        "domP50": 8.699999999953434,
        "domP95": 26.400000000023283
      },
      "loadCycle": {
        "emitP50": 19,
        "emitP95": 48.79999999993015,
        "domP50": 19.400000000023283,
        "domP95": 49.199999999953434
      },
      "step": {
        "emitP50": 7.700000000069849,
        "emitP95": 15.300000000046566,
        "domP50": 8.300000000046566,
        "domP95": 19.29999999993015
      },
      "reset": {
        "emitP50": 9.099999999976717,
        "emitP95": 38.20000000006985,
        "domP50": 9.199999999953434,
        "domP95": 38.20000000006985
      },
      "append100": {
        "emitP50": 13.70000000006985,
        "emitP95": 21.900000000023283,
        "domP50": 13.900000000023283,
        "domP95": 22.70000000006985
      },
      "control": {
        "emitP50": 5.599999999976717,
        "emitP95": 13.099999999976717,
        "domP50": 6.099999999976717,
        "domP95": 13.400000000023283
      },
      "heapMb": 5.045307159423828,
      "heapCode": 2.759918212890625,
      "heapData": 1.8501396179199219,
      "pssTotalMb": 241.9736328125,
      "relaunchReadyMs": 399.39999999990687,
      "relaunchHeapMb": 4.154197692871094,
      "relaunchHeapCode": 2.0243606567382812,
      "relaunchHeapData": 1.7601356506347656
    }
  }
]
```
</details>
