# Brief: Phase 4b — Read side (selectors)

Repo `C:\Development\ngrx-sqlite-store`. Read `CLAUDE.md`, `docs/architecture.md` §5–§6, `docs/public-api-contract.md`, and ADR-0002, 0017, and **0018** (the spec). Phase 4a already provides the `SELECTION_ENGINE`, `POST_COMMIT_HOOK`, and `COMMITTED_CACHE` seams, plus `Store`, `State`, the core, and the registry. Implement them and don't restructure 4a.

## Build
1. `lib/selectors/`:
   - our `createSelector`, `createSelectorFactory`, `defaultMemoize`, `resultMemoize`, `createFeatureSelector`, `select` (the pipeable operator, which must accept our selectors and foreign ones), and `createFeature`, with metadata per ADR-0018 §1–2;
   - replace the temporary NgRx re-exports in `public-api.ts`.
   - `createFeature` must keep NgRx's exact typing for `selectXState`, per-prop selectors, `extraSelectors`, and the `name`/`reducer` result. Copy the types from `@ngrx/store` d.ts, or wrap NgRx `createFeature` and post-process its selectors. Wrapping is preferred, because typing stays identical by construction.
2. `lib/selectors/path-cache.ts`: covers ADR-0018 §3–5, including staleness via a **synchronous** `engine.changes$` subscription. Respect the DEADLOCK RULE: never await engine ops inside `changes$`.
3. `lib/selectors/selection-engine.ts` covers ADR-0018 §6–8:
   - `select(mapFn | key strings, props?)`, including the deprecated props form;
   - `selectSignal(selector, { equal })`;
   - the view-state builder with structural sharing;
   - the dynamic tracking proxy;
   - a refcount on subscribe and unsubscribe.
4. Wire up the following:
   - `State`/`StateObservable` emit the view.
   - `store.subscribe` pins every registered feature.
   - `store.materialize(): Promise<object>`, which reads every registered feature and is for debugging.
   - `provideStore` `sqlite.eager` preloads those features in the app initializer and pins them. `sqlite.lruSize` defaults to 32.
5. Use `nss_entity`-backed EntityState values as they are today (round-trip through NodeStore). Entity-specific selectors come in phase 6.

## Tests
- **Memoization parity:** for the same selector graph, recompute counts match the real NgRx store under the same dispatch sequence. Spy on projectors and run both stores, ours on sql.js.
- Selecting `todos/items` loads only that path. Assert on the SQL spy, which must show no full-feature read.
- **Structural sharing:** changing `todos/filter` keeps the `todos.items` reference, so a selector on items doesn't recompute.
- **Staleness:** dispatch A then B back to back, where B's handler does `tx.get` on a path changed by A. B must see A's value even though the cache refresh for A hasn't run yet.
- An effect using `withLatestFrom(store.select(sel))` sees post-commit state (real `@ngrx/effects`).
- `select` doesn't emit before load. `selectSignal` returns the `initialState` default before load and the real value after.
- Dynamic lambda `store.select(s => s.todos.items.length)` loads `todos` and updates.
- `createFeatureSelector` from the **real** `@ngrx/store` used through our store, which is the router-store case.
- Router-store integration: `provideRouterStore()` plus `getRouterSelectors()` from `@ngrx/router-store`, with a navigation in TestBed (`RouterTestingHarness`). `selectUrl` emits the new URL.
- LRU: unsubscribing and resubscribing within the LRU window emits immediately with no query. Beyond the LRU size, entries are evicted.
- `MockStore` from `@ngrx/store/testing`, with `overrideSelector` on our selectors, works in a component test.
- `selectSignal` with `equal`.

## Done when
- Tests and the build pass.
- Update `CLAUDE.md` (tick 4b, which combined with 4a marks Phase 4 and Phase 5 done) and `docs/public-api-contract.md` if anything deviates.
- Record any new decisions in the register and an ADR.
- **No git commit.**
- Return a summary of 15 lines or fewer.

## Addendum
- `select()` on a path that is already loaded and fresh in the PathCache **must emit synchronously on subscribe**, the same way NgRx does, for example with eager or pinned features. Effects that do `withLatestFrom(store.select(x))` straight after `ROOT_EFFECTS_INIT` depend on it.
