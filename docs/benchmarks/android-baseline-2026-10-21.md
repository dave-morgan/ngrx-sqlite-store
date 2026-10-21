# Android benchmark: baseline before phase 12 (2026-10-21)

**Device:** Pixel 9 Pro emulator (sdk_gphone64_x86_64, API 35, SwiftShader GPU). Debug build, WebView debugging on.

**Runner:** `node tools/android-bench.mjs`. Classic rows ran on 2026-10-20 (commit 7641d67); sqlite rows ran on 2026-10-21 (commit bb2720c).

**Metrics:**
- **Toggle:** time from dispatch until the summary text changes in the DOM. 30 samples, with `/todos` mounted showing the full list.
- **Emit:** the in-app benchmark dispatches a `ui` scalar change and times how long its selector takes to emit. 200 runs.
- **Heap:** CDP `Runtime.getHeapUsage` after a forced GC.

| impl | size | firstReadyMs | relaunchReadyMs | heapTodosMb | heapNotesMb | heapRelaunchMb | pssTodosMb | toggleP50 | toggleP95 | emitP50 | emitP95 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| classic | 1000 | 603 | 3715 | 4.7 | 5.5 | 4.6 | 133.5 | 8.4 | 14.8 | 0.1 | 1.2 |
| classic | 10000 | 745 | 3366 | 7.1 | 9.5 | 7.1 | 133.4 | 13.7 | 33.1 | 0.1 | 0.8 |
| classic | 50000 | 592 | 3184 | 18.7 | 34.1 | 18.7 | 133.2 | 54.5 | 119.7 | 0.1 | 0.9 |
| sqlite | 1000 | 3255 | 4209 | 6.4 | 10.4 | 5.7 | 132.7 | 567.7 | 711.1 | 174.4 | 203.7 |
| sqlite | 10000 | 6424 | 5917 | 16.4 | 24.4 | 11.8 | 145.3 | 1951.4 | 2015.3 | 278.8 | 321.3 |
| sqlite | 50000 | 22532 | 12368 | 48.6 | 86.2 | 25.1 | 174.2 | 10665.9 | 11043.9 | 948.3 | 1015.3 |

## Findings (these drive phase 12)
1. **Refreshing an entity collection costs O(collection).**
   - Toggling one todo re-reads every row of the `todos` collection over the bridge.
   - This happens because entity writes record only the collection path, so the source behind `selectAll` re-queries everything.
   - Result: 10.7 s p50 at 50k.
2. **JS work per commit grows with the amount of loaded data.**
   - A `ui` scalar change that never touches todos takes 174 ms at 1k and 948 ms at 50k. Classic takes 0.1 ms.
   - So some per-generation step walks every loaded value: the view rebuild, the deep freeze, or reconciliation.
3. **Memory is higher than classic, not lower.**
   - On `/todos` at 50k: 48.6 MB vs 18.7 MB. Something is retained twice across the PathCache, the view state and the metadata.
   - `/notes` is higher still, at 86 MB. The LRU counts entries rather than bytes, so the todos collection stays cached after it is released.
4. **First-ready includes seeding.** That is a one-time write of N rows. The steady-state start cost is relaunch, when the data is already on disk.
5. **The harness `/todos` page loads the whole collection by design** (`selectAll` plus a JS filter), so no store can beat classic on RAM there. The RAM win needs query selectors for lists (ADR-0027), and phase 12 also converts that list to `query().page()`.
