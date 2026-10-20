# ADR-0013: `on()` handlers are transaction reducers; classic reducers are explicit

Status: Accepted (user decision, 2026-10-20; resolves Q6 part 1)

## Context
`(tx, action)` and `(state, action)` handlers have the same arity. Checking for `async` is unreliable after transpilation (Q6).

## Decision
- `on(...creators, async (tx, action) => ...)` is **always** a transaction reducer. This matches the brief's example.
- Classic handlers are explicit: `onState(...creators, (state, action) => state)` inside `createReducer`. The bridge loads the slice, runs the handler, and diffs (ADR-0009).
- Whole classic reducers from third parties (`routerReducer`, legacy `createReducer` from the real `@ngrx/store`) are wrapped with `fromSyncReducer(reducer)` when registered. `provideState`/`provideStore` also auto-wrap any reducer function that does **not** carry our tx-reducer brand, because a foreign reducer is by definition classic.

## Consequences
- Migration means turning `on` handlers into `tx` handlers, or renaming them to `onState`. Both are mechanical and could be done with a schematic later.
- Foreign reducers work without code changes, but cost memory in proportion to their slice (fine for `router`).
