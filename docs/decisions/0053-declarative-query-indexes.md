# ADR-0053: Declarative query-field indexes

Status: Accepted. Date: 2026-10-22. Authority: Phase 15c.

## Context

The persisted 50k count query scans entity JSON on relaunch. An expression
index can avoid this scan, but the original compiler binds the JSON path and
wraps the entire equality in COALESCE. SQLite cannot match that expression
to the indexed expression: EXPLAIN reports only `coll=?` access even when a
matching expression index exists.

## Decision

Adapters accept `query: { index: ['done', 'userId'] }`. Declarations are
non-enumerable initial-state metadata and survive classic adapter operations.
Feature registration inspects this metadata before releasing startup actions.
It creates missing persistent indexes, including for previously populated
databases, using CREATE INDEX IF NOT EXISTS. Existing index names are read in
one catalog query; unchanged declarations perform no DDL. Index installation
never runs during reducer execution or selector refresh.

Each index is shared across collections and keys `(coll,
json_extract(data,'$.field'))`, with partial predicate `data != '' AND json_valid(data)`. Promoted
entities therefore remain excluded from JSON evaluation and keep their existing
JS fallback. Opaque non-JSON rows used by low-level writers are also excluded;
selector SQL repeats the partial predicate so SQLite can use the index. Nested
collections in collection extras are inspected without traversing entity payloads.
Field paths accept identifier segments only, at most 128 characters;
adapters declare at most eight fields and a database retains at most 32 indexes.
Names encode every field byte as hexadecimal, avoiding collisions and SQL
identifier interpolation. Rejected declarations cannot inject SQL.

Query compilation emits validated paths as literal SQL expressions. Equality
uses a sargable `json_extract(...) IS ?` plus a separate, two-valued JSON type
guard. Boolean false stays distinct from numeric zero; null includes missing
fields; NOT and ne preserve the existing two-valued predicate semantics. Values
remain bound parameters. EXPLAIN tests require expression-key access, not merely
the collection-key prefix. The existing production compiler serves dev and
production selector transports alike.

Lazy creation was considered and rejected: creating indexes from observed
where clauses makes the first selector a schema-write hot path, adds unpredictable
latency to user actions, and permits changing query traffic to consume index
budget. Declarations make insert cost and startup upgrade work explicit.

## Consequences

Equality counts can use the index rather than scan all collection JSON.
Inserts and updates maintain every declared index, increasing seed work and
file size. No automatic indexes are installed for undeclared fields. Removing a
declaration retains its existing index; explicit database reset or application
migration can remove it. This avoids unexpected schema writes during ordinary
relaunches and preserves compatibility across lazy feature registrations.

Device seed, toggle and relaunch measurements, including index maintenance
cost, are recorded in the phase-15c benchmark report. Unit evidence covers
populated-database upgrade, repeated registration, invalid/oversized declarations,
promoted rows, strict predicates and EXPLAIN expression-key access.
