# Brief: Phase 15 — Q17 and performance parity with classic (ADR-0038)

Repo `C:\Development\ngrx-sqlite-store`. Before starting, read:
- `CLAUDE.md`
- **ADR-0038**, which is the goal
- `docs/open-questions.md` Q17
- `docs/benchmarks/android-after-phase14-2026-10-22.md`
- ADR-0029, 0033 and 0037

HEAD is 875bd4d plus the docs for this phase.

You may use the Android emulator. It is `emulator-5554`, booted headless with AVD `Pixel_9_Pro`. If it is unhealthy, run `adb emu kill` and reboot with `%ANDROID_HOME%\emulator\emulator.exe -avd Pixel_9_Pro -no-window -no-audio -no-boot-anim -no-snapshot-save`. JDK 21 is at `C:\Program Files\Android\Android Studio\jbr`.

## A. Benchmark statistics and bridge microbenchmark (tooling, do first)
1. Extend `tools/android-bench.mjs` with:
   - `--trials N` (default 5), alternating the implementation order as ADR-0038 §1 describes;
   - mean and SD per metric;
   - the ADR-0038 acceptance table at the end of the report.

   Per-trial raw data goes in the `<details>` JSON. Keep `--skip-build`. Install both APK flavours **once** per implementation phase, or with different application ids if you want to avoid reinstalling; your call, document it.
2. Add a bridge microbenchmark to the sqlite harness Diagnostics page, or as a hook on `window.__harness`.
   - It measures `echo` round-trip time (p50 and SD over 200 calls).
   - It measures bandwidth for `executeSet` payloads of 64 KB, 256 KB, 1 MB and 4 MB, as a throughput fit.
   - You MAY add a small `harness`-side `bench` hook for this. It is the one allowed harness edit in this phase, besides e2e. Keep it out of production UI, behind `__harness`.
3. The acceptance table uses those measured values. For each BRIDGE-BOUND verdict, write the `calls_min`/`bytes_min` justification in the report.

## B. Q17: post-bulk-write memory
After a 50k `setAll` in one session, the device-total PSS is +68 MB versus classic, all of it in the **app** process (Java plus native). It persists until the process restarts.

1. Profile it first. Run `adb shell dumpsys meminfo <pid>` before and after the seed to break it down by Java heap, native heap and other. You can force a GC with `adb shell kill -10 <pid>` or `am send-trim-memory`.
2. Fix it. Likely candidates:
   - chunk bulk writes into bounded `executeSet` payloads, e.g. ≤ 256 KB to 1 MB per call, still inside **one** SQLite transaction;
   - avoid holding the whole statement array in JS while it is sent;
   - check whether the plugin's Java side keeps results.

   Measure the peak and the after-GC values.
3. Target: device-total PSS after a 50k seed passes ADR-0038 against classic.

## C. Close the remaining gaps
Run the full statistical benchmark: 3 sizes, 5 trials. For each **FAIL**, investigate and fix library-side, then re-run.

Known suspects:
- **First-ready with seed at 50k:** 6.1 s vs 0.4 s. Bulk-write throughput includes JSON encoding, row building, payload size and SQLite insert speed. Prepared statements via `executeSet` reuse, `PRAGMA` tuning inside the transaction, and smaller row JSON are all fair game. Bridge bandwidth is a legitimate BRIDGE-BOUND bound once measured.
- **Relaunch-ready:** 2.3–2.5 s vs 1.4–2.0 s. Open cost, migrations check, seeding of non-persistent features, and the first queries.
- **Emit and toggle:** check whether they now fit within classic + 1 RTT.

Also allowed, if justified in an ADR: driver-level `PRAGMA`s such as `journal_mode=WAL`, `synchronous=NORMAL`, `temp_store=MEMORY` and `cache_size`, provided durability semantics are documented.

## Constraints
- No public API breaks and no NgRx-compat regressions. All tests pass: `npx.cmd ng test ngrx-sqlite-store --watch=false`, both builds, and `npx.cmd playwright test` (26 e2e).
- Record ADRs for design changes, with register rows. Mark Q17 resolved.
- Write the final report to `docs/benchmarks/android-parity-<date>.md` with the full acceptance table.
- **Do not git commit.** As the very last step, tick "Phase 15 parity" in `CLAUDE.md`.
- Finish with a summary of 15 lines or fewer: the acceptance table verdict counts (PASS / BRIDGE-BOUND / FAIL) plus any remaining FAILs and why.
