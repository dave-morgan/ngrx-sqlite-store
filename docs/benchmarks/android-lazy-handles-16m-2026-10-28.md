# Phase16m: lazy transaction handles

ADR-0100. The dispatch path previously constructed one StoreTx per registered feature before discovering which tx reducers had a matching handler. Each handle allocated three maps. The candidate creates them on demand for matching handlers/foreign fallback,first-feature action hooks or resetAll. One shared action cache/SQL transaction,feature order,persistence and notification timing remain unchanged.

Allocation regression failed on original code (27maps foroneactive+8idlefeatures,expected3),nowpassesat3. Foreign unknown-action fallback,first-feature hook and resetAll correctness checks pass.405library tests/30e2e/librarybuild/SQLiteAPKbuild pass. Frozen candidate `.tmp/16m-apks/sqlite.apk` SHA256ce0f30f80c9d188f96213d88136208455e8ca9a6e0e57e30f45d7de94d7feed8. No measured application benefit or final retention claim yet.

Active sequential runner `.tmp/16m-run.ps1` PID35384: verifiedreboot;3A/3B50k guard against15aa (`.tmp/lp10-*.json`);thenreversedA1/B1/B2/A2 eachseparateverifiedreboot+60ssettle,200emissions each at1k/10k/50k. Baseline16khashbbbfcf23a798e8d78a24dfaa2dd19ac8e8c3bf382090539724713fe0f8af4d95. Each diagnostic verifies actual installedAPKhash/session/DOMseedsummary,records native response and non-native overhead,then200 rawsame-statement replays after restoring wrapper. NoCPUprofiler. Raw replay changes only harness data,nextprobe clearsapp. This is attribution,notacceptance/floor/nativeSQLCPU. No builds/tests/profiling alongside runner. All partials/errors preserved,noautomaticretry/overwrite.

Setup uses route-independent hook+settle thenexplicitbenchSeed(size),verifies actualtodo-summary before diagnostics navigation;timedemission hook unchanged. Existing firstreadyguard helper retains itsuntimed300swaitperleg. Per-trace guardAPKh reliesoninstallscript/archive lineage;emission diagnostic capturesactualinstalledhash.

## Completed reversed diagnostic

Real16M_DONE/runnerexit0;verified6valid50kguardtraces and12emissionreports/4distinctboots,actualinstalledAPKh/session/DOMseedsummary. Everyreport has200finiteemission/native/overhead/rawsame-statement timings (2400actions total),oneatomic scalar updateperemission. Fullraw+verification companion `android-lazy-handles-16m-2026-10-28.json`.

50k guard15aa mean1234.1667ms/SD13.3949,candidate1283.0000/SD56.4315. Pairedcandidate-baseline+0.4/+62.1/+84.0ms,allslower;mean+48.8333ms remains within sumSD69.8264 but proves no startup benefit. Native call counts68/68/68vs69/75/75;no unfavorable data removed. This compares the whole candidate with15aa,not an isolated16m-versus16k effect.

|Size|Leg|Emissionp50|Emissionp95|Nativep50|Non-nativep50|Rawp50|
|---:|---|---:|---:|---:|---:|---:|
|1000|A1|3.300|3.800|2.900|0.300|2.800|
|1000|B1|3.200|3.800|2.900|0.300|2.800|
|1000|B2|3.300|4.400|3.000|0.300|2.800|
|1000|A2|3.200|3.900|2.900|0.300|2.800|
|10000|A1|3.300|4.200|2.900|0.300|2.800|
|10000|B1|3.300|4.300|3.000|0.300|2.800|
|10000|B2|3.300|4.200|2.900|0.300|2.800|
|10000|A2|3.200|4.400|2.900|0.300|2.800|
|50000|A1|3.300|4.100|2.900|0.300|2.900|
|50000|B1|3.200|3.900|2.900|0.300|2.900|
|50000|B2|3.600|4.900|3.200|0.400|2.800|
|50000|A2|3.300|4.200|2.900|0.300|2.800|

Non-native median stays~0.3ms,withB2/50k0.4ms. There is no repeatable application latency gain;50kB2emissionp50/p95=3.6/4.9ms versusA2=3.3/4.2ms is adverse andretained. Native response is bridge walltime,notSQLCPU;wrapping andsequential rawreplay instrumentation are diagnostic only. The unchanged rawmedian~2.8ms does not justify broadening anyfloor.

