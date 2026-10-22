# ADR-0046: Skip redundant probes on freshly created native connections

Status: Accepted. Date: 2026-10-22. Authority: Phase 15b startup optimization.

## Evidence

Inspection of the installed Capacitor SQLite 8.1.1 implementation shows that
`SQLiteConnection.isConnection` and `retrieveConnection` consult only the JS
connection map. They do not cross the bridge. A new wrapper has an empty map;
`checkConnectionsConsistency` passes that empty list to native, which closes
surviving native connections. This is the existing WebView reload recovery
mechanism, rather than retrieval of the previous native handle. Closing the
old database also rolls back its interrupted transaction.

Android and iOS `createConnection` allocate a new, initially closed Database
object and reject duplicate names. After successful creation, `isDBOpen` must
be false; after its first successful open there is no inherited transaction.
Both probes therefore add sequential bridge calls without additional recovery
on that path. The installed Android transaction API resolves only `RW_` handles,
even when the driver is readonly. Jeep SQLite likewise forbids transaction
checks in readonly mode. Its createConnection can reuse an opposite-mode
underlying database, so native freshness is not assumed on web.

Sources: installed plugin `src/definitions.ts` (SQLiteConnection), Android
`CapacitorSQLite.java` and `SQLite/Database.java`, iOS
`Plugin/CapacitorSQLite.swift`, and jeep-sqlite 2.8's
`dist/collection/components/jeep-sqlite/jeep-sqlite.js`.

## Decision

Keep the consistency sweep before creation, including on fresh process startup:
there is no reliable JS-only indication that a native handle survived a reload.
For newly created native handles, call open directly and omit isDBOpen and
isTransactionActive. For retrieved handles and web handles, retain the open
probe and, when writable, transaction probe plus rollback. Readonly handles
never invoke writable-only transaction APIs or Android's WAL PRAGMA.

Keep WAL initialization and failure cleanup unchanged. Do not infer a startup
latency floor from removed calls; final device measurements determine parity.
The clean Android path now uses consistency, create, open and WAL (four bridge
calls rather than six). isConnection remains a local asynchronous lookup.
Skipping consistency or recovering by matching duplicate-create error strings
would save another clean-start call, but changes reload/error behavior and is
not justified by the current evidence.

## Consequences

Two sequential bridge round trips are removed from clean native startup and
native reload startup after consistency cleanup. No schema, public API,
durability, notification ordering or NgRx token changes. Tests exercise the
real plugin JS wrappers against a simulated native boundary, including stale
registry cleanup, interrupted transactions, retained handles, readonly/web
behavior, WAL failure and retry.
