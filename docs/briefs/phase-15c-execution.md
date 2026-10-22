# Phase 15c execution plan

Authority: phase-15c-floors-and-overhead.md, ADR-0051 and the explicit user request.
Work stays in the existing workspace; no commits. CLAUDE.md is edited in place,
and its Phase 15c completion checkbox is the final workspace mutation.

- [ ] Build direct-plugin commit, equal-wire/chunk seed, and fresh-process open
  controls first. Test acceptance arithmetic and provenance rejection. Retain all
  samples, settings and exact payload sizes; controls do not call store APIs.
- [ ] Add bounded declarative query-field indexes, registered outside selector and
  reducer hot paths. Test real SQLite query plans, typed predicates, promoted rows,
  existing populated databases and rollback. Record policy and upgrade lifecycle.
- [ ] Reduce session reseed writes while preserving ADR-0030's startup barrier,
  reset semantics and transaction atomicity. Test lazy and reopened features.
- [ ] Trace native calls and JS scheduling for a toggle; remove avoidable work
  without changing commit-before-notification or effect ordering.
- [ ] Reduce seed encoding/validation overhead; retain row caps, bounded chunks,
  lexical JSON fidelity and atomic rollback. Compare seed/open controls.
- [ ] Audit production bundle module attribution and retained heap; verify web
  dependencies are deferred on Android. Measure post-seed process categories and
  SQLite cache diagnostics separately from unperturbed acceptance observations.
- [ ] Build both production harness configurations and library; run all library
  tests, harness tests, tool tests and npx.cmd playwright test. Review final diff.
- [ ] Run five alternating paired Android trials at 1k/10k/50k, same-session floor
  and empty-memory controls. Preserve raw observations and APK provenance. Report
  all 33 verdicts and exact arithmetic in android-parity-15c-2026-10-22.md.
- [ ] Record evidence and attempted improvements for every remaining FAIL in a
  registered ADR. Mark this plan complete, then tick Phase 15c in CLAUDE.md in
  place as the very last step. Final response is at most 15 lines with counts.
