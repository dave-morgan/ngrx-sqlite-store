# Phase 16 shapes — flat objects & hybrid workflow (2026-10-28)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.71 ms, p95 10.89 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 49 / CODE-BOUND 0 / FAIL 36

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.34 ± 0.05 | 9.86 ± 2.39 | 29.0× | FAIL | allow 9.2 (control emitP50 6.7×1) |
| flat | 50.setKey.emitP95 | 0.78 ± 0.31 | 25.18 ± 9.58 | 32.3× | PLATFORM-BOUND | allow 26.7 (control emitP95 16.8×1) |
| flat | 50.setKey.domP50 | 4.58 ± 1.71 | 10.78 ± 2.30 | 2.4× | PLATFORM-BOUND | allow 11.2 (control domP50 7.2×1) |
| flat | 50.setKey.domP95 | 7.40 ± 1.11 | 26.64 ± 11.21 | 3.6× | PLATFORM-BOUND | allow 29.4 (control domP95 17.1×1) |
| flat | 50.setKeys.emitP50 | 0.34 ± 0.05 | 9.90 ± 1.70 | 29.1× | FAIL | allow 8.5 (control emitP50 6.7×1) |
| flat | 50.setKeys.emitP95 | 1.38 ± 1.12 | 19.12 ± 3.98 | 13.9× | PLATFORM-BOUND | allow 21.9 (control emitP95 16.8×1) |
| flat | 50.setKeys.domP50 | 3.88 ± 1.59 | 10.36 ± 1.62 | 2.7× | PLATFORM-BOUND | allow 10.4 (control domP50 7.2×1) |
| flat | 50.setKeys.domP95 | 8.22 ± 2.05 | 19.52 ± 3.86 | 2.4× | PLATFORM-BOUND | allow 23.0 (control domP95 17.1×1) |
| flat | 50.replace.emitP50 | 0.36 ± 0.05 | 8.32 ± 0.61 | 23.1× | FAIL | allow 7.4 (control emitP50 6.7×1) |
| flat | 50.replace.emitP95 | 3.48 ± 4.00 | 19.64 ± 3.87 | 5.6× | PLATFORM-BOUND | allow 24.6 (control emitP95 16.8×1) |
| flat | 50.replace.domP50 | 2.60 ± 1.01 | 8.94 ± 0.63 | 3.4× | PLATFORM-BOUND | allow 8.8 (control domP50 7.2×1) |
| flat | 50.replace.domP95 | 9.94 ± 1.60 | 21.44 ± 5.31 | 2.2× | PLATFORM-BOUND | allow 24.0 (control domP95 17.1×1) |
| flat | 50.burst.lagP50 | 0.32 ± 0.04 | 7.46 ± 0.99 | 23.3× | PLATFORM-BOUND | allow 7.8 (control emitP50 6.7×1) |
| flat | 50.burst.lagP95 | 1.04 ± 0.72 | 20.52 ± 4.33 | 19.7× | PLATFORM-BOUND | allow 21.8 (control emitP95 16.8×1) |
| flat | 50.burst.endLag | 0.40 ± 0.07 | 6.36 ± 0.81 | 15.9× | PLATFORM-BOUND | allow 7.6 (control emitP50 6.7×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.20 ± 0.45 | 2200000000.0× | FAIL |  |
| flat | 50.heapMb | 3.69 ± 0.07 | 5.06 ± 0.01 | 1.4× | FAIL | code +1.20 MB; data 1.50 -> 1.62 MB |
| flat | 50.pssTotalMb | 223.60 ± 1.53 | 235.43 ± 1.51 | 1.1× | FAIL | allow 6.0 (plugin baseline 3.0 MB) |
| flat | 500.setKey.emitP50 | 0.50 ± 0.10 | 9.08 ± 0.70 | 18.2× | FAIL | allow 7.6 (control emitP50 6.8×1) |
| flat | 500.setKey.emitP95 | 1.64 ± 1.02 | 21.46 ± 6.01 | 13.1× | PLATFORM-BOUND | allow 24.5 (control emitP95 17.5×1) |
| flat | 500.setKey.domP50 | 4.28 ± 1.72 | 9.68 ± 0.80 | 2.3× | PLATFORM-BOUND | allow 9.7 (control domP50 7.2×1) |
| flat | 500.setKey.domP95 | 7.64 ± 1.86 | 22.08 ± 6.05 | 2.9× | PLATFORM-BOUND | allow 25.7 (control domP95 17.8×1) |
| flat | 500.setKeys.emitP50 | 0.48 ± 0.04 | 10.90 ± 0.91 | 22.7× | FAIL | allow 7.8 (control emitP50 6.8×1) |
| flat | 500.setKeys.emitP95 | 1.92 ± 1.26 | 23.30 ± 2.83 | 12.1× | PLATFORM-BOUND | allow 21.6 (control emitP95 17.5×1) |
| flat | 500.setKeys.domP50 | 1.96 ± 1.25 | 11.48 ± 0.77 | 5.9× | FAIL | allow 9.2 (control domP50 7.2×1) |
| flat | 500.setKeys.domP95 | 9.96 ± 2.30 | 23.78 ± 2.88 | 2.4× | PLATFORM-BOUND | allow 22.9 (control domP95 17.8×1) |
| flat | 500.replace.emitP50 | 0.40 ± 0.00 | 9.90 ± 1.04 | 24.8× | FAIL | allow 7.8 (control emitP50 6.8×1) |
| flat | 500.replace.emitP95 | 2.72 ± 1.38 | 20.40 ± 1.31 | 7.5× | PLATFORM-BOUND | allow 20.1 (control emitP95 17.5×1) |
| flat | 500.replace.domP50 | 1.32 ± 0.28 | 10.68 ± 0.96 | 8.1× | FAIL | allow 8.4 (control domP50 7.2×1) |
| flat | 500.replace.domP95 | 10.04 ± 2.45 | 20.90 ± 1.22 | 2.1× | PLATFORM-BOUND | allow 21.4 (control domP95 17.8×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 7.10 ± 0.47 | 17.7× | PLATFORM-BOUND | allow 7.3 (control emitP50 6.8×1) |
| flat | 500.burst.lagP95 | 0.84 ± 0.09 | 16.14 ± 3.00 | 19.2× | PLATFORM-BOUND | allow 20.6 (control emitP95 17.5×1) |
| flat | 500.burst.endLag | 0.54 ± 0.09 | 9.28 ± 3.30 | 17.2× | PLATFORM-BOUND | allow 10.2 (control emitP50 6.8×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.20 ± 0.45 | 2200000000.0× | FAIL |  |
| flat | 500.heapMb | 4.05 ± 0.12 | 5.55 ± 0.01 | 1.4× | FAIL | code +1.26 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 226.63 ± 2.86 | 236.58 ± 1.90 | 1.0× | FAIL | allow 7.7 (plugin baseline 3.0 MB) |
| flat | 5000.setKey.emitP50 | 1.48 ± 0.13 | 10.80 ± 0.65 | 7.3× | FAIL | allow 8.0 (control emitP50 7.2×1) |
| flat | 5000.setKey.emitP95 | 3.22 ± 1.29 | 20.14 ± 1.91 | 6.3× | PLATFORM-BOUND | allow 22.9 (control emitP95 19.7×1) |
| flat | 5000.setKey.domP50 | 4.78 ± 1.94 | 11.50 ± 0.70 | 2.4× | PLATFORM-BOUND | allow 10.4 (control domP50 7.8×1) |
| flat | 5000.setKey.domP95 | 9.78 ± 3.37 | 20.82 ± 1.93 | 2.1× | PLATFORM-BOUND | allow 25.3 (control domP95 20.0×1) |
| flat | 5000.setKeys.emitP50 | 1.54 ± 0.11 | 11.28 ± 0.75 | 7.3× | FAIL | allow 8.0 (control emitP50 7.2×1) |
| flat | 5000.setKeys.emitP95 | 4.16 ± 1.17 | 20.90 ± 2.43 | 5.0× | PLATFORM-BOUND | allow 23.3 (control emitP95 19.7×1) |
| flat | 5000.setKeys.domP50 | 3.08 ± 0.50 | 11.86 ± 0.83 | 3.9× | PLATFORM-BOUND | allow 9.1 (control domP50 7.8×1) |
| flat | 5000.setKeys.domP95 | 14.72 ± 6.37 | 21.50 ± 2.32 | 1.5× | PLATFORM-BOUND | allow 28.7 (control domP95 20.0×1) |
| flat | 5000.replace.emitP50 | 0.42 ± 0.08 | 14.04 ± 0.65 | 33.4× | FAIL | allow 7.9 (control emitP50 7.2×1) |
| flat | 5000.replace.emitP95 | 1.50 ± 0.71 | 26.04 ± 3.01 | 17.4× | FAIL | allow 23.4 (control emitP95 19.7×1) |
| flat | 5000.replace.domP50 | 1.52 ± 0.18 | 14.54 ± 0.65 | 9.6× | FAIL | allow 8.6 (control domP50 7.8×1) |
| flat | 5000.replace.domP95 | 7.34 ± 3.13 | 26.54 ± 2.98 | 3.6× | PLATFORM-BOUND | allow 26.1 (control domP95 20.0×1) |
| flat | 5000.burst.lagP50 | 1.40 ± 0.00 | 9.04 ± 0.52 | 6.5× | PLATFORM-BOUND | allow 7.7 (control emitP50 7.2×1) |
| flat | 5000.burst.lagP95 | 2.40 ± 0.51 | 19.56 ± 3.45 | 8.1× | PLATFORM-BOUND | allow 23.7 (control emitP95 19.7×1) |
| flat | 5000.burst.endLag | 1.44 ± 0.44 | 10.96 ± 8.23 | 7.6× | PLATFORM-BOUND | allow 15.8 (control emitP50 7.2×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.07 ± 0.07 | 9.94 ± 0.00 | 1.2× | FAIL | code +1.26 MB; data 5.72 -> 6.26 MB |
| flat | 5000.pssTotalMb | 231.57 ± 2.00 | 249.52 ± 1.41 | 1.1× | FAIL | allow 6.4 (plugin baseline 3.0 MB) |
| workflow | edit_d1.emitP50 | 0.36 ± 0.05 | 8.70 ± 0.31 | 24.2× | FAIL | allow 6.9 (control emitP50 6.6×1) |
| workflow | edit_d1.emitP95 | 2.38 ± 1.99 | 18.34 ± 1.55 | 7.7× | PLATFORM-BOUND | allow 23.6 (control emitP95 20.0×1) |
| workflow | edit_d1.domP50 | 3.96 ± 2.00 | 9.48 ± 0.38 | 2.4× | PLATFORM-BOUND | allow 9.3 (control domP50 6.9×1) |
| workflow | edit_d1.domP95 | 7.84 ± 1.05 | 18.94 ± 1.59 | 2.4× | PLATFORM-BOUND | allow 23.1 (control domP95 20.4×1) |
| workflow | edit_d4.emitP50 | 0.38 ± 0.04 | 8.94 ± 0.81 | 23.5× | FAIL | allow 7.4 (control emitP50 6.6×1) |
| workflow | edit_d4.emitP95 | 1.20 ± 0.51 | 21.12 ± 3.49 | 17.6× | PLATFORM-BOUND | allow 24.0 (control emitP95 20.0×1) |
| workflow | edit_d4.domP50 | 2.06 ± 1.76 | 9.68 ± 0.62 | 4.7× | PLATFORM-BOUND | allow 9.3 (control domP50 6.9×1) |
| workflow | edit_d4.domP95 | 9.74 ± 3.51 | 21.78 ± 3.12 | 2.2× | PLATFORM-BOUND | allow 27.0 (control domP95 20.4×1) |
| workflow | edit_d10.emitP50 | 0.40 ± 0.00 | 8.16 ± 0.51 | 20.4× | FAIL | allow 7.1 (control emitP50 6.6×1) |
| workflow | edit_d10.emitP95 | 2.06 ± 0.81 | 17.58 ± 1.79 | 8.5× | PLATFORM-BOUND | allow 22.6 (control emitP95 20.0×1) |
| workflow | edit_d10.domP50 | 2.66 ± 1.18 | 8.82 ± 0.55 | 3.3× | PLATFORM-BOUND | allow 8.7 (control domP50 6.9×1) |
| workflow | edit_d10.domP95 | 8.70 ± 1.69 | 18.28 ± 1.75 | 2.1× | PLATFORM-BOUND | allow 23.9 (control domP95 20.4×1) |
| workflow | loadCycle.emitP50 | 3.06 ± 5.67 | 18.82 ± 2.27 | 6.2× | PLATFORM-BOUND | allow 21.1 (control emitP50 6.6×2) |
| workflow | loadCycle.emitP95 | 34.84 ± 2.72 | 54.74 ± 4.48 | 1.6× | PLATFORM-BOUND | allow 47.2 (control emitP95 20.0×2) |
| workflow | loadCycle.domP50 | 3.80 ± 6.93 | 19.28 ± 2.61 | 5.1× | PLATFORM-BOUND | allow 23.4 (control domP50 6.9×2) |
| workflow | loadCycle.domP95 | 35.30 ± 2.65 | 55.32 ± 4.47 | 1.6× | PLATFORM-BOUND | allow 48.0 (control domP95 20.4×2) |
| workflow | step.emitP50 | 0.36 ± 0.05 | 8.04 ± 0.75 | 22.3× | FAIL | allow 7.4 (control emitP50 6.6×1) |
| workflow | step.emitP95 | 0.70 ± 0.07 | 23.68 ± 1.88 | 33.8× | FAIL | allow 22.0 (control emitP95 20.0×1) |
| workflow | step.domP50 | 1.72 ± 1.51 | 8.42 ± 0.77 | 4.9× | PLATFORM-BOUND | allow 9.2 (control domP50 6.9×1) |
| workflow | step.domP95 | 8.52 ± 2.15 | 24.04 ± 1.87 | 2.8× | PLATFORM-BOUND | allow 24.4 (control domP95 20.4×1) |
| workflow | reset.emitP50 | 0.28 ± 0.04 | 27.54 ± 4.81 | 98.4× | FAIL | allow 11.4 (control emitP50 6.6×1) |
| workflow | reset.emitP95 | 0.58 ± 0.26 | 55.96 ± 28.23 | 96.5× | FAIL | allow 48.5 (control emitP95 20.0×1) |
| workflow | reset.domP50 | 0.28 ± 0.04 | 27.56 ± 4.82 | 98.4× | FAIL | allow 11.8 (control domP50 6.9×1) |
| workflow | reset.domP95 | 1.92 ± 1.26 | 56.30 ± 28.34 | 29.3× | FAIL | allow 50.0 (control domP95 20.4×1) |
| workflow | append100.emitP50 | 0.32 ± 0.04 | 13.28 ± 0.75 | 41.5× | FAIL | allow 7.4 (control emitP50 6.6×1) |
| workflow | append100.emitP95 | 1.18 ± 0.45 | 21.84 ± 3.80 | 18.5× | PLATFORM-BOUND | allow 24.3 (control emitP95 20.0×1) |
| workflow | append100.domP50 | 0.90 ± 0.16 | 14.10 ± 0.97 | 15.7× | FAIL | allow 8.1 (control domP50 6.9×1) |
| workflow | append100.domP95 | 7.04 ± 2.04 | 23.44 ± 3.11 | 3.3× | PLATFORM-BOUND | allow 25.6 (control domP95 20.4×1) |
| workflow | heapMb | 3.87 ± 0.09 | 5.50 ± 0.00 | 1.4× | FAIL | code +1.31 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 224.80 ± 2.12 | 240.72 ± 2.21 | 1.1× | FAIL | allow 7.3 (plugin baseline 3.0 MB) |
| workflow | relaunchReadyMs | 1629.96 ± 19.58 | 945.48 ± 667.21 | 0.6× | PASS |  |
| workflow | relaunchHeapMb | 3.31 ± 0.05 | 4.50 ± 0.16 | 1.4× | FAIL | code +0.72 MB; data 1.45 -> 1.82 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 6.74 | 7.16 | 17.06 | 9.86 | 10.78 | 26.64 |
| 500 | 6.80 | 7.16 | 17.76 | 9.08 | 9.68 | 22.08 |
| 5000 | 7.18 | 7.78 | 20.00 | 10.80 | 11.50 | 20.82 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 125.9 | 131.5 | 97.7 | 103.9 |
| flat 500 | 125.4 | 131.9 | 101.2 | 104.7 |
| flat 5000 | 125.3 | 139.4 | 106.2 | 110.2 |
| workflow | 125.9 | 134.7 | 98.9 | 106.1 |

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
          "domP50": 5.399999999965075,
          "domP95": 6.2000000000116415
        },
        "setKeys": {
          "emitP50": 0.29999999998835847,
          "emitP95": 3.2000000000116415,
          "domP50": 4.2999999999883585,
          "domP95": 7.2999999999883585
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 10.5,
          "domP50": 2.2999999999883585,
          "domP95": 11.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.8999999999650754,
          "endLag": 0.3999999999650754,
          "maxBacklog": 0
        },
        "heapMb": 3.724018096923828,
        "heapCode": 1.8442649841308594,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 223.09375,
        "pssApp": 125.9267578125,
        "pssRenderer": 97.1669921875
      },
      "500": {
        "setKey": {
          "emitP50": 0.3999999999650754,
          "emitP95": 0.6000000000349246,
          "domP50": 5.5,
          "domP95": 6.399999999965075
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 3.2000000000116415,
          "domP50": 1.3999999999650754,
          "domP95": 11.600000000034925
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3,
          "domP50": 1.8000000000465661,
          "domP95": 7.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.9000000000232831,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 4.132148742675781,
        "heapCode": 1.8495674133300781,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 225.08984375,
        "pssApp": 123.65625,
        "pssRenderer": 101.43359375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6000000000349246,
          "emitP95": 5.100000000034925,
          "domP50": 4.099999999976717,
          "domP95": 9.400000000023283
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 4.2999999999883585,
          "domP50": 3.3999999999650754,
          "domP95": 13.300000000046566
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 0.7999999999883585,
          "domP50": 1.599999999976717,
          "domP95": 10
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 3.1000000000349246,
          "endLag": 1.7000000000116415,
          "maxBacklog": 0
        },
        "heapMb": 8.099235534667969,
        "heapCode": 1.8469009399414062,
        "heapData": 5.725639343261719,
        "pssTotalMb": 229.6171875,
        "pssApp": 123.5693359375,
        "pssRenderer": 106.0478515625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 5.2999999999883585,
        "domP50": 5.099999999976717,
        "domP95": 8.199999999953434
      },
      "edit_d4": {
        "emitP50": 0.3999999999650754,
        "emitP95": 0.7999999999883585,
        "domP50": 1.5,
        "domP95": 9.399999999965075
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.7000000000116415,
        "domP50": 3.7000000000116415,
        "domP95": 11.600000000034925
      },
      "loadCycle": {
        "emitP50": 0.30000000004656613,
        "emitP95": 32.59999999997672,
        "domP50": 0.5,
        "domP95": 32.90000000002328
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7000000000116415,
        "domP50": 4.399999999965075,
        "domP95": 9.299999999988358
      },
      "reset": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.6000000000349246,
        "domP50": 0.30000000004656613,
        "domP95": 4.100000000034925
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 1,
        "domP95": 7.300000000046566
      },
      "heapMb": 3.7774810791015625,
      "heapCode": 1.7704505920410156,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 221.947265625,
      "pssApp": 124.34375,
      "pssRenderer": 97.603515625,
      "relaunchReadyMs": 1647.600000000035,
      "relaunchHeapMb": 3.2581520080566406,
      "relaunchHeapCode": 1.4548759460449219,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.5,
          "emitP95": 16.600000000034925,
          "domP50": 10,
          "domP95": 17.5
        },
        "setKeys": {
          "emitP50": 8.799999999988358,
          "emitP95": 13.299999999988358,
          "domP50": 9.200000000011642,
          "domP95": 14
        },
        "replace": {
          "emitP50": 8.399999999965075,
          "emitP95": 14.899999999965075,
          "domP50": 8.899999999965075,
          "domP95": 15.299999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.800000000046566,
          "lagP95": 18.29999999998836,
          "endLag": 7.100000000034925,
          "maxBacklog": 2
        },
        "heapMb": 5.068332672119141,
        "heapCode": 3.0127182006835938,
        "heapData": 1.6155548095703125,
        "pssTotalMb": 234.5927734375,
        "pssApp": 131.16796875,
        "pssRenderer": 103.4248046875,
        "control": {
          "emitP50": 6.2999999999883585,
          "emitP95": 13.700000000011642,
          "domP50": 6.599999999976717,
          "domP95": 14
        },
        "fCommitP50": 3.5,
        "fCommitP95": 10.600000000034925
      },
      "500": {
        "setKey": {
          "emitP50": 8.799999999988358,
          "emitP95": 16.79999999998836,
          "domP50": 9.899999999965075,
          "domP95": 17.29999999998836
        },
        "setKeys": {
          "emitP50": 10.599999999976717,
          "emitP95": 27.20000000001164,
          "domP50": 11.200000000011642,
          "domP95": 27.599999999976717
        },
        "replace": {
          "emitP50": 10.900000000023283,
          "emitP95": 19.400000000023283,
          "domP50": 11.5,
          "domP95": 20.20000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.600000000034925,
          "lagP95": 18.70000000001164,
          "endLag": 7.600000000034925,
          "maxBacklog": 2
        },
        "heapMb": 5.558380126953125,
        "heapCode": 3.03387451171875,
        "heapData": 2.068572998046875,
        "pssTotalMb": 233.60546875,
        "pssApp": 129.58984375,
        "pssRenderer": 104.015625,
        "control": {
          "emitP50": 6.2000000000116415,
          "emitP95": 16.099999999976717,
          "domP50": 6.600000000034925,
          "domP95": 16.29999999998836
        },
        "fCommitP50": 3.6000000000349246,
        "fCommitP95": 10.399999999965075
      },
      "5000": {
        "setKey": {
          "emitP50": 11.599999999976717,
          "emitP95": 18.79999999998836,
          "domP50": 12.5,
          "domP95": 19.29999999998836
        },
        "setKeys": {
          "emitP50": 11.900000000023283,
          "emitP95": 21.399999999965075,
          "domP50": 12.800000000046566,
          "domP95": 21.79999999998836
        },
        "replace": {
          "emitP50": 14,
          "emitP95": 25.29999999998836,
          "domP50": 14.399999999965075,
          "domP95": 25.70000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.700000000011642,
          "lagP95": 21,
          "endLag": 9.099999999976717,
          "maxBacklog": 2
        },
        "heapMb": 9.944042205810547,
        "heapCode": 3.0847015380859375,
        "heapData": 6.2604522705078125,
        "pssTotalMb": 248.056640625,
        "pssApp": 138.607421875,
        "pssRenderer": 109.44921875,
        "control": {
          "emitP50": 8.5,
          "emitP95": 28,
          "domP50": 9,
          "domP95": 28.300000000046566
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 14.799999999988358
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.700000000011642,
        "emitP95": 20.70000000001164,
        "domP50": 9.5,
        "domP95": 21.20000000001164
      },
      "edit_d4": {
        "emitP50": 8.100000000034925,
        "emitP95": 18.900000000023283,
        "domP50": 8.799999999988358,
        "domP95": 19.29999999998836
      },
      "edit_d10": {
        "emitP50": 7.7999999999883585,
        "emitP95": 19.099999999976717,
        "domP50": 9,
        "domP95": 19.399999999965075
      },
      "loadCycle": {
        "emitP50": 20.20000000001164,
        "emitP95": 48.79999999998836,
        "domP50": 20.600000000034925,
        "domP95": 49.29999999998836
      },
      "step": {
        "emitP50": 8.799999999988358,
        "emitP95": 21.79999999998836,
        "domP50": 9.200000000011642,
        "domP95": 22.099999999976717
      },
      "reset": {
        "emitP50": 24.599999999976717,
        "emitP95": 44.600000000034925,
        "domP50": 24.599999999976717,
        "domP95": 45.20000000001164
      },
      "append100": {
        "emitP50": 12.799999999988358,
        "emitP95": 17.899999999965075,
        "domP50": 13.5,
        "domP95": 18.79999999998836
      },
      "control": {
        "emitP50": 6.5,
        "emitP95": 21.79999999998836,
        "domP50": 6.7999999999883585,
        "domP95": 22.20000000001164
      },
      "heapMb": 5.4957275390625,
      "heapCode": 3.1743316650390625,
      "heapData": 1.8738746643066406,
      "pssTotalMb": 238.3095703125,
      "pssApp": 133.0986328125,
      "pssRenderer": 105.2109375,
      "relaunchReadyMs": 2042.899999999965,
      "relaunchHeapMb": 4.376308441162109,
      "relaunchHeapCode": 2.2347030639648438,
      "relaunchHeapData": 1.7657470703125
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.400000000023283,
          "emitP95": 21.399999999965075,
          "domP50": 10,
          "domP95": 22
        },
        "setKeys": {
          "emitP50": 9.099999999976717,
          "emitP95": 19.400000000023283,
          "domP50": 9.700000000011642,
          "domP95": 19.70000000001164
        },
        "replace": {
          "emitP50": 7.7999999999883585,
          "emitP95": 21.20000000001164,
          "domP50": 8.700000000011642,
          "domP95": 21.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.7999999999883585,
          "lagP95": 25.5,
          "endLag": 6.699999999953434,
          "maxBacklog": 2
        },
        "heapMb": 5.068321228027344,
        "heapCode": 3.0127105712890625,
        "heapData": 1.6156196594238281,
        "pssTotalMb": 233.4296875,
        "pssApp": 130.1064453125,
        "pssRenderer": 103.3232421875,
        "control": {
          "emitP50": 7.899999999965075,
          "emitP95": 18.29999999998836,
          "domP50": 8.200000000011642,
          "domP95": 18.70000000001164
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 14.099999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 10,
          "emitP95": 29,
          "domP50": 10.700000000011642,
          "domP95": 29.5
        },
        "setKeys": {
          "emitP50": 12.400000000023283,
          "emitP95": 24.099999999976717,
          "domP50": 12.700000000011642,
          "domP95": 25
        },
        "replace": {
          "emitP50": 10.700000000011642,
          "emitP95": 19.300000000046566,
          "domP50": 11.599999999976717,
          "domP95": 19.600000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.399999999965075,
          "lagP95": 18.5,
          "endLag": 9.5,
          "maxBacklog": 2
        },
        "heapMb": 5.5594940185546875,
        "heapCode": 3.0345001220703125,
        "heapData": 2.0685691833496094,
        "pssTotalMb": 236.1044921875,
        "pssApp": 132.15625,
        "pssRenderer": 103.9482421875,
        "control": {
          "emitP50": 6.2999999999883585,
          "emitP95": 22,
          "domP50": 6.5,
          "domP95": 22.20000000001164
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 13.100000000034925
      },
      "5000": {
        "setKey": {
          "emitP50": 10.5,
          "emitP95": 19.79999999993015,
          "domP50": 11.300000000046566,
          "domP95": 20.699999999953434
        },
        "setKeys": {
          "emitP50": 10.199999999953434,
          "emitP95": 23.79999999993015,
          "domP50": 10.79999999993015,
          "domP95": 24.199999999953434
        },
        "replace": {
          "emitP50": 13.400000000023283,
          "emitP95": 21.300000000046566,
          "domP50": 13.800000000046566,
          "domP95": 21.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.70000000006985,
          "lagP95": 17,
          "endLag": 7.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.942237854003906,
        "heapCode": 3.08331298828125,
        "heapData": 6.260478973388672,
        "pssTotalMb": 248.0107421875,
        "pssApp": 138.3056640625,
        "pssRenderer": 109.705078125,
        "control": {
          "emitP50": 7.5,
          "emitP95": 16,
          "domP50": 8.400000000023283,
          "domP95": 16.300000000046566
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 6.200000000069849
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.5,
        "emitP95": 18.29999999993015,
        "domP50": 9.70000000006985,
        "domP95": 18.899999999906868
      },
      "edit_d4": {
        "emitP50": 8.099999999976717,
        "emitP95": 24.800000000046566,
        "domP50": 9.399999999906868,
        "domP95": 25.300000000046566
      },
      "edit_d10": {
        "emitP50": 8.300000000046566,
        "emitP95": 17.599999999976717,
        "domP50": 8.800000000046566,
        "domP95": 18
      },
      "loadCycle": {
        "emitP50": 16.600000000093132,
        "emitP95": 55,
        "domP50": 16.70000000006985,
        "domP95": 55.39999999990687
      },
      "step": {
        "emitP50": 7.699999999953434,
        "emitP95": 23.199999999953434,
        "domP50": 8,
        "domP95": 23.5
      },
      "reset": {
        "emitP50": 29.5,
        "emitP95": 105.80000000004657,
        "domP50": 29.599999999976717,
        "domP95": 106.40000000002328
      },
      "append100": {
        "emitP50": 14.599999999976717,
        "emitP95": 22.599999999976717,
        "domP50": 15,
        "domP95": 23
      },
      "control": {
        "emitP50": 6.5,
        "emitP95": 13.70000000006985,
        "domP50": 7,
        "domP95": 13.900000000023283
      },
      "heapMb": 5.496417999267578,
      "heapCode": 3.17327880859375,
      "heapData": 1.8755111694335938,
      "pssTotalMb": 238.419921875,
      "pssApp": 132.93359375,
      "pssRenderer": 105.486328125,
      "relaunchReadyMs": 402,
      "relaunchHeapMb": 4.535675048828125,
      "relaunchHeapCode": 2.326892852783203,
      "relaunchHeapData": 1.8306198120117188
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 4.699999999953434,
          "domP95": 9.099999999976717
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.599999999976717,
          "domP50": 2.200000000069849,
          "domP95": 8.300000000046566
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.300000000046566,
          "domP50": 3.099999999976717,
          "domP95": 11.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.39999999990686774,
          "lagP95": 0.8000000000465661,
          "endLag": 0.39999999990686774,
          "maxBacklog": 0
        },
        "heapMb": 3.7226829528808594,
        "heapCode": 1.8429985046386719,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 222.2978515625,
        "pssApp": 125.1572265625,
        "pssRenderer": 97.140625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.7000000000698492,
          "domP50": 3.200000000069849,
          "domP95": 10.900000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 0.9000000000232831,
          "domP50": 1.3000000000465661,
          "domP95": 12.29999999993015
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.599999999976717,
          "domP50": 1.1999999999534339,
          "domP95": 9.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8000000000465661,
          "endLag": 0.5999999999767169,
          "maxBacklog": 0
        },
        "heapMb": 3.8727951049804688,
        "heapCode": 1.603271484375,
        "heapData": 1.8890113830566406,
        "pssTotalMb": 222.892578125,
        "pssApp": 123.205078125,
        "pssRenderer": 99.6875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 2.400000000023283,
          "domP50": 3.199999999953434,
          "domP95": 7.699999999953434
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 3.800000000046566,
          "domP50": 2.800000000046566,
          "domP95": 8.20000000006985
        },
        "replace": {
          "emitP50": 0.5,
          "emitP95": 1.8000000000465661,
          "domP50": 1.400000000023283,
          "domP95": 3.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999068677,
          "lagP95": 2,
          "endLag": 1,
          "maxBacklog": 0
        },
        "heapMb": 8.097625732421875,
        "heapCode": 1.8454971313476562,
        "heapData": 5.725639343261719,
        "pssTotalMb": 231.2158203125,
        "pssApp": 125.5400390625,
        "pssRenderer": 105.67578125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 2.200000000069849,
        "domP95": 7.5
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.7999999999301508,
        "domP50": 1.1999999999534339,
        "domP95": 15.70000000006985
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.3999999999068677,
        "domP50": 1.5,
        "domP95": 7.900000000023283
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 32.699999999953434,
        "domP50": 0.5999999999767169,
        "domP95": 33.5
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7000000000698492,
        "domP50": 0.9000000000232831,
        "domP95": 10.5
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.30000000004656613,
        "domP50": 0.30000000004656613,
        "domP95": 1.099999999976717
      },
      "append100": {
        "emitP50": 0.39999999990686774,
        "emitP95": 1.7000000000698492,
        "domP50": 0.8000000000465661,
        "domP95": 6.5
      },
      "heapMb": 3.9349136352539062,
      "heapCode": 1.9232177734375,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 224.048828125,
      "pssApp": 125.376953125,
      "pssRenderer": 98.671875,
      "relaunchReadyMs": 1636.5,
      "relaunchHeapMb": 3.2575454711914062,
      "relaunchHeapCode": 1.4546775817871094,
      "relaunchHeapData": 1.443511962890625
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
          "domP50": 5.5,
          "domP95": 6.900000000023283
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.099999999976717,
          "domP50": 5.399999999906868,
          "domP95": 11.70000000006985
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.599999999976717,
          "domP50": 1.3000000000465661,
          "domP95": 9.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 2.300000000046566,
          "endLag": 0.39999999990686774,
          "maxBacklog": 0
        },
        "heapMb": 3.7208290100097656,
        "heapCode": 1.841461181640625,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.0849609375,
        "pssApp": 125.408203125,
        "pssRenderer": 98.6767578125
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6999999999534339,
          "domP50": 5.800000000046566,
          "domP95": 7.200000000069849
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 4.199999999953434,
          "domP95": 10.400000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7999999999301508,
          "domP50": 1.1999999999534339,
          "domP95": 14.100000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.9000000000232831,
          "endLag": 0.5999999999767169,
          "maxBacklog": 0
        },
        "heapMb": 4.135002136230469,
        "heapCode": 1.8520164489746094,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 229.44140625,
        "pssApp": 127.3486328125,
        "pssRenderer": 102.0927734375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.5,
          "emitP95": 3.800000000046566,
          "domP50": 2.900000000023283,
          "domP95": 15.699999999953434
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 3.1000000000931323,
          "domP50": 2.599999999976717,
          "domP95": 13.5
        },
        "replace": {
          "emitP50": 0.5,
          "emitP95": 1.900000000023283,
          "domP50": 1.400000000023283,
          "domP95": 4.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 1.8000000000465661,
          "endLag": 1.5,
          "maxBacklog": 0
        },
        "heapMb": 8.10064697265625,
        "heapCode": 1.8483428955078125,
        "heapData": 5.725791931152344,
        "pssTotalMb": 233.7919921875,
        "pssApp": 126.9189453125,
        "pssRenderer": 106.873046875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.099999999976717,
        "domP50": 5.599999999976717,
        "domP95": 6.900000000023283
      },
      "edit_d4": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.6999999999534339,
        "domP50": 1.1999999999534339,
        "domP95": 9.099999999976717
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 2.799999999930151,
        "domP95": 7.900000000023283
      },
      "loadCycle": {
        "emitP50": 13.199999999953434,
        "emitP95": 33.800000000046566,
        "domP50": 16.199999999953434,
        "domP95": 34.300000000046566
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.5999999999767169,
        "domP50": 1,
        "domP95": 8.100000000093132
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 1,
        "domP50": 0.2000000000698492,
        "domP95": 1.7999999999301508
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.099999999976717,
        "domP50": 0.6999999999534339,
        "domP95": 5.900000000023283
      },
      "heapMb": 3.935516357421875,
      "heapCode": 1.9238090515136719,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.2490234375,
      "pssApp": 126.1337890625,
      "pssRenderer": 100.115234375,
      "relaunchReadyMs": 1602.6999999999534,
      "relaunchHeapMb": 3.3522415161132812,
      "relaunchHeapCode": 1.5400505065917969,
      "relaunchHeapData": 1.4465255737304688
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8,
          "emitP95": 26.5,
          "domP50": 8.899999999906868,
          "domP95": 27.20000000006985
        },
        "setKeys": {
          "emitP50": 8.600000000093132,
          "emitP95": 17.400000000023283,
          "domP50": 9.100000000093132,
          "domP95": 17.699999999953434
        },
        "replace": {
          "emitP50": 8.900000000023283,
          "emitP95": 17,
          "domP50": 9.199999999953434,
          "domP95": 17.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.200000000069849,
          "lagP95": 15.29999999993015,
          "endLag": 5.700000000069849,
          "maxBacklog": 3
        },
        "heapMb": 5.058719635009766,
        "heapCode": 3.0034332275390625,
        "heapData": 1.6156120300292969,
        "pssTotalMb": 235.623046875,
        "pssApp": 131.2958984375,
        "pssRenderer": 104.3271484375,
        "control": {
          "emitP50": 6.699999999953434,
          "emitP95": 16.900000000023283,
          "domP50": 7,
          "domP95": 17.20000000006985
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 9.300000000046566
      },
      "500": {
        "setKey": {
          "emitP50": 9.599999999976717,
          "emitP95": 25.79999999993015,
          "domP50": 10,
          "domP95": 26.199999999953434
        },
        "setKeys": {
          "emitP50": 10.5,
          "emitP95": 22.79999999993015,
          "domP50": 11.300000000046566,
          "domP95": 23.099999999976717
        },
        "replace": {
          "emitP50": 8.300000000046566,
          "emitP95": 19.79999999993015,
          "domP50": 9.29999999993015,
          "domP95": 20.399999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.300000000046566,
          "lagP95": 15.600000000093132,
          "endLag": 14.699999999953434,
          "maxBacklog": 3
        },
        "heapMb": 5.548648834228516,
        "heapCode": 3.0245590209960938,
        "heapData": 2.068572998046875,
        "pssTotalMb": 238.037109375,
        "pssApp": 132.9658203125,
        "pssRenderer": 105.0712890625,
        "control": {
          "emitP50": 7.199999999953434,
          "emitP95": 16.699999999953434,
          "domP50": 7.5,
          "domP95": 17.099999999976717
        },
        "fCommitP50": 3.5,
        "fCommitP95": 12.600000000093132
      },
      "5000": {
        "setKey": {
          "emitP50": 11.400000000023283,
          "emitP95": 22,
          "domP50": 11.900000000023283,
          "domP95": 23
        },
        "setKeys": {
          "emitP50": 11.699999999953434,
          "emitP95": 19.79999999993015,
          "domP50": 12.300000000046566,
          "domP95": 21.099999999976717
        },
        "replace": {
          "emitP50": 15,
          "emitP95": 26.800000000046566,
          "domP50": 15.5,
          "domP95": 27.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.699999999953434,
          "lagP95": 17.29999999993015,
          "endLag": 5.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 9.93450927734375,
        "heapCode": 3.0754928588867188,
        "heapData": 6.261196136474609,
        "pssTotalMb": 249.94921875,
        "pssApp": 139.4970703125,
        "pssRenderer": 110.4521484375,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 18.400000000023283,
          "domP50": 6.700000000069849,
          "domP95": 18.70000000006985
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 7.100000000093132
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.699999999953434,
        "emitP95": 17,
        "domP50": 9.399999999906868,
        "domP95": 17.29999999993015
      },
      "edit_d4": {
        "emitP50": 9.79999999993015,
        "emitP95": 22.699999999953434,
        "domP50": 10.400000000023283,
        "domP95": 23
      },
      "edit_d10": {
        "emitP50": 7.800000000046566,
        "emitP95": 16.5,
        "domP50": 8.100000000093132,
        "domP95": 18.800000000046566
      },
      "loadCycle": {
        "emitP50": 16.099999999976717,
        "emitP95": 61.39999999990687,
        "domP50": 16.199999999953434,
        "domP95": 61.89999999990687
      },
      "step": {
        "emitP50": 8.900000000023283,
        "emitP95": 25.400000000023283,
        "domP50": 9.300000000046566,
        "domP95": 25.70000000006985
      },
      "reset": {
        "emitP50": 26,
        "emitP95": 35.800000000046566,
        "domP50": 26,
        "domP95": 36.300000000046566
      },
      "append100": {
        "emitP50": 13.099999999976717,
        "emitP95": 18.300000000046566,
        "domP50": 13.399999999906868,
        "domP95": 24.099999999976717
      },
      "control": {
        "emitP50": 6.700000000069849,
        "emitP95": 17.900000000023283,
        "domP50": 7.200000000069849,
        "domP95": 18.20000000006985
      },
      "heapMb": 5.502559661865234,
      "heapCode": 3.1849212646484375,
      "heapData": 1.8697929382324219,
      "pssTotalMb": 242.53515625,
      "pssApp": 136.0439453125,
      "pssRenderer": 106.4912109375,
      "relaunchReadyMs": 870.5,
      "relaunchHeapMb": 4.739349365234375,
      "relaunchHeapCode": 2.0990982055664062,
      "relaunchHeapData": 1.8235206604003906
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.399999999906868,
          "emitP95": 20.300000000046566,
          "domP50": 10.199999999953434,
          "domP95": 20.800000000046566
        },
        "setKeys": {
          "emitP50": 10.300000000046566,
          "emitP95": 22.599999999976717,
          "domP50": 10.800000000046566,
          "domP95": 22.900000000023283
        },
        "replace": {
          "emitP50": 7.600000000093132,
          "emitP95": 24.900000000023283,
          "domP50": 8.099999999976717,
          "domP95": 28.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 19,
          "endLag": 5.300000000046566,
          "maxBacklog": 2
        },
        "heapMb": 5.057228088378906,
        "heapCode": 3.0025482177734375,
        "heapData": 1.6156158447265625,
        "pssTotalMb": 236.0888671875,
        "pssApp": 131.6826171875,
        "pssRenderer": 104.40625,
        "control": {
          "emitP50": 5.900000000023283,
          "emitP95": 18.79999999993015,
          "domP50": 6.200000000069849,
          "domP95": 19
        },
        "fCommitP50": 3.5,
        "fCommitP95": 13.399999999906868
      },
      "500": {
        "setKey": {
          "emitP50": 8.699999999953434,
          "emitP95": 14.599999999976717,
          "domP50": 9.20000000006985,
          "domP95": 14.900000000023283
        },
        "setKeys": {
          "emitP50": 10,
          "emitP95": 19.300000000046566,
          "domP50": 10.599999999976717,
          "domP95": 19.699999999953434
        },
        "replace": {
          "emitP50": 9.599999999976717,
          "emitP95": 22.300000000046566,
          "domP50": 10.20000000006985,
          "domP95": 22.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 11.29999999993015,
          "endLag": 6,
          "maxBacklog": 2
        },
        "heapMb": 5.548450469970703,
        "heapCode": 3.0245285034179688,
        "heapData": 2.068572998046875,
        "pssTotalMb": 236.783203125,
        "pssApp": 131.7001953125,
        "pssRenderer": 105.0830078125,
        "control": {
          "emitP50": 6,
          "emitP95": 14.79999999993015,
          "domP50": 6.300000000046566,
          "domP95": 15.199999999953434
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 13.20000000006985
      },
      "5000": {
        "setKey": {
          "emitP50": 10.199999999953434,
          "emitP95": 22.199999999953434,
          "domP50": 11,
          "domP95": 22.5
        },
        "setKeys": {
          "emitP50": 11.79999999993015,
          "emitP95": 17.400000000023283,
          "domP50": 12.199999999953434,
          "domP95": 17.900000000023283
        },
        "replace": {
          "emitP50": 14.29999999993015,
          "emitP95": 29.300000000046566,
          "domP50": 14.800000000046566,
          "domP95": 29.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.5,
          "lagP95": 25,
          "endLag": 25.5,
          "maxBacklog": 2
        },
        "heapMb": 9.94125747680664,
        "heapCode": 3.0823402404785156,
        "heapData": 6.260501861572266,
        "pssTotalMb": 250.7919921875,
        "pssApp": 140.345703125,
        "pssRenderer": 110.4462890625,
        "control": {
          "emitP50": 7.300000000046566,
          "emitP95": 15.79999999993015,
          "domP50": 7.600000000093132,
          "domP95": 16.099999999976717
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 7.300000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.399999999906868,
        "emitP95": 16.900000000023283,
        "domP50": 8.900000000023283,
        "domP95": 17.600000000093132
      },
      "edit_d4": {
        "emitP50": 9.600000000093132,
        "emitP95": 23,
        "domP50": 10.100000000093132,
        "domP95": 23.5
      },
      "edit_d10": {
        "emitP50": 9,
        "emitP95": 19.5,
        "domP50": 9.599999999976717,
        "domP95": 19.800000000046566
      },
      "loadCycle": {
        "emitP50": 20.699999999953434,
        "emitP95": 54.199999999953434,
        "domP50": 21.599999999976717,
        "domP95": 54.90000000002328
      },
      "step": {
        "emitP50": 7.300000000046566,
        "emitP95": 25.899999999906868,
        "domP50": 7.700000000069849,
        "domP95": 26.29999999993015
      },
      "reset": {
        "emitP50": 34.90000000002328,
        "emitP95": 46.89999999990687,
        "domP50": 34.90000000002328,
        "domP95": 46.89999999990687
      },
      "append100": {
        "emitP50": 13,
        "emitP95": 23.400000000023283,
        "domP50": 13.29999999993015,
        "domP95": 23.800000000046566
      },
      "control": {
        "emitP50": 6.099999999976717,
        "emitP95": 25,
        "domP50": 6.299999999930151,
        "domP95": 25.400000000023283
      },
      "heapMb": 5.491519927978516,
      "heapCode": 3.174182891845703,
      "heapData": 1.8698272705078125,
      "pssTotalMb": 242.857421875,
      "pssApp": 136.18359375,
      "pssRenderer": 106.673828125,
      "relaunchReadyMs": 422.5999999999767,
      "relaunchHeapMb": 4.535037994384766,
      "relaunchHeapCode": 2.326892852783203,
      "relaunchHeapData": 1.830047607421875
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.1999999999534339,
          "domP50": 1.599999999976717,
          "domP95": 7.800000000046566
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.5999999999767169,
          "domP50": 2.200000000069849,
          "domP95": 7.300000000046566
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.6999999999534339,
          "domP50": 4,
          "domP95": 10.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.563873291015625,
        "heapCode": 1.6889266967773438,
        "heapData": 1.5024337768554688,
        "pssTotalMb": 222.49609375,
        "pssApp": 125.203125,
        "pssRenderer": 97.29296875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 2.199999999953434,
          "domP50": 1.8000000000465661,
          "domP95": 6.5
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 3.400000000023283,
          "domP50": 1.5,
          "domP95": 6.5
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 3,
          "domP50": 1.2999999999301508,
          "domP95": 9.79999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.9000000000232831,
          "endLag": 0.5999999999767169,
          "maxBacklog": 0
        },
        "heapMb": 4.132747650146484,
        "heapCode": 1.849761962890625,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 229.494140625,
        "pssApp": 127.5634765625,
        "pssRenderer": 101.9306640625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.3000000000465661,
          "emitP95": 3,
          "domP50": 6.899999999906868,
          "domP95": 8.20000000006985
        },
        "setKeys": {
          "emitP50": 1.400000000023283,
          "emitP95": 3.5,
          "domP50": 2.800000000046566,
          "domP95": 13.199999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.300000000046566,
          "domP50": 1.8000000000465661,
          "domP95": 9.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.5,
          "endLag": 2,
          "maxBacklog": 0
        },
        "heapMb": 8.099571228027344,
        "heapCode": 1.8474617004394531,
        "heapData": 5.725620269775391,
        "pssTotalMb": 233.5146484375,
        "pssApp": 126.7421875,
        "pssRenderer": 106.7724609375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 5.5,
        "domP95": 7.099999999976717
      },
      "edit_d4": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1,
        "domP50": 5.199999999953434,
        "domP95": 6.599999999976717
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 3,
        "domP50": 1.400000000023283,
        "domP95": 8.699999999953434
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 36.09999999997672,
        "domP50": 0.7000000000698492,
        "domP95": 36.40000000002328
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 1.400000000023283,
        "domP95": 9.70000000006985
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 0.30000000004656613,
        "domP95": 1.599999999976717
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.6000000000931323,
        "domP50": 0.8999999999068677,
        "domP95": 5.099999999976717
      },
      "heapMb": 3.9370460510253906,
      "heapCode": 1.9251441955566406,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 227.4462890625,
      "pssApp": 127.8935546875,
      "pssRenderer": 99.552734375,
      "relaunchReadyMs": 1646.1999999999534,
      "relaunchHeapMb": 3.3521041870117188,
      "relaunchHeapCode": 1.5400962829589844,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7000000000698492,
          "domP50": 5.699999999953434,
          "domP95": 7
        },
        "setKeys": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.40000000002328306,
          "domP50": 5.299999999930151,
          "domP95": 6.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.3000000000465661,
          "domP50": 2.299999999930151,
          "domP95": 7.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.721057891845703,
        "heapCode": 1.8416557312011719,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 226.0478515625,
        "pssApp": 127.6767578125,
        "pssRenderer": 98.37109375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 3,
          "domP50": 5.100000000093132,
          "domP95": 7.199999999953434
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.099999999976717,
          "domP50": 1.3999999999068677,
          "domP95": 9
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.200000000069849,
          "domP50": 1.099999999976717,
          "domP95": 8.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 0.39999999990686774,
          "maxBacklog": 0
        },
        "heapMb": 3.974700927734375,
        "heapCode": 1.6965484619140625,
        "heapData": 1.8917236328125,
        "pssTotalMb": 226.20703125,
        "pssApp": 125.17578125,
        "pssRenderer": 101.03125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.3999999999068677,
          "emitP95": 1.8000000000465661,
          "domP50": 6.800000000046566,
          "domP95": 7.900000000023283
        },
        "setKeys": {
          "emitP50": 1.6999999999534339,
          "emitP95": 6.099999999976717,
          "domP50": 3.799999999930151,
          "domP95": 25.399999999906868
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7000000000698492,
          "domP50": 1.400000000023283,
          "domP95": 9.600000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.599999999976717,
          "endLag": 1,
          "maxBacklog": 0
        },
        "heapMb": 7.939075469970703,
        "heapCode": 1.6922340393066406,
        "heapData": 5.722118377685547,
        "pssTotalMb": 229.7275390625,
        "pssApp": 123.9091796875,
        "pssRenderer": 105.818359375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 3.599999999976717,
        "domP50": 1.400000000023283,
        "domP95": 9.5
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.6999999999534339,
        "domP50": 1.1999999999534339,
        "domP95": 7.899999999906868
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.099999999976717,
        "domP50": 3.900000000023283,
        "domP95": 7.400000000023283
      },
      "loadCycle": {
        "emitP50": 0.7999999999301508,
        "emitP95": 39,
        "domP50": 1,
        "domP95": 39.40000000002328
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.6999999999534339,
        "domP50": 0.9000000000232831,
        "domP95": 5
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.5,
        "domP50": 0.2999999999301508,
        "domP95": 1
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7000000000698492,
        "domP50": 1.1000000000931323,
        "domP95": 10.400000000023283
      },
      "heapMb": 3.7766265869140625,
      "heapCode": 1.7696151733398438,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 224.310546875,
      "pssApp": 125.552734375,
      "pssRenderer": 98.7578125,
      "relaunchReadyMs": 1616.8000000000466,
      "relaunchHeapMb": 3.3522109985351562,
      "relaunchHeapCode": 1.5400199890136719,
      "relaunchHeapData": 1.4465255737304688
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 14,
          "emitP95": 41.10000000009313,
          "domP50": 14.800000000046566,
          "domP95": 45.70000000006985
        },
        "setKeys": {
          "emitP50": 12.70000000006985,
          "emitP95": 22.900000000023283,
          "domP50": 13,
          "domP95": 23.29999999993015
        },
        "replace": {
          "emitP50": 8.900000000023283,
          "emitP95": 20.20000000006985,
          "domP50": 9.79999999993015,
          "domP95": 24.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9,
          "lagP95": 24.5,
          "endLag": 7,
          "maxBacklog": 2
        },
        "heapMb": 5.065269470214844,
        "heapCode": 3.0095787048339844,
        "heapData": 1.6158905029296875,
        "pssTotalMb": 237.4052734375,
        "pssApp": 133.1435546875,
        "pssRenderer": 104.26171875,
        "control": {
          "emitP50": 6.900000000023283,
          "emitP95": 16.199999999953434,
          "domP50": 7.800000000046566,
          "domP95": 16.400000000023283
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 9.5
      },
      "500": {
        "setKey": {
          "emitP50": 8.300000000046566,
          "emitP95": 21.100000000093132,
          "domP50": 8.599999999976717,
          "domP95": 22.5
        },
        "setKeys": {
          "emitP50": 11,
          "emitP95": 23.099999999976717,
          "domP50": 11.599999999976717,
          "domP95": 23.5
        },
        "replace": {
          "emitP50": 10,
          "emitP95": 21.20000000006985,
          "domP50": 10.800000000046566,
          "domP95": 21.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.699999999953434,
          "lagP95": 16.600000000093132,
          "endLag": 8.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.558635711669922,
        "heapCode": 3.0331993103027344,
        "heapData": 2.0692596435546875,
        "pssTotalMb": 238.3603515625,
        "pssApp": 133.2255859375,
        "pssRenderer": 105.134765625,
        "control": {
          "emitP50": 8.300000000046566,
          "emitP95": 17.699999999953434,
          "domP50": 8.900000000023283,
          "domP95": 18
        },
        "fCommitP50": 4.100000000093132,
        "fCommitP95": 9.20000000006985
      },
      "5000": {
        "setKey": {
          "emitP50": 10.29999999993015,
          "emitP95": 17.900000000023283,
          "domP50": 10.79999999993015,
          "domP95": 18.600000000093132
        },
        "setKeys": {
          "emitP50": 10.800000000046566,
          "emitP95": 22.099999999976717,
          "domP50": 11.199999999953434,
          "domP95": 22.5
        },
        "replace": {
          "emitP50": 13.5,
          "emitP95": 27.5,
          "domP50": 14.199999999953434,
          "domP95": 27.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.599999999976717,
          "lagP95": 17.5,
          "endLag": 6.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.934677124023438,
        "heapCode": 3.0758705139160156,
        "heapData": 6.260478973388672,
        "pssTotalMb": 250.8154296875,
        "pssApp": 140.1025390625,
        "pssRenderer": 110.712890625,
        "control": {
          "emitP50": 6.199999999953434,
          "emitP95": 20.400000000023283,
          "domP50": 7.199999999953434,
          "domP95": 20.599999999976717
        },
        "fCommitP50": 3.800000000046566,
        "fCommitP95": 12.5
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.20000000006985,
        "emitP95": 18.79999999993015,
        "domP50": 9.900000000023283,
        "domP95": 19.70000000006985
      },
      "edit_d4": {
        "emitP50": 9.099999999976717,
        "emitP95": 16.20000000006985,
        "domP50": 9.699999999953434,
        "domP95": 17.79999999993015
      },
      "edit_d10": {
        "emitP50": 7.899999999906868,
        "emitP95": 15.20000000006985,
        "domP50": 8.599999999976717,
        "domP95": 15.400000000023283
      },
      "loadCycle": {
        "emitP50": 20.5,
        "emitP95": 54.300000000046566,
        "domP50": 21.300000000046566,
        "domP95": 55.09999999997672
      },
      "step": {
        "emitP50": 7.5,
        "emitP95": 22.099999999976717,
        "domP50": 7.900000000023283,
        "domP95": 22.599999999976717
      },
      "reset": {
        "emitP50": 22.699999999953434,
        "emitP95": 46.699999999953434,
        "domP50": 22.699999999953434,
        "domP95": 46.699999999953434
      },
      "append100": {
        "emitP50": 12.900000000023283,
        "emitP95": 27,
        "domP50": 15.300000000046566,
        "domP95": 27.5
      },
      "control": {
        "emitP50": 7.100000000093132,
        "emitP95": 21.70000000006985,
        "domP50": 7.400000000023283,
        "domP95": 22.400000000023283
      },
      "heapMb": 5.49371337890625,
      "heapCode": 3.1785240173339844,
      "heapData": 1.8674659729003906,
      "pssTotalMb": 241.498046875,
      "pssApp": 135.083984375,
      "pssRenderer": 106.4140625,
      "relaunchReadyMs": 989.4000000000233,
      "relaunchHeapMb": 4.3259735107421875,
      "relaunchHeapCode": 2.1245765686035156,
      "relaunchHeapData": 1.8257522583007812
    }
  }
]
```
</details>
