# ADR-0052: Reproducible platform-floor controls

Status: Accepted. Date: 2026-10-22. Authority: ADR-0051 and Phase 15c.

## Decision

The private empty `floor` harness mode dynamically loads only direct plugin
operations. It creates no Angular injector or store. Controls share the populated
`ngrx-harness` database, WAL journal mode and NORMAL synchronous level.
The runner clears the SQLite app before independently populating each size.
F_open runs before the bulk scratch controls, so it opens the populated store
plus one scratch row rather than a second N-row data set. Controls inspect and
require NORMAL without changing the native connection synchronous level.
F_open starts immediately before createConnection (the first plugin call), ends
after open and one SELECT returning a persisted scratch row, and runs in at least
five separately force-stopped processes. Control PRAGMA inspection runs afterwards.
F_commit samples at least twenty executeSet atomic inserts of a 32-byte ASCII
value, with no surrounding reads or schema work in the timed region.

The floor runner first profiles an actual seed separately. It selects the
transaction containing the greatest executeSet wire volume and verifies that it
writes nss_entity. Every native executeSet option object is measured as UTF-8 JSON,
including option framing, SQL and escaped values. F_seed constructs N plain
key/value scratch rows, distributed over the same sequence of chunk byte counts.
One JSON1 bulk INSERT per chunk inserts plain two-column rows, avoiding an
artificial floor increase from N prepared scalar statements. ASCII value padding
makes every complete plugin option object exactly match its
source chunk. Allocation, encoding, DELETE and table creation happen before the
timer. Each of at least five timed samples begins a single transaction, sends all
chunks and commits. Raw source trace and measured chunk byte counts accompany
all samples. A mismatch rejects the run rather than estimating bytes.

`android-bench.mjs --floors-json FILE` recomputes control means/percentiles from raw
samples, validates counts, row counts, chunks, PRAGMAs, database and matching
session/date/device/API/WebView/APK hashes, and renders all samples and arithmetic.
Dispatch metrics use the matching commit percentile. First-ready uses mean seed
plus mean open; relaunch uses mean open. PASS remains first, and the latency
allowance is classic SD + floor + SQLite SD. A measured floor does not grant a
second bridge allowance. Memory retains ADR-0048 unchanged.

## Consequences

Controls must be regenerated after any APK rebuild or seed transport change.
Scratch rows deliberately share the populated file and are excluded from store
queries. Fresh-process timing includes connection allocation, native open and one
row transport, while post-open control inspection is outside F_open.
