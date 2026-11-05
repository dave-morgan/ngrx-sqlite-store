# ADR-0074: Avoid fallback view rebuilding for ready static signals

Status: Experiment (Agent, 2026-10-24; device comparison pending)

## Located cost

Phase 15k still fails emission p50 at all sizes. An instrumented 200-emission
probe on the same APK measures median total 4.3 ms, native request 3.4 ms, and
non-native overhead 0.8 ms. A separate CPU sample captures selector evaluation,
selection readiness, view construction and cache owner lookup among the JS work.
Sampling is coarse and does not establish precise percentages per function.
Raw diagnostics are `.tmp/15l-emission-profile-1000.json` and
`.tmp/15l-emission.cpuprofile`. These are not acceptance inputs.

Every signal evaluation previously merged all registered initial feature defaults
with the cache, even when all of that static selector's sources were already
ready. A regression with two loaded static signals observes six fallback rebuilds
across signal construction and one update, despite needing no defaults.

## Candidate

Compute the existing static-readiness predicate before view construction. When all
static sources are ready, use the existing committed view and scoped projection
without constructing a fallback view. Unloaded, dirty, unavailable session sources
and dynamic selectors still use the original fallback path. Ready undefined values
remain authoritative; this does not substitute seed data for committed absence.
Once ready, release any earlier discovery/default view so it cannot keep unrelated
cached sources alive after they are evicted.

The regression verifies both initial values and the next committed update, and
requires zero fallback rebuilds for these loaded static signals. It fails on the
old implementation (six rebuilds). Existing unloaded-default, conditional-selector,
session, identity and reference-invalidation tests remain required. Retention as a
latency optimization requires a reversed device comparison against Phase 15k.

## Reversed device result

The [A/B evidence](../benchmarks/android-ladders-15l-2026-10-24.md) records all
eight size observations and four 200-emission probes. Normal benchmark emission
medians improve in both comparison directions at 1k and 10k. The instrumented
probe shows unchanged native median (3.5 ms in every leg), while per-emission
non-native overhead medians fall from 0.9 to 0.7 ms and from 0.9 to 0.6 ms.
These are diagnostics, not acceptance inputs. Startup results remain mixed.
Retain the candidate for reduced emission work and run fresh matched five-trial
acceptance before making any parity claim. All 345 library tests and 26 e2e tests
pass; library and SQLite APK builds pass.

## Full acceptance

Session `15l-audit-1792814281` completed all 30 observations:
**10 PASS /12 PLATFORM-BOUND /3 CODE-BOUND /8 FAIL**. The full
[comparison](../benchmarks/android-ladders-15l-2026-10-24.md) and
[verified session](../benchmarks/android-session-15l-2026-10-24.json) preserve
all summaries and classifications. Emission p50 at 1k and 10k now qualifies under
the unchanged rules; 50k still fails. Other classification changes leave eight
FAILs overall. Separate-session changes are not attributed solely to this change,
and CODE-BOUND remains separate from the user's required outcome.
