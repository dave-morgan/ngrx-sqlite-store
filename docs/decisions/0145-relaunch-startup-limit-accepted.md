# ADR-0145: 10k relaunch startup gap accepted as a limitation (user decision)

Status: Accepted (User, 2026-11-05).

## Context
In the retained acceptance (16av/16L20, ADR-0129), 10k relaunch-to-ready FAILs.

| Run | sqlite | classic | Excess | Allowance | Over |
|---|---:|---:|---:|---:|---:|
| 16L20 | 1616 ms | 1398 ms | 217.9 ms | 169.8 ms | 48.1 ms |

The 16bt trace shows where the cold-start critical path goes:
- the lazy SQLite plugin chunk, about 90 ms before prewarm's first native call;
- the startup reads;
- Angular bootstrap, which waits on the store initializer;
- the page query, issued only after bootstrap.

Attempts so far:
- 16bu (ADR-0143, static driver imports): rejected because test isolation broke.
- 16bv (ADR-0144, harness preload): relaunch improved, but the guard, toggle and memory results were adverse. Rejected.

Two options remain: an injectable driver plugin option, or an early page query. Both would help only a one-time cold launch, by roughly 30–90 ms on a launch of about 1.6 s, and both carry API, test and risk cost.

## Decision
The user accepts the 10k relaunch gap as a limitation. It counts as closed for the large-list goal, alongside the existing PASS, PB, BB and CB rows. The startup options are deferred.

This covers only the relaunch/startup metric. The 50k emitP95 FAIL (5.00 ms against an allowance of 4.82 ms) is a runtime metric and stays open. No floors or allowances change.
