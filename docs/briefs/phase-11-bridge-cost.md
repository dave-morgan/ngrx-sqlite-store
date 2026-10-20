# Brief: Phase 11 — Bridge cost (statement count) budgets

Repo: `C:\Development\ngrx-sqlite-store`. Read `CLAUDE.md` first. Phases 1–8 and 10 are already committed.

## Why
On Capacitor, every SQL statement is a native bridge round trip, which costs about 5–15 ms on Android. Per-operation latency is therefore dominated by the **number of statements**, not by SQL execution time.

The phase 9 Android benchmark showed `tx.resetFeature()` on a 500-entity feature taking about 8 s.

`projects/ngrx-sqlite-store/src/lib/entity/bridge-cost.spec.ts`, written by the orchestrator, currently measures (driver `run`/`query`/`exec` calls per dispatched action, sql.js):

```
seedSetAll500: 23, toggleOne: 6, addOne: 5, setScalar: 15, resetFeature500: 1016
```

## Goal
Make bulk operations O(batches) and keep single-row operations near-minimal, **without changing semantics**. The existing parity, diff-minimality and row-cap tests must all keep passing.

## Budgets to reach
Enforce these in `bridge-cost.spec.ts`. Tighten the existing expectations and add cases for the rows marked "new case".

| Operation (500 entities, plus 3 scalar props) | Budget (statements per action, including refresh reads for active sources) |
| --- | --- |
| `resetFeature` / `tx.set('', initialState)` on an entity feature | ≤ 12 |
| `setAll(500)` | ≤ 15 |
| `removeAll` (new case) | ≤ 6 |
| `removeMany(predicate)` matching 1/3 of the rows (new case) | ≤ 12 |
| `map` over all 500 rows changing 1/3 of them (new case) | ≤ 15 |
| Returned partial `{ filter }` on one scalar (`setScalar`) | ≤ 5 |
| `mapOne` / `updateOne` / `addOne` / `removeOne` | ≤ 5 |
| Diff write of a 300-element plain array where every element changed (new case) | ≤ 15 |

## Likely causes (verify by tracing; don't assume)
- **Diff writes to entity collections and arrays** issue one DELETE/INSERT/UPDATE per row. Batch them:
  - multi-row `DELETE ... WHERE coll = ? AND id IN (...)` in chunks of 900 params, or a prefix/collection delete when the whole collection is replaced;
  - multi-row `INSERT ... VALUES (...),(...)`;
  - `UPDATE` via `INSERT ... ON CONFLICT DO UPDATE` with multi-row VALUES.
  - RowWriter must stay the single write path, so batching belongs **inside** RowWriter or schema helpers. The 1 MB cap still applies to every row.
- **Replacing a whole entity collection**, e.g. reset to an empty initial state: detect it, then do one `DELETE FROM nss_entity WHERE coll = ?` plus one batched insert.
- **`resetFeature`** may read the whole feature only to diff it against `initialState`. Prefer a prefix delete followed by a fresh `writeSubtree`. The ChangeSet must still record the feature path, and the tx identity cache must be invalidated.
- **`setScalar` = 15:** trace where the extra container reads come from: identity-cache misses, sibling reloads ("reload containers to preserve hidden array IDs"), or post-commit refresh. Cache the container meta per transaction.
- Also look at `query` calls that could be merged, for example reading node rows, entity rows and chunk rows in a single statement where practical.

## Also
- Add `bridgeCost` measurements to `npm run spikes` output as `docs/spikes/bridge-cost.md` (counts before and after).
- If a fix needs a design decision, add an ADR and a register row.

## Done when
- Library tests (all, including the tightened budgets) and the build pass.
- `npx ng build harness -c development,sqlite` passes.
- Tick "Phase 11 bridge cost" in `CLAUDE.md` as the very last step.
- **No git commit.**
- Summary of 15 lines or fewer with a before/after table.
