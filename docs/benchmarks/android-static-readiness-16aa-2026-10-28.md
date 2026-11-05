# Phase16aa synchronous static-readiness reuse

[ADR0111](../decisions/0111-static-readiness-pass-reuse.md).

RED .tmp/16aa-red.log shows3cache.readycallsinstead1forbothloadedstaticObservableandSignal;416existingtestspassed. GREEN .tmp/16aa-library-green.log all418librarytestsPASS. No readiness storedacrossgeneration/evaluation;truth reusedonlybeforeanyasynchronousload/userprojection. BaselineSelectionEnginearchived .tmp/16aa-selection-engine-baseline.ts.

Prepared .tmp/16aa-validate.cjs tools/harness/30e2e/library+APKbuildthenarchives .tmp/16aa-apks. Nextmandatory50kguardlp18vs15aa and4freshbootreversedlegs1k/10k/50k200scalar-emissionchannelsvsretained16r (.tmp/16aa-run.ps1/.tmp/16aa-emission-probe.mjs/.tmp/16aa-verify.cjs). NativewrapperrestoredBEFORErawsameSQLreplays,harnessdataonly/nextprobeemptiesapp;noCPUprofiler/extraheapsnapshot/floorchange. ActualAPKh-session-boot-seed/scalarSQLproof/200finitechannelsperreport required. No measuredgain/retentionclaimyet.

Validation418library/25tools/1harness/30e2e/library+SQLiteAPKbuildPASS(.tmp/16aa-validate.stdout.log16AA_VALIDATION_DONE). Frozen16aa .tmp/16aa-apks/sqlite.apk SHA256b96d2d10077748501fdfa318cfb489ea6368b3af8d4c9dd5bf48b576a31bdf86. Diagnostic ACTIVE .tmp/16aa-run.ps1 PID34956 logs .tmp/16aa-run.stdout.log/.stderr.log. Mandatory50kguard3A/3Bvs15aa/lp18 existing300suntimedperleg,thenreversedA1/B1/B2/A2eachverifiedcoldboot+60settle/200scalar emissions1k/10k/50kagainstfrozen16r. Installedhash-session-boot-seed/scalarSQL/200finiteemission-native-overhead-rawchannelsperreport/4boots verified .tmp/16aa-verify.cjs on16AA_DONE. No extraheap snapshots/CPUprofiler/newfloor/automaticretry/overwrite/paralleltestsbuilds. Provisional source experiment only;no measured application benefit yet.


## Final16aa: rejected after reversed diagnostic
16AA_DONE/independentlyverified6guardtraces/12reports2400emissions+native/overhead/rawchannels/4distinctboots/actualinstalledhash-session-seed/scalarSQL. Durable allrawsummaries/adversechannels android-static-readiness-16aa-2026-10-28.json. Guard15aa1445.566667SD20.763991->16aa1472.233333SD36.423115ms,+26.666667withinSDsum57.187107,no startupwin;firsttwopairs+33.7/+64.8adverse.

No repeatable latency gain. Candidate-minusbaseline nonnativeoverheadmeans(ms):1k+.0595/-.0115,10k+.0395/+.0135(adverseboth),50k+.0145/~0.0000. Totalmeans1k+.656/+.0725,10k+.1715/+.0130,50k+.0255/-.0260. NativeB1slownessalsoobserved;do not attributeallmovementtoreadinesssource. P50residualmostly+.1/same;allunfavorabledataretained.

Rejected16aa;do not run unchanged fullacceptance toseekvariance. Synthetic3->1readinesschecks removal didnot demonstrate workloadbenefit. CandidateSelectionEngine/tests archived .tmp/16aa-source,APKs/rawretained;baselineSelectionEngine restoredexactinplace/no gitcheckout. Removedonlyreadycallcountassert/spies,keptObservable+Signalcorrectnesscases(418tests expected). Postrevert .tmp/16aa-revert-checks.cjs next. No floor/notification/APIchange/commit.

Existingguardtracecomparison locatedoneextra catalog read in candidate boot:initialcreate/open/query tosurvivingnativehandle,thenconsistencysweep/recreate/reopen/query;firstqueryalwaysdiscardedaftercreatealready-existserror. Baseline15aahadnon-prefetchedcatalogandonlyone read. Newhypothesis16ab gatecatalogprefetchonCREATEsuccesswhilekeepingOPENpipelined(notawaitingOPENack);failedcreate neverissuesdiscardedquery,successfulcreate canstillqueuequerywhileOPENpending. Needtests freshopenquery-beforeOPENack,onefreshcatalogafterstalesweep,andnoqueryonunexpectedcreateerror;measurestartup/relaunchbothdirectionsbeforeclaim.
