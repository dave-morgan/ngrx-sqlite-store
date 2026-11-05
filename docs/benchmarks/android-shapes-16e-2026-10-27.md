# Phase 16 shapes — flat objects & hybrid workflow (2026-10-27)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.56 ms, p95 9.75 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 47 / CODE-BOUND 0 / FAIL 38

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.46 ± 0.11 | 10.28 ± 1.14 | 22.3× | FAIL | allow 8.4 (control emitP50 7.1×1) |
| flat | 50.setKey.emitP95 | 2.60 ± 2.22 | 22.16 ± 3.37 | 8.5× | PLATFORM-BOUND | allow 23.6 (control emitP95 18.0×1) |
| flat | 50.setKey.domP50 | 5.44 ± 0.11 | 11.06 ± 0.98 | 2.0× | PLATFORM-BOUND | allow 8.5 (control domP50 7.4×1) |
| flat | 50.setKey.domP95 | 10.34 ± 2.25 | 23.54 ± 3.50 | 2.3× | PLATFORM-BOUND | allow 24.1 (control domP95 18.4×1) |
| flat | 50.setKeys.emitP50 | 0.44 ± 0.05 | 15.02 ± 0.78 | 34.1× | FAIL | allow 8.0 (control emitP50 7.1×1) |
| flat | 50.setKeys.emitP95 | 3.54 ± 1.96 | 27.50 ± 4.89 | 7.8× | PLATFORM-BOUND | allow 24.8 (control emitP95 18.0×1) |
| flat | 50.setKeys.domP50 | 2.26 ± 1.73 | 15.46 ± 0.74 | 6.8× | FAIL | allow 9.9 (control domP50 7.4×1) |
| flat | 50.setKeys.domP95 | 11.56 ± 3.42 | 28.78 ± 5.10 | 2.5× | PLATFORM-BOUND | allow 26.9 (control domP95 18.4×1) |
| flat | 50.replace.emitP50 | 0.32 ± 0.04 | 9.82 ± 1.29 | 30.7× | FAIL | allow 8.5 (control emitP50 7.1×1) |
| flat | 50.replace.emitP95 | 3.38 ± 2.81 | 22.58 ± 2.29 | 6.7× | PLATFORM-BOUND | allow 23.1 (control emitP95 18.0×1) |
| flat | 50.replace.domP50 | 2.92 ± 1.96 | 10.38 ± 1.29 | 3.6× | PLATFORM-BOUND | allow 10.7 (control domP50 7.4×1) |
| flat | 50.replace.domP95 | 7.94 ± 1.68 | 23.82 ± 1.27 | 3.0× | PLATFORM-BOUND | allow 21.3 (control domP95 18.4×1) |
| flat | 50.burst.lagP50 | 0.32 ± 0.04 | 6.96 ± 0.50 | 21.7× | PLATFORM-BOUND | allow 7.7 (control emitP50 7.1×1) |
| flat | 50.burst.lagP95 | 0.88 ± 0.30 | 17.62 ± 4.77 | 20.0× | PLATFORM-BOUND | allow 23.1 (control emitP95 18.0×1) |
| flat | 50.burst.endLag | 0.28 ± 0.04 | 13.08 ± 8.50 | 46.7× | PLATFORM-BOUND | allow 15.7 (control emitP50 7.1×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 1.40 ± 0.89 | 1400000000.0× | FAIL |  |
| flat | 50.heapMb | 3.54 ± 0.13 | 4.61 ± 0.01 | 1.3× | FAIL | code +0.90 MB; data 1.50 -> 1.61 MB |
| flat | 50.pssTotalMb | 227.20 ± 1.21 | 240.92 ± 2.47 | 1.1× | FAIL | allow 6.9 (plugin baseline 3.2 MB) |
| flat | 500.setKey.emitP50 | 0.56 ± 0.05 | 10.10 ± 1.68 | 18.0× | FAIL | allow 8.6 (control emitP50 6.8×1) |
| flat | 500.setKey.emitP95 | 1.58 ± 0.45 | 20.46 ± 4.02 | 12.9× | PLATFORM-BOUND | allow 23.8 (control emitP95 19.3×1) |
| flat | 500.setKey.domP50 | 3.40 ± 2.08 | 10.72 ± 1.63 | 3.2× | PLATFORM-BOUND | allow 11.0 (control domP50 7.2×1) |
| flat | 500.setKey.domP95 | 10.70 ± 1.45 | 21.78 ± 5.44 | 2.0× | PLATFORM-BOUND | allow 26.5 (control domP95 19.6×1) |
| flat | 500.setKeys.emitP50 | 0.50 ± 0.07 | 15.52 ± 1.78 | 31.0× | FAIL | allow 8.7 (control emitP50 6.8×1) |
| flat | 500.setKeys.emitP95 | 4.66 ± 2.66 | 28.88 ± 6.28 | 6.2× | PLATFORM-BOUND | allow 28.3 (control emitP95 19.3×1) |
| flat | 500.setKeys.domP50 | 3.24 ± 1.76 | 17.10 ± 1.15 | 5.3× | FAIL | allow 10.2 (control domP50 7.2×1) |
| flat | 500.setKeys.domP95 | 10.24 ± 3.19 | 29.70 ± 5.85 | 2.9× | PLATFORM-BOUND | allow 28.7 (control domP95 19.6×1) |
| flat | 500.replace.emitP50 | 0.38 ± 0.04 | 12.86 ± 1.46 | 33.8× | FAIL | allow 8.3 (control emitP50 6.8×1) |
| flat | 500.replace.emitP95 | 1.52 ± 0.85 | 27.10 ± 4.95 | 17.8× | FAIL | allow 25.1 (control emitP95 19.3×1) |
| flat | 500.replace.domP50 | 2.18 ± 1.89 | 13.46 ± 1.44 | 6.2× | FAIL | allow 10.6 (control domP50 7.2×1) |
| flat | 500.replace.domP95 | 8.62 ± 1.89 | 27.56 ± 4.90 | 3.2× | PLATFORM-BOUND | allow 26.4 (control domP95 19.6×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 6.94 ± 0.58 | 17.3× | PLATFORM-BOUND | allow 7.4 (control emitP50 6.8×1) |
| flat | 500.burst.lagP95 | 1.06 ± 0.50 | 15.22 ± 1.22 | 14.4× | PLATFORM-BOUND | allow 21.1 (control emitP95 19.3×1) |
| flat | 500.burst.endLag | 0.36 ± 0.05 | 8.16 ± 4.29 | 22.7× | PLATFORM-BOUND | allow 11.2 (control emitP50 6.8×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 1.00 ± 0.00 | 1000000000.0× | FAIL |  |
| flat | 500.heapMb | 4.03 ± 0.13 | 5.07 ± 0.00 | 1.3× | FAIL | code +0.85 MB; data 1.89 -> 2.03 MB |
| flat | 500.pssTotalMb | 231.42 ± 1.79 | 241.50 ± 2.94 | 1.0× | FAIL | allow 7.9 (plugin baseline 3.2 MB) |
| flat | 5000.setKey.emitP50 | 1.24 ± 0.21 | 12.34 ± 1.36 | 10.0× | FAIL | allow 10.5 (control emitP50 8.9×1) |
| flat | 5000.setKey.emitP95 | 2.90 ± 2.46 | 29.08 ± 3.30 | 10.0× | PLATFORM-BOUND | allow 28.6 (control emitP95 22.8×1) |
| flat | 5000.setKey.domP50 | 6.26 ± 1.55 | 13.22 ± 1.22 | 2.1× | PLATFORM-BOUND | allow 11.9 (control domP50 9.1×1) |
| flat | 5000.setKey.domP95 | 8.86 ± 1.55 | 29.94 ± 3.63 | 3.4× | PLATFORM-BOUND | allow 28.3 (control domP95 23.1×1) |
| flat | 5000.setKeys.emitP50 | 1.70 ± 0.20 | 17.00 ± 0.45 | 10.0× | FAIL | allow 9.5 (control emitP50 8.9×1) |
| flat | 5000.setKeys.emitP95 | 6.86 ± 4.17 | 72.42 ± 7.49 | 10.6× | FAIL | allow 34.5 (control emitP95 22.8×1) |
| flat | 5000.setKeys.domP50 | 3.78 ± 0.75 | 17.94 ± 1.10 | 4.7× | FAIL | allow 11.0 (control domP50 9.1×1) |
| flat | 5000.setKeys.domP95 | 11.48 ± 2.75 | 73.18 ± 7.44 | 6.4× | FAIL | allow 33.3 (control domP95 23.1×1) |
| flat | 5000.replace.emitP50 | 0.48 ± 0.13 | 46.98 ± 1.29 | 97.9× | FAIL | allow 10.3 (control emitP50 8.9×1) |
| flat | 5000.replace.emitP95 | 3.74 ± 2.89 | 59.62 ± 5.69 | 15.9× | FAIL | allow 31.4 (control emitP95 22.8×1) |
| flat | 5000.replace.domP50 | 2.80 ± 2.13 | 47.64 ± 1.29 | 17.0× | FAIL | allow 12.6 (control domP50 9.1×1) |
| flat | 5000.replace.domP95 | 10.86 ± 4.00 | 60.20 ± 5.82 | 5.5× | FAIL | allow 33.0 (control domP95 23.1×1) |
| flat | 5000.burst.lagP50 | 1.46 ± 0.11 | 8.66 ± 1.52 | 5.9× | PLATFORM-BOUND | allow 10.5 (control emitP50 8.9×1) |
| flat | 5000.burst.lagP95 | 3.10 ± 1.25 | 15.84 ± 3.65 | 5.1× | PLATFORM-BOUND | allow 27.7 (control emitP95 22.8×1) |
| flat | 5000.burst.endLag | 1.76 ± 0.63 | 8.44 ± 0.97 | 4.8× | PLATFORM-BOUND | allow 10.5 (control emitP50 8.9×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 7.96 ± 0.11 | 9.30 ± 0.00 | 1.2× | FAIL | code +0.92 MB; data 5.72 -> 6.08 MB |
| flat | 5000.pssTotalMb | 235.56 ± 1.94 | 248.49 ± 1.17 | 1.1× | FAIL | allow 6.3 (plugin baseline 3.2 MB) |
| workflow | edit_d1.emitP50 | 0.48 ± 0.04 | 9.48 ± 1.25 | 19.7× | FAIL | allow 8.7 (control emitP50 7.4×1) |
| workflow | edit_d1.emitP95 | 1.86 ± 0.51 | 22.04 ± 3.05 | 11.8× | PLATFORM-BOUND | allow 30.2 (control emitP95 26.6×1) |
| workflow | edit_d1.domP50 | 2.14 ± 0.84 | 10.22 ± 1.10 | 4.8× | PLATFORM-BOUND | allow 10.1 (control domP50 8.2×1) |
| workflow | edit_d1.domP95 | 9.34 ± 1.49 | 23.26 ± 3.16 | 2.5× | PLATFORM-BOUND | allow 31.7 (control domP95 27.0×1) |
| workflow | edit_d4.emitP50 | 0.40 ± 0.00 | 9.42 ± 1.10 | 23.5× | FAIL | allow 8.5 (control emitP50 7.4×1) |
| workflow | edit_d4.emitP95 | 2.74 ± 1.04 | 21.70 ± 2.67 | 7.9× | PLATFORM-BOUND | allow 30.3 (control emitP95 26.6×1) |
| workflow | edit_d4.domP50 | 2.00 ± 0.65 | 10.08 ± 1.11 | 5.0× | PLATFORM-BOUND | allow 9.9 (control domP50 8.2×1) |
| workflow | edit_d4.domP95 | 9.46 ± 2.38 | 22.48 ± 2.60 | 2.4× | PLATFORM-BOUND | allow 32.0 (control domP95 27.0×1) |
| workflow | edit_d10.emitP50 | 0.46 ± 0.05 | 9.20 ± 1.89 | 20.0× | PLATFORM-BOUND | allow 9.4 (control emitP50 7.4×1) |
| workflow | edit_d10.emitP95 | 2.00 ± 0.77 | 25.28 ± 9.45 | 12.6× | PLATFORM-BOUND | allow 36.8 (control emitP95 26.6×1) |
| workflow | edit_d10.domP50 | 4.10 ± 1.54 | 9.88 ± 1.75 | 2.4× | PLATFORM-BOUND | allow 11.4 (control domP50 8.2×1) |
| workflow | edit_d10.domP95 | 9.84 ± 2.32 | 25.76 ± 9.43 | 2.6× | PLATFORM-BOUND | allow 38.8 (control domP95 27.0×1) |
| workflow | loadCycle.emitP50 | 3.22 ± 6.14 | 19.14 ± 4.88 | 5.9× | PLATFORM-BOUND | allow 25.9 (control emitP50 7.4×2) |
| workflow | loadCycle.emitP95 | 36.50 ± 4.77 | 57.30 ± 11.21 | 1.6× | PLATFORM-BOUND | allow 69.2 (control emitP95 26.6×2) |
| workflow | loadCycle.domP50 | 3.88 ± 6.95 | 19.84 ± 4.79 | 5.1× | PLATFORM-BOUND | allow 28.1 (control domP50 8.2×2) |
| workflow | loadCycle.domP95 | 37.04 ± 4.94 | 57.92 ± 11.17 | 1.6× | PLATFORM-BOUND | allow 70.2 (control domP95 27.0×2) |
| workflow | step.emitP50 | 0.32 ± 0.04 | 8.46 ± 0.64 | 26.4× | FAIL | allow 8.1 (control emitP50 7.4×1) |
| workflow | step.emitP95 | 1.14 ± 0.50 | 20.50 ± 4.12 | 18.0× | PLATFORM-BOUND | allow 31.2 (control emitP95 26.6×1) |
| workflow | step.domP50 | 1.90 ± 1.74 | 8.96 ± 0.68 | 4.7× | PLATFORM-BOUND | allow 10.6 (control domP50 8.2×1) |
| workflow | step.domP95 | 9.54 ± 1.56 | 21.00 ± 4.13 | 2.2× | PLATFORM-BOUND | allow 32.7 (control domP95 27.0×1) |
| workflow | reset.emitP50 | 0.30 ± 0.07 | 17.64 ± 3.26 | 58.8× | FAIL | allow 10.8 (control emitP50 7.4×1) |
| workflow | reset.emitP95 | 0.88 ± 0.74 | 35.32 ± 8.09 | 40.1× | PLATFORM-BOUND | allow 35.4 (control emitP95 26.6×1) |
| workflow | reset.domP50 | 0.36 ± 0.09 | 18.12 ± 2.67 | 50.3× | FAIL | allow 10.9 (control domP50 8.2×1) |
| workflow | reset.domP95 | 1.44 ± 0.52 | 35.44 ± 8.08 | 24.6× | PLATFORM-BOUND | allow 35.6 (control domP95 27.0×1) |
| workflow | append100.emitP50 | 0.40 ± 0.00 | 16.20 ± 2.06 | 40.5× | FAIL | allow 9.5 (control emitP50 7.4×1) |
| workflow | append100.emitP95 | 1.66 ± 1.19 | 21.78 ± 2.64 | 13.1× | PLATFORM-BOUND | allow 30.4 (control emitP95 26.6×1) |
| workflow | append100.domP50 | 1.28 ± 0.58 | 16.94 ± 2.00 | 13.2× | FAIL | allow 10.7 (control domP50 8.2×1) |
| workflow | append100.domP95 | 6.78 ± 2.45 | 22.38 ± 2.42 | 3.3× | PLATFORM-BOUND | allow 31.9 (control domP95 27.0×1) |
| workflow | heapMb | 3.74 ± 0.05 | 5.04 ± 0.00 | 1.3× | FAIL | code +1.01 MB; data 1.63 -> 1.85 MB |
| workflow | pssTotalMb | 229.12 ± 1.14 | 240.39 ± 1.20 | 1.0× | FAIL | allow 5.5 (plugin baseline 3.2 MB) |
| workflow | relaunchReadyMs | 1313.78 ± 319.71 | 802.96 ± 375.72 | 0.6× | PASS |  |
| workflow | relaunchHeapMb | 3.28 ± 0.04 | 4.23 ± 0.12 | 1.3× | FAIL | code +0.54 MB; data 1.44 -> 1.80 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 7.12 | 7.42 | 18.38 | 10.28 | 11.06 | 23.54 |
| 500 | 6.84 | 7.24 | 19.64 | 10.10 | 10.72 | 21.78 |
| 5000 | 8.88 | 9.14 | 23.14 | 12.34 | 13.22 | 29.94 |

<details><summary>Raw per-trial data</summary>

```json
[
  {
    "impl": "classic",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.29999999998835847,
          "emitP95": 0.5,
          "domP50": 5.400000000023283,
          "domP95": 6.600000000034925
        },
        "setKeys": {
          "emitP50": 0.3999999999650754,
          "emitP95": 1.7999999999883585,
          "domP50": 1,
          "domP95": 17
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.1000000000349246,
          "domP50": 5.7999999999883585,
          "domP95": 9.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.3999999999650754,
          "lagP95": 1.400000000023283,
          "endLag": 0.29999999998835847,
          "maxBacklog": 0
        },
        "heapMb": 3.752277374267578,
        "heapCode": 1.8693008422851562,
        "heapData": 1.5053367614746094,
        "pssTotalMb": 228.46484375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.1999999999534339,
          "domP50": 1.7999999999883585,
          "domP95": 11.600000000034925
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.2999999999883585,
          "domP50": 4.199999999953434,
          "domP95": 15.700000000011642
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 2.8999999999650754,
          "domP50": 1.099999999976717,
          "domP95": 8.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7999999999883585,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.162776947021484,
        "heapCode": 1.8769187927246094,
        "heapData": 1.8947029113769531,
        "pssTotalMb": 231.810546875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1000000000349246,
          "emitP95": 1.8999999999650754,
          "domP50": 7.100000000034925,
          "domP95": 8.099999999976717
        },
        "setKeys": {
          "emitP50": 1.6000000000349246,
          "emitP95": 10,
          "domP50": 3.599999999976717,
          "domP95": 11.099999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.7999999999883585,
          "domP50": 1.8000000000465661,
          "domP95": 11.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999883585,
          "lagP95": 2.5,
          "endLag": 2.7999999999883585,
          "maxBacklog": 0
        },
        "heapMb": 7.839092254638672,
        "heapCode": 1.6010704040527344,
        "heapData": 5.719367980957031,
        "pssTotalMb": 233.828125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.2999999999883585,
        "domP50": 1.5,
        "domP95": 8.099999999976717
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 4.099999999976717,
        "domP50": 2.2999999999883585,
        "domP95": 7.600000000034925
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.7999999999883585,
        "domP50": 5.099999999976717,
        "domP95": 7.2000000000116415
      },
      "loadCycle": {
        "emitP50": 14.199999999953434,
        "emitP95": 37.90000000002328,
        "domP50": 16.29999999998836,
        "domP95": 38.29999999998836
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6000000000349246,
        "domP50": 5,
        "domP95": 10
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 2.2000000000116415,
        "domP50": 0.29999999998835847,
        "domP95": 2.2000000000116415
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1000000000349246,
        "domP50": 1.1999999999534339,
        "domP95": 5.5
      },
      "heapMb": 3.7761001586914062,
      "heapCode": 1.7695770263671875,
      "heapData": 1.6309852600097656,
      "pssTotalMb": 228.306640625,
      "relaunchReadyMs": 755.6000000000349,
      "relaunchHeapMb": 3.2578506469726562,
      "relaunchHeapCode": 1.4545745849609375,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.800000000046566,
          "emitP95": 21.600000000034925,
          "domP50": 11.200000000011642,
          "domP95": 21.900000000023283
        },
        "setKeys": {
          "emitP50": 15.900000000023283,
          "emitP95": 22.300000000046566,
          "domP50": 16.29999999998836,
          "domP95": 23.800000000046566
        },
        "replace": {
          "emitP50": 10.5,
          "emitP95": 24.5,
          "domP50": 11.099999999976717,
          "domP95": 25.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.2999999999883585,
          "lagP95": 25.79999999998836,
          "endLag": 20.70000000001164,
          "maxBacklog": 3
        },
        "heapMb": 4.610790252685547,
        "heapCode": 2.5745620727539062,
        "heapData": 1.6078033447265625,
        "pssTotalMb": 237.79296875,
        "control": {
          "emitP50": 8.900000000023283,
          "emitP95": 20,
          "domP50": 9.199999999953434,
          "domP95": 20.20000000001164
        },
        "fCommitP50": 3.5,
        "fCommitP95": 14.599999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 11.100000000034925,
          "emitP95": 26.300000000046566,
          "domP50": 11.600000000034925,
          "domP95": 30.300000000046566
        },
        "setKeys": {
          "emitP50": 16.099999999976717,
          "emitP95": 23.400000000023283,
          "domP50": 16.5,
          "domP95": 25.20000000001164
        },
        "replace": {
          "emitP50": 12,
          "emitP95": 20.79999999998836,
          "domP50": 12.400000000023283,
          "domP95": 21.29999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.7999999999883585,
          "lagP95": 14.5,
          "endLag": 4.5,
          "maxBacklog": 1
        },
        "heapMb": 5.064716339111328,
        "heapCode": 2.5966873168945312,
        "heapData": 2.025115966796875,
        "pssTotalMb": 237.7177734375,
        "control": {
          "emitP50": 7.800000000046566,
          "emitP95": 21.099999999976717,
          "domP50": 8.100000000034925,
          "domP95": 21.399999999965075
        },
        "fCommitP50": 3.6000000000349246,
        "fCommitP95": 12.899999999965075
      },
      "5000": {
        "setKey": {
          "emitP50": 10.700000000011642,
          "emitP95": 32.40000000002328,
          "domP50": 11.599999999976717,
          "domP95": 34
        },
        "setKeys": {
          "emitP50": 17.29999999998836,
          "emitP95": 67.59999999997672,
          "domP50": 19.5,
          "domP95": 68.29999999998836
        },
        "replace": {
          "emitP50": 48.29999999998836,
          "emitP95": 66.69999999995343,
          "domP50": 49.20000000001164,
          "domP95": 67.09999999997672
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.7999999999883585,
          "lagP95": 16.099999999976717,
          "endLag": 7.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 9.302799224853516,
        "heapCode": 2.6322784423828125,
        "heapData": 6.083759307861328,
        "pssTotalMb": 247.7841796875,
        "control": {
          "emitP50": 11.299999999988358,
          "emitP95": 21.900000000023283,
          "domP50": 11.5,
          "domP95": 22.20000000001164
        },
        "fCommitP50": 3.5,
        "fCommitP95": 9.200000000011642
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.800000000046566,
        "emitP95": 25.79999999998836,
        "domP50": 9.700000000011642,
        "domP95": 26.600000000034925
      },
      "edit_d4": {
        "emitP50": 8.400000000023283,
        "emitP95": 19.099999999976717,
        "domP50": 9.5,
        "domP95": 19.5
      },
      "edit_d10": {
        "emitP50": 7.099999999976717,
        "emitP95": 24.100000000034925,
        "domP50": 7.7999999999883585,
        "domP95": 24.5
      },
      "loadCycle": {
        "emitP50": 11.299999999988358,
        "emitP95": 55.20000000001164,
        "domP50": 12.399999999965075,
        "domP95": 55.70000000001164
      },
      "step": {
        "emitP50": 9.200000000011642,
        "emitP95": 23.599999999976717,
        "domP50": 9.900000000023283,
        "domP95": 24.099999999976717
      },
      "reset": {
        "emitP50": 13.700000000011642,
        "emitP95": 24.099999999976717,
        "domP50": 15.900000000023283,
        "domP95": 24.20000000001164
      },
      "append100": {
        "emitP50": 13,
        "emitP95": 21.20000000001164,
        "domP50": 13.700000000011642,
        "domP95": 21.5
      },
      "control": {
        "emitP50": 7,
        "emitP95": 28.900000000023283,
        "domP50": 7.399999999965075,
        "domP95": 29.099999999976717
      },
      "heapMb": 5.035346984863281,
      "heapCode": 2.751068115234375,
      "heapData": 1.8490219116210938,
      "pssTotalMb": 239.107421875,
      "relaunchReadyMs": 986.8000000000466,
      "relaunchHeapMb": 4.138172149658203,
      "relaunchHeapCode": 2.0093154907226562,
      "relaunchHeapData": 1.7594871520996094
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 12.200000000011642,
          "emitP95": 25.400000000023283,
          "domP50": 12.600000000034925,
          "domP95": 27.5
        },
        "setKeys": {
          "emitP50": 15.799999999988358,
          "emitP95": 22.099999999976717,
          "domP50": 16.199999999953434,
          "domP95": 22.70000000001164
        },
        "replace": {
          "emitP50": 9.099999999976717,
          "emitP95": 23.70000000001164,
          "domP50": 9.599999999976717,
          "domP95": 24
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.7000000000116415,
          "lagP95": 15.200000000011642,
          "endLag": 23.79999999998836,
          "maxBacklog": 1
        },
        "heapMb": 4.598609924316406,
        "heapCode": 2.5602073669433594,
        "heapData": 1.6099128723144531,
        "pssTotalMb": 241.494140625,
        "control": {
          "emitP50": 6.800000000046566,
          "emitP95": 22.600000000034925,
          "domP50": 7.100000000034925,
          "domP95": 22.900000000023283
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 6.600000000034925
      },
      "500": {
        "setKey": {
          "emitP50": 9.900000000023283,
          "emitP95": 18.70000000001164,
          "domP50": 10.600000000034925,
          "domP95": 19.400000000023283
        },
        "setKeys": {
          "emitP50": 14.699999999953434,
          "emitP95": 31.199999999953434,
          "domP50": 15.5,
          "domP95": 31.5
        },
        "replace": {
          "emitP50": 11.799999999988358,
          "emitP95": 28.099999999976717,
          "domP50": 12.400000000023283,
          "domP95": 28.899999999965075
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.599999999976717,
          "lagP95": 13.5,
          "endLag": 6.400000000023283,
          "maxBacklog": 1
        },
        "heapMb": 5.064701080322266,
        "heapCode": 2.5966033935546875,
        "heapData": 2.0251197814941406,
        "pssTotalMb": 242.1064453125,
        "control": {
          "emitP50": 6.7999999999883585,
          "emitP95": 22.29999999998836,
          "domP50": 7.2000000000116415,
          "domP95": 22.599999999976717
        },
        "fCommitP50": 3.2000000000116415,
        "fCommitP95": 10.200000000011642
      },
      "5000": {
        "setKey": {
          "emitP50": 13.599999999976717,
          "emitP95": 23.70000000001164,
          "domP50": 14.200000000011642,
          "domP95": 24.199999999953434
        },
        "setKeys": {
          "emitP50": 17.099999999976717,
          "emitP95": 63.79999999998836,
          "domP50": 17.5,
          "domP95": 64.5
        },
        "replace": {
          "emitP50": 48.100000000034925,
          "emitP95": 55.70000000001164,
          "domP50": 48.59999999997672,
          "domP95": 56.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.5,
          "lagP95": 12.599999999976717,
          "endLag": 8.299999999988358,
          "maxBacklog": 2
        },
        "heapMb": 9.301460266113281,
        "heapCode": 2.6310958862304688,
        "heapData": 6.083656311035156,
        "pssTotalMb": 246.908203125,
        "control": {
          "emitP50": 7,
          "emitP95": 21.399999999965075,
          "domP50": 7.2000000000116415,
          "domP95": 21.79999999998836
        },
        "fCommitP50": 3.6000000000349246,
        "fCommitP95": 6.100000000034925
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8,
        "emitP95": 19.5,
        "domP50": 9,
        "domP95": 20.400000000023283
      },
      "edit_d4": {
        "emitP50": 9,
        "emitP95": 22.800000000046566,
        "domP50": 9.29999999993015,
        "domP95": 23.400000000023283
      },
      "edit_d10": {
        "emitP50": 10.100000000093132,
        "emitP95": 27.699999999953434,
        "domP50": 10.699999999953434,
        "domP95": 28.099999999976717
      },
      "loadCycle": {
        "emitP50": 20.79999999993015,
        "emitP95": 49,
        "domP50": 21.599999999976717,
        "domP95": 49.59999999997672
      },
      "step": {
        "emitP50": 8.900000000023283,
        "emitP95": 24.699999999953434,
        "domP50": 9.100000000093132,
        "domP95": 25.099999999976717
      },
      "reset": {
        "emitP50": 16.800000000046566,
        "emitP95": 33.29999999993015,
        "domP50": 16.900000000023283,
        "domP95": 33.5
      },
      "append100": {
        "emitP50": 16,
        "emitP95": 20,
        "domP50": 17.699999999953434,
        "domP95": 21.599999999976717
      },
      "control": {
        "emitP50": 7.5,
        "emitP95": 25.5,
        "domP50": 9.199999999953434,
        "domP95": 25.699999999953434
      },
      "heapMb": 5.0363616943359375,
      "heapCode": 2.750011444091797,
      "heapData": 1.8511123657226562,
      "pssTotalMb": 239.0693359375,
      "relaunchReadyMs": 1159.6999999999534,
      "relaunchHeapMb": 4.14459228515625,
      "relaunchHeapCode": 2.0155067443847656,
      "relaunchHeapData": 1.7594108581542969
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.5,
          "domP50": 5.300000000046566,
          "domP95": 11.5
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 6.699999999953434,
          "domP50": 1.7000000000698492,
          "domP95": 8.29999999993015
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.5,
          "domP50": 3.5,
          "domP95": 6.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.8000000000465661,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.5630760192871094,
        "heapCode": 1.6881790161132812,
        "heapData": 1.5023841857910156,
        "pssTotalMb": 226.240234375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.400000000023283,
          "domP50": 2.400000000023283,
          "domP95": 10.699999999953434
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 5.700000000069849,
          "domP50": 5.400000000023283,
          "domP95": 9.699999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.2999999999301508,
          "domP50": 1.400000000023283,
          "domP95": 11.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.973857879638672,
        "heapCode": 1.6957550048828125,
        "heapData": 1.8916740417480469,
        "pssTotalMb": 229.609375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1000000000931323,
          "emitP95": 1.6999999999534339,
          "domP50": 6.900000000023283,
          "domP95": 8.29999999993015
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 3.099999999976717,
          "domP50": 3.5,
          "domP95": 14.599999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.199999999953434,
          "domP50": 1.7000000000698492,
          "domP95": 5.799999999930151
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999068677,
          "lagP95": 1.8999999999068677,
          "endLag": 1.6999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 7.938091278076172,
        "heapCode": 1.6914253234863281,
        "heapData": 5.722068786621094,
        "pssTotalMb": 233.4970703125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.900000000023283,
        "domP50": 3.199999999953434,
        "domP95": 9.20000000006985
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.5,
        "domP50": 1.6999999999534339,
        "domP95": 8.29999999993015
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 2.5,
        "domP50": 3.199999999953434,
        "domP95": 10
      },
      "loadCycle": {
        "emitP50": 0.6000000000931323,
        "emitP95": 34,
        "domP50": 0.7000000000698492,
        "domP95": 34.40000000002328
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.900000000023283,
        "domP50": 1.1999999999534339,
        "domP95": 10.699999999953434
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 0.30000000004656613,
        "domP95": 1.6999999999534339
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 3.699999999953434,
        "domP50": 2.200000000069849,
        "domP95": 11.099999999976717
      },
      "heapMb": 3.7764053344726562,
      "heapCode": 1.7694244384765625,
      "heapData": 1.6309852600097656,
      "pssTotalMb": 227.517578125,
      "relaunchReadyMs": 1407.8000000000466,
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
          "emitP50": 0.5,
          "emitP95": 1.7000000000698492,
          "domP50": 5.599999999976717,
          "domP95": 10.29999999993015
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.599999999976717,
          "domP50": 1.5,
          "domP95": 9.599999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.5,
          "domP50": 1,
          "domP95": 8.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.7999999999301508,
          "endLag": 0.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 3.460826873779297,
        "heapCode": 1.5946884155273438,
        "heapData": 1.4996528625488281,
        "pssTotalMb": 225.6484375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 2.199999999953434,
          "domP50": 5.599999999976717,
          "domP95": 12.199999999953434
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.800000000046566,
          "domP50": 1.7999999999301508,
          "domP95": 9.599999999976717
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.6000000000931323,
          "domP50": 1.900000000023283,
          "domP95": 7.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.973857879638672,
        "heapCode": 1.6957550048828125,
        "heapData": 1.8916740417480469,
        "pssTotalMb": 229.9833984375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.2000000000698492,
          "emitP95": 1.900000000023283,
          "domP50": 7.099999999976717,
          "domP95": 8.5
        },
        "setKeys": {
          "emitP50": 2,
          "emitP95": 12.199999999953434,
          "domP50": 5.100000000093132,
          "domP95": 14
        },
        "replace": {
          "emitP50": 0.6999999999534339,
          "emitP95": 8.79999999993015,
          "domP50": 6.599999999976717,
          "domP95": 15.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.6000000000931323,
          "lagP95": 4.5,
          "endLag": 1.7999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 7.941230773925781,
        "heapCode": 1.6944160461425781,
        "heapData": 5.722080230712891,
        "pssTotalMb": 235.9052734375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.900000000023283,
        "domP50": 1.5,
        "domP95": 11.400000000023283
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.3999999999068677,
        "domP50": 3,
        "domP95": 13.599999999976717
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 2.099999999976717,
        "domP50": 5.200000000069849,
        "domP95": 10.599999999976717
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 32.29999999993015,
        "domP50": 0.7000000000698492,
        "domP95": 32.79999999993015
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.099999999976717,
        "domP50": 1.3000000000465661,
        "domP95": 10
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 0.40000000002328306,
        "domP95": 1.1000000000931323
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1.3999999999068677,
        "domP95": 6.300000000046566
      },
      "heapMb": 3.682323455810547,
      "heapCode": 1.6844291687011719,
      "heapData": 1.6282730102539062,
      "pssTotalMb": 229.880859375,
      "relaunchReadyMs": 1424.0999999999767,
      "relaunchHeapMb": 3.2578353881835938,
      "relaunchHeapCode": 1.4545745849609375,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.199999999953434,
          "emitP95": 16.800000000046566,
          "domP50": 10,
          "domP95": 18.400000000023283
        },
        "setKeys": {
          "emitP50": 14.699999999953434,
          "emitP95": 31.20000000006985,
          "domP50": 15.199999999953434,
          "domP95": 31.599999999976717
        },
        "replace": {
          "emitP50": 9.399999999906868,
          "emitP95": 19.5,
          "domP50": 9.699999999953434,
          "domP95": 23
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.900000000023283,
          "lagP95": 13.70000000006985,
          "endLag": 7.800000000046566,
          "maxBacklog": 1
        },
        "heapMb": 4.6110382080078125,
        "heapCode": 2.5745315551757812,
        "heapData": 1.6080436706542969,
        "pssTotalMb": 238.935546875,
        "control": {
          "emitP50": 6.299999999930151,
          "emitP95": 15.29999999993015,
          "domP50": 6.599999999976717,
          "domP95": 15.5
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 11.5
      },
      "500": {
        "setKey": {
          "emitP50": 8.29999999993015,
          "emitP95": 18.100000000093132,
          "domP50": 9,
          "domP95": 18.5
        },
        "setKeys": {
          "emitP50": 13.100000000093132,
          "emitP95": 38.800000000046566,
          "domP50": 17.900000000023283,
          "domP95": 39.199999999953434
        },
        "replace": {
          "emitP50": 12.70000000006985,
          "emitP95": 23.900000000023283,
          "domP50": 13.20000000006985,
          "domP95": 24.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.400000000023283,
          "lagP95": 15.79999999993015,
          "endLag": 15.5,
          "maxBacklog": 1
        },
        "heapMb": 5.064750671386719,
        "heapCode": 2.5967178344726562,
        "heapData": 2.0251197814941406,
        "pssTotalMb": 244.060546875,
        "control": {
          "emitP50": 7.199999999953434,
          "emitP95": 14.800000000046566,
          "domP50": 7.699999999953434,
          "domP95": 15.199999999953434
        },
        "fCommitP50": 3.299999999930151,
        "fCommitP95": 8.79999999993015
      },
      "5000": {
        "setKey": {
          "emitP50": 11.599999999976717,
          "emitP95": 30.899999999906868,
          "domP50": 13.400000000023283,
          "domP95": 31.5
        },
        "setKeys": {
          "emitP50": 16.199999999953434,
          "emitP95": 72.10000000009313,
          "domP50": 16.600000000093132,
          "domP95": 73.30000000004657
        },
        "replace": {
          "emitP50": 45.5,
          "emitP95": 54.800000000046566,
          "domP50": 46.40000000002328,
          "domP95": 55.40000000002328
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.400000000023283,
          "lagP95": 13.199999999953434,
          "endLag": 7.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.303123474121094,
        "heapCode": 2.6324462890625,
        "heapData": 6.083904266357422,
        "pssTotalMb": 249.0546875,
        "control": {
          "emitP50": 7.400000000023283,
          "emitP95": 24.300000000046566,
          "domP50": 7.800000000046566,
          "domP95": 24.5
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 7.400000000023283
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 11.20000000006985,
        "emitP95": 20,
        "domP50": 11.70000000006985,
        "domP95": 21.099999999976717
      },
      "edit_d4": {
        "emitP50": 8.599999999976717,
        "emitP95": 20,
        "domP50": 9.300000000046566,
        "domP95": 21.29999999993015
      },
      "edit_d10": {
        "emitP50": 8.400000000023283,
        "emitP95": 16.400000000023283,
        "domP50": 9.099999999976717,
        "domP95": 16.900000000023283
      },
      "loadCycle": {
        "emitP50": 19.20000000006985,
        "emitP95": 48.40000000002328,
        "domP50": 19.70000000006985,
        "domP95": 49.20000000006985
      },
      "step": {
        "emitP50": 7.799999999930151,
        "emitP95": 14.5,
        "domP50": 8.300000000046566,
        "domP95": 14.800000000046566
      },
      "reset": {
        "emitP50": 22.400000000023283,
        "emitP95": 33.29999999993015,
        "domP50": 22.400000000023283,
        "domP95": 33.40000000002328
      },
      "append100": {
        "emitP50": 16,
        "emitP95": 24.800000000046566,
        "domP50": 16.400000000023283,
        "domP95": 25.100000000093132
      },
      "control": {
        "emitP50": 7.400000000023283,
        "emitP95": 25.800000000046566,
        "domP50": 7.599999999976717,
        "domP95": 27
      },
      "heapMb": 5.039066314697266,
      "heapCode": 2.749652862548828,
      "heapData": 1.8541641235351562,
      "pssTotalMb": 240.9814453125,
      "relaunchReadyMs": 383.29999999993015,
      "relaunchHeapMb": 4.442070007324219,
      "relaunchHeapCode": 2.0169601440429688,
      "relaunchHeapData": 1.8207283020019531
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10.199999999953434,
          "emitP95": 22.400000000023283,
          "domP50": 11,
          "domP95": 24.599999999976717
        },
        "setKeys": {
          "emitP50": 14.20000000006985,
          "emitP95": 30,
          "domP50": 14.70000000006985,
          "domP95": 33.300000000046566
        },
        "replace": {
          "emitP50": 11.70000000006985,
          "emitP95": 20.800000000046566,
          "domP50": 12.300000000046566,
          "domP95": 22.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.400000000023283,
          "lagP95": 15.900000000023283,
          "endLag": 7.699999999953434,
          "maxBacklog": 1
        },
        "heapMb": 4.611263275146484,
        "heapCode": 2.5747528076171875,
        "heapData": 1.608062744140625,
        "pssTotalMb": 243.2763671875,
        "control": {
          "emitP50": 6.899999999906868,
          "emitP95": 15.699999999953434,
          "domP50": 7.199999999953434,
          "domP95": 16.400000000023283
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 6.699999999953434
      },
      "500": {
        "setKey": {
          "emitP50": 8.800000000046566,
          "emitP95": 16.400000000023283,
          "domP50": 9.400000000023283,
          "domP95": 16.800000000046566
        },
        "setKeys": {
          "emitP50": 15.800000000046566,
          "emitP95": 24.800000000046566,
          "domP50": 17.199999999953434,
          "domP95": 26
        },
        "replace": {
          "emitP50": 12.400000000023283,
          "emitP95": 29,
          "domP50": 13.400000000023283,
          "domP95": 29.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7,
          "lagP95": 15.70000000006985,
          "endLag": 8,
          "maxBacklog": 1
        },
        "heapMb": 5.065959930419922,
        "heapCode": 2.597057342529297,
        "heapData": 2.0251197814941406,
        "pssTotalMb": 244.36328125,
        "control": {
          "emitP50": 6,
          "emitP95": 24,
          "domP50": 6.400000000023283,
          "domP95": 24.199999999953434
        },
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 10.5
      },
      "5000": {
        "setKey": {
          "emitP50": 13.900000000023283,
          "emitP95": 28.900000000023283,
          "domP50": 14.5,
          "domP95": 29.300000000046566
        },
        "setKeys": {
          "emitP50": 17.199999999953434,
          "emitP95": 83.30000000004657,
          "domP50": 17.599999999976717,
          "domP95": 83.90000000002328
        },
        "replace": {
          "emitP50": 47.199999999953434,
          "emitP95": 56,
          "domP50": 47.699999999953434,
          "domP95": 56.40000000002328
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.29999999993015,
          "lagP95": 15.5,
          "endLag": 8.29999999993015,
          "maxBacklog": 2
        },
        "heapMb": 9.30112075805664,
        "heapCode": 2.6304054260253906,
        "heapData": 6.083904266357422,
        "pssTotalMb": 249.908203125,
        "control": {
          "emitP50": 8.900000000023283,
          "emitP95": 20.5,
          "domP50": 9.20000000006985,
          "domP95": 20.79999999993015
        },
        "fCommitP50": 3.800000000046566,
        "fCommitP95": 11.79999999993015
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.199999999953434,
        "emitP95": 20,
        "domP50": 9.699999999953434,
        "domP95": 21.400000000023283
      },
      "edit_d4": {
        "emitP50": 10.099999999976717,
        "emitP95": 20.800000000046566,
        "domP50": 10.400000000023283,
        "domP95": 21.800000000046566
      },
      "edit_d10": {
        "emitP50": 8.400000000023283,
        "emitP95": 18.100000000093132,
        "domP50": 9.400000000023283,
        "domP95": 18.70000000006985
      },
      "loadCycle": {
        "emitP50": 19.699999999953434,
        "emitP95": 57.89999999990687,
        "domP50": 19.900000000023283,
        "domP95": 58.5
      },
      "step": {
        "emitP50": 7.799999999930151,
        "emitP95": 18.5,
        "domP50": 8.29999999993015,
        "domP95": 19.29999999993015
      },
      "reset": {
        "emitP50": 19,
        "emitP95": 40.59999999997672,
        "domP50": 19,
        "domP95": 40.699999999953434
      },
      "append100": {
        "emitP50": 18.300000000046566,
        "emitP95": 24.20000000006985,
        "domP50": 18.70000000006985,
        "domP95": 24.5
      },
      "control": {
        "emitP50": 8.300000000046566,
        "emitP95": 25.100000000093132,
        "domP50": 8.599999999976717,
        "domP95": 25.400000000023283
      },
      "heapMb": 5.039268493652344,
      "heapCode": 2.749866485595703,
      "heapData": 1.8541641235351562,
      "pssTotalMb": 241.328125,
      "relaunchReadyMs": 410.70000000006985,
      "relaunchHeapMb": 4.207393646240234,
      "relaunchHeapCode": 2.0170059204101562,
      "relaunchHeapData": 1.8207359313964844
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.39999999990686774,
          "emitP95": 3.099999999976717,
          "domP50": 5.5,
          "domP95": 10.800000000046566
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.5,
          "domP50": 1.8000000000465661,
          "domP95": 12.599999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 7.099999999976717,
          "domP50": 3.099999999976717,
          "domP95": 9.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.4606170654296875,
        "heapCode": 1.5944290161132812,
        "heapData": 1.4996719360351562,
        "pssTotalMb": 227.6103515625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.900000000023283,
          "domP50": 5.700000000069849,
          "domP95": 8.400000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 5.400000000023283,
          "domP50": 1.1000000000931323,
          "domP95": 7.400000000023283
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.599999999976717,
          "domP50": 1,
          "domP95": 6.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.5999999999767169,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.162528991699219,
        "heapCode": 1.8757095336914062,
        "heapData": 1.8948936462402344,
        "pssTotalMb": 234.1240234375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 7.299999999930151,
          "domP50": 3.5,
          "domP95": 11.599999999976717
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 2.799999999930151,
          "domP50": 3.5,
          "domP95": 9.199999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.200000000069849,
          "domP50": 1.8000000000465661,
          "domP95": 13.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.199999999953434,
          "endLag": 1.1999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 8.129898071289062,
        "heapCode": 1.8741607666015625,
        "heapData": 5.725597381591797,
        "pssTotalMb": 238.2216796875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1,
        "domP50": 1.599999999976717,
        "domP95": 10.20000000006985
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.300000000046566,
        "domP50": 1.400000000023283,
        "domP95": 8.599999999976717
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.7999999999301508,
        "domP50": 5.200000000069849,
        "domP95": 13.20000000006985
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 44.20000000006985,
        "domP50": 1.099999999976717,
        "domP95": 45.09999999997672
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1,
        "domP95": 6.800000000046566
      },
      "reset": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.5999999999767169,
        "domP50": 0.5,
        "domP95": 1.3000000000465661
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 0.8000000000465661,
        "domP95": 5.799999999930151
      },
      "heapMb": 3.682933807373047,
      "heapCode": 1.6845703125,
      "heapData": 1.6282730102539062,
      "pssTotalMb": 229.8232421875,
      "relaunchReadyMs": 1408,
      "relaunchHeapMb": 3.3518905639648438,
      "relaunchHeapCode": 1.5398712158203125,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 6.199999999953434,
          "domP50": 5.400000000023283,
          "domP95": 12.5
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.099999999976717,
          "domP50": 5.300000000046566,
          "domP95": 10.300000000046566
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 5.700000000069849,
          "domP50": 1.2000000000698492,
          "domP95": 6.200000000069849
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.8000000000465661,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.4608917236328125,
        "heapCode": 1.5947036743164062,
        "heapData": 1.4996719360351562,
        "pssTotalMb": 228.046875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.1999999999534339,
          "domP50": 1.5,
          "domP95": 10.599999999976717
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 8.099999999976717,
          "domP50": 3.700000000069849,
          "domP95": 8.800000000046566
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.2000000000698492,
          "domP50": 5.5,
          "domP95": 9.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1.900000000023283,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.871784210205078,
        "heapCode": 1.6023101806640625,
        "heapData": 1.8889617919921875,
        "pssTotalMb": 231.5634765625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1999999999534339,
          "emitP95": 1.6999999999534339,
          "domP50": 6.700000000069849,
          "domP95": 7.799999999930151
        },
        "setKeys": {
          "emitP50": 1.8000000000465661,
          "emitP95": 6.199999999953434,
          "domP50": 3.199999999953434,
          "domP95": 8.5
        },
        "replace": {
          "emitP50": 0.5,
          "emitP95": 1.6999999999534339,
          "domP50": 2.099999999976717,
          "domP95": 8
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 4.400000000023283,
          "endLag": 1.3000000000465661,
          "maxBacklog": 0
        },
        "heapMb": 7.938030242919922,
        "heapCode": 1.6913642883300781,
        "heapData": 5.722068786621094,
        "pssTotalMb": 236.3623046875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 2.200000000069849,
        "domP50": 2.900000000023283,
        "domP95": 7.799999999930151
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 3.3999999999068677,
        "domP50": 1.599999999976717,
        "domP95": 9.20000000006985
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1.8000000000465661,
        "domP95": 8.199999999953434
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 34.09999999997672,
        "domP50": 0.5999999999767169,
        "domP95": 34.59999999997672
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.2999999999301508,
        "domP50": 1,
        "domP95": 10.199999999953434
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 0.30000000004656613,
        "domP95": 0.9000000000232831
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.6999999999534339,
        "domP50": 0.7999999999301508,
        "domP95": 5.199999999953434
      },
      "heapMb": 3.7760581970214844,
      "heapCode": 1.7695350646972656,
      "heapData": 1.6309852600097656,
      "pssTotalMb": 230.0751953125,
      "relaunchReadyMs": 1573.4000000000233,
      "relaunchHeapMb": 3.2578353881835938,
      "relaunchHeapCode": 1.4545745849609375,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10,
          "emitP95": 24.599999999976717,
          "domP50": 10.5,
          "domP95": 25.29999999993015
        },
        "setKeys": {
          "emitP50": 14.5,
          "emitP95": 31.900000000023283,
          "domP50": 14.899999999906868,
          "domP95": 32.5
        },
        "replace": {
          "emitP50": 8.400000000023283,
          "emitP95": 24.400000000023283,
          "domP50": 9.20000000006985,
          "domP95": 24.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.5,
          "lagP95": 17.5,
          "endLag": 5.400000000023283,
          "maxBacklog": 1
        },
        "heapMb": 4.6108245849609375,
        "heapCode": 2.5743141174316406,
        "heapData": 1.6080474853515625,
        "pssTotalMb": 243.1171875,
        "control": {
          "emitP50": 6.700000000069849,
          "emitP95": 16.400000000023283,
          "domP50": 7,
          "domP95": 16.900000000023283
        },
        "fCommitP50": 4,
        "fCommitP95": 13.400000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 12.400000000023283,
          "emitP95": 22.79999999993015,
          "domP50": 13,
          "domP95": 23.899999999906868
        },
        "setKeys": {
          "emitP50": 17.900000000023283,
          "emitP95": 26.20000000006985,
          "domP50": 18.400000000023283,
          "domP95": 26.599999999976717
        },
        "replace": {
          "emitP50": 15.399999999906868,
          "emitP95": 33.699999999953434,
          "domP50": 15.899999999906868,
          "domP95": 34
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.899999999906868,
          "lagP95": 16.599999999976717,
          "endLag": 6.400000000023283,
          "maxBacklog": 1
        },
        "heapMb": 5.067501068115234,
        "heapCode": 2.5990676879882812,
        "heapData": 2.0253639221191406,
        "pssTotalMb": 239.255859375,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 14.5,
          "domP50": 6.800000000046566,
          "domP95": 14.800000000046566
        },
        "fCommitP50": 3.5,
        "fCommitP95": 9.900000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 11.900000000023283,
          "emitP95": 29.5,
          "domP50": 12.400000000023283,
          "domP95": 30.699999999953434
        },
        "setKeys": {
          "emitP50": 17.199999999953434,
          "emitP95": 75.29999999993015,
          "domP50": 18.5,
          "domP95": 75.89999999990687
        },
        "replace": {
          "emitP50": 45.800000000046566,
          "emitP95": 64.90000000002328,
          "domP50": 46.300000000046566,
          "domP95": 66
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 11.300000000046566,
          "lagP95": 21.79999999993015,
          "endLag": 10.100000000093132,
          "maxBacklog": 2
        },
        "heapMb": 9.301921844482422,
        "heapCode": 2.6312522888183594,
        "heapData": 6.083904266357422,
        "pssTotalMb": 248.8115234375,
        "control": {
          "emitP50": 9.79999999993015,
          "emitP95": 26,
          "domP50": 10,
          "domP95": 26.400000000023283
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 6.599999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 10.199999999953434,
        "emitP95": 24.900000000023283,
        "domP50": 11,
        "domP95": 26.800000000046566
      },
      "edit_d4": {
        "emitP50": 11,
        "emitP95": 25.800000000046566,
        "domP50": 11.900000000023283,
        "domP95": 26.400000000023283
      },
      "edit_d10": {
        "emitP50": 12,
        "emitP95": 40.09999999997672,
        "domP50": 12.400000000023283,
        "domP95": 40.59999999997672
      },
      "loadCycle": {
        "emitP50": 24.70000000006985,
        "emitP95": 76,
        "domP50": 25.599999999976717,
        "domP95": 76.59999999997672
      },
      "step": {
        "emitP50": 8.599999999976717,
        "emitP95": 21.199999999953434,
        "domP50": 9.199999999953434,
        "domP95": 21.699999999953434
      },
      "reset": {
        "emitP50": 16.300000000046566,
        "emitP95": 45.300000000046566,
        "domP50": 16.400000000023283,
        "domP95": 45.40000000002328
      },
      "append100": {
        "emitP50": 17.70000000006985,
        "emitP95": 18.699999999953434,
        "domP50": 18.20000000006985,
        "domP95": 19.199999999953434
      },
      "control": {
        "emitP50": 6.900000000023283,
        "emitP95": 27.699999999953434,
        "domP50": 8,
        "domP95": 28
      },
      "heapMb": 5.034130096435547,
      "heapCode": 2.749919891357422,
      "heapData": 1.8489608764648438,
      "pssTotalMb": 241.4462890625,
      "relaunchReadyMs": 1074.3000000000466,
      "relaunchHeapMb": 4.2052459716796875,
      "relaunchHeapCode": 2.014739990234375,
      "relaunchHeapData": 1.8208045959472656
    }
  }
]
```
</details>
