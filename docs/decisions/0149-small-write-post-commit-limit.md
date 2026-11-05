# ADR-0149: Small shape writes are an evidenced limit of the serial commit-then-notify path

Status: Accepted (Agent, 2026-11-05). This covers nine shapes rows in 16av, all emitP50.

## Measurement (16av; allowance from the ADR-0093 commit+render control)
| Row | classic | sqlite | Allowance | Over |
|---|---:|---:|---:|---:|
| flat K50 setKey | 0.40 ms | 10.34 ms | 8.3 ms | 2.0 ms |
| flat K50 setKeys | 0.40 ms | 9.40 ms | 8.9 ms | 0.5 ms |
| flat K500 setKey | 0.44 ms | 9.24 ms | 8.6 ms | 0.6 ms |
| flat K500 setKeys | 0.46 ms | 10.50 ms | 9.2 ms | 1.3 ms |
| flat K5000 setKey | 1.64 ms | 11.10 ms | 7.9 ms | 3.2 ms |
| flat K5000 setKeys | 1.54 ms | 11.48 ms | 8.5 ms | 3.0 ms |
| workflow edit d1 | 0.42 ms | 8.64 ms | 8.2 ms | 0.4 ms |
| workflow edit d4 | 0.40 ms | 8.74 ms | 8.3 ms | 0.4 ms |
| workflow step | 0.34 ms | 9.38 ms | 8.4 ms | 1.0 ms |

The p95, DOM p50 and DOM p95 rows for these workloads are already PLATFORM-BOUND.

## Evidence
**16ah** (`android-flat-phase-wall-16ah-2026-10-28.md`, retained 16r APK, 90 verified actions, K=5000; nested walls, not additive CPU):

| Phase | single | ten-key |
|---|---:|---:|
| Hook emission | 9.09 ms | 9.89 ms |
| Native response (one statement) | 5.05 ms | 5.62 ms |
| Transaction before native | 0.17 ms | 0.45 ms |
| Selection refresh | 3.28 ms | 3.25 ms |
| … of which cache refreshEntry | 1.55 ms | — |
| … of which publication (incl. app selector callbacks) | 1.36 ms | — |

- **16ah2:** publication time is spread over nine permanent generation-observer callbacks, mostly 0.2–0.5 ms each. There is no single hotspot.
- **Statements:** each small write is already exactly one native statement (Fixes 1 and 5: kind/value UPDATE, coalescing).
- **Ordering:** notify-after-commit (ADR-0003/0023) puts the selection refresh strictly after the native response. The control commits and repaints with no store between them, so the store's post-commit work (~3 ms, part of it app selector work classic also does) cannot overlap the commit.
- **K=5000:** the refresh includes the new immutable 5000-key root (~1.4 ms on device). Classic's reducer pays the same copy, but the control does not.

Optimisations of this path were implemented, measured on device and rejected for lack of repeatable gain or for guard regressions:

| ADR | Optimisation |
|---|---|
| 0100 | lazy handles |
| 0103 | lease accounting |
| 0104 | idle reducer awaits |
| 0106 / 0107 | compact and reused positions |
| 0108 | scalar invalidation |
| 0111 | static readiness |
| 0115 | publication index |
| 0116 | empty flushes |
| 0118 | lazy static signals |
| 0120 | primitive kind reuse |
| 0140 / 0141 | pointer sharing and primitive scope |
| 0142 | lazy query batch |

Fixes 3, 6 and 9 were retained.

## Decision
These nine rows are an evidenced limit: one native commit (~5 ms) plus a mandatory post-commit refresh and notify of ~3 ms, run serially by design, exceeds the store-free control allowance by 0.4–3.2 ms.

No floors, allowances or raw verdicts change; the rows stay FAIL in the reports. Reopen if a post-commit design emerges that keeps notify-after-commit and passes the full list and shape guards.
