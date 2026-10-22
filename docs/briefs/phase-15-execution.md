# Phase 15 execution record

The approved design and acceptance rules are the phase-15 brief and ADR-0038.
Work stays in the supplied workspace (the sandbox cannot write Git metadata).
No commits, worktrees or public API changes are required.

- [x] A: add independent alternating trials, sample SD, raw observations and acceptance arithmetic to the Android runner; install separate benchmark APK IDs once; measure native echo and executeSet throughput through a private hook.
- [x] B: capture app Java/native/other memory before, at sampled peak and after GC for a 50k seed; bound write transport while retaining one atomic transaction; regression-test rollback, Unicode sizing and ordinary small-batch behavior; repeat profiling.
- [ ] C: run five trials at 1k/10k/50k from a freshly booted emulator; investigate every failure, optimize supported paths, record remaining evidenced gaps in ADRs without changing verdicts.
- [ ] Verify library tests, library and both harness builds, and both Playwright projects; record Q17 disposition and final report.
- [ ] Last filesystem mutation: tick Phase 15 in CLAUDE.md in place, preserving its hard link to AGENTS.md.

Memory verdicts have no bridge time allowance. A latency bound may use only
minimum necessary calls/bytes, never observed redundant work. Failed or missing
measurements cannot become PASS. The final report retains failures even when an
ADR explains why they remain.
