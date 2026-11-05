# Phase16k: append ordering experiment

ADR-0099. Source removes identity buckets for an unchanged array prefix and LIS/anchor allocation for exact appends. Greedy SameValueZero matching, sparse behavior and renormalization remain equivalent in5000 generated differential cases. Two regression tests failed on original code (1000 buckets,19074 index reads) and pass on candidate.402 library/30e2e/library build pass. Android candidate build passed; SHA256 bbbfcf23a798e8d78a24dfaa2dd19ac8e8c3bf382090539724713fe0f8af4d95, archived `.tmp/16k-apks/sqlite.apk`. No device timing claim.

Local alternating30-pair diagnostic:1000+100items mean.176819->.112506ms;10000+100items2.029060->1.011923ms. These are function timings, not application timings. Raw `.tmp/16k-ordering-local.json`.

Planned sequential device runner `.tmp/16k-run.ps1`: verified reboot;50k list probes3A/3B against15aa; then reversedA1/B1/B2/A2 append30actions each against16j, each separate verified reboot. Actual APK hashes, boot IDs, raw action/native spans and CPU samples retained. Sampling/native wrapper perturb timing; no acceptance verdicts from this diagnostic. Full list acceptance remains required before closing a shared-path change.

Runner started PID5392; logs `.tmp/16k-run.stdout.log` / `.tmp/16k-run.stderr.log`. No tests/builds/profilers alongside this sequential runner.

## Partial monitor: list guard complete, append A1 complete

All six50k traces validate ready.total50000, finite timings and native calls. 15aa ready mean1319.7667ms/sampleSD123.8053;16k1274.1667ms/SD58.5925. Individual candidate-minus-baseline differences -253.7,+71.9,+45.0ms; two slower directions remain visible. This supports no consistent startup speedup. Native calls baseline68each,candidate69/75/69; candidate B2 includes an extra write and must remain in comparisons. Guard hashes are install-script/archive lineage, not captured inside each trace. No trial was excluded.

Append A1 hash/session match16j baseline;30samples/30nativecalls complete. Remaining reversed legs pending; no application benefit or acceptance conclusion yet.

## Completed reversed diagnostic (16K_DONE, exit0)

All6list traces,4append reports/120finite actions/120native calls,hashes/sessions and4distinct append boots verified by `.tmp/16k-verify.cjs`. Durable raw/verification companion: `android-append-ordering-16k-2026-10-27.json`; CPU profiles retained separately in `.tmp/16k-append-*.cpuprofile`.

| Leg | emit p50 ms | emit p95 ms | native-response p50 ms | non-native p50 ms | sampled non-idle ms | sampled GC ms | parameter bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A1 |14.8|23.1|8.3|5.7|584.149|38.254|501516|
| B1 |14.7|23.2|8.8|5.1|514.133|28.078|501516|
| B2 |14.4|25.0|8.9|5.0|559.271|36.604|498516|
| A2 |13.9|23.5|7.7|5.9|554.825|18.860|501516|

Candidate non-native median is lower in both directions (-0.6/-0.9ms), but total emission p50 is mixed (-0.1/+0.5ms), p95 worse (+0.1/+1.5ms), and sampled non-idle work mixed (-70.016/+4.446ms). B2 parameter payload is3000bytes smaller; all data retained, no asserted cause or byte-identical claim. SQL/native call counts remain30each. Non-native is each action's emission interval minus its native response interval, not direct CPU time. Instrumentation includes CPU sampling/native wrapper and perturbs timing; the full unprofiled acceptance must decide verdicts. No general application speedup established.

Decision: retain provisionally for the demonstrated elimination of identity buckets/LIS work on exact appends, with repeated lower non-native medians as diagnostic support. Run fresh matched shapes16k + full lists16L5 after post-device checks. Both original goals and ADR0091 gate remain open; no new floor applied.

Post-device validation402library/25tools/1harness/30e2e/librarybuild passed. Full acceptance active PID29628 (`.tmp/p16k-accept.ps1`), fresh shapes16k then full lists16L5 sequentially; frozen candidate, no rebuild. Results pending.

## Full shapes16k acceptance

Independently verified10complete paired trials (5perimplementation),86means/sample-SD/verdicts,20paired empty controls,session/APK/control hashes andcomplete journals. Result1PASS/55PLATFORM-BOUND/0CODE-BOUND/30FAIL(56/86qualify),versus corrected16j3 3/47/0/36(50/86). No shape goal closure. Both share ADR0098 startup/background normalization. Fresh controls/classic timings can shift verdicts; count changes alone are not isolated code gains.

Append100 emissionp50 15.12->13.16ms (stillFAIL),p95 66.26->26.64ms(nowPB). Resetp50 25.44->24.10ms(stillFAIL). FlatK5000replace12.60->12.66ms and10key9.80->9.84ms are slightly slower;K500replaceDOMp50 regressed PB->FAIL. All metrics,including adverse mean changes, are listed below. Timing changes are measured across sessions and do not establish sole causality.

