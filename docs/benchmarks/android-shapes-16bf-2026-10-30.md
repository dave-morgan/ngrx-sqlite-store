# Phase 16 shapes — flat objects & hybrid workflow (2026-10-30)

Measured alone on `emulator-5556` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.66 ms, p95 8.54 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 52 / CODE-BOUND 0 / FAIL 33

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.36 ± 0.05 | 8.86 ± 0.47 | 24.6× | FAIL | allow 7.0 (control emitP50 6.5×1) |
| flat | 50.setKey.emitP95 | 1.06 ± 0.56 | 20.28 ± 1.57 | 19.1× | PLATFORM-BOUND | allow 23.0 (control emitP95 20.8×1) |
| flat | 50.setKey.domP50 | 4.72 ± 1.75 | 9.88 ± 0.80 | 2.1× | PLATFORM-BOUND | allow 9.3 (control domP50 6.7×1) |
| flat | 50.setKey.domP95 | 8.56 ± 1.84 | 21.04 ± 1.60 | 2.5× | PLATFORM-BOUND | allow 24.8 (control domP95 21.3×1) |
| flat | 50.setKeys.emitP50 | 0.36 ± 0.05 | 9.62 ± 1.90 | 26.7× | FAIL | allow 8.4 (control emitP50 6.5×1) |
| flat | 50.setKeys.emitP95 | 1.86 ± 0.97 | 21.18 ± 3.81 | 11.4× | PLATFORM-BOUND | allow 25.6 (control emitP95 20.8×1) |
| flat | 50.setKeys.domP50 | 2.94 ± 2.28 | 10.12 ± 1.85 | 3.4× | PLATFORM-BOUND | allow 10.9 (control domP50 6.7×1) |
| flat | 50.setKeys.domP95 | 6.94 ± 1.20 | 21.74 ± 3.51 | 3.1× | PLATFORM-BOUND | allow 26.0 (control domP95 21.3×1) |
| flat | 50.replace.emitP50 | 0.38 ± 0.04 | 7.92 ± 0.46 | 20.8× | FAIL | allow 7.0 (control emitP50 6.5×1) |
| flat | 50.replace.emitP95 | 2.10 ± 2.54 | 23.24 ± 3.66 | 11.1× | PLATFORM-BOUND | allow 27.0 (control emitP95 20.8×1) |
| flat | 50.replace.domP50 | 4.40 ± 1.94 | 8.40 ± 0.44 | 1.9× | PLATFORM-BOUND | allow 9.1 (control domP50 6.7×1) |
| flat | 50.replace.domP95 | 9.54 ± 2.04 | 23.80 ± 3.55 | 2.5× | PLATFORM-BOUND | allow 26.9 (control domP95 21.3×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 7.00 ± 0.72 | 23.3× | PLATFORM-BOUND | allow 7.2 (control emitP50 6.5×1) |
| flat | 50.burst.lagP95 | 0.82 ± 0.50 | 17.86 ± 2.39 | 21.8× | PLATFORM-BOUND | allow 23.7 (control emitP95 20.8×1) |
| flat | 50.burst.endLag | 0.30 ± 0.07 | 8.92 ± 1.37 | 29.7× | FAIL | allow 7.9 (control emitP50 6.5×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.20 ± 0.45 | 2200000000.0× | FAIL |  |
| flat | 50.heapMb | 3.72 ± 0.00 | 5.09 ± 0.01 | 1.4× | FAIL | code +1.19 MB; data 1.51 -> 1.62 MB |
| flat | 50.pssTotalMb | 224.38 ± 1.95 | 233.81 ± 2.33 | 1.0× | FAIL | allow 5.7 (plugin baseline 1.4 MB) |
| flat | 500.setKey.emitP50 | 0.48 ± 0.08 | 9.36 ± 0.90 | 19.5× | FAIL | allow 7.5 (control emitP50 6.5×1) |
| flat | 500.setKey.emitP95 | 1.98 ± 1.43 | 24.94 ± 7.26 | 12.6× | PLATFORM-BOUND | allow 27.8 (control emitP95 19.1×1) |
| flat | 500.setKey.domP50 | 4.38 ± 1.70 | 10.00 ± 0.93 | 2.3× | PLATFORM-BOUND | allow 9.5 (control domP50 6.9×1) |
| flat | 500.setKey.domP95 | 10.12 ± 3.09 | 25.68 ± 7.22 | 2.5× | PLATFORM-BOUND | allow 29.8 (control domP95 19.4×1) |
| flat | 500.setKeys.emitP50 | 0.46 ± 0.05 | 9.72 ± 0.29 | 21.1× | FAIL | allow 6.9 (control emitP50 6.5×1) |
| flat | 500.setKeys.emitP95 | 3.54 ± 2.95 | 21.64 ± 3.38 | 6.1× | PLATFORM-BOUND | allow 25.4 (control emitP95 19.1×1) |
| flat | 500.setKeys.domP50 | 3.12 ± 2.22 | 10.28 ± 0.36 | 3.3× | PLATFORM-BOUND | allow 9.5 (control domP50 6.9×1) |
| flat | 500.setKeys.domP95 | 9.78 ± 1.02 | 22.48 ± 3.04 | 2.3× | PLATFORM-BOUND | allow 23.5 (control domP95 19.4×1) |
| flat | 500.replace.emitP50 | 0.40 ± 0.00 | 9.48 ± 0.85 | 23.7× | FAIL | allow 7.4 (control emitP50 6.5×1) |
| flat | 500.replace.emitP95 | 1.78 ± 1.28 | 26.28 ± 8.45 | 14.8× | PLATFORM-BOUND | allow 28.8 (control emitP95 19.1×1) |
| flat | 500.replace.domP50 | 3.60 ± 2.20 | 9.86 ± 0.82 | 2.7× | PLATFORM-BOUND | allow 9.9 (control domP50 6.9×1) |
| flat | 500.replace.domP95 | 12.08 ± 4.14 | 26.68 ± 8.43 | 2.2× | PLATFORM-BOUND | allow 32.0 (control domP95 19.4×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 6.80 ± 0.32 | 17.0× | PLATFORM-BOUND | allow 6.9 (control emitP50 6.5×1) |
| flat | 500.burst.lagP95 | 0.74 ± 0.15 | 16.28 ± 1.49 | 22.0× | PLATFORM-BOUND | allow 20.7 (control emitP95 19.1×1) |
| flat | 500.burst.endLag | 0.46 ± 0.15 | 7.24 ± 1.67 | 15.7× | PLATFORM-BOUND | allow 8.4 (control emitP50 6.5×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.20 ± 0.45 | 2200000000.0× | FAIL |  |
| flat | 500.heapMb | 4.10 ± 0.07 | 5.59 ± 0.00 | 1.4× | FAIL | code +1.24 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 227.27 ± 3.23 | 234.76 ± 1.80 | 1.0× | FAIL | allow 6.4 (plugin baseline 1.4 MB) |
| flat | 5000.setKey.emitP50 | 1.72 ± 0.08 | 10.92 ± 1.12 | 6.3× | FAIL | allow 8.1 (control emitP50 6.9×1) |
| flat | 5000.setKey.emitP95 | 4.96 ± 2.67 | 21.96 ± 3.38 | 4.4× | PLATFORM-BOUND | allow 25.7 (control emitP95 19.7×1) |
| flat | 5000.setKey.domP50 | 3.22 ± 0.19 | 11.74 ± 0.98 | 3.6× | FAIL | allow 8.5 (control domP50 7.3×1) |
| flat | 5000.setKey.domP95 | 9.74 ± 2.73 | 22.74 ± 3.50 | 2.3× | PLATFORM-BOUND | allow 26.3 (control domP95 20.1×1) |
| flat | 5000.setKeys.emitP50 | 1.62 ± 0.08 | 11.38 ± 1.17 | 7.0× | FAIL | allow 8.2 (control emitP50 6.9×1) |
| flat | 5000.setKeys.emitP95 | 5.30 ± 2.39 | 27.40 ± 7.09 | 5.2× | PLATFORM-BOUND | allow 29.2 (control emitP95 19.7×1) |
| flat | 5000.setKeys.domP50 | 3.56 ± 0.92 | 12.18 ± 1.04 | 3.4× | PLATFORM-BOUND | allow 9.3 (control domP50 7.3×1) |
| flat | 5000.setKeys.domP95 | 9.64 ± 1.20 | 28.26 ± 6.98 | 2.9× | PLATFORM-BOUND | allow 28.3 (control domP95 20.1×1) |
| flat | 5000.replace.emitP50 | 0.40 ± 0.00 | 13.94 ± 0.44 | 34.9× | FAIL | allow 7.4 (control emitP50 6.9×1) |
| flat | 5000.replace.emitP95 | 1.78 ± 1.95 | 22.90 ± 2.86 | 12.9× | PLATFORM-BOUND | allow 24.5 (control emitP95 19.7×1) |
| flat | 5000.replace.domP50 | 1.84 ± 0.41 | 15.08 ± 0.65 | 8.2× | FAIL | allow 8.4 (control domP50 7.3×1) |
| flat | 5000.replace.domP95 | 8.20 ± 1.64 | 23.50 ± 2.99 | 2.9× | PLATFORM-BOUND | allow 24.7 (control domP95 20.1×1) |
| flat | 5000.burst.lagP50 | 1.42 ± 0.04 | 8.80 ± 0.80 | 6.2× | PLATFORM-BOUND | allow 7.8 (control emitP50 6.9×1) |
| flat | 5000.burst.lagP95 | 2.08 ± 0.22 | 17.82 ± 3.10 | 8.6× | PLATFORM-BOUND | allow 23.0 (control emitP95 19.7×1) |
| flat | 5000.burst.endLag | 1.56 ± 0.19 | 13.14 ± 10.23 | 8.4× | PLATFORM-BOUND | allow 17.4 (control emitP50 6.9×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.10 ± 0.00 | 9.97 ± 0.01 | 1.2× | FAIL | code +1.26 MB; data 5.73 -> 6.26 MB |
| flat | 5000.pssTotalMb | 232.07 ± 1.90 | 247.97 ± 1.15 | 1.1× | FAIL | allow 4.4 (plugin baseline 1.4 MB) |
| workflow | edit_d1.emitP50 | 0.38 ± 0.08 | 9.64 ± 0.88 | 25.4× | FAIL | allow 8.7 (control emitP50 7.7×1) |
| workflow | edit_d1.emitP95 | 1.44 ± 1.06 | 21.12 ± 2.30 | 14.7× | PLATFORM-BOUND | allow 24.8 (control emitP95 21.5×1) |
| workflow | edit_d1.domP50 | 4.12 ± 2.05 | 10.34 ± 0.72 | 2.5× | PLATFORM-BOUND | allow 10.8 (control domP50 8.0×1) |
| workflow | edit_d1.domP95 | 8.88 ± 3.37 | 22.52 ± 1.83 | 2.5× | PLATFORM-BOUND | allow 28.4 (control domP95 23.2×1) |
| workflow | edit_d4.emitP50 | 0.38 ± 0.04 | 8.50 ± 1.17 | 22.4× | PLATFORM-BOUND | allow 8.9 (control emitP50 7.7×1) |
| workflow | edit_d4.emitP95 | 1.20 ± 0.74 | 26.42 ± 2.91 | 22.0× | FAIL | allow 25.1 (control emitP95 21.5×1) |
| workflow | edit_d4.domP50 | 4.38 ± 1.91 | 9.48 ± 1.29 | 2.2× | PLATFORM-BOUND | allow 11.2 (control domP50 8.0×1) |
| workflow | edit_d4.domP95 | 9.00 ± 1.27 | 26.86 ± 2.86 | 3.0× | PLATFORM-BOUND | allow 27.3 (control domP95 23.2×1) |
| workflow | edit_d10.emitP50 | 0.46 ± 0.05 | 8.52 ± 0.62 | 18.5× | PLATFORM-BOUND | allow 8.4 (control emitP50 7.7×1) |
| workflow | edit_d10.emitP95 | 2.46 ± 2.45 | 23.22 ± 5.58 | 9.4× | PLATFORM-BOUND | allow 29.5 (control emitP95 21.5×1) |
| workflow | edit_d10.domP50 | 2.54 ± 1.83 | 9.14 ± 0.78 | 3.6× | PLATFORM-BOUND | allow 10.6 (control domP50 8.0×1) |
| workflow | edit_d10.domP95 | 8.62 ± 0.79 | 25.14 ± 5.54 | 2.9× | PLATFORM-BOUND | allow 29.5 (control domP95 23.2×1) |
| workflow | loadCycle.emitP50 | 5.72 ± 7.07 | 15.68 ± 2.97 | 2.7× | PLATFORM-BOUND | allow 25.5 (control emitP50 7.7×2) |
| workflow | loadCycle.emitP95 | 35.16 ± 2.96 | 56.74 ± 5.27 | 1.6× | PLATFORM-BOUND | allow 51.2 (control emitP95 21.5×2) |
| workflow | loadCycle.domP50 | 6.98 ± 8.15 | 16.28 ± 3.09 | 2.3× | PLATFORM-BOUND | allow 27.3 (control domP50 8.0×2) |
| workflow | loadCycle.domP95 | 35.58 ± 3.01 | 57.24 ± 5.23 | 1.6× | PLATFORM-BOUND | allow 54.6 (control domP95 23.2×2) |
| workflow | step.emitP50 | 0.34 ± 0.05 | 8.66 ± 1.05 | 25.5× | PLATFORM-BOUND | allow 8.8 (control emitP50 7.7×1) |
| workflow | step.emitP95 | 0.86 ± 0.27 | 27.70 ± 4.83 | 32.2× | FAIL | allow 26.6 (control emitP95 21.5×1) |
| workflow | step.domP50 | 3.36 ± 2.28 | 9.22 ± 1.14 | 2.7× | PLATFORM-BOUND | allow 11.4 (control domP50 8.0×1) |
| workflow | step.domP95 | 9.58 ± 0.62 | 28.12 ± 4.66 | 2.9× | PLATFORM-BOUND | allow 28.4 (control domP95 23.2×1) |
| workflow | reset.emitP50 | 0.24 ± 0.05 | 28.26 ± 2.84 | 117.7× | FAIL | allow 10.6 (control emitP50 7.7×1) |
| workflow | reset.emitP95 | 0.80 ± 0.34 | 61.36 ± 21.93 | 76.7× | FAIL | allow 43.8 (control emitP95 21.5×1) |
| workflow | reset.domP50 | 0.26 ± 0.05 | 28.62 ± 2.91 | 110.1× | FAIL | allow 11.0 (control domP50 8.0×1) |
| workflow | reset.domP95 | 1.48 ± 0.33 | 61.36 ± 21.93 | 41.5× | FAIL | allow 45.4 (control domP95 23.2×1) |
| workflow | append100.emitP50 | 0.40 ± 0.07 | 13.88 ± 0.85 | 34.7× | FAIL | allow 8.6 (control emitP50 7.7×1) |
| workflow | append100.emitP95 | 0.86 ± 0.30 | 24.08 ± 3.45 | 28.0× | PLATFORM-BOUND | allow 25.2 (control emitP95 21.5×1) |
| workflow | append100.domP50 | 0.88 ± 0.04 | 14.30 ± 0.90 | 16.3× | FAIL | allow 9.0 (control domP50 8.0×1) |
| workflow | append100.domP95 | 6.02 ± 4.03 | 25.18 ± 2.85 | 4.2× | PLATFORM-BOUND | allow 30.0 (control domP95 23.2×1) |
| workflow | heapMb | 3.90 ± 0.07 | 5.50 ± 0.01 | 1.4× | FAIL | code +1.28 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 224.70 ± 2.98 | 238.55 ± 2.32 | 1.1× | FAIL | allow 6.7 (plugin baseline 1.4 MB) |
| workflow | relaunchReadyMs | 1173.88 ± 418.97 | 815.46 ± 692.72 | 0.7× | PASS |  |
| workflow | relaunchHeapMb | 3.33 ± 0.04 | 4.47 ± 0.09 | 1.3× | FAIL | code +0.74 MB; data 1.45 -> 1.83 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 6.46 | 6.74 | 21.34 | 8.86 | 9.88 | 21.04 |
| 500 | 6.54 | 6.90 | 19.44 | 9.36 | 10.00 | 25.68 |
| 5000 | 6.94 | 7.32 | 20.10 | 10.92 | 11.74 | 22.74 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 127.5 | 130.8 | 96.9 | 103.0 |
| flat 500 | 126.9 | 131.0 | 100.4 | 103.7 |
| flat 5000 | 126.7 | 138.7 | 105.4 | 109.2 |
| workflow | 126.9 | 133.5 | 97.8 | 105.0 |

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
          "emitP95": 1.099999999976717,
          "domP50": 5.2999999999883585,
          "domP95": 10
        },
        "setKeys": {
          "emitP50": 0.3999999999650754,
          "emitP95": 2.5,
          "domP50": 1.7999999999883585,
          "domP95": 5.900000000023283
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 6.600000000034925,
          "domP50": 5.899999999965075,
          "domP95": 12.799999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.5999999999767169,
          "endLag": 0.29999999998835847,
          "maxBacklog": 0
        },
        "heapMb": 3.72381591796875,
        "heapCode": 1.8440895080566406,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 222.0615234375,
        "pssApp": 126.2998046875,
        "pssRenderer": 95.76171875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 3.2999999999883585,
          "domP50": 4.2999999999883585,
          "domP95": 11.200000000011642
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 7.2999999999883585,
          "domP50": 1.5,
          "domP95": 9.5
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 2,
          "domP50": 5.100000000034925,
          "domP95": 17.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6000000000349246,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.133064270019531,
        "heapCode": 1.84991455078125,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 225.6533203125,
        "pssApp": 126.044921875,
        "pssRenderer": 99.6083984375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6000000000349246,
          "emitP95": 4.300000000046566,
          "domP50": 3.5,
          "domP95": 9.099999999976717
        },
        "setKeys": {
          "emitP50": 1.7000000000116415,
          "emitP95": 8.900000000023283,
          "domP50": 5,
          "domP95": 10.099999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7000000000116415,
          "domP50": 1.400000000023283,
          "domP95": 6.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999650754,
          "lagP95": 2.1000000000349246,
          "endLag": 1.7000000000116415,
          "maxBacklog": 0
        },
        "heapMb": 8.099376678466797,
        "heapCode": 1.8470420837402344,
        "heapData": 5.725639343261719,
        "pssTotalMb": 229.853515625,
        "pssApp": 125.53125,
        "pssRenderer": 104.322265625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 1.2999999999883585,
        "domP95": 6.099999999976717
      },
      "edit_d4": {
        "emitP50": 0.3999999999650754,
        "emitP95": 0.7999999999883585,
        "domP50": 1,
        "domP95": 8.700000000011642
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 6.600000000034925,
        "domP50": 5.599999999976717,
        "domP95": 9.699999999953434
      },
      "loadCycle": {
        "emitP50": 14,
        "emitP95": 34.90000000002328,
        "domP50": 15.599999999976717,
        "domP95": 35.29999999998836
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 1,
        "domP95": 10.200000000011642
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 1.3999999999650754,
        "domP50": 0.29999999998835847,
        "domP95": 2
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 0.7999999999883585,
        "domP95": 1.7000000000116415
      },
      "heapMb": 3.7773971557617188,
      "heapCode": 1.770355224609375,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 220.3505859375,
      "pssApp": 124.3203125,
      "pssRenderer": 96.0302734375,
      "relaunchReadyMs": 1484.5,
      "relaunchHeapMb": 3.2575454711914062,
      "relaunchHeapCode": 1.4546623229980469,
      "relaunchHeapData": 1.44354248046875
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.300000000046566,
          "emitP95": 19.600000000034925,
          "domP50": 8.800000000046566,
          "domP95": 20.100000000034925
        },
        "setKeys": {
          "emitP50": 8.700000000011642,
          "emitP95": 16,
          "domP50": 9.299999999988358,
          "domP95": 17.100000000034925
        },
        "replace": {
          "emitP50": 7.7999999999883585,
          "emitP95": 21.099999999976717,
          "domP50": 8.699999999953434,
          "domP95": 21.899999999965075
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.2999999999883585,
          "lagP95": 18.20000000001164,
          "endLag": 9.600000000034925,
          "maxBacklog": 2
        },
        "heapMb": 5.086639404296875,
        "heapCode": 3.0316429138183594,
        "heapData": 1.6154251098632812,
        "pssTotalMb": 230.669921875,
        "pssApp": 128.9208984375,
        "pssRenderer": 101.7490234375,
        "control": {
          "emitP50": 7.2000000000116415,
          "emitP95": 27,
          "domP50": 7.400000000023283,
          "domP95": 27.79999999998836
        },
        "fCommitP50": 3.2999999999883585,
        "fCommitP95": 8
      },
      "500": {
        "setKey": {
          "emitP50": 8.899999999965075,
          "emitP95": 31.79999999998836,
          "domP50": 9.200000000011642,
          "domP95": 32.59999999997672
        },
        "setKeys": {
          "emitP50": 9.700000000011642,
          "emitP95": 23.400000000023283,
          "domP50": 10.200000000011642,
          "domP95": 24
        },
        "replace": {
          "emitP50": 9.400000000023283,
          "emitP95": 25.599999999976717,
          "domP50": 9.799999999988358,
          "domP95": 25.899999999965075
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.800000000046566,
          "lagP95": 15.699999999953434,
          "endLag": 6.7000000000116415,
          "maxBacklog": 3
        },
        "heapMb": 5.580585479736328,
        "heapCode": 3.0554962158203125,
        "heapData": 2.0689163208007812,
        "pssTotalMb": 233.044921875,
        "pssApp": 130.4013671875,
        "pssRenderer": 102.6435546875,
        "control": {
          "emitP50": 6.199999999953434,
          "emitP95": 19.900000000023283,
          "domP50": 6.5,
          "domP95": 20.100000000034925
        },
        "fCommitP50": 3.2999999999883585,
        "fCommitP95": 9.299999999988358
      },
      "5000": {
        "setKey": {
          "emitP50": 10.600000000034925,
          "emitP95": 22.599999999976717,
          "domP50": 11.200000000011642,
          "domP95": 23
        },
        "setKeys": {
          "emitP50": 9.700000000011642,
          "emitP95": 21.79999999998836,
          "domP50": 10.899999999965075,
          "domP95": 23.5
        },
        "replace": {
          "emitP50": 14.100000000034925,
          "emitP95": 26.400000000023283,
          "domP50": 16.20000000001164,
          "domP95": 27.29999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.299999999988358,
          "lagP95": 16.600000000034925,
          "endLag": 8.5,
          "maxBacklog": 2
        },
        "heapMb": 9.963375091552734,
        "heapCode": 3.105518341064453,
        "heapData": 6.260124206542969,
        "pssTotalMb": 246.6748046875,
        "pssApp": 138.380859375,
        "pssRenderer": 108.2939453125,
        "control": {
          "emitP50": 6.300000000046566,
          "emitP95": 17.099999999976717,
          "domP50": 6.600000000034925,
          "domP95": 17.5
        },
        "fCommitP50": 3.3999999999650754,
        "fCommitP95": 7.800000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.600000000034925,
        "emitP95": 18.300000000046566,
        "domP50": 10.099999999976717,
        "domP95": 19.79999999998836
      },
      "edit_d4": {
        "emitP50": 10.100000000034925,
        "emitP95": 26.099999999976717,
        "domP50": 11.200000000011642,
        "domP95": 26.600000000034925
      },
      "edit_d10": {
        "emitP50": 8.799999999988358,
        "emitP95": 32.59999999997672,
        "domP50": 10.099999999976717,
        "domP95": 33.79999999998836
      },
      "loadCycle": {
        "emitP50": 11.299999999988358,
        "emitP95": 49.70000000001164,
        "domP50": 12.099999999976717,
        "domP95": 50.29999999998836
      },
      "step": {
        "emitP50": 9.5,
        "emitP95": 21.800000000046566,
        "domP50": 9.799999999988358,
        "domP95": 22.600000000034925
      },
      "reset": {
        "emitP50": 27.29999999998836,
        "emitP95": 50.100000000034925,
        "domP50": 27.29999999998836,
        "domP95": 50.100000000034925
      },
      "append100": {
        "emitP50": 13.800000000046566,
        "emitP95": 20.599999999976717,
        "domP50": 14,
        "domP95": 24.600000000034925
      },
      "control": {
        "emitP50": 7.7000000000116415,
        "emitP95": 17.600000000034925,
        "domP50": 7.899999999965075,
        "domP95": 18
      },
      "heapMb": 5.495655059814453,
      "heapCode": 3.174633026123047,
      "heapData": 1.8733100891113281,
      "pssTotalMb": 235.880859375,
      "pssApp": 131.97265625,
      "pssRenderer": 103.908203125,
      "relaunchReadyMs": 399.5,
      "relaunchHeapMb": 4.534030914306641,
      "relaunchHeapCode": 2.3258934020996094,
      "relaunchHeapData": 1.8302879333496094
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.299999999988358,
          "emitP95": 18.399999999965075,
          "domP50": 10.199999999953434,
          "domP95": 18.900000000023283
        },
        "setKeys": {
          "emitP50": 8,
          "emitP95": 22.79999999998836,
          "domP50": 8.599999999976717,
          "domP95": 23.199999999953434
        },
        "replace": {
          "emitP50": 7.5,
          "emitP95": 19.5,
          "domP50": 8,
          "domP95": 20
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.100000000034925,
          "lagP95": 17.600000000034925,
          "endLag": 9.100000000034925,
          "maxBacklog": 3
        },
        "heapMb": 5.095722198486328,
        "heapCode": 3.040485382080078,
        "heapData": 1.6154251098632812,
        "pssTotalMb": 232.3115234375,
        "pssApp": 130.3095703125,
        "pssRenderer": 102.001953125,
        "control": {
          "emitP50": 4.7999999999883585,
          "emitP95": 26,
          "domP50": 5.099999999976717,
          "domP95": 26.600000000034925
        },
        "fCommitP50": 3.3999999999650754,
        "fCommitP95": 7.600000000034925
      },
      "500": {
        "setKey": {
          "emitP50": 10.799999999988358,
          "emitP95": 23.79999999998836,
          "domP50": 11.600000000034925,
          "domP95": 24.899999999965075
        },
        "setKeys": {
          "emitP50": 10.099999999976717,
          "emitP95": 23.900000000023283,
          "domP50": 10.599999999976717,
          "domP95": 24.29999999998836
        },
        "replace": {
          "emitP50": 9.099999999976717,
          "emitP95": 19,
          "domP50": 9.5,
          "domP95": 19.20000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.2000000000116415,
          "lagP95": 16.20000000001164,
          "endLag": 8,
          "maxBacklog": 2
        },
        "heapMb": 5.589424133300781,
        "heapCode": 3.0638427734375,
        "heapData": 2.068897247314453,
        "pssTotalMb": 232.7451171875,
        "pssApp": 130.1494140625,
        "pssRenderer": 102.595703125,
        "control": {
          "emitP50": 6,
          "emitP95": 20.199999999953434,
          "domP50": 6.300000000046566,
          "domP95": 20.70000000006985
        },
        "fCommitP50": 3.3999999999068677,
        "fCommitP95": 6.099999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 10.29999999993015,
          "emitP95": 26.400000000023283,
          "domP50": 11.100000000093132,
          "domP95": 26.800000000046566
        },
        "setKeys": {
          "emitP50": 12.699999999953434,
          "emitP95": 32.09999999997672,
          "domP50": 13.599999999976717,
          "domP95": 32.59999999997672
        },
        "replace": {
          "emitP50": 14.599999999976717,
          "emitP95": 21.29999999993015,
          "domP50": 15,
          "domP95": 21.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 10,
          "lagP95": 20.100000000093132,
          "endLag": 12.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 9.972389221191406,
        "heapCode": 3.1130943298339844,
        "heapData": 6.260124206542969,
        "pssTotalMb": 246.8095703125,
        "pssApp": 138.658203125,
        "pssRenderer": 108.1513671875,
        "control": {
          "emitP50": 9.099999999976717,
          "emitP95": 17.5,
          "domP50": 9.400000000023283,
          "domP95": 17.800000000046566
        },
        "fCommitP50": 3.700000000069849,
        "fCommitP95": 8.199999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.900000000023283,
        "emitP95": 22.900000000023283,
        "domP50": 10,
        "domP95": 24.099999999976717
      },
      "edit_d4": {
        "emitP50": 7.800000000046566,
        "emitP95": 27.5,
        "domP50": 9.20000000006985,
        "domP95": 28
      },
      "edit_d10": {
        "emitP50": 7.799999999930151,
        "emitP95": 22.599999999976717,
        "domP50": 8.199999999953434,
        "domP95": 23
      },
      "loadCycle": {
        "emitP50": 14.099999999976717,
        "emitP95": 57.699999999953434,
        "domP50": 14.199999999953434,
        "domP95": 58.199999999953434
      },
      "step": {
        "emitP50": 9.100000000093132,
        "emitP95": 31.20000000006985,
        "domP50": 10.399999999906868,
        "domP95": 31.5
      },
      "reset": {
        "emitP50": 25.899999999906868,
        "emitP95": 55.5,
        "domP50": 26.699999999953434,
        "domP95": 55.5
      },
      "append100": {
        "emitP50": 14.5,
        "emitP95": 25.599999999976717,
        "domP50": 15.099999999976717,
        "domP95": 26
      },
      "control": {
        "emitP50": 7.799999999930151,
        "emitP95": 21.800000000046566,
        "domP50": 8.199999999953434,
        "domP95": 22.099999999976717
      },
      "heapMb": 5.490318298339844,
      "heapCode": 3.173870086669922,
      "heapData": 1.8689537048339844,
      "pssTotalMb": 236.197265625,
      "pssApp": 131.955078125,
      "pssRenderer": 104.2421875,
      "relaunchReadyMs": 2003.8000000000466,
      "relaunchHeapMb": 4.436725616455078,
      "relaunchHeapCode": 2.2333946228027344,
      "relaunchHeapData": 1.8278121948242188
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.5,
          "domP50": 5.699999999953434,
          "domP95": 6.699999999953434
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.700000000069849,
          "domP50": 5.800000000046566,
          "domP95": 6.800000000046566
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.2999999999301508,
          "domP50": 1.099999999976717,
          "domP95": 9
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.7236328125,
        "heapCode": 1.8439712524414062,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 222.4951171875,
        "pssApp": 126.470703125,
        "pssRenderer": 96.0244140625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 3.699999999953434,
          "domP50": 1.7000000000698492,
          "domP95": 11.79999999993015
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.199999999953434,
          "domP50": 1.2999999999301508,
          "domP95": 10.5
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.9000000000232831,
          "domP50": 1.400000000023283,
          "domP95": 7
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6999999999534339,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.97467041015625,
        "heapCode": 1.6965179443359375,
        "heapData": 1.8917236328125,
        "pssTotalMb": 222.310546875,
        "pssApp": 123.927734375,
        "pssRenderer": 98.3828125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.7999999999301508,
          "emitP95": 9.70000000006985,
          "domP50": 3.099999999976717,
          "domP95": 14.5
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 5.200000000069849,
          "domP50": 3.900000000023283,
          "domP95": 10.300000000046566
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.6000000000931323,
          "domP50": 2.5,
          "domP95": 10
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 1.8000000000465661,
          "endLag": 1.3000000000465661,
          "maxBacklog": 0
        },
        "heapMb": 8.095550537109375,
        "heapCode": 1.8440399169921875,
        "heapData": 5.725063323974609,
        "pssTotalMb": 230.1591796875,
        "pssApp": 125.4453125,
        "pssRenderer": 104.7138671875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 2.199999999953434,
        "domP50": 2.599999999976717,
        "domP95": 13
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.5,
        "domP50": 4.899999999906868,
        "domP95": 7.800000000046566
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 0.9000000000232831,
        "domP50": 2.599999999976717,
        "domP95": 8.20000000006985
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 32.79999999993015,
        "domP50": 1.2999999999301508,
        "domP95": 33.199999999953434
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1,
        "domP50": 4.400000000023283,
        "domP95": 10.29999999993015
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.7000000000698492,
        "domP50": 0.2999999999301508,
        "domP95": 1.1999999999534339
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1999999999534339,
        "domP50": 0.8999999999068677,
        "domP95": 11
      },
      "heapMb": 3.9353485107421875,
      "heapCode": 1.9236526489257812,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 222.828125,
      "pssApp": 125.796875,
      "pssRenderer": 97.03125,
      "relaunchReadyMs": 1469.2999999999302,
      "relaunchHeapMb": 3.351543426513672,
      "relaunchHeapCode": 1.5399436950683594,
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
          "emitP95": 1.1999999999534339,
          "domP50": 1.599999999976717,
          "domP95": 7.700000000069849
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.5,
          "domP50": 1.099999999976717,
          "domP95": 9
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5999999999767169,
          "domP50": 4.400000000023283,
          "domP95": 7.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 1.6999999999534339,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.7227134704589844,
        "heapCode": 1.8430595397949219,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 225.3486328125,
        "pssApp": 127.884765625,
        "pssRenderer": 97.4638671875
      },
      "500": {
        "setKey": {
          "emitP50": 0.6000000000931323,
          "emitP95": 1.5,
          "domP50": 4.200000000069849,
          "domP95": 13.800000000046566
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 6.100000000093132,
          "domP50": 1.6999999999534339,
          "domP95": 10.800000000046566
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.8999999999068677,
          "domP50": 5.400000000023283,
          "domP95": 14.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 4.132747650146484,
        "heapCode": 1.849761962890625,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 229.171875,
        "pssApp": 127.9365234375,
        "pssRenderer": 101.2353515625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.7000000000698492,
          "emitP95": 3.900000000023283,
          "domP50": 3,
          "domP95": 8.400000000023283
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 2.5,
          "domP50": 3.200000000069849,
          "domP95": 10.599999999976717
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.5999999999767169,
          "domP50": 1.900000000023283,
          "domP95": 8.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.099999999976717,
          "endLag": 1.5,
          "maxBacklog": 0
        },
        "heapMb": 8.099071502685547,
        "heapCode": 1.8475189208984375,
        "heapData": 5.7250823974609375,
        "pssTotalMb": 233.6396484375,
        "pssApp": 127.630859375,
        "pssRenderer": 106.0087890625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 6,
        "domP95": 6.5
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 5.200000000069849,
        "domP95": 7.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 1.1999999999534339,
        "domP95": 8.599999999976717
      },
      "loadCycle": {
        "emitP50": 0.6000000000931323,
        "emitP95": 35.09999999997672,
        "domP50": 1.1999999999534339,
        "domP95": 35.5
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.9000000000232831,
        "domP50": 5.400000000023283,
        "domP95": 9
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.7000000000698492,
        "domP50": 0.2000000000698492,
        "domP95": 1.6000000000931323
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 0.9000000000232831,
        "domP95": 9.199999999953434
      },
      "heapMb": 3.9353790283203125,
      "heapCode": 1.9236717224121094,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 227.0078125,
      "pssApp": 128.3154296875,
      "pssRenderer": 98.6923828125,
      "relaunchReadyMs": 1485.5999999999767,
      "relaunchHeapMb": 3.3517417907714844,
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
          "emitP50": 8.399999999906868,
          "emitP95": 21.29999999993015,
          "domP50": 9.29999999993015,
          "domP95": 21.699999999953434
        },
        "setKeys": {
          "emitP50": 12.5,
          "emitP95": 21.5,
          "domP50": 13,
          "domP95": 22.20000000006985
        },
        "replace": {
          "emitP50": 7.699999999953434,
          "emitP95": 24.79999999993015,
          "domP50": 8,
          "domP95": 25.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.199999999953434,
          "lagP95": 14.300000000046566,
          "endLag": 6.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.083408355712891,
        "heapCode": 3.0288772583007812,
        "heapData": 1.6154212951660156,
        "pssTotalMb": 236.107421875,
        "pssApp": 132.4384765625,
        "pssRenderer": 103.6689453125,
        "control": {
          "emitP50": 6.800000000046566,
          "emitP95": 15.600000000093132,
          "domP50": 7.099999999976717,
          "domP95": 16
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 5.700000000069849
      },
      "500": {
        "setKey": {
          "emitP50": 9.300000000046566,
          "emitP95": 32.90000000002328,
          "domP50": 9.699999999953434,
          "domP95": 33.40000000002328
        },
        "setKeys": {
          "emitP50": 9.70000000006985,
          "emitP95": 18.5,
          "domP50": 10,
          "domP95": 20.899999999906868
        },
        "replace": {
          "emitP50": 10.70000000006985,
          "emitP95": 19.100000000093132,
          "domP50": 11,
          "domP95": 19.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.799999999930151,
          "lagP95": 17.20000000006985,
          "endLag": 4.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 5.5887298583984375,
        "heapCode": 3.0636940002441406,
        "heapData": 2.0688934326171875,
        "pssTotalMb": 236.62109375,
        "pssApp": 132.1513671875,
        "pssRenderer": 104.4697265625,
        "control": {
          "emitP50": 8.199999999953434,
          "emitP95": 17,
          "domP50": 8.400000000023283,
          "domP95": 17.20000000006985
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 6
      },
      "5000": {
        "setKey": {
          "emitP50": 10.20000000006985,
          "emitP95": 17.099999999976717,
          "domP50": 12.099999999976717,
          "domP95": 17.5
        },
        "setKeys": {
          "emitP50": 11.400000000023283,
          "emitP95": 37.59999999997672,
          "domP50": 11.900000000023283,
          "domP95": 38.5
        },
        "replace": {
          "emitP50": 13.5,
          "emitP95": 25.400000000023283,
          "domP50": 14.900000000023283,
          "domP95": 25.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.900000000023283,
          "lagP95": 12.900000000023283,
          "endLag": 5.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.963333129882812,
        "heapCode": 3.1055526733398438,
        "heapData": 6.260124206542969,
        "pssTotalMb": 248.783203125,
        "pssApp": 138.9609375,
        "pssRenderer": 109.822265625,
        "control": {
          "emitP50": 5.400000000023283,
          "emitP95": 27.900000000023283,
          "domP50": 6.099999999976717,
          "domP95": 28.5
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 13.699999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.599999999976717,
        "emitP95": 20.900000000023283,
        "domP50": 10.199999999953434,
        "domP95": 21.699999999953434
      },
      "edit_d4": {
        "emitP50": 9.399999999906868,
        "emitP95": 27.699999999953434,
        "domP50": 10.399999999906868,
        "domP95": 28
      },
      "edit_d10": {
        "emitP50": 7.900000000023283,
        "emitP95": 22.900000000023283,
        "domP50": 8.5,
        "domP95": 23.300000000046566
      },
      "loadCycle": {
        "emitP50": 18.20000000006985,
        "emitP95": 62,
        "domP50": 18.300000000046566,
        "domP95": 62.699999999953434
      },
      "step": {
        "emitP50": 9.300000000046566,
        "emitP95": 33.29999999993015,
        "domP50": 9.70000000006985,
        "domP95": 33.59999999997672
      },
      "reset": {
        "emitP50": 26.5,
        "emitP95": 48.40000000002328,
        "domP50": 26.5,
        "domP95": 48.40000000002328
      },
      "append100": {
        "emitP50": 13.699999999953434,
        "emitP95": 20.199999999953434,
        "domP50": 14.199999999953434,
        "domP95": 20.599999999976717
      },
      "control": {
        "emitP50": 8.099999999976717,
        "emitP95": 25.5,
        "domP50": 8.400000000023283,
        "domP95": 25.900000000023283
      },
      "heapMb": 5.499942779541016,
      "heapCode": 3.17535400390625,
      "heapData": 1.8768653869628906,
      "pssTotalMb": 239.810546875,
      "pssApp": 134.1630859375,
      "pssRenderer": 105.6474609375,
      "relaunchReadyMs": 402,
      "relaunchHeapMb": 4.533908843994141,
      "relaunchHeapCode": 2.325969696044922,
      "relaunchHeapData": 1.8300895690917969
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.20000000006985,
          "emitP95": 19.70000000006985,
          "domP50": 10.70000000006985,
          "domP95": 21.399999999906868
        },
        "setKeys": {
          "emitP50": 8.300000000046566,
          "emitP95": 19.400000000023283,
          "domP50": 8.79999999993015,
          "domP95": 19.79999999993015
        },
        "replace": {
          "emitP50": 7.900000000023283,
          "emitP95": 28.800000000046566,
          "domP50": 8.300000000046566,
          "domP95": 29.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 18.20000000006985,
          "endLag": 10.20000000006985,
          "maxBacklog": 2
        },
        "heapMb": 5.095977783203125,
        "heapCode": 3.040515899658203,
        "heapData": 1.6154212951660156,
        "pssTotalMb": 234.1240234375,
        "pssApp": 130.41015625,
        "pssRenderer": 103.7138671875,
        "control": {
          "emitP50": 6.300000000046566,
          "emitP95": 18.400000000023283,
          "domP50": 6.599999999976717,
          "domP95": 18.800000000046566
        },
        "fCommitP50": 4,
        "fCommitP95": 7.099999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 8.400000000023283,
          "emitP95": 19.800000000046566,
          "domP50": 9.600000000093132,
          "domP95": 20.20000000006985
        },
        "setKeys": {
          "emitP50": 9.300000000046566,
          "emitP95": 17.5,
          "domP50": 9.900000000023283,
          "domP95": 17.900000000023283
        },
        "replace": {
          "emitP50": 8.399999999906868,
          "emitP95": 28.099999999976717,
          "domP50": 8.800000000046566,
          "domP95": 28.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.899999999906868,
          "lagP95": 18.099999999976717,
          "endLag": 7.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.58062744140625,
        "heapCode": 3.0555648803710938,
        "heapData": 2.0691871643066406,
        "pssTotalMb": 236.3251953125,
        "pssApp": 131.8837890625,
        "pssRenderer": 104.44140625,
        "control": {
          "emitP50": 5.099999999976717,
          "emitP95": 19.100000000093132,
          "domP50": 5.599999999976717,
          "domP95": 19.70000000006985
        },
        "fCommitP50": 4.800000000046566,
        "fCommitP95": 12.399999999906868
      },
      "5000": {
        "setKey": {
          "emitP50": 10.599999999976717,
          "emitP95": 20.900000000023283,
          "domP50": 11,
          "domP95": 21.70000000006985
        },
        "setKeys": {
          "emitP50": 12.20000000006985,
          "emitP95": 23,
          "domP50": 12.800000000046566,
          "domP95": 23.800000000046566
        },
        "replace": {
          "emitP50": 13.599999999976717,
          "emitP95": 19.70000000006985,
          "domP50": 14.699999999953434,
          "domP95": 20.100000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.79999999993015,
          "lagP95": 19.599999999976717,
          "endLag": 30.899999999906868,
          "maxBacklog": 2
        },
        "heapMb": 9.964065551757812,
        "heapCode": 3.1059417724609375,
        "heapData": 6.260398864746094,
        "pssTotalMb": 248.4541015625,
        "pssApp": 138.4833984375,
        "pssRenderer": 109.970703125,
        "control": {
          "emitP50": 7.100000000093132,
          "emitP95": 17.5,
          "domP50": 7.300000000046566,
          "domP95": 17.699999999953434
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 7.5
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9,
        "emitP95": 23.900000000023283,
        "domP50": 9.800000000046566,
        "domP95": 24.199999999953434
      },
      "edit_d4": {
        "emitP50": 7.5,
        "emitP95": 29.20000000006985,
        "domP50": 8.300000000046566,
        "domP95": 29.600000000093132
      },
      "edit_d10": {
        "emitP50": 9,
        "emitP95": 18.5,
        "domP50": 9.400000000023283,
        "domP95": 19
      },
      "loadCycle": {
        "emitP50": 16.599999999976717,
        "emitP95": 61.199999999953434,
        "domP50": 17.099999999976717,
        "domP95": 61.39999999990687
      },
      "step": {
        "emitP50": 8.5,
        "emitP95": 23.900000000023283,
        "domP50": 8.699999999953434,
        "domP95": 24.300000000046566
      },
      "reset": {
        "emitP50": 33,
        "emitP95": 52.5,
        "domP50": 33.5,
        "domP95": 52.5
      },
      "append100": {
        "emitP50": 12.599999999976717,
        "emitP95": 27.699999999953434,
        "domP50": 13,
        "domP95": 28.099999999976717
      },
      "control": {
        "emitP50": 8.400000000023283,
        "emitP95": 22.099999999976717,
        "domP50": 8.70000000006985,
        "domP95": 22.300000000046566
      },
      "heapMb": 5.5008087158203125,
      "heapCode": 3.1758956909179688,
      "heapData": 1.877227783203125,
      "pssTotalMb": 240.6943359375,
      "pssApp": 134.951171875,
      "pssRenderer": 105.7431640625,
      "relaunchReadyMs": 413.5999999999767,
      "relaunchHeapMb": 4.53485107421875,
      "relaunchHeapCode": 2.326068878173828,
      "relaunchHeapData": 1.8307571411132812
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.900000000023283,
          "domP50": 5.5,
          "domP95": 11
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8000000000465661,
          "domP50": 1,
          "domP95": 6.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.2999999999301508,
          "domP50": 4.899999999906868,
          "domP95": 8
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.7000000000698492,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.7240333557128906,
        "heapCode": 1.8443069458007812,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 225.9765625,
        "pssApp": 128.5234375,
        "pssRenderer": 97.453125
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.5999999999767169,
          "domP50": 5.799999999930151,
          "domP95": 7
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.099999999976717,
          "domP50": 5.599999999976717,
          "domP95": 8.199999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.3000000000465661,
          "domP50": 1,
          "domP95": 11.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 4.135395050048828,
        "heapCode": 1.8522453308105469,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 229.6044921875,
        "pssApp": 128.2744140625,
        "pssRenderer": 101.330078125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6999999999534339,
          "emitP95": 3.400000000023283,
          "domP50": 3.300000000046566,
          "domP95": 9.099999999976717
        },
        "setKeys": {
          "emitP50": 1.7000000000698492,
          "emitP95": 4,
          "domP50": 2.700000000069849,
          "domP95": 9.599999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7999999999301508,
          "domP50": 1.6999999999534339,
          "domP95": 9.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.3999999999068677,
          "endLag": 1.5,
          "maxBacklog": 0
        },
        "heapMb": 8.097343444824219,
        "heapCode": 1.8452033996582031,
        "heapData": 5.725639343261719,
        "pssTotalMb": 233.5625,
        "pssApp": 127.5087890625,
        "pssRenderer": 106.0537109375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 5.5,
        "domP95": 6.700000000069849
      },
      "edit_d4": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7999999999301508,
        "domP50": 5.700000000069849,
        "domP95": 9.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 2.800000000046566,
        "domP50": 1.1000000000931323,
        "domP95": 9
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 32.90000000002328,
        "domP50": 0.5999999999767169,
        "domP95": 33.29999999993015
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 1.2000000000698492,
        "domP50": 5.199999999953434,
        "domP95": 9.29999999993015
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.5999999999767169,
        "domP50": 0.2999999999301508,
        "domP95": 1.400000000023283
      },
      "append100": {
        "emitP50": 0.5,
        "emitP95": 0.5999999999767169,
        "domP50": 0.8999999999068677,
        "domP95": 5.5
      },
      "heapMb": 3.936077117919922,
      "heapCode": 1.9243507385253906,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.8505859375,
      "pssApp": 128.2744140625,
      "pssRenderer": 98.576171875,
      "relaunchReadyMs": 721.5999999999767,
      "relaunchHeapMb": 3.351573944091797,
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
          "emitP50": 0.30000000004656613,
          "emitP95": 0.6000000000931323,
          "domP50": 5.5,
          "domP95": 7.400000000023283
        },
        "setKeys": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.8000000000465661,
          "domP50": 5,
          "domP95": 6.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6999999999534339,
          "domP50": 5.700000000069849,
          "domP95": 10.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.7237930297851562,
        "heapCode": 1.8440971374511719,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 226.0322265625,
        "pssApp": 128.4306640625,
        "pssRenderer": 97.6015625
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7999999999301508,
          "domP50": 5.900000000023283,
          "domP95": 6.799999999930151
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 5.5,
          "domP95": 9.899999999906868
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7999999999301508,
          "domP50": 5.099999999976717,
          "domP95": 10.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6999999999534339,
          "endLag": 0.6999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 4.132198333740234,
        "heapCode": 1.8495063781738281,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 229.5849609375,
        "pssApp": 128.1708984375,
        "pssRenderer": 101.4140625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.8000000000465661,
          "emitP95": 3.5,
          "domP50": 3.199999999953434,
          "domP95": 7.600000000093132
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 5.899999999906868,
          "domP50": 3,
          "domP95": 7.599999999976717
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 5.199999999953434,
          "domP50": 1.6999999999534339,
          "domP95": 6.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2,
          "endLag": 1.8000000000465661,
          "maxBacklog": 0
        },
        "heapMb": 8.094181060791016,
        "heapCode": 1.8428840637207031,
        "heapData": 5.725063323974609,
        "pssTotalMb": 233.1240234375,
        "pssApp": 127.2255859375,
        "pssRenderer": 105.8984375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.8999999999068677,
        "domP50": 5.200000000069849,
        "domP95": 12.099999999976717
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 5.099999999976717,
        "domP95": 10.70000000006985
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 0.8999999999068677,
        "domP50": 2.199999999953434,
        "domP95": 7.599999999976717
      },
      "loadCycle": {
        "emitP50": 12.900000000023283,
        "emitP95": 40.09999999997672,
        "domP50": 16.199999999953434,
        "domP95": 40.59999999997672
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7000000000698492,
        "domP50": 0.7999999999301508,
        "domP95": 9.099999999976717
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5999999999767169,
        "domP50": 0.2000000000698492,
        "domP95": 1.1999999999534339
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 0.9000000000232831,
        "domP95": 2.699999999953434
      },
      "heapMb": 3.9355201721191406,
      "heapCode": 1.9238128662109375,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.443359375,
      "pssApp": 127.5615234375,
      "pssRenderer": 98.8818359375,
      "relaunchReadyMs": 708.4000000000233,
      "relaunchHeapMb": 3.3514938354492188,
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
          "emitP50": 9.099999999976717,
          "emitP95": 22.400000000023283,
          "domP50": 10.400000000023283,
          "domP95": 23.100000000093132
        },
        "setKeys": {
          "emitP50": 10.600000000093132,
          "emitP95": 26.199999999953434,
          "domP50": 10.900000000023283,
          "domP95": 26.399999999906868
        },
        "replace": {
          "emitP50": 8.70000000006985,
          "emitP95": 22,
          "domP50": 9,
          "domP95": 22.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.400000000023283,
          "lagP95": 21,
          "endLag": 9.100000000093132,
          "maxBacklog": 2
        },
        "heapMb": 5.095855712890625,
        "heapCode": 3.040363311767578,
        "heapData": 1.615692138671875,
        "pssTotalMb": 235.8525390625,
        "pssApp": 132.0966796875,
        "pssRenderer": 103.755859375,
        "control": {
          "emitP50": 7.200000000069849,
          "emitP95": 17.20000000006985,
          "domP50": 7.5,
          "domP95": 17.5
        },
        "fCommitP50": 3.5,
        "fCommitP95": 11.400000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 9.400000000023283,
          "emitP95": 16.400000000023283,
          "domP50": 9.900000000023283,
          "domP95": 17.300000000046566
        },
        "setKeys": {
          "emitP50": 9.79999999993015,
          "emitP95": 24.900000000023283,
          "domP50": 10.699999999953434,
          "domP95": 25.300000000046566
        },
        "replace": {
          "emitP50": 9.79999999993015,
          "emitP95": 39.59999999997672,
          "domP50": 10.199999999953434,
          "domP95": 39.89999999990687
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.299999999930151,
          "lagP95": 14.199999999953434,
          "endLag": 9.300000000046566,
          "maxBacklog": 2
        },
        "heapMb": 5.586315155029297,
        "heapCode": 3.0612106323242188,
        "heapData": 2.0689163208007812,
        "pssTotalMb": 235.0703125,
        "pssApp": 130.619140625,
        "pssRenderer": 104.451171875,
        "control": {
          "emitP50": 7.199999999953434,
          "emitP95": 19.199999999953434,
          "domP50": 7.700000000069849,
          "domP95": 19.5
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 10.699999999953434
      },
      "5000": {
        "setKey": {
          "emitP50": 12.900000000023283,
          "emitP95": 22.79999999993015,
          "domP50": 13.29999999993015,
          "domP95": 24.699999999953434
        },
        "setKeys": {
          "emitP50": 10.900000000023283,
          "emitP95": 22.5,
          "domP50": 11.70000000006985,
          "domP95": 22.900000000023283
        },
        "replace": {
          "emitP50": 13.899999999906868,
          "emitP95": 21.70000000006985,
          "domP50": 14.600000000093132,
          "domP95": 22.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9,
          "lagP95": 19.900000000023283,
          "endLag": 7.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.973312377929688,
        "heapCode": 3.1144256591796875,
        "heapData": 6.2603912353515625,
        "pssTotalMb": 249.140625,
        "pssApp": 139.2216796875,
        "pssRenderer": 109.9189453125,
        "control": {
          "emitP50": 6.799999999930151,
          "emitP95": 18.5,
          "domP50": 7.199999999953434,
          "domP95": 19
        },
        "fCommitP50": 3.799999999930151,
        "fCommitP95": 6.599999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 11.099999999976717,
        "emitP95": 19.599999999976717,
        "domP50": 11.599999999976717,
        "domP95": 22.79999999993015
      },
      "edit_d4": {
        "emitP50": 7.700000000069849,
        "emitP95": 21.599999999976717,
        "domP50": 8.29999999993015,
        "domP95": 22.099999999976717
      },
      "edit_d10": {
        "emitP50": 9.099999999976717,
        "emitP95": 19.5,
        "domP50": 9.5,
        "domP95": 26.599999999976717
      },
      "loadCycle": {
        "emitP50": 18.199999999953434,
        "emitP95": 53.09999999997672,
        "domP50": 19.699999999953434,
        "domP95": 53.59999999997672
      },
      "step": {
        "emitP50": 6.899999999906868,
        "emitP95": 28.300000000046566,
        "domP50": 7.5,
        "domP95": 28.599999999976717
      },
      "reset": {
        "emitP50": 28.599999999976717,
        "emitP95": 100.30000000004657,
        "domP50": 29.099999999976717,
        "domP95": 100.30000000004657
      },
      "append100": {
        "emitP50": 14.79999999993015,
        "emitP95": 26.300000000046566,
        "domP50": 15.199999999953434,
        "domP95": 26.599999999976717
      },
      "control": {
        "emitP50": 6.599999999976717,
        "emitP95": 20.399999999906868,
        "domP50": 6.899999999906868,
        "domP95": 27.5
      },
      "heapMb": 5.488304138183594,
      "heapCode": 3.169963836669922,
      "heapData": 1.8706855773925781,
      "pssTotalMb": 240.1826171875,
      "pssApp": 134.5732421875,
      "pssRenderer": 105.609375,
      "relaunchReadyMs": 858.4000000000233,
      "relaunchHeapMb": 4.328006744384766,
      "relaunchHeapCode": 2.1254043579101562,
      "relaunchHeapData": 1.8270301818847656
    }
  }
]
```
</details>
