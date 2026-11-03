# Phase 16 shapes — flat objects & hybrid workflow (2026-10-27)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.15 ms, p95 9.26 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 45 / CODE-BOUND 0 / FAIL 40

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.40 ± 0.07 | 8.06 ± 0.40 | 20.2× | FAIL | allow 6.1 (control emitP50 5.6×1) |
| flat | 50.setKey.emitP95 | 1.78 ± 1.08 | 20.14 ± 1.63 | 11.3× | PLATFORM-BOUND | allow 19.2 (control emitP95 16.5×1) |
| flat | 50.setKey.domP50 | 3.20 ± 1.95 | 8.84 ± 0.60 | 2.8× | PLATFORM-BOUND | allow 8.6 (control domP50 6.1×1) |
| flat | 50.setKey.domP95 | 9.70 ± 2.03 | 20.98 ± 1.34 | 2.2× | PLATFORM-BOUND | allow 20.1 (control domP95 16.7×1) |
| flat | 50.setKeys.emitP50 | 0.44 ± 0.05 | 8.16 ± 0.56 | 18.5× | FAIL | allow 6.2 (control emitP50 5.6×1) |
| flat | 50.setKeys.emitP95 | 1.34 ± 0.48 | 18.42 ± 2.77 | 13.7× | PLATFORM-BOUND | allow 19.7 (control emitP95 16.5×1) |
| flat | 50.setKeys.domP50 | 2.48 ± 1.52 | 8.76 ± 0.69 | 3.5× | PLATFORM-BOUND | allow 8.3 (control domP50 6.1×1) |
| flat | 50.setKeys.domP95 | 9.28 ± 1.45 | 19.02 ± 2.61 | 2.0× | PLATFORM-BOUND | allow 20.8 (control domP95 16.7×1) |
| flat | 50.replace.emitP50 | 0.32 ± 0.04 | 6.82 ± 0.41 | 21.3× | FAIL | allow 6.1 (control emitP50 5.6×1) |
| flat | 50.replace.emitP95 | 1.30 ± 1.35 | 19.06 ± 2.41 | 14.7× | PLATFORM-BOUND | allow 20.2 (control emitP95 16.5×1) |
| flat | 50.replace.domP50 | 1.04 ± 0.15 | 7.48 ± 0.42 | 7.2× | PLATFORM-BOUND | allow 6.6 (control domP50 6.1×1) |
| flat | 50.replace.domP95 | 9.26 ± 3.47 | 19.48 ± 2.39 | 2.1× | PLATFORM-BOUND | allow 22.6 (control domP95 16.7×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 6.38 ± 0.98 | 21.3× | PLATFORM-BOUND | allow 6.6 (control emitP50 5.6×1) |
| flat | 50.burst.lagP95 | 0.80 ± 0.16 | 17.20 ± 6.84 | 21.5× | PLATFORM-BOUND | allow 23.5 (control emitP95 16.5×1) |
| flat | 50.burst.endLag | 0.38 ± 0.13 | 7.12 ± 1.24 | 18.7× | PLATFORM-BOUND | allow 7.0 (control emitP50 5.6×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.40 ± 0.55 | 2400000000.0× | FAIL |  |
| flat | 50.heapMb | 3.69 ± 0.07 | 5.04 ± 0.00 | 1.4× | FAIL | code +1.17 MB; data 1.50 -> 1.61 MB |
| flat | 50.pssTotalMb | 223.82 ± 2.44 | 236.49 ± 2.01 | 1.1× | FAIL | allow 7.3 (plugin baseline 2.8 MB) |
| flat | 500.setKey.emitP50 | 0.48 ± 0.11 | 7.88 ± 0.35 | 16.4× | FAIL | allow 6.7 (control emitP50 6.2×1) |
| flat | 500.setKey.emitP95 | 2.78 ± 2.85 | 24.42 ± 2.85 | 8.8× | FAIL | allow 20.9 (control emitP95 15.2×1) |
| flat | 500.setKey.domP50 | 3.04 ± 1.58 | 8.42 ± 0.37 | 2.8× | PLATFORM-BOUND | allow 8.7 (control domP50 6.7×1) |
| flat | 500.setKey.domP95 | 11.10 ± 5.31 | 25.08 ± 2.89 | 2.3× | PLATFORM-BOUND | allow 23.8 (control domP95 15.6×1) |
| flat | 500.setKeys.emitP50 | 0.50 ± 0.00 | 8.70 ± 0.57 | 17.4× | FAIL | allow 6.8 (control emitP50 6.2×1) |
| flat | 500.setKeys.emitP95 | 3.30 ± 2.66 | 17.54 ± 2.41 | 5.3× | PLATFORM-BOUND | allow 20.3 (control emitP95 15.2×1) |
| flat | 500.setKeys.domP50 | 3.22 ± 1.86 | 9.30 ± 0.57 | 2.9× | PLATFORM-BOUND | allow 9.1 (control domP50 6.7×1) |
| flat | 500.setKeys.domP95 | 9.48 ± 4.44 | 19.12 ± 3.30 | 2.0× | PLATFORM-BOUND | allow 23.3 (control domP95 15.6×1) |
| flat | 500.replace.emitP50 | 0.38 ± 0.08 | 8.70 ± 0.87 | 22.9× | FAIL | allow 7.2 (control emitP50 6.2×1) |
| flat | 500.replace.emitP95 | 2.76 ± 1.38 | 20.02 ± 4.30 | 7.3× | PLATFORM-BOUND | allow 20.9 (control emitP95 15.2×1) |
| flat | 500.replace.domP50 | 1.08 ± 0.31 | 9.44 ± 0.79 | 8.7× | FAIL | allow 7.8 (control domP50 6.7×1) |
| flat | 500.replace.domP95 | 6.40 ± 0.74 | 20.54 ± 4.24 | 3.2× | PLATFORM-BOUND | allow 20.5 (control domP95 15.6×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 6.44 ± 0.29 | 16.1× | PLATFORM-BOUND | allow 6.5 (control emitP50 6.2×1) |
| flat | 500.burst.lagP95 | 0.68 ± 0.13 | 17.20 ± 3.42 | 25.3× | PLATFORM-BOUND | allow 18.8 (control emitP95 15.2×1) |
| flat | 500.burst.endLag | 0.60 ± 0.42 | 7.54 ± 2.52 | 12.6× | PLATFORM-BOUND | allow 9.2 (control emitP50 6.2×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 500.heapMb | 4.10 ± 0.07 | 5.53 ± 0.00 | 1.3× | FAIL | code +1.19 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 227.83 ± 3.35 | 237.58 ± 2.06 | 1.0× | FAIL | allow 8.2 (plugin baseline 2.8 MB) |
| flat | 5000.setKey.emitP50 | 1.22 ± 0.16 | 10.34 ± 0.43 | 8.5× | FAIL | allow 6.4 (control emitP50 5.8×1) |
| flat | 5000.setKey.emitP95 | 2.22 ± 0.73 | 21.64 ± 5.21 | 9.7× | PLATFORM-BOUND | allow 20.2 (control emitP95 14.3×1) |
| flat | 5000.setKey.domP50 | 5.88 ± 1.50 | 11.06 ± 0.40 | 1.9× | PLATFORM-BOUND | allow 8.2 (control domP50 6.3×1) |
| flat | 5000.setKey.domP95 | 8.08 ± 0.47 | 22.78 ± 4.76 | 2.8× | PLATFORM-BOUND | allow 19.9 (control domP95 14.7×1) |
| flat | 5000.setKeys.emitP50 | 1.58 ± 0.13 | 9.46 ± 0.55 | 6.0× | FAIL | allow 6.5 (control emitP50 5.8×1) |
| flat | 5000.setKeys.emitP95 | 10.78 ± 4.96 | 23.84 ± 3.48 | 2.2× | PLATFORM-BOUND | allow 22.7 (control emitP95 14.3×1) |
| flat | 5000.setKeys.domP50 | 3.08 ± 0.44 | 9.98 ± 0.58 | 3.2× | PLATFORM-BOUND | allow 7.3 (control domP50 6.3×1) |
| flat | 5000.setKeys.domP95 | 15.26 ± 6.58 | 24.22 ± 3.50 | 1.6× | PLATFORM-BOUND | allow 24.8 (control domP95 14.7×1) |
| flat | 5000.replace.emitP50 | 0.38 ± 0.04 | 12.62 ± 0.85 | 33.2× | FAIL | allow 6.7 (control emitP50 5.8×1) |
| flat | 5000.replace.emitP95 | 2.76 ± 1.21 | 21.88 ± 3.53 | 7.9× | FAIL | allow 19.0 (control emitP95 14.3×1) |
| flat | 5000.replace.domP50 | 1.92 ± 0.22 | 13.32 ± 1.20 | 6.9× | FAIL | allow 7.7 (control domP50 6.3×1) |
| flat | 5000.replace.domP95 | 9.54 ± 2.80 | 22.32 ± 3.53 | 2.3× | PLATFORM-BOUND | allow 21.0 (control domP95 14.7×1) |
| flat | 5000.burst.lagP50 | 1.32 ± 0.08 | 8.14 ± 0.23 | 6.2× | FAIL | allow 6.1 (control emitP50 5.8×1) |
| flat | 5000.burst.lagP95 | 1.98 ± 0.18 | 16.16 ± 2.83 | 8.2× | PLATFORM-BOUND | allow 17.3 (control emitP95 14.3×1) |
| flat | 5000.burst.endLag | 1.26 ± 0.21 | 8.12 ± 0.96 | 6.4× | PLATFORM-BOUND | allow 7.0 (control emitP50 5.8×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.04 ± 0.09 | 9.92 ± 0.00 | 1.2× | FAIL | code +1.27 MB; data 5.72 -> 6.26 MB |
| flat | 5000.pssTotalMb | 231.79 ± 3.07 | 246.73 ± 3.86 | 1.1× | FAIL | allow 9.7 (plugin baseline 2.8 MB) |
| workflow | edit_d1.emitP50 | 0.36 ± 0.05 | 8.68 ± 1.09 | 24.1× | FAIL | allow 7.2 (control emitP50 6.1×1) |
| workflow | edit_d1.emitP95 | 1.10 ± 0.29 | 20.32 ± 1.31 | 18.5× | FAIL | allow 16.2 (control emitP95 14.6×1) |
| workflow | edit_d1.domP50 | 5.04 ± 1.44 | 9.42 ± 0.88 | 1.9× | PLATFORM-BOUND | allow 8.7 (control domP50 6.4×1) |
| workflow | edit_d1.domP95 | 7.68 ± 1.33 | 21.72 ± 2.11 | 2.8× | PLATFORM-BOUND | allow 18.9 (control domP95 15.5×1) |
| workflow | edit_d4.emitP50 | 0.40 ± 0.00 | 7.70 ± 0.87 | 19.3× | FAIL | allow 6.9 (control emitP50 6.1×1) |
| workflow | edit_d4.emitP95 | 1.16 ± 0.38 | 17.32 ± 3.85 | 14.9× | PLATFORM-BOUND | allow 18.8 (control emitP95 14.6×1) |
| workflow | edit_d4.domP50 | 3.18 ± 1.96 | 8.16 ± 0.84 | 2.6× | PLATFORM-BOUND | allow 9.2 (control domP50 6.4×1) |
| workflow | edit_d4.domP95 | 9.14 ± 2.05 | 17.74 ± 3.82 | 1.9× | PLATFORM-BOUND | allow 21.4 (control domP95 15.5×1) |
| workflow | edit_d10.emitP50 | 0.44 ± 0.05 | 7.86 ± 0.54 | 17.9× | FAIL | allow 6.7 (control emitP50 6.1×1) |
| workflow | edit_d10.emitP95 | 1.08 ± 0.31 | 18.12 ± 3.89 | 16.8× | PLATFORM-BOUND | allow 18.8 (control emitP95 14.6×1) |
| workflow | edit_d10.domP50 | 1.44 ± 0.32 | 8.44 ± 0.61 | 5.9× | PLATFORM-BOUND | allow 7.3 (control domP50 6.4×1) |
| workflow | edit_d10.domP95 | 7.46 ± 1.34 | 19.18 ± 3.47 | 2.6× | PLATFORM-BOUND | allow 20.3 (control domP95 15.5×1) |
| workflow | loadCycle.emitP50 | 0.92 ± 1.00 | 14.62 ± 2.79 | 15.9× | PLATFORM-BOUND | allow 15.9 (control emitP50 6.1×2) |
| workflow | loadCycle.emitP95 | 34.90 ± 2.01 | 56.76 ± 3.51 | 1.6× | PLATFORM-BOUND | allow 34.6 (control emitP95 14.6×2) |
| workflow | loadCycle.domP50 | 1.34 ± 1.66 | 14.78 ± 2.79 | 11.0× | PLATFORM-BOUND | allow 17.2 (control domP50 6.4×2) |
| workflow | loadCycle.domP95 | 35.32 ± 1.91 | 57.26 ± 3.41 | 1.6× | PLATFORM-BOUND | allow 36.3 (control domP95 15.5×2) |
| workflow | step.emitP50 | 0.34 ± 0.05 | 7.18 ± 0.43 | 21.1× | FAIL | allow 6.6 (control emitP50 6.1×1) |
| workflow | step.emitP95 | 1.50 ± 1.02 | 19.46 ± 2.21 | 13.0× | FAIL | allow 17.8 (control emitP95 14.6×1) |
| workflow | step.domP50 | 2.84 ± 1.84 | 7.60 ± 0.39 | 2.7× | PLATFORM-BOUND | allow 8.6 (control domP50 6.4×1) |
| workflow | step.domP95 | 9.04 ± 0.77 | 20.98 ± 3.22 | 2.3× | PLATFORM-BOUND | allow 19.5 (control domP95 15.5×1) |
| workflow | reset.emitP50 | 0.18 ± 0.04 | 26.44 ± 1.82 | 146.9× | FAIL | allow 7.9 (control emitP50 6.1×1) |
| workflow | reset.emitP95 | 1.66 ± 2.35 | 42.68 ± 5.02 | 25.7× | FAIL | allow 21.9 (control emitP95 14.6×1) |
| workflow | reset.domP50 | 0.24 ± 0.05 | 26.54 ± 1.74 | 110.6× | FAIL | allow 8.2 (control domP50 6.4×1) |
| workflow | reset.domP95 | 2.46 ± 2.01 | 42.68 ± 5.02 | 17.3× | FAIL | allow 22.5 (control domP95 15.5×1) |
| workflow | append100.emitP50 | 0.36 ± 0.05 | 15.20 ± 1.03 | 42.2× | FAIL | allow 7.2 (control emitP50 6.1×1) |
| workflow | append100.emitP95 | 2.80 ± 2.88 | 60.12 ± 9.29 | 21.5× | FAIL | allow 26.7 (control emitP95 14.6×1) |
| workflow | append100.domP50 | 0.84 ± 0.11 | 15.88 ± 0.88 | 18.9× | FAIL | allow 7.4 (control domP50 6.4×1) |
| workflow | append100.domP95 | 4.96 ± 2.25 | 60.44 ± 9.30 | 12.2× | FAIL | allow 27.1 (control domP95 15.5×1) |
| workflow | heapMb | 3.84 ± 0.09 | 5.48 ± 0.01 | 1.4× | FAIL | code +1.32 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 225.88 ± 3.20 | 240.22 ± 1.74 | 1.1× | FAIL | allow 7.8 (plugin baseline 2.8 MB) |
| workflow | relaunchReadyMs | 882.74 ± 361.46 | 861.18 ± 419.24 | 1.0× | PASS |  |
| workflow | relaunchHeapMb | 3.35 ± 0.00 | 4.46 ± 0.17 | 1.3× | FAIL | code +0.63 MB; data 1.45 -> 1.83 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 5.62 | 6.06 | 16.74 | 8.06 | 8.84 | 20.98 |
| 500 | 6.24 | 6.72 | 15.56 | 7.88 | 8.42 | 25.08 |
| 5000 | 5.82 | 6.32 | 14.70 | 10.34 | 11.06 | 22.78 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 126.7 | 132.9 | 97.1 | 103.6 |
| flat 500 | 127.1 | 133.3 | 100.8 | 104.2 |
| flat 5000 | 126.3 | 136.9 | 105.5 | 109.8 |
| workflow | 127.7 | 134.5 | 98.2 | 105.7 |

<details><summary>Raw per-trial data</summary>

```json
[
  {
    "impl": "classic",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.3999999999650754,
          "emitP95": 0.5,
          "domP50": 2.900000000023283,
          "domP95": 12.299999999988358
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 1.099999999976717,
          "domP95": 8.700000000011642
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 0.5,
          "domP50": 1,
          "domP95": 6.2000000000116415
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 1,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.7242202758789062,
        "heapCode": 1.84454345703125,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.5771484375,
        "pssApp": 127.6181640625,
        "pssRenderer": 96.958984375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 7.7000000000116415,
          "domP50": 2,
          "domP95": 19.399999999965075
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 7.7999999999883585,
          "domP50": 3.8999999999650754,
          "domP95": 17.20000000001164
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.5,
          "domP50": 0.9000000000232831,
          "domP95": 6.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7999999999883585,
          "endLag": 0.29999999998835847,
          "maxBacklog": 0
        },
        "heapMb": 4.132762908935547,
        "heapCode": 1.8497772216796875,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 227.3291015625,
        "pssApp": 126.775390625,
        "pssRenderer": 100.5537109375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 2,
          "domP50": 6.600000000034925,
          "domP95": 7.5
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 8,
          "domP50": 3.5,
          "domP95": 15.200000000011642
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.2999999999883585,
          "domP50": 1.599999999976717,
          "domP95": 8
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999883585,
          "lagP95": 2,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 7.939098358154297,
        "heapCode": 1.6922569274902344,
        "heapData": 5.722118377685547,
        "pssTotalMb": 228.1552734375,
        "pssApp": 123.998046875,
        "pssRenderer": 104.1572265625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.2999999999883585,
        "domP50": 5.399999999965075,
        "domP95": 9.799999999988358
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.2000000000116415,
        "domP50": 3.5,
        "domP95": 8.200000000011642
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.1000000000349246,
        "domP50": 1.2999999999883585,
        "domP95": 6.2999999999883585
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 35,
        "domP50": 0.5,
        "domP95": 35.40000000002328
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.1000000000349246,
        "domP50": 4.899999999965075,
        "domP95": 9.300000000046566
      },
      "reset": {
        "emitP50": 0.1000000000349246,
        "emitP95": 0.40000000002328306,
        "domP50": 0.20000000001164153,
        "domP95": 1.5
      },
      "append100": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.5999999999767169,
        "domP50": 0.7000000000116415,
        "domP95": 1.2999999999883585
      },
      "heapMb": 3.777416229248047,
      "heapCode": 1.7703742980957031,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 223.33203125,
      "pssApp": 126.294921875,
      "pssRenderer": 97.037109375,
      "relaunchReadyMs": 662.7999999999884,
      "relaunchHeapMb": 3.3522987365722656,
      "relaunchHeapCode": 1.5400962829589844,
      "relaunchHeapData": 1.4465255737304688
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.5,
          "emitP95": 18.79999999998836,
          "domP50": 8.099999999976717,
          "domP95": 21.100000000034925
        },
        "setKeys": {
          "emitP50": 7.599999999976717,
          "emitP95": 16.29999999998836,
          "domP50": 8.100000000034925,
          "domP95": 17.099999999976717
        },
        "replace": {
          "emitP50": 6.2999999999883585,
          "emitP95": 17.79999999998836,
          "domP50": 7.2000000000116415,
          "domP95": 18.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.2000000000116415,
          "lagP95": 14.400000000023283,
          "endLag": 5.7999999999883585,
          "maxBacklog": 2
        },
        "heapMb": 5.045127868652344,
        "heapCode": 2.99072265625,
        "heapData": 1.6147575378417969,
        "pssTotalMb": 235.5703125,
        "pssApp": 132.7353515625,
        "pssRenderer": 102.8349609375,
        "control": {
          "emitP50": 5.2000000000116415,
          "emitP95": 13.799999999988358,
          "domP50": 6,
          "domP95": 14.099999999976717
        },
        "fCommitP50": 3.1000000000349246,
        "fCommitP95": 6.599999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 7.5,
          "emitP95": 24.29999999998836,
          "domP50": 8,
          "domP95": 24.79999999998836
        },
        "setKeys": {
          "emitP50": 8.799999999988358,
          "emitP95": 13.5,
          "domP50": 9.5,
          "domP95": 13.900000000023283
        },
        "replace": {
          "emitP50": 9.300000000046566,
          "emitP95": 18.100000000034925,
          "domP50": 9.700000000011642,
          "domP95": 18.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.100000000034925,
          "lagP95": 15.600000000034925,
          "endLag": 5.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.527935028076172,
        "heapCode": 3.005573272705078,
        "heapData": 2.0671539306640625,
        "pssTotalMb": 235.26171875,
        "pssApp": 131.8564453125,
        "pssRenderer": 103.4052734375,
        "control": {
          "emitP50": 5.2000000000116415,
          "emitP95": 13.700000000011642,
          "domP50": 5.900000000023283,
          "domP95": 13.900000000023283
        },
        "fCommitP50": 3.1000000000349246,
        "fCommitP95": 11.599999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 10.699999999953434,
          "emitP95": 16.79999999998836,
          "domP50": 11.399999999965075,
          "domP95": 17.399999999965075
        },
        "setKeys": {
          "emitP50": 9.799999999988358,
          "emitP95": 22.70000000001164,
          "domP50": 10.299999999988358,
          "domP95": 23
        },
        "replace": {
          "emitP50": 11.899999999965075,
          "emitP95": 24,
          "domP50": 12.599999999976717,
          "domP95": 24.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.5,
          "lagP95": 15.799999999988358,
          "endLag": 8.399999999965075,
          "maxBacklog": 2
        },
        "heapMb": 9.92251968383789,
        "heapCode": 3.0654525756835938,
        "heapData": 6.259063720703125,
        "pssTotalMb": 243.9677734375,
        "pssApp": 134.970703125,
        "pssRenderer": 108.9970703125,
        "control": {
          "emitP50": 5.599999999976717,
          "emitP95": 10.700000000011642,
          "domP50": 6.2000000000116415,
          "domP95": 11.300000000046566
        },
        "fCommitP50": 2.7999999999883585,
        "fCommitP95": 12.099999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.5,
        "emitP95": 18.79999999998836,
        "domP50": 9.200000000011642,
        "domP95": 19
      },
      "edit_d4": {
        "emitP50": 7,
        "emitP95": 14.400000000023283,
        "domP50": 7.5,
        "domP95": 14.800000000046566
      },
      "edit_d10": {
        "emitP50": 7.5,
        "emitP95": 14.200000000011642,
        "domP50": 8.099999999976717,
        "domP95": 14.800000000046566
      },
      "loadCycle": {
        "emitP50": 12.299999999988358,
        "emitP95": 55.5,
        "domP50": 12.5,
        "domP95": 56.20000000001164
      },
      "step": {
        "emitP50": 7.100000000034925,
        "emitP95": 19.599999999976717,
        "domP50": 7.400000000023283,
        "domP95": 20
      },
      "reset": {
        "emitP50": 24,
        "emitP95": 43.09999999997672,
        "domP50": 24.099999999976717,
        "domP95": 43.09999999997672
      },
      "append100": {
        "emitP50": 15.599999999976717,
        "emitP95": 56.40000000002328,
        "domP50": 16.599999999976717,
        "domP95": 56.70000000001164
      },
      "control": {
        "emitP50": 5.400000000023283,
        "emitP95": 10.800000000046566,
        "domP50": 5.7999999999883585,
        "domP95": 13.5
      },
      "heapMb": 5.467487335205078,
      "heapCode": 3.1535263061523438,
      "heapData": 1.8665084838867188,
      "pssTotalMb": 237.2353515625,
      "pssApp": 132.35546875,
      "pssRenderer": 104.8798828125,
      "relaunchReadyMs": 795.2000000000116,
      "relaunchHeapMb": 4.323158264160156,
      "relaunchHeapCode": 2.1221694946289062,
      "relaunchHeapData": 1.8253288269042969
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.900000000023283,
          "emitP95": 18,
          "domP50": 8.700000000011642,
          "domP95": 18.70000000001164
        },
        "setKeys": {
          "emitP50": 8.299999999988358,
          "emitP95": 16.29999999998836,
          "domP50": 8.799999999988358,
          "domP95": 16.70000000001164
        },
        "replace": {
          "emitP50": 6.5,
          "emitP95": 18,
          "domP50": 7,
          "domP95": 18.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.099999999976717,
          "lagP95": 29,
          "endLag": 6.2000000000116415,
          "maxBacklog": 3
        },
        "heapMb": 5.046504974365234,
        "heapCode": 2.99237060546875,
        "heapData": 1.6144180297851562,
        "pssTotalMb": 233.490234375,
        "pssApp": 130.66015625,
        "pssRenderer": 102.830078125,
        "control": {
          "emitP50": 5.2999999999883585,
          "emitP95": 15.199999999953434,
          "domP50": 5.7999999999883585,
          "domP95": 15.399999999965075
        },
        "fCommitP50": 3.1000000000349246,
        "fCommitP95": 5.400000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 7.7000000000116415,
          "emitP95": 24.29999999998836,
          "domP50": 8.200000000011642,
          "domP95": 24.599999999976717
        },
        "setKeys": {
          "emitP50": 8.199999999953434,
          "emitP95": 19.20000000001164,
          "domP50": 8.699999999953434,
          "domP95": 19.70000000001164
        },
        "replace": {
          "emitP50": 8.099999999976717,
          "emitP95": 16.400000000023283,
          "domP50": 9.399999999965075,
          "domP95": 17.29999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.599999999976717,
          "lagP95": 15.299999999988358,
          "endLag": 12,
          "maxBacklog": 2
        },
        "heapMb": 5.5374908447265625,
        "heapCode": 3.0143203735351562,
        "heapData": 2.067157745361328,
        "pssTotalMb": 235.65234375,
        "pssApp": 132.158203125,
        "pssRenderer": 103.494140625,
        "control": {
          "emitP50": 6.899999999965075,
          "emitP95": 14.899999999965075,
          "domP50": 7.599999999976717,
          "domP95": 15.199999999953434
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 9.099999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 9.700000000011642,
          "emitP95": 17.199999999953434,
          "domP50": 10.799999999988358,
          "domP95": 19.099999999976717
        },
        "setKeys": {
          "emitP50": 10.199999999953434,
          "emitP95": 23,
          "domP50": 10.799999999988358,
          "domP95": 23.29999999998836
        },
        "replace": {
          "emitP50": 12.299999999988358,
          "emitP95": 19.400000000023283,
          "domP50": 12.699999999953434,
          "domP95": 19.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.900000000023283,
          "lagP95": 19.29999999998836,
          "endLag": 7.7000000000116415,
          "maxBacklog": 2
        },
        "heapMb": 9.911529541015625,
        "heapCode": 3.0551986694335938,
        "heapData": 6.259037017822266,
        "pssTotalMb": 242.689453125,
        "pssApp": 133.6884765625,
        "pssRenderer": 109.0009765625,
        "control": {
          "emitP50": 5.800000000046566,
          "emitP95": 15.099999999976717,
          "domP50": 6.100000000034925,
          "domP95": 15.599999999976717
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 10.5
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.099999999976717,
        "emitP95": 20.5,
        "domP50": 9,
        "domP95": 23.899999999906868
      },
      "edit_d4": {
        "emitP50": 7.300000000046566,
        "emitP95": 22.900000000023283,
        "domP50": 7.700000000069849,
        "domP95": 23.300000000046566
      },
      "edit_d10": {
        "emitP50": 8.699999999953434,
        "emitP95": 23.800000000046566,
        "domP50": 9.5,
        "domP95": 24.100000000093132
      },
      "loadCycle": {
        "emitP50": 18.599999999976717,
        "emitP95": 61,
        "domP50": 18.800000000046566,
        "domP95": 61.40000000002328
      },
      "step": {
        "emitP50": 6.800000000046566,
        "emitP95": 17.800000000046566,
        "domP50": 7.400000000023283,
        "domP95": 18.400000000023283
      },
      "reset": {
        "emitP50": 25.399999999906868,
        "emitP95": 40.300000000046566,
        "domP50": 25.79999999993015,
        "domP95": 40.300000000046566
      },
      "append100": {
        "emitP50": 14.099999999976717,
        "emitP95": 58.29999999993015,
        "domP50": 15.099999999976717,
        "domP95": 58.699999999953434
      },
      "control": {
        "emitP50": 6.5,
        "emitP95": 11.79999999993015,
        "domP50": 6.800000000046566,
        "domP95": 12.099999999976717
      },
      "heapMb": 5.479595184326172,
      "heapCode": 3.1578330993652344,
      "heapData": 1.8738059997558594,
      "pssTotalMb": 240.216796875,
      "pssApp": 135.0791015625,
      "pssRenderer": 105.1376953125,
      "relaunchReadyMs": 783.7000000000698,
      "relaunchHeapMb": 4.323356628417969,
      "relaunchHeapCode": 2.122161865234375,
      "relaunchHeapData": 1.8254280090332031
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.1999999999534339,
          "domP50": 1.1999999999534339,
          "domP95": 9.29999999993015
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.099999999976717,
          "domP50": 1,
          "domP95": 7.599999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 3.700000000069849,
          "domP50": 0.9000000000232831,
          "domP95": 10.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.6999999999534339,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.7243080139160156,
        "heapCode": 1.8446006774902344,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 222.1669921875,
        "pssApp": 124.7333984375,
        "pssRenderer": 97.43359375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1,
          "domP50": 1.7000000000698492,
          "domP95": 6.800000000046566
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.099999999976717,
          "domP50": 4.599999999976717,
          "domP95": 8
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.400000000023283,
          "domP50": 1,
          "domP95": 6.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.5999999999767169,
          "endLag": 1.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 4.133678436279297,
        "heapCode": 1.8507232666015625,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 225.69140625,
        "pssApp": 125.6337890625,
        "pssRenderer": 100.0576171875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1999999999534339,
          "emitP95": 1.900000000023283,
          "domP50": 6.599999999976717,
          "domP95": 8.400000000023283
        },
        "setKeys": {
          "emitP50": 1.8000000000465661,
          "emitP95": 19.5,
          "domP50": 2.599999999976717,
          "domP95": 26.29999999993015
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.099999999976717,
          "domP50": 1.900000000023283,
          "domP95": 13.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.10024642944336,
        "heapCode": 1.8488807678222656,
        "heapData": 5.725063323974609,
        "pssTotalMb": 229.708984375,
        "pssApp": 123.8935546875,
        "pssRenderer": 105.8154296875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.9000000000232831,
        "domP50": 5.599999999976717,
        "domP95": 6.699999999953434
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.8000000000465661,
        "domP50": 1.5,
        "domP95": 8.79999999993015
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 2,
        "domP95": 8.800000000046566
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 34.699999999953434,
        "domP50": 0.7000000000698492,
        "domP95": 35
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.7999999999301508,
        "domP50": 4.699999999953434,
        "domP95": 7.700000000069849
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 1.2999999999301508,
        "domP50": 0.2999999999301508,
        "domP95": 1.5
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 6.800000000046566,
        "domP50": 0.9000000000232831,
        "domP95": 7.400000000023283
      },
      "heapMb": 3.776947021484375,
      "heapCode": 1.7703742980957031,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 222.1025390625,
      "pssApp": 125.138671875,
      "pssRenderer": 96.9638671875,
      "relaunchReadyMs": 1231.6000000000931,
      "relaunchHeapMb": 3.352039337158203,
      "relaunchHeapCode": 1.5400199890136719,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.1000000000931323,
          "domP50": 4.900000000023283,
          "domP95": 10.5
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.9000000000232831,
          "domP50": 3.5,
          "domP95": 10.599999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6999999999534339,
          "domP50": 1,
          "domP95": 9.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.9000000000232831,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.7241363525390625,
        "heapCode": 1.8444099426269531,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 220.82421875,
        "pssApp": 124.7958984375,
        "pssRenderer": 96.0283203125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 2.5,
          "domP50": 3,
          "domP95": 13
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 0.8000000000465661,
          "domP50": 1,
          "domP95": 5.800000000046566
        },
        "replace": {
          "emitP50": 0.5,
          "emitP95": 4.699999999953434,
          "domP50": 1.099999999976717,
          "domP95": 6.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.9747161865234375,
        "heapCode": 1.696563720703125,
        "heapData": 1.8917236328125,
        "pssTotalMb": 223.689453125,
        "pssApp": 124.408203125,
        "pssRenderer": 99.28125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.5,
          "emitP95": 3.5,
          "domP50": 3.200000000069849,
          "domP95": 8.70000000006985
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 10.199999999953434,
          "domP50": 2.900000000023283,
          "domP95": 13.5
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 2.800000000046566,
          "domP50": 1.900000000023283,
          "domP95": 8.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.199999999953434,
          "endLag": 1.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 8.099151611328125,
        "heapCode": 1.847686767578125,
        "heapData": 5.725063323974609,
        "pssTotalMb": 235.2607421875,
        "pssApp": 128.7900390625,
        "pssRenderer": 106.470703125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.7000000000698492,
        "domP50": 5.699999999953434,
        "domP95": 6.5
      },
      "edit_d4": {
        "emitP50": 0.39999999990686774,
        "emitP95": 1,
        "domP50": 4.099999999976717,
        "domP95": 8.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 1.3999999999068677,
        "domP95": 7.899999999906868
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 33.5,
        "domP50": 0.5999999999767169,
        "domP95": 34.09999999997672
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.8999999999068677,
        "domP50": 2.199999999953434,
        "domP95": 9.699999999953434
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.30000000004656613,
        "domP50": 0.2000000000698492,
        "domP95": 2.5
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 4.899999999906868,
        "domP50": 0.8000000000465661,
        "domP95": 5.699999999953434
      },
      "heapMb": 3.7773971557617188,
      "heapCode": 1.7703666687011719,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 225.8583984375,
      "pssApp": 127.6943359375,
      "pssRenderer": 98.1640625,
      "relaunchReadyMs": 1320.6999999999534,
      "relaunchHeapMb": 3.352153778076172,
      "relaunchHeapCode": 1.5401344299316406,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.5,
          "emitP95": 20.900000000023283,
          "domP50": 9.099999999976717,
          "domP95": 21.20000000006985
        },
        "setKeys": {
          "emitP50": 9,
          "emitP95": 20.399999999906868,
          "domP50": 9.899999999906868,
          "domP95": 20.79999999993015
        },
        "replace": {
          "emitP50": 6.900000000023283,
          "emitP95": 16.300000000046566,
          "domP50": 7.5,
          "domP95": 16.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.800000000046566,
          "lagP95": 11.70000000006985,
          "endLag": 6.799999999930151,
          "maxBacklog": 2
        },
        "heapMb": 5.036777496337891,
        "heapCode": 2.983196258544922,
        "heapData": 1.6144447326660156,
        "pssTotalMb": 237.6689453125,
        "pssApp": 133.2255859375,
        "pssRenderer": 104.443359375,
        "control": {
          "emitP50": 6.300000000046566,
          "emitP95": 16.699999999953434,
          "domP50": 6.600000000093132,
          "domP95": 16.900000000023283
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 7.099999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 8.199999999953434,
          "emitP95": 26.199999999953434,
          "domP50": 8.70000000006985,
          "domP95": 27.099999999976717
        },
        "setKeys": {
          "emitP50": 9.5,
          "emitP95": 18.300000000046566,
          "domP50": 10.100000000093132,
          "domP95": 18.599999999976717
        },
        "replace": {
          "emitP50": 9.900000000023283,
          "emitP95": 27.400000000023283,
          "domP50": 10.599999999976717,
          "domP95": 27.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.199999999953434,
          "lagP95": 23.099999999976717,
          "endLag": 6.5,
          "maxBacklog": 2
        },
        "heapMb": 5.527915954589844,
        "heapCode": 3.0050811767578125,
        "heapData": 2.067638397216797,
        "pssTotalMb": 238.3017578125,
        "pssApp": 133.609375,
        "pssRenderer": 104.6923828125,
        "control": {
          "emitP50": 6.900000000023283,
          "emitP95": 17.599999999976717,
          "domP50": 7.199999999953434,
          "domP95": 17.800000000046566
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 5.300000000046566
      },
      "5000": {
        "setKey": {
          "emitP50": 10.100000000093132,
          "emitP95": 19.79999999993015,
          "domP50": 10.5,
          "domP95": 22.099999999976717
        },
        "setKeys": {
          "emitP50": 8.800000000046566,
          "emitP95": 29.400000000023283,
          "domP50": 9.300000000046566,
          "domP95": 29.800000000046566
        },
        "replace": {
          "emitP50": 11.900000000023283,
          "emitP95": 27.099999999976717,
          "domP50": 12.400000000023283,
          "domP95": 27.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.099999999976717,
          "lagP95": 11.800000000046566,
          "endLag": 8.600000000093132,
          "maxBacklog": 2
        },
        "heapMb": 9.914485931396484,
        "heapCode": 3.0573387145996094,
        "heapData": 6.260169982910156,
        "pssTotalMb": 252.6220703125,
        "pssApp": 142.4541015625,
        "pssRenderer": 110.16796875,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 13.600000000093132,
          "domP50": 6.700000000069849,
          "domP95": 14
        },
        "fCommitP50": 3.299999999930151,
        "fCommitP95": 7.399999999906868
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.20000000006985,
        "emitP95": 22.20000000006985,
        "domP50": 9.399999999906868,
        "domP95": 22.599999999976717
      },
      "edit_d4": {
        "emitP50": 9.20000000006985,
        "emitP95": 19.599999999976717,
        "domP50": 9.600000000093132,
        "domP95": 19.899999999906868
      },
      "edit_d10": {
        "emitP50": 8,
        "emitP95": 20.199999999953434,
        "domP50": 8.29999999993015,
        "domP95": 20.400000000023283
      },
      "loadCycle": {
        "emitP50": 16.5,
        "emitP95": 58.800000000046566,
        "domP50": 16.599999999976717,
        "domP95": 59.199999999953434
      },
      "step": {
        "emitP50": 7.899999999906868,
        "emitP95": 21.599999999976717,
        "domP50": 8.29999999993015,
        "domP95": 22
      },
      "reset": {
        "emitP50": 28.400000000023283,
        "emitP95": 40,
        "domP50": 28.400000000023283,
        "domP95": 40
      },
      "append100": {
        "emitP50": 16.29999999993015,
        "emitP95": 76.40000000002328,
        "domP50": 16.699999999953434,
        "domP95": 76.70000000006985
      },
      "control": {
        "emitP50": 6.599999999976717,
        "emitP95": 18.5,
        "domP50": 6.800000000046566,
        "domP95": 19.199999999953434
      },
      "heapMb": 5.478965759277344,
      "heapCode": 3.158557891845703,
      "heapData": 1.8727684020996094,
      "pssTotalMb": 241.5146484375,
      "pssApp": 135.2470703125,
      "pssRenderer": 106.267578125,
      "relaunchReadyMs": 1528.5999999999767,
      "relaunchHeapMb": 4.411979675292969,
      "relaunchHeapCode": 2.2102584838867188,
      "relaunchHeapData": 1.8259315490722656
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.400000000023283,
          "emitP95": 21.400000000023283,
          "domP50": 9.699999999953434,
          "domP95": 22
        },
        "setKeys": {
          "emitP50": 7.699999999953434,
          "emitP95": 22.300000000046566,
          "domP50": 8.400000000023283,
          "domP95": 22.70000000006985
        },
        "replace": {
          "emitP50": 7.100000000093132,
          "emitP95": 21.400000000023283,
          "domP50": 7.600000000093132,
          "domP95": 21.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 16.800000000046566,
          "endLag": 8.699999999953434,
          "maxBacklog": 3
        },
        "heapMb": 5.040233612060547,
        "heapCode": 2.985950469970703,
        "heapData": 1.61444091796875,
        "pssTotalMb": 238.619140625,
        "pssApp": 134.611328125,
        "pssRenderer": 104.0078125,
        "control": {
          "emitP50": 5.400000000023283,
          "emitP95": 16.199999999953434,
          "domP50": 5.699999999953434,
          "domP95": 16.5
        },
        "fCommitP50": 2.900000000023283,
        "fCommitP95": 10.599999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 8.300000000046566,
          "emitP95": 27.400000000023283,
          "domP50": 8.900000000023283,
          "domP95": 28.199999999953434
        },
        "setKeys": {
          "emitP50": 8.099999999976717,
          "emitP95": 17.300000000046566,
          "domP50": 8.79999999993015,
          "domP95": 20.600000000093132
        },
        "replace": {
          "emitP50": 8.400000000023283,
          "emitP95": 19.79999999993015,
          "domP50": 9,
          "domP95": 20.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 14.79999999993015,
          "endLag": 6.299999999930151,
          "maxBacklog": 2
        },
        "heapMb": 5.528156280517578,
        "heapCode": 3.0052108764648438,
        "heapData": 2.0673980712890625,
        "pssTotalMb": 240.1142578125,
        "pssApp": 135.193359375,
        "pssRenderer": 104.9208984375,
        "control": {
          "emitP50": 6.599999999976717,
          "emitP95": 16.199999999953434,
          "domP50": 7,
          "domP95": 17
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 14.900000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 10.599999999976717,
          "emitP95": 27.400000000023283,
          "domP50": 11.400000000023283,
          "domP95": 28
        },
        "setKeys": {
          "emitP50": 9.400000000023283,
          "emitP95": 19.899999999906868,
          "domP50": 9.800000000046566,
          "domP95": 20.29999999993015
        },
        "replace": {
          "emitP50": 13.20000000006985,
          "emitP95": 19.099999999976717,
          "domP50": 13.599999999976717,
          "domP95": 19.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 17.900000000023283,
          "endLag": 6.699999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.917762756347656,
        "heapCode": 3.0610733032226562,
        "heapData": 6.259159088134766,
        "pssTotalMb": 246.65234375,
        "pssApp": 136.2099609375,
        "pssRenderer": 110.4423828125,
        "control": {
          "emitP50": 5.5,
          "emitP95": 16.300000000046566,
          "domP50": 6.399999999906868,
          "domP95": 16.600000000093132
        },
        "fCommitP50": 3,
        "fCommitP95": 5.699999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 10.599999999976717,
        "emitP95": 19.400000000023283,
        "domP50": 10.900000000023283,
        "domP95": 20
      },
      "edit_d4": {
        "emitP50": 7.599999999976717,
        "emitP95": 15.900000000023283,
        "domP50": 8.199999999953434,
        "domP95": 16.5
      },
      "edit_d10": {
        "emitP50": 7.300000000046566,
        "emitP95": 15.400000000023283,
        "domP50": 8,
        "domP95": 19.20000000006985
      },
      "loadCycle": {
        "emitP50": 12.599999999976717,
        "emitP95": 51.699999999953434,
        "domP50": 12.800000000046566,
        "domP95": 52.29999999993015
      },
      "step": {
        "emitP50": 7.200000000069849,
        "emitP95": 21.599999999976717,
        "domP50": 7.5,
        "domP95": 26.099999999976717
      },
      "reset": {
        "emitP50": 28,
        "emitP95": 38.79999999993015,
        "domP50": 28,
        "domP95": 38.79999999993015
      },
      "append100": {
        "emitP50": 14.099999999976717,
        "emitP95": 53.09999999997672,
        "domP50": 14.800000000046566,
        "domP95": 53.29999999993015
      },
      "control": {
        "emitP50": 5.800000000046566,
        "emitP95": 13.400000000023283,
        "domP50": 6.299999999930151,
        "domP95": 13.79999999993015
      },
      "heapMb": 5.470851898193359,
      "heapCode": 3.156360626220703,
      "heapData": 1.8665084838867188,
      "pssTotalMb": 240.8876953125,
      "pssApp": 134.7666015625,
      "pssRenderer": 106.12109375,
      "relaunchReadyMs": 364.69999999995343,
      "relaunchHeapMb": 4.51641845703125,
      "relaunchHeapCode": 2.3088645935058594,
      "relaunchHeapData": 1.8294219970703125
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
          "domP50": 1.5,
          "domP95": 9.699999999953434
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2,
          "domP50": 4.5,
          "domP95": 11
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7999999999301508,
          "domP50": 1,
          "domP95": 6.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.2999999999301508,
          "lagP95": 0.7999999999301508,
          "endLag": 0.5999999999767169,
          "maxBacklog": 0
        },
        "heapMb": 3.5639495849609375,
        "heapCode": 1.6890029907226562,
        "heapData": 1.5024337768554688,
        "pssTotalMb": 224.3505859375,
        "pssApp": 127.3984375,
        "pssRenderer": 96.9521484375
      },
      "500": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7000000000698492,
          "domP50": 5.699999999953434,
          "domP95": 6.700000000069849
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.800000000046566,
          "domP50": 5.099999999976717,
          "domP95": 8.5
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 2.199999999953434,
          "domP50": 1.599999999976717,
          "domP95": 6.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8000000000465661,
          "endLag": 0.6999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 4.134990692138672,
        "heapCode": 1.8519935607910156,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 231.2626953125,
        "pssApp": 129.2734375,
        "pssRenderer": 101.9892578125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1999999999534339,
          "emitP95": 2,
          "domP50": 6.5,
          "domP95": 7.899999999906868
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 8,
          "domP50": 3.599999999976717,
          "domP95": 9
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 4.400000000023283,
          "domP50": 2,
          "domP95": 6.600000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 2,
          "endLag": 1.599999999976717,
          "maxBacklog": 0
        },
        "heapMb": 7.939052581787109,
        "heapCode": 1.6922111511230469,
        "heapData": 5.722118377685547,
        "pssTotalMb": 231.21875,
        "pssApp": 125.8330078125,
        "pssRenderer": 105.3857421875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1999999999534339,
        "domP50": 2.5,
        "domP95": 8
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 1,
        "domP95": 7.200000000069849
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.599999999976717,
        "domP50": 1.2000000000698492,
        "domP95": 5.799999999930151
      },
      "loadCycle": {
        "emitP50": 2.699999999953434,
        "emitP95": 33.09999999997672,
        "domP50": 4.299999999930151,
        "domP95": 33.59999999997672
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6000000000931323,
        "domP50": 1,
        "domP95": 9.300000000046566
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5,
        "domP50": 0.2000000000698492,
        "domP95": 0.8999999999068677
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.2000000000698492,
        "domP50": 1,
        "domP95": 5.600000000093132
      },
      "heapMb": 3.936412811279297,
      "heapCode": 1.9246749877929688,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 229.1650390625,
      "pssApp": 129.64453125,
      "pssRenderer": 99.5205078125,
      "relaunchReadyMs": 593.5999999999767,
      "relaunchHeapMb": 3.352123260498047,
      "relaunchHeapCode": 1.5401039123535156,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.2999999999301508,
          "emitP95": 1.6999999999534339,
          "domP50": 5.5,
          "domP95": 6.699999999953434
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.7000000000698492,
          "domP50": 2.300000000046566,
          "domP95": 8.5
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7999999999301508,
          "domP50": 1.3000000000465661,
          "domP95": 14.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.722393035888672,
        "heapCode": 1.8427391052246094,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 227.166015625,
        "pssApp": 128.890625,
        "pssRenderer": 98.275390625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 2,
          "domP50": 2.800000000046566,
          "domP95": 9.599999999976717
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 3,
          "domP50": 1.5,
          "domP95": 7.900000000023283
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1,
          "domP50": 0.7999999999301508,
          "domP95": 5.100000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.5,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.132747650146484,
        "heapCode": 1.849761962890625,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 231.1640625,
        "pssApp": 129.2294921875,
        "pssRenderer": 101.9345703125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.7000000000698492,
          "domP50": 6.5,
          "domP95": 7.900000000023283
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 8.20000000006985,
          "domP50": 2.800000000046566,
          "domP95": 12.29999999993015
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.2000000000698492,
          "domP50": 2.200000000069849,
          "domP95": 11.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2000000000698492,
          "lagP95": 1.7000000000698492,
          "endLag": 1.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 8.097827911376953,
        "heapCode": 1.8463172912597656,
        "heapData": 5.725063323974609,
        "pssTotalMb": 234.595703125,
        "pssApp": 128.91796875,
        "pssRenderer": 105.677734375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.39999999990686774,
        "emitP95": 1.400000000023283,
        "domP50": 6,
        "domP95": 7.400000000023283
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7999999999301508,
        "domP50": 5.799999999930151,
        "domP95": 12.599999999976717
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1.3000000000465661,
        "domP95": 8.5
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 38.199999999953434,
        "domP50": 0.5999999999767169,
        "domP95": 38.5
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 3.099999999976717,
        "domP50": 1.400000000023283,
        "domP95": 9.20000000006985
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 5.799999999930151,
        "domP50": 0.2999999999301508,
        "domP95": 5.899999999906868
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.5,
        "domP50": 0.7999999999301508,
        "domP95": 4.799999999930151
      },
      "heapMb": 3.936199188232422,
      "heapCode": 1.9244613647460938,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 228.9404296875,
      "pssApp": 129.5849609375,
      "pssRenderer": 99.35546875,
      "relaunchReadyMs": 605,
      "relaunchHeapMb": 3.3520774841308594,
      "relaunchHeapCode": 1.5400199890136719,
      "relaunchHeapData": 1.4463920593261719
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8,
          "emitP95": 21.599999999976717,
          "domP50": 8.599999999976717,
          "domP95": 21.899999999906868
        },
        "setKeys": {
          "emitP50": 8.20000000006985,
          "emitP95": 16.800000000046566,
          "domP50": 8.600000000093132,
          "domP95": 17.800000000046566
        },
        "replace": {
          "emitP50": 7.300000000046566,
          "emitP95": 21.79999999993015,
          "domP50": 8.100000000093132,
          "domP95": 22.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.799999999930151,
          "lagP95": 14.100000000093132,
          "endLag": 8.099999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.038459777832031,
        "heapCode": 2.9844703674316406,
        "heapData": 1.6144371032714844,
        "pssTotalMb": 237.099609375,
        "pssApp": 133.1796875,
        "pssRenderer": 103.919921875,
        "control": {
          "emitP50": 5.899999999906868,
          "emitP95": 20.5,
          "domP50": 6.199999999953434,
          "domP95": 20.79999999993015
        },
        "fCommitP50": 3,
        "fCommitP95": 11.699999999953434
      },
      "500": {
        "setKey": {
          "emitP50": 7.699999999953434,
          "emitP95": 19.900000000023283,
          "domP50": 8.300000000046566,
          "domP95": 20.70000000006985
        },
        "setKeys": {
          "emitP50": 8.900000000023283,
          "emitP95": 19.400000000023283,
          "domP50": 9.400000000023283,
          "domP95": 22.800000000046566
        },
        "replace": {
          "emitP50": 7.800000000046566,
          "emitP95": 18.400000000023283,
          "domP50": 8.5,
          "domP95": 18.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.800000000046566,
          "lagP95": 17.199999999953434,
          "endLag": 7,
          "maxBacklog": 2
        },
        "heapMb": 5.527362823486328,
        "heapCode": 3.0047988891601562,
        "heapData": 2.067157745361328,
        "pssTotalMb": 238.58203125,
        "pssApp": 133.9326171875,
        "pssRenderer": 104.6494140625,
        "control": {
          "emitP50": 5.599999999976717,
          "emitP95": 13.79999999993015,
          "domP50": 5.899999999906868,
          "domP95": 13.899999999906868
        },
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 8
      },
      "5000": {
        "setKey": {
          "emitP50": 10.599999999976717,
          "emitP95": 27,
          "domP50": 11.20000000006985,
          "domP95": 27.300000000046566
        },
        "setKeys": {
          "emitP50": 9.099999999976717,
          "emitP95": 24.20000000006985,
          "domP50": 9.699999999953434,
          "domP95": 24.70000000006985
        },
        "replace": {
          "emitP50": 13.79999999993015,
          "emitP95": 19.800000000046566,
          "domP50": 15.300000000046566,
          "domP95": 20.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.20000000006985,
          "lagP95": 16,
          "endLag": 9.20000000006985,
          "maxBacklog": 2
        },
        "heapMb": 9.915843963623047,
        "heapCode": 3.058929443359375,
        "heapData": 6.259063720703125,
        "pssTotalMb": 247.7333984375,
        "pssApp": 137.3486328125,
        "pssRenderer": 110.384765625,
        "control": {
          "emitP50": 5.800000000046566,
          "emitP95": 15.600000000093132,
          "domP50": 6.200000000069849,
          "domP95": 16
        },
        "fCommitP50": 3.299999999930151,
        "fCommitP95": 12.900000000023283
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8,
        "emitP95": 20.699999999953434,
        "domP50": 8.599999999976717,
        "domP95": 23.099999999976717
      },
      "edit_d4": {
        "emitP50": 7.400000000023283,
        "emitP95": 13.800000000046566,
        "domP50": 7.800000000046566,
        "domP95": 14.20000000006985
      },
      "edit_d10": {
        "emitP50": 7.799999999930151,
        "emitP95": 17,
        "domP50": 8.300000000046566,
        "domP95": 17.400000000023283
      },
      "loadCycle": {
        "emitP50": 13.099999999976717,
        "emitP95": 56.800000000046566,
        "domP50": 13.199999999953434,
        "domP95": 57.20000000006985
      },
      "step": {
        "emitP50": 6.900000000023283,
        "emitP95": 16.699999999953434,
        "domP50": 7.400000000023283,
        "domP95": 18.399999999906868
      },
      "reset": {
        "emitP50": 26.400000000023283,
        "emitP95": 51.20000000006985,
        "domP50": 26.400000000023283,
        "domP95": 51.20000000006985
      },
      "append100": {
        "emitP50": 15.900000000023283,
        "emitP95": 56.39999999990687,
        "domP50": 16.199999999953434,
        "domP95": 56.79999999993015
      },
      "control": {
        "emitP50": 6.099999999976717,
        "emitP95": 18.29999999993015,
        "domP50": 6.300000000046566,
        "domP95": 18.899999999906868
      },
      "heapMb": 5.478767395019531,
      "heapCode": 3.1560134887695312,
      "heapData": 1.8750877380371094,
      "pssTotalMb": 241.25390625,
      "pssApp": 135.052734375,
      "pssRenderer": 106.201171875,
      "relaunchReadyMs": 833.7000000000698,
      "relaunchHeapMb": 4.718101501464844,
      "relaunchHeapCode": 2.0936012268066406,
      "relaunchHeapData": 1.8232765197753906
    }
  }
]
```
</details>
