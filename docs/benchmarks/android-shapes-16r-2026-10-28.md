# Phase 16 shapes — flat objects & hybrid workflow (2026-10-27)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.13 ms, p95 7.83 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 48 / CODE-BOUND 0 / FAIL 37

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.34 ± 0.05 | 7.96 ± 0.94 | 23.4× | FAIL | allow 7.2 (control emitP50 6.2×1) |
| flat | 50.setKey.emitP95 | 0.76 ± 0.45 | 24.98 ± 3.93 | 32.9× | FAIL | allow 20.7 (control emitP95 16.3×1) |
| flat | 50.setKey.domP50 | 4.54 ± 1.77 | 8.38 ± 0.81 | 1.8× | PLATFORM-BOUND | allow 9.0 (control domP50 6.4×1) |
| flat | 50.setKey.domP95 | 7.50 ± 1.10 | 25.58 ± 3.85 | 3.4× | PLATFORM-BOUND | allow 21.8 (control domP95 16.8×1) |
| flat | 50.setKeys.emitP50 | 0.38 ± 0.04 | 7.54 ± 0.38 | 19.8× | FAIL | allow 6.6 (control emitP50 6.2×1) |
| flat | 50.setKeys.emitP95 | 2.08 ± 2.70 | 18.50 ± 1.43 | 8.9× | PLATFORM-BOUND | allow 20.5 (control emitP95 16.3×1) |
| flat | 50.setKeys.domP50 | 2.08 ± 1.76 | 8.10 ± 0.28 | 3.9× | PLATFORM-BOUND | allow 8.4 (control domP50 6.4×1) |
| flat | 50.setKeys.domP95 | 8.56 ± 1.92 | 19.04 ± 1.50 | 2.2× | PLATFORM-BOUND | allow 20.2 (control domP95 16.8×1) |
| flat | 50.replace.emitP50 | 0.34 ± 0.05 | 6.88 ± 0.76 | 20.2× | PLATFORM-BOUND | allow 7.0 (control emitP50 6.2×1) |
| flat | 50.replace.emitP95 | 1.30 ± 0.90 | 18.12 ± 4.72 | 13.9× | PLATFORM-BOUND | allow 22.0 (control emitP95 16.3×1) |
| flat | 50.replace.domP50 | 2.26 ± 1.59 | 7.42 ± 0.90 | 3.3× | PLATFORM-BOUND | allow 8.9 (control domP50 6.4×1) |
| flat | 50.replace.domP95 | 7.66 ± 1.68 | 19.20 ± 5.15 | 2.5× | PLATFORM-BOUND | allow 23.6 (control domP95 16.8×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 6.12 ± 0.66 | 20.4× | PLATFORM-BOUND | allow 6.8 (control emitP50 6.2×1) |
| flat | 50.burst.lagP95 | 0.58 ± 0.11 | 13.96 ± 3.82 | 24.1× | PLATFORM-BOUND | allow 20.3 (control emitP95 16.3×1) |
| flat | 50.burst.endLag | 0.30 ± 0.10 | 6.68 ± 2.88 | 22.3× | PLATFORM-BOUND | allow 9.2 (control emitP50 6.2×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 50.heapMb | 3.69 ± 0.07 | 5.06 ± 0.00 | 1.4× | FAIL | code +1.19 MB; data 1.50 -> 1.62 MB |
| flat | 50.pssTotalMb | 223.03 ± 1.75 | 235.37 ± 2.82 | 1.1× | FAIL | allow 7.5 (plugin baseline 3.0 MB) |
| flat | 500.setKey.emitP50 | 0.44 ± 0.13 | 8.32 ± 1.23 | 18.9× | FAIL | allow 7.1 (control emitP50 5.8×1) |
| flat | 500.setKey.emitP95 | 1.08 ± 0.13 | 20.34 ± 2.68 | 18.8× | FAIL | allow 17.0 (control emitP95 14.1×1) |
| flat | 500.setKey.domP50 | 3.98 ± 2.14 | 8.88 ± 1.30 | 2.2× | PLATFORM-BOUND | allow 9.4 (control domP50 6.0×1) |
| flat | 500.setKey.domP95 | 8.26 ± 1.61 | 21.22 ± 2.34 | 2.6× | PLATFORM-BOUND | allow 18.8 (control domP95 14.9×1) |
| flat | 500.setKeys.emitP50 | 0.46 ± 0.05 | 9.62 ± 1.43 | 20.9× | FAIL | allow 7.2 (control emitP50 5.8×1) |
| flat | 500.setKeys.emitP95 | 4.80 ± 5.46 | 24.60 ± 4.67 | 5.1× | PLATFORM-BOUND | allow 24.3 (control emitP95 14.1×1) |
| flat | 500.setKeys.domP50 | 2.50 ± 1.62 | 10.14 ± 1.36 | 4.1× | PLATFORM-BOUND | allow 9.0 (control domP50 6.0×1) |
| flat | 500.setKeys.domP95 | 13.28 ± 5.30 | 26.48 ± 4.32 | 2.0× | PLATFORM-BOUND | allow 24.5 (control domP95 14.9×1) |
| flat | 500.replace.emitP50 | 0.30 ± 0.00 | 8.60 ± 0.53 | 28.7× | FAIL | allow 6.3 (control emitP50 5.8×1) |
| flat | 500.replace.emitP95 | 1.88 ± 1.61 | 16.00 ± 1.64 | 8.5× | PLATFORM-BOUND | allow 17.4 (control emitP95 14.1×1) |
| flat | 500.replace.domP50 | 1.08 ± 0.13 | 9.04 ± 0.44 | 8.4× | FAIL | allow 6.5 (control domP50 6.0×1) |
| flat | 500.replace.domP95 | 9.52 ± 1.79 | 16.38 ± 1.63 | 1.7× | PLATFORM-BOUND | allow 18.3 (control domP95 14.9×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 6.28 ± 0.40 | 15.7× | PLATFORM-BOUND | allow 6.2 (control emitP50 5.8×1) |
| flat | 500.burst.lagP95 | 0.72 ± 0.08 | 12.90 ± 3.31 | 17.9× | PLATFORM-BOUND | allow 17.5 (control emitP95 14.1×1) |
| flat | 500.burst.endLag | 0.40 ± 0.14 | 6.34 ± 1.35 | 15.9× | PLATFORM-BOUND | allow 7.3 (control emitP50 5.8×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.60 ± 0.55 | 2600000000.0× | FAIL |  |
| flat | 500.heapMb | 4.13 ± 0.00 | 5.55 ± 0.00 | 1.3× | FAIL | code +1.18 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 226.96 ± 2.12 | 236.41 ± 2.56 | 1.0× | FAIL | allow 7.6 (plugin baseline 3.0 MB) |
| flat | 5000.setKey.emitP50 | 1.34 ± 0.29 | 9.96 ± 0.62 | 7.4× | FAIL | allow 6.5 (control emitP50 5.6×1) |
| flat | 5000.setKey.emitP95 | 2.34 ± 1.05 | 25.84 ± 5.04 | 11.0× | FAIL | allow 22.1 (control emitP95 16.0×1) |
| flat | 5000.setKey.domP50 | 5.16 ± 2.06 | 10.72 ± 0.75 | 2.1× | PLATFORM-BOUND | allow 8.8 (control domP50 6.0×1) |
| flat | 5000.setKey.domP95 | 9.46 ± 2.35 | 27.60 ± 5.01 | 2.9× | PLATFORM-BOUND | allow 23.7 (control domP95 16.3×1) |
| flat | 5000.setKeys.emitP50 | 1.52 ± 0.11 | 9.64 ± 0.50 | 6.3× | FAIL | allow 6.3 (control emitP50 5.6×1) |
| flat | 5000.setKeys.emitP95 | 3.32 ± 0.93 | 18.70 ± 2.27 | 5.6× | PLATFORM-BOUND | allow 19.2 (control emitP95 16.0×1) |
| flat | 5000.setKeys.domP50 | 2.90 ± 0.32 | 10.54 ± 0.81 | 3.6× | FAIL | allow 7.1 (control domP50 6.0×1) |
| flat | 5000.setKeys.domP95 | 10.60 ± 4.17 | 19.14 ± 2.25 | 1.8× | PLATFORM-BOUND | allow 22.7 (control domP95 16.3×1) |
| flat | 5000.replace.emitP50 | 0.38 ± 0.04 | 12.60 ± 0.75 | 33.2× | FAIL | allow 6.4 (control emitP50 5.6×1) |
| flat | 5000.replace.emitP95 | 1.74 ± 0.55 | 22.50 ± 3.43 | 12.9× | FAIL | allow 20.0 (control emitP95 16.0×1) |
| flat | 5000.replace.domP50 | 1.62 ± 0.13 | 13.10 ± 0.82 | 8.1× | FAIL | allow 6.9 (control domP50 6.0×1) |
| flat | 5000.replace.domP95 | 6.32 ± 2.55 | 22.90 ± 3.44 | 3.6× | PLATFORM-BOUND | allow 22.3 (control domP95 16.3×1) |
| flat | 5000.burst.lagP50 | 1.30 ± 0.12 | 8.06 ± 0.33 | 6.2× | FAIL | allow 6.1 (control emitP50 5.6×1) |
| flat | 5000.burst.lagP95 | 2.14 ± 0.44 | 15.80 ± 2.68 | 7.4× | PLATFORM-BOUND | allow 19.1 (control emitP95 16.0×1) |
| flat | 5000.burst.endLag | 1.50 ± 0.16 | 7.82 ± 1.58 | 5.2× | PLATFORM-BOUND | allow 7.4 (control emitP50 5.6×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.04 ± 0.09 | 9.93 ± 0.01 | 1.2× | FAIL | code +1.29 MB; data 5.72 -> 6.26 MB |
| flat | 5000.pssTotalMb | 230.47 ± 3.97 | 243.93 ± 2.37 | 1.1× | FAIL | allow 9.3 (plugin baseline 3.0 MB) |
| workflow | edit_d1.emitP50 | 0.36 ± 0.11 | 7.58 ± 0.47 | 21.1× | FAIL | allow 6.5 (control emitP50 5.9×1) |
| workflow | edit_d1.emitP95 | 1.14 ± 0.55 | 18.24 ± 4.90 | 16.0× | PLATFORM-BOUND | allow 27.6 (control emitP95 22.2×1) |
| workflow | edit_d1.domP50 | 3.80 ± 1.63 | 8.06 ± 0.64 | 2.1× | PLATFORM-BOUND | allow 8.6 (control domP50 6.3×1) |
| workflow | edit_d1.domP95 | 6.90 ± 0.76 | 18.74 ± 5.00 | 2.7× | PLATFORM-BOUND | allow 28.3 (control domP95 22.5×1) |
| workflow | edit_d4.emitP50 | 0.40 ± 0.00 | 6.90 ± 0.21 | 17.2× | FAIL | allow 6.1 (control emitP50 5.9×1) |
| workflow | edit_d4.emitP95 | 1.52 ± 0.85 | 15.12 ± 1.89 | 9.9× | PLATFORM-BOUND | allow 24.9 (control emitP95 22.2×1) |
| workflow | edit_d4.domP50 | 2.64 ± 1.50 | 7.58 ± 0.16 | 2.9× | PLATFORM-BOUND | allow 8.0 (control domP50 6.3×1) |
| workflow | edit_d4.domP95 | 10.84 ± 1.75 | 15.66 ± 2.06 | 1.4× | PLATFORM-BOUND | allow 26.3 (control domP95 22.5×1) |
| workflow | edit_d10.emitP50 | 0.44 ± 0.05 | 7.46 ± 0.26 | 17.0× | FAIL | allow 6.2 (control emitP50 5.9×1) |
| workflow | edit_d10.emitP95 | 1.08 ± 0.48 | 15.56 ± 2.91 | 14.4× | PLATFORM-BOUND | allow 25.6 (control emitP95 22.2×1) |
| workflow | edit_d10.domP50 | 1.86 ± 0.47 | 8.20 ± 0.46 | 4.4× | PLATFORM-BOUND | allow 7.3 (control domP50 6.3×1) |
| workflow | edit_d10.domP95 | 9.50 ± 1.97 | 17.32 ± 2.63 | 1.8× | PLATFORM-BOUND | allow 27.1 (control domP95 22.5×1) |
| workflow | loadCycle.emitP50 | 6.32 ± 7.97 | 15.98 ± 2.23 | 2.5× | PLATFORM-BOUND | allow 22.0 (control emitP50 5.9×2) |
| workflow | loadCycle.emitP95 | 33.36 ± 0.34 | 53.60 ± 4.19 | 1.6× | PLATFORM-BOUND | allow 48.9 (control emitP95 22.2×2) |
| workflow | loadCycle.domP50 | 6.64 ± 8.09 | 16.24 ± 2.25 | 2.4× | PLATFORM-BOUND | allow 23.0 (control domP50 6.3×2) |
| workflow | loadCycle.domP95 | 33.70 ± 0.30 | 54.00 ± 4.10 | 1.6× | PLATFORM-BOUND | allow 49.4 (control domP95 22.5×2) |
| workflow | step.emitP50 | 0.34 ± 0.05 | 6.62 ± 0.36 | 19.5× | PLATFORM-BOUND | allow 6.3 (control emitP50 5.9×1) |
| workflow | step.emitP95 | 1.02 ± 0.41 | 15.32 ± 1.91 | 15.0× | PLATFORM-BOUND | allow 24.5 (control emitP95 22.2×1) |
| workflow | step.domP50 | 3.44 ± 1.14 | 7.10 ± 0.26 | 2.1× | PLATFORM-BOUND | allow 7.7 (control domP50 6.3×1) |
| workflow | step.domP95 | 8.12 ± 1.80 | 16.02 ± 1.90 | 2.0× | PLATFORM-BOUND | allow 26.2 (control domP95 22.5×1) |
| workflow | reset.emitP50 | 0.26 ± 0.05 | 23.92 ± 1.85 | 92.0× | FAIL | allow 7.8 (control emitP50 5.9×1) |
| workflow | reset.emitP95 | 0.46 ± 0.13 | 38.86 ± 7.13 | 84.5× | FAIL | allow 29.5 (control emitP95 22.2×1) |
| workflow | reset.domP50 | 0.26 ± 0.05 | 23.94 ± 1.89 | 92.1× | FAIL | allow 8.3 (control domP50 6.3×1) |
| workflow | reset.domP95 | 2.32 ± 2.36 | 38.86 ± 7.13 | 16.8× | FAIL | allow 32.0 (control domP95 22.5×1) |
| workflow | append100.emitP50 | 0.38 ± 0.04 | 12.64 ± 1.31 | 33.3× | FAIL | allow 7.3 (control emitP50 5.9×1) |
| workflow | append100.emitP95 | 1.14 ± 0.63 | 38.00 ± 25.29 | 33.3× | PLATFORM-BOUND | allow 48.1 (control emitP95 22.2×1) |
| workflow | append100.domP50 | 0.92 ± 0.19 | 13.08 ± 1.49 | 14.2× | FAIL | allow 8.0 (control domP50 6.3×1) |
| workflow | append100.domP95 | 5.92 ± 3.57 | 38.48 ± 25.13 | 6.5× | PLATFORM-BOUND | allow 51.2 (control domP95 22.5×1) |
| workflow | heapMb | 3.94 ± 0.00 | 5.49 ± 0.01 | 1.4× | FAIL | code +1.25 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 225.17 ± 2.17 | 238.18 ± 2.40 | 1.1× | FAIL | allow 7.5 (plugin baseline 3.0 MB) |
| workflow | relaunchReadyMs | 764.22 ± 343.53 | 549.54 ± 230.78 | 0.7× | PASS |  |
| workflow | relaunchHeapMb | 3.35 ± 0.00 | 4.45 ± 0.11 | 1.3× | FAIL | code +0.70 MB; data 1.45 -> 1.83 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 6.18 | 6.40 | 16.80 | 7.96 | 8.38 | 25.58 |
| 500 | 5.76 | 5.98 | 14.88 | 8.32 | 8.88 | 21.22 |
| 5000 | 5.64 | 5.98 | 16.30 | 9.96 | 10.72 | 27.60 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 126.2 | 132.2 | 96.8 | 103.1 |
| flat 500 | 126.3 | 132.6 | 100.7 | 103.8 |
| flat 5000 | 125.7 | 134.7 | 104.8 | 109.2 |
| workflow | 126.7 | 133.0 | 98.5 | 105.2 |

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
          "emitP95": 0.5999999999767169,
          "domP50": 5.5,
          "domP95": 7.5
        },
        "setKeys": {
          "emitP50": 0.29999999998835847,
          "emitP95": 6.900000000023283,
          "domP50": 5.099999999976717,
          "domP95": 7.100000000034925
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.7000000000116415,
          "domP50": 1.2000000000116415,
          "domP95": 8.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.5999999999767169,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.7237815856933594,
        "heapCode": 1.8439979553222656,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 221.7998046875,
        "pssApp": 125.4033203125,
        "pssRenderer": 96.396484375
      },
      "500": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.9000000000232831,
          "domP50": 5.800000000046566,
          "domP95": 6.7999999999883585
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.099999999976717,
          "domP50": 5.300000000046566,
          "domP95": 14
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 4.599999999976717,
          "domP50": 1,
          "domP95": 9.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000116415,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 4.133842468261719,
        "heapCode": 1.8510665893554688,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 225.412109375,
        "pssApp": 125.3447265625,
        "pssRenderer": 100.0673828125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1000000000349246,
          "emitP95": 1.5,
          "domP50": 6.600000000034925,
          "domP95": 7.7000000000116415
        },
        "setKeys": {
          "emitP50": 1.400000000023283,
          "emitP95": 3.699999999953434,
          "domP50": 3.199999999953434,
          "domP95": 17.899999999965075
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 1.2000000000116415,
          "domP50": 1.3999999999650754,
          "domP95": 7.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2000000000116415,
          "lagP95": 1.900000000023283,
          "endLag": 1.599999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.099651336669922,
        "heapCode": 1.8475227355957031,
        "heapData": 5.725639343261719,
        "pssTotalMb": 229.3955078125,
        "pssApp": 125.1962890625,
        "pssRenderer": 104.19921875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.2000000000116415,
        "domP50": 1.3999999999650754,
        "domP95": 6.800000000046566
      },
      "edit_d4": {
        "emitP50": 0.3999999999650754,
        "emitP95": 1.2000000000116415,
        "domP50": 1.2000000000116415,
        "domP95": 8.099999999976717
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1,
        "domP50": 2.2999999999883585,
        "domP95": 11
      },
      "loadCycle": {
        "emitP50": 15,
        "emitP95": 33.5,
        "domP50": 15.399999999965075,
        "domP95": 33.800000000046566
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.6000000000349246,
        "domP50": 3.2000000000116415,
        "domP95": 11
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 0.7000000000116415,
        "domP50": 0.20000000001164153,
        "domP95": 6.5
      },
      "append100": {
        "emitP50": 0.29999999998835847,
        "emitP95": 1.6000000000349246,
        "domP50": 0.7000000000116415,
        "domP95": 5.600000000034925
      },
      "heapMb": 3.9362831115722656,
      "heapCode": 1.9245452880859375,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 222.9716796875,
      "pssApp": 124.9482421875,
      "pssRenderer": 98.0234375,
      "relaunchReadyMs": 1378,
      "relaunchHeapMb": 3.3520660400390625,
      "relaunchHeapCode": 1.5400581359863281,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.7999999999883585,
          "emitP95": 22.600000000034925,
          "domP50": 8.199999999953434,
          "domP95": 22.900000000023283
        },
        "setKeys": {
          "emitP50": 7.800000000046566,
          "emitP95": 20.5,
          "domP50": 8.400000000023283,
          "domP95": 21
        },
        "replace": {
          "emitP50": 8.099999999976717,
          "emitP95": 16.600000000034925,
          "domP50": 8.900000000023283,
          "domP95": 16.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.7999999999883585,
          "lagP95": 14.200000000011642,
          "endLag": 4.2000000000116415,
          "maxBacklog": 2
        },
        "heapMb": 5.052433013916016,
        "heapCode": 2.9980392456054688,
        "heapData": 1.6158981323242188,
        "pssTotalMb": 233.408203125,
        "pssApp": 131.171875,
        "pssRenderer": 102.236328125,
        "control": {
          "emitP50": 7.600000000034925,
          "emitP95": 15.799999999988358,
          "domP50": 7.800000000046566,
          "domP95": 16.100000000034925
        },
        "fCommitP50": 3.2000000000116415,
        "fCommitP95": 7.100000000034925
      },
      "500": {
        "setKey": {
          "emitP50": 9.5,
          "emitP95": 21.70000000001164,
          "domP50": 9.800000000046566,
          "domP95": 22.79999999998836
        },
        "setKeys": {
          "emitP50": 9.5,
          "emitP95": 20.899999999965075,
          "domP50": 9.799999999988358,
          "domP95": 27.300000000046566
        },
        "replace": {
          "emitP50": 8.200000000011642,
          "emitP95": 16,
          "domP50": 8.700000000011642,
          "domP95": 16.70000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.800000000046566,
          "lagP95": 17.29999999998836,
          "endLag": 8.400000000023283,
          "maxBacklog": 3
        },
        "heapMb": 5.553688049316406,
        "heapCode": 3.029327392578125,
        "heapData": 2.0685653686523438,
        "pssTotalMb": 234.2734375,
        "pssApp": 131.4140625,
        "pssRenderer": 102.859375,
        "control": {
          "emitP50": 5.2000000000116415,
          "emitP95": 14.5,
          "domP50": 5.5,
          "domP95": 14.899999999965075
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 6.399999999965075
      },
      "5000": {
        "setKey": {
          "emitP50": 10.400000000023283,
          "emitP95": 17.800000000046566,
          "domP50": 11,
          "domP95": 19.600000000034925
        },
        "setKeys": {
          "emitP50": 9.5,
          "emitP95": 17.29999999998836,
          "domP50": 10.400000000023283,
          "domP95": 17.79999999998836
        },
        "replace": {
          "emitP50": 13.900000000023283,
          "emitP95": 23.399999999965075,
          "domP50": 14.5,
          "domP95": 23.70000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 18.599999999976717,
          "endLag": 10,
          "maxBacklog": 2
        },
        "heapMb": 9.930370330810547,
        "heapCode": 3.07281494140625,
        "heapData": 6.26025390625,
        "pssTotalMb": 240.7998046875,
        "pssApp": 132.5029296875,
        "pssRenderer": 108.296875,
        "control": {
          "emitP50": 5.899999999965075,
          "emitP95": 16.20000000001164,
          "domP50": 6.199999999953434,
          "domP95": 16.5
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 5.2000000000116415
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.399999999965075,
        "emitP95": 17.5,
        "domP50": 7.7999999999883585,
        "domP95": 17.70000000001164
      },
      "edit_d4": {
        "emitP50": 6.800000000046566,
        "emitP95": 12.799999999988358,
        "domP50": 7.7000000000116415,
        "domP95": 13.100000000034925
      },
      "edit_d10": {
        "emitP50": 7.399999999965075,
        "emitP95": 14,
        "domP50": 7.800000000046566,
        "domP95": 17.70000000001164
      },
      "loadCycle": {
        "emitP50": 12.299999999988358,
        "emitP95": 58.59999999997672,
        "domP50": 12.5,
        "domP95": 58.899999999965075
      },
      "step": {
        "emitP50": 6.7000000000116415,
        "emitP95": 14.599999999976717,
        "domP50": 7,
        "domP95": 15.199999999953434
      },
      "reset": {
        "emitP50": 26.5,
        "emitP95": 39.899999999965075,
        "domP50": 26.599999999976717,
        "domP95": 39.899999999965075
      },
      "append100": {
        "emitP50": 12.700000000011642,
        "emitP95": 17.899999999965075,
        "domP50": 13.100000000034925,
        "domP95": 18.29999999998836
      },
      "control": {
        "emitP50": 5.2999999999883585,
        "emitP95": 38.29999999998836,
        "domP50": 5.7999999999883585,
        "domP95": 38.59999999997672
      },
      "heapMb": 5.502143859863281,
      "heapCode": 3.1776199340820312,
      "heapData": 1.8767166137695312,
      "pssTotalMb": 234.22265625,
      "pssApp": 130.046875,
      "pssRenderer": 104.17578125,
      "relaunchReadyMs": 863.7999999999884,
      "relaunchHeapMb": 4.322124481201172,
      "relaunchHeapCode": 2.1199798583984375,
      "relaunchHeapData": 1.8264236450195312
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.400000000023283,
          "emitP95": 21.79999999998836,
          "domP50": 9.700000000011642,
          "domP95": 22.099999999976717
        },
        "setKeys": {
          "emitP50": 8,
          "emitP95": 18.400000000023283,
          "domP50": 8.400000000023283,
          "domP95": 19.600000000034925
        },
        "replace": {
          "emitP50": 6.7000000000116415,
          "emitP95": 24.79999999998836,
          "domP50": 7.2999999999883585,
          "domP95": 25.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.2000000000116415,
          "lagP95": 20.300000000046566,
          "endLag": 5.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.052936553955078,
        "heapCode": 2.9981613159179688,
        "heapData": 1.615631103515625,
        "pssTotalMb": 231.4453125,
        "pssApp": 129.4140625,
        "pssRenderer": 102.03125,
        "control": {
          "emitP50": 6.5,
          "emitP95": 16.599999999976717,
          "domP50": 6.7000000000116415,
          "domP95": 17
        },
        "fCommitP50": 3.2000000000116415,
        "fCommitP95": 5.400000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 8.099999999976717,
          "emitP95": 20.899999999965075,
          "domP50": 8.599999999976717,
          "domP95": 21.399999999965075
        },
        "setKeys": {
          "emitP50": 10,
          "emitP95": 27.70000000001164,
          "domP50": 10.400000000023283,
          "domP95": 28.29999999998836
        },
        "replace": {
          "emitP50": 8.299999999988358,
          "emitP95": 14.400000000023283,
          "domP50": 9,
          "domP95": 14.799999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 10.799999999988358,
          "endLag": 6.2000000000116415,
          "maxBacklog": 3
        },
        "heapMb": 5.544242858886719,
        "heapCode": 3.020214080810547,
        "heapData": 2.0685882568359375,
        "pssTotalMb": 233.09765625,
        "pssApp": 130.091796875,
        "pssRenderer": 103.005859375,
        "control": {
          "emitP50": 5.2999999999883585,
          "emitP95": 13.100000000034925,
          "domP50": 5.400000000023283,
          "domP95": 13.400000000023283
        },
        "fCommitP50": 3.1000000000349246,
        "fCommitP95": 6.100000000034925
      },
      "5000": {
        "setKey": {
          "emitP50": 9.599999999976717,
          "emitP95": 29.79999999998836,
          "domP50": 10.399999999965075,
          "domP95": 31.79999999998836
        },
        "setKeys": {
          "emitP50": 9.700000000011642,
          "emitP95": 21.20000000001164,
          "domP50": 10.299999999988358,
          "domP95": 21.70000000001164
        },
        "replace": {
          "emitP50": 12.5,
          "emitP95": 25.5,
          "domP50": 12.699999999953434,
          "domP95": 25.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 16.29999999998836,
          "endLag": 5.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.929828643798828,
        "heapCode": 3.072479248046875,
        "heapData": 6.260276794433594,
        "pssTotalMb": 241.958984375,
        "pssApp": 133.501953125,
        "pssRenderer": 108.45703125,
        "control": {
          "emitP50": 6.100000000034925,
          "emitP95": 21.70000000001164,
          "domP50": 6.7000000000116415,
          "domP95": 22
        },
        "fCommitP50": 2.900000000023283,
        "fCommitP95": 10.599999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.399999999906868,
        "emitP95": 16.5,
        "domP50": 7.699999999953434,
        "domP95": 17
      },
      "edit_d4": {
        "emitP50": 7.099999999976717,
        "emitP95": 16.5,
        "domP50": 7.699999999953434,
        "domP95": 17.599999999976717
      },
      "edit_d10": {
        "emitP50": 7.600000000093132,
        "emitP95": 20.599999999976717,
        "domP50": 8.100000000093132,
        "domP95": 21
      },
      "loadCycle": {
        "emitP50": 16,
        "emitP95": 52.40000000002328,
        "domP50": 16.5,
        "domP95": 52.90000000002328
      },
      "step": {
        "emitP50": 6.300000000046566,
        "emitP95": 15.699999999953434,
        "domP50": 7.199999999953434,
        "domP95": 16.599999999976717
      },
      "reset": {
        "emitP50": 25,
        "emitP95": 36.40000000002328,
        "domP50": 25,
        "domP95": 36.40000000002328
      },
      "append100": {
        "emitP50": 11.20000000006985,
        "emitP95": 18.800000000046566,
        "domP50": 11.5,
        "domP95": 19.800000000046566
      },
      "control": {
        "emitP50": 6,
        "emitP95": 17.800000000046566,
        "domP50": 6.299999999930151,
        "domP95": 18
      },
      "heapMb": 5.496173858642578,
      "heapCode": 3.1719017028808594,
      "heapData": 1.8765869140625,
      "pssTotalMb": 237.7509765625,
      "pssApp": 133.4775390625,
      "pssRenderer": 104.2734375,
      "relaunchReadyMs": 371.4000000000233,
      "relaunchHeapMb": 4.532047271728516,
      "relaunchHeapCode": 2.323680877685547,
      "relaunchHeapData": 1.8302879333496094
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.30000000004656613,
          "domP50": 5.599999999976717,
          "domP95": 6.5
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.099999999976717,
          "domP50": 2.199999999953434,
          "domP95": 10.300000000046566
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.700000000069849,
          "domP50": 3.900000000023283,
          "domP95": 9.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.39999999990686774,
          "maxBacklog": 0
        },
        "heapMb": 3.7238731384277344,
        "heapCode": 1.8441009521484375,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 221.802734375,
        "pssApp": 125.4765625,
        "pssRenderer": 96.326171875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.2000000000698492,
          "domP50": 5.400000000023283,
          "domP95": 10.199999999953434
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 4.199999999953434,
          "domP50": 1.7999999999301508,
          "domP95": 18.699999999953434
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1,
          "domP50": 1.2000000000698492,
          "domP95": 8.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7999999999301508,
          "endLag": 0.5999999999767169,
          "maxBacklog": 0
        },
        "heapMb": 4.132587432861328,
        "heapCode": 1.849578857421875,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 225.2421875,
        "pssApp": 125.1171875,
        "pssRenderer": 100.125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1999999999534339,
          "emitP95": 1.6999999999534339,
          "domP50": 6.700000000069849,
          "domP95": 8
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 3.3999999999068677,
          "domP50": 2.700000000069849,
          "domP95": 10.100000000093132
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1.6999999999534339,
          "domP50": 1.7000000000698492,
          "domP95": 9.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.400000000023283,
          "endLag": 1.6999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 7.939060211181641,
        "heapCode": 1.6922187805175781,
        "heapData": 5.722118377685547,
        "pssTotalMb": 226.4482421875,
        "pssApp": 123.05078125,
        "pssRenderer": 103.3974609375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.8000000000465661,
        "domP50": 5.099999999976717,
        "domP95": 6.300000000046566
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.700000000069849,
        "domP50": 5.099999999976717,
        "domP95": 11.099999999976717
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.8999999999068677,
        "domP50": 2.200000000069849,
        "domP95": 9.800000000046566
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33.5,
        "domP50": 1,
        "domP95": 33.800000000046566
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.7000000000698492,
        "domP50": 3,
        "domP95": 7.400000000023283
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.40000000002328306,
        "domP50": 0.2999999999301508,
        "domP95": 0.8000000000465661
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.5,
        "domP50": 0.7999999999301508,
        "domP95": 2.299999999930151
      },
      "heapMb": 3.935657501220703,
      "heapCode": 1.9239692687988281,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 222.904296875,
      "pssApp": 125.396484375,
      "pssRenderer": 97.5078125,
      "relaunchReadyMs": 596.5999999999767,
      "relaunchHeapMb": 3.3520050048828125,
      "relaunchHeapCode": 1.5400581359863281,
      "relaunchHeapData": 1.4462699890136719
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7999999999301508,
          "domP50": 5,
          "domP95": 7.5
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.5999999999767169,
          "domP50": 1.1000000000931323,
          "domP95": 10.900000000023283
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.8999999999068677,
          "domP50": 1.099999999976717,
          "domP95": 5.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.6000000000931323,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.724151611328125,
        "heapCode": 1.8444252014160156,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 222.609375,
        "pssApp": 126.115234375,
        "pssRenderer": 96.494140625
      },
      "500": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.2000000000698492,
          "domP50": 5.399999999906868,
          "domP95": 6.399999999906868
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 14.300000000046566,
          "domP50": 2.199999999953434,
          "domP95": 17.300000000046566
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.8000000000465661,
          "domP50": 1.1000000000931323,
          "domP95": 9.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6999999999534339,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.134990692138672,
        "heapCode": 1.8520050048828125,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 225.6044921875,
        "pssApp": 125.482421875,
        "pssRenderer": 100.1220703125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.900000000023283,
          "domP50": 6.699999999953434,
          "domP95": 7.700000000069849
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 3.400000000023283,
          "domP50": 3.300000000046566,
          "domP95": 8.099999999976717
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 2.400000000023283,
          "domP50": 1.6999999999534339,
          "domP95": 6.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999301508,
          "lagP95": 1.8000000000465661,
          "endLag": 1.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 7.939060211181641,
        "heapCode": 1.6922187805175781,
        "heapData": 5.722118377685547,
        "pssTotalMb": 227.2060546875,
        "pssApp": 123.5556640625,
        "pssRenderer": 103.650390625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.599999999976717,
        "domP50": 3.300000000046566,
        "domP95": 8.199999999953434
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.099999999976717,
        "domP50": 2.799999999930151,
        "domP95": 12
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 2.099999999976717,
        "domP95": 9.5
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33.300000000046566,
        "domP50": 0.6000000000931323,
        "domP95": 33.70000000006985
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6999999999534339,
        "domP50": 5.200000000069849,
        "domP95": 6.800000000046566
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.40000000002328306,
        "domP50": 0.30000000004656613,
        "domP95": 1.099999999976717
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2,
        "domP50": 1.1999999999534339,
        "domP95": 5
      },
      "heapMb": 3.9353256225585938,
      "heapCode": 1.9236297607421875,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.6318359375,
      "pssApp": 127.783203125,
      "pssRenderer": 98.8486328125,
      "relaunchReadyMs": 604.4000000000233,
      "relaunchHeapMb": 3.3521041870117188,
      "relaunchHeapCode": 1.5400962829589844,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 6.800000000046566,
          "emitP95": 28.699999999953434,
          "domP50": 7.5,
          "domP95": 29.199999999953434
        },
        "setKeys": {
          "emitP50": 7.5,
          "emitP95": 17.599999999976717,
          "domP50": 7.900000000023283,
          "domP95": 17.899999999906868
        },
        "replace": {
          "emitP50": 6.099999999976717,
          "emitP95": 18.699999999953434,
          "domP50": 6.5,
          "domP95": 22.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.599999999976717,
          "lagP95": 10.5,
          "endLag": 5.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.062522888183594,
        "heapCode": 3.0071372985839844,
        "heapData": 1.6158981323242188,
        "pssTotalMb": 236.716796875,
        "pssApp": 133.0107421875,
        "pssRenderer": 103.7060546875,
        "control": {
          "emitP50": 5.5,
          "emitP95": 15.79999999993015,
          "domP50": 5.700000000069849,
          "domP95": 16
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 9.800000000046566
      },
      "500": {
        "setKey": {
          "emitP50": 7.100000000093132,
          "emitP95": 19.400000000023283,
          "domP50": 7.5,
          "domP95": 20.099999999976717
        },
        "setKeys": {
          "emitP50": 7.5,
          "emitP95": 30.5,
          "domP50": 8.300000000046566,
          "domP95": 31.400000000023283
        },
        "replace": {
          "emitP50": 8.20000000006985,
          "emitP95": 15.099999999976717,
          "domP50": 8.599999999976717,
          "domP95": 15.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 15.300000000046566,
          "endLag": 5.200000000069849,
          "maxBacklog": 3
        },
        "heapMb": 5.545463562011719,
        "heapCode": 3.0213279724121094,
        "heapData": 2.068592071533203,
        "pssTotalMb": 238.728515625,
        "pssApp": 134.42578125,
        "pssRenderer": 104.302734375,
        "control": {
          "emitP50": 7.199999999953434,
          "emitP95": 16.599999999976717,
          "domP50": 7.299999999930151,
          "domP95": 17.79999999993015
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 6.599999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 9.300000000046566,
          "emitP95": 24.599999999976717,
          "domP50": 10.100000000093132,
          "domP95": 27
        },
        "setKeys": {
          "emitP50": 9,
          "emitP95": 16.400000000023283,
          "domP50": 9.70000000006985,
          "domP95": 16.800000000046566
        },
        "replace": {
          "emitP50": 12.399999999906868,
          "emitP95": 25.79999999993015,
          "domP50": 12.79999999993015,
          "domP95": 26.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.699999999953434,
          "lagP95": 12,
          "endLag": 7.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.931488037109375,
        "heapCode": 3.0737037658691406,
        "heapData": 6.260372161865234,
        "pssTotalMb": 245.8876953125,
        "pssApp": 136.041015625,
        "pssRenderer": 109.8466796875,
        "control": {
          "emitP50": 5.400000000023283,
          "emitP95": 12.599999999976717,
          "domP50": 5.700000000069849,
          "domP95": 12.79999999993015
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 7.400000000023283
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.200000000069849,
        "emitP95": 26.400000000023283,
        "domP50": 7.700000000069849,
        "domP95": 27
      },
      "edit_d4": {
        "emitP50": 6.599999999976717,
        "emitP95": 13.800000000046566,
        "domP50": 7.699999999953434,
        "domP95": 14.100000000093132
      },
      "edit_d10": {
        "emitP50": 7.400000000023283,
        "emitP95": 14.20000000006985,
        "domP50": 8.100000000093132,
        "domP95": 18.099999999976717
      },
      "loadCycle": {
        "emitP50": 16.699999999953434,
        "emitP95": 57.300000000046566,
        "domP50": 16.900000000023283,
        "domP95": 57.59999999997672
      },
      "step": {
        "emitP50": 6.900000000023283,
        "emitP95": 12.599999999976717,
        "domP50": 7.199999999953434,
        "domP95": 13.199999999953434
      },
      "reset": {
        "emitP50": 22.599999999976717,
        "emitP95": 48.70000000006985,
        "domP50": 22.599999999976717,
        "domP95": 48.70000000006985
      },
      "append100": {
        "emitP50": 14.70000000006985,
        "emitP95": 64.89999999990687,
        "domP50": 15.400000000023283,
        "domP95": 65
      },
      "control": {
        "emitP50": 6.200000000069849,
        "emitP95": 22.199999999953434,
        "domP50": 6.600000000093132,
        "domP95": 22.5
      },
      "heapMb": 5.4906005859375,
      "heapCode": 3.1754531860351562,
      "heapData": 1.8674049377441406,
      "pssTotalMb": 240.3203125,
      "pssApp": 134.439453125,
      "pssRenderer": 105.880859375,
      "relaunchReadyMs": 449.0999999999767,
      "relaunchHeapMb": 4.531639099121094,
      "relaunchHeapCode": 2.323474884033203,
      "relaunchHeapData": 1.8301010131835938
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.099999999976717,
          "emitP95": 22,
          "domP50": 8.400000000023283,
          "domP95": 23.400000000023283
        },
        "setKeys": {
          "emitP50": 7,
          "emitP95": 19.20000000006985,
          "domP50": 7.799999999930151,
          "domP95": 19.5
        },
        "replace": {
          "emitP50": 6.5,
          "emitP95": 18.800000000046566,
          "domP50": 7,
          "domP95": 19.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.700000000069849,
          "lagP95": 11.599999999976717,
          "endLag": 11.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.0529937744140625,
        "heapCode": 2.998188018798828,
        "heapData": 1.61566162109375,
        "pssTotalMb": 238.0927734375,
        "pssApp": 134.224609375,
        "pssRenderer": 103.8681640625,
        "control": {
          "emitP50": 5.799999999930151,
          "emitP95": 17.599999999976717,
          "domP50": 6,
          "domP95": 18.199999999953434
        },
        "fCommitP50": 3.200000000069849,
        "fCommitP95": 12.199999999953434
      },
      "500": {
        "setKey": {
          "emitP50": 9.699999999953434,
          "emitP95": 23.400000000023283,
          "domP50": 10.599999999976717,
          "domP95": 23.900000000023283
        },
        "setKeys": {
          "emitP50": 11.5,
          "emitP95": 24.70000000006985,
          "domP50": 12.099999999976717,
          "domP95": 25.70000000006985
        },
        "replace": {
          "emitP50": 9.400000000023283,
          "emitP95": 15.79999999993015,
          "domP50": 9.70000000006985,
          "domP95": 16
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.299999999930151,
          "lagP95": 11.79999999993015,
          "endLag": 6.799999999930151,
          "maxBacklog": 2
        },
        "heapMb": 5.554279327392578,
        "heapCode": 3.029834747314453,
        "heapData": 2.0685882568359375,
        "pssTotalMb": 237.521484375,
        "pssApp": 133.2626953125,
        "pssRenderer": 104.2587890625,
        "control": {
          "emitP50": 5.300000000046566,
          "emitP95": 11.899999999906868,
          "domP50": 5.599999999976717,
          "domP95": 13.199999999953434
        },
        "fCommitP50": 3,
        "fCommitP95": 5.400000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 10.79999999993015,
          "emitP95": 26.800000000046566,
          "domP50": 11.899999999906868,
          "domP95": 27.70000000006985
        },
        "setKeys": {
          "emitP50": 9.599999999976717,
          "emitP95": 21.099999999976717,
          "domP50": 10.400000000023283,
          "domP95": 21.400000000023283
        },
        "replace": {
          "emitP50": 12.199999999953434,
          "emitP95": 18.5,
          "domP50": 13.100000000093132,
          "domP95": 18.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.599999999976717,
          "lagP95": 17.800000000046566,
          "endLag": 8.5,
          "maxBacklog": 2
        },
        "heapMb": 9.941699981689453,
        "heapCode": 3.082611083984375,
        "heapData": 6.26025390625,
        "pssTotalMb": 245.375,
        "pssApp": 135.7138671875,
        "pssRenderer": 109.6611328125,
        "control": {
          "emitP50": 5.400000000023283,
          "emitP95": 11.199999999953434,
          "domP50": 5.599999999976717,
          "domP95": 11.400000000023283
        },
        "fCommitP50": 3,
        "fCommitP95": 11.5
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.5,
        "emitP95": 17.599999999976717,
        "domP50": 7.900000000023283,
        "domP95": 18.5
      },
      "edit_d4": {
        "emitP50": 6.899999999906868,
        "emitP95": 17.400000000023283,
        "domP50": 7.399999999906868,
        "domP95": 17.699999999953434
      },
      "edit_d10": {
        "emitP50": 7.800000000046566,
        "emitP95": 15.5,
        "domP50": 9,
        "domP95": 15.800000000046566
      },
      "loadCycle": {
        "emitP50": 18.300000000046566,
        "emitP95": 48.90000000002328,
        "domP50": 18.600000000093132,
        "domP95": 49.40000000002328
      },
      "step": {
        "emitP50": 7,
        "emitP95": 15.899999999906868,
        "domP50": 7.400000000023283,
        "domP95": 16.899999999906868
      },
      "reset": {
        "emitP50": 21.900000000023283,
        "emitP95": 40.300000000046566,
        "domP50": 21.900000000023283,
        "domP95": 40.300000000046566
      },
      "append100": {
        "emitP50": 12.699999999953434,
        "emitP95": 66.40000000002328,
        "domP50": 13.29999999993015,
        "domP95": 66.90000000002328
      },
      "control": {
        "emitP50": 6.099999999976717,
        "emitP95": 15.599999999976717,
        "domP50": 6.400000000023283,
        "domP95": 15.900000000023283
      },
      "heapMb": 5.491119384765625,
      "heapCode": 3.173839569091797,
      "heapData": 1.8695487976074219,
      "pssTotalMb": 239.32421875,
      "pssApp": 133.49609375,
      "pssRenderer": 105.828125,
      "relaunchReadyMs": 342.19999999995343,
      "relaunchHeapMb": 4.531681060791016,
      "relaunchHeapCode": 2.3232460021972656,
      "relaunchHeapData": 1.8304710388183594
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.5,
          "domP50": 1.400000000023283,
          "domP95": 9.29999999993015
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.099999999976717,
          "domP50": 1.1000000000931323,
          "domP95": 6.699999999953434
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5999999999767169,
          "domP50": 4.100000000093132,
          "domP95": 8.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.2999999999301508,
          "lagP95": 0.6999999999534339,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.5639114379882812,
        "heapCode": 1.68896484375,
        "heapData": 1.5024337768554688,
        "pssTotalMb": 222.8984375,
        "pssApp": 126.021484375,
        "pssRenderer": 96.876953125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1,
          "domP50": 1.400000000023283,
          "domP95": 8.900000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 3.1000000000931323,
          "domP50": 2.099999999976717,
          "domP95": 10.900000000023283
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.099999999976717,
          "domP50": 1.1999999999534339,
          "domP95": 12.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6000000000931323,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.132850646972656,
        "heapCode": 1.8498649597167969,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 229.5576171875,
        "pssApp": 127.9501953125,
        "pssRenderer": 101.607421875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 2.5,
          "domP50": 2.799999999930151,
          "domP95": 12.79999999993015
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 4.300000000046566,
          "domP50": 2.6000000000931323,
          "domP95": 9
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.200000000069849,
          "domP50": 1.599999999976717,
          "domP95": 4.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.1999999999534339,
          "lagP95": 2.800000000046566,
          "endLag": 1.3000000000465661,
          "maxBacklog": 0
        },
        "heapMb": 8.097431182861328,
        "heapCode": 1.8453025817871094,
        "heapData": 5.725639343261719,
        "pssTotalMb": 235.00390625,
        "pssApp": 128.6865234375,
        "pssRenderer": 106.3173828125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.40000000002328306,
        "domP50": 5.5,
        "domP95": 6.799999999930151
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1.7999999999301508,
        "domP95": 10.400000000023283
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1.400000000023283,
        "domP95": 11
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33.699999999953434,
        "domP50": 0.6000000000931323,
        "domP95": 34
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 2.1000000000931323,
        "domP95": 8.699999999953434
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.40000000002328306,
        "domP50": 0.30000000004656613,
        "domP95": 1.599999999976717
      },
      "append100": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.6999999999534339,
        "domP50": 0.8999999999068677,
        "domP95": 11.900000000023283
      },
      "heapMb": 3.935382843017578,
      "heapCode": 1.9236869812011719,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 227.740234375,
      "pssApp": 128.3681640625,
      "pssRenderer": 99.3720703125,
      "relaunchReadyMs": 602.5,
      "relaunchHeapMb": 3.3522491455078125,
      "relaunchHeapCode": 1.5400581359863281,
      "relaunchHeapData": 1.4465255737304688
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.6000000000931323,
          "domP50": 5.199999999953434,
          "domP95": 6.700000000069849
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6999999999534339,
          "domP50": 0.9000000000232831,
          "domP95": 7.800000000046566
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.5999999999767169,
          "domP50": 1,
          "domP95": 5.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.40000000002328306,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.723796844482422,
        "heapCode": 1.844024658203125,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 226.0380859375,
        "pssApp": 128.083984375,
        "pssRenderer": 97.9541015625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.099999999976717,
          "domP50": 1.900000000023283,
          "domP95": 9
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.3000000000465661,
          "domP50": 1.1000000000931323,
          "domP95": 5.5
        },
        "replace": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.8999999999068677,
          "domP50": 0.9000000000232831,
          "domP95": 7.399999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8000000000465661,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.132781982421875,
        "heapCode": 1.8497962951660156,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 228.9619140625,
        "pssApp": 127.58984375,
        "pssRenderer": 101.3720703125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6999999999534339,
          "emitP95": 4.100000000093132,
          "domP50": 3,
          "domP95": 11.099999999976717
        },
        "setKeys": {
          "emitP50": 1.400000000023283,
          "emitP95": 1.7999999999301508,
          "domP50": 2.699999999953434,
          "domP95": 7.900000000023283
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.1999999999534339,
          "domP50": 1.6999999999534339,
          "domP95": 3.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999301508,
          "lagP95": 1.8000000000465661,
          "endLag": 1.5,
          "maxBacklog": 0
        },
        "heapMb": 8.101940155029297,
        "heapCode": 1.8497886657714844,
        "heapData": 5.725639343261719,
        "pssTotalMb": 234.2822265625,
        "pssApp": 127.845703125,
        "pssRenderer": 106.4365234375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.7000000000698492,
        "domP50": 3.699999999953434,
        "domP95": 6.399999999906868
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 2.300000000046566,
        "domP95": 12.599999999976717
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 0.6999999999534339,
        "domP50": 1.3000000000465661,
        "domP95": 6.199999999953434
      },
      "loadCycle": {
        "emitP50": 15.099999999976717,
        "emitP95": 32.800000000046566,
        "domP50": 15.599999999976717,
        "domP95": 33.20000000006985
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 1.2999999999301508,
        "domP50": 3.699999999953434,
        "domP95": 6.699999999953434
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.39999999990686774,
        "domP50": 0.2000000000698492,
        "domP95": 1.599999999976717
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 1,
        "domP95": 4.800000000046566
      },
      "heapMb": 3.9353866577148438,
      "heapCode": 1.9236907958984375,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 225.611328125,
      "pssApp": 127.1005859375,
      "pssRenderer": 98.5107421875,
      "relaunchReadyMs": 639.5999999999767,
      "relaunchHeapMb": 3.3520660400390625,
      "relaunchHeapCode": 1.5400581359863281,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.700000000069849,
          "emitP95": 29.800000000046566,
          "domP50": 8.099999999976717,
          "domP95": 30.300000000046566
        },
        "setKeys": {
          "emitP50": 7.400000000023283,
          "emitP95": 16.800000000046566,
          "domP50": 8,
          "domP95": 17.20000000006985
        },
        "replace": {
          "emitP50": 7,
          "emitP95": 11.699999999953434,
          "domP50": 7.399999999906868,
          "domP95": 12
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.299999999930151,
          "lagP95": 13.199999999953434,
          "endLag": 6.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.0545196533203125,
        "heapCode": 2.9989700317382812,
        "heapData": 1.6159286499023438,
        "pssTotalMb": 237.1953125,
        "pssApp": 133.359375,
        "pssRenderer": 103.8359375,
        "control": {
          "emitP50": 5.5,
          "emitP95": 15.900000000023283,
          "domP50": 5.800000000046566,
          "domP95": 16.70000000006985
        },
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 8.400000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 7.199999999953434,
          "emitP95": 16.300000000046566,
          "domP50": 7.900000000023283,
          "domP95": 17.900000000023283
        },
        "setKeys": {
          "emitP50": 9.599999999976717,
          "emitP95": 19.199999999953434,
          "domP50": 10.099999999976717,
          "domP95": 19.699999999953434
        },
        "replace": {
          "emitP50": 8.899999999906868,
          "emitP95": 18.699999999953434,
          "domP50": 9.199999999953434,
          "domP95": 19
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.800000000046566,
          "lagP95": 9.29999999993015,
          "endLag": 5.099999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.552562713623047,
        "heapCode": 3.027984619140625,
        "heapData": 2.0685882568359375,
        "pssTotalMb": 238.427734375,
        "pssApp": 133.9306640625,
        "pssRenderer": 104.4970703125,
        "control": {
          "emitP50": 5.800000000046566,
          "emitP95": 14.599999999976717,
          "domP50": 6.100000000093132,
          "domP95": 15.099999999976717
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 7.600000000093132
      },
      "5000": {
        "setKey": {
          "emitP50": 9.699999999953434,
          "emitP95": 30.199999999953434,
          "domP50": 10.20000000006985,
          "domP95": 31.900000000023283
        },
        "setKeys": {
          "emitP50": 10.400000000023283,
          "emitP95": 17.5,
          "domP50": 11.900000000023283,
          "domP95": 18
        },
        "replace": {
          "emitP50": 12,
          "emitP95": 19.300000000046566,
          "domP50": 12.399999999906868,
          "domP95": 19.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 14.300000000046566,
          "endLag": 6.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.939876556396484,
        "heapCode": 3.081714630126953,
        "heapData": 6.260276794433594,
        "pssTotalMb": 245.6240234375,
        "pssApp": 135.7314453125,
        "pssRenderer": 109.892578125,
        "control": {
          "emitP50": 5.400000000023283,
          "emitP95": 18.199999999953434,
          "domP50": 5.700000000069849,
          "domP95": 18.79999999993015
        },
        "fCommitP50": 3.200000000069849,
        "fCommitP95": 7.699999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.400000000023283,
        "emitP95": 13.199999999953434,
        "domP50": 9.20000000006985,
        "domP95": 13.5
      },
      "edit_d4": {
        "emitP50": 7.099999999976717,
        "emitP95": 15.099999999976717,
        "domP50": 7.400000000023283,
        "domP95": 15.800000000046566
      },
      "edit_d10": {
        "emitP50": 7.099999999976717,
        "emitP95": 13.5,
        "domP50": 8,
        "domP95": 14
      },
      "loadCycle": {
        "emitP50": 16.599999999976717,
        "emitP95": 50.79999999993015,
        "domP50": 16.699999999953434,
        "domP95": 51.199999999953434
      },
      "step": {
        "emitP50": 6.200000000069849,
        "emitP95": 17.800000000046566,
        "domP50": 6.700000000069849,
        "domP95": 18.199999999953434
      },
      "reset": {
        "emitP50": 23.599999999976717,
        "emitP95": 29,
        "domP50": 23.599999999976717,
        "domP95": 29
      },
      "append100": {
        "emitP50": 11.900000000023283,
        "emitP95": 22,
        "domP50": 12.099999999976717,
        "domP95": 22.400000000023283
      },
      "control": {
        "emitP50": 6,
        "emitP95": 17.099999999976717,
        "domP50": 6.599999999976717,
        "domP95": 17.5
      },
      "heapMb": 5.488304138183594,
      "heapCode": 3.1728744506835938,
      "heapData": 1.8677825927734375,
      "pssTotalMb": 239.3046875,
      "pssApp": 133.568359375,
      "pssRenderer": 105.736328125,
      "relaunchReadyMs": 721.2000000000698,
      "relaunchHeapMb": 4.327262878417969,
      "relaunchHeapCode": 2.12481689453125,
      "relaunchHeapData": 1.8266563415527344
    }
  }
]
```
</details>