Initial independent verifier failed because its copied archive assertion still named `.tmp/16j-apks`; corrected it to the actual frozen `.tmp/16k-apks`,preserving prior verifier `.tmp/16k-shapes-verify.before-archive-fix.cjs`. Manifest/control hashes already matchedcandidate. No sample or measurement rerun/change. Verified summary `android-shapes-session-16k-2026-10-27.json`.

| Group/metric | SQLite16j3 mean | SQLite16k mean | Delta |16j3 verdict|16k verdict|
| --- | ---: | ---: | ---: | --- | --- |
|flat/50.setKey.emitP50|7.760000|7.420000|-0.340000|FAIL|FAIL|
|flat/50.setKey.emitP95|21.520000|21.920000|+0.400000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.setKey.domP50|8.580000|8.600000|+0.020000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.setKey.domP95|22.020000|22.580000|+0.560000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.setKeys.emitP50|9.400000|7.380000|-2.020000|FAIL|FAIL|
|flat/50.setKeys.emitP95|18.720000|22.120000|+3.400000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.setKeys.domP50|10.140000|8.420000|-1.720000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.setKeys.domP95|19.420000|22.680000|+3.260000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.replace.emitP50|7.460000|7.020000|-0.440000|FAIL|FAIL|
|flat/50.replace.emitP95|19.980000|17.320000|-2.660000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.replace.domP50|7.940000|7.880000|-0.060000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.replace.domP95|20.740000|18.100000|-2.640000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.burst.lagP50|6.000000|6.080000|+0.080000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.burst.lagP95|13.580000|14.920000|+1.340000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.burst.endLag|6.880000|10.300000|+3.420000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/50.burst.maxBacklog|2.000000|2.200000|+0.200000|FAIL|FAIL|
|flat/50.heapMb|5.071863|5.076804|+0.004941|FAIL|FAIL|
|flat/50.pssTotalMb|237.627344|237.288867|-0.338477|FAIL|FAIL|
|flat/500.setKey.emitP50|7.780000|8.020000|+0.240000|FAIL|FAIL|
|flat/500.setKey.emitP95|17.560000|19.880000|+2.320000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.setKey.domP50|8.640000|8.720000|+0.080000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.setKey.domP95|18.540000|20.400000|+1.860000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.setKeys.emitP50|9.140000|7.940000|-1.200000|FAIL|FAIL|
|flat/500.setKeys.emitP95|17.520000|20.760000|+3.240000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.setKeys.domP50|9.760000|8.500000|-1.260000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.setKeys.domP95|18.120000|21.320000|+3.200000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.replace.emitP50|9.740000|8.060000|-1.680000|FAIL|FAIL|
|flat/500.replace.emitP95|17.080000|20.900000|+3.820000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.replace.domP50|10.100000|8.520000|-1.580000|PLATFORM-BOUND|FAIL|
|flat/500.replace.domP95|18.820000|21.720000|+2.900000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.burst.lagP50|6.280000|6.280000|-0.000000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.burst.lagP95|15.180000|13.040000|-2.140000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.burst.endLag|7.740000|6.640000|-1.100000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/500.burst.maxBacklog|2.000000|2.000000|+0.000000|FAIL|FAIL|
|flat/500.heapMb|5.567703|5.568442|+0.000739|FAIL|FAIL|
|flat/500.pssTotalMb|238.492969|238.353906|-0.139062|FAIL|PLATFORM-BOUND|
|flat/5000.setKey.emitP50|9.860000|9.740000|-0.120000|FAIL|FAIL|
|flat/5000.setKey.emitP95|25.520000|25.480000|-0.040000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.setKey.domP50|10.700000|11.000000|+0.300000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.setKey.domP95|26.420000|26.900000|+0.480000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.setKeys.emitP50|9.800000|9.840000|+0.040000|FAIL|FAIL|
|flat/5000.setKeys.emitP95|18.540000|19.280000|+0.740000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.setKeys.domP50|10.420000|10.440000|+0.020000|FAIL|PLATFORM-BOUND|
|flat/5000.setKeys.domP95|19.240000|19.940000|+0.700000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.replace.emitP50|12.600000|12.660000|+0.060000|FAIL|FAIL|
|flat/5000.replace.emitP95|21.420000|22.560000|+1.140000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.replace.domP50|13.400000|13.340000|-0.060000|FAIL|FAIL|
|flat/5000.replace.domP95|22.080000|23.100000|+1.020000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.burst.lagP50|7.760000|7.620000|-0.140000|FAIL|PLATFORM-BOUND|
|flat/5000.burst.lagP95|14.800000|13.880000|-0.920000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.burst.endLag|9.020000|7.540000|-1.480000|PLATFORM-BOUND|PLATFORM-BOUND|
|flat/5000.burst.maxBacklog|2.000000|2.000000|+0.000000|FAIL|FAIL|
|flat/5000.heapMb|9.952927|9.954367|+0.001440|FAIL|FAIL|
|flat/5000.pssTotalMb|246.873828|245.954492|-0.919336|FAIL|FAIL|
|workflow/edit_d1.emitP50|7.720000|7.880000|+0.160000|FAIL|FAIL|
|workflow/edit_d1.emitP95|16.660000|17.420000|+0.760000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d1.domP50|8.660000|8.640000|-0.020000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d1.domP95|17.900000|18.400000|+0.500000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d4.emitP50|7.620000|7.840000|+0.220000|FAIL|FAIL|
|workflow/edit_d4.emitP95|15.820000|15.680000|-0.140000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d4.domP50|8.300000|8.280000|-0.020000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d4.domP95|16.240000|16.460000|+0.220000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d10.emitP50|7.760000|7.780000|+0.020000|FAIL|FAIL|
|workflow/edit_d10.emitP95|16.760000|17.080000|+0.320000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d10.domP50|8.460000|8.440000|-0.020000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/edit_d10.domP95|17.300000|17.820000|+0.520000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/loadCycle.emitP50|14.380000|15.060000|+0.680000|PASS|PLATFORM-BOUND|
|workflow/loadCycle.emitP95|50.840000|50.660000|-0.180000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/loadCycle.domP50|14.800000|15.200000|+0.400000|PASS|PLATFORM-BOUND|
|workflow/loadCycle.domP95|51.340000|51.160000|-0.180000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/step.emitP50|7.360000|7.140000|-0.220000|FAIL|FAIL|
|workflow/step.emitP95|17.440000|16.080000|-1.360000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/step.domP50|7.900000|7.620000|-0.280000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/step.domP95|17.760000|16.880000|-0.880000|PLATFORM-BOUND|PLATFORM-BOUND|
|workflow/reset.emitP50|25.440000|24.100000|-1.340000|FAIL|FAIL|
|workflow/reset.emitP95|44.240000|49.940000|+5.700000|FAIL|PLATFORM-BOUND|
|workflow/reset.domP50|25.640000|24.200000|-1.440000|FAIL|FAIL|
|workflow/reset.domP95|44.280000|50.000000|+5.720000|FAIL|PLATFORM-BOUND|
|workflow/append100.emitP50|15.120000|13.160000|-1.960000|FAIL|FAIL|
|workflow/append100.emitP95|66.260000|26.640000|-39.620000|FAIL|PLATFORM-BOUND|
|workflow/append100.domP50|15.540000|13.560000|-1.980000|FAIL|FAIL|
|workflow/append100.domP95|66.600000|27.240000|-39.360000|FAIL|PLATFORM-BOUND|
|workflow/heapMb|5.482355|5.474697|-0.007658|FAIL|FAIL|
|workflow/pssTotalMb|241.236914|240.510352|-0.726562|FAIL|FAIL|
|workflow/relaunchReadyMs|659.160000|558.240000|-100.920000|PASS|PASS|
|workflow/relaunchHeapMb|4.483666|4.432150|-0.051516|FAIL|FAIL|

