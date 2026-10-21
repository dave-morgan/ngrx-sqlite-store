# Android benchmark after the memory fixes (2026-10-22)

**Device:** Pixel 9 Pro emulator (API 35). The emulator was rebooted clean before the run.

**Code:** commit 4135cb4, which includes ADR-0035 and ADR-0036. All six cases completed and none failed.

**Noise:** emulator timing varies from run to run. For example, classic toggle p50 at 50k measured 45 ms in the earlier run and 152 ms in this one. Compare within a run.

| impl | size | firstReadyMs | relaunchReadyMs | heapTodosMb | heapNotesMb | heapRelaunchMb | pssTodosMb | toggleP50 | toggleP95 | emitP50 | emitP95 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| classic | 1000 | 2136 | 5084 | 4.6 | 5.1 | 4.6 | 128.1 | 12 | 74.5 | 0.1 | 1.1 |
| classic | 10000 | 770 | 5338 | 7 | 7.6 | 7 | 130.6 | 15 | 60.1 | 0.1 | 9.6 |
| classic | 50000 | 4981 | 6797 | 18.5 | 19 | 18.4 | 131.1 | 152.1 | 363.1 | 0.1 | 0.9 |
| sqlite | 1000 | 2630 | 6193 | 5.6 | 7 | 5 | 132.5 | 313.5 | 431.3 | 20.9 | 137.3 |
| sqlite | 10000 | 5302 | 7902 | 7.5 | 9 | 5 | 143.3 | 365.2 | 527.7 | 27.2 | 93.7 |
| sqlite | 50000 | 13764 | 7169 | 16.3 | 17.7 | 5 | 189.7 | 491.7 | 965.1 | 41.6 | 155.9 |

## Memory: sqlite now uses less than classic
| 50k | classic | sqlite |
| --- | --- | --- |
| heap on /todos (MB) | 18.5 | **16.3** |
| heap on /notes (MB) | 19.0 | **17.7** |
| heap after relaunch (MB) | 18.4 | **5.0** |

A device heap snapshot after seeding 50k found **101** todo objects, down from 50,101. Those 101 are the visible page plus the bounded cache.

## Latency
- **emit p50:** 21–42 ms, down from 65 ms. This is the bridge floor.
- **toggle p50 regressed:** 314 / 365 / 492 ms at 1k / 10k / 50k, up from 51 / 47 / 98 ms.
  - Before the leak fix, the whole collection was (accidentally) pinned and warm. Now each toggle does a cold row read, a write and a commit.
  - Then every live query re-runs, each one as a separate bridge round trip: open count, total count, visible count and page.
  - Phase 14 addresses this with change-aware query invalidation and batched refresh.
