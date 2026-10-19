# ADR-0003: Reducers become async and transactional

Status: Accepted (exact API shape is Q6)

## Context
A classic reducer receives the whole slice, which forces it into memory. Reducers are an internal mechanism, so changing their shape is an accepted migration.

## Decision
Reducers can be async and receive a **transaction handle** instead of state, e.g. `on(addTodo, async (tx, action) => { ... })`. They read only what they need. Three guarantees:
1. **A single serial write queue.** Reducers run one at a time in dispatch order, each inside its own SQLite transaction. Actions never interleave.
2. **Notify after commit.** Selectors re-query only after commit.
3. **Effects see post-commit state.** `ScannedActionsSubject` emits after commit and after the affected live sources refresh, so `withLatestFrom(store.select(...))` reads updated state.

## Consequences
- `dispatch` stays synchronous, but its effect on state is asynchronous. Tests need `dispatchAsync` or a settle helper.
- Classic sync reducers need a compatibility wrapper (for router-store and third parties).
- Throughput is bounded by serial transactions, so batching within a reducer matters.
