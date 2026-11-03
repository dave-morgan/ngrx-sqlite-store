# Phase16n: one cache publication per selection refresh

ADR-0101. Baseline refresh publishes after its FIFOread,then selectionrefresh immediatelypublishesagain via notify. Candidate defers firstpublication to existing finalnotify/eviction. Standalone PathCache.refresh retains defaultpublication. FIFOread order/commit/identity/error semantics unchanged;no SQL/schema/Store APIchange. Eager transactionhandles restored after16mrejection.

RegressionREDtwo generationsinsteadonewithcorrectselectedvalue;candidateGREENone. Directrefreshpublicationtestpasses.406library/30e2e/librarybuild/SQLiteAPKbuildpass. Frozen `.tmp/16n-apks/sqlite.apk` SHA256aece947ff0ed477d198527b639c8db7e1d2214592b36648a5e05de52fa8df7f0. No measured application benefit or final retention claim.

Active `.tmp/16n-run.ps1` PID36320,logs `.tmp/16n-run.stdout.log`/`.tmp/16n-run.stderr.log`. Sequentialcoldboot+50kguard3A/3Bvs15aa (`.tmp/lp11-*.json`),thenA1/B1/B2/A2eachseparatecoldboot+60ssettle with200emissionsat1k/10k/50kvsfrozen16k. Raw `.tmp/16n-emission-{leg}-{size}.json`,manifest `.tmp/16n-run-provenance.json`,prepared `.tmp/16n-verify.cjs`. Native wrapperdiagnostic/restoredbefore rawreplays onharnessdata;noCPUprofiler/floorchange. ActualinstalledAPKh/session/seedsummarycaptured;guardhasharchive/installlineageonly. Do notduplicate/editrunner/build/test/profilebesidemeasurement. Fullmatchedacceptance0FAIL stillrequired before sharedpathclosure.

## Completed reversed diagnostic

Real16N_DONE/exit0,verified6guardtraces/12emissionreports/2400finiteactions/4distinctboots/actualinstalledAPKh-session-DOMseed/scalarupdates. All raw channels including adverse results retained in JSONcompanion. Native wrapping perturbs time;noCPUprofile/floor/acceptance claim.

|Size|Leg|Emissionp50|Emissionp95|Nativep50|Non-nativep50|Non-native mean|Rawp50|
|---:|---|---:|---:|---:|---:|---:|---:|
|1000|A1|3.300|4.300|3.000|0.300|0.3530|2.800|
|1000|B1|3.200|3.900|3.000|0.300|0.3195|2.800|
|1000|B2|3.200|4.400|2.900|0.300|0.3355|2.800|
|1000|A2|3.300|4.200|3.000|0.300|0.3585|2.700|
|10000|A1|3.300|4.300|3.000|0.300|0.3665|2.800|
|10000|B1|3.200|3.900|2.900|0.300|0.3105|2.800|
|10000|B2|3.200|4.000|3.000|0.300|0.3045|2.900|
|10000|A2|3.200|4.000|2.900|0.300|0.3455|2.800|
|50000|A1|3.300|5.200|3.000|0.400|0.3810|2.800|
|50000|B1|4.000|5.200|3.600|0.400|0.4085|3.400|
|50000|B2|3.200|4.000|2.900|0.300|0.3180|2.800|
|50000|A2|3.300|4.100|2.900|0.400|0.3885|2.800|

Mean non-native overhead improves bothdirections at1k(-.0335/-.0230ms) and10k(-.0560/-.0410ms).50k is mixed(+.0275/-.0705ms).50kB1totalemitp50 4.0ms/native3.6/raw3.4ms is slower thanA1 3.3/3.0/2.8;notdiscarded orattributedsolelytoJS. Work-removal regression andsmall repeated overhead improvements justify provisional retention and firstfullmatchedacceptance,not a general speedup claim.

Guardreadymean15aa1216.7667SD23.3594->16n1272.7000SD29.5681ms. Allpairs slower+55.1/+22.9/+89.8ms;mean+55.9333 exceeds sumSD52.9275 by3.0058ms: guard NOTcleared. Phase breakdown below shows post-generation and seed transaction differences within broad run variation;boot/generation-start delay remains unresolved. Additional catalog query oncandidate reload alsoexistsinarchived16kstartuptrace,so it is notintroducedby16n. Preserve allsamples. Fullcleanacceptance must assess the unresolved guard;do notclose Phase16 or call means nonregressing prematurely.

