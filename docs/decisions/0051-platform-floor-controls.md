# ADR-0051: Platform-floor controls for latency (amends ADR-0038)

Status: Accepted (Agent, 2026-10-22). Amends ADR-0038 §2.

## Context
ADR-0038 accepts a gap to classic only when a hard platform limit explains it. Phase 15b (ADR-0050) priced a dispatch at one `echo` round trip, about 2 ms.

An `echo` does not touch SQLite, while the store's contract requires more. Notify-after-commit (ADR-0003) means every dispatch makes at least **one durable SQLite commit**:
- the bridge crossing;
- `BEGIN`, a write and `COMMIT`;
- the WAL append and sync at the configured level.

Likewise:
- seeding N rows must at minimum push those bytes through the bridge **and** insert them natively;
- a relaunch must at minimum open the database file and read persisted state.

Any app that uses SQLite through Capacitor pays these costs, which makes them platform hard limits, the same as the bridge itself. Pricing them at zero labels platform cost as store overhead and points optimisation work at the wrong target.

## Decision
1. **Floor controls.** These are measured in the same session as the benchmark, as at least 20 samples each (5 for the seed and open controls). They use minimal native operations with **no store code**: a scratch table in the same database file, issued directly through the plugin from a bench hook.
   - **F_commit:** `executeSet([{ INSERT OR REPLACE INTO nss_bench(k, v) VALUES (1, ?) }], transaction: true)` with a 32-byte value. Report p50 and p95.
   - **F_seed(N):** `executeSet` of the **same total bytes** as the store's seed payload for N, as plain rows in a 2-column scratch table, in one transaction. The rows are chunked exactly as the store chunks them.
   - **F_open:** a fresh process that opens the populated DB file and runs one `SELECT` returning one row. The time is measured from the first plugin call to the result. Use the existing empty-control harness mode, pointed at the populated DB.
2. **PLATFORM-BOUND (latency).** A latency metric that misses PASS is PLATFORM-BOUND when `mean_sqlite − mean_classic ≤ sd_classic + F + sd_sqlite`, where F is the matching control:

   | Metric | Floor |
   | --- | --- |
   | emit p50 | p50 of F_commit |
   | emit p95 | p95 of F_commit |
   | toggle p50/p95 | the matching F_commit percentile, plus any data-dependent read the operation provably needs |
   | first-ready | F_seed(N) + F_open |
   | relaunch-ready | F_open |

   The report shows each control's samples and the arithmetic. BRIDGE-BOUND remains for cases that are pure transport.
3. **Memory** keeps ADR-0048's empty-control rule.
4. **Everything above the floor is store overhead,** and it is FAIL until it is optimised away or explained.

## Consequences
Verdicts now separate cost the platform makes unavoidable from cost the store adds. A metric failing under this rule has an overhead the store controls.
