# ADR-0018: Selector engine, path cache and view state

Status: Accepted (Agent, 2026-10-20). Covers the provisional answers to Q5 and Q8.

## Decisions
1. **Selector functions reuse NgRx.** Our `createSelector`, `createSelectorFactory`, `defaultMemoize`, `resultMemoize` and `createFeatureSelector` call the real NgRx implementations, so memoization semantics are identical by construction. They then attach non-enumerable metadata:
   - `NSS_SOURCE = { path }` on source selectors;
   - `NSS_DEPS = string[] | 'dynamic'` on derived selectors. The value is the union of the inputs' deps, or `'dynamic'` if any input lacks metadata.

   Every selector stays plain-callable on a plain state object, which keeps `MockStore` and unit tests working.
2. **`createFeature`** builds `select<Name>State` as a source at `name`. Each per-property selector is a source at `name/prop` (escaped), so a component that selects `selectItems` loads only `items`.
3. **PathCache.** This is a map from path to `{ value, refcount, version, lastUsed }`.
   - **Overlap.** A path whose ancestor is already loaded is derived from the ancestor and does not trigger a query. Loading an ancestor after a descendant replaces the descendant's entry.
   - **Eviction.** Entries with a refcount of 0 go into an LRU (default 32) and are evicted after that.
4. **Staleness and correctness.**
   - `engine.changes$` emits synchronously inside the commit's queue task. In that same tick, every overlapping cache entry is marked **stale** by bumping the required version.
   - `COMMITTED_CACHE.peek` returns only non-stale values. This stops a later transaction from diffing against a pre-commit value.
5. **Refresh.**
   - The `POST_COMMIT_HOOK` re-reads only the changed paths that overlap *active* entries. When an active entry `todos` sees a change at `todos/items`, only `todos/items` is re-read and spliced into a new `todos` object. Unchanged siblings keep their references.
   - Reads go through `engine.read`, which is queued. The hook awaits them, then bumps the generation and rebuilds the view.
6. **View state.**
   - Selectors are evaluated against a **view state**: a plain frozen object tree containing exactly the loaded paths. It is rebuilt per generation with structural sharing.
   - Unloaded paths are absent for `select` and filled from `initialState` defaults for `selectSignal` (Q5).
   - The view is what `State`/`StateObservable` emit. A whole-store subscription (`store.subscribe`) pins all registered features (Q4).
7. **Dynamic selectors** are foreign ones, such as router-store's, or lambdas. Their dependencies are recorded with a tracking Proxy over the view at the **feature level** (the first segment). A first-time access of an unloaded feature records it, triggers a load, and re-evaluates. Tracking is redone on every evaluation, so a conditional access is picked up.
8. **Emission.**
   - `select()` emits only once all deps are loaded, and then on each generation where the result changed (`distinctUntilChanged`).
   - `selectSignal()` is a `computed` over a generation signal, honouring `equal`.
   - Subscribing increments refcounts; unsubscribing decrements them.

## Consequences
- The memory held is the union of the actively selected paths plus the LRU.
- An effect's `withLatestFrom(store.select(x))` holds a subscription, so `x` stays live and is refreshed before the scanned emission (ADR-0017 §3).
