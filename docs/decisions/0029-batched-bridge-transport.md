# ADR-0029: Batched writes and subtree transport

Status: Accepted. Date: 2026-10-20.

## Context

The phase 11 brief budgets native bridge statements, including active-source refresh. Per-row mutation and repeated metadata reads make bulk operations linear in bridge calls.

## Decision

Batch independent entity changes and leaf deletions through RowWriter within SQLite's 999-parameter limit. Preserve one-row UPDATE minimality, per-row UTF-8 checks, promoted subtree cleanup and sequential duplicate/id-change behavior. Read node, entity and chunk rows in one ordered UNION transport query. Reuse only fresh committed or transaction metadata; writes invalidate overlapping identities. Explicit feature reset uses prefix replacement and records replacement identity hints without materializing the old subtree; ordinary set remains a structural diff.

No public API, disk format, transaction boundary or NgRx integration changes.

## Consequences

Bulk bridge cost follows batch count. Fresh subscribed collections can supply entity metadata without an extra SQL read. Cold operations remain supported and independently budgeted. Regression tests and the bridge-cost spike measure complete dispatch and subscribed refresh.
