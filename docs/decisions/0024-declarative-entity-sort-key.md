# ADR-0024: Optional declarative entity sort keys

Status: Proposed (phase 8). Q1 remains Provisional pending API semantics and Android validation.

## Context

[Q1 measurements](../spikes/q1.md) compare the actual ADR-0019 adapter against a reserved-column sort-key prototype and sorting in JS on every read, at 1k, 10k and 50k entities. Current binary search uses indexed `ORDER BY pos LIMIT 1 OFFSET k`: logarithmic probe count does not imply logarithmic rows scanned. The prototype avoids these probes while retaining indexed ordered pages. JS read sorting has cheap mutations but materializes the entire collection even for the first page.

## Proposed decision

Add an optional `sortKey(entity): string | number` option to `createEntityAdapter` in a future implementation. Keep the current `sortComparer` route for arbitrary JS ordering. Do not implement the option, new index, or migration in phase 8.

The future design must specify mutually exclusive options or explicit precedence when both are supplied, stable tie ordering compatible with classic-form operations, missing/invalid keys, updates and entity-id changes. Numeric keys require an order-preserving encoding or a typed schema: the reserved `sortkey TEXT` column otherwise sorts numbers lexically. The spike uses nonnegative fixed-width decimal keys solely to establish the performance opportunity. Specify signed, fractional, extreme and mixed-type behavior before adoption. String collation must be explicit; SQL binary ordering does not reproduce arbitrary locale comparers.

Store each key with the entity and use an index on `(coll, sortkey, id)` for full/page reads. All writes must continue through RowWriter and the row cap. The prototype uses the real unsorted adapter plus a second key update, deliberately including extra SQL and index costs; a production implementation may combine the write but must retain validation and ChangeSet/cache semantics. Index creation/backfill requires a versioned migration and cannot silently reorder existing collections.

## Consequences

Q1 has a measured direction, with absolute times and statement counts in the report. Sort keys strongly improve sorted single-mutation scaling on this Node/sql.js workload; bulk maintenance and semantics still matter. Retain the existing API and schema for now, and validate on Android in phase 9. This proposal does not change integration with NgRx libraries or the current arbitrary-comparer contract.
