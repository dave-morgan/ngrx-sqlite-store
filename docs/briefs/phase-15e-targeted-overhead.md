# Brief: Phase 15e — Targeted fixes for the remaining large-list FAILs

Repo `C:\Development\ngrx-sqlite-store`, HEAD 779878e (phase 15d plus docs). Read these first:
- `CLAUDE.md`
- ADR-0038, 0048, 0051, 0057, 0060 (your 15d evidence) and **0062** (new: CODE-BOUND heap rule and startup code diet)
- `docs/benchmarks/android-parity-15d-clean-2026-10-23.md`, the **clean baseline for this phase**: a freshly rebooted emulator with nothing else running. It reads **11 PASS / 9 PLATFORM-BOUND / 13 FAIL**, the same as 15c. The 15d run's "11 FAIL" was contended noise, so judge your changes only against this clean baseline.

**Measurement hygiene (mandatory).** Run the final acceptance only after `adb emu kill`, a reboot, and a 60-second settle. No other emulator, build or test may run during it. A second emulator may exist in other work; **shut down `emulator-5556` before the final run** if it is running. Use the pipeline from `/tmp/run15d-clean.sh` with a fresh session id.

## Hypotheses to test, each measured before and after on the device

### A. Seed throughput (50k first-ready: 2,901 ms vs an allowance of about 1,004 ms)
Per ADR-0060, the store's 44 `executeSet` calls spend about 2,018 ms of native time for 9.35 MB. `F_seed` moves the same bytes into a 2-column `INTEGER PRIMARY KEY` table in about 831 ms. The gap is SQLite work specific to our schema. Measure each of these, both alone and combined:
1. **Insert in primary-key order.** Sort each bulk batch by `(coll, id)` (typed-id text order) before insert, so the `WITHOUT ROWID` B-tree appends instead of splitting pages. Assign positions from the original order first, so `ids` order is unchanged.
2. **Larger page cache during bulk writes only.** Inside the bulk transaction, set `PRAGMA cache_size=-16384` (or measured best) and restore it afterwards. Measure the memory cost too (see E).
3. **Index maintenance.** Expression indexes (ADR-0053) and the `(coll,pos)` index are updated for every row. For `setAll` of a collection over a threshold, measure deferring them: build after the insert in the **same transaction**, scoped to that collection if possible. If the indexes are global, measure rebuild cost against incremental cost. Durability and atomicity must hold, and readers inside the transaction must never see a missing index.
4. **Statement shape.** Compare the `json_each` + `json_extract` per column approach with bound multi-row `VALUES` (999-param chunks, many statements per `executeSet`). Pick the faster one per measurement.
5. **JS-side remainder.** About 760 ms of reduce/refresh happens outside native `executeSet`. Profile it and remove whatever isn't needed (post-seed refresh, duplicate encoding).

Target: PLATFORM-BOUND against `F_seed + F_open`.

### B. Relaunch (+363 / +383 / +490 ms; allowance 180 / 241 / 287 ms)
The first plugin call happens at about 1,663 ms. Before that it's all WebView and Angular boot; after it come 14–15 sequential calls.
1. **Early open.** Add a public `prewarmSqliteStore(config)` (or equivalent) that the app calls in `main.ts` *before* `bootstrapApplication`. It starts open, recovery, WAL verification, the schema and version checks and the session-feature reset, and later `provideStore` adopts the in-flight connection. The aim is to overlap native startup with framework boot. Document it in the README and add it to the harness `main.ts`, the one allowed harness edit; classic gets no equivalent. Keep the ADR-0030 and ADR-0046 semantics and error handling: a failed prewarm must surface exactly like a failed open.
2. **Batching.** Collapse the remaining dependent startup reads into as few calls as dependencies allow, for example one query batch for the version markers, the catalog and the first query sources.

Target: PASS or PLATFORM-BOUND against `F_open`.

### C. Toggle at 1k/10k (p50 +20.1 / +17.5 ms; p95 +56.8 / +46.2 ms)
Two native calls happen, which is optimal. Commit-end → DOM varies from 3.5 to 54 ms. CPU-profile five toggles at 1k with the profiler attached only for that run, and attribute every span:
- query patching;
- signal notifications;
- Angular change-detection scheduling;
- the effect's second dispatch, including encode, buffer and queue work on the main thread while the DOM update waits.

Remove anything above the floor. Ideas, each to be measured first:
- deliver notifications in the same task as the commit resolution, with no extra setTimeout or microtask hops;
- defer the effect dispatch's write preparation until after the notification microtask drains;
- avoid re-creating 100-row page arrays when one row changed.

### D. Heap at 1k (+0.44 to +0.96 MB): ADR-0062
- Do the startup code diet: lazy-load each module that isn't needed before first-ready. Report the before/after bundle and heap.
- Implement the **empty-store control** in `android-parity-profile.mjs` (`--empty-store`) and the **CODE-BOUND** verdict in `android-bench.mjs`.
- Add unit tests to the tool tests.

### E. Post-seed PSS at 1k/10k (excess over ADR-0057 allowance: about 2.3 / 7.9 MB)
Mostly native heap. Measure each of these after bulk writes:
- `PRAGMA wal_checkpoint(TRUNCATE)`;
- `PRAGMA shrink_memory`;
- a bounded `cache_size`.

Also measure their latency cost, and keep whichever pays for itself. Coordinate with A.2: restoring the cache size after bulk writes should release memory.

## Done
- Every metric is PASS, PLATFORM-BOUND, BRIDGE-BOUND or CODE-BOUND. Anything that remains FAIL needs an ADR with before/after evidence.
- All library, tool and harness tests pass, and `npx.cmd playwright test` passes.
- Final report goes to `docs/benchmarks/android-parity-15e-<date>.md` and must come from a clean session.
- Add ADRs and register rows.
- Edit `CLAUDE.md` in place only, and tick "Phase 15e" last.
- **No git commit.**
- Summary of 15 lines or fewer containing verdict counts and before→after for each of A to E.
