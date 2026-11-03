# Phase 16 shapes — flat objects & hybrid workflow (2026-10-27)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.26 ms, p95 9.35 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 3 / PLATFORM-BOUND 46 / CODE-BOUND 0 / FAIL 37

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.36 ± 0.09 | 8.04 ± 0.63 | 22.3× | FAIL | allow 6.6 (control emitP50 5.9×1) |
| flat | 50.setKey.emitP95 | 2.02 ± 2.31 | 19.70 ± 5.29 | 9.8× | PLATFORM-BOUND | allow 24.1 (control emitP95 16.5×1) |
| flat | 50.setKey.domP50 | 3.40 ± 1.61 | 8.78 ± 0.43 | 2.6× | PLATFORM-BOUND | allow 8.5 (control domP50 6.5×1) |
| flat | 50.setKey.domP95 | 10.12 ± 3.63 | 20.24 ± 5.36 | 2.0× | PLATFORM-BOUND | allow 25.7 (control domP95 16.7×1) |
| flat | 50.setKeys.emitP50 | 0.38 ± 0.04 | 8.02 ± 0.63 | 21.1× | FAIL | allow 6.6 (control emitP50 5.9×1) |
| flat | 50.setKeys.emitP95 | 1.60 ± 0.71 | 18.22 ± 5.92 | 11.4× | PLATFORM-BOUND | allow 23.1 (control emitP95 16.5×1) |
| flat | 50.setKeys.domP50 | 1.28 ± 0.26 | 8.66 ± 0.50 | 6.8× | FAIL | allow 7.2 (control domP50 6.5×1) |
| flat | 50.setKeys.domP95 | 7.64 ± 1.12 | 19.22 ± 5.92 | 2.5× | PLATFORM-BOUND | allow 23.8 (control domP95 16.7×1) |
| flat | 50.replace.emitP50 | 0.32 ± 0.04 | 7.30 ± 0.83 | 22.8× | FAIL | allow 6.8 (control emitP50 5.9×1) |
| flat | 50.replace.emitP95 | 2.42 ± 3.12 | 19.02 ± 5.96 | 7.9× | PLATFORM-BOUND | allow 25.5 (control emitP95 16.5×1) |
| flat | 50.replace.domP50 | 2.18 ± 1.63 | 7.86 ± 0.79 | 3.6× | PLATFORM-BOUND | allow 8.9 (control domP50 6.5×1) |
| flat | 50.replace.domP95 | 9.64 ± 2.00 | 20.60 ± 4.76 | 2.1× | PLATFORM-BOUND | allow 23.5 (control domP95 16.7×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 5.90 ± 0.19 | 19.7× | PLATFORM-BOUND | allow 6.1 (control emitP50 5.9×1) |
| flat | 50.burst.lagP95 | 0.60 ± 0.12 | 13.46 ± 2.27 | 22.4× | PLATFORM-BOUND | allow 18.9 (control emitP95 16.5×1) |
| flat | 50.burst.endLag | 0.26 ± 0.09 | 9.16 ± 5.51 | 35.2× | PLATFORM-BOUND | allow 11.5 (control emitP50 5.9×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.40 ± 0.55 | 2400000000.0× | FAIL |  |
| flat | 50.heapMb | 3.69 ± 0.07 | 5.07 ± 0.01 | 1.4× | FAIL | code +1.21 MB; data 1.50 -> 1.61 MB |
| flat | 50.pssTotalMb | 224.95 ± 2.73 | 237.18 ± 1.79 | 1.1× | FAIL | allow 8.6 (plugin baseline 4.1 MB) |
| flat | 500.setKey.emitP50 | 0.48 ± 0.04 | 7.58 ± 0.23 | 15.8× | FAIL | allow 6.6 (control emitP50 6.3×1) |
| flat | 500.setKey.emitP95 | 2.84 ± 2.83 | 21.40 ± 5.10 | 7.5× | PLATFORM-BOUND | allow 25.0 (control emitP95 17.1×1) |
| flat | 500.setKey.domP50 | 3.60 ± 1.81 | 8.18 ± 0.26 | 2.3× | PLATFORM-BOUND | allow 8.7 (control domP50 6.7×1) |
| flat | 500.setKey.domP95 | 10.30 ± 4.20 | 22.24 ± 5.41 | 2.2× | PLATFORM-BOUND | allow 27.0 (control domP95 17.3×1) |
| flat | 500.setKeys.emitP50 | 0.52 ± 0.04 | 8.40 ± 0.46 | 16.2× | FAIL | allow 6.8 (control emitP50 6.3×1) |
| flat | 500.setKeys.emitP95 | 3.18 ± 2.80 | 22.28 ± 6.08 | 7.0× | PLATFORM-BOUND | allow 26.0 (control emitP95 17.1×1) |
| flat | 500.setKeys.domP50 | 1.44 ± 0.18 | 9.04 ± 0.34 | 6.3× | FAIL | allow 7.2 (control domP50 6.7×1) |
| flat | 500.setKeys.domP95 | 8.54 ± 1.14 | 22.84 ± 6.02 | 2.7× | PLATFORM-BOUND | allow 24.5 (control domP95 17.3×1) |
| flat | 500.replace.emitP50 | 0.38 ± 0.08 | 7.86 ± 0.79 | 20.7× | FAIL | allow 7.1 (control emitP50 6.3×1) |
| flat | 500.replace.emitP95 | 1.20 ± 0.68 | 20.16 ± 4.89 | 16.8× | PLATFORM-BOUND | allow 22.7 (control emitP95 17.1×1) |
| flat | 500.replace.domP50 | 1.14 ± 0.21 | 8.50 ± 0.88 | 7.5× | PLATFORM-BOUND | allow 7.8 (control domP50 6.7×1) |
| flat | 500.replace.domP95 | 11.52 ± 2.64 | 21.68 ± 5.97 | 1.9× | PLATFORM-BOUND | allow 26.0 (control domP95 17.3×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 6.36 ± 0.25 | 15.9× | PLATFORM-BOUND | allow 6.5 (control emitP50 6.3×1) |
| flat | 500.burst.lagP95 | 0.76 ± 0.13 | 15.86 ± 2.02 | 20.9× | PLATFORM-BOUND | allow 19.2 (control emitP95 17.1×1) |
| flat | 500.burst.endLag | 0.38 ± 0.08 | 9.34 ± 2.16 | 24.6× | FAIL | allow 8.5 (control emitP50 6.3×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 500.heapMb | 4.08 ± 0.10 | 5.57 ± 0.00 | 1.4× | FAIL | code +1.24 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 227.91 ± 4.00 | 237.81 ± 2.43 | 1.0× | PLATFORM-BOUND | allow 10.5 (plugin baseline 4.1 MB) |
| flat | 5000.setKey.emitP50 | 1.40 ± 0.27 | 10.44 ± 0.80 | 7.5× | FAIL | allow 6.9 (control emitP50 5.8×1) |
| flat | 5000.setKey.emitP95 | 3.10 ± 1.38 | 26.54 ± 5.42 | 8.6× | FAIL | allow 22.6 (control emitP95 15.8×1) |
| flat | 5000.setKey.domP50 | 4.66 ± 1.96 | 11.32 ± 0.99 | 2.4× | PLATFORM-BOUND | allow 9.1 (control domP50 6.2×1) |
| flat | 5000.setKey.domP95 | 9.14 ± 1.29 | 27.22 ± 5.23 | 3.0× | PLATFORM-BOUND | allow 22.6 (control domP95 16.1×1) |
| flat | 5000.setKeys.emitP50 | 1.48 ± 0.11 | 10.90 ± 1.79 | 7.4× | FAIL | allow 7.7 (control emitP50 5.8×1) |
| flat | 5000.setKeys.emitP95 | 5.84 ± 3.61 | 25.18 ± 7.00 | 4.3× | PLATFORM-BOUND | allow 26.4 (control emitP95 15.8×1) |
| flat | 5000.setKeys.domP50 | 3.26 ± 0.83 | 11.58 ± 2.12 | 3.6× | PLATFORM-BOUND | allow 9.1 (control domP50 6.2×1) |
| flat | 5000.setKeys.domP95 | 10.58 ± 2.31 | 26.14 ± 6.97 | 2.5× | PLATFORM-BOUND | allow 25.4 (control domP95 16.1×1) |
| flat | 5000.replace.emitP50 | 0.40 ± 0.00 | 12.40 ± 0.95 | 31.0× | FAIL | allow 6.8 (control emitP50 5.8×1) |
| flat | 5000.replace.emitP95 | 3.34 ± 1.99 | 23.22 ± 4.31 | 7.0× | PLATFORM-BOUND | allow 22.1 (control emitP95 15.8×1) |
| flat | 5000.replace.domP50 | 1.70 ± 0.22 | 12.94 ± 1.09 | 7.6× | FAIL | allow 7.5 (control domP50 6.2×1) |
| flat | 5000.replace.domP95 | 8.88 ± 2.61 | 23.88 ± 4.47 | 2.7× | PLATFORM-BOUND | allow 23.2 (control domP95 16.1×1) |
| flat | 5000.burst.lagP50 | 1.30 ± 0.07 | 8.20 ± 0.60 | 6.3× | FAIL | allow 6.5 (control emitP50 5.8×1) |
| flat | 5000.burst.lagP95 | 1.94 ± 0.21 | 16.72 ± 6.13 | 8.6× | PLATFORM-BOUND | allow 22.1 (control emitP95 15.8×1) |
| flat | 5000.burst.endLag | 1.20 ± 0.20 | 8.66 ± 1.25 | 7.2× | FAIL | allow 7.3 (control emitP50 5.8×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.03 ± 0.09 | 9.95 ± 0.00 | 1.2× | FAIL | code +1.31 MB; data 5.72 -> 6.26 MB |
| flat | 5000.pssTotalMb | 232.42 ± 1.09 | 246.52 ± 2.01 | 1.1× | FAIL | allow 7.2 (plugin baseline 4.1 MB) |
| workflow | edit_d1.emitP50 | 0.42 ± 0.08 | 8.00 ± 0.62 | 19.0× | FAIL | allow 6.9 (control emitP50 6.2×1) |
| workflow | edit_d1.emitP95 | 1.08 ± 0.59 | 17.52 ± 1.66 | 16.2× | PLATFORM-BOUND | allow 19.8 (control emitP95 17.6×1) |
| workflow | edit_d1.domP50 | 2.70 ± 1.99 | 8.92 ± 0.51 | 3.3× | PLATFORM-BOUND | allow 9.0 (control domP50 6.5×1) |
| workflow | edit_d1.domP95 | 8.34 ± 1.23 | 17.96 ± 1.68 | 2.2× | PLATFORM-BOUND | allow 20.8 (control domP95 17.9×1) |
| workflow | edit_d4.emitP50 | 0.40 ± 0.00 | 7.16 ± 1.05 | 17.9× | PLATFORM-BOUND | allow 7.3 (control emitP50 6.2×1) |
| workflow | edit_d4.emitP95 | 1.80 ± 1.12 | 16.80 ± 2.94 | 9.3× | PLATFORM-BOUND | allow 21.7 (control emitP95 17.6×1) |
| workflow | edit_d4.domP50 | 2.30 ± 1.26 | 7.78 ± 0.99 | 3.4× | PLATFORM-BOUND | allow 8.7 (control domP50 6.5×1) |
| workflow | edit_d4.domP95 | 8.94 ± 2.50 | 17.50 ± 3.07 | 2.0× | PLATFORM-BOUND | allow 23.5 (control domP95 17.9×1) |
| workflow | edit_d10.emitP50 | 0.44 ± 0.05 | 7.34 ± 0.38 | 16.7× | FAIL | allow 6.7 (control emitP50 6.2×1) |
| workflow | edit_d10.emitP95 | 2.26 ± 1.97 | 16.78 ± 2.46 | 7.4× | PLATFORM-BOUND | allow 22.0 (control emitP95 17.6×1) |
| workflow | edit_d10.domP50 | 2.32 ± 1.98 | 8.12 ± 0.31 | 3.5× | PLATFORM-BOUND | allow 8.8 (control domP50 6.5×1) |
| workflow | edit_d10.domP95 | 11.68 ± 7.65 | 17.98 ± 1.33 | 1.5× | PASS |  |
| workflow | loadCycle.emitP50 | 8.38 ± 7.24 | 17.56 ± 2.04 | 2.1× | PLATFORM-BOUND | allow 21.8 (control emitP50 6.2×2) |
| workflow | loadCycle.emitP95 | 33.38 ± 0.86 | 52.46 ± 3.52 | 1.6× | PLATFORM-BOUND | allow 39.6 (control emitP95 17.6×2) |
| workflow | loadCycle.domP50 | 9.64 ± 8.20 | 17.72 ± 2.16 | 1.8× | PASS |  |
| workflow | loadCycle.domP95 | 33.80 ± 0.91 | 52.96 ± 3.52 | 1.6× | PLATFORM-BOUND | allow 40.2 (control domP95 17.9×2) |
| workflow | step.emitP50 | 0.34 ± 0.05 | 7.10 ± 0.60 | 20.9× | PLATFORM-BOUND | allow 6.9 (control emitP50 6.2×1) |
| workflow | step.emitP95 | 1.60 ± 1.29 | 18.00 ± 4.33 | 11.2× | PLATFORM-BOUND | allow 23.2 (control emitP95 17.6×1) |
| workflow | step.domP50 | 1.42 ± 0.67 | 7.56 ± 0.64 | 5.3× | PLATFORM-BOUND | allow 7.8 (control domP50 6.5×1) |
| workflow | step.domP95 | 7.36 ± 1.39 | 18.40 ± 4.29 | 2.5× | PLATFORM-BOUND | allow 23.6 (control domP95 17.9×1) |
| workflow | reset.emitP50 | 0.18 ± 0.04 | 24.98 ± 1.79 | 138.8× | FAIL | allow 8.1 (control emitP50 6.2×1) |
| workflow | reset.emitP95 | 1.08 ± 0.61 | 41.00 ± 5.38 | 38.0× | FAIL | allow 23.6 (control emitP95 17.6×1) |
| workflow | reset.domP50 | 0.20 ± 0.00 | 25.08 ± 1.80 | 125.4× | FAIL | allow 8.3 (control domP50 6.5×1) |
| workflow | reset.domP95 | 3.00 ± 2.30 | 41.02 ± 5.38 | 13.7× | FAIL | allow 25.6 (control domP95 17.9×1) |
| workflow | append100.emitP50 | 0.36 ± 0.05 | 14.76 ± 1.82 | 41.0× | FAIL | allow 8.1 (control emitP50 6.2×1) |
| workflow | append100.emitP95 | 1.08 ± 0.70 | 51.46 ± 21.08 | 47.6× | FAIL | allow 39.4 (control emitP95 17.6×1) |
| workflow | append100.domP50 | 0.78 ± 0.08 | 15.16 ± 1.73 | 19.4× | FAIL | allow 8.3 (control domP50 6.5×1) |
| workflow | append100.domP95 | 5.52 ± 1.01 | 51.94 ± 20.78 | 9.4× | FAIL | allow 39.7 (control domP95 17.9×1) |
| workflow | heapMb | 3.90 ± 0.07 | 5.48 ± 0.01 | 1.4× | FAIL | code +1.27 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 227.15 ± 2.95 | 240.13 ± 2.24 | 1.1× | FAIL | allow 9.3 (plugin baseline 4.1 MB) |
| workflow | relaunchReadyMs | 1027.44 ± 361.50 | 918.24 ± 584.63 | 0.9× | PASS |  |
| workflow | relaunchHeapMb | 3.33 ± 0.04 | 4.46 ± 0.05 | 1.3× | FAIL | code +0.73 MB; data 1.45 -> 1.83 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 5.88 | 6.46 | 16.74 | 8.04 | 8.78 | 20.24 |
| 500 | 6.28 | 6.68 | 17.34 | 7.58 | 8.18 | 22.24 |
| 5000 | 5.82 | 6.16 | 16.10 | 10.44 | 11.32 | 27.22 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 127.9 | 133.2 | 97.0 | 103.9 |
| flat 500 | 127.2 | 133.3 | 100.7 | 104.6 |
| flat 5000 | 126.7 | 136.4 | 105.7 | 110.1 |
| workflow | 128.3 | 134.2 | 98.8 | 106.0 |

<details><summary>Raw per-trial data</summary>

```json
[
  {
    "impl": "classic",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.9000000000232831,
          "domP50": 3.6000000000349246,
          "domP95": 7.899999999965075
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.2999999999883585,
          "domP50": 1.2999999999883585,
          "domP95": 7.2000000000116415
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 0.9000000000232831,
          "domP50": 0.7000000000116415,
          "domP95": 12.700000000011642
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.5,
          "endLag": 0.20000000001164153,
          "maxBacklog": 0
        },
        "heapMb": 3.7241439819335938,
        "heapCode": 1.8444480895996094,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.17578125,
        "pssApp": 127.36328125,
        "pssRenderer": 96.8125
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 7.699999999953434,
          "domP50": 5.2999999999883585,
          "domP95": 17.600000000034925
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 8,
          "domP50": 1.7000000000116415,
          "domP95": 8.599999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 1.2999999999883585,
          "domP95": 13.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.3999999999650754,
          "lagP95": 0.7000000000116415,
          "endLag": 0.3999999999650754,
          "maxBacklog": 0
        },
        "heapMb": 3.9725341796875,
        "heapCode": 1.6943817138671875,
        "heapData": 1.8917236328125,
        "pssTotalMb": 224.724609375,
        "pssApp": 125.0810546875,
        "pssRenderer": 99.6435546875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1000000000349246,
          "emitP95": 1.8000000000465661,
          "domP50": 7,
          "domP95": 8.5
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 3.7000000000116415,
          "domP50": 2.7000000000116415,
          "domP95": 10.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.900000000023283,
          "domP50": 2,
          "domP95": 13
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999883585,
          "lagP95": 1.7999999999883585,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.0997314453125,
        "heapCode": 1.8476028442382812,
        "heapData": 5.725639343261719,
        "pssTotalMb": 231.2666015625,
        "pssApp": 126.154296875,
        "pssRenderer": 105.1123046875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2,
        "domP50": 1,
        "domP95": 7.7999999999883585
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7999999999883585,
        "domP50": 2.400000000023283,
        "domP95": 10.699999999953434
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.7999999999883585,
        "domP50": 1.2999999999883585,
        "domP95": 8.200000000011642
      },
      "loadCycle": {
        "emitP50": 13.5,
        "emitP95": 33.600000000034925,
        "domP50": 16.70000000001164,
        "domP95": 34
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7000000000116415,
        "domP50": 1.2000000000116415,
        "domP95": 5.899999999965075
      },
      "reset": {
        "emitP50": 0.09999999997671694,
        "emitP95": 1.599999999976717,
        "domP50": 0.20000000001164153,
        "domP95": 2.2999999999883585
      },
      "append100": {
        "emitP50": 0.29999999998835847,
        "emitP95": 2.2999999999883585,
        "domP50": 0.8000000000465661,
        "domP95": 6.2000000000116415
      },
      "heapMb": 3.7769699096679688,
      "heapCode": 1.7703971862792969,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 222.705078125,
      "pssApp": 125.4287109375,
      "pssRenderer": 97.2763671875,
      "relaunchReadyMs": 622.6999999999534,
      "relaunchHeapMb": 3.3522109985351562,
      "relaunchHeapCode": 1.5400199890136719,
      "relaunchHeapData": 1.4465255737304688
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.399999999965075,
          "emitP95": 27.399999999965075,
          "domP50": 9,
          "domP95": 28.099999999976717
        },
        "setKeys": {
          "emitP50": 7.5,
          "emitP95": 28.600000000034925,
          "domP50": 8.200000000011642,
          "domP95": 29.100000000034925
        },
        "replace": {
          "emitP50": 6.100000000034925,
          "emitP95": 17.70000000001164,
          "domP50": 6.7000000000116415,
          "domP95": 18.29999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.099999999976717,
          "lagP95": 11.699999999953434,
          "endLag": 10.200000000011642,
          "maxBacklog": 3
        },
        "heapMb": 5.071922302246094,
        "heapCode": 3.0178070068359375,
        "heapData": 1.614501953125,
        "pssTotalMb": 235.1142578125,
        "pssApp": 131.9970703125,
        "pssRenderer": 103.1171875,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 16.899999999965075,
          "domP50": 6.7999999999883585,
          "domP95": 17.20000000001164
        },
        "fCommitP50": 3.2000000000116415,
        "fCommitP95": 6
      },
      "500": {
        "setKey": {
          "emitP50": 7.300000000046566,
          "emitP95": 26.70000000001164,
          "domP50": 7.7999999999883585,
          "domP95": 28.599999999976717
        },
        "setKeys": {
          "emitP50": 7.900000000023283,
          "emitP95": 14.600000000034925,
          "domP50": 9.399999999965075,
          "domP95": 15.299999999988358
        },
        "replace": {
          "emitP50": 9,
          "emitP95": 24.29999999998836,
          "domP50": 9.799999999988358,
          "domP95": 27.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.7999999999883585,
          "lagP95": 16.899999999965075,
          "endLag": 12.5,
          "maxBacklog": 2
        },
        "heapMb": 5.5648956298828125,
        "heapCode": 3.0405540466308594,
        "heapData": 2.0674591064453125,
        "pssTotalMb": 234.5244140625,
        "pssApp": 131.0302734375,
        "pssRenderer": 103.494140625,
        "control": {
          "emitP50": 6.600000000034925,
          "emitP95": 14.599999999976717,
          "domP50": 7.2000000000116415,
          "domP95": 14.899999999965075
        },
        "fCommitP50": 3.1000000000349246,
        "fCommitP95": 7
      },
      "5000": {
        "setKey": {
          "emitP50": 9.900000000023283,
          "emitP95": 24.800000000046566,
          "domP50": 10.900000000023283,
          "domP95": 25.300000000046566
        },
        "setKeys": {
          "emitP50": 10.899999999965075,
          "emitP95": 30.29999999998836,
          "domP50": 11.399999999965075,
          "domP95": 30.70000000001164
        },
        "replace": {
          "emitP50": 13.200000000011642,
          "emitP95": 30.100000000034925,
          "domP50": 13.900000000023283,
          "domP95": 31.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.199999999953434,
          "lagP95": 25.20000000001164,
          "endLag": 7.399999999965075,
          "maxBacklog": 2
        },
        "heapMb": 9.948760986328125,
        "heapCode": 3.090087890625,
        "heapData": 6.259246826171875,
        "pssTotalMb": 244.1337890625,
        "pssApp": 134.7900390625,
        "pssRenderer": 109.34375,
        "control": {
          "emitP50": 5.2999999999883585,
          "emitP95": 16.900000000023283,
          "domP50": 5.7999999999883585,
          "domP95": 17.20000000001164
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 12.800000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8,
        "emitP95": 15.5,
        "domP50": 8.799999999988358,
        "domP95": 16
      },
      "edit_d4": {
        "emitP50": 8,
        "emitP95": 20.099999999976717,
        "domP50": 8.5,
        "domP95": 20.70000000001164
      },
      "edit_d10": {
        "emitP50": 7.600000000034925,
        "emitP95": 18.599999999976717,
        "domP50": 8.299999999988358,
        "domP95": 19.199999999953434
      },
      "loadCycle": {
        "emitP50": 17.29999999998836,
        "emitP95": 51.800000000046566,
        "domP50": 17.399999999965075,
        "domP95": 53
      },
      "step": {
        "emitP50": 7.7000000000116415,
        "emitP95": 16.300000000046566,
        "domP50": 8,
        "domP95": 16.70000000001164
      },
      "reset": {
        "emitP50": 26.20000000001164,
        "emitP95": 33.90000000002328,
        "domP50": 26.399999999965075,
        "domP95": 33.90000000002328
      },
      "append100": {
        "emitP50": 17.400000000023283,
        "emitP95": 53.899999999965075,
        "domP50": 17.70000000001164,
        "domP95": 54.09999999997672
      },
      "control": {
        "emitP50": 5.5,
        "emitP95": 11.599999999976717,
        "domP50": 5.7000000000116415,
        "domP95": 11.799999999988358
      },
      "heapMb": 5.474159240722656,
      "heapCode": 3.1602210998535156,
      "heapData": 1.8661384582519531,
      "pssTotalMb": 237.9541015625,
      "pssApp": 132.623046875,
      "pssRenderer": 105.3310546875,
      "relaunchReadyMs": 393,
      "relaunchHeapMb": 4.517269134521484,
      "relaunchHeapCode": 2.309844970703125,
      "relaunchHeapData": 1.8293533325195312
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8,
          "emitP95": 15.899999999965075,
          "domP50": 8.5,
          "domP95": 16.399999999965075
        },
        "setKeys": {
          "emitP50": 7.7000000000116415,
          "emitP95": 16.5,
          "domP50": 8.399999999965075,
          "domP95": 19.900000000023283
        },
        "replace": {
          "emitP50": 7.599999999976717,
          "emitP95": 12.300000000046566,
          "domP50": 8.099999999976717,
          "domP95": 18.600000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.699999999953434,
          "lagP95": 14.5,
          "endLag": 18.29999999998836,
          "maxBacklog": 2
        },
        "heapMb": 5.073417663574219,
        "heapCode": 3.0190505981445312,
        "heapData": 1.614501953125,
        "pssTotalMb": 235.3486328125,
        "pssApp": 131.96484375,
        "pssRenderer": 103.3837890625,
        "control": {
          "emitP50": 5.7000000000116415,
          "emitP95": 19,
          "domP50": 7.5,
          "domP95": 19.20000000001164
        },
        "fCommitP50": 3.2000000000116415,
        "fCommitP95": 11.400000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 7.5,
          "emitP95": 15.300000000046566,
          "domP50": 8.099999999976717,
          "domP95": 15.800000000046566
        },
        "setKeys": {
          "emitP50": 8.100000000034925,
          "emitP95": 23.29999999998836,
          "domP50": 8.700000000011642,
          "domP95": 24
        },
        "replace": {
          "emitP50": 7.7000000000116415,
          "emitP95": 26.399999999965075,
          "domP50": 8.300000000046566,
          "domP95": 29.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.2000000000116415,
          "lagP95": 16.29999999998836,
          "endLag": 8.5,
          "maxBacklog": 2
        },
        "heapMb": 5.565742492675781,
        "heapCode": 3.041149139404297,
        "heapData": 2.067462921142578,
        "pssTotalMb": 235.9033203125,
        "pssApp": 131.9921875,
        "pssRenderer": 103.9111328125,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 17.29999999998836,
          "domP50": 6.7999999999883585,
          "domP95": 17.600000000034925
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 7.099999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 9.5,
          "emitP95": 19.70000000001164,
          "domP50": 10,
          "domP95": 20.5
        },
        "setKeys": {
          "emitP50": 8.900000000023283,
          "emitP95": 15.400000000023283,
          "domP50": 9.400000000023283,
          "domP95": 16
        },
        "replace": {
          "emitP50": 11.200000000011642,
          "emitP95": 22.300000000046566,
          "domP50": 11.600000000034925,
          "domP95": 23.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.7999999999883585,
          "lagP95": 11.899999999965075,
          "endLag": 10,
          "maxBacklog": 2
        },
        "heapMb": 9.952648162841797,
        "heapCode": 3.093608856201172,
        "heapData": 6.259437561035156,
        "pssTotalMb": 244.7197265625,
        "pssApp": 135.4169921875,
        "pssRenderer": 109.302734375,
        "control": {
          "emitP50": 5.5,
          "emitP95": 14.599999999976717,
          "domP50": 5.7999999999883585,
          "domP95": 15.099999999976717
        },
        "fCommitP50": 3,
        "fCommitP95": 10.799999999988358
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.5,
        "emitP95": 19.699999999953434,
        "domP50": 8.099999999976717,
        "domP95": 20.199999999953434
      },
      "edit_d4": {
        "emitP50": 6.799999999930151,
        "emitP95": 17.900000000023283,
        "domP50": 7.199999999953434,
        "domP95": 19.400000000023283
      },
      "edit_d10": {
        "emitP50": 7.200000000069849,
        "emitP95": 12.5,
        "domP50": 7.800000000046566,
        "domP95": 15.900000000023283
      },
      "loadCycle": {
        "emitP50": 20.900000000023283,
        "emitP95": 46.70000000006985,
        "domP50": 21.300000000046566,
        "domP95": 47
      },
      "step": {
        "emitP50": 6.800000000046566,
        "emitP95": 17,
        "domP50": 7.199999999953434,
        "domP95": 17.400000000023283
      },
      "reset": {
        "emitP50": 26.79999999993015,
        "emitP95": 40.40000000002328,
        "domP50": 26.900000000023283,
        "domP95": 40.5
      },
      "append100": {
        "emitP50": 14.099999999976717,
        "emitP95": 16.300000000046566,
        "domP50": 14.400000000023283,
        "domP95": 17.400000000023283
      },
      "control": {
        "emitP50": 7.200000000069849,
        "emitP95": 26,
        "domP50": 7.5,
        "domP95": 26.300000000046566
      },
      "heapMb": 5.483402252197266,
      "heapCode": 3.1582260131835938,
      "heapData": 1.8773880004882812,
      "pssTotalMb": 237.54296875,
      "pssApp": 132.396484375,
      "pssRenderer": 105.146484375,
      "relaunchReadyMs": 348.80000000004657,
      "relaunchHeapMb": 4.516227722167969,
      "relaunchHeapCode": 2.3095626831054688,
      "relaunchHeapData": 1.8285636901855469
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.599999999976717,
          "domP50": 1.5,
          "domP95": 8.79999999993015
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.8999999999068677,
          "domP50": 1.599999999976717,
          "domP95": 7.099999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.9000000000232831,
          "domP50": 1,
          "domP95": 10.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.723949432373047,
        "heapCode": 1.8442535400390625,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 225.6708984375,
        "pssApp": 128.3212890625,
        "pssRenderer": 97.349609375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.099999999976717,
          "domP50": 1.400000000023283,
          "domP95": 6.900000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 0.9000000000232831,
          "domP50": 1.400000000023283,
          "domP95": 10
        },
        "replace": {
          "emitP50": 0.5,
          "emitP95": 0.7999999999301508,
          "domP50": 1.099999999976717,
          "domP95": 9.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.9000000000232831,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.132709503173828,
        "heapCode": 1.8497238159179688,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 225.4052734375,
        "pssApp": 125.5234375,
        "pssRenderer": 99.8818359375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 3,
          "domP50": 2.799999999930151,
          "domP95": 11.400000000023283
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 10.800000000046566,
          "domP50": 3.5,
          "domP95": 14.400000000023283
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1.5,
          "domP50": 1.400000000023283,
          "domP95": 7.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.1999999999534339,
          "lagP95": 2.300000000046566,
          "endLag": 0.9000000000232831,
          "maxBacklog": 0
        },
        "heapMb": 8.096389770507812,
        "heapCode": 1.8451118469238281,
        "heapData": 5.725044250488281,
        "pssTotalMb": 232.736328125,
        "pssApp": 127.181640625,
        "pssRenderer": 105.5546875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.099999999976717,
        "domP50": 4.100000000093132,
        "domP95": 10
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.699999999953434,
        "domP50": 4.200000000069849,
        "domP95": 12.400000000023283
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.6000000000931323,
        "domP50": 5.800000000046566,
        "domP95": 25.20000000006985
      },
      "loadCycle": {
        "emitP50": 14,
        "emitP95": 34.40000000002328,
        "domP50": 14.400000000023283,
        "domP95": 34.90000000002328
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 3.700000000069849,
        "domP50": 2.5,
        "domP95": 9.5
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 1.6999999999534339,
        "domP50": 0.19999999995343387,
        "domP95": 2.699999999953434
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 0.7000000000698492,
        "domP95": 3.800000000046566
      },
      "heapMb": 3.9355316162109375,
      "heapCode": 1.9238548278808594,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 225.5166015625,
      "pssApp": 127.265625,
      "pssRenderer": 98.2509765625,
      "relaunchReadyMs": 640.2999999999302,
      "relaunchHeapMb": 3.352184295654297,
      "relaunchHeapCode": 1.5401344299316406,
      "relaunchHeapData": 1.4463729858398438
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 6.099999999976717,
          "domP50": 4.100000000093132,
          "domP95": 15.300000000046566
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.1000000000931323,
          "domP50": 1.1999999999534339,
          "domP95": 9.5
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.2999999999301508,
          "domP50": 4.100000000093132,
          "domP95": 7.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.2999999999301508,
          "lagP95": 0.5999999999767169,
          "endLag": 0.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 3.7226715087890625,
        "heapCode": 1.842987060546875,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 221.4091796875,
        "pssApp": 125.4677734375,
        "pssRenderer": 95.94140625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.400000000023283,
          "domP50": 1.900000000023283,
          "domP95": 8.800000000046566
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.800000000046566,
          "domP50": 1.1999999999534339,
          "domP95": 8.5
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.8000000000465661,
          "domP50": 1,
          "domP95": 15.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8999999999068677,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.9747390747070312,
        "heapCode": 1.6965866088867188,
        "heapData": 1.8917236328125,
        "pssTotalMb": 224.861328125,
        "pssApp": 125.1826171875,
        "pssRenderer": 99.6787109375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 5,
          "domP50": 3.1000000000931323,
          "domP95": 8.400000000023283
        },
        "setKeys": {
          "emitP50": 1.400000000023283,
          "emitP95": 2.400000000023283,
          "domP50": 2.900000000023283,
          "domP95": 8.199999999953434
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1,
          "domP50": 1.7000000000698492,
          "domP95": 6.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999068677,
          "lagP95": 1.900000000023283,
          "endLag": 1.3000000000465661,
          "maxBacklog": 0
        },
        "heapMb": 8.095939636230469,
        "heapCode": 1.8445968627929688,
        "heapData": 5.725063323974609,
        "pssTotalMb": 234.0673828125,
        "pssApp": 127.2578125,
        "pssRenderer": 106.8095703125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1.3000000000465661,
        "domP95": 8.300000000046566
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 3.299999999930151,
        "domP50": 1.2000000000698492,
        "domP95": 6.599999999976717
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.6999999999534339,
        "domP50": 1,
        "domP95": 7
      },
      "loadCycle": {
        "emitP50": 13.5,
        "emitP95": 32.59999999997672,
        "domP50": 15.699999999953434,
        "domP95": 33.199999999953434
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2,
        "domP50": 1.599999999976717,
        "domP95": 6.5
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5,
        "domP50": 0.2000000000698492,
        "domP95": 1.3000000000465661
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7999999999301508,
        "domP50": 0.7000000000698492,
        "domP95": 6.300000000046566
      },
      "heapMb": 3.9360923767089844,
      "heapCode": 1.9243659973144531,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 229.359375,
      "pssApp": 129.716796875,
      "pssRenderer": 99.642578125,
      "relaunchReadyMs": 1289,
      "relaunchHeapMb": 3.258136749267578,
      "relaunchHeapCode": 1.4548759460449219,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.400000000023283,
          "emitP95": 23.099999999976717,
          "domP50": 8.900000000023283,
          "domP95": 23.599999999976717
        },
        "setKeys": {
          "emitP50": 8,
          "emitP95": 17.100000000093132,
          "domP50": 8.5,
          "domP95": 17.5
        },
        "replace": {
          "emitP50": 7.299999999930151,
          "emitP95": 28.699999999953434,
          "domP50": 7.799999999930151,
          "domP95": 29.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 16,
          "endLag": 4.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.0829620361328125,
        "heapCode": 3.02789306640625,
        "heapData": 1.6144142150878906,
        "pssTotalMb": 238.3837890625,
        "pssApp": 133.89453125,
        "pssRenderer": 104.4892578125,
        "control": {
          "emitP50": 6.099999999976717,
          "emitP95": 13.100000000093132,
          "domP50": 6.300000000046566,
          "domP95": 13.400000000023283
        },
        "fCommitP50": 3.5,
        "fCommitP95": 6.600000000093132
      },
      "500": {
        "setKey": {
          "emitP50": 7.700000000069849,
          "emitP95": 19.599999999976717,
          "domP50": 8.199999999953434,
          "domP95": 20
        },
        "setKeys": {
          "emitP50": 8.5,
          "emitP95": 22,
          "domP50": 8.800000000046566,
          "domP95": 22.29999999993015
        },
        "replace": {
          "emitP50": 8,
          "emitP95": 18.29999999993015,
          "domP50": 8.800000000046566,
          "domP95": 18.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.299999999930151,
          "lagP95": 16.100000000093132,
          "endLag": 8.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 5.5735015869140625,
        "heapCode": 3.0491485595703125,
        "heapData": 2.067729949951172,
        "pssTotalMb": 239.369140625,
        "pssApp": 134.1962890625,
        "pssRenderer": 105.1728515625,
        "control": {
          "emitP50": 6.199999999953434,
          "emitP95": 17.199999999953434,
          "domP50": 6.699999999953434,
          "domP95": 17.400000000023283
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 31.699999999953434
      },
      "5000": {
        "setKey": {
          "emitP50": 10.599999999976717,
          "emitP95": 24.300000000046566,
          "domP50": 11.900000000023283,
          "domP95": 25.5
        },
        "setKeys": {
          "emitP50": 10.599999999976717,
          "emitP95": 23.5,
          "domP50": 11.29999999993015,
          "domP95": 25.5
        },
        "replace": {
          "emitP50": 11.900000000023283,
          "emitP95": 23.699999999953434,
          "domP50": 12.400000000023283,
          "domP95": 24.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.700000000069849,
          "lagP95": 11.099999999976717,
          "endLag": 9,
          "maxBacklog": 2
        },
        "heapMb": 9.948554992675781,
        "heapCode": 3.0911712646484375,
        "heapData": 6.259239196777344,
        "pssTotalMb": 247.208984375,
        "pssApp": 136.7138671875,
        "pssRenderer": 110.4951171875,
        "control": {
          "emitP50": 6,
          "emitP95": 15.5,
          "domP50": 6.299999999930151,
          "domP95": 15.800000000046566
        },
        "fCommitP50": 3.299999999930151,
        "fCommitP95": 5.100000000093132
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.800000000046566,
        "emitP95": 17.800000000046566,
        "domP50": 9.400000000023283,
        "domP95": 18.400000000023283
      },
      "edit_d4": {
        "emitP50": 6,
        "emitP95": 17.900000000023283,
        "domP50": 6.699999999953434,
        "domP95": 18.400000000023283
      },
      "edit_d10": {
        "emitP50": 7.299999999930151,
        "emitP95": 17.900000000023283,
        "domP50": 8.199999999953434,
        "domP95": 18.199999999953434
      },
      "loadCycle": {
        "emitP50": 17.5,
        "emitP95": 53.40000000002328,
        "domP50": 17.599999999976717,
        "domP95": 53.70000000006985
      },
      "step": {
        "emitP50": 7.5,
        "emitP95": 13.800000000046566,
        "domP50": 8.099999999976717,
        "domP95": 14.400000000023283
      },
      "reset": {
        "emitP50": 23.599999999976717,
        "emitP95": 38.09999999997672,
        "domP50": 23.699999999953434,
        "domP95": 38.09999999997672
      },
      "append100": {
        "emitP50": 15.599999999976717,
        "emitP95": 71.69999999995343,
        "domP50": 16,
        "domP95": 72
      },
      "control": {
        "emitP50": 6.700000000069849,
        "emitP95": 15.199999999953434,
        "domP50": 6.900000000023283,
        "domP95": 15.599999999976717
      },
      "heapMb": 5.496967315673828,
      "heapCode": 3.1636314392089844,
      "heapData": 1.8856430053710938,
      "pssTotalMb": 241.0947265625,
      "pssApp": 134.607421875,
      "pssRenderer": 106.4873046875,
      "relaunchReadyMs": 1465.5,
      "relaunchHeapMb": 4.441123962402344,
      "relaunchHeapCode": 2.2088966369628906,
      "relaunchHeapData": 1.8564186096191406
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.5,
          "emitP95": 15.900000000023283,
          "domP50": 8.199999999953434,
          "domP95": 16.400000000023283
        },
        "setKeys": {
          "emitP50": 9.099999999976717,
          "emitP95": 14.5,
          "domP50": 9.5,
          "domP95": 14.800000000046566
        },
        "replace": {
          "emitP50": 8.400000000023283,
          "emitP95": 18.599999999976717,
          "domP50": 8.900000000023283,
          "domP95": 18.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.700000000069849,
          "lagP95": 10.5,
          "endLag": 5.399999999906868,
          "maxBacklog": 3
        },
        "heapMb": 5.071544647216797,
        "heapCode": 3.017730712890625,
        "heapData": 1.6145057678222656,
        "pssTotalMb": 238.2783203125,
        "pssApp": 133.8876953125,
        "pssRenderer": 104.390625,
        "control": {
          "emitP50": 4.799999999930151,
          "emitP95": 16.699999999953434,
          "domP50": 5,
          "domP95": 16.899999999906868
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 8.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 7.899999999906868,
          "emitP95": 26.70000000006985,
          "domP50": 8.5,
          "domP95": 27.100000000093132
        },
        "setKeys": {
          "emitP50": 9.099999999976717,
          "emitP95": 20.099999999976717,
          "domP50": 9.400000000023283,
          "domP95": 20.699999999953434
        },
        "replace": {
          "emitP50": 7.799999999930151,
          "emitP95": 15.899999999906868,
          "domP50": 8.199999999953434,
          "domP95": 17
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.200000000069849,
          "lagP95": 17.599999999976717,
          "endLag": 10.199999999953434,
          "maxBacklog": 2
        },
        "heapMb": 5.570812225341797,
        "heapCode": 3.0466651916503906,
        "heapData": 2.06744384765625,
        "pssTotalMb": 239.294921875,
        "pssApp": 134.330078125,
        "pssRenderer": 104.96484375,
        "control": {
          "emitP50": 6.199999999953434,
          "emitP95": 19.79999999993015,
          "domP50": 6.400000000023283,
          "domP95": 20
        },
        "fCommitP50": 3.5,
        "fCommitP95": 5.399999999906868
      },
      "5000": {
        "setKey": {
          "emitP50": 11.599999999976717,
          "emitP95": 33.39999999990687,
          "domP50": 12.599999999976717,
          "domP95": 33.79999999993015
        },
        "setKeys": {
          "emitP50": 13.800000000046566,
          "emitP95": 33.40000000002328,
          "domP50": 15.099999999976717,
          "domP95": 34.300000000046566
        },
        "replace": {
          "emitP50": 13.5,
          "emitP95": 21.599999999976717,
          "domP50": 14.199999999953434,
          "domP95": 22.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.300000000046566,
          "lagP95": 21,
          "endLag": 9.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 9.94888687133789,
        "heapCode": 3.0914344787597656,
        "heapData": 6.259269714355469,
        "pssTotalMb": 248.830078125,
        "pssApp": 137.9677734375,
        "pssRenderer": 110.8623046875,
        "control": {
          "emitP50": 6.100000000093132,
          "emitP95": 14.300000000046566,
          "domP50": 6.200000000069849,
          "domP95": 14.5
        },
        "fCommitP50": 3.1000000000931323,
        "fCommitP95": 6.099999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.299999999930151,
        "emitP95": 18.29999999993015,
        "domP50": 9.20000000006985,
        "domP95": 18.599999999976717
      },
      "edit_d4": {
        "emitP50": 8.5,
        "emitP95": 15.800000000046566,
        "domP50": 9.100000000093132,
        "domP95": 16.099999999976717
      },
      "edit_d10": {
        "emitP50": 7.800000000046566,
        "emitP95": 17,
        "domP50": 8.5,
        "domP95": 17.599999999976717
      },
      "loadCycle": {
        "emitP50": 16.699999999953434,
        "emitP95": 55,
        "domP50": 16.79999999993015,
        "domP95": 55.40000000002328
      },
      "step": {
        "emitP50": 7.300000000046566,
        "emitP95": 17.599999999976717,
        "domP50": 7.900000000023283,
        "domP95": 17.800000000046566
      },
      "reset": {
        "emitP50": 22.599999999976717,
        "emitP95": 45.800000000046566,
        "domP50": 22.699999999953434,
        "domP95": 45.800000000046566
      },
      "append100": {
        "emitP50": 14.099999999976717,
        "emitP95": 52.800000000046566,
        "domP50": 14.5,
        "domP95": 53
      },
      "control": {
        "emitP50": 6.200000000069849,
        "emitP95": 21.699999999953434,
        "domP50": 6.5,
        "domP95": 21.899999999906868
      },
      "heapMb": 5.475273132324219,
      "heapCode": 3.1641769409179688,
      "heapData": 1.8627815246582031,
      "pssTotalMb": 242.5029296875,
      "pssApp": 136.0048828125,
      "pssRenderer": 106.498046875,
      "relaunchReadyMs": 1590.5,
      "relaunchHeapMb": 4.418483734130859,
      "relaunchHeapCode": 2.216045379638672,
      "relaunchHeapData": 1.8261985778808594
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8999999999068677,
          "domP50": 2.199999999953434,
          "domP95": 12.29999999993015
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 1.400000000023283,
          "domP95": 7.799999999930151
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1,
          "domP50": 1.3000000000465661,
          "domP95": 8.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.8000000000465661,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.563873291015625,
        "heapCode": 1.6889266967773438,
        "heapData": 1.5024337768554688,
        "pssTotalMb": 224.5400390625,
        "pssApp": 127.5732421875,
        "pssRenderer": 96.966796875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 3,
          "domP50": 4.5,
          "domP95": 9.70000000006985
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.599999999976717,
          "domP50": 1.400000000023283,
          "domP95": 6.799999999930151
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1,
          "domP50": 1.400000000023283,
          "domP95": 10.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6999999999534339,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 4.196811676025391,
        "heapCode": 1.9091682434082031,
        "heapData": 1.894744873046875,
        "pssTotalMb": 232.1142578125,
        "pssApp": 129.666015625,
        "pssRenderer": 102.4482421875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.8000000000465661,
          "domP50": 6.5,
          "domP95": 8.400000000023283
        },
        "setKeys": {
          "emitP50": 1.400000000023283,
          "emitP95": 3.800000000046566,
          "domP50": 4.599999999976717,
          "domP95": 10.099999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 5,
          "domP50": 1.8000000000465661,
          "domP95": 7.299999999930151
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999301508,
          "lagP95": 1.900000000023283,
          "endLag": 1.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 7.942237854003906,
        "heapCode": 1.6952476501464844,
        "heapData": 5.722129821777344,
        "pssTotalMb": 231.666015625,
        "pssApp": 126.08203125,
        "pssRenderer": 105.583984375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.099999999976717,
        "domP50": 1.599999999976717,
        "domP95": 8.900000000023283
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 2.599999999976717,
        "domP95": 7.099999999976717
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.5,
        "domP50": 2,
        "domP95": 7.800000000046566
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33.90000000002328,
        "domP50": 0.7000000000698492,
        "domP95": 34.300000000046566
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.9000000000232831,
        "domP50": 1,
        "domP95": 7.800000000046566
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 0.40000000002328306,
        "domP50": 0.19999999995343387,
        "domP95": 7
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.9000000000232831,
        "domP50": 0.8000000000465661,
        "domP95": 5.800000000046566
      },
      "heapMb": 3.938892364501953,
      "heapCode": 1.9267959594726562,
      "heapData": 1.6341629028320312,
      "pssTotalMb": 228.8798828125,
      "pssApp": 129.4248046875,
      "pssRenderer": 99.455078125,
      "relaunchReadyMs": 1290.1000000000931,
      "relaunchHeapMb": 3.3514938354492188,
      "relaunchHeapCode": 1.5398826599121094,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.2000000000698492,
          "emitP95": 0.5999999999767169,
          "domP50": 5.599999999976717,
          "domP95": 6.300000000046566
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.6999999999534339,
          "domP50": 0.9000000000232831,
          "domP95": 6.600000000093132
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 8,
          "domP50": 3.799999999930151,
          "domP95": 8.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.723834991455078,
        "heapCode": 1.8440513610839844,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 228.955078125,
        "pssApp": 130.8369140625,
        "pssRenderer": 98.1181640625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1,
          "domP50": 4.900000000023283,
          "domP95": 8.5
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.599999999976717,
          "domP50": 1.5,
          "domP95": 8.800000000046566
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 2.400000000023283,
          "domP50": 0.9000000000232831,
          "domP95": 8.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.5999999999767169,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 4.132709503173828,
        "heapCode": 1.8497238159179688,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 232.4423828125,
        "pssApp": 130.4560546875,
        "pssRenderer": 101.986328125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 3.900000000023283,
          "domP50": 3.900000000023283,
          "domP95": 9
        },
        "setKeys": {
          "emitP50": 1.400000000023283,
          "emitP95": 8.5,
          "domP50": 2.599999999976717,
          "domP95": 9.699999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 5.299999999930151,
          "domP50": 1.6000000000931323,
          "domP95": 9.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999301508,
          "lagP95": 1.7999999999301508,
          "endLag": 1.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 7.936893463134766,
        "heapCode": 1.6900520324707031,
        "heapData": 5.722118377685547,
        "pssTotalMb": 232.380859375,
        "pssApp": 126.884765625,
        "pssRenderer": 105.49609375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.40000000002328306,
        "domP50": 5.5,
        "domP95": 6.700000000069849
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1000000000931323,
        "domP50": 1.099999999976717,
        "domP95": 7.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 5.700000000069849,
        "domP50": 1.5,
        "domP95": 10.199999999953434
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 32.40000000002328,
        "domP50": 0.6999999999534339,
        "domP95": 32.60000000009313
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7000000000698492,
        "domP50": 0.7999999999301508,
        "domP95": 7.099999999976717
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 1.1999999999534339,
        "domP50": 0.19999999995343387,
        "domP95": 1.6999999999534339
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.5,
        "domP50": 0.9000000000232831,
        "domP95": 5.5
      },
      "heapMb": 3.9355201721191406,
      "heapCode": 1.9238128662109375,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 229.2822265625,
      "pssApp": 129.80859375,
      "pssRenderer": 99.4736328125,
      "relaunchReadyMs": 1295.0999999999767,
      "relaunchHeapMb": 3.3522491455078125,
      "relaunchHeapCode": 1.5400428771972656,
      "relaunchHeapData": 1.4465255737304688
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.900000000023283,
          "emitP95": 16.199999999953434,
          "domP50": 9.29999999993015,
          "domP95": 16.699999999953434
        },
        "setKeys": {
          "emitP50": 7.800000000046566,
          "emitP95": 14.400000000023283,
          "domP50": 8.70000000006985,
          "domP95": 14.800000000046566
        },
        "replace": {
          "emitP50": 7.100000000093132,
          "emitP95": 17.79999999993015,
          "domP50": 7.800000000046566,
          "domP95": 18.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 14.600000000093132,
          "endLag": 7,
          "maxBacklog": 2
        },
        "heapMb": 5.068019866943359,
        "heapCode": 3.0143699645996094,
        "heapData": 1.6147689819335938,
        "pssTotalMb": 238.7861328125,
        "pssApp": 134.4921875,
        "pssRenderer": 104.2939453125,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 16.599999999976717,
          "domP50": 6.700000000069849,
          "domP95": 17
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 6.099999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 7.5,
          "emitP95": 18.699999999953434,
          "domP50": 8.300000000046566,
          "domP95": 19.699999999953434
        },
        "setKeys": {
          "emitP50": 8.400000000023283,
          "emitP95": 31.400000000023283,
          "domP50": 8.900000000023283,
          "domP95": 31.900000000023283
        },
        "replace": {
          "emitP50": 6.800000000046566,
          "emitP95": 15.899999999906868,
          "domP50": 7.400000000023283,
          "domP95": 16.399999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.300000000046566,
          "lagP95": 12.400000000023283,
          "endLag": 6.700000000069849,
          "maxBacklog": 2
        },
        "heapMb": 5.564907073974609,
        "heapCode": 3.0406837463378906,
        "heapData": 2.0674591064453125,
        "pssTotalMb": 239.93359375,
        "pssApp": 134.7099609375,
        "pssRenderer": 105.2236328125,
        "control": {
          "emitP50": 6,
          "emitP95": 16.5,
          "domP50": 6.299999999930151,
          "domP95": 16.800000000046566
        },
        "fCommitP50": 3.5,
        "fCommitP95": 5.400000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 10.599999999976717,
          "emitP95": 30.5,
          "domP50": 11.199999999953434,
          "domP95": 31
        },
        "setKeys": {
          "emitP50": 10.300000000046566,
          "emitP95": 23.300000000046566,
          "domP50": 10.70000000006985,
          "domP95": 24.20000000006985
        },
        "replace": {
          "emitP50": 12.199999999953434,
          "emitP95": 18.399999999906868,
          "domP50": 12.599999999976717,
          "domP95": 19
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 14.400000000023283,
          "endLag": 7.300000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.95938491821289,
        "heapCode": 3.1005210876464844,
        "heapData": 6.259513854980469,
        "pssTotalMb": 247.7236328125,
        "pssApp": 137.119140625,
        "pssRenderer": 110.6044921875,
        "control": {
          "emitP50": 6.199999999953434,
          "emitP95": 17.5,
          "domP50": 6.700000000069849,
          "domP95": 17.900000000023283
        },
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 9.800000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.400000000023283,
        "emitP95": 16.29999999993015,
        "domP50": 9.099999999976717,
        "domP95": 16.599999999976717
      },
      "edit_d4": {
        "emitP50": 6.5,
        "emitP95": 12.29999999993015,
        "domP50": 7.400000000023283,
        "domP95": 12.899999999906868
      },
      "edit_d10": {
        "emitP50": 6.800000000046566,
        "emitP95": 17.900000000023283,
        "domP50": 7.800000000046566,
        "domP95": 19
      },
      "loadCycle": {
        "emitP50": 15.400000000023283,
        "emitP95": 55.40000000002328,
        "domP50": 15.5,
        "domP95": 55.699999999953434
      },
      "step": {
        "emitP50": 6.200000000069849,
        "emitP95": 25.300000000046566,
        "domP50": 6.599999999976717,
        "domP95": 25.70000000006985
      },
      "reset": {
        "emitP50": 25.70000000006985,
        "emitP95": 46.79999999993015,
        "domP50": 25.70000000006985,
        "domP95": 46.79999999993015
      },
      "append100": {
        "emitP50": 12.599999999976717,
        "emitP95": 62.59999999997672,
        "domP50": 13.199999999953434,
        "domP95": 63.199999999953434
      },
      "control": {
        "emitP50": 5.600000000093132,
        "emitP95": 13.5,
        "domP50": 5.900000000023283,
        "domP95": 13.800000000046566
      },
      "heapMb": 5.476825714111328,
      "heapCode": 3.1628761291503906,
      "heapData": 1.8658599853515625,
      "pssTotalMb": 241.5576171875,
      "pssApp": 135.1689453125,
      "pssRenderer": 106.388671875,
      "relaunchReadyMs": 793.4000000000233,
      "relaunchHeapMb": 4.416446685791016,
      "relaunchHeapCode": 2.2145042419433594,
      "relaunchHeapData": 1.8262367248535156
    }
  }
]
```
</details>
