# ADR-0030: Session-scoped features; router-store state is not persisted by default

Status: Accepted (Agent, 2026-10-21)

## Context
The phase 9 Android benchmark found that after an app restart, the harness opened on the **last visited route** instead of the initial URL.

The cause is the persisted `router` slice:
- `@ngrx/router-store`'s `StoreRouterConnectingService` compares the store's router URL with the Router's URL.
- When the two differ, it calls `router.navigateByUrl(storeUrl)`. This is the same mechanism that supports devtools time travel.
- With classic `@ngrx/store` the slice is in memory, so a fresh start always has an empty router state.
- With this store the slice survives restarts, so router-store "restores" a stale navigation.

That is an app-behaviour change caused only by swapping the store, which breaks the hard compatibility rule.

The same concern applies to any slice that is session-only by nature: transient UI and in-flight request flags.

## Decision
1. Feature option: `sqlite.features[key].persist?: boolean`, default `true`.
   - When `false`, the feature is **re-seeded from its initial state** each time the store opens. This happens during root/feature registration, before `INIT` and buffered actions, the same ordering as ADR-0017 §7.
   - Within a session it behaves exactly like any other feature: SQLite-backed, transactional, and RAM-light.
2. **Default for router-store:** a feature registered under router-store's default key `router` with a foreign (bridge) reducer defaults to `persist: false`.
   - This is detected by key plus bridge status. The library does not import `@ngrx/router-store`, because it is an optional peer.
   - Apps that want route restoration opt in with `persist: true`.
   - A custom `stateKey` for router-store must be configured explicitly. The docs show `features: { myRouter: { persist: false } }`.
3. Seeding a non-persistent feature records `ChangeSet` entries like any other write. Selectors therefore never observe the stale previous-session value.

## Consequences
- Fresh starts match classic NgRx: routing begins at the URL the app was launched with.
- Session-only slices cost one reset per start, which takes O(batches) statements after ADR-0029.
