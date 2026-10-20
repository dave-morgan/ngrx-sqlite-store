# Brief: Phase 7 — Ecosystem compatibility

Repo: `C:\Development\ngrx-sqlite-store`. Read these first:
- `CLAUDE.md`
- `docs/public-api-contract.md` §4–5
- ADR-0017, ADR-0018, ADR-0020, and **ADR-0022**. ADR-0022 is the spec for the devtools part of this phase.

Phases 2 through 6 are complete.

The hard rule is that **adding real `@ngrx/effects`, `@ngrx/router-store` or `@ngrx/store-devtools` must never change app behaviour**, compared with the same app on classic `@ngrx/store`.

## Build
1. Implement ADR-0022:
   - `NssScannedActionsSubject` with the guarded `next`;
   - the internal emit symbol;
   - the compat reducer returning the committed view;
   - the core ignoring lifted actions from the extension;
   - an audit confirming no library service injects `StateObservable`.
2. Create a contract test suite at `projects/ngrx-sqlite-store/src/lib/compat/*.spec.ts`. Each scenario that the brief marks **(parity)** must run **twice**: once on the real `@ngrx/store` (classic `createReducer`) and once on ours (equivalent tx reducers on `SqlJsDriver`). Assert identical observable outputs: the action sequences seen by effects, selector emissions, and final state.
   - **Effects (parity):**
     - class-based effects, functional effects, and `dispatch: false` effects;
     - `ofType` with multiple creators;
     - `withLatestFrom(store.select)` and `concatLatestFrom`, if `@ngrx/operators` is installed (otherwise skip and note it);
     - `ROOT_EFFECTS_INIT` ordering;
     - an effect error that is resubscribed by `defaultEffectsErrorHandler`;
     - an effect that dispatches several actions;
     - a long-running chain of more than 50 actions, checking that the order is preserved.
   - **Effects on lazy features:** route-level `providers: [provideState(feature), provideEffects(...)]` with a navigation through `Router`.
   - **NgModule style:** `StoreModule.forRoot`, `StoreModule.forFeature`, `EffectsModule.forRoot`, `EffectsModule.forFeature`.
   - **Router-store (parity):**
     - `provideRouterStore()` with the default serializer, and also with `RouterState.Full` plus a custom JSON-safe serializer;
     - `NavigationActionTiming.PreActivation` and `NavigationActionTiming.PostActivation`;
     - `getRouterSelectors` (`selectUrl`, `selectRouteParam`, `selectQueryParam`);
     - canceled navigation through a guard returning false, producing `ROUTER_CANCEL`;
     - navigation error producing `ROUTER_ERROR`.
   - **Devtools:** `provideStoreDevtools()` with a fake `REDUX_DEVTOOLS_EXTENSION`, i.e. an object with `connect()` returning `{ subscribe, unsubscribe, send, init, error }`. Check that:
     - each action reaches effects **exactly once and post-commit**, and the same counts appear with and without devtools;
     - the extension receives the actions;
     - app state is unaffected by a devtools `JUMP_TO_STATE` message;
     - `store.select` output is identical with and without devtools.
   - **Mock store:** `provideMockStore` with our selectors and `createFeature` selectors; `overrideSelector`; `setState`; `MockStore.scannedActions$`.
   - **Runtime checks:** `strictActionTypeUniqueness` detects a duplicate; `strictActionSerializability` detects a function in an action.
3. Update `docs/public-api-contract.md` §4 with the verified status of each ecosystem package, plus the devtools limitations. Mark Q4 resolved, pointing to ADR-0022. Add a register row.

## Done when
- Library tests and build pass.
- `npx ng build harness -c development,sqlite` passes.
- `CLAUDE.md` is updated.
- **No git commit.**
- You return a summary of 15 lines or fewer, including any parity mismatches you found and how each one was resolved, or an explanation of why it is accepted.
