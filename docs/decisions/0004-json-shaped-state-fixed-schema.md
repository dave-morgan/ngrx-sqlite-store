# ADR-0004: JSON-shaped state maps to a fixed, opinionated schema

Status: Accepted (concrete v1 DDL pending approval, see architecture §4.1)

## Context
NgRx state is restricted to plain JSON: objects, arrays, strings, numbers, booleans, and null. That closed set of node types makes a generic schema possible.

## Decision
Every node in a feature slice can map to a row keyed by its **lookup path** (e.g. `todos/filters/status`). Path-as-ID gives subtree reads and deletes through path-prefix range scans. The schema stays hidden behind the store.

## Consequences
- Path segments must be escaped (JSON-Pointer style).
- Array elements need stable hidden segments, not indices (ADR-0006).
- Non-JSON values are rejected by a dev-mode check.
