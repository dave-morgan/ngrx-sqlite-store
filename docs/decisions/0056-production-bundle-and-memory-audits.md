# ADR-0056: Defer optional devtools imports and retain scoped memory evidence

Status: Accepted. Date: 2026-10-22. Authority: Phase 15c.

## Decision

The harness dynamically imports devtools only during development bootstrap, then
adds its providers before creating the Angular injector. This preserves devtools
and NgRx initialization while preventing production from loading the optional
module. The previous static import plus isDevMode provider guard still emitted
about 15 kB of devtools code in both initial bundles. It was mostly shared cost,
not an explanation of the SQLite-versus-classic difference.

The bundle audit follows static output imports and separately reports the
initial /todos route closure and optional dynamic entry points. File presence
in the APK is not startup loading. sql.js, jeep-sqlite, the plugin's web driver
and spikes must be inspected in the output graph rather than guessed from
package imports. The library's public SQL.js driver remains available for tests;
there is no reason to remove an already tree-shaken export.

Heap snapshot summaries report node self_size, class/shape counts, closures and
code separately. These are shallow sizes, not dominator-retained sizes, PSS or
native memory. They can identify the fixed cost of loaded code and store DI,
selector and cache machinery without converting bundle bytes to heap bytes.

Post-seed diagnostics retain raw process meminfo, SQLite page size/count and
cache settings. A separate shrink_memory probe tests whether releasing SQLite
cache actually changes process PSS. Raw scratch seed controls receive the same
diagnostic, after all timed samples. These probes do not change workload
acceptance, do not force native GC, and cannot extend ADR-0048's empty-plugin
memory allowance to seeded data. Do not add cache PRAGMAs to application commits
without evidence of a useful reduction and a safe latency tradeoff.

## Verification

Both production builds and the output graph audit verify import reachability.
The development Playwright devtools tests verify observable provider behavior.
The Phase 15c report contains final bundle/heap differences, raw meminfo and
cache-probe observations, with any unexplained residual costs retained as FAIL.