## Full lists16L5 acceptance

Verified30validobservations/66independentlyrecomputedmeans+sampleSD/33verdicts/all4controlsession/device/APKprovenances/6distinctboots. Actual Bash PIPELINE_DONE/PIPELINE_EXIT=0. Result14PASS/12PB/3CB/4FAIL(29/33qualify),vs16L4 12/17/3/1(32/33). Failures:1ktogglep50(overallowance0.675ms),10kemitp95(0.101ms),50kemitp50(0.105ms)/p95(0.185ms). No acceptance gate closed. Counts moved unfavorably despite no SQLite mean increase beyond the sum of before/afterSD versus16L4; changed classic/floor references matter. Full comparisons include both positive and negative deltas below.

Outer PowerShell reported `P16K_ACCEPT_ERROR=list acceptance failed` with blank Process.ExitCode after WaitForExit. Preserve that parent error separately from the genuine Bash exit0 and verified samples (`.tmp/16k-accept-finalization.json`). No timed rerun or fake parent exit0. Future wrappers must retrieve process exit with Start-Process -Wait -PassThru rather than a detached Process object losing its exit handle.

### SQLite means versus16L4

|Size/metric|Reference mean|16L5 mean|Delta|
|---|---:|---:|---:|
|1000/firstReadyMs|486.160000|431.080000|-55.080000|
|1000/relaunchReadyMs|1491.680000|1452.900000|-38.780000|
|1000/heapTodosMb|5.438883|5.463909|+0.025026|
|1000/heapNotesMb|6.193784|6.196040|+0.002256|
|1000/heapRelaunchMb|4.996924|4.961367|-0.035557|
|1000/pssTotalMb|235.918359|235.752734|-0.165625|
|1000/pssRelaunchTotalMb|222.688477|221.813086|-0.875391|
|1000/toggleP50|13.900000|14.220000|+0.320000|
|1000/toggleP95|51.340000|49.720000|-1.620000|
|1000/emitP50|3.300000|3.300000|-0.000000|
|1000/emitP95|4.880000|4.880000|-0.000000|
|10000/firstReadyMs|519.880000|544.440000|+24.560000|
|10000/relaunchReadyMs|1383.240000|1416.760000|+33.520000|
|10000/heapTodosMb|5.504885|5.506484|+0.001599|
|10000/heapNotesMb|6.250503|6.256932|+0.006429|
|10000/heapRelaunchMb|4.998055|4.997613|-0.000442|
|10000/pssTotalMb|244.230273|243.675000|-0.555273|
|10000/pssRelaunchTotalMb|222.348828|222.264453|-0.084375|
|10000/toggleP50|13.700000|13.140000|-0.560000|
|10000/toggleP95|48.480000|44.940000|-3.540000|
|10000/emitP50|3.300000|3.300000|+0.000000|
|10000/emitP95|5.240000|5.300000|+0.060000|
|50000/firstReadyMs|1191.460000|1198.880000|+7.420000|
|50000/relaunchReadyMs|1494.040000|1505.460000|+11.420000|
|50000/heapTodosMb|5.514545|5.540056|+0.025510|
|50000/heapNotesMb|6.250034|6.266001|+0.015967|
|50000/heapRelaunchMb|4.986211|5.010542|+0.024332|
|50000/pssTotalMb|241.295312|241.563672|+0.268359|
|50000/pssRelaunchTotalMb|223.767188|223.766602|-0.000586|
|50000/toggleP50|12.780000|12.340000|-0.440000|
|50000/toggleP95|46.720000|40.400000|-6.320000|
|50000/emitP50|3.300000|3.260000|-0.040000|
|50000/emitP95|4.840000|4.660000|-0.180000|