Decision: provisional retention for directly demonstrated unused-map/handle elimination (27->3inregression),notfor latency. Fullfreshmatchedshapes16m+lists16L6 after post-device validation must check allmetrics andADR0091 gate. No goal closure or unchanged-APK rerun for variance.

Post-device405library/25tools/1harness pass. Firste2e29pass/1classicblankbootfailure beforeimplmarker;originalartifacts/logs preserved `.tmp/16m-post-e2e-first-failure`. Three tracedtargetedruns andfull30-testfollowupsuitepass,buildpass. Causeunproven,no productionfixclaim. Freshfrozen16m fullacceptance launched PID18232 `.tmp/p16m-accept.ps1`: shapes16m then lists16L6 sequentially,filenamelabel2026-10-28/localdate;toolUTCmetadata preserved. No goals/gate closed.

## Full shapes16m acceptance

Independent verification passes10completepairedrows/86means+sampleSD+verdicts/20controls/APK-session-controlhash/journals. Result3PASS/46PLATFORM-BOUND/0CODE-BOUND/37FAIL(49/86qualify),versus16k 1/55/0/30(56/86). This is worse qualification,not success. Appendemissionp50 13.16->14.76ms(stillFAIL),p95 26.64->51.46ms(PB->FAIL);K5000tenkeyp50 9.84->10.90ms(stillFAIL). K5000replacep50 12.66->12.40ms remainsFAIL. Some means/SDs and fresh controls shifted; no claim of isolated causality. Allmetrics and adverse differences below. Verified summary `android-shapes-session-16m-2026-10-28.json`.

List16L6 still active;no postdevicevalidation or implementationchanges alongside it. Retention remains provisional;review allocation benefit against full outcomes after lists complete.

