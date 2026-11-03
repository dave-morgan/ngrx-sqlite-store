# ADR-0077: Index promoted entity membership

Status: Accepted for proven native scan removal; parity incomplete (Agent, 2026-10-24)

Entity aggregate/page readers check `coll=? AND data=''` for promoted rows.
The native 50k query plan scans the collection's primary key and reads every
inline payload even when there are no promoted rows. A partial index on `coll`
with predicate `data=''` gives a covering membership lookup: the WITHOUT ROWID
table's primary key also supplies the entity ID.

Six alternating native probe pairs show the membership query falling from
8.99 to2.39ms with identical results. The original single-index probe measured
8.66 to2.49ms. These are diagnostic bridge timings, not application acceptance.
Raw corrected probe: [index ladder](../benchmarks/android-promoted-index-ladder-15o-2026-10-24.json).

Add internal migration4 creating `nss_entity_promoted ON nss_entity(coll) WHERE
data=''`. Stored rows, JSON representation, expressions, public APIs, row/transport
caps and transaction/notification semantics remain unchanged. Ordinary inline
rows create no index entries. SQLite maintains membership during updates/deletes.
Do not force query indexes or adopt the separate JSON-type covering prototype.

Regression: upgrade a populated v3 database, verify byte-identical rows, the
covering query plan, collection isolation and transitions into/out of promoted
membership. It fails before implementation because no covering index exists.
Run full library/e2e tests and builds, then verify the actual candidate plan and
compare reversed APK measurements before drawing timing conclusions.

## Diagnostic setup correction

Initial probe scripts joined multiple DDL statements with `; `, but the installed
plugin's `UtilsSQLite.getStatementsArray` splits at `;\n`. Only the first setup
statement took effect, so the first two successful probes tested the promoted
index alone, not their intended extra inline index. The initial covering probe
then failed on an already-existing scratch index; its completed in-memory timing
rows were not exported and are unavailable, so it supports no comparison.
Its error log/source are retained in `.tmp/15o-query-index-cover.*`.

The corrected v2 probe issues each DDL separately, verifies the active index
definitions before timing, immediately persists each completed record to JSONL,
and verifies all scratch indexes removed. All12 records match query results;
the JSON-type covering prototype remains diagnostic only. No acceptance samples
were run or discarded during these probes.

Validation:348 library tests and26 e2e tests pass; library/SQLite APK builds pass. The full first unit run exposed a stale schema inventory expectation; it was updated for the new index and the entire suite rerun successfully. Active reversed runner `.tmp/15o-ab.sh` PID39212 logs `.tmp/15o-ab.stdout.log/.stderr.log`: explicitly installs candidate, validates schema4/50000 rows/covering promoted lookup, then50k A1/B1/B2/A2 each after separate verified coldboot+60s settle. Baseline is15n; single-trial results diagnostic, not acceptance.

Reversed APK run complete, all4 observations/session/hash/sample provenance and4boots verified. First-ready improves67.1/73.2ms in both directions; relaunch mixed(-228.8/+144.2ms), toggleP95 worse2.5/7.8ms. Retain for proven native scan removal and repeated first-ready direction; full matched acceptance required to evaluate all metrics. No single-trial verdict counts used. See [full comparison](../benchmarks/android-ladders-15o-2026-10-24.md).

Full15o acceptance verified30 observations/66 recomputed summaries/33 verdicts/four matching controls:12PASS/10PB/3CB/8FAIL.15l10PASS/12PB/3CB/8FAIL; qualified total unchanged.1k/10k emission p50 becomeFAIL, despite roughly similar SQLite means, as allowances change; no general improvement claim from independent sessions. Keep index for proven scan removal and reversed first-ready direction, continue remaining gaps. Phase16 gated. [Evidence](../benchmarks/android-ladders-15o-2026-10-24.md).
