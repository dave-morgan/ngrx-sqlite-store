# ADR-0043: Raw JSON bulk cells and shared non-update field sets

Status: Accepted. Date: 2026-10-22. Authority: Phase 15 trace.

## Context

The before 50k seed trace (`android-seed-trace-before-50000-2026-10-22.json`) attributes
5,139 ms and 12.53 MB to 54 executeSet calls, versus 85 ms to JSON batch
construction. JSON entity data is escaped once inside the row JSON and again
inside the native string binding. Garbage collection consumes 465 ms and
per-entity journal recording approximately 300 ms.

## Decision

In entity bulk JSON transport, carry valid raw entity JSON inside a `{j:...}`
cell and extract JSON text with SQLite's `->` operator. Keep the promoted empty
data sentinel as `{}` and opaque or non-roundtripping data in `{s:...}`.
Validate raw input JSON and preserve original data text, including primitive
types, exponent spellings and escapes. Small scalar writes and generic node
or chunk bulk writes retain their prior encoding. The actual doubly encoded
wire JSON remains bounded by ADR-0039 and all row caps remain in RowWriter.

Only entity UPDATE journals need changed-field sets for query invalidation.
INSERT, DELETE and REORDER records share one empty readonly set, retaining
their previous/next values, kind and coalescing semantics. UPDATE records retain
their exact changed fields. No public API, disk schema, transaction, durability
or NgRx compatibility changes.

## Consequences

Bulk entity payloads avoid a redundant JSON escaping layer. Trace and final
device statistics assess the benefit; tests cover exact lexical text, opaque
fallback, sentinel, conflicts, rollback and query refresh behavior. Shared empty
sets avoid field serialization and per-entity set allocation on bulk insert.

SQLite JSON1 rejects nesting beyond 1,000 levels ([compatibility documentation](https://www.sqlite.org/json1.html#compatibility)).
Raw embedding adds transport nesting, so data deeper than 900 levels uses the
lossless string envelope. This conservative encoding threshold does not limit
accepted entity depth. A 1,000-level valid JSON regression first reproduced
`malformed JSON`; string transport retains its exact data text.

## Repeated device diagnostic

The final trace (`android-seed-trace-50000-2026-10-22.json`) reduced the measured
seed reduction from 7,429 to 5,591 ms. ExecuteSet transport fell from 12,527,529
to 10,404,954 bytes and 54 to 46 calls, with time in executeSet falling from
5,140 to 3,640 ms. Seed generation was 59 ms. The traced wall time includes
instrumentation and reset work; these diagnostics support the optimization but
are not substituted for the final five-trial acceptance observations.
