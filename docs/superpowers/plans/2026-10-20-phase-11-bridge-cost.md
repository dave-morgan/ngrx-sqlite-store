# Phase 11 bridge cost implementation plan

**Goal:** Meet every statement budget in the approved phase 11 brief without changing state semantics, public APIs, schema, or harness files.

**Architecture:** Keep RowWriter as the mutation boundary. Batch independent row mutations, retain single-row UPDATEs, combine subtree transport reads, and reuse fresh transaction/committed metadata. Preserve promoted values, immutable diff identity, ChangeSets and post-commit ordering.

- [x] Extend `src/lib/entity/bridge-cost.spec.ts` with every brief operation, three scalar extras, cold and subscribed reads, state assertions and SQL traces; record failing baseline.
- [x] In `schema/row-writer.ts` and `schema/node-writer.ts`, batch leaf/entity deletes and changed entity rows while retaining minimal single-row writes and all cap checks.
- [x] In `schema/node-reader.ts`, transport nodes/entities/chunks in one query with existing ordering and metadata assembly.
- [x] In `reducer/store-tx.ts` and `reducer/entity-tx.ts`, reuse fresh row/container metadata and avoid redundant entity reads; reset by prefix replacement and invalidate identities.
- [x] In `entity/src/entity-adapter.ts`, batch independent same-ID unsorted maps while preserving sequential duplicate/id-collision semantics.
- [x] Add a bridge-cost spike and before/after report, and document internal design in an ADR and register row.
- [x] Run focused and full library tests, both required builds, spike type checking and `npm run spikes`; inspect diff for harness edits and unintended changes.
- [x] As the final workspace action, tick Phase 11 in CLAUDE.md. Do not commit.
