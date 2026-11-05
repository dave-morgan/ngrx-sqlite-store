# Phase 16 shapes — flat objects & hybrid workflow (2026-10-30)

Measured alone on `emulator-5556` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.43 ms, p95 8.50 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 54 / CODE-BOUND 0 / FAIL 31

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.42 ± 0.04 | 9.96 ± 1.41 | 23.7× | FAIL | allow 9.5 (control emitP50 8.0×1) |
| flat | 50.setKey.emitP95 | 3.46 ± 3.65 | 25.20 ± 3.11 | 7.3× | PLATFORM-BOUND | allow 29.1 (control emitP95 22.3×1) |
| flat | 50.setKey.domP50 | 4.18 ± 1.44 | 10.58 ± 1.25 | 2.5× | PLATFORM-BOUND | allow 11.1 (control domP50 8.4×1) |
| flat | 50.setKey.domP95 | 9.78 ± 3.38 | 26.02 ± 2.93 | 2.7× | PLATFORM-BOUND | allow 28.9 (control domP95 22.6×1) |
| flat | 50.setKeys.emitP50 | 0.40 ± 0.00 | 9.00 ± 1.02 | 22.5× | PLATFORM-BOUND | allow 9.0 (control emitP50 8.0×1) |
| flat | 50.setKeys.emitP95 | 2.54 ± 1.49 | 28.58 ± 11.65 | 11.3× | PLATFORM-BOUND | allow 35.4 (control emitP95 22.3×1) |
| flat | 50.setKeys.domP50 | 3.24 ± 2.28 | 9.52 ± 1.08 | 2.9× | PLATFORM-BOUND | allow 11.8 (control domP50 8.4×1) |
| flat | 50.setKeys.domP95 | 10.74 ± 4.45 | 28.98 ± 11.65 | 2.7× | PLATFORM-BOUND | allow 38.7 (control domP95 22.6×1) |
| flat | 50.replace.emitP50 | 0.32 ± 0.04 | 9.34 ± 0.86 | 29.2× | FAIL | allow 8.9 (control emitP50 8.0×1) |
| flat | 50.replace.emitP95 | 4.42 ± 3.60 | 26.72 ± 6.81 | 6.0× | PLATFORM-BOUND | allow 32.7 (control emitP95 22.3×1) |
| flat | 50.replace.domP50 | 2.28 ± 1.69 | 9.90 ± 0.77 | 4.3× | PLATFORM-BOUND | allow 10.9 (control domP50 8.4×1) |
| flat | 50.replace.domP95 | 10.10 ± 2.74 | 27.28 ± 6.93 | 2.7× | PLATFORM-BOUND | allow 32.3 (control domP95 22.6×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 7.54 ± 1.31 | 25.1× | PLATFORM-BOUND | allow 9.3 (control emitP50 8.0×1) |
| flat | 50.burst.lagP95 | 0.68 ± 0.15 | 20.96 ± 1.70 | 30.8× | PLATFORM-BOUND | allow 24.1 (control emitP95 22.3×1) |
| flat | 50.burst.endLag | 0.30 ± 0.10 | 8.32 ± 3.35 | 27.7× | PLATFORM-BOUND | allow 11.5 (control emitP50 8.0×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.60 ± 0.55 | 2600000000.0× | FAIL |  |
| flat | 50.heapMb | 3.72 ± 0.00 | 5.06 ± 0.01 | 1.4× | FAIL | code +1.16 MB; data 1.51 -> 1.62 MB |
| flat | 50.pssTotalMb | 223.07 ± 1.96 | 233.45 ± 1.94 | 1.0× | FAIL | allow 6.7 (plugin baseline 2.8 MB) |
| flat | 500.setKey.emitP50 | 0.48 ± 0.04 | 9.78 ± 1.26 | 20.4× | FAIL | allow 8.9 (control emitP50 7.6×1) |
| flat | 500.setKey.emitP95 | 1.20 ± 0.44 | 21.50 ± 3.74 | 17.9× | PLATFORM-BOUND | allow 24.6 (control emitP95 20.4×1) |
| flat | 500.setKey.domP50 | 4.14 ± 1.80 | 10.62 ± 0.91 | 2.6× | PLATFORM-BOUND | allow 10.9 (control domP50 8.2×1) |
| flat | 500.setKey.domP95 | 10.34 ± 4.81 | 22.08 ± 3.72 | 2.1× | PLATFORM-BOUND | allow 29.2 (control domP95 20.7×1) |
| flat | 500.setKeys.emitP50 | 0.52 ± 0.08 | 9.30 ± 0.48 | 17.9× | FAIL | allow 8.2 (control emitP50 7.6×1) |
| flat | 500.setKeys.emitP95 | 4.92 ± 4.54 | 29.22 ± 7.80 | 5.9× | PLATFORM-BOUND | allow 32.7 (control emitP95 20.4×1) |
| flat | 500.setKeys.domP50 | 3.06 ± 1.83 | 9.88 ± 0.41 | 3.2× | PLATFORM-BOUND | allow 10.4 (control domP50 8.2×1) |
| flat | 500.setKeys.domP95 | 11.06 ± 5.73 | 29.92 ± 7.70 | 2.7× | PLATFORM-BOUND | allow 34.1 (control domP95 20.7×1) |
| flat | 500.replace.emitP50 | 0.36 ± 0.05 | 9.48 ± 0.94 | 26.3× | FAIL | allow 8.6 (control emitP50 7.6×1) |
| flat | 500.replace.emitP95 | 1.50 ± 1.17 | 23.30 ± 3.74 | 15.5× | PLATFORM-BOUND | allow 25.3 (control emitP95 20.4×1) |
| flat | 500.replace.domP50 | 2.08 ± 1.75 | 10.14 ± 1.46 | 4.9× | PLATFORM-BOUND | allow 11.4 (control domP50 8.2×1) |
| flat | 500.replace.domP95 | 10.58 ± 2.37 | 24.36 ± 3.55 | 2.3× | PLATFORM-BOUND | allow 26.6 (control domP95 20.7×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 7.08 ± 1.08 | 17.7× | PLATFORM-BOUND | allow 8.7 (control emitP50 7.6×1) |
| flat | 500.burst.lagP95 | 0.92 ± 0.22 | 17.46 ± 3.65 | 19.0× | PLATFORM-BOUND | allow 24.3 (control emitP95 20.4×1) |
| flat | 500.burst.endLag | 0.50 ± 0.23 | 7.78 ± 2.90 | 15.6× | PLATFORM-BOUND | allow 10.8 (control emitP50 7.6×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.20 ± 0.45 | 2200000000.0× | FAIL |  |
| flat | 500.heapMb | 4.10 ± 0.07 | 5.55 ± 0.01 | 1.4× | FAIL | code +1.21 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 225.70 ± 2.74 | 233.80 ± 1.80 | 1.0× | FAIL | allow 7.3 (plugin baseline 2.8 MB) |
| flat | 5000.setKey.emitP50 | 1.70 ± 0.12 | 11.32 ± 0.89 | 6.7× | FAIL | allow 7.8 (control emitP50 6.8×1) |
| flat | 5000.setKey.emitP95 | 4.48 ± 1.16 | 23.78 ± 2.74 | 5.3× | PLATFORM-BOUND | allow 22.7 (control emitP95 18.8×1) |
| flat | 5000.setKey.domP50 | 3.94 ± 0.97 | 12.20 ± 0.57 | 3.1× | PLATFORM-BOUND | allow 8.7 (control domP50 7.2×1) |
| flat | 5000.setKey.domP95 | 9.92 ± 1.25 | 25.48 ± 2.32 | 2.6× | PLATFORM-BOUND | allow 22.6 (control domP95 19.0×1) |
| flat | 5000.setKeys.emitP50 | 1.60 ± 0.12 | 11.44 ± 1.78 | 7.2× | FAIL | allow 8.7 (control emitP50 6.8×1) |
| flat | 5000.setKeys.emitP95 | 8.06 ± 4.74 | 25.22 ± 4.69 | 3.1× | PLATFORM-BOUND | allow 28.2 (control emitP95 18.8×1) |
| flat | 5000.setKeys.domP50 | 4.56 ± 1.71 | 12.02 ± 1.73 | 2.6× | PLATFORM-BOUND | allow 10.6 (control domP50 7.2×1) |
| flat | 5000.setKeys.domP95 | 11.40 ± 3.28 | 27.68 ± 4.09 | 2.4× | PLATFORM-BOUND | allow 26.4 (control domP95 19.0×1) |
| flat | 5000.replace.emitP50 | 0.38 ± 0.04 | 14.38 ± 1.19 | 37.8× | FAIL | allow 8.0 (control emitP50 6.8×1) |
| flat | 5000.replace.emitP95 | 2.98 ± 1.18 | 25.68 ± 1.42 | 8.6× | FAIL | allow 21.4 (control emitP95 18.8×1) |
| flat | 5000.replace.domP50 | 1.84 ± 0.43 | 14.80 ± 1.19 | 8.0× | FAIL | allow 8.8 (control domP50 7.2×1) |
| flat | 5000.replace.domP95 | 8.96 ± 3.69 | 26.20 ± 1.47 | 2.9× | PLATFORM-BOUND | allow 24.2 (control domP95 19.0×1) |
| flat | 5000.burst.lagP50 | 1.38 ± 0.04 | 9.60 ± 0.88 | 7.0× | FAIL | allow 7.7 (control emitP50 6.8×1) |
| flat | 5000.burst.lagP95 | 4.14 ± 3.29 | 19.78 ± 2.47 | 4.8× | PLATFORM-BOUND | allow 24.5 (control emitP95 18.8×1) |
| flat | 5000.burst.endLag | 1.26 ± 0.27 | 11.28 ± 5.61 | 9.0× | PLATFORM-BOUND | allow 12.6 (control emitP50 6.8×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.10 ± 0.00 | 9.94 ± 0.00 | 1.2× | FAIL | code +1.23 MB; data 5.73 -> 6.26 MB |
| flat | 5000.pssTotalMb | 230.41 ± 1.88 | 247.23 ± 1.65 | 1.1× | FAIL | allow 6.3 (plugin baseline 2.8 MB) |
| workflow | edit_d1.emitP50 | 0.42 ± 0.08 | 10.06 ± 1.99 | 24.0× | PLATFORM-BOUND | allow 9.8 (control emitP50 7.7×1) |
| workflow | edit_d1.emitP95 | 1.92 ± 1.10 | 25.46 ± 5.06 | 13.3× | PLATFORM-BOUND | allow 29.5 (control emitP95 23.3×1) |
| workflow | edit_d1.domP50 | 3.98 ± 1.78 | 11.00 ± 1.81 | 2.8× | PLATFORM-BOUND | allow 11.8 (control domP50 8.2×1) |
| workflow | edit_d1.domP95 | 10.28 ± 3.70 | 26.06 ± 5.16 | 2.5× | PLATFORM-BOUND | allow 32.5 (control domP95 23.6×1) |
| workflow | edit_d4.emitP50 | 0.40 ± 0.00 | 9.86 ± 0.97 | 24.6× | FAIL | allow 8.7 (control emitP50 7.7×1) |
| workflow | edit_d4.emitP95 | 2.08 ± 1.33 | 24.70 ± 3.97 | 11.9× | PLATFORM-BOUND | allow 28.6 (control emitP95 23.3×1) |
| workflow | edit_d4.domP50 | 3.76 ± 1.89 | 11.30 ± 1.66 | 3.0× | PLATFORM-BOUND | allow 11.7 (control domP50 8.2×1) |
| workflow | edit_d4.domP95 | 9.08 ± 2.06 | 26.44 ± 3.78 | 2.9× | PLATFORM-BOUND | allow 29.5 (control domP95 23.6×1) |
| workflow | edit_d10.emitP50 | 0.46 ± 0.05 | 9.64 ± 1.22 | 21.0× | FAIL | allow 9.0 (control emitP50 7.7×1) |
| workflow | edit_d10.emitP95 | 1.22 ± 0.38 | 20.78 ± 1.92 | 17.0× | PLATFORM-BOUND | allow 25.6 (control emitP95 23.3×1) |
| workflow | edit_d10.domP50 | 2.34 ± 1.69 | 10.38 ± 1.05 | 4.4× | PLATFORM-BOUND | allow 10.9 (control domP50 8.2×1) |
| workflow | edit_d10.domP95 | 9.40 ± 1.36 | 21.20 ± 1.88 | 2.3× | PLATFORM-BOUND | allow 26.9 (control domP95 23.6×1) |
| workflow | loadCycle.emitP50 | 6.00 ± 7.67 | 18.26 ± 1.66 | 3.0× | PLATFORM-BOUND | allow 24.7 (control emitP50 7.7×2) |
| workflow | loadCycle.emitP95 | 34.42 ± 1.41 | 55.42 ± 0.25 | 1.6× | PLATFORM-BOUND | allow 48.3 (control emitP95 23.3×2) |
| workflow | loadCycle.domP50 | 6.48 ± 8.16 | 18.50 ± 1.75 | 2.9× | PLATFORM-BOUND | allow 26.3 (control domP50 8.2×2) |
| workflow | loadCycle.domP95 | 35.06 ± 1.19 | 55.82 ± 0.25 | 1.6× | PLATFORM-BOUND | allow 48.7 (control domP95 23.6×2) |
| workflow | step.emitP50 | 0.34 ± 0.05 | 9.02 ± 1.87 | 26.5× | PLATFORM-BOUND | allow 9.6 (control emitP50 7.7×1) |
| workflow | step.emitP95 | 2.20 ± 1.71 | 29.52 ± 9.28 | 13.4× | PLATFORM-BOUND | allow 34.3 (control emitP95 23.3×1) |
| workflow | step.domP50 | 2.48 ± 1.76 | 9.52 ± 1.79 | 3.8× | PLATFORM-BOUND | allow 11.7 (control domP50 8.2×1) |
| workflow | step.domP95 | 9.56 ± 1.54 | 30.04 ± 9.30 | 3.1× | PLATFORM-BOUND | allow 34.5 (control domP95 23.6×1) |
| workflow | reset.emitP50 | 0.22 ± 0.04 | 30.82 ± 1.22 | 140.1× | FAIL | allow 9.0 (control emitP50 7.7×1) |
| workflow | reset.emitP95 | 0.64 ± 0.29 | 41.30 ± 5.34 | 64.5× | FAIL | allow 28.9 (control emitP95 23.3×1) |
| workflow | reset.domP50 | 0.28 ± 0.04 | 30.82 ± 1.22 | 110.1× | FAIL | allow 9.4 (control domP50 8.2×1) |
| workflow | reset.domP95 | 1.28 ± 0.45 | 41.30 ± 5.34 | 32.3× | FAIL | allow 29.4 (control domP95 23.6×1) |
| workflow | append100.emitP50 | 0.44 ± 0.05 | 13.80 ± 1.75 | 31.4× | FAIL | allow 9.5 (control emitP50 7.7×1) |
| workflow | append100.emitP95 | 1.38 ± 1.01 | 24.20 ± 2.32 | 17.5× | PLATFORM-BOUND | allow 26.6 (control emitP95 23.3×1) |
| workflow | append100.domP50 | 1.58 ± 0.75 | 14.30 ± 1.85 | 9.1× | FAIL | allow 10.8 (control domP50 8.2×1) |
| workflow | append100.domP95 | 6.22 ± 0.73 | 24.82 ± 2.42 | 4.0× | PLATFORM-BOUND | allow 26.8 (control domP95 23.6×1) |
| workflow | heapMb | 3.94 ± 0.00 | 5.50 ± 0.01 | 1.4× | FAIL | code +1.25 MB; data 1.63 -> 1.88 MB |
| workflow | pssTotalMb | 223.44 ± 1.99 | 237.37 ± 1.80 | 1.1× | FAIL | allow 6.6 (plugin baseline 2.8 MB) |
| workflow | relaunchReadyMs | 1149.78 ± 427.82 | 575.36 ± 239.74 | 0.5× | PASS |  |
| workflow | relaunchHeapMb | 3.35 ± 0.00 | 4.43 ± 0.10 | 1.3× | FAIL | code +0.70 MB; data 1.45 -> 1.82 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 8.02 | 8.40 | 22.62 | 9.96 | 10.58 | 26.02 |
| 500 | 7.64 | 8.16 | 20.66 | 9.78 | 10.62 | 22.08 |
| 5000 | 6.76 | 7.20 | 19.02 | 11.32 | 12.20 | 25.48 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 126.0 | 130.6 | 97.0 | 102.8 |
| flat 500 | 125.3 | 130.3 | 100.4 | 103.5 |
| flat 5000 | 124.9 | 138.3 | 105.5 | 108.9 |
| workflow | 125.4 | 132.5 | 98.0 | 104.8 |

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
          "emitP95": 2.199999999953434,
          "domP50": 5.699999999953434,
          "domP95": 7.5
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7000000000116415,
          "domP50": 1.099999999976717,
          "domP95": 8.5
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 0.7999999999883585,
          "domP50": 1.900000000023283,
          "domP95": 7.2000000000116415
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.7000000000116415,
          "endLag": 0.20000000001164153,
          "maxBacklog": 0
        },
        "heapMb": 3.7240562438964844,
        "heapCode": 1.8443603515625,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 220.5439453125,
        "pssApp": 124.109375,
        "pssRenderer": 96.4345703125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.1000000000349246,
          "domP50": 1.8000000000465661,
          "domP95": 17.79999999998836
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.2999999999883585,
          "domP50": 4.2000000000116415,
          "domP95": 8.599999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5999999999767169,
          "domP50": 1.099999999976717,
          "domP95": 10.600000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1.2000000000116415,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.9748153686523438,
        "heapCode": 1.6966629028320312,
        "heapData": 1.8917236328125,
        "pssTotalMb": 221.27734375,
        "pssApp": 122.72265625,
        "pssRenderer": 98.5546875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 5.400000000023283,
          "domP50": 5.600000000034925,
          "domP95": 10.399999999965075
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 4,
          "domP50": 5.7000000000116415,
          "domP95": 7.800000000046566
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.8999999999650754,
          "domP50": 1.6000000000349246,
          "domP95": 8.700000000011642
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.599999999976717,
          "endLag": 1.6000000000349246,
          "maxBacklog": 0
        },
        "heapMb": 8.099853515625,
        "heapCode": 1.8477210998535156,
        "heapData": 5.725620269775391,
        "pssTotalMb": 228.759765625,
        "pssApp": 123.98828125,
        "pssRenderer": 104.771484375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.5,
        "domP50": 5.2999999999883585,
        "domP95": 7
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.2999999999883585,
        "domP50": 2.599999999976717,
        "domP95": 12.5
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.7999999999883585,
        "domP50": 2.2000000000116415,
        "domP95": 8.700000000011642
      },
      "loadCycle": {
        "emitP50": 0.30000000004656613,
        "emitP95": 32.90000000002328,
        "domP50": 0.5,
        "domP95": 34.5
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 3.400000000023283,
        "domP50": 1.8999999999650754,
        "domP95": 11.200000000011642
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 0.7000000000116415,
        "domP50": 0.29999999998835847,
        "domP95": 0.8999999999650754
      },
      "append100": {
        "emitP50": 0.3999999999650754,
        "emitP95": 0.5,
        "domP50": 1.2000000000116415,
        "domP95": 6.900000000023283
      },
      "heapMb": 3.9355010986328125,
      "heapCode": 1.9238128662109375,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 220.7099609375,
      "pssApp": 123.6796875,
      "pssRenderer": 97.0302734375,
      "relaunchReadyMs": 1486.7999999999884,
      "relaunchHeapMb": 3.3516311645507812,
      "relaunchHeapCode": 1.5400199890136719,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10.200000000011642,
          "emitP95": 27.699999999953434,
          "domP50": 10.699999999953434,
          "domP95": 27.899999999965075
        },
        "setKeys": {
          "emitP50": 10.5,
          "emitP95": 46.899999999965075,
          "domP50": 11.100000000034925,
          "domP95": 47.29999999998836
        },
        "replace": {
          "emitP50": 9,
          "emitP95": 37.79999999998836,
          "domP50": 9.5,
          "domP95": 38.59999999997672
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9,
          "lagP95": 23.79999999998836,
          "endLag": 13.599999999976717,
          "maxBacklog": 3
        },
        "heapMb": 5.054920196533203,
        "heapCode": 3.000019073486328,
        "heapData": 1.6164054870605469,
        "pssTotalMb": 230.859375,
        "pssApp": 128.7890625,
        "pssRenderer": 102.0703125,
        "control": {
          "emitP50": 11.599999999976717,
          "emitP95": 17.5,
          "domP50": 12,
          "domP95": 17.900000000023283
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 6.599999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 10.099999999976717,
          "emitP95": 27.100000000034925,
          "domP50": 10.5,
          "domP95": 27.70000000001164
        },
        "setKeys": {
          "emitP50": 10.099999999976717,
          "emitP95": 42.5,
          "domP50": 10.5,
          "domP95": 42.899999999965075
        },
        "replace": {
          "emitP50": 9.299999999988358,
          "emitP95": 22.70000000001164,
          "domP50": 9.600000000034925,
          "domP95": 23.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.100000000034925,
          "lagP95": 15.700000000011642,
          "endLag": 9.399999999965075,
          "maxBacklog": 2
        },
        "heapMb": 5.5451202392578125,
        "heapCode": 3.0205459594726562,
        "heapData": 2.0694007873535156,
        "pssTotalMb": 232.81640625,
        "pssApp": 130.173828125,
        "pssRenderer": 102.642578125,
        "control": {
          "emitP50": 6.900000000023283,
          "emitP95": 23.100000000034925,
          "domP50": 7.599999999976717,
          "domP95": 23.400000000023283
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 9.600000000034925
      },
      "5000": {
        "setKey": {
          "emitP50": 10.099999999976717,
          "emitP95": 21.20000000001164,
          "domP50": 12,
          "domP95": 25
        },
        "setKeys": {
          "emitP50": 11,
          "emitP95": 31.199999999953434,
          "domP50": 11.400000000023283,
          "domP95": 31.599999999976717
        },
        "replace": {
          "emitP50": 16.400000000023283,
          "emitP95": 27.900000000023283,
          "domP50": 16.79999999998836,
          "domP95": 28.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.799999999988358,
          "lagP95": 23.399999999965075,
          "endLag": 13.799999999988358,
          "maxBacklog": 2
        },
        "heapMb": 9.942176818847656,
        "heapCode": 3.0830535888671875,
        "heapData": 6.260753631591797,
        "pssTotalMb": 245.681640625,
        "pssApp": 137.560546875,
        "pssRenderer": 108.12109375,
        "control": {
          "emitP50": 7.100000000034925,
          "emitP95": 22.400000000023283,
          "domP50": 7.7000000000116415,
          "domP95": 22.70000000001164
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 6.5
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.900000000023283,
        "emitP95": 22.300000000046566,
        "domP50": 10.5,
        "domP95": 22.600000000034925
      },
      "edit_d4": {
        "emitP50": 9.299999999988358,
        "emitP95": 22,
        "domP50": 14,
        "domP95": 28.600000000034925
      },
      "edit_d10": {
        "emitP50": 11.299999999988358,
        "emitP95": 21,
        "domP50": 11.900000000023283,
        "domP95": 21.29999999998836
      },
      "loadCycle": {
        "emitP50": 19.5,
        "emitP95": 55.59999999997672,
        "domP50": 19.79999999998836,
        "domP95": 56
      },
      "step": {
        "emitP50": 12,
        "emitP95": 27.899999999965075,
        "domP50": 12.200000000011642,
        "domP95": 28.29999999998836
      },
      "reset": {
        "emitP50": 30.5,
        "emitP95": 42,
        "domP50": 30.5,
        "domP95": 42
      },
      "append100": {
        "emitP50": 12.5,
        "emitP95": 21.79999999998836,
        "domP50": 13,
        "domP95": 22.20000000001164
      },
      "control": {
        "emitP50": 8.099999999976717,
        "emitP95": 18.100000000034925,
        "domP50": 9,
        "domP95": 18.400000000023283
      },
      "heapMb": 5.500637054443359,
      "heapCode": 3.1755523681640625,
      "heapData": 1.877410888671875,
      "pssTotalMb": 235.3212890625,
      "pssApp": 131.435546875,
      "pssRenderer": 103.8857421875,
      "relaunchReadyMs": 858.1999999999534,
      "relaunchHeapMb": 4.325756072998047,
      "relaunchHeapCode": 2.1241073608398438,
      "relaunchHeapData": 1.8260955810546875
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.900000000023283,
          "emitP95": 26.899999999965075,
          "domP50": 9.600000000034925,
          "domP95": 27.599999999976717
        },
        "setKeys": {
          "emitP50": 8.399999999965075,
          "emitP95": 24.29999999998836,
          "domP50": 8.899999999965075,
          "domP95": 24.699999999953434
        },
        "replace": {
          "emitP50": 10.099999999976717,
          "emitP95": 25.600000000034925,
          "domP50": 10.399999999965075,
          "domP95": 26.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.599999999976717,
          "lagP95": 20.399999999965075,
          "endLag": 8.700000000011642,
          "maxBacklog": 3
        },
        "heapMb": 5.053852081298828,
        "heapCode": 2.9986648559570312,
        "heapData": 1.6161384582519531,
        "pssTotalMb": 232.189453125,
        "pssApp": 130.232421875,
        "pssRenderer": 101.95703125,
        "control": {
          "emitP50": 7.7000000000116415,
          "emitP95": 16.79999999998836,
          "domP50": 8.299999999988358,
          "domP95": 17.099999999976717
        },
        "fCommitP50": 3.1000000000349246,
        "fCommitP95": 16.5
      },
      "500": {
        "setKey": {
          "emitP50": 11.700000000011642,
          "emitP95": 20.100000000034925,
          "domP50": 12.200000000011642,
          "domP95": 21.300000000046566
        },
        "setKeys": {
          "emitP50": 9.199999999953434,
          "emitP95": 29.300000000046566,
          "domP50": 10,
          "domP95": 29.70000000001164
        },
        "replace": {
          "emitP50": 8.5,
          "emitP95": 25.70000000001164,
          "domP50": 8.800000000046566,
          "domP95": 27.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.399999999965075,
          "lagP95": 23.29999999998836,
          "endLag": 12.100000000034925,
          "maxBacklog": 2
        },
        "heapMb": 5.546390533447266,
        "heapCode": 3.0220794677734375,
        "heapData": 2.0690956115722656,
        "pssTotalMb": 231.38671875,
        "pssApp": 128.85546875,
        "pssRenderer": 102.53125,
        "control": {
          "emitP50": 7.800000000046566,
          "emitP95": 20.099999999976717,
          "domP50": 8.5,
          "domP95": 20.29999999993015
        },
        "fCommitP50": 3.799999999930151,
        "fCommitP95": 10.599999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 11.400000000023283,
          "emitP95": 23.5,
          "domP50": 11.900000000023283,
          "domP95": 24.599999999976717
        },
        "setKeys": {
          "emitP50": 11.800000000046566,
          "emitP95": 21,
          "domP50": 12.300000000046566,
          "domP95": 23.20000000006985
        },
        "replace": {
          "emitP50": 13.599999999976717,
          "emitP95": 26.199999999953434,
          "domP50": 14,
          "domP95": 26.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.099999999976717,
          "lagP95": 17.20000000006985,
          "endLag": 6.200000000069849,
          "maxBacklog": 2
        },
        "heapMb": 9.93271255493164,
        "heapCode": 3.074535369873047,
        "heapData": 6.260875701904297,
        "pssTotalMb": 245.3603515625,
        "pssApp": 136.92578125,
        "pssRenderer": 108.4345703125,
        "control": {
          "emitP50": 6.900000000023283,
          "emitP95": 19.800000000046566,
          "domP50": 7.5,
          "domP95": 20.199999999953434
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 9.699999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 13.400000000023283,
        "emitP95": 29.70000000006985,
        "domP50": 13.800000000046566,
        "domP95": 30.300000000046566
      },
      "edit_d4": {
        "emitP50": 9.900000000023283,
        "emitP95": 24.800000000046566,
        "domP50": 10.199999999953434,
        "domP95": 25.5
      },
      "edit_d10": {
        "emitP50": 8.20000000006985,
        "emitP95": 20.100000000093132,
        "domP50": 9.29999999993015,
        "domP95": 21
      },
      "loadCycle": {
        "emitP50": 18.400000000023283,
        "emitP95": 55.59999999997672,
        "domP50": 18.5,
        "domP95": 56
      },
      "step": {
        "emitP50": 9,
        "emitP95": 45.59999999997672,
        "domP50": 9.5,
        "domP95": 46.199999999953434
      },
      "reset": {
        "emitP50": 30.199999999953434,
        "emitP95": 41.09999999997672,
        "domP50": 30.199999999953434,
        "domP95": 41.09999999997672
      },
      "append100": {
        "emitP50": 16.20000000006985,
        "emitP95": 27.199999999953434,
        "domP50": 16.599999999976717,
        "domP95": 27.5
      },
      "control": {
        "emitP50": 9,
        "emitP95": 20.599999999976717,
        "domP50": 9.5,
        "domP95": 20.900000000023283
      },
      "heapMb": 5.499778747558594,
      "heapCode": 3.1744956970214844,
      "heapData": 1.8773574829101562,
      "pssTotalMb": 235.666015625,
      "pssApp": 131.591796875,
      "pssRenderer": 104.07421875,
      "relaunchReadyMs": 439.5999999999767,
      "relaunchHeapMb": 4.52777099609375,
      "relaunchHeapCode": 2.3187637329101562,
      "relaunchHeapData": 1.8308868408203125
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
          "domP50": 4.400000000023283,
          "domP95": 7.200000000069849
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.400000000023283,
          "domP50": 5.199999999953434,
          "domP95": 10.599999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 5.800000000046566,
          "domP50": 1.1000000000931323,
          "domP95": 14.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.7000000000698492,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.7229537963867188,
        "heapCode": 1.8434677124023438,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 221.3916015625,
        "pssApp": 125.3251953125,
        "pssRenderer": 96.06640625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.099999999976717,
          "domP50": 5.199999999953434,
          "domP95": 12.599999999976717
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 11.800000000046566,
          "domP50": 5.299999999930151,
          "domP95": 18.800000000046566
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.2999999999301508,
          "domP50": 1.599999999976717,
          "domP95": 12.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1,
          "endLag": 0.8999999999068677,
          "maxBacklog": 0
        },
        "heapMb": 4.135356903076172,
        "heapCode": 1.8522071838378906,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 224.861328125,
        "pssApp": 125.1328125,
        "pssRenderer": 99.728515625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.8999999999068677,
          "emitP95": 5.600000000093132,
          "domP50": 3.699999999953434,
          "domP95": 9.5
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 8.300000000046566,
          "domP50": 2.700000000069849,
          "domP95": 11.20000000006985
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 3.200000000069849,
          "domP50": 1.6000000000931323,
          "domP95": 15.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999068677,
          "lagP95": 3.099999999976717,
          "endLag": 1.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 8.097248077392578,
        "heapCode": 1.8451194763183594,
        "heapData": 5.725639343261719,
        "pssTotalMb": 228.884765625,
        "pssApp": 124.30078125,
        "pssRenderer": 104.583984375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 3.5,
        "domP50": 5.199999999953434,
        "domP95": 15.699999999953434
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.3000000000465661,
        "domP50": 2.700000000069849,
        "domP95": 9.20000000006985
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1000000000931323,
        "domP50": 1.6000000000931323,
        "domP95": 8.20000000006985
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33,
        "domP50": 0.5999999999767169,
        "domP95": 33.40000000002328
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 1.400000000023283,
        "domP50": 1.900000000023283,
        "domP95": 8.599999999976717
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5999999999767169,
        "domP50": 0.30000000004656613,
        "domP95": 1.2999999999301508
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1.1000000000931323,
        "domP95": 5.200000000069849
      },
      "heapMb": 3.935272216796875,
      "heapCode": 1.9235763549804688,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 221.900390625,
      "pssApp": 124.5751953125,
      "pssRenderer": 97.3251953125,
      "relaunchReadyMs": 1439.7000000000698,
      "relaunchHeapMb": 3.3515701293945312,
      "relaunchHeapCode": 1.5399589538574219,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.5,
          "domP50": 5.299999999930151,
          "domP95": 11.400000000023283
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.699999999953434,
          "domP50": 6,
          "domP95": 9.899999999906868
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 5.099999999976717,
          "domP50": 2.099999999976717,
          "domP95": 9.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.39999999990686774,
          "maxBacklog": 0
        },
        "heapMb": 3.7252731323242188,
        "heapCode": 1.8455543518066406,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.8115234375,
        "pssApp": 127.421875,
        "pssRenderer": 97.3896484375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.1999999999534339,
          "domP50": 2.6000000000931323,
          "domP95": 7.099999999976717
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 3,
          "domP50": 1.099999999976717,
          "domP95": 6.099999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.400000000023283,
          "domP50": 5.200000000069849,
          "domP95": 13.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.9000000000232831,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 4.132762908935547,
        "heapCode": 1.8497772216796875,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 227.6904296875,
        "pssApp": 126.5771484375,
        "pssRenderer": 101.11328125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 3.099999999976717,
          "domP50": 3.900000000023283,
          "domP95": 11.5
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 8.100000000093132,
          "domP50": 6.799999999930151,
          "domP95": 9.5
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.699999999953434,
          "domP50": 2.599999999976717,
          "domP95": 6.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.599999999976717,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.097373962402344,
        "heapCode": 1.845245361328125,
        "heapData": 5.725639343261719,
        "pssTotalMb": 229.5380859375,
        "pssApp": 123.1953125,
        "pssRenderer": 106.3427734375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.8000000000465661,
        "domP50": 2.400000000023283,
        "domP95": 10.899999999906868
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.5,
        "domP50": 5.799999999930151,
        "domP95": 8.699999999953434
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 0.9000000000232831,
        "domP50": 1.2999999999301508,
        "domP95": 11.199999999953434
      },
      "loadCycle": {
        "emitP50": 14.199999999953434,
        "emitP95": 34.699999999953434,
        "domP50": 14.699999999953434,
        "domP95": 35
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 1.2999999999301508,
        "domP95": 10.100000000093132
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.40000000002328306,
        "domP50": 0.2000000000698492,
        "domP95": 0.9000000000232831
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.799999999930151,
        "domP50": 2.700000000069849,
        "domP95": 6.600000000093132
      },
      "heapMb": 3.9355087280273438,
      "heapCode": 1.9238014221191406,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 224.9296875,
      "pssApp": 126.2138671875,
      "pssRenderer": 98.7158203125,
      "relaunchReadyMs": 1459.3000000000466,
      "relaunchHeapMb": 3.351482391357422,
      "relaunchHeapCode": 1.5398826599121094,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.900000000023283,
          "emitP95": 25.100000000093132,
          "domP50": 10,
          "domP95": 25.5
        },
        "setKeys": {
          "emitP50": 8.400000000023283,
          "emitP95": 26.899999999906868,
          "domP50": 8.70000000006985,
          "domP95": 27.29999999993015
        },
        "replace": {
          "emitP50": 8.199999999953434,
          "emitP95": 27.599999999976717,
          "domP50": 9.199999999953434,
          "domP95": 28.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.100000000093132,
          "lagP95": 20.300000000046566,
          "endLag": 4.5,
          "maxBacklog": 3
        },
        "heapMb": 5.064296722412109,
        "heapCode": 3.0083847045898438,
        "heapData": 1.6164436340332031,
        "pssTotalMb": 233.619140625,
        "pssApp": 130.310546875,
        "pssRenderer": 103.30859375,
        "control": {
          "emitP50": 7,
          "emitP95": 25.099999999976717,
          "domP50": 7.400000000023283,
          "domP95": 25.300000000046566
        },
        "fCommitP50": 3.5,
        "fCommitP95": 11.70000000006985
      },
      "500": {
        "setKey": {
          "emitP50": 8.300000000046566,
          "emitP95": 16.79999999993015,
          "domP50": 10.099999999976717,
          "domP95": 17.29999999993015
        },
        "setKeys": {
          "emitP50": 8.800000000046566,
          "emitP95": 23,
          "domP50": 9.5,
          "domP95": 23.699999999953434
        },
        "replace": {
          "emitP50": 10.599999999976717,
          "emitP95": 17.29999999993015,
          "domP50": 11.099999999976717,
          "domP95": 18.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.400000000023283,
          "lagP95": 18.5,
          "endLag": 5.199999999953434,
          "maxBacklog": 2
        },
        "heapMb": 5.556056976318359,
        "heapCode": 3.0312347412109375,
        "heapData": 2.0690269470214844,
        "pssTotalMb": 234.130859375,
        "pssApp": 129.9326171875,
        "pssRenderer": 104.1982421875,
        "control": {
          "emitP50": 8.699999999953434,
          "emitP95": 17.900000000023283,
          "domP50": 9,
          "domP95": 18.300000000046566
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 6
      },
      "5000": {
        "setKey": {
          "emitP50": 11.29999999993015,
          "emitP95": 24.400000000023283,
          "domP50": 12.099999999976717,
          "domP95": 26.599999999976717
        },
        "setKeys": {
          "emitP50": 9.70000000006985,
          "emitP95": 22.900000000023283,
          "domP50": 10.599999999976717,
          "domP95": 23.300000000046566
        },
        "replace": {
          "emitP50": 13.5,
          "emitP95": 24.699999999953434,
          "domP50": 13.900000000023283,
          "domP95": 25.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 10,
          "lagP95": 20.599999999976717,
          "endLag": 7.600000000093132,
          "maxBacklog": 2
        },
        "heapMb": 9.94198226928711,
        "heapCode": 3.0831871032714844,
        "heapData": 6.260753631591797,
        "pssTotalMb": 247.6796875,
        "pssApp": 138.3310546875,
        "pssRenderer": 109.3486328125,
        "control": {
          "emitP50": 7.5,
          "emitP95": 16.900000000023283,
          "domP50": 7.700000000069849,
          "domP95": 17
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 5.799999999930151
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.900000000023283,
        "emitP95": 18.199999999953434,
        "domP50": 11.699999999953434,
        "domP95": 18.800000000046566
      },
      "edit_d4": {
        "emitP50": 11.300000000046566,
        "emitP95": 19.599999999976717,
        "domP50": 11.800000000046566,
        "domP95": 20.199999999953434
      },
      "edit_d10": {
        "emitP50": 9.300000000046566,
        "emitP95": 19.400000000023283,
        "domP50": 10.199999999953434,
        "domP95": 19.699999999953434
      },
      "loadCycle": {
        "emitP50": 20.199999999953434,
        "emitP95": 55,
        "domP50": 20.599999999976717,
        "domP95": 55.40000000002328
      },
      "step": {
        "emitP50": 6.900000000023283,
        "emitP95": 26.599999999976717,
        "domP50": 7.5,
        "domP95": 26.899999999906868
      },
      "reset": {
        "emitP50": 29.5,
        "emitP95": 37.40000000002328,
        "domP50": 29.5,
        "domP95": 37.40000000002328
      },
      "append100": {
        "emitP50": 12.900000000023283,
        "emitP95": 25,
        "domP50": 13.300000000046566,
        "domP95": 25.400000000023283
      },
      "control": {
        "emitP50": 8.79999999993015,
        "emitP95": 29.400000000023283,
        "domP50": 9.099999999976717,
        "domP95": 29.900000000023283
      },
      "heapMb": 5.498527526855469,
      "heapCode": 3.17340087890625,
      "heapData": 1.8774147033691406,
      "pssTotalMb": 237.74609375,
      "pssApp": 132.4677734375,
      "pssRenderer": 105.2783203125,
      "relaunchReadyMs": 367.29999999993015,
      "relaunchHeapMb": 4.466304779052734,
      "relaunchHeapCode": 2.3195228576660156,
      "relaunchHeapData": 1.7687568664550781
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 12.29999999993015,
          "emitP95": 26.399999999906868,
          "domP50": 12.699999999953434,
          "domP95": 28
        },
        "setKeys": {
          "emitP50": 8.099999999976717,
          "emitP95": 29.800000000046566,
          "domP50": 8.699999999953434,
          "domP95": 30.20000000006985
        },
        "replace": {
          "emitP50": 9.099999999976717,
          "emitP95": 22.300000000046566,
          "domP50": 9.400000000023283,
          "domP95": 22.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.300000000046566,
          "lagP95": 19.300000000046566,
          "endLag": 6.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.064567565917969,
        "heapCode": 3.0089492797851562,
        "heapData": 1.616119384765625,
        "pssTotalMb": 235.3740234375,
        "pssApp": 131.91015625,
        "pssRenderer": 103.4638671875,
        "control": {
          "emitP50": 7,
          "emitP95": 27.5,
          "domP50": 7.199999999953434,
          "domP95": 28
        },
        "fCommitP50": 3.5,
        "fCommitP95": 10.20000000006985
      },
      "500": {
        "setKey": {
          "emitP50": 9.20000000006985,
          "emitP95": 21.29999999993015,
          "domP50": 10.400000000023283,
          "domP95": 21.599999999976717
        },
        "setKeys": {
          "emitP50": 9.099999999976717,
          "emitP95": 24.400000000023283,
          "domP50": 9.5,
          "domP95": 24.599999999976717
        },
        "replace": {
          "emitP50": 10.300000000046566,
          "emitP95": 23.79999999993015,
          "domP50": 12.199999999953434,
          "domP95": 25.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.200000000069849,
          "lagP95": 13.899999999906868,
          "endLag": 6.200000000069849,
          "maxBacklog": 2
        },
        "heapMb": 5.555706024169922,
        "heapCode": 3.0309295654296875,
        "heapData": 2.0690956115722656,
        "pssTotalMb": 234.533203125,
        "pssApp": 130.466796875,
        "pssRenderer": 104.06640625,
        "control": {
          "emitP50": 7.700000000069849,
          "emitP95": 17.900000000023283,
          "domP50": 8.300000000046566,
          "domP95": 18.20000000006985
        },
        "fCommitP50": 3.5,
        "fCommitP95": 7.300000000046566
      },
      "5000": {
        "setKey": {
          "emitP50": 11.199999999953434,
          "emitP95": 21.699999999953434,
          "domP50": 11.79999999993015,
          "domP95": 22.5
        },
        "setKeys": {
          "emitP50": 14.300000000046566,
          "emitP95": 21.699999999953434,
          "domP50": 14.900000000023283,
          "domP95": 30.399999999906868
        },
        "replace": {
          "emitP50": 13.900000000023283,
          "emitP95": 25.20000000006985,
          "domP50": 14.400000000023283,
          "domP95": 25.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 10.400000000023283,
          "lagP95": 19.900000000023283,
          "endLag": 19.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.932868957519531,
        "heapCode": 3.074615478515625,
        "heapData": 6.2607574462890625,
        "pssTotalMb": 249.1044921875,
        "pssApp": 139.8505859375,
        "pssRenderer": 109.25390625,
        "control": {
          "emitP50": 6,
          "emitP95": 18.199999999953434,
          "domP50": 6.5,
          "domP95": 18.5
        },
        "fCommitP50": 3.800000000046566,
        "fCommitP95": 7.599999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.699999999953434,
        "emitP95": 27.400000000023283,
        "domP50": 9.599999999976717,
        "domP95": 28.099999999976717
      },
      "edit_d4": {
        "emitP50": 8.70000000006985,
        "emitP95": 28.900000000023283,
        "domP50": 10,
        "domP95": 29.199999999953434
      },
      "edit_d10": {
        "emitP50": 9,
        "emitP95": 24,
        "domP50": 9.599999999976717,
        "domP95": 24.300000000046566
      },
      "loadCycle": {
        "emitP50": 16.300000000046566,
        "emitP95": 55.40000000002328,
        "domP50": 16.400000000023283,
        "domP95": 55.800000000046566
      },
      "step": {
        "emitP50": 8.199999999953434,
        "emitP95": 25.800000000046566,
        "domP50": 8.400000000023283,
        "domP95": 26.400000000023283
      },
      "reset": {
        "emitP50": 31.20000000006985,
        "emitP95": 36.199999999953434,
        "domP50": 31.20000000006985,
        "domP95": 36.199999999953434
      },
      "append100": {
        "emitP50": 15.100000000093132,
        "emitP95": 21.900000000023283,
        "domP50": 16,
        "domP95": 22.400000000023283
      },
      "control": {
        "emitP50": 6.300000000046566,
        "emitP95": 28.400000000023283,
        "domP50": 6.700000000069849,
        "domP95": 28.599999999976717
      },
      "heapMb": 5.5028076171875,
      "heapCode": 3.1779518127441406,
      "heapData": 1.8770904541015625,
      "pssTotalMb": 239.0576171875,
      "pssApp": 133.7216796875,
      "pssRenderer": 105.3359375,
      "relaunchReadyMs": 813.5999999999767,
      "relaunchHeapMb": 4.325477600097656,
      "relaunchHeapCode": 2.1239700317382812,
      "relaunchHeapData": 1.8260612487792969
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 9.800000000046566,
          "domP50": 3.299999999930151,
          "domP95": 15
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.8000000000465661,
          "domP50": 1.099999999976717,
          "domP95": 6.5
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 9.400000000023283,
          "domP50": 1.099999999976717,
          "domP95": 10.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.7240982055664062,
        "heapCode": 1.8444023132324219,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.1865234375,
        "pssApp": 126.4970703125,
        "pssRenderer": 97.689453125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.900000000023283,
          "domP50": 5.399999999906868,
          "domP95": 7.5
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 7.199999999953434,
          "domP50": 3.3999999999068677,
          "domP95": 15.399999999906868
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.5,
          "domP50": 1.2000000000698492,
          "domP95": 7.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.9000000000232831,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 4.133655548095703,
        "heapCode": 1.8507118225097656,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 226.8349609375,
        "pssApp": 125.72265625,
        "pssRenderer": 101.1123046875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6999999999534339,
          "emitP95": 4.900000000023283,
          "domP50": 3.199999999953434,
          "domP95": 10.099999999976717
        },
        "setKeys": {
          "emitP50": 1.8000000000465661,
          "emitP95": 4.200000000069849,
          "domP50": 3.199999999953434,
          "domP95": 12
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.400000000023283,
          "domP50": 1.599999999976717,
          "domP95": 7.299999999930151
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 2.400000000023283,
          "endLag": 1.3000000000465661,
          "maxBacklog": 0
        },
        "heapMb": 8.096973419189453,
        "heapCode": 1.8454208374023438,
        "heapData": 5.725063323974609,
        "pssTotalMb": 232.623046875,
        "pssApp": 126.5634765625,
        "pssRenderer": 106.0595703125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.300000000046566,
        "domP50": 5.299999999930151,
        "domP95": 11.20000000006985
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 4.299999999930151,
        "domP50": 5.799999999930151,
        "domP95": 7.699999999953434
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 1.3000000000465661,
        "domP95": 8.399999999906868
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 35.800000000046566,
        "domP50": 0.5,
        "domP95": 36.199999999953434
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 4.599999999976717,
        "domP50": 1.6999999999534339,
        "domP95": 7.400000000023283
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.40000000002328306,
        "domP50": 0.2999999999301508,
        "domP95": 1.3000000000465661
      },
      "append100": {
        "emitP50": 0.5,
        "emitP95": 0.7000000000698492,
        "domP50": 2,
        "domP95": 6.699999999953434
      },
      "heapMb": 3.935741424560547,
      "heapCode": 1.9240531921386719,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 224.935546875,
      "pssApp": 126.3701171875,
      "pssRenderer": 98.5654296875,
      "relaunchReadyMs": 671.5,
      "relaunchHeapMb": 3.352375030517578,
      "relaunchHeapCode": 1.5406608581542969,
      "relaunchHeapData": 1.4462432861328125
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.099999999976717,
          "domP50": 2.200000000069849,
          "domP95": 7.800000000046566
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.1000000000931323,
          "domP50": 2.800000000046566,
          "domP95": 18.20000000006985
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 5.200000000069849,
          "domP95": 8.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.9000000000232831,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.72381591796875,
        "heapCode": 1.8440895080566406,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.4296875,
        "pssApp": 126.845703125,
        "pssRenderer": 97.583984375
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7000000000698492,
          "domP50": 5.700000000069849,
          "domP95": 6.700000000069849
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.2999999999301508,
          "domP50": 1.2999999999301508,
          "domP95": 6.400000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7000000000698492,
          "domP50": 1.2999999999301508,
          "domP95": 9.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.5999999999767169,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.133819580078125,
        "heapCode": 1.851043701171875,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 227.8212890625,
        "pssApp": 126.533203125,
        "pssRenderer": 101.2880859375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6999999999534339,
          "emitP95": 3.400000000023283,
          "domP50": 3.300000000046566,
          "domP95": 8.099999999976717
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 15.70000000006985,
          "domP50": 4.400000000023283,
          "domP95": 16.5
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 4.700000000069849,
          "domP50": 1.8000000000465661,
          "domP95": 6.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 10,
          "endLag": 0.9000000000232831,
          "maxBacklog": 0
        },
        "heapMb": 8.0997314453125,
        "heapCode": 1.8476028442382812,
        "heapData": 5.725639343261719,
        "pssTotalMb": 232.2421875,
        "pssApp": 126.2548828125,
        "pssRenderer": 105.9873046875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.5,
        "domP50": 1.6999999999534339,
        "domP95": 6.599999999976717
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 1.900000000023283,
        "domP95": 7.300000000046566
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.400000000023283,
        "domP50": 5.299999999930151,
        "domP95": 10.5
      },
      "loadCycle": {
        "emitP50": 14.599999999976717,
        "emitP95": 35.70000000006985,
        "domP50": 16.099999999976717,
        "domP95": 36.20000000006985
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 5.599999999976717,
        "domP95": 10.5
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.099999999976717,
        "domP50": 0.30000000004656613,
        "domP95": 2
      },
      "append100": {
        "emitP50": 0.5,
        "emitP95": 2.099999999976717,
        "domP50": 0.9000000000232831,
        "domP95": 5.700000000069849
      },
      "heapMb": 3.9356155395507812,
      "heapCode": 1.9239273071289062,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 224.7138671875,
      "pssApp": 126.248046875,
      "pssRenderer": 98.4658203125,
      "relaunchReadyMs": 691.6000000000931,
      "relaunchHeapMb": 3.3514976501464844,
      "relaunchHeapCode": 1.5398826599121094,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.5,
          "emitP95": 19.900000000023283,
          "domP50": 9.899999999906868,
          "domP95": 21.099999999976717
        },
        "setKeys": {
          "emitP50": 9.599999999976717,
          "emitP95": 15,
          "domP50": 10.199999999953434,
          "domP95": 15.399999999906868
        },
        "replace": {
          "emitP50": 10.300000000046566,
          "emitP95": 20.29999999993015,
          "domP50": 11,
          "domP95": 20.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.700000000069849,
          "lagP95": 21,
          "endLag": 7.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.064601898193359,
        "heapCode": 3.0089645385742188,
        "heapData": 1.6161384582519531,
        "pssTotalMb": 235.1865234375,
        "pssApp": 131.943359375,
        "pssRenderer": 103.2431640625,
        "control": {
          "emitP50": 6.799999999930151,
          "emitP95": 24.600000000093132,
          "domP50": 7.099999999976717,
          "domP95": 24.800000000046566
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 8.099999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 9.600000000093132,
          "emitP95": 22.199999999953434,
          "domP50": 9.900000000023283,
          "domP95": 22.5
        },
        "setKeys": {
          "emitP50": 9.300000000046566,
          "emitP95": 26.900000000023283,
          "domP50": 9.900000000023283,
          "domP95": 28.70000000006985
        },
        "replace": {
          "emitP50": 8.70000000006985,
          "emitP95": 27,
          "domP50": 9,
          "domP95": 27.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.300000000046566,
          "lagP95": 15.900000000023283,
          "endLag": 6,
          "maxBacklog": 3
        },
        "heapMb": 5.556877136230469,
        "heapCode": 3.0315399169921875,
        "heapData": 2.0693626403808594,
        "pssTotalMb": 236.14453125,
        "pssApp": 132.14453125,
        "pssRenderer": 104,
        "control": {
          "emitP50": 7.099999999976717,
          "emitP95": 22.900000000023283,
          "domP50": 7.400000000023283,
          "domP95": 23.100000000093132
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 5.599999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 12.599999999976717,
          "emitP95": 28.100000000093132,
          "domP50": 13.199999999953434,
          "domP95": 28.70000000006985
        },
        "setKeys": {
          "emitP50": 10.400000000023283,
          "emitP95": 29.300000000046566,
          "domP50": 10.900000000023283,
          "domP95": 29.900000000023283
        },
        "replace": {
          "emitP50": 14.5,
          "emitP95": 24.400000000023283,
          "domP50": 14.900000000023283,
          "domP95": 24.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.699999999953434,
          "lagP95": 17.800000000046566,
          "endLag": 8.899999999906868,
          "maxBacklog": 2
        },
        "heapMb": 9.940319061279297,
        "heapCode": 3.081645965576172,
        "heapData": 6.260871887207031,
        "pssTotalMb": 248.341796875,
        "pssApp": 138.9697265625,
        "pssRenderer": 109.3720703125,
        "control": {
          "emitP50": 6.300000000046566,
          "emitP95": 16.5,
          "domP50": 6.599999999976717,
          "domP95": 16.699999999953434
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 5.699999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.400000000023283,
        "emitP95": 29.699999999953434,
        "domP50": 9.400000000023283,
        "domP95": 30.5
      },
      "edit_d4": {
        "emitP50": 10.099999999976717,
        "emitP95": 28.199999999953434,
        "domP50": 10.5,
        "domP95": 28.699999999953434
      },
      "edit_d10": {
        "emitP50": 10.400000000023283,
        "emitP95": 19.400000000023283,
        "domP50": 10.900000000023283,
        "domP95": 19.70000000006985
      },
      "loadCycle": {
        "emitP50": 16.900000000023283,
        "emitP95": 55.5,
        "domP50": 17.20000000006985,
        "domP95": 55.90000000002328
      },
      "step": {
        "emitP50": 9,
        "emitP95": 21.699999999953434,
        "domP50": 10,
        "domP95": 22.400000000023283
      },
      "reset": {
        "emitP50": 32.699999999953434,
        "emitP95": 49.79999999993015,
        "domP50": 32.699999999953434,
        "domP95": 49.79999999993015
      },
      "append100": {
        "emitP50": 12.29999999993015,
        "emitP95": 25.099999999976717,
        "domP50": 12.599999999976717,
        "domP95": 26.599999999976717
      },
      "control": {
        "emitP50": 6.300000000046566,
        "emitP95": 20,
        "domP50": 6.599999999976717,
        "domP95": 20.300000000046566
      },
      "heapMb": 5.489776611328125,
      "heapCode": 3.173686981201172,
      "heapData": 1.8682022094726562,
      "pssTotalMb": 239.05859375,
      "pssApp": 133.5029296875,
      "pssRenderer": 105.5556640625,
      "relaunchReadyMs": 398.0999999999767,
      "relaunchHeapMb": 4.527320861816406,
      "relaunchHeapCode": 2.3190536499023438,
      "relaunchHeapData": 1.8302764892578125
    }
  }
]
```
</details>
