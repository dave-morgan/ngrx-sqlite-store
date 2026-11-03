# Stable publication index16af: candidate

Source investigation: PathCache.publish allocated and filled a new Map containing every non-query cached root on every publication, even when the root set was unchanged. Candidate reuses the existing private Map for stable membership and updates only changed values. Membership/ownership changes retain the prior full view rebuild and a new Map. All entries and currentView are updated before generation callbacks. No added cache, lease, schema, SQL, FIFO or StoreAPI change.

Regression red:420previous library tests pass; new test observes1discardedMap versus0required while confirming updated data, one generation and unchanged old view. Candidate green:421library tests pass (`.tmp/16af-library-red.log`/`green.log`). Baseline source saved `.tmp/16af-path-cache-baseline.ts`. Candidate not retained on performance grounds yet.

The broader reducer-returned-root reuse idea was deferred before implementation: validation of complete scalar data, accessor/mutation handling and multiple-commit journal ownership would add complexity and could retain unselected state.16af does not implement that idea.

Remaining validation and device measurements pending. Required sequence: tools/harness/e2e/librarybuild/APKbuild, then mandatory50kguard3A/3B versus15aa, then reversedA1/B1/B2/A2 freshboots+60settle/200emissions per1k/10k/50k. Exact installed APK hashes/session/seed/nativeSQL/finitechannels and all adverse results must be verified. Native wrappers/raw replays are diagnostic only, not SQLCPU/acceptance/floor. No CPUprofiler or additional heapcapture.

The proven allocation removal is small. No application latency improvement, guard clearance or final retention claim follows from the regression test alone. Fresh full matched list/shapes acceptance is required if evidence warrants retention.


Validation complete:421library/25tools/1harness/30e2e/library+SQLiteAPKbuildPASS. Frozen candidate6fce82b178cc7f8ecc37ddb62630fa3a119f2132f303b58b41ca2500403fc046. Source/test archive .tmp/16af-source. Diagnostic runner PID31628 started .tmp/16af-run.ps1, logs .tmp/16af-run.stdout.log/.stderr.log, manifest .tmp/16af-run-provenance.json. Mandatorylp20guard then reversed12emissionreports; allresults pending.


## Diagnostic complete
16AF_DONE genuine, parent exited; independent16af-verify and16af-compare passed6guards/12reports/2400finiteactions/4distinctboots/installedAPKhash-session-DOMseed/exactscalarUPDATE/native+overhead+rawchannels. Fullraw, verification and every adverse comparison preserved in the accompanying JSON. Guard APK provenance is install-script/archive lineage; emission APK hashes captured on device.

Guard15aa1426.9000 SD18.841178?candidate1444.033333 SD38.919704ms,+17.133333 within SDsum57.760882; pairs-26.4/-4.6/+82.4ms. No repeatable startup gain. Candidate-minusbaseline residualmeans1k-.0120/+.0315ms,10k-.0030/-.0090,50k-.0175/+.0190; residualP50 about.3ms, secondcandidate1k/50k about.4ms. Totalemissionmeans1k-.0845/+.0080,10k+.0015/-.0800,50k-.0605/+.0640. 50k firstpair emissionP95+.1ms adverse; allnative/raw channels also retained. Wrapper/JS/scheduling residual is not exact storeCPU or SQLCPU; rawreplays occur after wrapper restored on harnessdata.

No general workload latency benefit is established. Retain provisionally only for one discardedMap?zero per stablepublication, without added cache/lifecycle metadata. The10kresidual direction repeats but is very small. Post-device checks and fresh matched full shapes/list16L13 acceptance will evaluate retention and all mean/regression guards; no gate closure or application win claim. Frozen APK will not be rebuilt.


Post-device validation421lib/25tools/1harness/30e2e/librarybuildPASS; candidate source/tests byte-match archive; APK unchanged. Full acceptance active .tmp/p16af-accept.ps1 PID25284, stdout/stderr sameprefix; fresh emptycontrol and5pairedshapes ndroid-empty-16af-2026-10-28.json/ndroid-shapes-16af-2026-10-28.*, then sequential .tmp/16L13-audit.sh fresh4controls/full5pairedlists/rebootbetween. Verifiers16af-shapes-verify.cjs/16L13-verify.cjs and all-metric16af-accept-compare.cjs prepared. No accepted applicationwin/gateclosure/retention yet.


## Shapes16af verified; list16L13 pending
Shapes1PASS/52PB/0CB/33FAIL(54/86),independentlyverified10pairedrows/86means+sampleSD+verdicts/20pairedemptycontrols/APK-session-controlhash/journals. Compare retained16r49/86 andhistorical16k56/86. All86rawmean/adversecomparisons/controlmovement/heapcomponents in android-publication-index-shapes-16af-2026-10-28.json.

NineteenSQLite means exceed summedSDs versus16r, includingK5000PSS+4.950781MiB>sumSD3.884336. Verdictregressions500replaceemitP95/K5000burstendLag/stepemitP50 PB->FAIL. NativecontrolEmitP50also+1.36/+1.10/+1.26/+1.46ms(K50/500/5000/workflow),so no sourcecausalclaim. Qualificationcount is notguardclearance/generalworkloadgain. K5000single11.88/tenkey11.52/replace13.42/reset26.82/append14.40msallFAIL.

List16L13active:30codecontrolrows+3floorpoints/session-device-APK/finitearrays independentlyverified (.tmp/16af-list-controls-progress.json),emptycontrolsprogressing. Freshfull30observations/66stats/33verdicts/4controls/6boots/rootexit pending. Do not infer retention or fullgoalsfromshapesalone.


## Final outcome: rejected and reverted
16L13 genuineEXIT0/rootSHA/parentDONE,independentlyverified30observations/66means+sampleSD/33rawverdicts/4controls/6boots:11PASS18PB3CB1FAIL32/33. Remaining10krelaunch1611.78ms,over12.066218ms. SixSQLite means exceededsummedSDs versusretained16L8:1ktoggleP50+3.36,10kfirstReady+84.32/relaunch+183.86/emitP50+.36,50kfirstReady+199.40/relaunch+218.78ms. No such increases versusrejected16L12;sevenheapmeansabove15aa beyondsumSD. Every33list+86shapecomparison in android-publication-index-acceptance-16af-2026-10-28.json.

Native/controlmovementprecludessourcecausation;guardsremainunmet. Reject16af:Mapallocationremovalwithoutrepeatedworkloadbenefitdoesnotjustifyretentionunderunmetguards. ExactPathCachebaseline restoredinplace,source/tests/APKs/rawpreserved,onlyprivateperformanceinstrumentation/assertionremoved;publishedviewimmutability+generationcorrectnesstestkept. Postrevert421lib25tools1harness30e2e/librarybuildPASS(.tmp/16af-revert-checks.stdout.log16AF_REVERT_CHECKS_DONE). No unchangedbaselineacceptancevariancehunt. Next16ag targetsactualmultikeywritepath emptyinsertflush barriers,not Mapreuse.
