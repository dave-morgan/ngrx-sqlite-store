# ADR-0096: Build reducer partial entries only for changed keys

Status: Experiment (Agent, 2026-10-27).

## Located work
The16h K=5000 replace profile attributes approximately1.7ms/action to runHandlers. The existing partial path builds5000 Object.entries tuples then discards the unchanged entries; the scenario changes about50 keys. Fix9 scans Object.keys and reads each value once, building tuples only for changed entries. The same currentRoot/isCurrent comparison, prefetch, ordered set calls and notify-after-commit semantics remain. This is allocation removal, not a change to persistence or action batching.

The prior Node comparison9.36->8.88ms/action is inconclusive.398 library tests pass; the device comparison decides retention. Fix8 large-object copying was rejected and reverted; it is not part of this candidate.

## Active measurement
`.tmp/p16j-run.ps1` PID43276 (PowerShell), logs `.tmp/p16j.stdout.log/.tmp/p16j.stderr.log`: build, six alternating50k list probes (lp8) against15aa, then three rounds of16h/16j K5000 flatReplace and flatSetKeys CPU profiles,40 actions each. Do not duplicate or edit this runner. Each first-ready probe includes a300-second setup wait after a seeded reload; the five-minute interval is expected and is not measured first-ready time.

Candidate16j SHA256ced86e7dfb09ded71bc6185b6cc40438e6384fb6770d4c394adc416432ba94f2; shapes profile baseline16h ee06beff64a080a323b5ade340cb796c71284ec869e4ebda9422002a8c96c57c; list reference15aa6deb3638ed9d1f63cce4e7b14c4009e99f4fffd44de16f68941273c5ff3ffeff. Archives are under `.tmp/{16j,16h,15aa}-apks/sqlite.apk`.

Existing diagnostic output does not include APK hashes or raw scenario samples; provenance relies on the saved install script and archived APKs, and log summaries do not independently prove40 complete observations. CPU profiles perturb timing and do not constitute full shapes acceptance or native SQL CPU attribution. Preserve every raw output and report these limits when interpreting the comparison.

## Retention and gates
Verify all six list probes and all twelve expected profiles/logs, compare pairs and adverse results honestly. Retain only demonstrated benefit or proven redundant work removal, subject to ADR0091 list guard. A shared reducer-path change requires full list acceptance before closure. Shapes controls already approved by the user are recorded in ADR0093; no additional floor is authorized here. Latest verified list16L3 remains13PASS/14PB/3CB/3FAIL; shapes16h3PASS/57PB/0CB/26FAIL. Both goals remain unmet. No commit.

## Diagnostic result
Allsix probes/twelve profiles completed. Replace emit p50 A17.9/16.9/19.5 vsB16.9/17.3/17.6ms, mixed; sampled non-idle A431/426/477 vsB347/408/392ms, lower in allthree.10-key emit A13.5/15.8/16.2 vsB13.9/13.1/12.9ms, also mixed. This supports provisional retention for repeated sampled-work reduction; unprofiled shapes/full list acceptance still required. List transaction phases stable~796-811ms in candidate, baseline799-979ms; no demonstrated list regression beyond noise, no general speedup claim. [Complete evidence](../benchmarks/android-fix9-16j-2026-10-27.md).

Post-diagnostic398library/21tools/1harness/30e2e/librarybuild pass (`.tmp/16j-post-*`). Frozen measured APK unchanged. ACTIVE `.tmp/p16j-accept.ps1` PID40352: reboot+warmup, fresh empty-plugin controls and5paired shapes trials, then sequential full list16L4 acceptance (fresh controls, reboot-between). No overlapping work or automatic retry/overwrite. Both acceptance results pending.

First shapes acceptance INCOMPLETE: only8complete rows, SQLite1/5timeout; printed2PASS/0PB/84FAIL invalid. Original raw/report/logs archived `.tmp/16j-incomplete-20261027-1915`; partial flat sections were not exported by the original tool, only log summaries survive. ParentPID40352 and leaked children stopped before list16L4. ADR0097 repairs hook-before-ready setup navigation with readiness+settle barrier, journaling and completeness validation;23tools pass,3unchangedAPKfresh-start proofs reach requested keys. New16j2 paired protocol run will stay separate; original samples not discarded or merged. Production interrupted-reload lock remains a known limitation, not claimed fixed.

16j2 also incomplete: strictguardrejects5/10whole rows; JSONLpreservesallflatsections/failedrows. ADR0098 corrects todos-only marker and demonstrates500-vs50background mismatch. New16j3 paired protocolnormalizesbothbackgrounds to50beforetimedactions,useshook+settle startup andpreservesworkflowonrelaunch;25tools pass. ACTIVE `.tmp/p16j3-accept.ps1` PID22436,logs `.tmp/p16j3-accept.stdout.log/.stderr.log`;shapes then16L4, frozenAPK/no floorchange. Olddata notmerged or discarded; protocol-relatedmemorychangesarenotFix9gains.

Corrected16j3 unprofiled shapes VERIFIED10pairedrows/86recomputedmeans+sampleSD/verdicts/20controls/APK-session-journalprovenance:3PASS/47PB/0CB/36FAIL. K5000replace mean12.6ms (historical16h14.3), but reset25.44ms (historical11.4); all adverse data retained. Protocol/background differences prevent attributing changes solely to Fix9. Full16L4listcheck active; Fix9 remains provisional and neither goal met.

Full16L4 VERIFIED30/66/33/all4controls/6boots:12PASS/17PB/3CB/1FAIL; remaining10k emitP95 overallowance0.324ms. Reference15aaheapnotes increases~0.062-0.073MiB and paireddata~0.015-0.017MiB; guard remains open despite mostly better latency. Fix9 remains provisional, not closed under ADR0091. Post398lib/25tools/1harness/30e2e/librarybuild pass. Follow-up hash-verified20sample workflow diagnostics locate one materialization read before each reset write; append already one100-rowbatch/action. Full evidence/limits retained. No additional optimization or floor adopted.
