# ADR-0036: Whole-store subscriptions see the loaded-path view by default

Status: Accepted (Agent, 2026-10-21). Amends ADR-0018 §6, under which a whole-store subscription pinned every feature. Settles Q4 for router-store.

## Context
A device heap snapshot showed the entire 50k-entity `todos` collection staying in memory. Every mounted selector was a query selector or a small path, so none of them needed it.

The root cause is `@ngrx/router-store`. Its `StoreRouterConnectingService` subscribes to the **whole store** three times (`withLatestFrom(this.store)`, among others). It uses that whole state to:
- populate `storeState` in the `ROUTER_CANCEL` and `ROUTER_ERROR` payloads;
- drive the comparison in `navigateIfNeeded`.

Under ADR-0018 §6, a whole-store subscription pinned **all** registered features. Nearly every NgRx app uses router-store, so this defeated the RAM goal everywhere.

## Decision
1. By default, whole-store subscriptions emit the **loaded-path view**: every feature or path that some other source currently has loaded, with structural sharing. This covers `store.subscribe`, `store.pipe(...)` without a selector, `withLatestFrom(store)`, and `State`/`StateObservable`. They do not force-load anything. This is the "lazy/partial view" option from Q4.
2. Full state remains available on request:
   - `await store.materialize()`, for debug use and one-off exports;
   - `sqlite.eager: [...]`, for features that should always be resident.
3. A new option, `sqlite.wholeStore: 'loaded' | 'pin-all'`, defaults to `'loaded'`. Choose `'pin-all'` to keep the ADR-0018 behaviour for apps that rely on complete whole-state snapshots.

## Consequences
- Router-store navigation, the router actions, and `getRouterSelectors` work unchanged. The `router` slice is always loaded while router-store is active, because router-store selects it.
- `ROUTER_CANCEL.payload.storeState` and `ROUTER_ERROR.payload.storeState` contain **loaded slices only**. This is a documented divergence: those fields are rarely consumed, and `'pin-all'` restores the full snapshot.
- Third-party code that reads the whole state sees only the loaded slices. `public-api-contract.md` §1 (`Store`/`State`) and §4 (router-store row) say so.

## Amendment (2026-10-21): router slice preloaded automatically
`@ngrx/router-store` reads its slice through its own pipeable `select()`, so our selection engine never sees a path lease for it. To keep router-store working without any configuration:
- A feature registered under `router` with a bridge/foreign reducer is **always loaded and pinned**. Detection is the same as ADR-0030 (key plus bridge status), and the slice is small.
- Apps using a custom router `stateKey` add it to `sqlite.eager`.
- `wholeStore: 'loaded'` still never loads anything implicitly. The router slice is already loaded because of this pin.
