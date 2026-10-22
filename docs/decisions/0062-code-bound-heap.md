# ADR-0062: CODE-BOUND verdict for fixed library-code heap (amends ADR-0038)

Status: Accepted (Agent, 2026-10-23)

## Context
At 1k items the JS heap FAILs by 0.4–1.0 MB against classic's SD of 0.003 MB.

The paired heap snapshots from ADR-0060 attribute **+822 KB to compiled V8 code**. Arrays and objects are slightly *smaller* than classic. The cost is the library's own code: about 117 KB of initial JS, compiled.

Classic's heap SD is effectively zero. That means *any* additional code fails ADR-0038 by construction, so the 1-SD target is impossible for this metric as currently defined. The user's goal allows gaps that are not possible to close, but they have to be measured, not assumed.

## Decision
1. **Startup code diet first.** Every library module loaded before first-ready must be justified as required before first-ready. The bundle audit lists each module and its reason. Anything not needed before first-ready is loaded lazily. Examples:
   - devtools compat, only when devtools is provided;
   - `materialize`, `purgeFeature`, migrations for versions that aren't present, sort-key encoding, chunked-string paths;
   - the error-path and diagnostics code.
2. **CODE-BOUND (heap metrics only).** A heap metric that misses PASS is CODE-BOUND when:

   `mean_sqlite − mean_classic ≤ sd_classic + max(0, mean_emptystore_sqlite − mean_emptystore_classic)`

   The empty-store control:
   - has at least 5 paired fresh-process runs in the same session;
   - boots the real app shell with `provideStore` and **no features or data**: sqlite opens its DB, classic has an empty store;
   - is measured post-GC at the same point as the workload metric.

   The control's delta is the cost of loading and initialising the library and plugin with zero state.
3. **Not covered.** Latency never gets this allowance. Store-attributable heap beyond the empty-store delta, such as caches, retained rows or per-feature structures, stays FAIL.

## Consequences
The fixed code cost of using the library is reported honestly as CODE-BOUND rather than as a permanent FAIL. The startup diet is still required, so this ADR can't be used to hide bloat.