|Side/round|Connectionstart|Generationstart|Generationend|Aftergeneration|Seedtransactionspan|Ready|
|---|---:|---:|---:|---:|---:|---:|
|A1|145.300|288.400|346.600|847.200|756.100|1193.800|
|A2|175.100|306.100|363.500|877.000|789.400|1240.500|
|A3|178.600|313.000|369.900|846.100|759.200|1216.000|
|B1|184.800|318.900|373.200|875.700|782.000|1248.900|
|B2|172.600|368.400|447.100|816.300|743.500|1263.400|
|B3|217.100|352.400|408.500|897.300|807.000|1305.800|

No fullacceptance rerun ofunchangedacceptedcode: this is firstfull16n afterchangedpublicationpath. Candidate remainsprovisional;anyconfirmedlistregression mustbefixedorreverted,notre-floored.

Post406library/25tools/1harness/30e2e/librarybuildPASS. Firstfullmatched16n acceptance launched `.tmp/p16n-accept.ps1` PID10204,frozenAPKs,no rebuild:shapes16nthenlists16L7. Guard remainsuncleared;futurelistmeansmustassessbootdelay. NewNodewrapperrecordsrealrootBashstatuswithfileFDstdioinsteadprocess-treeWait;no parentcompletionfaked. Results pending.

## Full shapes16n acceptance

Independently verified10completepairedrows/86recomputedmeans+sampleSD+verdicts/20controls/APK-session-controlhash/journals. Result1PASS/45PLATFORM-BOUND/0CODE-BOUND/40FAIL(46/86qualify),worsethan16k56/86. Appendp50 13.16->15.20ms,p95 26.64->60.12ms(PB->FAIL);resetp50 24.10->26.44msstillFAIL. K5000tenkeyp50 9.84->9.46msbetterbutstillFAIL;replace12.66->12.62msstillFAIL. No broadworkloadwin orcausalclaimthatthechangeexplainsallcross-sessiondifferences. Fulladversecomparisonbelow. Startupguardremainsuncleared,list16L7stillactive,retentionnotfinal.

