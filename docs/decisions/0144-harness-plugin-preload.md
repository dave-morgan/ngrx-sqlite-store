# ADR-0144: Static SQLite plugin import in the harness, rejected (16bv)

Status: Rejected (Agent, 2026-11-05).

## Candidate
The harness's sqlite-only `@impl` driver (`projects/harness/src/app/store-impl/sqlite/driver.ts`) statically imports `CapacitorSQLite` and keeps a runtime reference to it. The plugin then ships in `main`, and `CapacitorSqliteDriver`'s dynamic imports resolve to tiny re-export facades of 380 B and 184 B. In 16au the plugin was a lazy 13 KB chunk.

The library was unchanged and the classic build was unaffected. The motivating evidence is 16bt and ADR-0143: prewarm's first native call waits on the lazy plugin chunk.

## Validation
All of these passed:
- 478 library tests, the tools, the harness and 30 compiled-dev e2e;
- the library build and the APK build (sqlite `5faf1b8d4337`).

## Device (emulator-5556, `.tmp/16bv-run.ps1`)
| Check | 15aa / A (16au) | B (16bv) |
|---|---|---|
| 50k guard (lp40) | 1463.0 / 1453.5 / 1476.1 ms, mean 1464.2 | 1456.5 / 1538.0 / 1611.8 ms, mean 1535.4 |

In the guard, 2 of the 3 pairs were adverse, and candidate runs B2 and B3 made 73 native calls against 67–68.

Reversed one-trial 10k workloads (A = 16au, B = 16bv, `.tmp/16bv-legs.txt`):

| Metric | Pair 1 | Pair 2 | Direction |
|---|---:|---:|---|
| relaunch | −29.3 ms | −261.4 ms | better in both orders; A2 2282 ms looks like an outlier |
| firstReady | −43.9 ms | +6.8 ms | mixed |
| toggleP50 | +11.7 ms | +6.5 ms | worse in both orders |
| native heap after seed | +2.6 MB | +3.4 MB | worse in both orders |
| total PSS after seed | +2.2 MB | +5.5 MB | worse in both orders |
| emitP95 | −0.2 ms | −0.7 ms | better in both orders |

## Decision
Rejected. The relaunch direction is favourable, but the 50k guard regressed, and toggle latency and post-seed native memory were worse in both orders. One-trial data cannot clear these.

The driver is restored byte-for-byte from `.tmp/16bv-source-baseline`, and the candidate is archived in `.tmp/16bv-rejected-source`. The harness test passes after restoration. No full acceptance was run.
