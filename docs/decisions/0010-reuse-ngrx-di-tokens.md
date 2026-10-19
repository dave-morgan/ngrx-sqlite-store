# ADR-0010: Provide implementations under the original @ngrx/store DI tokens

Status: Accepted (conservative choice; reversible)

## Context
Prebuilt ecosystem packages import tokens directly from `@ngrx/store`. This was verified against NgRx 22.0.1 FESM bundles:
- effects: `ScannedActionsSubject`, `Store`, `ROOT_STORE_PROVIDER`, `FEATURE_STATE_PROVIDER`, `createAction`
- router-store: `select`, `createSelector`, `createFeatureSelector`, `ACTIVE_RUNTIME_CHECKS`, `isNgrxMockEnvironment`, `createAction`, `props`
- store-devtools: `ActionsSubject`, `StateObservable`, `ReducerManagerDispatcher`, `INIT`, `UPDATE`, `INITIAL_STATE`
- entity: `createSelector`

Those imports resolve to the real package in `node_modules`, whatever path alias the app uses.

## Decision
`@ngrx/store` is a **peer dependency**. Our providers bind our implementations both to the *original* tokens (`{ provide: Store, useExisting: SqliteStore }` and similar) and to our own exported classes. Pure functions (`createAction`, `props`, etc.) are re-exported.

## Consequences
- The ecosystem works without being rebuilt or patched.
- We remain coupled to NgRx's token set, which must be re-verified each major release.
- Aliasing `@ngrx/store` to this package needs care, because our own code imports `@ngrx/store` (Q15).
