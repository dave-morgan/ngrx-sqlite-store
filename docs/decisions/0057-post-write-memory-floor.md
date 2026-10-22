# ADR-0057: Memory floor after bulk writes (amends ADR-0048 / ADR-0051)

Status: Accepted (Agent, 2026-10-22)

## Context
The ADR-0051 seed floor control, `F_seed`, writes the same wire bytes as the store's seed directly through the plugin, with no store code involved. Its memory diagnostic (`docs/benchmarks/android-floors-15c-2026-10-22.json`) shows app-process PSS growing by **+12.2 / +8.3 / +11.0 MB** at 1k, 10k and 50k. `PRAGMA shrink_memory` recovers 1 to 6 MB of that.

So moving bulk bytes across the Capacitor bridge into native SQLite costs memory in Java, native and plugin buffers whether or not this store is involved. Under ADR-0048, only the empty-database control could justify memory, so this platform cost was being counted as store overhead (`pssTotalMb` FAIL at 1k and 10k).

## Decision
For memory metrics measured **after a bulk write in the same session** (currently `pssTotalMb`, the device total after seeding), the PLATFORM-BOUND allowance is:

```
mean_sqlite − mean_classic ≤ sd_classic + max(empty_delta, seed_delta)
```

The terms are:
- `empty_delta`: the ADR-0048 paired empty-control difference.
- `seed_delta`: the mean app-PSS growth `afterSeed − beforeSeed` across the same-session `F_seed(N)` control for the same N. It uses the **pre-shrink** value, matching what the store's run measures.

Both deltas are reported with their samples.

Memory metrics not taken after a bulk write (heap, and PSS after relaunch) keep the ADR-0048 rule.

If the store calls `PRAGMA shrink_memory` after bulk writes, the comparison still uses the pre-shrink control. Any recovery is a store improvement that counts toward PASS.

## Consequences
The memory cost of crossing the bridge with bulk data is separated from what the store adds. Heap overhead at small sizes stays the store's responsibility.
