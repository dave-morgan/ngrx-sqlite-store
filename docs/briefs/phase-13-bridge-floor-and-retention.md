# Brief: Phase 13 — Per-dispatch bridge floor and post-seed retention

Repo: `C:\Development\ngrx-sqlite-store`. Read these first:
- `CLAUDE.md`
- `docs/benchmarks/android-after-phase12-2026-10-21.md` (evidence)
- ADR-0018, 0029, 0031, 0032

Phases 1–12 are committed.

You may use the attached Android emulator. `adb` is at `%ANDROID_HOME%\platform-tools\adb.exe`, and device `emulator-5554` is booted.
- `tools/android-bench.mjs` shows how to build the APK, install it, attach Playwright over CDP (`webview_devtools_remote_*`), and drive the harness.
- Building the APK requires JDK 21: `JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`.

## A. Per-dispatch bridge floor
Every statement is one Capacitor bridge round trip, about 25–30 ms on the emulator. Today a trivial dispatch costs about 6 calls (~177 ms), while classic takes 0.1 ms.

1. **Driver capability.** Add an optional batch method to `SqlDriver`: `batch?(statements: { sql: string; params?: SqlValue[] }[], opts: { transaction: boolean }): Promise<void>`.
   - `CapacitorSqliteDriver` implements it with `executeSet` (plugin 8.x).
   - `SqlJsDriver` implements it directly.
   - **Lesson from the jeep-sqlite bug:** the plugin's internal "transaction active" flag must stay consistent. Never mix raw `BEGIN`/`COMMIT` strings with the plugin transaction API. Verify on web (jeep) **and** native.
2. **Write buffering.** Inside a store transaction, statements that don't need a result (INSERT/UPDATE/DELETE through RowWriter) are buffered.
   - Flush the buffer before any read in the same transaction, so the transaction still reads its own writes.
   - **Lazy begin:** if a transaction never reads, run the whole transaction as one `batch(..., { transaction: true })` call. That is 1 bridge call.
   - If the transaction does read, use begin, then the reads, then flush, then commit, with as few calls as the plugin allows.
   - Rollback semantics must not change: a throwing handler leaves no data.
   - The serial queue already rules out concurrent writers.
3. **Write-through committed cache.**
   - After commit, PathCache entries whose new value the transaction knows exactly adopt that value directly. This covers values written via `tx.set`/returned partials and entity rows written whole. No read-back happens for them.
   - Re-read only what the transaction cannot know: SQL-level bulk operations whose results weren't materialised, and query sources (`count`/`page`/`ids` must re-run).
   - Keep ADR-0021 reference semantics and the existing staleness guarantees.
4. **Identity/committed-cache reads inside the transaction.**
   - `tx.get` and entity `mapOne`/`updateOne` must be served from fresh committed cache entries when they exist, with no read.
   - Today a toggle reads the row first. When the collection or row is cached and fresh, it must not.
5. **Budgets.** Measure bridge calls (driver method invocations, where `batch` counts as 1) and add them to `bridge-cost.spec.ts`:

   | Scenario | Budget |
   | --- | --- |
   | Scalar `ui` set, its selector subscribed and fresh | ≤ 1 call per dispatch, including refresh |
   | Toggle one todo, row not cached, with a `count` query subscribed | ≤ 3 calls |
   | Toggle one todo, row cached | ≤ 2 calls |
   | Seed `setAll(50k)` | O(batches) as today, but no more than 1 call per 900 params |

   Update `npm run spikes` scale/bridge-cost reports with before/after numbers.

## B. Post-seed retention (device)
On the device, sqlite heap after seeding is 35 MB at 50k. That is above classic, even though `/todos` only materialises 100 rows through query selectors. On relaunch, with no seed in the session, it is 14 MB. Something retains the seeded objects.

1. Write `tools/heap-retainers.mjs`. It attaches over CDP, forces GC, takes `HeapProfiler.takeHeapSnapshot`, and parses the snapshot. Report:
   - object counts per constructor/shape;
   - the **retainer path** from a GC root to a sample retained todo, for example one whose `title` string contains `#12345`.
2. Run it after seeding 50k on the sqlite build and identify the retainer. Suspects to confirm or rule out, without assuming any of them:
   - `ActionsSubject` keeping the last action, the 50k-row `Seed Loaded` payload;
   - devtools lifted state;
   - the tx identity cache or entity transport buffers outliving the transaction;
   - PathCache or LRU accounting;
   - bridge result strings;
   - effects.
3. Fix library-side retention. If the cause is NgRx-mandated, for example `ActionsSubject` being a `BehaviorSubject`, document it rather than break compatibility, and propose a harness-level mitigation in the summary. Do not edit the harness.
4. Add a Node-level regression test where possible, such as a WeakRef/FinalizationRegistry check under `--expose-gc` in a spike.

## Done when
- Library tests and the build pass, and `npx ng build harness -c development,sqlite` passes.
- Record ADRs for design changes, with register rows.
- Tick "Phase 13 bridge floor + retention" in `CLAUDE.md` as the very last step.
- **No git commit.**
- Return a summary of 15 lines or fewer containing before/after bridge-call counts and the identified retainer path.
