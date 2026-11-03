# ADR-0082: Startup working-set warm — rejected

Status: Rejected (Agent, 2026-10-24)

## Hypothesis
The relaunch trace at 50k showed `todos/seedVersion` and `todos/filter` reads taking 186 ms and 683 ms. A perfetto trace attributed the stall to the WebView's first heavy frame:
- `DrawFrames` took 640 ms, including 583 ms of `WebViewFunctor::drawGl` while shaders compiled;
- during that frame the Android main thread waits in `postAndWait`, which holds Capacitor bridge responses.

The idea was to record the paths loaded during startup, persist them in `nss_meta` (read in the same boot metadata query), and load them in the app initializer before the first render.

## Evidence
The candidate was implemented with 2 passing regression tests and measured on the device with two 50k relaunches.

| Build | Ready after first plugin call |
|---|---:|
| 15v | 490 ms (11 calls before ready) |
| Candidate, first relaunch | 688 ms (16 calls) |
| Candidate, second relaunch | 619 ms (16 calls) |

In 15v the stalled reads complete **after** ready, so they were never on its critical path. Warming moved five serial reads in front of the first render.

## Decision
Rejected and fully reverted: code, tests and the boot query key. The test file is kept as `.tmp/startup-warm.spec.ts.rejected` for reference.

The only retained change from this investigation is `PathCache.owner()`. It no longer spreads every entry into a new array on each `peek`/`ready`/`location` call: same first-match semantics, no allocation. A paired emission A/B showed no measurable timing change (p50 3.90 vs 4.00 ms over 3 alternating rounds), so it is retained only as redundant-work removal.
