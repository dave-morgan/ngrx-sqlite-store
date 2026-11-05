# Phase16r Boolean shared-count experiment

The unchanged16n native SQL diagnostic returned identical counts in30/30 alternating pairs, mean61.1900->51.5633ms (9.6267ms lower). It removes the redundant json_extract from Boolean equality inside shared count aggregates. Native response wall time is not SQL CPU or an application timing claim.

Production candidate keeps ordinary selective/fallback predicates unchanged, avoiding loss of their expression-index searches. Mixed JSON scalar, Boolean ne/in/tree, fallback and generated-index tests pass;409 library tests pass. Device A/B and list guard pending, no retention/gate claim. Latest acceptance remains16L7 13PASS/15PB/3CB/2FAIL and shapes16n1PASS/45PB/40FAIL.

See [ADR0102](../decisions/0102-boolean-shared-count-predicates.md) and [raw native evidence](android-boolean-count-16r-2026-10-28.json). All earlier failed diagnostics and rejected-index data remain intact.

Candidate build and validation complete:409 library tests,30 e2e tests,library build and SQLite APK build pass. APK SHA2568394ff506bac866e0d3405083eea4aac782f99986ac85e80266033ada8fa42a5. Diagnostic runner .tmp/16r-run.ps1 PID40036 begins with mandatory50k guard then actual candidate SQL proof and reversed fresh-boot50k workload versus16n. No application timing conclusion yet. Initial validation PowerShell wrapper treated a native NO_COLOR warning as a terminating error before tests ran; original logs preserved, corrected Node file-descriptor wrapper completed all checks.

Reversed application diagnostic completed with real16R_DONE/exit0. Independent verification covers6guardtraces,4workloadreports,4unique boots,actualinstalledAPK/session hashes,30finite toggles and200finite emissions per workload,plus actual candidate SQL proof. First-ready guard15aa1263.9667SD42.3273->16r1220.9667SD29.3718ms; no regression established by this guard. Guard hashes are installation/archive lineage; reversed legs and SQL proof additionally verify installed hashes.

Actual candidate shared count SQL uses json_type equality with 'false' binding and no json_extract(done); summary50000 matches.

One-trial workload differences below are candidate minus baseline16n; negative is lower. These are diagnostics, not acceptance, and their insufficient-trial verdict counts are not interpreted.

| Metric | B1 ? A1 | B2 ? A2 |
| --- | ---: | ---: |
| firstReadyMs | +12.800000 | +16.500000 |
| relaunchReadyMs | +385.600000 | -18.700000 |
| toggleP50 | +1.400000 | -0.600000 |
| toggleP95 | -18.800000 | -9.800000 |
| emitP50 | +0.000000 | +0.000000 |
| emitP95 | +0.000000 | +0.100000 |
| heapTodosMb | +0.016483 | +0.024788 |
| heapNotesMb | +0.006191 | +0.007748 |
| heapRelaunchMb | +0.014164 | -0.048069 |
| pssTotalMb | +2.213867 | -2.389648 |
| pssRelaunchTotalMb | +0.467773 | -2.291016 |

The target relaunch gain did not repeat: +385.6/-18.7ms. First-ready was12.8/16.5ms higher in both directions. ToggleP95 was18.8/9.8ms lower, emissionP50 unchanged, emissionP95 unchanged/+0.1ms; memory mixed and all adverse data retained. No general application win or causal explanation for the large B1 relaunch is asserted. Provisional retention rests on the measured native lookup reduction and exact predicate semantics, pending fresh matched full acceptance and list guard review.

[Full raw application verification](android-boolean-count-app-16r-2026-10-28.json). Prepared first full candidate shapes16r followed by lists16L8, using frozen APKs and entirely fresh matched controls; post-device validation must pass before starting. This is the first full acceptance for changed16r code, not a rerun of unchanged acceptance for favorable variance. Both user goals remain unmet.

Post-device409library/25tools/1harness/30e2e/librarybuildPASS; no frozen APK rebuild. First full matched16r acceptance ACTIVE .tmp/p16r-accept.ps1 PID36600: fresh empty control+5paired shapes,then16L8 fresh4controls+5paired lists/reboot-between. Prepared shape and list verifiers; the strengthened list verifier reproduced all33 historical16L7 verdicts and exact allowances from raw controls/statistics in an offline check. No original historical report was overwritten. Both goals remain open pending new evidence and further measured fixes.

Fullshapes16r COMPLETE/independentlyVERIFIED1PASS/48PB/0CB/37FAIL(49/86qualified),vs16n46/86and16k56/86. Verification10pairedrows/86means+sampleSD+verdicts/20controls/session-APK-controlhash/journal snapshots. Summaryandroid-shapes-session-16r-2026-10-28.json; all86 comparisons against both corrected baselines, including every adverse metric, are in android-boolean-count-shapes-16r-2026-10-28.json.

Against16n,appendp5015.20->12.64ms(stillFAIL),p9560.12->38.00ms(FAIL->PB);resetp5026.44->23.92ms(stillFAIL);K5000replace12.62->12.60ms,tenkey9.46->9.64ms(bothFAIL). Regressions includeK50singleemitP95,K5000singleemitP95,andK5000tenkeyDOMp50(PB->FAIL). Allfourpostloadheapmeans increased beyond sumSD versus16n,by.01366-.02028MiB; measuredV8code grew.01276-.01874MiB,data.00067-.00130MiB. This is measured accounting,not a proven cause or permission to dismiss guard/memoryFAILs. Rawheapcomponents/samplesummarypreserved;noheapcapture/newfloor. No general causal application win claimed.

List16L8 remains ACTIVE session16L8-audit-1793131414;completed30code-controlrows and3floorpoints/session-device-APKmatched,emptycontrolscompleted andrendercontrolsprogressing. No app edits/builds/tests/profilers during device work. Retention and list guard remain pending full results; both user goals remain unmet.

Full16L8 completed with genuine rootEXIT0/scriptSHA and parentP16R_ACCEPT_DONE. IndependentlyVERIFIED14PASS/14PB/3CB/2FAIL(31/33qualified),30validobservations/66recomputedmeans+sampleSD/33rawrecomputedverdicts/all4controls/session-device-APK/6boots. Versus16L7,1kfirstReadyPB->PASS,50krelaunchFAIL->PB,and10kemitP95PB->FAIL. Remaining10kemitP955.16ms(over.244067ms),50kemitP955.56ms(over.263563ms). All33means before/after16L7/16L5/15aa including adverse data are in android-boolean-count-lists-16r-2026-10-28.json.

NoSQLite mean increase beyond sumSD versus16L7;1kheapRelaunch+.050838MiB exceeds sumSD.034523 versus16L5. Against15aa,heapTodos/heapNotes means remainhigherbeyondsumSD atall3sizes. First-ready and relaunch means arelowerthan15aa, but memory guard debt and two FAILs prevent closure. These cross-session differences do not prove the Boolean change caused every timing/memory shift. Keep16rprovisional for exact nativeworkreduction and guard evidence; no general application win/finalacceptanceclaim.

Required post-device409library/25tools/1harness/30e2e/librarybuildPASS(.tmp/16r-accept-post-*);frozenAPKnotrebuilt. Next16s diagnostic samples V8JavaScript during2000scalar emissions on unchanged16r after verified reboot,10knormalizedseed,30toggles,notes/diagnostics and20warmupemissions. No nativewrapper/rawreplay/heapcapture/newfloor. Profilerperturbstimings/includesGC,notSQLCPU/acceptance. Locateactualremainingworkbeforeanotherproductionfix.
