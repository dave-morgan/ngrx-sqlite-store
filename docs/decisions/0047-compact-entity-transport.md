# ADR-0047: Compact entity bulk transport

Status: Accepted. Date: 2026-10-22. Authority: Phase 15b bulk optimization.

## Decision

Keep the existing JSON1 bulk insert protocol and schema, but remove repeated
transport metadata. If all input rows share a collection, bind that collection
once beside the JSON rows. Mixed collections retain their row-level collection
field and input order. Omit trailing null sortkeys: an absent JSON array element
extracts as SQL NULL. Encode exact raw JSON data inside a single-element array
instead of a keyed object; encode opaque or whitespace-sensitive data as a
string, and the promoted empty-data sentinel as JSON null. The array wrapper
distinguishes JSON strings and JSON null from opaque data and the sentinel.

SQLite extracts the raw cell with `->` and fallback text with `json_extract`.
Retain the existing JSON validation, lexical whitespace/depth fallback, scalar
small-write path, row caps, streaming doubly encoded byte cap and exception for
one legal oversized row. Include the shared collection binding in byte accounting.
Every chunk remains in its original transaction; conflict processing and journals
retain input order. No public API, on-disk schema or durability changes.

## Alternatives and consequences

Deriving IDs or sortkeys from entity JSON would require assumptions about user
data and is rejected. Splitting arbitrary mixed collections into separate groups
could reorder conflicts or create many tiny calls and is rejected. Compact cells
remove object keys and quoting at the wire layer without removing JSON validation.
Collection detection adds a linear pass with no retained row copies. The final
device benchmark, rather than host timing, decides readiness improvement.

## Reproducible transport accounting

Run `node tools/bulk-transport-bytes.mjs` from the workspace. It bundles the
committed RowWriter at `c4232bd73277c1bc00f41f86d29efb764394c4c8` and the working
RowWriter, generates deterministic harness Todo data, and feeds both identical
controlled rows (`coll=todos`, original Todo ID, zero-based integer position,
null sortkey). A write sink counts actual generated SQL statements and UTF-8
bytes of `JSON.stringify([{statement: sql, values: params}])` without SQL or
device execution. Binding totals include JSON array framing and escaped text.

| Rows | Entity data UTF-8 bytes | Before statement bytes | After statement bytes | Before / after statements |
| --- | ---: | ---: | ---: | ---: |
| 1,000 | 136,210 | 198,598 | 177,580 | 1 / 1 |
| 10,000 | 1,380,887 | 2,023,837 | 1,813,324 | 8 / 7 |
| 50,000 | 6,992,197 | 10,295,863 | 9,243,667 | 40 / 36 |

At 50k this removes 1,052,196 bytes (10.22%) and four SQL statements. For each
ordinary raw row the wire encoding avoids the repeated collection and its
escaping, five null-sortkey bytes and the keyed raw envelope. The shared
collection adds one small scalar binding per chunk. Collection detection adds
one linear pass; row encoding now avoids mapping/stringifying the repeated
collection and trailing null. JSON validation and lexical/depth scanning remain.
The tool prints host encoding/journal elapsed time only as diagnostic data:
JIT, GC and execution order affect it, and it is not Android CPU evidence.

These totals are representative transport observations, **not** proof of
`bytes_min` under ADR-0038. They exclude bridge option fields, users, notes,
feature markers, readback and transaction framing; actual harness entity IDs,
sortkeys and positions may differ. Device traces and final statistics determine
the end-to-end result.

## Verification

The targeted RowWriter suite first failed five expected compact-shape assertions
against the old transport. With the new encoding, all 13 tests pass. Coverage
includes exact lexical JSON/primitives/whitespace, deep JSON fallback, opaque
and promoted data, mixed collections without extra groups, duplicate conflict
order, byte limits and rollback after all chunks. Existing row-cap validation
still runs before row encoding. The main agent runs final library verification.
