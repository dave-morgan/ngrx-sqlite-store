# ADR-0048: Empty-plugin controls and opt-in startup tracing

Status: Accepted. Date: 2026-10-22. Authority: Phase 15b.

## Decision

The harness accepts a private `harness:empty` localStorage control before
Angular bootstrap. `classic` renders an empty document without a store;
`sqlite` opens an empty native database, without schema, features, rows or
selectors. Both controls can run in the same APK to isolate native plugin
loading from differences in application bundles. Report paired observations,
sample SD and device-total PSS, with no native GC inside acceptance trials.
Also compare the controls in their respective APKs; any difference between
same-APK and cross-APK controls is not automatically native SQLite cost.

`harness:profile` enables native method timestamps before bootstrap, retaining
only SQL prefixes, encoded byte counts and timings, never bulk arguments.
Normal statistical trials leave this instrumentation off. Diagnostic seed
traces and CPU profiles remain separate from acceptance observations.

An optional `android-trace.mjs --native-sql-clock` diagnostic brackets each
executeSet's original statements with SQLite `julianday('now')` timestamp DML
in a temporary table. The table is created before the trace and dropped in
finally, outside store work. This measures the native SQL/preparation window
inside each bridge call without attributing JSON transport to native insertion.
It excludes native parsing before the first timestamp and commit after the
last timestamp, includes the timestamp-statement overhead, and has roughly
millisecond wall-clock precision. It is an attribution probe, never an
acceptance observation or a minimum-cost bound; uninstrumented traces supply
payload bytes and CPU timings. The driver ignores executeSet's changes count,
so the diagnostic DML does not affect store notifications or persisted state.

## PLATFORM-BOUND rule

Extend ADR-0038 only for memory metrics in identical units. For at least five
independent paired empty controls in the same session, define platform cost
as `max(0, mean_empty_sqlite - mean_empty_classic)`. A metric missing PASS is
PLATFORM-BOUND only when its excess is at most classic metric SD plus this
measured cost. Do not add the workload SQLite SD or platform control SD as
headroom; report both control SDs for uncertainty. A bound needs a written
causal match (heap with heap, device-total PSS with device-total PSS), isolated
plugin loading and no store-created data. Other excess remains FAIL and needs
an evidenced ADR. Latency cannot use a memory platform allowance.

## Consequences

The controls expose the fixed cost without attributing caches, journals or
entity retention to the platform. Empty-mode measurements do not replace any
of the 33 workload acceptance rows. The flags are benchmark controls, not
public store API or application UI.
