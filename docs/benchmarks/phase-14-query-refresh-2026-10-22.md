# Phase 14 query refresh bridge budgets (2026-10-22)

Driver invocations measured by the sql.js counting driver in
`src/lib/entity/bridge-cost.spec.ts`, including reads, atomic write batches,
transaction boundaries and awaited subscribed refresh. This is a deterministic
bridge-call regression, not a new Android latency measurement.

The subscriptions mirror `/todos`: open count, total count, visible count and
a page of 100. A distinct all-matching title filter keeps all four sources live.
The collection contains 110 rows so the off-page case requires a cold row read.
Before counts were observed by running the new failing test against the previous
implementation; after counts are asserted by the passing test.

| Scenario | Before | After | Brief budget |
| --- | ---: | ---: | ---: |
| Toggle in page, membership unchanged | 5 | 1 | ≤ 2 |
| Toggle outside page, cold previous-row read | 6 | 2 | ≤ 3 |
| Add todo | 6 | 3 | ≤ 3 |
| Change filter: new count and page sources | 2 | 1 | 1 batch |

With an open-only visible page, toggles change membership and require a SQL
page refresh: **2 calls in page, 3 outside page**, also asserted by the test.
An unchanged-membership toggle uses just the atomic write batch when the page
supplies the previous row. Counts/exists update in JS and the page patches its
changed row; all other page row references survive. An add uses one combined
conflict/append probe, one atomic write batch and one page-query batch.

Generic SQL readers always rerun. Readers with learned unambiguous result columns
and entity queries share one refresh batch, even when path sources also refresh. Promoted
rows and oversized (>1 MiB UTF-8) JSON cells retain separate row/subtree reads.

Randomized SQL-parity coverage uses 270 mutation steps across unsorted, sortKey
and sortComparer collections, with random nested where trees and live
count/exists/ids/page results checked against fresh SQL after every step.
