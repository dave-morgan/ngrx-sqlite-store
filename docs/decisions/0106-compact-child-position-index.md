# ADR-0106: compact large-object child-position metadata

Status: Rejected16v and reverted. Retained16r baseline; outcomes below.

Large flat objects retain an internal child-name-to-position Map in NodeMeta. This duplicates hash-index overhead alongside the selected object. Root-cache expansion was rejected as an idea because it absorbs selector leases/retains unselected state. Instead,pack immutable object indexes with at least256 children as sorted names,Float64Array positions,and Uint32Array insertion-order indexes. Small maps and array/entity ordering metadata stay unchanged.

ReadonlyMap lookup uses binary search; iteration/forEach preserve original insertion order. StoreTx receives the same read-only interface. NodeReader/writer and PathCache child-position reload pack only object metadata after mutable assembly; object diffs still use mutable Map copies. Exact child positions,bindings,SQL/schema/JSON,row caps,transaction/FIFO/persistence/notify-after-commit remain unchanged. Cache retained-size estimate stays the old conservative size*64; do not reduce eviction accounting to manufacture savings.

Tradeoff: less aggregate retained memory,more sorting/construction and logarithmic lookup. This is NOT a risk-free or measured application win; retention requires actual device results and the existing list guard. No new floor or object-graph/heap capture.

Regression old5000-key object metadata wasMap (valid behavioral RED .tmp/16v-red2.log); candidate passes. Earlier test typing failures and all green attempts preserved.418 library tests pass:200 randomized large index differential cases,Map insertion order/IEEE numbers/Unicode/prototype names/forEach/source mutation isolation,5000-key write/read/diff/reload/physical positions,location-free scalar update,and unchanged300-element array metadata.30e2e/library+SQLiteAPK builds pass (.tmp/16v-validate.stdout.log). FrozenAPK fa889c928ee7369f49ab79297aaf7462bbbc6c613dff7b8c4cc317e2b1a92752.

Offline actual-production-helper separate-process aggregate heapUsed+arrayBuffers probe:6 alternating pairs,200 indexes/process,5000 keys/index,200000 lookups. Means below count typed backing bytes,not just V8 heap. Prototype1000 differential cases are distinct from actual factory200 unit differential cases. Raw .tmp/16v-production-layout.json/jsonl and .tmp/16v-index-layout.json/jsonl retained. Offline timings are not application predictions.

{
  "map": {
    "heapBytes": 45964200,
    "arrayBufferBytes": 0,
    "totalBytes": 45964200,
    "constructMs": 59.39158333333333,
    "lookupMs": 14.694516666666665
  },
  "compact": {
    "heapBytes": 8184264,
    "arrayBufferBytes": 12000000,
    "totalBytes": 20184264,
    "constructMs": 229.00723333333335,
    "lookupMs": 39.53176666666667
  }
}

Device plan .tmp/16v-run.ps1: mandatory50k3A/3Bguard versus15aa (lp15,existing300s untimed perleg),then reversedA1/B1/B2/A2 each verifiedcoldboot+60settle,explicit baseline16r/candidate install. K5000 normalized background50,three scenarios each5warmups+40 measured actions,raw emit/DOM arrays/native summaries. Aggregate Runtime.getHeapUsage including backingStorageSize and app+renderer PSS before/after; GC outside timings,no extra heap snapshots/CPU profiler. Full checkpoints preserve completed scenarios on failure. InstalledAPKh/session/boot,5001flat SQLrows and persistedtarget match DOM verified. Native spans are enclosing response wall,not SQLCPU; DOM observations do not prove painted frames. Prepared verifier checks6guards/4boots/4*3*40=480actions andnativecalls,allaggregate counters/proof,all adverse paired channels. Fresh fullmatched shapes+list acceptance only if warranted; no automatic retry/overwrite/unchanged variance hunting.

Device diagnostic ACTIVE .tmp/16v-run.ps1 PID23880,logs .tmp/16v-run.stdout.log/.stderr.log;frozen candidate hash recorded above. Mandatorylp15guard first,then reversedflatprobe. No device result yet. Actual production offline aggregate raw copied durably to android-compact-positions-layout-16v-2026-10-28.json (no heap snapshots).

Guardlp15 all6observations independently verified:50000ready,finite startup calls. Reference15aa mean1489.5000 SD3.559494ms,candidate16v1474.3000 SD32.392129ms;delta-15.2ms within sumSD35.951623. Pairedcandidate-minusreference -53.3/+17.1/-9.4ms,mixed;no repeatable startup gain. Baseline68calls/candidate69calls,all traces retained. Raw .tmp/lp15-*.json,summary .tmp/16v-guard-summary.json. At11:47Brisbane runner23880 moved sequentially to FLAT_AB/rebootA1;flat memory/timing results pending,no retention claim.


## Final16v outcome: rejected; source reverted
16V_DONE with no device runner remaining. Independent .tmp/16v-verify.cjs verifies6guardtraces,4distinctboots,4installedAPKhash/session/seedreports,480finiteactions+480atomicwrites,aggregateheap+backing/PSS and5001persistedflatrows/targetproof. Durable all raw summaries/comparisons android-compact-positions-app-16v-2026-10-28.json;original reports/traces/APKs preserved.

Used-heap plus backing-storage after candidate-minusbaseline bytes (A1/B1 and A2/B2):single -47158/-61597;ten-key -45790/-60509;replace -39946/-56810. Lower in both directions,but substantially below isolated offline layout estimate. PSS mixed (+3.84..4.84MiB one direction,-7.04..7.29other),no repeatable PSS benefit. Replacement mean+.615/+3.025ms andP95+10.1/+16.8ms are adverse in both directions;ten-key mean-2.040/-1.878ms improved. Single mean+.0325/-.660mixed. No general application win;raw adverse values retained.

Rejected compact-index16v: small retained aggregate saving does not justify sorting/binary-search complexity and repeated replacement regressions. Source/tests/APKs archived .tmp/16v-source and .tmp/16v-apks before targeted revert,no gitcheckout. Kept generic large-object write/read/diff/location-free-update/array correctness tests;removed only rejected representation implementation/unit suite from active library tree (all archived). No unchanged acceptance rerun. Next isolated16w hypothesis:diffObject copies position indexes even without child membership changes. Reuse existing index for value-only diffs;copy on structural change,compute old maximum only for actual insertion. This is independently measurable on ordinary Map baseline;no compact representation retained.
