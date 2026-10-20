# Phase 10 implementation plan

Scope: sections A and B of the approved Phase 10 brief. No harness edits or commits.

- Add failing sql.js tests for query equivalence, cache isolation/lifecycle, effects,
  MockStore, injection, numeric encoding, stable sort ordering and v2 migration.
- Implement query metadata and readers in the primary entry point; propagate query
  dependencies through memoized selectors. Extend PathCache's existing leases,
  invalidation, LRU and post-commit refresh to query results.
- Implement the entity filter compiler and matching JS evaluator in the entity
  entry point. Bind both JSON paths and values. Query promoted rows separately.
- Add sort-key encoding, RowWriter support and migration v3. Keep insertion pos
  independently of key order; backfill unkeyed rows on the first adapter write.
  Classic operations use unsorted NgRx operations followed by a stable key sort.
- Re-run Q1 with the production adapter. Update ADR-0024/0027, the register,
  architecture, contract and open questions with the implemented semantics.
- Run library tests, library build and all spikes; review the final diff for scope.
  Tick Phase 10 in CLAUDE.md only as the final filesystem edit.

## Verification

- 185 library tests pass (`npx.cmd ng test ngrx-sqlite-store --watch=false`).
- Both entry points build (`npx.cmd ng build ngrx-sqlite-store`).
- Strict spike type check passes (`npx.cmd tsc -p projects/ngrx-sqlite-store/spikes/tsconfig.json --noEmit`).
- Full spike suite passes in 119.99 seconds (`npm.cmd run spikes`); Q1 uses the
  real sortKey implementation. Incidental Q2/Q3 report reruns are not retained.
- Independent review findings have regression tests: dynamic query composition,
  non-JSON generic results, array property traversal and final key-type validation.
- Harness has no changes. No commits were created. Existing benchmark work is
  outside this change and was preserved.
