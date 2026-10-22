# ADR-0049: Batch feature version reads during registration

Status: Accepted. Date: 2026-10-22. Authority: Phase 15b startup optimization.

## Context

Store bootstrap reads one version marker per registered feature, sequentially
inside its seed transaction. Four registered features require four bridge
queries even when all persisted versions already match. These reads are
independent before the first seed write and have the same two-column shape.

## Decision

Read the registered feature version markers with bound `IN` queries, at most
999 parameters per query, inside the existing seed transaction before feature
processing. An empty registration issues no marker query. Preserve feature
order and all existing mismatch, reseed, undefined-initial-state and session
feature behavior. Update the local marker map after each successful write so
repeated feature keys in a registration observe the preceding write, exactly
as sequential queries did. Failures still roll back the entire registration.

This reduces N feature-version queries to ceil(N/999), normally one. It does
not combine writes, alter migrations, or change the bootstrap/INIT barrier.
Tests cover the round-trip budget, chunk boundaries, persisted state, session
reseed, lazy mismatch rollback and duplicate-key ordering.

## Existing selector batching and concurrency

PathCache.ensure already shares one microtask-scheduled refresh for initial
query leases. PathCache.refresh feeds concurrent query readers into queryBatch,
which combines known-column SQL into bounded UNION transports (32 terms and
999 bindings). Readers without known columns retain their original transport
until their shape can be learned. Generic path loads can require dependent
owning-container resolution and are not merged by this decision.

Native calls on the shared connection must not race writes or reads outside
the storage FIFO. Awaiting engine.read/transaction inside an engine task would
deadlock behind that same task. Within a task, SQL batching can reduce calls;
issuing independent bridge promises against the same connection is not a
substitute for preserving read/write order or transaction ownership. Driver
open/consistency/recovery/WAL calls likewise have ordering dependencies.

## Consequences

Three bridge calls are removed from a four-feature startup's metadata reads.
No schema, public API, durability or NgRx compatibility changes. Device
measurements determine the improvement in readiness latency.
