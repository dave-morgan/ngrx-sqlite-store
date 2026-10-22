# Brief: Phase 15b — Close the remaining ADR-0038 FAILs

Repo `C:\Development\ngrx-sqlite-store`. Read these first:
- `CLAUDE.md`
- ADR-0038, the acceptance rule
- ADR-0040 to ADR-0045. ADR-0044 is your earlier draft of the residual gaps; update or supersede it.
- The committed 5-trial report `docs/benchmarks/android-parity-2026-10-22.md` at commit 766be01.

Your previous phase-15 run was interrupted by a usage limit. Its work is committed (766be01).

Since then the orchestrator found that **Capacitor's debug bridge logging** was skewing every sqlite metric. ADR-0045 records it. `capacitor.config.ts` now sets `loggingBehavior: 'none'`. With that change, sqlite numbers from 2 trials:

| sqlite (logging off) | 1k | 50k | classic bound (mean + 1 SD), 1k / 50k |
| --- | --- | --- | --- |
| firstReadyMs (seed included) | 717 | 3851 | 398 / 466 |
| relaunchReadyMs | 2046 | 1951 | 1473 / 1557 |
| heapTodosMb | 5.42 | 5.45 | 4.62 / 18.47 |
| pssTotalMb (after seed) | 241 | 247 | 225 / 244 |
| pssRelaunchTotalMb | 226 | 229 | 223 / 239 |
| toggleP50 | 26.0 | 28.6 | 7.5 / 38.8 |
| emitP50 | 4.9 | 4.6 | 0.1 / 0.1 |

## Tasks
1. **Re-baseline.** Run the full ADR-0038 statistical benchmark with logging off: both implementations, 1k/10k/50k, 5 trials.
   - Before the run, uninstall the existing APKs: `adb uninstall dev.ngrxsqlite.harness.sqlite` and `.classic`. Your earlier builds used a different debug keystore and fail install with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`.
   - Produce the acceptance table with verdicts. **Re-measure bridge RTT, intercept and bandwidth in the same session.**
2. **Relaunch-ready (+500 ms fixed): FAIL.** Profile on the device which steps of startup cost what: plugin open, `checkConnectionsConsistency`/`isConnection`/`isDBOpen`/`isTransactionActive`, migrations check, WAL pragma, non-persistent feature reseed (router), eager loads, first selector and query batches. Use timestamps exposed via `window.__harness` or performance marks.
   - Reduce sequential bridge round trips at boot. Merge the probes, skip checks a fresh process doesn't need, batch the initial queries into one call, and parallelise independent native calls.
   - Target PASS. If it stays above, prove BRIDGE-BOUND with calls_min × RTT plus the plugin's native open time measured on its own.
3. **First-ready with seed: FAIL at all sizes.** Break the time down: JS generation, encoding, bridge transfer at the measured bandwidth, native insert, commit, first render.
   - Optimise the parts the store controls: payload bytes per row, encoding cost, insert statement shape and prepared reuse, `PRAGMA`s inside the transaction where durability-safe (ADR-0042), and any post-seed read-back.
   - The classic seed runs entirely in memory, so a bridge-bound gap is legitimate. It must be justified as `bytes_min / bandwidth + calls_min × intercept`, using the measured `bytes_min` for the seed payload.
4. **Fixed footprint at small sizes (1k): FAIL.** Measure the platform cost of SQLite on its own. Add a harness bench mode, or a minimal sqlite APK variant, that opens an **empty** database with no data. Compare its PSS and heap against classic at 0 items.
   - Whatever that baseline costs is PLATFORM-BOUND. That is the hard limit of loading native SQLite and the plugin.
   - Any remaining store-attributable overhead must be reduced or explained. For JS heap, that means library code size and eagerly constructed structures.
   - Extend ADR-0038 with a PLATFORM-BOUND verdict category, defined as precisely as BRIDGE-BOUND.
5. **Toggle and emit.** Confirm they are BRIDGE-BOUND or PASS under the re-measured RTT and intercept. Attribute exactly the bridge calls the operation makes, and put the justification in the report.

## Constraints and done criteria
- No NgRx-compat regressions or public API breaks.
- All library tests, both builds, and `npx.cmd playwright test` must pass.
- Final report: `docs/benchmarks/android-parity-final-<date>.md`, with the full acceptance table.
- Every metric must be PASS, BRIDGE-BOUND or PLATFORM-BOUND. A remaining FAIL is allowed only with an ADR that shows the evidence and the attempts made.
- Add ADRs and register rows (README table: append rows in order, after the last row).
- **No git commit.** As the very last step, tick "Phase 15 parity" in `CLAUDE.md`.
- Summary of 15 lines or fewer containing the verdict counts.
