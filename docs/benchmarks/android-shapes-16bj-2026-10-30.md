# Phase 16 shapes — flat objects & hybrid workflow (2026-10-30)

Measured alone on `emulator-5556` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.55 ms, p95 6.72 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 2 / PLATFORM-BOUND 54 / CODE-BOUND 0 / FAIL 30

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.32 ± 0.08 | 9.24 ± 0.70 | 28.9× | FAIL | allow 7.6 (control emitP50 6.8×1) |
| flat | 50.setKey.emitP95 | 0.66 ± 0.26 | 22.32 ± 2.07 | 33.8× | PLATFORM-BOUND | allow 23.1 (control emitP95 20.8×1) |
| flat | 50.setKey.domP50 | 5.50 ± 0.35 | 10.28 ± 1.26 | 1.9× | PLATFORM-BOUND | allow 9.0 (control domP50 7.4×1) |
| flat | 50.setKey.domP95 | 7.44 ± 0.65 | 23.98 ± 2.10 | 3.2× | PLATFORM-BOUND | allow 23.8 (control domP95 21.0×1) |
| flat | 50.setKeys.emitP50 | 0.36 ± 0.05 | 8.90 ± 1.17 | 24.7× | FAIL | allow 8.1 (control emitP50 6.8×1) |
| flat | 50.setKeys.emitP95 | 1.84 ± 1.92 | 21.12 ± 4.10 | 11.5× | PLATFORM-BOUND | allow 26.8 (control emitP95 20.8×1) |
| flat | 50.setKeys.domP50 | 3.96 ± 2.15 | 9.80 ± 0.92 | 2.5× | PLATFORM-BOUND | allow 10.4 (control domP50 7.4×1) |
| flat | 50.setKeys.domP95 | 9.42 ± 2.23 | 22.12 ± 3.75 | 2.3× | PLATFORM-BOUND | allow 27.0 (control domP95 21.0×1) |
| flat | 50.replace.emitP50 | 0.36 ± 0.05 | 8.84 ± 1.99 | 24.6× | PLATFORM-BOUND | allow 8.9 (control emitP50 6.8×1) |
| flat | 50.replace.emitP95 | 3.08 ± 3.43 | 22.50 ± 3.14 | 7.3× | PLATFORM-BOUND | allow 27.3 (control emitP95 20.8×1) |
| flat | 50.replace.domP50 | 3.30 ± 1.96 | 9.28 ± 1.92 | 2.8× | PLATFORM-BOUND | allow 11.2 (control domP50 7.4×1) |
| flat | 50.replace.domP95 | 10.28 ± 2.71 | 22.98 ± 3.04 | 2.2× | PLATFORM-BOUND | allow 26.8 (control domP95 21.0×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 6.04 ± 0.32 | 20.1× | PLATFORM-BOUND | allow 7.2 (control emitP50 6.8×1) |
| flat | 50.burst.lagP95 | 0.76 ± 0.25 | 15.46 ± 2.99 | 20.3× | PLATFORM-BOUND | allow 24.0 (control emitP95 20.8×1) |
| flat | 50.burst.endLag | 0.32 ± 0.11 | 6.42 ± 0.70 | 20.1× | PLATFORM-BOUND | allow 7.7 (control emitP50 6.8×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.80 ± 0.45 | 2800000000.0× | FAIL |  |
| flat | 50.heapMb | 3.67 ± 0.12 | 5.08 ± 0.00 | 1.4× | FAIL | code +1.23 MB; data 1.50 -> 1.62 MB |
| flat | 50.pssTotalMb | 222.79 ± 1.92 | 234.68 ± 1.31 | 1.1× | FAIL | allow 7.2 (plugin baseline 4.0 MB) |
| flat | 500.setKey.emitP50 | 0.44 ± 0.09 | 9.52 ± 0.84 | 21.6× | FAIL | allow 7.1 (control emitP50 6.1×1) |
| flat | 500.setKey.emitP95 | 1.84 ± 1.46 | 24.82 ± 4.86 | 13.5× | PLATFORM-BOUND | allow 26.7 (control emitP95 20.4×1) |
| flat | 500.setKey.domP50 | 4.26 ± 1.47 | 10.06 ± 0.84 | 2.4× | PLATFORM-BOUND | allow 8.8 (control domP50 6.5×1) |
| flat | 500.setKey.domP95 | 8.24 ± 1.08 | 25.38 ± 4.84 | 3.1× | PLATFORM-BOUND | allow 26.5 (control domP95 20.6×1) |
| flat | 500.setKeys.emitP50 | 0.48 ± 0.08 | 9.64 ± 1.01 | 20.1× | FAIL | allow 7.2 (control emitP50 6.1×1) |
| flat | 500.setKeys.emitP95 | 6.28 ± 5.44 | 22.38 ± 4.86 | 3.6× | PLATFORM-BOUND | allow 30.7 (control emitP95 20.4×1) |
| flat | 500.setKeys.domP50 | 3.94 ± 1.88 | 10.18 ± 0.99 | 2.6× | PLATFORM-BOUND | allow 9.3 (control domP50 6.5×1) |
| flat | 500.setKeys.domP95 | 12.46 ± 3.49 | 24.88 ± 4.49 | 2.0× | PLATFORM-BOUND | allow 28.6 (control domP95 20.6×1) |
| flat | 500.replace.emitP50 | 0.34 ± 0.05 | 9.46 ± 1.22 | 27.8× | FAIL | allow 7.4 (control emitP50 6.1×1) |
| flat | 500.replace.emitP95 | 1.76 ± 1.06 | 20.26 ± 4.15 | 11.5× | PLATFORM-BOUND | allow 25.6 (control emitP95 20.4×1) |
| flat | 500.replace.domP50 | 3.00 ± 1.58 | 9.94 ± 1.22 | 3.3× | PLATFORM-BOUND | allow 9.3 (control domP50 6.5×1) |
| flat | 500.replace.domP95 | 7.86 ± 1.68 | 20.90 ± 4.26 | 2.7× | PLATFORM-BOUND | allow 26.6 (control domP95 20.6×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 7.16 ± 0.74 | 17.9× | PLATFORM-BOUND | allow 6.9 (control emitP50 6.1×1) |
| flat | 500.burst.lagP95 | 0.80 ± 0.07 | 18.82 ± 2.20 | 23.5× | PLATFORM-BOUND | allow 22.6 (control emitP95 20.4×1) |
| flat | 500.burst.endLag | 0.42 ± 0.08 | 7.50 ± 1.91 | 17.9× | PLATFORM-BOUND | allow 8.1 (control emitP50 6.1×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.40 ± 0.55 | 2400000000.0× | FAIL |  |
| flat | 500.heapMb | 4.00 ± 0.13 | 5.57 ± 0.01 | 1.4× | FAIL | code +1.32 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 225.38 ± 2.55 | 235.18 ± 1.96 | 1.0× | FAIL | allow 8.5 (plugin baseline 4.0 MB) |
| flat | 5000.setKey.emitP50 | 1.60 ± 0.07 | 10.44 ± 0.71 | 6.5× | FAIL | allow 7.2 (control emitP50 6.4×1) |
| flat | 5000.setKey.emitP95 | 6.94 ± 4.18 | 26.02 ± 4.20 | 3.7× | PLATFORM-BOUND | allow 29.0 (control emitP95 20.7×1) |
| flat | 5000.setKey.domP50 | 4.48 ± 1.21 | 11.28 ± 0.48 | 2.5× | PLATFORM-BOUND | allow 8.3 (control domP50 6.6×1) |
| flat | 5000.setKey.domP95 | 11.20 ± 1.93 | 26.66 ± 4.33 | 2.4× | PLATFORM-BOUND | allow 27.3 (control domP95 21.0×1) |
| flat | 5000.setKeys.emitP50 | 1.50 ± 0.07 | 10.90 ± 1.06 | 7.3× | FAIL | allow 7.5 (control emitP50 6.4×1) |
| flat | 5000.setKeys.emitP95 | 2.60 ± 0.92 | 28.12 ± 5.05 | 10.8× | PLATFORM-BOUND | allow 26.6 (control emitP95 20.7×1) |
| flat | 5000.setKeys.domP50 | 3.48 ± 0.43 | 11.66 ± 1.00 | 3.4× | FAIL | allow 8.1 (control domP50 6.6×1) |
| flat | 5000.setKeys.domP95 | 9.72 ± 2.48 | 29.26 ± 4.17 | 3.0× | PLATFORM-BOUND | allow 27.6 (control domP95 21.0×1) |
| flat | 5000.replace.emitP50 | 0.40 ± 0.00 | 13.70 ± 0.97 | 34.2× | FAIL | allow 7.4 (control emitP50 6.4×1) |
| flat | 5000.replace.emitP95 | 2.84 ± 3.38 | 25.52 ± 3.92 | 9.0× | PLATFORM-BOUND | allow 28.0 (control emitP95 20.7×1) |
| flat | 5000.replace.domP50 | 1.58 ± 0.08 | 14.36 ± 0.88 | 9.1× | FAIL | allow 7.6 (control domP50 6.6×1) |
| flat | 5000.replace.domP95 | 10.40 ± 4.36 | 25.96 ± 3.98 | 2.5× | PLATFORM-BOUND | allow 29.3 (control domP95 21.0×1) |
| flat | 5000.burst.lagP50 | 1.42 ± 0.04 | 8.96 ± 0.38 | 6.3× | FAIL | allow 6.8 (control emitP50 6.4×1) |
| flat | 5000.burst.lagP95 | 2.36 ± 0.23 | 19.48 ± 2.28 | 8.3× | PLATFORM-BOUND | allow 23.2 (control emitP95 20.7×1) |
| flat | 5000.burst.endLag | 1.38 ± 0.26 | 11.94 ± 4.50 | 8.7× | PLATFORM-BOUND | allow 11.1 (control emitP50 6.4×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.10 ± 0.00 | 9.96 ± 0.00 | 1.2× | FAIL | code +1.25 MB; data 5.73 -> 6.26 MB |
| flat | 5000.pssTotalMb | 231.94 ± 2.02 | 248.50 ± 2.34 | 1.1× | FAIL | allow 8.4 (plugin baseline 4.0 MB) |
| workflow | edit_d1.emitP50 | 0.42 ± 0.04 | 8.80 ± 0.93 | 21.0× | FAIL | allow 8.3 (control emitP50 7.3×1) |
| workflow | edit_d1.emitP95 | 2.46 ± 1.02 | 23.32 ± 4.20 | 9.5× | PLATFORM-BOUND | allow 25.8 (control emitP95 20.6×1) |
| workflow | edit_d1.domP50 | 3.24 ± 2.05 | 9.38 ± 1.08 | 2.9× | PLATFORM-BOUND | allow 10.7 (control domP50 7.6×1) |
| workflow | edit_d1.domP95 | 8.06 ± 1.57 | 24.06 ± 4.24 | 3.0× | PLATFORM-BOUND | allow 26.7 (control domP95 20.9×1) |
| workflow | edit_d4.emitP50 | 0.42 ± 0.04 | 9.24 ± 1.99 | 22.0× | PLATFORM-BOUND | allow 9.3 (control emitP50 7.3×1) |
| workflow | edit_d4.emitP95 | 1.26 ± 0.46 | 22.16 ± 3.59 | 17.6× | PLATFORM-BOUND | allow 24.6 (control emitP95 20.6×1) |
| workflow | edit_d4.domP50 | 4.10 ± 1.96 | 9.78 ± 1.85 | 2.4× | PLATFORM-BOUND | allow 11.4 (control domP50 7.6×1) |
| workflow | edit_d4.domP95 | 8.96 ± 2.80 | 22.94 ± 3.49 | 2.6× | PLATFORM-BOUND | allow 27.2 (control domP95 20.9×1) |
| workflow | edit_d10.emitP50 | 0.44 ± 0.05 | 8.60 ± 1.06 | 19.5× | PLATFORM-BOUND | allow 8.4 (control emitP50 7.3×1) |
| workflow | edit_d10.emitP95 | 1.58 ± 0.92 | 21.92 ± 3.78 | 13.9× | PLATFORM-BOUND | allow 25.3 (control emitP95 20.6×1) |
| workflow | edit_d10.domP50 | 3.20 ± 1.99 | 9.04 ± 1.11 | 2.8× | PLATFORM-BOUND | allow 10.7 (control domP50 7.6×1) |
| workflow | edit_d10.domP95 | 9.82 ± 1.10 | 22.46 ± 3.76 | 2.3× | PLATFORM-BOUND | allow 25.7 (control domP95 20.9×1) |
| workflow | loadCycle.emitP50 | 5.88 ± 7.30 | 13.78 ± 4.39 | 2.3× | PLATFORM-BOUND | allow 26.3 (control emitP50 7.3×2) |
| workflow | loadCycle.emitP95 | 33.06 ± 0.59 | 52.54 ± 4.14 | 1.6× | PLATFORM-BOUND | allow 45.9 (control emitP95 20.6×2) |
| workflow | loadCycle.domP50 | 6.66 ± 8.12 | 14.00 ± 4.65 | 2.1× | PASS |  |
| workflow | loadCycle.domP95 | 33.44 ± 0.64 | 53.06 ± 4.12 | 1.6× | PLATFORM-BOUND | allow 46.5 (control domP95 20.9×2) |
| workflow | step.emitP50 | 0.32 ± 0.04 | 7.90 ± 0.76 | 24.7× | PLATFORM-BOUND | allow 8.1 (control emitP50 7.3×1) |
| workflow | step.emitP95 | 0.86 ± 0.22 | 26.18 ± 6.32 | 30.4× | PLATFORM-BOUND | allow 27.1 (control emitP95 20.6×1) |
| workflow | step.domP50 | 4.14 ± 1.76 | 8.38 ± 0.65 | 2.0× | PLATFORM-BOUND | allow 10.0 (control domP50 7.6×1) |
| workflow | step.domP95 | 9.58 ± 2.02 | 26.62 ± 6.36 | 2.8× | PLATFORM-BOUND | allow 29.3 (control domP95 20.9×1) |
| workflow | reset.emitP50 | 0.22 ± 0.04 | 17.46 ± 3.23 | 79.4× | FAIL | allow 10.6 (control emitP50 7.3×1) |
| workflow | reset.emitP95 | 0.94 ± 0.34 | 70.56 ± 19.04 | 75.1× | FAIL | allow 40.0 (control emitP95 20.6×1) |
| workflow | reset.domP50 | 0.24 ± 0.05 | 17.52 ± 3.19 | 73.0× | FAIL | allow 10.8 (control domP50 7.6×1) |
| workflow | reset.domP95 | 1.70 ± 0.45 | 70.56 ± 19.04 | 41.5× | FAIL | allow 40.4 (control domP95 20.9×1) |
| workflow | append100.emitP50 | 0.34 ± 0.05 | 11.88 ± 1.09 | 34.9× | FAIL | allow 8.4 (control emitP50 7.3×1) |
| workflow | append100.emitP95 | 2.30 ± 3.22 | 23.62 ± 1.76 | 10.3× | PLATFORM-BOUND | allow 25.6 (control emitP95 20.6×1) |
| workflow | append100.domP50 | 0.88 ± 0.11 | 12.56 ± 1.34 | 14.3× | FAIL | allow 9.0 (control domP50 7.6×1) |
| workflow | append100.domP95 | 8.46 ± 3.01 | 23.96 ± 1.79 | 2.8× | PLATFORM-BOUND | allow 25.7 (control domP95 20.9×1) |
| workflow | heapMb | 3.90 ± 0.07 | 5.51 ± 0.00 | 1.4× | FAIL | code +1.30 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 224.15 ± 2.48 | 238.95 ± 1.53 | 1.1× | FAIL | allow 8.0 (plugin baseline 4.0 MB) |
| workflow | relaunchReadyMs | 1355.32 ± 367.76 | 961.60 ± 493.80 | 0.7× | PASS |  |
| workflow | relaunchHeapMb | 3.35 ± 0.00 | 4.39 ± 0.11 | 1.3× | FAIL | code +0.65 MB; data 1.45 -> 1.82 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 6.84 | 7.36 | 21.04 | 9.24 | 10.28 | 23.98 |
| 500 | 6.14 | 6.48 | 20.62 | 9.52 | 10.06 | 25.38 |
| 5000 | 6.38 | 6.62 | 21.00 | 10.44 | 11.28 | 26.66 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 126.5 | 132.0 | 96.3 | 102.7 |
| flat 500 | 125.6 | 132.0 | 99.7 | 103.2 |
| flat 5000 | 126.8 | 139.4 | 105.1 | 109.1 |
| workflow | 126.6 | 134.3 | 97.6 | 104.6 |

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
          "domP50": 5.7000000000116415,
          "domP95": 7.5
        },
        "setKeys": {
          "emitP50": 0.29999999998835847,
          "emitP95": 5.099999999976717,
          "domP50": 5.400000000023283,
          "domP95": 8.400000000023283
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 1.5,
          "domP50": 3.300000000046566,
          "domP95": 13.799999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.5999999999767169,
          "endLag": 0.3999999999650754,
          "maxBacklog": 0
        },
        "heapMb": 3.7224578857421875,
        "heapCode": 1.8427276611328125,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 221.6123046875,
        "pssApp": 125.890625,
        "pssRenderer": 95.7216796875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 4.2999999999883585,
          "domP50": 4.099999999976717,
          "domP95": 9.800000000046566
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 12.799999999988358,
          "domP50": 3.6000000000349246,
          "domP95": 13.700000000011642
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.7000000000116415,
          "domP50": 1.7000000000116415,
          "domP95": 7
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8000000000465661,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.9745140075683594,
        "heapCode": 1.6963653564453125,
        "heapData": 1.8917236328125,
        "pssTotalMb": 222.240234375,
        "pssApp": 123.5712890625,
        "pssRenderer": 98.6689453125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6000000000349246,
          "emitP95": 12.599999999976717,
          "domP50": 3.7999999999883585,
          "domP95": 13.599999999976717
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 2,
          "domP50": 3.7999999999883585,
          "domP95": 14
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.1000000000349246,
          "domP50": 1.7000000000116415,
          "domP95": 6.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.2000000000116415,
          "endLag": 1.3999999999650754,
          "maxBacklog": 0
        },
        "heapMb": 8.099800109863281,
        "heapCode": 1.8476715087890625,
        "heapData": 5.725639343261719,
        "pssTotalMb": 229.556640625,
        "pssApp": 125.51953125,
        "pssRenderer": 104.037109375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.6000000000349246,
        "domP50": 1.1000000000349246,
        "domP95": 6.2000000000116415
      },
      "edit_d4": {
        "emitP50": 0.5,
        "emitP95": 1.400000000023283,
        "domP50": 1.3000000000465661,
        "domP95": 13.399999999965075
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 3.099999999976717,
        "domP50": 2.8999999999650754,
        "domP95": 10.899999999965075
      },
      "loadCycle": {
        "emitP50": 13,
        "emitP95": 32.899999999965075,
        "domP50": 16.100000000034925,
        "domP95": 33.29999999998836
      },
      "step": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.7999999999883585,
        "domP50": 2.7000000000116415,
        "domP95": 12.599999999976717
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 0.8000000000465661,
        "domP50": 0.20000000001164153,
        "domP95": 1.400000000023283
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.599999999976717,
        "domP50": 0.7999999999883585,
        "domP95": 5.7000000000116415
      },
      "heapMb": 3.9362564086914062,
      "heapCode": 1.924530029296875,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 222.7392578125,
      "pssApp": 125.865234375,
      "pssRenderer": 96.8740234375,
      "relaunchReadyMs": 1611.4000000000233,
      "relaunchHeapMb": 3.351531982421875,
      "relaunchHeapCode": 1.5399208068847656,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.5,
          "emitP95": 22.699999999953434,
          "domP50": 12.200000000011642,
          "domP95": 23
        },
        "setKeys": {
          "emitP50": 10,
          "emitP95": 22,
          "domP50": 10.400000000023283,
          "domP95": 22.400000000023283
        },
        "replace": {
          "emitP50": 12.099999999976717,
          "emitP95": 21.29999999998836,
          "domP50": 12.5,
          "domP95": 21.70000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.599999999976717,
          "lagP95": 20.199999999953434,
          "endLag": 5.699999999953434,
          "maxBacklog": 3
        },
        "heapMb": 5.0841217041015625,
        "heapCode": 3.0279464721679688,
        "heapData": 1.6166648864746094,
        "pssTotalMb": 233.7041015625,
        "pssApp": 131.5390625,
        "pssRenderer": 102.1650390625,
        "control": {
          "emitP50": 6.7999999999883585,
          "emitP95": 28.20000000001164,
          "domP50": 7.5,
          "domP95": 28.400000000023283
        },
        "fCommitP50": 3.7999999999883585,
        "fCommitP95": 5.800000000046566
      },
      "500": {
        "setKey": {
          "emitP50": 8.600000000034925,
          "emitP95": 19.70000000001164,
          "domP50": 8.900000000023283,
          "domP95": 20.20000000001164
        },
        "setKeys": {
          "emitP50": 11,
          "emitP95": 19.599999999976717,
          "domP50": 11.5,
          "domP95": 23.099999999976717
        },
        "replace": {
          "emitP50": 9,
          "emitP95": 25.100000000034925,
          "domP50": 9.400000000023283,
          "domP95": 25.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.399999999965075,
          "lagP95": 16.29999999998836,
          "endLag": 7.600000000034925,
          "maxBacklog": 3
        },
        "heapMb": 5.574287414550781,
        "heapCode": 3.0485305786132812,
        "heapData": 2.0696182250976562,
        "pssTotalMb": 233.5595703125,
        "pssApp": 131.06640625,
        "pssRenderer": 102.4931640625,
        "control": {
          "emitP50": 5.5,
          "emitP95": 21.399999999965075,
          "domP50": 5.7999999999883585,
          "domP95": 21.70000000001164
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 6.400000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 11.600000000034925,
          "emitP95": 27.20000000001164,
          "domP50": 12.100000000034925,
          "domP95": 28.400000000023283
        },
        "setKeys": {
          "emitP50": 10.899999999965075,
          "emitP95": 27.900000000023283,
          "domP50": 11.399999999965075,
          "domP95": 28.29999999998836
        },
        "replace": {
          "emitP50": 13.799999999988358,
          "emitP95": 22.5,
          "domP50": 14.400000000023283,
          "domP95": 22.79999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.299999999988358,
          "lagP95": 18.899999999965075,
          "endLag": 8.5,
          "maxBacklog": 2
        },
        "heapMb": 9.951488494873047,
        "heapCode": 3.092864990234375,
        "heapData": 6.261283874511719,
        "pssTotalMb": 245.0361328125,
        "pssApp": 136.7041015625,
        "pssRenderer": 108.33203125,
        "control": {
          "emitP50": 5.900000000023283,
          "emitP95": 16.29999999998836,
          "domP50": 6.2000000000116415,
          "domP95": 16.79999999998836
        },
        "fCommitP50": 3.5,
        "fCommitP95": 7.7000000000116415
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.7999999999883585,
        "emitP95": 24.300000000046566,
        "domP50": 8.200000000011642,
        "domP95": 24.70000000001164
      },
      "edit_d4": {
        "emitP50": 7.599999999976717,
        "emitP95": 17.29999999998836,
        "domP50": 8.099999999976717,
        "domP95": 17.899999999965075
      },
      "edit_d10": {
        "emitP50": 7.7999999999883585,
        "emitP95": 25.099999999976717,
        "domP50": 8.200000000011642,
        "domP95": 25.5
      },
      "loadCycle": {
        "emitP50": 13.199999999953434,
        "emitP95": 47.800000000046566,
        "domP50": 13.399999999965075,
        "domP95": 48.20000000001164
      },
      "step": {
        "emitP50": 7.5,
        "emitP95": 18.5,
        "domP50": 8.100000000034925,
        "domP95": 18.900000000023283
      },
      "reset": {
        "emitP50": 16.29999999998836,
        "emitP95": 90.39999999996508,
        "domP50": 16.399999999965075,
        "domP95": 90.39999999996508
      },
      "append100": {
        "emitP50": 12.199999999953434,
        "emitP95": 24.400000000023283,
        "domP50": 12.5,
        "domP95": 24.900000000023283
      },
      "control": {
        "emitP50": 7.7999999999883585,
        "emitP95": 19.099999999976717,
        "domP50": 8,
        "domP95": 19.29999999998836
      },
      "heapMb": 5.50762939453125,
      "heapCode": 3.1928787231445312,
      "heapData": 1.8670310974121094,
      "pssTotalMb": 237.08203125,
      "pssApp": 133.3369140625,
      "pssRenderer": 103.7451171875,
      "relaunchReadyMs": 860.5,
      "relaunchHeapMb": 4.331581115722656,
      "relaunchHeapCode": 2.1293258666992188,
      "relaunchHeapData": 1.8267860412597656
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8,
          "emitP95": 22.800000000046566,
          "domP50": 8.700000000011642,
          "domP95": 23.300000000046566
        },
        "setKeys": {
          "emitP50": 7.7000000000116415,
          "emitP95": 23.79999999998836,
          "domP50": 8.299999999988358,
          "domP95": 24.20000000001164
        },
        "replace": {
          "emitP50": 7.7999999999883585,
          "emitP95": 25,
          "domP50": 8.099999999976717,
          "domP95": 25.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 16.600000000034925,
          "endLag": 7.099999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.084491729736328,
        "heapCode": 3.027538299560547,
        "heapData": 1.616668701171875,
        "pssTotalMb": 233.048828125,
        "pssApp": 131.21484375,
        "pssRenderer": 101.833984375,
        "control": {
          "emitP50": 5.600000000034925,
          "emitP95": 23,
          "domP50": 5.900000000023283,
          "domP95": 23.29999999998836
        },
        "fCommitP50": 3.5,
        "fCommitP95": 8.400000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 9.400000000023283,
          "emitP95": 28.899999999965075,
          "domP50": 10,
          "domP95": 29.5
        },
        "setKeys": {
          "emitP50": 9.200000000011642,
          "emitP95": 20.300000000046566,
          "domP50": 9.600000000034925,
          "domP95": 27.600000000034925
        },
        "replace": {
          "emitP50": 8.700000000011642,
          "emitP95": 15.700000000011642,
          "domP50": 9.200000000011642,
          "domP95": 16
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.099999999976717,
          "lagP95": 21.600000000034925,
          "endLag": 10.5,
          "maxBacklog": 2
        },
        "heapMb": 5.573902130126953,
        "heapCode": 3.0484771728515625,
        "heapData": 2.0696258544921875,
        "pssTotalMb": 232.609375,
        "pssApp": 130.375,
        "pssRenderer": 102.234375,
        "control": {
          "emitP50": 6,
          "emitP95": 19.5,
          "domP50": 6.300000000046566,
          "domP95": 19.800000000046566
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 6.299999999930151
      },
      "5000": {
        "setKey": {
          "emitP50": 9.900000000023283,
          "emitP95": 28.699999999953434,
          "domP50": 11.20000000006985,
          "domP95": 29.5
        },
        "setKeys": {
          "emitP50": 10.599999999976717,
          "emitP95": 33.5,
          "domP50": 11.70000000006985,
          "domP95": 34.199999999953434
        },
        "replace": {
          "emitP50": 12.900000000023283,
          "emitP95": 27.5,
          "domP50": 14.099999999976717,
          "domP95": 28.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.099999999976717,
          "lagP95": 22.900000000023283,
          "endLag": 16.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.961650848388672,
        "heapCode": 3.1014556884765625,
        "heapData": 6.261344909667969,
        "pssTotalMb": 247.10546875,
        "pssApp": 138.955078125,
        "pssRenderer": 108.150390625,
        "control": {
          "emitP50": 6.799999999930151,
          "emitP95": 20,
          "domP50": 7,
          "domP95": 20.400000000023283
        },
        "fCommitP50": 3.799999999930151,
        "fCommitP95": 5.699999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 10.300000000046566,
        "emitP95": 16.79999999993015,
        "domP50": 11.100000000093132,
        "domP95": 17.399999999906868
      },
      "edit_d4": {
        "emitP50": 9.400000000023283,
        "emitP95": 20,
        "domP50": 9.800000000046566,
        "domP95": 21.599999999976717
      },
      "edit_d10": {
        "emitP50": 8.699999999953434,
        "emitP95": 23.099999999976717,
        "domP50": 9.199999999953434,
        "domP95": 23.599999999976717
      },
      "loadCycle": {
        "emitP50": 9.199999999953434,
        "emitP95": 52.59999999997672,
        "domP50": 9.20000000006985,
        "domP95": 52.699999999953434
      },
      "step": {
        "emitP50": 7.599999999976717,
        "emitP95": 30.099999999976717,
        "domP50": 8.099999999976717,
        "domP95": 30.5
      },
      "reset": {
        "emitP50": 18.399999999906868,
        "emitP95": 59.29999999993015,
        "domP50": 18.399999999906868,
        "domP95": 59.29999999993015
      },
      "append100": {
        "emitP50": 13.099999999976717,
        "emitP95": 25.699999999953434,
        "domP50": 13.300000000046566,
        "domP95": 26
      },
      "control": {
        "emitP50": 8.599999999976717,
        "emitP95": 25.5,
        "domP50": 8.79999999993015,
        "domP95": 25.899999999906868
      },
      "heapMb": 5.506507873535156,
      "heapCode": 3.1919708251953125,
      "heapData": 1.8669776916503906,
      "pssTotalMb": 237.4794921875,
      "pssApp": 133.6259765625,
      "pssRenderer": 103.853515625,
      "relaunchReadyMs": 400.5,
      "relaunchHeapMb": 4.539726257324219,
      "relaunchHeapCode": 2.330493927001953,
      "relaunchHeapData": 1.8313446044921875
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.2000000000698492,
          "emitP95": 0.5,
          "domP50": 5.5,
          "domP95": 6.599999999976717
        },
        "setKeys": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.40000000002328306,
          "domP50": 5.199999999953434,
          "domP95": 9.400000000023283
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 9,
          "domP50": 5,
          "domP95": 10.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.6000000000931323,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.722393035888672,
        "heapCode": 1.8426628112792969,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 221.4638671875,
        "pssApp": 125.578125,
        "pssRenderer": 95.8857421875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.5,
          "domP50": 3.5,
          "domP95": 8.5
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 11.099999999976717,
          "domP50": 3.699999999953434,
          "domP95": 16.699999999953434
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 3.099999999976717,
          "domP50": 2.900000000023283,
          "domP95": 10.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6999999999534339,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.8729095458984375,
        "heapCode": 1.6033859252929688,
        "heapData": 1.8890113830566406,
        "pssTotalMb": 223.8154296875,
        "pssApp": 124.92578125,
        "pssRenderer": 98.8896484375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 4.900000000023283,
          "domP50": 5.5,
          "domP95": 10.300000000046566
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 4.099999999976717,
          "domP50": 4,
          "domP95": 7.900000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.300000000046566,
          "domP50": 1.599999999976717,
          "domP95": 5.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.299999999930151,
          "endLag": 1.5,
          "maxBacklog": 0
        },
        "heapMb": 8.097434997558594,
        "heapCode": 1.845672607421875,
        "heapData": 5.725044250488281,
        "pssTotalMb": 230.0810546875,
        "pssApp": 125.5625,
        "pssRenderer": 104.5185546875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.900000000023283,
        "domP50": 5.400000000023283,
        "domP95": 8.600000000093132
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2,
        "domP50": 5.799999999930151,
        "domP95": 10.099999999976717
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 1.5,
        "domP95": 9.599999999976717
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 33.5,
        "domP50": 0.6999999999534339,
        "domP95": 33.800000000046566
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 5.5,
        "domP95": 9
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5999999999767169,
        "domP50": 0.2999999999301508,
        "domP95": 1.2000000000698492
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 8,
        "domP50": 1,
        "domP95": 8.900000000023283
      },
      "heapMb": 3.7767295837402344,
      "heapCode": 1.7701568603515625,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 220.43359375,
      "pssApp": 124.3974609375,
      "pssRenderer": 96.0361328125,
      "relaunchReadyMs": 1433.5999999999767,
      "relaunchHeapMb": 3.3516082763671875,
      "relaunchHeapCode": 1.5399971008300781,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5,
          "domP50": 5.700000000069849,
          "domP95": 7
        },
        "setKeys": {
          "emitP50": 0.39999999990686774,
          "emitP95": 2,
          "domP50": 2.1000000000931323,
          "domP95": 6.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 1.400000000023283,
          "domP95": 8.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.7000000000698492,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.724040985107422,
        "heapCode": 1.8442878723144531,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 225.5576171875,
        "pssApp": 128.5849609375,
        "pssRenderer": 96.97265625
      },
      "500": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.6999999999534339,
          "domP50": 5.599999999976717,
          "domP95": 6.800000000046566
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 5,
          "domP50": 5.700000000069849,
          "domP95": 14
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.9000000000232831,
          "domP50": 4,
          "domP95": 7
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.9000000000232831,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.134986877441406,
        "heapCode": 1.8520011901855469,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 227.4560546875,
        "pssApp": 126.9033203125,
        "pssRenderer": 100.552734375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 2.6000000000931323,
          "domP50": 2.800000000046566,
          "domP95": 8.70000000006985
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 2.800000000046566,
          "domP50": 3.299999999930151,
          "domP95": 8.800000000046566
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1,
          "domP50": 1.5,
          "domP95": 12.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.1000000000931323,
          "endLag": 1.7000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 8.099315643310547,
        "heapCode": 1.8476829528808594,
        "heapData": 5.725063323974609,
        "pssTotalMb": 233.146484375,
        "pssApp": 127.3837890625,
        "pssRenderer": 105.7626953125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.799999999930151,
        "domP50": 3.199999999953434,
        "domP95": 10
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 5.5,
        "domP95": 7.099999999976717
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.099999999976717,
        "domP50": 5.200000000069849,
        "domP95": 8.199999999953434
      },
      "loadCycle": {
        "emitP50": 14.70000000006985,
        "emitP95": 32.300000000046566,
        "domP50": 15,
        "domP95": 32.60000000009313
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1999999999534339,
        "domP50": 5.199999999953434,
        "domP95": 9.899999999906868
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 1.1999999999534339,
        "domP50": 0.30000000004656613,
        "domP95": 2
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 0.8000000000465661,
        "domP95": 13.20000000006985
      },
      "heapMb": 3.9353981018066406,
      "heapCode": 1.9237022399902344,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 225.9052734375,
      "pssApp": 127.4423828125,
      "pssRenderer": 98.462890625,
      "relaunchReadyMs": 708.1999999999534,
      "relaunchHeapMb": 3.3517532348632812,
      "relaunchHeapCode": 1.5399589538574219,
      "relaunchHeapData": 1.4463119506835938
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.400000000023283,
          "emitP95": 20.900000000023283,
          "domP50": 10.099999999976717,
          "domP95": 21.400000000023283
        },
        "setKeys": {
          "emitP50": 9.900000000023283,
          "emitP95": 18.29999999993015,
          "domP50": 10.70000000006985,
          "domP95": 21.399999999906868
        },
        "replace": {
          "emitP50": 7.099999999976717,
          "emitP95": 24.399999999906868,
          "domP50": 7.900000000023283,
          "domP95": 24.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.899999999906868,
          "lagP95": 13.800000000046566,
          "endLag": 7.200000000069849,
          "maxBacklog": 3
        },
        "heapMb": 5.084312438964844,
        "heapCode": 3.027587890625,
        "heapData": 1.616668701171875,
        "pssTotalMb": 236.0166015625,
        "pssApp": 132.8349609375,
        "pssRenderer": 103.181640625,
        "control": {
          "emitP50": 7.900000000023283,
          "emitP95": 15.70000000006985,
          "domP50": 8.099999999976717,
          "domP95": 16.100000000093132
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 6.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 9.399999999906868,
          "emitP95": 21.800000000046566,
          "domP50": 10.399999999906868,
          "domP95": 22.099999999976717
        },
        "setKeys": {
          "emitP50": 10.100000000093132,
          "emitP95": 30,
          "domP50": 10.600000000093132,
          "domP95": 30.400000000023283
        },
        "replace": {
          "emitP50": 8.70000000006985,
          "emitP95": 20.099999999976717,
          "domP50": 9.400000000023283,
          "domP95": 21.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.100000000093132,
          "lagP95": 19,
          "endLag": 7.699999999953434,
          "maxBacklog": 2
        },
        "heapMb": 5.564140319824219,
        "heapCode": 3.039295196533203,
        "heapData": 2.0696258544921875,
        "pssTotalMb": 236.640625,
        "pssApp": 132.7626953125,
        "pssRenderer": 103.8779296875,
        "control": {
          "emitP50": 6,
          "emitP95": 21.300000000046566,
          "domP50": 6.5,
          "domP95": 21.599999999976717
        },
        "fCommitP50": 4.299999999930151,
        "fCommitP95": 7.5
      },
      "5000": {
        "setKey": {
          "emitP50": 10.20000000006985,
          "emitP95": 19.800000000046566,
          "domP50": 10.900000000023283,
          "domP95": 20.20000000006985
        },
        "setKeys": {
          "emitP50": 10.70000000006985,
          "emitP95": 20,
          "domP50": 11.800000000046566,
          "domP95": 23
        },
        "replace": {
          "emitP50": 14.199999999953434,
          "emitP95": 26.20000000006985,
          "domP50": 14.699999999953434,
          "domP95": 26.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.300000000046566,
          "lagP95": 19,
          "endLag": 9,
          "maxBacklog": 2
        },
        "heapMb": 9.95916748046875,
        "heapCode": 3.099365234375,
        "heapData": 6.261287689208984,
        "pssTotalMb": 249.9482421875,
        "pssApp": 140.2587890625,
        "pssRenderer": 109.689453125,
        "control": {
          "emitP50": 6.800000000046566,
          "emitP95": 16.900000000023283,
          "domP50": 6.900000000023283,
          "domP95": 17.199999999953434
        },
        "fCommitP50": 3.5,
        "fCommitP95": 6.599999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.899999999906868,
        "emitP95": 25.099999999976717,
        "domP50": 9.599999999976717,
        "domP95": 25.599999999976717
      },
      "edit_d4": {
        "emitP50": 8.400000000023283,
        "emitP95": 23.79999999993015,
        "domP50": 9.099999999976717,
        "domP95": 24.5
      },
      "edit_d10": {
        "emitP50": 8.099999999976717,
        "emitP95": 25.5,
        "domP50": 8.5,
        "domP95": 26.099999999976717
      },
      "loadCycle": {
        "emitP50": 20.70000000006985,
        "emitP95": 57.699999999953434,
        "domP50": 21.400000000023283,
        "domP95": 58.39999999990687
      },
      "step": {
        "emitP50": 7.300000000046566,
        "emitP95": 31.199999999953434,
        "domP50": 7.700000000069849,
        "domP95": 31.599999999976717
      },
      "reset": {
        "emitP50": 18.199999999953434,
        "emitP95": 58,
        "domP50": 18.29999999993015,
        "domP95": 58
      },
      "append100": {
        "emitP50": 12,
        "emitP95": 23.699999999953434,
        "domP50": 12.400000000023283,
        "domP95": 24.099999999976717
      },
      "control": {
        "emitP50": 6.899999999906868,
        "emitP95": 16.300000000046566,
        "domP50": 7.200000000069849,
        "domP95": 16.5
      },
      "heapMb": 5.515476226806641,
      "heapCode": 3.1947059631347656,
      "heapData": 1.8731307983398438,
      "pssTotalMb": 240.0419921875,
      "pssApp": 134.93359375,
      "pssRenderer": 105.1083984375,
      "relaunchReadyMs": 845.8000000000466,
      "relaunchHeapMb": 4.331901550292969,
      "relaunchHeapCode": 2.129302978515625,
      "relaunchHeapData": 1.8270225524902344
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.699999999953434,
          "emitP95": 19.900000000023283,
          "domP50": 10.400000000023283,
          "domP95": 26.599999999976717
        },
        "setKeys": {
          "emitP50": 7.599999999976717,
          "emitP95": 15.70000000006985,
          "domP50": 9.800000000046566,
          "domP95": 16.300000000046566
        },
        "replace": {
          "emitP50": 9.300000000046566,
          "emitP95": 17.5,
          "domP50": 9.599999999976717,
          "domP95": 18.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.900000000023283,
          "lagP95": 13.79999999993015,
          "endLag": 6.299999999930151,
          "maxBacklog": 3
        },
        "heapMb": 5.082950592041016,
        "heapCode": 3.0265541076660156,
        "heapData": 1.616668701171875,
        "pssTotalMb": 235.873046875,
        "pssApp": 132.677734375,
        "pssRenderer": 103.1953125,
        "control": {
          "emitP50": 6.699999999953434,
          "emitP95": 17.29999999993015,
          "domP50": 7.199999999953434,
          "domP95": 17.5
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 7.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 10.900000000023283,
          "emitP95": 22.699999999953434,
          "domP50": 11.20000000006985,
          "domP95": 23.699999999953434
        },
        "setKeys": {
          "emitP50": 9.600000000093132,
          "emitP95": 17.79999999993015,
          "domP50": 10.300000000046566,
          "domP95": 18.599999999976717
        },
        "replace": {
          "emitP50": 9.300000000046566,
          "emitP95": 23.699999999953434,
          "domP50": 9.600000000093132,
          "domP95": 24.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 20.199999999953434,
          "endLag": 6,
          "maxBacklog": 2
        },
        "heapMb": 5.563556671142578,
        "heapCode": 3.0385704040527344,
        "heapData": 2.0696258544921875,
        "pssTotalMb": 236.896484375,
        "pssApp": 133.201171875,
        "pssRenderer": 103.6953125,
        "control": {
          "emitP50": 6,
          "emitP95": 19.20000000006985,
          "domP50": 6.299999999930151,
          "domP95": 19.400000000023283
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 7.699999999953434
      },
      "5000": {
        "setKey": {
          "emitP50": 9.900000000023283,
          "emitP95": 30.400000000023283,
          "domP50": 11.199999999953434,
          "domP95": 30.79999999993015
        },
        "setKeys": {
          "emitP50": 12.599999999976717,
          "emitP95": 28.400000000023283,
          "domP50": 13.099999999976717,
          "domP95": 29.300000000046566
        },
        "replace": {
          "emitP50": 12.599999999976717,
          "emitP95": 20.800000000046566,
          "domP50": 13.100000000093132,
          "domP95": 21.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.599999999976717,
          "lagP95": 20,
          "endLag": 17.300000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.952293395996094,
        "heapCode": 3.0933914184570312,
        "heapData": 6.261684417724609,
        "pssTotalMb": 250.279296875,
        "pssApp": 140.771484375,
        "pssRenderer": 109.5078125,
        "control": {
          "emitP50": 5.300000000046566,
          "emitP95": 26.099999999976717,
          "domP50": 5.599999999976717,
          "domP95": 26.29999999993015
        },
        "fCommitP50": 3.5,
        "fCommitP95": 4.799999999930151
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.600000000093132,
        "emitP95": 22.29999999993015,
        "domP50": 9.100000000093132,
        "domP95": 23.599999999976717
      },
      "edit_d4": {
        "emitP50": 8.20000000006985,
        "emitP95": 26.599999999976717,
        "domP50": 9,
        "domP95": 27.300000000046566
      },
      "edit_d10": {
        "emitP50": 10.399999999906868,
        "emitP95": 17.099999999976717,
        "domP50": 10.899999999906868,
        "domP95": 17.5
      },
      "loadCycle": {
        "emitP50": 14.699999999953434,
        "emitP95": 49.199999999953434,
        "domP50": 14.800000000046566,
        "domP95": 50.199999999953434
      },
      "step": {
        "emitP50": 9.20000000006985,
        "emitP95": 20.099999999976717,
        "domP50": 9.400000000023283,
        "domP95": 20.5
      },
      "reset": {
        "emitP50": 21.599999999976717,
        "emitP95": 53,
        "domP50": 21.599999999976717,
        "domP95": 53
      },
      "append100": {
        "emitP50": 10.099999999976717,
        "emitP95": 23.399999999906868,
        "domP50": 10.5,
        "domP95": 23.599999999976717
      },
      "control": {
        "emitP50": 6.399999999906868,
        "emitP95": 24.099999999976717,
        "domP50": 6.700000000069849,
        "domP95": 24.400000000023283
      },
      "heapMb": 5.507270812988281,
      "heapCode": 3.1965408325195312,
      "heapData": 1.8630828857421875,
      "pssTotalMb": 240.1982421875,
      "pssApp": 134.8720703125,
      "pssRenderer": 105.326171875,
      "relaunchReadyMs": 941.8000000000466,
      "relaunchHeapMb": 4.270381927490234,
      "relaunchHeapCode": 2.129364013671875,
      "relaunchHeapData": 1.76544189453125
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7000000000698492,
          "domP50": 5.699999999953434,
          "domP95": 8.199999999953434
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.5999999999767169,
          "domP50": 1.1999999999534339,
          "domP95": 10.29999999993015
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.099999999976717,
          "domP50": 5.5,
          "domP95": 11.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.6999999999534339,
          "endLag": 0.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 3.4616966247558594,
        "heapCode": 1.595489501953125,
        "heapData": 1.4997215270996094,
        "pssTotalMb": 221.2568359375,
        "pssApp": 125.3369140625,
        "pssRenderer": 95.919921875
      },
      "500": {
        "setKey": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.8000000000465661,
          "domP50": 5.800000000046566,
          "domP95": 7.900000000023283
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6999999999534339,
          "domP50": 5.600000000093132,
          "domP95": 10
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.2000000000698492,
          "domP50": 1.2999999999301508,
          "domP95": 6.799999999930151
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8000000000465661,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.1336669921875,
        "heapCode": 1.8507232666015625,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 228.42578125,
        "pssApp": 127.576171875,
        "pssRenderer": 100.849609375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.5,
          "emitP95": 4.599999999976717,
          "domP50": 5.699999999953434,
          "domP95": 10.79999999993015
        },
        "setKeys": {
          "emitP50": 1.400000000023283,
          "emitP95": 1.8000000000465661,
          "domP50": 3.400000000023283,
          "domP95": 8.29999999993015
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 1.5,
          "domP95": 16.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.6000000000931323,
          "endLag": 1,
          "maxBacklog": 0
        },
        "heapMb": 8.096763610839844,
        "heapCode": 1.8453216552734375,
        "heapData": 5.725063323974609,
        "pssTotalMb": 232.689453125,
        "pssApp": 127.0751953125,
        "pssRenderer": 105.6142578125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 4.099999999976717,
        "domP50": 1.3000000000465661,
        "domP95": 6.699999999953434
      },
      "edit_d4": {
        "emitP50": 0.39999999990686774,
        "emitP95": 1.099999999976717,
        "domP50": 2.799999999930151,
        "domP95": 7.199999999953434
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.8000000000465661,
        "domP50": 1.099999999976717,
        "domP95": 10.800000000046566
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33.800000000046566,
        "domP50": 0.7000000000698492,
        "domP95": 34.300000000046566
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.9000000000232831,
        "domP50": 5.5,
        "domP95": 7
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 1.400000000023283,
        "domP50": 0.2000000000698492,
        "domP95": 2.300000000046566
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7999999999301508,
        "domP50": 1,
        "domP95": 8.5
      },
      "heapMb": 3.9337615966796875,
      "heapCode": 1.9221687316894531,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.103515625,
      "pssApp": 127.9853515625,
      "pssRenderer": 98.1181640625,
      "relaunchReadyMs": 1540.0999999999767,
      "relaunchHeapMb": 3.3515586853027344,
      "relaunchHeapCode": 1.5399589538574219,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.099999999976717,
          "domP50": 4.899999999906868,
          "domP95": 7.900000000023283
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.099999999976717,
          "domP50": 5.900000000023283,
          "domP95": 12.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8000000000465661,
          "domP50": 1.2999999999301508,
          "domP95": 6.700000000069849
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 1.1999999999534339,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.7241287231445312,
        "heapCode": 1.8444328308105469,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.0703125,
        "pssApp": 127.078125,
        "pssRenderer": 96.9921875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.8999999999068677,
          "domP50": 2.300000000046566,
          "domP95": 8.199999999953434
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.8000000000465661,
          "domP50": 1.099999999976717,
          "domP95": 7.900000000023283
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.9000000000232831,
          "domP50": 5.099999999976717,
          "domP95": 7.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8000000000465661,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.8707199096679688,
        "heapCode": 1.6011962890625,
        "heapData": 1.8890113830566406,
        "pssTotalMb": 224.9423828125,
        "pssApp": 125.2314453125,
        "pssRenderer": 99.7109375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6999999999534339,
          "emitP95": 10,
          "domP50": 4.599999999976717,
          "domP95": 12.600000000093132
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 2.300000000046566,
          "domP50": 2.900000000023283,
          "domP95": 9.599999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 8.79999999993015,
          "domP50": 1.599999999976717,
          "domP95": 11.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.599999999976717,
          "endLag": 1.3000000000465661,
          "maxBacklog": 0
        },
        "heapMb": 8.099784851074219,
        "heapCode": 1.8477439880371094,
        "heapData": 5.725639343261719,
        "pssTotalMb": 234.2236328125,
        "pssApp": 128.4150390625,
        "pssRenderer": 105.80859375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.900000000023283,
        "domP50": 5.199999999953434,
        "domP95": 8.79999999993015
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 5.100000000093132,
        "domP95": 7
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 5.300000000046566,
        "domP95": 9.599999999976717
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 32.79999999993015,
        "domP50": 0.8000000000465661,
        "domP95": 33.199999999953434
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6000000000931323,
        "domP50": 1.7999999999301508,
        "domP95": 9.400000000023283
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 0.7000000000698492,
        "domP50": 0.2000000000698492,
        "domP95": 1.599999999976717
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 0.7999999999301508,
        "domP95": 6
      },
      "heapMb": 3.9340362548828125,
      "heapCode": 1.9223823547363281,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 225.55859375,
      "pssApp": 127.203125,
      "pssRenderer": 98.35546875,
      "relaunchReadyMs": 1483.2999999999302,
      "relaunchHeapMb": 3.351531982421875,
      "relaunchHeapCode": 1.5399208068847656,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.599999999976717,
          "emitP95": 25.300000000046566,
          "domP50": 10,
          "domP95": 25.599999999976717
        },
        "setKeys": {
          "emitP50": 9.29999999993015,
          "emitP95": 25.79999999993015,
          "domP50": 9.800000000046566,
          "domP95": 26.29999999993015
        },
        "replace": {
          "emitP50": 7.900000000023283,
          "emitP95": 24.300000000046566,
          "domP50": 8.300000000046566,
          "domP95": 24.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.800000000046566,
          "lagP95": 12.900000000023283,
          "endLag": 5.800000000046566,
          "maxBacklog": 3
        },
        "heapMb": 5.072917938232422,
        "heapCode": 3.017383575439453,
        "heapData": 1.616668701171875,
        "pssTotalMb": 234.7666015625,
        "pssApp": 131.6025390625,
        "pssRenderer": 103.1640625,
        "control": {
          "emitP50": 7.200000000069849,
          "emitP95": 19.599999999976717,
          "domP50": 8.100000000093132,
          "domP95": 19.900000000023283
        },
        "fCommitP50": 3.3999999999068677,
        "fCommitP95": 6
      },
      "500": {
        "setKey": {
          "emitP50": 9.300000000046566,
          "emitP95": 31,
          "domP50": 9.800000000046566,
          "domP95": 31.400000000023283
        },
        "setKeys": {
          "emitP50": 8.300000000046566,
          "emitP95": 24.20000000006985,
          "domP50": 8.900000000023283,
          "domP95": 24.70000000006985
        },
        "replace": {
          "emitP50": 11.599999999976717,
          "emitP95": 16.70000000006985,
          "domP50": 12.099999999976717,
          "domP95": 17
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.700000000069849,
          "lagP95": 17,
          "endLag": 5.700000000069849,
          "maxBacklog": 3
        },
        "heapMb": 5.5756988525390625,
        "heapCode": 3.049724578857422,
        "heapData": 2.069622039794922,
        "pssTotalMb": 236.2080078125,
        "pssApp": 132.5185546875,
        "pssRenderer": 103.689453125,
        "control": {
          "emitP50": 7.199999999953434,
          "emitP95": 20.400000000023283,
          "domP50": 7.5,
          "domP95": 20.599999999976717
        },
        "fCommitP50": 3.700000000069849,
        "fCommitP95": 8.20000000006985
      },
      "5000": {
        "setKey": {
          "emitP50": 10.599999999976717,
          "emitP95": 24,
          "domP50": 11,
          "domP95": 24.400000000023283
        },
        "setKeys": {
          "emitP50": 9.70000000006985,
          "emitP95": 30.800000000046566,
          "domP50": 10.300000000046566,
          "domP95": 31.5
        },
        "replace": {
          "emitP50": 15,
          "emitP95": 30.599999999976717,
          "domP50": 15.5,
          "domP95": 31
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.5,
          "lagP95": 16.599999999976717,
          "endLag": 8.5,
          "maxBacklog": 2
        },
        "heapMb": 9.952190399169922,
        "heapCode": 3.0935325622558594,
        "heapData": 6.261268615722656,
        "pssTotalMb": 250.125,
        "pssApp": 140.505859375,
        "pssRenderer": 109.619140625,
        "control": {
          "emitP50": 7.100000000093132,
          "emitP95": 24,
          "domP50": 7.400000000023283,
          "domP95": 24.300000000046566
        },
        "fCommitP50": 3.5,
        "fCommitP95": 4.900000000023283
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.400000000023283,
        "emitP95": 28.099999999976717,
        "domP50": 8.900000000023283,
        "domP95": 29
      },
      "edit_d4": {
        "emitP50": 12.599999999976717,
        "emitP95": 23.100000000093132,
        "domP50": 12.900000000023283,
        "domP95": 23.400000000023283
      },
      "edit_d10": {
        "emitP50": 8,
        "emitP95": 18.79999999993015,
        "domP50": 8.400000000023283,
        "domP95": 19.599999999976717
      },
      "loadCycle": {
        "emitP50": 11.100000000093132,
        "emitP95": 55.39999999990687,
        "domP50": 11.20000000006985,
        "domP95": 55.79999999993015
      },
      "step": {
        "emitP50": 7.900000000023283,
        "emitP95": 31,
        "domP50": 8.599999999976717,
        "domP95": 31.599999999976717
      },
      "reset": {
        "emitP50": 12.800000000046566,
        "emitP95": 92.09999999997672,
        "domP50": 12.899999999906868,
        "domP95": 92.09999999997672
      },
      "append100": {
        "emitP50": 12,
        "emitP95": 20.900000000023283,
        "domP50": 14.099999999976717,
        "domP95": 21.199999999953434
      },
      "control": {
        "emitP50": 6.799999999930151,
        "emitP95": 17.900000000023283,
        "domP50": 7.099999999976717,
        "domP95": 18.300000000046566
      },
      "heapMb": 5.5050506591796875,
      "heapCode": 3.1904869079589844,
      "heapData": 1.8670310974121094,
      "pssTotalMb": 239.9345703125,
      "pssApp": 134.8779296875,
      "pssRenderer": 105.056640625,
      "relaunchReadyMs": 1759.4000000000233,
      "relaunchHeapMb": 4.4583587646484375,
      "relaunchHeapCode": 2.232196807861328,
      "relaunchHeapData": 1.8505363464355469
    }
  }
]
```
</details>
