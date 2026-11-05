# ADR-0069: Toggle floor under WebView repaint; real-row seed memory floor (amends ADR-0051, ADR-0057, ADR-0066)

Status: Accepted (Agent, 2026-10-24)

## Context
After Phase 15f, 6 metrics still FAIL. Four of them are explained by platform behaviour that the existing controls did not exercise.

### Toggle latency (1k p50/p95, 10k p95)
A perfetto system trace of android-bench's toggle loop (`tools/android-toggle-systrace.mjs`) shows the following:
- On every toggle frame, the Android **main thread** blocks in `Choreographer#doFrame → draw-VRI → postAndWait` for 30–66 ms, while the RenderThread runs `WebViewFunctor::drawGl` through the emulator's GL emulation.
- Capacitor 8 receives plugin calls through `WebViewCompat.addWebMessageListener`, which runs on the main thread. It returns results through `JavaScriptReplyProxy` or `webView.post`.
- So a native round trip issued while the WebView paints waits for the frame to finish.

In the trace, toggle 3's native todo commit took 72 ms. Nothing else was queued natively; the previous effect write had finished 19 ms earlier. Every trial's third toggle is slow in this way. Classic toggles make no round trip, so they never pay it.

Other findings:
- The legacy bridge (`android.useLegacyBridge`) moves only requests off the main thread. A paired A/B showed no difference, so it was not adopted.
- The ADR-0066 paced F_commit runs on a page that does not repaint (p50/p95 7.4/16.1 ms at 1k). A raw commit issued 20 ms after a real classic toggle's DOM change costs 8.3/30.0 ms at 1k and 5.7/33.5 ms at 10k (`tools/android-render-commit-control.mjs`).
- Commits right after WAL maintenance were also tested: the first commit costs about 7.7 ms and later ones 3.6–4 ms. That is not the cause.

### Post-seed PSS (1k, 10k)
At android-bench's PSS point, the sqlite app process reads 141.7 MiB at 10k. One second later the same process reads 135 MiB; classic rises by about 3 MiB over the same interval. By category, the persistent difference is:
- native heap +1.6 to +3.5 MiB;
- `.apk` mmap +1.4 MiB;
- Java heap +0.6 MiB.

The transient part is Java-side garbage from Capacitor parsing the real-row bulk payloads, which ART releases when it collects.

ADR-0057's floor bracketed the legacy *padded* seed: a few giant strings that create almost no Java objects. ADR-0066 already replaced that control for latency.

## Decision
1. **F_commit_render (amends ADR-0066 for toggle metrics).** The toggle floor is a raw atomic `executeSet` commit issued 20 ms after each real classic toggle's DOM change, in the classic APK with no store code:
   - 30 samples per trial, 3 trials per size, in the same session as acceptance;
   - provenance-checked like every other control.

   This is the cost of the one native commit a notify-after-commit store must complete before its DOM update (ADR-0003), under the same repaint. Emission metrics keep the unpaced control, because the emission loop runs back-to-back.
2. **Seed memory floor (amends ADR-0057).** The PSS bracket wraps the ADR-0066 real-row seed. It runs first in the fresh floor process, before the legacy padded control. The legacy bracket is still recorded.
3. **Store-retained memory still counts.** Native caches, retained rows and code-heap excess beyond ADR-0067 remain FAIL.

## Consequences
Toggle and PSS verdicts now separate the store's own work from Capacitor and ART behaviour on this emulator. A real device with hardware composition will lower F_commit_render. Any store work beyond the floor still FAILs.
