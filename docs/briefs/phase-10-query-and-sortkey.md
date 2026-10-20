# Brief: Phase 10 — Query selectors (ADR-0027) and the entity sort key (ADR-0024)

Repo: `C:\Development\ngrx-sqlite-store`. Before writing code, read `CLAUDE.md`, ADR-0018, ADR-0019, ADR-0024, ADR-0027, and `docs/spikes/q1.md`. Phases 1–8 are already committed.

## A. Query selectors (ADR-0027, Accepted)
1. **Query sources in the selection engine and PathCache.** Each query source is keyed by `(collectionPath, queryKey)`.
   - Invalidate it when a ChangeSet overlaps the collection path, and re-run it through `engine.read`. Keep the deadlock rule: re-runs happen in the post-commit hook, outside the queue task.
   - Refcount and LRU behave exactly as they do for path sources.
   - When the source is fresh, emit synchronously.
   - `selectSignal` falls back to the source's `initial` value until the first result arrives.
   - Before scanned emission, refresh query sources the same way path sources are refreshed, so `withLatestFrom(store.select(countSelector))` inside an effect sees the post-commit count.
2. **`adapter.query(selectState?)`** returns `{ count(where?), page({ where?, offset, limit }), ids(where?), exists(where?) }`. Each one is a memoized selector carrying query-source metadata and also works when called directly on plain state, by evaluating `where` in JS (ADR-0027 §4).
   - Compile `where` into parameterised SQL using `json_extract`. Field paths must be validated against `^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$`; never interpolate a value into the SQL string.
   - Rows marked as promoted (oversized) fall back to JS evaluation.
3. **`createQuerySelector({ path, key, initial }, reader)`**: the generic escape hatch.
4. **Tests.**
   - **JS-vs-SQL equivalence**, the most important: for randomized `where` trees over random entities, SQL results must equal JS evaluation for `count`/`ids`/`page`, with and without a sortComparer or sortKey.
   - Invalidation after each adapter op.
   - Memory test: subscribe only to `count`, and assert the entity collection path is never read. Use a SQL spy and check that the PathCache holds no entities.
   - Effect timing parity with `withLatestFrom`.
   - MockStore `overrideSelector` works on query selectors.
   - Injection safety: a malicious field name is rejected, and a malicious value is bound as a parameter.

## B. Entity sort key (ADR-0024: make it Accepted and specify the open points)
1. Add an optional `createEntityAdapter({ sortKey })` option, typed `(e) => string | number`.
   - Supplying both `sortKey` and `sortComparer` is a dev-mode error.
   - Ties break by insertion order (pos). This must match the classic form, which sorts by key and then by original order.
2. **Order-preserving encoding.**
   - Strings: binary (UTF-8 code-point) order. Document that this is not locale order.
   - Numbers, including negatives, fractions, and ±Infinity: a fixed-width lexicographic encoding, such as an IEEE-754 bit flip rendered as hex. NaN is rejected.
   - A collection must not mix strings and numbers; reject it in dev mode.
3. **Schema.** Internal migration v3 adds the `nss_entity_sortkey` index on `(coll, sortkey, pos)`. Collections that already exist keep their stored order: the new mode only applies to adapters created with `sortKey`, and those collections get their `sortkey` values backfilled the first time they are written.
4. **Reads.** Ordered reads use `ORDER BY sortkey, pos` for sortKey collections. `ids`/`selectAll`/`page` must stay consistent across the classic and tx forms.
5. **Tests.**
   - Parity property tests against the real `@ngrx/entity`, using an equivalent `sortComparer` derived from the key and stable ties.
   - Encoding round-trip and ordering property tests.
   - Migration test on a v2 DB.
   - Update `docs/spikes/q1.md` with a re-run that uses the real implementation.

## C. Harness — the orchestrator does this; do NOT edit `projects/harness`
The orchestrator will switch the header's open count to `adapter.query().count({ done: false })` in both implementations.

## Done when
- Library tests and the build pass, and `npm run spikes` still runs.
- Docs are updated: architecture §5, contract §3, open-questions (Q1 resolved via ADR-0024; Q16 resolved via ADR-0027), and the register.
- Tick Phase 10 in `CLAUDE.md` as the very last step.
- **No git commit.**
- Return a summary of 15 lines or fewer.
