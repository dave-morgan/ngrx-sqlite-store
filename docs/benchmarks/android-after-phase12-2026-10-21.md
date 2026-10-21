# Android benchmark 2026-10-21

Device: sdk_gphone64_x86_64 (API 35), WebView name, version. Toggle samples: 30. Emission runs: 200.


After phase 12 (commit 7c2002a) and the harness switching to query selectors (commit 96c320b). Baseline: android-baseline-2026-10-21.md.

| impl | size | firstReadyMs | relaunchReadyMs | heapTodosMb | heapNotesMb | heapRelaunchMb | pssTodosMb | toggleP50 | toggleP95 | emitP50 | emitP95 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| classic | 1000 | 883 | 2714 | 4.7 | 5.5 | 4.6 | 131.4 | 7.5 | 53.1 | 0.1 | 0.9 |
| classic | 10000 | 886 | 2831 | 7.1 | 9.5 | 7.1 | 131.4 | 13.2 | 29.8 | 0.1 | 1.4 |
| classic | 50000 | 923 | 3037 | 18.7 | 34.1 | 18.7 | 131.4 | 45.8 | 128.2 | 0.1 | 0.8 |
| sqlite | 1000 | 3786 | 5855 | 6.3 | 7.7 | 5.5 | 133.4 | 76.7 | 471.4 | 175.5 | 205.8 |
| sqlite | 10000 | 7080 | 7043 | 14.1 | 14.8 | 9.6 | 154.8 | 67.2 | 494.8 | 176.5 | 207.2 |
| sqlite | 50000 | 24919 | 12752 | 35.4 | 35.9 | 14 | 167.8 | 164.8 | 583.2 | 177.2 | 207.4 |

## Delta vs baseline (sqlite, 50k)
- **toggle p50:** 10 666 → **165 ms**, which is 65× faster. Classic is 46 ms.
- **emit p50:** 948 → **177 ms**, and it is now flat across 1k, 10k and 50k. The remaining cost is a **fixed per-dispatch floor**: roughly 6 bridge round trips (begin, read, write, commit, refresh) at about 25–30 ms each on this x86 emulator.
- **heap (MB):**
  - on /todos: 48.6 → 35.4
  - after leaving /todos: 86.2 → **35.9**
  - on relaunch: 25.1 → **14.0**, which is below classic's 18.7

## Open issues (phase 13)
1. **Per-dispatch bridge floor.** Planned fix:
   - buffer writes and flush them in a single `executeSet` call at commit;
   - use a write-through committed cache, so the store skips read-back of values the transaction just wrote.
2. **Post-seed retention.** The sqlite heap after seeding (35 MB) is still above classic, even though the list page only materialises 100 rows. Relaunch is at 14 MB, so something retains the seeded objects. Next step: find the retainer path with a device heap snapshot.
