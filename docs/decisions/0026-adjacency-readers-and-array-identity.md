# ADR-0026: Retain range reads and hidden array identities

Status: Accepted (phase 8). Resolves Q3 for the Node/sql.js structural spike; Android performance remains phase 9.

## Context

[Q3 measurements](../spikes/q3.md) compare the actual range and recursive CTE readers across depth 2–12 and breadth 10–10,000. SQL driver time is separated from reassembly by replaying captured query results through the unchanged reader. Five seeded fixtures with exactly 100,000 stored nodes at depth 12 round-trip arrays in objects in arrays, escaped keys and mixed scalar values through both readers.

## Decision

Keep the range reader as the default implemented by NodeStore, and retain the CTE reader as a verification/reference alternative. This refines ADR-0007's original CTE-only read description without changing the on-disk schema. Both perform three statements (nodes, entities, chunks). Range reads exploit contiguous path prefixes; the CTE follows the adjacency index. The report records separate SQL/reassembly scaling rather than attributing the entire read to SQL.

Retain hidden array ids and fractional positions (ADR-0006). Adjacent swaps in 100,000-node fixtures preserve hidden ids and descendant paths while modifying only position rows. Using logical array indices as physical ids would require rewriting descendants during reorders.

Object-key renames and cross-parent subtree moves remain O(subtree rows): pointer rows are keyed by ancestor-dependent paths, so moving a pointer alone cannot move its descendants. The rename matrix counts actual deletes and inserts and checks for orphan pointers. Do not introduce global opaque node ids in phase 8; that would require a new schema/migration and a different prefix-read strategy. Revisit only for demonstrated move-heavy workloads.

## Consequences

No library change is necessary. Structural validity and deep-reader behavior are established for the measured Node/sql.js fixtures; this is not a proof for all JSON or an Android latency/heap benchmark. Read cost includes JS metadata/reassembly even in production mode, which phase 9 must account for. Q3 is resolved; Q14's device targets remain open.
