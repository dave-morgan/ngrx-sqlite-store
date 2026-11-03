# Canonical known pointer values implementation plan

Goal: repair the six reproduced baseline metadata/order failures without16bk's extra structural SQL reads.

Architecture: keep original leaf splicing and only widen changed-position pointer parents; canonicalize the selected complete known object before existing share/putMany. Trust only matching physical metadata paths. Record changed nested pointer metadata in existing replacement hints. No retained root cache or SQL/schema/write/FIFO/notification change.

Tech stack: Angular22, TypeScript6, actual sql.js storage tests and existing Capacitor Android harness. User authorizes inline iteration and explicitly forbids commits; no approval/worktree/commit step is added.

1. Preserve16bk raw/source/APKs/provenance and postchecks, restore PathCache exact baseline. Done by `.tmp/16bk-reject.py` and `16bk-rejection-finalization.json`. Watch eight baseline tests fail6/8 in `.tmp/16bl-baseline-red.log`.
2. Extend `reducer/canonical-cache-metadata.spec.ts` with addition/delete-readd/exact-reorder no-query assertions and escaped/integer/own-prototype key coverage. Watch16bk fail only the three read-free cases: `.tmp/16bl-readfree-red.log` has3FAIL/9PASS. All rejected source remains archived; no device run for this host check.
3. Execute the complete source transform `.tmp/16bl-implement.py` against `.tmp/16bi-source-baseline/path-cache.ts`, with backup and byte assertions. The script contains the full implementation. Run `npx.cmd ng test ngrx-sqlite-store --watch=false --include=**/canonical-cache-metadata.spec.ts`, expecting12PASS, then full library tests. Fix failures from their cause and preserve every earlier log/version.
4. Independent read-only source review checks matching paths, canonical map order, immutable old metadata, unchanged atomic containers/scalar hot path and absence of new SQL. Resolve concrete findings before freeze. Run40tool/1harness/30E2E/library+APKbuild checks sequentially, saving actual exits and hashes. Freeze only verified source/APK; do not rebuild during measurement.
5. Fresh16bl mandatory six50kguards vs15aa, unchanged300s untimed waits, then verified coldboots+60settle A1/B1/B2/A2 matched reports vs16aw. Bind actual APKs, source/tool/trace hashes, sessions and genuine root exits. Independently verify all raw observations and both-order adverse metrics; full fresh acceptance only when warranted. No automatic retry, overwrite, extra capture, floor change or concurrent build/test/profile. Keep monitor enabled until both goals close.

## Corrected revision16bl2

The16bl run is suspended incomplete after a newly identified production shallow-freeze blocker, with actual root1 and2/6 guards preserved. Do not replay the completed16bl source transform or restart its device runner.

- Two production-mode cases reproduce2FAIL/12PASS after the measurement was safely stopped; `.tmp/16bl2-freeze-red.log` and `.tmp/16bl-correctness-stop/finalization.json` retain proof.
- `.tmp/16bl2-fix.py` has executed: helper child changes use a plain own-property copy and helper-created copies stay unfrozen until existing share/freezing. The earlier helper putMany and final Object.freeze are absent. Fourteen focused cases now pass; full library verification follows under a new log.
- Validate/freeze16bl2 under fresh files/APK, then six freshlp35 guards and four matched reports. Keep source/tools frozen during measurement. Preserve the16bl evidence and all earlier failures; no timing/retention conclusion from its incomplete pair.
