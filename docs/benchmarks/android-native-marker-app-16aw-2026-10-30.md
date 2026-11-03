# Marker safety candidate16aw: native diagnostic

Independent verifier16aw-verify.cjs passed all6 guards,4 reversed50k reports,120toggles,800emissions,4 distinct workload boots plus2 distinct10k trace boots. Actual installed APK/session/trace/source hashes match. The external observer's pre-workload source hashes, including android-bench.mjs, are unchanged at completion. Raw samples and all11 paired channels are in the adjacent JSON.

Guard15aa mean1459.4667 SD96.7817ms versus16aw1375.6000 SD22.2731ms; delta-83.8667 within combinedSD119.0548. No startup regression established in this guard; no causal startup win/equivalence claim.

Both-order adverse: toggleP95 +5.4/+15.0ms and heapNotes +0.015747/+0.002632MiB. Both-order lower: emitP95 -.3/-.7ms and heapRelaunch -.000465/-.000740MiB; emitP50 unchanged. Relaunch +29.9/-217.1ms, firstReady -4.6/+10.8ms, totalPSS +.924805/-.929688MiB and relaunchPSS -.324219/+2.886719MiB are mixed. All favorable and adverse metrics remain, including mixed toggleP50/heapTodos. One-trial report verdicts are not acceptance.

Host regression establishes failed marker recording and database aliases now select the gate; it does not measure physical native leaks or explain old disk-full stalls. Normal-path emission/startup gains are not claimed. Full fresh matched16ay/16L21 acceptance is required for shared-path retention, against current16av/16L20 and historical context without changing floors.

10k startup trace evidence is separately annotated in android-relaunch-boundary-16ax-2026-10-30.json/md; no CPU/heap/PSS/GC capture in these two traces. Standard approved workload memory protocol remains unchanged.
