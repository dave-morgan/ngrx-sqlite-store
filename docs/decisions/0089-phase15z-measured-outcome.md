# ADR-0089: Phase 15z measured outcome

Status: Accepted (Agent, 2026-10-25). Parity is still incomplete; Phase 16 remains gated.

## Changes measured (all retained, each shown on device by a diagnostic A/B first)
- **JS recount of an inline whole-collection replacement.** After `setAll`/`replaceAll` writes only inline JSON rows, `count`/`exists` query selectors recount the replacement's entities with the query's own `test` (the predicate already trusted for delta maintenance) instead of a full-table SQL scan.
  - The replacement record lives in a `ChangeSet` side table (`entity-changes.ts`) and is dropped by:
    - entity row/order writes (the change set now tracks entity collections);
    - physical writes at or above the collection;
    - promoted entity nodes (`coll/~2…`).
  - Collection extras (`loaded`, `seedVersion`) do not drop it.
  - On-device A/B: count SQL went from 118–140 ms to 0 ms.
- **`INDEXED BY nss_entity_promoted` for page/ids queries.** The promoted-row CTE was planned through `nss_entity_sortkey` and scanned the whole collection. In sql.js at 50k rows the page query went from 38 ms to 0.7 ms. A plan regression spec fails without the hint.
  - On-device, with the recount: post-commit went from 155–174 ms to 92–95 ms.
- **Pipelined reload reopen.** After a WebView reload the Capacitor driver sends the stale-handle sweep, create and open together. This is the ADR-0073 ordering, and responses resolve in send order, so the sweep's registry reset lands before the new registration.
  - On-device: open phase went from a 131 ms to a 74 ms mean.

Rejected after on-device A/B, with no benefit:
- single-pass entity validation and encoding (JS gap 247 vs 248 ms);
- early transaction begin via a `prepareWrite` hint (genEnd→ready 1329 vs 1327 ms).

## Result
Session `15z-audit-1792916036`, APKs in `.tmp/15z-apks/` (classic `72cd2fc5…` unchanged, sqlite `a4f54bea…`). `.tmp/15z-verify.cjs` verifies 30 observations, 66 summaries, 33 verdicts, four controls with matching provenance and six boots.

**12 PASS / 11 PLATFORM-BOUND / 3 CODE-BOUND / 7 FAIL** (15y: 13 / 13 / 3 / 4).

| FAIL | classic | sqlite | Limit | Over |
|---|---:|---:|---:|---:|
| 1k emitP95 | 0.42 | 6.42 | 5.87 | 0.55 ms |
| 10k relaunchReadyMs | 1497.4 | 1775.8 | 1745.8 | 30 ms |
| 10k emitP50 | 0.10 | 3.88 | 3.65 | 0.24 ms |
| 50k firstReadyMs | 421.4 | 1628.2 | 1441.6 | 187 ms |
| 50k relaunchReadyMs | 1535.8 | 1856.6 | 1781.9 | 75 ms |
| 50k emitP50 | 0.10 | 3.98 | 3.74 | 0.24 ms |
| 50k emitP95 | 0.38 | 5.76 | 4.89 | 0.87 ms |

## Honest comparison
The sqlite means improved against 15y almost everywhere:

| Metric | 15y | 15z | Change |
|---|---:|---:|---:|
| 50k firstReady | 1771 ms | 1628 ms | −143 ms |
| 50k relaunch | 1976 ms | 1857 ms | −119 ms |
| 10k relaunch | 1846 ms | 1776 ms | −71 ms |
| 1k relaunch | 1865 ms | 1753 ms | −112 ms |
| 10k emitP95 | 6.50 ms | 5.62 ms | −0.88 ms |
| 1k/10k emitP50 | 4.06/4.12 ms | 3.84/3.88 ms | −0.22/−0.24 ms |

The new FAILs come from the same-session references moving while the sqlite means fell:
- The unchanged classic APK relaunched 190 ms faster at 10k and 137 ms faster at 50k.
- The 1k/10k F_commit p50 dropped from 4.2/4.1 ms to 3.7/3.6 ms.

The 50k firstReady excess shrank from 311 to 187 ms. Under the ADR-0038 rules these rows remain FAIL. No floor or estimator changed.

## Next
Store-attributable work that remains:
- 50k first-ready store boot: seed generation starts about 185 ms later than classic.
- The bulk seed JS gap: about 250 ms of validation, encoding and dispatch.
- User-declared query-index maintenance: about one third of the bulk insert in sql.js.
- The about 0.2–0.3 ms emission JS above the commit floor.
