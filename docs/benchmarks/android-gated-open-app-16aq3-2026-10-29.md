# Gated-open Android diagnostic 16aq3

All six mandatory guards and four reversed 50k workloads completed and independently verified on isolated emulator-5556. Actual APK/session/source/trace hashes, four distinct workload boots, 120 toggles and 800 emissions match. All raw samples are preserved. One-trial verdicts are insufficient-trial placeholders, not acceptance.

The mandatory document-reload guard was 1320.3000 ms (sample SD 49.3146) for15aa versus1857.7667 ms (753.0500) for candidate. Delta +537.4667 ms is within combined SD802.3646, driven by the adverse2720.1 ms candidate third observation. All three candidate observations were slower than their paired baseline. This does not establish startup equivalence or a win.

Reversed relaunch deltas are +388.4/+325.7 ms; emit P95 -7.2/+0.8 ms, first-ready -690.1/+77.8 ms. Heap relaunch +0.001881/+0.062317 MiB; total PSS +5.244141/+2.557617 MiB; relaunch PSS +2.050781/+3.137695 MiB. Heap todos/notes lower both orders; other latency channels mixed. Every metric, including favorable and adverse, is in the adjacent JSON.

Full acceptance is held. Source ownership-model correctness remains supported, but native leak/stall/disk-full causality and performance retention are unproven. Guard traces show the altered create/sweep/create/open boundary; they do not capture the measured cold-process relaunch. Next16at diagnostic captures existing opt-in startup call/timeline instrumentation on the same two APKs during persisted cold-process relaunch, both orders with distinct verified cold boots. No app edit/rebuild, automatic retry, CPU/heap capture, new floor or acceptance arithmetic change. Instrumented timings are diagnostic wall time and cannot replace uninstrumented acceptance.

Isolated AVD protects targeting and foreground state; both VMs share host resources. Old shared-environment comparisons cannot establish causal code gains. Frozen candidate0076a0ad073a12bb5c2428c52cfe72cc33c8a05465e5a83cd891390ea26f177d remains provisional; retained16r remains the acceptance reference. Both goals and heap debt remain open.
