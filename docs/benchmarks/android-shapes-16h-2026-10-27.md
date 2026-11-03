# Phase 16 shapes — flat objects & hybrid workflow (2026-10-27)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.15 ms, p95 8.87 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 3 / PLATFORM-BOUND 57 / CODE-BOUND 0 / FAIL 26

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.38 ± 0.11 | 8.22 ± 0.97 | 21.6× | FAIL | allow 7.3 (control emitP50 6.2×1) |
| flat | 50.setKey.emitP95 | 1.44 ± 1.07 | 19.24 ± 6.34 | 13.4× | PLATFORM-BOUND | allow 23.1 (control emitP95 15.6×1) |
| flat | 50.setKey.domP50 | 4.20 ± 1.38 | 8.88 ± 1.10 | 2.1× | PLATFORM-BOUND | allow 9.0 (control domP50 6.5×1) |
| flat | 50.setKey.domP95 | 8.98 ± 2.30 | 20.08 ± 6.25 | 2.2× | PLATFORM-BOUND | allow 24.5 (control domP95 15.9×1) |
| flat | 50.setKeys.emitP50 | 0.40 ± 0.00 | 8.48 ± 0.58 | 21.2× | FAIL | allow 6.8 (control emitP50 6.2×1) |
| flat | 50.setKeys.emitP95 | 2.38 ± 1.72 | 18.90 ± 1.04 | 7.9× | PLATFORM-BOUND | allow 18.4 (control emitP95 15.6×1) |
| flat | 50.setKeys.domP50 | 1.40 ± 0.46 | 9.32 ± 0.82 | 6.7× | FAIL | allow 7.8 (control domP50 6.5×1) |
| flat | 50.setKeys.domP95 | 8.50 ± 2.14 | 20.00 ± 1.57 | 2.4× | PLATFORM-BOUND | allow 19.6 (control domP95 15.9×1) |
| flat | 50.replace.emitP50 | 0.38 ± 0.04 | 8.16 ± 0.72 | 21.5× | FAIL | allow 7.0 (control emitP50 6.2×1) |
| flat | 50.replace.emitP95 | 2.50 ± 1.44 | 21.88 ± 4.71 | 8.8× | PLATFORM-BOUND | allow 21.8 (control emitP95 15.6×1) |
| flat | 50.replace.domP50 | 1.82 ± 1.67 | 8.82 ± 0.95 | 4.8× | PLATFORM-BOUND | allow 9.2 (control domP50 6.5×1) |
| flat | 50.replace.domP95 | 6.20 ± 1.59 | 22.76 ± 4.54 | 3.7× | PLATFORM-BOUND | allow 22.1 (control domP95 15.9×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 6.22 ± 0.20 | 20.7× | PLATFORM-BOUND | allow 6.4 (control emitP50 6.2×1) |
| flat | 50.burst.lagP95 | 0.68 ± 0.18 | 12.30 ± 1.50 | 18.1× | PLATFORM-BOUND | allow 17.3 (control emitP95 15.6×1) |
| flat | 50.burst.endLag | 0.32 ± 0.22 | 7.96 ± 4.08 | 24.9× | PLATFORM-BOUND | allow 10.5 (control emitP50 6.2×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 1.00 ± 0.00 | 1000000000.0× | FAIL |  |
| flat | 50.heapMb | 3.52 ± 0.06 | 4.63 ± 0.00 | 1.3× | FAIL | code +0.94 MB; data 1.50 -> 1.61 MB |
| flat | 50.pssTotalMb | 211.04 ± 7.27 | 221.53 ± 7.65 | 1.0× | PLATFORM-BOUND | allow 22.3 (plugin baseline 7.4 MB) |
| flat | 500.setKey.emitP50 | 0.50 ± 0.07 | 8.56 ± 0.75 | 17.1× | FAIL | allow 8.0 (control emitP50 7.1×1) |
| flat | 500.setKey.emitP95 | 3.62 ± 2.19 | 21.56 ± 1.85 | 6.0× | PLATFORM-BOUND | allow 26.0 (control emitP95 22.0×1) |
| flat | 500.setKey.domP50 | 3.64 ± 2.11 | 9.00 ± 0.69 | 2.5× | PLATFORM-BOUND | allow 10.4 (control domP50 7.6×1) |
| flat | 500.setKey.domP95 | 10.10 ± 3.62 | 22.04 ± 1.88 | 2.2× | PLATFORM-BOUND | allow 27.9 (control domP95 22.4×1) |
| flat | 500.setKeys.emitP50 | 0.46 ± 0.11 | 9.60 ± 1.38 | 20.9× | FAIL | allow 8.6 (control emitP50 7.1×1) |
| flat | 500.setKeys.emitP95 | 1.02 ± 0.49 | 21.06 ± 8.15 | 20.6× | PLATFORM-BOUND | allow 30.6 (control emitP95 22.0×1) |
| flat | 500.setKeys.domP50 | 2.22 ± 1.79 | 10.40 ± 1.29 | 4.7× | PLATFORM-BOUND | allow 10.7 (control domP50 7.6×1) |
| flat | 500.setKeys.domP95 | 9.56 ± 1.81 | 21.72 ± 8.20 | 2.3× | PLATFORM-BOUND | allow 32.4 (control domP95 22.4×1) |
| flat | 500.replace.emitP50 | 0.36 ± 0.05 | 8.82 ± 0.86 | 24.5× | FAIL | allow 8.1 (control emitP50 7.1×1) |
| flat | 500.replace.emitP95 | 1.98 ± 1.37 | 23.86 ± 9.50 | 12.1× | PLATFORM-BOUND | allow 32.9 (control emitP95 22.0×1) |
| flat | 500.replace.domP50 | 1.30 ± 0.39 | 9.56 ± 0.80 | 7.4× | PLATFORM-BOUND | allow 8.8 (control domP50 7.6×1) |
| flat | 500.replace.domP95 | 8.08 ± 2.65 | 24.30 ± 9.47 | 3.0× | PLATFORM-BOUND | allow 34.5 (control domP95 22.4×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 6.04 ± 0.43 | 15.1× | PLATFORM-BOUND | allow 7.6 (control emitP50 7.1×1) |
| flat | 500.burst.lagP95 | 0.66 ± 0.05 | 11.68 ± 2.42 | 17.7× | PLATFORM-BOUND | allow 24.5 (control emitP95 22.0×1) |
| flat | 500.burst.endLag | 0.88 ± 0.77 | 6.54 ± 0.83 | 7.4× | PLATFORM-BOUND | allow 8.7 (control emitP50 7.1×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 1.00 ± 0.00 | 1000000000.0× | FAIL |  |
| flat | 500.heapMb | 3.97 ± 0.12 | 5.07 ± 0.00 | 1.3× | FAIL | code +0.91 MB; data 1.89 -> 2.03 MB |
| flat | 500.pssTotalMb | 215.09 ± 8.04 | 222.12 ± 7.38 | 1.0× | PASS |  |
| flat | 5000.setKey.emitP50 | 1.18 ± 0.18 | 10.66 ± 1.09 | 9.0× | FAIL | allow 7.1 (control emitP50 5.8×1) |
| flat | 5000.setKey.emitP95 | 1.98 ± 0.63 | 25.64 ± 3.50 | 12.9× | FAIL | allow 17.4 (control emitP95 13.2×1) |
| flat | 5000.setKey.domP50 | 6.08 ± 1.73 | 11.20 ± 1.07 | 1.8× | PLATFORM-BOUND | allow 8.9 (control domP50 6.1×1) |
| flat | 5000.setKey.domP95 | 10.12 ± 3.15 | 26.50 ± 3.35 | 2.6× | PLATFORM-BOUND | allow 20.0 (control domP95 13.5×1) |
| flat | 5000.setKeys.emitP50 | 1.64 ± 0.15 | 9.86 ± 0.84 | 6.0× | FAIL | allow 6.8 (control emitP50 5.8×1) |
| flat | 5000.setKeys.emitP95 | 6.46 ± 4.00 | 23.46 ± 3.89 | 3.6× | PLATFORM-BOUND | allow 21.1 (control emitP95 13.2×1) |
| flat | 5000.setKeys.domP50 | 3.30 ± 0.96 | 10.96 ± 1.25 | 3.3× | PLATFORM-BOUND | allow 8.3 (control domP50 6.1×1) |
| flat | 5000.setKeys.domP95 | 11.30 ± 2.81 | 23.94 ± 3.97 | 2.1× | PLATFORM-BOUND | allow 20.3 (control domP95 13.5×1) |
| flat | 5000.replace.emitP50 | 0.40 ± 0.10 | 14.26 ± 1.08 | 35.6× | FAIL | allow 7.0 (control emitP50 5.8×1) |
| flat | 5000.replace.emitP95 | 7.38 ± 4.39 | 56.18 ± 6.34 | 7.6× | FAIL | allow 23.9 (control emitP95 13.2×1) |
| flat | 5000.replace.domP50 | 2.06 ± 0.38 | 14.92 ± 1.31 | 7.2× | FAIL | allow 7.8 (control domP50 6.1×1) |
| flat | 5000.replace.domP95 | 10.06 ± 2.62 | 56.66 ± 6.42 | 5.6× | FAIL | allow 22.5 (control domP95 13.5×1) |
| flat | 5000.burst.lagP50 | 1.28 ± 0.08 | 7.88 ± 0.24 | 6.2× | FAIL | allow 6.1 (control emitP50 5.8×1) |
| flat | 5000.burst.lagP95 | 2.20 ± 0.34 | 13.52 ± 1.41 | 6.1× | PLATFORM-BOUND | allow 15.0 (control emitP95 13.2×1) |
| flat | 5000.burst.endLag | 2.28 ± 1.99 | 8.74 ± 1.72 | 3.8× | PLATFORM-BOUND | allow 9.5 (control emitP50 5.8×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 7.92 ± 0.04 | 9.35 ± 0.07 | 1.2× | FAIL | code +0.97 MB; data 5.72 -> 6.12 MB |
| flat | 5000.pssTotalMb | 218.72 ± 7.36 | 225.42 ± 7.92 | 1.0× | PASS |  |
| workflow | edit_d1.emitP50 | 0.38 ± 0.08 | 8.24 ± 0.75 | 21.7× | PLATFORM-BOUND | allow 8.1 (control emitP50 7.3×1) |
| workflow | edit_d1.emitP95 | 1.26 ± 0.66 | 18.20 ± 1.18 | 14.4× | PLATFORM-BOUND | allow 21.1 (control emitP95 19.3×1) |
| workflow | edit_d1.domP50 | 3.94 ± 2.15 | 8.80 ± 0.75 | 2.2× | PLATFORM-BOUND | allow 10.6 (control domP50 7.7×1) |
| workflow | edit_d1.domP95 | 7.68 ± 1.01 | 18.76 ± 1.08 | 2.4× | PLATFORM-BOUND | allow 21.7 (control domP95 19.6×1) |
| workflow | edit_d4.emitP50 | 0.40 ± 0.07 | 8.02 ± 0.78 | 20.1× | PLATFORM-BOUND | allow 8.1 (control emitP50 7.3×1) |
| workflow | edit_d4.emitP95 | 1.12 ± 0.84 | 16.96 ± 2.62 | 15.1× | PLATFORM-BOUND | allow 22.7 (control emitP95 19.3×1) |
| workflow | edit_d4.domP50 | 2.44 ± 1.90 | 8.54 ± 0.74 | 3.5× | PLATFORM-BOUND | allow 10.4 (control domP50 7.7×1) |
| workflow | edit_d4.domP95 | 8.44 ± 2.58 | 17.46 ± 2.58 | 2.1× | PLATFORM-BOUND | allow 24.8 (control domP95 19.6×1) |
| workflow | edit_d10.emitP50 | 0.44 ± 0.05 | 8.32 ± 0.73 | 18.9× | PLATFORM-BOUND | allow 8.1 (control emitP50 7.3×1) |
| workflow | edit_d10.emitP95 | 1.24 ± 0.34 | 20.58 ± 3.73 | 16.6× | PLATFORM-BOUND | allow 23.3 (control emitP95 19.3×1) |
| workflow | edit_d10.domP50 | 1.74 ± 0.88 | 8.80 ± 0.75 | 5.1× | PLATFORM-BOUND | allow 9.4 (control domP50 7.7×1) |
| workflow | edit_d10.domP95 | 9.18 ± 3.02 | 21.06 ± 3.79 | 2.3× | PLATFORM-BOUND | allow 26.4 (control domP95 19.6×1) |
| workflow | loadCycle.emitP50 | 3.38 ± 6.22 | 18.92 ± 4.02 | 5.6× | PLATFORM-BOUND | allow 24.8 (control emitP50 7.3×2) |
| workflow | loadCycle.emitP95 | 33.40 ± 0.82 | 48.98 ± 4.00 | 1.5× | PLATFORM-BOUND | allow 43.4 (control emitP95 19.3×2) |
| workflow | loadCycle.domP50 | 3.52 ± 6.25 | 19.48 ± 4.26 | 5.5× | PLATFORM-BOUND | allow 25.9 (control domP50 7.7×2) |
| workflow | loadCycle.domP95 | 33.86 ± 0.83 | 49.44 ± 4.07 | 1.5× | PLATFORM-BOUND | allow 44.2 (control domP95 19.6×2) |
| workflow | step.emitP50 | 0.34 ± 0.05 | 7.90 ± 0.86 | 23.2× | PLATFORM-BOUND | allow 8.2 (control emitP50 7.3×1) |
| workflow | step.emitP95 | 1.16 ± 0.72 | 18.98 ± 6.76 | 16.4× | PLATFORM-BOUND | allow 26.8 (control emitP95 19.3×1) |
| workflow | step.domP50 | 3.14 ± 1.83 | 8.32 ± 0.85 | 2.6× | PLATFORM-BOUND | allow 10.4 (control domP50 7.7×1) |
| workflow | step.domP95 | 8.52 ± 1.34 | 20.18 ± 6.50 | 2.4× | PLATFORM-BOUND | allow 27.5 (control domP95 19.6×1) |
| workflow | reset.emitP50 | 0.22 ± 0.04 | 11.40 ± 3.67 | 51.8× | FAIL | allow 11.0 (control emitP50 7.3×1) |
| workflow | reset.emitP95 | 1.16 ± 0.63 | 32.76 ± 14.86 | 28.2× | PLATFORM-BOUND | allow 34.8 (control emitP95 19.3×1) |
| workflow | reset.domP50 | 0.28 ± 0.04 | 11.54 ± 3.61 | 41.2× | PLATFORM-BOUND | allow 11.4 (control domP50 7.7×1) |
| workflow | reset.domP95 | 1.72 ± 0.68 | 32.86 ± 14.86 | 19.1× | PLATFORM-BOUND | allow 35.2 (control domP95 19.6×1) |
| workflow | append100.emitP50 | 0.36 ± 0.05 | 14.10 ± 2.03 | 39.2× | FAIL | allow 9.4 (control emitP50 7.3×1) |
| workflow | append100.emitP95 | 1.24 ± 1.11 | 24.74 ± 5.56 | 20.0× | PLATFORM-BOUND | allow 26.0 (control emitP95 19.3×1) |
| workflow | append100.domP50 | 0.80 ± 0.07 | 14.70 ± 2.01 | 18.4× | FAIL | allow 9.8 (control domP50 7.7×1) |
| workflow | append100.domP95 | 5.06 ± 2.49 | 25.26 ± 5.73 | 5.0× | PLATFORM-BOUND | allow 27.9 (control domP95 19.6×1) |
| workflow | heapMb | 3.80 ± 0.11 | 5.05 ± 0.01 | 1.3× | FAIL | code +0.97 MB; data 1.63 -> 1.85 MB |
| workflow | pssTotalMb | 210.68 ± 6.90 | 225.68 ± 7.47 | 1.1× | PLATFORM-BOUND | allow 21.8 (plugin baseline 7.4 MB) |
| workflow | relaunchReadyMs | 911.34 ± 363.54 | 542.80 ± 272.20 | 0.6× | PASS |  |
| workflow | relaunchHeapMb | 3.28 ± 0.04 | 4.18 ± 0.03 | 1.3× | FAIL | code +0.55 MB; data 1.44 -> 1.79 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 6.22 | 6.54 | 15.94 | 8.22 | 8.88 | 20.08 |
| 500 | 7.14 | 7.58 | 22.36 | 8.56 | 9.00 | 22.04 |
| 5000 | 5.78 | 6.14 | 13.48 | 10.66 | 11.20 | 26.50 |

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
          "emitP95": 1.1000000000349246,
          "domP50": 5.2000000000116415,
          "domP95": 11.900000000023283
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.099999999976717,
          "domP50": 1,
          "domP95": 10.100000000034925
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 0.7999999999883585,
          "domP50": 0.8999999999650754,
          "domP95": 6.2999999999883585
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.5999999999767169,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.55914306640625,
        "heapCode": 1.6842880249023438,
        "heapData": 1.5023841857910156,
        "pssTotalMb": 216.2841796875
      },
      "500": {
        "setKey": {
          "emitP50": 0.3999999999650754,
          "emitP95": 2.099999999976717,
          "domP50": 6,
          "domP95": 7.599999999976717
        },
        "setKeys": {
          "emitP50": 0.29999999998835847,
          "emitP95": 0.6000000000349246,
          "domP50": 5.300000000046566,
          "domP95": 7.7999999999883585
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.9000000000232831,
          "domP50": 0.8999999999650754,
          "domP95": 7.7999999999883585
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6000000000349246,
          "endLag": 0.7000000000116415,
          "maxBacklog": 0
        },
        "heapMb": 4.162483215332031,
        "heapCode": 1.8759956359863281,
        "heapData": 1.8946266174316406,
        "pssTotalMb": 222.498046875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1000000000349246,
          "emitP95": 1.7000000000116415,
          "domP50": 7,
          "domP95": 7.900000000023283
        },
        "setKeys": {
          "emitP50": 1.900000000023283,
          "emitP95": 8.099999999976717,
          "domP50": 4.899999999965075,
          "domP95": 13.099999999976717
        },
        "replace": {
          "emitP50": 0.5,
          "emitP95": 11.599999999976717,
          "domP50": 2.099999999976717,
          "domP95": 13.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999650754,
          "lagP95": 2.3999999999650754,
          "endLag": 1.7000000000116415,
          "maxBacklog": 0
        },
        "heapMb": 7.938106536865234,
        "heapCode": 1.6914405822753906,
        "heapData": 5.722068786621094,
        "pssTotalMb": 224.455078125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 2.2999999999883585,
        "domP50": 1.7000000000116415,
        "domP95": 6.599999999976717
      },
      "edit_d4": {
        "emitP50": 0.3999999999650754,
        "emitP95": 0.7999999999883585,
        "domP50": 3.099999999976717,
        "domP95": 7.2000000000116415
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 3.2999999999883585,
        "domP95": 7.7999999999883585
      },
      "loadCycle": {
        "emitP50": 14.5,
        "emitP95": 32.5,
        "domP50": 14.700000000011642,
        "domP95": 32.90000000002328
      },
      "step": {
        "emitP50": 0.3999999999650754,
        "emitP95": 0.9000000000232831,
        "domP50": 3.5,
        "domP95": 9.599999999976717
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 0.6000000000349246,
        "domP50": 0.29999999998835847,
        "domP95": 0.7999999999883585
      },
      "append100": {
        "emitP50": 0.3999999999650754,
        "emitP95": 1.1000000000349246,
        "domP50": 0.8999999999650754,
        "domP95": 5.100000000034925
      },
      "heapMb": 3.776592254638672,
      "heapCode": 1.7695999145507812,
      "heapData": 1.6309852600097656,
      "pssTotalMb": 218.384765625,
      "relaunchReadyMs": 642.5,
      "relaunchHeapMb": 3.2579803466796875,
      "relaunchHeapCode": 1.4546890258789062,
      "relaunchHeapData": 1.443756103515625
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.099999999976717,
          "emitP95": 17.20000000001164,
          "domP50": 9.5,
          "domP95": 18.900000000023283
        },
        "setKeys": {
          "emitP50": 9.100000000034925,
          "emitP95": 18.79999999998836,
          "domP50": 9.5,
          "domP95": 19.199999999953434
        },
        "replace": {
          "emitP50": 7,
          "emitP95": 22.5,
          "domP50": 7.5,
          "domP95": 22.899999999965075
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.2000000000116415,
          "lagP95": 11,
          "endLag": 4.600000000034925,
          "maxBacklog": 1
        },
        "heapMb": 4.629070281982422,
        "heapCode": 2.5912551879882812,
        "heapData": 1.6097602844238281,
        "pssTotalMb": 230.3564453125,
        "control": {
          "emitP50": 5.400000000023283,
          "emitP95": 15.099999999976717,
          "domP50": 5.599999999976717,
          "domP95": 15.399999999965075
        },
        "fCommitP50": 3.2999999999883585,
        "fCommitP95": 5.7999999999883585
      },
      "500": {
        "setKey": {
          "emitP50": 9.5,
          "emitP95": 19.600000000034925,
          "domP50": 9.799999999988358,
          "domP95": 20
        },
        "setKeys": {
          "emitP50": 11.400000000023283,
          "emitP95": 26.70000000001164,
          "domP50": 11.900000000023283,
          "domP95": 27.599999999976717
        },
        "replace": {
          "emitP50": 9.100000000034925,
          "emitP95": 22.900000000023283,
          "domP50": 9.799999999988358,
          "domP95": 23.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.599999999976717,
          "lagP95": 14.399999999965075,
          "endLag": 7.599999999976717,
          "maxBacklog": 1
        },
        "heapMb": 5.073947906494141,
        "heapCode": 2.6048431396484375,
        "heapData": 2.026653289794922,
        "pssTotalMb": 230.4794921875,
        "control": {
          "emitP50": 8.200000000011642,
          "emitP95": 17.699999999953434,
          "domP50": 8.400000000023283,
          "domP95": 17.899999999965075
        },
        "fCommitP50": 3,
        "fCommitP95": 8.699999999953434
      },
      "5000": {
        "setKey": {
          "emitP50": 10,
          "emitP95": 24.599999999976717,
          "domP50": 10.699999999953434,
          "domP95": 25.599999999976717
        },
        "setKeys": {
          "emitP50": 10.399999999965075,
          "emitP95": 21.20000000001164,
          "domP50": 11.200000000011642,
          "domP95": 21.70000000001164
        },
        "replace": {
          "emitP50": 14.399999999965075,
          "emitP95": 46.29999999998836,
          "domP50": 15.099999999976717,
          "domP95": 46.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.100000000034925,
          "lagP95": 14.599999999976717,
          "endLag": 6,
          "maxBacklog": 2
        },
        "heapMb": 9.318416595458984,
        "heapCode": 2.6472129821777344,
        "heapData": 6.085193634033203,
        "pssTotalMb": 232.79296875,
        "control": {
          "emitP50": 5.800000000046566,
          "emitP95": 12.700000000011642,
          "domP50": 6.300000000046566,
          "domP95": 13
        },
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 15.400000000023283
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.5,
        "emitP95": 16.900000000023283,
        "domP50": 10,
        "domP95": 17.600000000034925
      },
      "edit_d4": {
        "emitP50": 8.5,
        "emitP95": 16.800000000046566,
        "domP50": 9,
        "domP95": 17.100000000034925
      },
      "edit_d10": {
        "emitP50": 8.700000000011642,
        "emitP95": 22.900000000023283,
        "domP50": 9.200000000011642,
        "domP95": 23.5
      },
      "loadCycle": {
        "emitP50": 20.400000000023283,
        "emitP95": 48.20000000001164,
        "domP50": 21,
        "domP95": 48.600000000034925
      },
      "step": {
        "emitP50": 7.900000000023283,
        "emitP95": 13.599999999976717,
        "domP50": 8.399999999965075,
        "domP95": 15
      },
      "reset": {
        "emitP50": 9.900000000023283,
        "emitP95": 49.399999999965075,
        "domP50": 10.200000000011642,
        "domP95": 49.5
      },
      "append100": {
        "emitP50": 14.899999999965075,
        "emitP95": 17.5,
        "domP50": 15.200000000011642,
        "domP95": 17.70000000001164
      },
      "control": {
        "emitP50": 7.2000000000116415,
        "emitP95": 26.599999999976717,
        "domP50": 7.7000000000116415,
        "domP95": 26.79999999998836
      },
      "heapMb": 5.057586669921875,
      "heapCode": 2.761486053466797,
      "heapData": 1.8608818054199219,
      "pssTotalMb": 234.1396484375,
      "relaunchReadyMs": 434,
      "relaunchHeapMb": 4.157417297363281,
      "relaunchHeapCode": 2.0272178649902344,
      "relaunchHeapData": 1.7604522705078125
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.7000000000116415,
          "emitP95": 16.600000000034925,
          "domP50": 8.199999999953434,
          "domP95": 17.100000000034925
        },
        "setKeys": {
          "emitP50": 8.200000000011642,
          "emitP95": 17.20000000001164,
          "domP50": 9,
          "domP95": 17.900000000023283
        },
        "replace": {
          "emitP50": 8.700000000011642,
          "emitP95": 18.79999999998836,
          "domP50": 9.700000000011642,
          "domP95": 21.20000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.399999999965075,
          "lagP95": 13.099999999976717,
          "endLag": 5.399999999965075,
          "maxBacklog": 1
        },
        "heapMb": 4.629085540771484,
        "heapCode": 2.591419219970703,
        "heapData": 1.6097488403320312,
        "pssTotalMb": 229.4306640625,
        "control": {
          "emitP50": 6.2000000000116415,
          "emitP95": 15.399999999965075,
          "domP50": 6.399999999965075,
          "domP95": 15.599999999976717
        },
        "fCommitP50": 3.2999999999883585,
        "fCommitP95": 6.2999999999883585
      },
      "500": {
        "setKey": {
          "emitP50": 7.399999999965075,
          "emitP95": 23.20000000001164,
          "domP50": 7.899999999965075,
          "domP95": 23.600000000034925
        },
        "setKeys": {
          "emitP50": 9.5,
          "emitP95": 32.5,
          "domP50": 10.099999999976717,
          "domP95": 33.100000000034925
        },
        "replace": {
          "emitP50": 8.799999999988358,
          "emitP95": 39,
          "domP50": 9.5,
          "domP95": 39.40000000002328
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.800000000046566,
          "lagP95": 10.900000000023283,
          "endLag": 6.399999999965075,
          "maxBacklog": 1
        },
        "heapMb": 5.073616027832031,
        "heapCode": 2.6045684814453125,
        "heapData": 2.026653289794922,
        "pssTotalMb": 229.92578125,
        "control": {
          "emitP50": 5.900000000023283,
          "emitP95": 23.099999999976717,
          "domP50": 6.2000000000116415,
          "domP95": 23.599999999976717
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 9.300000000046566
      },
      "5000": {
        "setKey": {
          "emitP50": 9.700000000011642,
          "emitP95": 30.400000000023283,
          "domP50": 10.299999999988358,
          "domP95": 31.400000000023283
        },
        "setKeys": {
          "emitP50": 9.300000000046566,
          "emitP95": 30.29999999998836,
          "domP50": 10.099999999976717,
          "domP95": 30.900000000023283
        },
        "replace": {
          "emitP50": 14.200000000011642,
          "emitP95": 61.5,
          "domP50": 14.900000000023283,
          "domP95": 62.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 14.100000000034925,
          "endLag": 10.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.317935943603516,
        "heapCode": 2.646820068359375,
        "heapData": 6.084949493408203,
        "pssTotalMb": 235.2783203125,
        "control": {
          "emitP50": 5.899999999965075,
          "emitP95": 15,
          "domP50": 6.400000000023283,
          "domP95": 15.200000000011642
        },
        "fCommitP50": 3,
        "fCommitP95": 8.5
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.299999999988358,
        "emitP95": 17.899999999965075,
        "domP50": 9,
        "domP95": 18.70000000001164
      },
      "edit_d4": {
        "emitP50": 8.400000000023283,
        "emitP95": 21,
        "domP50": 8.700000000011642,
        "domP95": 21.5
      },
      "edit_d10": {
        "emitP50": 7.900000000023283,
        "emitP95": 17.899999999965075,
        "domP50": 8.299999999988358,
        "domP95": 18.399999999965075
      },
      "loadCycle": {
        "emitP50": 21.20000000001164,
        "emitP95": 48,
        "domP50": 21.900000000023283,
        "domP95": 48.40000000002328
      },
      "step": {
        "emitP50": 8.100000000034925,
        "emitP95": 17.099999999976717,
        "domP50": 8.700000000011642,
        "domP95": 17.399999999965075
      },
      "reset": {
        "emitP50": 17.29999999998836,
        "emitP95": 37,
        "domP50": 17.29999999998836,
        "domP95": 37.100000000034925
      },
      "append100": {
        "emitP50": 12.299999999988358,
        "emitP95": 30.399999999965075,
        "domP50": 13.5,
        "domP95": 30.899999999965075
      },
      "control": {
        "emitP50": 6.900000000023283,
        "emitP95": 19.79999999998836,
        "domP50": 7.100000000034925,
        "domP95": 20.20000000001164
      },
      "heapMb": 5.047630310058594,
      "heapCode": 2.761486053466797,
      "heapData": 1.8509445190429688,
      "pssTotalMb": 233.5546875,
      "relaunchReadyMs": 1029.2000000000698,
      "relaunchHeapMb": 4.154926300048828,
      "relaunchHeapCode": 2.024883270263672,
      "relaunchHeapData": 1.7604293823242188
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.2999999999301508,
          "domP50": 2.5,
          "domP95": 7.800000000046566
        },
        "setKeys": {
          "emitP50": 0.39999999990686774,
          "emitP95": 4.599999999976717,
          "domP50": 1.599999999976717,
          "domP95": 6.199999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.800000000046566,
          "domP50": 1.099999999976717,
          "domP95": 8.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.46087646484375,
        "heapCode": 1.5946884155273438,
        "heapData": 1.4996719360351562,
        "pssTotalMb": 216.505859375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 2.599999999976717,
          "domP50": 2.200000000069849,
          "domP95": 6.900000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1,
          "domP50": 1.5,
          "domP95": 10.099999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.9000000000232831,
          "domP50": 1.900000000023283,
          "domP95": 12.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6000000000931323,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.871784210205078,
        "heapCode": 1.6023101806640625,
        "heapData": 1.8889617919921875,
        "pssTotalMb": 219.876953125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.599999999976717,
          "domP50": 6.900000000023283,
          "domP95": 8.29999999993015
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 1.8999999999068677,
          "domP50": 2.699999999953434,
          "domP95": 12.29999999993015
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 9.699999999953434,
          "domP50": 2.200000000069849,
          "domP95": 10.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2000000000698492,
          "lagP95": 2.200000000069849,
          "endLag": 1.599999999976717,
          "maxBacklog": 0
        },
        "heapMb": 7.938091278076172,
        "heapCode": 1.6914253234863281,
        "heapData": 5.722068786621094,
        "pssTotalMb": 223.9384765625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.2000000000698492,
        "domP50": 4.800000000046566,
        "domP95": 9.099999999976717
      },
      "edit_d4": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.6000000000931323,
        "domP50": 1,
        "domP95": 13
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1000000000931323,
        "domP50": 1.2999999999301508,
        "domP95": 11.699999999953434
      },
      "loadCycle": {
        "emitP50": 0.8000000000465661,
        "emitP95": 34,
        "domP50": 0.8000000000465661,
        "domP95": 34.40000000002328
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 2.299999999930151,
        "domP50": 0.9000000000232831,
        "domP95": 10.20000000006985
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.7000000000698492,
        "domP50": 0.30000000004656613,
        "domP95": 1.7000000000698492
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 3.200000000069849,
        "domP50": 0.7000000000698492,
        "domP95": 8.600000000093132
      },
      "heapMb": 3.6829795837402344,
      "heapCode": 1.6846275329589844,
      "heapData": 1.6282730102539062,
      "pssTotalMb": 217.9296875,
      "relaunchReadyMs": 1335.5,
      "relaunchHeapMb": 3.3518905639648438,
      "relaunchHeapCode": 1.5398712158203125,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 3.300000000046566,
          "domP50": 5,
          "domP95": 10.900000000023283
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.7000000000698492,
          "domP50": 1.2999999999301508,
          "domP95": 11.29999999993015
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.900000000023283,
          "domP50": 1.1000000000931323,
          "domP95": 4.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 1,
          "endLag": 0.6999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 3.4609527587890625,
        "heapCode": 1.5947647094726562,
        "heapData": 1.4996719360351562,
        "pssTotalMb": 216.2587890625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 3.599999999976717,
          "domP50": 1.5,
          "domP95": 11.099999999976717
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6000000000931323,
          "domP50": 1,
          "domP95": 12.399999999906868
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.6000000000931323,
          "domP50": 1,
          "domP95": 6.600000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6999999999534339,
          "endLag": 0.8000000000465661,
          "maxBacklog": 0
        },
        "heapMb": 3.973896026611328,
        "heapCode": 1.6957931518554688,
        "heapData": 1.8916740417480469,
        "pssTotalMb": 220.353515625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.7000000000698492,
          "domP50": 6.599999999976717,
          "domP95": 7.900000000023283
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 4,
          "domP50": 3.400000000023283,
          "domP95": 9.29999999993015
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 3.199999999953434,
          "domP50": 2.400000000023283,
          "domP95": 6.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999301508,
          "lagP95": 1.6999999999534339,
          "endLag": 1,
          "maxBacklog": 0
        },
        "heapMb": 7.8382568359375,
        "heapCode": 1.6003608703613281,
        "heapData": 5.719356536865234,
        "pssTotalMb": 223.861328125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.3999999999068677,
        "domP50": 1.599999999976717,
        "domP95": 8
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.5999999999767169,
        "domP50": 1.2000000000698492,
        "domP95": 7.200000000069849
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.3000000000465661,
        "domP50": 1.599999999976717,
        "domP95": 13.099999999976717
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 34.5,
        "domP50": 0.6999999999534339,
        "domP95": 35
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6000000000931323,
        "domP50": 4.800000000046566,
        "domP95": 8.099999999976717
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 1.7999999999301508,
        "domP50": 0.2999999999301508,
        "domP95": 1.7999999999301508
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7000000000698492,
        "domP50": 0.7999999999301508,
        "domP95": 4
      },
      "heapMb": 3.776470184326172,
      "heapCode": 1.7694892883300781,
      "heapData": 1.6309852600097656,
      "pssTotalMb": 205.443359375,
      "relaunchReadyMs": 634.8999999999069,
      "relaunchHeapMb": 3.2579116821289062,
      "relaunchHeapCode": 1.45465087890625,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.400000000023283,
          "emitP95": 30.5,
          "domP50": 10.5,
          "domP95": 31.099999999976717
        },
        "setKeys": {
          "emitP50": 7.700000000069849,
          "emitP95": 19.5,
          "domP50": 8.400000000023283,
          "domP95": 20.300000000046566
        },
        "replace": {
          "emitP50": 8.099999999976717,
          "emitP95": 16.400000000023283,
          "domP50": 8.5,
          "domP95": 16.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.199999999953434,
          "lagP95": 13.79999999993015,
          "endLag": 14.800000000046566,
          "maxBacklog": 1
        },
        "heapMb": 4.629352569580078,
        "heapCode": 2.590667724609375,
        "heapData": 1.6097488403320312,
        "pssTotalMb": 216.2158203125,
        "control": {
          "emitP50": 7,
          "emitP95": 16.900000000023283,
          "domP50": 7.300000000046566,
          "domP95": 17.300000000046566
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 9.400000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 8.599999999976717,
          "emitP95": 22.900000000023283,
          "domP50": 9,
          "domP95": 23.600000000093132
        },
        "setKeys": {
          "emitP50": 10.400000000023283,
          "emitP95": 16.699999999953434,
          "domP50": 10.900000000023283,
          "domP95": 17.099999999976717
        },
        "replace": {
          "emitP50": 8.20000000006985,
          "emitP95": 18.699999999953434,
          "domP50": 9.29999999993015,
          "domP95": 19.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 8.29999999993015,
          "endLag": 6.099999999976717,
          "maxBacklog": 1
        },
        "heapMb": 5.073726654052734,
        "heapCode": 2.6046104431152344,
        "heapData": 2.0266494750976562,
        "pssTotalMb": 216.658203125,
        "control": {
          "emitP50": 6.799999999930151,
          "emitP95": 18.099999999976717,
          "domP50": 7.400000000023283,
          "domP95": 18.29999999993015
        },
        "fCommitP50": 3,
        "fCommitP95": 6.099999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 9.900000000023283,
          "emitP95": 27,
          "domP50": 10.300000000046566,
          "domP95": 27.5
        },
        "setKeys": {
          "emitP50": 11,
          "emitP95": 22.899999999906868,
          "domP50": 13,
          "domP95": 23.5
        },
        "replace": {
          "emitP50": 13.899999999906868,
          "emitP95": 61.79999999993015,
          "domP50": 14.399999999906868,
          "domP95": 62.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.5,
          "lagP95": 12.800000000046566,
          "endLag": 9.199999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.321426391601562,
        "heapCode": 2.6502456665039062,
        "heapData": 6.0849609375,
        "pssTotalMb": 219.9716796875,
        "control": {
          "emitP50": 6,
          "emitP95": 12.800000000046566,
          "domP50": 6.300000000046566,
          "domP95": 13.099999999976717
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 4.800000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.599999999976717,
        "emitP95": 17.800000000046566,
        "domP50": 8.20000000006985,
        "domP95": 18.20000000006985
      },
      "edit_d4": {
        "emitP50": 7.699999999953434,
        "emitP95": 17.599999999976717,
        "domP50": 8.5,
        "domP95": 18.099999999976717
      },
      "edit_d10": {
        "emitP50": 8.29999999993015,
        "emitP95": 26,
        "domP50": 9,
        "domP95": 26.5
      },
      "loadCycle": {
        "emitP50": 21.29999999993015,
        "emitP95": 51.59999999997672,
        "domP50": 21.699999999953434,
        "domP95": 52.09999999997672
      },
      "step": {
        "emitP50": 9,
        "emitP95": 30.199999999953434,
        "domP50": 9.29999999993015,
        "domP95": 31.29999999993015
      },
      "reset": {
        "emitP50": 12.5,
        "emitP95": 42.90000000002328,
        "domP50": 12.599999999976717,
        "domP95": 43
      },
      "append100": {
        "emitP50": 17.100000000093132,
        "emitP95": 30.300000000046566,
        "domP50": 17.800000000046566,
        "domP95": 31.099999999976717
      },
      "control": {
        "emitP50": 10.599999999976717,
        "emitP95": 21.699999999953434,
        "domP50": 10.900000000023283,
        "domP95": 22.099999999976717
      },
      "heapMb": 5.047649383544922,
      "heapCode": 2.761516571044922,
      "heapData": 1.8509445190429688,
      "pssTotalMb": 220.1318359375,
      "relaunchReadyMs": 417.5,
      "relaunchHeapMb": 4.218959808349609,
      "relaunchHeapCode": 2.0272369384765625,
      "relaunchHeapData": 1.8219757080078125
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.199999999953434,
          "emitP95": 15.099999999976717,
          "domP50": 7.799999999930151,
          "domP95": 15.900000000023283
        },
        "setKeys": {
          "emitP50": 8.400000000023283,
          "emitP95": 19.900000000023283,
          "domP50": 9.099999999976717,
          "domP95": 20.5
        },
        "replace": {
          "emitP50": 8.800000000046566,
          "emitP95": 22.900000000023283,
          "domP50": 9.800000000046566,
          "domP95": 23.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.900000000023283,
          "lagP95": 10.400000000023283,
          "endLag": 6.599999999976717,
          "maxBacklog": 1
        },
        "heapMb": 4.6287689208984375,
        "heapCode": 2.591136932373047,
        "heapData": 1.6097488403320312,
        "pssTotalMb": 215.4970703125,
        "control": {
          "emitP50": 6.199999999953434,
          "emitP95": 15.800000000046566,
          "domP50": 6.599999999976717,
          "domP95": 16.20000000006985
        },
        "fCommitP50": 3,
        "fCommitP95": 10.599999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 8.70000000006985,
          "emitP95": 19.5,
          "domP50": 9.20000000006985,
          "domP95": 20
        },
        "setKeys": {
          "emitP50": 8.900000000023283,
          "emitP95": 16,
          "domP50": 10.699999999953434,
          "domP95": 16.800000000046566
        },
        "replace": {
          "emitP50": 7.900000000023283,
          "emitP95": 13.70000000006985,
          "domP50": 8.5,
          "domP95": 14.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.5,
          "lagP95": 11.20000000006985,
          "endLag": 5.5,
          "maxBacklog": 1
        },
        "heapMb": 5.073719024658203,
        "heapCode": 2.604778289794922,
        "heapData": 2.0266494750976562,
        "pssTotalMb": 216.8369140625,
        "control": {
          "emitP50": 5.700000000069849,
          "emitP95": 26.900000000023283,
          "domP50": 6.200000000069849,
          "domP95": 27.29999999993015
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 10.20000000006985
      },
      "5000": {
        "setKey": {
          "emitP50": 11.800000000046566,
          "emitP95": 25.400000000023283,
          "domP50": 12.20000000006985,
          "domP95": 25.800000000046566
        },
        "setKeys": {
          "emitP50": 8.900000000023283,
          "emitP95": 21.099999999976717,
          "domP50": 9.900000000023283,
          "domP95": 21.400000000023283
        },
        "replace": {
          "emitP50": 15.900000000023283,
          "emitP95": 56.800000000046566,
          "domP50": 16.900000000023283,
          "domP95": 57.40000000002328
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 14.70000000006985,
          "endLag": 9.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.319171905517578,
        "heapCode": 2.6481475830078125,
        "heapData": 6.0849456787109375,
        "pssTotalMb": 219.7197265625,
        "control": {
          "emitP50": 5.399999999906868,
          "emitP95": 12.699999999953434,
          "domP50": 5.699999999953434,
          "domP95": 13
        },
        "fCommitP50": 3,
        "fCommitP95": 15.099999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.799999999930151,
        "emitP95": 20.099999999976717,
        "domP50": 8.20000000006985,
        "domP95": 20.5
      },
      "edit_d4": {
        "emitP50": 6.800000000046566,
        "emitP95": 14.199999999953434,
        "domP50": 7.299999999930151,
        "domP95": 14.79999999993015
      },
      "edit_d10": {
        "emitP50": 7.400000000023283,
        "emitP95": 18.70000000006985,
        "domP50": 7.800000000046566,
        "domP95": 19.20000000006985
      },
      "loadCycle": {
        "emitP50": 19.900000000023283,
        "emitP95": 53.800000000046566,
        "domP50": 20.900000000023283,
        "domP95": 54.40000000002328
      },
      "step": {
        "emitP50": 6.599999999976717,
        "emitP95": 14.099999999976717,
        "domP50": 7,
        "domP95": 16.900000000023283
      },
      "reset": {
        "emitP50": 8.099999999976717,
        "emitP95": 18.70000000006985,
        "domP50": 8.099999999976717,
        "domP95": 18.800000000046566
      },
      "append100": {
        "emitP50": 14,
        "emitP95": 22.400000000023283,
        "domP50": 14.5,
        "domP95": 22.79999999993015
      },
      "control": {
        "emitP50": 5.5,
        "emitP95": 14.800000000046566,
        "domP50": 6.400000000023283,
        "domP95": 15.300000000046566
      },
      "heapMb": 5.057781219482422,
      "heapCode": 2.7616806030273438,
      "heapData": 1.8608818054199219,
      "pssTotalMb": 219.9912109375,
      "relaunchReadyMs": 402.29999999993015,
      "relaunchHeapMb": 4.216728210449219,
      "relaunchHeapCode": 2.0247955322265625,
      "relaunchHeapData": 1.8222465515136719
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.2000000000698492,
          "emitP95": 0.5999999999767169,
          "domP50": 5.400000000023283,
          "domP95": 6.5
        },
        "setKeys": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.7000000000698492,
          "domP50": 1,
          "domP95": 7
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.2000000000698492,
          "domP50": 1.1999999999534339,
          "domP95": 5.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 3.5628089904785156,
        "heapCode": 1.6879119873046875,
        "heapData": 1.5023841857910156,
        "pssTotalMb": 202.85546875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 2.3999999999068677,
          "domP50": 5.800000000046566,
          "domP95": 9
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.1000000000931323,
          "domP50": 2.200000000069849,
          "domP95": 9.199999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.099999999976717,
          "domP50": 1.400000000023283,
          "domP95": 5.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.8717994689941406,
        "heapCode": 1.602325439453125,
        "heapData": 1.8889617919921875,
        "pssTotalMb": 206.2548828125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.5,
          "emitP95": 3.1000000000931323,
          "domP50": 3,
          "domP95": 11.400000000023283
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 6,
          "domP50": 2.5,
          "domP95": 7.5
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.099999999976717,
          "domP50": 1.400000000023283,
          "domP95": 8.100000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 2.599999999976717,
          "endLag": 5.799999999930151,
          "maxBacklog": 0
        },
        "heapMb": 7.935771942138672,
        "heapCode": 1.6891059875488281,
        "heapData": 5.722068786621094,
        "pssTotalMb": 211.2939453125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.6999999999534339,
        "domP50": 5.400000000023283,
        "domP95": 6.799999999930151
      },
      "edit_d4": {
        "emitP50": 0.5,
        "emitP95": 2.599999999976717,
        "domP50": 1.400000000023283,
        "domP95": 6.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1,
        "domP50": 1.3000000000465661,
        "domP95": 6.699999999953434
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 32.89999999990687,
        "domP50": 0.6999999999534339,
        "domP95": 33.5
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 1.400000000023283,
        "domP50": 1.599999999976717,
        "domP95": 7
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.8000000000465661,
        "domP50": 0.2000000000698492,
        "domP95": 1.6000000000931323
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 0.8000000000465661,
        "domP95": 5.800000000046566
      },
      "heapMb": 3.7764854431152344,
      "heapCode": 1.7695045471191406,
      "heapData": 1.6309852600097656,
      "pssTotalMb": 204.404296875,
      "relaunchReadyMs": 661.5,
      "relaunchHeapMb": 3.257965087890625,
      "relaunchHeapCode": 1.4546890258789062,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.9000000000232831,
          "domP50": 2.900000000023283,
          "domP95": 7.799999999930151
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.800000000046566,
          "domP50": 2.099999999976717,
          "domP95": 7.900000000023283
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 3.800000000046566,
          "domP50": 4.799999999930151,
          "domP95": 6.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.563030242919922,
        "heapCode": 1.6881332397460938,
        "heapData": 1.5023841857910156,
        "pssTotalMb": 203.2900390625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 7.399999999906868,
          "domP50": 2.700000000069849,
          "domP95": 15.900000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.7999999999301508,
          "domP50": 1.099999999976717,
          "domP95": 8.300000000046566
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.400000000023283,
          "domP50": 1.3000000000465661,
          "domP95": 7.899999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 2.199999999953434,
          "maxBacklog": 0
        },
        "heapMb": 3.9739036560058594,
        "heapCode": 1.69580078125,
        "heapData": 1.8916740417480469,
        "pssTotalMb": 206.447265625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.8000000000465661,
          "domP50": 6.900000000023283,
          "domP95": 15.099999999976717
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 12.300000000046566,
          "domP50": 3,
          "domP95": 14.300000000046566
        },
        "replace": {
          "emitP50": 0.5,
          "emitP95": 10.29999999993015,
          "domP50": 2.200000000069849,
          "domP95": 11.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2000000000698492,
          "lagP95": 2.1000000000931323,
          "endLag": 1.3000000000465661,
          "maxBacklog": 0
        },
        "heapMb": 7.938030242919922,
        "heapCode": 1.6913642883300781,
        "heapData": 5.722068786621094,
        "pssTotalMb": 210.0712890625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6999999999534339,
        "domP50": 6.200000000069849,
        "domP95": 7.900000000023283
      },
      "edit_d4": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1,
        "domP50": 5.5,
        "domP95": 7.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.8000000000465661,
        "domP50": 1.2000000000698492,
        "domP95": 6.599999999976717
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33.09999999997672,
        "domP50": 0.6999999999534339,
        "domP95": 33.5
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 4.900000000023283,
        "domP95": 7.700000000069849
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 1.900000000023283,
        "domP50": 0.30000000004656613,
        "domP95": 2.699999999953434
      },
      "append100": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.5999999999767169,
        "domP50": 0.7999999999301508,
        "domP95": 1.8000000000465661
      },
      "heapMb": 3.969921112060547,
      "heapCode": 1.9542579650878906,
      "heapData": 1.6339683532714844,
      "pssTotalMb": 207.2421875,
      "relaunchReadyMs": 1282.2999999999302,
      "relaunchHeapMb": 3.2579498291015625,
      "relaunchHeapCode": 1.4546890258789062,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.699999999953434,
          "emitP95": 16.800000000046566,
          "domP50": 8.400000000023283,
          "domP95": 17.400000000023283
        },
        "setKeys": {
          "emitP50": 9,
          "emitP95": 19.099999999976717,
          "domP50": 10.599999999976717,
          "domP95": 22.100000000093132
        },
        "replace": {
          "emitP50": 8.199999999953434,
          "emitP95": 28.79999999993015,
          "domP50": 8.599999999976717,
          "domP95": 29.399999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.399999999906868,
          "lagP95": 13.20000000006985,
          "endLag": 8.400000000023283,
          "maxBacklog": 1
        },
        "heapMb": 4.629390716552734,
        "heapCode": 2.5906944274902344,
        "heapData": 1.6097602844238281,
        "pssTotalMb": 216.1552734375,
        "control": {
          "emitP50": 6.299999999930151,
          "emitP95": 15,
          "domP50": 6.800000000046566,
          "domP95": 15.20000000006985
        },
        "fCommitP50": 3.200000000069849,
        "fCommitP95": 6.300000000046566
      },
      "500": {
        "setKey": {
          "emitP50": 8.599999999976717,
          "emitP95": 22.599999999976717,
          "domP50": 9.099999999976717,
          "domP95": 23
        },
        "setKeys": {
          "emitP50": 7.799999999930151,
          "emitP95": 13.399999999906868,
          "domP50": 8.400000000023283,
          "domP95": 14
        },
        "replace": {
          "emitP50": 10.099999999976717,
          "emitP95": 25,
          "domP50": 10.70000000006985,
          "domP95": 25.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.299999999930151,
          "lagP95": 13.600000000093132,
          "endLag": 7.099999999976717,
          "maxBacklog": 1
        },
        "heapMb": 5.073753356933594,
        "heapCode": 2.6047096252441406,
        "heapData": 2.0266494750976562,
        "pssTotalMb": 216.6982421875,
        "control": {
          "emitP50": 9.099999999976717,
          "emitP95": 24.099999999976717,
          "domP50": 9.70000000006985,
          "domP95": 24.699999999953434
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 6
      },
      "5000": {
        "setKey": {
          "emitP50": 11.900000000023283,
          "emitP95": 20.79999999993015,
          "domP50": 12.5,
          "domP95": 22.20000000006985
        },
        "setKeys": {
          "emitP50": 9.70000000006985,
          "emitP95": 21.800000000046566,
          "domP50": 10.599999999976717,
          "domP95": 22.199999999953434
        },
        "replace": {
          "emitP50": 12.900000000023283,
          "emitP95": 54.5,
          "domP50": 13.300000000046566,
          "domP95": 54.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.799999999930151,
          "lagP95": 11.400000000023283,
          "endLag": 8.29999999993015,
          "maxBacklog": 2
        },
        "heapMb": 9.47918701171875,
        "heapCode": 2.6357078552246094,
        "heapData": 6.257274627685547,
        "pssTotalMb": 219.333984375,
        "control": {
          "emitP50": 5.800000000046566,
          "emitP95": 12.899999999906868,
          "domP50": 6,
          "domP95": 13.099999999976717
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 10.600000000093132
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8,
        "emitP95": 18.29999999993015,
        "domP50": 8.599999999976717,
        "domP95": 18.800000000046566
      },
      "edit_d4": {
        "emitP50": 8.699999999953434,
        "emitP95": 15.20000000006985,
        "domP50": 9.199999999953434,
        "domP95": 15.800000000046566
      },
      "edit_d10": {
        "emitP50": 9.300000000046566,
        "emitP95": 17.400000000023283,
        "domP50": 9.70000000006985,
        "domP95": 17.699999999953434
      },
      "loadCycle": {
        "emitP50": 11.79999999993015,
        "emitP95": 43.300000000046566,
        "domP50": 11.900000000023283,
        "domP95": 43.699999999953434
      },
      "step": {
        "emitP50": 7.900000000023283,
        "emitP95": 19.900000000023283,
        "domP50": 8.20000000006985,
        "domP95": 20.300000000046566
      },
      "reset": {
        "emitP50": 9.199999999953434,
        "emitP95": 15.79999999993015,
        "domP50": 9.5,
        "domP95": 15.900000000023283
      },
      "append100": {
        "emitP50": 12.199999999953434,
        "emitP95": 23.099999999976717,
        "domP50": 12.5,
        "domP95": 23.79999999993015
      },
      "control": {
        "emitP50": 6.199999999953434,
        "emitP95": 13.5,
        "domP50": 6.5,
        "domP95": 13.800000000046566
      },
      "heapMb": 5.048595428466797,
      "heapCode": 2.7624855041503906,
      "heapData": 1.85089111328125,
      "pssTotalMb": 220.5576171875,
      "relaunchReadyMs": 431,
      "relaunchHeapMb": 4.154876708984375,
      "relaunchHeapCode": 2.0248870849609375,
      "relaunchHeapData": 1.7603950500488281
    }
  }
]
```
</details>
