# Narrow Boolean count index diagnostic16ac

Unchanged retained16r APK `8394ff506bac866e0d3405083eea4aac782f99986ac85e80266033ada8fa42a5`, verified cold boot `048283ab-f09b-48b1-9395-004eed8b1aa9`, normalized 50000 todos. Diagnostic only; no application, index migration, query hint or floor change.

Independently verified 99 observations: 9 warmups and 30 reads per mode; finite wall times, alternating old/cover order, matching helper-checked count responses (32487 open/50000 total), original/final index DDL equality, scratch index absent, unchanged todo row count. Actual installed hash, boot, session and captured production SQL provenance checked. Raw and independent analysis accompany this document.

| Native mode | Mean ms | Sample SD ms | Median ms |
|---|---:|---:|---:|
| Forced existing value index | 85.383333 | 10.586363 | 80.95 |
| Forced narrow type index | 44.343333 | 4.984091 | 42.35 |
| Automatic production plan | 55.910000 | 6.055283 | 53.15 |

Forced narrow beat forced old in all 30 rounds, both orders (mean deltas -41.266667/-40.813333 ms). This is not a 41ms improvement over production: production uses the primary key, averaging 55.91ms. Automatic runs always followed the two forced modes; their comparisons have an order limitation. No application speedup or SQL CPU claim.

SQLite ignored the scratch index automatically. Both pre/post automatic plans use the primary key for the counts CTE. Forced VDBE reads the stored type expression and omits `json_valid`/`json_type` calls, but still opens the entity table and executes `NotFound` for each key. It is **not a fully table-free scan**. The baseline reads data column4 and evaluates the JSON functions. Schema column order and root pages were checked against migrations and captured sqlite_master.

Page count grew 3425→3727 and remained3727 after DROP. Logical index cleanup and rows are verified; file compaction/free-page recovery was not measured. Individual response payloads were normalized and checked by the helper, with expected counts retained; per-query payload copies were not exported.

Outcome: read-path hypothesis demonstrated only when forced. No production index/hint retained. Before any implementation, measure actual data-changing scalar UPDATE maintenance and compare forced narrow directly with automatic production reads in both orders. New diagnostic16ad addresses those unmeasured tradeoffs, without a production change.
