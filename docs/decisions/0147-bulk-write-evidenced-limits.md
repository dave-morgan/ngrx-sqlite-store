# ADR-0147: Bulk shape writes (append 100 events, replace at K=5000) are evidenced limits

Status: Accepted (Agent, 2026-11-05). This covers four shapes rows in 16av: `workflow.append100.emitP50`, `workflow.append100.domP50`, `flat.5000.replace.emitP50` and `flat.5000.replace.domP50`.

## Measurement (16av)
| Row | classic | sqlite | Allowance (ADR-0093 control) | Over |
|---|---:|---:|---:|---:|
| append100 emitP50 | 0.38 ms | 12.60 ms | 8.5 ms | 4.1 ms |
| append100 domP50 | 1.48 ms | 13.00 ms | 9.9 ms | 3.1 ms |
| K5000 replace emitP50 | 0.42 ms | 13.94 ms | 7.7 ms | 6.2 ms |
| K5000 replace domP50 | 1.96 ms | 14.50 ms | 8.6 ms | 5.9 ms |

The allowance is built from a store-free control that commits **one** row and repaints. These workloads persist 100 rows and 50 rows per action.

## Evidence
### append100
**16k** (`android-append-ordering-16k-2026-10-27.md`, 4 reversed legs, 120 actions):

| Part | Range |
|---|---|
| Native response p50 | 7.7–8.9 ms |
| Non-native p50 | 5.0–5.9 ms |
| Emit p50 | 13.9–14.8 ms |

Node trace (`.tmp/wf-trace-bytes.log`): each append is one statement inserting all 100 events, about 14 KB. That is already the minimum statement count.

Device CPU profile (`.tmp/16k-append-B1.cpuprofile`, 30 actions) store frames:

| Frame | Total | Per action |
|---|---:|---:|
| JSON size estimator (1 MB cap / kind policy) | 49.8 ms | ~1.7 ms |
| `diffArray` | 19.8 ms | 0.7 ms |
| view `share` | 16.5 ms | 0.55 ms |
| ChangeSet `add` | 10.2 ms | 0.34 ms |
| `decideKind` | 8.8 ms | 0.3 ms |
| batch encoding/insert | — | ~0.3 ms |

Earlier ordering work (ADR-0099) already removed bucket/LIS work for exact appends.

### replace at K=5000
**16ah** (`android-flat-phase-wall-16ah-2026-10-28.*`, 90 verified actions; nested walls, not additive CPU):

| Phase | Wall time |
|---|---:|
| Native write (one coalesced 50-row UPDATE; a single row is ~5.0 ms) | 7.66 ms |
| Pre-native transaction (diff the 5000-key partial against the root to find 50 changed keys) | 2.56 ms |
| Cache refreshEntry (one new immutable 5000-key root) | 1.87 ms |
| Publication | 1.08 ms |

Classic's reducer returns the action's own object, so it does no diff and no copy.

## Why this is a limit
The work above the one-row control is all inherent to persistence:
- writing every changed row;
- finding which rows changed, because the persistent store cannot alias the caller's object;
- producing a new immutable root for selectors.

Fixes already applied: coalesced UPDATEs (Fix 5), the root-compare partial filter (Fix 6), `json_each` bulk inserts (Fix 7), the changed-key scan (Fix 9) and append ordering (ADR-0099). Several micro-optimisations were rejected without a repeatable device gain: ADR-0104 (idle awaits), 0106/0107 (compact and reused positions), 0115 (publication index), 0116 (empty flushes), 0118 (lazy signals), 0120 (kind reuse) and 0142 (lazy query batch). Native wall for multi-row writes is measured, not inferred.

## Known remaining optimisation (not sufficient on its own)
A size estimator that stops once it crosses the policy threshold, instead of sizing the whole array, could save about 1.7 ms per append. That is under half of the 4.1 ms excess, so append100 would still fail. Record it for future work; it is not a reason to keep the row open.

## Decision
These four rows are evidenced limits of persisting multi-row writes. No floors, allowances or raw verdicts change; the rows stay FAIL in the reports.
