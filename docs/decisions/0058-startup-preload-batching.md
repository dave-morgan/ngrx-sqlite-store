# ADR-0058: Batch independent startup feature preloads

Status: Accepted. Date: 2026-10-22. Authority: Phase 15d.

## Context

Router and configured eager roots previously loaded in separate queued reads.
Awaiting each root sequentially paid a native query round trip per root; simply
using Promise.all still leaves separate StorageEngine FIFO tasks.

## Decision

After a feature registration commits its seeds and marks its session features
ready, preload that registration's router and configured eager roots together.
Keep the final bootstrap eager pass after all concurrent registrations settle.

PathCache groups missing independent physical feature roots in one queued read.
It uses the existing queryBatch transport with the explicit flat subtree column
shape, preserving subtree ordering, string cells and metadata assembly. Existing
owners, logical child paths and already pending loads retain their usual paths.
Duplicate and concurrent requests share pending work. A single missing root
keeps its direct transport.

The batch keeps the existing 32-request and 999-binding limits. Each JSON result
is capped at 1 MiB; an oversized subtree falls back to its original flat read.
Publishing runs after the queued read resolves. No changes$ callback awaits a
read, and no session value is loaded before its registration seed commits.

## Evidence and consequences

The independent-root regression first observed two query calls where one was
required. The startup regression first observed no batched router/eager query.
Both now pass. Tests also cover concurrent duplicate requests, escaped feature
names and a 1.1 MB subtree using the flat-read fallback. Targeted selector,
registration, router and query-batch suites passed: 56 tests across five files.

This reduces transport calls without changing schema or store APIs. JSON
aggregation adds native and JS processing; device measurements must establish
the latency effect and cannot be inferred from the statement budget alone.
