# ADR-0054: Collection invalidation for bulk replacement and allocation-free byte accounting

Status: Accepted. Date: 2026-10-22. Authority: Phase 15c overhead brief.

## Evidence

The existing device diagnostic
`docs/benchmarks/android-seed-trace-50000-2026-10-22-phase15b-after.cpuprofile`
attributes sampled self time of 279.225 ms to ChangeSet.record, 117.428 ms to
jsonInsertBatches, 72.528 ms to overlaps and 335.115 ms to garbage collection.
These diagnostic samples include instrumentation and reset; they identify
optimization targets, not acceptance latency or a platform floor.

Previously adapter.setAll read back every deleted entity with DELETE RETURNING,
recorded per-ID removals, then queried conflicts and the append endpoint after
the collection had already been cleared. It also created one insertion delta
closure and committed-write row per new entity. Native JSON payload byte
accounting allocated another full escaped JSON string merely to count it.

## Decision

Full setAll on an unmaterialized collection invalidates it as a physical unit.
It deletes its entity rows and the reserved promoted-entity range `[coll/~2, coll/~3)`
through RowWriter. JSON Pointer escaping makes that range disjoint from ordinary
extra properties, including keys beginning with literal `~2`. Nested promoted
nodes, chunks and entity collections are cleaned up; feature extras remain.

Replacement validates/encodes input first, deduplicates IDs with existing
first-occurrence behavior, preserves the adapter's stable comparer ordering,
and appends into the known empty collection without conflict or endpoint reads.
These bulk writes omit per-ID journals because the collection invalidation already
requires active query and whole-collection readers to reload. Incremental
insert/update/remove and removeAll retain precise journals and their existing
refresh behavior. If the whole collection is already materialized, setAll also
retains the existing precise clear/insert path: this preserves the established
zero collection-read-back budget for whole-state subscribers. Replacement
positions and sortkey row caps are validated before deletion, including when
the handler catches a validation exception and commits the transaction.
Every mutation still goes through RowWriter, keeps the row cap and transport
budget, and belongs to the original transaction. Rollback restores old rows,
promoted subtrees and extras together.

Use serializedStringSize for exact JSON-escaped UTF-8 string accounting without
allocating the escaped copy. Statement framing and scalar values are counted
directly. Uint8Array bindings retain their existing JSON.stringify fallback.
This changes neither bytes sent nor chunk budgets. RowWriter still validates
raw JSON and preserves whitespace-sensitive, deep, opaque and promoted data.

## Tradeoffs and verification

Unmaterialized bulk replacement now reloads active queries instead of maintaining N individual
aggregate deltas. This trades bounded read transports for lower seed bookkeeping
and retention; final device measurements must judge the net effect, especially
where an unbounded query intentionally returns the whole collection.

The replacement regression first failed on the old two read transports. A full
suite exposed the materialized seed budget and incremental removeAll budgets;
the precise fallback preserves both without weakening their assertions.
Targeted tests then passed, covering duplicate IDs, extras, promoted cleanup,
adapter parity, rollback and caught replacement-validation failures.
A byte-accounting regression first observed
the allocating JSON.stringify call. Tests compare exact bytes including escaped
control characters, quotes, backslashes, UTF-8, lone surrogates, nonfinite numeric
JSON representation and blobs. Final full-suite and device results are recorded
by the Phase 15c report; this ADR does not assert universal parity.
