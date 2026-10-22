# Brief: Phase 15f — Decompose the residual large-list gaps

Repo `C:\Development\ngrx-sqlite-store`, HEAD f180cbf. Read these first:
- `CLAUDE.md`
- ADR-0038, 0051, 0057, 0062, 0063, 0064, **0065**
- `docs/benchmarks/android-parity-15e-2026-10-23.md` and `android-parity-15e-evidence-2026-10-23.md`

The baseline is 15e clean: **10 PASS / 9 PB / 0 CB / 14 FAIL**.

15c–15e tuned parameters and barely moved the result. 15f changes method. For each gap, **morph the floor control into the store one feature at a time** and measure each step on the device. That locates the cost, and only then do you fix it. Keep the same hygiene rules as 15e: final acceptance runs only on a freshly rebooted emulator-5554 after a 60-second settle, with nothing else running.

## A. 50k seed: native time is about 2.2 s regardless of sorting, cache or indexes; F_seed is about 0.83 s
15e showed that SQL-side tuning makes no difference, so the cost is probably in transport or row encoding. Build a ladder tool, `tools/android-seed-ladder.mjs`. Every step writes the same 50k harness todos inside one transaction on a scratch DB, with 5 runs per step in alternating order. Record native elapsed, executeSet count, payload bytes and the JS encode time for each step:
0. the exact F_seed statement and payload shape;
1. the same rows, but with the store's JSON-in-JSON encoding (entity data as an escaped string inside the transport JSON);
2. the same as step 1, but using `json_each` over a single text parameter instead of the floor's binding shape;
3. adding a `json_extract` call for each derived column (pos, sortkey, and the done/userId expressions);
4. adding the `(coll,id)` TEXT key `WITHOUT ROWID`;
5. adding the `(coll,pos)` and `(coll,sortkey,pos)` indexes and the expression indexes;
6. the full production `RowWriter` path.

Then fix the largest steps. Candidates:
- a transport shape with no double escaping, such as binding entity JSON as a plain string column;
- computing derived columns in JS so SQL doesn't re-parse each row;
- JSONB, if the device's SQLite version is 3.45 or later (check `sqlite_version()`);
- a schema change with migration, if step 4 or 5 dominates.

Every change must keep:
- RowWriter caps;
- query and index semantics (ADR-0027 and ADR-0053);
- atomicity.

Record an ADR. The target is PLATFORM-BOUND for 50k first-ready, and 10k as well.

## C. Toggle: 15e trace shows a todo commit of 5.7–11.6 ms, with one outlier at 81 ms, against an F_commit p50 of 3.7 ms
1. Ladder: start from F_commit's exact statement and add the store's real transaction one step at a time:
   - BEGIN plus the todo UPDATE on `nss_entity`;
   - the index maintenance for that row;
   - any `nss_meta` or `nss_node` writes in the same commit;
   - COMMIT.

   Make sure F_commit and the store run on the same DB with the same pragmas. Report `PRAGMA synchronous`, `wal_autocheckpoint` and `journal_size_limit` for both.
2. Find the cause of the outliers: auto-checkpoint inside the commit, the ADR-0064 post-bulk checkpoint, or GC. Measure moving WAL checkpoints out of the commit path:
   - set `wal_autocheckpoint=0` and run a PASSIVE checkpoint when the queue is idle, after a page threshold;
   - keep the ADR-0064 TRUNCATE+shrink, but run it only on idle.
3. **Durability decision.** Measure `synchronous=NORMAL` in WAL mode against the current level.
   - NORMAL is crash-safe for app and process crashes; only an OS crash or power loss can lose the last commits.
   - Android's own `SQLiteDatabase` defaults WAL connections to NORMAL.
   - If you adopt it, write an ADR stating the exact durability guarantee, and run F_commit at the same level so the floor stays honest. You may adopt it only if it's the platform-standard guarantee; never `synchronous=OFF`.
4. Use the 15e span tool to cut the commit-to-DOM span (5–15 ms), measuring each change first.

## B. Relaunch: 82–160 ms uncovered with prewarm
Trace the critical path with prewarm on. For each plugin call and each Angular bootstrap phase, record its start and end and what it waits on, then produce a dependency graph (a text table). Remove any wait that isn't a real dependency. In particular, look for anything that serialises the eager-feature preload after the bootstrap work it doesn't depend on.

## D. 1k heap: 0.57–0.75 MB of live state beyond the empty-store code delta
Take post-GC heap snapshots for sqlite and classic at 1k, and the empty-store sqlite snapshot. Diff them by constructor and retainer path using `tools/heap-retainers.mjs`. List every store-owned structure larger than 20 KB, such as PathCache entries, LRU, query sources, identity caches, change journals, frozen copies or closures. Remove or shrink each one that isn't needed after first render; for example, drop the seed payload and the identity cache after commit. Measure each change.

## E. Native PSS: 10k post-seed is 9.8 MB uncovered, 1k relaunch is 1.2 MB
Use `dumpsys meminfo -d` and `showmap` (or `/proc/<pid>/smaps` via run-as) to attribute native growth to libsqlite / malloc, Java, WebView and graphics, comparing the store with F_seed. If SQLite's malloc dominates, try:
- the soft heap limit (`PRAGMA soft_heap_limit`);
- a lookaside or page-cache bound for this connection only.

Measure the latency cost of each.

## Rules
- Fix only what a ladder step has located.
- Reject any change that doesn't show a repeatable win over at least 2 reversed sweeps.
- Keep the NgRx compatibility rules, notify-after-commit and the persistence semantics.

## Done
- Every large-list metric is PASS, PB, BB or CB, or an ADR proves it impossible with ladder evidence.
- All tests pass: library, tool, harness, and `npx.cmd playwright test`. Library and both APK builds pass.
- The report goes to `docs/benchmarks/android-parity-15f-<date>.md` and must come from a clean session. The ladder data goes in `docs/benchmarks/android-ladders-15f-<date>.md`.
- Add ADRs and register rows.
- Edit `CLAUDE.md` with a Python in-place write (`r+`), **not** the Edit tool, `sed -i` or a rewrite, because AGENTS.md is a hard link. Tick "Phase 15f" last.
- No git commit.
- Summary of 15 lines or fewer.
