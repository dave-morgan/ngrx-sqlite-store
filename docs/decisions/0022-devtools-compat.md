# ADR-0022: `@ngrx/store-devtools` compatibility mode

Status: Accepted (Agent, 2026-10-20). Resolves Q4 for devtools.

## Context
Source of `StoreDevtools` in NgRx 22.0.1 (`fesm2022/ngrx-store-devtools.mjs`, constructor):
- `liftedAction$` is built from `ActionsSubject` (skip 1), the extension's actions, and `ReducerManagerDispatcher`.
- `liftedReducer$` is `ReducerObservable.pipe(map(liftReducer))`. Every action is reduced **synchronously in memory** with the latest combined reducer.
- For every `PERFORM_ACTION` it calls **`scannedActions.next(action)` itself**. This happens immediately, before our transaction commits.
- It overrides `StateObservable` with its own computed state.

If nothing is done, adding `provideStoreDevtools()` to an app using this store would:
1. emit every action twice on `ScannedActionsSubject`, so every effect runs twice, and the first run sees pre-commit state;
2. display `INITIAL_STATE` forever, because our compat reducer returns its input unchanged;
3. let `StateObservable` consumers read devtools' stale state.

The hard rule (stay compatible with the NgRx libraries) requires that adding devtools never changes app behaviour.

## Decisions
1. **Guarded scanned subject.**
   - `provideStore` provides `ScannedActionsSubject` as `NssScannedActionsSubject extends ScannedActionsSubject`.
   - Its public `next()` is a **no-op**. A dev-mode debug log notes when a foreign caller such as devtools tries to emit.
   - The core emits through an internal symbol method, `[NSS_EMIT](action)`, which calls `super.next`.
   - Effects therefore see each action exactly once, post-commit, with or without devtools.
2. **Display-only state.**
   - The reducer that `ReducerManager` emits (the "compat reducer") ignores its arguments when called synchronously. It returns the **current committed view state**: the loaded paths as of the latest finished refresh.
   - Devtools' state for an action therefore shows the committed view as it stands when devtools processes the action. That is usually *one action behind*, and accurate for the action log.
3. **Our services never inject `StateObservable`.**
   - Our `Store`, the core, and the selection engine reference our `State` class directly. Devtools overriding `StateObservable` therefore cannot affect app state.
   - Third-party code that injects `StateObservable` sees devtools' display state. This is identical to NgRx: with devtools installed, NgRx also routes `StateObservable` through devtools.
4. **Unsupported features.**
   - Time travel, jump, skip, commit, import, and "dispatch from monitor" do not alter the SQLite store.
   - Lifted actions arriving through `ReducerManagerDispatcher` from the extension are ignored by the core.
   - This is a documented limitation in `public-api-contract.md` §4.

## Consequences
- Adding or removing devtools never changes app behaviour, which is verified by phase 7 tests.
- The devtools timeline is debug-grade and may lag by one action. This is acceptable because devtools is a dev-only tool.
- A future option is a dedicated monitor that reads `nss_*` tables directly.
