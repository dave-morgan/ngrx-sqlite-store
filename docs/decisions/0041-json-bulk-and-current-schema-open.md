# ADR-0041: JSON bulk transport and current-schema open

Status: Accepted. Date: 2026-10-22. Authority: Phase 15 parity.

## Context

The initial five-trial benchmark still fails startup and bulk-write parity.
The native plugin loops over scalar bindings in Java and prepares every SQL
statement. A controlled 5k-row, 26-call probe measured scalar transport at
484.3 ms and JSON1 transport at 403 ms. WAL/FULL (7.2 ms), DELETE/FULL
(7.6 ms), and WAL/NORMAL (7.3 ms) commit probes show no useful durability tradeoff.
Current-schema opens also unnecessarily begin, create a table, and commit.

## Decision

For insert groups larger than the existing 999-bind limit, RowWriter transports
rows as one bound JSON array and inserts through `json_each`/`json_extract`.
JSON1 is already required by query selectors. Keep small groups on the existing
scalar path and preserve exact strings, nulls, numeric positions, conflict order,
row caps, and journals. Bound the actual doubly escaped executeSet wire JSON
to ADR-0039's 256 KiB soft limit; one legal oversized row remains allowed alone.
Every SQL mutation remains in RowWriter and every streamed chunk shares one
transaction. The JSON SELECT includes `WHERE 1` to disambiguate UPSERT syntax.

StorageEngine opens by reading the version marker. An already current schema
needs no transaction, DDL or commit. Missing metadata and older versions take
the atomic migration path, which re-reads the version inside the transaction.
Only a specific `no such table: [main.]nss_meta` error permits initialization;
other query errors and invalid/newer versions propagate and close the driver.
The FIFO still serializes concurrent opens and migrations. Reused native
connection recovery remains unchanged.

## Consequences

Bulk operations reduce Java binding and SQL preparation work at the cost of
SQLite JSON parsing and additional wire escaping. Small-operation budgets,
public API, on-disk schema, NgRx compatibility, and durability remain unchanged.
Current-schema startup saves three native bridge calls. Tests verify stored
values, bounded chunks, conflict semantics, rollback, concurrent opens and
narrow error handling; final device measurements determine parity outcomes.
