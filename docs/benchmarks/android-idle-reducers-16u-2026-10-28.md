# Phase16u idle reducer experiment

runHandlers previously returned a resolvedPromise even for no matching transaction handler,which core awaited per idle feature. New internal synchronous no-work result lets core skip that empty await;the ordered async matching body is retained. Foreign reducers still receive every action,all transaction handles and hooks remain,SQL/transaction/notification behavior unchanged. No lazy-handle lifecycle cache.

RegressionsREDPromiseinsteadundefined,thenGREEN;foreignunknownactionstillawaited.412librarytestsPASS,e2e/build/deviceworkpending. Baselinefrozen16r after16trejected/reverted;its raw/source/APK artifactsremain. No measured application speedup,newfloor or retention claim. Required50kguardandreversedmeasurements next. Fullmatchedacceptance requiredbeforeclosure.

[ADR0104](../decisions/0104-skip-idle-reducer-awaits.md). Latest full16L9onREJECTED16t12PASS/17PB/3CB/1FAIL;retained baseline16r full16L8 14PASS/14PB/3CB/2FAIL. Shapes16t51/86alsoonrejectedbuild. Bothgoalsremainunmet.

Validation412library/30e2e/library+APKbuildPASS. Frozen16uAPK9c04d40dacd93cb2db8c0a141006a62a0ac312b4457cdc27e397e3295dfc83cc. Diagnosticrunner .tmp/16u-run.ps1 PID43784 ACTIVE:50kguardlp14vs15aa,thenreversed4freshbootlegs/12scalar-emissionreportsagainstfrozen16r(16trejected). Actualinstalledhash-session-boot-seed/nativechannelsverifiedbyhelper;finalverifierprepared. No measured application speedup or retention claim.

Diagnostic16U_DONE/exit0,independentlyVERIFIED6guard+12reports/2400finiteactions/4distinctboots/installedhash-session-DOMseed/scalarSQL/200finite native-overhead-rawchannels each. Guard15aa1468.9333SD72.1682->16u1523.7667SD31.9754ms,+54.8333within sumSD104.1436,NOstartupwin. Extra startupread/replacementcallsalsooccurredonunchangedbaselineA2;exacttriggerunestablished,alltracesretained.

Non-native mean candidate-minusbaseline16r(ms):1k-.0335/+.0260,10k-.0475/-.0050,50k+.0130/+.0320. Totalmean1k-.1635/+.0755,10k-.5385/-.0345,50k+.0840/+.2750. The10kresidualbenefit repeats,but1kmixed/50kadverse preventgeneralwinclaim. Native-response movementalsoexists(10kA1slow,50kB2slow),notSQLCPUorproofsourcecausation. Allunfavorablepairedchannelsarein android-idle-reducers-16u-2026-10-28.json.

Keep16uprovisionalforprovenemptyPromise/yieldremoval andsmallrepeated10kresidualbenefitonly. Requiredpost-devicechecksrunning,firstfreshmatchedshapes16u/lists16L10prepared. Fullguardmustassessallmeans/regressions,nofinalretention/newfloors/commit. No unchangedacceptancererunforvariance.

Post-device412library/25tools/1harness/30e2e/librarybuildPASS;frozenAPKnotrebuilt. First fullmatched16u acceptance ACTIVE .tmp/p16u-accept.ps1 PID41060: fresh emptycontrol+5pairedshapes,then16L10fresh4controls+verifiedreboot+5pairedlists/reboot-between. Verifiersprepared. Compare retained16r/16L8 and16kseparatelyfromrejected16t/16L9,retainalladversemetrics/heapguarddebt. Bothgoalsremainunmet;no finalretention or floorchange.

Fullshapes16u COMPLETE/independentlyVERIFIED1PASS/51PB/0CB/34FAIL52/86,vsretained16r49/86,older16k56/86,rejected16t51/86(comparisononly).10paired/86means+sampleSD+verdicts/20controls/APK-session-controlhash/journals. All86before/after/adversecomparisonswithrolesandpairedcontrolmovementarein android-idle-reducers-shapes-16u-2026-10-28.json. No general causal win or retention closure.

Absolute workload means worsened:K5000single9.96->12.12ms,tenkey9.64->11.62,replace12.60->14.34,workflowreset23.92->28.72,append12.64->14.00(allstillFAIL). Raw control emitP50 means also rose:K50 6.18->7.30,K500 5.76->7.24,K5000 5.64->6.90,workflow5.92->6.88ms. Many workloadmeans increased beyond sumSD;all retained rather than attributed or normalized away. Higherqualificationcountisnotproofcodefaster. Full list guard pending.

ADR0105 separately proves burst.maxBacklog cannotmatchclassic0underasyncnotify-after-commit:lowerbound1fromthe same-stack post-dispatch observation. It records an evidencedPhase16zero-paritylimit forK50/500/5000 without any newfloor or rawverdict change. Observed2-3notprovedoptimal/excessqueueheadroomstillopen. This semantic proof does not validate16u or resolveanyothermetric.

List16L10session16L10-audit-1793145954all4controlscomplete/session-device-APKverified;9renderrows/3distincttrialsperSize/finitecommit+pairSamplesverified. Runnerrebootingbefore5pairedlisttrials. No duplicate/build/test/profile/runneredits. Bothgoalsremainunmet.


## Final outcome: rejected and reverted
Full16L10 completed with genuine root exit0 and parent P16U_ACCEPT_DONE. Independent verification:30 valid observations,66 recomputed means/sampleSD,33 raw-recomputed verdicts,all4 session/device/APK-matched controls and6 distinct boots. Result13PASS/10PB/3CB/7FAIL (26/33),versus retained16r/16L8 31/33. Eight SQLite means exceed sumSD versus16L8:1kfirstReady/toggleP50/emitP50;10krelaunch/emitP50;50kfirstReady/relaunch/emitP50. All33 comparisons versus16L8,rejected16L9 and15aa,including adverse data,are saved in android-idle-reducers-lists-16u-2026-10-28.json. Changed controls/cross-session timing prevent a source-causation claim.

RemainingFAIL:1krelaunch(+11.0904ms),1kemitP50(+.075279ms),10krelaunch(+46.4039ms),10kemitP50(+.235279ms),10kemitP95(+.226149ms),50kemitP50(+.300000ms),50kemitP95(+.340279ms). Shapes16u52/86 does not clear the mean-regression guard. Small diagnostic10k residual direction and empty-Promise removal do not justify retention with the guard uncleared.

Rejected16u. Archived candidate reducer/core/tests/APKs/raw; original async runHandlers and unconditional core await restored in place,without gitcheckout. Only no-work performance assertion removed; unknown foreign reducer correctness test kept. Postrevert411library/25tools/1harness/30e2e/librarybuildPASS (.tmp/16u-revert-checks-*). No unchanged baseline acceptance rerun,hidden failure,new floor or commit. Baseline remains frozen16r. ADR0105 zero-backlog impossibility proof remains valid independently;it does not validate16u or observed2-3 optimality. Both goals remain unmet.
