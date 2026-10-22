# ADR-0059: Reuse validated canonical entity JSON during bulk transport

Status: Accepted. Date: 2026-10-22. Authority: Phase 15d.

## Evidence

The diagnostic `android-seed-trace-50000-2026-10-22-phase15d-before.json`
and its CPU profile attribute approximately 80 ms of sampled self time to
EntityTx data serialization and 77 ms to RowWriter jsonInsertBatches.
EntityTx validates immutable state with serializedSize, then JSON.stringify
produces canonical JSON. RowWriter reparses each resulting string to distinguish
valid JSON from opaque low-level values, immediately discarding the parsed tree.
That parse allocates another complete entity tree without changing transport.
These instrumented samples identify a target, not an acceptance result.

## Decision

EntityTx marks its already validated/stringified bulk rows as canonical JSON
through an internal RowWriter write option. RowWriter can omit JSON.parse for
those rows. It still checks each data/sortkey value against the hard UTF-8 row
cap and scans JSON nesting before embedding it: data beyond depth 900 retains
the string envelope needed to avoid adding JSON1 parser depth.

Unmarked RowWriter writes keep their existing validity check and opaque or
whitespace-preserving string envelopes. SQL, JSON payload text, row order,
chunk byte accounting, transaction boundaries and change tracking are unchanged.
This hint is internal to the schema/reducer implementation, with no public
adapter or store option. It does not suppress serializability validation.

## Verification

Regressions compare hinted and unhinted SQL/bindings byte-for-byte and persisted
values, including deep JSON, escaping and Unicode; direct opaque/whitespace
writes retain their existing tests. EntityTx bulk replacement verifies that
generated entity strings are not parsed again. Row cap checks still reject
hinted oversized rows before writes. Final device measurements determine the
end-to-end effect; this ADR does not claim the sampled time is fully recovered.
