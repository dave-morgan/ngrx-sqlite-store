# Brief: Phase 8 — Spikes Q1, Q2, Q3

Repo `C:\Development\ngrx-sqlite-store`. Read `CLAUDE.md`, `docs/open-questions.md` (Q1–Q3), ADR-0007, 0016, and 0019. Q4 is already resolved by ADR-0022.

Goal: measure, then turn the findings into ADRs. The spikes run in Node on the sql.js driver. Absolute numbers will differ on Android (phase 9), so focus on the **relative** comparisons and the scaling curves.

## Harness for spikes
- Put the code in `projects/ngrx-sqlite-store/spikes/`. It is not part of the library build: exclude it from `tsconfig.lib.json`.
- Add the runner `npm run spikes`. Use any mechanism that works in this workspace, for example a small esbuild bundle + node, or `vitest bench` with a separate config. Document which one you chose in `spikes/README.md`.
- Each spike writes a markdown results table to `docs/spikes/<id>.md`. That file must contain:
  - the method;
  - the environment (node version, sql.js version);
  - a table with the median of 5 runs;
  - conclusions.
- Use a SQL-counting executor wrapper so each result also reports the statement count.

## Q1 — `sortComparer` strategies (N = 1k, 10k, 50k entities)
Compare these strategies:
- (A) the current write-time binary search (ADR-0019);
- (B) a prototype declarative sort key: a `sortKey(entity) => string|number` stored in `nss_entity.sortkey`, with an index on `(coll, sortkey, id)`, and `ORDER BY sortkey`;
- (C) no stored order: sort in JS on read.

For each strategy, measure:
- a single sorted insert;
- an update that moves the entity;
- `setAll` of N;
- reading the full ordered ids;
- reading the first page of 50.

Make a recommendation. If (B) wins clearly, propose an additive API: an optional `sortKey` option on `createEntityAdapter`. Don't implement it in the library yet; record it as an ADR with status Proposed.

## Q2 — promotion threshold
Use a realistic notes-like shape: folders → notes → checklist, 3–5 levels deep, total size 50 KB to 5 MB. Sweep the threshold over 2, 8, 16, 64, and 256 KB.

Measure:
- the bytes written and the time for a single-leaf update;
- full read time;
- the row count.

Recommend a default threshold and say whether dynamic demotion is worth adding.

## Q3 — adjacency list + reads
- Compare the range reader with the CTE reader across depth (2–12) and breadth (10–10k children).
- Separately, measure reassembly time in JS versus SQL time.
- Round-trip property test at scale: arrays in objects in arrays, depth 12, 100k nodes.
- Check how pointer rows and path-as-ID behave under deep renames, i.e. moving a subtree: count the rewritten rows. Recommend whether array elements should keep hidden ids, given the results.

## Deliverables
- `docs/spikes/q1.md`, `q2.md`, `q3.md`.
- New ADRs for the decisions you reach, with register rows.
- Update `open-questions.md`: Q1, Q2 and Q3 become Resolved (pointing to the ADR) or Provisional (with the reason).
- Make only the library changes that the findings make **clearly** necessary. Keep them small, and cover each with a test. Leave anything larger as a Proposed ADR.

## Done when
- Library tests and build pass.
- `npm run spikes` runs end to end in under 10 minutes.
- `CLAUDE.md` is updated.
- **No git commit.**
- You return a summary of 15 lines or fewer, including the headline numbers.
