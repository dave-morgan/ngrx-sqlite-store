# ADR-0078: Track the watched signal value instead of every cache generation

Status: Accepted for redundant work removal; overall parity did not improve (Agent, 2026-10-24)

`selectSignal` already installs a watcher that updates its private value signal
when the selected result changes and writes a fresh sentinel on failure. Its
returned computed also reads the global PathCache generation, invalidating it
for unrelated committed paths. A regression selecting `todos/items` observes
one unnecessary equality comparison when only `todos/filter` changes.

Remove the global generation dependency. Always read the private value signal
before testing the failure flag, so the computed retains a reactive dependency
even when it throws and can recover on the next value/sentinel update. Preserve
custom equality, selector subscriptions/leases, default loading, error recovery,
destroy ownership and persistence/commit publication order. No schema change.

The new regression fails before implementation. It must skip unrelated equality
work while still updating on an appended item; the existing error/recovery test
must continue passing. Then run full library/e2e validation and builds, measure
reversed APKs and retain only demonstrated benefit or redundant work removal.
No timing win or parity qualification is inferred from this code change.

The preceding15p native diagnostic compared `run` with a one-element `executeSet`
under identical atomic UPDATEs, alternating order and120 samples per method.
Back-to-back p50 both3.4ms, means3.47/3.75ms; paced p50 4.0/3.9ms, means4.04/4.65ms
and p95 4.8/5.1ms. It establishes no repeatable benefit; the driver is unchanged.
Raw `.tmp/15p-single-write-gap{0,20}.json` and their logs are retained.

Validation:349 library tests (including custom equality and error/recovery),26e2e and library/SQLite APK builds pass. Reversed runner `.tmp/15q-ab.sh` PID23684 logs `.tmp/15q-ab.stdout.log/.stderr.log`: A1/B1/B2/A2 at1k+10k, each after separate verified coldboot+60s settle. Baseline15o and candidate15q APKs archived. Timing pending; no acceptance claim.

Reversed APK result verified8observations/4boots/APK/session/sample provenance; exit0.10k emitP50 improves0.1ms both directions, toggleP95 improves19.2/4.0ms.1k mixed, including B1 toggleP95+34.8ms; all regressions preserved. Retain for proven redundant equality elimination and repeated10k direction, then fresh full acceptance with matching controls. [Complete table](../benchmarks/android-ladders-15q-2026-10-24.md).

Full15q verified30observations/66recomputed summaries/33verdicts/four control provenances:11PASS/10PB/3CB/9FAIL, versus15o12PASS/10PB/3CB/8FAIL. Qualified total falls22->21. Independent sessions do not prove causality; retain only regression-proven removal of unnecessary equality comparisons, not a general performance claim. All samples retained; continue remaining gaps. [Full outcome](../benchmarks/android-ladders-15q-2026-10-24.md).
