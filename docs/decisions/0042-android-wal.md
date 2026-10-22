# ADR-0042: Android WAL for the single writer

Status: Accepted. Date: 2026-10-22. Authority: Phase 15 driver PRAGMA allowance.

## Evidence

The five-trial initial report measured emission p50 around 15 ms against echo
RTT around 6 ms. A driver trace found exactly one atomic batch per emission.
The app journal probe intercepted the native bridge: that batch contains only
`UPDATE nss_node SET value = ? WHERE path = ?` for `ui/benchmarkCount`.
There is no redundant read or second bridge call to remove.

The isolated tiny-database probe underestimated the populated app's journal
cost. On the actual 50k harness database, 100 emissions per regime measured:

| Regime | Mean ms | Sample SD ms | p50 ms | p95 ms |
| --- | ---: | ---: | ---: | ---: |
| Original DELETE/NORMAL | 16.434 | 1.453 | 16.6 | 18.9 |
| WAL/FULL | 12.776 | 1.478 | 12.5 | 15.9 |
| WAL/NORMAL | 8.616 | 1.126 | 8.6 | 10.9 |
| Original restored | 16.401 | see raw data | 15.8 | see raw data |

Raw observations and native arguments are in
`android-app-journal-probe-2026-10-22.json`. These ordered diagnostic probes
guide the change; the final alternating five-trial run determines acceptance.
The native verification command failed before implementation: actual journal
mode `delete`, synchronous level `1` (NORMAL), expected journal mode `wal`.

## Decision

On writable Android connections, request `PRAGMA journal_mode=WAL` after
recovering an interrupted transaction and before exposing the connection.
Leave the connection's synchronous level unchanged (the measured SQLCipher
default is NORMAL). Do not tune cache size or alter web, iOS or readonly drivers.
Use the plugin query API to obtain SQLite's journal-mode result; a rejected WAL
request fails opening rather than silently pretending the optimization applied.

No API, schema, transaction boundary, commit/notification ordering or NgRx token
changes. Bulk chunks still form one transaction. SQLite manages its WAL and
default automatic checkpoints; no background work is introduced by the store.

## Durability

With WAL and NORMAL, committed changes survive application/process crashes and
the database remains consistent. A device power failure or OS crash can lose
recent transactions since the last durable checkpoint. A successful commit is
not a promise of power-loss durability in this regime. This is an explicit
tradeoff authorized by the phase-15 brief, even though the synchronous level
itself is unchanged. Consumers requiring every commit to survive power loss
need a driver configured for FULL; the supplied generic driver abstraction
continues to permit that. Readonly connections do not change database settings.
These guarantees follow SQLite's [synchronous PRAGMA documentation](https://www.sqlite.org/pragma.html#pragma_synchronous).

WAL's native pages and file buffers can add memory. Final memory verdicts receive
no bridge allowance. Native SQL/commit work exceeding echo arithmetic also
remains FAIL; WAL does not justify relabelling such work as bridge RTT.
