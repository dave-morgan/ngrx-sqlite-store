# ADR-0100: lazy per-action transaction handles

Status: Rejected after reversed diagnostics and full shapes/list acceptance.

Source investigation after verified16L5 locates redundant work on every action: SqliteStoreCore constructs StoreTx for every registered feature, each allocating three maps and escaping a feature key, before runHandlers discovers that most features have no applicable handler. The list emission loop changes only ui/benchmarkCount; foreign router reducers still need every action. This is a source-proven allocation hypothesis, not a measured latency claim.

Decision: lazily construct a transaction handle when a matching tx/state handler or foreign fallback executes. Action hooks still receive the first feature handle. resetAll lazily obtains every feature handle and resets all features in registration order, including features that have no matching handler. One shared transaction cache, original feature ordering, foreign fallbacks, atomicity and notify-after-commit remain unchanged. No persistence/schema/public API changes.

Alternatives: retain eager handles (unnecessary allocations); cache handles across actions (unsafe transaction executor/staleness retention); lazy handles are bounded to one action. Plan: allocation regression red before fix; hook/resetAll/fallback correctness tests; full library validation; candidate build;50k list probe against15aa and reversed emission attribution against frozen16k; only retain measured benefit or proven redundant work removed. Full fresh list acceptance0FAIL required before closing shared path. No commit or widened floor.

Regression RED on eagerimplementation27mapsinstead3foroneactiveplus8idlefeatures;candidateGREEN.405library tests pass inclfirst-featurehooks/resetAll/unmatchedforeignfallback. Build/device measurement pending;no latency/retentionclaim. Archived original core `.tmp/16m-core-baseline.ts`.

ReverseddiagnosticCOMPLETE/verified6guardtraces/12emissionreports(2400actions,200finitechannels/report)/4boots/installedAPKh/session/seed/scalarupdate. No repeatablelatencygain:non-nativep50~.3msbothsides;B2/50k .4ms,emit3.6/4.9p50/p95vsA2 3.3/4.2adverse. Guardcandidate+48.833msmeanvs15aa(all3pairsslower),withinsumSD69.826ms,NOstartupwin. Allraw preservedinevidenceandroid-lazy-handles-16m-2026-10-28.json/md. Provisionallyretainforproven27->3mapworkremoved;freshmatchedfullshapes16m/lists16L6pendingpostchecks. No floorchange/gateclosure.

Post-device405library/25tools/1harness pass. Firste2e29pass/1classicblankbootfailure beforeimplmarker;originalartifacts/logs preserved `.tmp/16m-post-e2e-first-failure`. Three tracedtargetedruns andfull30-testfollowupsuitepass,buildpass. Causeunproven,no productionfixclaim. Freshfrozen16m fullacceptance launched PID18232 `.tmp/p16m-accept.ps1`: shapes16m then lists16L6 sequentially,filenamelabel2026-10-28/localdate;toolUTCmetadata preserved. No goals/gate closed.

Fullshapes16mverified3PASS/46PB/0CB/37FAIL(49/86qualify),worsevs16k56/86. Appendp5013.16->14.76,p9526.64->51.46(PB->FAIL),K5000tenkey9.84->10.90;replace12.66->12.40stillFAIL. No generalperformancewin/all86comparisonsinevidence. List16L6activecontrols;retentionremainsprovisionalpendingfullresults,nogateclosure.

Final16L6VERIFIED13PASS/14PB/3CB/3FAIL,30/66/33/all4controls/6boots/realBashEXIT0;bothgoalsunmet. Rejectedforlackofrepeatableapplicationbenefit/addedlifecyclecomplexitydespitesyntheticallocationgain;notclaimingitcausedallregressions. Restoredpre-experimenteagercoreinplace,archivedcandidatecore/tests/APK/allraw;kepttwoadditionalcorrectnesstests. Originalwrapperidleafterchildsuccesspreservedseparately;nofakeparentexit0/rerun. Evidencefullcomparisonsandrejectionandroid-lazy-handles-16m-2026-10-28.json/md.
