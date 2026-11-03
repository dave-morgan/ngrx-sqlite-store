# ADR-0072: Reuse fresh cached absence in transaction reads

Status: Accepted for redundant-read elimination (Agent, 2026-10-24; general startup speedup not established)

## Located cost

The Phase 15i 1k startup trace (`.tmp/startup-15i-1000.json`) repeatedly queries
the router root while its initial value is undefined. `PathCache.ready(path)`
already distinguishes an absent value in a loaded, clean owner from a path that
is not loaded or is stale. `StoreTx.get` previously tested only `peek(path)`,
so both conditions caused another SQL read.

A router compatibility regression selects the absent root, verifies the cache is
ready, and dispatches two unrelated startup actions. Before the change it records
two router subtree queries; the expected result is zero. The test fails for this
specific reason on the prior implementation.

## Candidate

Expose optional `ready(path)` through the internal committed-cache contract and
reuse known absence when `peek` is undefined and the cache is ready. If the current
transaction has overlapping changes, bypass the committed cache as before. Cache
implementations without `ready` retain the previous read behavior. Eviction/stale
entries continue to read SQLite. No public provider API or on-disk format changes.

## Validation and acceptance rule

All 341 library tests pass, including the new regression and existing router
navigation readback coverage. Compare baseline 15h/15i APKs with the candidate on
the device in two reversed sweeps before claiming a startup improvement or
retaining it as a performance optimization. Unit-query elimination is established;
its relevance to the actual harness startup is still a measurement question.

## Device result

The reversed A/B timings are preserved in
[Phase 15j evidence](../benchmarks/android-ladders-15j-2026-10-24.md).
They do not establish a robust general startup speedup: 1k first-ready is slightly
lower in both comparisons, while relaunch and 10k first-ready change direction.

The actual candidate startup trace (`.tmp/startup-15j-1000.json`) confirms the
optimized path is used: router subtree reads before readiness fall from **five to
one**, with that remaining read loading the pinned router cache. All root-position
queries are excluded from this count. Retain the small change for confirmed
redundant-read elimination, without attributing timing gains to it or declaring the
startup target met. Both traces are diagnostic and instrumented.