|Group/metric|SQLite16k mean|SQLite16m mean|Delta|16k verdict|16m verdict|
|---|---:|---:|---:|---|---|
|flat/50.setKey.emitP50|7.420000|8.040000|+0.620000|FAIL|FAIL|
|flat/50.setKey.emitP95|21.920000|19.700000|-2.220000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.setKey.domP50|8.600000|8.780000|+0.180000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.setKey.domP95|22.580000|20.240000|-2.340000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.setKeys.emitP50|7.380000|8.020000|+0.640000|FAIL|FAIL|
|flat/50.setKeys.emitP95|22.120000|18.220000|-3.900000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.setKeys.domP50|8.420000|8.660000|+0.240000|PLATFORM-BOUND|FAIL|
|flat/50.setKeys.domP95|22.680000|19.220000|-3.460000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.replace.emitP50|7.020000|7.300000|+0.280000|FAIL|FAIL|
|flat/50.replace.emitP95|17.320000|19.020000|+1.700000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.replace.domP50|7.880000|7.860000|-0.020000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.replace.domP95|18.100000|20.600000|+2.500000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.burst.lagP50|6.080000|5.900000|-0.180000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.burst.lagP95|14.920000|13.460000|-1.460000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.burst.endLag|10.300000|9.160000|-1.140000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.burst.maxBacklog|2.200000|2.400000|+0.200000|FAIL|FAIL|
|flat/50.heapMb|5.076804|5.073573|-0.003230|FAIL|FAIL|
|flat/50.pssTotalMb|237.288867|237.182227|-0.106641|FAIL|FAIL|
|flat/500.setKey.emitP50|8.020000|7.580000|-0.440000|FAIL|FAIL|
|flat/500.setKey.emitP95|19.880000|21.400000|+1.520000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.setKey.domP50|8.720000|8.180000|-0.540000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.setKey.domP95|20.400000|22.240000|+1.840000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.setKeys.emitP50|7.940000|8.400000|+0.460000|FAIL|FAIL|
|flat/500.setKeys.emitP95|20.760000|22.280000|+1.520000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.setKeys.domP50|8.500000|9.040000|+0.540000|PLATFORM-BOUND|FAIL|
|flat/500.setKeys.domP95|21.320000|22.840000|+1.520000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.replace.emitP50|8.060000|7.860000|-0.200000|FAIL|FAIL|
|flat/500.replace.emitP95|20.900000|20.160000|-0.740000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.replace.domP50|8.520000|8.500000|-0.020000|FAIL|PLATFORM-BOUND|
|flat/500.replace.domP95|21.720000|21.680000|-0.040000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.burst.lagP50|6.280000|6.360000|+0.080000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.burst.lagP95|13.040000|15.860000|+2.820000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.burst.endLag|6.640000|9.340000|+2.700000|PLATFORM-BOUND|FAIL|
|flat/500.burst.maxBacklog|2.000000|2.000000|+0.000000|FAIL|FAIL|
|flat/500.heapMb|5.568442|5.567972|-0.000470|FAIL|FAIL|
|flat/500.pssTotalMb|238.353906|237.805078|-0.548828|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.setKey.emitP50|9.740000|10.440000|+0.700000|FAIL|FAIL|
|flat/5000.setKey.emitP95|25.480000|26.540000|+1.060000|PLATFORM-BOUND|FAIL|
|flat/5000.setKey.domP50|11.000000|11.320000|+0.320000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.setKey.domP95|26.900000|27.220000|+0.320000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.setKeys.emitP50|9.840000|10.900000|+1.060000|FAIL|FAIL|
|flat/5000.setKeys.emitP95|19.280000|25.180000|+5.900000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.setKeys.domP50|10.440000|11.580000|+1.140000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.setKeys.domP95|19.940000|26.140000|+6.200000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.replace.emitP50|12.660000|12.400000|-0.260000|FAIL|FAIL|
|flat/5000.replace.emitP95|22.560000|23.220000|+0.660000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.replace.domP50|13.340000|12.940000|-0.400000|FAIL|FAIL|
|flat/5000.replace.domP95|23.100000|23.880000|+0.780000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.burst.lagP50|7.620000|8.200000|+0.580000|PLATFORM-BOUND|FAIL|
|flat/5000.burst.lagP95|13.880000|16.720000|+2.840000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.burst.endLag|7.540000|8.660000|+1.120000|PLATFORM-BOUND|FAIL|
|flat/5000.burst.maxBacklog|2.000000|2.000000|+0.000000|FAIL|FAIL|
|flat/5000.heapMb|9.954367|9.951647|-0.002720|FAIL|FAIL|
|flat/5000.pssTotalMb|245.954492|246.523242|+0.568750|FAIL|FAIL|
|workflow/edit_d1.emitP50|7.880000|8.000000|+0.120000|FAIL|FAIL|
|workflow/edit_d1.emitP95|17.420000|17.520000|+0.100000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d1.domP50|8.640000|8.920000|+0.280000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d1.domP95|18.400000|17.960000|-0.440000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d4.emitP50|7.840000|7.160000|-0.680000|FAIL|PLATFORM-BOUND|
|workflow/edit_d4.emitP95|15.680000|16.800000|+1.120000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d4.domP50|8.280000|7.780000|-0.500000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d4.domP95|16.460000|17.500000|+1.040000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d10.emitP50|7.780000|7.340000|-0.440000|FAIL|FAIL|
|workflow/edit_d10.emitP95|17.080000|16.780000|-0.300000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d10.domP50|8.440000|8.120000|-0.320000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d10.domP95|17.820000|17.980000|+0.160000|PLATFORM-BOUND|PASS|
|workflow/loadCycle.emitP50|15.060000|17.560000|+2.500000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/loadCycle.emitP95|50.660000|52.460000|+1.800000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/loadCycle.domP50|15.200000|17.720000|+2.520000|PLATFORM-BOUND|PASS|
|workflow/loadCycle.domP95|51.160000|52.960000|+1.800000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/step.emitP50|7.140000|7.100000|-0.040000|FAIL|PLATFORM-BOUND|
|workflow/step.emitP95|16.080000|18.000000|+1.920000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/step.domP50|7.620000|7.560000|-0.060000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/step.domP95|16.880000|18.400000|+1.520000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/reset.emitP50|24.100000|24.980000|+0.880000|FAIL|FAIL|
|workflow/reset.emitP95|49.940000|41.000000|-8.940000|PLATFORM-BOUND|FAIL|
|workflow/reset.domP50|24.200000|25.080000|+0.880000|FAIL|FAIL|
|workflow/reset.domP95|50.000000|41.020000|-8.980000|PLATFORM-BOUND|FAIL|
|workflow/append100.emitP50|13.160000|14.760000|+1.600000|FAIL|FAIL|
|workflow/append100.emitP95|26.640000|51.460000|+24.820000|PLATFORM-BOUND|FAIL|
|workflow/append100.domP50|13.560000|15.160000|+1.600000|FAIL|FAIL|
|workflow/append100.domP95|27.240000|51.940000|+24.700000|PLATFORM-BOUND|FAIL|
|workflow/heapMb|5.474697|5.481326|+0.006628|FAIL|FAIL|
|workflow/pssTotalMb|240.510352|240.130469|-0.379883|FAIL|FAIL|
|workflow/relaunchReadyMs|558.240000|918.240000|+360.000000|PASS|PASS|
|workflow/relaunchHeapMb|4.432150|4.461910|+0.029760|FAIL|FAIL|

