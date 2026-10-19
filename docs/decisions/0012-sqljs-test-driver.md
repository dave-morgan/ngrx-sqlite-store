# ADR-0012: sql.js is the Node/unit-test driver

Status: Accepted (partially resolves Q12)

## Context
Unit tests need a real SQLite engine without Capacitor. `better-sqlite3` requires a native build (node-gyp), and the workspace's npm `allow-scripts` policy blocks install scripts.

## Decision
Add a `SqlJsDriver` over `sql.js` (WASM SQLite with JSON1 and CTE support) behind the `SqlDriver` interface. It is used for all library unit tests and as an optional web dev driver.

## Consequences
- Tests exercise the real SQL. Behaviour specific to Android, such as the CursorWindow limit and bridge serialization, is covered only by on-device tests and benchmarks.
