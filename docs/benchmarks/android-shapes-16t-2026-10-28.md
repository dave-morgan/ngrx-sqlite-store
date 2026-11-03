# Phase 16 shapes — flat objects & hybrid workflow (2026-10-27)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.23 ms, p95 8.09 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 50 / CODE-BOUND 0 / FAIL 35

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.40 ± 0.07 | 8.32 ± 1.25 | 20.8× | FAIL | allow 7.4 (control emitP50 6.0×1) |
| flat | 50.setKey.emitP95 | 1.46 ± 1.03 | 19.36 ± 3.45 | 13.3× | PLATFORM-BOUND | allow 21.1 (control emitP95 16.6×1) |
| flat | 50.setKey.domP50 | 3.60 ± 1.62 | 8.96 ± 1.06 | 2.5× | PLATFORM-BOUND | allow 9.3 (control domP50 6.6×1) |
| flat | 50.setKey.domP95 | 8.74 ± 1.61 | 20.34 ± 3.31 | 2.3× | PLATFORM-BOUND | allow 22.2 (control domP95 17.3×1) |
| flat | 50.setKeys.emitP50 | 0.44 ± 0.09 | 8.32 ± 0.85 | 18.9× | FAIL | allow 7.0 (control emitP50 6.0×1) |
| flat | 50.setKeys.emitP95 | 1.82 ± 0.83 | 19.06 ± 1.60 | 10.5× | PLATFORM-BOUND | allow 19.0 (control emitP95 16.6×1) |
| flat | 50.setKeys.domP50 | 2.50 ± 1.44 | 9.04 ± 0.91 | 3.6× | PLATFORM-BOUND | allow 9.0 (control domP50 6.6×1) |
| flat | 50.setKeys.domP95 | 9.36 ± 1.62 | 19.48 ± 1.60 | 2.1× | PLATFORM-BOUND | allow 20.5 (control domP95 17.3×1) |
| flat | 50.replace.emitP50 | 0.32 ± 0.04 | 7.88 ± 1.36 | 24.6× | FAIL | allow 7.4 (control emitP50 6.0×1) |
| flat | 50.replace.emitP95 | 1.64 ± 1.18 | 17.72 ± 4.24 | 10.8× | PLATFORM-BOUND | allow 22.0 (control emitP95 16.6×1) |
| flat | 50.replace.domP50 | 1.06 ± 0.15 | 8.50 ± 1.17 | 8.0× | PLATFORM-BOUND | allow 7.9 (control domP50 6.6×1) |
| flat | 50.replace.domP95 | 9.86 ± 2.81 | 18.12 ± 4.22 | 1.8× | PLATFORM-BOUND | allow 24.3 (control domP95 17.3×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 6.24 ± 0.33 | 20.8× | PLATFORM-BOUND | allow 6.4 (control emitP50 6.0×1) |
| flat | 50.burst.lagP95 | 0.62 ± 0.16 | 15.18 ± 2.79 | 24.5× | PLATFORM-BOUND | allow 19.6 (control emitP95 16.6×1) |
| flat | 50.burst.endLag | 0.30 ± 0.00 | 6.68 ± 1.15 | 22.3× | PLATFORM-BOUND | allow 7.2 (control emitP50 6.0×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 50.heapMb | 3.66 ± 0.09 | 5.04 ± 0.01 | 1.4× | FAIL | code +1.20 MB; data 1.50 -> 1.62 MB |
| flat | 50.pssTotalMb | 224.86 ± 2.34 | 237.56 ± 1.57 | 1.1× | FAIL | allow 6.5 (plugin baseline 2.6 MB) |
| flat | 500.setKey.emitP50 | 0.38 ± 0.13 | 8.22 ± 1.04 | 21.6× | FAIL | allow 7.6 (control emitP50 6.4×1) |
| flat | 500.setKey.emitP95 | 1.06 ± 0.55 | 21.46 ± 3.24 | 20.2× | PLATFORM-BOUND | allow 22.1 (control emitP95 18.3×1) |
| flat | 500.setKey.domP50 | 5.70 ± 0.20 | 8.64 ± 0.92 | 1.5× | PLATFORM-BOUND | allow 7.8 (control domP50 6.7×1) |
| flat | 500.setKey.domP95 | 9.02 ± 2.82 | 22.10 ± 3.22 | 2.5× | PLATFORM-BOUND | allow 24.6 (control domP95 18.5×1) |
| flat | 500.setKeys.emitP50 | 0.46 ± 0.09 | 9.60 ± 0.99 | 20.9× | FAIL | allow 7.5 (control emitP50 6.4×1) |
| flat | 500.setKeys.emitP95 | 2.90 ± 4.15 | 20.04 ± 4.88 | 6.9× | PLATFORM-BOUND | allow 27.3 (control emitP95 18.3×1) |
| flat | 500.setKeys.domP50 | 2.92 ± 2.31 | 10.30 ± 0.85 | 3.5× | PLATFORM-BOUND | allow 9.9 (control domP50 6.7×1) |
| flat | 500.setKeys.domP95 | 9.86 ± 3.47 | 20.48 ± 4.79 | 2.1× | PLATFORM-BOUND | allow 26.8 (control domP95 18.5×1) |
| flat | 500.replace.emitP50 | 0.34 ± 0.05 | 8.00 ± 0.62 | 23.5× | FAIL | allow 7.1 (control emitP50 6.4×1) |
| flat | 500.replace.emitP95 | 1.42 ± 0.91 | 16.54 ± 5.63 | 11.6× | PLATFORM-BOUND | allow 24.8 (control emitP95 18.3×1) |
| flat | 500.replace.domP50 | 1.40 ± 0.40 | 8.56 ± 0.75 | 6.1× | PLATFORM-BOUND | allow 7.9 (control domP50 6.7×1) |
| flat | 500.replace.domP95 | 9.98 ± 2.76 | 17.14 ± 5.78 | 1.7× | PLATFORM-BOUND | allow 27.1 (control domP95 18.5×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 6.34 ± 0.25 | 15.8× | PLATFORM-BOUND | allow 6.7 (control emitP50 6.4×1) |
| flat | 500.burst.lagP95 | 0.76 ± 0.11 | 15.38 ± 1.95 | 20.2× | PLATFORM-BOUND | allow 20.4 (control emitP95 18.3×1) |
| flat | 500.burst.endLag | 0.36 ± 0.09 | 7.34 ± 2.13 | 20.4× | PLATFORM-BOUND | allow 8.7 (control emitP50 6.4×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 500.heapMb | 4.10 ± 0.07 | 5.54 ± 0.00 | 1.3× | FAIL | code +1.19 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 228.73 ± 1.63 | 238.58 ± 1.44 | 1.0× | FAIL | allow 5.6 (plugin baseline 2.6 MB) |
| flat | 5000.setKey.emitP50 | 1.54 ± 0.34 | 9.64 ± 0.94 | 6.3× | FAIL | allow 6.6 (control emitP50 5.3×1) |
| flat | 5000.setKey.emitP95 | 3.50 ± 2.49 | 21.94 ± 3.09 | 6.3× | PLATFORM-BOUND | allow 23.9 (control emitP95 18.3×1) |
| flat | 5000.setKey.domP50 | 3.98 ± 1.54 | 10.42 ± 0.91 | 2.6× | PLATFORM-BOUND | allow 8.1 (control domP50 5.6×1) |
| flat | 5000.setKey.domP95 | 9.40 ± 2.21 | 22.72 ± 2.97 | 2.4× | PLATFORM-BOUND | allow 23.8 (control domP95 18.6×1) |
| flat | 5000.setKeys.emitP50 | 1.58 ± 0.08 | 10.58 ± 1.62 | 6.7× | FAIL | allow 7.0 (control emitP50 5.3×1) |
| flat | 5000.setKeys.emitP95 | 5.88 ± 3.38 | 19.92 ± 3.35 | 3.4× | PLATFORM-BOUND | allow 25.0 (control emitP95 18.3×1) |
| flat | 5000.setKeys.domP50 | 3.12 ± 0.22 | 11.14 ± 1.68 | 3.6× | FAIL | allow 7.5 (control domP50 5.6×1) |
| flat | 5000.setKeys.domP95 | 10.38 ± 2.30 | 20.58 ± 3.14 | 2.0× | PLATFORM-BOUND | allow 24.0 (control domP95 18.6×1) |
| flat | 5000.replace.emitP50 | 0.38 ± 0.04 | 12.80 ± 0.37 | 33.7× | FAIL | allow 5.8 (control emitP50 5.3×1) |
| flat | 5000.replace.emitP95 | 1.12 ± 0.44 | 25.92 ± 3.67 | 23.1× | FAIL | allow 22.4 (control emitP95 18.3×1) |
| flat | 5000.replace.domP50 | 1.58 ± 0.25 | 13.32 ± 0.41 | 8.4× | FAIL | allow 6.3 (control domP50 5.6×1) |
| flat | 5000.replace.domP95 | 8.70 ± 3.33 | 26.52 ± 3.37 | 3.0× | PLATFORM-BOUND | allow 25.3 (control domP95 18.6×1) |
| flat | 5000.burst.lagP50 | 1.30 ± 0.12 | 8.46 ± 0.94 | 6.5× | FAIL | allow 6.4 (control emitP50 5.3×1) |
| flat | 5000.burst.lagP95 | 2.14 ± 0.48 | 17.50 ± 2.75 | 8.2× | PLATFORM-BOUND | allow 21.5 (control emitP95 18.3×1) |
| flat | 5000.burst.endLag | 1.22 ± 0.20 | 8.64 ± 2.80 | 7.1× | PLATFORM-BOUND | allow 8.3 (control emitP50 5.3×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.10 ± 0.00 | 9.92 ± 0.01 | 1.2× | FAIL | code +1.22 MB; data 5.73 -> 6.26 MB |
| flat | 5000.pssTotalMb | 234.97 ± 2.27 | 246.77 ± 1.28 | 1.1× | FAIL | allow 6.1 (plugin baseline 2.6 MB) |
| workflow | edit_d1.emitP50 | 0.36 ± 0.11 | 7.54 ± 0.56 | 20.9× | FAIL | allow 6.5 (control emitP50 5.8×1) |
| workflow | edit_d1.emitP95 | 1.42 ± 1.53 | 17.64 ± 2.39 | 12.4× | PLATFORM-BOUND | allow 20.3 (control emitP95 16.4×1) |
| workflow | edit_d1.domP50 | 3.74 ± 2.11 | 8.12 ± 0.47 | 2.2× | PLATFORM-BOUND | allow 8.7 (control domP50 6.1×1) |
| workflow | edit_d1.domP95 | 8.96 ± 2.35 | 18.38 ± 2.63 | 2.1× | PLATFORM-BOUND | allow 21.8 (control domP95 16.8×1) |
| workflow | edit_d4.emitP50 | 0.40 ± 0.00 | 7.56 ± 0.72 | 18.9× | FAIL | allow 6.5 (control emitP50 5.8×1) |
| workflow | edit_d4.emitP95 | 1.04 ± 0.45 | 17.14 ± 2.91 | 16.5× | PLATFORM-BOUND | allow 19.7 (control emitP95 16.4×1) |
| workflow | edit_d4.domP50 | 2.52 ± 1.67 | 8.38 ± 0.89 | 3.3× | PLATFORM-BOUND | allow 8.7 (control domP50 6.1×1) |
| workflow | edit_d4.domP95 | 8.06 ± 0.96 | 17.76 ± 2.63 | 2.2× | PLATFORM-BOUND | allow 20.4 (control domP95 16.8×1) |
| workflow | edit_d10.emitP50 | 0.42 ± 0.04 | 7.62 ± 0.43 | 18.1× | FAIL | allow 6.3 (control emitP50 5.8×1) |
| workflow | edit_d10.emitP95 | 1.22 ± 0.24 | 17.60 ± 2.05 | 14.4× | PLATFORM-BOUND | allow 18.7 (control emitP95 16.4×1) |
| workflow | edit_d10.domP50 | 1.48 ± 0.36 | 8.18 ± 0.33 | 5.5× | PLATFORM-BOUND | allow 6.8 (control domP50 6.1×1) |
| workflow | edit_d10.domP95 | 8.20 ± 1.36 | 19.24 ± 2.57 | 2.3× | PLATFORM-BOUND | allow 20.8 (control domP95 16.8×1) |
| workflow | loadCycle.emitP50 | 2.90 ± 5.42 | 15.76 ± 3.51 | 5.4× | PLATFORM-BOUND | allow 20.5 (control emitP50 5.8×2) |
| workflow | loadCycle.emitP95 | 34.38 ± 1.25 | 51.40 ± 2.05 | 1.5× | PLATFORM-BOUND | allow 36.1 (control emitP95 16.4×2) |
| workflow | loadCycle.domP50 | 3.64 ± 5.59 | 16.10 ± 3.57 | 4.4× | PLATFORM-BOUND | allow 21.4 (control domP50 6.1×2) |
| workflow | loadCycle.domP95 | 34.88 ± 1.26 | 51.84 ± 2.10 | 1.5× | PLATFORM-BOUND | allow 37.0 (control domP95 16.8×2) |
| workflow | step.emitP50 | 0.38 ± 0.04 | 7.32 ± 0.57 | 19.3× | FAIL | allow 6.4 (control emitP50 5.8×1) |
| workflow | step.emitP95 | 1.20 ± 0.70 | 15.94 ± 1.13 | 13.3× | PLATFORM-BOUND | allow 18.2 (control emitP95 16.4×1) |
| workflow | step.domP50 | 2.50 ± 1.82 | 7.88 ± 0.72 | 3.2× | PLATFORM-BOUND | allow 8.7 (control domP50 6.1×1) |
| workflow | step.domP95 | 8.42 ± 2.67 | 16.32 ± 1.13 | 1.9× | PLATFORM-BOUND | allow 20.6 (control domP95 16.8×1) |
| workflow | reset.emitP50 | 0.22 ± 0.04 | 26.08 ± 2.64 | 118.5× | FAIL | allow 8.5 (control emitP50 5.8×1) |
| workflow | reset.emitP95 | 0.92 ± 0.48 | 59.68 ± 35.48 | 64.9× | FAIL | allow 52.3 (control emitP95 16.4×1) |
| workflow | reset.domP50 | 0.28 ± 0.04 | 26.10 ± 2.62 | 93.2× | FAIL | allow 8.8 (control domP50 6.1×1) |
| workflow | reset.domP95 | 1.88 ± 0.64 | 59.70 ± 35.50 | 31.8× | FAIL | allow 53.0 (control domP95 16.8×1) |
| workflow | append100.emitP50 | 0.32 ± 0.04 | 13.06 ± 0.68 | 40.8× | FAIL | allow 6.5 (control emitP50 5.8×1) |
| workflow | append100.emitP95 | 1.96 ± 2.88 | 39.54 ± 21.56 | 20.2× | PLATFORM-BOUND | allow 40.8 (control emitP95 16.4×1) |
| workflow | append100.domP50 | 0.92 ± 0.16 | 13.38 ± 0.71 | 14.5× | FAIL | allow 7.0 (control domP50 6.1×1) |
| workflow | append100.domP95 | 5.86 ± 1.19 | 39.86 ± 21.49 | 6.8× | PLATFORM-BOUND | allow 39.5 (control domP95 16.8×1) |
| workflow | heapMb | 3.94 ± 0.00 | 5.49 ± 0.00 | 1.4× | FAIL | code +1.25 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 227.71 ± 1.71 | 241.00 ± 1.70 | 1.1× | FAIL | allow 6.0 (plugin baseline 2.6 MB) |
| workflow | relaunchReadyMs | 1175.58 ± 312.23 | 670.46 ± 286.23 | 0.6× | PASS |  |
| workflow | relaunchHeapMb | 3.28 ± 0.04 | 4.38 ± 0.19 | 1.3× | FAIL | code +0.74 MB; data 1.44 -> 1.79 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 6.04 | 6.62 | 17.28 | 8.32 | 8.96 | 20.34 |
| 500 | 6.44 | 6.70 | 18.52 | 8.22 | 8.64 | 22.10 |
| 5000 | 5.34 | 5.64 | 18.60 | 9.64 | 10.42 | 22.72 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 128.2 | 134.6 | 96.6 | 103.0 |
| flat 500 | 128.2 | 134.8 | 100.6 | 103.8 |
| flat 5000 | 129.4 | 137.6 | 105.6 | 109.2 |
| workflow | 129.1 | 136.1 | 98.6 | 104.9 |

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
          "emitP95": 1.5,
          "domP50": 3.5,
          "domP95": 11.200000000011642
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.8999999999650754,
          "domP50": 1.2999999999883585,
          "domP95": 9.200000000011642
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.8000000000465661,
          "domP50": 1.1000000000349246,
          "domP95": 9.799999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.6000000000349246,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.7241287231445312,
        "heapCode": 1.8444023132324219,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.6181640625,
        "pssApp": 128.111328125,
        "pssRenderer": 96.5068359375
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8999999999650754,
          "domP50": 6,
          "domP95": 13.400000000023283
        },
        "setKeys": {
          "emitP50": 0.29999999998835847,
          "emitP95": 1,
          "domP50": 5.600000000034925,
          "domP95": 7.2999999999883585
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.5,
          "domP50": 1.900000000023283,
          "domP95": 10.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.9000000000232831,
          "endLag": 0.3999999999650754,
          "maxBacklog": 0
        },
        "heapMb": 4.135280609130859,
        "heapCode": 1.8521194458007812,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 226.716796875,
        "pssApp": 126.3017578125,
        "pssRenderer": 100.4150390625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6999999999534339,
          "emitP95": 2.900000000023283,
          "domP50": 3,
          "domP95": 9.900000000023283
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 5.7000000000116415,
          "domP50": 3.3999999999650754,
          "domP95": 8.599999999976717
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 1.3999999999650754,
          "domP50": 1.599999999976717,
          "domP95": 9.200000000011642
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.7999999999883585,
          "endLag": 1.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 8.098262786865234,
        "heapCode": 1.8461761474609375,
        "heapData": 5.725639343261719,
        "pssTotalMb": 234.25,
        "pssApp": 129.232421875,
        "pssRenderer": 105.017578125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.40000000002328306,
        "domP50": 5.399999999965075,
        "domP95": 6.7000000000116415
      },
      "edit_d4": {
        "emitP50": 0.3999999999650754,
        "emitP95": 1.3999999999650754,
        "domP50": 1.8999999999650754,
        "domP95": 7.2999999999883585
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.2000000000116415,
        "domP50": 1.1000000000349246,
        "domP95": 10
      },
      "loadCycle": {
        "emitP50": 12.600000000034925,
        "emitP95": 32.70000000001164,
        "domP50": 13.5,
        "domP95": 33.100000000034925
      },
      "step": {
        "emitP50": 0.3999999999650754,
        "emitP95": 1.2000000000116415,
        "domP50": 3.599999999976717,
        "domP95": 8
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 1.2000000000116415,
        "domP50": 0.29999999998835847,
        "domP95": 1.2999999999883585
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8999999999650754,
        "domP50": 0.8999999999650754,
        "domP95": 5.100000000034925
      },
      "heapMb": 3.9357986450195312,
      "heapCode": 1.9239273071289062,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 225.8291015625,
      "pssApp": 127.94140625,
      "pssRenderer": 97.8876953125,
      "relaunchReadyMs": 1291.7000000000116,
      "relaunchHeapMb": 3.2581748962402344,
      "relaunchHeapCode": 1.4549140930175781,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.900000000023283,
          "emitP95": 17,
          "domP50": 10.200000000011642,
          "domP95": 19.399999999965075
        },
        "setKeys": {
          "emitP50": 8.700000000011642,
          "emitP95": 17.800000000046566,
          "domP50": 9.599999999976717,
          "domP95": 18.100000000034925
        },
        "replace": {
          "emitP50": 9.599999999976717,
          "emitP95": 24.099999999976717,
          "domP50": 10,
          "domP95": 24.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.800000000046566,
          "lagP95": 17,
          "endLag": 8.600000000034925,
          "maxBacklog": 2
        },
        "heapMb": 5.048576354980469,
        "heapCode": 2.993022918701172,
        "heapData": 1.6158714294433594,
        "pssTotalMb": 235.734375,
        "pssApp": 133.3505859375,
        "pssRenderer": 102.3837890625,
        "control": {
          "emitP50": 6.2000000000116415,
          "emitP95": 18.29999999998836,
          "domP50": 7.099999999976717,
          "domP95": 18.600000000034925
        },
        "fCommitP50": 3,
        "fCommitP95": 6.5
      },
      "500": {
        "setKey": {
          "emitP50": 8.200000000011642,
          "emitP95": 21.5,
          "domP50": 8.700000000011642,
          "domP95": 22
        },
        "setKeys": {
          "emitP50": 9.100000000034925,
          "emitP95": 12,
          "domP50": 10.299999999988358,
          "domP95": 12.599999999976717
        },
        "replace": {
          "emitP50": 7.5,
          "emitP95": 10.899999999965075,
          "domP50": 8.199999999953434,
          "domP95": 11.299999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.100000000034925,
          "lagP95": 12.400000000023283,
          "endLag": 8.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.539085388183594,
        "heapCode": 3.0143051147460938,
        "heapData": 2.0686569213867188,
        "pssTotalMb": 237.1318359375,
        "pssApp": 133.9375,
        "pssRenderer": 103.1943359375,
        "control": {
          "emitP50": 5.900000000023283,
          "emitP95": 14.700000000011642,
          "domP50": 6,
          "domP95": 14.900000000023283
        },
        "fCommitP50": 3.2999999999883585,
        "fCommitP95": 5.899999999965075
      },
      "5000": {
        "setKey": {
          "emitP50": 8.900000000023283,
          "emitP95": 20.70000000001164,
          "domP50": 9.900000000023283,
          "domP95": 21.800000000046566
        },
        "setKeys": {
          "emitP50": 9.800000000046566,
          "emitP95": 16.5,
          "domP50": 10.300000000046566,
          "domP95": 17.600000000034925
        },
        "replace": {
          "emitP50": 12.400000000023283,
          "emitP95": 29.300000000046566,
          "domP50": 12.799999999988358,
          "domP95": 29.600000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.200000000011642,
          "lagP95": 18.800000000046566,
          "endLag": 7.2999999999883585,
          "maxBacklog": 2
        },
        "heapMb": 9.91558837890625,
        "heapCode": 3.0579833984375,
        "heapData": 6.260440826416016,
        "pssTotalMb": 246.0712890625,
        "pssApp": 137.4345703125,
        "pssRenderer": 108.63671875,
        "control": {
          "emitP50": 5.5,
          "emitP95": 10,
          "domP50": 5.7999999999883585,
          "domP95": 10.299999999988358
        },
        "fCommitP50": 3.1000000000349246,
        "fCommitP95": 13.599999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.200000000011642,
        "emitP95": 19.29999999998836,
        "domP50": 8.5,
        "domP95": 20.5
      },
      "edit_d4": {
        "emitP50": 8.700000000011642,
        "emitP95": 17.70000000001164,
        "domP50": 9.800000000046566,
        "domP95": 18.5
      },
      "edit_d10": {
        "emitP50": 7.300000000046566,
        "emitP95": 20.899999999965075,
        "domP50": 8.200000000011642,
        "domP95": 21.399999999965075
      },
      "loadCycle": {
        "emitP50": 15.799999999988358,
        "emitP95": 54.20000000001164,
        "domP50": 16.70000000001164,
        "domP95": 54.600000000034925
      },
      "step": {
        "emitP50": 8.099999999976717,
        "emitP95": 15.299999999988358,
        "domP50": 8.899999999965075,
        "domP95": 15.799999999988358
      },
      "reset": {
        "emitP50": 27.900000000023283,
        "emitP95": 105,
        "domP50": 27.900000000023283,
        "domP95": 105
      },
      "append100": {
        "emitP50": 12.599999999976717,
        "emitP95": 37,
        "domP50": 12.899999999965075,
        "domP95": 37.29999999998836
      },
      "control": {
        "emitP50": 5.5,
        "emitP95": 17.900000000023283,
        "domP50": 5.7000000000116415,
        "domP95": 18.20000000001164
      },
      "heapMb": 5.496189117431641,
      "heapCode": 3.181121826171875,
      "heapData": 1.8672447204589844,
      "pssTotalMb": 240.5126953125,
      "pssApp": 136.1787109375,
      "pssRenderer": 104.333984375,
      "relaunchReadyMs": 880,
      "relaunchHeapMb": 4.067108154296875,
      "relaunchHeapCode": 2.070140838623047,
      "relaunchHeapData": 1.6157264709472656
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.399999999965075,
          "emitP95": 22.5,
          "domP50": 10,
          "domP95": 22.800000000046566
        },
        "setKeys": {
          "emitP50": 9.599999999976717,
          "emitP95": 18.100000000034925,
          "domP50": 10.099999999976717,
          "domP95": 18.5
        },
        "replace": {
          "emitP50": 6.2000000000116415,
          "emitP95": 13.899999999965075,
          "domP50": 7.400000000023283,
          "domP95": 14.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 10.800000000046566,
          "endLag": 5.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 5.037281036376953,
        "heapCode": 2.9825897216796875,
        "heapData": 1.6156997680664062,
        "pssTotalMb": 235.9560546875,
        "pssApp": 133.615234375,
        "pssRenderer": 102.3408203125,
        "control": {
          "emitP50": 5.599999999976717,
          "emitP95": 15.799999999988358,
          "domP50": 5.900000000023283,
          "domP95": 16
        },
        "fCommitP50": 3,
        "fCommitP95": 8.400000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 7.699999999953434,
          "emitP95": 26.29999999998836,
          "domP50": 8.099999999976717,
          "domP95": 27
        },
        "setKeys": {
          "emitP50": 11.200000000011642,
          "emitP95": 20.599999999976717,
          "domP50": 11.600000000034925,
          "domP95": 20.899999999965075
        },
        "replace": {
          "emitP50": 7.199999999953434,
          "emitP95": 17.70000000001164,
          "domP50": 7.5,
          "domP95": 18.70000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.2000000000116415,
          "lagP95": 17.79999999998836,
          "endLag": 10.300000000046566,
          "maxBacklog": 2
        },
        "heapMb": 5.5279541015625,
        "heapCode": 3.0040817260742188,
        "heapData": 2.0686569213867188,
        "pssTotalMb": 236.8671875,
        "pssApp": 133.8642578125,
        "pssRenderer": 103.0029296875,
        "control": {
          "emitP50": 5.600000000034925,
          "emitP95": 16.70000000001164,
          "domP50": 5.900000000023283,
          "domP95": 16.899999999965075
        },
        "fCommitP50": 3.2000000000116415,
        "fCommitP95": 10.600000000034925
      },
      "5000": {
        "setKey": {
          "emitP50": 10.200000000011642,
          "emitP95": 27.400000000023283,
          "domP50": 10.799999999988358,
          "domP95": 27.900000000023283
        },
        "setKeys": {
          "emitP50": 9,
          "emitP95": 18.5,
          "domP50": 9.299999999988358,
          "domP95": 19.29999999998836
        },
        "replace": {
          "emitP50": 12.799999999988358,
          "emitP95": 28.899999999965075,
          "domP50": 13.399999999965075,
          "domP95": 29.399999999965075
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.800000000046566,
          "lagP95": 20.600000000034925,
          "endLag": 9.100000000034925,
          "maxBacklog": 2
        },
        "heapMb": 9.924942016601562,
        "heapCode": 3.06634521484375,
        "heapData": 6.26043701171875,
        "pssTotalMb": 244.8271484375,
        "pssApp": 136.2578125,
        "pssRenderer": 108.5693359375,
        "control": {
          "emitP50": 5,
          "emitP95": 26.29999999998836,
          "domP50": 5.2000000000116415,
          "domP95": 26.599999999976717
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 8.300000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.099999999976717,
        "emitP95": 14.5,
        "domP50": 8.20000000006985,
        "domP95": 15
      },
      "edit_d4": {
        "emitP50": 7.700000000069849,
        "emitP95": 15.699999999953434,
        "domP50": 8.099999999976717,
        "domP95": 16.099999999976717
      },
      "edit_d10": {
        "emitP50": 7.400000000023283,
        "emitP95": 18.199999999953434,
        "domP50": 7.900000000023283,
        "domP95": 18.599999999976717
      },
      "loadCycle": {
        "emitP50": 10.800000000046566,
        "emitP95": 49.699999999953434,
        "domP50": 11,
        "domP95": 50
      },
      "step": {
        "emitP50": 7.699999999953434,
        "emitP95": 15.399999999906868,
        "domP50": 8.199999999953434,
        "domP95": 15.699999999953434
      },
      "reset": {
        "emitP50": 24.5,
        "emitP95": 31.199999999953434,
        "domP50": 24.599999999976717,
        "domP95": 31.199999999953434
      },
      "append100": {
        "emitP50": 13.79999999993015,
        "emitP95": 16.5,
        "domP50": 14.099999999976717,
        "domP95": 16.899999999906868
      },
      "control": {
        "emitP50": 6.100000000093132,
        "emitP95": 18.300000000046566,
        "domP50": 6.5,
        "domP95": 18.600000000093132
      },
      "heapMb": 5.490940093994141,
      "heapCode": 3.179218292236328,
      "heapData": 1.86419677734375,
      "pssTotalMb": 238.3818359375,
      "pssApp": 134.0693359375,
      "pssRenderer": 104.3125,
      "relaunchReadyMs": 347.89999999990687,
      "relaunchHeapMb": 4.53546142578125,
      "relaunchHeapCode": 2.3274002075195312,
      "relaunchHeapData": 1.8299789428710938
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.099999999976717,
          "domP50": 2.599999999976717,
          "domP95": 8.899999999906868
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.199999999953434,
          "domP50": 4.099999999976717,
          "domP95": 10.29999999993015
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 3.599999999976717,
          "domP50": 1.099999999976717,
          "domP95": 14.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.5639114379882812,
        "heapCode": 1.68896484375,
        "heapData": 1.5024337768554688,
        "pssTotalMb": 221.671875,
        "pssApp": 126.1240234375,
        "pssRenderer": 95.5478515625
      },
      "500": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7999999999301508,
          "domP50": 5.599999999976717,
          "domP95": 8.20000000006985
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1,
          "domP50": 1.3000000000465661,
          "domP95": 15.199999999953434
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5999999999767169,
          "domP50": 0.9000000000232831,
          "domP95": 7.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7999999999301508,
          "endLag": 0.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 4.133705139160156,
        "heapCode": 1.8507614135742188,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 228.806640625,
        "pssApp": 128.4072265625,
        "pssRenderer": 100.3994140625
      },
      "5000": {
        "setKey": {
          "emitP50": 1,
          "emitP95": 2,
          "domP50": 6.699999999953434,
          "domP95": 7.800000000046566
        },
        "setKeys": {
          "emitP50": 1.6999999999534339,
          "emitP95": 8.5,
          "domP50": 2.8999999999068677,
          "domP95": 13.599999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.599999999976717,
          "domP50": 2,
          "domP95": 8.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 1.8000000000465661,
          "endLag": 1.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 8.099552154541016,
        "heapCode": 1.8474235534667969,
        "heapData": 5.725639343261719,
        "pssTotalMb": 231.3056640625,
        "pssApp": 126.7001953125,
        "pssRenderer": 104.60546875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5,
        "domP50": 5.5,
        "domP95": 6.5
      },
      "edit_d4": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.5,
        "domP50": 0.9000000000232831,
        "domP95": 8.699999999953434
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 1.2000000000698492,
        "domP95": 6.400000000023283
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 33.699999999953434,
        "domP50": 0.5999999999767169,
        "domP95": 34.199999999953434
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 2.400000000023283,
        "domP50": 1.099999999976717,
        "domP95": 6.900000000023283
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 0.5,
        "domP50": 0.2999999999301508,
        "domP95": 2.099999999976717
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 7.099999999976717,
        "domP50": 0.9000000000232831,
        "domP95": 7.600000000093132
      },
      "heapMb": 3.9364166259765625,
      "heapCode": 1.9246788024902344,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 225.8671875,
      "pssApp": 127.814453125,
      "pssRenderer": 98.052734375,
      "relaunchReadyMs": 1285,
      "relaunchHeapMb": 3.258167266845703,
      "relaunchHeapCode": 1.4548759460449219,
      "relaunchHeapData": 1.443756103515625
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.40000000002328306,
          "domP50": 5.299999999930151,
          "domP95": 7.400000000023283
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.900000000023283,
          "domP50": 3.900000000023283,
          "domP95": 9.400000000023283
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.8000000000465661,
          "domP50": 0.8000000000465661,
          "domP95": 9.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.9000000000232831,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.7224807739257812,
        "heapCode": 1.8428268432617188,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 225.21875,
        "pssApp": 128.55078125,
        "pssRenderer": 96.66796875
      },
      "500": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1,
          "domP50": 5.800000000046566,
          "domP95": 6.700000000069849
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 10.300000000046566,
          "domP50": 5.300000000046566,
          "domP95": 10.900000000023283
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.299999999930151,
          "domP50": 1.2000000000698492,
          "domP95": 12.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7999999999301508,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.134990692138672,
        "heapCode": 1.8520050048828125,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 228.7099609375,
        "pssApp": 128.5224609375,
        "pssRenderer": 100.1875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.900000000023283,
          "emitP95": 7.899999999906868,
          "domP50": 3.299999999930151,
          "domP95": 13
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 3,
          "domP50": 3.199999999953434,
          "domP95": 8.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.2999999999301508,
          "domP50": 1.400000000023283,
          "domP95": 14.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999301508,
          "lagP95": 2.1000000000931323,
          "endLag": 1.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 8.096946716308594,
        "heapCode": 1.8453941345214844,
        "heapData": 5.725063323974609,
        "pssTotalMb": 236.1396484375,
        "pssApp": 130.2080078125,
        "pssRenderer": 105.931640625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1999999999534339,
        "domP50": 1.6999999999534339,
        "domP95": 9
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7999999999301508,
        "domP50": 1.3999999999068677,
        "domP95": 8.199999999953434
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.5,
        "domP50": 1.8000000000465661,
        "domP95": 7.800000000046566
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 35.199999999953434,
        "domP50": 2.799999999930151,
        "domP95": 35.699999999953434
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.8000000000465661,
        "domP50": 1.900000000023283,
        "domP95": 11.20000000006985
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.8000000000465661,
        "domP50": 0.2999999999301508,
        "domP95": 2.900000000023283
      },
      "append100": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.40000000002328306,
        "domP50": 0.8000000000465661,
        "domP95": 5.799999999930151
      },
      "heapMb": 3.9353599548339844,
      "heapCode": 1.9236526489257812,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 228.748046875,
      "pssApp": 129.9091796875,
      "pssRenderer": 98.8388671875,
      "relaunchReadyMs": 619.1999999999534,
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
          "emitP50": 7.400000000023283,
          "emitP95": 16.5,
          "domP50": 8.5,
          "domP95": 16.79999999993015
        },
        "setKeys": {
          "emitP50": 8.099999999976717,
          "emitP95": 18,
          "domP50": 9.300000000046566,
          "domP95": 18.5
        },
        "replace": {
          "emitP50": 7.300000000046566,
          "emitP95": 17.300000000046566,
          "domP50": 7.900000000023283,
          "domP95": 17.600000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.199999999953434,
          "lagP95": 15.099999999976717,
          "endLag": 6,
          "maxBacklog": 2
        },
        "heapMb": 5.046092987060547,
        "heapCode": 2.991077423095703,
        "heapData": 1.6156997680664062,
        "pssTotalMb": 238.576171875,
        "pssApp": 135.158203125,
        "pssRenderer": 103.41796875,
        "control": {
          "emitP50": 6.699999999953434,
          "emitP95": 15.300000000046566,
          "domP50": 7.299999999930151,
          "domP95": 15.599999999976717
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 5.5
      },
      "500": {
        "setKey": {
          "emitP50": 6.800000000046566,
          "emitP95": 19.70000000006985,
          "domP50": 7.399999999906868,
          "domP95": 20.5
        },
        "setKeys": {
          "emitP50": 9.900000000023283,
          "emitP95": 24.300000000046566,
          "domP50": 10.5,
          "domP95": 24.599999999976717
        },
        "replace": {
          "emitP50": 8.5,
          "emitP95": 13,
          "domP50": 9.5,
          "domP95": 13.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.700000000069849,
          "lagP95": 15.699999999953434,
          "endLag": 5.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.53753662109375,
        "heapCode": 3.012714385986328,
        "heapData": 2.068653106689453,
        "pssTotalMb": 239.5341796875,
        "pssApp": 135.25390625,
        "pssRenderer": 104.2802734375,
        "control": {
          "emitP50": 4.900000000023283,
          "emitP95": 12.5,
          "domP50": 5.100000000093132,
          "domP95": 12.699999999953434
        },
        "fCommitP50": 3.299999999930151,
        "fCommitP95": 7.099999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 8.5,
          "emitP95": 20.800000000046566,
          "domP50": 9.20000000006985,
          "domP95": 21.400000000023283
        },
        "setKeys": {
          "emitP50": 12.900000000023283,
          "emitP95": 23.699999999953434,
          "domP50": 13.599999999976717,
          "domP95": 24.199999999953434
        },
        "replace": {
          "emitP50": 13,
          "emitP95": 20.900000000023283,
          "domP50": 13.600000000093132,
          "domP95": 22.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.5,
          "lagP95": 14.400000000023283,
          "endLag": 13.29999999993015,
          "maxBacklog": 2
        },
        "heapMb": 9.924652099609375,
        "heapCode": 3.0660247802734375,
        "heapData": 6.260440826416016,
        "pssTotalMb": 247.654296875,
        "pssApp": 138.26171875,
        "pssRenderer": 109.392578125,
        "control": {
          "emitP50": 5.200000000069849,
          "emitP95": 15.099999999976717,
          "domP50": 5.599999999976717,
          "domP95": 15.5
        },
        "fCommitP50": 3.1000000000931323,
        "fCommitP95": 6.099999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 6.900000000023283,
        "emitP95": 18.800000000046566,
        "domP50": 7.5,
        "domP95": 19.400000000023283
      },
      "edit_d4": {
        "emitP50": 7.200000000069849,
        "emitP95": 12.900000000023283,
        "domP50": 8.5,
        "domP95": 14.099999999976717
      },
      "edit_d10": {
        "emitP50": 8.29999999993015,
        "emitP95": 15.899999999906868,
        "domP50": 8.699999999953434,
        "domP95": 22.399999999906868
      },
      "loadCycle": {
        "emitP50": 15.300000000046566,
        "emitP95": 51.800000000046566,
        "domP50": 15.400000000023283,
        "domP95": 52.300000000046566
      },
      "step": {
        "emitP50": 6.799999999930151,
        "emitP95": 16.199999999953434,
        "domP50": 7,
        "domP95": 16.5
      },
      "reset": {
        "emitP50": 23.699999999953434,
        "emitP95": 32.5,
        "domP50": 23.699999999953434,
        "domP95": 32.5
      },
      "append100": {
        "emitP50": 13.79999999993015,
        "emitP95": 63.199999999953434,
        "domP50": 14.199999999953434,
        "domP95": 63.5
      },
      "control": {
        "emitP50": 6.400000000023283,
        "emitP95": 15,
        "domP50": 6.700000000069849,
        "domP95": 15.5
      },
      "heapMb": 5.487323760986328,
      "heapCode": 3.1758460998535156,
      "heapData": 1.8641929626464844,
      "pssTotalMb": 241.3271484375,
      "pssApp": 136.1044921875,
      "pssRenderer": 105.22265625,
      "relaunchReadyMs": 366.0999999999767,
      "relaunchHeapMb": 4.5292816162109375,
      "relaunchHeapCode": 2.321056365966797,
      "relaunchHeapData": 1.8300361633300781
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.800000000046566,
          "emitP95": 17.099999999976717,
          "domP50": 8.099999999976717,
          "domP95": 18
        },
        "setKeys": {
          "emitP50": 7.699999999953434,
          "emitP95": 21.5,
          "domP50": 8.199999999953434,
          "domP95": 21.79999999993015
        },
        "replace": {
          "emitP50": 8.900000000023283,
          "emitP95": 14,
          "domP50": 9.5,
          "domP95": 14.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 14.900000000023283,
          "endLag": 6.099999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.0379486083984375,
        "heapCode": 2.9829025268554688,
        "heapData": 1.6156997680664062,
        "pssTotalMb": 238.8564453125,
        "pssApp": 135.5009765625,
        "pssRenderer": 103.35546875,
        "control": {
          "emitP50": 5.5,
          "emitP95": 15.400000000023283,
          "domP50": 6.199999999953434,
          "domP95": 15.800000000046566
        },
        "fCommitP50": 3.299999999930151,
        "fCommitP95": 7
      },
      "500": {
        "setKey": {
          "emitP50": 9,
          "emitP95": 22.20000000006985,
          "domP50": 9.300000000046566,
          "domP95": 22.70000000006985
        },
        "setKeys": {
          "emitP50": 9,
          "emitP95": 19.800000000046566,
          "domP50": 9.599999999976717,
          "domP95": 20.300000000046566
        },
        "replace": {
          "emitP50": 8.20000000006985,
          "emitP95": 15.600000000093132,
          "domP50": 8.70000000006985,
          "domP95": 16.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.200000000069849,
          "lagP95": 15.099999999976717,
          "endLag": 5.199999999953434,
          "maxBacklog": 2
        },
        "heapMb": 5.5389404296875,
        "heapCode": 3.0147018432617188,
        "heapData": 2.0683860778808594,
        "pssTotalMb": 239.716796875,
        "pssApp": 135.578125,
        "pssRenderer": 104.138671875,
        "control": {
          "emitP50": 9,
          "emitP95": 29.800000000046566,
          "domP50": 9.300000000046566,
          "domP95": 30
        },
        "fCommitP50": 3.6000000000931323,
        "fCommitP95": 11.400000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 10.79999999993015,
          "emitP95": 19.800000000046566,
          "domP50": 11.599999999976717,
          "domP95": 20.400000000023283
        },
        "setKeys": {
          "emitP50": 9.599999999976717,
          "emitP95": 17.599999999976717,
          "domP50": 10.5,
          "domP95": 18.099999999976717
        },
        "replace": {
          "emitP50": 12.5,
          "emitP95": 23.300000000046566,
          "domP50": 13,
          "domP95": 23.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9,
          "lagP95": 18.900000000023283,
          "endLag": 6.199999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.92135238647461,
        "heapCode": 3.0633926391601562,
        "heapData": 6.26031494140625,
        "pssTotalMb": 247.7099609375,
        "pssApp": 137.8935546875,
        "pssRenderer": 109.81640625,
        "control": {
          "emitP50": 5.699999999953434,
          "emitP95": 17.900000000023283,
          "domP50": 6,
          "domP95": 18.100000000093132
        },
        "fCommitP50": 3.5,
        "fCommitP95": 6.299999999930151
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.5,
        "emitP95": 19.900000000023283,
        "domP50": 7.800000000046566,
        "domP95": 20.800000000046566
      },
      "edit_d4": {
        "emitP50": 6.799999999930151,
        "emitP95": 20.20000000006985,
        "domP50": 7.399999999906868,
        "domP95": 20.5
      },
      "edit_d10": {
        "emitP50": 7.300000000046566,
        "emitP95": 16.199999999953434,
        "domP50": 7.900000000023283,
        "domP95": 16.5
      },
      "loadCycle": {
        "emitP50": 16.20000000006985,
        "emitP95": 52.199999999953434,
        "domP50": 16.400000000023283,
        "domP95": 52.79999999993015
      },
      "step": {
        "emitP50": 7.199999999953434,
        "emitP95": 15,
        "domP50": 7.5,
        "domP95": 15.399999999906868
      },
      "reset": {
        "emitP50": 29.800000000046566,
        "emitP95": 91.09999999997672,
        "domP50": 29.800000000046566,
        "domP95": 91.19999999995343
      },
      "append100": {
        "emitP50": 12.699999999953434,
        "emitP95": 21,
        "domP50": 13,
        "domP95": 21.400000000023283
      },
      "control": {
        "emitP50": 5.5,
        "emitP95": 16.099999999976717,
        "domP50": 5.800000000046566,
        "domP95": 17.099999999976717
      },
      "heapMb": 5.493434906005859,
      "heapCode": 3.1784286499023438,
      "heapData": 1.86724853515625,
      "pssTotalMb": 242.908203125,
      "pssApp": 137.603515625,
      "pssRenderer": 105.3046875,
      "relaunchReadyMs": 882.5,
      "relaunchHeapMb": 4.438137054443359,
      "relaunchHeapCode": 2.2348785400390625,
      "relaunchHeapData": 1.8275413513183594
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7999999999301508,
          "domP50": 1.5,
          "domP95": 9
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.3999999999068677,
          "domP50": 2.200000000069849,
          "domP95": 6.800000000046566
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.2999999999301508,
          "domP50": 1.099999999976717,
          "domP95": 7.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.724071502685547,
        "heapCode": 1.8443450927734375,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 228.25390625,
        "pssApp": 130.564453125,
        "pssRenderer": 97.689453125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 2,
          "domP50": 5.5,
          "domP95": 10.099999999976717
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.5,
          "domP50": 1.1999999999534339,
          "domP95": 6.400000000023283
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1,
          "domP50": 1.2999999999301508,
          "domP95": 12.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6000000000931323,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.9748153686523438,
        "heapCode": 1.6966629028320312,
        "heapData": 1.8917236328125,
        "pssTotalMb": 228.1923828125,
        "pssApp": 127.7060546875,
        "pssRenderer": 100.486328125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.5,
          "emitP95": 2.099999999976717,
          "domP50": 3.599999999976717,
          "domP95": 8.699999999953434
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 10,
          "domP50": 3.200000000069849,
          "domP95": 12
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.5999999999767169,
          "domP50": 1.400000000023283,
          "domP95": 5.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2000000000698492,
          "lagP95": 2.400000000023283,
          "endLag": 0.9000000000232831,
          "maxBacklog": 0
        },
        "heapMb": 8.097808837890625,
        "heapCode": 1.8455162048339844,
        "heapData": 5.725639343261719,
        "pssTotalMb": 236.8271484375,
        "pssApp": 130.6396484375,
        "pssRenderer": 106.1875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 4.100000000093132,
        "domP50": 4.900000000023283,
        "domP95": 11.300000000046566
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.599999999976717,
        "domP50": 5,
        "domP95": 9.20000000006985
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 1.400000000023283,
        "domP95": 7.800000000046566
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 35.90000000002328,
        "domP50": 0.7000000000698492,
        "domP95": 36.300000000046566
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6999999999534339,
        "domP50": 0.7999999999301508,
        "domP95": 5
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5,
        "domP50": 0.2999999999301508,
        "domP95": 1.5
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.5999999999767169,
        "domP50": 0.8000000000465661,
        "domP95": 4.5
      },
      "heapMb": 3.9370346069335938,
      "heapCode": 1.9251213073730469,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 229.076171875,
      "pssApp": 129.865234375,
      "pssRenderer": 99.2109375,
      "relaunchReadyMs": 1330.7000000000698,
      "relaunchHeapMb": 3.2581520080566406,
      "relaunchHeapCode": 1.4548759460449219,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.5,
          "domP50": 5.100000000093132,
          "domP95": 7.200000000069849
        },
        "setKeys": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.7000000000698492,
          "domP50": 1,
          "domP95": 11.099999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7000000000698492,
          "domP50": 1.2000000000698492,
          "domP95": 7.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.5639877319335938,
        "heapCode": 1.6890411376953125,
        "heapData": 1.5024337768554688,
        "pssTotalMb": 224.53125,
        "pssApp": 127.8623046875,
        "pssRenderer": 96.6689453125
      },
      "500": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5999999999767169,
          "domP50": 5.600000000093132,
          "domP95": 6.700000000069849
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 0.7000000000698492,
          "domP50": 1.1999999999534339,
          "domP95": 9.5
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.6999999999534339,
          "domP50": 1.6999999999534339,
          "domP95": 7.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.134738922119141,
        "heapCode": 1.8518409729003906,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 231.240234375,
        "pssApp": 129.8408203125,
        "pssRenderer": 101.3994140625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 2.599999999976717,
          "domP50": 3.300000000046566,
          "domP95": 7.599999999976717
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 2.199999999953434,
          "domP50": 2.900000000023283,
          "domP95": 9.199999999953434
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7000000000698492,
          "domP50": 1.5,
          "domP95": 6.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2000000000698492,
          "lagP95": 1.599999999976717,
          "endLag": 1.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 8.100128173828125,
        "heapCode": 1.8478126525878906,
        "heapData": 5.725639343261719,
        "pssTotalMb": 236.3369140625,
        "pssApp": 130.259765625,
        "pssRenderer": 106.0771484375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 1.2000000000698492,
        "domP95": 11.300000000046566
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 3.400000000023283,
        "domP95": 6.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.400000000023283,
        "domP50": 1.900000000023283,
        "domP95": 9
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 34.40000000002328,
        "domP50": 0.5999999999767169,
        "domP95": 35.09999999997672
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8999999999068677,
        "domP50": 5.099999999976717,
        "domP95": 11
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 1.6000000000931323,
        "domP50": 0.2000000000698492,
        "domP95": 1.6000000000931323
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 1.1999999999534339,
        "domP95": 6.300000000046566
      },
      "heapMb": 3.933551788330078,
      "heapCode": 1.922027587890625,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 229.0458984375,
      "pssApp": 129.794921875,
      "pssRenderer": 99.2509765625,
      "relaunchReadyMs": 1351.3000000000466,
      "relaunchHeapMb": 3.2581748962402344,
      "relaunchHeapCode": 1.4549140930175781,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.099999999976717,
          "emitP95": 23.70000000006985,
          "domP50": 8,
          "domP95": 24.70000000006985
        },
        "setKeys": {
          "emitP50": 7.5,
          "emitP95": 19.900000000023283,
          "domP50": 8,
          "domP95": 20.5
        },
        "replace": {
          "emitP50": 7.400000000023283,
          "emitP95": 19.300000000046566,
          "domP50": 7.700000000069849,
          "domP95": 19.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.199999999953434,
          "lagP95": 18.099999999976717,
          "endLag": 6.899999999906868,
          "maxBacklog": 2
        },
        "heapMb": 5.036445617675781,
        "heapCode": 2.982196807861328,
        "heapData": 1.6156997680664062,
        "pssTotalMb": 238.658203125,
        "pssApp": 135.1904296875,
        "pssRenderer": 103.4677734375,
        "control": {
          "emitP50": 6.199999999953434,
          "emitP95": 18.199999999953434,
          "domP50": 6.599999999976717,
          "domP95": 20.400000000023283
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 9.599999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 9.400000000023283,
          "emitP95": 17.599999999976717,
          "domP50": 9.699999999953434,
          "domP95": 18.300000000046566
        },
        "setKeys": {
          "emitP50": 8.79999999993015,
          "emitP95": 23.5,
          "domP50": 9.5,
          "domP95": 24
        },
        "replace": {
          "emitP50": 8.599999999976717,
          "emitP95": 25.5,
          "domP50": 8.900000000023283,
          "domP95": 26.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 15.900000000023283,
          "endLag": 7,
          "maxBacklog": 2
        },
        "heapMb": 5.537677764892578,
        "heapCode": 3.013141632080078,
        "heapData": 2.068920135498047,
        "pssTotalMb": 239.6357421875,
        "pssApp": 135.4833984375,
        "pssRenderer": 104.15234375,
        "control": {
          "emitP50": 6.800000000046566,
          "emitP95": 17.800000000046566,
          "domP50": 7.200000000069849,
          "domP95": 18.099999999976717
        },
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 6
      },
      "5000": {
        "setKey": {
          "emitP50": 9.800000000046566,
          "emitP95": 21,
          "domP50": 10.599999999976717,
          "domP95": 22.099999999976717
        },
        "setKeys": {
          "emitP50": 11.599999999976717,
          "emitP95": 23.300000000046566,
          "domP50": 12,
          "domP95": 23.70000000006985
        },
        "replace": {
          "emitP50": 13.300000000046566,
          "emitP95": 27.199999999953434,
          "domP50": 13.800000000046566,
          "domP95": 27.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.800000000046566,
          "lagP95": 14.79999999993015,
          "endLag": 7.299999999930151,
          "maxBacklog": 2
        },
        "heapMb": 9.911052703857422,
        "heapCode": 3.053985595703125,
        "heapData": 6.260337829589844,
        "pssTotalMb": 247.56640625,
        "pssApp": 137.96484375,
        "pssRenderer": 109.6015625,
        "control": {
          "emitP50": 5.300000000046566,
          "emitP95": 22.199999999953434,
          "domP50": 5.599999999976717,
          "domP95": 22.5
        },
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 9
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8,
        "emitP95": 15.70000000006985,
        "domP50": 8.599999999976717,
        "domP95": 16.199999999953434
      },
      "edit_d4": {
        "emitP50": 7.400000000023283,
        "emitP95": 19.199999999953434,
        "domP50": 8.099999999976717,
        "domP95": 19.599999999976717
      },
      "edit_d10": {
        "emitP50": 7.800000000046566,
        "emitP95": 16.79999999993015,
        "domP50": 8.20000000006985,
        "domP95": 17.29999999993015
      },
      "loadCycle": {
        "emitP50": 20.70000000006985,
        "emitP95": 49.10000000009313,
        "domP50": 21,
        "domP95": 49.5
      },
      "step": {
        "emitP50": 6.800000000046566,
        "emitP95": 17.79999999993015,
        "domP50": 7.800000000046566,
        "domP95": 18.199999999953434
      },
      "reset": {
        "emitP50": 24.5,
        "emitP95": 38.59999999997672,
        "domP50": 24.5,
        "domP95": 38.59999999997672
      },
      "append100": {
        "emitP50": 12.400000000023283,
        "emitP95": 60,
        "domP50": 12.70000000006985,
        "domP95": 60.20000000006985
      },
      "control": {
        "emitP50": 5.5,
        "emitP95": 14.599999999976717,
        "domP50": 6,
        "domP95": 14.79999999993015
      },
      "heapMb": 5.488677978515625,
      "heapCode": 3.1767501831054688,
      "heapData": 1.8642234802246094,
      "pssTotalMb": 241.8671875,
      "pssApp": 136.482421875,
      "pssRenderer": 105.384765625,
      "relaunchReadyMs": 875.8000000000466,
      "relaunchHeapMb": 4.328136444091797,
      "relaunchHeapCode": 2.125946044921875,
      "relaunchHeapData": 1.8262786865234375
    }
  }
]
```
</details>