### SQLite means versus15aa

|Size/metric|Reference mean|16L5 mean|Delta|
|---|---:|---:|---:|
|1000/firstReadyMs|466.860000|431.080000|-35.780000|
|1000/relaunchReadyMs|1609.540000|1452.900000|-156.640000|
|1000/heapTodosMb|5.418520|5.463909|+0.045389|
|1000/heapNotesMb|6.131983|6.196040|+0.064057|
|1000/heapRelaunchMb|4.959883|4.961367|+0.001484|
|1000/pssTotalMb|236.332812|235.752734|-0.580078|
|1000/pssRelaunchTotalMb|222.950195|221.813086|-1.137109|
|1000/toggleP50|14.640000|14.220000|-0.420000|
|1000/toggleP95|53.700000|49.720000|-3.980000|
|1000/emitP50|3.640000|3.300000|-0.340000|
|1000/emitP95|5.420000|4.880000|-0.540000|
|10000/firstReadyMs|657.440000|544.440000|-113.000000|
|10000/relaunchReadyMs|1713.740000|1416.760000|-296.980000|
|10000/heapTodosMb|5.441012|5.506484|+0.065472|
|10000/heapNotesMb|6.177612|6.256932|+0.079320|
|10000/heapRelaunchMb|4.961635|4.997613|+0.035978|
|10000/pssTotalMb|244.485156|243.675000|-0.810156|
|10000/pssRelaunchTotalMb|223.544336|222.264453|-1.279883|
|10000/toggleP50|18.440000|13.140000|-5.300000|
|10000/toggleP95|56.500000|44.940000|-11.560000|
|10000/emitP50|4.360000|3.300000|-1.060000|
|10000/emitP95|6.860000|5.300000|-1.560000|
|50000/firstReadyMs|1440.340000|1198.880000|-241.460000|
|50000/relaunchReadyMs|1744.460000|1505.460000|-239.000000|
|50000/heapTodosMb|5.467016|5.540056|+0.073040|
|50000/heapNotesMb|6.184846|6.266001|+0.081155|
|50000/heapRelaunchMb|4.960965|5.010542|+0.049577|
|50000/pssTotalMb|242.418555|241.563672|-0.854883|
|50000/pssRelaunchTotalMb|223.454883|223.766602|+0.311719|
|50000/toggleP50|20.040000|12.340000|-7.700000|
|50000/toggleP95|57.560000|40.400000|-17.160000|
|50000/emitP50|4.420000|3.260000|-1.160000|
|50000/emitP95|6.600000|4.660000|-1.940000|
