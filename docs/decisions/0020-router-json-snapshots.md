# ADR-0020: Persist router-store snapshots as JSON

Status: Accepted (Agent, 2026-10-20)

## Context

The Phase 4b navigation test with unmodified `provideRouterStore()` revealed that
NgRx 22's MinimalRouterStateSerializer includes undefined fields and Angular
UrlSegment instances. These fail the schema's JSON validation, despite the
serializer's name. Default router-store integration must work without a custom
serializer or a change to the on-disk schema.

## Decision

In the classic reducer bridge, newly produced router-store snapshots from its
navigation/cancel/error actions are converted through JSON serialization before
writing. Recognition uses the official action types and router snapshot shape
(`state`, `navigationId`); no router-store runtime dependency is introduced.
Unchanged snapshots retain their identity. Other classic and transaction reducer
values continue to undergo strict JSON validation without conversion.

## Consequences

The default minimal serializer, routerReducer and getRouterSelectors work together.
Undefined object fields are omitted and UrlSegment values become plain JSON data;
prototype methods do not survive persistence. Full snapshots with cycles still
require a custom JSON-safe serializer. This is a targeted compatibility fix to
the existing bridge, not a dispatch pipeline or schema change.
