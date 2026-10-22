# Android parity benchmark 2026-10-22

Device: sdk_gphone64_x86_64 (API 35), WebView name, version. Toggle samples: 30. Emission runs: 200. Independent trials: 1.

APK policy: distinct application IDs dev.ngrxsqlite.harness.classic and dev.ngrxsqlite.harness.sqlite; each APK installed once before trials. --skip-build reuses .tmp/benchmark-apks/<impl>.apk. Trial implementation order alternates; each size starts from a cleared app and a fresh process. Inactive implementation is force-stopped. RTT is the same-session echo p50 averaged across trials; bandwidth is the average executeSet throughput fit. Report retains sample SD and all raw probes. Profiling enabled: 500 ms dumpsys sampling and requested Java GC perturb timings; use a separate run for acceptance.

| Impl | Size | Metric | N | Mean | Sample SD |
| --- | --- | --- | --- | --- | --- |

<details><summary>Per-trial table</summary>

| impl | size | trial | firstReadyMs | relaunchReadyMs | heapTodosMb | heapNotesMb | heapRelaunchMb | pssTotalMb | pssRelaunchTotalMb | toggleP50 | toggleP95 | emitP50 | emitP95 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| classic | 50000 | 1 | 280 | 2044 | 18.5 | 19 | 18.4 | 250 | 243.6 | 42.4 | 100.2 | 0.1 | 0.6 |

</details>

<details><summary>Raw per-trial measurements</summary>

