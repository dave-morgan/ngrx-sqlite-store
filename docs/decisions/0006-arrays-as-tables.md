# ADR-0006: Plain arrays are stored as entity-style tables internally

Status: Accepted

## Context
Arrays need efficient inserts and reorders, and they can hold duplicates or primitives.

## Decision
Arrays stored as rows give each element a hidden, stable row ID (a path segment `#<id>`) and a fractional `pos` column. Inserts take the midpoint between neighbours, and a position space is renormalised only when precision runs out. On write, elements are matched **by reference first**, so unchanged objects keep their rows. Only new or moved elements cause inserts or position updates.

**Correction recorded:** JS arrays are *not* linked lists. V8 uses contiguous storage, or hash tables when an array is sparse, so we cannot exploit linked-list structure. An explicit position column is required.

## Consequences
- Reference matching depends on the transaction identity cache (Q6).
- Arrays inside small inline JSON blobs stay JSON (ADR-0007).
