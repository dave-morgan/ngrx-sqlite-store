# ADR-0040: Independent Android parity measurements

Status: Accepted. Date: 2026-10-22. Authority: Phase 15 / ADR-0038.

## Decision

Install benchmark-only APKs with `.classic` and `.sqlite` application ID suffixes,
once before a run; normal application IDs remain unchanged. Alternate the paired
implementation order per trial and clear app data for every size. Stop inactive
implementations so their renderers cannot contribute PSS. Cache the APKs for
`--skip-build`. Keep full-precision observations until report formatting.

Record summary readiness in the private `window.__harness` benchmark hook with a
MutationObserver installed before first render. Reading performance.now() only
after CDP attaches overstates early readiness. Record emission samples through
the hook using the same selector/dispatch loop as Diagnostics, avoiding display
rounding. No production UI or reducer behavior changes.

Measure echo p50 and sample SD over 200 calls and regress executeSet elapsed
milliseconds against serialized UTF-8 payload bytes at 64 KiB, 256 KiB, 1 MiB
and 4 MiB (five repeats each). The inverse slope is effective bandwidth; retain
the intercept and every sample. This includes native insert work and is an
effective transport measurement, not an assertion about theoretical wire speed.
Only justified minimum calls/bytes can enter ADR-0038 arithmetic. Memory never
receives a latency allowance. Missing observations produce FAIL.

Separate 500 ms dumpsys profiling from statistical trials because polling and
explicit GC perturb timing. Send the Java GC signal through debug `run-as`, as
the Android shell cannot signal the application UID directly. Keep Java/native/
other PSS and full dumpsys output before, at sampled peak and after GC. A sampled
peak is a lower bound on the true instantaneous peak.

## Execution environment

The sandbox has no network and cannot write user caches. Builds use the locally
cached Gradle executable, a workspace-local Gradle home and Android SDK copy,
and Gradle's shared read-only dependency cache. These are execution paths, not
build or durability changes. Android reported 321 MiB free and refused new APKs
under its default low-storage reserve; benchmark installation temporarily sets
`sys_storage_threshold_percentage=1` and `sys_storage_threshold_max_bytes=10485760`.
Both settings were originally absent and are removed after measurements. A
cache-trim request did not free enough space; no other app's user data was
cleared. Reports identify this emulator storage condition.

## Consequences

Raw per-trial JSON makes all verdicts reproducible. A report-only invocation can
apply additional written minimum-operation evidence to unchanged observations;
it cannot modify their samples. Profile reports with one trial intentionally
have no statistical acceptance and are not the final parity report.
