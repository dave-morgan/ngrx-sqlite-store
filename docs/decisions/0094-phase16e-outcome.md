# ADR-0094: Phase 16e outcome (shapes under ADR-0093 floors, list check 16L2)

Status: Accepted (Agent, 2026-10-27).

## Changes measured (fix 3, retained as proven redundant-work removal)
Path segments:
- `escapeSegment` and `unescapeSegment` skip work when a segment has nothing to escape.
- `selectionReady` uses `firstSegment()` instead of a full `splitPath` with an unescape of every segment.

Refresh and publish:
- `refreshEntry` takes its minimal target cover from `disjointPaths()` instead of building a `ChangeSet` (no `invalidateWrites`/record side work).
- `put`/`putMany` keep the original container when nothing changed.
- Publish skips its O(size) `share` when the view still holds exactly the previously published value.

Specs: `path-cover.spec.ts` and the put-many no-op cases. 394 library tests pass.

## Shapes 16e (ADR-0093 floors, empty control in the same session)
`docs/benchmarks/android-shapes-16e-2026-10-27.md`, all 10 trials. The plugin PSS baseline is +3.2 MB.

**1 PASS / 47 PLATFORM-BOUND / 0 CODE-BOUND / 38 FAIL** (16c under the old F_commit-only floor: 1 / 7 / 78).

Remaining FAIL groups:
| Group | Over the allowance |
|---|---|
| Single writes | about 1–2 ms |
| 10-key partial | about 6.5 ms |
| Replace, K=500 | about 4.5 ms |
| Replace, K=5000 | about 37 ms |
| Workflow reset and append100 | about 7 ms |

Also failing:
- **Heap:** extra code is 0.85–1.0 MB, but store data is +0.1–0.36 MB above classic, so the data-parity condition fails.
- **PSS:** +10–13 MB, while the plugin baseline covers 3.2 MB. The list method's real-row transfer bracket (ADR-0070/0087) is not yet implemented for shapes.
- **Burst maxBacklog:** 1–2, with no floor.

## List check 16L2 (ADR-0091)
Verified with `.tmp/16L2-verify.cjs` (30 observations, 66 summaries, 33 verdicts, controls, APK hashes, six boots).

**13 PASS / 14 PLATFORM-BOUND / 3 CODE-BOUND / 3 FAIL** (16L1: 12 / 12 / 3 / 6).

Sqlite means are within noise of 16L1:
| Metric | 16L1 | 16L2 |
|---|---:|---:|
| 10k relaunch | 1532 ms | 1580 ms |
| 50k relaunch | 1611 ms | 1647 ms |
| 50k emitP50 | 3.56 ms | 3.60 ms |
| 1k relaunch | 1616 ms | 1582 ms |

No list regression. The verdict changes come from the session references.

Remaining list FAILs:
| Row | sqlite | Limit | Over |
|---|---:|---:|---:|
| 10k relaunchReady | 1580 ms | 1516 ms | 64 ms |
| 50k emitP50 | 3.60 ms | 3.27 ms | 0.33 ms |
| 50k emitP95 | 5.40 ms | 4.43 ms | 0.97 ms |
