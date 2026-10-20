# ADR-0016: Schema engine ordering and oversized entity encoding

Status: Accepted (Phase 3 brief)

## Context
The schema needs lossless object order, an oversized entity representation, and
explicit policy semantics without changing the approved v1 DDL.

## Decision
- Object children use `pos`, as array children do, to preserve insertion order.
- Ordinary entity data is JSON. An oversized entity uses the empty string as its
  `data` marker (never valid JSON); its value is stored as normal promoted nodes
  under `coll/~2<escaped typed id>`. `~2` cannot begin an escaped object key,
  so entity data cannot collide with extra properties. All such writes record `coll`.
- Strings and chunks contain JSON-encoded text. Chunk boundaries never split a
  surrogate pair; concatenating chunk data reconstructs the encoded string.
- Policy hints use feature-relative escaped paths, with `*` matching one segment
  and `**` matching any remaining segments. Exact matches take precedence.
- Configurable row caps range from 32 bytes (enough for every JSON scalar other
  than strings, which can be chunked) to the hard 1,048,576-byte maximum.
- Feature roots are objects; arrays at feature roots are rejected. Subtree arrays retain array kind.
  Scalar writes retain their scalar kind at every depth.
- Phase 3 recomputes promotion/demotion on changed values, as required by its brief.
  Size memoization assumes immutable state. Invalid JSON values and cycles fail
  with a path before SQL mutation. Non-enumerable entity branding is ignored by JSON.
- The schema migration is opt-in: pass `SCHEMA_MIGRATIONS` through the existing
  StorageEngine `migrations` option (or `STORAGE_ENGINE_OPTIONS`). Phase 2's v1
  default remains unchanged.

## Consequences
No new columns or tables are needed. Entity marker rows must be interpreted by
the schema reader. Reads attach identity metadata and freeze values in dev mode;
callers must preserve references for minimal diffs. No queue operation is nested
inside a transaction, notification, or afterCommit callback.
