# Phase 16 shapes — flat objects & hybrid workflow (2026-10-27)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.15 ms, p95 9.74 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 55 / CODE-BOUND 0 / FAIL 30

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.36 ± 0.09 | 7.42 ± 0.83 | 20.6× | FAIL | allow 6.8 (control emitP50 5.9×1) |
| flat | 50.setKey.emitP95 | 1.04 ± 0.78 | 21.92 ± 5.57 | 21.1× | PLATFORM-BOUND | allow 21.6 (control emitP95 15.3×1) |
| flat | 50.setKey.domP50 | 4.02 ± 1.76 | 8.60 ± 1.13 | 2.1× | PLATFORM-BOUND | allow 9.1 (control domP50 6.2×1) |
| flat | 50.setKey.domP95 | 8.84 ± 2.42 | 22.58 ± 5.60 | 2.6× | PLATFORM-BOUND | allow 24.4 (control domP95 16.4×1) |
| flat | 50.setKeys.emitP50 | 0.38 ± 0.04 | 7.38 ± 0.57 | 19.4× | FAIL | allow 6.5 (control emitP50 5.9×1) |
| flat | 50.setKeys.emitP95 | 2.66 ± 2.28 | 22.12 ± 4.11 | 8.3× | PLATFORM-BOUND | allow 21.7 (control emitP95 15.3×1) |
| flat | 50.setKeys.domP50 | 2.06 ± 1.70 | 8.42 ± 0.67 | 4.1× | PLATFORM-BOUND | allow 8.5 (control domP50 6.2×1) |
| flat | 50.setKeys.domP95 | 9.42 ± 2.54 | 22.68 ± 4.16 | 2.4× | PLATFORM-BOUND | allow 23.1 (control domP95 16.4×1) |
| flat | 50.replace.emitP50 | 0.34 ± 0.05 | 7.02 ± 0.67 | 20.6× | FAIL | allow 6.6 (control emitP50 5.9×1) |
| flat | 50.replace.emitP95 | 2.44 ± 1.20 | 17.32 ± 3.33 | 7.1× | PLATFORM-BOUND | allow 19.8 (control emitP95 15.3×1) |
| flat | 50.replace.domP50 | 2.10 ± 1.67 | 7.88 ± 1.00 | 3.8× | PLATFORM-BOUND | allow 8.8 (control domP50 6.2×1) |
| flat | 50.replace.domP95 | 10.24 ± 3.77 | 18.10 ± 2.85 | 1.8× | PLATFORM-BOUND | allow 23.0 (control domP95 16.4×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 6.08 ± 0.51 | 20.3× | PLATFORM-BOUND | allow 6.4 (control emitP50 5.9×1) |
| flat | 50.burst.lagP95 | 0.52 ± 0.04 | 14.92 ± 1.58 | 28.7× | PLATFORM-BOUND | allow 16.9 (control emitP95 15.3×1) |
| flat | 50.burst.endLag | 0.34 ± 0.05 | 10.30 ± 6.44 | 30.3× | PLATFORM-BOUND | allow 12.4 (control emitP50 5.9×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.20 ± 0.45 | 2200000000.0× | FAIL |  |
| flat | 50.heapMb | 3.69 ± 0.07 | 5.08 ± 0.00 | 1.4× | FAIL | code +1.21 MB; data 1.50 -> 1.61 MB |
| flat | 50.pssTotalMb | 225.10 ± 2.54 | 237.29 ± 1.44 | 1.1× | FAIL | allow 9.4 (plugin baseline 5.4 MB) |
| flat | 500.setKey.emitP50 | 0.48 ± 0.11 | 8.02 ± 0.51 | 16.7× | FAIL | allow 6.3 (control emitP50 5.7×1) |
| flat | 500.setKey.emitP95 | 1.88 ± 1.53 | 19.88 ± 5.80 | 10.6× | PLATFORM-BOUND | allow 24.1 (control emitP95 16.7×1) |
| flat | 500.setKey.domP50 | 3.46 ± 1.35 | 8.72 ± 0.47 | 2.5× | PLATFORM-BOUND | allow 7.8 (control domP50 5.9×1) |
| flat | 500.setKey.domP95 | 8.02 ± 1.06 | 20.40 ± 5.77 | 2.5× | PLATFORM-BOUND | allow 23.8 (control domP95 17.0×1) |
| flat | 500.setKeys.emitP50 | 0.48 ± 0.04 | 7.94 ± 0.74 | 16.5× | FAIL | allow 6.4 (control emitP50 5.7×1) |
| flat | 500.setKeys.emitP95 | 2.40 ± 0.75 | 20.76 ± 4.85 | 8.7× | PLATFORM-BOUND | allow 22.3 (control emitP95 16.7×1) |
| flat | 500.setKeys.domP50 | 2.28 ± 1.73 | 8.50 ± 0.75 | 3.7× | PLATFORM-BOUND | allow 8.4 (control domP50 5.9×1) |
| flat | 500.setKeys.domP95 | 8.92 ± 3.51 | 21.32 ± 4.72 | 2.4× | PLATFORM-BOUND | allow 25.2 (control domP95 17.0×1) |
| flat | 500.replace.emitP50 | 0.30 ± 0.00 | 8.06 ± 0.34 | 26.9× | FAIL | allow 6.0 (control emitP50 5.7×1) |
| flat | 500.replace.emitP95 | 1.40 ± 0.83 | 20.90 ± 5.26 | 14.9× | PLATFORM-BOUND | allow 22.8 (control emitP95 16.7×1) |
| flat | 500.replace.domP50 | 1.20 ± 0.16 | 8.52 ± 0.31 | 7.1× | FAIL | allow 6.4 (control domP50 5.9×1) |
| flat | 500.replace.domP95 | 7.18 ± 1.12 | 21.72 ± 4.89 | 3.0× | PLATFORM-BOUND | allow 23.0 (control domP95 17.0×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 6.28 ± 0.30 | 15.7× | PLATFORM-BOUND | allow 6.0 (control emitP50 5.7×1) |
| flat | 500.burst.lagP95 | 0.64 ± 0.09 | 13.04 ± 2.37 | 20.4× | PLATFORM-BOUND | allow 19.2 (control emitP95 16.7×1) |
| flat | 500.burst.endLag | 0.40 ± 0.07 | 6.64 ± 0.99 | 16.6× | PLATFORM-BOUND | allow 6.7 (control emitP50 5.7×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 500.heapMb | 4.13 ± 0.00 | 5.57 ± 0.01 | 1.3× | FAIL | code +1.19 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 229.86 ± 1.64 | 238.35 ± 1.85 | 1.0× | PLATFORM-BOUND | allow 8.9 (plugin baseline 5.4 MB) |
| flat | 5000.setKey.emitP50 | 1.50 ± 0.23 | 9.74 ± 1.10 | 6.5× | FAIL | allow 7.6 (control emitP50 6.2×1) |
| flat | 5000.setKey.emitP95 | 4.24 ± 3.32 | 25.48 ± 6.61 | 6.0× | PLATFORM-BOUND | allow 28.1 (control emitP95 18.1×1) |
| flat | 5000.setKey.domP50 | 3.88 ± 1.55 | 11.00 ± 0.64 | 2.8× | PLATFORM-BOUND | allow 8.8 (control domP50 6.6×1) |
| flat | 5000.setKey.domP95 | 10.34 ± 1.77 | 26.90 ± 7.56 | 2.6× | PLATFORM-BOUND | allow 27.9 (control domP95 18.6×1) |
| flat | 5000.setKeys.emitP50 | 1.58 ± 0.11 | 9.84 ± 0.40 | 6.2× | FAIL | allow 6.8 (control emitP50 6.2×1) |
| flat | 5000.setKeys.emitP95 | 5.64 ± 3.55 | 19.28 ± 4.08 | 3.4× | PLATFORM-BOUND | allow 25.8 (control emitP95 18.1×1) |
| flat | 5000.setKeys.domP50 | 3.14 ± 0.65 | 10.44 ± 0.44 | 3.3× | PLATFORM-BOUND | allow 7.7 (control domP50 6.6×1) |
| flat | 5000.setKeys.domP95 | 10.94 ± 3.24 | 19.94 ± 3.75 | 1.8× | PLATFORM-BOUND | allow 25.6 (control domP95 18.6×1) |
| flat | 5000.replace.emitP50 | 0.36 ± 0.05 | 12.66 ± 0.34 | 35.2× | FAIL | allow 6.6 (control emitP50 6.2×1) |
| flat | 5000.replace.emitP95 | 2.88 ± 1.79 | 22.56 ± 4.07 | 7.8× | PLATFORM-BOUND | allow 24.0 (control emitP95 18.1×1) |
| flat | 5000.replace.domP50 | 1.82 ± 0.16 | 13.34 ± 0.56 | 7.3× | FAIL | allow 7.4 (control domP50 6.6×1) |
| flat | 5000.replace.domP95 | 11.64 ± 2.36 | 23.10 ± 4.04 | 2.0× | PLATFORM-BOUND | allow 25.0 (control domP95 18.6×1) |
| flat | 5000.burst.lagP50 | 1.30 ± 0.00 | 7.62 ± 0.29 | 5.9× | PLATFORM-BOUND | allow 6.5 (control emitP50 6.2×1) |
| flat | 5000.burst.lagP95 | 2.44 ± 0.55 | 13.88 ± 1.96 | 5.7× | PLATFORM-BOUND | allow 20.6 (control emitP95 18.1×1) |
| flat | 5000.burst.endLag | 1.24 ± 0.26 | 7.54 ± 0.78 | 6.1× | PLATFORM-BOUND | allow 7.3 (control emitP50 6.2×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.03 ± 0.09 | 9.95 ± 0.01 | 1.2× | FAIL | code +1.31 MB; data 5.72 -> 6.26 MB |
| flat | 5000.pssTotalMb | 233.56 ± 2.06 | 245.95 ± 0.99 | 1.1× | FAIL | allow 8.4 (plugin baseline 5.4 MB) |
| workflow | edit_d1.emitP50 | 0.32 ± 0.11 | 7.88 ± 0.67 | 24.6× | FAIL | allow 6.6 (control emitP50 5.8×1) |
| workflow | edit_d1.emitP95 | 2.38 ± 3.65 | 17.42 ± 3.80 | 7.3× | PLATFORM-BOUND | allow 27.7 (control emitP95 20.3×1) |
| workflow | edit_d1.domP50 | 4.52 ± 1.80 | 8.64 ± 0.74 | 1.9× | PLATFORM-BOUND | allow 8.9 (control domP50 6.4×1) |
| workflow | edit_d1.domP95 | 7.54 ± 1.34 | 18.40 ± 3.70 | 2.4× | PLATFORM-BOUND | allow 25.7 (control domP95 20.6×1) |
| workflow | edit_d4.emitP50 | 0.36 ± 0.05 | 7.84 ± 0.25 | 21.8× | FAIL | allow 6.1 (control emitP50 5.8×1) |
| workflow | edit_d4.emitP95 | 1.16 ± 0.77 | 15.68 ± 1.60 | 13.5× | PLATFORM-BOUND | allow 22.7 (control emitP95 20.3×1) |
| workflow | edit_d4.domP50 | 2.28 ± 1.38 | 8.28 ± 0.24 | 3.6× | PLATFORM-BOUND | allow 8.0 (control domP50 6.4×1) |
| workflow | edit_d4.domP95 | 7.88 ± 1.24 | 16.46 ± 1.40 | 2.1× | PLATFORM-BOUND | allow 23.3 (control domP95 20.6×1) |
| workflow | edit_d10.emitP50 | 0.42 ± 0.04 | 7.78 ± 0.54 | 18.5× | FAIL | allow 6.4 (control emitP50 5.8×1) |
| workflow | edit_d10.emitP95 | 0.88 ± 0.18 | 17.08 ± 3.01 | 19.4× | PLATFORM-BOUND | allow 23.5 (control emitP95 20.3×1) |
| workflow | edit_d10.domP50 | 1.50 ± 0.41 | 8.44 ± 0.48 | 5.6× | PLATFORM-BOUND | allow 7.3 (control domP50 6.4×1) |
| workflow | edit_d10.domP95 | 7.92 ± 1.39 | 17.82 ± 2.96 | 2.3× | PLATFORM-BOUND | allow 25.0 (control domP95 20.6×1) |
| workflow | loadCycle.emitP50 | 0.50 ± 0.07 | 15.06 ± 3.36 | 30.1× | PLATFORM-BOUND | allow 15.0 (control emitP50 5.8×2) |
| workflow | loadCycle.emitP95 | 33.58 ± 0.85 | 50.66 ± 3.33 | 1.5× | PLATFORM-BOUND | allow 44.8 (control emitP95 20.3×2) |
| workflow | loadCycle.domP50 | 0.78 ± 0.25 | 15.20 ± 3.36 | 19.5× | PLATFORM-BOUND | allow 16.4 (control domP50 6.4×2) |
| workflow | loadCycle.domP95 | 34.12 ± 0.81 | 51.16 ± 3.20 | 1.5× | PLATFORM-BOUND | allow 45.3 (control domP95 20.6×2) |
| workflow | step.emitP50 | 0.30 ± 0.00 | 7.14 ± 0.26 | 23.8× | FAIL | allow 6.1 (control emitP50 5.8×1) |
| workflow | step.emitP95 | 0.82 ± 0.29 | 16.08 ± 1.17 | 19.6× | PLATFORM-BOUND | allow 21.8 (control emitP95 20.3×1) |
| workflow | step.domP50 | 0.96 ± 0.27 | 7.62 ± 0.26 | 7.9× | PLATFORM-BOUND | allow 6.9 (control domP50 6.4×1) |
| workflow | step.domP95 | 5.44 ± 2.88 | 16.88 ± 1.80 | 3.1× | PLATFORM-BOUND | allow 25.3 (control domP95 20.6×1) |
| workflow | reset.emitP50 | 0.20 ± 0.00 | 24.10 ± 2.94 | 120.5× | FAIL | allow 8.7 (control emitP50 5.8×1) |
| workflow | reset.emitP95 | 0.50 ± 0.10 | 49.94 ± 35.06 | 99.9× | PLATFORM-BOUND | allow 55.5 (control emitP95 20.3×1) |
| workflow | reset.domP50 | 0.22 ± 0.04 | 24.20 ± 2.92 | 110.0× | FAIL | allow 9.3 (control domP50 6.4×1) |
| workflow | reset.domP95 | 1.20 ± 0.25 | 50.00 ± 35.08 | 41.7× | PLATFORM-BOUND | allow 56.0 (control domP95 20.6×1) |
| workflow | append100.emitP50 | 0.32 ± 0.04 | 13.16 ± 1.12 | 41.1× | FAIL | allow 7.0 (control emitP50 5.8×1) |
| workflow | append100.emitP95 | 0.76 ± 0.35 | 26.64 ± 18.54 | 35.1× | PLATFORM-BOUND | allow 39.2 (control emitP95 20.3×1) |
| workflow | append100.domP50 | 0.86 ± 0.11 | 13.56 ± 1.21 | 15.8× | FAIL | allow 7.7 (control domP50 6.4×1) |
| workflow | append100.domP95 | 5.46 ± 2.75 | 27.24 ± 18.47 | 5.0× | PLATFORM-BOUND | allow 41.8 (control domP95 20.6×1) |
| workflow | heapMb | 3.90 ± 0.07 | 5.47 ± 0.00 | 1.4× | FAIL | code +1.27 MB; data 1.63 -> 1.86 MB |
| workflow | pssTotalMb | 226.93 ± 2.42 | 240.51 ± 1.32 | 1.1× | FAIL | allow 9.1 (plugin baseline 5.4 MB) |
| workflow | relaunchReadyMs | 870.88 ± 366.16 | 558.24 ± 281.27 | 0.6× | PASS |  |
| workflow | relaunchHeapMb | 3.35 ± 0.00 | 4.43 ± 0.10 | 1.3× | FAIL | code +0.71 MB; data 1.45 -> 1.80 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 5.90 | 6.16 | 16.40 | 7.42 | 8.60 | 22.58 |
| 500 | 5.66 | 5.94 | 17.00 | 8.02 | 8.72 | 20.40 |
| 5000 | 6.24 | 6.64 | 18.60 | 9.74 | 11.00 | 26.90 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 128.8 | 134.6 | 96.3 | 102.7 |
| flat 500 | 129.4 | 134.8 | 100.5 | 103.6 |
| flat 5000 | 128.7 | 137.0 | 104.8 | 109.0 |
| workflow | 128.9 | 135.7 | 98.0 | 104.8 |

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
          "emitP95": 2.400000000023283,
          "domP50": 4.2999999999883585,
          "domP95": 12.900000000023283
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.8999999999650754,
          "domP50": 1.2000000000116415,
          "domP95": 13.600000000034925
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 1.2000000000116415,
          "domP50": 4.899999999965075,
          "domP95": 13.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.5,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.56396484375,
        "heapCode": 1.6890182495117188,
        "heapData": 1.5024337768554688,
        "pssTotalMb": 221.3525390625,
        "pssApp": 126.2255859375,
        "pssRenderer": 95.126953125
      },
      "500": {
        "setKey": {
          "emitP50": 0.29999999998835847,
          "emitP95": 0.9000000000232831,
          "domP50": 5.2999999999883585,
          "domP95": 7.100000000034925
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.6999999999534339,
          "domP50": 5.2999999999883585,
          "domP95": 8.700000000011642
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.2000000000116415,
          "domP50": 1.1000000000349246,
          "domP95": 7.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6000000000349246,
          "endLag": 0.29999999998835847,
          "maxBacklog": 0
        },
        "heapMb": 4.134952545166016,
        "heapCode": 1.8519668579101562,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 228.3642578125,
        "pssApp": 128.5751953125,
        "pssRenderer": 99.7890625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.7000000000116415,
          "emitP95": 4.399999999965075,
          "domP50": 3,
          "domP95": 9.5
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 5.2999999999883585,
          "domP50": 4.2000000000116415,
          "domP95": 7.7999999999883585
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 3.2000000000116415,
          "domP50": 1.6999999999534339,
          "domP95": 11.799999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 2.2000000000116415,
          "endLag": 1.6000000000349246,
          "maxBacklog": 0
        },
        "heapMb": 8.098636627197266,
        "heapCode": 1.8468971252441406,
        "heapData": 5.725044250488281,
        "pssTotalMb": 233.787109375,
        "pssApp": 129.150390625,
        "pssRenderer": 104.63671875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.5,
        "domP50": 5.2999999999883585,
        "domP95": 6.900000000023283
      },
      "edit_d4": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.7000000000116415,
        "domP50": 4.699999999953434,
        "domP95": 7.7000000000116415
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 0.9000000000232831,
        "domP95": 9.100000000034925
      },
      "loadCycle": {
        "emitP50": 0.6000000000349246,
        "emitP95": 34.70000000001164,
        "domP50": 0.7000000000116415,
        "domP95": 35.20000000001164
      },
      "step": {
        "emitP50": 0.29999999998835847,
        "emitP95": 1.3000000000465661,
        "domP50": 0.7999999999883585,
        "domP95": 3
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 0.5999999999767169,
        "domP50": 0.29999999998835847,
        "domP95": 1.1999999999534339
      },
      "append100": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.40000000002328306,
        "domP50": 0.7999999999883585,
        "domP95": 5.400000000023283
      },
      "heapMb": 3.9356765747070312,
      "heapCode": 1.9239883422851562,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 225.8173828125,
      "pssApp": 128.4326171875,
      "pssRenderer": 97.384765625,
      "relaunchReadyMs": 586.3999999999651,
      "relaunchHeapMb": 3.352069854736328,
      "relaunchHeapCode": 1.5400428771972656,
      "relaunchHeapData": 1.4463615417480469
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 6.899999999965075,
          "emitP95": 18.5,
          "domP50": 7.899999999965075,
          "domP95": 18.899999999965075
        },
        "setKeys": {
          "emitP50": 7.5,
          "emitP95": 24.599999999976717,
          "domP50": 8,
          "domP95": 25.199999999953434
        },
        "replace": {
          "emitP50": 8.100000000034925,
          "emitP95": 16.79999999998836,
          "domP50": 9.299999999988358,
          "domP95": 17.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.5,
          "lagP95": 13.600000000034925,
          "endLag": 5.2999999999883585,
          "maxBacklog": 2
        },
        "heapMb": 5.082057952880859,
        "heapCode": 3.0260772705078125,
        "heapData": 1.614471435546875,
        "pssTotalMb": 235.9453125,
        "pssApp": 133.884765625,
        "pssRenderer": 102.060546875,
        "control": {
          "emitP50": 6.2000000000116415,
          "emitP95": 16.5,
          "domP50": 6.399999999965075,
          "domP95": 16.79999999998836
        },
        "fCommitP50": 2.900000000023283,
        "fCommitP95": 11.599999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 8.400000000023283,
          "emitP95": 16.699999999953434,
          "domP50": 9,
          "domP95": 17.099999999976717
        },
        "setKeys": {
          "emitP50": 8.5,
          "emitP95": 16.600000000034925,
          "domP50": 8.899999999965075,
          "domP95": 17.400000000023283
        },
        "replace": {
          "emitP50": 7.699999999953434,
          "emitP95": 23,
          "domP50": 8.299999999988358,
          "domP95": 23.399999999965075
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 12.699999999953434,
          "endLag": 7.7000000000116415,
          "maxBacklog": 2
        },
        "heapMb": 5.560764312744141,
        "heapCode": 3.0361595153808594,
        "heapData": 2.0677223205566406,
        "pssTotalMb": 235.7177734375,
        "pssApp": 132.951171875,
        "pssRenderer": 102.7666015625,
        "control": {
          "emitP50": 6.100000000034925,
          "emitP95": 14.700000000011642,
          "domP50": 6.400000000023283,
          "domP95": 15.099999999976717
        },
        "fCommitP50": 3,
        "fCommitP95": 8.100000000034925
      },
      "5000": {
        "setKey": {
          "emitP50": 8.700000000011642,
          "emitP95": 26.699999999953434,
          "domP50": 11,
          "domP95": 28
        },
        "setKeys": {
          "emitP50": 9.400000000023283,
          "emitP95": 17.5,
          "domP50": 10.099999999976717,
          "domP95": 18.099999999976717
        },
        "replace": {
          "emitP50": 12.799999999988358,
          "emitP95": 20,
          "domP50": 13.400000000023283,
          "domP95": 20.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 14.100000000034925,
          "endLag": 7.7999999999883585,
          "maxBacklog": 2
        },
        "heapMb": 9.958721160888672,
        "heapCode": 3.099578857421875,
        "heapData": 6.259235382080078,
        "pssTotalMb": 244.9326171875,
        "pssApp": 136.7578125,
        "pssRenderer": 108.1748046875,
        "control": {
          "emitP50": 6.5,
          "emitP95": 22.399999999965075,
          "domP50": 6.899999999965075,
          "domP95": 22.79999999998836
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 10.5
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 6.900000000023283,
        "emitP95": 15.600000000034925,
        "domP50": 7.5,
        "domP95": 18.70000000001164
      },
      "edit_d4": {
        "emitP50": 8.200000000011642,
        "emitP95": 16.20000000001164,
        "domP50": 8.600000000034925,
        "domP95": 16.5
      },
      "edit_d10": {
        "emitP50": 7.7999999999883585,
        "emitP95": 16.5,
        "domP50": 8.099999999976717,
        "domP95": 16.79999999998836
      },
      "loadCycle": {
        "emitP50": 10.200000000011642,
        "emitP95": 55.100000000034925,
        "domP50": 10.5,
        "domP95": 55.40000000002328
      },
      "step": {
        "emitP50": 7.100000000034925,
        "emitP95": 16.79999999998836,
        "domP50": 7.5,
        "domP95": 17.099999999976717
      },
      "reset": {
        "emitP50": 27.79999999998836,
        "emitP95": 31.20000000001164,
        "domP50": 27.899999999965075,
        "domP95": 31.20000000001164
      },
      "append100": {
        "emitP50": 13.300000000046566,
        "emitP95": 59.40000000002328,
        "domP50": 13.600000000034925,
        "domP95": 59.79999999998836
      },
      "control": {
        "emitP50": 5.900000000023283,
        "emitP95": 13.5,
        "domP50": 7.600000000034925,
        "domP95": 13.900000000023283
      },
      "heapMb": 5.479198455810547,
      "heapCode": 3.165363311767578,
      "heapData": 1.8655929565429688,
      "pssTotalMb": 238.7294921875,
      "pssApp": 134.515625,
      "pssRenderer": 104.2138671875,
      "relaunchReadyMs": 345.8999999999651,
      "relaunchHeapMb": 4.509876251220703,
      "relaunchHeapCode": 2.3024978637695312,
      "relaunchHeapData": 1.8291244506835938
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.2000000000116415,
          "emitP95": 30.29999999998836,
          "domP50": 7.7999999999883585,
          "domP95": 30.79999999998836
        },
        "setKeys": {
          "emitP50": 8,
          "emitP95": 24.5,
          "domP50": 8.300000000046566,
          "domP95": 25.29999999998836
        },
        "replace": {
          "emitP50": 6.599999999976717,
          "emitP95": 13.099999999976717,
          "domP50": 6.899999999965075,
          "domP95": 15.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 14.100000000034925,
          "endLag": 6.900000000023283,
          "maxBacklog": 3
        },
        "heapMb": 5.0732574462890625,
        "heapCode": 3.0180435180664062,
        "heapData": 1.6142501831054688,
        "pssTotalMb": 235.740234375,
        "pssApp": 133.7978515625,
        "pssRenderer": 101.9423828125,
        "control": {
          "emitP50": 6.2999999999883585,
          "emitP95": 18.400000000023283,
          "domP50": 6.5,
          "domP95": 18.70000000001164
        },
        "fCommitP50": 3.2000000000116415,
        "fCommitP95": 6
      },
      "500": {
        "setKey": {
          "emitP50": 7.7000000000116415,
          "emitP95": 26.399999999965075,
          "domP50": 8.399999999965075,
          "domP95": 26.899999999965075
        },
        "setKeys": {
          "emitP50": 7.199999999953434,
          "emitP95": 27.300000000046566,
          "domP50": 7.7999999999883585,
          "domP95": 27.70000000001164
        },
        "replace": {
          "emitP50": 8.399999999965075,
          "emitP95": 19.29999999998836,
          "domP50": 9,
          "domP95": 19.79999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 14.600000000034925,
          "endLag": 5.099999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.572925567626953,
        "heapCode": 3.0480270385742188,
        "heapData": 2.0677261352539062,
        "pssTotalMb": 237.1015625,
        "pssApp": 134.1279296875,
        "pssRenderer": 102.9736328125,
        "control": {
          "emitP50": 5.5,
          "emitP95": 18.70000000001164,
          "domP50": 5.600000000034925,
          "domP95": 18.900000000023283
        },
        "fCommitP50": 3,
        "fCommitP95": 8.799999999988358
      },
      "5000": {
        "setKey": {
          "emitP50": 8.799999999988358,
          "emitP95": 17.29999999998836,
          "domP50": 10.700000000011642,
          "domP95": 18.29999999998836
        },
        "setKeys": {
          "emitP50": 9.699999999953434,
          "emitP95": 14.200000000011642,
          "domP50": 10.199999999953434,
          "domP95": 15.400000000023283
        },
        "replace": {
          "emitP50": 12.700000000011642,
          "emitP95": 21.099999999976717,
          "domP50": 13.400000000023283,
          "domP95": 21.79999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.400000000023283,
          "lagP95": 13,
          "endLag": 6.2000000000116415,
          "maxBacklog": 2
        },
        "heapMb": 9.95761489868164,
        "heapCode": 3.0984535217285156,
        "heapData": 6.259239196777344,
        "pssTotalMb": 245.0146484375,
        "pssApp": 136.5615234375,
        "pssRenderer": 108.453125,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 16.20000000001164,
          "domP50": 7.099999999976717,
          "domP95": 16.599999999976717
        },
        "fCommitP50": 3.2000000000116415,
        "fCommitP95": 5.599999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.399999999906868,
        "emitP95": 15.5,
        "domP50": 9.300000000046566,
        "domP95": 16
      },
      "edit_d4": {
        "emitP50": 7.700000000069849,
        "emitP95": 18.099999999976717,
        "domP50": 8,
        "domP95": 18.800000000046566
      },
      "edit_d10": {
        "emitP50": 8.5,
        "emitP95": 21.199999999953434,
        "domP50": 9.100000000093132,
        "domP95": 22
      },
      "loadCycle": {
        "emitP50": 19.399999999906868,
        "emitP95": 47.699999999953434,
        "domP50": 19.699999999953434,
        "domP95": 48.5
      },
      "step": {
        "emitP50": 7.300000000046566,
        "emitP95": 15.5,
        "domP50": 7.700000000069849,
        "domP95": 16.100000000093132
      },
      "reset": {
        "emitP50": 23.400000000023283,
        "emitP95": 112.5,
        "domP50": 23.599999999976717,
        "domP95": 112.59999999997672
      },
      "append100": {
        "emitP50": 13.699999999953434,
        "emitP95": 22.800000000046566,
        "domP50": 14,
        "domP95": 23.800000000046566
      },
      "control": {
        "emitP50": 5.599999999976717,
        "emitP95": 16.29999999993015,
        "domP50": 5.900000000023283,
        "domP95": 16.699999999953434
      },
      "heapMb": 5.475250244140625,
      "heapCode": 3.1627578735351562,
      "heapData": 1.86444091796875,
      "pssTotalMb": 240.6171875,
      "pssApp": 136.6689453125,
      "pssRenderer": 103.9482421875,
      "relaunchReadyMs": 368.30000000004657,
      "relaunchHeapMb": 4.516284942626953,
      "relaunchHeapCode": 2.308727264404297,
      "relaunchHeapData": 1.8294258117675781
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6000000000931323,
          "domP50": 3.699999999953434,
          "domP95": 8.400000000023283
        },
        "setKeys": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.9000000000232831,
          "domP50": 1.1999999999534339,
          "domP95": 7.899999999906868
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 4.299999999930151,
          "domP50": 0.9000000000232831,
          "domP95": 10.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.722606658935547,
        "heapCode": 1.8429222106933594,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 224.2060546875,
        "pssApp": 128.27734375,
        "pssRenderer": 95.9287109375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 2,
          "domP50": 3.699999999953434,
          "domP95": 8.100000000093132
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.599999999976717,
          "domP50": 1.400000000023283,
          "domP95": 5.299999999930151
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.400000000023283,
          "domP50": 1.2999999999301508,
          "domP95": 8.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6999999999534339,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.132717132568359,
        "heapCode": 1.8497314453125,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 229.1884765625,
        "pssApp": 129.0068359375,
        "pssRenderer": 100.181640625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6000000000931323,
          "emitP95": 2.5,
          "domP50": 3.700000000069849,
          "domP95": 10.099999999976717
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 2.799999999930151,
          "domP50": 2.799999999930151,
          "domP95": 15.399999999906868
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 3.099999999976717,
          "domP50": 1.599999999976717,
          "domP95": 13.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.2999999999301508,
          "lagP95": 2.299999999930151,
          "endLag": 1.3999999999068677,
          "maxBacklog": 0
        },
        "heapMb": 8.09576416015625,
        "heapCode": 1.84442138671875,
        "heapData": 5.725063323974609,
        "pssTotalMb": 232.4873046875,
        "pssApp": 127.927734375,
        "pssRenderer": 104.5595703125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5999999999767169,
        "domP50": 5.299999999930151,
        "domP95": 7
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 1.3000000000465661,
        "domP95": 7.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 2,
        "domP95": 7.799999999930151
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 32.59999999997672,
        "domP50": 1.1999999999534339,
        "domP95": 33.199999999953434
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 0.6999999999534339,
        "domP95": 1.7000000000698492
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5999999999767169,
        "domP50": 0.2000000000698492,
        "domP95": 1.1999999999534339
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6000000000931323,
        "domP50": 0.7000000000698492,
        "domP95": 2
      },
      "heapMb": 3.776947021484375,
      "heapCode": 1.7703742980957031,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 223.24609375,
      "pssApp": 126.6044921875,
      "pssRenderer": 96.6416015625,
      "relaunchReadyMs": 1260.2000000000698,
      "relaunchHeapMb": 3.3520278930664062,
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
          "emitP95": 1,
          "domP50": 5.200000000069849,
          "domP95": 8.400000000023283
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 6.5,
          "domP50": 1.5,
          "domP95": 7
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.599999999976717,
          "domP50": 2.199999999953434,
          "domP95": 6.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.7225914001464844,
        "heapCode": 1.843048095703125,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 225.0859375,
        "pssApp": 128.8876953125,
        "pssRenderer": 96.1982421875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 4.5,
          "domP50": 1.5,
          "domP95": 8.099999999976717
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 3.400000000023283,
          "domP50": 1.099999999976717,
          "domP95": 6.099999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7000000000698492,
          "domP50": 1,
          "domP95": 6.399999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.1328125,
        "heapCode": 1.8498268127441406,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 228.57421875,
        "pssApp": 128.5,
        "pssRenderer": 100.07421875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 2.800000000046566,
          "domP50": 3.099999999976717,
          "domP95": 11.599999999976717
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 2.199999999953434,
          "domP50": 2.5,
          "domP95": 11.79999999993015
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 5.599999999976717,
          "domP50": 1.900000000023283,
          "domP95": 7.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 3.400000000023283,
          "endLag": 1,
          "maxBacklog": 0
        },
        "heapMb": 8.09756088256836,
        "heapCode": 1.8454322814941406,
        "heapData": 5.725639343261719,
        "pssTotalMb": 237.0537109375,
        "pssApp": 131.3056640625,
        "pssRenderer": 105.748046875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.2999999999301508,
        "emitP95": 1.099999999976717,
        "domP50": 5.400000000023283,
        "domP95": 7.299999999930151
      },
      "edit_d4": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 1.599999999976717,
        "domP95": 6
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7000000000698492,
        "domP50": 1.5,
        "domP95": 6.199999999953434
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 34.199999999953434,
        "domP50": 0.8000000000465661,
        "domP95": 34.699999999953434
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 0.8000000000465661,
        "domP95": 8
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 0.40000000002328306,
        "domP50": 0.19999999995343387,
        "domP95": 1.599999999976717
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.9000000000232831,
        "domP50": 1,
        "domP95": 5.199999999953434
      },
      "heapMb": 3.9360923767089844,
      "heapCode": 1.9243659973144531,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 228.8583984375,
      "pssApp": 130.2216796875,
      "pssRenderer": 98.63671875,
      "relaunchReadyMs": 590.2999999999302,
      "relaunchHeapMb": 3.352142333984375,
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
          "emitP50": 7.100000000093132,
          "emitP95": 23.399999999906868,
          "domP50": 7.700000000069849,
          "domP95": 24.5
        },
        "setKeys": {
          "emitP50": 6.5,
          "emitP95": 20.5,
          "domP50": 9.599999999976717,
          "domP95": 21
        },
        "replace": {
          "emitP50": 7.200000000069849,
          "emitP95": 21.099999999976717,
          "domP50": 7.800000000046566,
          "domP95": 21.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.599999999976717,
          "lagP95": 17.099999999976717,
          "endLag": 11.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.072746276855469,
        "heapCode": 3.0179100036621094,
        "heapData": 1.6145286560058594,
        "pssTotalMb": 238.8984375,
        "pssApp": 135.7392578125,
        "pssRenderer": 103.1591796875,
        "control": {
          "emitP50": 5.5,
          "emitP95": 14.300000000046566,
          "domP50": 5.800000000046566,
          "domP95": 14.70000000006985
        },
        "fCommitP50": 3.1000000000931323,
        "fCommitP95": 10.100000000093132
      },
      "500": {
        "setKey": {
          "emitP50": 8.5,
          "emitP95": 13,
          "domP50": 9.400000000023283,
          "domP95": 13.599999999976717
        },
        "setKeys": {
          "emitP50": 8.699999999953434,
          "emitP95": 16.599999999976717,
          "domP50": 9.29999999993015,
          "domP95": 17.099999999976717
        },
        "replace": {
          "emitP50": 8.199999999953434,
          "emitP95": 27.79999999993015,
          "domP50": 8.5,
          "domP95": 28.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 13.800000000046566,
          "endLag": 6.5,
          "maxBacklog": 2
        },
        "heapMb": 5.572376251220703,
        "heapCode": 3.0481224060058594,
        "heapData": 2.0671539306640625,
        "pssTotalMb": 239.3896484375,
        "pssApp": 135.3896484375,
        "pssRenderer": 104,
        "control": {
          "emitP50": 5.400000000023283,
          "emitP95": 19.29999999993015,
          "domP50": 5.800000000046566,
          "domP95": 19.5
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 12.5
      },
      "5000": {
        "setKey": {
          "emitP50": 10.699999999953434,
          "emitP95": 20.600000000093132,
          "domP50": 11.699999999953434,
          "domP95": 21.100000000093132
        },
        "setKeys": {
          "emitP50": 9.599999999976717,
          "emitP95": 25.400000000023283,
          "domP50": 10.099999999976717,
          "domP95": 25.599999999976717
        },
        "replace": {
          "emitP50": 12.5,
          "emitP95": 20.099999999976717,
          "domP50": 13,
          "domP95": 20.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.300000000046566,
          "lagP95": 12.400000000023283,
          "endLag": 8.199999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.94930648803711,
        "heapCode": 3.090259552001953,
        "heapData": 6.25909423828125,
        "pssTotalMb": 246.2685546875,
        "pssApp": 136.845703125,
        "pssRenderer": 109.4228515625,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 20.699999999953434,
          "domP50": 6.699999999953434,
          "domP95": 21.599999999976717
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 5.599999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.600000000093132,
        "emitP95": 14.300000000046566,
        "domP50": 9.100000000093132,
        "domP95": 14.79999999993015
      },
      "edit_d4": {
        "emitP50": 8,
        "emitP95": 14.199999999953434,
        "domP50": 8.400000000023283,
        "domP95": 15.099999999976717
      },
      "edit_d10": {
        "emitP50": 7,
        "emitP95": 18.900000000023283,
        "domP50": 7.900000000023283,
        "domP95": 19.5
      },
      "loadCycle": {
        "emitP50": 15,
        "emitP95": 47.40000000002328,
        "domP50": 15.100000000093132,
        "domP95": 47.90000000002328
      },
      "step": {
        "emitP50": 7.5,
        "emitP95": 17.400000000023283,
        "domP50": 8,
        "domP95": 19.699999999953434
      },
      "reset": {
        "emitP50": 21.600000000093132,
        "emitP95": 35.40000000002328,
        "domP50": 21.699999999953434,
        "domP95": 35.5
      },
      "append100": {
        "emitP50": 13.699999999953434,
        "emitP95": 17.699999999953434,
        "domP50": 14.099999999976717,
        "domP95": 18.5
      },
      "control": {
        "emitP50": 6,
        "emitP95": 16.5,
        "domP50": 6.200000000069849,
        "domP95": 16.70000000006985
      },
      "heapMb": 5.473339080810547,
      "heapCode": 3.1624183654785156,
      "heapData": 1.8625068664550781,
      "pssTotalMb": 241.9736328125,
      "pssApp": 136.8232421875,
      "pssRenderer": 105.150390625,
      "relaunchReadyMs": 950.4000000000233,
      "relaunchHeapMb": 4.418727874755859,
      "relaunchHeapCode": 2.2167205810546875,
      "relaunchHeapData": 1.8261756896972656
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7,
          "emitP95": 21.800000000046566,
          "domP50": 10.199999999953434,
          "domP95": 22.5
        },
        "setKeys": {
          "emitP50": 7.200000000069849,
          "emitP95": 25.400000000023283,
          "domP50": 8.099999999976717,
          "domP95": 25.79999999993015
        },
        "replace": {
          "emitP50": 6.400000000023283,
          "emitP95": 15.400000000023283,
          "domP50": 7,
          "domP95": 16.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.599999999976717,
          "lagP95": 16.099999999976717,
          "endLag": 6.700000000069849,
          "maxBacklog": 2
        },
        "heapMb": 5.0821075439453125,
        "heapCode": 3.0268211364746094,
        "heapData": 1.6142539978027344,
        "pssTotalMb": 237.34375,
        "pssApp": 134.01171875,
        "pssRenderer": 103.33203125,
        "control": {
          "emitP50": 5.800000000046566,
          "emitP95": 10.699999999953434,
          "domP50": 6.099999999976717,
          "domP95": 11.099999999976717
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 11.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 8.199999999953434,
          "emitP95": 25.400000000023283,
          "domP50": 8.5,
          "domP95": 25.900000000023283
        },
        "setKeys": {
          "emitP50": 8.20000000006985,
          "emitP95": 24.400000000023283,
          "domP50": 8.900000000023283,
          "domP95": 24.800000000046566
        },
        "replace": {
          "emitP50": 7.699999999953434,
          "emitP95": 13.399999999906868,
          "domP50": 8.199999999953434,
          "domP95": 14.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 15,
          "endLag": 6.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.565456390380859,
        "heapCode": 3.0402183532714844,
        "heapData": 2.0674514770507812,
        "pssTotalMb": 239.6552734375,
        "pssApp": 135.7275390625,
        "pssRenderer": 103.927734375,
        "control": {
          "emitP50": 6,
          "emitP95": 13.099999999976717,
          "domP50": 6.300000000046566,
          "domP95": 13.400000000023283
        },
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 9.5
      },
      "5000": {
        "setKey": {
          "emitP50": 11.099999999976717,
          "emitP95": 28.900000000023283,
          "domP50": 11.5,
          "domP95": 29.599999999976717
        },
        "setKeys": {
          "emitP50": 10.400000000023283,
          "emitP95": 19.600000000093132,
          "domP50": 11.099999999976717,
          "domP95": 20.300000000046566
        },
        "replace": {
          "emitP50": 12.199999999953434,
          "emitP95": 29.699999999953434,
          "domP50": 12.699999999953434,
          "domP95": 30.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.799999999930151,
          "lagP95": 17.20000000006985,
          "endLag": 7.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.947830200195312,
        "heapCode": 3.0889205932617188,
        "heapData": 6.259288787841797,
        "pssTotalMb": 247.2939453125,
        "pssApp": 138.12109375,
        "pssRenderer": 109.1728515625,
        "control": {
          "emitP50": 6,
          "emitP95": 16.29999999993015,
          "domP50": 6.300000000046566,
          "domP95": 16.5
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 5.399999999906868
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.699999999953434,
        "emitP95": 17.900000000023283,
        "domP50": 9,
        "domP95": 18.099999999976717
      },
      "edit_d4": {
        "emitP50": 7.699999999953434,
        "emitP95": 14.300000000046566,
        "domP50": 8.099999999976717,
        "domP95": 15.900000000023283
      },
      "edit_d10": {
        "emitP50": 7.900000000023283,
        "emitP95": 13.599999999976717,
        "domP50": 8.699999999953434,
        "domP95": 14.400000000023283
      },
      "loadCycle": {
        "emitP50": 14.199999999953434,
        "emitP95": 52.90000000002328,
        "domP50": 14.199999999953434,
        "domP95": 53.40000000002328
      },
      "step": {
        "emitP50": 6.900000000023283,
        "emitP95": 14.400000000023283,
        "domP50": 7.299999999930151,
        "domP95": 14.800000000046566
      },
      "reset": {
        "emitP50": 21.20000000006985,
        "emitP95": 32.90000000002328,
        "domP50": 21.300000000046566,
        "domP95": 33
      },
      "append100": {
        "emitP50": 13.900000000023283,
        "emitP95": 18.5,
        "domP50": 14.599999999976717,
        "domP95": 19.099999999976717
      },
      "control": {
        "emitP50": 6,
        "emitP95": 32.90000000002328,
        "domP50": 6.199999999953434,
        "domP95": 33.09999999997672
      },
      "heapMb": 5.472049713134766,
      "heapCode": 3.1609458923339844,
      "heapData": 1.8627510070800781,
      "pssTotalMb": 241.5244140625,
      "pssApp": 136.1123046875,
      "pssRenderer": 105.412109375,
      "relaunchReadyMs": 765.1000000000931,
      "relaunchHeapMb": 4.2611083984375,
      "relaunchHeapCode": 2.1217727661132812,
      "relaunchHeapData": 1.763763427734375
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7000000000698492,
          "domP50": 1.2000000000698492,
          "domP95": 8.099999999976717
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.1999999999534339,
          "domP50": 1.2999999999301508,
          "domP95": 9.099999999976717
        },
        "replace": {
          "emitP50": 0.2999999999301508,
          "emitP95": 2.400000000023283,
          "domP50": 0.7999999999301508,
          "domP95": 6.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.7240867614746094,
        "heapCode": 1.844390869140625,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 227.294921875,
        "pssApp": 129.9599609375,
        "pssRenderer": 97.3349609375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 0.9000000000232831,
          "domP50": 3.400000000023283,
          "domP95": 9.699999999953434
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.599999999976717,
          "domP50": 2.1000000000931323,
          "domP95": 14
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7000000000698492,
          "domP50": 1.400000000023283,
          "domP95": 6.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.5,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.133491516113281,
        "heapCode": 1.8506584167480469,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 232.107421875,
        "pssApp": 130.8798828125,
        "pssRenderer": 101.2275390625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.5,
          "emitP95": 9.899999999906868,
          "domP50": 3,
          "domP95": 12.5
        },
        "setKeys": {
          "emitP50": 1.6999999999534339,
          "emitP95": 11,
          "domP50": 3,
          "domP95": 12
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.2000000000698492,
          "domP50": 1.900000000023283,
          "domP95": 13.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 2,
          "endLag": 1,
          "maxBacklog": 0
        },
        "heapMb": 7.936847686767578,
        "heapCode": 1.6900062561035156,
        "heapData": 5.722118377685547,
        "pssTotalMb": 232.3193359375,
        "pssApp": 127.701171875,
        "pssRenderer": 104.6181640625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.8000000000465661,
        "domP50": 5.300000000046566,
        "domP95": 6.600000000093132
      },
      "edit_d4": {
        "emitP50": 0.39999999990686774,
        "emitP95": 1.099999999976717,
        "domP50": 2,
        "domP95": 8.399999999906868
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 0.7000000000698492,
        "domP50": 1.400000000023283,
        "domP95": 7
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33.09999999997672,
        "domP50": 0.6000000000931323,
        "domP95": 33.79999999993015
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 1.2000000000698492,
        "domP95": 7.599999999976717
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5,
        "domP50": 0.2000000000698492,
        "domP95": 1.099999999976717
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.5999999999767169,
        "domP50": 0.9000000000232831,
        "domP95": 5
      },
      "heapMb": 3.935382843017578,
      "heapCode": 1.923675537109375,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 229.0302734375,
      "pssApp": 130.36328125,
      "pssRenderer": 98.6669921875,
      "relaunchReadyMs": 635,
      "relaunchHeapMb": 3.35205078125,
      "relaunchHeapCode": 1.5400428771972656,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.2000000000698492,
          "emitP95": 0.5,
          "domP50": 5.699999999953434,
          "domP95": 6.400000000023283
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.7999999999301508,
          "domP50": 5.099999999976717,
          "domP95": 9.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.699999999953434,
          "domP50": 1.6999999999534339,
          "domP95": 14.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.723857879638672,
        "heapCode": 1.844085693359375,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 227.5703125,
        "pssApp": 130.5546875,
        "pssRenderer": 97.015625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.099999999976717,
          "domP50": 3.400000000023283,
          "domP95": 7.099999999976717
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.699999999953434,
          "domP50": 1.5,
          "domP95": 10.5
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1,
          "domP50": 1.1999999999534339,
          "domP95": 6.200000000069849
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6999999999534339,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 4.132778167724609,
        "heapCode": 1.84979248046875,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 231.04296875,
        "pssApp": 129.9345703125,
        "pssRenderer": 101.1083984375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.099999999976717,
          "emitP95": 1.6000000000931323,
          "domP50": 6.599999999976717,
          "domP95": 8
        },
        "setKeys": {
          "emitP50": 1.7000000000698492,
          "emitP95": 6.900000000023283,
          "domP50": 3.199999999953434,
          "domP95": 7.699999999953434
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.3000000000465661,
          "domP50": 2,
          "domP95": 11.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 2.299999999930151,
          "endLag": 1.1999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 7.939846038818359,
        "heapCode": 1.6928520202636719,
        "heapData": 5.722270965576172,
        "pssTotalMb": 232.1455078125,
        "pssApp": 127.546875,
        "pssRenderer": 104.5986328125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 8.900000000023283,
        "domP50": 1.3000000000465661,
        "domP95": 9.900000000023283
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.5,
        "domP50": 1.8000000000465661,
        "domP95": 9.400000000023283
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 1.6999999999534339,
        "domP95": 9.5
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33.300000000046566,
        "domP50": 0.5999999999767169,
        "domP95": 33.70000000006985
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6999999999534339,
        "domP50": 1.3000000000465661,
        "domP95": 6.900000000023283
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.40000000002328306,
        "domP50": 0.2000000000698492,
        "domP95": 0.9000000000232831
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.3000000000465661,
        "domP50": 0.9000000000232831,
        "domP95": 9.699999999953434
      },
      "heapMb": 3.933734893798828,
      "heapCode": 1.9221420288085938,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 227.6728515625,
      "pssApp": 128.841796875,
      "pssRenderer": 98.8310546875,
      "relaunchReadyMs": 1282.5,
      "relaunchHeapMb": 3.3522872924804688,
      "relaunchHeapCode": 1.5400962829589844,
      "relaunchHeapData": 1.4465255737304688
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.900000000023283,
          "emitP95": 15.599999999976717,
          "domP50": 9.400000000023283,
          "domP95": 16.199999999953434
        },
        "setKeys": {
          "emitP50": 7.700000000069849,
          "emitP95": 15.600000000093132,
          "domP50": 8.099999999976717,
          "domP95": 16.100000000093132
        },
        "replace": {
          "emitP50": 6.800000000046566,
          "emitP95": 20.199999999953434,
          "domP50": 8.399999999906868,
          "domP95": 20.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.699999999953434,
          "lagP95": 13.70000000006985,
          "endLag": 21,
          "maxBacklog": 2
        },
        "heapMb": 5.073848724365234,
        "heapCode": 3.018535614013672,
        "heapData": 1.6145248413085938,
        "pssTotalMb": 238.5166015625,
        "pssApp": 135.357421875,
        "pssRenderer": 103.1591796875,
        "control": {
          "emitP50": 5.700000000069849,
          "emitP95": 16.400000000023283,
          "domP50": 6,
          "domP95": 20.70000000006985
        },
        "fCommitP50": 3.5,
        "fCommitP95": 8.800000000046566
      },
      "500": {
        "setKey": {
          "emitP50": 7.299999999930151,
          "emitP95": 17.900000000023283,
          "domP50": 8.29999999993015,
          "domP95": 18.5
        },
        "setKeys": {
          "emitP50": 7.099999999976717,
          "emitP95": 18.900000000023283,
          "domP50": 7.599999999976717,
          "domP95": 19.599999999976717
        },
        "replace": {
          "emitP50": 8.29999999993015,
          "emitP95": 21,
          "domP50": 8.599999999976717,
          "domP95": 22.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 5.900000000023283,
          "lagP95": 9.099999999976717,
          "endLag": 7.299999999930151,
          "maxBacklog": 2
        },
        "heapMb": 5.570686340332031,
        "heapCode": 3.0456771850585938,
        "heapData": 2.0674591064453125,
        "pssTotalMb": 239.9052734375,
        "pssApp": 135.79296875,
        "pssRenderer": 104.1123046875,
        "control": {
          "emitP50": 5.300000000046566,
          "emitP95": 17.900000000023283,
          "domP50": 5.600000000093132,
          "domP95": 18.100000000093132
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 18.899999999906868
      },
      "5000": {
        "setKey": {
          "emitP50": 9.400000000023283,
          "emitP95": 33.89999999990687,
          "domP50": 10.100000000093132,
          "domP95": 37.5
        },
        "setKeys": {
          "emitP50": 10.099999999976717,
          "emitP95": 19.70000000006985,
          "domP50": 10.699999999953434,
          "domP95": 20.300000000046566
        },
        "replace": {
          "emitP50": 13.099999999976717,
          "emitP95": 21.900000000023283,
          "domP50": 14.20000000006985,
          "domP95": 22.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.599999999976717,
          "lagP95": 12.70000000006985,
          "endLag": 7.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 9.958362579345703,
        "heapCode": 3.099559783935547,
        "heapData": 6.259181976318359,
        "pssTotalMb": 246.2626953125,
        "pssApp": 136.615234375,
        "pssRenderer": 109.6474609375,
        "control": {
          "emitP50": 5.900000000023283,
          "emitP95": 15,
          "domP50": 6.199999999953434,
          "domP95": 15.5
        },
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 12.800000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.799999999930151,
        "emitP95": 23.79999999993015,
        "domP50": 8.29999999993015,
        "domP95": 24.399999999906868
      },
      "edit_d4": {
        "emitP50": 7.600000000093132,
        "emitP95": 15.599999999976717,
        "domP50": 8.29999999993015,
        "domP95": 16
      },
      "edit_d10": {
        "emitP50": 7.699999999953434,
        "emitP95": 15.199999999953434,
        "domP50": 8.400000000023283,
        "domP95": 16.400000000023283
      },
      "loadCycle": {
        "emitP50": 16.5,
        "emitP95": 50.199999999953434,
        "domP50": 16.5,
        "domP95": 50.59999999997672
      },
      "step": {
        "emitP50": 6.900000000023283,
        "emitP95": 16.300000000046566,
        "domP50": 7.599999999976717,
        "domP95": 16.70000000006985
      },
      "reset": {
        "emitP50": 26.5,
        "emitP95": 37.70000000006985,
        "domP50": 26.5,
        "domP95": 37.70000000006985
      },
      "append100": {
        "emitP50": 11.199999999953434,
        "emitP95": 14.800000000046566,
        "domP50": 11.5,
        "domP95": 15
      },
      "control": {
        "emitP50": 5.5,
        "emitP95": 22.29999999993015,
        "domP50": 6,
        "domP95": 22.699999999953434
      },
      "heapMb": 5.4736480712890625,
      "heapCode": 3.1626739501953125,
      "heapData": 1.8627777099609375,
      "pssTotalMb": 239.70703125,
      "pssApp": 134.546875,
      "pssRenderer": 105.16015625,
      "relaunchReadyMs": 361.5,
      "relaunchHeapMb": 4.454753875732422,
      "relaunchHeapCode": 2.309326171875,
      "relaunchHeapData": 1.7673072814941406
    }
  }
]
```
</details>
