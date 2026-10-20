# ADR-0015: On-disk schema v1 is generic and path-keyed

Status: Accepted (user decision, 2026-10-20)

## Decision
Use the schema in `architecture.md` §4.1: `nss_meta`, `nss_node` (path PK, `WITHOUT ROWID`, adjacency via `parent`, `kind` tag, fractional `pos`), `nss_entity` (`(coll, id)` PK, `pos`, reserved `sortkey`), and `nss_chunk`. It is shared by all features, so registering a feature never runs DDL.

## Consequences
- Migrations between store versions are data-only, plus internal versioned DDL migrations recorded in `nss_meta.schema_version`.
- All features share one set of indexes, and per-feature drop is a path-prefix delete.
- This format is now a compatibility commitment. Changing it requires a versioned internal migration.
