# 16bk canonical known-parent correctness diagnostic

Rejected; full acceptance not warranted by diagnostic startup/heap direction. Correctness regression remains open for a cheaper repair.

The six guards and four reversed standard50k one-trial reports independently passed provenance/completeness verification. Five distinct scoped boots,120 toggles,800 emissions,26 tracked source/tool/environment files and nine frozen contexts agree. Genuine root exit0; post452 library/40 tools/1 harness/30 E2E/library-build checks pass; frozen APK not rebuilt.

| Metric | B1 - A1 | B2 - A2 |
| --- | ---: | ---: |
| firstReadyMs | +141.600000000 | +177.300000000 |
| relaunchReadyMs | +243.000000000 | +146.000000000 |
| heapTodosMb | +0.062664032 | +0.060474396 |
| heapNotesMb | +0.022640228 | +0.028045654 |
| heapRelaunchMb | +0.019927979 | +0.022842407 |
| pssTotalMb | +0.611328125 | -1.494140625 |
| pssRelaunchTotalMb | +3.649414062 | -0.927734375 |
| toggleP50 | -8.900000000 | +1.100000000 |
| toggleP95 | +11.900000000 | -9.000000000 |
| emitP50 | +0.000000000 | +0.000000000 |
| emitP95 | +0.900000000 | -1.900000000 |

Guard15aa 1368.633333 SD15.002778 ms;16bk 1406.766667 SD30.009387. Delta +38.133333 ms is below SDsum45.012165, but all three pairs are adverse (+1.2/+87.2/+26). This does not establish equivalence or guard clearance.

Both-order adverse: firstReadyMs, relaunchReadyMs, heapTodosMb, heapNotesMb, heapRelaunchMb. EmitP50 unchanged; remaining channels mixed. No causal source attribution or full acceptance/retention claim.

All candidate guards have74 calls (25queries/43writes/1open); all15aa have68 (19/42/2). The prior16aw burst had73 (24/43/1). The additional exact router subtree read appears before seed generation in every candidate guard, wall4.4/49.3/36.6ms. Bindings identify router; no recorded JavaScript stack identifies its callsite. Finally-based durations do not establish native-call success.

SQL structural reloads are rejected for this repair. All eight generic correctness tests and full candidate source/APKs/raw reports remain archived; reverting does not make the underlying metadata regression correct. Next design must reuse complete known metadata and preserve canonical ordering/old snapshots without adding SQL reads. Full required checks/mandatory guards remain required for any new candidate.

Both goals and mean/heap debt remain open. Retained16av/16L20 reference unchanged. No commit, extra capture, new floor, or unchanged acceptance retry.
