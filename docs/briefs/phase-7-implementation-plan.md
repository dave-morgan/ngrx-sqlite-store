# Phase 7 implementation plan

The approved design is ADR-0022 and the scope is phase-7-compat.md.
Execute in the existing workspace without commits or interactive approvals.

- [x] Add failing devtools integration tests for exactly-once post-commit effects,
  committed-view reducers, whole-store subscriptions, extension messages and logging.
- [x] Implement the guarded scanned subject, internal emit symbol, committed-view
  compat reducer and direct State injection. Audit StateObservable consumers.
- [x] Independently add effects, router-store and mock/runtime-check contract suites
  under src/lib/compat; compare classic and SQLite observable results.
- [x] Investigate every mismatch, add regression coverage and fix its cause.
- [x] Update the public contract, Q4 and decision register; CLAUDE.md is the final step.
- [x] Review spec coverage and code, then run library tests, library build and the
  development,sqlite harness build. Leave harness application sources untouched.

Verified 2026-10-20: 164 library tests pass; library package build and
development,sqlite harness build pass. SQLite Playwright suite: 12/12 pass,
including a fake browser devtools extension proving exactly-once post-commit
effects and absence of synchronous transaction-reducer warnings.

Additional regressions cover gated startup with lazy root/feature effects,
overlapping navigation and whole-store publication after unchanged terminal
actions. ADR-0023 records the ordering fixes and the intentional omission of
transient/superseded router snapshots from whole-store transport.
