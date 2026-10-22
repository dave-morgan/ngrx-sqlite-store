# ADR-0038: Performance acceptance criteria versus classic NgRx

Status: Accepted (User goal, 2026-10-22; criteria defined by Agent)

## Context
The user set the goal for this store: **every performance metric should be within one standard deviation of classic `@ngrx/store`, unless a hard platform limit prevents it**, the Capacitor bridge being the obvious example.

Single-run emulator numbers are too noisy to judge against that. Classic toggle p50 alone ranged from 30 ms to 152 ms across sessions.

## Decision
1. **Measurement.**
   - `tools/android-bench.mjs --trials N` runs N independent trials (default 5) per implementation × size. Each trial starts from a fresh process.
   - The implementation order alternates per trial (classic, sqlite, sqlite, classic, …) to cancel drift.
   - For every metric the runner reports mean and sample SD.
   - Run on a freshly booted emulator. A real device is preferred when one is available.
2. **Pass rule.** For each metric M, where lower is better:
   - **PASS** when `mean_sqlite(M) ≤ mean_classic(M) + sd_classic(M)`. Being better than classic also passes.
   - **BRIDGE-BOUND** when the metric misses PASS, but the excess is explained by the measured bridge cost:
     `mean_sqlite − mean_classic ≤ sd_classic + calls_min × rtt + bytes_min / bandwidth + sd_sqlite`
     - `rtt` and `bandwidth` are measured in the same session with a bridge microbenchmark: a `CapacitorSQLite.echo` round trip, and `executeSet` payloads of increasing size.
     - `calls_min` and `bytes_min` are the **minimum** bridge calls and bytes the operation must make under the store's contract. For example, one commit round trip per dispatch, because notify-after-commit (ADR-0003) cannot be relaxed.
     - The justification for `calls_min` and `bytes_min` is written next to each such metric.
   - **FAIL** otherwise. A FAIL is a bug to fix, or a gap to explain in an ADR.
3. **Metrics in scope** (all sizes 1k / 10k / 50k):
   - first-ready, which includes the seed write;
   - relaunch-ready;
   - JS heap on /todos, on /notes and after relaunch;
   - device-total PSS (app + WebView renderer) after seeding and after relaunch;
   - toggle p50 and p95;
   - emit p50 and p95.
4. **Reporting.** Each benchmark report ends with an acceptance table listing every metric with its verdict, the numbers behind it, and the bridge justification where one applies.

## Consequences
- Benchmarks take longer: 5 trials, 2 implementations, 3 sizes.
- Bridge-bound gaps are accepted only with arithmetic behind them. Anything else must be fixed.
