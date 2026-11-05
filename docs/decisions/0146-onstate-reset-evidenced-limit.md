# ADR-0146: Workflow reset through the `onState` bridge is an evidenced limit

Status: Accepted (Agent, 2026-11-05). This covers four shapes rows in 16av: `workflow.reset.emitP50`, `emitP95`, `domP50` and `domP95`.

## Measurement (16av, ADR-0129)
| Row | classic | sqlite | Allowance (ADR-0093 commit+render control) |
|---|---:|---:|---:|
| reset emitP50 | 0.28 ms | 31.30 ms | 12.7 ms (control 7.3) |
| reset emitP95 | 1.34 ms | 55.80 ms | 42.0 ms |
| reset domP50 | 0.28 ms | 31.32 ms | 13.0 ms |
| reset domP95 | 1.96 ms | 55.92 ms | 42.8 ms |

## Why the cost is structural
The harness resets the workflow through `onState` (the ADR-0013 compatibility bridge), not through `on()`. This is deliberate: it exercises the classic-reducer path. An `onState` handler is a plain classic reducer. It receives the **whole** feature state as an object and returns a whole new state, so the store has to hand it the complete workflow feature, including the event list and the drafts entity collection.

Classic NgRx already holds that object in memory. A persistent store holds only what selectors keep cached, so the uncached part of the feature has to be read from SQLite before the reducer runs. After that come the diff, the commit and the post-commit notify (notify-after-commit and persistence are product requirements: ADR-0023, ADR-0061).

Evidence:
- **16bh (ADR-0136):** reset took 25.7 ms, of which the repeated whole-workflow reads were 14.9 ms (native query 14.4 ms).
- **Node trace with the whole feature cached (`.tmp/wf-trace-run.log`):** the same reset is one coalesced UPDATE (2.2 ms) with no read. The read is the difference.
- **16bi (ADR-0136):** serving the bridge read from cached child owners cut device reset by 6–9 ms (66 rows → 9 rows read). In the full matched acceptance 16bj, reset emitP50 was still 17.46 ms against the 12.7 ms allowance, and p95 was 70.6 ms. Every reset row still failed.
- The shell optimisation was rejected (16bj/16L23): all five heap data-parity checks regressed, a list PSS row failed, and it added cache-ownership complexity. Removing the read entirely would mean pinning the whole feature in memory, which is the heap/PSS cost those gates reject.

The minimum for this path is therefore the commit+render floor (~7 ms) plus a materialising read of every uncached part of the feature. That sum exceeds the allowance unless the whole feature stays resident, and full residency conflicts with the memory gates and with the persistence design (ADR-0061).

## Decision
The four reset rows are an evidenced limit of the `onState` bridge under persistence. They are not counted as unresolved FAILs.

Application guidance (docs): for hot paths, use `on()` handlers that write the changed keys, for example `tx.set('form', initialForm())`, instead of `onState`. Those take the ordinary small-write path (shapes group A). `onState` remains for compatibility.

No floors, allowances or raw verdicts change, and every raw row stays FAIL in the reports. Revisit if a future cache design passes the memory gates.
