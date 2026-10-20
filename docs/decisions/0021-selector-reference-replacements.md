# ADR-0021: Preserve reference-only replacements after commit

Status: Accepted (Agent, 2026-10-20)

## Context

NgRx recomputes an items projector when a reducer returns a new array with equal
contents. SQL array diffs may produce no writes for that operation. Deep value
reconciliation alone would incorrectly suppress the projector invocation.

## Decision

StoreTx records transient reference-replacement paths on the transaction's
ChangeSet through an internal WeakMap. Equal-content container replacements also
mark their paths changed, even when no physical row changes. Failed transactions
discard these hints along with their ChangeSet. No values or schema additions are
persisted for this mechanism.

PathCache reconciles refreshed data with these paths, preserving new identities
where explicitly replaced and reusing untouched children. Array children are
matched by their stable physical ids when available. View/default assembly
respects already reconciled schema containers rather than canonicalizing their
identities again.

## Consequences

Projector-count parity includes reference-only replacements. Existing partial
refresh still reads only changed branches for ordinary value changes. The write
pipeline, row-cap enforcement and on-disk schema remain unchanged.
