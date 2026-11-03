# Phase16t selector lease accounting experiment

The unchanged16rV8diagnostic sampled PathCache.recount. Source confirms every lease acquisition/release recomputes every entry against all active references. A regression with40existing siblings/20acquire-release cycles observed40reference-map scans before the fix,then0 after updating only the changed path's contribution. Ancestor absorption still fully recounts and correct3->2->1->0 releases are tested. Last query-journal release,LRU/idempotence,SQL/commit/notification semantics unchanged.

411librarytests/30e2e/librarybuildPASS,APKbuildpending. App benefit is unmeasured. Next mandatory50kguardvs15aa and reversed200emission diagnostics at1k/10k/50k vsfrozen16r,eachlegfreshboot. Keep all adverse data; no new floors or acceptance success claim. Full matched acceptance required before shared-path closure.

[ADR0103](../decisions/0103-incremental-selector-lease-accounting.md); [source attribution](android-emission-attribution-16s-2026-10-28.md). Latest verified lists16L8:14PASS/14PB/3CB/2FAIL;shapes16r1PASS/48PB/37FAIL. Both goals remain unmet. No git commit.

Validation complete411library/30e2e/library+APKbuildPASS. Frozen16tAPK33441a3e6a24fe8a88f8f4fb263658801f68b3ac78d0b8d8f6f7e5a1797b3e30. Diagnostic runner .tmp/16t-run.ps1 PID43340 ACTIVE:50kguard3A/3Bvs15aa,then4freshboot reversedlegs/200emissionsatall3sizes versus16r. Manifest/helpercapturehashes/session/boots/seed; verifierprepared. No application speedup or retention claim yet;no floor change/commit.

Diagnostic completed16T_DONE/exit0; independent verification6guardtraces/12emissionreports/2400finiteactions/4boots/actualinstalledAPK-session-DOMseed/scalarSQL,200finite native/overhead/raw-replay channels each. Guard15aa1233.1333SD14.6172->16t1234.3667SD7.0231ms; mean+1.2333ms iswithin sumSD21.6403,not a startup improvement. All observations and hash lineage preserved.

Candidate minus baseline16r mean differences(ms):

| Size | Pair | Emission | Native response | Non-native residual |
| --- | --- | ---: | ---: | ---: |
| 1000 | B1 ? A1 | -0.014000 | -0.009000 | -0.005000 |
| 1000 | B2 ? A2 | +0.011000 | +0.009000 | +0.002000 |
| 10000 | B1 ? A1 | +0.002500 | +0.014000 | -0.011500 |
| 10000 | B2 ? A2 | +0.015000 | +0.014500 | +0.000500 |
| 50000 | B1 ? A1 | -0.089000 | -0.058000 | -0.031000 |
| 50000 | B2 ? A2 | +0.132500 | +0.104000 | +0.028500 |

No repeatable application latency benefit: residualP50 remains~.3ms throughout;50k B1 improves while B2 worsens(totalP95baseline4.2->candidate4.9ms). Native response variation is also present,so no causal assertion that the lease change explains every adverse leg. All unfavorable data are retained. Native timings are response wall time,not SQL CPU. Raw replays follow wrapper restoration on harness data; next probe clears app. No acceptance/floor claim.

Provisional retention is justified only by the regression-proven removal of O(entries?references) redundant scans for one changed lease,with fewer repeated comparisons and no additional lifecycle cache. No broad application speedup/finalretention claim. First fresh full matched shapes16t/lists16L9 acceptance is prepared pending required post-device checks. Shared-path closure still requires0FAIL lists and guard review.

Post-device411library/25tools/1harness/30e2e/librarybuildPASS;frozenAPKnotrebuilt. First full matched acceptanceACTIVE .tmp/p16t-accept.ps1 PID12212: verifiedreboot/warmup/freshpairedemptycontrol+5pairedshapes16t,thenfull16L9fresh4controls+verifiedreboot+5pairedlists/reboot-between. Verifiersprepared for10pairedshapes/86metrics/20controls and30listobservations/66stats/33rawverdicts/all4controls/6boots/rootexit-scriptSHA. Results pending;bothgoalsremainunmet.

Fullshapes16t COMPLETE/independentlyVERIFIED1PASS/50PB/0CB/35FAIL(51/86qualified),vs16r49/86and16k56/86.10pairedrows/86recomputedmeans+sampleSD+verdicts/20controls/APK-session-controlhash/journal snapshots. All86before/after/adversecomparisons and heapcomponents in android-lease-accounting-shapes-16t-2026-10-28.json. NoSQLitemeanincreasebeyondsumSDvs16r;versus16k,K500tenkeyDOMp50+1.8ms>sumSD1.597242andworkflowheap+.016616MiB>sumSD.006343remainadverse.

K5000tenkey9.64->10.58ms,replace12.60->12.80,reset23.92->26.08,append12.64->13.06(allFAIL);appendP9538.00->39.54remainsPB. SingleemitP95atK50/500/5000andK500replaceDOMp50FAIL->PB,whileK50replaceemitP50andworkflowstepemitP50PB->FAIL. Cross-session workload/controlvariationpreventsclaimingeveryshiftwascausedbyleaseaccounting. Provisionalretention/listguardreviewremainpending.

List16L9 ACTIVE session16L9-audit-1793138618,30codecontrols+3floorpointscomplete/session-device-APKmatched;emptyplugincontrolsprogressing,thenrender/reboot/fivepairedlists. No build/test/profile/appeditduringdevicework. Bothgoalsunmet;monitorenabled.

OutcomeREJECTEDafterfull16L9:12PASS/17PB/3CB/1FAIL32/33 independentlyverified30/66/33/all4controls/6boots/rootEXIT0-scriptSHA. Remaining10kemitP955.82ms,.186622msoverallowance. Qualification improved but8SQLite means exceededcombinedSDvs16L8,so the listguard is not cleared. Nativecontrols and classicrelaunchalsomoved;no claim16tcausedallcross-sessionregressions. No repeated diagnostic latency gain was established. All33means/adversecomparisons/controlshiftsretainedin android-lease-accounting-lists-16t-2026-10-28.json.

Productionrecountrestoredwithtargetedassertedin-place edits,no gitcheckout. Candidate source/tests archived .tmp/16t-path-cache-candidate.ts/.tmp/16t-selectors-candidate.spec.ts;APKs/raw intact. Onlyperformanceassertionremoved;ancestor-absorptioncorrectnesstestkept.410librarytestsPASSpostrevert,otherrequiredchecksrunning. Frozen16r is nextcausalbaseline;no unchanged acceptance rerun to seek favorablevariance. Both goals remain unmet.
