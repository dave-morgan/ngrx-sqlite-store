# ADR-0081: Share concurrent entity count scans

Status: Accepted (Agent, 2026-10-24) — measured; parity still incomplete

Current15u persisted50k diagnostic `.tmp/startup-15u-current-50000.json` records a154.9ms header count transport before readiness. The two count selectors each scan inline rows independently. An unchanged-APK native diagnostic alternates30 pairs: separate total/open counts mean92.860ms versus combined53.067ms, median90.0/51.7ms;30/30 wins. All60 responses agree on50000 total and32487 open (the existing seeded workload, not a presumed fixture count). No index/schema change. `.tmp/15v-count-fusion.{json,jsonl}` retained. An initial verification incorrectly assumed33333 open; no data changed/reran; verification now compares actual identical results. Diagnostic only, no acceptance/floor inference.

Design: carry an optional internal entity-count plan through SqlReader and PathCache. QueryBatch groups at least two concurrent counts for the same physical collection only when one predicate is unfiltered (1) within its existing bounded batch. One aggregate computes conditional counts over the exact existing valid inline-row predicate. A shared promoted-ID query preserves each reader's existing promoted-subtree fallback. Mixed collections, arbitrary readers, parameter limits, JSON transport cap and fallback remain. No persistence/atomicity/notification change. An unsupported optimized SQL transport falls back to original requests.

Alternatives: new count indexes already showed no application benefit (15r); bypassing JSON validity would change semantics. This experiment shares demonstrated repeated work instead.

Implementation plan (no commit):
- [x] Regression red: two conditional counts share one instrumented row scan, preserve promoted IDs/invalid JSON/other collection and binding behavior.
- [x] Implement optional plan in query-selector/entity query, forward via PathCache; bounded grouping in query-batch.
- [x] Library/tool/harness/e2e/build validation; actual installed grouped transport verified in startup diagnostic.
- [x] Archived15u baseline/candidate and verified actual grouping; reversed fresh-boot A/B completed and verified. Fresh matched acceptance warranted by repeated50k startup direction, with tail regressions preserved.
- [ ] Record all outcomes including regressions; retain only measured benefit/proven redundant work removal. Phase16 gated and3CB separate.

Selective-only groups retain their original indexed searches; combining sparse predicates could expand work and is outside the measured native case. A separate EXPLAIN regression demonstrates the needed guard before implementation.

Validation after guard:375library tests/26e2e/librarybuild pass; earlier unchanged tool20/harness1 checks pass. Both regressions were red before implementation (4scansvs2;0indexed filtersvs2). First unrestricted APK archived `.tmp/15v-unrestricted-candidate/sqlite.apk`, never device-measured. Guarded candidate is rebuilt before any APK measurement.

Guarded candidate375library/26e2e/library+SQLiteAPKbuilds pass (earlier20tools/1harness pass). ACTIVE `.tmp/15v-ab.sh` PID45352 logs `.tmp/15v-ab.stdout.log/.stderr.log`: explicitly installs candidate and verifies actual50k grouped count transport, then reversed A1/B1/B2/A2 each separate verified coldboot+60s settle at1k/10k/50k. Candidate SHA256`bdb5b0b95bd13ca5c9c989d6339883bf4733c22dae915f093738b8c6521acd2a`; baseline15u`6831fc61c3bdbe89ccecfb59cb89b9d5dff39357709d11ccb22ecf9d43f282aa`. One-trial verdict counts invalid; compare raw measurements both directions. No application benefit claim yet.

Actual installed guarded APK proof completed: hash matches,50000ready and captured `WITH counts AS MATERIALIZED` query (`.tmp/15v-candidate-proof.json`). Diagnostic native probe used `json_extract(done)=0` on this boolean fixture; production preserves the complete compiled boolean type guard/predicate verbatim. Thus native53.1ms is a located-cost diagnostic, not an exact production-query speedup prediction. Actual startup trace timings are perturbed and not acceptance. Reversed application measurements remain pending.

Reversed A/B completed exit0,12observations/4boots/hashes/sessions/samplegroups verified.50k first-ready -208.3/-33.1ms and relaunch -325.0/-189.8ms, but50k toggleP95 +19.2/+6.4ms.1k/10k tails and memory mixed. Retain only for proven scan removal and repeated50k startup direction; no universal timing claim. [Complete comparison](../benchmarks/android-ladders-15v-2026-10-24.md). Fresh matched full acceptance follows post-device validation; Phase16 remains gated.

Post-A/B375library/20tools/1harness/26e2e/librarybuild checks pass, `.tmp/15v-post-*`, cached candidate hash unchanged. ACTIVE fresh matched full acceptance `.tmp/15v-audit.sh` PID34224 session`15v-audit-1792842484`, logs `.tmp/15v-audit.stdout.log/.stderr.log`:5pairedcodecontrols/floors/empty/render, verifiedreboot and5trialpairswithreboot-between. Verify30/66/33/fourcontrolprovenances/boots on completion. No competing device work/builds/tests/profilers.

## Outcome (full 15v acceptance, 2026-10-24)

Session `15v-audit-1792842484`: 30 valid observations, 66 recomputed means/sample SDs, 33 verdicts, all four controls with matching session/device/APK provenance, six verified boots (`.tmp/15v-verify.cjs`).

**11 PASS / 13 PLATFORM-BOUND / 3 CODE-BOUND / 6 FAIL** (15u: 11 / 11 / 3 / 8). Changes versus 15u: 1k relaunch PSS, 10k post-seed PSS, 10k toggle p95 and 50k first-ready became PLATFORM-BOUND; 1k toggle p50 and 10k relaunch became FAIL. These are independent sessions, not isolated causal estimates.

Remaining FAILs (excess / allowance): 1k toggleP50 13.02 / 11.53 ms; 1k toggleP95 49.30 / 39.71 ms; 10k relaunch 295.10 / 279.66 ms; 50k relaunch 396.14 / 357.45 ms; 10k emitP50 4.00 / 3.85 ms; 50k emitP50 3.82 / 3.24 ms. CODE-BOUND heap at 1k (todos, notes, relaunch) is not counted as done.

Post-device validation: 375 library, 20 tool, 1 harness, 26 Playwright tests; library build pass. Retained for the proven scan removal and the repeated 50k startup direction. No commit. Phase 16 remains gated.
