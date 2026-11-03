# ADR-0101: one publication per selection refresh

Status: Experiment16n; no measured application win yet.

Following rejected16m,review identified a changed-cache action publishes twice: PathCache.refresh publishes after its FIFO read,then SqliteSelectionEngine.refresh immediately calls PathCache.notify to publish again and evict. Both generations rebuild the loaded view and visit watchers,even when memoization suppresses duplicate selected values.

Decision: add an internal optional publishChanges flag(defaulttrue) to PathCache.refresh. Selection engine invokes refresh(false),then retains its existing notify/eviction step. Standalone refresh keeps default publication. Preserve FIFO reads,all dirty entry updates,post-commit timing,identity/error/load handling and final notification; no SQL/schema/storage/publicStore API change. Do not bypass the read queue: queued external writes must retain their ordering.

Plan: generation-count regression red(2instead1) with correct selected value;standalone refresh notification regression;minimal source change;alllibrary/e2e/build;50kguardvs15aa and reversed native/store emission diagnostics against frozen16k (16mrejected). Retainonlydemonstratedbenefit/provenredundantworkremoved,fullfreshlistacceptance0FAILbeforeclosure. No gitcommit/newfloors.

RegressionRED2generationsvs1,candidateGREEN;standalonerefreshpublicationretained.406library/30e2e/library+APKbuildspass. FrozenAPKaec...fullhashaece947ff0ed477d198527b639c8db7e1d2214592b36648a5e05de52fa8df7f0. Active .tmp/16n-run.ps1 PID36320,sequential50kguardlp11vs15aa+reversednative/storeemissionvs16k. No measuredapplicationbenefit/retentionclaimyet. Evidenceandroid-publication-16n-2026-10-28.md.

ReverseddiagnosticVERIFIED6guard+12reports/2400actions/4boots/APKh-session-seed/nativeSQL. Mean non-nativeoverheadlowerbothdirections1k-.0335/-.0230ms,10k-.0560/-.0410;50kmixed+.0275/-.0705. Guardmean+55.933msvs15aa>sumSD52.9275by3.006ms:NOTcleared. Postgeneration/transactionspanswithinrunvariation;boot/generationstartdelayunresolved;extraqueryalsoin16k. Provisionalretentiononly;firstfullmatched16n/16L7acceptancemustassessallmetricsandguard. Fullraw/adversephasebreakdownsandroid-publication-16n-2026-10-28.json/md. No floorchange/finalsuccessclaim.

Post406library/25tools/1harness/30e2e/librarybuildPASS. Firstfullmatched16n acceptance launched `.tmp/p16n-accept.ps1` PID10204,frozenAPKs,no rebuild:shapes16nthenlists16L7. Guard remainsuncleared;futurelistmeansmustassessbootdelay. NewNodewrapperrecordsrealrootBashstatuswithfileFDstdioinsteadprocess-treeWait;no parentcompletionfaked. Results pending.

Fullshapes16nVERIFIED1PASS/45PB/0CB/40FAIL(46/86)vs16k56/86.10pairedrows/86stats+verdicts/20controls/provenance/journals. Appendp5013.16->15.20,p9526.64->60.12(PB->FAIL);reset24.10->26.44;K5000tenkey9.84->9.46stillFAIL. Smalloverheadgainsnotbroadworkloadwin;all86adversedatacomparisonsrecorded. List16L7activecontrols;guarduncleared/retentionnotfinal.

Full16L7VERIFIED13PASS/15PB/3CB/2FAIL(31/33),30/66/33/all4controls/APK-session-device/6boots/rootEXIT0+scriptSHA;parentgenuinelycompleted. Remaining50krelaunch(over116.379ms)/emitp95(over~.003ms,stillFAIL). NoSQLiteincreasebeyondsumSDvs16L5;heapmeansabove15aastillguardconcern. Diagnosticstartupguardnotcleared/fullfirstReadywithinnoiseisnotproofrepair. Keep16nprovisionalforprovenworkremoval+smallrepeatedoverheadbenefit,NOgeneralshapeswin/fullgateclosure. Next50kpersistedrelaunchtraceusessameacceptanceworkloadsequence,frozen16n,noCPU/heapcapture;diagnosticprotocolonly,notunchangedacceptancererun.