|Group/metric|SQLite16k mean|SQLite16n mean|Delta|16k verdict|16n verdict|
|---|---:|---:|---:|---|---|
|flat/50.setKey.emitP50|7.420000|8.060000|+0.640000|FAIL|FAIL|
|flat/50.setKey.emitP95|21.920000|20.140000|-1.780000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.setKey.domP50|8.600000|8.840000|+0.240000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.setKey.domP95|22.580000|20.980000|-1.600000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.setKeys.emitP50|7.380000|8.160000|+0.780000|FAIL|FAIL|
|flat/50.setKeys.emitP95|22.120000|18.420000|-3.700000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.setKeys.domP50|8.420000|8.760000|+0.340000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.setKeys.domP95|22.680000|19.020000|-3.660000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.replace.emitP50|7.020000|6.820000|-0.200000|FAIL|FAIL|
|flat/50.replace.emitP95|17.320000|19.060000|+1.740000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.replace.domP50|7.880000|7.480000|-0.400000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.replace.domP95|18.100000|19.480000|+1.380000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.burst.lagP50|6.080000|6.380000|+0.300000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.burst.lagP95|14.920000|17.200000|+2.280000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.burst.endLag|10.300000|7.120000|-3.180000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.burst.maxBacklog|2.200000|2.400000|+0.200000|FAIL|FAIL|
|flat/50.heapMb|5.076804|5.041421|-0.035383|FAIL|FAIL|
|flat/50.pssTotalMb|237.288867|236.489648|-0.799219|FAIL|FAIL|
|flat/500.setKey.emitP50|8.020000|7.880000|-0.140000|FAIL|FAIL|
|flat/500.setKey.emitP95|19.880000|24.420000|+4.540000|PLATFORM-BOUND|FAIL|
|flat/500.setKey.domP50|8.720000|8.420000|-0.300000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.setKey.domP95|20.400000|25.080000|+4.680000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.setKeys.emitP50|7.940000|8.700000|+0.760000|FAIL|FAIL|
|flat/500.setKeys.emitP95|20.760000|17.540000|-3.220000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.setKeys.domP50|8.500000|9.300000|+0.800000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.setKeys.domP95|21.320000|19.120000|-2.200000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.replace.emitP50|8.060000|8.700000|+0.640000|FAIL|FAIL|
|flat/500.replace.emitP95|20.900000|20.020000|-0.880000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.replace.domP50|8.520000|9.440000|+0.920000|FAIL|FAIL|
|flat/500.replace.domP95|21.720000|20.540000|-1.180000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.burst.lagP50|6.280000|6.440000|+0.160000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.burst.lagP95|13.040000|17.200000|+4.160000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.burst.endLag|6.640000|7.540000|+0.900000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.burst.maxBacklog|2.000000|2.000000|+0.000000|FAIL|FAIL|
|flat/500.heapMb|5.568442|5.529772|-0.038670|FAIL|FAIL|
|flat/500.pssTotalMb|238.353906|237.582422|-0.771484|PLATFORM-BOUND|FAIL|
|flat/5000.setKey.emitP50|9.740000|10.340000|+0.600000|FAIL|FAIL|
|flat/5000.setKey.emitP95|25.480000|21.640000|-3.840000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.setKey.domP50|11.000000|11.060000|+0.060000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.setKey.domP95|26.900000|22.780000|-4.120000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.setKeys.emitP50|9.840000|9.460000|-0.380000|FAIL|FAIL|
|flat/5000.setKeys.emitP95|19.280000|23.840000|+4.560000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.setKeys.domP50|10.440000|9.980000|-0.460000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.setKeys.domP95|19.940000|24.220000|+4.280000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.replace.emitP50|12.660000|12.620000|-0.040000|FAIL|FAIL|
|flat/5000.replace.emitP95|22.560000|21.880000|-0.680000|PLATFORM-BOUND|FAIL|
|flat/5000.replace.domP50|13.340000|13.320000|-0.020000|FAIL|FAIL|
|flat/5000.replace.domP95|23.100000|22.320000|-0.780000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.burst.lagP50|7.620000|8.140000|+0.520000|PLATFORM-BOUND|FAIL|
|flat/5000.burst.lagP95|13.880000|16.160000|+2.280000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.burst.endLag|7.540000|8.120000|+0.580000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.burst.maxBacklog|2.000000|2.000000|+0.000000|FAIL|FAIL|
|flat/5000.heapMb|9.954367|9.916428|-0.037939|FAIL|FAIL|
|flat/5000.pssTotalMb|245.954492|246.733008|+0.778516|FAIL|FAIL|
|workflow/edit_d1.emitP50|7.880000|8.680000|+0.800000|FAIL|FAIL|
|workflow/edit_d1.emitP95|17.420000|20.320000|+2.900000|PLATFORM-BOUND|FAIL|
|workflow/edit_d1.domP50|8.640000|9.420000|+0.780000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d1.domP95|18.400000|21.720000|+3.320000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d4.emitP50|7.840000|7.700000|-0.140000|FAIL|FAIL|
|workflow/edit_d4.emitP95|15.680000|17.320000|+1.640000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d4.domP50|8.280000|8.160000|-0.120000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d4.domP95|16.460000|17.740000|+1.280000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d10.emitP50|7.780000|7.860000|+0.080000|FAIL|FAIL|
|workflow/edit_d10.emitP95|17.080000|18.120000|+1.040000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d10.domP50|8.440000|8.440000|-0.000000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d10.domP95|17.820000|19.180000|+1.360000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/loadCycle.emitP50|15.060000|14.620000|-0.440000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/loadCycle.emitP95|50.660000|56.760000|+6.100000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/loadCycle.domP50|15.200000|14.780000|-0.420000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/loadCycle.domP95|51.160000|57.260000|+6.100000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/step.emitP50|7.140000|7.180000|+0.040000|FAIL|FAIL|
|workflow/step.emitP95|16.080000|19.460000|+3.380000|PLATFORM-BOUND|FAIL|
|workflow/step.domP50|7.620000|7.600000|-0.020000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/step.domP95|16.880000|20.980000|+4.100000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/reset.emitP50|24.100000|26.440000|+2.340000|FAIL|FAIL|
|workflow/reset.emitP95|49.940000|42.680000|-7.260000|PLATFORM-BOUND|FAIL|
|workflow/reset.domP50|24.200000|26.540000|+2.340000|FAIL|FAIL|
|workflow/reset.domP95|50.000000|42.680000|-7.320000|PLATFORM-BOUND|FAIL|
|workflow/append100.emitP50|13.160000|15.200000|+2.040000|FAIL|FAIL|
|workflow/append100.emitP95|26.640000|60.120000|+33.480000|PLATFORM-BOUND|FAIL|
|workflow/append100.domP50|13.560000|15.880000|+2.320000|FAIL|FAIL|
|workflow/append100.domP95|27.240000|60.440000|+33.200000|PLATFORM-BOUND|FAIL|
|workflow/heapMb|5.474697|5.475134|+0.000436|FAIL|FAIL|
|workflow/pssTotalMb|240.510352|240.221680|-0.288672|FAIL|FAIL|
|workflow/relaunchReadyMs|558.240000|861.180000|+302.940000|PASS|PASS|
|workflow/relaunchHeapMb|4.432150|4.458603|+0.026453|FAIL|FAIL|