```json
[
  {
    "impl": "classic",
    "size": 50000,
    "trial": 1,
    "firstReadyMs": 280,
    "relaunchReadyMs": 2044,
    "heapTodosMb": 18.5,
    "heapNotesMb": 19,
    "heapRelaunchMb": 18.4,
    "pssAppMb": 132.1,
    "pssRendererMb": 117.9,
    "pssTotalMb": 250,
    "pssRelaunchTotalMb": 243.6,
    "toggleP50": 42.4,
    "toggleP95": 100.2,
    "emitP50": 0.1,
    "emitP95": 0.6,
    "toggleSamples": [
      40.40000000002328,
      39.59999999997672,
      100.19999999995343,
      42.40000000002328,
      43.39999999990687,
      33.20000000006985,
      38.59999999997672,
      32.199999999953434,
      31.099999999976717,
      31.5,
      45.40000000002328,
      46.89999999990687,
      43.29999999993015,
      34.70000000006985,
      80.30000000004657,
      43,
      36.20000000006985,
      31.699999999953434,
      42.09999999997672,
      37.300000000046566,
      45.20000000006985,
      46.29999999993015,
      39.199999999953434,
      36.59999999997672,
      57.40000000002328,
      48.40000000002328,
      101.10000000009313,
      45.5,
      41.70000000006985,
      44.40000000002328
    ],
    "emission": {
      "runs": 200,
      "p50": 0.1,
      "p95": 0.6,
      "max": 3.2
    },
    "profile": {
      "before": {
        "timestamp": 1792630475524,
        "javaHeapMb": 16.3125,
        "nativeHeapMb": 19.19140625,
        "codeMb": 26.92578125,
        "stackMb": 1.58203125,
        "graphicsMb": 0,
        "privateOtherMb": 22.67578125,
        "systemMb": 39.546875,
        "totalPssMb": 126.234375,
        "raw": "Applications Memory Usage (in Kilobytes):\r\nUptime: 839138 Realtime: 839138\r\n\r\n** MEMINFO in pid 5468 [dev.ngrxsqlite.harness.classic] **\r\n                   Pss  Private  Private  SwapPss      Rss     Heap     Heap     Heap\r\n                 Total    Dirty    Clean    Dirty    Total     Size    Alloc     Free\r\n                ------   ------   ------   ------   ------   ------   ------   ------\r\n  Native Heap    19699    19652       28       76    20656    34968    28874     1518\r\n  Dalvik Heap     7160     7112        8      199     8156     8987     4494     4493\r\n Dalvik Other     8265     3316        4        4    13536                           \r\n        Stack     1620     1620        0        0     1628                           \r\n       Ashmem      373      124        0        0     1188                           \r\n    Other dev       39        4       28        0      348                           \r\n     .so mmap     7059      244     2548       23    42684                           \r\n    .jar mmap     3986        0     1140        0    44636                           \r\n    .apk mmap    45275      560    21996        0    71248                           \r\n    .ttf mmap      322        0      116        0      656                           \r\n    .dex mmap      109        0        4        0     1068                           \r\n    .oat mmap       45        0        0        0     1780                           \r\n    .art mmap    10215     8068     1524      133    24312                           \r\n   Other mmap     4763      292      492        0     9716                           \r\n      Unknown    19896    19876       12        3    20276                           \r\n        TOTAL   129264    60868    27900      438   261888    43955    33368     6011\r\n \r\n App Summary\r\n                       Pss(KB)                        Rss(KB)\r\n                        ------                         ------\r\n           Java Heap:    16704                          32468\r\n         Native Heap:    19652                          20656\r\n                Code:    27572                         172912\r\n               Stack:     1620                           1628\r\n            Graphics:        0                              0\r\n       Private Other:    23220\r\n              System:    40496\r\n             Unknown:                                   34224\r\n \r\n           TOTAL PSS:   129264            TOTAL RSS:   261888       TOTAL SWAP PSS:      438\r\n \r\n Objects\r\n               Views:        9         ViewRootImpl:        1\r\n         AppContexts:        9           Activities:        1\r\n              Assets:       29        AssetManagers:        0\r\n       Local Binders:       62        Proxy Binders:       89\r\n       Parcel memory:       23         Parcel count:       55\r\n    Death Recipients:        6             WebViews:        1\r\n \r\n SQL\r\n         MEMORY_USED:        0\r\n  PAGECACHE_OVERFLOW:        0          MALLOC_SIZE:        0\r\n \r\n"
      },
      "samples": [],
      "beforeGc": {
        "timestamp": 1792630476544,
        "javaHeapMb": 13.95703125,
        "nativeHeapMb": 23.40234375,
        "codeMb": 26.62109375,
        "stackMb": 1.6171875,
        "graphicsMb": 0,
        "privateOtherMb": 29.08203125,
        "systemMb": 41.630859375,
        "totalPssMb": 136.310546875,
        "raw": "Applications Memory Usage (in Kilobytes):\r\nUptime: 840236 Realtime: 840236\r\n\r\n** MEMINFO in pid 5468 [dev.ngrxsqlite.harness.classic] **\r\n                   Pss  Private  Private  SwapPss      Rss     Heap     Heap     Heap\r\n                 Total    Dirty    Clean    Dirty    Total     Size    Alloc     Free\r\n                ------   ------   ------   ------   ------   ------   ------   ------\r\n  Native Heap    24005    23964       28       73    24948    35224    28461     2256\r\n  Dalvik Heap     8118     3196     4856       37     9132     8843     4422     4421\r\n Dalvik Other     8270     2684       52        2    14140                           \r\n        Stack     1656     1656        0        0     1664                           \r\n       Ashmem      389      124        0        0     1220                           \r\n    Other dev       39        4       28        0      348                           \r\n     .so mmap     7243      252     2692       22    43316                           \r\n    .jar mmap     3994        0     1140        0    44792                           \r\n    .apk mmap    46945      560    22444        0    73912                           \r\n    .ttf mmap      322        0      116        0      656                           \r\n    .dex mmap      109        0        4        0     1068                           \r\n    .oat mmap       45        0        0        0     1780                           \r\n    .art mmap    11782     8104     2992       90    26112                           \r\n   Other mmap     5247      380      492        0    10604                           \r\n      Unknown    21194    21172       12        0    21576                           \r\n        TOTAL   139582    62096    34856      224   275268    44067    32883     6677\r\n \r\n App Summary\r\n                       Pss(KB)                        Rss(KB)\r\n                        ------                         ------\r\n           Java Heap:    14292                          35244\r\n         Native Heap:    23964                          24948\r\n                Code:    27260                         176628\r\n               Stack:     1656                           1664\r\n            Graphics:        0                              0\r\n       Private Other:    29780\r\n              System:    42630\r\n             Unknown:                                   36784\r\n \r\n           TOTAL PSS:   139582            TOTAL RSS:   275268       TOTAL SWAP PSS:      224\r\n \r\n Objects\r\n               Views:        9         ViewRootImpl:        1\r\n         AppContexts:        6           Activities:        1\r\n              Assets:       28        AssetManagers:        0\r\n       Local Binders:       65        Proxy Binders:       73\r\n       Parcel memory:       13         Parcel count:       52\r\n    Death Recipients:        6             WebViews:        1\r\n \r\n SQL\r\n         MEMORY_USED:        0\r\n  PAGECACHE_OVERFLOW:        0          MALLOC_SIZE:        0\r\n \r\n"
      },
      "afterGc": {
        "timestamp": 1792630478773,
        "javaHeapMb": 13.7265625,
        "nativeHeapMb": 19.6640625,
        "codeMb": 26.45703125,
        "stackMb": 1.62109375,
        "graphicsMb": 0,
        "privateOtherMb": 28.94921875,
        "systemMb": 41.595703125,
        "totalPssMb": 132.013671875,
        "raw": "Applications Memory Usage (in Kilobytes):\r\nUptime: 842460 Realtime: 842460\r\n\r\n** MEMINFO in pid 5468 [dev.ngrxsqlite.harness.classic] **\r\n                   Pss  Private  Private  SwapPss      Rss     Heap     Heap     Heap\r\n                 Total    Dirty    Clean    Dirty    Total     Size    Alloc     Free\r\n                ------   ------   ------   ------   ------   ------   ------   ------\r\n  Native Heap    20177    20136       28       73    21120    35224    28181     2608\r\n  Dalvik Heap     7882     2960     4856       37     8896     8843     4422     4421\r\n Dalvik Other     8052     2440       52        2    13948                           \r\n        Stack     1660     1660        0        0     1668                           \r\n       Ashmem      311      124        0        0     1064                           \r\n    Other dev       39        4       28        0      348                           \r\n     .so mmap     7243      252     2692       22    43316                           \r\n    .jar mmap     3992        0     1140        0    44792                           \r\n    .apk mmap    46805      428    22444        0    73764                           \r\n    .ttf mmap      322        0      116        0      656                           \r\n    .dex mmap      109        0        4        0     1068                           \r\n    .oat mmap       45        0        0        0     1780                           \r\n    .art mmap    11782     8104     2992       90    26112                           \r\n   Other mmap     5273      380      492        0    10656                           \r\n      Unknown    21266    21244       12        0    21648                           \r\n        TOTAL   135182    57732    34856      224   270836    44067    32603     7029\r\n \r\n App Summary\r\n                       Pss(KB)                        Rss(KB)\r\n                        ------                         ------\r\n           Java Heap:    14056                          35008\r\n         Native Heap:    20136                          21120\r\n                Code:    27092                         176496\r\n               Stack:     1660                           1668\r\n            Graphics:        0                              0\r\n       Private Other:    29644\r\n              System:    42594\r\n             Unknown:                                   36544\r\n \r\n           TOTAL PSS:   135182            TOTAL RSS:   270836       TOTAL SWAP PSS:      224\r\n \r\n Objects\r\n               Views:        9         ViewRootImpl:        1\r\n         AppContexts:        6           Activities:        1\r\n              Assets:       24        AssetManagers:        0\r\n       Local Binders:       65        Proxy Binders:       70\r\n       Parcel memory:       13         Parcel count:       52\r\n    Death Recipients:        6             WebViews:        1\r\n \r\n SQL\r\n         MEMORY_USED:        0\r\n  PAGECACHE_OVERFLOW:        0          MALLOC_SIZE:        0\r\n \r\n"
      },
      "peak": {
        "timestamp": 1792630476544,
        "javaHeapMb": 13.95703125,
        "nativeHeapMb": 23.40234375,
        "codeMb": 26.62109375,
        "stackMb": 1.6171875,
        "graphicsMb": 0,
        "privateOtherMb": 29.08203125,
        "systemMb": 41.630859375,
        "totalPssMb": 136.310546875,
        "raw": "Applications Memory Usage (in Kilobytes):\r\nUptime: 840236 Realtime: 840236\r\n\r\n** MEMINFO in pid 5468 [dev.ngrxsqlite.harness.classic] **\r\n                   Pss  Private  Private  SwapPss      Rss     Heap     Heap     Heap\r\n                 Total    Dirty    Clean    Dirty    Total     Size    Alloc     Free\r\n                ------   ------   ------   ------   ------   ------   ------   ------\r\n  Native Heap    24005    23964       28       73    24948    35224    28461     2256\r\n  Dalvik Heap     8118     3196     4856       37     9132     8843     4422     4421\r\n Dalvik Other     8270     2684       52        2    14140                           \r\n        Stack     1656     1656        0        0     1664                           \r\n       Ashmem      389      124        0        0     1220                           \r\n    Other dev       39        4       28        0      348                           \r\n     .so mmap     7243      252     2692       22    43316                           \r\n    .jar mmap     3994        0     1140        0    44792                           \r\n    .apk mmap    46945      560    22444        0    73912                           \r\n    .ttf mmap      322        0      116        0      656                           \r\n    .dex mmap      109        0        4        0     1068                           \r\n    .oat mmap       45        0        0        0     1780                           \r\n    .art mmap    11782     8104     2992       90    26112                           \r\n   Other mmap     5247      380      492        0    10604                           \r\n      Unknown    21194    21172       12        0    21576                           \r\n        TOTAL   139582    62096    34856      224   275268    44067    32883     6677\r\n \r\n App Summary\r\n                       Pss(KB)                        Rss(KB)\r\n                        ------                         ------\r\n           Java Heap:    14292                          35244\r\n         Native Heap:    23964                          24948\r\n                Code:    27260                         176628\r\n               Stack:     1656                           1664\r\n            Graphics:        0                              0\r\n       Private Other:    29780\r\n              System:    42630\r\n             Unknown:                                   36784\r\n \r\n           TOTAL PSS:   139582            TOTAL RSS:   275268       TOTAL SWAP PSS:      224\r\n \r\n Objects\r\n               Views:        9         ViewRootImpl:        1\r\n         AppContexts:        6           Activities:        1\r\n              Assets:       28        AssetManagers:        0\r\n       Local Binders:       65        Proxy Binders:       73\r\n       Parcel memory:       13         Parcel count:       52\r\n    Death Recipients:        6             WebViews:        1\r\n \r\n SQL\r\n         MEMORY_USED:        0\r\n  PAGECACHE_OVERFLOW:        0          MALLOC_SIZE:        0\r\n \r\n"
      }
    }
  }
]
```
</details>

