# Narrow index read and update tradeoff16ad

Unchanged retained16r APK `8394ff506bac866e0d3405083eea4aac782f99986ac85e80266033ada8fa42a5`, fresh verified boot `e96a2a72-cf4a-4b02-8958-18a3f4a729b2`, normalized50000todos. No production index, hint or application change.

`16AD_DONE` and independent verifier confirm64reads (4warmup/60measured),44writegroups of20updates (80warmup/800measured), alternating pair orders, allfinite samples, one changed row per write, originalcell restored each group, originalindexDDL/alltablecounts/countresponses restored at completion. Countresponses32487open/50000total. Every call checkpointed. Actual raw path is `.tmp/16ad-count-cover.json`: the initial state/verifier path said `16ad-index-cost.json`; verifier repaired before execution, original retained as `.tmp/16ad-analyze.before-path-fix.cjs`. Running scripts were not edited, data not moved or rerun.

| Native read mode | Mean ms | Sample SD ms | Median ms |
|---|---:|---:|---:|
| Automatic primary-key plan |54.606667|3.259779|53.60|
| Forced narrow index |42.323333|1.292867|42.15|

All30paired reads favor forced narrow; mean deltas -12.420000/-12.146667ms in the two orders. Automatic still ignores the scratch index. This resolves16ac's always-last automatic timing limitation, not its planner limitation.

Scalar UPDATE400measured calls per mode: baseline mean5.122250 SD3.536871 median4.6ms; indexed mean4.626000 SD.566725 median4.5ms. Pair-of-group-mean deltas indexed-minusbaseline: -.1620/-.8305ms in the two orders; median+.0425/-.2625, indexed faster4/10 and7/10. Baseline outliers contribute to mean difference; **no reliable update speedup established**, and this small subset does not bound bulk insertion, initialseed or whole-apptransaction cost. Each group alternates changed BooleanJSON and originalJSON using RowWriter.updateEntityData's exact bound UPDATE, transactiontrue/readonlyfalse/returnModeno/isSQL92true. DDL outside timing can affect cache state.

Twelve scratch index creations averaged94.0ms (77.9–126.7), outside read/update timings. Native wall measurements are not SQLCPU or applicationlatency. IndexDROP restores logical schema, not file compaction. Per-read results were compared by helper; payload copies not individually retained.

Decision: hold the index implementation. Read benefit is repeatable only with explicit selection, while production would need index lifecycle/availability metadata, queryhint and unmeasured bulk-write cost. A simpler next hypothesis from capturedVDBE is conditional aggregate argument construction: `COUNT(CASE WHEN predicate THEN1END)` versus equivalent `COUNT(*) FILTER(WHERE predicate)`, with plain `COUNT(*)` for unfiltered count. Measure that SQL without a new index before production changes.
