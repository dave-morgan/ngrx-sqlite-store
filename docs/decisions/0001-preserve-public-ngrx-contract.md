# ADR-0001: Preserve the public NgRx contract

Status: Accepted

## Context
Apps and ecosystem libraries (`@ngrx/effects`, `@ngrx/router-store`, `@ngrx/store-devtools`) depend on what `@ngrx/store` exports and on the classes and tokens it provides through DI. If we replace the store internals, none of that consumer code should need to change.

## Decision
Ship compatible implementations of:
- `Store` (`select`, `selectSignal`, `dispatch`, pipeable use, `addReducer`/`removeReducer`)
- `ActionsSubject`, `ScannedActionsSubject`, and `StateObservable`/`State`
- `ReducerManager`, plus `ReducerObservable` and `ReducerManagerDispatcher`
- `provideStore`, `provideState`, `StoreModule.forRoot`/`forFeature`, and `createFeature`
- `createAction`, `props`, `createActionGroup`, `createReducer`, and `on`
- `createSelector` and `createFeatureSelector`, keeping NgRx memoization semantics
- a `/testing` entry point that stays compatible with `provideMockStore`

The full list is in `../public-api-contract.md`.

`ScannedActionsSubject` emits **after the SQLite transaction commits**.

Users switch by changing imports or with an import path alias.

## Consequences
- Every NgRx major release needs its contract re-verified. `public-api-contract.md` records which version we verified against.
- Reducers are excluded from the contract (ADR-0003).
