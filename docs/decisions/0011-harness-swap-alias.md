# ADR-0011: Harness swaps implementations through a private `@store` alias

Status: Accepted

## Context
E2E tests must run the same app against classic NgRx and against this package. Aliasing `@ngrx/store` itself would also redirect our library's own imports of the real tokens (ADR-0010).

## Decision
Harness code imports store APIs from `@store` and `@store/entity`. Per-configuration tsconfigs map those aliases either to a thin classic shim over `@ngrx/*` or to `ngrx-sqlite-store`. The `classic` and `sqlite` configurations are Angular build configurations that use `fileReplacements`/tsconfig paths. Reducer files, the accepted migration point, have one implementation per store, selected the same way. Everything else (components, effects, selectors, routing) is shared.

## Consequences
- The only code that differs between the two runs is the shim plus the reducers, which keeps the comparison fair.
- The shared code also serves as living proof of ecosystem compatibility.
