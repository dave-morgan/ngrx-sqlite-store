# Phase 16 shapes — flat objects & hybrid workflow (2026-10-31)

Measured alone on `emulator-5556` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.70 ms, p95 7.47 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 1 / PLATFORM-BOUND 52 / CODE-BOUND 0 / FAIL 33

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.32 ± 0.04 | 9.98 ± 0.82 | 31.2× | FAIL | allow 7.7 (control emitP50 6.8×1) |
| flat | 50.setKey.emitP95 | 0.66 ± 0.21 | 23.68 ± 3.05 | 35.9× | FAIL | allow 22.7 (control emitP95 19.5×1) |
| flat | 50.setKey.domP50 | 5.42 ± 0.70 | 11.02 ± 0.84 | 2.0× | PLATFORM-BOUND | allow 8.6 (control domP50 7.1×1) |
| flat | 50.setKey.domP95 | 7.52 ± 1.00 | 24.64 ± 2.97 | 3.3× | PLATFORM-BOUND | allow 23.7 (control domP95 19.8×1) |
| flat | 50.setKeys.emitP50 | 0.36 ± 0.09 | 9.10 ± 0.79 | 25.3× | FAIL | allow 7.7 (control emitP50 6.8×1) |
| flat | 50.setKeys.emitP95 | 5.06 ± 4.38 | 23.18 ± 3.32 | 4.6× | PLATFORM-BOUND | allow 27.2 (control emitP95 19.5×1) |
| flat | 50.setKeys.domP50 | 4.12 ± 1.88 | 9.60 ± 0.83 | 2.3× | PLATFORM-BOUND | allow 9.8 (control domP50 7.1×1) |
| flat | 50.setKeys.domP95 | 9.46 ± 2.76 | 23.64 ± 3.44 | 2.5× | PLATFORM-BOUND | allow 26.0 (control domP95 19.8×1) |
| flat | 50.replace.emitP50 | 0.34 ± 0.09 | 8.90 ± 1.05 | 26.2× | FAIL | allow 8.0 (control emitP50 6.8×1) |
| flat | 50.replace.emitP95 | 2.62 ± 3.61 | 23.58 ± 4.51 | 9.0× | PLATFORM-BOUND | allow 27.6 (control emitP95 19.5×1) |
| flat | 50.replace.domP50 | 3.04 ± 2.05 | 9.46 ± 1.25 | 3.1× | PLATFORM-BOUND | allow 10.4 (control domP50 7.1×1) |
| flat | 50.replace.domP95 | 8.80 ± 2.29 | 24.00 ± 4.47 | 2.7× | PLATFORM-BOUND | allow 26.5 (control domP95 19.8×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 6.44 ± 0.48 | 21.5× | PLATFORM-BOUND | allow 7.3 (control emitP50 6.8×1) |
| flat | 50.burst.lagP95 | 0.60 ± 0.07 | 17.08 ± 2.12 | 28.5× | PLATFORM-BOUND | allow 21.7 (control emitP95 19.5×1) |
| flat | 50.burst.endLag | 0.36 ± 0.11 | 6.92 ± 1.48 | 19.2× | PLATFORM-BOUND | allow 8.4 (control emitP50 6.8×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.40 ± 0.55 | 2400000000.0× | FAIL |  |
| flat | 50.heapMb | 3.72 ± 0.00 | 5.08 ± 0.00 | 1.4× | FAIL | code +1.18 MB; data 1.51 -> 1.62 MB |
| flat | 50.pssTotalMb | 223.56 ± 2.01 | 234.93 ± 2.17 | 1.1× | FAIL | allow 6.8 (plugin baseline 2.6 MB) |
| flat | 500.setKey.emitP50 | 0.50 ± 0.10 | 8.42 ± 0.41 | 16.8× | FAIL | allow 7.8 (control emitP50 7.3×1) |
| flat | 500.setKey.emitP95 | 1.24 ± 0.52 | 27.28 ± 6.53 | 22.0× | PLATFORM-BOUND | allow 26.9 (control emitP95 19.8×1) |
| flat | 500.setKey.domP50 | 4.98 ± 1.18 | 9.24 ± 0.50 | 1.9× | PLATFORM-BOUND | allow 9.3 (control domP50 7.6×1) |
| flat | 500.setKey.domP95 | 8.44 ± 1.77 | 28.42 ± 6.17 | 3.4× | PLATFORM-BOUND | allow 28.1 (control domP95 20.1×1) |
| flat | 500.setKeys.emitP50 | 0.48 ± 0.08 | 10.76 ± 1.79 | 22.4× | FAIL | allow 9.2 (control emitP50 7.3×1) |
| flat | 500.setKeys.emitP95 | 2.38 ± 2.04 | 24.96 ± 5.47 | 10.5× | PLATFORM-BOUND | allow 27.4 (control emitP95 19.8×1) |
| flat | 500.setKeys.domP50 | 4.30 ± 1.70 | 11.80 ± 1.48 | 2.7× | PLATFORM-BOUND | allow 10.8 (control domP50 7.6×1) |
| flat | 500.setKeys.domP95 | 7.92 ± 1.61 | 25.96 ± 5.59 | 3.3× | PLATFORM-BOUND | allow 27.3 (control domP95 20.1×1) |
| flat | 500.replace.emitP50 | 0.38 ± 0.04 | 9.50 ± 0.56 | 25.0× | FAIL | allow 7.9 (control emitP50 7.3×1) |
| flat | 500.replace.emitP95 | 3.50 ± 2.70 | 20.48 ± 1.69 | 5.9× | PLATFORM-BOUND | allow 24.2 (control emitP95 19.8×1) |
| flat | 500.replace.domP50 | 1.92 ± 1.61 | 9.98 ± 0.53 | 5.2× | PLATFORM-BOUND | allow 9.8 (control domP50 7.6×1) |
| flat | 500.replace.domP95 | 12.68 ± 4.01 | 20.94 ± 1.70 | 1.7× | PLATFORM-BOUND | allow 25.8 (control domP95 20.1×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 7.28 ± 0.65 | 18.2× | PLATFORM-BOUND | allow 7.9 (control emitP50 7.3×1) |
| flat | 500.burst.lagP95 | 0.76 ± 0.15 | 18.40 ± 2.12 | 24.2× | PLATFORM-BOUND | allow 22.1 (control emitP95 19.8×1) |
| flat | 500.burst.endLag | 0.38 ± 0.11 | 9.02 ± 1.67 | 23.7× | PLATFORM-BOUND | allow 9.1 (control emitP50 7.3×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.40 ± 0.55 | 2400000000.0× | FAIL |  |
| flat | 500.heapMb | 4.13 ± 0.00 | 5.57 ± 0.01 | 1.3× | FAIL | code +1.19 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 227.76 ± 1.75 | 235.65 ± 2.40 | 1.0× | FAIL | allow 6.7 (plugin baseline 2.6 MB) |
| flat | 5000.setKey.emitP50 | 1.72 ± 0.13 | 10.92 ± 1.01 | 6.3× | FAIL | allow 8.0 (control emitP50 6.9×1) |
| flat | 5000.setKey.emitP95 | 5.86 ± 3.16 | 23.54 ± 3.54 | 4.0× | PLATFORM-BOUND | allow 28.6 (control emitP95 21.9×1) |
| flat | 5000.setKey.domP50 | 3.74 ± 0.47 | 11.66 ± 1.15 | 3.1× | PLATFORM-BOUND | allow 8.9 (control domP50 7.3×1) |
| flat | 5000.setKey.domP95 | 12.66 ± 1.93 | 24.84 ± 3.16 | 2.0× | PLATFORM-BOUND | allow 27.2 (control domP95 22.1×1) |
| flat | 5000.setKeys.emitP50 | 1.58 ± 0.04 | 10.30 ± 0.82 | 6.5× | FAIL | allow 7.7 (control emitP50 6.9×1) |
| flat | 5000.setKeys.emitP95 | 5.00 ± 2.13 | 28.90 ± 7.43 | 5.8× | PLATFORM-BOUND | allow 31.5 (control emitP95 21.9×1) |
| flat | 5000.setKeys.domP50 | 4.42 ± 1.67 | 10.80 ± 0.80 | 2.4× | PLATFORM-BOUND | allow 9.7 (control domP50 7.3×1) |
| flat | 5000.setKeys.domP95 | 12.10 ± 2.29 | 30.78 ± 6.88 | 2.5× | PLATFORM-BOUND | allow 31.3 (control domP95 22.1×1) |
| flat | 5000.replace.emitP50 | 0.38 ± 0.04 | 12.66 ± 0.63 | 33.3× | FAIL | allow 7.5 (control emitP50 6.9×1) |
| flat | 5000.replace.emitP95 | 4.34 ± 2.06 | 24.26 ± 1.80 | 5.6× | PLATFORM-BOUND | allow 25.8 (control emitP95 21.9×1) |
| flat | 5000.replace.domP50 | 2.12 ± 0.66 | 13.52 ± 0.65 | 6.4× | FAIL | allow 8.6 (control domP50 7.3×1) |
| flat | 5000.replace.domP95 | 10.12 ± 3.00 | 24.80 ± 1.70 | 2.5× | PLATFORM-BOUND | allow 26.8 (control domP95 22.1×1) |
| flat | 5000.burst.lagP50 | 1.46 ± 0.11 | 9.32 ± 0.28 | 6.4× | FAIL | allow 7.3 (control emitP50 6.9×1) |
| flat | 5000.burst.lagP95 | 2.48 ± 0.55 | 21.10 ± 2.24 | 8.5× | PLATFORM-BOUND | allow 24.7 (control emitP95 21.9×1) |
| flat | 5000.burst.endLag | 1.28 ± 0.26 | 9.38 ± 1.74 | 7.3× | PLATFORM-BOUND | allow 8.9 (control emitP50 6.9×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.10 ± 0.00 | 9.95 ± 0.01 | 1.2× | FAIL | code +1.25 MB; data 5.73 -> 6.26 MB |
| flat | 5000.pssTotalMb | 232.71 ± 2.45 | 249.80 ± 1.75 | 1.1× | FAIL | allow 6.8 (plugin baseline 2.6 MB) |
| workflow | edit_d1.emitP50 | 0.36 ± 0.05 | 9.30 ± 0.58 | 25.8× | FAIL | allow 7.9 (control emitP50 7.2×1) |
| workflow | edit_d1.emitP95 | 1.04 ± 0.55 | 21.76 ± 3.38 | 20.9× | PLATFORM-BOUND | allow 31.5 (control emitP95 27.5×1) |
| workflow | edit_d1.domP50 | 5.56 ± 0.40 | 9.94 ± 0.61 | 1.8× | PLATFORM-BOUND | allow 8.5 (control domP50 7.5×1) |
| workflow | edit_d1.domP95 | 8.28 ± 1.52 | 22.82 ± 3.38 | 2.8× | PLATFORM-BOUND | allow 32.8 (control domP95 27.9×1) |
| workflow | edit_d4.emitP50 | 0.36 ± 0.05 | 9.66 ± 1.07 | 26.8× | FAIL | allow 8.3 (control emitP50 7.2×1) |
| workflow | edit_d4.emitP95 | 0.88 ± 0.28 | 23.00 ± 4.49 | 26.1× | PLATFORM-BOUND | allow 32.3 (control emitP95 27.5×1) |
| workflow | edit_d4.domP50 | 4.84 ± 1.21 | 10.24 ± 1.33 | 2.1× | PLATFORM-BOUND | allow 10.1 (control domP50 7.5×1) |
| workflow | edit_d4.domP95 | 8.78 ± 1.65 | 23.64 ± 4.58 | 2.7× | PLATFORM-BOUND | allow 34.1 (control domP95 27.9×1) |
| workflow | edit_d10.emitP50 | 0.44 ± 0.05 | 8.44 ± 1.10 | 19.2× | PLATFORM-BOUND | allow 8.4 (control emitP50 7.2×1) |
| workflow | edit_d10.emitP95 | 1.36 ± 0.55 | 20.50 ± 3.34 | 15.1× | PLATFORM-BOUND | allow 31.4 (control emitP95 27.5×1) |
| workflow | edit_d10.domP50 | 3.56 ± 2.07 | 9.00 ± 1.14 | 2.5× | PLATFORM-BOUND | allow 10.7 (control domP50 7.5×1) |
| workflow | edit_d10.domP95 | 9.12 ± 2.78 | 21.12 ± 3.21 | 2.3× | PLATFORM-BOUND | allow 33.9 (control domP95 27.9×1) |
| workflow | loadCycle.emitP50 | 0.78 ± 0.42 | 15.68 ± 3.49 | 20.1× | PLATFORM-BOUND | allow 18.4 (control emitP50 7.2×2) |
| workflow | loadCycle.emitP95 | 33.48 ± 1.07 | 57.64 ± 6.84 | 1.7× | PLATFORM-BOUND | allow 63.0 (control emitP95 27.5×2) |
| workflow | loadCycle.domP50 | 0.94 ± 0.42 | 15.80 ± 3.48 | 16.8× | PLATFORM-BOUND | allow 18.9 (control domP50 7.5×2) |
| workflow | loadCycle.domP95 | 34.12 ± 1.56 | 58.02 ± 6.77 | 1.7× | PLATFORM-BOUND | allow 64.1 (control domP95 27.9×2) |
| workflow | step.emitP50 | 0.34 ± 0.05 | 8.70 ± 0.58 | 25.6× | FAIL | allow 7.9 (control emitP50 7.2×1) |
| workflow | step.emitP95 | 1.22 ± 0.90 | 24.20 ± 2.19 | 19.8× | PLATFORM-BOUND | allow 30.6 (control emitP95 27.5×1) |
| workflow | step.domP50 | 3.50 ± 1.96 | 9.08 ± 0.58 | 2.6× | PLATFORM-BOUND | allow 10.1 (control domP50 7.5×1) |
| workflow | step.domP95 | 9.50 ± 1.90 | 24.64 ± 2.18 | 2.6× | PLATFORM-BOUND | allow 32.0 (control domP95 27.9×1) |
| workflow | reset.emitP50 | 0.22 ± 0.04 | 26.94 ± 3.19 | 122.5× | FAIL | allow 10.5 (control emitP50 7.2×1) |
| workflow | reset.emitP95 | 0.68 ± 0.41 | 74.64 ± 21.08 | 109.8× | FAIL | allow 49.0 (control emitP95 27.5×1) |
| workflow | reset.domP50 | 0.26 ± 0.05 | 26.96 ± 3.17 | 103.7× | FAIL | allow 10.7 (control domP50 7.5×1) |
| workflow | reset.domP95 | 1.32 ± 0.52 | 74.74 ± 21.20 | 56.6× | FAIL | allow 49.6 (control domP95 27.9×1) |
| workflow | append100.emitP50 | 0.36 ± 0.05 | 13.76 ± 1.26 | 38.2× | FAIL | allow 8.5 (control emitP50 7.2×1) |
| workflow | append100.emitP95 | 0.58 ± 0.22 | 23.32 ± 6.47 | 40.2× | PLATFORM-BOUND | allow 34.2 (control emitP95 27.5×1) |
| workflow | append100.domP50 | 1.28 ± 0.80 | 14.42 ± 1.34 | 11.3× | FAIL | allow 9.7 (control domP50 7.5×1) |
| workflow | append100.domP95 | 6.12 ± 0.70 | 23.60 ± 6.41 | 3.9× | PLATFORM-BOUND | allow 35.0 (control domP95 27.9×1) |
| workflow | heapMb | 3.94 ± 0.00 | 5.52 ± 0.01 | 1.4× | FAIL | code +1.27 MB; data 1.63 -> 1.88 MB |
| workflow | pssTotalMb | 225.08 ± 2.15 | 239.64 ± 2.18 | 1.1× | FAIL | allow 6.9 (plugin baseline 2.6 MB) |
| workflow | relaunchReadyMs | 1455.54 ± 31.00 | 605.14 ± 238.33 | 0.4× | PASS |  |
| workflow | relaunchHeapMb | 3.31 ± 0.05 | 4.52 ± 0.18 | 1.4× | FAIL | code +0.76 MB; data 1.45 -> 1.79 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 6.84 | 7.06 | 19.76 | 9.98 | 11.02 | 24.64 |
| 500 | 7.30 | 7.64 | 20.14 | 8.42 | 9.24 | 28.42 |
| 5000 | 6.86 | 7.28 | 22.14 | 10.92 | 11.66 | 24.84 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 127.3 | 132.4 | 96.3 | 102.5 |
| flat 500 | 127.6 | 132.6 | 100.1 | 103.0 |
| flat 5000 | 127.7 | 141.3 | 105.0 | 108.5 |
| workflow | 127.4 | 135.1 | 97.7 | 104.5 |

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
          "domP50": 5.899999999965075,
          "domP95": 7.2999999999883585
        },
        "setKeys": {
          "emitP50": 0.29999999998835847,
          "emitP95": 4,
          "domP50": 5.400000000023283,
          "domP95": 6.899999999965075
        },
        "replace": {
          "emitP50": 0.20000000001164153,
          "emitP95": 0.7999999999883585,
          "domP50": 3.5,
          "domP95": 6.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.6000000000349246,
          "endLag": 0.3999999999650754,
          "maxBacklog": 0
        },
        "heapMb": 3.723712921142578,
        "heapCode": 1.8440170288085938,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 220.6982421875,
        "pssApp": 125.0029296875,
        "pssRenderer": 95.6953125
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.1000000000349246,
          "domP50": 5.599999999976717,
          "domP95": 11
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 3.2000000000116415,
          "domP50": 4.199999999953434,
          "domP95": 8.400000000023283
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 1.3999999999650754,
          "domP50": 1,
          "domP95": 19.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000116415,
          "endLag": 0.3999999999650754,
          "maxBacklog": 0
        },
        "heapMb": 4.135013580322266,
        "heapCode": 1.8520164489746094,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 225.7734375,
        "pssApp": 126.5390625,
        "pssRenderer": 99.234375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.7000000000116415,
          "emitP95": 3.2999999999883585,
          "domP50": 3.7000000000116415,
          "domP95": 15
        },
        "setKeys": {
          "emitP50": 1.6000000000349246,
          "emitP95": 8.200000000011642,
          "domP50": 3.2999999999883585,
          "domP95": 9.400000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 7.699999999953434,
          "domP50": 2.6000000000349246,
          "domP95": 9
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.599999999976717,
          "lagP95": 2.400000000023283,
          "endLag": 1.3000000000465661,
          "maxBacklog": 0
        },
        "heapMb": 8.097522735595703,
        "heapCode": 1.8454132080078125,
        "heapData": 5.725620269775391,
        "pssTotalMb": 230.3466796875,
        "pssApp": 126.5556640625,
        "pssRenderer": 103.791015625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.3000000000465661,
        "domP50": 5,
        "domP95": 8.200000000011642
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.2000000000116415,
        "domP50": 5.099999999976717,
        "domP95": 9.599999999976717
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.7999999999883585,
        "domP50": 4.400000000023283,
        "domP95": 13.5
      },
      "loadCycle": {
        "emitP50": 1.5,
        "emitP95": 33.40000000002328,
        "domP50": 1.6000000000349246,
        "domP95": 33.90000000002328
      },
      "step": {
        "emitP50": 0.3999999999650754,
        "emitP95": 2.199999999953434,
        "domP50": 4,
        "domP95": 8.399999999965075
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 0.5,
        "domP50": 0.20000000001164153,
        "domP95": 1.7000000000116415
      },
      "append100": {
        "emitP50": 0.3999999999650754,
        "emitP95": 0.7000000000116415,
        "domP50": 0.7999999999883585,
        "domP95": 6.7999999999883585
      },
      "heapMb": 3.93487548828125,
      "heapCode": 1.9231796264648438,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 222.5244140625,
      "pssApp": 125.462890625,
      "pssRenderer": 97.0615234375,
      "relaunchReadyMs": 1442.7000000000116,
      "relaunchHeapMb": 3.351665496826172,
      "relaunchHeapCode": 1.5398826599121094,
      "relaunchHeapData": 1.4463119506835938
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.900000000023283,
          "emitP95": 27.600000000034925,
          "domP50": 10.299999999988358,
          "domP95": 28.20000000001164
        },
        "setKeys": {
          "emitP50": 10.399999999965075,
          "emitP95": 19.300000000046566,
          "domP50": 11,
          "domP95": 19.600000000034925
        },
        "replace": {
          "emitP50": 9,
          "emitP95": 27.600000000034925,
          "domP50": 9.5,
          "domP95": 27.79999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.2000000000116415,
          "lagP95": 16.099999999976717,
          "endLag": 7.7000000000116415,
          "maxBacklog": 2
        },
        "heapMb": 5.081333160400391,
        "heapCode": 3.025440216064453,
        "heapData": 1.6160392761230469,
        "pssTotalMb": 232.0859375,
        "pssApp": 130.564453125,
        "pssRenderer": 101.521484375,
        "control": {
          "emitP50": 7.099999999976717,
          "emitP95": 16.20000000001164,
          "domP50": 7.2999999999883585,
          "domP95": 16.5
        },
        "fCommitP50": 3.6000000000349246,
        "fCommitP95": 9
      },
      "500": {
        "setKey": {
          "emitP50": 9,
          "emitP95": 24.5,
          "domP50": 9.800000000046566,
          "domP95": 25.599999999976717
        },
        "setKeys": {
          "emitP50": 9.5,
          "emitP95": 30.199999999953434,
          "domP50": 10.199999999953434,
          "domP95": 30.599999999976717
        },
        "replace": {
          "emitP50": 10,
          "emitP95": 19.900000000023283,
          "domP50": 10.299999999988358,
          "domP95": 20.29999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.699999999953434,
          "lagP95": 19.900000000023283,
          "endLag": 9,
          "maxBacklog": 3
        },
        "heapMb": 5.572113037109375,
        "heapCode": 3.0472068786621094,
        "heapData": 2.0689926147460938,
        "pssTotalMb": 232.84375,
        "pssApp": 130.548828125,
        "pssRenderer": 102.294921875,
        "control": {
          "emitP50": 8.599999999976717,
          "emitP95": 23.900000000023283,
          "domP50": 8.799999999988358,
          "domP95": 24.20000000001164
        },
        "fCommitP50": 4.2000000000116415,
        "fCommitP95": 6.199999999953434
      },
      "5000": {
        "setKey": {
          "emitP50": 9.799999999988358,
          "emitP95": 21.20000000001164,
          "domP50": 10.299999999988358,
          "domP95": 21.70000000001164
        },
        "setKeys": {
          "emitP50": 11.400000000023283,
          "emitP95": 39.40000000002328,
          "domP50": 11.799999999988358,
          "domP95": 39.800000000046566
        },
        "replace": {
          "emitP50": 12.300000000046566,
          "emitP95": 24.20000000001164,
          "domP50": 13.200000000011642,
          "domP95": 24.70000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.399999999965075,
          "lagP95": 22.20000000001164,
          "endLag": 12,
          "maxBacklog": 2
        },
        "heapMb": 9.947990417480469,
        "heapCode": 3.090087890625,
        "heapData": 6.260478973388672,
        "pssTotalMb": 248.07421875,
        "pssApp": 140.5966796875,
        "pssRenderer": 107.4775390625,
        "control": {
          "emitP50": 6.7999999999883585,
          "emitP95": 17.400000000023283,
          "domP50": 7.7000000000116415,
          "domP95": 17.600000000034925
        },
        "fCommitP50": 4.2000000000116415,
        "fCommitP95": 6.5
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.599999999976717,
        "emitP95": 16.900000000023283,
        "domP50": 9.199999999953434,
        "domP95": 17.400000000023283
      },
      "edit_d4": {
        "emitP50": 11.199999999953434,
        "emitP95": 19.5,
        "domP50": 12.299999999988358,
        "domP95": 20.29999999998836
      },
      "edit_d10": {
        "emitP50": 8.599999999976717,
        "emitP95": 23.099999999976717,
        "domP50": 9.299999999988358,
        "domP95": 23.5
      },
      "loadCycle": {
        "emitP50": 20.70000000001164,
        "emitP95": 60.09999999997672,
        "domP50": 20.79999999998836,
        "domP95": 60.5
      },
      "step": {
        "emitP50": 9.400000000023283,
        "emitP95": 22.70000000001164,
        "domP50": 9.700000000011642,
        "domP95": 23.20000000001164
      },
      "reset": {
        "emitP50": 27.599999999976717,
        "emitP95": 92.09999999997672,
        "domP50": 27.599999999976717,
        "domP95": 92.5
      },
      "append100": {
        "emitP50": 14.900000000023283,
        "emitP95": 23.79999999998836,
        "domP50": 15.299999999988358,
        "domP95": 24
      },
      "control": {
        "emitP50": 5.7999999999883585,
        "emitP95": 34.699999999953434,
        "domP50": 6.099999999976717,
        "domP95": 34.899999999965075
      },
      "heapMb": 5.510650634765625,
      "heapCode": 3.1926956176757812,
      "heapData": 1.8702049255371094,
      "pssTotalMb": 237.0966796875,
      "pssApp": 133.6162109375,
      "pssRenderer": 103.48046875,
      "relaunchReadyMs": 880.2999999999884,
      "relaunchHeapMb": 4.2711029052734375,
      "relaunchHeapCode": 2.1306610107421875,
      "relaunchHeapData": 1.7648696899414062
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9.400000000023283,
          "emitP95": 19.399999999965075,
          "domP50": 10,
          "domP95": 20.199999999953434
        },
        "setKeys": {
          "emitP50": 8.599999999976717,
          "emitP95": 21,
          "domP50": 9.099999999976717,
          "domP95": 21.20000000001164
        },
        "replace": {
          "emitP50": 10.200000000011642,
          "emitP95": 25.70000000001164,
          "domP50": 10.900000000023283,
          "domP95": 26.29999999998836
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 16.099999999976717,
          "endLag": 6.099999999976717,
          "maxBacklog": 3
        },
        "heapMb": 5.073276519775391,
        "heapCode": 3.01763916015625,
        "heapData": 1.6160354614257812,
        "pssTotalMb": 233.3525390625,
        "pssApp": 131.7890625,
        "pssRenderer": 101.5634765625,
        "control": {
          "emitP50": 7.400000000023283,
          "emitP95": 21.79999999998836,
          "domP50": 7.600000000034925,
          "domP95": 22
        },
        "fCommitP50": 3.5,
        "fCommitP95": 5.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 8.5,
          "emitP95": 26.400000000023283,
          "domP50": 9.600000000034925,
          "domP95": 27.70000000001164
        },
        "setKeys": {
          "emitP50": 13.300000000046566,
          "emitP95": 24.5,
          "domP50": 13.700000000011642,
          "domP95": 26.79999999998836
        },
        "replace": {
          "emitP50": 8.899999999965075,
          "emitP95": 20.29999999998836,
          "domP50": 9.300000000046566,
          "domP95": 20.70000000001164
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.2000000000116415,
          "lagP95": 19.399999999965075,
          "endLag": 6.400000000023283,
          "maxBacklog": 3
        },
        "heapMb": 5.570014953613281,
        "heapCode": 3.0450057983398438,
        "heapData": 2.0689926147460938,
        "pssTotalMb": 233.208984375,
        "pssApp": 131.2666015625,
        "pssRenderer": 101.9423828125,
        "control": {
          "emitP50": 7.100000000093132,
          "emitP95": 18.800000000046566,
          "domP50": 7.399999999906868,
          "domP95": 19.099999999976717
        },
        "fCommitP50": 3.699999999953434,
        "fCommitP95": 5.300000000046566
      },
      "5000": {
        "setKey": {
          "emitP50": 12.20000000006985,
          "emitP95": 23.599999999976717,
          "domP50": 13.099999999976717,
          "domP95": 24.20000000006985
        },
        "setKeys": {
          "emitP50": 10.899999999906868,
          "emitP95": 21.099999999976717,
          "domP50": 11.399999999906868,
          "domP95": 24.099999999976717
        },
        "replace": {
          "emitP50": 12.099999999976717,
          "emitP95": 27.300000000046566,
          "domP50": 12.900000000023283,
          "domP95": 27.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.70000000006985,
          "lagP95": 21.400000000023283,
          "endLag": 9.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.95943832397461,
        "heapCode": 3.1007537841796875,
        "heapData": 6.2603607177734375,
        "pssTotalMb": 247.8984375,
        "pssApp": 140.513671875,
        "pssRenderer": 107.384765625,
        "control": {
          "emitP50": 7.699999999953434,
          "emitP95": 18.900000000023283,
          "domP50": 8,
          "domP95": 19.099999999976717
        },
        "fCommitP50": 4,
        "fCommitP95": 6.400000000023283
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9,
        "emitP95": 20.599999999976717,
        "domP50": 9.599999999976717,
        "domP95": 24
      },
      "edit_d4": {
        "emitP50": 9.699999999953434,
        "emitP95": 22.79999999993015,
        "domP50": 10.199999999953434,
        "domP95": 23.199999999953434
      },
      "edit_d10": {
        "emitP50": 9.70000000006985,
        "emitP95": 19.79999999993015,
        "domP50": 10.300000000046566,
        "domP95": 20.699999999953434
      },
      "loadCycle": {
        "emitP50": 17.300000000046566,
        "emitP95": 50.29999999993015,
        "domP50": 17.400000000023283,
        "domP95": 50.79999999993015
      },
      "step": {
        "emitP50": 9,
        "emitP95": 23.20000000006985,
        "domP50": 9.5,
        "domP95": 23.800000000046566
      },
      "reset": {
        "emitP50": 24.199999999953434,
        "emitP95": 54.5,
        "domP50": 24.199999999953434,
        "domP95": 54.5
      },
      "append100": {
        "emitP50": 11.70000000006985,
        "emitP95": 17.300000000046566,
        "domP50": 12.400000000023283,
        "domP95": 17.699999999953434
      },
      "control": {
        "emitP50": 7,
        "emitP95": 26.20000000006985,
        "domP50": 7.400000000023283,
        "domP95": 26.600000000093132
      },
      "heapMb": 5.507171630859375,
      "heapCode": 3.1911964416503906,
      "heapData": 1.8683624267578125,
      "pssTotalMb": 237.5234375,
      "pssApp": 133.6181640625,
      "pssRenderer": 103.9052734375,
      "relaunchReadyMs": 406.29999999993015,
      "relaunchHeapMb": 4.544807434082031,
      "relaunchHeapCode": 2.3360862731933594,
      "relaunchHeapData": 1.8308067321777344
    }
  },
  {
    "impl": "classic",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.7000000000698492,
          "domP50": 5.900000000023283,
          "domP95": 7.800000000046566
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 11.600000000093132,
          "domP50": 5.599999999976717,
          "domP95": 12.400000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8000000000465661,
          "domP50": 5.899999999906868,
          "domP95": 10
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.723834991455078,
        "heapCode": 1.8440628051757812,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 222.65234375,
        "pssApp": 127.3369140625,
        "pssRenderer": 95.3154296875
      },
      "500": {
        "setKey": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1.5,
          "domP50": 5.600000000093132,
          "domP95": 7.399999999906868
        },
        "setKeys": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.8000000000465661,
          "domP50": 5.600000000093132,
          "domP95": 7.100000000093132
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 6.5,
          "domP50": 4.799999999930151,
          "domP95": 9.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8000000000465661,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.134941101074219,
        "heapCode": 1.8519554138183594,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 225.919921875,
        "pssApp": 126.52734375,
        "pssRenderer": 99.392578125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.599999999976717,
          "emitP95": 7.100000000093132,
          "domP50": 4.400000000023283,
          "domP95": 13.100000000093132
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 5.099999999976717,
          "domP50": 3.700000000069849,
          "domP95": 12.29999999993015
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 3.900000000023283,
          "domP50": 1.6999999999534339,
          "domP95": 6.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 2.099999999976717,
          "endLag": 0.8999999999068677,
          "maxBacklog": 0
        },
        "heapMb": 8.097095489501953,
        "heapCode": 1.8455429077148438,
        "heapData": 5.725063323974609,
        "pssTotalMb": 230.3974609375,
        "pssApp": 126.4140625,
        "pssRenderer": 103.9833984375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.599999999976717,
        "domP50": 5.300000000046566,
        "domP95": 9.099999999976717
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 5.599999999976717,
        "domP95": 11.29999999993015
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.099999999976717,
        "domP50": 1.6000000000931323,
        "domP95": 9.899999999906868
      },
      "loadCycle": {
        "emitP50": 0.40000000002328306,
        "emitP95": 32.5,
        "domP50": 0.6999999999534339,
        "domP95": 33
      },
      "step": {
        "emitP50": 0.2999999999301508,
        "emitP95": 0.5999999999767169,
        "domP50": 0.8000000000465661,
        "domP95": 8.20000000006985
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.6000000000931323,
        "domP50": 0.2000000000698492,
        "domP95": 0.8999999999068677
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.40000000002328306,
        "domP50": 0.9000000000232831,
        "domP95": 5.400000000023283
      },
      "heapMb": 3.935352325439453,
      "heapCode": 1.9236564636230469,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 222.9384765625,
      "pssApp": 126.349609375,
      "pssRenderer": 96.5888671875,
      "relaunchReadyMs": 1475,
      "relaunchHeapMb": 3.3515167236328125,
      "relaunchHeapCode": 1.5399055480957031,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.5,
          "domP50": 5.599999999976717,
          "domP95": 6.700000000069849
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 7.099999999976717,
          "domP50": 3.5,
          "domP95": 12.20000000006985
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2,
          "domP50": 1.099999999976717,
          "domP95": 5.799999999930151
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.6999999999534339,
          "endLag": 0.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 3.723846435546875,
        "heapCode": 1.8441505432128906,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 223.5810546875,
        "pssApp": 127.2978515625,
        "pssRenderer": 96.283203125
      },
      "500": {
        "setKey": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.5,
          "domP50": 5.599999999976717,
          "domP95": 7
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 5.599999999976717,
          "domP50": 1.6000000000931323,
          "domP95": 6.400000000023283
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.9000000000232831,
          "domP50": 1.3000000000465661,
          "domP95": 12.699999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 1,
          "endLag": 0.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 4.134967803955078,
        "heapCode": 1.8519821166992188,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 228.8369140625,
        "pssApp": 128.1376953125,
        "pssRenderer": 100.69921875
      },
      "5000": {
        "setKey": {
          "emitP50": 1.900000000023283,
          "emitP95": 10.099999999976717,
          "domP50": 3.900000000023283,
          "domP95": 11.099999999976717
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 4.700000000069849,
          "domP50": 4.400000000023283,
          "domP95": 10.199999999953434
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 3.400000000023283,
          "domP50": 1.8999999999068677,
          "domP95": 13.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 3.3999999999068677,
          "endLag": 1.400000000023283,
          "maxBacklog": 0
        },
        "heapMb": 8.096794128417969,
        "heapCode": 1.8452415466308594,
        "heapData": 5.725063323974609,
        "pssTotalMb": 233.5849609375,
        "pssApp": 127.9091796875,
        "pssRenderer": 105.67578125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 5.700000000069849,
        "domP95": 6.900000000023283
      },
      "edit_d4": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 5.399999999906868,
        "domP95": 7.700000000069849
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1,
        "domP50": 5.099999999976717,
        "domP95": 6.5
      },
      "loadCycle": {
        "emitP50": 0.6999999999534339,
        "emitP95": 32.699999999953434,
        "domP50": 0.6999999999534339,
        "domP95": 33
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 2.200000000069849,
        "domP95": 11.899999999906868
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.40000000002328306,
        "domP50": 0.30000000004656613,
        "domP95": 1.1999999999534339
      },
      "append100": {
        "emitP50": 0.39999999990686774,
        "emitP95": 0.40000000002328306,
        "domP50": 2.700000000069849,
        "domP95": 6
      },
      "heapMb": 3.9363327026367188,
      "heapCode": 1.9245948791503906,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.595703125,
      "pssApp": 128.2548828125,
      "pssRenderer": 98.3408203125,
      "relaunchReadyMs": 1491.8000000000466,
      "relaunchHeapMb": 3.2575836181640625,
      "relaunchHeapCode": 1.4547309875488281,
      "relaunchHeapData": 1.443511962890625
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9,
          "emitP95": 25.29999999993015,
          "domP50": 11.5,
          "domP95": 25.699999999953434
        },
        "setKeys": {
          "emitP50": 8.400000000023283,
          "emitP95": 27.699999999953434,
          "domP50": 8.900000000023283,
          "domP95": 28.29999999993015
        },
        "replace": {
          "emitP50": 8.300000000046566,
          "emitP95": 17.79999999993015,
          "domP50": 8.70000000006985,
          "domP95": 18.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.199999999953434,
          "lagP95": 20.800000000046566,
          "endLag": 9.099999999976717,
          "maxBacklog": 3
        },
        "heapMb": 5.073017120361328,
        "heapCode": 3.0175857543945312,
        "heapData": 1.6160354614257812,
        "pssTotalMb": 235.33203125,
        "pssApp": 132.1474609375,
        "pssRenderer": 103.1845703125,
        "control": {
          "emitP50": 6.099999999976717,
          "emitP95": 23,
          "domP50": 6.299999999930151,
          "domP95": 23.300000000046566
        },
        "fCommitP50": 3.8999999999068677,
        "fCommitP95": 5.600000000093132
      },
      "500": {
        "setKey": {
          "emitP50": 7.900000000023283,
          "emitP95": 25,
          "domP50": 8.5,
          "domP95": 25.599999999976717
        },
        "setKeys": {
          "emitP50": 8.900000000023283,
          "emitP95": 15.899999999906868,
          "domP50": 10.400000000023283,
          "domP95": 16.399999999906868
        },
        "replace": {
          "emitP50": 8.899999999906868,
          "emitP95": 21.599999999976717,
          "domP50": 9.599999999976717,
          "domP95": 22.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.800000000046566,
          "lagP95": 19.900000000023283,
          "endLag": 11,
          "maxBacklog": 2
        },
        "heapMb": 5.561405181884766,
        "heapCode": 3.0370864868164062,
        "heapData": 2.0687522888183594,
        "pssTotalMb": 237.427734375,
        "pssApp": 133.8779296875,
        "pssRenderer": 103.5498046875,
        "control": {
          "emitP50": 6.099999999976717,
          "emitP95": 21.099999999976717,
          "domP50": 6.900000000023283,
          "domP95": 21.5
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 7.599999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 10.699999999953434,
          "emitP95": 20.600000000093132,
          "domP50": 11.099999999976717,
          "domP95": 24.800000000046566
        },
        "setKeys": {
          "emitP50": 9.400000000023283,
          "emitP95": 28.099999999976717,
          "domP50": 9.900000000023283,
          "domP95": 33.199999999953434
        },
        "replace": {
          "emitP50": 12.300000000046566,
          "emitP95": 22.599999999976717,
          "domP50": 13.5,
          "domP95": 23.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9,
          "lagP95": 19.699999999953434,
          "endLag": 9.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.946666717529297,
        "heapCode": 3.0893478393554688,
        "heapData": 6.2603607177734375,
        "pssTotalMb": 250.8515625,
        "pssApp": 141.5029296875,
        "pssRenderer": 109.3486328125,
        "control": {
          "emitP50": 7.5,
          "emitP95": 21.599999999976717,
          "domP50": 7.699999999953434,
          "domP95": 21.899999999906868
        },
        "fCommitP50": 3.799999999930151,
        "fCommitP95": 4.300000000046566
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.900000000023283,
        "emitP95": 22.099999999976717,
        "domP50": 10.699999999953434,
        "domP95": 22.599999999976717
      },
      "edit_d4": {
        "emitP50": 8.20000000006985,
        "emitP95": 29,
        "domP50": 8.599999999976717,
        "domP95": 30.100000000093132
      },
      "edit_d10": {
        "emitP50": 7,
        "emitP95": 18.199999999953434,
        "domP50": 7.5,
        "domP95": 18.599999999976717
      },
      "loadCycle": {
        "emitP50": 13.100000000093132,
        "emitP95": 60.5,
        "domP50": 13.300000000046566,
        "domP95": 60.800000000046566
      },
      "step": {
        "emitP50": 8.199999999953434,
        "emitP95": 26.599999999976717,
        "domP50": 8.699999999953434,
        "domP95": 27
      },
      "reset": {
        "emitP50": 24.599999999976717,
        "emitP95": 97.90000000002328,
        "domP50": 24.699999999953434,
        "domP95": 98
      },
      "append100": {
        "emitP50": 13.599999999976717,
        "emitP95": 23.300000000046566,
        "domP50": 14.099999999976717,
        "domP95": 23.600000000093132
      },
      "control": {
        "emitP50": 8.699999999953434,
        "emitP95": 24,
        "domP50": 8.900000000023283,
        "domP95": 24.199999999953434
      },
      "heapMb": 5.524982452392578,
      "heapCode": 3.1946563720703125,
      "heapData": 1.882476806640625,
      "pssTotalMb": 241.9189453125,
      "pssApp": 136.677734375,
      "pssRenderer": 105.2412109375,
      "relaunchReadyMs": 850.5,
      "relaunchHeapMb": 4.7649688720703125,
      "relaunchHeapCode": 2.20806884765625,
      "relaunchHeapData": 1.76300048828125
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10.699999999953434,
          "emitP95": 23.29999999993015,
          "domP50": 12,
          "domP95": 23.599999999976717
        },
        "setKeys": {
          "emitP50": 9.199999999953434,
          "emitP95": 22.79999999993015,
          "domP50": 9.599999999976717,
          "domP95": 23.599999999976717
        },
        "replace": {
          "emitP50": 7.5,
          "emitP95": 19.699999999953434,
          "domP50": 7.800000000046566,
          "domP95": 20.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.600000000093132,
          "lagP95": 15.599999999976717,
          "endLag": 5.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.07177734375,
        "heapCode": 3.0164642333984375,
        "heapData": 1.6160392761230469,
        "pssTotalMb": 236.8857421875,
        "pssApp": 133.68359375,
        "pssRenderer": 103.2021484375,
        "control": {
          "emitP50": 7.700000000069849,
          "emitP95": 18.400000000023283,
          "domP50": 8,
          "domP95": 18.800000000046566
        },
        "fCommitP50": 3.800000000046566,
        "fCommitP95": 7.099999999976717
      },
      "500": {
        "setKey": {
          "emitP50": 8.20000000006985,
          "emitP95": 38.59999999997672,
          "domP50": 9.20000000006985,
          "domP95": 39.20000000006985
        },
        "setKeys": {
          "emitP50": 11.800000000046566,
          "emitP95": 26.400000000023283,
          "domP50": 12.300000000046566,
          "domP95": 26.800000000046566
        },
        "replace": {
          "emitP50": 9.699999999953434,
          "emitP95": 22.5,
          "domP50": 10.099999999976717,
          "domP95": 23
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.5,
          "lagP95": 17.900000000023283,
          "endLag": 9.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.559913635253906,
        "heapCode": 3.0357131958007812,
        "heapData": 2.068988800048828,
        "pssTotalMb": 237.46875,
        "pssApp": 133.8232421875,
        "pssRenderer": 103.6455078125,
        "control": {
          "emitP50": 7.400000000023283,
          "emitP95": 18.70000000006985,
          "domP50": 7.599999999976717,
          "domP95": 19
        },
        "fCommitP50": 3.599999999976717,
        "fCommitP95": 11.099999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 11.699999999953434,
          "emitP95": 29.5,
          "domP50": 12.599999999976717,
          "domP95": 30.099999999976717
        },
        "setKeys": {
          "emitP50": 9.900000000023283,
          "emitP95": 23.100000000093132,
          "domP50": 10.699999999953434,
          "domP95": 23.600000000093132
        },
        "replace": {
          "emitP50": 13,
          "emitP95": 23.400000000023283,
          "domP50": 13.400000000023283,
          "domP95": 24.100000000093132
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.099999999976717,
          "lagP95": 18.20000000006985,
          "endLag": 7.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.955036163330078,
        "heapCode": 3.09686279296875,
        "heapData": 6.260295867919922,
        "pssTotalMb": 251.8837890625,
        "pssApp": 142.8427734375,
        "pssRenderer": 109.041015625,
        "control": {
          "emitP50": 5.899999999906868,
          "emitP95": 22.699999999953434,
          "domP50": 6.299999999930151,
          "domP95": 22.900000000023283
        },
        "fCommitP50": 3.3999999999068677,
        "fCommitP95": 9.100000000093132
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.900000000023283,
        "emitP95": 23.099999999976717,
        "domP50": 10.400000000023283,
        "domP95": 23.5
      },
      "edit_d4": {
        "emitP50": 9.400000000023283,
        "emitP95": 18,
        "domP50": 9.900000000023283,
        "domP95": 18.599999999976717
      },
      "edit_d10": {
        "emitP50": 7.700000000069849,
        "emitP95": 24.70000000006985,
        "domP50": 8.20000000006985,
        "domP95": 25.20000000006985
      },
      "loadCycle": {
        "emitP50": 11.900000000023283,
        "emitP95": 66.30000000004657,
        "domP50": 12,
        "domP95": 66.59999999997672
      },
      "step": {
        "emitP50": 8.900000000023283,
        "emitP95": 22,
        "domP50": 9.199999999953434,
        "domP95": 22.29999999993015
      },
      "reset": {
        "emitP50": 26.199999999953434,
        "emitP95": 76.90000000002328,
        "domP50": 26.199999999953434,
        "domP95": 76.90000000002328
      },
      "append100": {
        "emitP50": 14,
        "emitP95": 18.5,
        "domP50": 14.400000000023283,
        "domP95": 18.800000000046566
      },
      "control": {
        "emitP50": 7.699999999953434,
        "emitP95": 25.599999999976717,
        "domP50": 8.099999999976717,
        "domP95": 26.099999999976717
      },
      "heapMb": 5.515048980712891,
      "heapCode": 3.1899452209472656,
      "heapData": 1.8775177001953125,
      "pssTotalMb": 240.6474609375,
      "pssApp": 135.626953125,
      "pssRenderer": 105.0205078125,
      "relaunchReadyMs": 447.0999999999767,
      "relaunchHeapMb": 4.538288116455078,
      "relaunchHeapCode": 2.3297348022460938,
      "relaunchHeapData": 1.8305625915527344
    }
  },
  {
    "impl": "classic",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 4.200000000069849,
          "domP95": 9.099999999976717
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.6999999999534339,
          "domP50": 1.099999999976717,
          "domP95": 9.099999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.5,
          "domP50": 1,
          "domP95": 10.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.7240562438964844,
        "heapCode": 1.8443603515625,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 225.3955078125,
        "pssApp": 128.3291015625,
        "pssRenderer": 97.06640625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.900000000023283,
          "domP50": 2.8999999999068677,
          "domP95": 7.200000000069849
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 0.9000000000232831,
          "domP50": 4.199999999953434,
          "domP95": 7.200000000069849
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 2.400000000023283,
          "domP50": 1.3000000000465661,
          "domP95": 10.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6000000000931323,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.133628845214844,
        "heapCode": 1.8506851196289062,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 229.0595703125,
        "pssApp": 128.375,
        "pssRenderer": 100.6845703125
      },
      "5000": {
        "setKey": {
          "emitP50": 1.6000000000931323,
          "emitP95": 2.199999999953434,
          "domP50": 3.099999999976717,
          "domP95": 10.29999999993015
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 4.800000000046566,
          "domP50": 3.400000000023283,
          "domP95": 14.70000000006985
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2.200000000069849,
          "domP50": 3,
          "domP95": 8.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.400000000023283,
          "lagP95": 2.5,
          "endLag": 1.599999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.099288940429688,
        "heapCode": 1.8477134704589844,
        "heapData": 5.725063323974609,
        "pssTotalMb": 232.9921875,
        "pssApp": 127.8173828125,
        "pssRenderer": 105.1748046875
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.40000000002328306,
        "domP50": 5.900000000023283,
        "domP95": 6.800000000046566
      },
      "edit_d4": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.1000000000931323,
        "domP50": 5.400000000023283,
        "domP95": 7.400000000023283
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 0.9000000000232831,
        "domP50": 1.099999999976717,
        "domP95": 7.099999999976717
      },
      "loadCycle": {
        "emitP50": 0.7000000000698492,
        "emitP95": 33.60000000009313,
        "domP50": 1.099999999976717,
        "domP95": 33.90000000002328
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.199999999953434,
        "domP50": 5.300000000046566,
        "domP95": 11.20000000006985
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 0.5,
        "domP50": 0.30000000004656613,
        "domP95": 0.8000000000465661
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 1.099999999976717,
        "domP95": 5.5
      },
      "heapMb": 3.9341583251953125,
      "heapCode": 1.9224929809570312,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.4833984375,
      "pssApp": 128.267578125,
      "pssRenderer": 98.2158203125,
      "relaunchReadyMs": 1411,
      "relaunchHeapMb": 3.257659912109375,
      "relaunchHeapCode": 1.4547767639160156,
      "relaunchHeapData": 1.44354248046875
    }
  },
  {
    "impl": "classic",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.5,
          "domP50": 5.5,
          "domP95": 6.699999999953434
        },
        "setKeys": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.9000000000232831,
          "domP50": 5,
          "domP95": 6.699999999953434
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 9,
          "domP50": 3.700000000069849,
          "domP95": 10.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5999999999767169,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 3.723846435546875,
        "heapCode": 1.8440742492675781,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 225.4912109375,
        "pssApp": 128.5078125,
        "pssRenderer": 96.9833984375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.1999999999534339,
          "domP50": 5.199999999953434,
          "domP95": 9.599999999976717
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.400000000023283,
          "domP50": 5.900000000023283,
          "domP95": 10.5
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 6.299999999930151,
          "domP50": 1.2000000000698492,
          "domP95": 11.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6999999999534339,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 4.133617401123047,
        "heapCode": 1.8506736755371094,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 229.2119140625,
        "pssApp": 128.478515625,
        "pssRenderer": 100.7333984375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.8000000000465661,
          "emitP95": 6.599999999976717,
          "domP50": 3.599999999976717,
          "domP95": 13.79999999993015
        },
        "setKeys": {
          "emitP50": 1.6000000000931323,
          "emitP95": 2.200000000069849,
          "domP50": 7.300000000046566,
          "domP95": 13.900000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.5,
          "domP50": 1.400000000023283,
          "domP95": 13
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2,
          "endLag": 1.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 8.097309112548828,
        "heapCode": 1.8455924987792969,
        "heapData": 5.725063323974609,
        "pssTotalMb": 236.2099609375,
        "pssApp": 129.9365234375,
        "pssRenderer": 106.2734375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.400000000023283,
        "domP50": 5.900000000023283,
        "domP95": 10.400000000023283
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.6000000000931323,
        "domP50": 2.700000000069849,
        "domP95": 7.900000000023283
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1,
        "domP50": 5.599999999976717,
        "domP95": 8.599999999976717
      },
      "loadCycle": {
        "emitP50": 0.5999999999767169,
        "emitP95": 35.199999999953434,
        "domP50": 0.5999999999767169,
        "domP95": 36.800000000046566
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5,
        "domP50": 5.200000000069849,
        "domP95": 7.799999999930151
      },
      "reset": {
        "emitP50": 0.30000000004656613,
        "emitP95": 1.400000000023283,
        "domP50": 0.30000000004656613,
        "domP95": 2
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 0.9000000000232831,
        "domP95": 6.900000000023283
      },
      "heapMb": 3.9361190795898438,
      "heapCode": 1.9243927001953125,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 226.84765625,
      "pssApp": 128.7548828125,
      "pssRenderer": 98.0927734375,
      "relaunchReadyMs": 1457.1999999999534,
      "relaunchHeapMb": 3.3517494201660156,
      "relaunchHeapCode": 1.5399665832519531,
      "relaunchHeapData": 1.4463119506835938
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 10.900000000023283,
          "emitP95": 22.79999999993015,
          "domP50": 11.29999999993015,
          "domP95": 25.5
        },
        "setKeys": {
          "emitP50": 8.900000000023283,
          "emitP95": 25.099999999976717,
          "domP50": 9.400000000023283,
          "domP95": 25.5
        },
        "replace": {
          "emitP50": 9.5,
          "emitP95": 27.099999999976717,
          "domP50": 10.400000000023283,
          "domP95": 27.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.200000000069849,
          "lagP95": 16.79999999993015,
          "endLag": 6.300000000046566,
          "maxBacklog": 2
        },
        "heapMb": 5.081256866455078,
        "heapCode": 3.025592803955078,
        "heapData": 1.6160354614257812,
        "pssTotalMb": 237.0009765625,
        "pssApp": 133.8046875,
        "pssRenderer": 103.1962890625,
        "control": {
          "emitP50": 5.900000000023283,
          "emitP95": 17.899999999906868,
          "domP50": 6.099999999976717,
          "domP95": 18.199999999953434
        },
        "fCommitP50": 3.800000000046566,
        "fCommitP95": 11.5
      },
      "500": {
        "setKey": {
          "emitP50": 8.5,
          "emitP95": 21.900000000023283,
          "domP50": 9.099999999976717,
          "domP95": 24
        },
        "setKeys": {
          "emitP50": 10.29999999993015,
          "emitP95": 27.79999999993015,
          "domP50": 12.399999999906868,
          "domP95": 29.199999999953434
        },
        "replace": {
          "emitP50": 10,
          "emitP95": 18.099999999976717,
          "domP50": 10.599999999976717,
          "domP95": 18.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.200000000069849,
          "lagP95": 14.900000000023283,
          "endLag": 9.099999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.562591552734375,
        "heapCode": 3.0382614135742188,
        "heapData": 2.0689964294433594,
        "pssTotalMb": 237.296875,
        "pssApp": 133.5263671875,
        "pssRenderer": 103.7705078125,
        "control": {
          "emitP50": 7.300000000046566,
          "emitP95": 16.70000000006985,
          "domP50": 7.5,
          "domP95": 16.900000000023283
        },
        "fCommitP50": 3.200000000069849,
        "fCommitP95": 8.400000000023283
      },
      "5000": {
        "setKey": {
          "emitP50": 10.199999999953434,
          "emitP95": 22.800000000046566,
          "domP50": 11.20000000006985,
          "domP95": 23.400000000023283
        },
        "setKeys": {
          "emitP50": 9.900000000023283,
          "emitP95": 32.79999999993015,
          "domP50": 10.199999999953434,
          "domP95": 33.199999999953434
        },
        "replace": {
          "emitP50": 13.600000000093132,
          "emitP95": 23.79999999993015,
          "domP50": 14.600000000093132,
          "domP95": 24.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.400000000023283,
          "lagP95": 24,
          "endLag": 8.300000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.948040008544922,
        "heapCode": 3.0902862548828125,
        "heapData": 6.260478973388672,
        "pssTotalMb": 250.2802734375,
        "pssApp": 141.1005859375,
        "pssRenderer": 109.1796875,
        "control": {
          "emitP50": 6.400000000023283,
          "emitP95": 28.899999999906868,
          "domP50": 6.699999999953434,
          "domP95": 29.199999999953434
        },
        "fCommitP50": 3.200000000069849,
        "fCommitP95": 8
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.099999999976717,
        "emitP95": 26.099999999976717,
        "domP50": 9.79999999993015,
        "domP95": 26.599999999976717
      },
      "edit_d4": {
        "emitP50": 9.800000000046566,
        "emitP95": 25.70000000006985,
        "domP50": 10.20000000006985,
        "domP95": 26
      },
      "edit_d10": {
        "emitP50": 9.20000000006985,
        "emitP95": 16.699999999953434,
        "domP50": 9.70000000006985,
        "domP95": 17.599999999976717
      },
      "loadCycle": {
        "emitP50": 15.400000000023283,
        "emitP95": 51,
        "domP50": 15.5,
        "domP95": 51.40000000002328
      },
      "step": {
        "emitP50": 8,
        "emitP95": 26.5,
        "domP50": 8.300000000046566,
        "domP95": 26.900000000023283
      },
      "reset": {
        "emitP50": 32.09999999997672,
        "emitP95": 51.800000000046566,
        "domP50": 32.09999999997672,
        "domP95": 51.800000000046566
      },
      "append100": {
        "emitP50": 14.599999999976717,
        "emitP95": 33.70000000006985,
        "domP50": 15.900000000023283,
        "domP95": 33.90000000002328
      },
      "control": {
        "emitP50": 6.900000000023283,
        "emitP95": 27.199999999953434,
        "domP50": 7.100000000093132,
        "domP95": 27.599999999976717
      },
      "heapMb": 5.522178649902344,
      "heapCode": 3.1921958923339844,
      "heapData": 1.8822212219238281,
      "pssTotalMb": 240.998046875,
      "pssApp": 136.0546875,
      "pssRenderer": 104.943359375,
      "relaunchReadyMs": 441.5,
      "relaunchHeapMb": 4.484676361083984,
      "relaunchHeapCode": 2.3380470275878906,
      "relaunchHeapData": 1.768768310546875
    }
  }
]
```
</details>