## Full lists16L7

Verified30validobservations/66recomputedmeans+sampleSD/33verdicts/all4controlsession-device-APKprovenances/6boots/rootBashEXIT0/scriptSHA. Parent genuinely reports P16N_ACCEPT_DONE;Nodefile-FD wrapper fixes prior idle-wrapper completion accounting. Result13PASS/15PB/3CB/2FAIL(31/33qualified). Remaining50krelaunch1503.52ms:excess230.640vsallowance114.261,over116.379ms;50kemitp954.84ms:excess4.520vsallowance4.517,over~.003ms(stillFAIL,notroundedgreen).

AllSQLitemean increasesvs16L5 remainwithin sumofbefore/afterSD;reference15aa stillhasheapmeanincreasesbeyondsumSD,includingnotes~.054-.067MiB and10k/50ktodos~.062-.070MiB. Startupdiagnosticguard remainsuncleared;fullfirstReadymeansdo notshowbeyondsumSDincreasevs15aa,butnotproofitsdiagnosticproblemisfixed. No gateclosed. Keep16nprovisionalforprovenonegenerationandrepeat1k/10koverheadreductions;no broadshapeswin. Investigate actualpersisted50krelaunchcriticalpath next,thencontinue remaininggaps.

### SQLite means versus16L5

|Size/metric|Reference mean|16L7 mean|Delta|
|---|---:|---:|---:|
|1000/firstReadyMs|431.080000|411.360000|-19.720000|
|1000/relaunchReadyMs|1452.900000|1504.760000|+51.860000|
|1000/heapTodosMb|5.463909|5.455756|-0.008154|
|1000/heapNotesMb|6.196040|6.186316|-0.009724|
|1000/heapRelaunchMb|4.961367|4.974067|+0.012700|
|1000/pssTotalMb|235.752734|235.690234|-0.062500|
|1000/pssRelaunchTotalMb|221.813086|221.728711|-0.084375|
|1000/toggleP50|14.220000|12.620000|-1.600000|
|1000/toggleP95|49.720000|49.420000|-0.300000|
|1000/emitP50|3.300000|3.200000|-0.100000|
|1000/emitP95|4.880000|4.620000|-0.260000|
|10000/firstReadyMs|544.440000|575.440000|+31.000000|
|10000/relaunchReadyMs|1416.760000|1395.820000|-20.940000|
|10000/heapTodosMb|5.506484|5.502956|-0.003528|
|10000/heapNotesMb|6.256932|6.238189|-0.018743|
|10000/heapRelaunchMb|4.997613|4.998724|+0.001111|
|10000/pssTotalMb|243.675000|243.833203|+0.158203|
|10000/pssRelaunchTotalMb|222.264453|222.941992|+0.677539|
|10000/toggleP50|13.140000|13.240000|+0.100000|
|10000/toggleP95|44.940000|43.520000|-1.420000|
|10000/emitP50|3.300000|3.220000|-0.080000|
|10000/emitP95|5.300000|4.820000|-0.480000|
|50000/firstReadyMs|1198.880000|1165.620000|-33.260000|
|50000/relaunchReadyMs|1505.460000|1503.520000|-1.940000|
|50000/heapTodosMb|5.540056|5.537345|-0.002711|
|50000/heapNotesMb|6.266001|6.252009|-0.013992|
|50000/heapRelaunchMb|5.010542|4.997863|-0.012679|
|50000/pssTotalMb|241.563672|241.508203|-0.055469|
|50000/pssRelaunchTotalMb|223.766602|222.262891|-1.503711|
|50000/toggleP50|12.340000|12.360000|+0.020000|
|50000/toggleP95|40.400000|48.760000|+8.360000|
|50000/emitP50|3.260000|3.240000|-0.020000|
|50000/emitP95|4.660000|4.840000|+0.180000|

### SQLite means versus16L6

