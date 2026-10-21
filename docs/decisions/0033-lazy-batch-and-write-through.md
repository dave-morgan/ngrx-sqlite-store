# ADR-0033: Lazy atomic batches and committed write-through

Status: Accepted. Date: 2026-10-21. Authority: Phase 13 brief.

Add the optional SqlDriver batch capability specified by the brief. RowWriter
uses a result-free executor write operation; ordinary run retains its result
contract. Transactions buffer these writes. Reads before writes run under the
exclusive FIFO; reads after writes begin a plugin transaction and flush first.
At completion a write-only tail uses one atomic batch if no transaction began,
otherwise it flushes inside the open transaction and commits. Drivers without
batch retain explicit transactions. No raw transaction SQL reaches Capacitor.

Carry exact written values and entity rows only for the commit/refresh lifetime.
Invalidate overlapping known values on every subsequent mutation. Adopt known
values into existing PathCache entries, preserving physical metadata and
ADR-0021 identity hints; queries and unknown SQL mutations still re-read.
Never create cache entries merely because a write supplied a large payload.
Fresh committed collection metadata can serve entity reads inside a transaction.
No schema or NgRx token changes.

Existing fresh scalar entries retain only their parent/position location, so
subscribing to a leaf does not require another location lookup on writes. Query
page transport rows can serve EntityTx row reads while their owning query is
fresh. Aggregate/promoted fallback and page/promoted fallback each share one
SQL transport query. All query sources still re-run on overlapping commits.
Known entity journals preserve INSERT DO NOTHING conflict semantics and prior
sort keys; unknown earlier ordering changes require the reader. Reconcile
membership updates so no-op inserts preserve selector references.
