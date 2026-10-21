# ADR-0035: Scope query view metadata to selector dependencies

Status: Accepted. Date: 2026-10-21. Authority: Library retention investigation.

ADR-0032 requires query memos to retain only their own dependencies. The query
view metadata previously contained every fresh cached query. NgRx memoization
keeps its last state argument, so an active count selector retained an unrelated
page through `queryViews`, even after the page was evicted from PathCache. Static
selectors skip evaluation when their own sources are unchanged, leaving that
old metadata reachable indefinitely.

Build query view maps from the selector's declared query sources only, for both
static and dynamic selectors. Read those entries directly rather than copying
all cached query values. Derived selectors still receive the union of their
input queries. Availability and staleness checks remain authoritative.

A forced-GC Node regression loads a 50k page, subscribes to a count selector,
then evicts the page while keeping the count and its memo alive. The page sample
must collect. Unit tests cover static/dynamic query maps. This restores the
existing memory contract; no public API, schema, action/history or active-lease
behavior changes. The expected Android retainers in ADR-0034 remain separate.