|Size/metric|Reference mean|16L7 mean|Delta|
|---|---:|---:|---:|
|1000/firstReadyMs|411.480000|411.360000|-0.120000|
|1000/relaunchReadyMs|1441.960000|1504.760000|+62.800000|
|1000/heapTodosMb|5.454423|5.455756|+0.001333|
|1000/heapNotesMb|6.197674|6.186316|-0.011358|
|1000/heapRelaunchMb|4.962177|4.974067|+0.011890|
|1000/pssTotalMb|236.254492|235.690234|-0.564258|
|1000/pssRelaunchTotalMb|223.008008|221.728711|-1.279297|
|1000/toggleP50|13.560000|12.620000|-0.940000|
|1000/toggleP95|49.740000|49.420000|-0.320000|
|1000/emitP50|3.280000|3.200000|-0.080000|
|1000/emitP95|5.220000|4.620000|-0.600000|
|10000/firstReadyMs|547.100000|575.440000|+28.340000|
|10000/relaunchReadyMs|1485.240000|1395.820000|-89.420000|
|10000/heapTodosMb|5.506552|5.502956|-0.003596|
|10000/heapNotesMb|6.252785|6.238189|-0.014597|
|10000/heapRelaunchMb|4.987317|4.998724|+0.011407|
|10000/pssTotalMb|244.834961|243.833203|-1.001758|
|10000/pssRelaunchTotalMb|223.378516|222.941992|-0.436523|
|10000/toggleP50|13.420000|13.240000|-0.180000|
|10000/toggleP95|45.080000|43.520000|-1.560000|
|10000/emitP50|3.340000|3.220000|-0.120000|
|10000/emitP95|5.300000|4.820000|-0.480000|
|50000/firstReadyMs|1193.240000|1165.620000|-27.620000|
|50000/relaunchReadyMs|1537.560000|1503.520000|-34.040000|
|50000/heapTodosMb|5.519324|5.537345|+0.018021|
|50000/heapNotesMb|6.252134|6.252009|-0.000125|
|50000/heapRelaunchMb|4.987029|4.997863|+0.010835|
|50000/pssTotalMb|241.773242|241.508203|-0.265039|
|50000/pssRelaunchTotalMb|223.160742|222.262891|-0.897852|
|50000/toggleP50|12.520000|12.360000|-0.160000|
|50000/toggleP95|43.760000|48.760000|+5.000000|
|50000/emitP50|3.280000|3.240000|-0.040000|
|50000/emitP95|4.800000|4.840000|+0.040000|

### SQLite means versus15aa

|Size/metric|Reference mean|16L7 mean|Delta|
|---|---:|---:|---:|
|1000/firstReadyMs|466.860000|411.360000|-55.500000|
|1000/relaunchReadyMs|1609.540000|1504.760000|-104.780000|
|1000/heapTodosMb|5.418520|5.455756|+0.037235|
|1000/heapNotesMb|6.131983|6.186316|+0.054333|
|1000/heapRelaunchMb|4.959883|4.974067|+0.014184|
|1000/pssTotalMb|236.332812|235.690234|-0.642578|
|1000/pssRelaunchTotalMb|222.950195|221.728711|-1.221484|
|1000/toggleP50|14.640000|12.620000|-2.020000|
|1000/toggleP95|53.700000|49.420000|-4.280000|
|1000/emitP50|3.640000|3.200000|-0.440000|
|1000/emitP95|5.420000|4.620000|-0.800000|
|10000/firstReadyMs|657.440000|575.440000|-82.000000|
|10000/relaunchReadyMs|1713.740000|1395.820000|-317.920000|
|10000/heapTodosMb|5.441012|5.502956|+0.061945|
|10000/heapNotesMb|6.177612|6.238189|+0.060577|
|10000/heapRelaunchMb|4.961635|4.998724|+0.037089|
|10000/pssTotalMb|244.485156|243.833203|-0.651953|
|10000/pssRelaunchTotalMb|223.544336|222.941992|-0.602344|
|10000/toggleP50|18.440000|13.240000|-5.200000|
|10000/toggleP95|56.500000|43.520000|-12.980000|
|10000/emitP50|4.360000|3.220000|-1.140000|
|10000/emitP95|6.860000|4.820000|-2.040000|
|50000/firstReadyMs|1440.340000|1165.620000|-274.720000|
|50000/relaunchReadyMs|1744.460000|1503.520000|-240.940000|
|50000/heapTodosMb|5.467016|5.537345|+0.070329|
|50000/heapNotesMb|6.184846|6.252009|+0.067162|
|50000/heapRelaunchMb|4.960965|4.997863|+0.036898|
|50000/pssTotalMb|242.418555|241.508203|-0.910352|
|50000/pssRelaunchTotalMb|223.454883|222.262891|-1.191992|
|50000/toggleP50|20.040000|12.360000|-7.680000|
|50000/toggleP95|57.560000|48.760000|-8.800000|
|50000/emitP50|4.420000|3.240000|-1.180000|
|50000/emitP95|6.600000|4.840000|-1.760000|
