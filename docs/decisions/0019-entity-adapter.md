# ADR-0019: Entity adapter API and write-time sort ordering

Status: Accepted (Agent, 2026-10-20). Resolves Q1 provisionally, pending the phase 8 benchmark.

## Context
Entity is folded into the store (ADR-0005) and is the one package allowed to diverge from NgRx. Reducers in the tx style need adapter operations that compile to SQL. `onState` handlers and bridge reducers still need the classic pure operations. A `sortComparer` is a JS function (Q1).

## Decisions
1. **Entry point.** `ngrx-sqlite-store/entity` exports `createEntityAdapter`, `EntityState`, `EntityAdapter`, `Dictionary`, `Update`, `Predicate`, `EntityMap`, `EntityMapOne`, `IdSelector`, and `Comparer`.
2. **Dual-form operations, one adapter.** Each operation is overloaded on its first argument:
   - **Classic form:** `adapter.addOne(entity, state) => state`. This is pure and byte-for-byte NgRx-compatible. Inside it delegates to the real `@ngrx/entity` adapter built with the same options.
   - **Tx form:** `adapter.addOne(tx, entity): Promise<void>` operates on the entity collection at the feature root. For nested collections, use `adapter.at(tx, 'path').addOne(entity)`.
   - The form is chosen by checking for the `StoreTx` brand on the first argument.
3. **Tx operations compile to SQL** on `nss_entity` through a new low-level `tx.entities(path)` API in StoreTx:
   - `addOne/addMany`: `INSERT`, which ignores duplicates the same way NgRx does.
   - `setOne/setMany/upsertOne/upsertMany`: `INSERT ... ON CONFLICT(coll,id) DO UPDATE`. Upsert merges the changes into the existing row, as NgRx does.
   - `setAll`: delete the collection rows, then do a batch insert.
   - `updateOne/updateMany`: read the rows, merge, and write. An id change is handled the way NgRx handles it, through `selectId`.
   - `removeOne/removeMany(ids)`: `DELETE ... WHERE id IN (...)`.
   - `removeMany(predicate)`, `map`, `mapOne`: stream the rows in pages of 500, apply the JS function, and write the changes.
   - `removeAll`: delete the collection.

   Every write goes through `RowWriter` (the 1 MB cap, with promotion through the ADR-0016 marker), records the collection path in the `ChangeSet`, and invalidates that path in the tx identity cache.
4. **`sortComparer` (Q1): ordering is decided at write time.**
   - **Without a comparer**, `pos` follows insertion order, exactly matching NgRx.
   - **With a comparer**, an inserted or re-sorted entity gets its `pos` from a binary search over the collection's ordered rows. That costs O(log n) single-row `ORDER BY pos LIMIT 1 OFFSET k` probes against the `nss_entity_order` index, after which `between()` is used.
   - Batch operations sort the batch in JS first. The stored order is therefore always the sorted order, so reads never sort in JS and `state.ids` is sorted just as it is in NgRx.
   - `updateOne` repositions an entity only if the comparator result against its neighbours changed.
   - The reserved `sortkey` column stays unused. The phase 8 spike will benchmark this approach against a declarative sort key.
5. **Selectors.** `getSelectors(selectState?)` returns `selectIds`, `selectEntities`, `selectAll`, `selectTotal`, built with our `createSelector`, so they are plain-callable and carry dependency metadata. Without `selectState`, they are relative selectors over an EntityState input, as in NgRx.
6. **`getInitialState(extra?)`** returns a branded EntityState (`NSS_ENTITY_BRAND`), so the schema stores it in `nss_entity`.

## Consequences
- Migrating tx reducers is mechanical: `adapter.addOne(x, state)` becomes `await adapter.addOne(tx, x)`.
- Sorted inserts cost a handful of indexed queries. Large sorted bulk loads should use `setAll`, which does a single sort plus a batch insert.
