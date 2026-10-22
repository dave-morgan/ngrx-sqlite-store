# ADR-0061: Persistence is the product, so there is no in-memory feature mode (resolves Q7)

Status: Accepted (User decision, 2026-10-22)

## Context
High-rewrite UI state such as forms, statuses, loading flags and workflow steps pays one durable SQLite commit per dispatch. That is about 4.5 ms p50 for a scalar change on the emulator, against about 0.1 ms in classic NgRx. Q7 asked whether features could opt into staying purely in memory, with classic sync reducers, to avoid that cost.

## Decision
- **No in-memory feature mode.** Every feature is SQLite-backed. The store's reason to exist is a **persistent** drop-in for `@ngrx/store`.
- A few milliseconds per dispatch is negligible for the vast majority of use cases.
- Apps that don't need persistence and want the last bit of latency should use plain `@ngrx/store`.
- Session-only slices keep `persist: false` (ADR-0030). They are still SQLite-backed and are reset on start.
- Optimisation priority:
  1. large lists (phase 15d);
  2. large flat objects;
  3. hybrid workflow state, with nesting measured up to depth 10 and no deeper (phase 16).

  All of these are judged under the ADR-0038 / ADR-0051 / ADR-0057 rules.

## Consequences
- Q7 is closed.
- Write-path optimisations that keep the notify-after-commit guarantee are in scope, for example group commits per frame (ADR-0003). Optimisations that give up durability are not.
