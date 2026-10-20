# Phase 4b implementation plan

Implement the approved brief and ADR-0018 in the current workspace. Do not change
the harness or commit. Execute inline without interactive approval, as requested.

- [x] Add sql.js selector contract tests; run them against the phase 4a seams and
  confirm missing-selection failures.
- [x] Wrap NgRx selector helpers with non-enumerable source/dependency metadata,
  preserving NgRx overloads and decorating createFeature before extraSelectors runs.
- [x] Implement PathCache: synchronous commit invalidation, overlapping paths,
  active partial refresh, structural sharing, reference counting and inactive LRU.
- [x] Implement selection subscriptions, dynamic feature tracking, signals and
  view emission; connect the existing DI seams, eager initialization and materialize.
- [x] Cover effects, router navigation, MockStore, memoization parity, SQL scope,
  rapid transactions, LRU and synchronous cached subscriptions.
- [x] Update progress and contract docs; run the complete library tests and build
  with npx.cmd. Inspect the final diff for scope and report within 15 lines.

Validation: 117 library tests pass; ng-packagr build passes. Independent review
found no remaining critical correctness issues after signal recovery and
reference-only replacement fixes. Harness untouched; no commit created.
