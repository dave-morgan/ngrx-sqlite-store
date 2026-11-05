# Phase 16 shapes — flat objects & hybrid workflow (2026-10-27)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.72 ms, p95 10.10 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 51 / CODE-BOUND 0 / FAIL 34

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.38 ± 0.08 | 9.90 ± 1.40 | 26.1× | FAIL | allow 8.8 (control emitP50 7.3×1) |
| flat | 50.setKey.emitP95 | 2.26 ± 2.11 | 23.52 ± 4.22 | 10.4× | PLATFORM-BOUND | allow 22.6 (control emitP95 16.3×1) |
| flat | 50.setKey.domP50 | 4.50 ± 1.82 | 10.70 ± 1.67 | 2.4× | PLATFORM-BOUND | allow 11.2 (control domP50 7.7×1) |
| flat | 50.setKey.domP95 | 8.50 ± 1.84 | 24.22 ± 4.15 | 2.8× | PLATFORM-BOUND | allow 22.8 (control domP95 16.9×1) |
| flat | 50.setKeys.emitP50 | 0.36 ± 0.05 | 9.48 ± 0.98 | 26.3× | FAIL | allow 8.3 (control emitP50 7.3×1) |
| flat | 50.setKeys.emitP95 | 1.00 ± 0.74 | 24.64 ± 3.42 | 24.6× | FAIL | allow 20.4 (control emitP95 16.3×1) |
| flat | 50.setKeys.domP50 | 3.60 ± 2.29 | 9.90 ± 1.04 | 2.8× | PLATFORM-BOUND | allow 11.0 (control domP50 7.7×1) |
| flat | 50.setKeys.domP95 | 10.22 ± 2.61 | 25.04 ± 3.44 | 2.5× | PLATFORM-BOUND | allow 22.9 (control domP95 16.9×1) |
| flat | 50.replace.emitP50 | 0.36 ± 0.05 | 9.00 ± 1.31 | 25.0× | PLATFORM-BOUND | allow 8.7 (control emitP50 7.3×1) |
| flat | 50.replace.emitP95 | 3.74 ± 3.79 | 19.20 ± 1.65 | 5.1× | PLATFORM-BOUND | allow 21.7 (control emitP95 16.3×1) |
| flat | 50.replace.domP50 | 1.62 ± 0.85 | 10.10 ± 2.18 | 6.2× | PLATFORM-BOUND | allow 10.7 (control domP50 7.7×1) |
| flat | 50.replace.domP95 | 7.42 ± 1.66 | 19.88 ± 1.83 | 2.7× | PLATFORM-BOUND | allow 20.3 (control domP95 16.9×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 7.48 ± 1.12 | 24.9× | PLATFORM-BOUND | allow 8.4 (control emitP50 7.3×1) |
| flat | 50.burst.lagP95 | 0.66 ± 0.21 | 18.72 ± 1.64 | 28.4× | PLATFORM-BOUND | allow 18.1 (control emitP95 16.3×1) |
| flat | 50.burst.endLag | 0.24 ± 0.05 | 9.54 ± 5.01 | 39.7× | PLATFORM-BOUND | allow 12.4 (control emitP50 7.3×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.40 ± 0.55 | 2400000000.0× | FAIL |  |
| flat | 50.heapMb | 3.72 ± 0.00 | 5.06 ± 0.01 | 1.4× | FAIL | code +1.16 MB; data 1.51 -> 1.62 MB |
| flat | 50.pssTotalMb | 221.63 ± 1.65 | 232.46 ± 1.82 | 1.0× | FAIL | allow 6.5 (plugin baseline 3.0 MB) |
| flat | 500.setKey.emitP50 | 0.50 ± 0.10 | 10.10 ± 1.68 | 20.2× | FAIL | allow 9.0 (control emitP50 7.2×1) |
| flat | 500.setKey.emitP95 | 2.20 ± 2.30 | 23.84 ± 3.44 | 10.8× | PLATFORM-BOUND | allow 22.0 (control emitP95 16.2×1) |
| flat | 500.setKey.domP50 | 5.08 ± 0.78 | 10.84 ± 1.45 | 2.1× | PLATFORM-BOUND | allow 9.8 (control domP50 7.6×1) |
| flat | 500.setKey.domP95 | 9.38 ± 2.99 | 24.56 ± 3.54 | 2.6× | PLATFORM-BOUND | allow 23.1 (control domP95 16.6×1) |
| flat | 500.setKeys.emitP50 | 0.48 ± 0.08 | 10.50 ± 1.60 | 21.9× | FAIL | allow 8.9 (control emitP50 7.2×1) |
| flat | 500.setKeys.emitP95 | 2.16 ± 1.15 | 22.74 ± 3.86 | 10.5× | PLATFORM-BOUND | allow 21.3 (control emitP95 16.2×1) |
| flat | 500.setKeys.domP50 | 2.98 ± 1.77 | 11.16 ± 1.87 | 3.7× | PLATFORM-BOUND | allow 11.2 (control domP50 7.6×1) |
| flat | 500.setKeys.domP95 | 10.04 ± 3.62 | 23.64 ± 4.72 | 2.4× | PLATFORM-BOUND | allow 24.9 (control domP95 16.6×1) |
| flat | 500.replace.emitP50 | 0.34 ± 0.05 | 11.64 ± 1.25 | 34.2× | FAIL | allow 8.5 (control emitP50 7.2×1) |
| flat | 500.replace.emitP95 | 2.22 ± 1.68 | 19.66 ± 2.74 | 8.9× | PLATFORM-BOUND | allow 20.7 (control emitP95 16.2×1) |
| flat | 500.replace.domP50 | 2.00 ± 1.79 | 12.22 ± 1.25 | 6.1× | PLATFORM-BOUND | allow 10.6 (control domP50 7.6×1) |
| flat | 500.replace.domP95 | 8.70 ± 2.05 | 20.20 ± 2.59 | 2.3× | PLATFORM-BOUND | allow 21.2 (control domP95 16.6×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 7.50 ± 0.38 | 18.7× | PLATFORM-BOUND | allow 7.6 (control emitP50 7.2×1) |
| flat | 500.burst.lagP95 | 0.88 ± 0.11 | 17.02 ± 0.45 | 19.3× | PLATFORM-BOUND | allow 16.8 (control emitP95 16.2×1) |
| flat | 500.burst.endLag | 0.48 ± 0.16 | 6.52 ± 0.88 | 13.6× | PLATFORM-BOUND | allow 8.3 (control emitP50 7.2×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.20 ± 0.45 | 2200000000.0× | FAIL |  |
| flat | 500.heapMb | 4.13 ± 0.00 | 5.55 ± 0.01 | 1.3× | FAIL | code +1.18 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 225.60 ± 1.75 | 233.40 ± 1.53 | 1.0× | FAIL | allow 6.3 (plugin baseline 3.0 MB) |
| flat | 5000.setKey.emitP50 | 1.56 ± 0.24 | 12.12 ± 0.81 | 7.8× | FAIL | allow 7.9 (control emitP50 6.9×1) |
| flat | 5000.setKey.emitP95 | 3.20 ± 1.30 | 21.36 ± 2.10 | 6.7× | PLATFORM-BOUND | allow 22.7 (control emitP95 19.3×1) |
| flat | 5000.setKey.domP50 | 4.90 ± 2.09 | 12.68 ± 0.88 | 2.6× | PLATFORM-BOUND | allow 10.1 (control domP50 7.1×1) |
| flat | 5000.setKey.domP95 | 9.22 ± 1.86 | 22.38 ± 2.45 | 2.4× | PLATFORM-BOUND | allow 24.3 (control domP95 20.0×1) |
| flat | 5000.setKeys.emitP50 | 1.58 ± 0.08 | 11.62 ± 1.32 | 7.4× | FAIL | allow 8.3 (control emitP50 6.9×1) |
| flat | 5000.setKeys.emitP95 | 8.14 ± 5.18 | 24.38 ± 4.35 | 3.0× | PLATFORM-BOUND | allow 28.9 (control emitP95 19.3×1) |
| flat | 5000.setKeys.domP50 | 3.42 ± 0.25 | 12.34 ± 1.23 | 3.6× | FAIL | allow 8.6 (control domP50 7.1×1) |
| flat | 5000.setKeys.domP95 | 12.68 ± 4.60 | 24.78 ± 4.35 | 2.0× | PLATFORM-BOUND | allow 29.0 (control domP95 20.0×1) |
| flat | 5000.replace.emitP50 | 0.38 ± 0.04 | 14.34 ± 0.62 | 37.7× | FAIL | allow 7.6 (control emitP50 6.9×1) |
| flat | 5000.replace.emitP95 | 8.62 ± 3.59 | 24.90 ± 4.07 | 2.9× | PLATFORM-BOUND | allow 27.0 (control emitP95 19.3×1) |
| flat | 5000.replace.domP50 | 1.84 ± 0.18 | 14.92 ± 0.66 | 8.1× | FAIL | allow 8.0 (control domP50 7.1×1) |
| flat | 5000.replace.domP95 | 14.80 ± 4.91 | 25.40 ± 4.05 | 1.7× | PLATFORM-BOUND | allow 29.0 (control domP95 20.0×1) |
| flat | 5000.burst.lagP50 | 1.44 ± 0.05 | 9.94 ± 0.79 | 6.9× | FAIL | allow 7.7 (control emitP50 6.9×1) |
| flat | 5000.burst.lagP95 | 2.42 ± 0.08 | 19.18 ± 1.41 | 7.9× | PLATFORM-BOUND | allow 20.8 (control emitP95 19.3×1) |
| flat | 5000.burst.endLag | 1.56 ± 0.27 | 10.76 ± 4.10 | 6.9× | PLATFORM-BOUND | allow 11.3 (control emitP50 6.9×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.07 ± 0.07 | 9.94 ± 0.00 | 1.2× | FAIL | code +1.26 MB; data 5.72 -> 6.26 MB |
| flat | 5000.pssTotalMb | 229.61 ± 2.74 | 248.46 ± 1.98 | 1.1× | FAIL | allow 7.7 (plugin baseline 3.0 MB) |
| workflow | edit_d1.emitP50 | 0.38 ± 0.04 | 9.64 ± 1.23 | 25.4× | FAIL | allow 8.2 (control emitP50 6.9×1) |
| workflow | edit_d1.emitP95 | 1.48 ± 0.93 | 22.76 ± 3.44 | 15.4× | PLATFORM-BOUND | allow 23.9 (control emitP95 19.5×1) |
| workflow | edit_d1.domP50 | 5.04 ± 0.71 | 10.32 ± 1.08 | 2.0× | PLATFORM-BOUND | allow 9.2 (control domP50 7.4×1) |
| workflow | edit_d1.domP95 | 8.94 ± 1.07 | 23.54 ± 3.07 | 2.6× | PLATFORM-BOUND | allow 24.0 (control domP95 19.9×1) |
| workflow | edit_d4.emitP50 | 0.42 ± 0.04 | 8.48 ± 0.15 | 20.2× | FAIL | allow 7.1 (control emitP50 6.9×1) |
| workflow | edit_d4.emitP95 | 1.22 ± 0.65 | 19.20 ± 3.00 | 15.7× | PLATFORM-BOUND | allow 23.2 (control emitP95 19.5×1) |
| workflow | edit_d4.domP50 | 2.90 ± 2.20 | 9.10 ± 0.32 | 3.1× | PLATFORM-BOUND | allow 9.9 (control domP50 7.4×1) |
| workflow | edit_d4.domP95 | 7.32 ± 0.66 | 19.76 ± 3.22 | 2.7× | PLATFORM-BOUND | allow 23.8 (control domP95 19.9×1) |
| workflow | edit_d10.emitP50 | 0.46 ± 0.05 | 9.36 ± 1.21 | 20.3× | FAIL | allow 8.1 (control emitP50 6.9×1) |
| workflow | edit_d10.emitP95 | 1.34 ± 0.62 | 16.76 ± 1.95 | 12.5× | PLATFORM-BOUND | allow 22.1 (control emitP95 19.5×1) |
| workflow | edit_d10.domP50 | 2.22 ± 1.74 | 9.84 ± 1.27 | 4.4× | PLATFORM-BOUND | allow 10.4 (control domP50 7.4×1) |
| workflow | edit_d10.domP95 | 9.26 ± 2.65 | 17.20 ± 2.00 | 1.9× | PLATFORM-BOUND | allow 24.5 (control domP95 19.9×1) |
| workflow | loadCycle.emitP50 | 2.54 ± 4.39 | 14.10 ± 3.32 | 5.6× | PLATFORM-BOUND | allow 21.5 (control emitP50 6.9×2) |
| workflow | loadCycle.emitP95 | 33.32 ± 1.32 | 56.40 ± 4.67 | 1.7× | PLATFORM-BOUND | allow 45.1 (control emitP95 19.5×2) |
| workflow | loadCycle.domP50 | 3.46 ± 5.08 | 14.54 ± 3.45 | 4.2× | PLATFORM-BOUND | allow 23.4 (control domP50 7.4×2) |
| workflow | loadCycle.domP95 | 33.68 ± 1.33 | 57.30 ± 5.37 | 1.7× | PLATFORM-BOUND | allow 46.5 (control domP95 19.9×2) |
| workflow | step.emitP50 | 0.30 ± 0.00 | 9.04 ± 0.71 | 30.1× | FAIL | allow 7.6 (control emitP50 6.9×1) |
| workflow | step.emitP95 | 0.94 ± 0.25 | 30.76 ± 12.70 | 32.7× | PLATFORM-BOUND | allow 32.5 (control emitP95 19.5×1) |
| workflow | step.domP50 | 1.44 ± 0.69 | 9.44 ± 0.77 | 6.6× | PLATFORM-BOUND | allow 8.9 (control domP50 7.4×1) |
| workflow | step.domP95 | 7.52 ± 1.31 | 31.32 ± 12.80 | 4.2× | PLATFORM-BOUND | allow 34.0 (control domP95 19.9×1) |
| workflow | reset.emitP50 | 0.26 ± 0.09 | 28.72 ± 2.16 | 110.5× | FAIL | allow 9.1 (control emitP50 6.9×1) |
| workflow | reset.emitP95 | 2.12 ± 2.18 | 45.98 ± 4.33 | 21.7× | FAIL | allow 26.1 (control emitP95 19.5×1) |
| workflow | reset.domP50 | 0.28 ± 0.08 | 29.00 ± 2.49 | 103.6× | FAIL | allow 10.0 (control domP50 7.4×1) |
| workflow | reset.domP95 | 2.86 ± 1.96 | 46.14 ± 4.23 | 16.1× | FAIL | allow 26.1 (control domP95 19.9×1) |
| workflow | append100.emitP50 | 0.42 ± 0.04 | 14.00 ± 1.03 | 33.3× | FAIL | allow 8.0 (control emitP50 6.9×1) |
| workflow | append100.emitP95 | 2.84 ± 2.61 | 24.74 ± 4.89 | 8.7× | PLATFORM-BOUND | allow 27.0 (control emitP95 19.5×1) |
| workflow | append100.domP50 | 0.98 ± 0.08 | 14.84 ± 1.49 | 15.1× | FAIL | allow 9.0 (control domP50 7.4×1) |
| workflow | append100.domP95 | 7.88 ± 2.50 | 25.10 ± 4.95 | 3.2× | PLATFORM-BOUND | allow 27.3 (control domP95 19.9×1) |
| workflow | heapMb | 3.94 ± 0.00 | 5.49 ± 0.00 | 1.4× | FAIL | code +1.25 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 222.72 ± 1.95 | 238.66 ± 1.96 | 1.1× | FAIL | allow 6.9 (plugin baseline 3.0 MB) |
| workflow | relaunchReadyMs | 1389.68 ± 330.15 | 806.86 ± 620.19 | 0.6× | PASS |  |
| workflow | relaunchHeapMb | 3.31 ± 0.05 | 4.46 ± 0.09 | 1.3× | FAIL | code +0.76 MB; data 1.45 -> 1.82 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 7.30 | 7.66 | 16.86 | 9.90 | 10.70 | 24.22 |
| 500 | 7.24 | 7.58 | 16.60 | 10.10 | 10.84 | 24.56 |
| 5000 | 6.90 | 7.14 | 20.00 | 12.12 | 12.68 | 22.38 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 125.3 | 130.1 | 96.3 | 102.4 |
| flat 500 | 125.4 | 130.4 | 100.2 | 103.0 |
| flat 5000 | 125.0 | 139.9 | 104.6 | 108.6 |
| workflow | 125.1 | 134.4 | 97.7 | 104.3 |

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
          "emitP95": 2,
          "domP50": 1.3999999999650754,
          "domP95": 8.800000000046566
        },
        "setKeys": {
          "emitP50": 0.3999999999650754,
          "emitP95": 0.8999999999650754,
          "domP50": 1.2999999999883585,
          "domP95": 13.099999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.400000000023283,
          "domP50": 1.900000000023283,
          "domP95": 8.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.7000000000116415,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.7242202758789062,
        "heapCode": 1.84454345703125,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 220.3837890625,
        "pssApp": 124.8359375,
        "pssRenderer": 95.5478515625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 2.5,
          "domP50": 5.2000000000116415,
          "domP95": 10.299999999988358
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 3,
          "domP50": 1.5,
          "domP95": 16.099999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.6000000000349246,
          "domP50": 1.2000000000116415,
          "domP95": 8.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8999999999650754,
          "endLag": 0.6999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 4.129878997802734,
        "heapCode": 1.8472976684570312,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 223.9599609375,
        "pssApp": 124.3701171875,
        "pssRenderer": 99.58984375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.3000000000465661,
          "emitP95": 2.2999999999883585,
          "domP50": 7,
          "domP95": 8.600000000034925
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 3.7999999999883585,
          "domP50": 3.6000000000349246,
          "domP95": 10.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 5.900000000023283,
          "domP50": 1.7999999999883585,
          "domP95": 15.399999999965075
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.3999999999650754,
          "endLag": 1.6000000000349246,
          "maxBacklog": 0
        },
        "heapMb": 7.938999176025391,
        "heapCode": 1.6921577453613281,
        "heapData": 5.722118377685547,
        "pssTotalMb": 225.0849609375,
        "pssApp": 122.1064453125,
        "pssRenderer": 102.978515625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.1000000000349246,
        "domP50": 5.399999999965075,
        "domP95": 10
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.2000000000116415,
        "domP50": 1.5,
        "domP95": 6.7000000000116415
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.7000000000116415,
        "domP50": 1.599999999976717,
        "domP95": 13.599999999976717
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 32.399999999965075,
        "domP50": 0.5,
        "domP95": 32.70000000001164
      },
      "step": {
        "emitP50": 0.29999999998835847,
        "emitP95": 1.2000000000116415,
        "domP50": 1.5,
        "domP95": 9.599999999976717
      },
      "reset": {
        "emitP50": 0.3999999999650754,
        "emitP95": 2.400000000023283,
        "domP50": 0.3999999999650754,
        "domP95": 3.6000000000349246
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 6.600000000034925,
        "domP50": 0.9000000000232831,
        "domP95": 11.299999999988358
      },
      "heapMb": 3.9354286193847656,
      "heapCode": 1.9237518310546875,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 220.7216796875,
      "pssApp": 123.759765625,
      "pssRenderer": 96.9619140625,
      "relaunchReadyMs": 1555.2000000000116,
      "relaunchHeapMb": 3.3521041870117188,
      "relaunchHeapCode": 1.5400962829589844,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 11.700000000011642,
          "emitP95": 22.29999999998836,
          "domP50": 13.299999999988358,
          "domP95": 23.5
        },
        "setKeys": {
          "emitP50": 10.799999999988358,
          "emitP95": 22,
          "domP50": 11.299999999988358,
          "domP95": 22.399999999965075
        },
        "replace": {
          "emitP50": 10.299999999988358,
          "emitP95": 22,
          "domP50": 10.700000000011642,
          "domP95": 23
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.600000000034925,
          "lagP95": 18.600000000034925,
          "endLag": 6.5,
          "maxBacklog": 3
        },
        "heapMb": 5.0608673095703125,
        "heapCode": 3.0056304931640625,
        "heapData": 1.615936279296875,
        "pssTotalMb": 231.1865234375,
        "pssApp": 129.53515625,
        "pssRenderer": 101.6513671875,
        "control": {
          "emitP50": 8.200000000011642,
          "emitP95": 14.699999999953434,
          "domP50": 8.799999999988358,
          "domP95": 14.899999999965075
        },
        "fCommitP50": 3.7000000000116415,
        "fCommitP95": 9.5
      },
      "500": {
        "setKey": {
          "emitP50": 12.600000000034925,
          "emitP95": 18,
          "domP50": 13,
          "domP95": 18.599999999976717
        },
        "setKeys": {
          "emitP50": 10.899999999965075,
          "emitP95": 20.29999999998836,
          "domP50": 11.899999999965075,
          "domP95": 20.70000000001164
        },
        "replace": {
          "emitP50": 9.799999999988358,
          "emitP95": 17.79999999998836,
          "domP50": 10.200000000011642,
          "domP95": 18.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.2999999999883585,
          "lagP95": 17.400000000023283,
          "endLag": 7.2000000000116415,
          "maxBacklog": 2
        },
        "heapMb": 5.543453216552734,
        "heapCode": 3.0196876525878906,
        "heapData": 2.0683555603027344,
        "pssTotalMb": 231.998046875,
        "pssApp": 129.5390625,
        "pssRenderer": 102.458984375,
        "control": {
          "emitP50": 7.5,
          "emitP95": 14.5,
          "domP50": 7.7000000000116415,
          "domP95": 14.799999999988358
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 11.5
      },
      "5000": {
        "setKey": {
          "emitP50": 11.5,
          "emitP95": 21,
          "domP50": 11.800000000046566,
          "domP95": 22
        },
        "setKeys": {
          "emitP50": 10.099999999976717,
          "emitP95": 26,
          "domP50": 11,
          "domP95": 26.400000000023283
        },
        "replace": {
          "emitP50": 13.799999999988358,
          "emitP95": 23.400000000023283,
          "domP50": 14.5,
          "domP95": 23.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.900000000023283,
          "lagP95": 16.899999999965075,
          "endLag": 9.299999999988358,
          "maxBacklog": 2
        },
        "heapMb": 9.940071105957031,
        "heapCode": 3.0819320678710938,
        "heapData": 6.260414123535156,
        "pssTotalMb": 246.1865234375,
        "pssApp": 138.33203125,
        "pssRenderer": 107.8544921875,
        "control": {
          "emitP50": 7.5,
          "emitP95": 18.20000000001164,
          "domP50": 7.7999999999883585,
          "domP95": 18.600000000034925
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 12.299999999988358
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.5,
        "emitP95": 25,
        "domP50": 10,
        "domP95": 25.399999999965075
      },
      "edit_d4": {
        "emitP50": 8.299999999988358,
        "emitP95": 15.799999999988358,
        "domP50": 8.899999999965075,
        "domP95": 16.20000000001164
      },
      "edit_d10": {
        "emitP50": 10.299999999988358,
        "emitP95": 19.099999999976717,
        "domP50": 10.599999999976717,
        "domP95": 19.699999999953434
      },
      "loadCycle": {
        "emitP50": 19.599999999976717,
        "emitP95": 60.70000000001164,
        "domP50": 20.20000000001164,
        "domP95": 63.5
      },
      "step": {
        "emitP50": 8.399999999965075,
        "emitP95": 28.099999999976717,
        "domP50": 8.700000000011642,
        "domP95": 28.399999999965075
      },
      "reset": {
        "emitP50": 30.79999999998836,
        "emitP95": 42.29999999998836,
        "domP50": 32,
        "domP95": 42.29999999998836
      },
      "append100": {
        "emitP50": 12.900000000023283,
        "emitP95": 28.400000000023283,
        "domP50": 13.299999999988358,
        "domP95": 28.70000000001164
      },
      "control": {
        "emitP50": 7,
        "emitP95": 17.29999999998836,
        "domP50": 8.400000000023283,
        "domP95": 17.5
      },
      "heapMb": 5.487094879150391,
      "heapCode": 3.1680030822753906,
      "heapData": 1.8714485168457031,
      "pssTotalMb": 236.7451171875,
      "pssApp": 133.044921875,
      "pssRenderer": 103.7001953125,
      "relaunchReadyMs": 930.1000000000349,
      "relaunchHeapMb": 4.324745178222656,
      "relaunchHeapCode": 2.1229934692382812,
      "relaunchHeapData": 1.8261985778808594
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.599999999976717,
          "emitP95": 24.79999999998836,
          "domP50": 9.099999999976717,
          "domP95": 25.79999999998836
        },
        "setKeys": {
          "emitP50": 10.200000000011642,
          "emitP95": 27.29999999998836,
          "domP50": 10.599999999976717,
          "domP95": 27.900000000023283
        },
        "replace": {
          "emitP50": 7.400000000023283,
          "emitP95": 19,
          "domP50": 7.900000000023283,
          "domP95": 19.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.299999999988358,
          "lagP95": 18.099999999976717,
          "endLag": 12.900000000023283,
          "maxBacklog": 3
        },
        "heapMb": 5.0640106201171875,
        "heapCode": 3.0086593627929688,
        "heapData": 1.6156463623046875,
        "pssTotalMb": 229.998046875,
        "pssApp": 128.388671875,
        "pssRenderer": 101.609375,
        "control": {
          "emitP50": 8.100000000034925,
          "emitP95": 16.900000000023283,
          "domP50": 8.400000000023283,
          "domP95": 17.20000000001164
        },
        "fCommitP50": 3.7000000000116415,
        "fCommitP95": 11
      },
      "500": {
        "setKey": {
          "emitP50": 8.599999999976717,
          "emitP95": 27.20000000001164,
          "domP50": 9.799999999988358,
          "domP95": 28.100000000034925
        },
        "setKeys": {
          "emitP50": 12.5,
          "emitP95": 20.899999999965075,
          "domP50": 13.599999999976717,
          "domP95": 21.5
        },
        "replace": {
          "emitP50": 11.599999999976717,
          "emitP95": 18.600000000034925,
          "domP50": 12.299999999988358,
          "domP95": 19.20000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 17.399999999965075,
          "endLag": 7.5,
          "maxBacklog": 2
        },
        "heapMb": 5.555614471435547,
        "heapCode": 3.0308799743652344,
        "heapData": 2.0683860778808594,
        "pssTotalMb": 231.6259765625,
        "pssApp": 129.2783203125,
        "pssRenderer": 102.34765625,
        "control": {
          "emitP50": 6.099999999976717,
          "emitP95": 16,
          "domP50": 6.5,
          "domP95": 16.800000000046566
        },
        "fCommitP50": 3.799999999930151,
        "fCommitP95": 14.300000000046566
      },
      "5000": {
        "setKey": {
          "emitP50": 13.5,
          "emitP95": 19.5,
          "domP50": 14.099999999976717,
          "domP95": 20
        },
        "setKeys": {
          "emitP50": 13.699999999953434,
          "emitP95": 30.29999999993015,
          "domP50": 14.29999999993015,
          "domP95": 30.699999999953434
        },
        "replace": {
          "emitP50": 14.5,
          "emitP95": 31.800000000046566,
          "domP50": 15.199999999953434,
          "domP95": 32.09999999997672
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 10.400000000023283,
          "lagP95": 19.70000000006985,
          "endLag": 9.79999999993015,
          "maxBacklog": 2
        },
        "heapMb": 9.94119644165039,
        "heapCode": 3.0820541381835938,
        "heapData": 6.260261535644531,
        "pssTotalMb": 246.7333984375,
        "pssApp": 138.9501953125,
        "pssRenderer": 107.783203125,
        "control": {
          "emitP50": 7,
          "emitP95": 15.300000000046566,
          "domP50": 7.200000000069849,
          "domP95": 15.800000000046566
        },
        "fCommitP50": 3.799999999930151,
        "fCommitP95": 13.099999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.599999999976717,
        "emitP95": 27.20000000006985,
        "domP50": 9.5,
        "domP95": 27.70000000006985
      },
      "edit_d4": {
        "emitP50": 8.699999999953434,
        "emitP95": 23.099999999976717,
        "domP50": 9.199999999953434,
        "domP95": 24.199999999953434
      },
      "edit_d10": {
        "emitP50": 8.5,
        "emitP95": 15.29999999993015,
        "domP50": 8.800000000046566,
        "domP95": 15.70000000006985
      },
      "loadCycle": {
        "emitP50": 13,
        "emitP95": 55.70000000006985,
        "domP50": 14.199999999953434,
        "domP95": 56.10000000009313
      },
      "step": {
        "emitP50": 8.5,
        "emitP95": 51.800000000046566,
        "domP50": 8.800000000046566,
        "domP95": 52.5
      },
      "reset": {
        "emitP50": 29.800000000046566,
        "emitP95": 43.09999999997672,
        "domP50": 29.900000000023283,
        "domP95": 43.20000000006985
      },
      "append100": {
        "emitP50": 14.400000000023283,
        "emitP95": 20.900000000023283,
        "domP50": 14.900000000023283,
        "domP95": 21.20000000006985
      },
      "control": {
        "emitP50": 6.800000000046566,
        "emitP95": 21.199999999953434,
        "domP50": 7.300000000046566,
        "domP95": 21.79999999993015
      },
      "heapMb": 5.483791351318359,
      "heapCode": 3.1700515747070312,
      "heapData": 1.8659591674804688,
      "pssTotalMb": 236.4697265625,
      "pssApp": 132.958984375,
      "pssRenderer": 103.5107421875,
      "relaunchReadyMs": 420.9000000000233,
      "relaunchHeapMb": 4.525482177734375,
      "relaunchHeapCode": 2.3176956176757812,
      "relaunchHeapData": 1.8298149108886719
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.5999999999767169,
          "domP50": 5.600000000093132,
          "domP95": 6.300000000046566
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.6999999999534339,
          "domP50": 5,
          "domP95": 9.400000000023283
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7999999999301508,
          "domP50": 1.1000000000931323,
          "domP95": 5.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 1,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.7253646850585938,
        "heapCode": 1.8455696105957031,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 219.412109375,
        "pssApp": 123.984375,
        "pssRenderer": 95.427734375
      },
      "500": {
        "setKey": {
          "emitP50": 0.6000000000931323,
          "emitP95": 6.099999999976717,
          "domP50": 5,
          "domP95": 14.199999999953434
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 3.099999999976717,
          "domP50": 2.099999999976717,
          "domP95": 10.400000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6999999999534339,
          "domP50": 1.400000000023283,
          "domP95": 10.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.134967803955078,
        "heapCode": 1.8519821166992188,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 223.4697265625,
        "pssApp": 124.1533203125,
        "pssRenderer": 99.31640625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6999999999534339,
          "emitP95": 4.099999999976717,
          "domP50": 3.200000000069849,
          "domP95": 12.5
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 16,
          "domP50": 3.599999999976717,
          "domP95": 20.900000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 14.5,
          "domP50": 2.099999999976717,
          "domP95": 21.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.400000000023283,
          "endLag": 1.3999999999068677,
          "maxBacklog": 0
        },
        "heapMb": 8.096824645996094,
        "heapCode": 1.8452720642089844,
        "heapData": 5.725063323974609,
        "pssTotalMb": 229.1552734375,
        "pssApp": 124.9921875,
        "pssRenderer": 104.1630859375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 5.599999999976717,
        "domP95": 8
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.5,
        "domP50": 5.400000000023283,
        "domP95": 7
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7000000000698492,
        "domP50": 5.299999999930151,
        "domP95": 8.5
      },
      "loadCycle": {
        "emitP50": 10.400000000023283,
        "emitP95": 33.70000000006985,
        "domP50": 12.300000000046566,
        "domP95": 34
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7000000000698492,
        "domP50": 1.2000000000698492,
        "domP95": 6.799999999930151
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 5.800000000046566,
        "domP50": 0.30000000004656613,
        "domP95": 5.900000000023283
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2,
        "domP50": 1,
        "domP95": 5.599999999976717
      },
      "heapMb": 3.9341163635253906,
      "heapCode": 1.9224510192871094,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 220.482421875,
      "pssApp": 123.1962890625,
      "pssRenderer": 97.2861328125,
      "relaunchReadyMs": 1528.2000000000698,
      "relaunchHeapMb": 3.2581748962402344,
      "relaunchHeapCode": 1.4549140930175781,
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
          "emitP95": 5.700000000069849,
          "domP50": 5.599999999976717,
          "domP95": 11.20000000006985
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6000000000931323,
          "domP50": 5.400000000023283,
          "domP95": 12.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 7.200000000069849,
          "domP50": 1,
          "domP95": 8.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.7237625122070312,
        "heapCode": 1.8441085815429688,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 222.3544921875,
        "pssApp": 125.4921875,
        "pssRenderer": 96.8623046875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 0.9000000000232831,
          "domP50": 3.800000000046566,
          "domP95": 7.900000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.900000000023283,
          "domP50": 1.5,
          "domP95": 8.20000000006985
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.5,
          "domP50": 1.099999999976717,
          "domP95": 7.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8999999999068677,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 4.134941101074219,
        "heapCode": 1.8519554138183594,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 226.4921875,
        "pssApp": 125.884765625,
        "pssRenderer": 100.607421875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.8000000000465661,
          "emitP95": 4.900000000023283,
          "domP50": 3,
          "domP95": 8.800000000046566
        },
        "setKeys": {
          "emitP50": 1.6999999999534339,
          "emitP95": 8.899999999906868,
          "domP50": 3.5,
          "domP95": 10.29999999993015
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 6.399999999906868,
          "domP50": 1.8000000000465661,
          "domP95": 8.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.5,
          "endLag": 1.900000000023283,
          "maxBacklog": 0
        },
        "heapMb": 8.10211181640625,
        "heapCode": 1.8499603271484375,
        "heapData": 5.725639343261719,
        "pssTotalMb": 232.1318359375,
        "pssApp": 126.7685546875,
        "pssRenderer": 105.36328125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 3.800000000046566,
        "domP95": 10.199999999953434
      },
      "edit_d4": {
        "emitP50": 0.5,
        "emitP95": 0.7999999999301508,
        "domP50": 1.2999999999301508,
        "domP95": 7.700000000069849
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 0.7000000000698492,
        "domP50": 1.1999999999534339,
        "domP95": 7.200000000069849
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 31.900000000023283,
        "domP50": 0.5999999999767169,
        "domP95": 32.300000000046566
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.9000000000232831,
        "domP50": 1,
        "domP95": 7.699999999953434
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5999999999767169,
        "domP50": 0.2000000000698492,
        "domP95": 2.099999999976717
      },
      "append100": {
        "emitP50": 0.5,
        "emitP95": 4.400000000023283,
        "domP50": 1.1000000000931323,
        "domP95": 6.900000000023283
      },
      "heapMb": 3.93402099609375,
      "heapCode": 1.9223670959472656,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 224.142578125,
      "pssApp": 125.9716796875,
      "pssRenderer": 98.1708984375,
      "relaunchReadyMs": 800.2000000000698,
      "relaunchHeapMb": 3.3515968322753906,
      "relaunchHeapCode": 1.5399971008300781,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.400000000023283,
          "emitP95": 28.900000000023283,
          "domP50": 9.400000000023283,
          "domP95": 29.300000000046566
        },
        "setKeys": {
          "emitP50": 8.800000000046566,
          "emitP95": 23.199999999953434,
          "domP50": 9.400000000023283,
          "domP95": 23.5
        },
        "replace": {
          "emitP50": 9.900000000023283,
          "emitP95": 18.20000000006985,
          "domP50": 13.400000000023283,
          "domP95": 19.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.800000000046566,
          "lagP95": 16.699999999953434,
          "endLag": 16.699999999953434,
          "maxBacklog": 2
        },
        "heapMb": 5.053531646728516,
        "heapCode": 2.9990692138671875,
        "heapData": 1.6156463623046875,
        "pssTotalMb": 233.380859375,
        "pssApp": 130.5361328125,
        "pssRenderer": 102.8447265625,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 24.20000000006985,
          "domP50": 6.699999999953434,
          "domP95": 25.899999999906868
        },
        "fCommitP50": 4,
        "fCommitP95": 6.799999999930151
      },
      "500": {
        "setKey": {
          "emitP50": 11,
          "emitP95": 24.800000000046566,
          "domP50": 11.400000000023283,
          "domP95": 25.20000000006985
        },
        "setKeys": {
          "emitP50": 8.099999999976717,
          "emitP95": 23.099999999976717,
          "domP50": 8.5,
          "domP95": 23.599999999976717
        },
        "replace": {
          "emitP50": 11.199999999953434,
          "emitP95": 18.899999999906868,
          "domP50": 12.099999999976717,
          "domP95": 19.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.799999999930151,
          "lagP95": 17.100000000093132,
          "endLag": 6.099999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.554393768310547,
        "heapCode": 3.029743194580078,
        "heapData": 2.068866729736328,
        "pssTotalMb": 234.56640625,
        "pssApp": 131.1220703125,
        "pssRenderer": 103.4443359375,
        "control": {
          "emitP50": 7,
          "emitP95": 15.5,
          "domP50": 7.200000000069849,
          "domP95": 15.699999999953434
        },
        "fCommitP50": 3.799999999930151,
        "fCommitP95": 5.400000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 11.600000000093132,
          "emitP95": 24.800000000046566,
          "domP50": 12.100000000093132,
          "domP95": 26
        },
        "setKeys": {
          "emitP50": 11.5,
          "emitP95": 18.800000000046566,
          "domP50": 12.400000000023283,
          "domP95": 19.20000000006985
        },
        "replace": {
          "emitP50": 13.800000000046566,
          "emitP95": 21.900000000023283,
          "domP50": 14.199999999953434,
          "domP95": 22.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.29999999993015,
          "lagP95": 19,
          "endLag": 18,
          "maxBacklog": 2
        },
        "heapMb": 9.932331085205078,
        "heapCode": 3.0750083923339844,
        "heapData": 6.260265350341797,
        "pssTotalMb": 248.6240234375,
        "pssApp": 139.5751953125,
        "pssRenderer": 109.048828125,
        "control": {
          "emitP50": 6.599999999976717,
          "emitP95": 16.099999999976717,
          "domP50": 6.800000000046566,
          "domP95": 17
        },
        "fCommitP50": 3.700000000069849,
        "fCommitP95": 6.599999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.599999999976717,
        "emitP95": 20.5,
        "domP50": 10.199999999953434,
        "domP95": 21.300000000046566
      },
      "edit_d4": {
        "emitP50": 8.400000000023283,
        "emitP95": 17.20000000006985,
        "domP50": 8.79999999993015,
        "domP95": 17.699999999953434
      },
      "edit_d10": {
        "emitP50": 8.400000000023283,
        "emitP95": 14.300000000046566,
        "domP50": 8.900000000023283,
        "domP95": 14.70000000006985
      },
      "loadCycle": {
        "emitP50": 10.800000000046566,
        "emitP95": 51.39999999990687,
        "domP50": 11,
        "domP95": 51.79999999993015
      },
      "step": {
        "emitP50": 9.900000000023283,
        "emitP95": 28.79999999993015,
        "domP50": 10.400000000023283,
        "domP95": 28.900000000023283
      },
      "reset": {
        "emitP50": 28.300000000046566,
        "emitP95": 52.5,
        "domP50": 28.400000000023283,
        "domP95": 52.5
      },
      "append100": {
        "emitP50": 14.699999999953434,
        "emitP95": 27.900000000023283,
        "domP50": 17,
        "domP95": 28.099999999976717
      },
      "control": {
        "emitP50": 7.700000000069849,
        "emitP95": 20.100000000093132,
        "domP50": 7.900000000023283,
        "domP95": 20.5
      },
      "heapMb": 5.491615295410156,
      "heapCode": 3.172504425048828,
      "heapData": 1.8715095520019531,
      "pssTotalMb": 240.9287109375,
      "pssApp": 136.2119140625,
      "pssRenderer": 104.716796875,
      "relaunchReadyMs": 388.5,
      "relaunchHeapMb": 4.532508850097656,
      "relaunchHeapCode": 2.323986053466797,
      "relaunchHeapData": 1.8304443359375
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10.70000000006985,
          "emitP95": 24.300000000046566,
          "domP50": 11.100000000093132,
          "domP95": 24.599999999976717
        },
        "setKeys": {
          "emitP50": 8.5,
          "emitP95": 29.199999999953434,
          "domP50": 8.70000000006985,
          "domP95": 29.5
        },
        "replace": {
          "emitP50": 9.599999999976717,
          "emitP95": 19,
          "domP50": 10.099999999976717,
          "domP95": 19.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.200000000069849,
          "lagP95": 19,
          "endLag": 5.300000000046566,
          "maxBacklog": 2
        },
        "heapMb": 5.054920196533203,
        "heapCode": 3.000049591064453,
        "heapData": 1.6156387329101562,
        "pssTotalMb": 233.2158203125,
        "pssApp": 130.23828125,
        "pssRenderer": 102.9775390625,
        "control": {
          "emitP50": 7.599999999976717,
          "emitP95": 12.79999999993015,
          "domP50": 8,
          "domP95": 13.099999999976717
        },
        "fCommitP50": 3.700000000069849,
        "fCommitP95": 7.299999999930151
      },
      "500": {
        "setKey": {
          "emitP50": 8.900000000023283,
          "emitP95": 24.599999999976717,
          "domP50": 9.300000000046566,
          "domP95": 25.199999999953434
        },
        "setKeys": {
          "emitP50": 10.900000000023283,
          "emitP95": 29.300000000046566,
          "domP50": 11.300000000046566,
          "domP95": 31.79999999993015
        },
        "replace": {
          "emitP50": 12.70000000006985,
          "emitP95": 18.5,
          "domP50": 13.099999999976717,
          "domP95": 18.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.100000000093132,
          "lagP95": 16.900000000023283,
          "endLag": 6.5,
          "maxBacklog": 3
        },
        "heapMb": 5.545814514160156,
        "heapCode": 3.021800994873047,
        "heapData": 2.0685768127441406,
        "pssTotalMb": 233.732421875,
        "pssApp": 130.3369140625,
        "pssRenderer": 103.3955078125,
        "control": {
          "emitP50": 8.400000000023283,
          "emitP95": 14.20000000006985,
          "domP50": 8.70000000006985,
          "domP95": 14.5
        },
        "fCommitP50": 3.700000000069849,
        "fCommitP95": 12
      },
      "5000": {
        "setKey": {
          "emitP50": 12.100000000093132,
          "emitP95": 21.599999999976717,
          "domP50": 12.699999999953434,
          "domP95": 23.5
        },
        "setKeys": {
          "emitP50": 11.699999999953434,
          "emitP95": 21.800000000046566,
          "domP50": 12.29999999993015,
          "domP95": 22.20000000006985
        },
        "replace": {
          "emitP50": 14.300000000046566,
          "emitP95": 22.20000000006985,
          "domP50": 14.79999999993015,
          "domP95": 22.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 10.699999999953434,
          "lagP95": 20.699999999953434,
          "endLag": 8.399999999906868,
          "maxBacklog": 2
        },
        "heapMb": 9.939266204833984,
        "heapCode": 3.082134246826172,
        "heapData": 6.260410308837891,
        "pssTotalMb": 250.0458984375,
        "pssApp": 140.9892578125,
        "pssRenderer": 109.056640625,
        "control": {
          "emitP50": 7.300000000046566,
          "emitP95": 27.400000000023283,
          "domP50": 7.5,
          "domP95": 27.600000000093132
        },
        "fCommitP50": 4,
        "fCommitP95": 8.100000000093132
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.800000000046566,
        "emitP95": 18.600000000093132,
        "domP50": 9.70000000006985,
        "domP95": 20.100000000093132
      },
      "edit_d4": {
        "emitP50": 8.5,
        "emitP95": 18.5,
        "domP50": 9,
        "domP95": 18.899999999906868
      },
      "edit_d10": {
        "emitP50": 8.599999999976717,
        "emitP95": 17.899999999906868,
        "domP50": 9.199999999953434,
        "domP95": 18.199999999953434
      },
      "loadCycle": {
        "emitP50": 14.29999999993015,
        "emitP95": 61.699999999953434,
        "domP50": 14.5,
        "domP95": 62.300000000046566
      },
      "step": {
        "emitP50": 9.699999999953434,
        "emitP95": 17.20000000006985,
        "domP50": 10.099999999976717,
        "domP95": 17.600000000093132
      },
      "reset": {
        "emitP50": 25.199999999953434,
        "emitP95": 43.699999999953434,
        "domP50": 25.199999999953434,
        "domP95": 44.40000000002328
      },
      "append100": {
        "emitP50": 12.900000000023283,
        "emitP95": 18.099999999976717,
        "domP50": 13.600000000093132,
        "domP95": 18.400000000023283
      },
      "control": {
        "emitP50": 6.400000000023283,
        "emitP95": 16.70000000006985,
        "domP50": 6.799999999930151,
        "domP95": 16.900000000023283
      },
      "heapMb": 5.4903106689453125,
      "heapCode": 3.1701736450195312,
      "heapData": 1.87255859375,
      "pssTotalMb": 239.5341796875,
      "pssApp": 134.923828125,
      "pssRenderer": 104.6103515625,
      "relaunchReadyMs": 1842.9000000000233,
      "relaunchHeapMb": 4.42840576171875,
      "relaunchHeapCode": 2.225494384765625,
      "relaunchHeapData": 1.8271141052246094
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5,
          "domP50": 5.600000000093132,
          "domP95": 7.400000000023283
        },
        "setKeys": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.5,
          "domP50": 5.399999999906868,
          "domP95": 9.400000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 8.5,
          "domP50": 3,
          "domP95": 9
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.725330352783203,
        "heapCode": 1.8455352783203125,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 223.1796875,
        "pssApp": 126.224609375,
        "pssRenderer": 96.955078125
      },
      "500": {
        "setKey": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.9000000000232831,
          "domP50": 5.599999999976717,
          "domP95": 6.799999999930151
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 5,
          "domP95": 8.70000000006985
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 3.299999999930151,
          "domP50": 5.199999999953434,
          "domP95": 11
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8999999999068677,
          "endLag": 0.5999999999767169,
          "maxBacklog": 0
        },
        "heapMb": 4.134792327880859,
        "heapCode": 1.8519172668457031,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 226.96875,
        "pssApp": 126.4482421875,
        "pssRenderer": 100.5205078125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.7000000000698492,
          "emitP95": 3,
          "domP50": 4,
          "domP95": 8.20000000006985
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 8.900000000023283,
          "domP50": 3,
          "domP95": 11.099999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 9.599999999976717,
          "domP50": 1.900000000023283,
          "domP95": 13
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.5,
          "endLag": 1.6999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 8.099262237548828,
        "heapCode": 1.8469276428222656,
        "heapData": 5.725639343261719,
        "pssTotalMb": 230.8193359375,
        "pssApp": 125.4306640625,
        "pssRenderer": 105.388671875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.800000000046566,
        "domP50": 5.200000000069849,
        "domP95": 8.099999999976717
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.199999999953434,
        "domP50": 5.199999999953434,
        "domP95": 8.300000000046566
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.5,
        "domP50": 1.2000000000698492,
        "domP95": 7.199999999953434
      },
      "loadCycle": {
        "emitP50": 0.7000000000698492,
        "emitP95": 33.300000000046566,
        "domP50": 3.299999999930151,
        "domP95": 33.699999999953434
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6999999999534339,
        "domP50": 0.9000000000232831,
        "domP95": 6.099999999976717
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5999999999767169,
        "domP50": 0.30000000004656613,
        "domP95": 0.9000000000232831
      },
      "append100": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.5,
        "domP50": 0.9000000000232831,
        "domP95": 9.699999999953434
      },
      "heapMb": 3.9362335205078125,
      "heapCode": 1.9245071411132812,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 224.3916015625,
      "pssApp": 126.427734375,
      "pssRenderer": 97.9638671875,
      "relaunchReadyMs": 1556.6999999999534,
      "relaunchHeapMb": 3.2582054138183594,
      "relaunchHeapCode": 1.4549140930175781,
      "relaunchHeapData": 1.443756103515625
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 2.5,
          "domP50": 4.300000000046566,
          "domP95": 8.79999999993015
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.300000000046566,
          "domP50": 0.9000000000232831,
          "domP95": 6.699999999953434
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7999999999301508,
          "domP50": 1.1000000000931323,
          "domP95": 5.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 3.7242774963378906,
        "heapCode": 1.8445587158203125,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 222.841796875,
        "pssApp": 126.078125,
        "pssRenderer": 96.763671875
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.5999999999767169,
          "domP50": 5.800000000046566,
          "domP95": 7.700000000069849
        },
        "setKeys": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.8000000000465661,
          "domP50": 4.799999999930151,
          "domP95": 6.799999999930151
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2,
          "domP50": 1.1000000000931323,
          "domP95": 6.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.134876251220703,
        "heapCode": 1.8518905639648438,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 227.115234375,
        "pssApp": 126.376953125,
        "pssRenderer": 100.73828125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.3000000000465661,
          "emitP95": 1.7000000000698492,
          "domP50": 7.300000000046566,
          "domP95": 8
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 3.099999999976717,
          "domP50": 3.400000000023283,
          "domP95": 10.599999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 6.699999999953434,
          "domP50": 1.6000000000931323,
          "domP95": 15.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999068677,
          "lagP95": 2.299999999930151,
          "endLag": 1.1999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 8.100025177001953,
        "heapCode": 1.8477325439453125,
        "heapData": 5.725639343261719,
        "pssTotalMb": 230.861328125,
        "pssApp": 125.8486328125,
        "pssRenderer": 105.0126953125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 5.200000000069849,
        "domP95": 8.399999999906868
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.3999999999068677,
        "domP50": 1.099999999976717,
        "domP95": 6.899999999906868
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 2.099999999976717,
        "domP50": 1.7999999999301508,
        "domP95": 9.800000000046566
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 35.300000000046566,
        "domP50": 0.5999999999767169,
        "domP95": 35.70000000006985
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.2000000000698492,
        "domP50": 2.599999999976717,
        "domP95": 7.400000000023283
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 1.2000000000698492,
        "domP50": 0.2000000000698492,
        "domP95": 1.8000000000465661
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.6999999999534339,
        "domP50": 1,
        "domP95": 5.900000000023283
      },
      "heapMb": 3.935321807861328,
      "heapCode": 1.9236259460449219,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 223.88671875,
      "pssApp": 125.916015625,
      "pssRenderer": 97.970703125,
      "relaunchReadyMs": 1508.0999999999767,
      "relaunchHeapMb": 3.35205078125,
      "relaunchHeapCode": 1.5400428771972656,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10.100000000093132,
          "emitP95": 17.29999999993015,
          "domP50": 10.600000000093132,
          "domP95": 17.900000000023283
        },
        "setKeys": {
          "emitP50": 9.099999999976717,
          "emitP95": 21.5,
          "domP50": 9.5,
          "domP95": 21.900000000023283
        },
        "replace": {
          "emitP50": 7.800000000046566,
          "emitP95": 17.800000000046566,
          "domP50": 8.400000000023283,
          "domP95": 18.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 21.20000000006985,
          "endLag": 6.299999999930151,
          "maxBacklog": 2
        },
        "heapMb": 5.052227020263672,
        "heapCode": 2.9975967407226562,
        "heapData": 1.6156463623046875,
        "pssTotalMb": 234.49609375,
        "pssApp": 131.814453125,
        "pssRenderer": 102.681640625,
        "control": {
          "emitP50": 6.199999999953434,
          "emitP95": 12.79999999993015,
          "domP50": 6.400000000023283,
          "domP95": 13.199999999953434
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 11.79999999993015
      },
      "500": {
        "setKey": {
          "emitP50": 9.400000000023283,
          "emitP95": 24.599999999976717,
          "domP50": 10.699999999953434,
          "domP95": 25.699999999953434
        },
        "setKeys": {
          "emitP50": 10.100000000093132,
          "emitP95": 20.099999999976717,
          "domP50": 10.5,
          "domP95": 20.599999999976717
        },
        "replace": {
          "emitP50": 12.900000000023283,
          "emitP95": 24.5,
          "domP50": 13.400000000023283,
          "domP95": 24.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.299999999930151,
          "lagP95": 16.29999999993015,
          "endLag": 5.300000000046566,
          "maxBacklog": 2
        },
        "heapMb": 5.554420471191406,
        "heapCode": 3.0300254821777344,
        "heapData": 2.0685997009277344,
        "pssTotalMb": 235.07421875,
        "pssApp": 131.779296875,
        "pssRenderer": 103.294921875,
        "control": {
          "emitP50": 7.200000000069849,
          "emitP95": 21,
          "domP50": 7.799999999930151,
          "domP95": 21.199999999953434
        },
        "fCommitP50": 3.800000000046566,
        "fCommitP95": 9.900000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 11.899999999906868,
          "emitP95": 19.900000000023283,
          "domP50": 12.70000000006985,
          "domP95": 20.400000000023283
        },
        "setKeys": {
          "emitP50": 11.099999999976717,
          "emitP95": 25,
          "domP50": 11.699999999953434,
          "domP95": 25.400000000023283
        },
        "replace": {
          "emitP50": 15.29999999993015,
          "emitP95": 25.20000000006985,
          "domP50": 15.899999999906868,
          "domP95": 26.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 10.399999999906868,
          "lagP95": 19.599999999976717,
          "endLag": 8.300000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.943843841552734,
        "heapCode": 3.0851821899414062,
        "heapData": 6.260501861572266,
        "pssTotalMb": 250.6865234375,
        "pssApp": 141.5751953125,
        "pssRenderer": 109.111328125,
        "control": {
          "emitP50": 6.100000000093132,
          "emitP95": 19.599999999976717,
          "domP50": 6.400000000023283,
          "domP95": 21
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 11.899999999906868
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 11.699999999953434,
        "emitP95": 22.5,
        "domP50": 12.199999999953434,
        "domP95": 23.20000000006985
      },
      "edit_d4": {
        "emitP50": 8.5,
        "emitP95": 21.400000000023283,
        "domP50": 9.599999999976717,
        "domP95": 21.800000000046566
      },
      "edit_d10": {
        "emitP50": 11,
        "emitP95": 17.199999999953434,
        "domP50": 11.699999999953434,
        "domP95": 17.699999999953434
      },
      "loadCycle": {
        "emitP50": 12.79999999993015,
        "emitP95": 52.5,
        "domP50": 12.800000000046566,
        "domP95": 52.800000000046566
      },
      "step": {
        "emitP50": 8.699999999953434,
        "emitP95": 27.900000000023283,
        "domP50": 9.199999999953434,
        "domP95": 29.199999999953434
      },
      "reset": {
        "emitP50": 29.5,
        "emitP95": 48.300000000046566,
        "domP50": 29.5,
        "domP95": 48.300000000046566
      },
      "append100": {
        "emitP50": 15.099999999976717,
        "emitP95": 28.400000000023283,
        "domP50": 15.400000000023283,
        "domP95": 29.099999999976717
      },
      "control": {
        "emitP50": 6.5,
        "emitP95": 22.400000000023283,
        "domP50": 6.700000000069849,
        "domP95": 22.70000000006985
      },
      "heapMb": 5.483921051025391,
      "heapCode": 3.17047119140625,
      "heapData": 1.8658065795898438,
      "pssTotalMb": 239.6171875,
      "pssApp": 134.6689453125,
      "pssRenderer": 104.9482421875,
      "relaunchReadyMs": 451.89999999990687,
      "relaunchHeapMb": 4.471233367919922,
      "relaunchHeapCode": 2.3238868713378906,
      "relaunchHeapData": 1.7691879272460938
    }
  }
]
```
</details>
