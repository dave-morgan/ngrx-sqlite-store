# ADR-0083: Evidence for the remaining 15v gaps

Status: Accepted as an evidence record (Agent, 2026-10-24). This ADR introduces no floor and changes no verdict.

The latest verified full acceptance is 15v: **11 PASS / 13 PLATFORM-BOUND / 3 CODE-BOUND / 6 FAIL**.

## Toggles (1k p50 +1.5 ms and p95 +9.6 ms over allowance)
- **Store JS is under 1.5 ms per toggle.** A source-mapped CPU profile of 40 bench-paced toggles (15w build) measured 0.9 ms before the native call and about 0.5 ms of active JS after it. The rest of the post-commit window is idle.
- **About 21 ms of a mean 24.8 ms is waiting on the native commit.**
- **Perfetto shows why.** During every toggle frame the Android main thread blocks in `Choreographer#doFrame → draw-VRI → postAndWait` for 30–66 ms while `WebViewFunctor::drawGl` runs. Capacitor 8 routes plugin messages through that thread (WebMessageListener / reply proxy), so commits issued meanwhile wait.
- **sqlite paints twice per toggle; classic paints once.** MutationObserver timestamps show the toggle's DOM changes at about 6 ms and the persisted effect action's `effect-observation` change at 10–35 ms (ADR-0023 ordering: the effect's commit precedes its DOM update). Classic applies both in one frame at about 2–5 ms.
- **The no-store controls bracket the result** (15v session, 3 trials, classic APK):

  | 1k control | p50 | p95 |
  |---|---:|---:|
  | Single raw commit after a classic toggle repaint (current ADR-0069 floor) | 7.9 ms | 18.1 ms |
  | Same, with a raw effect commit and its second repaint before it (ADR-0071 pair series, diagnostic only) | 15.5 ms | 48.9 ms |
  | sqlite toggle excess over classic | 13.0 ms | 49.3 ms |
- **Ruled out:** the legacy Capacitor bridge (no measurable A/B difference) and the identical DOM mutation volume in both apps.

## Emission p50 (10k +0.15 ms, 50k +0.58 ms over)
- **Store JS is about 0.6 ms per back-to-back emission:** selector evaluation, cache publish and path lookup.
- **The `owner()` allocation removal is timing-neutral** in a paired 3-round A/B.
- **Emission samples run on the diagnostics page,** which repaints, while the F_commit floor page does not.

## Relaunch (10k +15 ms, 50k +39 ms over)
On a 50k relaunch, ready arrives 394–490 ms after the first plugin call. The path is:
1. `createConnection` + `open`, about 140–150 ms (F_open);
2. pipelined metadata and the session delete, about 40 ms;
3. the eager `ui` read;
4. the grouped count query, 92–101 ms, which parses all 50k rows' JSON for `json_valid` and the boolean type guard;
5. Angular bootstrap and router work (a 56 ms long task, the router's first commit), then render.

Measured on the device: a typed covering expression index is not used, because the partial-index `json_valid(data)` condition still forces row reads. The primary-key-only total would take 5 ms but drops the invalid-JSON semantics the tests require.

## Heap CODE-BOUND (1k todos, notes, relaunch)
ADR-0067 snapshots show the whole excess is V8 code space for executed library code; store data is at or below classic's. No CODE-BOUND metric is counted as done.

## Open decision (user)
The remaining toggle FAILs are within the Capacitor-bridge-plus-repaint cost of two persisted commits, measured without any store code. Using that pair control as the toggle floor is a floor change, and it is currently forbidden. No verdicts are changed here.
