# Brief: Phase 15c — Platform-floor controls and the remaining store overhead

Repo: `C:\Development\ngrx-sqlite-store`. Read these first:
- `CLAUDE.md`
- ADR-0038 and **ADR-0051** (the floor controls, which amend ADR-0038)
- ADR-0046 to ADR-0050
- `docs/benchmarks/android-parity-final-2026-10-22.md`, including its startup trace

HEAD is 6b8a263. The emulator is `emulator-5554`. If benchmark APK installs fail on signatures, uninstall first.

## 1. Floor controls (do first)
Implement F_commit, F_seed(N) and F_open exactly as ADR-0051 §1 describes, using the harness bench hook or the empty-control mode.
- Feed them into the acceptance table using the ADR-0051 §2 rule.
- Show every control's samples in the report.

## 2. Reduce the store overhead the trace exposes
- **Initial query cost.** The 50k persisted relaunch spends about 100 ms on the `count({done:false})` transport. Today's `json_extract` with no index scans every row.
  - Add support for **indexes on query fields**. Two options to evaluate: lazily create expression indexes such as `CREATE INDEX IF NOT EXISTS ... ON nss_entity(coll, json_extract(data,'$.<field>'))` for fields used in `where` (validated field paths only, bounded in number), or declarative `query: { index: ['done', 'userId'] }` on the adapter.
  - Decide the policy, recording it in an ADR. Index creation needs a migration story and must not run during hot paths.
  - Measure the effect on relaunch, toggle and seed. Remember that indexes cost on insert.
- **Session-feature reseed churn.** Every relaunch, the persist:false router slice costs begin, delete batch, marker and commit (about 35 ms). Avoid disk writes when the stored value already equals the initial state, or keep session-scoped features out of durable storage entirely: a `TEMP` table or an attached in-memory schema, which needs no fsync. Keep ADR-0030 semantics.
- **Toggle at 1k/10k.**
  - Classic is 2.8 / 6.3 ms; SQLite is 17.5 / 18.9 ms p50, while SQLite at 50k is 15.6 ms and beats classic.
  - Trace one toggle on the device to account for every call and each JS span: commit, refresh, query batch and effect dispatch.
  - Remove anything above F_commit plus provably needed reads.
- **First-ready (seed).** Compare against F_seed(N) + F_open. Close any store overhead above it: encoding, chunking, extra reads, post-seed refresh.
- **Fixed JS heap at 1k:** +0.8 MB versus classic.
  - Audit what the sqlite harness bundle and heap contain that the classic one doesn't. Check whether the sql.js driver, jeep-sqlite, web-only code, devtools compat or spikes code end up in the Android build.
  - Lazy-load or tree-shake whatever isn't needed at startup.
  - Report the bundle size delta, the heap delta, and what remains.
- **PSS after seed at 1k/10k:** +14 / +18 MB, while 50k passes. Find out what grows in the app process: SQLite page cache, WAL shm, Java buffers or the bridge. If it's native SQLite cache, measure it against an F_seed control. That makes it platform-bound, or bound it with `PRAGMA cache_size` / `shrink_memory` after bulk writes, if that's safe.

## Done criteria
- Every metric is PASS, PLATFORM-BOUND or BRIDGE-BOUND under ADR-0051.
- Any metric that still FAILs needs an ADR with evidence showing what overhead remains above the floor and what was tried.
- No NgRx-compat regressions; all library tests, both builds and `npx.cmd playwright test` pass.
- Final report goes to `docs/benchmarks/android-parity-15c-<date>.md`.
- Add ADRs plus register rows, appended after the last row.
- Edit `CLAUDE.md` in place only, because sed -i breaks the AGENTS.md hard link. Tick "Phase 15c" as the very last step.
- **No git commit.**
- Finish with a summary of 15 lines or fewer containing the verdict counts.