Acceptance: PASS 0 / BRIDGE-BOUND 0 / FAIL 11.

| Size | Metric | Classic mean ± SD | SQLite mean ± SD | Verdict | Evidence / arithmetic |
| --- | --- | --- | --- | --- | --- |
| 50000 | firstReadyMs | ? | ? | FAIL | Insufficient independent trials or failed measurement |
| 50000 | relaunchReadyMs | ? | ? | FAIL | Insufficient independent trials or failed measurement |
| 50000 | heapTodosMb | ? | ? | FAIL | Insufficient independent trials or failed measurement |
| 50000 | heapNotesMb | ? | ? | FAIL | Insufficient independent trials or failed measurement |
| 50000 | heapRelaunchMb | ? | ? | FAIL | Insufficient independent trials or failed measurement |
| 50000 | pssTotalMb | ? | ? | FAIL | Insufficient independent trials or failed measurement |
| 50000 | pssRelaunchTotalMb | ? | ? | FAIL | Insufficient independent trials or failed measurement |
| 50000 | toggleP50 | ? | ? | FAIL | Insufficient independent trials or failed measurement |
| 50000 | toggleP95 | ? | ? | FAIL | Insufficient independent trials or failed measurement |
| 50000 | emitP50 | ? | ? | FAIL | Insufficient independent trials or failed measurement |
| 50000 | emitP95 | ? | ? | FAIL | Insufficient independent trials or failed measurement |
