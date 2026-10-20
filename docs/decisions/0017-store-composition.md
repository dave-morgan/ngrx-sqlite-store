# ADR-0017: Store composition, dispatch pipeline and feature lifecycle

Status: Accepted (Agent, 2026-10-20)

## Context
Phase 4 has to wire DI so that `@ngrx/effects`, `@ngrx/router-store` and `@ngrx/store-devtools` work unchanged (ADR-0001, ADR-0010). It also has to fix the runtime semantics that the brief leaves open.

## Decisions
1. **Reuse vs reimplement.** `ActionsSubject`, `ScannedActionsSubject` and `ReducerManagerDispatcher` are plain subjects in NgRx 22, so the **NgRx classes themselves are re-exported and provided**. We control *when* `ScannedActionsSubject.next` is called. `Store`, `State`/`StateObservable` and `ReducerManager`/`ReducerObservable` are reimplemented and bound to the original tokens with `useExisting`. `StoreRootModule`/`StoreFeatureModule` are reimplemented and aliased to NgRx's module tokens, because effects injects them optionally.
2. **One transaction per action.** All feature handlers for one action run in a single SQLite transaction, in feature registration order, then in handler order within each feature. A failure in any handler rolls back the whole action (Q13).
3. **Scanned-action ordering.** After `transaction()` resolves (outside the queue task, per the deadlock rule), the core awaits the `PostCommitHook` (selector refresh, phase 4b), then emits on `ScannedActionsSubject`. Emissions are chained so they stay in dispatch order. When an effect reacts to action N, it sees state *at least as new as* N's commit. Later actions may already be applied, which matches NgRx, where effects always read the latest state.
4. **`dispatchAsync(action)`** is an extension. It resolves after the scanned emission and rejects with the reducer error if the transaction rolled back. Plain `dispatch` never throws for reducer errors. It dispatches `nssReducerError({ action, error })` instead.
5. **Calling a tx reducer synchronously** (e.g. by devtools or `combineReducers`) returns `state ?? initialState` unchanged and gives one dev-mode warning. It never throws, because foreign code may call reducers.
6. **Foreign/classic reducers** (no tx brand) are auto-wrapped with `fromSyncReducer`. Their seed state is `reducer(undefined, { type: INIT })`.
7. **Seeding.** A feature gets seeded from its initial state on registration if `nss_meta['feature:<key>:version']` is missing. The initial state comes from `provideStore` `initialState` / `INITIAL_STATE` first, then the reducer's initialState. A version mismatch follows `onVersionMismatch` (`'error'` by default, or `'reseed'`). Registration runs as a write-queue item, *before* any action queued later.
8. **`removeReducer`/`removeFeature` keep persisted data.** The store is persistent, so unregistering only stops handling actions and stops exposing the slice. `store.purgeFeature(key)` deletes the data explicitly.
9. **Meta-reducers** wrap bridge (classic) reducers only. For tx reducers, a meta-reducer is ignored with a single dev warning. `ngrx-sqlite-store` adds an action-level `actionHooks` option and `tx.resetAll()` for reset-on-logout (Q11 provisional).
10. **Runtime checks.** `ACTIVE_RUNTIME_CHECKS` is provided, because router-store reads it. Defaults match NgRx: in dev, `strictActionImmutability` freezes dispatched actions and `strictStateImmutability` is enforced by freezing reads. Opt-in checks: `strictActionSerializability`, `strictActionWithinNgZone`, `strictActionTypeUniqueness`. `strictStateSerializability` is always effectively on, because the schema rejects non-JSON values.

## Consequences
- The ecosystem injects real NgRx subject classes, so instance checks match.
- `removeReducer` semantics differ from NgRx's in-memory behaviour. This is documented in the contract.
