# Phase 16 shapes — flat objects & hybrid workflow (2026-10-28)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.77 ms, p95 10.09 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 52 / CODE-BOUND 0 / FAIL 33

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.38 ± 0.08 | 10.44 ± 2.15 | 27.5× | FAIL | allow 9.8 (control emitP50 7.5×1) |
| flat | 50.setKey.emitP95 | 1.86 ± 1.49 | 24.38 ± 5.71 | 13.1× | PLATFORM-BOUND | allow 26.3 (control emitP95 19.1×1) |
| flat | 50.setKey.domP50 | 4.68 ± 1.63 | 11.00 ± 2.06 | 2.4× | PLATFORM-BOUND | allow 11.5 (control domP50 7.9×1) |
| flat | 50.setKey.domP95 | 8.32 ± 2.25 | 24.98 ± 5.52 | 3.0× | PLATFORM-BOUND | allow 27.4 (control domP95 19.7×1) |
| flat | 50.setKeys.emitP50 | 0.36 ± 0.05 | 9.54 ± 0.84 | 26.5× | FAIL | allow 8.4 (control emitP50 7.5×1) |
| flat | 50.setKeys.emitP95 | 1.16 ± 0.82 | 23.38 ± 5.94 | 20.2× | PLATFORM-BOUND | allow 25.9 (control emitP95 19.1×1) |
| flat | 50.setKeys.domP50 | 3.68 ± 2.32 | 10.28 ± 0.68 | 2.8× | PLATFORM-BOUND | allow 10.9 (control domP50 7.9×1) |
| flat | 50.setKeys.domP95 | 7.50 ± 1.57 | 24.58 ± 6.12 | 3.3× | PLATFORM-BOUND | allow 27.3 (control domP95 19.7×1) |
| flat | 50.replace.emitP50 | 0.34 ± 0.05 | 9.14 ± 2.21 | 26.9× | PLATFORM-BOUND | allow 9.8 (control emitP50 7.5×1) |
| flat | 50.replace.emitP95 | 4.02 ± 4.21 | 22.50 ± 4.64 | 5.6× | PLATFORM-BOUND | allow 28.0 (control emitP95 19.1×1) |
| flat | 50.replace.domP50 | 3.08 ± 1.79 | 9.80 ± 2.12 | 3.2× | PLATFORM-BOUND | allow 11.8 (control domP50 7.9×1) |
| flat | 50.replace.domP95 | 10.02 ± 2.48 | 23.02 ± 4.59 | 2.3× | PLATFORM-BOUND | allow 26.7 (control domP95 19.7×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 7.94 ± 1.87 | 26.5× | PLATFORM-BOUND | allow 9.4 (control emitP50 7.5×1) |
| flat | 50.burst.lagP95 | 0.72 ± 0.11 | 25.28 ± 20.02 | 35.1× | PLATFORM-BOUND | allow 39.2 (control emitP95 19.1×1) |
| flat | 50.burst.endLag | 0.36 ± 0.09 | 6.42 ± 1.28 | 17.8× | PLATFORM-BOUND | allow 8.9 (control emitP50 7.5×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.40 ± 0.55 | 2400000000.0× | FAIL |  |
| flat | 50.heapMb | 3.69 ± 0.07 | 5.05 ± 0.00 | 1.4× | FAIL | code +1.19 MB; data 1.50 -> 1.62 MB |
| flat | 50.pssTotalMb | 222.82 ± 2.36 | 234.56 ± 1.77 | 1.1× | FAIL | allow 8.3 (plugin baseline 4.2 MB) |
| flat | 500.setKey.emitP50 | 0.52 ± 0.08 | 9.96 ± 1.40 | 19.2× | FAIL | allow 8.3 (control emitP50 6.9×1) |
| flat | 500.setKey.emitP95 | 2.26 ± 1.17 | 22.36 ± 7.14 | 9.9× | PLATFORM-BOUND | allow 25.2 (control emitP95 16.9×1) |
| flat | 500.setKey.domP50 | 4.10 ± 1.80 | 10.76 ± 0.93 | 2.6× | PLATFORM-BOUND | allow 10.4 (control domP50 7.6×1) |
| flat | 500.setKey.domP95 | 9.36 ± 2.63 | 22.90 ± 7.15 | 2.4× | PLATFORM-BOUND | allow 27.0 (control domP95 17.2×1) |
| flat | 500.setKeys.emitP50 | 0.48 ± 0.04 | 9.98 ± 1.50 | 20.8× | FAIL | allow 8.4 (control emitP50 6.9×1) |
| flat | 500.setKeys.emitP95 | 1.82 ± 1.80 | 24.72 ± 5.01 | 13.6× | PLATFORM-BOUND | allow 23.7 (control emitP95 16.9×1) |
| flat | 500.setKeys.domP50 | 2.34 ± 1.62 | 10.68 ± 1.47 | 4.6× | PLATFORM-BOUND | allow 10.7 (control domP50 7.6×1) |
| flat | 500.setKeys.domP95 | 10.24 ± 2.19 | 25.48 ± 5.67 | 2.5× | PLATFORM-BOUND | allow 25.1 (control domP95 17.2×1) |
| flat | 500.replace.emitP50 | 0.36 ± 0.05 | 10.40 ± 1.64 | 28.9× | FAIL | allow 8.6 (control emitP50 6.9×1) |
| flat | 500.replace.emitP95 | 1.04 ± 0.38 | 21.96 ± 3.59 | 21.1× | FAIL | allow 20.9 (control emitP95 16.9×1) |
| flat | 500.replace.domP50 | 1.38 ± 0.36 | 10.92 ± 1.46 | 7.9× | FAIL | allow 9.4 (control domP50 7.6×1) |
| flat | 500.replace.domP95 | 8.16 ± 1.59 | 22.74 ± 3.52 | 2.8× | PLATFORM-BOUND | allow 22.3 (control domP95 17.2×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 6.94 ± 0.74 | 17.3× | PLATFORM-BOUND | allow 7.6 (control emitP50 6.9×1) |
| flat | 500.burst.lagP95 | 1.18 ± 0.53 | 20.00 ± 4.11 | 16.9× | PLATFORM-BOUND | allow 21.5 (control emitP95 16.9×1) |
| flat | 500.burst.endLag | 0.46 ± 0.15 | 7.42 ± 1.05 | 16.1× | PLATFORM-BOUND | allow 8.1 (control emitP50 6.9×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 500.heapMb | 4.08 ± 0.12 | 5.55 ± 0.00 | 1.4× | FAIL | code +1.22 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 226.63 ± 1.73 | 234.84 ± 1.08 | 1.0× | FAIL | allow 7.0 (plugin baseline 4.2 MB) |
| flat | 5000.setKey.emitP50 | 1.56 ± 0.24 | 11.88 ± 0.87 | 7.6× | FAIL | allow 8.0 (control emitP50 6.9×1) |
| flat | 5000.setKey.emitP95 | 3.46 ± 1.92 | 21.66 ± 1.44 | 6.3× | PLATFORM-BOUND | allow 21.9 (control emitP95 18.5×1) |
| flat | 5000.setKey.domP50 | 4.72 ± 2.02 | 12.58 ± 0.74 | 2.7× | PLATFORM-BOUND | allow 10.1 (control domP50 7.3×1) |
| flat | 5000.setKey.domP95 | 9.14 ± 1.78 | 22.32 ± 1.41 | 2.4× | PLATFORM-BOUND | allow 22.1 (control domP95 18.9×1) |
| flat | 5000.setKeys.emitP50 | 1.72 ± 0.04 | 11.52 ± 0.69 | 6.7× | FAIL | allow 7.6 (control emitP50 6.9×1) |
| flat | 5000.setKeys.emitP95 | 7.22 ± 3.92 | 21.96 ± 7.28 | 3.0× | PLATFORM-BOUND | allow 29.7 (control emitP95 18.5×1) |
| flat | 5000.setKeys.domP50 | 4.04 ± 1.05 | 12.12 ± 0.73 | 3.0× | PLATFORM-BOUND | allow 9.1 (control domP50 7.3×1) |
| flat | 5000.setKeys.domP95 | 13.00 ± 2.63 | 22.52 ± 7.16 | 1.7× | PLATFORM-BOUND | allow 28.7 (control domP95 18.9×1) |
| flat | 5000.replace.emitP50 | 0.38 ± 0.04 | 13.42 ± 0.31 | 35.3× | FAIL | allow 7.3 (control emitP50 6.9×1) |
| flat | 5000.replace.emitP95 | 4.58 ± 2.98 | 23.16 ± 1.40 | 5.1× | PLATFORM-BOUND | allow 22.9 (control emitP95 18.5×1) |
| flat | 5000.replace.domP50 | 2.10 ± 0.52 | 13.88 ± 0.34 | 6.6× | FAIL | allow 8.2 (control domP50 7.3×1) |
| flat | 5000.replace.domP95 | 11.28 ± 3.38 | 23.98 ± 0.93 | 2.1× | PLATFORM-BOUND | allow 23.2 (control domP95 18.9×1) |
| flat | 5000.burst.lagP50 | 1.48 ± 0.08 | 9.40 ± 0.58 | 6.4× | FAIL | allow 7.6 (control emitP50 6.9×1) |
| flat | 5000.burst.lagP95 | 3.16 ± 2.21 | 19.72 ± 2.71 | 6.2× | PLATFORM-BOUND | allow 23.4 (control emitP95 18.5×1) |
| flat | 5000.burst.endLag | 1.46 ± 0.18 | 11.92 ± 3.23 | 8.2× | FAIL | allow 10.3 (control emitP50 6.9×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.07 ± 0.07 | 9.93 ± 0.00 | 1.2× | FAIL | code +1.26 MB; data 5.72 -> 6.26 MB |
| flat | 5000.pssTotalMb | 230.63 ± 2.55 | 248.88 ± 1.51 | 1.1× | FAIL | allow 8.2 (plugin baseline 4.2 MB) |
| workflow | edit_d1.emitP50 | 0.42 ± 0.04 | 9.34 ± 0.42 | 22.2× | FAIL | allow 7.8 (control emitP50 7.4×1) |
| workflow | edit_d1.emitP95 | 1.30 ± 0.29 | 19.66 ± 1.36 | 15.1× | PLATFORM-BOUND | allow 20.8 (control emitP95 19.1×1) |
| workflow | edit_d1.domP50 | 3.26 ± 1.41 | 10.12 ± 0.38 | 3.1× | PLATFORM-BOUND | allow 9.5 (control domP50 7.7×1) |
| workflow | edit_d1.domP95 | 8.44 ± 0.99 | 20.42 ± 1.37 | 2.4× | PLATFORM-BOUND | allow 22.8 (control domP95 20.5×1) |
| workflow | edit_d4.emitP50 | 0.44 ± 0.05 | 9.42 ± 2.31 | 21.4× | PLATFORM-BOUND | allow 9.7 (control emitP50 7.4×1) |
| workflow | edit_d4.emitP95 | 1.26 ± 0.30 | 20.48 ± 2.41 | 16.3× | PLATFORM-BOUND | allow 21.8 (control emitP95 19.1×1) |
| workflow | edit_d4.domP50 | 2.56 ± 1.92 | 10.04 ± 2.22 | 3.9× | PLATFORM-BOUND | allow 11.8 (control domP50 7.7×1) |
| workflow | edit_d4.domP95 | 9.16 ± 2.81 | 21.00 ± 2.35 | 2.3× | PLATFORM-BOUND | allow 25.6 (control domP95 20.5×1) |
| workflow | edit_d10.emitP50 | 0.48 ± 0.08 | 8.66 ± 1.05 | 18.0× | PLATFORM-BOUND | allow 8.5 (control emitP50 7.4×1) |
| workflow | edit_d10.emitP95 | 2.16 ± 1.21 | 18.70 ± 3.19 | 8.7× | PLATFORM-BOUND | allow 23.5 (control emitP95 19.1×1) |
| workflow | edit_d10.domP50 | 1.90 ± 0.42 | 9.50 ± 1.07 | 5.0× | PLATFORM-BOUND | allow 9.2 (control domP50 7.7×1) |
| workflow | edit_d10.domP95 | 8.62 ± 1.22 | 19.20 ± 3.17 | 2.2× | PLATFORM-BOUND | allow 24.9 (control domP95 20.5×1) |
| workflow | loadCycle.emitP50 | 8.40 ± 7.26 | 16.88 ± 1.76 | 2.0× | PLATFORM-BOUND | allow 23.8 (control emitP50 7.4×2) |
| workflow | loadCycle.emitP95 | 33.60 ± 0.95 | 56.82 ± 5.76 | 1.7× | PLATFORM-BOUND | allow 44.9 (control emitP95 19.1×2) |
| workflow | loadCycle.domP50 | 9.10 ± 7.70 | 17.02 ± 1.70 | 1.9× | PLATFORM-BOUND | allow 24.8 (control domP50 7.7×2) |
| workflow | loadCycle.domP95 | 34.14 ± 1.12 | 57.24 ± 5.72 | 1.7× | PLATFORM-BOUND | allow 47.8 (control domP95 20.5×2) |
| workflow | step.emitP50 | 0.36 ± 0.05 | 8.82 ± 0.85 | 24.5× | FAIL | allow 8.3 (control emitP50 7.4×1) |
| workflow | step.emitP95 | 1.54 ± 1.36 | 24.80 ± 4.41 | 16.1× | PLATFORM-BOUND | allow 24.9 (control emitP95 19.1×1) |
| workflow | step.domP50 | 1.96 ± 1.23 | 9.34 ± 0.98 | 4.8× | PLATFORM-BOUND | allow 9.9 (control domP50 7.7×1) |
| workflow | step.domP95 | 8.46 ± 0.72 | 25.14 ± 4.42 | 3.0× | PLATFORM-BOUND | allow 25.6 (control domP95 20.5×1) |
| workflow | reset.emitP50 | 0.26 ± 0.05 | 26.82 ± 3.48 | 103.2× | FAIL | allow 10.9 (control emitP50 7.4×1) |
| workflow | reset.emitP95 | 0.58 ± 0.19 | 53.08 ± 15.81 | 91.5× | FAIL | allow 35.1 (control emitP95 19.1×1) |
| workflow | reset.domP50 | 0.26 ± 0.05 | 26.90 ± 3.50 | 103.5× | FAIL | allow 11.3 (control domP50 7.7×1) |
| workflow | reset.domP95 | 1.70 ± 0.78 | 53.24 ± 16.06 | 31.3× | FAIL | allow 37.3 (control domP95 20.5×1) |
| workflow | append100.emitP50 | 0.34 ± 0.05 | 14.40 ± 1.96 | 42.4× | FAIL | allow 9.4 (control emitP50 7.4×1) |
| workflow | append100.emitP95 | 0.90 ± 0.38 | 23.98 ± 4.92 | 26.6× | PLATFORM-BOUND | allow 24.4 (control emitP95 19.1×1) |
| workflow | append100.domP50 | 0.98 ± 0.18 | 14.86 ± 2.08 | 15.2× | FAIL | allow 10.0 (control domP50 7.7×1) |
| workflow | append100.domP95 | 7.14 ± 3.08 | 24.34 ± 4.90 | 3.4× | PLATFORM-BOUND | allow 28.5 (control domP95 20.5×1) |
| workflow | heapMb | 3.90 ± 0.07 | 5.49 ± 0.01 | 1.4× | FAIL | code +1.28 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 224.38 ± 2.16 | 239.90 ± 1.11 | 1.1× | FAIL | allow 7.4 (plugin baseline 4.2 MB) |
| workflow | relaunchReadyMs | 1586.04 ± 180.48 | 791.82 ± 610.66 | 0.5× | PASS |  |
| workflow | relaunchHeapMb | 3.42 ± 0.09 | 4.45 ± 0.11 | 1.3× | FAIL | code +0.65 MB; data 1.45 -> 1.81 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 7.54 | 7.86 | 19.66 | 10.44 | 11.00 | 24.98 |
| 500 | 6.86 | 7.62 | 17.24 | 9.96 | 10.76 | 22.90 |
| 5000 | 6.90 | 7.30 | 18.88 | 11.88 | 12.58 | 22.32 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 126.7 | 132.3 | 96.1 | 102.2 |
| flat 500 | 126.9 | 132.0 | 99.7 | 102.8 |
| flat 5000 | 126.0 | 140.5 | 104.6 | 108.4 |
| workflow | 127.1 | 135.7 | 97.3 | 104.2 |

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
          "emitP95": 1.599999999976717,
          "domP50": 5.2999999999883585,
          "domP95": 11.900000000023283
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 1.099999999976717,
          "domP95": 5.899999999965075
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 4.600000000034925,
          "domP50": 2.7000000000116415,
          "domP95": 6.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.7000000000116415,
          "endLag": 0.29999999998835847,
          "maxBacklog": 0
        },
        "heapMb": 3.563873291015625,
        "heapCode": 1.6889266967773438,
        "heapData": 1.5024337768554688,
        "pssTotalMb": 219.1123046875,
        "pssApp": 124.458984375,
        "pssRenderer": 94.6533203125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 3.7000000000116415,
          "domP50": 2.2000000000116415,
          "domP95": 11.600000000034925
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 5,
          "domP50": 5.2000000000116415,
          "domP95": 9.5
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.6000000000349246,
          "domP50": 1.400000000023283,
          "domP95": 7.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1.7999999999883585,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.133125305175781,
        "heapCode": 1.8499755859375,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 225.806640625,
        "pssApp": 126.46875,
        "pssRenderer": 99.337890625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.400000000023283,
          "emitP95": 1.7000000000116415,
          "domP50": 6.899999999965075,
          "domP95": 8.200000000011642
        },
        "setKeys": {
          "emitP50": 1.7999999999883585,
          "emitP95": 10.599999999976717,
          "domP50": 5.2000000000116415,
          "domP95": 15
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 8.5,
          "domP50": 1.7000000000116415,
          "domP95": 14.799999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.099999999976717,
          "endLag": 1.5,
          "maxBacklog": 0
        },
        "heapMb": 7.939060211181641,
        "heapCode": 1.6922187805175781,
        "heapData": 5.722118377685547,
        "pssTotalMb": 227.6220703125,
        "pssApp": 124.712890625,
        "pssRenderer": 102.9091796875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.5,
        "domP50": 5.7000000000116415,
        "domP95": 9
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7999999999883585,
        "domP50": 1.5,
        "domP95": 6.100000000034925
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.7999999999883585,
        "domP50": 2.099999999976717,
        "domP95": 8.199999999953434
      },
      "loadCycle": {
        "emitP50": 0.3999999999650754,
        "emitP95": 35.20000000001164,
        "domP50": 0.5,
        "domP95": 36.100000000034925
      },
      "step": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.7000000000116415,
        "domP50": 1.3999999999650754,
        "domP95": 9.200000000011642
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7999999999883585,
        "domP50": 0.30000000004656613,
        "domP95": 1.8000000000465661
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.2999999999883585,
        "domP50": 1,
        "domP95": 9.799999999988358
      },
      "heapMb": 3.777263641357422,
      "heapCode": 1.770233154296875,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 221.2431640625,
      "pssApp": 125.2919921875,
      "pssRenderer": 95.951171875,
      "relaunchReadyMs": 1575.5,
      "relaunchHeapMb": 3.35211181640625,
      "relaunchHeapCode": 1.5401039123535156,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.800000000046566,
          "emitP95": 18.79999999998836,
          "domP50": 9.600000000034925,
          "domP95": 20
        },
        "setKeys": {
          "emitP50": 9,
          "emitP95": 18.900000000023283,
          "domP50": 10.400000000023283,
          "domP95": 19.5
        },
        "replace": {
          "emitP50": 7.400000000023283,
          "emitP95": 20.20000000001164,
          "domP50": 7.900000000023283,
          "domP95": 21.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.599999999976717,
          "lagP95": 16.70000000001164,
          "endLag": 6.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.0507354736328125,
        "heapCode": 2.996246337890625,
        "heapData": 1.6156005859375,
        "pssTotalMb": 231.8896484375,
        "pssApp": 130.2041015625,
        "pssRenderer": 101.685546875,
        "control": {
          "emitP50": 6.5,
          "emitP95": 16.29999999998836,
          "domP50": 6.7999999999883585,
          "domP95": 16.600000000034925
        },
        "fCommitP50": 3.5,
        "fCommitP95": 12
      },
      "500": {
        "setKey": {
          "emitP50": 7.900000000023283,
          "emitP95": 17.29999999998836,
          "domP50": 9.5,
          "domP95": 17.899999999965075
        },
        "setKeys": {
          "emitP50": 9.400000000023283,
          "emitP95": 23.5,
          "domP50": 10.899999999965075,
          "domP95": 24
        },
        "replace": {
          "emitP50": 7.699999999953434,
          "emitP95": 28.100000000034925,
          "domP50": 8.600000000034925,
          "domP95": 28.79999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.199999999953434,
          "lagP95": 22.20000000001164,
          "endLag": 8.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.551506042480469,
        "heapCode": 3.0272483825683594,
        "heapData": 2.068492889404297,
        "pssTotalMb": 234.1201171875,
        "pssApp": 131.826171875,
        "pssRenderer": 102.2939453125,
        "control": {
          "emitP50": 5.900000000023283,
          "emitP95": 15.799999999988358,
          "domP50": 6.600000000034925,
          "domP95": 16.29999999998836
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 9.5
      },
      "5000": {
        "setKey": {
          "emitP50": 10.700000000011642,
          "emitP95": 22.599999999976717,
          "domP50": 11.5,
          "domP95": 23.599999999976717
        },
        "setKeys": {
          "emitP50": 12,
          "emitP95": 16.20000000001164,
          "domP50": 12.399999999965075,
          "domP95": 17.099999999976717
        },
        "replace": {
          "emitP50": 13.799999999988358,
          "emitP95": 24,
          "domP50": 14.200000000011642,
          "domP95": 24.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.200000000011642,
          "lagP95": 18.600000000034925,
          "endLag": 8.899999999965075,
          "maxBacklog": 2
        },
        "heapMb": 9.937816619873047,
        "heapCode": 3.0794219970703125,
        "heapData": 6.260341644287109,
        "pssTotalMb": 248.0302734375,
        "pssApp": 140.2822265625,
        "pssRenderer": 107.748046875,
        "control": {
          "emitP50": 7.099999999976717,
          "emitP95": 18.5,
          "domP50": 7.7999999999883585,
          "domP95": 18.899999999965075
        },
        "fCommitP50": 4.100000000034925,
        "fCommitP95": 7.2999999999883585
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9,
        "emitP95": 19.29999999998836,
        "domP50": 9.699999999953434,
        "domP95": 20.29999999998836
      },
      "edit_d4": {
        "emitP50": 7.2999999999883585,
        "emitP95": 19.599999999976717,
        "domP50": 7.900000000023283,
        "domP95": 20.5
      },
      "edit_d10": {
        "emitP50": 8.100000000034925,
        "emitP95": 14.600000000034925,
        "domP50": 8.5,
        "domP95": 15
      },
      "loadCycle": {
        "emitP50": 16.599999999976717,
        "emitP95": 53.20000000001164,
        "domP50": 16.70000000001164,
        "domP95": 54
      },
      "step": {
        "emitP50": 9,
        "emitP95": 30,
        "domP50": 9.299999999988358,
        "domP95": 30.399999999965075
      },
      "reset": {
        "emitP50": 21.70000000001164,
        "emitP95": 65.70000000001164,
        "domP50": 21.79999999998836,
        "domP95": 65.70000000001164
      },
      "append100": {
        "emitP50": 12.300000000046566,
        "emitP95": 24.899999999965075,
        "domP50": 12.799999999988358,
        "domP95": 25.29999999998836
      },
      "control": {
        "emitP50": 7.399999999965075,
        "emitP95": 29.600000000034925,
        "domP50": 7.600000000034925,
        "domP95": 29.900000000023283
      },
      "heapMb": 5.499309539794922,
      "heapCode": 3.178974151611328,
      "heapData": 1.8725547790527344,
      "pssTotalMb": 238.6982421875,
      "pssApp": 134.9951171875,
      "pssRenderer": 103.703125,
      "relaunchReadyMs": 1815.7000000000116,
      "relaunchHeapMb": 4.456943511962891,
      "relaunchHeapCode": 2.2242813110351562,
      "relaunchHeapData": 1.8570594787597656
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.5,
          "emitP95": 24.5,
          "domP50": 9.800000000046566,
          "domP95": 25
        },
        "setKeys": {
          "emitP50": 10,
          "emitP95": 25.5,
          "domP50": 10.599999999976717,
          "domP95": 25.70000000001164
        },
        "replace": {
          "emitP50": 8.200000000011642,
          "emitP95": 17.400000000023283,
          "domP50": 8.700000000011642,
          "domP95": 17.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 12.099999999976717,
          "endLag": 4.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.063007354736328,
        "heapCode": 3.0074195861816406,
        "heapData": 1.6155357360839844,
        "pssTotalMb": 233.6337890625,
        "pssApp": 131.8671875,
        "pssRenderer": 101.7666015625,
        "control": {
          "emitP50": 7.5,
          "emitP95": 18.79999999998836,
          "domP50": 7.699999999953434,
          "domP95": 19.100000000034925
        },
        "fCommitP50": 3.6000000000349246,
        "fCommitP95": 12
      },
      "500": {
        "setKey": {
          "emitP50": 11.200000000011642,
          "emitP95": 17.79999999998836,
          "domP50": 11.600000000034925,
          "domP95": 18.29999999998836
        },
        "setKeys": {
          "emitP50": 11.599999999976717,
          "emitP95": 33.199999999953434,
          "domP50": 12.099999999976717,
          "domP95": 35.199999999953434
        },
        "replace": {
          "emitP50": 11.400000000023283,
          "emitP95": 19.5,
          "domP50": 11.799999999988358,
          "domP95": 20.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.400000000023283,
          "lagP95": 20.5,
          "endLag": 6.2999999999883585,
          "maxBacklog": 2
        },
        "heapMb": 5.549930572509766,
        "heapCode": 3.0259475708007812,
        "heapData": 2.068309783935547,
        "pssTotalMb": 233.4736328125,
        "pssApp": 131.2236328125,
        "pssRenderer": 102.25,
        "control": {
          "emitP50": 7.900000000023283,
          "emitP95": 17.5,
          "domP50": 8.100000000034925,
          "domP95": 18.099999999976717
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 13.5
      },
      "5000": {
        "setKey": {
          "emitP50": 11.400000000023283,
          "emitP95": 23.699999999953434,
          "domP50": 12.29999999993015,
          "domP95": 24
        },
        "setKeys": {
          "emitP50": 10.800000000046566,
          "emitP95": 34.5,
          "domP50": 11.699999999953434,
          "domP95": 34.89999999990687
        },
        "replace": {
          "emitP50": 13.099999999976717,
          "emitP95": 23.70000000006985,
          "domP50": 13.699999999953434,
          "domP95": 24.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 10.400000000023283,
          "lagP95": 18.600000000093132,
          "endLag": 16.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.933151245117188,
        "heapCode": 3.0753402709960938,
        "heapData": 6.260234832763672,
        "pssTotalMb": 246.767578125,
        "pssApp": 138.80078125,
        "pssRenderer": 107.966796875,
        "control": {
          "emitP50": 8.099999999976717,
          "emitP95": 13.099999999976717,
          "domP50": 8.400000000023283,
          "domP95": 13.5
        },
        "fCommitP50": 3.700000000069849,
        "fCommitP95": 8.900000000023283
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.79999999993015,
        "emitP95": 21.900000000023283,
        "domP50": 10.699999999953434,
        "domP95": 22.600000000093132
      },
      "edit_d4": {
        "emitP50": 13,
        "emitP95": 19.300000000046566,
        "domP50": 13.399999999906868,
        "domP95": 19.699999999953434
      },
      "edit_d10": {
        "emitP50": 8.29999999993015,
        "emitP95": 18.800000000046566,
        "domP50": 8.79999999993015,
        "domP95": 19.300000000046566
      },
      "loadCycle": {
        "emitP50": 18.900000000023283,
        "emitP95": 65.09999999997672,
        "domP50": 19,
        "domP95": 65.5
      },
      "step": {
        "emitP50": 8.400000000023283,
        "emitP95": 25,
        "domP50": 8.600000000093132,
        "domP95": 25.29999999993015
      },
      "reset": {
        "emitP50": 24.70000000006985,
        "emitP95": 38.300000000046566,
        "domP50": 24.70000000006985,
        "domP95": 38.300000000046566
      },
      "append100": {
        "emitP50": 13.899999999906868,
        "emitP95": 32.09999999997672,
        "domP50": 14.199999999953434,
        "domP95": 32.39999999990687
      },
      "control": {
        "emitP50": 8.5,
        "emitP95": 14.400000000023283,
        "domP50": 8.699999999953434,
        "domP95": 14.600000000093132
      },
      "heapMb": 5.4917144775390625,
      "heapCode": 3.1722068786621094,
      "heapData": 1.8718414306640625,
      "pssTotalMb": 238.7265625,
      "pssApp": 135.0400390625,
      "pssRenderer": 103.6865234375,
      "relaunchReadyMs": 414.79999999993015,
      "relaunchHeapMb": 4.525112152099609,
      "relaunchHeapCode": 2.3164710998535156,
      "relaunchHeapData": 1.8303413391113281
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5999999999767169,
          "domP50": 5.700000000069849,
          "domP95": 6.599999999976717
        },
        "setKeys": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.6999999999534339,
          "domP50": 5.5,
          "domP95": 9.699999999953434
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 11,
          "domP50": 5,
          "domP95": 12.100000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.7209854125976562,
        "heapCode": 1.8415069580078125,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 221.857421875,
        "pssApp": 126.1064453125,
        "pssRenderer": 95.7509765625
      },
      "500": {
        "setKey": {
          "emitP50": 0.6000000000931323,
          "emitP95": 2.599999999976717,
          "domP50": 5.900000000023283,
          "domP95": 8.699999999953434
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 0.9000000000232831,
          "domP50": 1.5,
          "domP95": 12.099999999976717
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1.2000000000698492,
          "domP50": 2,
          "domP95": 7.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 0.6999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 4.1359100341796875,
        "heapCode": 1.8527717590332031,
        "heapData": 1.8948211669921875,
        "pssTotalMb": 225.9658203125,
        "pssApp": 126.3564453125,
        "pssRenderer": 99.609375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.3000000000465661,
          "emitP95": 1.7999999999301508,
          "domP50": 6.900000000023283,
          "domP95": 8.099999999976717
        },
        "setKeys": {
          "emitP50": 1.7000000000698492,
          "emitP95": 5.899999999906868,
          "domP50": 5.100000000093132,
          "domP95": 9.699999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.400000000023283,
          "domP50": 2.800000000046566,
          "domP95": 15
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.099999999976717,
          "endLag": 1.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 8.099468231201172,
        "heapCode": 1.8477516174316406,
        "heapData": 5.725063323974609,
        "pssTotalMb": 228.107421875,
        "pssApp": 123.5048828125,
        "pssRenderer": 104.6025390625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 3,
        "domP95": 8.600000000093132
      },
      "edit_d4": {
        "emitP50": 0.5,
        "emitP95": 1.400000000023283,
        "domP50": 1.099999999976717,
        "domP95": 13.699999999953434
      },
      "edit_d10": {
        "emitP50": 0.5999999999767169,
        "emitP95": 1.400000000023283,
        "domP50": 1.400000000023283,
        "domP95": 8.099999999976717
      },
      "loadCycle": {
        "emitP50": 13.29999999993015,
        "emitP95": 33.60000000009313,
        "domP50": 14.5,
        "domP95": 34
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 3.900000000023283,
        "domP50": 1,
        "domP95": 7.600000000093132
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 0.30000000004656613,
        "domP95": 1.3000000000465661
      },
      "append100": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.5,
        "domP50": 1.099999999976717,
        "domP95": 10.29999999993015
      },
      "heapMb": 3.9348831176757812,
      "heapCode": 1.9231986999511719,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 222.990234375,
      "pssApp": 125.9375,
      "pssRenderer": 97.052734375,
      "relaunchReadyMs": 1581.5999999999767,
      "relaunchHeapMb": 3.351970672607422,
      "relaunchHeapCode": 1.5398368835449219,
      "relaunchHeapData": 1.4465255737304688
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 2.5,
          "domP50": 1.8000000000465661,
          "domP95": 6.900000000023283
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.5999999999767169,
          "domP50": 1.1999999999534339,
          "domP95": 6.399999999906868
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7999999999301508,
          "domP50": 4.900000000023283,
          "domP95": 12.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.6999999999534339,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.7241744995117188,
        "heapCode": 1.8444480895996094,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.5400390625,
        "pssApp": 127.6650390625,
        "pssRenderer": 96.875
      },
      "500": {
        "setKey": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.5999999999767169,
          "domP50": 5.599999999976717,
          "domP95": 7.099999999976717
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6999999999534339,
          "domP50": 1.8000000000465661,
          "domP95": 7
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.6000000000931323,
          "domP50": 1.1000000000931323,
          "domP95": 10.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.9000000000232831,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.136447906494141,
        "heapCode": 1.8534393310546875,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 228.5341796875,
        "pssApp": 128.0947265625,
        "pssRenderer": 100.439453125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6999999999534339,
          "emitP95": 4.900000000023283,
          "domP50": 3.199999999953434,
          "domP95": 11
        },
        "setKeys": {
          "emitP50": 1.6999999999534339,
          "emitP95": 11.70000000006985,
          "domP50": 3.699999999953434,
          "domP95": 16.099999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 7.099999999976717,
          "domP50": 2.5,
          "domP95": 8.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 7.099999999976717,
          "endLag": 1.5,
          "maxBacklog": 0
        },
        "heapMb": 8.099235534667969,
        "heapCode": 1.8476600646972656,
        "heapData": 5.725063323974609,
        "pssTotalMb": 232.2080078125,
        "pssApp": 126.919921875,
        "pssRenderer": 105.2880859375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.400000000023283,
        "domP50": 2.300000000046566,
        "domP95": 8.400000000023283
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.599999999976717,
        "domP50": 5.700000000069849,
        "domP95": 9
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.8000000000465661,
        "domP50": 2.300000000046566,
        "domP95": 7.900000000023283
      },
      "loadCycle": {
        "emitP50": 13.599999999976717,
        "emitP95": 33.20000000006985,
        "domP50": 13.899999999906868,
        "domP95": 33.60000000009313
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.8000000000465661,
        "domP50": 4.099999999976717,
        "domP95": 8
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 0.6999999999534339,
        "domP50": 0.19999999995343387,
        "domP95": 1.400000000023283
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 0.8000000000465661,
        "domP95": 2.700000000069849
      },
      "heapMb": 3.934101104736328,
      "heapCode": 1.9224472045898438,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 225.9853515625,
      "pssApp": 128.02734375,
      "pssRenderer": 97.9580078125,
      "relaunchReadyMs": 1346.5,
      "relaunchHeapMb": 3.5225181579589844,
      "relaunchHeapCode": 1.7060623168945312,
      "relaunchHeapData": 1.4481925964355469
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 14.199999999953434,
          "emitP95": 33.20000000006985,
          "domP50": 14.599999999976717,
          "domP95": 33.59999999997672
        },
        "setKeys": {
          "emitP50": 10.800000000046566,
          "emitP95": 32.39999999990687,
          "domP50": 11.100000000093132,
          "domP95": 33.29999999993015
        },
        "replace": {
          "emitP50": 13,
          "emitP95": 26.199999999953434,
          "domP50": 13.400000000023283,
          "domP95": 26.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 11.199999999953434,
          "lagP95": 60.79999999993015,
          "endLag": 8.099999999976717,
          "maxBacklog": 3
        },
        "heapMb": 5.053668975830078,
        "heapCode": 2.9988174438476562,
        "heapData": 1.6156044006347656,
        "pssTotalMb": 235.77734375,
        "pssApp": 133.2783203125,
        "pssRenderer": 102.4990234375,
        "control": {
          "emitP50": 10.5,
          "emitP95": 24.199999999953434,
          "domP50": 10.800000000046566,
          "domP95": 24.899999999906868
        },
        "fCommitP50": 4.799999999930151,
        "fCommitP95": 7.5
      },
      "500": {
        "setKey": {
          "emitP50": 9.900000000023283,
          "emitP95": 16.5,
          "domP50": 10.800000000046566,
          "domP95": 17
        },
        "setKeys": {
          "emitP50": 7.699999999953434,
          "emitP95": 24.199999999953434,
          "domP50": 8.199999999953434,
          "domP95": 24.599999999976717
        },
        "replace": {
          "emitP50": 10.199999999953434,
          "emitP95": 22.199999999953434,
          "domP50": 10.599999999976717,
          "domP95": 22.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7,
          "lagP95": 17.099999999976717,
          "endLag": 6.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.554515838623047,
        "heapCode": 3.0297813415527344,
        "heapData": 2.068622589111328,
        "pssTotalMb": 235.923828125,
        "pssApp": 133.0703125,
        "pssRenderer": 102.853515625,
        "control": {
          "emitP50": 6.599999999976717,
          "emitP95": 17,
          "domP50": 7.199999999953434,
          "domP95": 17.29999999993015
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 8.800000000046566
      },
      "5000": {
        "setKey": {
          "emitP50": 12.5,
          "emitP95": 20.300000000046566,
          "domP50": 12.899999999906868,
          "domP95": 20.70000000006985
        },
        "setKeys": {
          "emitP50": 12.29999999993015,
          "emitP95": 18.199999999953434,
          "domP50": 13,
          "domP95": 18.899999999906868
        },
        "replace": {
          "emitP50": 13.600000000093132,
          "emitP95": 24.599999999976717,
          "domP50": 13.900000000023283,
          "domP95": 25
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.29999999993015,
          "lagP95": 17,
          "endLag": 11.699999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.930007934570312,
        "heapCode": 3.0719375610351562,
        "heapData": 6.260341644287109,
        "pssTotalMb": 250.33984375,
        "pssApp": 141.63671875,
        "pssRenderer": 108.703125,
        "control": {
          "emitP50": 6.600000000093132,
          "emitP95": 25,
          "domP50": 6.900000000023283,
          "domP95": 25.300000000046566
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 12.70000000006985
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.79999999993015,
        "emitP95": 19.800000000046566,
        "domP50": 10.099999999976717,
        "domP95": 20.20000000006985
      },
      "edit_d4": {
        "emitP50": 8.5,
        "emitP95": 23.5,
        "domP50": 9.20000000006985,
        "domP95": 23.900000000023283
      },
      "edit_d10": {
        "emitP50": 8.800000000046566,
        "emitP95": 18.79999999993015,
        "domP50": 10.400000000023283,
        "domP95": 19.199999999953434
      },
      "loadCycle": {
        "emitP50": 14.70000000006985,
        "emitP95": 59.20000000006985,
        "domP50": 14.800000000046566,
        "domP95": 59.5
      },
      "step": {
        "emitP50": 8,
        "emitP95": 19.5,
        "domP50": 8.600000000093132,
        "domP95": 19.800000000046566
      },
      "reset": {
        "emitP50": 29,
        "emitP95": 50,
        "domP50": 29.099999999976717,
        "domP95": 50
      },
      "append100": {
        "emitP50": 12.900000000023283,
        "emitP95": 19.599999999976717,
        "domP50": 13.199999999953434,
        "domP95": 19.900000000023283
      },
      "control": {
        "emitP50": 7.199999999953434,
        "emitP95": 17.5,
        "domP50": 7.5,
        "domP95": 19.900000000023283
      },
      "heapMb": 5.484062194824219,
      "heapCode": 3.1690940856933594,
      "heapData": 1.8674240112304688,
      "pssTotalMb": 240.619140625,
      "pssApp": 136.12109375,
      "pssRenderer": 104.498046875,
      "relaunchReadyMs": 415.19999999995343,
      "relaunchHeapMb": 4.524181365966797,
      "relaunchHeapCode": 2.3163719177246094,
      "relaunchHeapData": 1.8296241760253906
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.900000000023283,
          "emitP95": 25.5,
          "domP50": 10.300000000046566,
          "domP95": 26
        },
        "setKeys": {
          "emitP50": 9.099999999976717,
          "emitP95": 22.599999999976717,
          "domP50": 10,
          "domP95": 26.400000000023283
        },
        "replace": {
          "emitP50": 8.599999999976717,
          "emitP95": 20.199999999953434,
          "domP50": 9.29999999993015,
          "domP95": 20.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.099999999976717,
          "lagP95": 18.5,
          "endLag": 5.399999999906868,
          "maxBacklog": 3
        },
        "heapMb": 5.053886413574219,
        "heapCode": 2.9986953735351562,
        "heapData": 1.6158676147460938,
        "pssTotalMb": 235.423828125,
        "pssApp": 132.861328125,
        "pssRenderer": 102.5625,
        "control": {
          "emitP50": 6.399999999906868,
          "emitP95": 17.899999999906868,
          "domP50": 6.899999999906868,
          "domP95": 19
        },
        "fCommitP50": 3.799999999930151,
        "fCommitP95": 12.599999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 9.5,
          "emitP95": 28.800000000046566,
          "domP50": 10.199999999953434,
          "domP95": 29.400000000023283
        },
        "setKeys": {
          "emitP50": 10.699999999953434,
          "emitP95": 22.800000000046566,
          "domP50": 11,
          "domP95": 23.20000000006985
        },
        "replace": {
          "emitP50": 11.900000000023283,
          "emitP95": 20,
          "domP50": 12.400000000023283,
          "domP95": 21.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 14.900000000023283,
          "endLag": 8.099999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.5529632568359375,
        "heapCode": 3.028514862060547,
        "heapData": 2.0683135986328125,
        "pssTotalMb": 235.8935546875,
        "pssApp": 132.5810546875,
        "pssRenderer": 103.3125,
        "control": {
          "emitP50": 6.699999999953434,
          "emitP95": 15.399999999906868,
          "domP50": 8.800000000046566,
          "domP95": 15.599999999976717
        },
        "fCommitP50": 3.8999999999068677,
        "fCommitP95": 7.600000000093132
      },
      "5000": {
        "setKey": {
          "emitP50": 11.900000000023283,
          "emitP95": 20.599999999976717,
          "domP50": 12.70000000006985,
          "domP95": 21.599999999976717
        },
        "setKeys": {
          "emitP50": 11.699999999953434,
          "emitP95": 19.300000000046566,
          "domP50": 12.399999999906868,
          "domP95": 19.5
        },
        "replace": {
          "emitP50": 13.5,
          "emitP95": 21.100000000093132,
          "domP50": 14.199999999953434,
          "domP95": 22.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.899999999906868,
          "lagP95": 20.300000000046566,
          "endLag": 9.300000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.938484191894531,
        "heapCode": 3.0796890258789062,
        "heapData": 6.260517120361328,
        "pssTotalMb": 250.2333984375,
        "pssApp": 141.548828125,
        "pssRenderer": 108.6845703125,
        "control": {
          "emitP50": 6.300000000046566,
          "emitP95": 18.70000000006985,
          "domP50": 6.699999999953434,
          "domP95": 19.099999999976717
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 12.199999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.599999999976717,
        "emitP95": 19,
        "domP50": 9.900000000023283,
        "domP95": 20.199999999953434
      },
      "edit_d4": {
        "emitP50": 10.400000000023283,
        "emitP95": 22.400000000023283,
        "domP50": 11.099999999976717,
        "domP95": 22.800000000046566
      },
      "edit_d10": {
        "emitP50": 10.399999999906868,
        "emitP95": 17.79999999993015,
        "domP50": 10.899999999906868,
        "domP95": 18.599999999976717
      },
      "loadCycle": {
        "emitP50": 15.800000000046566,
        "emitP95": 50.09999999997672,
        "domP50": 16.20000000006985,
        "domP95": 50.40000000002328
      },
      "step": {
        "emitP50": 10.199999999953434,
        "emitP95": 28.100000000093132,
        "domP50": 11,
        "domP95": 28.400000000023283
      },
      "reset": {
        "emitP50": 29.599999999976717,
        "emitP95": 38.39999999990687,
        "domP50": 29.79999999993015,
        "domP95": 38.39999999990687
      },
      "append100": {
        "emitP50": 16.599999999976717,
        "emitP95": 21.900000000023283,
        "domP50": 17.400000000023283,
        "domP95": 22.300000000046566
      },
      "control": {
        "emitP50": 7,
        "emitP95": 21.400000000023283,
        "domP50": 7.399999999906868,
        "domP95": 21.900000000023283
      },
      "heapMb": 5.497154235839844,
      "heapCode": 3.1749343872070312,
      "heapData": 1.8744697570800781,
      "pssTotalMb": 240.392578125,
      "pssApp": 135.685546875,
      "pssRenderer": 104.70703125,
      "relaunchReadyMs": 904.5,
      "relaunchHeapMb": 4.26214599609375,
      "relaunchHeapCode": 2.121654510498047,
      "relaunchHeapData": 1.7647018432617188
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
          "domP50": 5.5,
          "domP95": 7
        },
        "setKeys": {
          "emitP50": 0.2999999999301508,
          "emitP95": 2.6000000000931323,
          "domP50": 5,
          "domP95": 7
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7999999999301508,
          "domP50": 1.599999999976717,
          "domP95": 9.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.9000000000232831,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.723907470703125,
        "heapCode": 1.8441352844238281,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.5654296875,
        "pssApp": 127.8916015625,
        "pssRenderer": 96.673828125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.6999999999534339,
          "domP50": 2.200000000069849,
          "domP95": 12.599999999976717
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1,
          "domP50": 1.3000000000465661,
          "domP95": 12.400000000023283
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.7999999999301508,
          "domP50": 1.1999999999534339,
          "domP95": 7.100000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8000000000465661,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 4.132469177246094,
        "heapCode": 1.8495712280273438,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 228.3212890625,
        "pssApp": 127.943359375,
        "pssRenderer": 100.3779296875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.5,
          "emitP95": 2.900000000023283,
          "domP50": 2.800000000046566,
          "domP95": 7.299999999930151
        },
        "setKeys": {
          "emitP50": 1.6999999999534339,
          "emitP95": 2.099999999976717,
          "domP50": 2.900000000023283,
          "domP95": 11.20000000006985
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.299999999930151,
          "domP50": 1.6000000000931323,
          "domP95": 8.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.3999999999068677,
          "endLag": 1.1999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 8.096900939941406,
        "heapCode": 1.8453483581542969,
        "heapData": 5.725063323974609,
        "pssTotalMb": 232.345703125,
        "pssApp": 127.0986328125,
        "pssRenderer": 105.2470703125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.6000000000931323,
        "domP50": 2.300000000046566,
        "domP95": 9.400000000023283
      },
      "edit_d4": {
        "emitP50": 0.5,
        "emitP95": 1.2999999999301508,
        "domP50": 1.3999999999068677,
        "domP95": 9.100000000093132
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.5,
        "domP50": 1.5,
        "domP95": 8.099999999976717
      },
      "loadCycle": {
        "emitP50": 14.199999999953434,
        "emitP95": 32.699999999953434,
        "domP50": 15.70000000006985,
        "domP95": 33.300000000046566
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 1.5,
        "domP50": 1.7999999999301508,
        "domP95": 9.199999999953434
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.30000000004656613,
        "domP50": 0.2000000000698492,
        "domP95": 1
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7999999999301508,
        "domP50": 0.7999999999301508,
        "domP95": 6.099999999976717
      },
      "heapMb": 3.936267852783203,
      "heapCode": 1.924530029296875,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.0009765625,
      "pssApp": 127.98828125,
      "pssRenderer": 98.0126953125,
      "relaunchReadyMs": 1571.2000000000698,
      "relaunchHeapMb": 3.351520538330078,
      "relaunchHeapCode": 1.5399055480957031,
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
          "emitP95": 4.100000000093132,
          "domP50": 5.099999999976717,
          "domP95": 9.20000000006985
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.9000000000232831,
          "domP50": 5.599999999976717,
          "domP95": 8.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.900000000023283,
          "domP50": 1.1999999999534339,
          "domP95": 10.100000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.7000000000698492,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.7241592407226562,
        "heapCode": 1.8444633483886719,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.0498046875,
        "pssApp": 127.2607421875,
        "pssRenderer": 96.7890625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 2.700000000069849,
          "domP50": 4.599999999976717,
          "domP95": 6.800000000046566
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.5,
          "domP50": 1.900000000023283,
          "domP95": 10.20000000006985
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1,
          "domP50": 1.1999999999534339,
          "domP95": 8.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1.7000000000698492,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.872833251953125,
        "heapCode": 1.6033096313476562,
        "heapData": 1.8890113830566406,
        "pssTotalMb": 224.5458984375,
        "pssApp": 125.5615234375,
        "pssRenderer": 98.984375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.900000000023283,
          "emitP95": 6,
          "domP50": 3.799999999930151,
          "domP95": 11.100000000093132
        },
        "setKeys": {
          "emitP50": 1.6999999999534339,
          "emitP95": 5.800000000046566,
          "domP50": 3.300000000046566,
          "domP95": 13
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 2.6000000000931323,
          "domP50": 1.900000000023283,
          "domP95": 10
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.599999999976717,
          "lagP95": 2.099999999976717,
          "endLag": 1.6999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 8.095623016357422,
        "heapCode": 1.8441123962402344,
        "heapData": 5.725063323974609,
        "pssTotalMb": 232.880859375,
        "pssApp": 127.697265625,
        "pssRenderer": 105.18359375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 3,
        "domP95": 6.799999999930151
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.2000000000698492,
        "domP50": 3.099999999976717,
        "domP95": 7.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 4.299999999930151,
        "domP50": 2.199999999953434,
        "domP95": 10.79999999993015
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33.29999999993015,
        "domP50": 0.9000000000232831,
        "domP95": 33.699999999953434
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.8000000000465661,
        "domP50": 1.5,
        "domP95": 8.29999999993015
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.5999999999767169,
        "domP50": 0.2999999999301508,
        "domP95": 3
      },
      "append100": {
        "emitP50": 0.39999999990686774,
        "emitP95": 1.3000000000465661,
        "domP50": 1.1999999999534339,
        "domP95": 6.799999999930151
      },
      "heapMb": 3.9342575073242188,
      "heapCode": 1.9225921630859375,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 225.685546875,
      "pssApp": 128.0380859375,
      "pssRenderer": 97.6474609375,
      "relaunchReadyMs": 1855.4000000000233,
      "relaunchHeapMb": 3.5223770141601562,
      "relaunchHeapCode": 1.7047767639160156,
      "relaunchHeapData": 1.4494781494140625
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.79999999993015,
          "emitP95": 19.900000000023283,
          "domP50": 10.70000000006985,
          "domP95": 20.300000000046566
        },
        "setKeys": {
          "emitP50": 8.800000000046566,
          "emitP95": 17.5,
          "domP50": 9.29999999993015,
          "domP95": 18
        },
        "replace": {
          "emitP50": 8.5,
          "emitP95": 28.5,
          "domP50": 9.699999999953434,
          "domP95": 28.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.300000000046566,
          "lagP95": 18.29999999993015,
          "endLag": 6.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 5.053466796875,
        "heapCode": 2.998615264892578,
        "heapData": 1.6156044006347656,
        "pssTotalMb": 236.0595703125,
        "pssApp": 133.32421875,
        "pssRenderer": 102.7353515625,
        "control": {
          "emitP50": 6.800000000046566,
          "emitP95": 18.29999999993015,
          "domP50": 7.100000000093132,
          "domP95": 18.699999999953434
        },
        "fCommitP50": 4,
        "fCommitP95": 7.5
      },
      "500": {
        "setKey": {
          "emitP50": 11.29999999993015,
          "emitP95": 31.400000000023283,
          "domP50": 11.699999999953434,
          "domP95": 31.900000000023283
        },
        "setKeys": {
          "emitP50": 10.5,
          "emitP95": 19.900000000023283,
          "domP50": 11.199999999953434,
          "domP95": 20.400000000023283
        },
        "replace": {
          "emitP50": 10.79999999993015,
          "emitP95": 20,
          "domP50": 11.199999999953434,
          "domP95": 20.600000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.599999999976717,
          "lagP95": 25.300000000046566,
          "endLag": 6.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.545001983642578,
        "heapCode": 3.0211143493652344,
        "heapData": 2.0683135986328125,
        "pssTotalMb": 234.7822265625,
        "pssApp": 131.46875,
        "pssRenderer": 103.3134765625,
        "control": {
          "emitP50": 7.199999999953434,
          "emitP95": 18.70000000006985,
          "domP50": 7.399999999906868,
          "domP95": 18.900000000023283
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 9.5
      },
      "5000": {
        "setKey": {
          "emitP50": 12.900000000023283,
          "emitP95": 21.099999999976717,
          "domP50": 13.5,
          "domP95": 21.699999999953434
        },
        "setKeys": {
          "emitP50": 10.79999999993015,
          "emitP95": 21.599999999976717,
          "domP50": 11.099999999976717,
          "domP95": 22.199999999953434
        },
        "replace": {
          "emitP50": 13.099999999976717,
          "emitP95": 22.399999999906868,
          "domP50": 13.400000000023283,
          "domP95": 23.399999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.199999999953434,
          "lagP95": 24.100000000093132,
          "endLag": 12.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.930961608886719,
        "heapCode": 3.0731124877929688,
        "heapData": 6.260219573974609,
        "pssTotalMb": 249.0283203125,
        "pssApp": 140.140625,
        "pssRenderer": 108.8876953125,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 17.300000000046566,
          "domP50": 6.699999999953434,
          "domP95": 17.600000000093132
        },
        "fCommitP50": 3.799999999930151,
        "fCommitP95": 9.79999999993015
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.5,
        "emitP95": 18.300000000046566,
        "domP50": 10.20000000006985,
        "domP95": 18.800000000046566
      },
      "edit_d4": {
        "emitP50": 7.900000000023283,
        "emitP95": 17.599999999976717,
        "domP50": 8.599999999976717,
        "domP95": 18.099999999976717
      },
      "edit_d10": {
        "emitP50": 7.700000000069849,
        "emitP95": 23.5,
        "domP50": 8.899999999906868,
        "domP95": 23.900000000023283
      },
      "loadCycle": {
        "emitP50": 18.400000000023283,
        "emitP95": 56.5,
        "domP50": 18.400000000023283,
        "domP95": 56.79999999993015
      },
      "step": {
        "emitP50": 8.5,
        "emitP95": 21.399999999906868,
        "domP50": 9.199999999953434,
        "domP95": 21.79999999993015
      },
      "reset": {
        "emitP50": 29.099999999976717,
        "emitP95": 73,
        "domP50": 29.099999999976717,
        "domP95": 73.79999999993015
      },
      "append100": {
        "emitP50": 16.300000000046566,
        "emitP95": 21.400000000023283,
        "domP50": 16.70000000006985,
        "domP95": 21.800000000046566
      },
      "control": {
        "emitP50": 6.800000000046566,
        "emitP95": 12.699999999953434,
        "domP50": 7.300000000046566,
        "domP95": 16.099999999976717
      },
      "heapMb": 5.485683441162109,
      "heapCode": 3.1705703735351562,
      "heapData": 1.867401123046875,
      "pssTotalMb": 241.0439453125,
      "pssApp": 136.5078125,
      "pssRenderer": 104.5361328125,
      "relaunchReadyMs": 408.89999999990687,
      "relaunchHeapMb": 4.468906402587891,
      "relaunchHeapCode": 2.322662353515625,
      "relaunchHeapData": 1.7681655883789062
    }
  }
]
```
</details>
