# ADR-0076: Preserve known locations through subtree replacement

Status: Accepted for proven redundant SQL removal; general timing benefit unproven (Agent, 2026-10-24)

The 50k persisted startup diagnostic `.tmp/startup-15n-50000.json`, using
the hash-verified 15l baseline APK, records two consecutive router root-position
queries. Their observed bridge durations are 914.8/960.1ms in this diagnostic;
these include scheduling/waiting and are not native SQL execution measurements
or an acceptance speedup estimate.

`StoreTx.set` resolves a location, but `diffWrite` discards its supplied location
when the previous value is absent or lacks metadata. `writeSubtree` then queries
again. A successfully read, absent feature root also already establishes its
default location: null parent/position. Nested nodes still require their actual
location; explicit transaction/committed locations retain precedence.

Pass the optional known location through the replacement path. For an absent
feature root, supply the root default rather than querying. Keep all existing
location lookups when a location is unknown. This changes neither schema nor
write transport, transaction boundaries, persistence or notification timing.

Two regressions fail before implementation: the known-absent root performs two
queries instead of zero; explicit nested location is discarded and queried again.
Verify persisted values and positions, full library/e2e tests and builds, then
trace the actual candidate and compare reversed APK measurements. Retention
requires proven redundant work removal or demonstrated benefit. Do not infer a
general latency win by summing the two diagnostic bridge durations.

Validation:347 library tests and26 e2e tests pass (confirmed exit0); library and SQLite APK builds pass. Active reversed runner `.tmp/15n-ab.sh` PID26196 logs `.tmp/15n-ab.stdout.log/.stderr.log`. It explicitly installs the candidate, captures and validates a50k startup trace, then runs50k A1/B1/B2/A2 with a separate verified coldboot/60s settle per leg. Each single-trial report is diagnostic only. Candidate/baseline APKs archived in `.tmp/15n-candidate` and `.tmp/15n-baseline`.

Candidate trace verified:50k ready, matching SHA-256 `052d511bd6f9d13c5ffafbb82e9dc23e16f346540cbf0cd820fe654db5de8f00`, router position reads2->0 (`.tmp/15n-startup-proof.json`). Initial runner stopped before any A/B trial because the validation script incorrectly expected boolean readiness rather than `{total,ms}`. Logs `.tmp/15n-ab.stdout.log/.stderr.log` retained. Corrected the assertion to validate50000 rows and finite time; resumed ONLY the A/B legs via `.tmp/15n-ab-resume.sh` PID35272 logs `.tmp/15n-ab-resume.stdout.log/.stderr.log`. No diagnostic or acceptance sample discarded or rerun.

Reversed A/B finished exit0 with4 verified observations and distinct boots. First-ready mixed(-32.3/+188.2ms), relaunch slower48.2/47.8ms, toggleP95 slower10.6/6.3ms. These diagnostics establish no timing win or causal regression; retain only for trace-proven2->0 redundant reads and correct preservation of supplied locations. No immediate unchanged full acceptance based on this result; continue located-cost investigation. See [complete table](../benchmarks/android-ladders-15n-2026-10-24.md).
