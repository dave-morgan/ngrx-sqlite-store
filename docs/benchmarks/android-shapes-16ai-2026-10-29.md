# Phase 16 shapes — flat objects & hybrid workflow (2026-10-28)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.69 ms, p95 10.93 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 52 / CODE-BOUND 0 / FAIL 33

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.38 ± 0.04 | 9.66 ± 1.43 | 25.4× | FAIL | allow 8.9 (control emitP50 7.4×1) |
| flat | 50.setKey.emitP95 | 1.04 ± 0.39 | 22.68 ± 5.81 | 21.8× | PLATFORM-BOUND | allow 24.5 (control emitP95 18.3×1) |
| flat | 50.setKey.domP50 | 3.30 ± 1.68 | 10.32 ± 1.49 | 3.1× | PLATFORM-BOUND | allow 10.9 (control domP50 7.7×1) |
| flat | 50.setKey.domP95 | 9.70 ± 2.50 | 23.32 ± 5.84 | 2.4× | PLATFORM-BOUND | allow 27.0 (control domP95 18.6×1) |
| flat | 50.setKeys.emitP50 | 0.38 ± 0.04 | 9.84 ± 1.29 | 25.9× | FAIL | allow 8.7 (control emitP50 7.4×1) |
| flat | 50.setKeys.emitP95 | 3.56 ± 3.27 | 24.22 ± 6.27 | 6.8× | PLATFORM-BOUND | allow 27.9 (control emitP95 18.3×1) |
| flat | 50.setKeys.domP50 | 3.34 ± 1.59 | 10.60 ± 1.22 | 3.2× | PLATFORM-BOUND | allow 10.5 (control domP50 7.7×1) |
| flat | 50.setKeys.domP95 | 9.56 ± 1.62 | 25.10 ± 6.87 | 2.6× | PLATFORM-BOUND | allow 27.1 (control domP95 18.6×1) |
| flat | 50.replace.emitP50 | 0.36 ± 0.05 | 8.70 ± 1.14 | 24.2× | PLATFORM-BOUND | allow 8.6 (control emitP50 7.4×1) |
| flat | 50.replace.emitP95 | 3.32 ± 4.34 | 22.06 ± 2.83 | 6.6× | PLATFORM-BOUND | allow 25.5 (control emitP95 18.3×1) |
| flat | 50.replace.domP50 | 1.86 ± 0.74 | 9.12 ± 1.03 | 4.9× | PLATFORM-BOUND | allow 9.5 (control domP50 7.7×1) |
| flat | 50.replace.domP95 | 10.08 ± 0.97 | 22.58 ± 3.03 | 2.2× | PLATFORM-BOUND | allow 22.6 (control domP95 18.6×1) |
| flat | 50.burst.lagP50 | 0.32 ± 0.04 | 6.98 ± 0.80 | 21.8× | PLATFORM-BOUND | allow 8.2 (control emitP50 7.4×1) |
| flat | 50.burst.lagP95 | 0.74 ± 0.13 | 16.48 ± 4.30 | 22.3× | PLATFORM-BOUND | allow 22.8 (control emitP95 18.3×1) |
| flat | 50.burst.endLag | 0.32 ± 0.04 | 6.94 ± 0.74 | 21.7× | PLATFORM-BOUND | allow 8.2 (control emitP50 7.4×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.40 ± 0.55 | 2400000000.0× | FAIL |  |
| flat | 50.heapMb | 3.66 ± 0.09 | 5.07 ± 0.01 | 1.4× | FAIL | code +1.23 MB; data 1.50 -> 1.62 MB |
| flat | 50.pssTotalMb | 223.27 ± 1.03 | 236.26 ± 0.98 | 1.1× | FAIL | allow 4.9 (plugin baseline 2.9 MB) |
| flat | 500.setKey.emitP50 | 0.46 ± 0.05 | 10.20 ± 1.01 | 22.2× | FAIL | allow 8.1 (control emitP50 7.1×1) |
| flat | 500.setKey.emitP95 | 1.22 ± 0.64 | 23.86 ± 4.77 | 19.6× | PLATFORM-BOUND | allow 23.3 (control emitP95 17.9×1) |
| flat | 500.setKey.domP50 | 4.38 ± 1.73 | 10.96 ± 1.09 | 2.5× | PLATFORM-BOUND | allow 10.3 (control domP50 7.4×1) |
| flat | 500.setKey.domP95 | 8.46 ± 1.94 | 24.74 ± 4.85 | 2.9× | PLATFORM-BOUND | allow 25.0 (control domP95 18.2×1) |
| flat | 500.setKeys.emitP50 | 0.48 ± 0.08 | 10.76 ± 0.80 | 22.4× | FAIL | allow 7.9 (control emitP50 7.1×1) |
| flat | 500.setKeys.emitP95 | 2.42 ± 1.19 | 26.54 ± 3.97 | 11.0× | FAIL | allow 23.0 (control emitP95 17.9×1) |
| flat | 500.setKeys.domP50 | 3.00 ± 2.28 | 11.26 ± 0.76 | 3.8× | PLATFORM-BOUND | allow 10.5 (control domP50 7.4×1) |
| flat | 500.setKeys.domP95 | 11.00 ± 4.71 | 27.32 ± 3.97 | 2.5× | PLATFORM-BOUND | allow 26.9 (control domP95 18.2×1) |
| flat | 500.replace.emitP50 | 0.32 ± 0.04 | 9.88 ± 0.70 | 30.9× | FAIL | allow 7.8 (control emitP50 7.1×1) |
| flat | 500.replace.emitP95 | 2.74 ± 2.13 | 22.92 ± 1.95 | 8.4× | PLATFORM-BOUND | allow 22.0 (control emitP95 17.9×1) |
| flat | 500.replace.domP50 | 2.08 ± 0.84 | 10.76 ± 0.96 | 5.2× | PLATFORM-BOUND | allow 9.2 (control domP50 7.4×1) |
| flat | 500.replace.domP95 | 10.32 ± 3.89 | 23.94 ± 2.67 | 2.3× | PLATFORM-BOUND | allow 24.8 (control domP95 18.2×1) |
| flat | 500.burst.lagP50 | 0.42 ± 0.04 | 8.78 ± 2.36 | 20.9× | PLATFORM-BOUND | allow 9.5 (control emitP50 7.1×1) |
| flat | 500.burst.lagP95 | 1.16 ± 0.69 | 20.74 ± 4.49 | 17.9× | PLATFORM-BOUND | allow 23.1 (control emitP95 17.9×1) |
| flat | 500.burst.endLag | 0.80 ± 0.89 | 8.34 ± 1.39 | 10.4× | PLATFORM-BOUND | allow 9.3 (control emitP50 7.1×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.60 ± 0.55 | 2600000000.0× | FAIL |  |
| flat | 500.heapMb | 4.07 ± 0.09 | 5.56 ± 0.01 | 1.4× | FAIL | code +1.24 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 226.74 ± 2.74 | 236.06 ± 1.82 | 1.0× | FAIL | allow 7.5 (plugin baseline 2.9 MB) |
| flat | 5000.setKey.emitP50 | 1.44 ± 0.15 | 10.74 ± 0.81 | 7.5× | FAIL | allow 7.7 (control emitP50 6.8×1) |
| flat | 5000.setKey.emitP95 | 2.88 ± 1.99 | 20.98 ± 1.03 | 7.3× | PLATFORM-BOUND | allow 23.2 (control emitP95 20.1×1) |
| flat | 5000.setKey.domP50 | 5.70 ± 1.72 | 12.26 ± 0.65 | 2.2× | PLATFORM-BOUND | allow 9.7 (control domP50 7.3×1) |
| flat | 5000.setKey.domP95 | 9.66 ± 2.50 | 23.02 ± 1.21 | 2.4× | PLATFORM-BOUND | allow 24.2 (control domP95 20.5×1) |
| flat | 5000.setKeys.emitP50 | 1.60 ± 0.14 | 10.10 ± 0.88 | 6.3× | FAIL | allow 7.8 (control emitP50 6.8×1) |
| flat | 5000.setKeys.emitP95 | 7.90 ± 2.68 | 21.72 ± 2.19 | 2.7× | PLATFORM-BOUND | allow 25.0 (control emitP95 20.1×1) |
| flat | 5000.setKeys.domP50 | 4.40 ± 1.51 | 11.76 ± 1.22 | 2.7× | PLATFORM-BOUND | allow 10.1 (control domP50 7.3×1) |
| flat | 5000.setKeys.domP95 | 11.48 ± 1.04 | 23.06 ± 1.94 | 2.0× | PLATFORM-BOUND | allow 23.5 (control domP95 20.5×1) |
| flat | 5000.replace.emitP50 | 0.38 ± 0.04 | 12.74 ± 0.62 | 33.5× | FAIL | allow 7.4 (control emitP50 6.8×1) |
| flat | 5000.replace.emitP95 | 4.14 ± 5.72 | 22.46 ± 4.69 | 5.4× | PLATFORM-BOUND | allow 30.5 (control emitP95 20.1×1) |
| flat | 5000.replace.domP50 | 1.76 ± 0.15 | 14.34 ± 1.09 | 8.1× | FAIL | allow 8.6 (control domP50 7.3×1) |
| flat | 5000.replace.domP95 | 10.16 ± 4.09 | 23.52 ± 4.83 | 2.3× | PLATFORM-BOUND | allow 29.4 (control domP95 20.5×1) |
| flat | 5000.burst.lagP50 | 1.44 ± 0.05 | 8.98 ± 0.31 | 6.2× | FAIL | allow 7.1 (control emitP50 6.8×1) |
| flat | 5000.burst.lagP95 | 2.20 ± 0.19 | 16.96 ± 2.54 | 7.7× | PLATFORM-BOUND | allow 22.9 (control emitP95 20.1×1) |
| flat | 5000.burst.endLag | 1.30 ± 0.41 | 7.74 ± 1.09 | 6.0× | PLATFORM-BOUND | allow 8.3 (control emitP50 6.8×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.00 ± 0.09 | 9.94 ± 0.01 | 1.2× | FAIL | code +1.33 MB; data 5.72 -> 6.26 MB |
| flat | 5000.pssTotalMb | 231.32 ± 2.18 | 250.35 ± 3.14 | 1.1× | FAIL | allow 8.2 (plugin baseline 2.9 MB) |
| workflow | edit_d1.emitP50 | 0.38 ± 0.08 | 9.10 ± 0.93 | 23.9× | FAIL | allow 8.3 (control emitP50 7.3×1) |
| workflow | edit_d1.emitP95 | 0.90 ± 0.42 | 22.86 ± 3.75 | 25.4× | PLATFORM-BOUND | allow 25.6 (control emitP95 21.5×1) |
| workflow | edit_d1.domP50 | 5.00 ± 1.57 | 9.94 ± 0.65 | 2.0× | PLATFORM-BOUND | allow 10.0 (control domP50 7.7×1) |
| workflow | edit_d1.domP95 | 7.82 ± 1.58 | 23.76 ± 4.22 | 3.0× | PLATFORM-BOUND | allow 27.6 (control domP95 21.8×1) |
| workflow | edit_d4.emitP50 | 0.36 ± 0.05 | 8.82 ± 1.07 | 24.5× | FAIL | allow 8.4 (control emitP50 7.3×1) |
| workflow | edit_d4.emitP95 | 0.88 ± 0.41 | 20.18 ± 1.13 | 22.9× | PLATFORM-BOUND | allow 23.0 (control emitP95 21.5×1) |
| workflow | edit_d4.domP50 | 4.12 ± 1.84 | 9.32 ± 0.95 | 2.3× | PLATFORM-BOUND | allow 10.5 (control domP50 7.7×1) |
| workflow | edit_d4.domP95 | 8.22 ± 2.59 | 20.70 ± 1.22 | 2.5× | PLATFORM-BOUND | allow 25.6 (control domP95 21.8×1) |
| workflow | edit_d10.emitP50 | 0.42 ± 0.04 | 8.34 ± 0.59 | 19.9× | FAIL | allow 7.9 (control emitP50 7.3×1) |
| workflow | edit_d10.emitP95 | 2.40 ± 1.91 | 16.64 ± 2.39 | 6.9× | PLATFORM-BOUND | allow 25.8 (control emitP95 21.5×1) |
| workflow | edit_d10.domP50 | 4.06 ± 1.75 | 9.08 ± 0.30 | 2.2× | PLATFORM-BOUND | allow 9.8 (control domP50 7.7×1) |
| workflow | edit_d10.domP95 | 8.88 ± 1.75 | 17.72 ± 2.35 | 2.0× | PLATFORM-BOUND | allow 25.9 (control domP95 21.8×1) |
| workflow | loadCycle.emitP50 | 0.54 ± 0.09 | 14.36 ± 6.25 | 26.6× | PLATFORM-BOUND | allow 20.9 (control emitP50 7.3×2) |
| workflow | loadCycle.emitP95 | 35.54 ± 3.28 | 59.18 ± 10.79 | 1.7× | PLATFORM-BOUND | allow 57.0 (control emitP95 21.5×2) |
| workflow | loadCycle.domP50 | 0.84 ± 0.34 | 14.56 ± 6.26 | 17.3× | PLATFORM-BOUND | allow 22.1 (control domP50 7.7×2) |
| workflow | loadCycle.domP95 | 36.00 ± 3.31 | 59.76 ± 10.79 | 1.7× | PLATFORM-BOUND | allow 57.7 (control domP95 21.8×2) |
| workflow | step.emitP50 | 0.34 ± 0.05 | 9.10 ± 1.11 | 26.8× | FAIL | allow 8.4 (control emitP50 7.3×1) |
| workflow | step.emitP95 | 1.26 ± 0.83 | 30.88 ± 10.44 | 24.5× | PLATFORM-BOUND | allow 32.7 (control emitP95 21.5×1) |
| workflow | step.domP50 | 4.48 ± 0.91 | 9.56 ± 0.92 | 2.1× | PLATFORM-BOUND | allow 9.6 (control domP50 7.7×1) |
| workflow | step.domP95 | 9.06 ± 1.56 | 31.70 ± 10.69 | 3.5× | PLATFORM-BOUND | allow 34.1 (control domP95 21.8×1) |
| workflow | reset.emitP50 | 0.24 ± 0.05 | 29.52 ± 5.50 | 123.0× | FAIL | allow 12.8 (control emitP50 7.3×1) |
| workflow | reset.emitP95 | 0.64 ± 0.13 | 42.54 ± 6.58 | 66.5× | FAIL | allow 28.2 (control emitP95 21.5×1) |
| workflow | reset.domP50 | 0.24 ± 0.05 | 29.54 ± 5.54 | 123.1× | FAIL | allow 13.3 (control domP50 7.7×1) |
| workflow | reset.domP95 | 1.74 ± 0.91 | 42.60 ± 6.59 | 24.5× | FAIL | allow 29.3 (control domP95 21.8×1) |
| workflow | append100.emitP50 | 0.38 ± 0.04 | 14.04 ± 1.26 | 36.9× | FAIL | allow 8.6 (control emitP50 7.3×1) |
| workflow | append100.emitP95 | 0.72 ± 0.18 | 19.76 ± 4.32 | 27.4× | PLATFORM-BOUND | allow 26.0 (control emitP95 21.5×1) |
| workflow | append100.domP50 | 0.92 ± 0.08 | 14.78 ± 0.73 | 16.1× | FAIL | allow 8.5 (control domP50 7.7×1) |
| workflow | append100.domP95 | 4.98 ± 1.74 | 20.16 ± 4.27 | 4.0× | PLATFORM-BOUND | allow 27.8 (control domP95 21.8×1) |
| workflow | heapMb | 3.94 ± 0.00 | 5.50 ± 0.01 | 1.4× | FAIL | code +1.26 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 225.77 ± 1.65 | 241.58 ± 2.96 | 1.1× | FAIL | allow 7.5 (plugin baseline 2.9 MB) |
| workflow | relaunchReadyMs | 1585.62 ± 411.73 | 531.42 ± 198.39 | 0.3× | PASS |  |
| workflow | relaunchHeapMb | 3.35 ± 0.11 | 4.47 ± 0.08 | 1.3× | FAIL | code +0.75 MB; data 1.45 -> 1.81 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 7.40 | 7.70 | 18.62 | 9.66 | 10.32 | 23.32 |
| 500 | 7.06 | 7.44 | 18.24 | 10.20 | 10.96 | 24.74 |
| 5000 | 6.76 | 7.34 | 20.52 | 10.74 | 12.26 | 23.02 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 126.5 | 133.2 | 96.7 | 103.1 |
| flat 500 | 126.4 | 132.3 | 100.3 | 103.8 |
| flat 5000 | 126.6 | 141.1 | 104.7 | 109.2 |
| workflow | 127.2 | 136.4 | 98.6 | 105.1 |

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
          "emitP95": 0.9000000000232831,
          "domP50": 4.7999999999883585,
          "domP95": 7.2999999999883585
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.7000000000116415,
          "domP50": 4,
          "domP95": 10
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 1.3999999999650754,
          "domP50": 2,
          "domP95": 10.299999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.3999999999650754,
          "lagP95": 0.7999999999883585,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.7242393493652344,
        "heapCode": 1.8445205688476562,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 223.134765625,
        "pssApp": 126.5087890625,
        "pssRenderer": 96.6259765625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.5,
          "domP50": 2.7999999999883585,
          "domP95": 10
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.599999999976717,
          "domP50": 1.3999999999650754,
          "domP95": 10.700000000011642
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.2999999999883585,
          "domP50": 3.5,
          "domP95": 8.399999999965075
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7999999999883585,
          "endLag": 0.3999999999650754,
          "maxBacklog": 0
        },
        "heapMb": 3.9725723266601562,
        "heapCode": 1.6944198608398438,
        "heapData": 1.8917236328125,
        "pssTotalMb": 222.685546875,
        "pssApp": 124.0634765625,
        "pssRenderer": 98.6220703125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.2999999999883585,
          "emitP95": 1.8999999999650754,
          "domP50": 6.900000000023283,
          "domP95": 8
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 5.7999999999883585,
          "domP50": 7,
          "domP95": 10.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 14.100000000034925,
          "domP50": 1.7999999999883585,
          "domP95": 15.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.3999999999650754,
          "endLag": 1,
          "maxBacklog": 0
        },
        "heapMb": 7.939067840576172,
        "heapCode": 1.6922264099121094,
        "heapData": 5.722118377685547,
        "pssTotalMb": 228.2021484375,
        "pssApp": 125.0556640625,
        "pssRenderer": 103.146484375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.3999999999650754,
        "emitP95": 0.6999999999534339,
        "domP50": 5.7000000000116415,
        "domP95": 6.900000000023283
      },
      "edit_d4": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.40000000002328306,
        "domP50": 5.2000000000116415,
        "domP95": 6.5
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 3.900000000023283,
        "domP50": 5.400000000023283,
        "domP95": 8.700000000011642
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 32.699999999953434,
        "domP50": 1.400000000023283,
        "domP95": 33
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.9000000000232831,
        "domP50": 5,
        "domP95": 7.5
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 0.7000000000116415,
        "domP50": 0.20000000001164153,
        "domP95": 1.6000000000349246
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 1,
        "domP95": 6
      },
      "heapMb": 3.9332237243652344,
      "heapCode": 1.9221572875976562,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 223.5693359375,
      "pssApp": 126.0390625,
      "pssRenderer": 97.5302734375,
      "relaunchReadyMs": 1603.8000000000466,
      "relaunchHeapMb": 3.352100372314453,
      "relaunchHeapCode": 1.5400810241699219,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.399999999965075,
          "emitP95": 32.29999999998836,
          "domP50": 9,
          "domP95": 33
        },
        "setKeys": {
          "emitP50": 10.799999999988358,
          "emitP95": 17.400000000023283,
          "domP50": 11.399999999965075,
          "domP95": 17.900000000023283
        },
        "replace": {
          "emitP50": 8.700000000011642,
          "emitP95": 17.400000000023283,
          "domP50": 9.200000000011642,
          "domP95": 17.600000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.100000000034925,
          "lagP95": 17.29999999998836,
          "endLag": 6.699999999953434,
          "maxBacklog": 3
        },
        "heapMb": 5.0670928955078125,
        "heapCode": 3.0111961364746094,
        "heapData": 1.6160697937011719,
        "pssTotalMb": 235.8203125,
        "pssApp": 133.3232421875,
        "pssRenderer": 102.4970703125,
        "control": {
          "emitP50": 8.900000000023283,
          "emitP95": 24.300000000046566,
          "domP50": 9.200000000011642,
          "domP95": 24.800000000046566
        },
        "fCommitP50": 4.599999999976717,
        "fCommitP95": 12.700000000011642
      },
      "500": {
        "setKey": {
          "emitP50": 11.400000000023283,
          "emitP95": 27.29999999998836,
          "domP50": 12,
          "domP95": 27.79999999998836
        },
        "setKeys": {
          "emitP50": 11.099999999976717,
          "emitP95": 26.20000000001164,
          "domP50": 11.5,
          "domP95": 27.599999999976717
        },
        "replace": {
          "emitP50": 10.299999999988358,
          "emitP95": 24.600000000034925,
          "domP50": 11.099999999976717,
          "domP95": 25
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 12.800000000046566,
          "lagP95": 27.900000000023283,
          "endLag": 9.200000000011642,
          "maxBacklog": 3
        },
        "heapMb": 5.551074981689453,
        "heapCode": 3.0264015197753906,
        "heapData": 2.0690078735351562,
        "pssTotalMb": 234.7099609375,
        "pssApp": 131.779296875,
        "pssRenderer": 102.9306640625,
        "control": {
          "emitP50": 8.200000000011642,
          "emitP95": 25.79999999998836,
          "domP50": 8.400000000023283,
          "domP95": 26.099999999976717
        },
        "fCommitP50": 3.7999999999883585,
        "fCommitP95": 10.900000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 10,
          "emitP95": 20.79999999998836,
          "domP50": 11.399999999965075,
          "domP95": 22.5
        },
        "setKeys": {
          "emitP50": 10.200000000011642,
          "emitP95": 20.5,
          "domP50": 12.200000000011642,
          "domP95": 22.79999999998836
        },
        "replace": {
          "emitP50": 12,
          "emitP95": 21.79999999998836,
          "domP50": 13,
          "domP95": 22.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.900000000023283,
          "lagP95": 14.699999999953434,
          "endLag": 9.199999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.936656951904297,
        "heapCode": 3.0787696838378906,
        "heapData": 6.260688781738281,
        "pssTotalMb": 246.79296875,
        "pssApp": 138.4130859375,
        "pssRenderer": 108.3798828125,
        "control": {
          "emitP50": 9,
          "emitP95": 20.20000000001164,
          "domP50": 9.5,
          "domP95": 20.70000000001164
        },
        "fCommitP50": 3.7999999999883585,
        "fCommitP95": 13.100000000034925
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.899999999965075,
        "emitP95": 27.79999999998836,
        "domP50": 10.099999999976717,
        "domP95": 30.099999999976717
      },
      "edit_d4": {
        "emitP50": 7.800000000046566,
        "emitP95": 18.70000000001164,
        "domP50": 8.5,
        "domP95": 19
      },
      "edit_d10": {
        "emitP50": 9,
        "emitP95": 13.900000000023283,
        "domP50": 9.5,
        "domP95": 14.299999999988358
      },
      "loadCycle": {
        "emitP50": 6.900000000023283,
        "emitP95": 48.40000000002328,
        "domP50": 7.100000000034925,
        "domP95": 49.29999999998836
      },
      "step": {
        "emitP50": 7.399999999965075,
        "emitP95": 48.5,
        "domP50": 8.300000000046566,
        "domP95": 49.600000000034925
      },
      "reset": {
        "emitP50": 24.900000000023283,
        "emitP95": 39.70000000001164,
        "domP50": 24.900000000023283,
        "domP95": 39.70000000001164
      },
      "append100": {
        "emitP50": 12.199999999953434,
        "emitP95": 21.29999999998836,
        "domP50": 14.299999999988358,
        "domP95": 21.600000000034925
      },
      "control": {
        "emitP50": 7.400000000023283,
        "emitP95": 15.200000000011642,
        "domP50": 7.900000000023283,
        "domP95": 15.5
      },
      "heapMb": 5.507495880126953,
      "heapCode": 3.1812591552734375,
      "heapData": 1.8781929016113281,
      "pssTotalMb": 237.6240234375,
      "pssApp": 133.2275390625,
      "pssRenderer": 104.396484375,
      "relaunchReadyMs": 501.6000000000349,
      "relaunchHeapMb": 4.479198455810547,
      "relaunchHeapCode": 2.3315086364746094,
      "relaunchHeapData": 1.7693672180175781
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.100000000034925,
          "emitP95": 22.300000000046566,
          "domP50": 9.800000000046566,
          "domP95": 22.800000000046566
        },
        "setKeys": {
          "emitP50": 9.200000000011642,
          "emitP95": 29.20000000001164,
          "domP50": 10.599999999976717,
          "domP95": 29.600000000034925
        },
        "replace": {
          "emitP50": 7.2000000000116415,
          "emitP95": 23.100000000034925,
          "domP50": 7.7999999999883585,
          "domP95": 23.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.199999999953434,
          "lagP95": 11.799999999988358,
          "endLag": 6.5,
          "maxBacklog": 2
        },
        "heapMb": 5.072078704833984,
        "heapCode": 3.015270233154297,
        "heapData": 1.6161918640136719,
        "pssTotalMb": 235.09765625,
        "pssApp": 132.955078125,
        "pssRenderer": 102.142578125,
        "control": {
          "emitP50": 7.2000000000116415,
          "emitP95": 17.70000000001164,
          "domP50": 7.5,
          "domP95": 18
        },
        "fCommitP50": 3.7000000000116415,
        "fCommitP95": 7.5
      },
      "500": {
        "setKey": {
          "emitP50": 9.5,
          "emitP95": 22.79999999998836,
          "domP50": 10.099999999976717,
          "domP95": 23.399999999965075
        },
        "setKeys": {
          "emitP50": 10.599999999976717,
          "emitP95": 28.29999999993015,
          "domP50": 11.099999999976717,
          "domP95": 29
        },
        "replace": {
          "emitP50": 9.100000000093132,
          "emitP95": 22.800000000046566,
          "domP50": 10.199999999953434,
          "domP95": 23.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.599999999976717,
          "lagP95": 22.400000000023283,
          "endLag": 6.5,
          "maxBacklog": 2
        },
        "heapMb": 5.560520172119141,
        "heapCode": 3.03546142578125,
        "heapData": 2.0688133239746094,
        "pssTotalMb": 233.6474609375,
        "pssApp": 130.6044921875,
        "pssRenderer": 103.04296875,
        "control": {
          "emitP50": 6.900000000023283,
          "emitP95": 15.300000000046566,
          "domP50": 7.199999999953434,
          "domP95": 15.70000000006985
        },
        "fCommitP50": 3.5,
        "fCommitP95": 13.5
      },
      "5000": {
        "setKey": {
          "emitP50": 11,
          "emitP95": 22.70000000006985,
          "domP50": 12.599999999976717,
          "domP95": 24.599999999976717
        },
        "setKeys": {
          "emitP50": 10.899999999906868,
          "emitP95": 25.599999999976717,
          "domP50": 13.400000000023283,
          "domP95": 26.399999999906868
        },
        "replace": {
          "emitP50": 12.399999999906868,
          "emitP95": 20.900000000023283,
          "domP50": 15.29999999993015,
          "domP95": 22.100000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.699999999953434,
          "lagP95": 14.70000000006985,
          "endLag": 6.399999999906868,
          "maxBacklog": 2
        },
        "heapMb": 9.935832977294922,
        "heapCode": 3.0777626037597656,
        "heapData": 6.260688781738281,
        "pssTotalMb": 247.181640625,
        "pssApp": 138.5986328125,
        "pssRenderer": 108.5830078125,
        "control": {
          "emitP50": 5.800000000046566,
          "emitP95": 19,
          "domP50": 6.900000000023283,
          "domP95": 19.400000000023283
        },
        "fCommitP50": 3.5,
        "fCommitP95": 14.800000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.699999999953434,
        "emitP95": 24.099999999976717,
        "domP50": 10.199999999953434,
        "domP95": 24.400000000023283
      },
      "edit_d4": {
        "emitP50": 10.300000000046566,
        "emitP95": 20.5,
        "domP50": 10.70000000006985,
        "domP95": 21.20000000006985
      },
      "edit_d10": {
        "emitP50": 8.300000000046566,
        "emitP95": 15.29999999993015,
        "domP50": 8.900000000023283,
        "domP95": 19.29999999993015
      },
      "loadCycle": {
        "emitP50": 9.300000000046566,
        "emitP95": 54.90000000002328,
        "domP50": 9.5,
        "domP95": 55.199999999953434
      },
      "step": {
        "emitP50": 9.699999999953434,
        "emitP95": 28.599999999976717,
        "domP50": 10,
        "domP95": 30.400000000023283
      },
      "reset": {
        "emitP50": 29.199999999953434,
        "emitP95": 42.59999999997672,
        "domP50": 29.199999999953434,
        "domP95": 42.59999999997672
      },
      "append100": {
        "emitP50": 14.899999999906868,
        "emitP95": 18.79999999993015,
        "domP50": 15.400000000023283,
        "domP95": 19.5
      },
      "control": {
        "emitP50": 6.699999999953434,
        "emitP95": 20,
        "domP50": 7.300000000046566,
        "domP95": 20.29999999993015
      },
      "heapMb": 5.495800018310547,
      "heapCode": 3.1793365478515625,
      "heapData": 1.8684501647949219,
      "pssTotalMb": 239.279296875,
      "pssApp": 134.978515625,
      "pssRenderer": 104.30078125,
      "relaunchReadyMs": 406.9000000000233,
      "relaunchHeapMb": 4.535083770751953,
      "relaunchHeapCode": 2.3253707885742188,
      "relaunchHeapData": 1.8312530517578125
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.5,
          "domP50": 2.099999999976717,
          "domP95": 10.300000000046566
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7000000000698492,
          "domP50": 3.699999999953434,
          "domP95": 10.699999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 11,
          "domP50": 1.900000000023283,
          "domP95": 11.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.7999999999301508,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.7240257263183594,
        "heapCode": 1.844329833984375,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 222.740234375,
        "pssApp": 125.9736328125,
        "pssRenderer": 96.7666015625
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.5999999999767169,
          "domP50": 5.599999999976717,
          "domP95": 6.799999999930151
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.099999999976717,
          "domP50": 4.899999999906868,
          "domP95": 19
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 5.899999999906868,
          "domP50": 2.1000000000931323,
          "domP95": 6.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.5,
          "lagP95": 0.9000000000232831,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.133602142333984,
        "heapCode": 1.8506584167480469,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 226.66015625,
        "pssApp": 126.451171875,
        "pssRenderer": 100.208984375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 2.5,
          "domP50": 3.400000000023283,
          "domP95": 10.5
        },
        "setKeys": {
          "emitP50": 1.7000000000698492,
          "emitP95": 10.5,
          "domP50": 3.5,
          "domP95": 12.900000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6000000000931323,
          "domP50": 1.599999999976717,
          "domP95": 6.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.09926986694336,
        "heapCode": 1.8476943969726562,
        "heapData": 5.725063323974609,
        "pssTotalMb": 230.9521484375,
        "pssApp": 126.1162109375,
        "pssRenderer": 104.8359375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.3000000000465661,
        "domP50": 5.5,
        "domP95": 10.5
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 1.3000000000465661,
        "domP95": 7
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1000000000931323,
        "domP50": 2.400000000023283,
        "domP95": 6.900000000023283
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 34.59999999997672,
        "domP50": 0.9000000000232831,
        "domP95": 35.300000000046566
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.599999999976717,
        "domP50": 4.400000000023283,
        "domP95": 11.099999999976717
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.6999999999534339,
        "domP50": 0.30000000004656613,
        "domP95": 3.299999999930151
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 1,
        "domP95": 6.399999999906868
      },
      "heapMb": 3.936309814453125,
      "heapCode": 1.9245719909667969,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 224.4345703125,
      "pssApp": 126.58203125,
      "pssRenderer": 97.8525390625,
      "relaunchReadyMs": 1646.0999999999767,
      "relaunchHeapMb": 3.258190155029297,
      "relaunchHeapCode": 1.4549140930175781,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8000000000465661,
          "domP50": 1.7000000000698492,
          "domP95": 12.5
        },
        "setKeys": {
          "emitP50": 0.39999999990686774,
          "emitP95": 8.599999999976717,
          "domP50": 5.200000000069849,
          "domP95": 11.20000000006985
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.9000000000232831,
          "domP50": 1.1000000000931323,
          "domP95": 9.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.5638351440429688,
        "heapCode": 1.6888885498046875,
        "heapData": 1.5024337768554688,
        "pssTotalMb": 222.7861328125,
        "pssApp": 126.58203125,
        "pssRenderer": 96.2041015625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 2.200000000069849,
          "domP50": 5.5,
          "domP95": 8.099999999976717
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 0.9000000000232831,
          "domP50": 1.099999999976717,
          "domP95": 6.700000000069849
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1,
          "domP50": 1.3000000000465661,
          "domP95": 16.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 2.400000000023283,
          "endLag": 2.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 4.135356903076172,
        "heapCode": 1.8522071838378906,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 229.7197265625,
        "pssApp": 128.2705078125,
        "pssRenderer": 101.44921875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.3000000000465661,
          "emitP95": 1.6999999999534339,
          "domP50": 7,
          "domP95": 8
        },
        "setKeys": {
          "emitP50": 1.8000000000465661,
          "emitP95": 10.29999999993015,
          "domP50": 3.300000000046566,
          "domP95": 12.099999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 3.900000000023283,
          "domP50": 1.900000000023283,
          "domP95": 12
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.400000000023283,
          "endLag": 1.1000000000931323,
          "maxBacklog": 0
        },
        "heapMb": 7.938961029052734,
        "heapCode": 1.6921195983886719,
        "heapData": 5.722118377685547,
        "pssTotalMb": 231.8642578125,
        "pssApp": 127.244140625,
        "pssRenderer": 104.6201171875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 5.699999999953434,
        "domP95": 6.5
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.5,
        "domP50": 3.199999999953434,
        "domP95": 7.5
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 1.900000000023283,
        "domP95": 8.800000000046566
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 32.40000000002328,
        "domP50": 0.5,
        "domP95": 32.79999999993015
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7000000000698492,
        "domP50": 5.400000000023283,
        "domP95": 8
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.5,
        "domP50": 0.2999999999301508,
        "domP95": 1.1000000000931323
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7000000000698492,
        "domP50": 0.9000000000232831,
        "domP95": 5.300000000046566
      },
      "heapMb": 3.9364585876464844,
      "heapCode": 1.9245681762695312,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.8037109375,
      "pssApp": 127.3701171875,
      "pssRenderer": 99.43359375,
      "relaunchReadyMs": 944.5999999999767,
      "relaunchHeapMb": 3.258106231689453,
      "relaunchHeapCode": 1.4549064636230469,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.599999999976717,
          "emitP95": 16.900000000023283,
          "domP50": 10.5,
          "domP95": 17.5
        },
        "setKeys": {
          "emitP50": 9.400000000023283,
          "emitP95": 22.5,
          "domP50": 9.900000000023283,
          "domP95": 23
        },
        "replace": {
          "emitP50": 9.29999999993015,
          "emitP95": 21.70000000006985,
          "domP50": 9.599999999976717,
          "domP95": 22.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.700000000069849,
          "lagP95": 23.20000000006985,
          "endLag": 8.099999999976717,
          "maxBacklog": 3
        },
        "heapMb": 5.069911956787109,
        "heapCode": 3.0136566162109375,
        "heapData": 1.6163177490234375,
        "pssTotalMb": 235.826171875,
        "pssApp": 132.3583984375,
        "pssRenderer": 103.4677734375,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 16.20000000006985,
          "domP50": 6.599999999976717,
          "domP95": 16.400000000023283
        },
        "fCommitP50": 3.5,
        "fCommitP95": 12.100000000093132
      },
      "500": {
        "setKey": {
          "emitP50": 8.900000000023283,
          "emitP95": 21,
          "domP50": 9.5,
          "domP95": 22.300000000046566
        },
        "setKeys": {
          "emitP50": 9.600000000093132,
          "emitP95": 19.899999999906868,
          "domP50": 10.20000000006985,
          "domP95": 20.5
        },
        "replace": {
          "emitP50": 10.79999999993015,
          "emitP95": 19.900000000023283,
          "domP50": 12.199999999953434,
          "domP95": 20.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.5,
          "lagP95": 18.400000000023283,
          "endLag": 9.599999999976717,
          "maxBacklog": 3
        },
        "heapMb": 5.562511444091797,
        "heapCode": 3.036651611328125,
        "heapData": 2.0692977905273438,
        "pssTotalMb": 236.55859375,
        "pssApp": 132.16015625,
        "pssRenderer": 104.3984375,
        "control": {
          "emitP50": 5.800000000046566,
          "emitP95": 12.900000000023283,
          "domP50": 6.399999999906868,
          "domP95": 13.29999999993015
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 9
      },
      "5000": {
        "setKey": {
          "emitP50": 11.20000000006985,
          "emitP95": 20.800000000046566,
          "domP50": 12.300000000046566,
          "domP95": 24
        },
        "setKeys": {
          "emitP50": 11,
          "emitP95": 20.900000000023283,
          "domP50": 12,
          "domP95": 22.199999999953434
        },
        "replace": {
          "emitP50": 12.599999999976717,
          "emitP95": 22.900000000023283,
          "domP50": 13.5,
          "domP95": 24
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.800000000046566,
          "lagP95": 16.300000000046566,
          "endLag": 7.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.937828063964844,
        "heapCode": 3.0792579650878906,
        "heapData": 6.260993957519531,
        "pssTotalMb": 253.6083984375,
        "pssApp": 143.865234375,
        "pssRenderer": 109.7431640625,
        "control": {
          "emitP50": 7.800000000046566,
          "emitP95": 16.29999999993015,
          "domP50": 8.100000000093132,
          "domP95": 16.599999999976717
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 9.800000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.900000000023283,
        "emitP95": 24.099999999976717,
        "domP50": 9.400000000023283,
        "domP95": 24.5
      },
      "edit_d4": {
        "emitP50": 8.199999999953434,
        "emitP95": 21.79999999993015,
        "domP50": 8.599999999976717,
        "domP95": 22.29999999993015
      },
      "edit_d10": {
        "emitP50": 8.599999999976717,
        "emitP95": 15.800000000046566,
        "domP50": 9.29999999993015,
        "domP95": 16.300000000046566
      },
      "loadCycle": {
        "emitP50": 21.599999999976717,
        "emitP95": 77.20000000006985,
        "domP50": 21.900000000023283,
        "domP95": 77.90000000002328
      },
      "step": {
        "emitP50": 10.399999999906868,
        "emitP95": 28.699999999953434,
        "domP50": 10.800000000046566,
        "domP95": 28.900000000023283
      },
      "reset": {
        "emitP50": 38.40000000002328,
        "emitP95": 53.39999999990687,
        "domP50": 38.5,
        "domP95": 53.5
      },
      "append100": {
        "emitP50": 14.599999999976717,
        "emitP95": 18.5,
        "domP50": 14.900000000023283,
        "domP95": 18.800000000046566
      },
      "control": {
        "emitP50": 7.400000000023283,
        "emitP95": 21.900000000023283,
        "domP50": 7.800000000046566,
        "domP95": 22.20000000006985
      },
      "heapMb": 5.4900360107421875,
      "heapCode": 3.175811767578125,
      "heapData": 1.8662490844726562,
      "pssTotalMb": 243.8759765625,
      "pssApp": 138.4296875,
      "pssRenderer": 105.4462890625,
      "relaunchReadyMs": 418.5999999999767,
      "relaunchHeapMb": 4.47930908203125,
      "relaunchHeapCode": 2.331523895263672,
      "relaunchHeapData": 1.7694625854492188
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 12.099999999976717,
          "emitP95": 22.199999999953434,
          "domP50": 12.79999999993015,
          "domP95": 22.900000000023283
        },
        "setKeys": {
          "emitP50": 8.29999999993015,
          "emitP95": 32.199999999953434,
          "domP50": 9,
          "domP95": 34.59999999997672
        },
        "replace": {
          "emitP50": 10.199999999953434,
          "emitP95": 23.300000000046566,
          "domP50": 10.5,
          "domP95": 23.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.5,
          "lagP95": 16.099999999976717,
          "endLag": 6.199999999953434,
          "maxBacklog": 2
        },
        "heapMb": 5.07220458984375,
        "heapCode": 3.0151824951171875,
        "heapData": 1.6163444519042969,
        "pssTotalMb": 237.212890625,
        "pssApp": 133.5458984375,
        "pssRenderer": 103.6669921875,
        "control": {
          "emitP50": 8,
          "emitP95": 18,
          "domP50": 8.399999999906868,
          "domP95": 18.199999999953434
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 9.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 10.899999999906868,
          "emitP95": 30,
          "domP50": 11.699999999953434,
          "domP95": 31.29999999993015
        },
        "setKeys": {
          "emitP50": 10.70000000006985,
          "emitP95": 28.100000000093132,
          "domP50": 11.20000000006985,
          "domP95": 28.800000000046566
        },
        "replace": {
          "emitP50": 9.300000000046566,
          "emitP95": 22.600000000093132,
          "domP50": 9.699999999953434,
          "domP95": 23.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.100000000093132,
          "lagP95": 17.79999999993015,
          "endLag": 9.20000000006985,
          "maxBacklog": 2
        },
        "heapMb": 5.551395416259766,
        "heapCode": 3.0267257690429688,
        "heapData": 2.0690040588378906,
        "pssTotalMb": 237.5029296875,
        "pssApp": 133.32421875,
        "pssRenderer": 104.1787109375,
        "control": {
          "emitP50": 6.399999999906868,
          "emitP95": 17.400000000023283,
          "domP50": 6.799999999930151,
          "domP95": 17.600000000093132
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 8.5
      },
      "5000": {
        "setKey": {
          "emitP50": 9.79999999993015,
          "emitP95": 19.900000000023283,
          "domP50": 11.899999999906868,
          "domP95": 22.20000000006985
        },
        "setKeys": {
          "emitP50": 9.300000000046566,
          "emitP95": 21.20000000006985,
          "domP50": 11,
          "domP95": 22.5
        },
        "replace": {
          "emitP50": 13.599999999976717,
          "emitP95": 29.79999999993015,
          "domP50": 15.5,
          "domP95": 31.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.5,
          "lagP95": 20.5,
          "endLag": 8.20000000006985,
          "maxBacklog": 2
        },
        "heapMb": 9.945842742919922,
        "heapCode": 3.0867042541503906,
        "heapData": 6.260547637939453,
        "pssTotalMb": 252.0849609375,
        "pssApp": 142.43359375,
        "pssRenderer": 109.6513671875,
        "control": {
          "emitP50": 5.899999999906868,
          "emitP95": 19.79999999993015,
          "domP50": 6.299999999930151,
          "domP95": 20.099999999976717
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 9.899999999906868
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.70000000006985,
        "emitP95": 19.900000000023283,
        "domP50": 9.20000000006985,
        "domP95": 20.20000000006985
      },
      "edit_d4": {
        "emitP50": 8.199999999953434,
        "emitP95": 19.70000000006985,
        "domP50": 8.900000000023283,
        "domP95": 20.20000000006985
      },
      "edit_d10": {
        "emitP50": 8.400000000023283,
        "emitP95": 19.70000000006985,
        "domP50": 8.800000000046566,
        "domP95": 19.900000000023283
      },
      "loadCycle": {
        "emitP50": 14.900000000023283,
        "emitP95": 58.699999999953434,
        "domP50": 15.099999999976717,
        "domP95": 59.09999999997672
      },
      "step": {
        "emitP50": 9,
        "emitP95": 28.099999999976717,
        "domP50": 9.29999999993015,
        "domP95": 28.79999999993015
      },
      "reset": {
        "emitP50": 30.100000000093132,
        "emitP95": 35.800000000046566,
        "domP50": 30.100000000093132,
        "domP95": 35.90000000002328
      },
      "append100": {
        "emitP50": 13.300000000046566,
        "emitP95": 14.20000000006985,
        "domP50": 13.800000000046566,
        "domP95": 14.600000000093132
      },
      "control": {
        "emitP50": 8,
        "emitP95": 24.5,
        "domP50": 8.400000000023283,
        "domP95": 25
      },
      "heapMb": 5.508907318115234,
      "heapCode": 3.1829833984375,
      "heapData": 1.8775825500488281,
      "pssTotalMb": 242.8408203125,
      "pssApp": 137.3251953125,
      "pssRenderer": 105.515625,
      "relaunchReadyMs": 449.80000000004657,
      "relaunchHeapMb": 4.534721374511719,
      "relaunchHeapCode": 2.3252944946289062,
      "relaunchHeapData": 1.8309059143066406
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5999999999767169,
          "domP50": 5.400000000023283,
          "domP95": 6.900000000023283
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5999999999767169,
          "domP50": 0.9000000000232831,
          "domP95": 8.70000000006985
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.400000000023283,
          "domP50": 3,
          "domP95": 9
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.9000000000232831,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.722850799560547,
        "heapCode": 1.8432884216308594,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 225.0791015625,
        "pssApp": 127.2373046875,
        "pssRenderer": 97.841796875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 0.8999999999068677,
          "domP50": 2.199999999953434,
          "domP95": 10.899999999906868
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 3.900000000023283,
          "domP50": 1.599999999976717,
          "domP95": 8.79999999993015
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4,
          "domP50": 1.7000000000698492,
          "domP95": 8.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7999999999301508,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.9746627807617188,
        "heapCode": 1.6965103149414062,
        "heapData": 1.8917236328125,
        "pssTotalMb": 225.9326171875,
        "pssApp": 126.2802734375,
        "pssRenderer": 99.65234375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 6.399999999906868,
          "domP50": 4.300000000046566,
          "domP95": 13.699999999953434
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 8.399999999906868,
          "domP50": 3.800000000046566,
          "domP95": 10.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.3000000000465661,
          "domP50": 1.900000000023283,
          "domP95": 11.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.099999999976717,
          "endLag": 1.3000000000465661,
          "maxBacklog": 0
        },
        "heapMb": 8.097496032714844,
        "heapCode": 1.8453865051269531,
        "heapData": 5.725620269775391,
        "pssTotalMb": 234.291015625,
        "pssApp": 128.20703125,
        "pssRenderer": 106.083984375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 5.899999999906868,
        "domP95": 7.800000000046566
      },
      "edit_d4": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7000000000698492,
        "domP50": 5.5,
        "domP95": 7.300000000046566
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 5.400000000023283,
        "domP95": 8.300000000046566
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 38.60000000009313,
        "domP50": 0.6999999999534339,
        "domP95": 39.10000000009313
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 1.5,
        "domP50": 3,
        "domP95": 10.29999999993015
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.8000000000465661,
        "domP50": 0.2000000000698492,
        "domP95": 1.599999999976717
      },
      "append100": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.7000000000698492,
        "domP50": 0.8000000000465661,
        "domP95": 5.200000000069849
      },
      "heapMb": 3.9349746704101562,
      "heapCode": 1.92327880859375,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.9482421875,
      "pssApp": 127.76171875,
      "pssRenderer": 99.1865234375,
      "relaunchReadyMs": 1637.5999999999767,
      "relaunchHeapMb": 3.3521156311035156,
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
          "emitP50": 0.40000000002328306,
          "emitP95": 1.400000000023283,
          "domP50": 2.5,
          "domP95": 11.5
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.199999999953434,
          "domP50": 2.900000000023283,
          "domP95": 7.200000000069849
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.8999999999068677,
          "domP50": 1.2999999999301508,
          "domP95": 9.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.6000000000931323,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 3.5638351440429688,
        "heapCode": 1.6888885498046875,
        "heapData": 1.5024337768554688,
        "pssTotalMb": 222.6083984375,
        "pssApp": 126.3076171875,
        "pssRenderer": 96.30078125
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.9000000000232831,
          "domP50": 5.800000000046566,
          "domP95": 6.5
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.599999999976717,
          "domP50": 6,
          "domP95": 9.800000000046566
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.5,
          "domP50": 1.8000000000465661,
          "domP95": 12.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.9000000000232831,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.135307312011719,
        "heapCode": 1.8521575927734375,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 228.7265625,
        "pssApp": 127.12890625,
        "pssRenderer": 101.59765625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.3999999999068677,
          "emitP95": 1.8999999999068677,
          "domP50": 6.900000000023283,
          "domP95": 8.099999999976717
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 4.5,
          "domP50": 4.400000000023283,
          "domP95": 11.400000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8000000000465661,
          "domP50": 1.599999999976717,
          "domP95": 5.299999999930151
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.099999999976717,
          "endLag": 2,
          "maxBacklog": 0
        },
        "heapMb": 7.939075469970703,
        "heapCode": 1.6922340393066406,
        "heapData": 5.722118377685547,
        "pssTotalMb": 231.2744140625,
        "pssApp": 126.54296875,
        "pssRenderer": 104.7314453125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.400000000023283,
        "domP50": 2.199999999953434,
        "domP95": 7.400000000023283
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 5.400000000023283,
        "domP95": 12.79999999993015
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 5,
        "domP50": 5.200000000069849,
        "domP95": 11.699999999953434
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 39.39999999990687,
        "domP50": 0.6999999999534339,
        "domP95": 39.79999999993015
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 4.599999999976717,
        "domP95": 8.399999999906868
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5,
        "domP50": 0.2000000000698492,
        "domP95": 1.1000000000931323
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.6999999999534339,
        "domP50": 0.8999999999068677,
        "domP95": 2
      },
      "heapMb": 3.9352149963378906,
      "heapCode": 1.9235076904296875,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 227.1181640625,
      "pssApp": 128.1845703125,
      "pssRenderer": 98.93359375,
      "relaunchReadyMs": 2096,
      "relaunchHeapMb": 3.5247573852539062,
      "relaunchHeapCode": 1.7070426940917969,
      "relaunchHeapData": 1.4493255615234375
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.099999999976717,
          "emitP95": 19.699999999953434,
          "domP50": 9.5,
          "domP95": 20.400000000023283
        },
        "setKeys": {
          "emitP50": 11.5,
          "emitP95": 19.800000000046566,
          "domP50": 12.099999999976717,
          "domP95": 20.399999999906868
        },
        "replace": {
          "emitP50": 8.099999999976717,
          "emitP95": 24.79999999993015,
          "domP50": 8.5,
          "domP95": 25.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.400000000023283,
          "lagP95": 14,
          "endLag": 7.200000000069849,
          "maxBacklog": 2
        },
        "heapMb": 5.058956146240234,
        "heapCode": 3.0030746459960938,
        "heapData": 1.6160507202148438,
        "pssTotalMb": 237.3583984375,
        "pssApp": 133.8740234375,
        "pssRenderer": 103.484375,
        "control": {
          "emitP50": 6.5,
          "emitP95": 15.400000000023283,
          "domP50": 6.800000000046566,
          "domP95": 15.70000000006985
        },
        "fCommitP50": 3.5,
        "fCommitP95": 12.400000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 10.300000000046566,
          "emitP95": 18.199999999953434,
          "domP50": 11.5,
          "domP95": 18.900000000023283
        },
        "setKeys": {
          "emitP50": 11.800000000046566,
          "emitP95": 30.20000000006985,
          "domP50": 12.300000000046566,
          "domP95": 30.70000000006985
        },
        "replace": {
          "emitP50": 9.899999999906868,
          "emitP95": 24.699999999953434,
          "domP50": 10.599999999976717,
          "domP95": 27.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.900000000023283,
          "lagP95": 17.20000000006985,
          "endLag": 7.199999999953434,
          "maxBacklog": 3
        },
        "heapMb": 5.562358856201172,
        "heapCode": 3.0367279052734375,
        "heapData": 2.0690574645996094,
        "pssTotalMb": 237.875,
        "pssApp": 133.5244140625,
        "pssRenderer": 104.3505859375,
        "control": {
          "emitP50": 8,
          "emitP95": 18,
          "domP50": 8.399999999906868,
          "domP95": 18.5
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 9.20000000006985
      },
      "5000": {
        "setKey": {
          "emitP50": 11.699999999953434,
          "emitP95": 20.699999999953434,
          "domP50": 13.100000000093132,
          "domP95": 21.800000000046566
        },
        "setKeys": {
          "emitP50": 9.100000000093132,
          "emitP95": 20.400000000023283,
          "domP50": 10.20000000006985,
          "domP95": 21.400000000023283
        },
        "replace": {
          "emitP50": 13.099999999976717,
          "emitP95": 16.900000000023283,
          "domP50": 14.400000000023283,
          "domP95": 17.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9,
          "lagP95": 18.599999999976717,
          "endLag": 7,
          "maxBacklog": 2
        },
        "heapMb": 9.946163177490234,
        "heapCode": 3.0866050720214844,
        "heapData": 6.260566711425781,
        "pssTotalMb": 252.09765625,
        "pssApp": 142.2470703125,
        "pssRenderer": 109.8505859375,
        "control": {
          "emitP50": 5.300000000046566,
          "emitP95": 25.400000000023283,
          "domP50": 5.900000000023283,
          "domP95": 25.800000000046566
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 10.699999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 10.300000000046566,
        "emitP95": 18.400000000023283,
        "domP50": 10.800000000046566,
        "domP95": 19.599999999976717
      },
      "edit_d4": {
        "emitP50": 9.599999999976717,
        "emitP95": 20.20000000006985,
        "domP50": 9.900000000023283,
        "domP95": 20.800000000046566
      },
      "edit_d10": {
        "emitP50": 7.400000000023283,
        "emitP95": 18.5,
        "domP50": 8.900000000023283,
        "domP95": 18.800000000046566
      },
      "loadCycle": {
        "emitP50": 19.099999999976717,
        "emitP95": 56.699999999953434,
        "domP50": 19.199999999953434,
        "domP95": 57.29999999993015
      },
      "step": {
        "emitP50": 9,
        "emitP95": 20.5,
        "domP50": 9.400000000023283,
        "domP95": 20.800000000046566
      },
      "reset": {
        "emitP50": 25,
        "emitP95": 41.199999999953434,
        "domP50": 25,
        "domP95": 41.300000000046566
      },
      "append100": {
        "emitP50": 15.20000000006985,
        "emitP95": 26,
        "domP50": 15.5,
        "domP95": 26.300000000046566
      },
      "control": {
        "emitP50": 6.900000000023283,
        "emitP95": 25.79999999993015,
        "domP50": 7.299999999930151,
        "domP95": 26.099999999976717
      },
      "heapMb": 5.496044158935547,
      "heapCode": 3.1795501708984375,
      "heapData": 1.8684272766113281,
      "pssTotalMb": 244.287109375,
      "pssApp": 138.2724609375,
      "pssRenderer": 106.0146484375,
      "relaunchReadyMs": 880.2000000000698,
      "relaunchHeapMb": 4.3320465087890625,
      "relaunchHeapCode": 2.128528594970703,
      "relaunchHeapData": 1.8275375366210938
    }
  }
]
```
</details>
