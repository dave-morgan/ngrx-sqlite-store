# Brief: Phase 6 — Entity primitive and `/entity` entry point

Repo: `C:\Development\ngrx-sqlite-store`. Before starting, read `CLAUDE.md`, ADR-0005, ADR-0016 and **ADR-0019** (the spec), and `docs/public-api-contract.md` §3.

Phases 2–5 already exist:
- the schema engine, with `nss_entity` and the entity brand;
- `StoreTx` and the core;
- selectors with dependency metadata.

## Build
1. **Secondary entry point `projects/ngrx-sqlite-store/entity`**
   - Add `ng-package.json` and `src/public-api.ts`.
   - Make sure the `ngrx-sqlite-store/entity` import resolves for the library build, and inside library tests that use relative imports.
   - In root `tsconfig.json` paths, add `"ngrx-sqlite-store/entity": ["./dist/ngrx-sqlite-store/entity"]`.
2. **`tx.entities(path)` low-level API** on `StoreTx` (`lib/reducer/entity-tx.ts`)
   - Methods: `get(id)`, `getMany(ids)`, `has(id)`, `count()`, `ids()`, `page(offset, limit)`, `insert(rows, {pos})`, `upsert(rows)`, `update(id, entity)`, `remove(ids)`, `clear()`, `positionFor(entity, comparer)`.
   - `positionFor` does the binary search via `LIMIT 1 OFFSET`, as described in ADR-0019 §4.
   - Reuse the RowWriter, typed ids, oversized-entity marker and positions helpers from the schema. **Never** write rows with raw SQL that bypasses the cap.
   - Record the collection path in the `ChangeSet`.
   - Invalidate the tx identity cache for the collection path and its ancestors.
3. **`createEntityAdapter`**
   - Implement the dual-form operations (ADR-0019 §2–4). The classic form delegates to the real `@ngrx/entity` adapter.
   - Implement `getSelectors` (§5) and the branded `getInitialState` (§6).
   - Keep the `@ngrx/entity` typings for the classic overloads by copying them from `node_modules/@ngrx/entity/types/ngrx-entity.d.ts`.
   - Add tx overloads with `StoreTx` as the first parameter.
4. **Docs.** Update `public-api-contract.md` §3 with the final signatures. Mark Q1 provisionally resolved in `open-questions.md` and add a register row for ADR-0019.

## Tests
- **Parity property test, the most important one.** Take random sequences of 200 adapter operations covering all ops, with a sortComparer and without, string ids and numeric ids. Apply them through:
  - a tx reducer on our store (sql.js), and
  - the real `@ngrx/entity` on a plain object.

  After each step, `tx.get('')` and the final selector outputs (`selectAll`, `selectIds`, `selectEntities`, `selectTotal`) must deep-equal the NgRx state, **including `ids` order**.
- **SQL minimality** (via the spy executor):
  - `updateOne` on an unsorted collection is one read plus one UPDATE;
  - `addOne` on a sorted collection is O(log n) probes plus one INSERT;
  - `removeOne` is one DELETE.
- A 2 MB entity round-trips through promotion.
- Classic form works unchanged inside `onState` handlers and in plain functions.
- Nested collections via `adapter.at(tx, 'items')`.
- `selectTotal` stays correct after `removeMany(predicate)`.

## Done when
- Tests and the library build pass, including the secondary entry point.
- Update `CLAUDE.md` and tick phase 6.
- **No git commit.**
- Return a summary of 15 lines or fewer.
