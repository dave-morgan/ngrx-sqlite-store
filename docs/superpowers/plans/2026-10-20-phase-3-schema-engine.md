# Phase 3 schema engine implementation plan

Goal: Implement the approved `docs/briefs/phase-3-schema-engine.md` on Phase 2.
Architecture: Keep StorageEngine and its FIFO untouched. All schema mutation goes
through RowWriter with the supplied executor; readers attach WeakMap metadata.
Tech stack: TypeScript, Angular library, Vitest, sql.js, npm on Windows.

- [x] Add failing schema integration and property tests using StorageEngine with
  `{ migrations: SCHEMA_MIGRATIONS }`; run the library test command to confirm red.
- [x] Implement kinds, UTF-8 sizing, immutable size memo, validation, policy,
  branding, metadata, ids, positions, and migration under `src/lib/schema/`.
- [x] Implement capped/batched RowWriter and range/CTE reconstruction, then full
  write/delete and NodeStore. Verify round trips, caps, paths, and invalid input.
- [x] Implement reference diffing and LIS ordering shared by arrays/entities.
  Verify SQL minimality, change paths, order, and renormalisation with tests.
- [x] Review against every brief requirement, update architecture/CLAUDE/register,
  run `npx ng test ngrx-sqlite-store --watch=false` and
  `npx ng build ngrx-sqlite-store` until both pass, then stage and commit with the
  requested Conventional Commit and coauthor trailer.

Validation: 54 tests passed across 7 files; library build passed. An independent
code review found and verified fixes for large-dictionary position scanning,
entity container metadata, root array validation, and overflow encoding docs.
