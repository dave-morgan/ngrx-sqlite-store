# ADR-0079: Reuse a static selector scope when its inputs are unchanged

Status: Accepted for proven allocation removal; parity incomplete (Agent, 2026-10-24)

Static watchers currently build a fresh scoped tree and reconcile it on every
cache notification, before checking whether the selected input/query values
changed. A regression selecting `todos/items` observes four redundant freezes
of that scoped root after an unrelated filter commit. An appended item must
still change the signal result.

Precompute non-query source path segments once per watcher. Keep the prior
source values and rebuild/reconcile the scope only when one input identity
changes. Query values and readiness continue through the existing checks;
dynamic selectors retain their discovery path. Preserve structural sharing,
explicit replacement identity, defaults, feature/session lifecycle and errors.
No schema, persistence or notification-order change.

The performance regression fails before implementation. Run the full library
suite (including identity, defaults, query and error recovery), e2e and builds,
then reversed APKs and sequential native/JS emission probes. Retention requires
proven redundant work removal or measured benefit; no timing claim from code.

The preceding15r count-index probe retained24 records with48 samples per mode,
matching50k results and verified scratch-index cleanup. Covering expression
count mean36.10ms versus37.09ms for an existing partial index; unforced planning
with the scratch covering index present34.77ms. All EXPLAIN variants omit JSON
function calls. No application benefit or adequate tradeoff for an additional
50k-entry index is established, so no production index/hint is added.
Raw `.tmp/15r-count-index.{json,jsonl}`, source and logs retained.

Validation:350 library tests/26e2e/library+SQLite APK builds pass. The first test spy attempts were unsupported by Angular relative-module mocking; logs retained. The final regression spies Object.freeze and fails with4 redundant scoped-root freezes before implementation, then passes with0. Active `.tmp/15s-ab.sh` PID19792 logs `.tmp/15s-ab.stdout.log/.stderr.log`:1k+10k A1/B1/B2/A2 each verified coldboot+60s settle, followed sequentially by1k200sample emission/native/JS diagnostic. No competing workloads; timing pending.

Reversed APK/probe outcome verified8observations/4boots/four200sample probe channels.10k toggleP50 improves2.7/2.4ms;1k toggleP95 worsens5.6/24.3ms. Non-native emission median .6->.6/.5ms, native noise differs. Retain provisionally for regression-proven work removal, but no immediate full acceptance until1k native/DOM phase investigation. No claimed general speedup; all unfavorable samples preserved. [Table](../benchmarks/android-ladders-15s-2026-10-24.md).

Tail investigation:four hash-verified120toggle reports complete. Candidate post-native medians1.9/1.8ms vsbaseline2.1/2.0ms; native-response/queued-effect waits dominate variable tails. These spans include scheduling, not SQLiteCPU; no painted-frame or floor claim. Wrapper exited2 after A2 because active script was edited; original log retained, reports validated and cache finalized separately without rerunning any timed work. Retain for proven scope allocation removal, proceed to fresh matched acceptance; all regressions remain in evidence.

Full15s verified30observations/66recomputed summaries/33verdicts/four control provenances/sixboots:11PASS/11PB/3CB/8FAIL,versus15q11PASS/10PB/3CB/9FAIL.22/33qualified,goalunmet. Same-session variance/control changes affect classification; no causal overall speedup claim. Post350lib/20tools/1harness/26e2e/librarybuild pass. Continue native attribution for remaining gaps. [Full outcome](../benchmarks/android-ladders-15s-2026-10-24.md).
