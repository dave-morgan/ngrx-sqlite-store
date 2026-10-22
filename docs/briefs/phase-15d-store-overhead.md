# Brief: Phase 15d — Remove the remaining store overhead

Repo: `C:\Development\ngrx-sqlite-store`. Read these first: `CLAUDE.md`, ADR-0038, ADR-0048, ADR-0051 to ADR-0057, and `docs/benchmarks/android-parity-15c-2026-10-22.md` (the latest measurement: 11 PASS / 9 PLATFORM-BOUND / 13 FAIL).

HEAD is commit 5ccafa8 plus ADR-0057. The floor tooling is fixed and works end to end. See `/tmp/run15c.sh` or the commit message for the pipeline:
1. `node tools/android-bench.mjs --build-only true --session S`
2. `tools/android-floor-controls.mjs --session S`
3. `tools/android-parity-profile.mjs --empty --session S`
4. `android-bench --trials 5 --skip-build true --session S --floors-json … --platform-json …`

Use a fresh `S` per run. Uninstall both APKs before building.

## Measured floors (same session)

| Floor | 1k | 10k | 50k |
| --- | --- | --- | --- |
| F_commit p50 / p95 | ≈ 6.3 / 13.5 ms | ≈ 6.3 / 13.5 ms | ≈ 6.3 / 13.5 ms |
| F_seed | 169 ms | 325 ms | 831 ms |
| F_open | ≈ 85 ms | ≈ 85 ms | ≈ 85 ms |
| F_seed app-PSS growth | +12.2 MB | +8.3 MB | +11.0 MB |

## Tasks
1. **Implement ADR-0057** in the bench acceptance code. It sets the post-bulk-write memory allowance from the F_seed PSS growth. Add a unit test in `tools/benchmark-floors.test.mjs`.
2. **Toggle at 1k/10k** (p50 22.9 / 23.1 ms against F_commit 6.3 ms; classic 3.9 / 7.6 ms).
   - About 10 ms of store work per toggle sits above the commit floor, and it's roughly the same at 50k.
   - Trace one toggle on the device: JS spans plus native calls (mapOne read, commit, query refresh/patch, `effectObserved` dispatch, change detection).
   - Remove everything that isn't the single durable commit plus provably required reads. Ideas:
     - serve mapOne's prev from the in-page row (fresh, per ADR-0018);
     - make sure the query batch is skipped when the incremental count and the page patch suffice;
     - avoid microtask/macrotask hops between commit and notification;
     - coalesce the follow-up effect commit so it doesn't block the first notification.
   - Keep notify-after-commit and effect ordering.
3. **First-ready (seed) at 10k/50k** (973 / 2936 ms against an allowance of about F_seed + F_open + classic; roughly 300 ms / 1.3 s over).
   - Profile the store's seed path: JS row/JSON building, chunk assembly, extra statements (markers, entity metadata, indexes), the post-seed refresh and queries, and render.
   - Get within F_seed + F_open of classic.
   - Index maintenance during bulk insert (ADR-0053) may cost. Consider building indexes after the bulk insert inside the same transaction, or dropping and recreating them for `setAll` of large collections, if that's safe.
4. **Relaunch at 1k/50k** (+336 / +363 ms against an F_open of about 85 ms). Use the startup trace to remove remaining store startup work that isn't open + read: sequential reads, eager loads, router reseed, first query batch. Make independent reads one batch.
5. **Heap at 1k** (+0.8 MB, three metrics).
   - Find which library modules and eager structures are allocated at startup that classic doesn't have.
   - Lazy-load what isn't needed before first render, for example via dynamic `import()` in the library: entity query compiler, sort-key encoding, devtools compat, migration code, and the bulk paths.
   - Shrink eagerly constructed caches.
   - Report bundle and heap deltas. A remaining library-code footprint can be explained in an ADR if it's irreducible.
6. **Optional:** `PRAGMA shrink_memory` after large bulk writes, if it measurably helps and costs little latency.

## Done
- Every metric is PASS, PLATFORM-BOUND or BRIDGE-BOUND, or a remaining FAIL is evidenced in an ADR.
- All library, tool and harness tests pass, and `npx.cmd playwright test` passes.
- Final report: `docs/benchmarks/android-parity-15d-<date>.md`.
- Append ADRs and register rows.
- Edit `CLAUDE.md` in place only, and tick "Phase 15d" last.
- **No git commit.**
- Summary of 15 lines or fewer with the verdict counts.
