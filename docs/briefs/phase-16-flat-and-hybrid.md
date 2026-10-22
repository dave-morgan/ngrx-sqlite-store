# Brief: Phase 16 — Large flat objects and hybrid workflow state

Repo: `C:\Development\ngrx-sqlite-store`. **Start only after phase 15d is committed.**

Read these first:
- `CLAUDE.md`
- ADR-0038, 0048, 0051, 0057 and **0058**. ADR-0058 makes persistence the product, so there is no in-memory mode.
- ADR-0007, 0016, 0025 and 0026 (nested storage and promotion)
- The phase 15d report

Phase 15 covered large entity lists. This phase covers the other common state shapes:
- **(a) Large flat objects:** one-depth, high-rewrite feature state.
- **(b) Hybrid workflow state:** forms, statuses, loading indicators, wizard steps and event data, sometimes nested, alongside lists.

Measure nesting up to **depth 10, never deeper**.

## A. Harness workloads
Add these as new routes or pages, plus bench hooks on `window.__harness`. Each one needs identical shared code for classic and sqlite, and a reducer per implementation, as ADR-0011 requires.
1. **Flat.** One feature, `profile`, with **K top-level keys**, K ∈ {50, 500, 5000}. Values are mixed scalars and short strings.
   - Scenarios:
     - set one key;
     - set 10 keys in one action;
     - replace the whole object with 1% of the keys changed;
     - burst-type into one string key at 30 dispatches/s for 3 s.
   - Subscriptions:
     - a selector on one key;
     - a selector over the whole object;
     - a derived selector over 20 keys.
2. **Hybrid workflow.** A realistic multi-page form/wizard feature:
   - `status`, `loading`, `error`, `step`;
   - a `form` object with nested groups at depth 2–4, plus one branch going to depth 10;
   - `validation` maps;
   - an `events` log list, which is append-heavy;
   - a `drafts` entity list.

   Scenarios:
   - field edits at depths 1, 4 and 10;
   - loading/status transitions around an effect that simulates an API call;
   - step navigation;
   - form reset;
   - appending 100 events.

   Use both `on` tx handlers (a mix of returned partials and imperative `tx.set`) and an `onState` bridge handler. Mount the subscriptions the pages would really use.

## B. Metrics and acceptance
For each workload and size, measure everything under the ADR-0038 statistics (5 alternating trials) with the ADR-0051/0057 floors from the same session:
- dispatch → selector emit (p50 and p95);
- dispatch → DOM;
- burst throughput and queue depth;
- the end-of-burst latency;
- JS heap;
- device-total PSS;
- relaunch-ready, with the state persisted;
- first-ready.

Add a floor control where one is missing, for example a raw `executeSet` single-row update for a flat-key write. Report each metric as PASS, PLATFORM-BOUND, BRIDGE-BOUND or FAIL.

## C. Optimise within the rules
Fix every FAIL, keeping durability and notify-after-commit. Candidates, all of which must be **measured first**:
- **Row granularity for large flat objects.** A one-key write must touch one row. Check the identity cache and the diff on 5000-key objects, which must be O(changed), not O(K).
- **Inline-JSON promotion for frequently edited nested objects.** A field edit at depth 4 currently rewrites the whole inline JSON parent. Decide whether promotion thresholds or hints should consider write frequency (Q2 follow-up).
- **Group commits.** Coalesce dispatches arriving within one frame, or while a commit is in flight, into one transaction. Notification comes after that commit. This targets burst typing; keep per-action ordering, effects semantics and error isolation (ADR-0017). Record an ADR.
- **Selector cost** for whole-object subscriptions on 5000-key objects. Use structural sharing so unchanged keys keep their references.
- **Event-log append patterns** use array element rows (ADR-0006). Confirm an append is O(1).

## Done
- Report goes to `docs/benchmarks/android-flat-hybrid-<date>.md`, with the acceptance table.
- Every metric is PASS, PLATFORM-BOUND or BRIDGE-BOUND, or an ADR documents what remains and why.
- All library, tool and harness tests pass, `npx.cmd playwright test` passes, and the new e2e tests cover the new pages for both implementations.
- Record ADRs and register rows.
- Edit `CLAUDE.md` in place only, and tick "Phase 16" last.
- **No git commit.**
- Summary of 15 lines or fewer.
