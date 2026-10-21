# Brief: Phase 12 — Performance at scale (refresh granularity, per-commit work, memory)

Repo: `C:\Development\ngrx-sqlite-store`. Before starting, read:
- `CLAUDE.md`
- `docs/benchmarks/android-baseline-2026-10-21.md` (the evidence)
- ADR-0018, 0021, 0027, 0029

Phases 1–11 and ADR-0030 are already committed.

## Problem (measured on an Android emulator)
| 50k todos | classic | sqlite |
| --- | --- | --- |
| Toggle one todo, dispatch → DOM | 55 ms | **10.7 s** |
| Unrelated `ui` scalar change, dispatch → selector emit | 0.1 ms | **948 ms** (and 174 ms at 1k) |
| JS heap on the list page | 18.7 MB | **48.6 MB** |
| JS heap after leaving the list | 34 MB | **86 MB** |

## Reproduce in Node first
Add a spike, `spikes/scale.ts` (wired into `npm run spikes` and with output in `docs/spikes/scale.md`), that uses a `LatencyDriver` wrapping `SqlJsDriver`. The wrapper adds a configurable delay per statement (default 3 ms) and counts statements. Scenario: a store with:
- `todos`: an entity feature of N ∈ {1k, 10k, 50k}, plus scalars;
- `ui`: scalars.

Subscriptions:
- a `selectAll`-derived selector on todos (list page);
- a query `count`;
- a `ui` scalar selector.

Measure:
- `toggle(id)` dispatch → emission;
- `ui` scalar dispatch → emission;
- statements per action;
- JS heap retained by the store after a forced GC, using `node --expose-gc` and `process.memoryUsage().heapUsed` deltas, compared with the same data held in a plain classic `@ngrx/store`.

Use profiling (`--cpu-prof` or manual timers) to find the O(N) steps. **Do not guess.**

## Targets (Node + LatencyDriver 3 ms, N = 50k)
1. **Granular entity refresh.**
   - Toggling one entity re-reads at most that entity's row plus O(1) metadata.
   - The refresh may issue no more than 3 statements per action.
   - The cached EntityState is patched with structural sharing: a new `entities` object (a shallow copy is acceptable) with only the changed entity replaced. The `ids` reference is kept when order is unchanged.
   - Record entity changes as `coll/<typed id>` (plus a `coll/#order` marker when order changes) in the ChangeSet, so overlap checks can tell an element change from a collection change.
   - Invalidating a query source (`count`/`page`/`ids`) on any collection change is still fine.
   - Toggle dispatch → emit: **≤ 10 × the classic time plus 3 statements × latency**. Report both numbers.
2. **O(changed) per-commit JS work.**
   - A `ui` scalar change with a 50k collection loaded must take **< 5 ms** of JS from commit until emission, and **0** statements touching todos.
   - Find and remove every per-generation walk over unchanged loaded data: view-state rebuild, deep freeze (freeze only newly created objects), reconciliation (ADR-0021), selector re-evaluation of unaffected sources, and devtools compat-view materialisation.
   - Unaffected selector results must not even recompute: same input references mean the memoized projector is skipped.
3. **Memory.**
   - With the same 50k collection loaded, retained store heap must be **≤ 1.2× classic**.
   - Remove duplicate retention: keep one materialised copy per loaded path, and don't let the view state, PathCache, metadata WeakMaps, raw rows and the identity cache each hold separate trees.
   - Metadata should be compact: for example, keep entity positions in one Map per collection rather than per-object meta.
4. **Byte-budgeted LRU.**
   - Released sources are evicted by an estimated retained size, as well as by count.
   - Use `sqlite.cacheBudgetBytes`, default 4 MB.
   - A released 50k collection must be evicted immediately, because it is larger than the budget.
   - Report heap after the list is released: it should return close to the pre-load baseline.
5. **Correctness is preserved.**
   - All existing tests pass: memoization parity, ADR-0021 reference replacement, effects timing, devtools, bridge budgets.
   - Add regression tests for:
     - granular refresh, counting statements and checking reference identity of unchanged entities;
     - per-commit work, using a spy or counter on deep-freeze/reconcile calls so the test proves unchanged subtrees are not walked;
     - the LRU byte budget.

## Out of scope
The harness. The orchestrator will convert the `/todos` list to `query().page()` and re-run the Android benchmark.

## Done when
- Library tests and the build pass, and `npx ng build harness -c development,sqlite` passes.
- `npm run spikes` runs, and `docs/spikes/scale.md` has before/after tables.
- Add ADRs for the design changes, plus register rows.
- Tick "Phase 12 scale" in `CLAUDE.md` as the very last step.
- **No git commit.**
- Return a summary of at most 15 lines, including the before/after numbers.
