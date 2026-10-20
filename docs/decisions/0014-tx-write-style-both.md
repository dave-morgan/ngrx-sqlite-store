# ADR-0014: tx reducers may write imperatively and/or return a partial state

Status: Accepted (user decision, 2026-10-20; resolves Q6 part 2)

## Decision
A `tx` handler can do one of the following:
- write imperatively via `tx.set` / `tx.patch` / `tx.delete` / array ops / entity adapter ops, and resolve to `void`; or
- resolve to a **partial feature state** `Partial<S>`. Each returned top-level key is diffed against the identity-cached previous value (ADR-0009) and written. Keys that are not returned stay untouched.

Both can be combined in one handler. Imperative writes are applied first, then the returned partial.

Within a transaction, `tx.get()` goes through an **identity cache**, so the same path returns the same reference and values written earlier in the transaction are visible. That is what makes reference-based diffing correct.

## Consequences
- Each returned partial costs one diff walk. It is cheap when references are preserved.
- Handlers must not mutate values obtained from `tx.get()`. Dev mode freezes them.
