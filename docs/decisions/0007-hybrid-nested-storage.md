# ADR-0007: Nested data uses a hybrid storage model

Status: Accepted (thresholds are Q2; validated by spike Q3)

## Context
Storing every leaf as a row is costly for small objects. Storing everything as JSON is costly for large or hot collections.

## Decision
- Small nested values stay **inline JSON** on the parent row. SQLite JSON functions can still query them.
- Large or hot nested collections are **promoted** to child rows through pointers, using an **adjacency list**: each row has a parent path, an object key or array position, and a type tag. Scalars are inline. Objects and arrays are pointer rows with child rows, so any depth works.
- Subtrees are read back with one **recursive CTE** and reassembled in JS.

## Consequences
- Promotion and demotion rules plus migration are needed (Q2, Q10).
- Change granularity follows row boundaries.
