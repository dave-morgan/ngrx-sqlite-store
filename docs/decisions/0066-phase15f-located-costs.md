# ADR-0066: Phase 15f fixes located by decomposition (amends ADR-0051, ADR-0062, ADR-0064)

Status: Accepted (Agent, 2026-10-23)

## Context
Phases 15c–15e tuned parameters and barely moved the verdicts. Phase 15f changed method. Each gap was decomposed on emulator-5554, one step at a time from the platform control to the store's real work, before anything was changed.

## Evidence

### 1. Seed ladder
Run with `tools/android-seed-ladder.mjs`; data in [benchmarks/android-seed-ladder-50000-2026-10-23.json](../benchmarks/android-seed-ladder-50000-2026-10-23.json).

Setup:
- the store's own 50k persisted todo rows;
- a scratch database;
- one transaction, at most 256 KiB per `executeSet`;
- 6 alternating samples. Mean and SD are in ms.

| Step | Mean | SD |
| --- | ---: | ---: |
| `(k INTEGER PK, v TEXT)`, data as a JSON string | 1335 | 20 |
| same table, data embedded as JSON (`value -> '$[1][0]'`) | 985 | 24 |
| production key `(coll,id)` `WITHOUT ROWID`, embedded | 1146 | 24 |
| + `(coll,pos)`, `(coll,sortkey,pos)` | 1209 | 15 |
| + two declared `json_extract` query indexes (**production shape**) | 1407 | 15 |
| production shape as a rowid table with `UNIQUE(coll,id)` | 1372 | 17 |
| key columns computed in JS instead of expression indexes | 1507 | 96 |

The production schema costs about 420 ms over the minimal table:
- 160 ms for the text key;
- 63 ms for the order indexes;
- 197 ms for the query indexes.

None of the alternatives was better than the current shape, so the schema is unchanged.

The old F_seed control padded each chunk into one giant string. That means SQLite parsed about 44 string tokens instead of 50k JSON objects, so it understated the real per-row cost: 831 ms, against 985 ms for the cheapest real-row transport.

### 2. Store seed trace (CPU-profiled, source-mapped)
The 15e store spent about 2.0 s natively against the isolated 1.4 s. The difference came from:
- a 194 ms commit, which was SQLite's automatic WAL checkpoint running inline;
- a JS/bridge gap of about 5 ms before each of the 44 chunks;
- about 450 ms of per-entity JS:
  - `serializedSize` built a path string for every nested key;
  - two character-loop scans per row;
  - a 43 ms deep freeze of the action. Production NgRx never does this (see 5).

### 3. Durability
Both the store connection and the floor connection already run WAL with `synchronous=NORMAL` (1), Android's own default for WAL. No durability change is needed or made.

## Decisions
1. **F_seed uses real rows (amends ADR-0051).** The `firstReadyMs` floor is `seedRows`:
   - the store's own persisted entity rows;
   - inserted into `nss_bench(k INTEGER PRIMARY KEY, v TEXT)` with the cheapest JSON1 transport;
   - at most 256 KiB per `executeSet`, in one transaction;
   - with the same `wal_autocheckpoint` behaviour as the store;
   - 5 samples, in the same session.

   The padded-byte control is still measured and printed in the justification, but not used.
2. **Pipelined bulk writes.** On transports that execute in order, a transaction issues its next `executeSet` batch without waiting for the previous one. Native Capacitor qualifies (`driver.pipelined`): Android runs one `CapacitorPlugins` HandlerThread and iOS a serial plugin queue.
   - At most 2 batches are in flight, which keeps the ADR-0039 payload bound.
   - Every read, statement, commit and rollback drains them first, so ordering, read-your-writes and atomicity are unchanged.
   - If any batch fails, the whole transaction rolls back after all issued batches settle.
   - Web (jeep-sqlite) keeps sequential awaits.
3. **WAL maintenance off the notification path (amends ADR-0064 timing).**
   - Bulk reclamation (`wal_checkpoint(TRUNCATE)` then `shrink_memory`) runs once the queue has had no commit for 200 ms. It no longer runs between a commit and its notification.
   - A PASSIVE checkpoint is requested every 64 small commits, under the same debounce.
   - `store.settle()` waits for pending maintenance, so memory measurements still see the reclaimed state.
   - During a streamed bulk transaction only, `wal_autocheckpoint` is raised to 10,000 pages, so the bulk commit doesn't checkpoint inline. Bulk maintenance restores the default of 1,000.
   - A first version raised the threshold for all commits. Relaunch then regressed by 200–400 ms: the benchmark's many small commits left a multi-thousand-page WAL at process kill, and the next open had to recover it. So normal commits keep SQLite's default bound.
4. **Startup round trips.**
   - On native, `createConnection` is called optimistically. The ADR-0046 consistency sweep runs only when creation reports a surviving handle ("already exists"), which happens after a WebView reload.
   - `PRAGMA journal_mode=WAL` is issued in order but not awaited. Its result is verified before the next driver operation resolves, and a failure there surfaces exactly like a failed open.
5. **NgRx runtime-check semantics (compatibility fix).** NgRx's `createActiveRuntimeChecks` applies user runtime checks in dev mode only and disables every check in production. The store now does the same:
   - `strictStateSerializability` stays true because persistence requires it;
   - the action-type uniqueness guard reads the active checks.
6. **JS encode work.**
   - `serializedSize` builds failure paths lazily.
   - Printable-ASCII strings are sized with native `indexOf` and regex scans.
   - Object-key sizes are cached, bounded at 4,096 keys.
   - Canonical `JSON.stringify` output shorter than 1,802 characters skips the envelope scan, because it can contain neither insignificant whitespace nor nesting deeper than 900.

## Consequences
- The 50k seed's reduce phase fell from 2,362 to 1,697 ms in the paired diagnostic trace, and its commit from 194 to 12 ms.
- The remaining native cost is the production schema (about 420 ms over a minimal table) plus SQLite's per-row JSON work, which the real-row floor now measures honestly.
- The final acceptance numbers are in the Phase 15f report.
