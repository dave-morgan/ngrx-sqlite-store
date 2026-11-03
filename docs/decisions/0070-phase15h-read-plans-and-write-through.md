# ADR-0070: Phase 15h — subtree read plans, router write-through, startup release and memory floor

Status: Accepted (Agent, 2026-10-24)

## Context
After Phase 15g (12 PASS / 8 PB / 2 CB / 11 FAIL), a startup trace that included bound values showed:
- 5 read-backs of the session `router` slice;
- leaf reads in the todos feature taking 55–672 ms at 10k.

`EXPLAIN QUERY PLAN` on the device located the cause. `coll = ? OR (coll >= ? AND coll < ?)` on the `WITHOUT ROWID` entity table plans as MULTI-INDEX OR, which took **185 ms** to return 0 rows next to a 10k collection. An equality arm plus a range arm in `UNION ALL` took **9 ms**.

A post-seed meminfo timeline showed that android-bench's PSS point catches Java-side bridge garbage:
- at that point the sqlite app's Java heap is 27.3 MiB against classic's 16.5;
- it drops to classic's level within about 80 ms.

The ADR-0057 seed bracket did not reproduce the bench's sequence, and the verdict took the *max* of the plugin baseline and the seed increment. Both are platform costs and they add up.

## Decisions
1. **Subtree predicates.** Every `key = ? OR (key >= ? AND key < ?)` becomes an equality arm plus a disjoint range arm. That covers:
   - the subtree read;
   - the CTE reader's entity and chunk reads;
   - `clearEntities` and `deletePrefix`, which become two batched statements each.

   The arms cannot overlap, because the path itself lies outside `[path/, path0)`. Parameter order and results are unchanged.
2. **Write-through survives identity hints.** `StoreTx.set` records ADR-0021 reference hints *before* `diffWrite`. Previously the hints' `changes.add` for equal-content descendants, such as the router's fresh `params: {}`, invalidated the committed value `diffWrite` had just recorded. Every navigation then forced a full read-back of the slice. A regression test asserts zero router read-backs.
3. **Startup release.**
   - `StorageEngine.transactionStages(fn, { releaseOnSend })` returns `sent` (the queue is released once the single atomic batch is issued on an order-preserving transport) and `committed`.
   - Prewarm's session deletion awaits only `sent`. Later startup reads execute natively after it, without waiting for its round trip.
   - A later failure calls `engine.fail`, so every subsequent operation, including bootstrap, surfaces it like a failed open.
4. **Page cache.**
   - Steady connections use `cache_size=-512` KiB, issued in order and not awaited.
   - Streamed bulk transactions use SQLite's default 2,000 KiB until idle maintenance restores the steady cache and runs `shrink_memory`.
   - A larger 8 MiB bulk cache left allocator growth in PSS and was rejected.
5. **Memory floor (amends ADR-0057/0069).**
   - The seed-memory control runs one real-row seed first in the fresh floor process.
   - It then runs android-bench's own pre-PSS steps (two V8 GCs 300 ms apart) and reads app PSS.
   - The allowance is classic SD + the plugin baseline (empty control) + the seed increment.
6. **Hot-path JS.**
   - View reconciliation assigns properties directly (`defineProperty` only for `__proto__`).
   - String sizing uses a single `charCodeAt` pass for printable ASCII.

## Rejected (measured or contract-breaking)
- **Concurrent engine reads.** Native order would be preserved, but PathCache's shared-map updates across awaits assume serialized reads, and selectors emitted duplicates.
- **Streamed `setAll` encoding.** It breaks the tested contract that a caught validation error leaves the existing rows intact. Validation must precede the first mutation. Savepoints would add round trips to small replaces.
- **Capacitor `android.useLegacyBridge`.** The paired A/B showed no difference.

## Consequences
The result is fewer and faster startup reads, no navigation read-backs, and a memory floor that measures what the bench measures. The final verdicts are in the Phase 15h report.
