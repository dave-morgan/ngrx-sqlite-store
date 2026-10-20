# ADR-0027: SQL-backed query selectors

Status: Accepted (Agent, 2026-10-20). Resolves Q16.

## Context
In the harness, an always-mounted header shows "N open" via `createSelector(selectAll, all => all.filter(t => !t.done).length)`. Any selector derived from `selectAll`/`selectEntities` makes the selection engine load the **entire** entity collection into JS memory and keep it pinned for as long as the selector is subscribed. The same happens with list pages that filter or page in JS. As a result, the RAM goal is only met for screens that never aggregate over a large collection. This was found while designing the phase 9 Android benchmark.

Memoized JS projections cannot express "count where done = false" without materialising every row. The aggregation has to move into SQLite.

## Decision
1. **Query sources.** A query source is a new kind of source alongside path sources (ADR-0018). It is identified by `(collectionPath, queryKey)`. Its value comes from running an **async SQL query** against the committed DB through `engine.read`.
   - **Invalidation:** any ChangeSet that overlaps `collectionPath` triggers a re-run.
   - **Refcount and LRU:** same as path sources.
   - **Emission:** same sync-if-fresh rules as path sources.
   - **Signal default:** `selectSignal` falls back to the `initial` value given in the query definition.
2. **Entity query API** in `ngrx-sqlite-store/entity`, as `adapter.query(selectState?)`:
   - `count(where?)` → `number`
   - `page({ where?, offset, limit })` → `T[]`, in collection order
   - `ids(where?)` → `Id[]`
   - `exists(where?)` → `boolean`

   `where` is a small declarative filter object:
   - leaf form: `{ field: value }` or `{ field: { eq | ne | lt | lte | gt | gte | in | like: v } }`
   - combinators: `and` / `or` / `not`
   - `field` is a top-level entity property or a dotted path. It compiles to `json_extract(data, '$.<path>')` with bound parameters only, and it is never interpolated into SQL text.
   - Entities over the size limit, stored as promoted rows (ADR-0016 marker), cannot be matched by `where`. When a query hits one, it falls back to JS evaluation for that row and logs a single warning in dev mode.
3. **Generic escape hatch.** `createQuerySelector({ path, key, initial }, async (q: SqlReader) => T)` covers arbitrary read-only SQL against the store's tables. It is for advanced use: the user owns the SQL, and must treat the schema as an internal format (ADR-0015).
4. **Classic compatibility.** Every query selector is also a normal memoized selector, so `MockStore`, plain unit tests, and classic-store parity all keep working. When called synchronously on a plain state object, it evaluates the same `where` in JS over `state.ids`/`state.entities`. Classic `@ngrx/store` apps can therefore use it too, by importing it from the same entry point.
5. **Recommended pattern.** Aggregates, counts and pages over large collections should use query selectors. Using `selectAll` keeps its meaning of materialising the collection.

## Consequences
- An "open count" costs one indexed `COUNT(*)` with `json_extract`. No rows are held in memory.
- `json_extract` cannot use an index without an expression index. The spike in phase 10 measures this cost; ADR-0024's sort key or generated columns could follow later.
- Selector results computed in SQL never share references with path-source values. Memoization still holds, because a result is replaced only when the query re-runs and the value changed (deep-equal on primitives and arrays of ids).

## Phase 10 implementation

Implemented with a shared PathCache LRU and post-commit refresh. Both field paths
and values are bound parameters after field validation. Scalar/null, accessor,
generic fallback and promoted-row semantics are specified in [ADR-0028](0028-query-filter-and-classic-order-semantics.md).
The entity sort-key mode is accepted in [ADR-0024](0024-declarative-entity-sort-key.md).
