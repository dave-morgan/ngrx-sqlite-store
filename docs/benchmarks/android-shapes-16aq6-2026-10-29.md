# Phase 16 shapes — flat objects & hybrid workflow (2026-10-29)

Measured alone on `emulator-5556` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** `projects/harness/src/app/state/shapes.ts`, measured through `window.__shapes`.
  - **Flat:** K top-level keys (50 / 500 / 5000).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across 5 trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 3.49 ms, p95 8.54 ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD.
  - FAIL: everything else.

**Acceptance:** PASS 2 / PLATFORM-BOUND 54 / CODE-BOUND 0 / FAIL 30

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
| flat | 50.setKey.emitP50 | 0.36 ± 0.05 | 9.84 ± 3.25 | 27.3× | PLATFORM-BOUND | allow 9.6 (control emitP50 6.3×1) |
| flat | 50.setKey.emitP95 | 1.62 ± 1.96 | 32.80 ± 12.52 | 20.2× | PLATFORM-BOUND | allow 33.3 (control emitP95 18.8×1) |
| flat | 50.setKey.domP50 | 4.26 ± 1.75 | 10.46 ± 3.25 | 2.5× | PLATFORM-BOUND | allow 11.7 (control domP50 6.7×1) |
| flat | 50.setKey.domP95 | 10.18 ± 3.67 | 33.44 ± 12.57 | 3.3× | PLATFORM-BOUND | allow 35.4 (control domP95 19.1×1) |
| flat | 50.setKeys.emitP50 | 0.40 ± 0.07 | 10.52 ± 3.43 | 26.3× | FAIL | allow 9.8 (control emitP50 6.3×1) |
| flat | 50.setKeys.emitP95 | 1.60 ± 1.63 | 27.64 ± 7.96 | 17.3× | PLATFORM-BOUND | allow 28.4 (control emitP95 18.8×1) |
| flat | 50.setKeys.domP50 | 3.88 ± 1.80 | 11.02 ± 3.30 | 2.8× | PLATFORM-BOUND | allow 11.8 (control domP50 6.7×1) |
| flat | 50.setKeys.domP95 | 10.42 ± 4.08 | 28.04 ± 7.97 | 2.7× | PLATFORM-BOUND | allow 31.2 (control domP95 19.1×1) |
| flat | 50.replace.emitP50 | 0.38 ± 0.04 | 9.40 ± 3.51 | 24.7× | PLATFORM-BOUND | allow 9.9 (control emitP50 6.3×1) |
| flat | 50.replace.emitP95 | 3.80 ± 4.63 | 23.78 ± 10.67 | 6.3× | PLATFORM-BOUND | allow 34.1 (control emitP95 18.8×1) |
| flat | 50.replace.domP50 | 2.36 ± 1.87 | 9.92 ± 3.60 | 4.2× | PLATFORM-BOUND | allow 12.1 (control domP50 6.7×1) |
| flat | 50.replace.domP95 | 13.40 ± 4.71 | 24.22 ± 10.81 | 1.8× | PLATFORM-BOUND | allow 34.6 (control domP95 19.1×1) |
| flat | 50.burst.lagP50 | 0.30 ± 0.00 | 6.36 ± 0.38 | 21.2× | PLATFORM-BOUND | allow 6.7 (control emitP50 6.3×1) |
| flat | 50.burst.lagP95 | 0.64 ± 0.17 | 19.64 ± 6.59 | 30.7× | PLATFORM-BOUND | allow 25.5 (control emitP95 18.8×1) |
| flat | 50.burst.endLag | 0.30 ± 0.07 | 6.08 ± 0.51 | 20.3× | PLATFORM-BOUND | allow 6.9 (control emitP50 6.3×1) |
| flat | 50.burst.maxBacklog | 0.00 ± 0.00 | 2.20 ± 0.45 | 2200000000.0× | FAIL |  |
| flat | 50.heapMb | 3.69 ± 0.07 | 5.06 ± 0.00 | 1.4× | FAIL | code +1.19 MB; data 1.50 -> 1.62 MB |
| flat | 50.pssTotalMb | 221.56 ± 1.80 | 232.59 ± 2.27 | 1.0× | FAIL | allow 6.9 (plugin baseline 2.8 MB) |
| flat | 500.setKey.emitP50 | 0.46 ± 0.05 | 8.40 ± 0.90 | 18.3× | FAIL | allow 7.6 (control emitP50 6.7×1) |
| flat | 500.setKey.emitP95 | 1.12 ± 0.44 | 26.92 ± 4.02 | 24.0× | PLATFORM-BOUND | allow 26.1 (control emitP95 21.6×1) |
| flat | 500.setKey.domP50 | 3.58 ± 2.21 | 8.96 ± 0.96 | 2.5× | PLATFORM-BOUND | allow 10.1 (control domP50 6.9×1) |
| flat | 500.setKey.domP95 | 6.84 ± 0.27 | 27.50 ± 4.11 | 4.0× | PLATFORM-BOUND | allow 26.3 (control domP95 21.9×1) |
| flat | 500.setKeys.emitP50 | 0.46 ± 0.09 | 9.70 ± 0.50 | 21.1× | FAIL | allow 7.3 (control emitP50 6.7×1) |
| flat | 500.setKeys.emitP95 | 1.06 ± 0.28 | 25.00 ± 4.96 | 23.6× | PLATFORM-BOUND | allow 26.8 (control emitP95 21.6×1) |
| flat | 500.setKeys.domP50 | 3.26 ± 1.86 | 10.10 ± 0.57 | 3.1× | PLATFORM-BOUND | allow 9.4 (control domP50 6.9×1) |
| flat | 500.setKeys.domP95 | 10.70 ± 4.15 | 25.48 ± 4.93 | 2.4× | PLATFORM-BOUND | allow 31.0 (control domP95 21.9×1) |
| flat | 500.replace.emitP50 | 0.34 ± 0.05 | 9.24 ± 0.88 | 27.2× | FAIL | allow 7.6 (control emitP50 6.7×1) |
| flat | 500.replace.emitP95 | 4.68 ± 4.63 | 27.22 ± 6.74 | 5.8× | PLATFORM-BOUND | allow 33.0 (control emitP95 21.6×1) |
| flat | 500.replace.domP50 | 2.52 ± 1.70 | 9.78 ± 0.68 | 3.9× | PLATFORM-BOUND | allow 9.3 (control domP50 6.9×1) |
| flat | 500.replace.domP95 | 10.22 ± 3.15 | 27.72 ± 6.64 | 2.7× | PLATFORM-BOUND | allow 31.7 (control domP95 21.9×1) |
| flat | 500.burst.lagP50 | 0.40 ± 0.00 | 7.40 ± 0.60 | 18.5× | PLATFORM-BOUND | allow 7.3 (control emitP50 6.7×1) |
| flat | 500.burst.lagP95 | 0.72 ± 0.08 | 18.48 ± 2.16 | 25.7× | PLATFORM-BOUND | allow 23.8 (control emitP95 21.6×1) |
| flat | 500.burst.endLag | 0.42 ± 0.13 | 7.74 ± 1.69 | 18.4× | PLATFORM-BOUND | allow 8.5 (control emitP50 6.7×1) |
| flat | 500.burst.maxBacklog | 0.00 ± 0.00 | 2.40 ± 0.55 | 2400000000.0× | FAIL |  |
| flat | 500.heapMb | 4.08 ± 0.12 | 5.55 ± 0.00 | 1.4× | FAIL | code +1.22 MB; data 1.89 -> 2.07 MB |
| flat | 500.pssTotalMb | 224.75 ± 2.81 | 233.56 ± 1.54 | 1.0× | FAIL | allow 7.2 (plugin baseline 2.8 MB) |
| flat | 5000.setKey.emitP50 | 1.48 ± 0.26 | 10.48 ± 1.13 | 7.1× | FAIL | allow 7.7 (control emitP50 6.3×1) |
| flat | 5000.setKey.emitP95 | 2.86 ± 1.43 | 22.08 ± 3.38 | 7.7× | PLATFORM-BOUND | allow 24.1 (control emitP95 19.2×1) |
| flat | 5000.setKey.domP50 | 5.20 ± 1.74 | 11.34 ± 1.10 | 2.2× | PLATFORM-BOUND | allow 9.5 (control domP50 6.7×1) |
| flat | 5000.setKey.domP95 | 10.44 ± 2.69 | 23.44 ± 3.83 | 2.2× | PLATFORM-BOUND | allow 26.1 (control domP95 19.6×1) |
| flat | 5000.setKeys.emitP50 | 1.62 ± 0.08 | 10.38 ± 0.61 | 6.4× | FAIL | allow 7.0 (control emitP50 6.3×1) |
| flat | 5000.setKeys.emitP95 | 7.66 ± 2.47 | 27.60 ± 2.58 | 3.6× | PLATFORM-BOUND | allow 24.3 (control emitP95 19.2×1) |
| flat | 5000.setKeys.domP50 | 3.16 ± 0.39 | 11.02 ± 0.51 | 3.5× | FAIL | allow 7.6 (control domP50 6.7×1) |
| flat | 5000.setKeys.domP95 | 12.62 ± 2.86 | 28.04 ± 2.53 | 2.2× | PLATFORM-BOUND | allow 24.9 (control domP95 19.6×1) |
| flat | 5000.replace.emitP50 | 0.38 ± 0.04 | 13.84 ± 0.96 | 36.4× | FAIL | allow 7.3 (control emitP50 6.3×1) |
| flat | 5000.replace.emitP95 | 1.66 ± 0.74 | 27.58 ± 4.51 | 16.6× | FAIL | allow 24.5 (control emitP95 19.2×1) |
| flat | 5000.replace.domP50 | 1.78 ± 0.18 | 14.46 ± 0.68 | 8.1× | FAIL | allow 7.6 (control domP50 6.7×1) |
| flat | 5000.replace.domP95 | 8.82 ± 2.23 | 28.28 ± 4.86 | 3.2× | PLATFORM-BOUND | allow 26.7 (control domP95 19.6×1) |
| flat | 5000.burst.lagP50 | 1.44 ± 0.09 | 9.10 ± 0.70 | 6.3× | FAIL | allow 7.1 (control emitP50 6.3×1) |
| flat | 5000.burst.lagP95 | 3.36 ± 1.52 | 19.70 ± 2.19 | 5.9× | PLATFORM-BOUND | allow 23.0 (control emitP95 19.2×1) |
| flat | 5000.burst.endLag | 1.46 ± 0.50 | 11.62 ± 3.99 | 8.0× | PLATFORM-BOUND | allow 10.8 (control emitP50 6.3×1) |
| flat | 5000.burst.maxBacklog | 0.00 ± 0.00 | 2.00 ± 0.00 | 2000000000.0× | FAIL |  |
| flat | 5000.heapMb | 8.10 ± 0.00 | 9.93 ± 0.01 | 1.2× | FAIL | code +1.23 MB; data 5.73 -> 6.26 MB |
| flat | 5000.pssTotalMb | 229.71 ± 2.16 | 245.93 ± 3.60 | 1.1× | FAIL | allow 8.6 (plugin baseline 2.8 MB) |
| workflow | edit_d1.emitP50 | 0.38 ± 0.04 | 8.38 ± 1.01 | 22.1× | PLATFORM-BOUND | allow 8.3 (control emitP50 7.3×1) |
| workflow | edit_d1.emitP95 | 1.16 ± 0.55 | 20.64 ± 4.27 | 17.8× | PLATFORM-BOUND | allow 26.5 (control emitP95 21.7×1) |
| workflow | edit_d1.domP50 | 4.08 ± 1.76 | 9.06 ± 0.91 | 2.2× | PLATFORM-BOUND | allow 10.2 (control domP50 7.5×1) |
| workflow | edit_d1.domP95 | 8.98 ± 1.42 | 21.32 ± 4.28 | 2.4× | PLATFORM-BOUND | allow 27.7 (control domP95 22.0×1) |
| workflow | edit_d4.emitP50 | 0.42 ± 0.04 | 7.80 ± 1.09 | 18.6× | PLATFORM-BOUND | allow 8.4 (control emitP50 7.3×1) |
| workflow | edit_d4.emitP95 | 1.26 ± 0.25 | 24.76 ± 4.97 | 19.7× | PLATFORM-BOUND | allow 26.9 (control emitP95 21.7×1) |
| workflow | edit_d4.domP50 | 4.48 ± 2.06 | 8.58 ± 0.94 | 1.9× | PLATFORM-BOUND | allow 10.5 (control domP50 7.5×1) |
| workflow | edit_d4.domP95 | 10.32 ± 2.05 | 25.26 ± 5.05 | 2.4× | PLATFORM-BOUND | allow 29.1 (control domP95 22.0×1) |
| workflow | edit_d10.emitP50 | 0.48 ± 0.04 | 8.04 ± 0.76 | 16.7× | PLATFORM-BOUND | allow 8.1 (control emitP50 7.3×1) |
| workflow | edit_d10.emitP95 | 1.38 ± 0.41 | 20.38 ± 5.24 | 14.8× | PLATFORM-BOUND | allow 27.4 (control emitP95 21.7×1) |
| workflow | edit_d10.domP50 | 1.76 ± 0.49 | 8.60 ± 0.68 | 4.9× | PLATFORM-BOUND | allow 8.7 (control domP50 7.5×1) |
| workflow | edit_d10.domP95 | 9.74 ± 1.09 | 21.10 ± 4.90 | 2.2× | PLATFORM-BOUND | allow 28.0 (control domP95 22.0×1) |
| workflow | loadCycle.emitP50 | 8.42 ± 7.39 | 16.54 ± 3.19 | 2.0× | PLATFORM-BOUND | allow 25.1 (control emitP50 7.3×2) |
| workflow | loadCycle.emitP95 | 35.26 ± 3.77 | 58.14 ± 4.78 | 1.6× | PLATFORM-BOUND | allow 52.0 (control emitP95 21.7×2) |
| workflow | loadCycle.domP50 | 9.48 ± 8.06 | 16.76 ± 3.22 | 1.8× | PASS |  |
| workflow | loadCycle.domP95 | 36.60 ± 3.81 | 58.58 ± 4.81 | 1.6× | PLATFORM-BOUND | allow 52.6 (control domP95 22.0×2) |
| workflow | step.emitP50 | 0.32 ± 0.04 | 8.28 ± 0.34 | 25.9× | FAIL | allow 7.7 (control emitP50 7.3×1) |
| workflow | step.emitP95 | 0.92 ± 0.78 | 25.90 ± 7.29 | 28.2× | PLATFORM-BOUND | allow 29.8 (control emitP95 21.7×1) |
| workflow | step.domP50 | 1.78 ± 1.06 | 8.66 ± 0.34 | 4.9× | PLATFORM-BOUND | allow 8.9 (control domP50 7.5×1) |
| workflow | step.domP95 | 7.68 ± 0.35 | 26.64 ± 6.73 | 3.5× | PLATFORM-BOUND | allow 29.1 (control domP95 22.0×1) |
| workflow | reset.emitP50 | 0.20 ± 0.00 | 28.90 ± 7.22 | 144.5× | FAIL | allow 14.5 (control emitP50 7.3×1) |
| workflow | reset.emitP95 | 1.38 ± 1.49 | 69.22 ± 23.00 | 50.2× | FAIL | allow 46.2 (control emitP95 21.7×1) |
| workflow | reset.domP50 | 0.20 ± 0.00 | 29.12 ± 7.01 | 145.6× | FAIL | allow 14.6 (control domP50 7.5×1) |
| workflow | reset.domP95 | 1.84 ± 1.57 | 69.26 ± 22.99 | 37.6× | FAIL | allow 46.6 (control domP95 22.0×1) |
| workflow | append100.emitP50 | 0.36 ± 0.05 | 13.46 ± 1.77 | 37.4× | FAIL | allow 9.1 (control emitP50 7.3×1) |
| workflow | append100.emitP95 | 0.68 ± 0.18 | 25.40 ± 4.66 | 37.4× | PLATFORM-BOUND | allow 26.6 (control emitP95 21.7×1) |
| workflow | append100.domP50 | 0.88 ± 0.15 | 13.92 ± 1.71 | 15.8× | FAIL | allow 9.4 (control domP50 7.5×1) |
| workflow | append100.domP95 | 6.62 ± 2.49 | 25.96 ± 4.60 | 3.9× | PLATFORM-BOUND | allow 29.1 (control domP95 22.0×1) |
| workflow | heapMb | 3.87 ± 0.09 | 5.49 ± 0.00 | 1.4× | FAIL | code +1.31 MB; data 1.63 -> 1.87 MB |
| workflow | pssTotalMb | 222.04 ± 2.17 | 237.50 ± 0.94 | 1.1× | FAIL | allow 5.9 (plugin baseline 2.8 MB) |
| workflow | relaunchReadyMs | 1452.66 ± 34.01 | 930.76 ± 431.35 | 0.6× | PASS |  |
| workflow | relaunchHeapMb | 3.33 ± 0.04 | 4.43 ± 0.17 | 1.3× | FAIL | code +0.65 MB; data 1.45 -> 1.80 MB |

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 6.34 | 6.66 | 19.12 | 9.84 | 10.46 | 33.44 |
| 500 | 6.66 | 6.94 | 21.94 | 8.40 | 8.96 | 27.50 |
| 5000 | 6.30 | 6.70 | 19.56 | 10.48 | 11.34 | 23.44 |

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
| flat 50 | 125.8 | 130.6 | 95.7 | 102.0 |
| flat 500 | 125.2 | 130.9 | 99.5 | 102.7 |
| flat 5000 | 125.3 | 137.6 | 104.4 | 108.3 |
| workflow | 125.1 | 133.6 | 97.0 | 103.9 |

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
          "emitP95": 1.2000000000116415,
          "domP50": 5.400000000023283,
          "domP95": 10.799999999988358
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 4.2999999999883585,
          "domP95": 13
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.3000000000465661,
          "domP50": 1,
          "domP95": 18.399999999965075
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 3.7227210998535156,
        "heapCode": 1.8430366516113281,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 219.70703125,
        "pssApp": 124.640625,
        "pssRenderer": 95.06640625
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.7999999999883585,
          "domP50": 3.900000000023283,
          "domP95": 7.2000000000116415
        },
        "setKeys": {
          "emitP50": 0.5999999999767169,
          "emitP95": 1.2999999999883585,
          "domP50": 2.3999999999650754,
          "domP95": 12
        },
        "replace": {
          "emitP50": 0.3999999999650754,
          "emitP95": 0.8999999999650754,
          "domP50": 3.900000000023283,
          "domP95": 15.199999999953434
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.6000000000349246,
          "endLag": 0.5,
          "maxBacklog": 0
        },
        "heapMb": 4.134941101074219,
        "heapCode": 1.8519554138183594,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 223.3837890625,
        "pssApp": 124.5546875,
        "pssRenderer": 98.8291015625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.2999999999883585,
          "emitP95": 1.6000000000349246,
          "domP50": 7.100000000034925,
          "domP95": 8.5
        },
        "setKeys": {
          "emitP50": 1.6999999999534339,
          "emitP95": 5.199999999953434,
          "domP50": 3.2999999999883585,
          "domP95": 13
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 2,
          "domP50": 1.7999999999883585,
          "domP95": 8.700000000011642
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 3,
          "endLag": 1.8999999999650754,
          "maxBacklog": 0
        },
        "heapMb": 8.099666595458984,
        "heapCode": 1.8475379943847656,
        "heapData": 5.725639343261719,
        "pssTotalMb": 227.072265625,
        "pssApp": 123.8955078125,
        "pssRenderer": 103.1767578125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.3999999999650754,
        "emitP95": 1.099999999976717,
        "domP50": 1.400000000023283,
        "domP95": 8.699999999953434
      },
      "edit_d4": {
        "emitP50": 0.5,
        "emitP95": 1.099999999976717,
        "domP50": 5.2999999999883585,
        "domP95": 9.799999999988358
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.8999999999650754,
        "domP50": 1.400000000023283,
        "domP95": 11.099999999976717
      },
      "loadCycle": {
        "emitP50": 14.900000000023283,
        "emitP95": 33.600000000034925,
        "domP50": 15.200000000011642,
        "domP95": 38.79999999998836
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 2.099999999976717,
        "domP95": 8.099999999976717
      },
      "reset": {
        "emitP50": 0.20000000001164153,
        "emitP95": 0.7000000000116415,
        "domP50": 0.20000000001164153,
        "domP95": 1.6000000000349246
      },
      "append100": {
        "emitP50": 0.3999999999650754,
        "emitP95": 0.7999999999883585,
        "domP50": 0.8999999999650754,
        "domP95": 5
      },
      "heapMb": 3.7774276733398438,
      "heapCode": 1.7703971862792969,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 219.150390625,
      "pssApp": 123.7265625,
      "pssRenderer": 95.423828125,
      "relaunchReadyMs": 1465.899999999965,
      "relaunchHeapMb": 3.3515701293945312,
      "relaunchHeapCode": 1.5399589538574219,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "sqlite",
    "trial": 1,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.099999999976717,
          "emitP95": 27.599999999976717,
          "domP50": 8.899999999965075,
          "domP95": 28
        },
        "setKeys": {
          "emitP50": 7.900000000023283,
          "emitP95": 40.09999999997672,
          "domP50": 8.299999999988358,
          "domP95": 40.5
        },
        "replace": {
          "emitP50": 8.700000000011642,
          "emitP95": 25.099999999976717,
          "domP50": 9,
          "domP95": 25.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6,
          "lagP95": 14.399999999965075,
          "endLag": 5.600000000034925,
          "maxBacklog": 2
        },
        "heapMb": 5.054603576660156,
        "heapCode": 2.9993515014648438,
        "heapData": 1.6156196594238281,
        "pssTotalMb": 230.298828125,
        "pssApp": 129.1865234375,
        "pssRenderer": 101.1123046875,
        "control": {
          "emitP50": 5.7000000000116415,
          "emitP95": 20.599999999976717,
          "domP50": 6,
          "domP95": 20.899999999965075
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 5.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 9.300000000046566,
          "emitP95": 31.5,
          "domP50": 9.700000000011642,
          "domP95": 32.20000000001164
        },
        "setKeys": {
          "emitP50": 9.799999999988358,
          "emitP95": 22.599999999976717,
          "domP50": 10.100000000034925,
          "domP95": 23.5
        },
        "replace": {
          "emitP50": 9,
          "emitP95": 38.199999999953434,
          "domP50": 9.599999999976717,
          "domP95": 38.399999999965075
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.900000000023283,
          "lagP95": 17.899999999965075,
          "endLag": 7.2999999999883585,
          "maxBacklog": 2
        },
        "heapMb": 5.544857025146484,
        "heapCode": 3.0205955505371094,
        "heapData": 2.0688438415527344,
        "pssTotalMb": 232.6689453125,
        "pssApp": 130.8935546875,
        "pssRenderer": 101.775390625,
        "control": {
          "emitP50": 6.5,
          "emitP95": 19.699999999953434,
          "domP50": 6.7999999999883585,
          "domP95": 20.099999999976717
        },
        "fCommitP50": 3.5,
        "fCommitP95": 9.399999999965075
      },
      "5000": {
        "setKey": {
          "emitP50": 10.400000000023283,
          "emitP95": 22.199999999953434,
          "domP50": 12.299999999988358,
          "domP95": 22.70000000001164
        },
        "setKeys": {
          "emitP50": 10.199999999953434,
          "emitP95": 26.29999999998836,
          "domP50": 11.100000000034925,
          "domP95": 26.599999999976717
        },
        "replace": {
          "emitP50": 13.5,
          "emitP95": 28.29999999998836,
          "domP50": 13.900000000023283,
          "domP95": 28.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.700000000011642,
          "lagP95": 16,
          "endLag": 8.899999999965075,
          "maxBacklog": 2
        },
        "heapMb": 9.927837371826172,
        "heapCode": 3.0702247619628906,
        "heapData": 6.260627746582031,
        "pssTotalMb": 240.2919921875,
        "pssApp": 132.708984375,
        "pssRenderer": 107.5830078125,
        "control": {
          "emitP50": 5.5,
          "emitP95": 17.800000000046566,
          "domP50": 6.099999999976717,
          "domP95": 18.100000000034925
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 6.899999999965075
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.200000000011642,
        "emitP95": 18.70000000001164,
        "domP50": 9.899999999965075,
        "domP95": 19.900000000023283
      },
      "edit_d4": {
        "emitP50": 9.099999999976717,
        "emitP95": 22.900000000023283,
        "domP50": 9.700000000011642,
        "domP95": 23.29999999998836
      },
      "edit_d10": {
        "emitP50": 9.200000000011642,
        "emitP95": 15.700000000011642,
        "domP50": 9.700000000011642,
        "domP95": 17.79999999998836
      },
      "loadCycle": {
        "emitP50": 18.899999999965075,
        "emitP95": 50.70000000001164,
        "domP50": 19,
        "domP95": 51.100000000034925
      },
      "step": {
        "emitP50": 8.399999999965075,
        "emitP95": 33.5,
        "domP50": 8.799999999988358,
        "domP95": 33.90000000002328
      },
      "reset": {
        "emitP50": 31,
        "emitP95": 80.39999999996508,
        "domP50": 31,
        "domP95": 80.39999999996508
      },
      "append100": {
        "emitP50": 12.900000000023283,
        "emitP95": 25.29999999998836,
        "domP50": 13.600000000034925,
        "domP95": 26.29999999998836
      },
      "control": {
        "emitP50": 7.2999999999883585,
        "emitP95": 18.099999999976717,
        "domP50": 7.599999999976717,
        "domP95": 18.29999999998836
      },
      "heapMb": 5.494682312011719,
      "heapCode": 3.176769256591797,
      "heapData": 1.8701286315917969,
      "pssTotalMb": 237.5400390625,
      "pssApp": 134.68359375,
      "pssRenderer": 102.8564453125,
      "relaunchReadyMs": 880.1000000000349,
      "relaunchHeapMb": 4.2623138427734375,
      "relaunchHeapCode": 2.122638702392578,
      "relaunchHeapData": 1.7642288208007812
    }
  },
  {
    "impl": "sqlite",
    "trial": 2,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 15.599999999976717,
          "emitP95": 52.59999999997672,
          "domP50": 16.199999999953434,
          "domP95": 53.399999999965075
        },
        "setKeys": {
          "emitP50": 16.29999999998836,
          "emitP95": 30.70000000001164,
          "domP50": 16.599999999976717,
          "domP95": 31.20000000001164
        },
        "replace": {
          "emitP50": 15.600000000034925,
          "emitP95": 41.79999999998836,
          "domP50": 16.29999999998836,
          "domP95": 42.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.900000000023283,
          "lagP95": 24.899999999965075,
          "endLag": 5.900000000023283,
          "maxBacklog": 3
        },
        "heapMb": 5.053077697753906,
        "heapCode": 2.9986953735351562,
        "heapData": 1.6158866882324219,
        "pssTotalMb": 230.8232421875,
        "pssApp": 129.5205078125,
        "pssRenderer": 101.302734375,
        "control": {
          "emitP50": 7.399999999965075,
          "emitP95": 19.099999999976717,
          "domP50": 7.7000000000116415,
          "domP95": 19.5
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 5
      },
      "500": {
        "setKey": {
          "emitP50": 8.099999999976717,
          "emitP95": 23.599999999976717,
          "domP50": 8.599999999976717,
          "domP95": 24.099999999976717
        },
        "setKeys": {
          "emitP50": 9.799999999988358,
          "emitP95": 23,
          "domP50": 10.099999999976717,
          "domP95": 23.399999999965075
        },
        "replace": {
          "emitP50": 10.200000000011642,
          "emitP95": 20.600000000034925,
          "domP50": 10.599999999976717,
          "domP95": 21.100000000034925
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.7999999999883585,
          "lagP95": 18.100000000034925,
          "endLag": 10.099999999976717,
          "maxBacklog": 3
        },
        "heapMb": 5.5441436767578125,
        "heapCode": 3.0204238891601562,
        "heapData": 2.0683326721191406,
        "pssTotalMb": 231.4765625,
        "pssApp": 129.6650390625,
        "pssRenderer": 101.8115234375,
        "control": {
          "emitP50": 7.2999999999883585,
          "emitP95": 24.099999999976717,
          "domP50": 7.5,
          "domP95": 24.5
        },
        "fCommitP50": 3.6000000000349246,
        "fCommitP95": 5.599999999976717
      },
      "5000": {
        "setKey": {
          "emitP50": 11.800000000046566,
          "emitP95": 23.400000000023283,
          "domP50": 12.20000000006985,
          "domP95": 23.70000000006985
        },
        "setKeys": {
          "emitP50": 10.899999999906868,
          "emitP95": 31.199999999953434,
          "domP50": 11.399999999906868,
          "domP95": 31.599999999976717
        },
        "replace": {
          "emitP50": 13.800000000046566,
          "emitP95": 23.900000000023283,
          "domP50": 14.5,
          "domP95": 24.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 9.300000000046566,
          "lagP95": 21.099999999976717,
          "endLag": 7.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.930683135986328,
        "heapCode": 3.072917938232422,
        "heapData": 6.260234832763672,
        "pssTotalMb": 244.5361328125,
        "pssApp": 137.037109375,
        "pssRenderer": 107.4990234375,
        "control": {
          "emitP50": 6.699999999953434,
          "emitP95": 18.79999999993015,
          "domP50": 6.899999999906868,
          "domP95": 19.099999999976717
        },
        "fCommitP50": 3.900000000023283,
        "fCommitP95": 6
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.200000000069849,
        "emitP95": 21.800000000046566,
        "domP50": 8,
        "domP95": 22.400000000023283
      },
      "edit_d4": {
        "emitP50": 8.699999999953434,
        "emitP95": 30.79999999993015,
        "domP50": 9.29999999993015,
        "domP95": 31.29999999993015
      },
      "edit_d10": {
        "emitP50": 7.800000000046566,
        "emitP95": 21.099999999976717,
        "domP50": 8.5,
        "domP95": 21.399999999906868
      },
      "loadCycle": {
        "emitP50": 13.400000000023283,
        "emitP95": 56.40000000002328,
        "domP50": 13.699999999953434,
        "domP95": 56.800000000046566
      },
      "step": {
        "emitP50": 8.099999999976717,
        "emitP95": 31.800000000046566,
        "domP50": 8.400000000023283,
        "domP95": 32.09999999997672
      },
      "reset": {
        "emitP50": 22.300000000046566,
        "emitP95": 41.199999999953434,
        "domP50": 22.900000000023283,
        "domP95": 41.29999999993015
      },
      "append100": {
        "emitP50": 15,
        "emitP95": 33.199999999953434,
        "domP50": 15.400000000023283,
        "domP95": 33.5
      },
      "control": {
        "emitP50": 7.599999999976717,
        "emitP95": 18.5,
        "domP50": 7.900000000023283,
        "domP95": 18.800000000046566
      },
      "heapMb": 5.4906768798828125,
      "heapCode": 3.175434112548828,
      "heapData": 1.8674697875976562,
      "pssTotalMb": 236.00390625,
      "pssApp": 132.8984375,
      "pssRenderer": 103.10546875,
      "relaunchReadyMs": 891.9000000000233,
      "relaunchHeapMb": 4.261993408203125,
      "relaunchHeapCode": 2.1225013732910156,
      "relaunchHeapData": 1.7640266418457031
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
          "domP95": 6.5
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 3.699999999953434,
          "domP95": 9.300000000046566
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 11.599999999976717,
          "domP50": 1.5,
          "domP95": 12.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.6000000000931323,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.72088623046875,
        "heapCode": 1.8415946960449219,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 220.7939453125,
        "pssApp": 125.603515625,
        "pssRenderer": 95.1904296875
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1.3000000000465661,
          "domP50": 1.400000000023283,
          "domP95": 6.5
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 1.400000000023283,
          "domP50": 1.3000000000465661,
          "domP95": 6.300000000046566
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 9.400000000023283,
          "domP50": 1.5,
          "domP95": 10
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 0.5999999999767169,
          "maxBacklog": 0
        },
        "heapMb": 3.8728866577148438,
        "heapCode": 1.603363037109375,
        "heapData": 1.8890113830566406,
        "pssTotalMb": 220.4736328125,
        "pssApp": 122.7763671875,
        "pssRenderer": 97.697265625
      },
      "5000": {
        "setKey": {
          "emitP50": 1.7000000000698492,
          "emitP95": 3.900000000023283,
          "domP50": 3.300000000046566,
          "domP95": 11.400000000023283
        },
        "setKeys": {
          "emitP50": 1.6999999999534339,
          "emitP95": 10.79999999993015,
          "domP50": 3.6000000000931323,
          "domP95": 11.599999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1.1999999999534339,
          "domP50": 1.7999999999301508,
          "domP95": 10.399999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 6,
          "endLag": 2.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.099838256835938,
        "heapCode": 1.847686767578125,
        "heapData": 5.725639343261719,
        "pssTotalMb": 227.8486328125,
        "pssApp": 124.1142578125,
        "pssRenderer": 103.734375
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6999999999534339,
        "domP50": 5.599999999976717,
        "domP95": 7.200000000069849
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.9000000000232831,
        "domP50": 5.5,
        "domP95": 10.79999999993015
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.2000000000698492,
        "domP50": 1.5,
        "domP95": 9.100000000093132
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 41.90000000002328,
        "domP50": 0.8000000000465661,
        "domP95": 42.199999999953434
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.6000000000931323,
        "domP50": 1.3000000000465661,
        "domP95": 7.200000000069849
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 0.5,
        "domP50": 0.2000000000698492,
        "domP95": 0.9000000000232831
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.5999999999767169,
        "domP50": 0.8000000000465661,
        "domP95": 4.5
      },
      "heapMb": 3.9337310791015625,
      "heapCode": 1.9221954345703125,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 220.5849609375,
      "pssApp": 124.0322265625,
      "pssRenderer": 96.552734375,
      "relaunchReadyMs": 1431.1999999999534,
      "relaunchHeapMb": 3.2575454711914062,
      "relaunchHeapCode": 1.4546623229980469,
      "relaunchHeapData": 1.44354248046875
    }
  },
  {
    "impl": "classic",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7000000000698492,
          "domP50": 2.300000000046566,
          "domP95": 14.300000000046566
        },
        "setKeys": {
          "emitP50": 0.5,
          "emitP95": 4.5,
          "domP50": 5.5,
          "domP95": 16
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.9000000000232831,
          "domP50": 1.400000000023283,
          "domP95": 6.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.8999999999068677,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.5639495849609375,
        "heapCode": 1.6890029907226562,
        "heapData": 1.5024337768554688,
        "pssTotalMb": 220.3271484375,
        "pssApp": 124.767578125,
        "pssRenderer": 95.5595703125
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8000000000465661,
          "domP50": 5.600000000093132,
          "domP95": 7
        },
        "setKeys": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.8000000000465661,
          "domP50": 5.200000000069849,
          "domP95": 15.899999999906868
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 10,
          "domP50": 1.1999999999534339,
          "domP95": 10.70000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.7000000000698492,
          "endLag": 0.2999999999301508,
          "maxBacklog": 0
        },
        "heapMb": 4.134853363037109,
        "heapCode": 1.85186767578125,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 226.8076171875,
        "pssApp": 126.55078125,
        "pssRenderer": 100.2568359375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.400000000023283,
          "emitP95": 4.800000000046566,
          "domP50": 4.199999999953434,
          "domP95": 14.599999999976717
        },
        "setKeys": {
          "emitP50": 1.599999999976717,
          "emitP95": 9.199999999953434,
          "domP50": 3.400000000023283,
          "domP95": 10.599999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.800000000046566,
          "domP50": 2,
          "domP95": 7.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3999999999068677,
          "lagP95": 2.900000000023283,
          "endLag": 1,
          "maxBacklog": 0
        },
        "heapMb": 8.094112396240234,
        "heapCode": 1.842926025390625,
        "heapData": 5.725063323974609,
        "pssTotalMb": 231.7158203125,
        "pssApp": 126.484375,
        "pssRenderer": 105.2314453125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.8000000000465661,
        "domP50": 5.299999999930151,
        "domP95": 8.400000000023283
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.5,
        "domP50": 5.300000000046566,
        "domP95": 10.29999999993015
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 0.8000000000465661,
        "domP50": 2.599999999976717,
        "domP95": 9.199999999953434
      },
      "loadCycle": {
        "emitP50": 15,
        "emitP95": 34.199999999953434,
        "domP50": 15.300000000046566,
        "domP95": 34.5
      },
      "step": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.40000000002328306,
        "domP50": 1,
        "domP95": 7.900000000023283
      },
      "reset": {
        "emitP50": 0.2000000000698492,
        "emitP95": 4,
        "domP50": 0.2000000000698492,
        "domP95": 4.599999999976717
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7999999999301508,
        "domP50": 1.099999999976717,
        "domP95": 8.399999999906868
      },
      "heapMb": 3.937793731689453,
      "heapCode": 1.9258613586425781,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 224.1533203125,
      "pssApp": 126.0166015625,
      "pssRenderer": 98.13671875,
      "relaunchReadyMs": 1501.9000000000233,
      "relaunchHeapMb": 3.3515052795410156,
      "relaunchHeapCode": 1.5399055480957031,
      "relaunchHeapData": 1.4461288452148438
    }
  },
  {
    "impl": "sqlite",
    "trial": 3,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 8.699999999953434,
          "emitP95": 37,
          "domP50": 9.400000000023283,
          "domP95": 37.59999999997672
        },
        "setKeys": {
          "emitP50": 10.900000000023283,
          "emitP95": 23.300000000046566,
          "domP50": 11.300000000046566,
          "domP95": 23.600000000093132
        },
        "replace": {
          "emitP50": 7.799999999930151,
          "emitP95": 18.599999999976717,
          "domP50": 8.5,
          "domP95": 18.899999999906868
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.599999999976717,
          "lagP95": 15.699999999953434,
          "endLag": 6.800000000046566,
          "maxBacklog": 2
        },
        "heapMb": 5.052589416503906,
        "heapCode": 2.998210906982422,
        "heapData": 1.6158828735351562,
        "pssTotalMb": 233.1806640625,
        "pssApp": 130.5517578125,
        "pssRenderer": 102.62890625,
        "control": {
          "emitP50": 6,
          "emitP95": 17.300000000046566,
          "domP50": 6.300000000046566,
          "domP95": 17.599999999976717
        },
        "fCommitP50": 3,
        "fCommitP95": 10.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 7,
          "emitP95": 25.20000000006985,
          "domP50": 7.5,
          "domP95": 25.899999999906868
        },
        "setKeys": {
          "emitP50": 8.900000000023283,
          "emitP95": 19.099999999976717,
          "domP50": 9.300000000046566,
          "domP95": 19.400000000023283
        },
        "replace": {
          "emitP50": 9.29999999993015,
          "emitP95": 24.300000000046566,
          "domP50": 9.699999999953434,
          "domP95": 24.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.5,
          "lagP95": 22.20000000006985,
          "endLag": 5.599999999976717,
          "maxBacklog": 3
        },
        "heapMb": 5.551399230957031,
        "heapCode": 3.0269241333007812,
        "heapData": 2.0685768127441406,
        "pssTotalMb": 233.69140625,
        "pssApp": 130.431640625,
        "pssRenderer": 103.259765625,
        "control": {
          "emitP50": 5.5,
          "emitP95": 22,
          "domP50": 5.900000000023283,
          "domP95": 22.300000000046566
        },
        "fCommitP50": 3.700000000069849,
        "fCommitP95": 7.5
      },
      "5000": {
        "setKey": {
          "emitP50": 11.400000000023283,
          "emitP95": 17.099999999976717,
          "domP50": 11.900000000023283,
          "domP95": 17.599999999976717
        },
        "setKeys": {
          "emitP50": 10.099999999976717,
          "emitP95": 27.599999999976717,
          "domP50": 10.5,
          "domP95": 28.099999999976717
        },
        "replace": {
          "emitP50": 12.5,
          "emitP95": 32.70000000006985,
          "domP50": 13.79999999993015,
          "domP95": 34.09999999997672
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.399999999906868,
          "lagP95": 19.599999999976717,
          "endLag": 17.300000000046566,
          "maxBacklog": 2
        },
        "heapMb": 9.931652069091797,
        "heapCode": 3.073596954345703,
        "heapData": 6.2606201171875,
        "pssTotalMb": 248.9951171875,
        "pssApp": 140.1552734375,
        "pssRenderer": 108.83984375,
        "control": {
          "emitP50": 6.599999999976717,
          "emitP95": 16.699999999953434,
          "domP50": 7.400000000023283,
          "domP95": 17.199999999953434
        },
        "fCommitP50": 4.300000000046566,
        "fCommitP95": 8.70000000006985
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 7.699999999953434,
        "emitP95": 27.400000000023283,
        "domP50": 8.5,
        "domP95": 28.100000000093132
      },
      "edit_d4": {
        "emitP50": 7.699999999953434,
        "emitP95": 17.599999999976717,
        "domP50": 8.599999999976717,
        "domP95": 17.900000000023283
      },
      "edit_d10": {
        "emitP50": 8.29999999993015,
        "emitP95": 29,
        "domP50": 8.699999999953434,
        "domP95": 29.399999999906868
      },
      "loadCycle": {
        "emitP50": 15.5,
        "emitP95": 59.39999999990687,
        "domP50": 15.599999999976717,
        "domP95": 59.89999999990687
      },
      "step": {
        "emitP50": 8.399999999906868,
        "emitP95": 27.400000000023283,
        "domP50": 8.899999999906868,
        "domP95": 27.800000000046566
      },
      "reset": {
        "emitP50": 24.699999999953434,
        "emitP95": 48.5,
        "domP50": 25.199999999953434,
        "domP95": 48.5
      },
      "append100": {
        "emitP50": 15.5,
        "emitP95": 24,
        "domP50": 15.79999999993015,
        "domP95": 24.699999999953434
      },
      "control": {
        "emitP50": 6.400000000023283,
        "emitP95": 24.400000000023283,
        "domP50": 6.599999999976717,
        "domP95": 24.900000000023283
      },
      "heapMb": 5.483451843261719,
      "heapCode": 3.1680526733398438,
      "heapData": 1.8676872253417969,
      "pssTotalMb": 238.5615234375,
      "pssApp": 133.96484375,
      "pssRenderer": 104.5966796875,
      "relaunchReadyMs": 1617.8000000000466,
      "relaunchHeapMb": 4.458454132080078,
      "relaunchHeapCode": 2.2254562377929688,
      "relaunchHeapData": 1.8573760986328125
    }
  },
  {
    "impl": "sqlite",
    "trial": 4,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 9,
          "emitP95": 20.79999999993015,
          "domP50": 9.599999999976717,
          "domP95": 21.599999999976717
        },
        "setKeys": {
          "emitP50": 8.400000000023283,
          "emitP95": 20.099999999976717,
          "domP50": 9.400000000023283,
          "domP95": 20.599999999976717
        },
        "replace": {
          "emitP50": 7.199999999953434,
          "emitP95": 17.699999999953434,
          "domP50": 7.600000000093132,
          "domP95": 18
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.100000000093132,
          "lagP95": 14.70000000006985,
          "endLag": 6.400000000023283,
          "maxBacklog": 2
        },
        "heapMb": 5.064353942871094,
        "heapCode": 3.008655548095703,
        "heapData": 1.6156158447265625,
        "pssTotalMb": 232.6416015625,
        "pssApp": 130.3173828125,
        "pssRenderer": 102.32421875,
        "control": {
          "emitP50": 6.100000000093132,
          "emitP95": 19.20000000006985,
          "domP50": 6.600000000093132,
          "domP95": 19.600000000093132
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 6.900000000023283
      },
      "500": {
        "setKey": {
          "emitP50": 9,
          "emitP95": 23.300000000046566,
          "domP50": 9.900000000023283,
          "domP95": 23.70000000006985
        },
        "setKeys": {
          "emitP50": 10.300000000046566,
          "emitP95": 29.599999999976717,
          "domP50": 10.900000000023283,
          "domP95": 30
        },
        "replace": {
          "emitP50": 7.900000000023283,
          "emitP95": 28.5,
          "domP50": 8.800000000046566,
          "domP95": 29.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 7.5,
          "lagP95": 16.599999999976717,
          "endLag": 8.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.544254302978516,
        "heapCode": 3.0204811096191406,
        "heapData": 2.0683326721191406,
        "pssTotalMb": 235.36328125,
        "pssApp": 132.0849609375,
        "pssRenderer": 103.2783203125,
        "control": {
          "emitP50": 6.599999999976717,
          "emitP95": 25.900000000023283,
          "domP50": 6.900000000023283,
          "domP95": 26.199999999953434
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 5.5
      },
      "5000": {
        "setKey": {
          "emitP50": 9.70000000006985,
          "emitP95": 26.399999999906868,
          "domP50": 10.20000000006985,
          "domP95": 28
        },
        "setKeys": {
          "emitP50": 11.100000000093132,
          "emitP95": 24.29999999993015,
          "domP50": 11.600000000093132,
          "domP95": 24.899999999906868
        },
        "replace": {
          "emitP50": 15.099999999976717,
          "emitP95": 30.900000000023283,
          "domP50": 15.5,
          "domP95": 31.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.899999999906868,
          "lagP95": 20.300000000046566,
          "endLag": 10.599999999976717,
          "maxBacklog": 2
        },
        "heapMb": 9.940502166748047,
        "heapCode": 3.082073211669922,
        "heapData": 6.260356903076172,
        "pssTotalMb": 248.5703125,
        "pssApp": 139.875,
        "pssRenderer": 108.6953125,
        "control": {
          "emitP50": 7.099999999976717,
          "emitP95": 16.5,
          "domP50": 7.299999999930151,
          "domP95": 16.70000000006985
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 13
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 8.20000000006985,
        "emitP95": 19.099999999976717,
        "domP50": 8.79999999993015,
        "domP95": 19.400000000023283
      },
      "edit_d4": {
        "emitP50": 6.799999999930151,
        "emitP95": 27.5,
        "domP50": 7.699999999953434,
        "domP95": 27.900000000023283
      },
      "edit_d10": {
        "emitP50": 7.199999999953434,
        "emitP95": 19.099999999976717,
        "domP50": 8,
        "domP95": 19.5
      },
      "loadCycle": {
        "emitP50": 14.099999999976717,
        "emitP95": 61.89999999990687,
        "domP50": 14.300000000046566,
        "domP95": 62.29999999993015
      },
      "step": {
        "emitP50": 7.799999999930151,
        "emitP95": 20,
        "domP50": 8.199999999953434,
        "domP95": 20.29999999993015
      },
      "reset": {
        "emitP50": 40.5,
        "emitP95": 82,
        "domP50": 40.5,
        "domP95": 82.10000000009313
      },
      "append100": {
        "emitP50": 12.699999999953434,
        "emitP95": 23.70000000006985,
        "domP50": 13.199999999953434,
        "domP95": 24.100000000093132
      },
      "control": {
        "emitP50": 8,
        "emitP95": 20.199999999953434,
        "domP50": 8.300000000046566,
        "domP95": 20.399999999906868
      },
      "heapMb": 5.487094879150391,
      "heapCode": 3.1718978881835938,
      "heapData": 1.8676872253417969,
      "pssTotalMb": 237.876953125,
      "pssApp": 133.4169921875,
      "pssRenderer": 104.4599609375,
      "relaunchReadyMs": 420.30000000004657,
      "relaunchHeapMb": 4.525077819824219,
      "relaunchHeapCode": 2.317310333251953,
      "relaunchHeapData": 1.8297615051269531
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
          "domP95": 6.300000000046566
        },
        "setKeys": {
          "emitP50": 0.2999999999301508,
          "emitP95": 0.6999999999534339,
          "domP50": 5,
          "domP95": 8.099999999976717
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.6999999999534339,
          "domP50": 5.599999999976717,
          "domP95": 11.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.5,
          "endLag": 0.2000000000698492,
          "maxBacklog": 0
        },
        "heapMb": 3.7239761352539062,
        "heapCode": 1.8442230224609375,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 223.306640625,
        "pssApp": 127.0107421875,
        "pssRenderer": 96.2958984375
      },
      "500": {
        "setKey": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.7000000000698492,
          "domP50": 5.800000000046566,
          "domP95": 6.800000000046566
        },
        "setKeys": {
          "emitP50": 0.39999999990686774,
          "emitP95": 0.8000000000465661,
          "domP50": 2.099999999976717,
          "domP95": 6.599999999976717
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 2.300000000046566,
          "domP50": 1.1999999999534339,
          "domP95": 8.300000000046566
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8000000000465661,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 4.133617401123047,
        "heapCode": 1.8506736755371094,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 227.1689453125,
        "pssApp": 126.998046875,
        "pssRenderer": 100.1708984375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.8000000000465661,
          "emitP95": 2.400000000023283,
          "domP50": 4.400000000023283,
          "domP95": 9.79999999993015
        },
        "setKeys": {
          "emitP50": 1.6000000000931323,
          "emitP95": 7.900000000023283,
          "domP50": 2.799999999930151,
          "domP95": 10.5
        },
        "replace": {
          "emitP50": 0.39999999990686774,
          "emitP95": 1.3000000000465661,
          "domP50": 1.8000000000465661,
          "domP95": 6.099999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.5,
          "lagP95": 2.1000000000931323,
          "endLag": 1.1999999999534339,
          "maxBacklog": 0
        },
        "heapMb": 8.097419738769531,
        "heapCode": 1.8452911376953125,
        "heapData": 5.725639343261719,
        "pssTotalMb": 231.7177734375,
        "pssApp": 126.5673828125,
        "pssRenderer": 105.150390625
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.099999999976717,
        "domP50": 4.900000000023283,
        "domP95": 9.599999999976717
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.3999999999068677,
        "domP50": 0.8000000000465661,
        "domP95": 7.5
      },
      "edit_d10": {
        "emitP50": 0.5,
        "emitP95": 1.599999999976717,
        "domP50": 1.5,
        "domP95": 8.599999999976717
      },
      "loadCycle": {
        "emitP50": 0.5,
        "emitP95": 34.09999999997672,
        "domP50": 0.5,
        "domP95": 34.5
      },
      "step": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7000000000698492,
        "domP50": 1,
        "domP95": 7.5
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 0.5,
        "domP50": 0.19999999995343387,
        "domP95": 0.9000000000232831
      },
      "append100": {
        "emitP50": 0.30000000004656613,
        "emitP95": 0.40000000002328306,
        "domP50": 0.7000000000698492,
        "domP95": 5.099999999976717
      },
      "heapMb": 3.7773666381835938,
      "heapCode": 1.7703361511230469,
      "heapData": 1.6310348510742188,
      "pssTotalMb": 222.33984375,
      "pssApp": 125.5830078125,
      "pssRenderer": 96.7568359375,
      "relaunchReadyMs": 1451.1999999999534,
      "relaunchHeapMb": 3.3515586853027344,
      "relaunchHeapCode": 1.5399589538574219,
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
          "emitP95": 5.099999999976717,
          "domP50": 2.3999999999068677,
          "domP95": 13
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 0.8000000000465661,
          "domP50": 0.9000000000232831,
          "domP95": 5.700000000069849
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 4.5,
          "domP50": 2.300000000046566,
          "domP95": 17.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.30000000004656613,
          "lagP95": 0.6999999999534339,
          "endLag": 0.30000000004656613,
          "maxBacklog": 0
        },
        "heapMb": 3.7240257263183594,
        "heapCode": 1.844329833984375,
        "heapData": 1.5053787231445312,
        "pssTotalMb": 223.6630859375,
        "pssApp": 127.1728515625,
        "pssRenderer": 96.490234375
      },
      "500": {
        "setKey": {
          "emitP50": 0.5,
          "emitP95": 1,
          "domP50": 1.1999999999534339,
          "domP95": 6.700000000069849
        },
        "setKeys": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 5.299999999930151,
          "domP95": 12.70000000006985
        },
        "replace": {
          "emitP50": 0.30000000004656613,
          "emitP95": 0.8000000000465661,
          "domP50": 4.800000000046566,
          "domP95": 6.900000000023283
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 0.40000000002328306,
          "lagP95": 0.8000000000465661,
          "endLag": 0.40000000002328306,
          "maxBacklog": 0
        },
        "heapMb": 4.133121490478516,
        "heapCode": 1.8499717712402344,
        "heapData": 1.8946685791015625,
        "pssTotalMb": 225.8916015625,
        "pssApp": 125.259765625,
        "pssRenderer": 100.6318359375
      },
      "5000": {
        "setKey": {
          "emitP50": 1.1999999999534339,
          "emitP95": 1.599999999976717,
          "domP50": 7,
          "domP95": 7.900000000023283
        },
        "setKeys": {
          "emitP50": 1.5,
          "emitP95": 5.199999999953434,
          "domP50": 2.700000000069849,
          "domP95": 17.400000000023283
        },
        "replace": {
          "emitP50": 0.40000000002328306,
          "emitP95": 1,
          "domP50": 1.5,
          "domP95": 11.599999999976717
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 1.3000000000465661,
          "lagP95": 2.800000000046566,
          "endLag": 1.099999999976717,
          "maxBacklog": 0
        },
        "heapMb": 8.099365234375,
        "heapCode": 1.8472404479980469,
        "heapData": 5.725639343261719,
        "pssTotalMb": 230.201171875,
        "pssApp": 125.498046875,
        "pssRenderer": 104.703125
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 0.40000000002328306,
        "emitP95": 2.099999999976717,
        "domP50": 3.199999999953434,
        "domP95": 11
      },
      "edit_d4": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.400000000023283,
        "domP50": 5.5,
        "domP95": 13.20000000006985
      },
      "edit_d10": {
        "emitP50": 0.40000000002328306,
        "emitP95": 1.3999999999068677,
        "domP50": 1.7999999999301508,
        "domP95": 10.699999999953434
      },
      "loadCycle": {
        "emitP50": 11.20000000006985,
        "emitP95": 32.5,
        "domP50": 15.599999999976717,
        "domP95": 33
      },
      "step": {
        "emitP50": 0.2999999999301508,
        "emitP95": 2.299999999930151,
        "domP50": 3.5,
        "domP95": 7.699999999953434
      },
      "reset": {
        "emitP50": 0.19999999995343387,
        "emitP95": 1.1999999999534339,
        "domP50": 0.19999999995343387,
        "domP95": 1.1999999999534339
      },
      "append100": {
        "emitP50": 0.40000000002328306,
        "emitP95": 0.7999999999301508,
        "domP50": 0.9000000000232831,
        "domP95": 10.100000000093132
      },
      "heapMb": 3.9354248046875,
      "heapCode": 1.9237174987792969,
      "heapData": 1.6340103149414062,
      "pssTotalMb": 223.99609375,
      "pssApp": 126.03125,
      "pssRenderer": 97.96484375,
      "relaunchReadyMs": 1413.0999999999767,
      "relaunchHeapMb": 3.351703643798828,
      "relaunchHeapCode": 1.5399208068847656,
      "relaunchHeapData": 1.4463119506835938
    }
  },
  {
    "impl": "sqlite",
    "trial": 5,
    "flat": {
      "50": {
        "setKey": {
          "emitP50": 7.800000000046566,
          "emitP95": 26,
          "domP50": 8.20000000006985,
          "domP95": 26.599999999976717
        },
        "setKeys": {
          "emitP50": 9.099999999976717,
          "emitP95": 24,
          "domP50": 9.5,
          "domP95": 24.300000000046566
        },
        "replace": {
          "emitP50": 7.699999999953434,
          "emitP95": 15.70000000006985,
          "domP50": 8.199999999953434,
          "domP95": 16.20000000006985
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 6.199999999953434,
          "lagP95": 28.5,
          "endLag": 5.699999999953434,
          "maxBacklog": 2
        },
        "heapMb": 5.053157806396484,
        "heapCode": 2.9983978271484375,
        "heapData": 1.6156158447265625,
        "pssTotalMb": 236.0283203125,
        "pssApp": 133.2451171875,
        "pssRenderer": 102.783203125,
        "control": {
          "emitP50": 6.5,
          "emitP95": 17.699999999953434,
          "domP50": 6.700000000069849,
          "domP95": 18
        },
        "fCommitP50": 3.099999999976717,
        "fCommitP95": 19.899999999906868
      },
      "500": {
        "setKey": {
          "emitP50": 8.599999999976717,
          "emitP95": 31,
          "domP50": 9.099999999976717,
          "domP95": 31.599999999976717
        },
        "setKeys": {
          "emitP50": 9.699999999953434,
          "emitP95": 30.699999999953434,
          "domP50": 10.099999999976717,
          "domP95": 31.099999999976717
        },
        "replace": {
          "emitP50": 9.800000000046566,
          "emitP95": 24.5,
          "domP50": 10.20000000006985,
          "domP95": 25.29999999993015
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 8.300000000046566,
          "lagP95": 17.599999999976717,
          "endLag": 7.099999999976717,
          "maxBacklog": 2
        },
        "heapMb": 5.543956756591797,
        "heapCode": 3.0204086303710938,
        "heapData": 2.0683326721191406,
        "pssTotalMb": 234.61328125,
        "pssApp": 131.2099609375,
        "pssRenderer": 103.4033203125,
        "control": {
          "emitP50": 7.400000000023283,
          "emitP95": 16.300000000046566,
          "domP50": 7.600000000093132,
          "domP95": 16.600000000093132
        },
        "fCommitP50": 3.300000000046566,
        "fCommitP95": 8.70000000006985
      },
      "5000": {
        "setKey": {
          "emitP50": 9.100000000093132,
          "emitP95": 21.300000000046566,
          "domP50": 10.099999999976717,
          "domP95": 25.20000000006985
        },
        "setKeys": {
          "emitP50": 9.600000000093132,
          "emitP95": 28.599999999976717,
          "domP50": 10.5,
          "domP95": 29
        },
        "replace": {
          "emitP50": 14.29999999993015,
          "emitP95": 22.100000000093132,
          "domP50": 14.599999999976717,
          "domP95": 22.5
        },
        "burst": {
          "dispatched": 90,
          "observed": 90,
          "lagP50": 10.20000000006985,
          "lagP95": 21.5,
          "endLag": 13.900000000023283,
          "maxBacklog": 2
        },
        "heapMb": 9.940753936767578,
        "heapCode": 3.0820236206054688,
        "heapData": 6.260505676269531,
        "pssTotalMb": 247.2783203125,
        "pssApp": 138.4443359375,
        "pssRenderer": 108.833984375,
        "control": {
          "emitP50": 5.599999999976717,
          "emitP95": 26.400000000023283,
          "domP50": 5.799999999930151,
          "domP95": 26.699999999953434
        },
        "fCommitP50": 3.400000000023283,
        "fCommitP95": 8.199999999953434
      }
    },
    "workflow": {
      "edit_d1": {
        "emitP50": 9.600000000093132,
        "emitP95": 16.20000000006985,
        "domP50": 10.100000000093132,
        "domP95": 16.800000000046566
      },
      "edit_d4": {
        "emitP50": 6.700000000069849,
        "emitP95": 25,
        "domP50": 7.599999999976717,
        "domP95": 25.900000000023283
      },
      "edit_d10": {
        "emitP50": 7.699999999953434,
        "emitP95": 17,
        "domP50": 8.099999999976717,
        "domP95": 17.400000000023283
      },
      "loadCycle": {
        "emitP50": 20.800000000046566,
        "emitP95": 62.300000000046566,
        "domP50": 21.20000000006985,
        "domP95": 62.800000000046566
      },
      "step": {
        "emitP50": 8.70000000006985,
        "emitP95": 16.79999999993015,
        "domP50": 9,
        "domP95": 19.099999999976717
      },
      "reset": {
        "emitP50": 26,
        "emitP95": 94,
        "domP50": 26,
        "domP95": 94
      },
      "append100": {
        "emitP50": 11.20000000006985,
        "emitP95": 20.79999999993015,
        "domP50": 11.599999999976717,
        "domP95": 21.199999999953434
      },
      "control": {
        "emitP50": 7.099999999976717,
        "emitP95": 27.400000000023283,
        "domP50": 7.299999999930151,
        "domP95": 27.599999999976717
      },
      "heapMb": 5.4901123046875,
      "heapCode": 3.1744728088378906,
      "heapData": 1.8677406311035156,
      "pssTotalMb": 237.5087890625,
      "pssApp": 133.0458984375,
      "pssRenderer": 104.462890625,
      "relaunchReadyMs": 843.6999999999534,
      "relaunchHeapMb": 4.662570953369141,
      "relaunchHeapCode": 2.0962295532226562,
      "relaunchHeapData": 1.7611351013183594
    }
  }
]
```
</details>
