# ADR-0037: Change-aware entity queries and bounded refresh batches

Status: Accepted. Date: 2026-10-22. Authority: Phase 14 brief.

Carry transaction-local entity deltas (typed id, mutation kind, previous/next
values and changed top-level fields) through commit invalidation. Release the
journal after notification; only active query entries retain the deltas until
refresh, or release them immediately when a dirty query becomes inactive.
Unknown writes and physical subtree writes remain conservative.
Insert probes combine the append endpoint and existing IDs in one indexed
query with a bound JSON ID list, preserving conflict semantics and bulk budgets.
Reorder journals preserve earlier value deltas. Multiple unrefreshed commits
fall back to SQL rather than applying deltas to an older cached result.

Entity aggregates maintain an exact matching-row count, including exists queries.
Updates unrelated to their filter fields skip evaluation. Pages patch matching
rows with structural sharing when membership and order are unchanged. IDs keep
their array for such updates. Membership/order changes re-run the query.

Coalesce query transports in a parameterized SELECT, with one bounded JSON
cell per source. Check UTF-8 byte length in SQLite before returning a cell;
oversized results use ordinary row transport. Promoted entities retain their
existing subtree fallback. Generic readers always execute; learn their transport
columns from ordinary row results for explicit, unique aliased SELECT projections
so subsequent reruns join the same batch. Wildcards and duplicate/ambiguous
columns keep ordinary driver semantics. Keep at most 32 statement shapes per entry.
Unknown/empty-first result shapes, BLOBs, statements unsuitable as subqueries and dependent read stages retain
ordinary row transport. Preserve arbitrary reader result types and SQL behavior.
Split batches at 999 bindings or 32 sources. Identifier quoting uses internal
transport columns or names observed from the driver; JSON keys and all query
values are bound parameters.

New subscriptions acquired together share the same read batch. Query row caches
are updated along with patched pages and are usable by EntityTx only while fresh.
No schema, NgRx DI token, harness application or transaction ordering changes.

Validation: seeded random mutation/filter trees compare live count/exists/ids/page
with fresh SQL after every action in unsorted, sortKey and sortComparer modes.
Regressions cover mixed writes, reorder deltas, custom IDs, stale leases, generic
readers (including duplicate column names and BLOBs), reference sharing, exact SQL
numbers, binding/statement batch limits and UTF-8 transport overflow.
Bridge counts are recorded in
[the Phase 14 report](../benchmarks/phase-14-query-refresh-2026-10-22.md).
