# Phase 16 shapes — flat objects & hybrid workflow (2026-10-28)

Measured alone on `emulator-5554` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.73 ms, p95 8.87 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 47 / CODE-BOUND 0 / FAIL 38

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.36 ± 0.05 | 8.82 ± 0.58 | 24.5× | FAIL | allow 7.1 (control emitP50 6.5×1) |
| flat | 50.setKey.emitP95 | 1.52 ± 1.74 | 20.36 ± 2.51 | 13.4× | PLATFORM-BOUND | allow 20.8 (control emitP95 16.5×1) |
| flat | 50.setKey.domP50 | 3.18 ± 2.10 | 9.50 ± 0.53 | 3.0× | PLATFORM-BOUND | allow 9.4 (control domP50 6.8×1) |
| flat | 50.setKey.domP95 | 7.62 ± 1.11 | 20.92 ± 2.46 | 2.7× | PLATFORM-BOUND | allow 20.4 (control domP95 16.8×1) |
| flat | 50.setKeys.emitP50 | 0.40 ± 0.10 | 9.62 ± 1.35 | 24.0× | FAIL | allow 7.9 (control emitP50 6.5×1) |
| flat | 50.setKeys.emitP95 | 2.10 ± 0.91 | 22.16 ± 4.61 | 10.6× | PLATFORM-BOUND | allow 22.0 (control emitP95 16.5×1) |
| flat | 50.setKeys.domP50 | 2.86 ± 2.23 | 10.10 ± 1.48 | 3.5× | PLATFORM-BOUND | allow 10.5 (control domP50 6.8×1) |
| flat | 50.setKeys.domP95 | 11.64 ± 4.10 | 22.78 ± 4.66 | 2.0× | PLATFORM-BOUND | allow 25.6 (control domP95 16.8×1) |
| flat | 50.replace.emitP50 | 0.36 ± 0.09 | 7.60 ± 0.34 | 21.1× | FAIL | allow 6.9 (control emitP50 6.5×1) |
| flat | 50.replace.emitP95 | 1.74 ± 1.68 | 21.96 ± 4.54 | 12.6× | PLATFORM-BOUND | allow 22.7 (control emitP95 16.5×1) |
| flat | 50.replace.domP50 | 1.96 ± 1.67 | 8.08 ± 0.43 | 4.1× | PLATFORM-BOUND | allow 8.9 (control domP50 6.8×1) |
| flat | 50.replace.domP95 | 8.82 ± 2.64 | 22.56 ± 4.38 | 2.6× | PLATFORM-BOUND | allow 23.8 (control domP95 16.8×1) |
| flat | 50.burst.lagP50 | 0.32 ± 0.04 | 7.00 ± 0.67 | 21.9× | PLATFORM-BOUND | allow 7.2 (control emitP50 6.5×1) |
| flat | 50.burst.lagP95 | 1.10 ± 0.90 | 16.20 ± 1.56 | 14.7× | PLATFORM-BOUND | allow 19.0 (control emitP95 16.5×1) |
| flat | 50.burst.endLag | 0.38 ± 0.11 | 7.12 ± 1.25 | 18.7× | PLATFORM-BOUND | allow 7.8 (control emitP50 6.5×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 50.heapMb | 3.72 ± 0.00 | 5.05 ± 0.01 | 1.4× | FAIL | code +1.16 MB; data 1.51 -> 1.62 MB |
| flat | 50.pssTotalMb | 223.60 ± 1.84 | 234.83 ± 1.08 | 1.1× | FAIL | allow 5.6 (plugin baseline 2.7 MB) |
| flat | 500.setKey.emitP50 | 0.50 ± 0.00 | 9.06 ± 0.38 | 18.1× | FAIL | allow 6.9 (control emitP50 6.5×1) |
| flat | 500.setKey.emitP95 | 1.56 ± 0.61 | 23.08 ± 2.59 | 14.8× | FAIL | allow 19.0 (control emitP95 15.8×1) |
| flat | 500.setKey.domP50 | 2.94 ± 1.57 | 9.66 ± 0.48 | 3.3× | PLATFORM-BOUND | allow 9.0 (control domP50 6.9×1) |
| flat | 500.setKey.domP95 | 9.64 ± 2.30 | 23.74 ± 2.68 | 2.5× | PLATFORM-BOUND | allow 21.3 (control domP95 16.3×1) |
| flat | 500.setKeys.emitP50 | 0.54 ± 0.05 | 9.88 ± 0.74 | 18.3× | FAIL | allow 7.3 (control emitP50 6.5×1) |
| flat | 500.setKeys.emitP95 | 3.68 ± 3.45 | 24.66 ± 7.32 | 6.7× | PLATFORM-BOUND | allow 26.6 (control emitP95 15.8×1) |
| flat | 500.setKeys.domP50 | 2.14 ± 1.72 | 10.42 ± 0.86 | 4.9× | PLATFORM-BOUND | allow 9.5 (control domP50 6.9×1) |
| flat | 500.setKeys.domP95 | 8.40 ± 1.36 | 25.18 ± 7.35 | 3.0× | PLATFORM-BOUND | allow 25.0 (control domP95 16.3×1) |
| flat | 500.replace.emitP50 | 0.34 ± 0.05 | 8.72 ± 0.89 | 25.6× | FAIL | allow 7.4 (control emitP50 6.5×1) |
| flat | 500.replace.emitP95 | 1.70 ± 0.92 | 22.06 ± 0.97 | 13.0× | FAIL | allow 17.7 (control emitP95 15.8×1) |
| flat | 500.replace.domP50 | 1.24 ± 0.26 | 9.30 ± 0.71 | 7.5× | FAIL | allow 7.9 (control domP50 6.9×1) |
| flat | 500.replace.domP95 | 10.66 ± 2.66 | 22.70 ± 1.02 | 2.1× | PLATFORM-BOUND | allow 20.0 (control domP95 16.3×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 7.10 ± 0.55 | 17.7× | PLATFORM-BOUND | allow 7.1 (control emitP50 6.5×1) |
| flat | 500.burst.lagP95 | 1.20 ± 0.85 | 20.02 ± 2.35 | 16.7× | PLATFORM-BOUND | allow 19.0 (control emitP95 15.8×1) |
| flat | 500.burst.endLag | 0.44 ± 0.05 | 8.54 ± 1.61 | 19.4× | PLATFORM-BOUND | allow 8.2 (control emitP50 6.5×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.40 ± 0.55 | 2400000000.0× | FAIL |  |
| flat | 500.heapMb | 4.01 ± 0.07 | 5.54 ± 0.00 | 1.4× | FAIL | code +1.29 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 225.12 ± 2.10 | 235.61 ± 0.70 | 1.0× | FAIL | allow 5.5 (plugin baseline 2.7 MB) |
| flat | 5000.setKey.emitP50 | 1.64 ± 0.05 | 10.26 ± 0.42 | 6.3× | FAIL | allow 6.7 (control emitP50 6.2×1) |
| flat | 5000.setKey.emitP95 | 4.10 ± 1.59 | 20.32 ± 2.08 | 5.0× | PLATFORM-BOUND | allow 18.8 (control emitP95 15.1×1) |
| flat | 5000.setKey.domP50 | 3.30 ± 0.69 | 11.50 ± 0.48 | 3.5× | FAIL | allow 7.7 (control domP50 6.5×1) |
| flat | 5000.setKey.domP95 | 8.96 ± 1.05 | 21.76 ± 3.23 | 2.4× | PLATFORM-BOUND | allow 19.7 (control domP95 15.4×1) |
| flat | 5000.setKeys.emitP50 | 1.62 ± 0.08 | 10.52 ± 0.28 | 6.5× | FAIL | allow 6.5 (control emitP50 6.2×1) |
| flat | 5000.setKeys.emitP95 | 3.62 ± 1.33 | 23.56 ± 6.41 | 6.5× | PLATFORM-BOUND | allow 22.8 (control emitP95 15.1×1) |
| flat | 5000.setKeys.domP50 | 3.32 ± 0.92 | 11.40 ± 0.52 | 3.4× | FAIL | allow 7.9 (control domP50 6.5×1) |
| flat | 5000.setKeys.domP95 | 8.08 ± 1.50 | 24.14 ± 6.31 | 3.0× | PLATFORM-BOUND | allow 23.2 (control domP95 15.4×1) |
| flat | 5000.replace.emitP50 | 0.42 ± 0.11 | 13.46 ± 0.93 | 32.0× | FAIL | allow 7.2 (control emitP50 6.2×1) |
| flat | 5000.replace.emitP95 | 3.44 ± 1.96 | 23.90 ± 2.79 | 6.9× | FAIL | allow 19.8 (control emitP95 15.1×1) |
| flat | 5000.replace.domP50 | 1.88 ± 0.36 | 14.00 ± 0.86 | 7.4× | FAIL | allow 7.7 (control domP50 6.5×1) |
| flat | 5000.replace.domP95 | 7.12 ± 1.69 | 24.40 ± 2.75 | 3.4× | PLATFORM-BOUND | allow 19.9 (control domP95 15.4×1) |
| flat | 5000.burst.lagP50 | 1.44 ± 0.05 | 8.82 ± 0.50 | 6.1× | FAIL | allow 6.7 (control emitP50 6.2×1) |
| flat | 5000.burst.lagP95 | 2.84 ± 0.90 | 17.26 ± 1.56 | 6.1× | PLATFORM-BOUND | allow 17.5 (control emitP95 15.1×1) |
| flat | 5000.burst.endLag | 1.38 ± 0.18 | 8.14 ± 1.28 | 5.9× | PLATFORM-BOUND | allow 7.6 (control emitP50 6.2×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.10 ± 0.00 | 9.93 ± 0.01 | 1.2× | FAIL | code +1.23 MB; data 5.73 -> 6.26 MB |
| flat | 5000.pssTotalMb | 232.40 ± 0.82 | 249.51 ± 1.00 | 1.1× | FAIL | allow 4.5 (plugin baseline 2.7 MB) |
| workflow | edit_d1.emitP50 | 0.44 ± 0.09 | 9.38 ± 0.53 | 21.3× | FAIL | allow 7.6 (control emitP50 7.0×1) |
| workflow | edit_d1.emitP95 | 1.48 ± 0.71 | 18.18 ± 2.64 | 12.3× | PLATFORM-BOUND | allow 20.9 (control emitP95 17.6×1) |
| workflow | edit_d1.domP50 | 3.38 ± 1.98 | 10.34 ± 0.73 | 3.1× | PLATFORM-BOUND | allow 10.0 (control domP50 7.3×1) |
| workflow | edit_d1.domP95 | 10.06 ± 3.24 | 19.44 ± 3.00 | 1.9× | PLATFORM-BOUND | allow 24.2 (control domP95 17.9×1) |
| workflow | edit_d4.emitP50 | 0.40 ± 0.00 | 8.54 ± 1.25 | 21.3× | PLATFORM-BOUND | allow 8.2 (control emitP50 7.0×1) |
| workflow | edit_d4.emitP95 | 1.24 ± 0.46 | 17.40 ± 0.58 | 14.0× | PLATFORM-BOUND | allow 18.6 (control emitP95 17.6×1) |
| workflow | edit_d4.domP50 | 3.04 ± 1.58 | 9.20 ± 1.54 | 3.0× | PLATFORM-BOUND | allow 10.4 (control domP50 7.3×1) |
| workflow | edit_d4.domP95 | 8.66 ± 0.90 | 17.80 ± 0.50 | 2.1× | PLATFORM-BOUND | allow 19.3 (control domP95 17.9×1) |
| workflow | edit_d10.emitP50 | 0.44 ± 0.05 | 8.20 ± 0.25 | 18.6× | FAIL | allow 7.3 (control emitP50 7.0×1) |
| workflow | edit_d10.emitP95 | 0.98 ± 0.22 | 19.30 ± 0.84 | 19.7× | PLATFORM-BOUND | allow 18.6 (control emitP95 17.6×1) |
| workflow | edit_d10.domP50 | 2.38 ± 1.33 | 8.86 ± 0.44 | 3.7× | PLATFORM-BOUND | allow 9.1 (control domP50 7.3×1) |
| workflow | edit_d10.domP95 | 8.48 ± 1.32 | 19.76 ± 0.79 | 2.3× | PLATFORM-BOUND | allow 20.0 (control domP95 17.9×1) |
| workflow | loadCycle.emitP50 | 5.88 ± 7.37 | 18.54 ± 2.88 | 3.2× | PLATFORM-BOUND | allow 24.2 (control emitP50 7.0×2) |
| workflow | loadCycle.emitP95 | 33.44 ± 0.80 | 54.66 ± 3.34 | 1.6× | PLATFORM-BOUND | allow 39.3 (control emitP95 17.6×2) |
| workflow | loadCycle.domP50 | 6.44 ± 7.84 | 18.82 ± 2.85 | 2.9× | PLATFORM-BOUND | allow 25.3 (control domP50 7.3×2) |
| workflow | loadCycle.domP95 | 34.38 ± 1.10 | 55.08 ± 3.17 | 1.6× | PLATFORM-BOUND | allow 40.2 (control domP95 17.9×2) |
| workflow | step.emitP50 | 0.36 ± 0.05 | 7.70 ± 0.48 | 21.4× | PLATFORM-BOUND | allow 7.5 (control emitP50 7.0×1) |
| workflow | step.emitP95 | 1.14 ± 0.83 | 24.30 ± 3.96 | 21.3× | FAIL | allow 22.4 (control emitP95 17.6×1) |
| workflow | step.domP50 | 2.84 ± 2.17 | 8.18 ± 0.51 | 2.9× | PLATFORM-BOUND | allow 10.0 (control domP50 7.3×1) |
| workflow | step.domP95 | 8.70 ± 1.37 | 25.20 ± 3.73 | 2.9× | PLATFORM-BOUND | allow 23.0 (control domP95 17.9×1) |
| workflow | reset.emitP50 | 0.28 ± 0.04 | 26.54 ± 3.64 | 94.8× | FAIL | allow 10.7 (control emitP50 7.0×1) |
| workflow | reset.emitP95 | 0.58 ± 0.15 | 44.04 ± 5.74 | 75.9× | FAIL | allow 23.5 (control emitP95 17.6×1) |
| workflow | reset.domP50 | 0.30 ± 0.00 | 26.54 ± 3.64 | 88.5× | FAIL | allow 10.9 (control domP50 7.3×1) |
| workflow | reset.domP95 | 1.42 ± 0.24 | 44.36 ± 5.98 | 31.2× | FAIL | allow 24.2 (control domP95 17.9×1) |
| workflow | append100.emitP50 | 0.38 ± 0.04 | 14.16 ± 1.67 | 37.3× | FAIL | allow 8.7 (control emitP50 7.0×1) |
| workflow | append100.emitP95 | 1.22 ± 0.79 | 22.30 ± 3.53 | 18.3× | PLATFORM-BOUND | allow 21.9 (control emitP95 17.6×1) |
| workflow | append100.domP50 | 1.12 ± 0.34 | 14.72 ± 1.71 | 13.1× | FAIL | allow 9.3 (control domP50 7.3×1) |
| workflow | append100.domP95 | 3.82 ± 1.48 | 22.92 ± 3.28 | 6.0× | PLATFORM-BOUND | allow 22.7 (control domP95 17.9×1) |
| workflow | heapMb | 3.90 ± 0.07 | 5.49 ± 0.00 | 1.4× | FAIL | code +1.28 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 224.62 ± 1.51 | 239.91 ± 0.98 | 1.1× | FAIL | allow 5.2 (plugin baseline 2.7 MB) |
| workflow | relaunchReadyMs | 1595.80 ± 21.71 | 923.74 ± 658.80 | 0.6× | PASS |  |
| workflow | relaunchHeapMb | 3.33 ± 0.04 | 4.42 ± 0.12 | 1.3× | FAIL | code +0.70 MB; data 1.45 -> 1.82 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 6.46 | 6.76 | 16.80 | 8.82 | 9.50 | 20.92 |
| 500 | 6.50 | 6.90 | 16.28 | 9.06 | 9.66 | 23.74 |
| 5000 | 6.18 | 6.48 | 15.44 | 10.26 | 11.50 | 21.76 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 125.8 | 131.1 | 97.8 | 103.7 |
| flat 500 | 124.7 | 131.1 | 100.4 | 104.5 |
| flat 5000 | 126.0 | 139.7 | 106.4 | 109.9 |
| workflow | 125.8 | 134.3 | 98.8 | 105.6 |

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
          "emitP95": 0.40000000002328306,
          "domP50": 5.2000000000116415,
          "domP95": 6.5
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.599999999976717,
          "domP50": 5.7999999999883585,
          "domP95": 17.70000000001164
        },
        "replace": {
          "emitP50": 0.29999999998835847,
          "emitP95": 4.7000000000116415,
          "domP50": 4.900000000023283,
          "domP95": 12.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.29999999998835847,
          "lagP95": 0.9000000000232831,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.723876953125,
        "heapCode": 1.8441238403320312,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 222.017578125,
        "pssApp": 124.392578125,
        "pssRenderer": 97.625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.2999999999883585,
          "domP50": 3.2999999999883585,
          "domP95": 8.900000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 9.399999999965075,
          "domP50": 1.5,
          "domP95": 9.799999999988358
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2,
          "domP50": 1.7000000000116415,
          "domP95": 9.700000000011642
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6999999999534339,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.9747772216796875,
        "heapCode": 1.696624755859375,
        "heapData": 1.8917236328125,
        "pssTotalMb": 223.1201171875,
        "pssApp": 123.283203125,
        "pssRenderer": 99.8369140625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.7000000000116415,
          "emitP95": 4.7999999999883585,
          "domP50": 3,
          "domP95": 9.200000000011642
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 2.5,
          "domP50": 3,
          "domP95": 7.2999999999883585
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 2.900000000023283,
          "domP50": 2.099999999976717,
          "domP95": 8.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 3.099999999976717,
          "endLag": 1.599999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.096939086914062,
        "heapCode": 1.8450660705566406,
        "heapData": 5.725639343261719,
        "pssTotalMb": 231.2421875,
        "pssApp": 125.353515625,
        "pssRenderer": 105.888671875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.6000000000349246,
        "domP50": 1.3999999999650754,
        "domP95": 9.799999999988358
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.900000000023283,
        "domP50": 1.7999999999883585,
        "domP95": 8.400000000023283
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7000000000116415,
        "domP50": 1.099999999976717,
        "domP95": 7.099999999976717
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 34.70000000001164,
        "domP50": 0.5999999999767169,
        "domP95": 35.09999999997672
      },
      "step": {
        "emitP50": 0.3999999999650754,
        "emitP95": 0.6000000000349246,
        "domP50": 1.5,
        "domP95": 8.400000000023283
      },
      "reset": {
        "emitP50": 0.29999999998835847,
        "emitP95": 0.6000000000349246,
        "domP50": 0.29999999998835847,
        "domP95": 1.2999999999883585
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 2.599999999976717,
        "domP50": 1.599999999976717,
        "domP95": 6.2999999999883585
      },
      "heapMb": 3.93475341796875,
      "heapCode": 1.9231376647949219,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 224.544921875,
      "pssApp": 125.986328125,
      "pssRenderer": 98.55859375,
      "relaunchReadyMs": 1618.2000000000116,
      "relaunchHeapMb": 3.2580604553222656,
      "relaunchHeapCode": 1.4547996520996094,
      "relaunchHeapData": 1.4437255859375
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.899999999965075,
          "emitP95": 21.399999999965075,
          "domP50": 9.299999999988358,
          "domP95": 21.79999999998836
        },
        "setKeys": {
          "emitP50": 8.299999999988358,
          "emitP95": 18.70000000001164,
          "domP50": 8.599999999976717,
          "domP95": 19.20000000001164
        },
        "replace": {
          "emitP50": 7.7000000000116415,
          "emitP95": 27.79999999998836,
          "domP50": 8,
          "domP95": 28.20000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.7000000000116415,
          "lagP95": 16.5,
          "endLag": 6.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.052299499511719,
        "heapCode": 2.9973716735839844,
        "heapData": 1.6156158447265625,
        "pssTotalMb": 234.4267578125,
        "pssApp": 131.1728515625,
        "pssRenderer": 103.25390625,
        "control": {
          "emitP50": 6.5,
          "emitP95": 13.900000000023283,
          "domP50": 7.100000000034925,
          "domP95": 14.200000000011642
        },
        "fCommitP50": 3.7999999999883585,
        "fCommitP95": 4.7999999999883585
      },
      "500": {
        "setKey": {
          "emitP50": 8.5,
          "emitP95": 25.5,
          "domP50": 9,
          "domP95": 26.5
        },
        "setKeys": {
          "emitP50": 9.599999999976717,
          "emitP95": 22,
          "domP50": 10.200000000011642,
          "domP95": 22.79999999998836
        },
        "replace": {
          "emitP50": 8.399999999965075,
          "emitP95": 20.5,
          "domP50": 9.100000000034925,
          "domP95": 21.20000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8,
          "lagP95": 24,
          "endLag": 7.7000000000116415,
          "maxBacklog": 3
        },
        "heapMb": 5.544811248779297,
        "heapCode": 3.0207977294921875,
        "heapData": 2.0685501098632812,
        "pssTotalMb": 234.5625,
        "pssApp": 130.330078125,
        "pssRenderer": 104.232421875,
        "control": {
          "emitP50": 6,
          "emitP95": 15,
          "domP50": 6.400000000023283,
          "domP95": 15.299999999988358
        },
        "fCommitP50": 3.7000000000116415,
        "fCommitP95": 4.7000000000116415
      },
      "5000": {
        "setKey": {
          "emitP50": 10.899999999965075,
          "emitP95": 21.900000000023283,
          "domP50": 12.199999999953434,
          "domP95": 26.099999999976717
        },
        "setKeys": {
          "emitP50": 10.400000000023283,
          "emitP95": 16.20000000001164,
          "domP50": 11.899999999965075,
          "domP95": 16.70000000001164
        },
        "replace": {
          "emitP50": 13.799999999988358,
          "emitP95": 21.599999999976717,
          "domP50": 14.299999999988358,
          "domP95": 22
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.100000000034925,
          "lagP95": 15.799999999988358,
          "endLag": 6.5,
          "maxBacklog": 2
        },
        "heapMb": 9.938240051269531,
        "heapCode": 3.0796966552734375,
        "heapData": 6.2602386474609375,
        "pssTotalMb": 247.8076171875,
        "pssApp": 138.54296875,
        "pssRenderer": 109.2646484375,
        "control": {
          "emitP50": 6.100000000034925,
          "emitP95": 12.700000000011642,
          "domP50": 6.5,
          "domP95": 13.100000000034925
        },
        "fCommitP50": 3.6000000000349246,
        "fCommitP95": 5.899999999965075
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.299999999988358,
        "emitP95": 19.400000000023283,
        "domP50": 9.899999999965075,
        "domP95": 20.70000000001164
      },
      "edit_d4": {
        "emitP50": 8.400000000023283,
        "emitP95": 18.199999999953434,
        "domP50": 9.299999999988358,
        "domP95": 18.5
      },
      "edit_d10": {
        "emitP50": 8.099999999976717,
        "emitP95": 18.70000000001164,
        "domP50": 8.599999999976717,
        "domP95": 19.100000000034925
      },
      "loadCycle": {
        "emitP50": 17.5,
        "emitP95": 56.59999999997672,
        "domP50": 17.600000000034925,
        "domP95": 56.59999999997672
      },
      "step": {
        "emitP50": 8.099999999976717,
        "emitP95": 21.5,
        "domP50": 8.699999999953434,
        "domP95": 22.199999999953434
      },
      "reset": {
        "emitP50": 28.79999999998836,
        "emitP95": 49.79999999998836,
        "domP50": 28.79999999998836,
        "domP95": 49.79999999998836
      },
      "append100": {
        "emitP50": 12.200000000011642,
        "emitP95": 26.900000000023283,
        "domP50": 12.600000000034925,
        "domP95": 27.20000000001164
      },
      "control": {
        "emitP50": 8.200000000011642,
        "emitP95": 21.599999999976717,
        "domP50": 8.5,
        "domP95": 22.099999999976717
      },
      "heapMb": 5.487773895263672,
      "heapCode": 3.1724205017089844,
      "heapData": 1.8676605224609375,
      "pssTotalMb": 239.6640625,
      "pssApp": 134.3095703125,
      "pssRenderer": 105.3544921875,
      "relaunchReadyMs": 423.0999999999767,
      "relaunchHeapMb": 4.531978607177734,
      "relaunchHeapCode": 2.3239593505859375,
      "relaunchHeapData": 1.8299407958984375
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.799999999988358,
          "emitP95": 21,
          "domP50": 10.399999999965075,
          "domP95": 21.5
        },
        "setKeys": {
          "emitP50": 8.299999999988358,
          "emitP95": 27.599999999976717,
          "domP50": 8.599999999976717,
          "domP95": 28
        },
        "replace": {
          "emitP50": 7.2000000000116415,
          "emitP95": 20.20000000001164,
          "domP50": 7.5,
          "domP95": 20.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.300000000046566,
          "lagP95": 15,
          "endLag": 5.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.065967559814453,
        "heapCode": 3.0098800659179688,
        "heapData": 1.6158561706542969,
        "pssTotalMb": 233.3876953125,
        "pssApp": 130.02734375,
        "pssRenderer": 103.3603515625,
        "control": {
          "emitP50": 6.5,
          "emitP95": 13.200000000011642,
          "domP50": 6.7999999999883585,
          "domP95": 13.5
        },
        "fCommitP50": 3.8999999999650754,
        "fCommitP95": 9
      },
      "500": {
        "setKey": {
          "emitP50": 9.099999999976717,
          "emitP95": 23.5,
          "domP50": 9.599999999976717,
          "domP95": 23.800000000046566
        },
        "setKeys": {
          "emitP50": 9.799999999988358,
          "emitP95": 36.600000000034925,
          "domP50": 10.299999999988358,
          "domP95": 37.20000000001164
        },
        "replace": {
          "emitP50": 9.300000000046566,
          "emitP95": 21.79999999998836,
          "domP50": 9.800000000046566,
          "domP95": 22.29999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.100000000034925,
          "lagP95": 19.79999999998836,
          "endLag": 10.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.544460296630859,
        "heapCode": 3.020832061767578,
        "heapData": 2.0683326721191406,
        "pssTotalMb": 235.2802734375,
        "pssApp": 131.2958984375,
        "pssRenderer": 103.984375,
        "control": {
          "emitP50": 7.2000000000116415,
          "emitP95": 15.600000000034925,
          "domP50": 7.399999999965075,
          "domP95": 16
        },
        "fCommitP50": 3.7000000000116415,
        "fCommitP95": 11.699999999953434
      },
      "5000": {
        "setKey": {
          "emitP50": 9.79999999993015,
          "emitP95": 22,
          "domP50": 11,
          "domP95": 22.5
        },
        "setKeys": {
          "emitP50": 10.699999999953434,
          "emitP95": 29.699999999953434,
          "domP50": 11.199999999953434,
          "domP95": 29.900000000023283
        },
        "replace": {
          "emitP50": 12.79999999993015,
          "emitP95": 28.599999999976717,
          "domP50": 13.699999999953434,
          "domP95": 28.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.600000000093132,
          "lagP95": 16.199999999953434,
          "endLag": 8.5,
          "maxBacklog": 2
        },
        "heapMb": 9.925098419189453,
        "heapCode": 3.0674400329589844,
        "heapData": 6.2602386474609375,
        "pssTotalMb": 249.9716796875,
        "pssApp": 140.4306640625,
        "pssRenderer": 109.541015625,
        "control": {
          "emitP50": 6,
          "emitP95": 12.399999999906868,
          "domP50": 6.200000000069849,
          "domP95": 12.79999999993015
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 8.199999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 10,
        "emitP95": 20.300000000046566,
        "domP50": 11.099999999976717,
        "domP95": 20.699999999953434
      },
      "edit_d4": {
        "emitP50": 10.699999999953434,
        "emitP95": 17.800000000046566,
        "domP50": 11.800000000046566,
        "domP95": 18.099999999976717
      },
      "edit_d10": {
        "emitP50": 7.800000000046566,
        "emitP95": 18.800000000046566,
        "domP50": 8.300000000046566,
        "domP95": 19.400000000023283
      },
      "loadCycle": {
        "emitP50": 22.5,
        "emitP95": 51.40000000002328,
        "domP50": 22.599999999976717,
        "domP95": 51.800000000046566
      },
      "step": {
        "emitP50": 7.799999999930151,
        "emitP95": 30.5,
        "domP50": 8.100000000093132,
        "domP95": 31.300000000046566
      },
      "reset": {
        "emitP50": 25.400000000023283,
        "emitP95": 36.90000000002328,
        "domP50": 25.400000000023283,
        "domP95": 36.90000000002328
      },
      "append100": {
        "emitP50": 12.5,
        "emitP95": 25.29999999993015,
        "domP50": 13.20000000006985,
        "domP95": 25.599999999976717
      },
      "control": {
        "emitP50": 7.100000000093132,
        "emitP95": 14.199999999953434,
        "domP50": 7.5,
        "domP95": 14.599999999976717
      },
      "heapMb": 5.485591888427734,
      "heapCode": 3.1702117919921875,
      "heapData": 1.8676834106445312,
      "pssTotalMb": 238.5087890625,
      "pssApp": 133.095703125,
      "pssRenderer": 105.4130859375,
      "relaunchReadyMs": 896.4000000000233,
      "relaunchHeapMb": 4.263721466064453,
      "relaunchHeapCode": 2.122936248779297,
      "relaunchHeapData": 1.7650375366210938
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
          "domP50": 5.699999999953434,
          "domP95": 6.800000000046566
        },
        "setKeys": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.5999999999767169,
          "domP50": 4.699999999953434,
          "domP95": 6.300000000046566
        },
        "replace": {
          "emitP50": 0.5,
          "emitP95": 1.1999999999534339,
          "domP50": 1.400000000023283,
          "domP95": 6.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.39999999990686774,
          "lagP95": 0.7000000000698492,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.7238922119140625,
        "heapCode": 1.8441200256347656,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 222.3212890625,
        "pssApp": 124.7626953125,
        "pssRenderer": 97.55859375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.5,
          "domP50": 5.5,
          "domP95": 7.599999999976717
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.099999999976717,
          "domP50": 5.200000000069849,
          "domP95": 8.599999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.199999999953434,
          "domP50": 1.2000000000698492,
          "domP95": 11.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 2.700000000069849,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.9748306274414062,
        "heapCode": 1.6966781616210938,
        "heapData": 1.8917236328125,
        "pssTotalMb": 223.55859375,
        "pssApp": 123.7578125,
        "pssRenderer": 99.80078125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.7000000000698492,
          "emitP95": 4.800000000046566,
          "domP50": 4.5,
          "domP95": 8.70000000006985
        },
        "setKeys": {
          "emitP50": 1.7000000000698492,
          "emitP95": 4.300000000046566,
          "domP50": 4.900000000023283,
          "domP95": 10.199999999953434
        },
        "replace": {
          "emitP50": 0.5999999999767169,
          "emitP95": 3.900000000023283,
          "domP50": 2.400000000023283,
          "domP95": 8.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.299999999930151,
          "endLag": 1.1000000000931323,
          "maxBacklog": 0
        },
        "heapMb": 8.097244262695312,
        "heapCode": 1.8451194763183594,
        "heapData": 5.725639343261719,
        "pssTotalMb": 231.833984375,
        "pssApp": 125.189453125,
        "pssRenderer": 106.64453125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 5.699999999953434,
        "domP95": 6.800000000046566
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 1.400000000023283,
        "domP95": 9.400000000023283
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 0.8000000000465661,
        "domP50": 1.5,
        "domP95": 9
      },
      "loadCycle": {
        "emitP50": 14.099999999976717,
        "emitP95": 32.5,
        "domP50": 15.800000000046566,
        "domP95": 33
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 5,
        "domP95": 8.20000000006985
      },
      "reset": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.5,
        "domP50": 0.2999999999301508,
        "domP95": 1.1999999999534339
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.6999999999534339,
        "domP50": 1.099999999976717,
        "domP95": 3.400000000023283
      },
      "heapMb": 3.9339752197265625,
      "heapCode": 1.9223213195800781,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 222.8994140625,
      "pssApp": 124.09765625,
      "pssRenderer": 98.8017578125,
      "relaunchReadyMs": 1571.4000000000233,
      "relaunchHeapMb": 3.3520660400390625,
      "relaunchHeapCode": 1.5400581359863281,
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
          "emitP95": 0.9000000000232831,
          "domP50": 1.6999999999534339,
          "domP95": 7.5
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.5,
          "domP50": 1.2000000000698492,
          "domP95": 10.900000000023283
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1.400000000023283,
          "domP50": 1.599999999976717,
          "domP95": 8
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 2.700000000069849,
          "endLag": 0.39999999990686774,
          "maxBacklog": 0
        },
        "heapMb": 3.723949432373047,
        "heapCode": 1.8442535400390625,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 222.4736328125,
        "pssApp": 124.982421875,
        "pssRenderer": 97.4912109375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.400000000023283,
          "domP50": 1.5,
          "domP95": 8.20000000006985
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 4.400000000023283,
          "domP50": 1.099999999976717,
          "domP95": 6.300000000046566
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.9000000000232831,
          "domP50": 1.099999999976717,
          "domP95": 14.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8000000000465661,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.1314239501953125,
        "heapCode": 1.848480224609375,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 228.4560546875,
        "pssApp": 126.8212890625,
        "pssRenderer": 101.634765625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6000000000931323,
          "emitP95": 2.199999999953434,
          "domP50": 3,
          "domP95": 10.29999999993015
        },
        "setKeys": {
          "emitP50": 1.6999999999534339,
          "emitP95": 5.200000000069849,
          "domP50": 2.700000000069849,
          "domP95": 7.099999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1,
          "domP50": 1.6000000000931323,
          "domP95": 5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.400000000023283,
          "endLag": 1.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 8.099163055419922,
        "heapCode": 1.8475990295410156,
        "heapData": 5.725063323974609,
        "pssTotalMb": 232.9306640625,
        "pssApp": 126.431640625,
        "pssRenderer": 106.4990234375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.400000000023283,
        "domP50": 3.699999999953434,
        "domP95": 8.400000000023283
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.5,
        "domP50": 3.400000000023283,
        "domP95": 9.29999999993015
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.099999999976717,
        "domP50": 1.8000000000465661,
        "domP95": 8
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33.09999999997672,
        "domP50": 0.7000000000698492,
        "domP95": 35.79999999993015
      },
      "step": {
        "emitP50": 0.39999999990686774,
        "emitP95": 2.599999999976717,
        "domP50": 1.400000000023283,
        "domP95": 7.700000000069849
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6000000000931323,
        "domP50": 0.30000000004656613,
        "domP95": 1.8000000000465661
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1999999999534339,
        "domP50": 1.3000000000465661,
        "domP95": 3
      },
      "heapMb": 3.9354820251464844,
      "heapCode": 1.9237747192382812,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 225.9814453125,
      "pssApp": 126.728515625,
      "pssRenderer": 99.2529296875,
      "relaunchReadyMs": 1575.5999999999767,
      "relaunchHeapMb": 3.352062225341797,
      "relaunchHeapCode": 1.5400428771972656,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.400000000023283,
          "emitP95": 17.900000000023283,
          "domP50": 9.300000000046566,
          "domP95": 18.599999999976717
        },
        "setKeys": {
          "emitP50": 11.5,
          "emitP95": 16.199999999953434,
          "domP50": 11.899999999906868,
          "domP95": 16.699999999953434
        },
        "replace": {
          "emitP50": 7.599999999976717,
          "emitP95": 25.400000000023283,
          "domP50": 8.199999999953434,
          "domP95": 25.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7,
          "lagP95": 17.5,
          "endLag": 7.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.052417755126953,
        "heapCode": 2.997608184814453,
        "heapData": 1.6156158447265625,
        "pssTotalMb": 236.353515625,
        "pssApp": 132.353515625,
        "pssRenderer": 104,
        "control": {
          "emitP50": 6.300000000046566,
          "emitP95": 21.5,
          "domP50": 6.5,
          "domP95": 21.79999999993015
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 9.5
      },
      "500": {
        "setKey": {
          "emitP50": 9.300000000046566,
          "emitP95": 22.400000000023283,
          "domP50": 9.900000000023283,
          "domP95": 23.400000000023283
        },
        "setKeys": {
          "emitP50": 10.20000000006985,
          "emitP95": 26.20000000006985,
          "domP50": 10.600000000093132,
          "domP95": 26.5
        },
        "replace": {
          "emitP50": 7.599999999976717,
          "emitP95": 22.900000000023283,
          "domP50": 8.400000000023283,
          "domP95": 23.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7,
          "lagP95": 19.099999999976717,
          "endLag": 6.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.544898986816406,
        "heapCode": 3.0207252502441406,
        "heapData": 2.0685958862304688,
        "pssTotalMb": 236.3583984375,
        "pssApp": 131.6435546875,
        "pssRenderer": 104.71484375,
        "control": {
          "emitP50": 6.100000000093132,
          "emitP95": 16.300000000046566,
          "domP50": 6.599999999976717,
          "domP95": 17.300000000046566
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 12.400000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 10.100000000093132,
          "emitP95": 21.400000000023283,
          "domP50": 11.5,
          "domP95": 22.800000000046566
        },
        "setKeys": {
          "emitP50": 10.900000000023283,
          "emitP95": 30.099999999976717,
          "domP50": 11.5,
          "domP95": 30.699999999953434
        },
        "replace": {
          "emitP50": 12.600000000093132,
          "emitP95": 23.5,
          "domP50": 13,
          "domP95": 24
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.100000000093132,
          "lagP95": 18.899999999906868,
          "endLag": 8.100000000093132,
          "maxBacklog": 2
        },
        "heapMb": 9.929058074951172,
        "heapCode": 3.0713577270507812,
        "heapData": 6.260231018066406,
        "pssTotalMb": 249.5166015625,
        "pssApp": 139.2978515625,
        "pssRenderer": 110.21875,
        "control": {
          "emitP50": 6.299999999930151,
          "emitP95": 16.70000000006985,
          "domP50": 6.699999999953434,
          "domP95": 17
        },
        "fCommitP50": 3.700000000069849,
        "fCommitP95": 11.800000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.70000000006985,
        "emitP95": 13.599999999976717,
        "domP50": 9.5,
        "domP95": 14.199999999953434
      },
      "edit_d4": {
        "emitP50": 7.699999999953434,
        "emitP95": 17,
        "domP50": 8,
        "domP95": 17.399999999906868
      },
      "edit_d10": {
        "emitP50": 8.400000000023283,
        "emitP95": 20,
        "domP50": 9.300000000046566,
        "domP95": 20.400000000023283
      },
      "loadCycle": {
        "emitP50": 15.300000000046566,
        "emitP95": 52,
        "domP50": 15.599999999976717,
        "domP95": 52.699999999953434
      },
      "step": {
        "emitP50": 7.300000000046566,
        "emitP95": 22.599999999976717,
        "domP50": 7.800000000046566,
        "domP95": 22.899999999906868
      },
      "reset": {
        "emitP50": 23,
        "emitP95": 38.90000000002328,
        "domP50": 23,
        "domP95": 38.90000000002328
      },
      "append100": {
        "emitP50": 15.5,
        "emitP95": 19.400000000023283,
        "domP50": 16.20000000006985,
        "domP95": 19.699999999953434
      },
      "control": {
        "emitP50": 6.100000000093132,
        "emitP95": 15.599999999976717,
        "domP50": 6.400000000023283,
        "domP95": 15.900000000023283
      },
      "heapMb": 5.488037109375,
      "heapCode": 3.1726303100585938,
      "heapData": 1.8677139282226562,
      "pssTotalMb": 240.2021484375,
      "pssApp": 134.3408203125,
      "pssRenderer": 105.861328125,
      "relaunchReadyMs": 414.4000000000233,
      "relaunchHeapMb": 4.531929016113281,
      "relaunchHeapCode": 2.3238601684570312,
      "relaunchHeapData": 1.8300056457519531
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.599999999976717,
          "emitP95": 17.79999999993015,
          "domP50": 9.5,
          "domP95": 18.399999999906868
        },
        "setKeys": {
          "emitP50": 10,
          "emitP95": 24.199999999953434,
          "domP50": 11.099999999976717,
          "domP95": 25.099999999976717
        },
        "replace": {
          "emitP50": 7.399999999906868,
          "emitP95": 16.599999999976717,
          "domP50": 8,
          "domP95": 17.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.099999999976717,
          "lagP95": 14.20000000006985,
          "endLag": 8.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.050731658935547,
        "heapCode": 2.99609375,
        "heapData": 1.6156158447265625,
        "pssTotalMb": 234.8154296875,
        "pssApp": 130.921875,
        "pssRenderer": 103.8935546875,
        "control": {
          "emitP50": 7,
          "emitP95": 15.100000000093132,
          "domP50": 7.199999999953434,
          "domP95": 15.400000000023283
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 11.800000000046566
      },
      "500": {
        "setKey": {
          "emitP50": 9.5,
          "emitP95": 25,
          "domP50": 10.29999999993015,
          "domP95": 25.5
        },
        "setKeys": {
          "emitP50": 10.900000000023283,
          "emitP95": 17.900000000023283,
          "domP50": 11.70000000006985,
          "domP95": 18.300000000046566
        },
        "replace": {
          "emitP50": 9.900000000023283,
          "emitP95": 22.400000000023283,
          "domP50": 10.20000000006985,
          "domP95": 22.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.5,
          "lagP95": 17.800000000046566,
          "endLag": 8.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.541877746582031,
        "heapCode": 3.018230438232422,
        "heapData": 2.0683059692382812,
        "pssTotalMb": 235.990234375,
        "pssApp": 131.2783203125,
        "pssRenderer": 104.7119140625,
        "control": {
          "emitP50": 7.100000000093132,
          "emitP95": 15.29999999993015,
          "domP50": 7.699999999953434,
          "domP95": 15.699999999953434
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 7.599999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 10.400000000023283,
          "emitP95": 17.300000000046566,
          "domP50": 11.70000000006985,
          "domP95": 17.600000000093132
        },
        "setKeys": {
          "emitP50": 10.199999999953434,
          "emitP95": 23.699999999953434,
          "domP50": 10.599999999976717,
          "domP95": 24.5
        },
        "replace": {
          "emitP50": 13.199999999953434,
          "emitP95": 22,
          "domP50": 13.699999999953434,
          "domP95": 22.400000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.900000000023283,
          "lagP95": 19,
          "endLag": 7.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 9.939430236816406,
        "heapCode": 3.0809555053710938,
        "heapData": 6.26123046875,
        "pssTotalMb": 250.3955078125,
        "pssApp": 140.306640625,
        "pssRenderer": 110.0888671875,
        "control": {
          "emitP50": 6,
          "emitP95": 20.400000000023283,
          "domP50": 6.300000000046566,
          "domP95": 20.70000000006985
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 6.599999999976717
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.800000000046566,
        "emitP95": 18.599999999976717,
        "domP50": 11.099999999976717,
        "domP95": 19.900000000023283
      },
      "edit_d4": {
        "emitP50": 7.699999999953434,
        "emitP95": 17.20000000006985,
        "domP50": 8.199999999953434,
        "domP95": 17.70000000006985
      },
      "edit_d10": {
        "emitP50": 8.400000000023283,
        "emitP95": 18.599999999976717,
        "domP50": 9.300000000046566,
        "domP95": 19.099999999976717
      },
      "loadCycle": {
        "emitP50": 17,
        "emitP95": 59.40000000002328,
        "domP50": 17.400000000023283,
        "domP95": 59.70000000006985
      },
      "step": {
        "emitP50": 8.20000000006985,
        "emitP95": 25.899999999906868,
        "domP50": 8.70000000006985,
        "domP95": 26.199999999953434
      },
      "reset": {
        "emitP50": 23.800000000046566,
        "emitP95": 47.5,
        "domP50": 23.800000000046566,
        "domP95": 47.89999999990687
      },
      "append100": {
        "emitP50": 15,
        "emitP95": 20.20000000006985,
        "domP50": 15.400000000023283,
        "domP95": 20.70000000006985
      },
      "control": {
        "emitP50": 7.400000000023283,
        "emitP95": 20.199999999953434,
        "domP50": 7.700000000069849,
        "domP95": 20.5
      },
      "heapMb": 5.490398406982422,
      "heapCode": 3.1748504638671875,
      "heapData": 1.8676834106445312,
      "pssTotalMb": 241.22265625,
      "pssApp": 135.6416015625,
      "pssRenderer": 105.5810546875,
      "relaunchReadyMs": 2028.5999999999767,
      "relaunchHeapMb": 4.434558868408203,
      "relaunchHeapCode": 2.231792449951172,
      "relaunchHeapData": 1.8269462585449219
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.599999999976717,
          "domP50": 2.1000000000931323,
          "domP95": 8
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 2.900000000023283,
          "domP50": 1,
          "domP95": 10.79999999993015
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.8000000000465661,
          "domP50": 0.9000000000232831,
          "domP95": 11.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.7242660522460938,
        "heapCode": 1.8445587158203125,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 225.28515625,
        "pssApp": 126.9541015625,
        "pssRenderer": 98.3310546875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1,
          "domP50": 2.1000000000931323,
          "domP95": 13.400000000023283
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.5,
          "domP50": 1.400000000023283,
          "domP95": 8
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.6000000000931323,
          "domP50": 1.099999999976717,
          "domP95": 7
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.9747390747070312,
        "heapCode": 1.6965866088867188,
        "heapData": 1.8917236328125,
        "pssTotalMb": 225.17578125,
        "pssApp": 124.90234375,
        "pssRenderer": 100.2734375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 2.700000000069849,
          "domP50": 3.199999999953434,
          "domP95": 7.399999999906868
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 4.099999999976717,
          "domP50": 3.300000000046566,
          "domP95": 9.099999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 6.400000000023283,
          "domP50": 1.6999999999534339,
          "domP95": 7.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.099999999976717,
          "endLag": 1.3999999999068677,
          "maxBacklog": 0
        },
        "heapMb": 8.09722900390625,
        "heapCode": 1.8455123901367188,
        "heapData": 5.725063323974609,
        "pssTotalMb": 233.123046875,
        "pssApp": 126.58984375,
        "pssRenderer": 106.533203125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 2.5,
        "domP50": 4.799999999930151,
        "domP95": 9.900000000023283
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 5.400000000023283,
        "domP95": 9
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.1999999999534339,
        "domP50": 4.300000000046566,
        "domP95": 10.5
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 33.40000000002328,
        "domP50": 0.9000000000232831,
        "domP95": 33.79999999993015
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.7000000000698492,
        "domP50": 5.400000000023283,
        "domP95": 8.099999999976717
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 0.30000000004656613,
        "domP95": 1.5
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 0.8000000000465661,
        "domP95": 3.900000000023283
      },
      "heapMb": 3.7769317626953125,
      "heapCode": 1.7703590393066406,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 223.3935546875,
      "pssApp": 125.44921875,
      "pssRenderer": 97.9443359375,
      "relaunchReadyMs": 1615.0999999999767,
      "relaunchHeapMb": 3.3522262573242188,
      "relaunchHeapCode": 1.5400352478027344,
      "relaunchHeapData": 1.4465255737304688
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
          "domP50": 1.2000000000698492,
          "domP95": 9.29999999993015
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.900000000023283,
          "domP50": 1.599999999976717,
          "domP95": 12.5
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.5999999999767169,
          "domP50": 1,
          "domP95": 6.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.19999999995343387,
          "maxBacklog": 0
        },
        "heapMb": 3.724071502685547,
        "heapCode": 1.8443450927734375,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 225.912109375,
        "pssApp": 127.728515625,
        "pssRenderer": 98.18359375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 2.6000000000931323,
          "domP50": 2.299999999930151,
          "domP95": 10.099999999976717
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1,
          "domP50": 1.5,
          "domP95": 9.29999999993015
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.800000000046566,
          "domP50": 1.099999999976717,
          "domP95": 10.800000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8000000000465661,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.9725341796875,
        "heapCode": 1.6943817138671875,
        "heapData": 1.8917236328125,
        "pssTotalMb": 225.29296875,
        "pssApp": 124.9736328125,
        "pssRenderer": 100.3193359375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 6,
          "domP50": 2.800000000046566,
          "domP95": 9.199999999953434
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 2,
          "domP50": 2.699999999953434,
          "domP95": 6.700000000069849
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3,
          "domP50": 1.599999999976717,
          "domP95": 5.700000000069849
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 4.299999999930151,
          "endLag": 1.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 8.095573425292969,
        "heapCode": 1.8440628051757812,
        "heapData": 5.725063323974609,
        "pssTotalMb": 232.857421875,
        "pssApp": 126.3857421875,
        "pssRenderer": 106.4716796875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.5,
        "emitP95": 1.400000000023283,
        "domP50": 1.3000000000465661,
        "domP95": 15.400000000023283
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7999999999301508,
        "domP50": 3.199999999953434,
        "domP95": 7.199999999953434
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 3.200000000069849,
        "domP95": 7.800000000046566
      },
      "loadCycle": {
        "emitP50": 13.79999999993015,
        "emitP95": 33.5,
        "domP50": 14.199999999953434,
        "domP95": 34.20000000006985
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.8000000000465661,
        "domP50": 0.8999999999068677,
        "domP95": 11.100000000093132
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.40000000002328306,
        "domP50": 0.2999999999301508,
        "domP95": 1.3000000000465661
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7999999999301508,
        "domP50": 0.8000000000465661,
        "domP95": 2.5
      },
      "heapMb": 3.9365463256835938,
      "heapCode": 1.9246444702148438,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.2958984375,
      "pssApp": 126.9052734375,
      "pssRenderer": 99.390625,
      "relaunchReadyMs": 1598.6999999999534,
      "relaunchHeapMb": 3.3520889282226562,
      "relaunchHeapCode": 1.5400810241699219,
      "relaunchHeapData": 1.4463424682617188
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.400000000023283,
          "emitP95": 23.699999999953434,
          "domP50": 9,
          "domP95": 24.29999999993015
        },
        "setKeys": {
          "emitP50": 10,
          "emitP95": 24.099999999976717,
          "domP50": 10.300000000046566,
          "domP95": 24.900000000023283
        },
        "replace": {
          "emitP50": 8.099999999976717,
          "emitP95": 19.79999999993015,
          "domP50": 8.699999999953434,
          "domP95": 21
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.900000000023283,
          "lagP95": 17.79999999993015,
          "endLag": 7.099999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.0531768798828125,
        "heapCode": 2.998821258544922,
        "heapData": 1.6158599853515625,
        "pssTotalMb": 235.1845703125,
        "pssApp": 131.2705078125,
        "pssRenderer": 103.9140625,
        "control": {
          "emitP50": 6,
          "emitP95": 18.900000000023283,
          "domP50": 6.199999999953434,
          "domP95": 19.100000000093132
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 8
      },
      "500": {
        "setKey": {
          "emitP50": 8.900000000023283,
          "emitP95": 19,
          "domP50": 9.5,
          "domP95": 19.5
        },
        "setKeys": {
          "emitP50": 8.900000000023283,
          "emitP95": 20.600000000093132,
          "domP50": 9.300000000046566,
          "domP95": 21.100000000093132
        },
        "replace": {
          "emitP50": 8.400000000023283,
          "emitP95": 22.699999999953434,
          "domP50": 9,
          "domP95": 23.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.900000000023283,
          "lagP95": 19.400000000023283,
          "endLag": 9.79999999993015,
          "maxBacklog": 3
        },
        "heapMb": 5.546268463134766,
        "heapCode": 3.0220947265625,
        "heapData": 2.0685501098632812,
        "pssTotalMb": 235.8828125,
        "pssApp": 131.185546875,
        "pssRenderer": 104.697265625,
        "control": {
          "emitP50": 6.099999999976717,
          "emitP95": 16.800000000046566,
          "domP50": 6.400000000023283,
          "domP95": 17.099999999976717
        },
        "fCommitP50": 3.799999999930151,
        "fCommitP95": 8.199999999953434
      },
      "5000": {
        "setKey": {
          "emitP50": 10.099999999976717,
          "emitP95": 19,
          "domP50": 11.099999999976717,
          "domP95": 19.800000000046566
        },
        "setKeys": {
          "emitP50": 10.400000000023283,
          "emitP95": 18.099999999976717,
          "domP50": 11.800000000046566,
          "domP95": 18.899999999906868
        },
        "replace": {
          "emitP50": 14.900000000023283,
          "emitP95": 23.800000000046566,
          "domP50": 15.300000000046566,
          "domP95": 24.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.399999999906868,
          "lagP95": 16.400000000023283,
          "endLag": 10,
          "maxBacklog": 2
        },
        "heapMb": 9.938709259033203,
        "heapCode": 3.0802383422851562,
        "heapData": 6.260234832763672,
        "pssTotalMb": 249.853515625,
        "pssApp": 139.6904296875,
        "pssRenderer": 110.1630859375,
        "control": {
          "emitP50": 6.5,
          "emitP95": 13.20000000006985,
          "domP50": 6.699999999953434,
          "domP95": 13.599999999976717
        },
        "fCommitP50": 3.5,
        "fCommitP95": 12.79999999993015
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.099999999976717,
        "emitP95": 19,
        "domP50": 10.099999999976717,
        "domP95": 21.699999999953434
      },
      "edit_d4": {
        "emitP50": 8.20000000006985,
        "emitP95": 16.800000000046566,
        "domP50": 8.70000000006985,
        "domP95": 17.300000000046566
      },
      "edit_d10": {
        "emitP50": 8.29999999993015,
        "emitP95": 20.399999999906868,
        "domP50": 8.800000000046566,
        "domP95": 20.79999999993015
      },
      "loadCycle": {
        "emitP50": 20.400000000023283,
        "emitP95": 53.90000000002328,
        "domP50": 20.899999999906868,
        "domP95": 54.59999999997672
      },
      "step": {
        "emitP50": 7.099999999976717,
        "emitP95": 21,
        "domP50": 7.599999999976717,
        "domP95": 23.400000000023283
      },
      "reset": {
        "emitP50": 31.699999999953434,
        "emitP95": 47.10000000009313,
        "domP50": 31.699999999953434,
        "domP95": 48.300000000046566
      },
      "append100": {
        "emitP50": 15.600000000093132,
        "emitP95": 19.699999999953434,
        "domP50": 16.199999999953434,
        "domP95": 21.400000000023283
      },
      "control": {
        "emitP50": 6.099999999976717,
        "emitP95": 16.29999999993015,
        "domP50": 6.400000000023283,
        "domP95": 16.599999999976717
      },
      "heapMb": 5.485111236572266,
      "heapCode": 3.169689178466797,
      "heapData": 1.8679656982421875,
      "pssTotalMb": 239.9541015625,
      "pssApp": 133.9814453125,
      "pssRenderer": 105.97265625,
      "relaunchReadyMs": 856.1999999999534,
      "relaunchHeapMb": 4.324764251708984,
      "relaunchHeapCode": 2.1229209899902344,
      "relaunchHeapData": 1.8262901306152344
    }
  }
]
```
</details>
