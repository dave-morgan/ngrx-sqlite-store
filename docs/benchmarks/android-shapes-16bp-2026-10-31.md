# Phase 16 shapes — flat objects & hybrid workflow (2026-10-31)

Measured alone on `emulator-5556` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.60 ms, p95 6.65 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 52 / CODE-BOUND 0 / FAIL 33

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.38 ± 0.08 | 10.00 ± 1.36 | 26.3× | FAIL | allow 9.2 (control emitP50 7.7×1) |
| flat | 50.setKey.emitP95 | 2.80 ± 2.64 | 24.14 ± 5.09 | 8.6× | PLATFORM-BOUND | allow 32.7 (control emitP95 24.9×1) |
| flat | 50.setKey.domP50 | 5.00 ± 1.79 | 10.90 ± 0.79 | 2.2× | PLATFORM-BOUND | allow 10.6 (control domP50 8.1×1) |
| flat | 50.setKey.domP95 | 8.70 ± 1.85 | 26.56 ± 4.27 | 3.1× | PLATFORM-BOUND | allow 31.4 (control domP95 25.3×1) |
| flat | 50.setKeys.emitP50 | 0.36 ± 0.05 | 9.98 ± 2.10 | 27.7× | PLATFORM-BOUND | allow 9.9 (control emitP50 7.7×1) |
| flat | 50.setKeys.emitP95 | 2.10 ± 1.53 | 26.06 ± 4.54 | 12.4× | PLATFORM-BOUND | allow 31.0 (control emitP95 24.9×1) |
| flat | 50.setKeys.domP50 | 2.34 ± 1.69 | 10.58 ± 2.04 | 4.5× | PLATFORM-BOUND | allow 11.8 (control domP50 8.1×1) |
| flat | 50.setKeys.domP95 | 9.98 ± 4.16 | 26.62 ± 4.72 | 2.7× | PLATFORM-BOUND | allow 34.2 (control domP95 25.3×1) |
| flat | 50.replace.emitP50 | 0.34 ± 0.05 | 10.08 ± 1.02 | 29.6× | FAIL | allow 8.8 (control emitP50 7.7×1) |
| flat | 50.replace.emitP95 | 1.72 ± 1.75 | 22.18 ± 1.50 | 12.9× | PLATFORM-BOUND | allow 28.2 (control emitP95 24.9×1) |
| flat | 50.replace.domP50 | 1.50 ± 0.64 | 10.98 ± 1.34 | 7.3× | PLATFORM-BOUND | allow 10.0 (control domP50 8.1×1) |
| flat | 50.replace.domP95 | 11.04 ± 5.19 | 24.08 ± 3.05 | 2.2× | PLATFORM-BOUND | allow 33.5 (control domP95 25.3×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 7.28 ± 0.41 | 24.3× | PLATFORM-BOUND | allow 8.1 (control emitP50 7.7×1) |
| flat | 50.burst.lagP95 | 0.82 ± 0.25 | 22.18 ± 1.86 | 27.0× | PLATFORM-BOUND | allow 27.1 (control emitP95 24.9×1) |
| flat | 50.burst.endLag | 0.34 ± 0.05 | 10.10 ± 5.39 | 29.7× | PLATFORM-BOUND | allow 13.2 (control emitP50 7.7×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.80 ± 0.45 | 2800000000.0× | FAIL |  |
| flat | 50.heapMb | 3.72 ± 0.00 | 5.07 ± 0.01 | 1.4× | FAIL | code +1.17 MB; data 1.51 -> 1.62 MB |
| flat | 50.pssTotalMb | 223.97 ± 2.56 | 235.76 ± 1.98 | 1.1× | FAIL | allow 7.2 (plugin baseline 2.7 MB) |
| flat | 500.setKey.emitP50 | 0.42 ± 0.04 | 10.48 ± 0.81 | 25.0× | FAIL | allow 7.7 (control emitP50 6.8×1) |
| flat | 500.setKey.emitP95 | 0.84 ± 0.30 | 29.18 ± 4.07 | 34.7× | FAIL | allow 27.0 (control emitP95 22.6×1) |
| flat | 500.setKey.domP50 | 5.66 ± 0.18 | 11.38 ± 1.23 | 2.0× | PLATFORM-BOUND | allow 8.6 (control domP50 7.2×1) |
| flat | 500.setKey.domP95 | 8.26 ± 3.28 | 29.72 ± 4.28 | 3.6× | PLATFORM-BOUND | allow 30.5 (control domP95 22.9×1) |
| flat | 500.setKeys.emitP50 | 0.44 ± 0.05 | 10.30 ± 1.28 | 23.4× | FAIL | allow 8.1 (control emitP50 6.8×1) |
| flat | 500.setKeys.emitP95 | 0.94 ± 0.27 | 28.66 ± 4.63 | 30.5× | FAIL | allow 27.5 (control emitP95 22.6×1) |
| flat | 500.setKeys.domP50 | 4.56 ± 1.70 | 10.80 ± 1.08 | 2.4× | PLATFORM-BOUND | allow 9.9 (control domP50 7.2×1) |
| flat | 500.setKeys.domP95 | 10.86 ± 3.44 | 29.10 ± 4.63 | 2.7× | PLATFORM-BOUND | allow 31.0 (control domP95 22.9×1) |
| flat | 500.replace.emitP50 | 0.38 ± 0.04 | 10.28 ± 1.41 | 27.1× | FAIL | allow 8.3 (control emitP50 6.8×1) |
| flat | 500.replace.emitP95 | 4.10 ± 3.18 | 23.66 ± 1.99 | 5.8× | PLATFORM-BOUND | allow 27.8 (control emitP95 22.6×1) |
| flat | 500.replace.domP50 | 2.90 ± 2.43 | 10.70 ± 1.44 | 3.7× | PLATFORM-BOUND | allow 11.0 (control domP50 7.2×1) |
| flat | 500.replace.domP95 | 9.62 ± 1.81 | 24.34 ± 2.37 | 2.5× | PLATFORM-BOUND | allow 27.1 (control domP95 22.9×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 7.74 ± 0.78 | 19.3× | PLATFORM-BOUND | allow 7.6 (control emitP50 6.8×1) |
| flat | 500.burst.lagP95 | 0.90 ± 0.19 | 20.26 ± 2.01 | 22.5× | PLATFORM-BOUND | allow 24.8 (control emitP95 22.6×1) |
| flat | 500.burst.endLag | 0.54 ± 0.31 | 8.32 ± 2.09 | 15.4× | PLATFORM-BOUND | allow 9.2 (control emitP50 6.8×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 500.heapMb | 4.14 ± 0.00 | 5.57 ± 0.01 | 1.3× | FAIL | code +1.19 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 227.71 ± 2.64 | 236.73 ± 2.53 | 1.0× | FAIL | allow 7.9 (plugin baseline 2.7 MB) |
| flat | 5000.setKey.emitP50 | 1.72 ± 0.08 | 11.12 ± 1.12 | 6.5× | FAIL | allow 9.0 (control emitP50 7.8×1) |
| flat | 5000.setKey.emitP95 | 5.08 ± 2.03 | 26.54 ± 3.79 | 5.2× | PLATFORM-BOUND | allow 26.2 (control emitP95 20.3×1) |
| flat | 5000.setKey.domP50 | 4.86 ± 1.58 | 11.68 ± 1.05 | 2.4× | PLATFORM-BOUND | allow 10.7 (control domP50 8.1×1) |
| flat | 5000.setKey.domP95 | 10.68 ± 1.20 | 26.94 ± 3.74 | 2.5× | PLATFORM-BOUND | allow 25.6 (control domP95 20.6×1) |
| flat | 5000.setKeys.emitP50 | 1.52 ± 0.16 | 11.94 ± 1.15 | 7.9× | FAIL | allow 9.1 (control emitP50 7.8×1) |
| flat | 5000.setKeys.emitP95 | 5.66 ± 2.78 | 26.30 ± 5.67 | 4.6× | PLATFORM-BOUND | allow 28.8 (control emitP95 20.3×1) |
| flat | 5000.setKeys.domP50 | 3.22 ± 0.29 | 12.90 ± 1.05 | 4.0× | FAIL | allow 9.4 (control domP50 8.1×1) |
| flat | 5000.setKeys.domP95 | 11.14 ± 1.64 | 26.80 ± 5.54 | 2.4× | PLATFORM-BOUND | allow 27.8 (control domP95 20.6×1) |
| flat | 5000.replace.emitP50 | 0.40 ± 0.00 | 13.46 ± 1.28 | 33.6× | FAIL | allow 9.0 (control emitP50 7.8×1) |
| flat | 5000.replace.emitP95 | 2.30 ± 2.26 | 24.50 ± 3.10 | 10.7× | PLATFORM-BOUND | allow 25.7 (control emitP95 20.3×1) |
| flat | 5000.replace.domP50 | 2.08 ± 0.44 | 14.18 ± 0.98 | 6.8× | FAIL | allow 9.5 (control domP50 8.1×1) |
| flat | 5000.replace.domP95 | 8.06 ± 1.22 | 25.18 ± 3.08 | 3.1× | PLATFORM-BOUND | allow 24.9 (control domP95 20.6×1) |
| flat | 5000.burst.lagP50 | 1.44 ± 0.09 | 10.34 ± 1.35 | 7.2× | PLATFORM-BOUND | allow 9.2 (control emitP50 7.8×1) |
| flat | 5000.burst.lagP95 | 2.44 ± 0.30 | 20.66 ± 1.89 | 8.5× | PLATFORM-BOUND | allow 22.5 (control emitP95 20.3×1) |
| flat | 5000.burst.endLag | 1.64 ± 0.34 | 11.58 ± 4.08 | 7.1× | PLATFORM-BOUND | allow 12.2 (control emitP50 7.8×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.04 ± 0.12 | 9.95 ± 0.01 | 1.2× | FAIL | code +1.30 MB; data 5.72 -> 6.26 MB |
| flat | 5000.pssTotalMb | 232.37 ± 2.29 | 249.54 ± 2.33 | 1.1× | FAIL | allow 7.3 (plugin baseline 2.7 MB) |
| workflow | edit_d1.emitP50 | 0.36 ± 0.05 | 9.80 ± 1.52 | 27.2× | FAIL | allow 9.1 (control emitP50 7.5×1) |
| workflow | edit_d1.emitP95 | 1.38 ± 0.85 | 22.54 ± 2.36 | 16.3× | PLATFORM-BOUND | allow 28.9 (control emitP95 25.7×1) |
| workflow | edit_d1.domP50 | 3.98 ± 2.22 | 10.92 ± 1.79 | 2.7× | PLATFORM-BOUND | allow 12.0 (control domP50 8.0×1) |
| workflow | edit_d1.domP95 | 8.98 ± 2.65 | 23.12 ± 2.43 | 2.6× | PLATFORM-BOUND | allow 31.1 (control domP95 26.1×1) |
| workflow | edit_d4.emitP50 | 0.42 ± 0.04 | 10.78 ± 0.41 | 25.7× | FAIL | allow 8.0 (control emitP50 7.5×1) |
| workflow | edit_d4.emitP95 | 1.60 ± 1.37 | 29.14 ± 2.07 | 18.2× | PLATFORM-BOUND | allow 29.1 (control emitP95 25.7×1) |
| workflow | edit_d4.domP50 | 5.46 ± 0.34 | 11.34 ± 0.43 | 2.1× | PLATFORM-BOUND | allow 8.7 (control domP50 8.0×1) |
| workflow | edit_d4.domP95 | 11.90 ± 3.19 | 29.62 ± 2.17 | 2.5× | PLATFORM-BOUND | allow 31.4 (control domP95 26.1×1) |
| workflow | edit_d10.emitP50 | 0.42 ± 0.04 | 9.14 ± 0.77 | 21.8× | FAIL | allow 8.4 (control emitP50 7.5×1) |
| workflow | edit_d10.emitP95 | 1.56 ± 0.29 | 22.26 ± 5.46 | 14.3× | PLATFORM-BOUND | allow 31.4 (control emitP95 25.7×1) |
| workflow | edit_d10.domP50 | 4.72 ± 1.58 | 9.50 ± 0.75 | 2.0× | PLATFORM-BOUND | allow 10.3 (control domP50 8.0×1) |
| workflow | edit_d10.domP95 | 9.98 ± 1.35 | 22.88 ± 5.40 | 2.3× | PLATFORM-BOUND | allow 32.8 (control domP95 26.1×1) |
| workflow | loadCycle.emitP50 | 4.84 ± 6.31 | 16.32 ± 2.84 | 3.4× | PLATFORM-BOUND | allow 24.2 (control emitP50 7.5×2) |
| workflow | loadCycle.emitP95 | 33.88 ± 2.36 | 55.20 ± 3.28 | 1.6× | PLATFORM-BOUND | allow 57.0 (control emitP95 25.7×2) |
| workflow | loadCycle.domP50 | 5.80 ± 6.66 | 16.50 ± 2.85 | 2.8× | PLATFORM-BOUND | allow 25.5 (control domP50 8.0×2) |
| workflow | loadCycle.domP95 | 34.24 ± 2.50 | 55.54 ± 3.26 | 1.6× | PLATFORM-BOUND | allow 57.9 (control domP95 26.1×2) |
| workflow | step.emitP50 | 0.34 ± 0.05 | 8.92 ± 0.90 | 26.2× | FAIL | allow 8.5 (control emitP50 7.5×1) |
| workflow | step.emitP95 | 1.00 ± 0.56 | 27.80 ± 5.09 | 27.8× | PLATFORM-BOUND | allow 31.3 (control emitP95 25.7×1) |
| workflow | step.domP50 | 2.78 ± 2.04 | 9.38 ± 0.80 | 3.4× | PLATFORM-BOUND | allow 10.8 (control domP50 8.0×1) |
| workflow | step.domP95 | 8.02 ± 1.19 | 28.40 ± 5.25 | 3.5× | PLATFORM-BOUND | allow 32.5 (control domP95 26.1×1) |
| workflow | reset.emitP50 | 0.22 ± 0.04 | 29.40 ± 2.06 | 133.6× | FAIL | allow 9.6 (control emitP50 7.5×1) |
| workflow | reset.emitP95 | 0.86 ± 0.44 | 55.08 ± 25.09 | 64.0× | FAIL | allow 51.2 (control emitP95 25.7×1) |
| workflow | reset.domP50 | 0.22 ± 0.04 | 29.46 ± 2.05 | 133.9× | FAIL | allow 10.1 (control domP50 8.0×1) |
| workflow | reset.domP95 | 4.20 ± 5.06 | 55.26 ± 25.43 | 13.2× | PLATFORM-BOUND | allow 56.5 (control domP95 26.1×1) |
| workflow | append100.emitP50 | 0.36 ± 0.05 | 13.56 ± 1.31 | 37.7× | FAIL | allow 8.9 (control emitP50 7.5×1) |
| workflow | append100.emitP95 | 1.06 ± 0.63 | 21.06 ± 4.68 | 19.9× | PLATFORM-BOUND | allow 31.0 (control emitP95 25.7×1) |
| workflow | append100.domP50 | 1.82 ± 1.59 | 14.02 ± 1.11 | 7.7× | FAIL | allow 10.7 (control domP50 8.0×1) |
| workflow | append100.domP95 | 7.48 ± 2.67 | 21.68 ± 4.77 | 2.9× | PLATFORM-BOUND | allow 33.5 (control domP95 26.1×1) |
| workflow | heapMb | 3.94 ± 0.00 | 5.51 ± 0.01 | 1.4× | FAIL | code +1.27 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 225.39 ± 2.01 | 240.79 ± 1.87 | 1.1× | FAIL | allow 6.6 (plugin baseline 2.7 MB) |
| workflow | relaunchReadyMs | 1556.16 ± 126.15 | 736.66 ± 219.80 | 0.5× | PASS |  |
| workflow | relaunchHeapMb | 3.37 ± 0.10 | 4.40 ± 0.10 | 1.3× | FAIL | code +0.65 MB; data 1.45 -> 1.82 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 7.74 | 8.06 | 25.28 | 10.00 | 10.90 | 26.56 |
| 500 | 6.80 | 7.16 | 22.94 | 10.48 | 11.38 | 29.72 |
| 5000 | 7.76 | 8.08 | 20.64 | 11.12 | 11.68 | 26.94 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 126.7 | 132.4 | 97.3 | 103.3 |
| flat 500 | 126.9 | 132.7 | 100.8 | 104.0 |
| flat 5000 | 127.0 | 140.0 | 105.4 | 109.5 |
| workflow | 126.9 | 135.5 | 98.5 | 105.3 |

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
          "emitP95": 1.900000000023283,
          "domP50": 5.7999999999883585,
          "domP95": 6.7999999999883585
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5999999999767169,
          "domP50": 2.1000000000349246,
          "domP95": 16.600000000034925
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 0.7999999999883585,
          "domP50": 2.1000000000349246,
          "domP95": 9.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.8999999999650754,
          "endLag": 0.29999999998835847,
          "maxBacklog": 0
        },
        "heapMb": 3.7239227294921875,
        "heapCode": 1.8441505432128906,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 220.484375,
        "pssApp": 123.7607421875,
        "pssRenderer": 96.7236328125
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8000000000465661,
          "domP50": 5.400000000023283,
          "domP95": 6.399999999965075
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.2999999999883585,
          "domP50": 1.599999999976717,
          "domP95": 16.79999999998836
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 9.599999999976717,
          "domP50": 5.400000000023283,
          "domP95": 10.200000000011642
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.9000000000232831,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.135231018066406,
        "heapCode": 1.852081298828125,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 224.2060546875,
        "pssApp": 125.009765625,
        "pssRenderer": 99.1962890625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.7999999999883585,
          "emitP95": 3.5,
          "domP50": 7.400000000023283,
          "domP95": 9.5
        },
        "setKeys": {
          "emitP50": 1.7000000000116415,
          "emitP95": 10,
          "domP50": 3.2000000000116415,
          "domP95": 10.900000000023283
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 1.7999999999883585,
          "domP50": 1.7999999999883585,
          "domP95": 7.2999999999883585
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.2999999999883585,
          "endLag": 2.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.099689483642578,
        "heapCode": 1.8475608825683594,
        "heapData": 5.725639343261719,
        "pssTotalMb": 230.177734375,
        "pssApp": 125.5927734375,
        "pssRenderer": 104.5849609375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.7000000000116415,
        "domP50": 5.5,
        "domP95": 13.099999999976717
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 5.600000000034925,
        "domP95": 7.7000000000116415
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.400000000023283,
        "domP50": 4.099999999976717,
        "domP95": 9.299999999988358
      },
      "loadCycle": {
        "emitP50": 7.7000000000116415,
        "emitP95": 32.899999999965075,
        "domP50": 7.7999999999883585,
        "domP95": 33.199999999953434
      },
      "step": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.7999999999883585,
        "domP50": 1.6000000000349246,
        "domP95": 9.599999999976717
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 0.5,
        "domP50": 0.20000000001164153,
        "domP95": 1.099999999976717
      },
      "append100": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.6999999999534339,
        "domP50": 0.7999999999883585,
        "domP95": 6.400000000023283
      },
      "heapMb": 3.936023712158203,
      "heapCode": 1.9241409301757812,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 223.2060546875,
      "pssApp": 125.5947265625,
      "pssRenderer": 97.611328125,
      "relaunchReadyMs": 1521.3000000000466,
      "relaunchHeapMb": 3.351482391357422,
      "relaunchHeapCode": 1.5398826599121094,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10.5,
          "emitP95": 18.79999999998836,
          "domP50": 11.400000000023283,
          "domP95": 29
        },
        "setKeys": {
          "emitP50": 11.400000000023283,
          "emitP95": 29.099999999976717,
          "domP50": 11.799999999988358,
          "domP95": 30
        },
        "replace": {
          "emitP50": 10.300000000046566,
          "emitP95": 20.20000000001164,
          "domP50": 11,
          "domP95": 20.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.800000000046566,
          "lagP95": 24.5,
          "endLag": 7,
          "maxBacklog": 3
        },
        "heapMb": 5.069976806640625,
        "heapCode": 3.0144081115722656,
        "heapData": 1.6164321899414062,
        "pssTotalMb": 233.4892578125,
        "pssApp": 131.1318359375,
        "pssRenderer": 102.357421875,
        "control": {
          "emitP50": 10,
          "emitP95": 23,
          "domP50": 10.299999999988358,
          "domP95": 23.20000000001164
        },
        "fCommitP50": 4.2999999999883585,
        "fCommitP95": 12.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 9.700000000011642,
          "emitP95": 28.399999999965075,
          "domP50": 10.099999999976717,
          "domP95": 28.899999999965075
        },
        "setKeys": {
          "emitP50": 10.900000000023283,
          "emitP95": 29.399999999965075,
          "domP50": 11.400000000023283,
          "domP95": 30
        },
        "replace": {
          "emitP50": 9,
          "emitP95": 26.29999999998836,
          "domP50": 9.399999999965075,
          "domP95": 27.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.299999999988358,
          "lagP95": 19.5,
          "endLag": 11.200000000011642,
          "maxBacklog": 2
        },
        "heapMb": 5.570705413818359,
        "heapCode": 3.0456199645996094,
        "heapData": 2.0691184997558594,
        "pssTotalMb": 233.7392578125,
        "pssApp": 130.708984375,
        "pssRenderer": 103.0302734375,
        "control": {
          "emitP50": 6.7999999999883585,
          "emitP95": 25.199999999953434,
          "domP50": 7.2000000000116415,
          "domP95": 25.5
        },
        "fCommitP50": 3.800000000046566,
        "fCommitP95": 9.5
      },
      "5000": {
        "setKey": {
          "emitP50": 9.899999999965075,
          "emitP95": 25.900000000023283,
          "domP50": 10.200000000011642,
          "domP95": 26.29999999998836
        },
        "setKeys": {
          "emitP50": 12.599999999976717,
          "emitP95": 22.400000000023283,
          "domP50": 13.199999999953434,
          "domP95": 22.900000000023283
        },
        "replace": {
          "emitP50": 12.5,
          "emitP95": 29.400000000023283,
          "domP50": 13.400000000023283,
          "domP95": 30
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 11.200000000011642,
          "lagP95": 19.5,
          "endLag": 17.5,
          "maxBacklog": 2
        },
        "heapMb": 9.946979522705078,
        "heapCode": 3.0891265869140625,
        "heapData": 6.260601043701172,
        "pssTotalMb": 246.7373046875,
        "pssApp": 138.1337890625,
        "pssRenderer": 108.603515625,
        "control": {
          "emitP50": 6.7999999999883585,
          "emitP95": 19.800000000046566,
          "domP50": 7.099999999976717,
          "domP95": 20
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 5.2999999999883585
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 12.099999999976717,
        "emitP95": 24.5,
        "domP50": 13.599999999976717,
        "domP95": 25.29999999998836
      },
      "edit_d4": {
        "emitP50": 11.400000000023283,
        "emitP95": 30.79999999998836,
        "domP50": 11.700000000011642,
        "domP95": 31.29999999998836
      },
      "edit_d10": {
        "emitP50": 9.400000000023283,
        "emitP95": 24.70000000001164,
        "domP50": 9.799999999988358,
        "domP95": 25.5
      },
      "loadCycle": {
        "emitP50": 21,
        "emitP95": 60.699999999953434,
        "domP50": 21.20000000001164,
        "domP95": 61
      },
      "step": {
        "emitP50": 8.600000000034925,
        "emitP95": 30.5,
        "domP50": 9.299999999988358,
        "domP95": 31.699999999953434
      },
      "reset": {
        "emitP50": 29.899999999965075,
        "emitP95": 43.5,
        "domP50": 30,
        "domP95": 43.5
      },
      "append100": {
        "emitP50": 11.699999999953434,
        "emitP95": 13.600000000034925,
        "domP50": 12.599999999976717,
        "domP95": 13.900000000023283
      },
      "control": {
        "emitP50": 8.399999999965075,
        "emitP95": 23,
        "domP50": 9,
        "domP95": 23.300000000046566
      },
      "heapMb": 5.506175994873047,
      "heapCode": 3.190349578857422,
      "heapData": 1.8682708740234375,
      "pssTotalMb": 239.1162109375,
      "pssApp": 134.5810546875,
      "pssRenderer": 104.53515625,
      "relaunchReadyMs": 864.7999999999884,
      "relaunchHeapMb": 4.32891845703125,
      "relaunchHeapCode": 2.1266250610351562,
      "relaunchHeapData": 1.8267402648925781
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 11,
          "emitP95": 23.20000000001164,
          "domP50": 11.5,
          "domP95": 23.79999999998836
        },
        "setKeys": {
          "emitP50": 7.300000000046566,
          "emitP95": 31.70000000001164,
          "domP50": 8.299999999988358,
          "domP95": 32.40000000002328
        },
        "replace": {
          "emitP50": 8.5,
          "emitP95": 23,
          "domP50": 8.900000000023283,
          "domP95": 23.399999999965075
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.600000000034925,
          "lagP95": 21,
          "endLag": 16,
          "maxBacklog": 3
        },
        "heapMb": 5.069927215576172,
        "heapCode": 3.0145034790039062,
        "heapData": 1.6161651611328125,
        "pssTotalMb": 233.7021484375,
        "pssApp": 131.2734375,
        "pssRenderer": 102.4287109375,
        "control": {
          "emitP50": 9.5,
          "emitP95": 24.800000000046566,
          "domP50": 9.799999999988358,
          "domP95": 25.100000000034925
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 5.400000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 9.70000000006985,
          "emitP95": 30.29999999993015,
          "domP50": 10.300000000046566,
          "domP95": 30.79999999993015
        },
        "setKeys": {
          "emitP50": 10.599999999976717,
          "emitP95": 33.29999999993015,
          "domP50": 11,
          "domP95": 33.59999999997672
        },
        "replace": {
          "emitP50": 11.79999999993015,
          "emitP95": 23.199999999953434,
          "domP50": 12.29999999993015,
          "domP95": 23.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.699999999953434,
          "lagP95": 21,
          "endLag": 9.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.570842742919922,
        "heapCode": 3.0457077026367188,
        "heapData": 2.0691146850585938,
        "pssTotalMb": 234.4638671875,
        "pssApp": 131.5078125,
        "pssRenderer": 102.9560546875,
        "control": {
          "emitP50": 7.099999999976717,
          "emitP95": 19.79999999993015,
          "domP50": 7.5,
          "domP95": 20.099999999976717
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 5.599999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 12.699999999953434,
          "emitP95": 24.099999999976717,
          "domP50": 13,
          "domP95": 24.5
        },
        "setKeys": {
          "emitP50": 11.400000000023283,
          "emitP95": 26.400000000023283,
          "domP50": 13,
          "domP95": 27
        },
        "replace": {
          "emitP50": 14.79999999993015,
          "emitP95": 21.20000000006985,
          "domP50": 15.20000000006985,
          "domP95": 21.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 18.29999999993015,
          "endLag": 7.699999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.947418212890625,
        "heapCode": 3.0896453857421875,
        "heapData": 6.2604827880859375,
        "pssTotalMb": 247.2998046875,
        "pssApp": 138.892578125,
        "pssRenderer": 108.4072265625,
        "control": {
          "emitP50": 6.199999999953434,
          "emitP95": 21.599999999976717,
          "domP50": 6.5,
          "domP95": 22
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 5
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.70000000006985,
        "emitP95": 24,
        "domP50": 10.699999999953434,
        "domP95": 24.699999999953434
      },
      "edit_d4": {
        "emitP50": 10.5,
        "emitP95": 30.29999999993015,
        "domP50": 11,
        "domP95": 31
      },
      "edit_d10": {
        "emitP50": 8.20000000006985,
        "emitP95": 30.800000000046566,
        "domP50": 8.5,
        "domP95": 31.20000000006985
      },
      "loadCycle": {
        "emitP50": 14.5,
        "emitP95": 52.5,
        "domP50": 14.699999999953434,
        "domP95": 52.90000000002328
      },
      "step": {
        "emitP50": 9.800000000046566,
        "emitP95": 18.900000000023283,
        "domP50": 10.099999999976717,
        "domP95": 19.20000000006985
      },
      "reset": {
        "emitP50": 29.899999999906868,
        "emitP95": 50.199999999953434,
        "domP50": 29.899999999906868,
        "domP95": 50.199999999953434
      },
      "append100": {
        "emitP50": 13.600000000093132,
        "emitP95": 19.900000000023283,
        "domP50": 14.100000000093132,
        "domP95": 20.5
      },
      "control": {
        "emitP50": 8.70000000006985,
        "emitP95": 30,
        "domP50": 9,
        "domP95": 30.400000000023283
      },
      "heapMb": 5.509246826171875,
      "heapCode": 3.192974090576172,
      "heapData": 1.8685226440429688,
      "pssTotalMb": 238.4521484375,
      "pssApp": 134.3125,
      "pssRenderer": 104.1396484375,
      "relaunchReadyMs": 922.5,
      "relaunchHeapMb": 4.328765869140625,
      "relaunchHeapCode": 2.1271934509277344,
      "relaunchHeapData": 1.8260879516601562
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 7.099999999976717,
          "domP50": 6,
          "domP95": 9.5
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.099999999976717,
          "domP50": 1.5,
          "domP95": 8.600000000093132
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 4.799999999930151,
          "domP50": 1.099999999976717,
          "domP95": 12
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.7227134704589844,
        "heapCode": 1.8430595397949219,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 222.09765625,
        "pssApp": 125.833984375,
        "pssRenderer": 96.263671875
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.9000000000232831,
          "domP50": 5.900000000023283,
          "domP95": 7.099999999976717
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8000000000465661,
          "domP50": 4.800000000046566,
          "domP95": 9.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.700000000069849,
          "domP50": 1.3000000000465661,
          "domP95": 9.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8999999999068677,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.136512756347656,
        "heapCode": 1.8535041809082031,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 225.5185546875,
        "pssApp": 125.6025390625,
        "pssRenderer": 99.916015625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.7999999999301508,
          "emitP95": 7.400000000023283,
          "domP50": 4,
          "domP95": 12.599999999976717
        },
        "setKeys": {
          "emitP50": 1.400000000023283,
          "emitP95": 5,
          "domP50": 3.599999999976717,
          "domP95": 8.400000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8000000000465661,
          "domP50": 1.6999999999534339,
          "domP95": 9.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.5,
          "endLag": 1.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 8.09695053100586,
        "heapCode": 1.84539794921875,
        "heapData": 5.725063323974609,
        "pssTotalMb": 230.78125,
        "pssApp": 125.7646484375,
        "pssRenderer": 105.0166015625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 5.700000000069849,
        "domP95": 6.899999999906868
      },
      "edit_d4": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.5999999999767169,
        "domP50": 5.099999999976717,
        "domP95": 12.20000000006985
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.400000000023283,
        "domP50": 5.800000000046566,
        "domP95": 11.800000000046566
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 38.09999999997672,
        "domP50": 0.6000000000931323,
        "domP95": 38.70000000006985
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7000000000698492,
        "domP50": 4.800000000046566,
        "domP95": 8.099999999976717
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 1.599999999976717,
        "domP50": 0.2000000000698492,
        "domP95": 2.199999999953434
      },
      "append100": {
        "emitP50": 0.39999999990686774,
        "emitP95": 2,
        "domP50": 1,
        "domP95": 12.20000000006985
      },
      "heapMb": 3.936126708984375,
      "heapCode": 1.9243888854980469,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 223.2275390625,
      "pssApp": 125.61328125,
      "pssRenderer": 97.6142578125,
      "relaunchReadyMs": 1476.2999999999302,
      "relaunchHeapMb": 3.2575531005859375,
      "relaunchHeapCode": 1.4547004699707031,
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
          "domP50": 5.699999999953434,
          "domP95": 6.800000000046566
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.2000000000698492,
          "domP50": 1.6999999999534339,
          "domP95": 6
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.400000000023283,
          "domP50": 1,
          "domP95": 6.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 1.1999999999534339,
          "endLag": 0.39999999990686774,
          "maxBacklog": 0
        },
        "heapMb": 3.723857879638672,
        "heapCode": 1.844085693359375,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 226.4033203125,
        "pssApp": 128.5439453125,
        "pssRenderer": 97.859375
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6999999999534339,
          "domP50": 5.700000000069849,
          "domP95": 7.099999999976717
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.099999999976717,
          "domP50": 5.800000000046566,
          "domP95": 7.900000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.300000000046566,
          "domP50": 5.699999999953434,
          "domP95": 8.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1.2000000000698492,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.134929656982422,
        "heapCode": 1.8519439697265625,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 229.654296875,
        "pssApp": 127.888671875,
        "pssRenderer": 101.765625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 2.5,
          "domP50": 3.400000000023283,
          "domP95": 11
        },
        "setKeys": {
          "emitP50": 1.3000000000465661,
          "emitP95": 6.100000000093132,
          "domP50": 3.400000000023283,
          "domP95": 12.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 6.300000000046566,
          "domP50": 2.799999999930151,
          "domP95": 9.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.699999999953434,
          "endLag": 1.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 8.09701919555664,
        "heapCode": 1.8454666137695312,
        "heapData": 5.725063323974609,
        "pssTotalMb": 234.3505859375,
        "pssApp": 128.1728515625,
        "pssRenderer": 106.177734375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.3000000000465661,
        "domP50": 1.599999999976717,
        "domP95": 10.099999999976717
      },
      "edit_d4": {
        "emitP50": 0.5,
        "emitP95": 4,
        "domP50": 5.799999999930151,
        "domP95": 16.599999999976717
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2,
        "domP50": 5.699999999953434,
        "domP95": 9.199999999953434
      },
      "loadCycle": {
        "emitP50": 0.7999999999301508,
        "emitP95": 32.699999999953434,
        "domP50": 3.400000000023283,
        "domP95": 33.09999999997672
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 2,
        "domP50": 5.200000000069849,
        "domP95": 8.5
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.9000000000232831,
        "domP50": 0.2000000000698492,
        "domP95": 3.400000000023283
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.6999999999534339,
        "domP50": 1,
        "domP95": 5.599999999976717
      },
      "heapMb": 3.9335479736328125,
      "heapCode": 1.9220237731933594,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.52734375,
      "pssApp": 127.390625,
      "pssRenderer": 99.13671875,
      "relaunchReadyMs": 1780,
      "relaunchHeapMb": 3.5220603942871094,
      "relaunchHeapCode": 1.7048110961914062,
      "relaunchHeapData": 1.4491119384765625
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10.900000000023283,
          "emitP95": 21.29999999993015,
          "domP50": 11.29999999993015,
          "domP95": 21.900000000023283
        },
        "setKeys": {
          "emitP50": 8.099999999976717,
          "emitP95": 25.5,
          "domP50": 8.400000000023283,
          "domP95": 25.900000000023283
        },
        "replace": {
          "emitP50": 10.400000000023283,
          "emitP95": 23.899999999906868,
          "domP50": 12.599999999976717,
          "domP95": 24.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.699999999953434,
          "lagP95": 20.599999999976717,
          "endLag": 5,
          "maxBacklog": 3
        },
        "heapMb": 5.0727081298828125,
        "heapCode": 3.0168800354003906,
        "heapData": 1.6161651611328125,
        "pssTotalMb": 237.3212890625,
        "pssApp": 133.5087890625,
        "pssRenderer": 103.8125,
        "control": {
          "emitP50": 6,
          "emitP95": 22.300000000046566,
          "domP50": 6.400000000023283,
          "domP95": 22.70000000006985
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 6.099999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 10.5,
          "emitP95": 34.40000000002328,
          "domP50": 11.20000000006985,
          "domP95": 35.29999999993015
        },
        "setKeys": {
          "emitP50": 10.5,
          "emitP95": 32,
          "domP50": 10.800000000046566,
          "domP95": 32.59999999997672
        },
        "replace": {
          "emitP50": 11.5,
          "emitP95": 22.5,
          "domP50": 11.900000000023283,
          "domP95": 23
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.099999999976717,
          "lagP95": 17.100000000093132,
          "endLag": 7.099999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.569240570068359,
        "heapCode": 3.0442581176757812,
        "heapData": 2.0690574645996094,
        "pssTotalMb": 238.12890625,
        "pssApp": 133.28125,
        "pssRenderer": 104.84765625,
        "control": {
          "emitP50": 7.5,
          "emitP95": 20.800000000046566,
          "domP50": 7.700000000069849,
          "domP95": 21.099999999976717
        },
        "fCommitP50": 3.800000000046566,
        "fCommitP95": 6.900000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 10.20000000006985,
          "emitP95": 24.400000000023283,
          "domP50": 11.199999999953434,
          "domP95": 24.699999999953434
        },
        "setKeys": {
          "emitP50": 13.099999999976717,
          "emitP95": 19.199999999953434,
          "domP50": 14.099999999976717,
          "domP95": 19.900000000023283
        },
        "replace": {
          "emitP50": 12.800000000046566,
          "emitP95": 22.900000000023283,
          "domP50": 13.400000000023283,
          "domP95": 24.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 10.900000000023283,
          "lagP95": 20.899999999906868,
          "endLag": 13.699999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.948066711425781,
        "heapCode": 3.0899009704589844,
        "heapData": 6.260471343994141,
        "pssTotalMb": 250.7841796875,
        "pssApp": 140.484375,
        "pssRenderer": 110.2998046875,
        "control": {
          "emitP50": 8.400000000023283,
          "emitP95": 19.800000000046566,
          "domP50": 8.70000000006985,
          "domP95": 20.099999999976717
        },
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 9.099999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.599999999976717,
        "emitP95": 20.599999999976717,
        "domP50": 9.70000000006985,
        "domP95": 21
      },
      "edit_d4": {
        "emitP50": 10.399999999906868,
        "emitP95": 30.800000000046566,
        "domP50": 11,
        "domP95": 31.300000000046566
      },
      "edit_d10": {
        "emitP50": 10.199999999953434,
        "emitP95": 18.599999999976717,
        "domP50": 10.400000000023283,
        "domP95": 19.800000000046566
      },
      "loadCycle": {
        "emitP50": 14,
        "emitP95": 53,
        "domP50": 14.199999999953434,
        "domP95": 53.300000000046566
      },
      "step": {
        "emitP50": 9.70000000006985,
        "emitP95": 28.699999999953434,
        "domP50": 10,
        "domP95": 29.599999999976717
      },
      "reset": {
        "emitP50": 29.900000000023283,
        "emitP95": 37.29999999993015,
        "domP50": 29.900000000023283,
        "domP95": 37.39999999990687
      },
      "append100": {
        "emitP50": 13,
        "emitP95": 22.199999999953434,
        "domP50": 13.29999999993015,
        "domP95": 23.79999999993015
      },
      "control": {
        "emitP50": 6.899999999906868,
        "emitP95": 21.79999999993015,
        "domP50": 7.199999999953434,
        "domP95": 22.099999999976717
      },
      "heapMb": 5.520366668701172,
      "heapCode": 3.194690704345703,
      "heapData": 1.8776397705078125,
      "pssTotalMb": 241.5986328125,
      "pssApp": 135.6611328125,
      "pssRenderer": 105.9375,
      "relaunchReadyMs": 901.5,
      "relaunchHeapMb": 4.328758239746094,
      "relaunchHeapCode": 2.1267242431640625,
      "relaunchHeapData": 1.8264808654785156
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.700000000069849,
          "emitP95": 25.199999999953434,
          "domP50": 9.599999999976717,
          "domP95": 25.5
        },
        "setKeys": {
          "emitP50": 11.70000000006985,
          "emitP95": 20,
          "domP50": 12.20000000006985,
          "domP95": 20.399999999906868
        },
        "replace": {
          "emitP50": 11.300000000046566,
          "emitP95": 21.099999999976717,
          "domP50": 11.5,
          "domP95": 29
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.900000000023283,
          "lagP95": 20.900000000023283,
          "endLag": 6.599999999976717,
          "maxBacklog": 3
        },
        "heapMb": 5.081417083740234,
        "heapCode": 3.025066375732422,
        "heapData": 1.6161651611328125,
        "pssTotalMb": 237.248046875,
        "pssApp": 133.404296875,
        "pssRenderer": 103.84375,
        "control": {
          "emitP50": 6.200000000069849,
          "emitP95": 25.800000000046566,
          "domP50": 6.5,
          "domP95": 26.300000000046566
        },
        "fCommitP50": 3.6000000000931323,
        "fCommitP95": 5.299999999930151
      },
      "500": {
        "setKey": {
          "emitP50": 10.899999999906868,
          "emitP95": 23.099999999976717,
          "domP50": 12.699999999953434,
          "domP95": 23.400000000023283
        },
        "setKeys": {
          "emitP50": 8.100000000093132,
          "emitP95": 21.599999999976717,
          "domP50": 9,
          "domP95": 22.099999999976717
        },
        "replace": {
          "emitP50": 10.400000000023283,
          "emitP95": 21.29999999993015,
          "domP50": 10.800000000046566,
          "domP95": 21.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.399999999906868,
          "lagP95": 21.79999999993015,
          "endLag": 5.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.560081481933594,
        "heapCode": 3.0352745056152344,
        "heapData": 2.069122314453125,
        "pssTotalMb": 239.7138671875,
        "pssApp": 135.2890625,
        "pssRenderer": 104.4248046875,
        "control": {
          "emitP50": 6.5,
          "emitP95": 27,
          "domP50": 7,
          "domP95": 27.5
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 7.099999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 11.29999999993015,
          "emitP95": 33.199999999953434,
          "domP50": 11.900000000023283,
          "domP95": 33.5
        },
        "setKeys": {
          "emitP50": 12.400000000023283,
          "emitP95": 33.09999999997672,
          "domP50": 13,
          "domP95": 33.5
        },
        "replace": {
          "emitP50": 14.900000000023283,
          "emitP95": 23.79999999993015,
          "domP50": 15.300000000046566,
          "domP95": 24.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 10.400000000023283,
          "lagP95": 21.29999999993015,
          "endLag": 8.199999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.947193145751953,
        "heapCode": 3.0887413024902344,
        "heapData": 6.260875701904297,
        "pssTotalMb": 251.3115234375,
        "pssApp": 140.943359375,
        "pssRenderer": 110.3681640625,
        "control": {
          "emitP50": 8.099999999976717,
          "emitP95": 24.20000000006985,
          "domP50": 8.400000000023283,
          "domP95": 24.5
        },
        "fCommitP50": 3.700000000069849,
        "fCommitP95": 6
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.300000000046566,
        "emitP95": 24.20000000006985,
        "domP50": 9,
        "domP95": 24.599999999976717
      },
      "edit_d4": {
        "emitP50": 11,
        "emitP95": 27.20000000006985,
        "domP50": 11.900000000023283,
        "domP95": 27.5
      },
      "edit_d10": {
        "emitP50": 9.29999999993015,
        "emitP95": 18.800000000046566,
        "domP50": 9.79999999993015,
        "domP95": 19.100000000093132
      },
      "loadCycle": {
        "emitP50": 16.900000000023283,
        "emitP95": 55.40000000002328,
        "domP50": 17.099999999976717,
        "domP95": 55.800000000046566
      },
      "step": {
        "emitP50": 8.899999999906868,
        "emitP95": 31.5,
        "domP50": 9.400000000023283,
        "domP95": 31.800000000046566
      },
      "reset": {
        "emitP50": 31.400000000023283,
        "emitP95": 45.199999999953434,
        "domP50": 31.5,
        "domP95": 45.199999999953434
      },
      "append100": {
        "emitP50": 15.099999999976717,
        "emitP95": 24,
        "domP50": 15.400000000023283,
        "domP95": 24.300000000046566
      },
      "control": {
        "emitP50": 6.700000000069849,
        "emitP95": 20.199999999953434,
        "domP50": 7.300000000046566,
        "domP95": 20.699999999953434
      },
      "heapMb": 5.509822845458984,
      "heapCode": 3.1918411254882812,
      "heapData": 1.870391845703125,
      "pssTotalMb": 242.47265625,
      "pssApp": 136.34765625,
      "pssRenderer": 106.125,
      "relaunchReadyMs": 512.9000000000233,
      "relaunchHeapMb": 4.540821075439453,
      "relaunchHeapCode": 2.3319625854492188,
      "relaunchHeapData": 1.8309669494628906
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 3.3999999999068677,
          "domP50": 1.8000000000465661,
          "domP95": 9.399999999906868
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2,
          "domP50": 1.099999999976717,
          "domP95": 7.5
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.6000000000931323,
          "domP50": 1,
          "domP95": 19.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.8000000000465661,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.7256507873535156,
        "heapCode": 1.8459320068359375,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 225.009765625,
        "pssApp": 127.232421875,
        "pssRenderer": 97.77734375
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.5,
          "domP50": 5.699999999953434,
          "domP95": 6.599999999976717
        },
        "setKeys": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.8999999999068677,
          "domP50": 5.099999999976717,
          "domP95": 9.699999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.6999999999534339,
          "domP50": 0.9000000000232831,
          "domP95": 12.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 4.134082794189453,
        "heapCode": 1.8510971069335938,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 229.40625,
        "pssApp": 127.892578125,
        "pssRenderer": 101.513671875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6999999999534339,
          "emitP95": 6.399999999906868,
          "domP50": 5.299999999930151,
          "domP95": 10.300000000046566
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 4.800000000046566,
          "domP50": 2.900000000023283,
          "domP95": 12
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.3000000000465661,
          "domP50": 1.900000000023283,
          "domP95": 6.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999068677,
          "lagP95": 2,
          "endLag": 1.6999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 7.834690093994141,
        "heapCode": 1.5967674255371094,
        "heapData": 5.7194061279296875,
        "pssTotalMb": 231.244140625,
        "pssApp": 126.7880859375,
        "pssRenderer": 104.4560546875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 5.600000000093132,
        "domP95": 6.900000000023283
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 5.099999999976717,
        "domP95": 11
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.6999999999534339,
        "domP50": 2.199999999953434,
        "domP95": 8.600000000093132
      },
      "loadCycle": {
        "emitP50": 14.699999999953434,
        "emitP95": 32.699999999953434,
        "domP50": 16.5,
        "domP95": 32.90000000002328
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6999999999534339,
        "domP50": 1,
        "domP95": 6.400000000023283
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 0.6999999999534339,
        "domP50": 0.19999999995343387,
        "domP95": 13.099999999976717
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.400000000023283,
        "domP50": 4.599999999976717,
        "domP95": 6.799999999930151
      },
      "heapMb": 3.9349136352539062,
      "heapCode": 1.9232292175292969,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.66796875,
      "pssApp": 127.55859375,
      "pssRenderer": 99.109375,
      "relaunchReadyMs": 1502,
      "relaunchHeapMb": 3.3515892028808594,
      "relaunchHeapCode": 1.5399589538574219,
      "relaunchHeapData": 1.4461593627929688
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
          "domP50": 5.699999999953434,
          "domP95": 11
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.599999999976717,
          "domP50": 5.299999999930151,
          "domP95": 11.199999999953434
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1,
          "domP50": 2.299999999930151,
          "domP95": 8
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.39999999990686774,
          "maxBacklog": 0
        },
        "heapMb": 3.7240982055664062,
        "heapCode": 1.8443717956542969,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 225.841796875,
        "pssApp": 127.8837890625,
        "pssRenderer": 97.9580078125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.3000000000465661,
          "domP50": 5.599999999976717,
          "domP95": 14.099999999976717
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 0.5999999999767169,
          "domP50": 5.5,
          "domP95": 10.400000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.199999999953434,
          "domP50": 1.2000000000698492,
          "domP95": 7.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8000000000465661,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.1364593505859375,
        "heapCode": 1.8534507751464844,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 229.748046875,
        "pssApp": 128.2177734375,
        "pssRenderer": 101.5302734375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6999999999534339,
          "emitP95": 5.599999999976717,
          "domP50": 4.199999999953434,
          "domP95": 10
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 2.3999999999068677,
          "domP50": 3,
          "domP95": 11.900000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.3000000000465661,
          "domP50": 2.199999999953434,
          "domP95": 8.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.599999999976717,
          "lagP95": 2.699999999953434,
          "endLag": 1.7999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 8.096153259277344,
        "heapCode": 1.8440666198730469,
        "heapData": 5.725639343261719,
        "pssTotalMb": 235.2890625,
        "pssApp": 128.71875,
        "pssRenderer": 106.5703125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.599999999976717,
        "domP50": 1.5,
        "domP95": 7.900000000023283
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.3999999999068677,
        "domP50": 5.700000000069849,
        "domP95": 12
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.3000000000465661,
        "domP50": 5.800000000046566,
        "domP95": 11
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33,
        "domP50": 0.6999999999534339,
        "domP95": 33.29999999993015
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1.3000000000465661,
        "domP95": 7.5
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.5999999999767169,
        "domP50": 0.2999999999301508,
        "domP95": 1.1999999999534339
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 1.6999999999534339,
        "domP95": 6.399999999906868
      },
      "heapMb": 3.9353561401367188,
      "heapCode": 1.9236488342285156,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 227.3388671875,
      "pssApp": 128.146484375,
      "pssRenderer": 99.1923828125,
      "relaunchReadyMs": 1501.1999999999534,
      "relaunchHeapMb": 3.3515586853027344,
      "relaunchHeapCode": 1.5399589538574219,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.900000000023283,
          "emitP95": 32.199999999953434,
          "domP50": 10.70000000006985,
          "domP95": 32.59999999997672
        },
        "setKeys": {
          "emitP50": 11.400000000023283,
          "emitP95": 24,
          "domP50": 12.20000000006985,
          "domP95": 24.400000000023283
        },
        "replace": {
          "emitP50": 9.900000000023283,
          "emitP95": 22.699999999953434,
          "domP50": 10.900000000023283,
          "domP95": 23
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.399999999906868,
          "lagP95": 23.899999999906868,
          "endLag": 15.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.080615997314453,
        "heapCode": 3.024627685546875,
        "heapData": 1.6161613464355469,
        "pssTotalMb": 237.0419921875,
        "pssApp": 132.9208984375,
        "pssRenderer": 104.12109375,
        "control": {
          "emitP50": 7,
          "emitP95": 28.800000000046566,
          "domP50": 7.299999999930151,
          "domP95": 29.099999999976717
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 5.800000000046566
      },
      "500": {
        "setKey": {
          "emitP50": 11.599999999976717,
          "emitP95": 29.699999999953434,
          "domP50": 12.599999999976717,
          "domP95": 30.199999999953434
        },
        "setKeys": {
          "emitP50": 11.399999999906868,
          "emitP95": 27,
          "domP50": 11.79999999993015,
          "domP95": 27.199999999953434
        },
        "replace": {
          "emitP50": 8.70000000006985,
          "emitP95": 25,
          "domP50": 9.099999999976717,
          "domP95": 25.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.199999999953434,
          "lagP95": 21.900000000023283,
          "endLag": 7.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 5.560802459716797,
        "heapCode": 3.036487579345703,
        "heapData": 2.0688743591308594,
        "pssTotalMb": 237.5908203125,
        "pssApp": 132.8720703125,
        "pssRenderer": 104.71875,
        "control": {
          "emitP50": 6.099999999976717,
          "emitP95": 20.199999999953434,
          "domP50": 6.400000000023283,
          "domP95": 20.5
        },
        "fCommitP50": 3.199999999953434,
        "fCommitP95": 4.399999999906868
      },
      "5000": {
        "setKey": {
          "emitP50": 11.5,
          "emitP95": 25.099999999976717,
          "domP50": 12.099999999976717,
          "domP95": 25.699999999953434
        },
        "setKeys": {
          "emitP50": 10.199999999953434,
          "emitP95": 30.400000000023283,
          "domP50": 11.20000000006985,
          "domP95": 30.70000000006985
        },
        "replace": {
          "emitP50": 12.300000000046566,
          "emitP95": 25.20000000006985,
          "domP50": 13.600000000093132,
          "domP95": 25.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 11.199999999953434,
          "lagP95": 23.29999999993015,
          "endLag": 10.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.96139907836914,
        "heapCode": 3.102489471435547,
        "heapData": 6.260749816894531,
        "pssTotalMb": 251.5888671875,
        "pssApp": 141.6875,
        "pssRenderer": 109.9013671875,
        "control": {
          "emitP50": 9.29999999993015,
          "emitP95": 16.29999999993015,
          "domP50": 9.699999999953434,
          "domP95": 16.599999999976717
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 5.299999999930151
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 10.29999999993015,
        "emitP95": 19.400000000023283,
        "domP50": 11.599999999976717,
        "domP95": 20
      },
      "edit_d4": {
        "emitP50": 10.599999999976717,
        "emitP95": 26.599999999976717,
        "domP50": 11.099999999976717,
        "domP95": 27
      },
      "edit_d10": {
        "emitP50": 8.599999999976717,
        "emitP95": 18.400000000023283,
        "domP50": 9,
        "domP95": 18.800000000046566
      },
      "loadCycle": {
        "emitP50": 15.20000000006985,
        "emitP95": 54.40000000002328,
        "domP50": 15.300000000046566,
        "domP95": 54.699999999953434
      },
      "step": {
        "emitP50": 7.599999999976717,
        "emitP95": 29.400000000023283,
        "domP50": 8.099999999976717,
        "domP95": 29.699999999953434
      },
      "reset": {
        "emitP50": 25.900000000023283,
        "emitP95": 99.19999999995343,
        "domP50": 26,
        "domP95": 100
      },
      "append100": {
        "emitP50": 14.399999999906868,
        "emitP95": 25.599999999976717,
        "domP50": 14.699999999953434,
        "domP95": 25.900000000023283
      },
      "control": {
        "emitP50": 7,
        "emitP95": 33.5,
        "domP50": 7.400000000023283,
        "domP95": 33.79999999993015
      },
      "heapMb": 5.5053863525390625,
      "heapCode": 3.1892318725585938,
      "heapData": 1.8684883117675781,
      "pssTotalMb": 242.2900390625,
      "pssApp": 136.349609375,
      "pssRenderer": 105.9404296875,
      "relaunchReadyMs": 481.5999999999767,
      "relaunchHeapMb": 4.478553771972656,
      "relaunchHeapCode": 2.3318862915039062,
      "relaunchHeapData": 1.768798828125
    }
  }
]
```
</details>
