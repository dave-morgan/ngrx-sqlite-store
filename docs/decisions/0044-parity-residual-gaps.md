# ADR-0044: Retain measured parity failures after Phase 15 optimization

Status: Accepted as an evidenced gap, not statistical acceptance. Date: 2026-10-22.
Authority: Phase 15 brief and ADR-0038 §2; user permits remaining FAILs explained in an ADR.

## Decision

Keep all 24 remaining FAIL verdicts in the final five-trial report. Do not
increase minimum calls, count observed redundant bytes as necessary bytes, add
timing allowances to memory, or substitute diagnostic samples for acceptance
trials. Phase 15 implementation is complete under the explicitly permitted ADR
exception; the universal parity goal remains unmet. The emulator establishes
these gaps, not a universal lower bound on SQLite performance.

The [final report](../benchmarks/android-parity-2026-10-22.md) and its JSON
sidecar contain 30 independent process trials and all 33 acceptance rows.
ADRs 0039–0043 describe the implemented optimizations and regression coverage.

## Seed and relaunch latency

First-ready still includes persistent row construction, JSON transport and SQL
insertion, whereas classic retains generated objects. In the controlled 50k
[seed trace](../benchmarks/android-seed-trace-50000-2026-10-22.json), generation
was 58.9 ms and reduction 5,591.2 ms. The trace including reset measured 46
executeSet calls, 10,404,954 option bytes and 3,640.4 ms in executeSet. CPU
sampling recorded 462.7 ms of GC and 129.5 ms self time in jsonInsertBatches;
native elapsed includes transport and SQL, so it is not native CPU time.
These observations identify work beyond echo latency. The preceding trace
used 54 calls and 12,527,529 executeSet bytes; reducing both helped but did not
achieve parity. Neither all observed calls nor all bytes are unavoidable.

Current-schema startup now skips three migration calls (ADR-0041). Relaunch
still opens the native store, restores persisted feature/query state and
processes boot/router effects before rendering. Its final excess is 608–810 ms,
well beyond the conservative two-call allowance. Final relaunched JS heaps
remain approximately 5 MiB at every size, while classic rises to 18.4 MiB:
restoring an entire collection is not the explanation. The size-independent
startup component and saved migration calls support startup-path attribution;
the exact allocation of the residual among SQLCipher open, feature bootstrap
and WebView scheduling has not been isolated. No hard bridge-floor claim is
made. Further native startup tracing or a different persistence protocol is
future work; relaxing bootstrap/notification ordering would breach compatibility.

## Emit and toggle latency

The [app journal probe](../benchmarks/android-app-journal-probe-2026-10-22.json)
measured emission means 16.434 ms with DELETE/NORMAL, 12.776 ms with WAL/FULL,
and 8.616 ms with WAL/NORMAL, returning to 16.401 ms after restoration.
ADR-0042 implements WAL with the existing synchronous level, verified against
the actual driver. Final emission p50 is 10.4–11.0 ms instead of the initial
14.9–15.3 ms. Native emission traces contain one atomic UPDATE executeSet, with
no read to eliminate. Its commit/SQL work exceeds an empty echo; this is evidence
of a remaining gap, not permission to redefine RTT or add extra minimum calls.

The [toggle trace](../benchmarks/android-toggle-trace-2026-10-22.json) records
entity commits of 12.3, 10.6 and 62.1 ms and DOM-change latencies of 28.9, 21.2
and 75.2 ms. A subsequent node commit persists the existing observeAfterAdd
effect's count observation. Both calls start before the observed DOM change,
but only the entity commit finishes before it. Therefore two calls cannot be
charged as a necessary serialized DOM critical path. DOM MutationObserver
timing is not paint timing and this three-sample diagnostic does not replace
the 30-toggle acceptance trials. The 50k toggle rows meet the one-call bound;
the 1k/10k rows do not. Rendering/scheduling and actual SQL commit costs remain
in those measured gaps. Skipping commits or scanning effects before committed
state would violate the store contract.

## Memory and Q17

Q17's unbounded transport allocation is fixed, separately from statistical
parity. App peak PSS fell from 195.7 to 142.5 MiB; peak Java heap from 69.2 to
18.3 MiB. The final 50k profile after GC measured app PSS 132.8 MiB and device
PSS 249.4 MiB. The original allocation was also reclaimable with explicit GC;
the initial assumption that it survives GC until process exit was disproved.
See ADR-0039 and the before/final profile JSON files.

The acceptance run does not force app GC before PSS sampling. Its mean
app/renderer PSS is 136.165/104.629 MiB at 1k, 158.008/107.151 at 10k and
131.004/115.677 at 50k. Classic is respectively 125.421/98.225,
125.681/104.310 and 125.732/116.993. The non-monotonic app component and the
profile's explicit-GC reduction are evidence of allocation/collection effects,
not retained Todo objects proportional to size. Device PSS at 50k still misses
strict acceptance by 2.714 MiB beyond classic SD; Q17 resolution does not turn
that row into PASS.

Small-data JS excesses are 0.238–1.247 MiB (plus 0.446 MiB on 1k relaunch).
The library carries its selection caches, transaction/journal machinery and
driver integration; the measurements establish fixed-overhead tradeoffs, not
a precise retained-object attribution. At 50k all three JS heaps pass, and
relaunch device PSS passes at every size. Removing those mechanisms without
replacement would sacrifice the asynchronous committed-state contract. Heap
retainer/native allocation attribution is still needed before any further
specific memory optimization can be justified.

## Remaining failures

The table below is generated from full-precision final observations. Excess is
SQLite mean minus classic mean; allowance is ADR-0038's full permitted
allowance (classic SD alone for memory). Units are ms or MiB as in the report.
