# ADR-0151: Shape PSS rows: persistent-store working set (evidenced limit, partial attribution)

Status: Accepted (Agent, 2026-11-05). This covers four shapes rows in 16av: `flat.50/500/5000.pssTotalMb` and `workflow.pssTotalMb`.

## Measurement (16av; allowance = classic SD + empty-plugin baseline 2.8 MB + sqlite SD)
| Row | classic | sqlite | Excess | Allowance | App delta | Renderer delta | JS heap delta (ADR-0150) |
|---|---:|---:|---:|---:|---:|---:|---:|
| flat K50 | 223.0 MB | 235.0 MB | +12.0 | 5.9 | +5.7 | +6.3 | +1.3 |
| flat K500 | 225.6 MB | 235.2 MB | +9.6 | 6.7 | +6.3 | +3.4 | +1.5 |
| flat K5000 | 232.0 MB | 249.6 MB | +17.6 | 6.9 | +13.7 | +3.8 | +1.8 |
| workflow | 223.7 MB | 239.4 MB | +15.7 | 7.2 | +8.4 | +7.3 | +1.6 |

App and renderer deltas are the 16av tool's process split (diagnostic table "device PSS split").

## Attribution (evidenced)
- **App process, +5.7 to +13.7 MB.** This is the native SQLite and plugin side of a store that actually holds data: the open connection with WAL, the page cache, prepared statements, and Java-side bridge marshalling of result rows. ADR-0070 measured that marshalling as transient Java heap garbage of about 10 MiB in the list work.

  The empty-plugin baseline (2.8 MB) only covers opening the plugin with no data. The delta grows with the data loaded: +13.7 MB at K5000 against +5.7 MB at K50.

  Bulk-memory reclamation (ADR-0064: checkpoint TRUNCATE plus `shrink_memory`) and the default cache size are already applied.
- **Renderer, +3.4 to +7.3 MB.** Of this, +1.3 to +1.8 MB is JS heap: library code plus persistence metadata (ADR-0150). The remainder is WebView-side and not further attributed. It is consistent with compiled code caches and V8 page-granular heap reservation for the larger heap, but that is not proven.

## Limits of the evidence (stated plainly)
There is no object-level or native-allocation attribution. Additional heap, PSS and GC captures are blocked by policy and were not bypassed.

The approved list-style real-row transfer bracket (ADR-0070/0087, approved for shapes in ADR-0093) was not implemented for shapes. At K50/K500/workflow the transferred rows are too small to cover the excess, so it could not change those verdicts. At K5000 it might cover part of the app delta, but not the renderer delta.

So this ADR records an evidenced, partially attributed working-set cost of persistence. It is not a proven minimum.

## Decision
These four rows are an evidenced limit of the persistent store's working set: native SQLite and plugin state plus library code and metadata. No floors, allowances or raw verdicts change; the rows stay FAIL in the reports.

Reopen if object-level memory attribution becomes permissible, or if the shapes real-row bracket is implemented and shows the K5000 app delta is mostly transfer garbage.
