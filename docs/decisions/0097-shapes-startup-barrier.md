# ADR-0097: Wait for harness startup before shapes setup navigation

Status: Accepted for measurement correctness (Agent, 2026-10-27).

## Failure evidence
The first16j acceptance attempt saved only eight complete rows: SQLite trials1and5 timed out180seconds waiting for the requested flat-key count. Its printed2PASS/0PB/84FAIL is invalid. Original raw rows/report/logs are preserved both at their original paths and `.tmp/16j-incomplete-20261027-1915/`. Trial1 had completed K50andK500; trial5 K50. Original tool did not export those partial-row objects, so only log summaries of those sections survive; no claim of full raw recovery. The list16L4 stage never started. Parent stopped before repair; leaked child browser sessions were then closed/stopped.

Device state after failure: localStorage correctly requested500keys, but flat count was empty and __harness.ready absent. Retained logcat shows fresh metadata reads before migration followed by stale-connection creation, locked database and failed beginTransaction. The benchmark waited only for __harness hook installation, which is an app initializer and can precede asynchronous store bootstrap. Navigating at that point can interrupt migrations/transactions. This is a real interrupted-startup failure, not evidence for relaxing acceptance.

On unchanged16jAPK, three diagnostic fresh-start cycles (K50/500/5000) all observe hook installation while ready=false (~1049/1158/1144ms). Waiting for readiness plus settle completes at~3280/3446/3409ms; subsequent shapes navigation reaches the exact requested key count in all three. `.tmp/16j-setup-barrier-proof.json` retained. These diagnostics are not acceptance.

## Decision
Before setup navigation, wait for __harness.ready and then settle queued work. This occurs outside timed shape actions. Apply the same barrier to initial flat/workflow and persisted-workflow setup. Relaunch-ready still measures document timing, so historical comparison must disclose the changed startup protocol. No app/library/APK, workload, floor or acceptance allowance changes.

Journal every completed flat section and full trial immediately to JSONL, including failed partial rows. Close browser connections in a finally block. Validate exact paired trial coverage and requested workloads before reporting acceptance; incomplete runs reject rather than print plausible verdicts. Record APK/session/control hashes separately. Refuse measurement output overwrite.

Browser-backed readiness regression fails with the original hook-only wait (ready=false,persisted=false) then passes with barrier. Completeness regression rejects missing/duplicate/incomplete groups; verified red/green. All23tool tests pass. A temporary diagnostic module import-path error occurred before device work and is retained separately; it yielded no samples.

## Recovery and limitations
Keep the eight old complete rows and failure evidence separate. Restart both implementations as16j2 under the corrected setup protocol with the SAME frozen16jAPKs and new matching empty controls, then sequential list16L4. This is a protocol repair after observed failure, not an unchanged-code variance hunt. Do not combine old and new setup protocols. Full goals remain unmet. The native interrupted-reload lock is not claimed fixed in production; this change prevents benchmark setup from tearing down initial startup mid-transaction.

ACTIVE corrected16j2 acceptance `.tmp/p16j2-accept.ps1` PID32492, logs `.tmp/p16j2-accept.stdout.log/.stderr.log`; fresh empty control and paired shapes, then sequential16L4. Frozen16jAPKs unchanged, no rebuild. Old16j incomplete data stays separate.

Amended by ADR0098: __harness.ready is todos-specific and is not the final general startup barrier. Use hook+settle and normalize the intended50-row background seed before shapes setup navigation.16j2 incomplete results remain preserved.
