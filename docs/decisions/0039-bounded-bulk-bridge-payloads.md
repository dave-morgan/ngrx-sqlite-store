# ADR-0039: Bounded bulk bridge payloads

Status: Accepted. Date: 2026-10-22. Authority: Phase 15 / Q17.

## Context

The before profile (`android-q17-before-2026-10-22.json`) measured app PSS
133.4 MB before a 50k seed, 195.7 MB peak (Java 69.2 MB, native 26.3 MB),
and 135.7 MB after GC. A transaction-wide executeSet statement array creates
unnecessary simultaneous JavaScript, bridge JSON and Java allocations.

## Decision

Bound pending writes to 256 KiB of UTF-8 JSON using the native executeSet
`[{statement,values}]` shape, including escaping and array separators.
The budget covers this statement array; the plugin's database/options envelope
adds a small fixed overhead (the native trace records full option byte counts).
Flush before adding a statement that would cross the budget, releasing the
flushed statement array. Begin one explicit transaction on the first streaming
flush, commit once, and roll back every chunk if any operation fails. Preserve
the lazy single atomic batch for small write-only transactions and flush before
reads. Notifications and callbacks remain strictly after commit.

RowWriter also groups multirow inserts by encoded bytes and 999 parameters.
A single legal row may exceed the soft transport budget; send it alone, retaining
the existing 1 MB value cap and avoiding a public API break. No arbitrary SQL
splitting, schema changes, durability changes or NgRx token changes.

## Consequences

Large transactions make more bounded bridge calls but retain atomicity. Tiny
transactions retain their existing statement budgets. The budget bounds bridge
transport buffers, not the application's source state or native allocator RSS;
the final device profile and statistical acceptance report assess that outcome.

## Device evidence

The matched 50k profiling runs are saved as `android-q17-before`,
`android-q17-after` and `android-q17-classic` (2026-10-22, Markdown and raw JSON).
They are single profiling trials, not statistical acceptance runs.

| App process MiB | Before seed | Sampled peak | After GC |
| --- | ---: | ---: | ---: |
| SQLite before bounded writes | 133.4 | 195.7 | 135.7 |
| SQLite with bounded writes | 134.3 | 141.6 | 136.1 |
| Classic | 126.2 | 136.3 | 132.0 |

The SQLite sampled peak fell 54.1 MiB. Java heap at peak fell from 69.2 to
18.7 MiB; native heap at peak fell from 26.3 to 22.9 MiB. After-GC totals
(app plus renderer) were 255.3 MiB for bounded SQLite and 250.0 MiB for
classic, a 2.1% difference (inside Q17's original approximately 10% target).
Explicit GC also reclaimed the old unbounded Java payload; the earlier assertion
that all of it necessarily persisted until restart was too strong. Bounded
transport removes the large transient allocation without relying on GC timing.
The stricter ADR-0038 five-trial verdict remains a separate acceptance result.

With the final JSON transport, insert-journal and WAL changes, the final 50k
profile (`android-q17-final-2026-10-22.json`) sampled app peak PSS at 142.5 MiB
(Java 18.3, native 26.3); after GC the app was 132.8 MiB (Java 12.5, native
22.7) and device-total PSS was 249.4 MiB. Before-GC app PSS was 135.8 MiB.
This is diagnostic evidence, not a replacement for the five-trial memory table.
