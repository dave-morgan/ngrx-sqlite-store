# Canonical known reconciliation implementation plan

**Goal:** Repair active known-write pointer metadata and canonical ordering within the existing sharing traversal.

**Architecture:** An opt-in internal share mode handles complete matching-path known pointer objects. PathCache keeps structural-position widening and enables the mode only for known writes. All ordinary sharing callers remain unchanged.

**Tech stack:** TypeScript, Angular, Vitest, sql.js, Capacitor Android. Execute inline under the user's continuing authorization; no commit or new worktree.

- [x] Preserve16bl2 raw/source/APKs, independent audit, postchecks and ADR0138 outcome. Restore exact PathCache baseline; keep14 generic cases.
- [x] Run `npx.cmd ng test ngrx-sqlite-store --watch=false --include=projects/ngrx-sqlite-store/src/lib/reducer/canonical-cache-metadata.spec.ts` to reproduce baseline failures in `.tmp/16bm-baseline-red.log` before implementation.
- [x] In `selectors/view-state.ts`, add a scoped `canonicalKnown = false` internal share argument. Matching-path pointer objects use canonical childPos keys and physical escaped child paths. Prior null/scalar values reconcile as an empty object; compare metadata before old identity selection, recurse before freezing, preserve integer/own__proto__ behavior. Other callers and atomic branches stay unchanged.
- [x] In `selectors/path-cache.ts`, restore only the changed-child-position ancestor widening from archived16bl2. Replace the prewalk with `share(previous, next, entry.replaced, target, true)` at the complete-known splice.
- [x] Add focused direct tests in `selectors/known-share.spec.ts` for canonical nested values from null, equal-data changed metadata without mutating old state, unchanged sibling identity, mismatched physical metadata and deep production freezing. Preserve baseline/helper bytes and genuine RED/GREEN logs.
- [x] Run the focused cases, all library tests, and independent source review; address findings before freezing source/APK.
- [x] Run40tool/1harness/30E2E/library+APKbuild checks sequentially, fail-stop and archive logs. Freeze11source contexts (prior9 plus view-state and known-share tests), APK and hashes. No diagnostic test helper in the APK.
- [x] Prepare new16bm/lp36 runner/verifier from the completed16bl2 protocol with six300-second untimed guards then four distinct coldboot+60settle reversed standard50k reports. Bind all source/tool/environment/context/APK/session/boot/root hashes; no overwrite/retry.
- [x] Only after checks/review/preflight and actual-process inspection, launch the single diagnostic. Update hardlinked AGENTS in place and the existing30-minute monitor. No source/tool edits or test/build/profile beside measurement.
- [x] On genuine16BM_DONE/root0, verify all6guards/4reports/120toggles/800emissions/16percentiles/all11adverse channels, archive evidence, run postchecks and decide full fresh acceptance or a new source-supported investigation. Both goals and mean/heap guards stay open until actually satisfied.

- [x] First full16bn/16L24 verified genuine exits0/all119 metrics; post465/40/1/30/buildPASS. Full acceptance FAILED; source-supported16bo scope isolation next. Goals remain open.
