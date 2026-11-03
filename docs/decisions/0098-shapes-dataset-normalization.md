# ADR-0098: Route-independent startup and identical shapes background data

Status: Accepted for measurement correctness (Agent, 2026-10-27).

## Correcting ADR0097's marker
16j2 completed all flat sections but every SQLite workflow trial timed out before a complete workflow row. Completeness validation correctly rejected5/10complete rows and the parent stopped before list16L4. JSONL preserves every completed flat section and failed row; original raw/logs/provenance are archived under `.tmp/16j2-incomplete-20261027-1949`. Workflow values were assigned to the row only at the end, so earlier failed workflow sections were not exported; do not claim recovery of those values. The tool now assigns workflow storage immediately so later failures retain it.

The first barrier I added incorrectly used __harness.ready, a todos-summary observer, as a general startup signal. The saved failed-page state shows a healthy /todos page with500persisted todos while localStorage requests50; the observer waits for50total and never resolves. It is not evidence that the store is still opening.

Use the hook followed by await __harness.settle(): SqliteStoreCore.settle explicitly awaits initialize, queue/emissions/maintenance and engine drain. This waits for real store startup on any route without requiring a particular todo count. A browser-backed persisted-data/no-ready-marker regression failed with the old wait then passed. The original startup-completion and missing/duplicate/incomplete coverage regressions still pass.

## Background workload mismatch
A paired unchanged-APK diagnostic at50flatkeys finds classic37open versus SQLite338open; native SQL verifies SQLite has500todos although configuration requests50. Explicit benchSeed(50) produces37open on both, with SQLite SQL count50. `.tmp/16j-root-seed-proof.json` retains the evidence. SQLite persistence kept the initial500-row seed across setup document navigation; classic's fresh state followed the requested50. Earlier memory/latency comparisons therefore include a background-data mismatch and cannot all be attributed to library overhead.

Before the initial flat/workflow setup navigation, finish store startup, configure keys/seed and await the shared benchSeed(50) hook. This performs the same configured background workload on both implementations, outside timed actions. Do NOT reseed persisted workflow relaunch: only wait for startup/settle there, preserving workflow data.

Three unchanged-APK corrected setup checks reach50/500/5000keys (`.tmp/16j-normalized-setup-proof.json`). That file's __harness.ready.total remains the earlier initial500 marker and is not a post-normalization data count; direct native data verification is in the root-seed proof. All25tool tests pass, including red/green normalization regression500->50. No application/library/APK, floor or statistical allowance change.

## Reporting and recovery
Keep16j and16j2 incomplete samples and partial journals separate, never merge them into corrected acceptance. New16j3 uses fresh paired controls and both implementations under the corrected protocol, followed sequentially by list16L4. This is repair of observed setup/data errors, not an unchanged-code rerun seeking favorable variance. Disclose protocol differences when comparing16h/earlier reports; heap improvements caused by correct background data are NOT a Fix9 code-memory gain. No production interrupted-reload lock fix is claimed. Both goals remain unmet; no commit.

16j2 also incomplete: strictguardrejects5/10whole rows; JSONLpreservesallflatsections/failedrows. ADR0098 corrects todos-only marker and demonstrates500-vs50background mismatch. New16j3 paired protocolnormalizesbothbackgrounds to50beforetimedactions,useshook+settle startup andpreservesworkflowonrelaunch;25tools pass. ACTIVE `.tmp/p16j3-accept.ps1` PID22436,logs `.tmp/p16j3-accept.stdout.log/.stderr.log`;shapes then16L4, frozenAPK/no floorchange. Olddata notmerged or discarded; protocol-relatedmemorychangesarenotFix9gains.
