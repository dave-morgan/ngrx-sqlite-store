# ADR0136: complete object reads from an authoritative shell

Status: Rejected after full16bj/16L23 acceptance; all source/APKs/raw preserved.

16bh locates repeated workflow reads (14.87ms mean, native query14.413333ms) within reset25.716667ms. Selected children are complete cached owners; the whole feature is not. Replacing onState or stitching partial views would change behavior. Root adoption adds retained state and ownership complexity. General subtree exclusion requires more SQL/assembly machinery. Prefer a narrow object-shell read with full fallback.

On an unchanged transaction cache miss, ask the committed PathCache for fresh, complete, non-query object-valued direct child owners. This is an ephemeral map referencing existing values, not another cache or lease. No hints means the current read path and SQL remain identical. Any overlap in the current transaction disables hints. Query the actual nss_node root and actual immediate children through existing primary/parent indexes. The result proves root existence, object kind, child membership, ordering and positions, including unselected children such as error.

Reuse a cached child only when its metadata path/kind matches its actual physical row. Uncovered scalar/null/inline-JSON children decode normally. If root is not an object, or any uncovered child needs descendant/entity/chunk data, discard the shell and execute the unchanged full-subtree reader. Missing cached children are not injected. Assembly creates only a new parent, including a fresh complete childPos map, without modifying reused values/metadata or adding a persistent root owner. Existing NodeStore/StoreTx internal signatures may carry optional read hints; no public StoreAPI, schema, writes, FIFO, persistence or notifications change. Shell projections retain the existing eleven subtree transport columns so prefetch batching stays valid.

The shell can cost an extra query on incomplete coverage. This is an explicit tradeoff requiring actual device evaluation, all adverse means and full acceptance; no numeric floor or gain is inferred. No source fix is justified by code-only work removal.

## Implementation and validation plan

1. Archive exact baseline reader/facade/transaction/cache and add failing tests using real sql.js and the real PathCache. A covered object read must preserve cached child identities and transport only root/direct rows while preserving unknown error, ordering, metadata and persisted next writes.
2. Add optional internal child-hint capability; only clean complete non-query direct owners qualify. Hints are consulted only after a root cache miss and when no current transaction changes overlap the requested root.
3. Implement authoritative shell plus existing full-read fallback; extend existing assembly to attach reused children without mutating their metadata. Preserve the old SQL and allocation path when hints are absent.
4. Verify fallback for unknown containers, arrays, entities, chunked values, absent/mismatched child metadata, root deletion/kind transitions, stale cache, query projections, earlier writes and rollback. Verify escaped/__proto__ keys and array/entity metadata/ordering beneath cached children.
5. Run all library tests, tool/harness/E2E checks, library and candidate APK build; freeze source/APK. Mandatory six50k guards versus15aa with unchanged300s waits, then reversed fresh coldboot+60settle workflow-reset probes versus16aw; preserve all emit/DOM/native/query rows/adverse results. No extra CPU/heap/PSS/GC capture. Only repeated workload benefit warrants first full fresh matched shapes+list acceptance; all0FAIL and mean/heap guards remain mandatory before retention.

No commit or changed floors. User-authorized autonomous iteration applies. Both goals remain open.

## Canonical metadata dependency and first tests

The real-cache regression proves active known-write splicing could retain old childPos metadata after a new child was committed. The inactive case passes on baseline and is not claimed broken. A helper now follows only touched paths within existing complete known writes, applying canonical metadata to newly copied ancestors. Metadata-only changes shallow-copy a shared old object first, preserving prior snapshots and entity order/brands. This adds no persistent cache or lease and does not scan all unchanged subtree values.

RED2fail3pass (new shell identity + active stale positions), thenGREEN5. Expanded11 cases pass, including same-key delete/re-add positions/prior metadata, array and entity identity/order/brands, uncovered container/chunk fallback, dirty/transaction-local writes, escaped own __proto__ keys, unknown fields and 11-column concurrent prefetch. Initial test construction type error (.value versus engine.transaction.result) is archived before valid RED; no production failure or device samples hidden. Full library and further review are pending; no app benefit claimed.

## Candidate validation

16BI_VALIDATION_DONE:459 library/40 tools/1 harness/30 E2E/library+APK build PASS; candidate APK SHA2563930c23388cbcb3313e8ee8c776198f769ab6304bb97feedf3de90fcd7a4b9da. Four production files plus15 new regression cases; nine frozen source/context files in16bi-source. Review found no blocking issue. Missing/mismatched metadata, absent/scalar roots, query projections and rollback cases added and pass. An initial added query-projection test incorrectly expected an unleased query to refresh; failure16bi-library-green2.log remains, setup now retains its query and final green3 passes459. No production defect hidden or acceptance rerun. Host evidence: ../benchmarks/android-object-shell-host-16bi-2026-10-30.json.