## Full lists16L6 and rejection

Verified30validobservations/66recomputedmeans+sampleSD/33verdicts/all4controls/session-device-APK/6boots;actualBashPIPELINE_DONE/EXIT0. Result13PASS/14PB/3CB/3FAIL(30/33qualify),vs16L5 29/33. Remaining1ktogglep50,50kemitp50/p95. Both overall goals unmet. Wrapper remained idle after successfulBash;PID18232stopped after verification;`.tmp/16m-accept-finalization.json`preserves absentparentcompletion,nofakeexit0/rerun.

Reject16m: synthetic27->3map elimination alone does not justify added lazy lifecycle complexity without repeatable application benefit,while shapes qualified fewer metrics. This does not prove the change caused every cross-session regression. Eagercore restored in place only after checking it equals the pre-experiment snapshot;candidatecore/fulltests/APKs/raw preserved `.tmp/16m-core-candidate.ts`,`.tmp/16m-contract-candidate.spec.ts`,`.tmp/16m-apks`. Removed only experiment allocation assertion; kept two useful hook/resetAll/foreign fallback correctness tests. No git checkout or historical report removal.

|Size/metric|SQLite16L5mean|SQLite16L6mean|Delta|
|---|---:|---:|---:|
|1000/firstReadyMs|431.080000|411.480000|-19.600000|
|1000/relaunchReadyMs|1452.900000|1441.960000|-10.940000|
|1000/heapTodosMb|5.463909|5.454423|-0.009486|
|1000/heapNotesMb|6.196040|6.197674|+0.001633|
|1000/heapRelaunchMb|4.961367|4.962177|+0.000809|
|1000/pssTotalMb|235.752734|236.254492|+0.501758|
|1000/pssRelaunchTotalMb|221.813086|223.008008|+1.194922|
|1000/toggleP50|14.220000|13.560000|-0.660000|
|1000/toggleP95|49.720000|49.740000|+0.020000|
|1000/emitP50|3.300000|3.280000|-0.020000|
|1000/emitP95|4.880000|5.220000|+0.340000|
|10000/firstReadyMs|544.440000|547.100000|+2.660000|
|10000/relaunchReadyMs|1416.760000|1485.240000|+68.480000|
|10000/heapTodosMb|5.506484|5.506552|+0.000068|
|10000/heapNotesMb|6.256932|6.252785|-0.004147|
|10000/heapRelaunchMb|4.997613|4.987317|-0.010296|
|10000/pssTotalMb|243.675000|244.834961|+1.159961|
|10000/pssRelaunchTotalMb|222.264453|223.378516|+1.114063|
|10000/toggleP50|13.140000|13.420000|+0.280000|
|10000/toggleP95|44.940000|45.080000|+0.140000|
|10000/emitP50|3.300000|3.340000|+0.040000|
|10000/emitP95|5.300000|5.300000|-0.000000|
|50000/firstReadyMs|1198.880000|1193.240000|-5.640000|
|50000/relaunchReadyMs|1505.460000|1537.560000|+32.100000|
|50000/heapTodosMb|5.540056|5.519324|-0.020732|
|50000/heapNotesMb|6.266001|6.252134|-0.013867|
|50000/heapRelaunchMb|5.010542|4.987029|-0.023514|
|50000/pssTotalMb|241.563672|241.773242|+0.209570|
|50000/pssRelaunchTotalMb|223.766602|223.160742|-0.605859|
|50000/toggleP50|12.340000|12.520000|+0.180000|
|50000/toggleP95|40.400000|43.760000|+3.360000|
|50000/emitP50|3.260000|3.280000|+0.020000|
|50000/emitP95|4.660000|4.800000|+0.140000|
