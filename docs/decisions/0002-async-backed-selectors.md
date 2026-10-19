# ADR-0002: Selectors are async-backed but emit like normal selectors

Status: Accepted

## Context
State lives in SQLite, but components and effects expect selectors to be synchronous, memoized functions that emit through `store.select` and `selectSignal`.

## Decision
Root and feature selectors become **reactive query sources**, similar to Angular's `resource()`. Each one holds a cached value, exposes it as an Observable and a Signal, and re-queries SQLite after commits that touch its paths. Derived selectors built with `createSelector` are ordinary, synchronous, memoized projections layered on top of those sources.

## Consequences
- A selector may have no value until its first query resolves (Q5).
- Values must be reference-stable when unchanged, so memoization works. This needs a structurally sharing path cache.
- Memory scales with what is subscribed, not with total state.
