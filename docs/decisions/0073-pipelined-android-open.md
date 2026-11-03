# ADR-0073: Send Android create/open without an intermediate bridge wait

Status: Experiment (Agent, 2026-10-24; device A/B pending)

## Located cost

The Phase 15j startup trace sends native `createConnection` at 1287.7 ms, waits
52.2 ms for its acknowledgement, and then sends `open`, which takes another
37.0 ms. These requests are dependent natively, but Android's ordered plugin queue
can enforce that dependency without a JS acknowledgement between them.

## Candidate and failure behavior

Only the native Android optimistic-create path sends `open` immediately after
`createConnection`. It uses the plugin's same normalized database name and readonly
flag. Both promises settle before readiness, cleanup, or stale-handle recovery.
The SQLiteConnection wrapper still registers the returned DB handle normally.

If creation reports an existing handle, wait for both speculative calls, run the
existing consistency sweep, recreate, and open sequentially. An arbitrary creation
failure remains the reported error even when speculative open also fails. A failed
open closes the newly created connection. iOS, web, and already registered JS
connections keep their previous startup paths. WAL validation remains required
before subsequent operations resolve. Persistence and notification timing do not
change.

## Validation and retention

The new ordering test deliberately delays create's acknowledgement and requires
open to have been sent already. It fails on the old driver. Tests cover stale
transactions on reload, failed-open cleanup/retry, dual creation/open failure, and
`.db` name normalization. A reversed device A/B against the Phase 15j candidate
will decide whether this saves measurable startup time; no acceptance improvement
is claimed before that comparison.

## Device experiment

The [reversed A/B evidence](../benchmarks/android-ladders-15k-2026-10-24.md)
shows 10k first-ready reductions of 31.9 and 17.5 ms in opposite-order comparisons.
Relaunch is lower at both sizes in both comparisons, but the differences range
from 1.2 to 162 ms. The 1k first-ready direction differs. These small diagnostics
do not establish a reliable effect size or parity.

The candidate trace (`.tmp/startup-15k-1000.json`) confirms create at 1301.1 ms
and open at 1301.8 ms, a 0.7 ms send gap instead of the previous 52.3 ms. Both
complete before schema work begins. Open's elapsed duration includes waiting for
creation in the native queue; overlapping call durations must not be summed.
Retain the candidate for a full clean-session acceptance with fresh matched controls.

## Full acceptance

Session `15k-audit-1792810706` completed 30 observations and 33 verdicts:
**10 PASS / 12 PLATFORM-BOUND / 3 CODE-BOUND / 8 FAIL**. All four control files
match the session and APK hashes; raw group means and sample SDs were independently
recomputed. The [full comparison](../benchmarks/android-ladders-15k-2026-10-24.md)
and [session record](../benchmarks/android-session-15k-2026-10-24.json) preserve
the result. This does not satisfy the user's pass/platform-bound requirement.
Classification changes across independent sessions are not attributed solely to
this driver change. Remaining failures include toggle and emission latency and
10k/50k relaunch; no floor was broadened.
