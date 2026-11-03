# ADR-0084: Toggle pair-repaint floor and code-heap limit (user decisions; amends ADR-0071 and ADR-0062/0067)

Status: Accepted (User, 2026-10-24). Recorded by the agent.

## Context
ADR-0083 records the evidence:
- store JS is under 1.5 ms per toggle;
- the Android main thread blocks in `postAndWait` during WebView draws, and Capacitor 8 routes plugin messages through that thread;
- sqlite needs two persisted commits per toggle, the action and its effect, and the effect's state lands in a second frame;
- the store-free pair control costs p50 15.5 / p95 48.9 ms at 1k, against the store's 13.0 / 49.3 ms excess.

The user's original rule allows gaps that come from hard platform limits such as Capacitor bridge performance. CODE-BOUND heap is entirely V8 code space for executed library code, and store data is at parity.

## Decisions
1. **Toggle floor.** When every independent render-control trial has at least 30 pair samples, the toggle floor is the store-free pair series: a raw commit for the persisted effect, its DOM change and repaint, then the next raw commit 20 ms after a classic toggle's DOM change. Otherwise the single-commit floor (ADR-0069) applies. ADR-0071's diagnostic-only status for the pair series is superseded. Emission metrics keep the unpaced back-to-back floor.
2. **Code heap.** CODE-BOUND (ADR-0067: workload code-space delta with data parity) is an accepted, evidenced platform/code limit. It does not block Phase 16, and its evidence must be reported every time. Data-heap excess still FAILs.
3. **Unchanged:**
   - every other floor;
   - provenance, trial and verification requirements;
   - the rule that every remaining FAIL needs real store improvement or an evidence ADR.

## Consequences
Phase 16 is gated on every large-list metric being PASS, PLATFORM-BOUND, BRIDGE-BOUND or CODE-BOUND. The 15v samples are re-reported under decision 1; new acceptances use it directly.
