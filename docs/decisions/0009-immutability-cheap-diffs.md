# ADR-0009: Immutability enables cheap diffs where a full value is produced

Status: Accepted

## Context
Reducers and adapters that produce a new subtree value follow NgRx's immutability rules, so unchanged subtrees keep their references.

## Decision
When a new value is written, walk it against the previous value, skip identical references, and write only the paths that changed.

## Consequences
- The previous value has to come from an **identity cache** within the transaction, falling back to the PathCache. Values freshly read from SQLite are new objects, so they would defeat reference comparison (Q6).
- Accidental mutation would hide changes. A dev-mode freeze check (NgRx runtime-check equivalent) is recommended (Q11).
