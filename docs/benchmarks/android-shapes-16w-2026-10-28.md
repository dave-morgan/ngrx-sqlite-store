# Phase 16 shapes — flat objects & hybrid workflow (2026-10-28)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.60 ms, p95 8.89 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 48 / CODE-BOUND 0 / FAIL 37

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.40 ± 0.00 | 8.76 ± 0.50 | 21.9× | FAIL | allow 6.9 (control emitP50 6.4×1) |
| flat | 50.setKey.emitP95 | 2.12 ± 1.22 | 23.68 ± 1.15 | 11.2× | FAIL | allow 20.0 (control emitP95 17.7×1) |
| flat | 50.setKey.domP50 | 2.76 ± 1.48 | 9.52 ± 0.38 | 3.4× | PLATFORM-BOUND | allow 8.7 (control domP50 6.8×1) |
| flat | 50.setKey.domP95 | 9.16 ± 1.08 | 24.30 ± 1.38 | 2.7× | PLATFORM-BOUND | allow 20.5 (control domP95 18.1×1) |
| flat | 50.setKeys.emitP50 | 0.46 ± 0.09 | 9.40 ± 0.51 | 20.4× | FAIL | allow 7.0 (control emitP50 6.4×1) |
| flat | 50.setKeys.emitP95 | 2.58 ± 1.84 | 22.38 ± 5.50 | 8.7× | PLATFORM-BOUND | allow 25.0 (control emitP95 17.7×1) |
| flat | 50.setKeys.domP50 | 1.46 ± 0.21 | 9.94 ± 0.47 | 6.8× | FAIL | allow 7.5 (control domP50 6.8×1) |
| flat | 50.setKeys.domP95 | 13.76 ± 4.70 | 23.04 ± 6.00 | 1.7× | PLATFORM-BOUND | allow 28.8 (control domP95 18.1×1) |
| flat | 50.replace.emitP50 | 0.38 ± 0.08 | 7.74 ± 0.63 | 20.4× | FAIL | allow 7.1 (control emitP50 6.4×1) |
| flat | 50.replace.emitP95 | 4.70 ± 3.91 | 24.08 ± 3.65 | 5.1× | PLATFORM-BOUND | allow 25.2 (control emitP95 17.7×1) |
| flat | 50.replace.domP50 | 1.94 ± 1.56 | 8.36 ± 0.97 | 4.3× | PLATFORM-BOUND | allow 9.4 (control domP50 6.8×1) |
| flat | 50.replace.domP95 | 10.28 ± 2.57 | 24.54 ± 3.73 | 2.4× | PLATFORM-BOUND | allow 24.4 (control domP95 18.1×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 6.76 ± 0.78 | 22.5× | PLATFORM-BOUND | allow 7.2 (control emitP50 6.4×1) |
| flat | 50.burst.lagP95 | 0.76 ± 0.27 | 19.16 ± 5.20 | 25.2× | PLATFORM-BOUND | allow 23.2 (control emitP95 17.7×1) |
| flat | 50.burst.endLag | 0.42 ± 0.15 | 8.36 ± 1.62 | 19.9× | PLATFORM-BOUND | allow 8.2 (control emitP50 6.4×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.40 ± 0.55 | 2400000000.0× | FAIL |  |
| flat | 50.heapMb | 3.69 ± 0.07 | 5.06 ± 0.00 | 1.4× | FAIL | code +1.19 MB; data 1.50 -> 1.62 MB |
| flat | 50.pssTotalMb | 221.96 ± 1.65 | 232.12 ± 2.22 | 1.0× | FAIL | allow 6.5 (plugin baseline 2.6 MB) |
| flat | 500.setKey.emitP50 | 0.46 ± 0.05 | 8.86 ± 0.62 | 19.3× | FAIL | allow 7.3 (control emitP50 6.6×1) |
| flat | 500.setKey.emitP95 | 1.66 ± 0.84 | 19.12 ± 3.69 | 11.5× | PLATFORM-BOUND | allow 22.0 (control emitP95 17.5×1) |
| flat | 500.setKey.domP50 | 3.36 ± 2.19 | 9.40 ± 0.60 | 2.8× | PLATFORM-BOUND | allow 9.8 (control domP50 7.0×1) |
| flat | 500.setKey.domP95 | 9.24 ± 2.19 | 21.00 ± 2.98 | 2.3× | PLATFORM-BOUND | allow 23.4 (control domP95 18.2×1) |
| flat | 500.setKeys.emitP50 | 0.46 ± 0.05 | 9.74 ± 1.48 | 21.2× | FAIL | allow 8.1 (control emitP50 6.6×1) |
| flat | 500.setKeys.emitP95 | 1.70 ± 1.28 | 23.26 ± 10.11 | 13.7× | PLATFORM-BOUND | allow 28.9 (control emitP95 17.5×1) |
| flat | 500.setKeys.domP50 | 3.00 ± 2.31 | 10.32 ± 1.52 | 3.4× | PLATFORM-BOUND | allow 10.9 (control domP50 7.0×1) |
| flat | 500.setKeys.domP95 | 7.14 ± 1.04 | 24.94 ± 9.93 | 3.5× | PLATFORM-BOUND | allow 29.2 (control domP95 18.2×1) |
| flat | 500.replace.emitP50 | 0.36 ± 0.09 | 9.32 ± 1.21 | 25.9× | FAIL | allow 7.9 (control emitP50 6.6×1) |
| flat | 500.replace.emitP95 | 4.38 ± 4.56 | 19.34 ± 3.21 | 4.4× | PLATFORM-BOUND | allow 25.3 (control emitP95 17.5×1) |
| flat | 500.replace.domP50 | 2.88 ± 2.26 | 9.88 ± 1.27 | 3.4× | PLATFORM-BOUND | allow 10.6 (control domP50 7.0×1) |
| flat | 500.replace.domP95 | 9.20 ± 3.12 | 19.76 ± 3.23 | 2.1× | PLATFORM-BOUND | allow 24.6 (control domP95 18.2×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 7.02 ± 0.59 | 17.5× | PLATFORM-BOUND | allow 7.2 (control emitP50 6.6×1) |
| flat | 500.burst.lagP95 | 0.76 ± 0.13 | 15.28 ± 2.89 | 20.1× | PLATFORM-BOUND | allow 20.5 (control emitP95 17.5×1) |
| flat | 500.burst.endLag | 0.44 ± 0.09 | 7.46 ± 1.19 | 17.0× | PLATFORM-BOUND | allow 7.9 (control emitP50 6.6×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.20 ± 0.45 | 2200000000.0× | FAIL |  |
| flat | 500.heapMb | 4.13 ± 0.00 | 5.55 ± 0.01 | 1.3× | FAIL | code +1.17 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 225.78 ± 1.66 | 232.64 ± 2.27 | 1.0× | FAIL | allow 6.6 (plugin baseline 2.6 MB) |
| flat | 5000.setKey.emitP50 | 1.70 ± 0.16 | 11.88 ± 2.15 | 7.0× | FAIL | allow 8.6 (control emitP50 6.2×1) |
| flat | 5000.setKey.emitP95 | 5.10 ± 2.94 | 23.50 ± 4.73 | 4.6× | PLATFORM-BOUND | allow 24.5 (control emitP95 16.8×1) |
| flat | 5000.setKey.domP50 | 3.36 ± 0.29 | 12.66 ± 2.18 | 3.8× | FAIL | allow 9.1 (control domP50 6.6×1) |
| flat | 5000.setKey.domP95 | 11.30 ± 1.37 | 26.36 ± 4.53 | 2.3× | PLATFORM-BOUND | allow 23.0 (control domP95 17.1×1) |
| flat | 5000.setKeys.emitP50 | 1.58 ± 0.08 | 11.42 ± 0.36 | 7.2× | FAIL | allow 6.7 (control emitP50 6.2×1) |
| flat | 5000.setKeys.emitP95 | 5.82 ± 2.57 | 25.76 ± 6.94 | 4.4× | PLATFORM-BOUND | allow 26.3 (control emitP95 16.8×1) |
| flat | 5000.setKeys.domP50 | 3.10 ± 0.25 | 12.08 ± 0.40 | 3.9× | FAIL | allow 7.3 (control domP50 6.6×1) |
| flat | 5000.setKeys.domP95 | 11.36 ± 1.60 | 26.52 ± 7.00 | 2.3× | PLATFORM-BOUND | allow 25.7 (control domP95 17.1×1) |
| flat | 5000.replace.emitP50 | 0.38 ± 0.04 | 14.88 ± 4.01 | 39.2× | FAIL | allow 10.3 (control emitP50 6.2×1) |
| flat | 5000.replace.emitP95 | 2.14 ± 0.94 | 25.76 ± 6.86 | 12.0× | PLATFORM-BOUND | allow 24.6 (control emitP95 16.8×1) |
| flat | 5000.replace.domP50 | 1.66 ± 0.22 | 15.74 ± 3.72 | 9.5× | FAIL | allow 10.6 (control domP50 6.6×1) |
| flat | 5000.replace.domP95 | 6.16 ± 1.77 | 26.26 ± 6.86 | 4.3× | PLATFORM-BOUND | allow 25.7 (control domP95 17.1×1) |
| flat | 5000.burst.lagP50 | 1.42 ± 0.04 | 8.74 ± 0.44 | 6.2× | FAIL | allow 6.7 (control emitP50 6.2×1) |
| flat | 5000.burst.lagP95 | 2.16 ± 0.32 | 15.30 ± 2.80 | 7.1× | PLATFORM-BOUND | allow 19.9 (control emitP95 16.8×1) |
| flat | 5000.burst.endLag | 1.34 ± 0.34 | 9.04 ± 1.28 | 6.7× | PLATFORM-BOUND | allow 7.9 (control emitP50 6.2×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.10 ± 0.00 | 9.94 ± 0.00 | 1.2× | FAIL | code +1.23 MB; data 5.73 -> 6.26 MB |
| flat | 5000.pssTotalMb | 230.37 ± 2.31 | 247.00 ± 1.95 | 1.1× | FAIL | allow 6.9 (plugin baseline 2.6 MB) |
| workflow | edit_d1.emitP50 | 0.40 ± 0.07 | 8.60 ± 0.98 | 21.5× | FAIL | allow 7.9 (control emitP50 6.9×1) |
| workflow | edit_d1.emitP95 | 1.22 ± 0.62 | 20.36 ± 4.44 | 16.7× | PLATFORM-BOUND | allow 24.1 (control emitP95 19.0×1) |
| workflow | edit_d1.domP50 | 2.48 ± 1.94 | 9.36 ± 1.14 | 3.8× | PLATFORM-BOUND | allow 10.3 (control domP50 7.2×1) |
| workflow | edit_d1.domP95 | 8.26 ± 1.61 | 22.48 ± 4.03 | 2.7× | PLATFORM-BOUND | allow 24.9 (control domP95 19.3×1) |
| workflow | edit_d4.emitP50 | 0.44 ± 0.05 | 8.42 ± 0.80 | 19.1× | FAIL | allow 7.7 (control emitP50 6.9×1) |
| workflow | edit_d4.emitP95 | 1.32 ± 0.78 | 22.14 ± 3.86 | 16.8× | PLATFORM-BOUND | allow 23.6 (control emitP95 19.0×1) |
| workflow | edit_d4.domP50 | 5.10 ± 0.81 | 9.04 ± 0.90 | 1.8× | PLATFORM-BOUND | allow 8.9 (control domP50 7.2×1) |
| workflow | edit_d4.domP95 | 8.22 ± 0.89 | 22.60 ± 3.87 | 2.7× | PLATFORM-BOUND | allow 24.0 (control domP95 19.3×1) |
| workflow | edit_d10.emitP50 | 0.48 ± 0.04 | 8.18 ± 0.68 | 17.0× | FAIL | allow 7.6 (control emitP50 6.9×1) |
| workflow | edit_d10.emitP95 | 1.14 ± 0.41 | 22.24 ± 6.90 | 19.5× | PLATFORM-BOUND | allow 26.3 (control emitP95 19.0×1) |
| workflow | edit_d10.domP50 | 2.04 ± 0.92 | 8.72 ± 0.65 | 4.3× | PLATFORM-BOUND | allow 8.7 (control domP50 7.2×1) |
| workflow | edit_d10.domP95 | 9.16 ± 2.18 | 23.16 ± 6.82 | 2.5× | PLATFORM-BOUND | allow 28.3 (control domP95 19.3×1) |
| workflow | loadCycle.emitP50 | 0.52 ± 0.16 | 16.72 ± 3.07 | 32.2× | PLATFORM-BOUND | allow 17.0 (control emitP50 6.9×2) |
| workflow | loadCycle.emitP95 | 34.00 ± 1.14 | 52.16 ± 2.24 | 1.5× | PLATFORM-BOUND | allow 41.4 (control emitP95 19.0×2) |
| workflow | loadCycle.domP50 | 0.84 ± 0.40 | 17.10 ± 2.94 | 20.4× | PLATFORM-BOUND | allow 17.7 (control domP50 7.2×2) |
| workflow | loadCycle.domP95 | 34.50 ± 1.40 | 52.90 ± 2.34 | 1.5× | PLATFORM-BOUND | allow 42.3 (control domP95 19.3×2) |
| workflow | step.emitP50 | 0.32 ± 0.04 | 9.42 ± 0.98 | 29.4× | FAIL | allow 7.9 (control emitP50 6.9×1) |
| workflow | step.emitP95 | 1.00 ± 0.40 | 24.50 ± 6.31 | 24.5× | PLATFORM-BOUND | allow 25.7 (control emitP95 19.0×1) |
| workflow | step.domP50 | 2.80 ± 2.06 | 9.88 ± 0.94 | 3.5× | PLATFORM-BOUND | allow 10.2 (control domP50 7.2×1) |
| workflow | step.domP95 | 10.26 ± 2.07 | 25.22 ± 6.16 | 2.5× | PLATFORM-BOUND | allow 27.5 (control domP95 19.3×1) |
| workflow | reset.emitP50 | 0.26 ± 0.05 | 29.00 ± 3.73 | 111.5× | FAIL | allow 10.7 (control emitP50 6.9×1) |
| workflow | reset.emitP95 | 0.64 ± 0.18 | 53.28 ± 26.99 | 83.2× | FAIL | allow 46.2 (control emitP95 19.0×1) |
| workflow | reset.domP50 | 0.26 ± 0.05 | 29.00 ± 3.73 | 111.5× | FAIL | allow 11.0 (control domP50 7.2×1) |
| workflow | reset.domP95 | 1.40 ± 0.29 | 53.36 ± 27.16 | 38.1× | FAIL | allow 46.7 (control domP95 19.3×1) |
| workflow | append100.emitP50 | 0.34 ± 0.05 | 15.00 ± 1.51 | 44.1× | FAIL | allow 8.4 (control emitP50 6.9×1) |
| workflow | append100.emitP95 | 1.10 ± 1.02 | 23.94 ± 6.52 | 21.8× | PLATFORM-BOUND | allow 26.5 (control emitP95 19.0×1) |
| workflow | append100.domP50 | 1.02 ± 0.13 | 15.32 ± 1.49 | 15.0× | FAIL | allow 8.8 (control domP50 7.2×1) |
| workflow | append100.domP95 | 5.88 ± 3.56 | 25.30 ± 6.55 | 4.3× | PLATFORM-BOUND | allow 29.4 (control domP95 19.3×1) |
| workflow | heapMb | 3.90 ± 0.07 | 5.49 ± 0.01 | 1.4× | FAIL | code +1.28 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 223.55 ± 1.81 | 236.71 ± 1.77 | 1.1× | FAIL | allow 6.2 (plugin baseline 2.6 MB) |
| workflow | relaunchReadyMs | 1596.84 ± 38.45 | 407.82 ± 21.43 | 0.3× | PASS |  |
| workflow | relaunchHeapMb | 3.33 ± 0.04 | 4.52 ± 0.03 | 1.4× | FAIL | code +0.80 MB; data 1.45 -> 1.82 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 6.42 | 6.84 | 18.08 | 8.76 | 9.52 | 24.30 |
| 500 | 6.60 | 7.04 | 18.22 | 8.86 | 9.40 | 21.00 |
| 5000 | 6.24 | 6.64 | 17.12 | 11.88 | 12.66 | 26.36 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 124.6 | 128.2 | 97.4 | 104.0 |
| flat 500 | 124.4 | 128.2 | 101.4 | 104.4 |
| flat 5000 | 124.0 | 137.0 | 106.4 | 110.0 |
| workflow | 124.5 | 130.9 | 99.0 | 105.9 |

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
          "emitP95": 1.400000000023283,
          "domP50": 2.2000000000116415,
          "domP95": 8.299999999988358
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 2.5,
          "domP50": 1.7999999999883585,
          "domP95": 15.200000000011642
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 5.2999999999883585,
          "domP50": 1.099999999976717,
          "domP95": 13.799999999988358
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.7000000000116415,
          "endLag": 0.6000000000349246,
          "maxBacklog": 0
        },
        "heapMb": 3.723155975341797,
        "heapCode": 1.8436698913574219,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 220.806640625,
        "pssApp": 124.173828125,
        "pssRenderer": 96.6328125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 2.7999999999883585,
          "domP50": 1.400000000023283,
          "domP95": 10.299999999988358
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 3.8999999999650754,
          "domP50": 1.2999999999883585,
          "domP95": 5.7999999999883585
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.7000000000116415,
          "domP50": 1.1999999999534339,
          "domP95": 7.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000116415,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.133556365966797,
        "heapCode": 1.8504180908203125,
        "heapData": 1.8948211669921875,
        "pssTotalMb": 224.107421875,
        "pssApp": 123.6015625,
        "pssRenderer": 100.505859375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.7000000000116415,
          "emitP95": 9.099999999976717,
          "domP50": 3.7999999999883585,
          "domP95": 13.099999999976717
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 8.099999999976717,
          "domP50": 3.5,
          "domP95": 12.299999999988358
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 0.7999999999883585,
          "domP50": 1.599999999976717,
          "domP95": 6
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 1.7999999999883585,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.097633361816406,
        "heapCode": 1.8455047607421875,
        "heapData": 5.725639343261719,
        "pssTotalMb": 228.5390625,
        "pssApp": 123.2041015625,
        "pssRenderer": 105.3349609375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7999999999883585,
        "domP50": 1.7999999999883585,
        "domP95": 7.2000000000116415
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 4,
        "domP95": 6.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 0.7999999999883585,
        "domP50": 1.900000000023283,
        "domP95": 12.300000000046566
      },
      "loadCycle": {
        "emitP50": 0.7999999999883585,
        "emitP95": 35.899999999965075,
        "domP50": 1.5,
        "domP95": 36.899999999965075
      },
      "step": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.7000000000116415,
        "domP50": 1,
        "domP95": 10.099999999976717
      },
      "reset": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.8000000000465661,
        "domP50": 0.29999999998835847,
        "domP95": 1.7000000000116415
      },
      "append100": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.7000000000116415,
        "domP50": 0.8999999999650754,
        "domP95": 2.7000000000116415
      },
      "heapMb": 3.9353790283203125,
      "heapCode": 1.9236717224121094,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 221.416015625,
      "pssApp": 122.8779296875,
      "pssRenderer": 98.5380859375,
      "relaunchReadyMs": 1619.7999999999884,
      "relaunchHeapMb": 3.3520431518554688,
      "relaunchHeapCode": 1.5400199890136719,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.599999999976717,
          "emitP95": 23.900000000023283,
          "domP50": 9.5,
          "domP95": 24.100000000034925
        },
        "setKeys": {
          "emitP50": 9.799999999988358,
          "emitP95": 30.100000000034925,
          "domP50": 10.400000000023283,
          "domP95": 31.800000000046566
        },
        "replace": {
          "emitP50": 7.5,
          "emitP95": 27,
          "domP50": 7.7999999999883585,
          "domP95": 27.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.100000000034925,
          "lagP95": 27.29999999998836,
          "endLag": 6.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 5.060249328613281,
        "heapCode": 3.0046768188476562,
        "heapData": 1.6162071228027344,
        "pssTotalMb": 229.564453125,
        "pssApp": 126.4169921875,
        "pssRenderer": 103.1474609375,
        "control": {
          "emitP50": 5.7000000000116415,
          "emitP95": 19.800000000046566,
          "domP50": 6.5,
          "domP95": 20.20000000001164
        },
        "fCommitP50": 3.7000000000116415,
        "fCommitP95": 7.400000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 9,
          "emitP95": 17.099999999976717,
          "domP50": 9.599999999976717,
          "domP95": 18.5
        },
        "setKeys": {
          "emitP50": 12.200000000011642,
          "emitP95": 19.100000000034925,
          "domP50": 12.899999999965075,
          "domP95": 19.900000000023283
        },
        "replace": {
          "emitP50": 10.600000000034925,
          "emitP95": 21.5,
          "domP50": 11.100000000034925,
          "domP95": 21.79999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.699999999953434,
          "lagP95": 18.20000000001164,
          "endLag": 6.7000000000116415,
          "maxBacklog": 3
        },
        "heapMb": 5.541606903076172,
        "heapCode": 3.017925262451172,
        "heapData": 2.0685882568359375,
        "pssTotalMb": 230.134765625,
        "pssApp": 126.3525390625,
        "pssRenderer": 103.7822265625,
        "control": {
          "emitP50": 7.100000000034925,
          "emitP95": 20.099999999976717,
          "domP50": 7.2999999999883585,
          "domP95": 20.399999999965075
        },
        "fCommitP50": 3.6000000000349246,
        "fCommitP95": 8.400000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 11.400000000023283,
          "emitP95": 17,
          "domP50": 12.200000000011642,
          "domP95": 18.400000000023283
        },
        "setKeys": {
          "emitP50": 11.599999999976717,
          "emitP95": 20.5,
          "domP50": 12.099999999976717,
          "domP95": 21.29999999998836
        },
        "replace": {
          "emitP50": 22,
          "emitP95": 36,
          "domP50": 22.29999999998836,
          "domP95": 36.59999999997672
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.699999999953434,
          "lagP95": 18,
          "endLag": 8.200000000011642,
          "maxBacklog": 2
        },
        "heapMb": 9.939739227294922,
        "heapCode": 3.0816001892089844,
        "heapData": 6.26025390625,
        "pssTotalMb": 244.3662109375,
        "pssApp": 135.103515625,
        "pssRenderer": 109.2626953125,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 14.200000000011642,
          "domP50": 6.7000000000116415,
          "domP95": 14.5
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 5.099999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.599999999976717,
        "emitP95": 24.5,
        "domP50": 9.399999999965075,
        "domP95": 24.899999999965075
      },
      "edit_d4": {
        "emitP50": 9.399999999965075,
        "emitP95": 28.5,
        "domP50": 9.799999999988358,
        "domP95": 28.900000000023283
      },
      "edit_d10": {
        "emitP50": 8.5,
        "emitP95": 29.20000000001164,
        "domP50": 8.799999999988358,
        "domP95": 29.599999999976717
      },
      "loadCycle": {
        "emitP50": 18.29999999998836,
        "emitP95": 51.899999999965075,
        "domP50": 18.5,
        "domP95": 52.5
      },
      "step": {
        "emitP50": 8.699999999953434,
        "emitP95": 33.399999999965075,
        "domP50": 9.199999999953434,
        "domP95": 33.699999999953434
      },
      "reset": {
        "emitP50": 30.29999999998836,
        "emitP95": 52.40000000002328,
        "domP50": 30.29999999998836,
        "domP95": 52.40000000002328
      },
      "append100": {
        "emitP50": 16.70000000001164,
        "emitP95": 34.899999999965075,
        "domP50": 17,
        "domP95": 35.20000000001164
      },
      "control": {
        "emitP50": 7.7000000000116415,
        "emitP95": 21.099999999976717,
        "domP50": 8,
        "domP95": 21.399999999965075
      },
      "heapMb": 5.481334686279297,
      "heapCode": 3.167816162109375,
      "heapData": 1.8658218383789062,
      "pssTotalMb": 234.609375,
      "pssApp": 129.513671875,
      "pssRenderer": 105.095703125,
      "relaunchReadyMs": 426.70000000001164,
      "relaunchHeapMb": 4.531524658203125,
      "relaunchHeapCode": 2.323486328125,
      "relaunchHeapData": 1.8299751281738281
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.400000000023283,
          "emitP95": 22.400000000023283,
          "domP50": 9.200000000011642,
          "domP95": 23
        },
        "setKeys": {
          "emitP50": 9.299999999988358,
          "emitP95": 21.29999999998836,
          "domP50": 9.599999999976717,
          "domP95": 21.600000000034925
        },
        "replace": {
          "emitP50": 7.099999999976717,
          "emitP95": 21.599999999976717,
          "domP50": 7.5,
          "domP95": 21.899999999965075
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.2000000000116415,
          "lagP95": 21,
          "endLag": 7.100000000034925,
          "maxBacklog": 3
        },
        "heapMb": 5.062633514404297,
        "heapCode": 3.007274627685547,
        "heapData": 1.6158714294433594,
        "pssTotalMb": 229.97265625,
        "pssApp": 126.888671875,
        "pssRenderer": 103.083984375,
        "control": {
          "emitP50": 6.5,
          "emitP95": 18.79999999998836,
          "domP50": 7,
          "domP95": 19.20000000001164
        },
        "fCommitP50": 3.6000000000349246,
        "fCommitP95": 5.899999999965075
      },
      "500": {
        "setKey": {
          "emitP50": 9.700000000011642,
          "emitP95": 17,
          "domP50": 10.200000000011642,
          "domP95": 20.899999999965075
        },
        "setKeys": {
          "emitP50": 9.5,
          "emitP95": 41.09999999997672,
          "domP50": 10,
          "domP95": 42.399999999965075
        },
        "replace": {
          "emitP50": 8,
          "emitP95": 15.700000000011642,
          "domP50": 8.5,
          "domP95": 16.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.7000000000116415,
          "lagP95": 14.400000000023283,
          "endLag": 6.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.542449951171875,
        "heapCode": 3.0189437866210938,
        "heapData": 2.0683212280273438,
        "pssTotalMb": 230.3544921875,
        "pssApp": 126.7783203125,
        "pssRenderer": 103.576171875,
        "control": {
          "emitP50": 6.599999999976717,
          "emitP95": 18.600000000093132,
          "domP50": 6.799999999930151,
          "domP95": 19.70000000006985
        },
        "fCommitP50": 3.5,
        "fCommitP95": 11.699999999953434
      },
      "5000": {
        "setKey": {
          "emitP50": 9.900000000023283,
          "emitP95": 25.800000000046566,
          "domP50": 10.79999999993015,
          "domP95": 29.699999999953434
        },
        "setKeys": {
          "emitP50": 10.900000000023283,
          "emitP95": 37.90000000002328,
          "domP50": 11.400000000023283,
          "domP95": 38.800000000046566
        },
        "replace": {
          "emitP50": 13.5,
          "emitP95": 29.29999999993015,
          "domP50": 14.800000000046566,
          "domP95": 29.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.5,
          "lagP95": 16.099999999976717,
          "endLag": 8.20000000006985,
          "maxBacklog": 2
        },
        "heapMb": 9.94070053100586,
        "heapCode": 3.0819129943847656,
        "heapData": 6.2603759765625,
        "pssTotalMb": 245.6484375,
        "pssApp": 136.4794921875,
        "pssRenderer": 109.1689453125,
        "control": {
          "emitP50": 6.300000000046566,
          "emitP95": 20.600000000093132,
          "domP50": 6.700000000069849,
          "domP95": 20.900000000023283
        },
        "fCommitP50": 3.5,
        "fCommitP95": 11.900000000023283
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.20000000006985,
        "emitP95": 18.70000000006985,
        "domP50": 9.79999999993015,
        "domP95": 19.400000000023283
      },
      "edit_d4": {
        "emitP50": 9.099999999976717,
        "emitP95": 20.20000000006985,
        "domP50": 10.099999999976717,
        "domP95": 20.599999999976717
      },
      "edit_d10": {
        "emitP50": 8.599999999976717,
        "emitP95": 20.5,
        "domP50": 9.099999999976717,
        "domP95": 22.400000000023283
      },
      "loadCycle": {
        "emitP50": 16.79999999993015,
        "emitP95": 54,
        "domP50": 17.199999999953434,
        "domP95": 55.39999999990687
      },
      "step": {
        "emitP50": 10.099999999976717,
        "emitP95": 28,
        "domP50": 10.400000000023283,
        "domP95": 28.5
      },
      "reset": {
        "emitP50": 23.70000000006985,
        "emitP95": 28.699999999953434,
        "domP50": 23.70000000006985,
        "domP95": 28.699999999953434
      },
      "append100": {
        "emitP50": 13.5,
        "emitP95": 23.79999999993015,
        "domP50": 13.900000000023283,
        "domP95": 28
      },
      "control": {
        "emitP50": 6.300000000046566,
        "emitP95": 17.900000000023283,
        "domP50": 6.5,
        "domP95": 18.300000000046566
      },
      "heapMb": 5.484272003173828,
      "heapCode": 3.170635223388672,
      "heapData": 1.866058349609375,
      "pssTotalMb": 234.9599609375,
      "pssApp": 129.751953125,
      "pssRenderer": 105.2080078125,
      "relaunchReadyMs": 427.5999999999767,
      "relaunchHeapMb": 4.525367736816406,
      "relaunchHeapCode": 2.3172569274902344,
      "relaunchHeapData": 1.829925537109375
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.199999999953434,
          "domP50": 1.5,
          "domP95": 10.900000000023283
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7000000000698492,
          "domP50": 1.400000000023283,
          "domP95": 8.300000000046566
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 11.099999999976717,
          "domP50": 0.9000000000232831,
          "domP95": 11.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.7999999999301508,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.7255592346191406,
        "heapCode": 1.8458404541015625,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 221.8935546875,
        "pssApp": 124.7783203125,
        "pssRenderer": 97.115234375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 2.299999999930151,
          "domP50": 2,
          "domP95": 11.599999999976717
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.099999999976717,
          "domP50": 1.3000000000465661,
          "domP95": 8.599999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.200000000069849,
          "domP50": 1,
          "domP95": 5.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.132671356201172,
        "heapCode": 1.8496856689453125,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 224.025390625,
        "pssApp": 123.537109375,
        "pssRenderer": 100.48828125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 3,
          "domP50": 3.400000000023283,
          "domP95": 12.099999999976717
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 2.900000000023283,
          "domP50": 3.099999999976717,
          "domP95": 12.70000000006985
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.599999999976717,
          "domP50": 2,
          "domP95": 6.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.199999999953434,
          "endLag": 1.1999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 8.097526550292969,
        "heapCode": 1.84539794921875,
        "heapData": 5.725639343261719,
        "pssTotalMb": 227.5263671875,
        "pssApp": 121.72265625,
        "pssRenderer": 105.8037109375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1000000000931323,
        "domP50": 1.599999999976717,
        "domP95": 10.400000000023283
      },
      "edit_d4": {
        "emitP50": 0.5,
        "emitP95": 1.5,
        "domP50": 5.599999999976717,
        "domP95": 8.099999999976717
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.8000000000465661,
        "domP50": 3.5,
        "domP95": 6.400000000023283
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33.699999999953434,
        "domP50": 0.7000000000698492,
        "domP95": 34
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 4.599999999976717,
        "domP95": 10.099999999976717
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 0.8000000000465661,
        "domP50": 0.19999999995343387,
        "domP95": 1.599999999976717
      },
      "append100": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.40000000002328306,
        "domP50": 0.9000000000232831,
        "domP95": 5.299999999930151
      },
      "heapMb": 3.9337005615234375,
      "heapCode": 1.9220962524414062,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 222.255859375,
      "pssApp": 123.9462890625,
      "pssRenderer": 98.3095703125,
      "relaunchReadyMs": 1650.3000000000466,
      "relaunchHeapMb": 3.2581520080566406,
      "relaunchHeapCode": 1.4548912048339844,
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
          "emitP95": 1.599999999976717,
          "domP50": 1.6999999999534339,
          "domP95": 8.5
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.800000000046566,
          "domP50": 1.3000000000465661,
          "domP95": 20.099999999976717
        },
        "replace": {
          "emitP50": 0.5,
          "emitP95": 1.6000000000931323,
          "domP50": 1.5,
          "domP95": 9.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 1.1999999999534339,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.722759246826172,
        "heapCode": 1.8430747985839844,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 223.3408203125,
        "pssApp": 125.38671875,
        "pssRenderer": 97.9541015625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 0.8999999999068677,
          "domP50": 1.8999999999068677,
          "domP95": 6.900000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.3999999999068677,
          "domP50": 1.400000000023283,
          "domP95": 6.800000000046566
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.2999999999301508,
          "domP50": 1.5,
          "domP95": 8.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6999999999534339,
          "endLag": 0.39999999990686774,
          "maxBacklog": 0
        },
        "heapMb": 4.129878997802734,
        "heapCode": 1.8472976684570312,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 227.3525390625,
        "pssApp": 125.34765625,
        "pssRenderer": 102.0048828125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.8000000000465661,
          "emitP95": 7.299999999930151,
          "domP50": 3.300000000046566,
          "domP95": 11.099999999976717
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 6.099999999976717,
          "domP50": 2.800000000046566,
          "domP95": 9.199999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.299999999930151,
          "domP50": 1.6999999999534339,
          "domP95": 5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 1.900000000023283,
          "endLag": 1.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 8.09737777709961,
        "heapCode": 1.8453598022460938,
        "heapData": 5.725639343261719,
        "pssTotalMb": 232.705078125,
        "pssApp": 125.7998046875,
        "pssRenderer": 106.9052734375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.300000000046566,
        "domP50": 1.1000000000931323,
        "domP95": 9.5
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.6000000000931323,
        "domP50": 4.5,
        "domP95": 9.099999999976717
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 1.1000000000931323,
        "domP95": 9.79999999993015
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 33.20000000006985,
        "domP50": 0.5999999999767169,
        "domP95": 33.60000000009313
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.1000000000931323,
        "domP50": 1.099999999976717,
        "domP95": 7.099999999976717
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6999999999534339,
        "domP50": 0.30000000004656613,
        "domP95": 1.2000000000698492
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7000000000698492,
        "domP50": 1,
        "domP95": 2.700000000069849
      },
      "heapMb": 3.9355621337890625,
      "heapCode": 1.9238548278808594,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 225.3291015625,
      "pssApp": 125.5654296875,
      "pssRenderer": 99.763671875,
      "relaunchReadyMs": 1590.5999999999767,
      "relaunchHeapMb": 3.3515586853027344,
      "relaunchHeapCode": 1.5399589538574219,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.600000000093132,
          "emitP95": 23.79999999993015,
          "domP50": 9.900000000023283,
          "domP95": 24.29999999993015
        },
        "setKeys": {
          "emitP50": 10,
          "emitP95": 18.70000000006985,
          "domP50": 10.5,
          "domP95": 19.20000000006985
        },
        "replace": {
          "emitP50": 8.20000000006985,
          "emitP95": 19.899999999906868,
          "domP50": 9.599999999976717,
          "domP95": 20.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.300000000046566,
          "lagP95": 14.099999999976717,
          "endLag": 8.5,
          "maxBacklog": 2
        },
        "heapMb": 5.05303955078125,
        "heapCode": 2.998260498046875,
        "heapData": 1.6156349182128906,
        "pssTotalMb": 233.8828125,
        "pssApp": 129.26953125,
        "pssRenderer": 104.61328125,
        "control": {
          "emitP50": 6.800000000046566,
          "emitP95": 15.400000000023283,
          "domP50": 7.099999999976717,
          "domP95": 16.099999999976717
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 6.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 8.199999999953434,
          "emitP95": 25.599999999976717,
          "domP50": 8.70000000006985,
          "domP95": 26.099999999976717
        },
        "setKeys": {
          "emitP50": 8.399999999906868,
          "emitP95": 21.400000000023283,
          "domP50": 9.099999999976717,
          "domP95": 22.099999999976717
        },
        "replace": {
          "emitP50": 8.300000000046566,
          "emitP95": 20.5,
          "domP50": 8.900000000023283,
          "domP95": 21
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.599999999976717,
          "lagP95": 16.5,
          "endLag": 6.700000000069849,
          "maxBacklog": 2
        },
        "heapMb": 5.554130554199219,
        "heapCode": 3.0295181274414062,
        "heapData": 2.068592071533203,
        "pssTotalMb": 233.7392578125,
        "pssApp": 128.7841796875,
        "pssRenderer": 104.955078125,
        "control": {
          "emitP50": 6.699999999953434,
          "emitP95": 19.79999999993015,
          "domP50": 7,
          "domP95": 20.199999999953434
        },
        "fCommitP50": 3.5,
        "fCommitP95": 12.20000000006985
      },
      "5000": {
        "setKey": {
          "emitP50": 10.5,
          "emitP95": 27.099999999976717,
          "domP50": 11.20000000006985,
          "domP95": 28
        },
        "setKeys": {
          "emitP50": 11.800000000046566,
          "emitP95": 22.5,
          "domP50": 12.400000000023283,
          "domP95": 23.29999999993015
        },
        "replace": {
          "emitP50": 12.900000000023283,
          "emitP95": 22.099999999976717,
          "domP50": 14.099999999976717,
          "domP95": 22.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.5,
          "lagP95": 13.800000000046566,
          "endLag": 8.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.939739227294922,
        "heapCode": 3.0808563232421875,
        "heapData": 6.26025390625,
        "pssTotalMb": 248.6259765625,
        "pssApp": 138.302734375,
        "pssRenderer": 110.3232421875,
        "control": {
          "emitP50": 6.199999999953434,
          "emitP95": 16.300000000046566,
          "domP50": 6.699999999953434,
          "domP95": 16.599999999976717
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 11.800000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.699999999953434,
        "emitP95": 16.599999999976717,
        "domP50": 10.900000000023283,
        "domP95": 17
      },
      "edit_d4": {
        "emitP50": 8.199999999953434,
        "emitP95": 18.5,
        "domP50": 8.699999999953434,
        "domP95": 18.699999999953434
      },
      "edit_d10": {
        "emitP50": 7.5,
        "emitP95": 13.70000000006985,
        "domP50": 8.599999999976717,
        "domP95": 14.400000000023283
      },
      "loadCycle": {
        "emitP50": 14.400000000023283,
        "emitP95": 51.5,
        "domP50": 14.5,
        "domP95": 52.09999999997672
      },
      "step": {
        "emitP50": 8.900000000023283,
        "emitP95": 18.900000000023283,
        "domP50": 9.199999999953434,
        "domP95": 19.29999999993015
      },
      "reset": {
        "emitP50": 31.5,
        "emitP95": 42.29999999993015,
        "domP50": 31.5,
        "domP95": 42.29999999993015
      },
      "append100": {
        "emitP50": 15.79999999993015,
        "emitP95": 22,
        "domP50": 16.099999999976717,
        "domP95": 23.099999999976717
      },
      "control": {
        "emitP50": 6.900000000023283,
        "emitP95": 14.5,
        "domP50": 7.199999999953434,
        "domP95": 14.70000000006985
      },
      "heapMb": 5.487339019775391,
      "heapCode": 3.1718482971191406,
      "heapData": 1.8677253723144531,
      "pssTotalMb": 237.87109375,
      "pssApp": 131.5205078125,
      "pssRenderer": 106.3505859375,
      "relaunchReadyMs": 401.5999999999767,
      "relaunchHeapMb": 4.5253753662109375,
      "relaunchHeapCode": 2.317211151123047,
      "relaunchHeapData": 1.8298873901367188
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.399999999906868,
          "emitP95": 22.900000000023283,
          "domP50": 9.900000000023283,
          "domP95": 23.5
        },
        "setKeys": {
          "emitP50": 8.699999999953434,
          "emitP95": 25.5,
          "domP50": 9.599999999976717,
          "domP95": 26
        },
        "replace": {
          "emitP50": 8.599999999976717,
          "emitP95": 23.29999999993015,
          "domP50": 9.20000000006985,
          "domP95": 24
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.800000000046566,
          "lagP95": 17.400000000023283,
          "endLag": 8.5,
          "maxBacklog": 3
        },
        "heapMb": 5.052761077880859,
        "heapCode": 2.9982070922851562,
        "heapData": 1.6156349182128906,
        "pssTotalMb": 232.80078125,
        "pssApp": 128.4033203125,
        "pssRenderer": 104.3974609375,
        "control": {
          "emitP50": 6.299999999930151,
          "emitP95": 16.5,
          "domP50": 6.599999999976717,
          "domP95": 16.800000000046566
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 6.300000000046566
      },
      "500": {
        "setKey": {
          "emitP50": 8.29999999993015,
          "emitP95": 18.70000000006985,
          "domP50": 8.899999999906868,
          "domP95": 20
        },
        "setKeys": {
          "emitP50": 8.800000000046566,
          "emitP95": 17.300000000046566,
          "domP50": 9.29999999993015,
          "domP95": 22.400000000023283
        },
        "replace": {
          "emitP50": 9.20000000006985,
          "emitP95": 22.79999999993015,
          "domP50": 9.600000000093132,
          "domP95": 23.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.699999999953434,
          "lagP95": 10.699999999953434,
          "endLag": 9.5,
          "maxBacklog": 2
        },
        "heapMb": 5.543659210205078,
        "heapCode": 3.019012451171875,
        "heapData": 2.06927490234375,
        "pssTotalMb": 235.1982421875,
        "pssApp": 130.193359375,
        "pssRenderer": 105.0048828125,
        "control": {
          "emitP50": 6.699999999953434,
          "emitP95": 18.099999999976717,
          "domP50": 7.299999999930151,
          "domP95": 18.400000000023283
        },
        "fCommitP50": 3.6000000000931323,
        "fCommitP95": 6.400000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 12.20000000006985,
          "emitP95": 20,
          "domP50": 12.79999999993015,
          "domP95": 27.300000000046566
        },
        "setKeys": {
          "emitP50": 11.20000000006985,
          "emitP95": 24.5,
          "domP50": 12.300000000046566,
          "domP95": 24.899999999906868
        },
        "replace": {
          "emitP50": 12.399999999906868,
          "emitP95": 22.5,
          "domP50": 13.099999999976717,
          "domP95": 22.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.400000000023283,
          "lagP95": 11.199999999953434,
          "endLag": 9.199999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.9376220703125,
        "heapCode": 3.0799789428710938,
        "heapData": 6.26025390625,
        "pssTotalMb": 248.908203125,
        "pssApp": 138.4228515625,
        "pssRenderer": 110.4853515625,
        "control": {
          "emitP50": 6.099999999976717,
          "emitP95": 17.800000000046566,
          "domP50": 6.700000000069849,
          "domP95": 18.099999999976717
        },
        "fCommitP50": 3.700000000069849,
        "fCommitP95": 7.799999999930151
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.399999999906868,
        "emitP95": 25.699999999953434,
        "domP50": 8.900000000023283,
        "domP95": 26.099999999976717
      },
      "edit_d4": {
        "emitP50": 7.900000000023283,
        "emitP95": 20.79999999993015,
        "domP50": 8.699999999953434,
        "domP95": 21.699999999953434
      },
      "edit_d10": {
        "emitP50": 8.900000000023283,
        "emitP95": 29.399999999906868,
        "domP50": 9.400000000023283,
        "domP95": 30.29999999993015
      },
      "loadCycle": {
        "emitP50": 20.900000000023283,
        "emitP95": 48.90000000002328,
        "domP50": 21.199999999953434,
        "domP95": 49.60000000009313
      },
      "step": {
        "emitP50": 10.79999999993015,
        "emitP95": 18.5,
        "domP50": 11.300000000046566,
        "domP95": 19.400000000023283
      },
      "reset": {
        "emitP50": 26.70000000006985,
        "emitP95": 43.90000000002328,
        "domP50": 26.70000000006985,
        "domP95": 43.90000000002328
      },
      "append100": {
        "emitP50": 13.300000000046566,
        "emitP95": 21.300000000046566,
        "domP50": 13.599999999976717,
        "domP95": 22
      },
      "control": {
        "emitP50": 7.300000000046566,
        "emitP95": 19.300000000046566,
        "domP50": 7.700000000069849,
        "domP95": 19.599999999976717
      },
      "heapMb": 5.497516632080078,
      "heapCode": 3.173095703125,
      "heapData": 1.8766403198242188,
      "pssTotalMb": 237.919921875,
      "pssApp": 131.6533203125,
      "pssRenderer": 106.2666015625,
      "relaunchReadyMs": 407.80000000004657,
      "relaunchHeapMb": 4.469577789306641,
      "relaunchHeapCode": 2.3233795166015625,
      "relaunchHeapData": 1.7681198120117188
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.199999999953434,
          "domP50": 5.099999999976717,
          "domP95": 9.5
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 5.5,
          "domP50": 1.5,
          "domP95": 10
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.599999999976717,
          "domP50": 1.5,
          "domP95": 6.899999999906868
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
        "pssTotalMb": 219.9267578125,
        "pssApp": 122.9443359375,
        "pssRenderer": 96.982421875
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.3000000000465661,
          "domP50": 5.800000000046566,
          "domP95": 10.5
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6000000000931323,
          "domP50": 6,
          "domP95": 7.599999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.400000000023283,
          "domP50": 5.300000000046566,
          "domP95": 11.899999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 0.5999999999767169,
          "maxBacklog": 0
        },
        "heapMb": 4.134807586669922,
        "heapCode": 1.8517990112304688,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 225.998046875,
        "pssApp": 123.9501953125,
        "pssRenderer": 102.0478515625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.900000000023283,
          "emitP95": 3.699999999953434,
          "domP50": 3.299999999930151,
          "domP95": 10.699999999953434
        },
        "setKeys": {
          "emitP50": 1.6999999999534339,
          "emitP95": 3.5,
          "domP50": 3,
          "domP95": 12.5
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 3.299999999930151,
          "domP50": 1.400000000023283,
          "domP95": 4.399999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.300000000046566,
          "endLag": 1.900000000023283,
          "maxBacklog": 0
        },
        "heapMb": 8.097488403320312,
        "heapCode": 1.8453598022460938,
        "heapData": 5.725639343261719,
        "pssTotalMb": 232.455078125,
        "pssApp": 125.5478515625,
        "pssRenderer": 106.9072265625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.099999999976717,
        "domP50": 2,
        "domP95": 7.599999999976717
      },
      "edit_d4": {
        "emitP50": 0.5,
        "emitP95": 0.8000000000465661,
        "domP50": 5.5,
        "domP95": 8
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 0.8000000000465661,
        "domP50": 2.199999999953434,
        "domP95": 9.20000000006985
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 34.09999999997672,
        "domP50": 0.8999999999068677,
        "domP95": 34.5
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.2000000000698492,
        "domP50": 1.900000000023283,
        "domP95": 12.70000000006985
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.40000000002328306,
        "domP50": 0.30000000004656613,
        "domP95": 1.5
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 1.1999999999534339,
        "domP95": 7.600000000093132
      },
      "heapMb": 3.77728271484375,
      "heapCode": 1.7702522277832031,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 223.2607421875,
      "pssApp": 124.3359375,
      "pssRenderer": 98.9248046875,
      "relaunchReadyMs": 1558,
      "relaunchHeapMb": 3.3520278930664062,
      "relaunchHeapCode": 1.5400199890136719,
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
          "emitP95": 1.1999999999534339,
          "domP50": 3.300000000046566,
          "domP95": 8.600000000093132
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.3999999999068677,
          "domP50": 1.2999999999301508,
          "domP95": 15.199999999953434
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 3.900000000023283,
          "domP50": 4.699999999953434,
          "domP95": 9.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.7242813110351562,
        "heapCode": 1.844573974609375,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 223.8515625,
        "pssApp": 125.716796875,
        "pssRenderer": 98.134765625
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 5.699999999953434,
          "domP95": 6.900000000023283
        },
        "setKeys": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1.5,
          "domP50": 5,
          "domP95": 6.900000000023283
        },
        "replace": {
          "emitP50": 0.5,
          "emitP95": 12.300000000046566,
          "domP50": 5.400000000023283,
          "domP95": 12.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.1353302001953125,
        "heapCode": 1.8521804809570312,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 227.4130859375,
        "pssApp": 125.51171875,
        "pssRenderer": 101.9013671875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.5,
          "emitP95": 2.400000000023283,
          "domP50": 3,
          "domP95": 9.5
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 8.5,
          "domP50": 3.099999999976717,
          "domP95": 10.099999999976717
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1.6999999999534339,
          "domP50": 1.599999999976717,
          "domP95": 9
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.599999999976717,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.095558166503906,
        "heapCode": 1.8440475463867188,
        "heapData": 5.725063323974609,
        "pssTotalMb": 230.6376953125,
        "pssApp": 123.775390625,
        "pssRenderer": 106.8623046875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7999999999301508,
        "domP50": 5.900000000023283,
        "domP95": 6.599999999976717
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.6999999999534339,
        "domP50": 5.900000000023283,
        "domP95": 9
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.1999999999534339,
        "domP50": 1.5,
        "domP95": 8.099999999976717
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 33.09999999997672,
        "domP50": 0.5,
        "domP95": 33.5
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.5,
        "domP50": 5.400000000023283,
        "domP95": 11.300000000046566
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5,
        "domP50": 0.2000000000698492,
        "domP95": 1
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 2.900000000023283,
        "domP50": 1.099999999976717,
        "domP95": 11.099999999976717
      },
      "heapMb": 3.9363136291503906,
      "heapCode": 1.9245872497558594,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 225.4716796875,
      "pssApp": 125.841796875,
      "pssRenderer": 99.6298828125,
      "relaunchReadyMs": 1565.5,
      "relaunchHeapMb": 3.3520278930664062,
      "relaunchHeapCode": 1.5400199890136719,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.79999999993015,
          "emitP95": 25.400000000023283,
          "domP50": 9.099999999976717,
          "domP95": 26.599999999976717
        },
        "setKeys": {
          "emitP50": 9.199999999953434,
          "emitP95": 16.300000000046566,
          "domP50": 9.599999999976717,
          "domP95": 16.600000000093132
        },
        "replace": {
          "emitP50": 7.300000000046566,
          "emitP95": 28.600000000093132,
          "domP50": 7.699999999953434,
          "domP95": 29.100000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.399999999906868,
          "lagP95": 16,
          "endLag": 10.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.0556793212890625,
        "heapCode": 3.0007781982421875,
        "heapData": 1.6156082153320312,
        "pssTotalMb": 234.36328125,
        "pssApp": 129.7783203125,
        "pssRenderer": 104.5849609375,
        "control": {
          "emitP50": 6.800000000046566,
          "emitP95": 17.900000000023283,
          "domP50": 7,
          "domP95": 18.099999999976717
        },
        "fCommitP50": 3.299999999930151,
        "fCommitP95": 11.800000000046566
      },
      "500": {
        "setKey": {
          "emitP50": 9.099999999976717,
          "emitP95": 17.20000000006985,
          "domP50": 9.600000000093132,
          "domP95": 19.5
        },
        "setKeys": {
          "emitP50": 9.79999999993015,
          "emitP95": 17.400000000023283,
          "domP50": 10.29999999993015,
          "domP95": 17.900000000023283
        },
        "replace": {
          "emitP50": 10.5,
          "emitP95": 16.199999999953434,
          "domP50": 11.300000000046566,
          "domP95": 16.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.399999999906868,
          "lagP95": 16.599999999976717,
          "endLag": 7.5,
          "maxBacklog": 2
        },
        "heapMb": 5.54412841796875,
        "heapCode": 3.0202560424804688,
        "heapData": 2.068317413330078,
        "pssTotalMb": 233.7900390625,
        "pssApp": 128.8935546875,
        "pssRenderer": 104.896484375,
        "control": {
          "emitP50": 5.900000000023283,
          "emitP95": 10.900000000023283,
          "domP50": 6.800000000046566,
          "domP95": 12.400000000023283
        },
        "fCommitP50": 3.5,
        "fCommitP95": 6.599999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 15.400000000023283,
          "emitP95": 27.600000000093132,
          "domP50": 16.300000000046566,
          "domP95": 28.400000000023283
        },
        "setKeys": {
          "emitP50": 11.600000000093132,
          "emitP95": 23.400000000023283,
          "domP50": 12.20000000006985,
          "domP95": 24.300000000046566
        },
        "replace": {
          "emitP50": 13.599999999976717,
          "emitP95": 18.900000000023283,
          "domP50": 14.400000000023283,
          "domP95": 19.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.600000000093132,
          "lagP95": 17.400000000023283,
          "endLag": 11.199999999953434,
          "maxBacklog": 2
        },
        "heapMb": 9.930286407470703,
        "heapCode": 3.0726776123046875,
        "heapData": 6.260520935058594,
        "pssTotalMb": 247.447265625,
        "pssApp": 136.5615234375,
        "pssRenderer": 110.8857421875,
        "control": {
          "emitP50": 6.199999999953434,
          "emitP95": 15.199999999953434,
          "domP50": 6.399999999906868,
          "domP95": 15.5
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 13.099999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.099999999976717,
        "emitP95": 16.300000000046566,
        "domP50": 7.800000000046566,
        "domP95": 25
      },
      "edit_d4": {
        "emitP50": 7.5,
        "emitP95": 22.699999999953434,
        "domP50": 7.900000000023283,
        "domP95": 23.099999999976717
      },
      "edit_d10": {
        "emitP50": 7.399999999906868,
        "emitP95": 18.400000000023283,
        "domP50": 7.699999999953434,
        "domP95": 19.099999999976717
      },
      "loadCycle": {
        "emitP50": 13.20000000006985,
        "emitP95": 54.5,
        "domP50": 14.099999999976717,
        "domP95": 54.90000000002328
      },
      "step": {
        "emitP50": 8.599999999976717,
        "emitP95": 23.699999999953434,
        "domP50": 9.300000000046566,
        "domP95": 25.199999999953434
      },
      "reset": {
        "emitP50": 32.79999999993015,
        "emitP95": 99.09999999997672,
        "domP50": 32.79999999993015,
        "domP95": 99.5
      },
      "append100": {
        "emitP50": 15.70000000006985,
        "emitP95": 17.699999999953434,
        "domP50": 16,
        "domP95": 18.199999999953434
      },
      "control": {
        "emitP50": 6.200000000069849,
        "emitP95": 22.20000000006985,
        "domP50": 6.5,
        "domP95": 22.400000000023283
      },
      "heapMb": 5.496269226074219,
      "heapCode": 3.1718177795410156,
      "heapData": 1.8768577575683594,
      "pssTotalMb": 238.197265625,
      "pssApp": 131.8173828125,
      "pssRenderer": 106.3798828125,
      "relaunchReadyMs": 375.4000000000233,
      "relaunchHeapMb": 4.5315093994140625,
      "relaunchHeapCode": 2.3233795166015625,
      "relaunchHeapData": 1.8299903869628906
    }
  }
]
```
</details>
