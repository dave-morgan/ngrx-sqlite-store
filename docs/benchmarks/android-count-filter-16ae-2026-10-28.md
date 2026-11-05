# Conditional aggregate rewrite16ae: rejected

Unchanged retained16r APK `8394ff506bac866e0d3405083eea4aac782f99986ac85e80266033ada8fa42a5`, verified boot `19fd74df-f80c-4489-b404-0123e64d914f`, normalized50000todos. This read-only diagnostic rewrites only the two aggregate expressions in captured production SQL: conditional CASE argument→COUNTstar FILTER, unfiltered constant CASE argument→COUNTstar. Exact predicates/bindings/WHERE/promoted fallback/transport remain unchanged.

Independent verifier confirms124observations (4warmup/120measured),60alternatingpairedorders,actualinstalledhash/boot/session/sourceSQLhash,finite samples,exacttwoexpressionrewrite,matching expected helper-checked countresponses32487open/50000total, unchanged tablecounts and indexDDL. No DDL, writes, index, CPUprofiler, heapcapture, application or floor change. Payloads checked by helper; individual response copies not exported.

| Native form | Mean ms | Sample SD ms | Median ms |
|---|---:|---:|---:|
| Current CASE |53.621667|3.955262|52.4|
| FILTER/plain COUNTstar |58.905000|4.384697|57.4|

Candidate-minuscurrent paired means+4.943333/+5.623333ms in the two orders; candidate faster1/30 and2/30. All60pairs and adverse observations retained. StaticVDBE instructions153→147; count aggregate argument count1→0. Fewer static instructions did **not** produce a nativewall benefit; exact runtime cause of regression is not established. Nativewall is not SQLCPU/applicationlatency/acceptance.

Decision: reject hypothesis, keep production SQL unchanged. No new application candidate, tests/build or full acceptance rerun of the unchanged APK. Retain raw/analysis/helper/sourceSQL lineage. The16ac/16ad forced-index read benefit remains a separate held proposal requiring explicit index availability/lifecycle, bulk seed/write cost and list guard evaluation; this result does not validate it.
