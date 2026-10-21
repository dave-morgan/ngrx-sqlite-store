# Android benchmark after phase 14 (2026-10-22)

**Device:** Pixel 9 Pro emulator, API 35.
**Commit:** 0d9f96d, with the bench runner as committed alongside this file.

**What the memory columns measure:**
- `pssApp*`: the Android app process, which holds Java plus native SQLite.
- `pssRenderer*`: the WebView sandboxed renderer, which holds the JS heap and therefore all NgRx state.
- `pssTotal`: the sum of the two.

The earlier "PSS" columns in older reports cover the app process **only**. They are not comparable with these.

## Full sizes (1k / 10k / 50k), app-process PSS only
| impl | size | firstReadyMs | relaunchReadyMs | heapTodosMb | heapNotesMb | heapRelaunchMb | pssTodosMb | toggleP50 | toggleP95 | emitP50 | emitP95 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| classic | 1000 | 401 | 1720 | 4.6 | 5.1 | 4.6 | 131.8 | 2.6 | 19.1 | 0.1 | 0.3 |
| classic | 10000 | 410 | 1851 | 7 | 7.6 | 7 | 131.5 | 8.7 | 17.4 | 0 | 0.4 |
| classic | 50000 | 407 | 1957 | 18.5 | 19 | 18.4 | 132 | 30.4 | 71.7 | 0 | 0.3 |
| sqlite | 1000 | 945 | 2593 | 5.7 | 6.4 | 5 | 143.4 | 43.3 | 61.3 | 15.3 | 21.2 |
| sqlite | 10000 | 1903 | 2528 | 7.7 | 8.5 | 5 | 170.2 | 41.6 | 57.5 | 14.8 | 19.1 |
| sqlite | 50000 | 6132 | 2308 | 16.9 | 17.6 | 5 | 199 | 41.2 | 70.7 | 14.6 | 20.1 |

## Device-total memory (app + renderer)
| impl | size | firstReadyMs | relaunchReadyMs | heapTodosMb | heapNotesMb | heapRelaunchMb | pssAppMb | pssRendererMb | pssTotalMb | pssRelaunchTotalMb | toggleP50 | toggleP95 | emitP50 | emitP95 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| classic | 1000 | 340 | 2056 | 4.6 | 5.2 | 4.6 | 132.3 | 99.1 | 231.4 | 224.4 | 2.6 | 9.1 | 0.1 | 0.4 |
| classic | 50000 | 425 | 1416 | 18.5 | 19 | 18.4 | 132.5 | 117.7 | 250.2 | 249.6 | 29.8 | 48.4 | 0.1 | 0.2 |
| sqlite | 1000 | 929 | 2542 | 5.7 | 6.4 | 5 | 143.3 | 105.8 | 249.2 | 229.7 | 44.6 | 60.8 | 15.4 | 21.4 |
| sqlite | 50000 | 6117 | 2480 | 16.9 | 17.6 | 5 | 199 | 119.8 | 318.8 | 231.4 | 46.6 | 67.4 | 15.3 | 19.3 |

## Summary at 50k
- **Latency, toggle p50:** 41–47 ms, flat across 1k, 10k and 50k. Classic is 30 ms. Before phase 14 it was 492 ms, and at the baseline 10.7 s. The p95 is on par with classic.
- **Latency, unrelated-change emit p50:** about 15 ms, which is the bridge floor. Classic is about 0.1 ms.
- **JS heap:** 5.0 MB after relaunch, against 18.4 MB for classic, so 3.7× less. With the list mounted it is 16.9 MB against 18.5 MB.
- **Device total, steady state after relaunch:** 231 MB against 250 MB, a saving of about 18 MB (−7%). The WebView and Android base, roughly 220 MB, dominates both builds.
- **Device total right after a 50k bulk seed (same session):** 319 MB against 250 MB, so +68 MB in the **app process**. This is Java and native memory held after the large `executeSet` bridge payloads, and it persists until the process restarts. Tracked as **Q17**.
