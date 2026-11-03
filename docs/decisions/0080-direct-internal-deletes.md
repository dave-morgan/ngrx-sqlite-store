# ADR-0080: Avoid native sync-metadata rewriting for internal deletes

Status: Accepted (Agent, 2026-10-24)

The15t Java trace cannot pair the full workload, but its retained stack locates
`Database.deleteSQL -> UtilsJson.isLastModified -> UtilsDrop.getTablesNames`.
Installed Android plugin source invokes this sync-metadata path for every plain
DELETE. The library's reserved nss_node/chunk/entity tables do not have the sync
columns and require ordinary SQLite deletion.

An unprofiled native diagnostic alternates60 pairs of the same six bound no-op
deletes in one atomic transaction. A leading `/*nss*/ ` SQL comment leaves the
SQLite statement unchanged while avoiding the plugin's first-token DELETE
heuristic. Median16.8 ->7.1ms, mean17.147 ->7.257ms, all60 pairs improve. All120
responses report zero changes and before/after table counts match. Raw
`.tmp/15u-delete-probe.{json,jsonl}` and source/logs retained. This is not an
application speedup or floor claim.

Add optional driver/executor `directDeletes`, default false. Writable open Android
advertises it. RowWriter prefixes only its no-return DELETE writes for the three
reserved tables, before StorageEngine accounts transport bytes. Bound values,
actual deletion, affected paths, row caps and atomic commit/rollback stay intact.
Returning query deletes and arbitrary caller SQL keep their existing paths;
web/iOS/custom drivers retain their current default. No native-plugin fork,
migration, stored JSON-format or notification-order change.

Run RowWriter cases with the capability false/true. Regressions verify prefix
transport, quoted bound paths, exact subtree versus neighbor preservation, actual
node/chunk/entity deletion and rollback. Driver tests cover platform/readonly/open/
close capability state. Two failures before implementation establish the missing
capability and prefix. Then full library/e2e/builds, actual Android deletion proof
and reversed APK measurements are required before retention/acceptance claims.

Validation:371 library tests/26e2e/library+SQLiteAPK builds pass, with RowWriter suite running both capability paths. Active `.tmp/15u-ab.sh` PID40840 logs `.tmp/15u-ab.stdout.log/.stderr.log`: actual APK deletion/rollback proof, then reversed1k/10k/50k A1/B1/B2/A2 each after separate verified coldboot+60s settle. Native probe durable raw [delete ladder](../benchmarks/android-delete-ladder-15u-2026-10-24.json). No application speedup claimed before results.

Actual APK proof confirms1000rows remain after a deliberately failed atomic delete, then libraryReset deletes them to0 with18 prefixed internal statements. Reversed APK run verifies12sizeobservations/4boots/APKs/sessions/samplegroups: first-ready improves71.1/86.1ms at1k,134.3/25.0ms at10k,102.0/87.7ms at50k. Relaunch/toggle tails mixed and baselineA2relaunchdrifts; all data/regressions retained. Retain for demonstrated work removal/repeated startup direction, then fresh matched full acceptance required. [Complete table](../benchmarks/android-ladders-15u-2026-10-24.md).

Full15u acceptance verified30/66/33/all4controls/6boots:11PASS/11PLATFORM-BOUND/3CODE-BOUND/8FAIL,22/33qualified unchanged from15s. Individual improvements and regressions are retained in the complete table; no general parity claim. Accepted for proven work removal and reversed startup benefit. The user goal remains unmet and Phase16 gated.
