# Phase 16 shapes — flat objects & hybrid workflow (2026-10-29)

Measured alone on `emulator-5556` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.53 ms, p95 8.03 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 3 / PLATFORM-BOUND 54 / CODE-BOUND 0 / FAIL 29

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.40 ± 0.00 | 10.34 ± 0.99 | 25.8× | FAIL | allow 8.3 (control emitP50 7.3×1) |
| flat | 50.setKey.emitP95 | 1.92 ± 0.94 | 20.68 ± 3.48 | 10.8× | PLATFORM-BOUND | allow 25.3 (control emitP95 20.8×1) |
| flat | 50.setKey.domP50 | 3.24 ± 1.51 | 10.86 ± 1.10 | 3.4× | PLATFORM-BOUND | allow 10.3 (control domP50 7.7×1) |
| flat | 50.setKey.domP95 | 8.84 ± 2.93 | 21.88 ± 4.21 | 2.5× | PLATFORM-BOUND | allow 28.4 (control domP95 21.3×1) |
| flat | 50.setKeys.emitP50 | 0.40 ± 0.07 | 9.40 ± 1.54 | 23.5× | FAIL | allow 8.9 (control emitP50 7.3×1) |
| flat | 50.setKeys.emitP95 | 3.52 ± 3.02 | 25.68 ± 4.33 | 7.3× | PLATFORM-BOUND | allow 28.2 (control emitP95 20.8×1) |
| flat | 50.setKeys.domP50 | 2.90 ± 2.37 | 9.94 ± 1.64 | 3.4× | PLATFORM-BOUND | allow 11.7 (control domP50 7.7×1) |
| flat | 50.setKeys.domP95 | 10.00 ± 3.01 | 26.14 ± 4.29 | 2.6× | PLATFORM-BOUND | allow 28.6 (control domP95 21.3×1) |
| flat | 50.replace.emitP50 | 0.36 ± 0.05 | 7.74 ± 0.55 | 21.5× | PLATFORM-BOUND | allow 7.9 (control emitP50 7.3×1) |
| flat | 50.replace.emitP95 | 1.84 ± 0.98 | 27.06 ± 3.78 | 14.7× | PLATFORM-BOUND | allow 25.6 (control emitP95 20.8×1) |
| flat | 50.replace.domP50 | 2.80 ± 2.29 | 8.38 ± 0.43 | 3.0× | PLATFORM-BOUND | allow 10.4 (control domP50 7.7×1) |
| flat | 50.replace.domP95 | 11.66 ± 3.86 | 27.58 ± 3.79 | 2.4× | PLATFORM-BOUND | allow 28.9 (control domP95 21.3×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 6.46 ± 0.64 | 21.5× | PLATFORM-BOUND | allow 8.0 (control emitP50 7.3×1) |
| flat | 50.burst.lagP95 | 0.62 ± 0.11 | 20.02 ± 2.19 | 32.3× | PLATFORM-BOUND | allow 23.1 (control emitP95 20.8×1) |
| flat | 50.burst.endLag | 0.24 ± 0.05 | 7.82 ± 2.53 | 32.6× | PLATFORM-BOUND | allow 9.9 (control emitP50 7.3×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 50.heapMb | 3.72 ± 0.00 | 5.06 ± 0.01 | 1.4× | FAIL | code +1.16 MB; data 1.51 -> 1.62 MB |
| flat | 50.pssTotalMb | 223.02 ± 1.78 | 235.00 ± 1.34 | 1.1× | FAIL | allow 5.9 (plugin baseline 2.8 MB) |
| flat | 500.setKey.emitP50 | 0.44 ± 0.11 | 9.24 ± 1.37 | 21.0× | FAIL | allow 8.6 (control emitP50 7.1×1) |
| flat | 500.setKey.emitP95 | 1.06 ± 0.45 | 24.16 ± 3.19 | 22.8× | PLATFORM-BOUND | allow 26.4 (control emitP95 22.8×1) |
| flat | 500.setKey.domP50 | 5.14 ± 1.48 | 10.08 ± 1.25 | 2.0× | PLATFORM-BOUND | allow 10.2 (control domP50 7.5×1) |
| flat | 500.setKey.domP95 | 8.56 ± 2.54 | 24.56 ± 3.26 | 2.9× | PLATFORM-BOUND | allow 29.0 (control domP95 23.2×1) |
| flat | 500.setKeys.emitP50 | 0.46 ± 0.05 | 10.50 ± 1.98 | 22.8× | FAIL | allow 9.2 (control emitP50 7.1×1) |
| flat | 500.setKeys.emitP95 | 2.76 ± 1.93 | 25.22 ± 2.60 | 9.1× | PLATFORM-BOUND | allow 27.3 (control emitP95 22.8×1) |
| flat | 500.setKeys.domP50 | 4.48 ± 1.73 | 11.00 ± 2.07 | 2.5× | PLATFORM-BOUND | allow 11.3 (control domP50 7.5×1) |
| flat | 500.setKeys.domP95 | 8.62 ± 2.22 | 27.98 ± 2.58 | 3.2× | PLATFORM-BOUND | allow 28.0 (control domP95 23.2×1) |
| flat | 500.replace.emitP50 | 0.38 ± 0.04 | 9.48 ± 1.94 | 24.9× | PLATFORM-BOUND | allow 9.1 (control emitP50 7.1×1) |
| flat | 500.replace.emitP95 | 1.48 ± 1.03 | 22.38 ± 5.39 | 15.1× | PLATFORM-BOUND | allow 29.2 (control emitP95 22.8×1) |
| flat | 500.replace.domP50 | 2.16 ± 1.83 | 10.10 ± 1.85 | 4.7× | PLATFORM-BOUND | allow 11.2 (control domP50 7.5×1) |
| flat | 500.replace.domP95 | 8.92 ± 1.81 | 22.82 ± 5.47 | 2.6× | PLATFORM-BOUND | allow 30.5 (control domP95 23.2×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 7.36 ± 0.55 | 18.4× | PLATFORM-BOUND | allow 7.7 (control emitP50 7.1×1) |
| flat | 500.burst.lagP95 | 0.72 ± 0.13 | 20.26 ± 3.87 | 28.1× | PLATFORM-BOUND | allow 26.8 (control emitP95 22.8×1) |
| flat | 500.burst.endLag | 0.40 ± 0.07 | 7.44 ± 1.99 | 18.6× | PLATFORM-BOUND | allow 9.2 (control emitP50 7.1×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.40 ± 0.55 | 2400000000.0× | FAIL |  |
| flat | 500.heapMb | 4.07 ± 0.09 | 5.55 ± 0.00 | 1.4× | FAIL | code +1.23 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 225.64 ± 2.60 | 235.24 ± 1.33 | 1.0× | FAIL | allow 6.7 (plugin baseline 2.8 MB) |
| flat | 5000.setKey.emitP50 | 1.64 ± 0.09 | 11.10 ± 0.99 | 6.8× | FAIL | allow 7.9 (control emitP50 6.8×1) |
| flat | 5000.setKey.emitP95 | 4.08 ± 1.07 | 24.36 ± 2.61 | 6.0× | PLATFORM-BOUND | allow 24.1 (control emitP95 20.4×1) |
| flat | 5000.setKey.domP50 | 3.98 ± 0.83 | 12.00 ± 0.98 | 3.0× | PLATFORM-BOUND | allow 9.0 (control domP50 7.2×1) |
| flat | 5000.setKey.domP95 | 9.50 ± 0.83 | 25.20 ± 2.87 | 2.7× | PLATFORM-BOUND | allow 24.7 (control domP95 21.0×1) |
| flat | 5000.setKeys.emitP50 | 1.54 ± 0.05 | 11.48 ± 1.66 | 7.5× | FAIL | allow 8.5 (control emitP50 6.8×1) |
| flat | 5000.setKeys.emitP95 | 6.38 ± 3.57 | 23.68 ± 3.07 | 3.7× | PLATFORM-BOUND | allow 27.1 (control emitP95 20.4×1) |
| flat | 5000.setKeys.domP50 | 4.26 ± 0.88 | 12.12 ± 1.64 | 2.8× | PLATFORM-BOUND | allow 9.7 (control domP50 7.2×1) |
| flat | 5000.setKeys.domP95 | 10.68 ± 2.80 | 24.66 ± 2.93 | 2.3× | PLATFORM-BOUND | allow 26.8 (control domP95 21.0×1) |
| flat | 5000.replace.emitP50 | 0.42 ± 0.04 | 13.94 ± 0.91 | 33.2× | FAIL | allow 7.7 (control emitP50 6.8×1) |
| flat | 5000.replace.emitP95 | 5.44 ± 7.32 | 23.52 ± 1.81 | 4.3× | PLATFORM-BOUND | allow 29.6 (control emitP95 20.4×1) |
| flat | 5000.replace.domP50 | 1.96 ± 0.45 | 14.50 ± 0.93 | 7.4× | FAIL | allow 8.6 (control domP50 7.2×1) |
| flat | 5000.replace.domP95 | 10.74 ± 5.65 | 24.98 ± 1.87 | 2.3× | PLATFORM-BOUND | allow 28.6 (control domP95 21.0×1) |
| flat | 5000.burst.lagP50 | 1.38 ± 0.08 | 8.44 ± 0.36 | 6.1× | PLATFORM-BOUND | allow 7.2 (control emitP50 6.8×1) |
| flat | 5000.burst.lagP95 | 2.10 ± 0.33 | 17.44 ± 2.71 | 8.3× | PLATFORM-BOUND | allow 23.5 (control emitP95 20.4×1) |
| flat | 5000.burst.endLag | 1.50 ± 0.21 | 11.30 ± 4.25 | 7.5× | PLATFORM-BOUND | allow 11.2 (control emitP50 6.8×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.10 ± 0.00 | 9.94 ± 0.01 | 1.2× | FAIL | code +1.23 MB; data 5.73 -> 6.26 MB |
| flat | 5000.pssTotalMb | 231.97 ± 2.03 | 249.55 ± 2.13 | 1.1× | FAIL | allow 6.9 (plugin baseline 2.8 MB) |
| workflow | edit_d1.emitP50 | 0.42 ± 0.04 | 8.64 ± 0.81 | 20.6× | FAIL | allow 8.2 (control emitP50 7.3×1) |
| workflow | edit_d1.emitP95 | 1.30 ± 0.21 | 22.66 ± 2.91 | 17.4× | PLATFORM-BOUND | allow 24.3 (control emitP95 21.2×1) |
| workflow | edit_d1.domP50 | 2.92 ± 1.41 | 9.70 ± 1.17 | 3.3× | PLATFORM-BOUND | allow 10.3 (control domP50 7.7×1) |
| workflow | edit_d1.domP95 | 11.62 ± 2.05 | 23.42 ± 2.62 | 2.0× | PLATFORM-BOUND | allow 26.1 (control domP95 21.4×1) |
| workflow | edit_d4.emitP50 | 0.40 ± 0.00 | 8.74 ± 0.92 | 21.8× | FAIL | allow 8.3 (control emitP50 7.3×1) |
| workflow | edit_d4.emitP95 | 2.40 ± 1.85 | 26.18 ± 4.85 | 10.9× | PLATFORM-BOUND | allow 27.9 (control emitP95 21.2×1) |
| workflow | edit_d4.domP50 | 3.16 ± 1.97 | 9.40 ± 0.92 | 3.0× | PLATFORM-BOUND | allow 10.6 (control domP50 7.7×1) |
| workflow | edit_d4.domP95 | 10.46 ± 1.21 | 26.90 ± 4.55 | 2.6× | PLATFORM-BOUND | allow 27.2 (control domP95 21.4×1) |
| workflow | edit_d10.emitP50 | 0.48 ± 0.04 | 8.50 ± 0.71 | 17.7× | PLATFORM-BOUND | allow 8.1 (control emitP50 7.3×1) |
| workflow | edit_d10.emitP95 | 1.40 ± 0.32 | 18.96 ± 2.26 | 13.5× | PLATFORM-BOUND | allow 23.7 (control emitP95 21.2×1) |
| workflow | edit_d10.domP50 | 4.00 ± 1.29 | 9.10 ± 0.79 | 2.3× | PLATFORM-BOUND | allow 9.8 (control domP50 7.7×1) |
| workflow | edit_d10.domP95 | 10.26 ± 2.34 | 19.62 ± 2.20 | 1.9× | PLATFORM-BOUND | allow 26.0 (control domP95 21.4×1) |
| workflow | loadCycle.emitP50 | 8.42 ± 7.28 | 15.10 ± 3.79 | 1.8× | PASS |  |
| workflow | loadCycle.emitP95 | 32.84 ± 0.66 | 58.00 ± 5.25 | 1.8× | PLATFORM-BOUND | allow 48.2 (control emitP95 21.2×2) |
| workflow | loadCycle.domP50 | 9.88 ± 8.17 | 15.36 ± 3.68 | 1.6× | PASS |  |
| workflow | loadCycle.domP95 | 33.52 ± 0.70 | 58.46 ± 5.24 | 1.7× | PLATFORM-BOUND | allow 48.8 (control domP95 21.4×2) |
| workflow | step.emitP50 | 0.34 ± 0.05 | 9.38 ± 1.04 | 27.6× | FAIL | allow 8.4 (control emitP50 7.3×1) |
| workflow | step.emitP95 | 0.92 ± 0.44 | 21.54 ± 2.12 | 23.4× | PLATFORM-BOUND | allow 23.7 (control emitP95 21.2×1) |
| workflow | step.domP50 | 2.66 ± 1.90 | 9.78 ± 1.00 | 3.7× | PLATFORM-BOUND | allow 10.6 (control domP50 7.7×1) |
| workflow | step.domP95 | 8.50 ± 1.13 | 21.90 ± 2.09 | 2.6× | PLATFORM-BOUND | allow 24.6 (control domP95 21.4×1) |
| workflow | reset.emitP50 | 0.28 ± 0.08 | 31.30 ± 5.24 | 111.8× | FAIL | allow 12.7 (control emitP50 7.3×1) |
| workflow | reset.emitP95 | 1.34 ± 1.56 | 55.80 ± 19.30 | 41.6× | FAIL | allow 42.0 (control emitP95 21.2×1) |
| workflow | reset.domP50 | 0.28 ± 0.08 | 31.32 ± 5.26 | 111.9× | FAIL | allow 13.0 (control domP50 7.7×1) |
| workflow | reset.domP95 | 1.96 ± 1.94 | 55.92 ± 19.40 | 28.5× | FAIL | allow 42.8 (control domP95 21.4×1) |
| workflow | append100.emitP50 | 0.38 ± 0.08 | 12.60 ± 1.09 | 33.2× | FAIL | allow 8.5 (control emitP50 7.3×1) |
| workflow | append100.emitP95 | 1.16 ± 0.89 | 20.40 ± 2.43 | 17.6× | PLATFORM-BOUND | allow 24.5 (control emitP95 21.2×1) |
| workflow | append100.domP50 | 1.48 ± 1.25 | 13.00 ± 1.00 | 8.8× | FAIL | allow 9.9 (control domP50 7.7×1) |
| workflow | append100.domP95 | 5.78 ± 1.80 | 20.78 ± 2.48 | 3.6× | PLATFORM-BOUND | allow 25.7 (control domP95 21.4×1) |
| workflow | heapMb | 3.87 ± 0.09 | 5.49 ± 0.01 | 1.4× | FAIL | code +1.31 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 223.68 ± 2.38 | 239.38 ± 2.01 | 1.1× | FAIL | allow 7.2 (plugin baseline 2.8 MB) |
| workflow | relaunchReadyMs | 1469.72 ± 17.10 | 921.42 ± 669.80 | 0.6× | PASS |  |
| workflow | relaunchHeapMb | 3.35 ± 0.00 | 4.49 ± 0.06 | 1.3× | FAIL | code +0.74 MB; data 1.45 -> 1.83 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 7.32 | 7.70 | 21.26 | 10.34 | 10.86 | 21.88 |
| 500 | 7.12 | 7.48 | 23.18 | 9.24 | 10.08 | 24.56 |
| 5000 | 6.78 | 7.20 | 21.04 | 11.10 | 12.00 | 25.20 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 125.9 | 131.6 | 97.1 | 103.4 |
| flat 500 | 125.2 | 131.5 | 100.4 | 103.8 |
| flat 5000 | 126.4 | 140.1 | 105.6 | 109.4 |
| workflow | 125.7 | 134.1 | 98.0 | 105.3 |

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
          "emitP95": 0.6999999999534339,
          "domP50": 2.5,
          "domP95": 7.7000000000116415
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 3.900000000023283,
          "domP50": 4.900000000023283,
          "domP95": 13.599999999976717
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 2.900000000023283,
          "domP50": 1,
          "domP95": 7
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.6000000000349246,
          "endLag": 0.29999999998835847,
          "maxBacklog": 0
        },
        "heapMb": 3.7239837646484375,
        "heapCode": 1.8442878723144531,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 220.7529296875,
        "pssApp": 124.72265625,
        "pssRenderer": 96.0302734375
      },
      "500": {
        "setKey": {
          "emitP50": 0.6000000000349246,
          "emitP95": 1.7000000000116415,
          "domP50": 6,
          "domP95": 12.800000000046566
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 3.6000000000349246,
          "domP50": 5.2999999999883585,
          "domP95": 9.200000000011642
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 1,
          "domP50": 1,
          "domP95": 6.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6000000000349246,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.9747161865234375,
        "heapCode": 1.696563720703125,
        "heapData": 1.8917236328125,
        "pssTotalMb": 221.7578125,
        "pssApp": 122.927734375,
        "pssRenderer": 98.830078125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.7000000000116415,
          "emitP95": 3.900000000023283,
          "domP50": 4.099999999976717,
          "domP95": 9.5
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 4.900000000023283,
          "domP50": 3.7000000000116415,
          "domP95": 11.399999999965075
        },
        "replace": {
          "emitP50": 0.5,
          "emitP95": 18.199999999953434,
          "domP50": 2.5,
          "domP95": 20.29999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999883585,
          "lagP95": 2.5,
          "endLag": 1.8000000000465661,
          "maxBacklog": 0
        },
        "heapMb": 8.098526000976562,
        "heapCode": 1.8467674255371094,
        "heapData": 5.725063323974609,
        "pssTotalMb": 229.673828125,
        "pssApp": 125.15234375,
        "pssRenderer": 104.521484375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.2999999999883585,
        "domP50": 1.900000000023283,
        "domP95": 14.299999999988358
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 5.600000000034925,
        "domP50": 5.399999999965075,
        "domP95": 11
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.3000000000465661,
        "domP50": 3.900000000023283,
        "domP95": 7.400000000023283
      },
      "loadCycle": {
        "emitP50": 13.5,
        "emitP95": 33.70000000001164,
        "domP50": 15.700000000011642,
        "domP95": 34
      },
      "step": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.7000000000116415,
        "domP50": 1.2000000000116415,
        "domP95": 7.599999999976717
      },
      "reset": {
        "emitP50": 0.29999999998835847,
        "emitP95": 4.099999999976717,
        "domP50": 0.29999999998835847,
        "domP95": 5.399999999965075
      },
      "append100": {
        "emitP50": 0.5,
        "emitP95": 1.1000000000349246,
        "domP50": 0.9000000000232831,
        "domP95": 3.900000000023283
      },
      "heapMb": 3.9354209899902344,
      "heapCode": 1.9237136840820312,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 222.705078125,
      "pssApp": 125.212890625,
      "pssRenderer": 97.4921875,
      "relaunchReadyMs": 1477.7999999999884,
      "relaunchHeapMb": 3.3517532348632812,
      "relaunchHeapCode": 1.5399589538574219,
      "relaunchHeapData": 1.4463119506835938
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10.200000000011642,
          "emitP95": 24.800000000046566,
          "domP50": 10.799999999988358,
          "domP95": 27.29999999998836
        },
        "setKeys": {
          "emitP50": 7.899999999965075,
          "emitP95": 26.400000000023283,
          "domP50": 8.299999999988358,
          "domP95": 26.79999999998836
        },
        "replace": {
          "emitP50": 7.900000000023283,
          "emitP95": 24.70000000001164,
          "domP50": 8.600000000034925,
          "domP95": 25.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.100000000034925,
          "lagP95": 18.899999999965075,
          "endLag": 6.600000000034925,
          "maxBacklog": 2
        },
        "heapMb": 5.064323425292969,
        "heapCode": 3.008758544921875,
        "heapData": 1.6160659790039062,
        "pssTotalMb": 234.470703125,
        "pssApp": 131.9775390625,
        "pssRenderer": 102.4931640625,
        "control": {
          "emitP50": 6.800000000046566,
          "emitP95": 23.5,
          "domP50": 7.599999999976717,
          "domP95": 24.099999999976717
        },
        "fCommitP50": 3.2999999999883585,
        "fCommitP95": 8.700000000011642
      },
      "500": {
        "setKey": {
          "emitP50": 7.900000000023283,
          "emitP95": 25.399999999965075,
          "domP50": 9.200000000011642,
          "domP95": 25.699999999953434
        },
        "setKeys": {
          "emitP50": 9.300000000046566,
          "emitP95": 25.900000000023283,
          "domP50": 9.699999999953434,
          "domP95": 27.600000000034925
        },
        "replace": {
          "emitP50": 7.5,
          "emitP95": 22,
          "domP50": 8.399999999965075,
          "domP95": 22.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.599999999976717,
          "lagP95": 21.20000000001164,
          "endLag": 5,
          "maxBacklog": 2
        },
        "heapMb": 5.546237945556641,
        "heapCode": 3.021759033203125,
        "heapData": 2.0690383911132812,
        "pssTotalMb": 233.654296875,
        "pssApp": 130.923828125,
        "pssRenderer": 102.73046875,
        "control": {
          "emitP50": 7.199999999953434,
          "emitP95": 25.29999999998836,
          "domP50": 7.2999999999883585,
          "domP95": 25.600000000034925
        },
        "fCommitP50": 3.2000000000116415,
        "fCommitP95": 10.099999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 10.799999999988358,
          "emitP95": 22.20000000001164,
          "domP50": 11.399999999965075,
          "domP95": 22.70000000001164
        },
        "setKeys": {
          "emitP50": 11.200000000011642,
          "emitP95": 27.29999999998836,
          "domP50": 11.700000000011642,
          "domP95": 27.900000000023283
        },
        "replace": {
          "emitP50": 13.599999999976717,
          "emitP95": 23.899999999965075,
          "domP50": 14.5,
          "domP95": 24.399999999965075
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 14.5,
          "endLag": 8.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.941024780273438,
        "heapCode": 3.0831069946289062,
        "heapData": 6.260822296142578,
        "pssTotalMb": 247.912109375,
        "pssApp": 139.2490234375,
        "pssRenderer": 108.6630859375,
        "control": {
          "emitP50": 6.100000000034925,
          "emitP95": 16.70000000001164,
          "domP50": 6.400000000023283,
          "domP95": 16.900000000023283
        },
        "fCommitP50": 3.7000000000116415,
        "fCommitP95": 8.399999999965075
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.5,
        "emitP95": 23.400000000023283,
        "domP50": 9,
        "domP95": 23.70000000001164
      },
      "edit_d4": {
        "emitP50": 9.299999999988358,
        "emitP95": 26.20000000001164,
        "domP50": 10,
        "domP95": 26.5
      },
      "edit_d10": {
        "emitP50": 8.400000000023283,
        "emitP95": 20.300000000046566,
        "domP50": 9.200000000011642,
        "domP95": 20.70000000001164
      },
      "loadCycle": {
        "emitP50": 11.799999999988358,
        "emitP95": 58.600000000034925,
        "domP50": 12.400000000023283,
        "domP95": 59.100000000034925
      },
      "step": {
        "emitP50": 9.200000000011642,
        "emitP95": 20.29999999998836,
        "domP50": 9.800000000046566,
        "domP95": 20.600000000034925
      },
      "reset": {
        "emitP50": 33.79999999998836,
        "emitP95": 43.899999999965075,
        "domP50": 33.90000000002328,
        "domP95": 43.899999999965075
      },
      "append100": {
        "emitP50": 11.099999999976717,
        "emitP95": 18.599999999976717,
        "domP50": 11.5,
        "domP95": 19
      },
      "control": {
        "emitP50": 7.2999999999883585,
        "emitP95": 19.400000000023283,
        "domP50": 7.5,
        "domP95": 19.600000000034925
      },
      "heapMb": 5.500843048095703,
      "heapCode": 3.176067352294922,
      "heapData": 1.8770370483398438,
      "pssTotalMb": 236.4658203125,
      "pssApp": 132.0859375,
      "pssRenderer": 104.3798828125,
      "relaunchReadyMs": 454.8999999999651,
      "relaunchHeapMb": 4.532890319824219,
      "relaunchHeapCode": 2.3250503540039062,
      "relaunchHeapData": 1.8299560546875
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9,
          "emitP95": 19,
          "domP50": 9.399999999965075,
          "domP95": 19.900000000023283
        },
        "setKeys": {
          "emitP50": 8.600000000034925,
          "emitP95": 23.100000000034925,
          "domP50": 9.200000000011642,
          "domP95": 23.599999999976717
        },
        "replace": {
          "emitP50": 7.400000000023283,
          "emitP95": 31.29999999998836,
          "domP50": 8,
          "domP95": 31.79999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.7999999999883585,
          "lagP95": 21.20000000001164,
          "endLag": 6,
          "maxBacklog": 2
        },
        "heapMb": 5.054531097412109,
        "heapCode": 2.9996871948242188,
        "heapData": 1.6163482666015625,
        "pssTotalMb": 233.0703125,
        "pssApp": 130.7060546875,
        "pssRenderer": 102.3642578125,
        "control": {
          "emitP50": 7.7000000000116415,
          "emitP95": 15.399999999965075,
          "domP50": 8,
          "domP95": 15.799999999988358
        },
        "fCommitP50": 3.5,
        "fCommitP95": 7.400000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 8.799999999988358,
          "emitP95": 25,
          "domP50": 9.899999999965075,
          "domP95": 25.29999999998836
        },
        "setKeys": {
          "emitP50": 11.900000000023283,
          "emitP95": 24.70000000001164,
          "domP50": 12.5,
          "domP95": 25.099999999976717
        },
        "replace": {
          "emitP50": 8.700000000011642,
          "emitP95": 17.29999999998836,
          "domP50": 9.200000000011642,
          "domP95": 17.70000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.100000000034925,
          "lagP95": 18.29999999998836,
          "endLag": 8.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.545982360839844,
        "heapCode": 3.0217247009277344,
        "heapData": 2.069042205810547,
        "pssTotalMb": 233.9638671875,
        "pssApp": 130.974609375,
        "pssRenderer": 102.9892578125,
        "control": {
          "emitP50": 10.300000000046566,
          "emitP95": 24.899999999965075,
          "domP50": 10.600000000093132,
          "domP95": 25.29999999998836
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 5.400000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 10.199999999953434,
          "emitP95": 21.699999999953434,
          "domP50": 11.600000000093132,
          "domP95": 22.199999999953434
        },
        "setKeys": {
          "emitP50": 13.199999999953434,
          "emitP95": 23.800000000046566,
          "domP50": 13.900000000023283,
          "domP95": 26
        },
        "replace": {
          "emitP50": 13.900000000023283,
          "emitP95": 22.099999999976717,
          "domP50": 14.300000000046566,
          "domP95": 22.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.099999999976717,
          "lagP95": 15.099999999976717,
          "endLag": 14.699999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.943317413330078,
        "heapCode": 3.0842437744140625,
        "heapData": 6.260704040527344,
        "pssTotalMb": 246.8662109375,
        "pssApp": 138.3173828125,
        "pssRenderer": 108.548828125,
        "control": {
          "emitP50": 6.299999999930151,
          "emitP95": 20.800000000046566,
          "domP50": 6.599999999976717,
          "domP95": 21
        },
        "fCommitP50": 3.5,
        "fCommitP95": 8.100000000093132
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.400000000023283,
        "emitP95": 21.900000000023283,
        "domP50": 10.29999999993015,
        "domP95": 22.29999999993015
      },
      "edit_d4": {
        "emitP50": 9.599999999976717,
        "emitP95": 29.400000000023283,
        "domP50": 10,
        "domP95": 29.699999999953434
      },
      "edit_d10": {
        "emitP50": 8,
        "emitP95": 18.300000000046566,
        "domP50": 8.5,
        "domP95": 18.699999999953434
      },
      "loadCycle": {
        "emitP50": 16.400000000023283,
        "emitP95": 63.09999999997672,
        "domP50": 16.599999999976717,
        "domP95": 63.39999999990687
      },
      "step": {
        "emitP50": 8.599999999976717,
        "emitP95": 21.400000000023283,
        "domP50": 9.099999999976717,
        "domP95": 21.900000000023283
      },
      "reset": {
        "emitP50": 39.40000000002328,
        "emitP95": 89.90000000002328,
        "domP50": 39.40000000002328,
        "domP95": 90.19999999995343
      },
      "append100": {
        "emitP50": 12.20000000006985,
        "emitP95": 24.5,
        "domP50": 12.900000000023283,
        "domP95": 25
      },
      "control": {
        "emitP50": 8.20000000006985,
        "emitP95": 24.399999999906868,
        "domP50": 8.599999999976717,
        "domP95": 24.699999999953434
      },
      "heapMb": 5.486293792724609,
      "heapCode": 3.170246124267578,
      "heapData": 1.8681526184082031,
      "pssTotalMb": 238.0732421875,
      "pssApp": 133.658203125,
      "pssRenderer": 104.4150390625,
      "relaunchReadyMs": 431.5999999999767,
      "relaunchHeapMb": 4.52679443359375,
      "relaunchHeapCode": 2.3185462951660156,
      "relaunchHeapData": 1.8301811218261719
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.599999999976717,
          "domP50": 2.700000000069849,
          "domP95": 8.300000000046566
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.1999999999534339,
          "domP50": 1.5,
          "domP95": 11.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.5,
          "domP50": 1.400000000023283,
          "domP95": 10.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 3.724102020263672,
        "heapCode": 1.8444061279296875,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 221.4482421875,
        "pssApp": 125.359375,
        "pssRenderer": 96.0888671875
      },
      "500": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7000000000698492,
          "domP50": 5.599999999976717,
          "domP95": 6.599999999976717
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.5999999999767169,
          "domP50": 5.400000000023283,
          "domP95": 12
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.099999999976717,
          "domP50": 1.3000000000465661,
          "domP95": 8.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.135231018066406,
        "heapCode": 1.852081298828125,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 225.40625,
        "pssApp": 125.5390625,
        "pssRenderer": 99.8671875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.5,
          "emitP95": 2.5,
          "domP50": 2.699999999953434,
          "domP95": 8.400000000023283
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 4.5,
          "domP50": 3.200000000069849,
          "domP95": 7.400000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 1.599999999976717,
          "domP95": 11.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999068677,
          "lagP95": 1.8000000000465661,
          "endLag": 1.5,
          "maxBacklog": 0
        },
        "heapMb": 8.097457885742188,
        "heapCode": 1.8453292846679688,
        "heapData": 5.725639343261719,
        "pssTotalMb": 229.94921875,
        "pssApp": 125.248046875,
        "pssRenderer": 104.701171875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 2.299999999930151,
        "domP95": 12.800000000046566
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.300000000046566,
        "domP50": 5.200000000069849,
        "domP95": 10.800000000046566
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.099999999976717,
        "domP50": 2,
        "domP95": 11.699999999953434
      },
      "loadCycle": {
        "emitP50": 13.5,
        "emitP95": 32,
        "domP50": 15.300000000046566,
        "domP95": 32.40000000002328
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.6999999999534339,
        "domP50": 5.5,
        "domP95": 8.900000000023283
      },
      "reset": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.5,
        "domP50": 0.40000000002328306,
        "domP95": 0.9000000000232831
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7000000000698492,
        "domP50": 1.099999999976717,
        "domP95": 4.900000000023283
      },
      "heapMb": 3.777362823486328,
      "heapCode": 1.7703208923339844,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 220.423828125,
      "pssApp": 123.9951171875,
      "pssRenderer": 96.4287109375,
      "relaunchReadyMs": 1452.7999999999302,
      "relaunchHeapMb": 3.3515777587890625,
      "relaunchHeapCode": 1.5399665832519531,
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
          "emitP95": 2.699999999953434,
          "domP50": 5.5,
          "domP95": 14
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.299999999930151,
          "domP50": 1.1000000000931323,
          "domP95": 6.100000000093132
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.9000000000232831,
          "domP50": 5.199999999953434,
          "domP95": 17.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.7224044799804688,
        "heapCode": 1.8427505493164062,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.64453125,
        "pssApp": 127.0458984375,
        "pssRenderer": 97.5986328125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.2999999999301508,
          "domP50": 2.5,
          "domP95": 9
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 4,
          "domP50": 1.400000000023283,
          "domP95": 6.400000000023283
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.7000000000698492,
          "domP50": 1.3000000000465661,
          "domP95": 10.899999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.9000000000232831,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.9725875854492188,
        "heapCode": 1.6944351196289062,
        "heapData": 1.8917236328125,
        "pssTotalMb": 224.958984375,
        "pssApp": 124.7705078125,
        "pssRenderer": 100.1884765625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6000000000931323,
          "emitP95": 3.900000000023283,
          "domP50": 4.600000000093132,
          "domP95": 9.20000000006985
        },
        "setKeys": {
          "emitP50": 1.6000000000931323,
          "emitP95": 7.200000000069849,
          "domP50": 5.299999999930151,
          "domP95": 13
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.400000000023283,
          "domP50": 1.6999999999534339,
          "domP95": 6.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 1.8000000000465661,
          "endLag": 1.3000000000465661,
          "maxBacklog": 0
        },
        "heapMb": 8.094741821289062,
        "heapCode": 1.8429794311523438,
        "heapData": 5.725639343261719,
        "pssTotalMb": 233.126953125,
        "pssApp": 126.9248046875,
        "pssRenderer": 106.2021484375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.5,
        "domP50": 5.300000000046566,
        "domP95": 11.800000000046566
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.8000000000465661,
        "domP50": 2.1000000000931323,
        "domP95": 8.699999999953434
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.5,
        "domP50": 4.600000000093132,
        "domP95": 8.70000000006985
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 32.40000000002328,
        "domP50": 1.400000000023283,
        "domP95": 34.20000000006985
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 1.6999999999534339,
        "domP50": 2.099999999976717,
        "domP95": 8.400000000023283
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.7999999999301508,
        "domP50": 0.30000000004656613,
        "domP95": 1.5
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 0.9000000000232831,
        "domP95": 5.900000000023283
      },
      "heapMb": 3.9364547729492188,
      "heapCode": 1.9245643615722656,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.46484375,
      "pssApp": 127.4951171875,
      "pssRenderer": 98.9697265625,
      "relaunchReadyMs": 1456.5,
      "relaunchHeapMb": 3.35162353515625,
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
          "emitP50": 10.400000000023283,
          "emitP95": 23.400000000023283,
          "domP50": 10.79999999993015,
          "domP95": 24.900000000023283
        },
        "setKeys": {
          "emitP50": 8.400000000023283,
          "emitP95": 30.400000000023283,
          "domP50": 8.800000000046566,
          "domP95": 30.699999999953434
        },
        "replace": {
          "emitP50": 7.200000000069849,
          "emitP95": 24.900000000023283,
          "domP50": 8.300000000046566,
          "domP95": 25.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.800000000046566,
          "lagP95": 18,
          "endLag": 11.20000000006985,
          "maxBacklog": 2
        },
        "heapMb": 5.062854766845703,
        "heapCode": 3.0071449279785156,
        "heapData": 1.6160812377929688,
        "pssTotalMb": 236.1484375,
        "pssApp": 132.1533203125,
        "pssRenderer": 103.9951171875,
        "control": {
          "emitP50": 8.899999999906868,
          "emitP95": 24.300000000046566,
          "domP50": 9.300000000046566,
          "domP95": 24.800000000046566
        },
        "fCommitP50": 3.5,
        "fCommitP95": 8.20000000006985
      },
      "500": {
        "setKey": {
          "emitP50": 10.70000000006985,
          "emitP95": 26.099999999976717,
          "domP50": 11.400000000023283,
          "domP95": 26.699999999953434
        },
        "setKeys": {
          "emitP50": 13.300000000046566,
          "emitP95": 21.20000000006985,
          "domP50": 13.900000000023283,
          "domP95": 31.900000000023283
        },
        "replace": {
          "emitP50": 12.5,
          "emitP95": 28.300000000046566,
          "domP50": 13.099999999976717,
          "domP95": 28.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.300000000046566,
          "lagP95": 26.5,
          "endLag": 10,
          "maxBacklog": 3
        },
        "heapMb": 5.545982360839844,
        "heapCode": 3.021747589111328,
        "heapData": 2.068798065185547,
        "pssTotalMb": 236.1015625,
        "pssApp": 131.7041015625,
        "pssRenderer": 104.3974609375,
        "control": {
          "emitP50": 6.699999999953434,
          "emitP95": 19.900000000023283,
          "domP50": 7,
          "domP95": 20.599999999976717
        },
        "fCommitP50": 4,
        "fCommitP95": 9
      },
      "5000": {
        "setKey": {
          "emitP50": 10.20000000006985,
          "emitP95": 25.599999999976717,
          "domP50": 11,
          "domP95": 27.5
        },
        "setKeys": {
          "emitP50": 13.199999999953434,
          "emitP95": 22.199999999953434,
          "domP50": 13.800000000046566,
          "domP95": 22.599999999976717
        },
        "replace": {
          "emitP50": 12.800000000046566,
          "emitP95": 21.599999999976717,
          "domP50": 13.300000000046566,
          "domP95": 27
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.599999999976717,
          "lagP95": 19.599999999976717,
          "endLag": 16.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 9.929828643798828,
        "heapCode": 3.0717811584472656,
        "heapData": 6.260700225830078,
        "pssTotalMb": 251.7724609375,
        "pssApp": 141.65625,
        "pssRenderer": 110.1162109375,
        "control": {
          "emitP50": 7.5,
          "emitP95": 15.400000000023283,
          "domP50": 7.799999999930151,
          "domP95": 15.599999999976717
        },
        "fCommitP50": 4.5,
        "fCommitP95": 12.099999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.5,
        "emitP95": 27.300000000046566,
        "domP50": 8.100000000093132,
        "domP95": 27.800000000046566
      },
      "edit_d4": {
        "emitP50": 8.400000000023283,
        "emitP95": 21.900000000023283,
        "domP50": 9.099999999976717,
        "domP95": 23.5
      },
      "edit_d10": {
        "emitP50": 7.799999999930151,
        "emitP95": 18.099999999976717,
        "domP50": 8.199999999953434,
        "domP95": 19.599999999976717
      },
      "loadCycle": {
        "emitP50": 10.400000000023283,
        "emitP95": 56.199999999953434,
        "domP50": 10.599999999976717,
        "domP95": 56.800000000046566
      },
      "step": {
        "emitP50": 8.399999999906868,
        "emitP95": 23.100000000093132,
        "domP50": 8.70000000006985,
        "domP95": 23.400000000023283
      },
      "reset": {
        "emitP50": 27.70000000006985,
        "emitP95": 52,
        "domP50": 27.70000000006985,
        "domP95": 52.09999999997672
      },
      "append100": {
        "emitP50": 14.099999999976717,
        "emitP95": 18.699999999953434,
        "domP50": 14.29999999993015,
        "domP95": 19.099999999976717
      },
      "control": {
        "emitP50": 7.900000000023283,
        "emitP95": 19.399999999906868,
        "domP50": 8.199999999953434,
        "domP95": 19.599999999976717
      },
      "heapMb": 5.502925872802734,
      "heapCode": 3.178119659423828,
      "heapData": 1.8770332336425781,
      "pssTotalMb": 240.5849609375,
      "pssApp": 134.724609375,
      "pssRenderer": 105.8603515625,
      "relaunchReadyMs": 1644.3000000000466,
      "relaunchHeapMb": 4.4290008544921875,
      "relaunchHeapCode": 2.2263145446777344,
      "relaunchHeapData": 1.8270835876464844
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10.300000000046566,
          "emitP95": 20.099999999976717,
          "domP50": 10.800000000046566,
          "domP95": 20.599999999976717
        },
        "setKeys": {
          "emitP50": 10.800000000046566,
          "emitP95": 19.699999999953434,
          "domP50": 11.699999999953434,
          "domP95": 20.199999999953434
        },
        "replace": {
          "emitP50": 7.600000000093132,
          "emitP95": 31,
          "domP50": 8,
          "domP95": 31.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.200000000069849,
          "lagP95": 23.300000000046566,
          "endLag": 5.5,
          "maxBacklog": 2
        },
        "heapMb": 5.055168151855469,
        "heapCode": 2.9995994567871094,
        "heapData": 1.6160812377929688,
        "pssTotalMb": 234.935546875,
        "pssApp": 131.0693359375,
        "pssRenderer": 103.8662109375,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 21.099999999976717,
          "domP50": 6.599999999976717,
          "domP95": 21.400000000023283
        },
        "fCommitP50": 3.299999999930151,
        "fCommitP95": 5.600000000093132
      },
      "500": {
        "setKey": {
          "emitP50": 8.099999999976717,
          "emitP95": 25.79999999993015,
          "domP50": 8.599999999976717,
          "domP95": 26.29999999993015
        },
        "setKeys": {
          "emitP50": 9.100000000093132,
          "emitP95": 28.29999999993015,
          "domP50": 9.600000000093132,
          "domP95": 28.79999999993015
        },
        "replace": {
          "emitP50": 8.5,
          "emitP95": 16.900000000023283,
          "domP50": 9.199999999953434,
          "domP95": 17.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.200000000069849,
          "lagP95": 16.5,
          "endLag": 6.599999999976717,
          "maxBacklog": 3
        },
        "heapMb": 5.544807434082031,
        "heapCode": 3.020355224609375,
        "heapData": 2.069042205810547,
        "pssTotalMb": 236.5927734375,
        "pssApp": 132.185546875,
        "pssRenderer": 104.4072265625,
        "control": {
          "emitP50": 6.300000000046566,
          "emitP95": 16.400000000023283,
          "domP50": 6.5,
          "domP95": 16.599999999976717
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 7.299999999930151
      },
      "5000": {
        "setKey": {
          "emitP50": 12,
          "emitP95": 28.100000000093132,
          "domP50": 12.600000000093132,
          "domP95": 28.70000000006985
        },
        "setKeys": {
          "emitP50": 10,
          "emitP95": 25.699999999953434,
          "domP50": 10.599999999976717,
          "domP95": 26.099999999976717
        },
        "replace": {
          "emitP50": 15.300000000046566,
          "emitP95": 26.20000000006985,
          "domP50": 15.900000000023283,
          "domP95": 26.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.79999999993015,
          "lagP95": 20.699999999953434,
          "endLag": 6.299999999930151,
          "maxBacklog": 2
        },
        "heapMb": 9.940738677978516,
        "heapCode": 3.081981658935547,
        "heapData": 6.260700225830078,
        "pssTotalMb": 251.3720703125,
        "pssApp": 141.466796875,
        "pssRenderer": 109.9052734375,
        "control": {
          "emitP50": 5.899999999906868,
          "emitP95": 23.199999999953434,
          "domP50": 6.299999999930151,
          "domP95": 24.900000000023283
        },
        "fCommitP50": 3.5,
        "fCommitP95": 9.699999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.599999999976717,
        "emitP95": 19.800000000046566,
        "domP50": 11.099999999976717,
        "domP95": 21.100000000093132
      },
      "edit_d4": {
        "emitP50": 7.299999999930151,
        "emitP95": 21,
        "domP50": 7.899999999906868,
        "domP95": 21.800000000046566
      },
      "edit_d10": {
        "emitP50": 8.699999999953434,
        "emitP95": 22,
        "domP50": 9.399999999906868,
        "domP95": 22.5
      },
      "loadCycle": {
        "emitP50": 18.099999999976717,
        "emitP95": 50,
        "domP50": 18.199999999953434,
        "domP95": 50.40000000002328
      },
      "step": {
        "emitP50": 9.70000000006985,
        "emitP95": 18.800000000046566,
        "domP50": 10,
        "domP95": 19.199999999953434
      },
      "reset": {
        "emitP50": 27.199999999953434,
        "emitP95": 45.800000000046566,
        "domP50": 27.20000000006985,
        "domP95": 45.90000000002328
      },
      "append100": {
        "emitP50": 12.699999999953434,
        "emitP95": 20.599999999976717,
        "domP50": 13.099999999976717,
        "domP95": 20.900000000023283
      },
      "control": {
        "emitP50": 6,
        "emitP95": 21.400000000023283,
        "domP50": 6.599999999976717,
        "domP95": 21.699999999953434
      },
      "heapMb": 5.489189147949219,
      "heapCode": 3.1733627319335938,
      "heapData": 1.8683204650878906,
      "pssTotalMb": 240.7431640625,
      "pssApp": 134.923828125,
      "pssRenderer": 105.8193359375,
      "relaunchReadyMs": 410.80000000004657,
      "relaunchHeapMb": 4.533367156982422,
      "relaunchHeapCode": 2.3248748779296875,
      "relaunchHeapData": 1.8306083679199219
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.5,
          "domP50": 3.900000000023283,
          "domP95": 7.199999999953434
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 8.599999999976717,
          "domP50": 6,
          "domP95": 11
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.199999999953434,
          "domP50": 5.400000000023283,
          "domP95": 11.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.8000000000465661,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.723743438720703,
        "heapCode": 1.8440475463867188,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.2177734375,
        "pssApp": 126.5341796875,
        "pssRenderer": 97.68359375
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 5.700000000069849,
          "domP95": 7.5
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 4.799999999930151,
          "domP50": 5.299999999930151,
          "domP95": 8.599999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.6999999999534339,
          "domP50": 5.400000000023283,
          "domP95": 10.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7999999999301508,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 4.132114410400391,
        "heapCode": 1.8493995666503906,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 228.1953125,
        "pssApp": 126.537109375,
        "pssRenderer": 101.658203125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6999999999534339,
          "emitP95": 4.800000000046566,
          "domP50": 3.700000000069849,
          "domP95": 10.699999999953434
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 3.1000000000931323,
          "domP50": 5,
          "domP95": 8.099999999976717
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 4.899999999906868,
          "domP50": 2.400000000023283,
          "domP95": 6.799999999930151
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999068677,
          "lagP95": 2,
          "endLag": 1.3000000000465661,
          "maxBacklog": 0
        },
        "heapMb": 8.097270965576172,
        "heapCode": 1.8455543518066406,
        "heapData": 5.725063323974609,
        "pssTotalMb": 234.197265625,
        "pssApp": 127.60546875,
        "pssRenderer": 106.591796875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.5,
        "domP50": 2,
        "domP95": 9.70000000006985
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1000000000931323,
        "domP50": 1.400000000023283,
        "domP95": 9.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.1999999999534339,
        "domP50": 5.5,
        "domP95": 13.300000000046566
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 33,
        "domP50": 0.5,
        "domP95": 33.40000000002328
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7000000000698492,
        "domP50": 0.9000000000232831,
        "domP95": 7.400000000023283
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 0.8999999999068677,
        "domP50": 0.2000000000698492,
        "domP95": 1.099999999976717
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.700000000069849,
        "domP50": 0.7999999999301508,
        "domP95": 5.5
      },
      "heapMb": 3.9362640380859375,
      "heapCode": 1.9245262145996094,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 225.4912109375,
      "pssApp": 126.4228515625,
      "pssRenderer": 99.068359375,
      "relaunchReadyMs": 1494.9000000000233,
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
          "domP50": 1.6000000000931323,
          "domP95": 7
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.599999999976717,
          "domP50": 1,
          "domP95": 7.800000000046566
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6999999999534339,
          "domP50": 1,
          "domP95": 11.899999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.7227630615234375,
        "heapCode": 1.843109130859375,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.015625,
        "pssApp": 125.9169921875,
        "pssRenderer": 98.0986328125
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.5999999999767169,
          "domP50": 5.900000000023283,
          "domP95": 6.900000000023283
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7999999999301508,
          "domP50": 5,
          "domP95": 6.900000000023283
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1.900000000023283,
          "domP50": 1.8000000000465661,
          "domP95": 8.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6000000000931323,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.134952545166016,
        "heapCode": 1.8519668579101562,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 227.876953125,
        "pssApp": 126.4443359375,
        "pssRenderer": 101.4326171875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6999999999534339,
          "emitP95": 5.299999999930151,
          "domP50": 4.799999999930151,
          "domP95": 9.699999999953434
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 12.199999999953434,
          "domP50": 4.099999999976717,
          "domP95": 13.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7000000000698492,
          "domP50": 1.6000000000931323,
          "domP95": 8.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.400000000023283,
          "endLag": 1.599999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.10025405883789,
        "heapCode": 1.8479385375976562,
        "heapData": 5.725639343261719,
        "pssTotalMb": 232.8994140625,
        "pssApp": 126.8271484375,
        "pssRenderer": 106.072265625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1999999999534339,
        "domP50": 3.099999999976717,
        "domP95": 9.5
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.2000000000698492,
        "domP50": 1.7000000000698492,
        "domP95": 11.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.900000000023283,
        "domP50": 4,
        "domP95": 10.199999999953434
      },
      "loadCycle": {
        "emitP50": 14.199999999953434,
        "emitP95": 33.09999999997672,
        "domP50": 16.5,
        "domP95": 33.59999999997672
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 3.6000000000931323,
        "domP95": 10.199999999953434
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.40000000002328306,
        "domP50": 0.2000000000698492,
        "domP95": 0.9000000000232831
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 3.699999999953434,
        "domP95": 8.699999999953434
      },
      "heapMb": 3.7772674560546875,
      "heapCode": 1.7702369689941406,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 223.3134765625,
      "pssApp": 125.4677734375,
      "pssRenderer": 97.845703125,
      "relaunchReadyMs": 1466.5999999999767,
      "relaunchHeapMb": 3.3515968322753906,
      "relaunchHeapCode": 1.5399971008300781,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 11.79999999993015,
          "emitP95": 16.100000000093132,
          "domP50": 12.5,
          "domP95": 16.699999999953434
        },
        "setKeys": {
          "emitP50": 11.300000000046566,
          "emitP95": 28.79999999993015,
          "domP50": 11.70000000006985,
          "domP95": 29.399999999906868
        },
        "replace": {
          "emitP50": 8.600000000093132,
          "emitP95": 23.400000000023283,
          "domP50": 9,
          "domP95": 23.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.400000000023283,
          "lagP95": 18.699999999953434,
          "endLag": 9.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 5.064582824707031,
        "heapCode": 3.0087928771972656,
        "heapData": 1.6160659790039062,
        "pssTotalMb": 236.3671875,
        "pssApp": 132.31640625,
        "pssRenderer": 104.05078125,
        "control": {
          "emitP50": 6.799999999930151,
          "emitP95": 19.900000000023283,
          "domP50": 7,
          "domP95": 20.199999999953434
        },
        "fCommitP50": 3.6000000000931323,
        "fCommitP95": 5.5
      },
      "500": {
        "setKey": {
          "emitP50": 10.699999999953434,
          "emitP95": 18.5,
          "domP50": 11.300000000046566,
          "domP95": 18.800000000046566
        },
        "setKeys": {
          "emitP50": 8.900000000023283,
          "emitP95": 26,
          "domP50": 9.29999999993015,
          "domP95": 26.5
        },
        "replace": {
          "emitP50": 10.199999999953434,
          "emitP95": 27.400000000023283,
          "domP50": 10.599999999976717,
          "domP95": 27.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.599999999976717,
          "lagP95": 18.79999999993015,
          "endLag": 6.699999999953434,
          "maxBacklog": 2
        },
        "heapMb": 5.556083679199219,
        "heapCode": 3.0311813354492188,
        "heapData": 2.068798065185547,
        "pssTotalMb": 235.87890625,
        "pssApp": 131.630859375,
        "pssRenderer": 104.248046875,
        "control": {
          "emitP50": 5.100000000093132,
          "emitP95": 27.5,
          "domP50": 6,
          "domP95": 27.79999999993015
        },
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 10.300000000046566
      },
      "5000": {
        "setKey": {
          "emitP50": 12.29999999993015,
          "emitP95": 24.20000000006985,
          "domP50": 13.399999999906868,
          "domP95": 24.900000000023283
        },
        "setKeys": {
          "emitP50": 9.800000000046566,
          "emitP95": 19.400000000023283,
          "domP50": 10.600000000093132,
          "domP95": 20.70000000006985
        },
        "replace": {
          "emitP50": 14.099999999976717,
          "emitP95": 23.79999999993015,
          "domP50": 14.5,
          "domP95": 24.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.70000000006985,
          "lagP95": 17.29999999993015,
          "endLag": 10.099999999976717,
          "maxBacklog": 2
        },
        "heapMb": 9.94040298461914,
        "heapCode": 3.0817718505859375,
        "heapData": 6.260704040527344,
        "pssTotalMb": 249.8115234375,
        "pssApp": 139.84765625,
        "pssRenderer": 109.9638671875,
        "control": {
          "emitP50": 8.099999999976717,
          "emitP95": 26,
          "domP50": 8.900000000023283,
          "domP95": 26.79999999993015
        },
        "fCommitP50": 3.5,
        "fCommitP95": 4.699999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.20000000006985,
        "emitP95": 20.900000000023283,
        "domP50": 10,
        "domP95": 22.199999999953434
      },
      "edit_d4": {
        "emitP50": 9.100000000093132,
        "emitP95": 32.40000000002328,
        "domP50": 10,
        "domP95": 33
      },
      "edit_d10": {
        "emitP50": 9.599999999976717,
        "emitP95": 16.100000000093132,
        "domP50": 10.199999999953434,
        "domP95": 16.600000000093132
      },
      "loadCycle": {
        "emitP50": 18.800000000046566,
        "emitP95": 62.09999999997672,
        "domP50": 19,
        "domP95": 62.59999999997672
      },
      "step": {
        "emitP50": 11,
        "emitP95": 24.099999999976717,
        "domP50": 11.300000000046566,
        "domP95": 24.400000000023283
      },
      "reset": {
        "emitP50": 28.400000000023283,
        "emitP95": 47.40000000002328,
        "domP50": 28.400000000023283,
        "domP95": 47.5
      },
      "append100": {
        "emitP50": 12.900000000023283,
        "emitP95": 19.599999999976717,
        "domP50": 13.20000000006985,
        "domP95": 19.900000000023283
      },
      "control": {
        "emitP50": 7.300000000046566,
        "emitP95": 21.199999999953434,
        "domP50": 7.600000000093132,
        "domP95": 21.5
      },
      "heapMb": 5.4924468994140625,
      "heapCode": 3.178466796875,
      "heapData": 1.8659744262695312,
      "pssTotalMb": 241.0205078125,
      "pssApp": 135.234375,
      "pssRenderer": 105.7861328125,
      "relaunchReadyMs": 1665.5,
      "relaunchHeapMb": 4.429012298583984,
      "relaunchHeapCode": 2.226306915283203,
      "relaunchHeapData": 1.8271026611328125
    }
  }
]
```
</details>
