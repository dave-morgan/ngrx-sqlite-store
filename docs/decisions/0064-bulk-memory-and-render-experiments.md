# ADR-0064: Measured bulk reclamation and rejected scheduling experiments

Status: Accepted, 2026-10-23.

After writes of at least 128 KiB encoded payload, the writable Android driver
checkpoints/truncates WAL and requests SQLite allocator reclamation, after the
commit and inside the engine FIFO before notifications. Small actions do no
extra work. Web, iOS and readonly connections do not run these pragmas. A busy
checkpoint cannot invalidate a commit. Maintenance failures are logged and
cannot suppress commit notifications or roll back durable data. Row writes
continue through RowWriter; durability and transaction atomicity are unchanged.

| Size | Checkpoint latency | PSS recovered | Shrink latency | Additional PSS recovered | Combined |
| --- | --- | --- | --- | --- | --- |
| 1k | 17.333 ms | 1.787 MiB | 3.833 ms | 0.944 MiB | 21.167 ms / 2.731 MiB |
| 10k | 21.600 ms | 4.634 MiB | 4.733 ms | 2.150 MiB | 26.333 ms / 6.784 MiB |

Retain both operations: three direct samples per size demonstrate memory
recovery at a bounded latency cost. The first 10k checkpoint cost 56.5 ms;
later ones cost 4.2/4.1 ms. Allocations may refill before later measurements.
A 512 KiB cache after shrink adds about 3.3 ms without meaningful additional
instantaneous recovery, so reject it. The tested 16 MiB bulk cache and index
rebuild combinations do not establish a throughput win and are also rejected.
No permanent cache change, forced native GC or new PSS allowance is introduced.
Final absolute post-seed PSS improves 241.301 / 250.951 -> 239.284 / 248.160
MiB at 1k/10k, but relative excess is 13.852 / 16.676 MiB; parity remains open.

Also retain the original NgRx frozen-child recursion guard to avoid duplicate
action traversal: sampled recursive freeze CPU 97.909 -> 43.614 ms. Freeze still
protects nested unfrozen objects and direct ActionsSubject calls. Regression
tests assert a single nested getter traversal and mutation rejection.

Reject the effect-task yield. It moved synchronous ScannedActions follow-up
preparation beyond the first DOM update in five diagnostic profiles, but the
two-trial p50/p95 results (1k 28.25/68.55, 10k 20.00/70.75 ms) did not show a
repeatable joint win against baseline 25.00/68.82 and 25.38/62.94 ms. The final
source retains original action ordering. A deferred NodeWriter module likewise
reduced static bytes but worsened 1k heap/startup (5.420 MiB/2277 ms) and was
reverted. No mutable selector page, timer, forced tick or notification-order
change remains.

[Experiment evidence](../benchmarks/android-parity-15e-evidence-2026-10-23.md)
links every raw probe and CPU trace; [ADR-0065](0065-phase15e-measured-outcomes.md)
records final acceptance, uncovered gaps and follow-up. Engine tests verify
threshold behavior, commit-before-maintenance, no work for small actions and
notification/durability after maintenance failure. Driver tests cover platform
and readonly exclusions.
