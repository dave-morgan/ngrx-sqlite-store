# Brief: Phase 14 — Change-aware query invalidation and batched refresh

Repo: `C:\Development\ngrx-sqlite-store`. Before you start, read:
- `CLAUDE.md`
- `docs/benchmarks/android-after-memory-fixes-2026-10-22.md`
- ADR-0027, 0028, 0031, 0033, 0035, 0036

Everything through commit 6b729d9 is committed.

## Problem
On Android, every bridge round trip costs about 25–30 ms. After the memory fixes, toggling one todo on `/todos` takes 314–492 ms p50. Each toggle does:
1. a cold row read, a write, and a commit;
2. a re-run of **every** live query source on the collection, one bridge call each. With the harness that means four queries: `count({done:false})`, `count()`, `count(where)` for the visible list, and `page({where, limit:100})`.

Classic NgRx takes about 12–150 ms on the same emulator.

## Goals
1. **Change-aware invalidation.** The ChangeSet already records entity changes per id (ADR-0031). Extend it so entity writes also report:
   - `kind`: insert, update, delete, or reorder;
   - the set of changed top-level fields for updates, computed from the prev/next entity in the transaction (both are known in mapOne/updateOne/upsert);
   - the affected ids.

   For each live query source, decide **without SQL**:
   - **`count(where)` / `exists(where)`:**
     - Skip on an update when no changed field appears in `where`.
     - On a full row change, update incrementally by evaluating `where` in JS on prev and next (the ADR-0028 JS evaluator already matches SQL). The count changes by matchesNext − matchesPrev, so no query is needed.
     - Inserts and deletes work the same way, using next only or prev only.
   - **`ids(where)` / `page(where, offset, limit)`:**
     - If an updated entity is in the cached result and still matches, patch the row in place. Use structural sharing: a new array, with the other rows keeping their references.
     - If membership or order can change, re-query: an entity entering or leaving the match, an insert, a delete, a reorder, or a sortKey or sortComparer field changing.
   - **`createQuerySelector`** (arbitrary SQL) always re-runs.
   - Inside the transaction, anything unknown falls back to a re-run, so the behaviour is conservative.
2. **Batched refresh.** Combine every query source that must re-run after a commit into **one bridge call**. Options:
   - a single `SELECT` that returns one JSON document per query, e.g. `SELECT json_object('q1', (SELECT ...), 'q2', (SELECT json_group_array(...) FROM (...)))`;
   - or the `SqlDriver.batch` read capability, if the plugin can return results.

   Bind all parameters; never interpolate. Keep the row cap and CursorWindow limits in mind: a page result returned as one JSON cell must stay under the 1 MB cap. Fall back to separate calls for large pages.
3. **Cold toggle without a pre-read.** If a page or query source already holds the entity's current value, `mapOne`/`updateOne` may use it as prev, but only when it is fresh per the staleness rules (ADR-0018 §4). Otherwise read the row.
4. **Budgets.** Add these to the bridge-cost spec, with the subscriptions mirroring the harness `/todos` page: header open count, total count, visible count, page of 100.

   | Scenario | Bridge calls (refresh included) |
   | --- | --- |
   | Toggle a todo **in** the page | ≤ 2 |
   | Toggle a todo **not** in the page, with a query read needed for prev | ≤ 3 |
   | Add a todo | ≤ 3 |
   | Change the filter (new where) | 1 query batch |

   Add a property test: across random sequences of insert/update/delete/toggle and random `where` trees, the incrementally maintained count/page/ids must equal a fresh SQL query after each step.

## Also
- Run the harness e2e (`npx.cmd playwright test`) for both implementations; all must pass.
- Optionally re-measure on the emulator (`node tools/android-bench.mjs --impl sqlite --sizes 1000,50000 --runs 100`). Record the result in `docs/benchmarks/` if you do.

## Done when
- Library tests and build pass; `npx.cmd ng build harness -c development,sqlite` passes; e2e passes.
- ADR and register row recorded.
- Tick "Phase 14 query refresh" in `CLAUDE.md` as the very last step.
- **No git commit.**
- Summary of 12 lines or fewer, with before/after bridge-call counts.