Prepared16bi-run.cjs/16bi-launch.cjs/16bi-workflow-probe.mjs/16bi-verify.cjs: six lp32 guards against15aa retaining untimed300s waits, then A1/B1/B2/A2 fresh verified coldboots+60settle/50backgroundtodos/original workflow prelude/40wfReset samples perleg. A=16aw/B=16bi; capture original native Promises, actual hash/boot/session/source/toolSHA, reset query rows/bindings/coalesced5paths and SQL counts before/after restored wrapper. Timing only/no additional CPUheapPSSGC. Full fresh matched shapes+lists required if warranted, all adverse and mean/heap guards remain mandatory.

## Verified device diagnostic

16BI_DONE genuineparent0+5reboots/6guards4reports160reset+160dirty320atomicwrites/160workflowqueries/4terminalcheckpoints/hash-session-source-SQLproof independently verified. A66→B9 rows every reset; exactsame5pathwritepayloads. Meanemit−5.955/−9.02ms;DOM−5.8475/−9.03;query−6.5/−7.0325;residual−.255/−.9875 bothorders. Querymax+6.1/+7.6 adverseboth/nativewriteanddirtychannelsmixed;ALL70comparisons/raw retained. Guard+2.3ms withinSDsum69.560707/twoofthreepairsadverse/no startupwin/equivalence. Inheritedopen/count/coalescing differencesversus15aa notattributedtoshell. Verifierinitialterminalcheckpointmisclassification correctedafter preservingoriginal/assertion/hashes; rawhelperrunnerunchanged/no retry/hidden samples. Evidence [app diagnostic](../benchmarks/android-object-shell-app-16bi-2026-10-30.md). Provisional target benefit ONLY; postchecks thenFIRSTfreshfullshapes+lists warranted/no finalretention/heapclearance.

## Postchecks and first full acceptance

16BI_POST_DONE genuineexec83439exit0:459library/40tools/1harness/30E2E/librarybuildPASS, all25source/tool/environment hashes unchanged and frozen APK not rebuilt. Prepared full16bj/16L23 first matched acceptance on candidate3930c23388cbcb3313e8ee8c776198f769ab6304bb97feedf3de90fcd7a4b9da/classic58ad9c2ab62cb9e1ec71004f80bbad22a67edb82b12496698e2ebba5e0526311. Independent preflight review found no blocker. All nine source/context snapshots exact. Fresh labels/controls/reboot+warmup unchanged; full existing shapes/list memory controls remain approved and unchanged, no extra capture. Verify both genuine roots and all86+33means/verdicts/source-tool/session/APK/journals before retention decision. Retained reference and all historical adverse/heap debt remain open.

## First full shapes result (lists pending)

16bj verified2PASS54PB0CB30FAIL=56/86 versus retained16av57/86. Five SQLite means exceed summedSD versus16av:K50backlog and four total heaps. Against provisional16ay four heaps and both resetP95 means exceed summedSD; all five heap data-parity checksFAIL/noCODE-BOUNDdismissal. ResetemitP5017.46ms andP9570.56ms remainFAIL. All86/rawcontrols/code-data-PSScomponents and adverse rows are retained in [shapes evidence](../benchmarks/android-object-shell-shapes-16bj-2026-10-30.md). Code-space observations do not prove source causality or dismiss mean/heap guards. Lists16L23 remain active; no full retention verdict yet.

## Full outcome and rejection

Full16bj/16L23 genuine parent/list0; independent raw audits agree. Lists32/33(12PASS17PB3CB1FAIL):1kPSS over.380290083938MiB; four retained-reference heap means exceed summedSD. Shapes56/86 with five adverse means versus16av, four heap regressions included/all5data-parityFAIL. Qualification/control changes do not establish general workload gain or source causality. Targeted reset benefit remains evidenced but does not clear retention gates. Reject and restore all four production files, preserve all15tests/9candidatecontexts/30source-toolbytes/APKs/raw. Isolate the separately reproduced canonical-metadata correctness regression in a new candidate; do not claim it fixed by rejection. [Full evidence](../benchmarks/android-object-shell-acceptance-16bj-2026-10-30.md). Raw PSS explanation typo is presentation-only; verified numeric formula is additive, floors/verdicts unchanged. Both goals open/no unchanged rerun.
