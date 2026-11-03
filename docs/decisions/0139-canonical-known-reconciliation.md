# ADR0139: reconcile known pointer metadata and order during sharing

Status: Full16bn/16L24 acceptance FAILED;16bm unaccepted for retention, scope-isolation investigation next. All gates open.

ADR0138's canonical prewalk is rejected after16bl2 diagnostic adversity. The preserved14 regression cases still describe a baseline cache metadata/order bug. The measured reports do not establish source causality. Source inspection independently shows that canonicalKnown traverses pointer objects, creates ordering intermediates and then calls share, which traverses them again.

Use an opt-in internal reconciliation mode in view-state.share, only at PathCache's complete-known-write splice. Keep the original changed-child-position ancestor widening. Ordinary share callers and SQL/query/view publication keep their existing behavior.

For a matching physical-path NodeKind.Obj with childPos, traverse keys in canonical map order directly into the existing reconciliation result. Normal object construction normalizes integer keys; existing assign protects own __proto__ properties. Compare prior canonical positions and resulting enumeration before selecting an old identity. A metadata-only change must select a fresh object before metadata adoption. Reconcile descendants before freezing each new parent. A previous null/scalar cannot take the ordinary freezeTree shortcut for a canonical pointer object, because nested canonical ordering still needs reconciliation. Canonical pointer children use their physical escaped paths; mismatched-path metadata is not trusted. Arrays/entities/JSON and noncanonical branches retain the original sharing behavior.

This removes the independent canonicalKnown recursion, dummy ordering object, changed-child map and intermediate reordered copies. It adds no retained cache, schema, Store API, read-completeness shortcut, SQL, FIFO bypass or notification change. Traversal removal is a source property, not an app latency or heap claim. Pre-existing inactive-adoption ordering and aliased input WeakMap metadata ownership limitations remain explicit.

Alternatives: keep the duplicate prewalk (rejected); repair after putMany (requires another traversal and spine reconstruction); opt-in canonical reconciliation in the existing traversal (chosen). Do not broaden reconciliation for unrelated SQL or query callers.

Validation: reproduce the existing correctness failures against the exact baseline; retain all14 tests and add direct coverage for from-null nested canonicalization, metadata-only identity isolation, unchanged siblings, mismatched physical paths and production freezing. Obtain independent review. Run all library/tool/harness/E2E/build checks; freeze new source/APK; run six mandatory50kguards against15aa and four reversed matched standard50k reports under16bm/lp36. Compare all11 channels and all adverse results. Full fresh matched shapes/lists only if warranted. No unchanged acceptance variance retry, extra CPU/heap capture, floor broadening or commit. Both goals and mean/heap debt remain open.


Host validation: exact baseline reproduces10FAIL/4PASS across14 retained cases; integrated candidate14PASS, expanded21 focused cases and full465lib/40tools/1harness/30E2E/library+APKbuild PASS (`.tmp/16bm-validation-finalization.json`). Initial TS narrowing errors remain in first/second green-named logs and archived source; they are not treated as genuine RED. Independent source review found no blocker. Root restored the ordinary scalar/incompatible pre-metadata fast path; final all465 pass. Object sharing still adds unmeasured mode/metadata checks; no ordinary operation-equivalence claim.

Frozen APK `a3dcc5428253d60109b8e06052403e0531818b160af7bb99fa77e34821ba5e69`,11 source contexts and prepared28 runtime source/tool/environment hashes are bound by preflight. Host evidence: `../benchmarks/android-canonical-known-reconciliation-host-16bm-2026-10-31.json`. Device work, app gain, retention and mean/heap debt are pending.


## Targeted device outcome

16BM_DONE/genuine parent0 and five scoped boots0. Independent audit verifies all six mandatory guards/four reversed50k reports/120toggles800emits/all11metrics and raw statistics/provenance. Post465library/40tools/1harness/30E2E/librarybuild pass; frozen APK not rebuilt. Relaunch lower both orders; heapRelaunch/toggleP95/emitP95 adverse both. All other point and raw-array deltas, including adverse means, are preserved in `../benchmarks/android-canonical-known-reconciliation-app-16bm-2026-10-31.json` and Markdown. All three guard pairs lower, aggregate-56.733333ms within summedSD57.091560; no equivalence or causal startup benefit claim. Fewer opens are inherited marker-driver behavior, not new canonicalization work removal.

Correctness repair and source-proven duplicate-pass removal warrant the first full fresh matched acceptance16bn/16L24, with all adverse channels and historical mean/heap debt open. No retention/general app gain/new baseline/floor/extra CPUheap capture is claimed. All28 original tracked source/tool bytes are archived; do not overwrite prior raw/verifier evidence. The offline audit phase-filter assertion and correction are preserved separately.


First full acceptance started10:01Oct31 under session16bn-accept-1793404909, actual parent44684. The initial scoped reboot/60-second settle, both actual installed APK hashes, all37 runtime/helper hashes,11contexts and four warmups are verified (`.tmp/16bn-setup-progress-verified.json`). Fresh paired empty controls are progressing, followed by shapes and sequential16L24 controls/lists. Both goals, retention and mean/heap debt remain open. No source/APK rebuild or workload/floor/capture change. A new offline list-verifier scope error was caught by a fixture before preflight; original source, genuine RED and GREEN are preserved in `.tmp/16bn-offline-verifier-preflight-fix.json`. Final helper hashes were frozen before measurement.


Completed16bn shapes independently verify1PASS/52PB/33FAIL(53/86); all five heap data-parity checks fail. All86 means/adverse comparisons against retained16av,provisional16ay,rejected16bf/16bj and raw/control/component evidence are preserved in `../benchmarks/android-canonical-known-reconciliation-shapes-16bn-2026-10-31.json`, Markdown and shapes-components JSON. Five means exceed summedSD versus16av; code components observationally track heap movement, without source causality or dismissal. First two fresh16L24 controls(code30rows,floors3points) are verified; list pipeline remains active. No full retention or mean/heap guard clearance; keep the measured source/tools unchanged until genuine parent/list completion.


## Full acceptance outcome (supersedes pending status)

16BN_ACCEPT_DONE/genuine parent and16L24 list exits0; all119 metrics,37 source/tool/helper hashes and eleven contexts verified. Lists29/33(4FAIL), shapes53/86(33FAIL); all five shape data-parity checks fail. Retained16L20 comparison has1k emitP50+0.14ms above summedSD0.138438258; shape means retain five adverse-over-SD results versus16av. Changing fresh controls and classic trial movement qualify historical comparisons without dismissing guards or establishing source cause. Post465lib/40tools/1harness/30E2E/librarybuild PASS; frozen APK unchanged.

Full acceptance FAILED;16bm is unaccepted for retention and the16av/16L20 performance reference stays unchanged. All raw/source/APKs, adverse comparisons and controls are preserved in `../benchmarks/android-canonical-known-reconciliation-acceptance-16bn-2026-10-31.json` and Markdown. The independent audit supplied verified interim arithmetic findings then hit a usage limit before its final recommendation; no completed final child review or provider/model fallback is claimed. Investigate known-pointer-only scope isolation under a new revision; do not repeat unchanged acceptance or infer source causality. Both goals and mean/heap debt remain open.
