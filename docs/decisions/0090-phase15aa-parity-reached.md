# ADR-0090: Phase 15aa — every large-list metric qualifies

Status: Accepted (Agent, 2026-10-26). The Phase 15 parity goal is met. Phase 16 may now start (ADR-0061 gate).

## Changes measured since 15z (each kept after an on-device diagnostic A/B, `.tmp/ab-first-ready.ps1`)
- **Boot catalog.** Engine open's schema check reads all `nss_meta` rows and the index catalog in one round trip (`StorageEngine.bootCatalog`). Any statement that can change metadata or the schema discards it. The startup seed uses the catalog instead of a version query.
  - It also skips the comparison read of session subtrees that the adopted prewarm deleted in this boot (`PREWARM_CLEARED`).
  - A/B: store boot went from a 215 ms to a 171 ms mean, and boot calls from 76 to 68.
- **Streamed large replacements.** `replaceAll` with more than 1500 rows (query-only collections) runs inside `SAVEPOINT nss_replace`. Each chunk is validated and encoded while the previous chunk executes natively. A validation failure rolls back to the savepoint, so a caught error still leaves the rows intact (specs).
  - `RowWriter.writeEntityRows({ holdTail })` carries each chunk's partial last transport group into the next chunk. Batches stay as full as a one-shot write (spec).
  - A/B: genEnd→ready went from a 1204 ms to a 1017 ms mean, with equal call counts.
- Rejected after A/B:
  - priming the router pin absent: still read in the harness, and one extra call;
  - row-count streaming without tail holding: 30 extra calls, slower.

## Result
Session `15aa-audit-1792935727`, APKs in `.tmp/15aa-apks/`:
- classic `743fb269…`. It differs from `72cd2fc5…` only in the profile-gated startup trace, which records statement parameters; that code is inactive in acceptance trials.
- sqlite `6deb3638…`.

`.tmp/15aa-verify.cjs` verifies 30 observations, 66 summaries, 33 verdicts, four controls with matching provenance, APK hashes and six boots.

**16 PASS / 14 PLATFORM-BOUND / 3 CODE-BOUND / 0 FAIL** (15z: 12 / 11 / 3 / 7). The CODE-BOUND rows (1k heap) are accepted limits (ADR-0084).

## Honest comparison
Sqlite means against 15z:

| Metric | 15z | 15aa |
|---|---:|---:|
| 50k firstReady | 1628 ms | 1440 ms |
| 50k relaunch | 1857 ms | 1744 ms |
| 10k relaunch | 1776 ms | 1714 ms |
| 1k relaunch | 1753 ms | 1610 ms |
| 1k emitP95 | 6.42 ms | 5.42 ms |

Some sqlite means were worse this session:

| Metric | 15z | 15aa |
|---|---:|---:|
| 10k/50k emitP50 | 3.88/3.98 ms | 4.36/4.42 ms |
| 10k/50k toggleP50 | 14.7/15.7 ms | 18.4/20.0 ms |

Trial 4 was a session-wide slow period for both implementations:
- classic firstReady 604–652 ms;
- sqlite emitP50 6.8 ms and 50k firstReady 1886 ms.

Its samples raise the sqlite SDs, which enter the PLATFORM-BOUND allowance. Trial 4 is kept, as ADR-0038 requires. A robustness check without it still qualifies every affected row:

| Row | sqlite mean | Allowance limit |
|---|---:|---:|
| 50k firstReady | 1329 ms | ≈1450 ms |
| 10k firstReady | 565 ms | ≈722 ms |
| 10k emitP50 | 3.75 ms | 3.81 ms |
| 50k emitP50 | 3.83 ms | 4.08 ms |

The emission margins remain small (about 0.05–0.25 ms). No floor or estimator changed.

## Consequences
- The scheduled improvement loop ends.
- Next work: Phase 16 (flat objects + hybrid), a real-device benchmark and packaging.
