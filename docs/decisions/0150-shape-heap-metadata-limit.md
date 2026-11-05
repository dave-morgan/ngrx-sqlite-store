# ADR-0150: Shape heap rows: library code plus persistence metadata (evidenced limit)

Status: Accepted (Agent, 2026-11-05). This covers five shapes rows in 16av: `flat.50/500/5000.heapMb`, `workflow.heapMb` and `workflow.relaunchHeapMb`.

## Measurement (16av, ADR-0067 code/data split)
| Row | classic | sqlite | Code delta | Data classic → sqlite | Data delta |
|---|---:|---:|---:|---|---:|
| flat K50 heap | 3.72 MB | 5.06 MB | +1.16 MB | 1.51 → 1.62 | +0.11 MB |
| flat K500 heap | 4.07 MB | 5.55 MB | +1.23 MB | 1.89 → 2.07 | +0.18 MB |
| flat K5000 heap | 8.10 MB | 9.94 MB | +1.23 MB | 5.73 → 6.26 | +0.53 MB |
| workflow heap | 3.87 MB | 5.49 MB | +1.31 MB | 1.63 → 1.87 | +0.24 MB |
| workflow relaunch heap | 3.35 MB | 4.49 MB | +0.74 MB | 1.45 → 1.83 | +0.38 MB |

Each row would be CODE-BOUND (ADR-0062/0067) if store data matched classic. It fails only because of the data delta.

## Evidence for the data delta
The sqlite build keeps, next to the same state objects classic holds:
- per-container node metadata (path and kind; ADR-0018/0021);
- child-position maps for object and array containers (`childPos`, required so diff writes target the right rows without a read; Fix 1, ADR-0107);
- PathCache entries and leases for selected paths.

The delta scales with container width, as that metadata would: +0.11 MB at K50 up to +0.53 MB at K5000, about 5000 child positions.

Attempts to shrink it were measured and rejected:
- **ADR-0106 (16v, compact Float64Array positions):** saved 40–62 KB of used+backing memory in both orders, but replacement latency got worse in both orders (+0.6/+3.0 ms mean, +10/+17 ms p95).
- **ADR-0107 (16w, reused maps):** gave no memory gain and failed the guards.
- **ADR-0136 (16bi, object shells):** regressed all five heap data-parity checks.

Dropping `childPos` would need a parent/position read per write, which is the per-key SELECT that Fix 1 removed and that cut 10-key writes from 81 statements to 10. A further heap capture to attribute the delta object by object is blocked by policy; existing captures were not bypassed.

## Decision
These five rows are an evidenced limit:
- **Code:** +0.74 to +1.31 MB of compiled library code, CODE-BOUND by method.
- **Data:** +0.11 to +0.53 MB of persistence metadata that the write path needs. Compacting it cost latency in measured trials.

No floors, allowances or raw verdicts change; the rows stay FAIL in the reports. Revisit if a metadata representation passes both the latency and the heap gates.
