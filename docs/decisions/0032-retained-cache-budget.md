# ADR-0032: Compact metadata and byte-budgeted inactive cache

Status: Accepted. Date: 2026-10-21. Authority: Phase 12 brief.

`sqlite.cacheBudgetBytes` defaults to 4 MiB and bounds inactive entries alongside
`lruSize`. Estimate retained bytes when an entry becomes inactive, retain its
total on that entry until its value changes, and evict inactive entries until both
limits hold. Active/eager entries stay pinned. Remove evicted values from cache
and compatibility views immediately. Estimation is conservative, not a V8 heap
accounting API; validate actual retention separately with forced GC.

Use one position index per entity collection (shared by schema and ordering
metadata), with raw typed ids rather than duplicate encoded strings. Freeze the
assembled positions into sorted id references and a packed Float64Array; lookup
is binary search, and values iteration supports existing insertion behavior.
This saves the measured 1.8 MiB hash table per 50k loaded entities; the packed
positions occupy 0.38 MiB outside heapUsed and still fit the total memory bound.
Omit absent sort keys and avoid a separate NodeMeta/path record for
each inline entity JSON object. Collection/ids/entities and promoted physical
nodes retain metadata. Inline entity JSON is parsed and frozen as a value, with
no physical child identities to retain. This supersedes the old internal test
expectation that each inline entity had NodeMeta. No public metadata API or
on-disk format changes.

Heap snapshots also identified two retained 2 MiB WeakMap backing tables even
after the list's objects had been collected: serialized-size memoization and a
prototype retained-size memo. Bound serialized-size memoization to 1024 entries,
and keep only a per-entry retained-size total. No per-entity size table survives
eviction. Estimates handle shared/cyclic query values without recursive loops.

Entity adapter scoped selectors must release their nested relative projector
memos, preserving the public projector(state) signature. Cache eviction triggers
cleanup of inactive selector memos even if the subscriber was released earlier,
while compatibility/scoped views discard the evicted path. Query and ui memos
never retain unrelated collection arguments. Active leases still pin sources.
Cleanup registration uses weak references, deduplicated per path and selector;
nonmemoized functions register nothing. Repeated subscriptions do not accumulate
strong selector closures or listeners while an entry stays pinned/under budget.
