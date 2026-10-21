# Phase 12 scale

Node v26.5.1; sql.js 1.15.1; SQLite 3.54.0; win32/x64; AMD Ryzen 5 3600 6-Core Processor              ; 31.9 GiB RAM. Production mode (no dev freezing). In-memory WASM; no disk or Capacitor bridge.

LatencyDriver uses an asynchronous turn followed by a monotonic CPU wait (Windows setTimeout/Atomics.wait measured 15.5 ms for a requested 3 ms). The wait is isolated as delay in CPU profiles. Configurable requested delay: 3 ms per statement; complete dispatch through selector emission. Five-run medians after warm-up. Post-commit time measured separately at zero latency (includes SQL refresh). Heap deltas use two forced GCs after an event-loop turn, against each initialized empty store after a 100-row setup warm-up and clear. Every implementation/size runs in a fresh process; classic and SQLite both subscribe to selectAll, count and ui. Seed actions and instrumentation SQL strings are released before GC. After list release, count and ui remain mounted; no manual selector.release() is used. SQL counts include BEGIN/COMMIT and last_insert_rowid; refresh counts exclude writes/transaction control.

| N | toggle before ms | after ms | classic ms | target ms | ui before ms | after ms | post-commit before ms | after ms |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1000 | 41.274 | 24.801 | 0.447 | 13.469 | 19.709 | 19.751 | 0.694 | 0.410 |
| 10000 | 190.263 | 43.109 | 6.139 | 70.388 | 27.252 | 19.396 | 8.763 | 0.372 |
| 50000 | 975.174 | 128.995 | 37.793 | 386.935 | 87.858 | 19.261 | 64.686 | 0.347 |

| N | toggle statements before/after | refresh before/after | entity rows before/after | ui statements | todos statements on ui | classic MiB | store before MiB | after MiB | released before MiB | after MiB |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1000 | 7/7 | 3/3 | 1000/1 | 6 | 0 | 0.15 | 0.57 | 0.30 | 0.89 | 0.54 |
| 10000 | 7/7 | 3/3 | 10000/1 | 6 | 0 | 1.70 | 4.56 | 1.72 | 6.30 | 1.96 |
| 50000 | 7/7 | 3/3 | 50000/1 | 6 | 0 | 8.72 | 23.82 | 9.28 | 28.83 | 0.36 |

At 50k the compact position buffer uses another 0.38 MiB outside heapUsed; including it still meets the 1.2x classic bound. Negative released deltas reflect GC/JIT noise around the empty-store baseline. The targets apply to N=50k; full-dispatch counts include four write/control statements in addition to the three refresh reads.

## Profiling and reproduction evidence

The problem was reproduced and CPU-profiled before production edits. That first
50k run measured toggle 1312.361 ms, ui 136.790 ms and post-commit 84.182 ms.
After finding an adapter selector leak that contaminated sequential heap
baselines, the final workload isolates every implementation/size in a fresh
process. Its matched before tables were recaptured from unchanged source at
`96c320b01fb7991ad275381471075ef3bbd4e170`, copied with `git show HEAD:<path>`
into ignored `tmp/phase12-baseline`; no working library files were reverted.
The same final scale spike and alias were bundled against that copy. A 100-row
setup warm-up, clear, GC, subscriptions, seed-action release and SQL-trace release
are identical before/after. Baseline numbers are preserved in scale-baseline.json.

`node projects/ngrx-sqlite-store/spikes/run.mjs --scale-only --profile`
produces a 50k SQLite worker CPU profile under tmp/spikes. `--heap` also writes
loaded/released V8 snapshots. Aggregate self-time samples from the matched 50k
worker profiles (whole worker, including setup and all timed repetitions):

| Function | Before self ms | After self ms |
| --- | ---: | ---: |
| freezeTree | 2053.007 | 16.695 |
| share | 1498.906 | 90.172 |
| assemble | 582.114 | 59.040 |
| refreshEntities | 0 | 160.448 |

The profile and traced transport identify the work, rather than inferring it
from elapsed time: full assemble/row decode and reconciliation on every toggle;
freezeTree called again from share's identical-reference branch during cache and
compatibility-view publication. Regression spies on Object.keys/Object.values
prove unchanged loaded subtrees are no longer enumerated; source/projector spies
prove unchanged static sources are not reevaluated. Remaining toggle work is the
permitted shallow dictionary copy, selectAll projection, and SQL count query.

Heap retaining paths exposed `scoped selectAll -> relative selectEntities ->
lastResult` holding an evicted dictionary, then two 2 MiB WeakMap backing tables
even after all entity objects died. Releasing the full memo graph, bounding size
memoization, removing duplicate/per-object metadata and packing the position
index eliminate that retention. The released snapshot contains no todo objects.

The trie decision was separately reproduced with the old ChangeSet insertion
loop: 1k 15.7 ms, 5k 314.7 ms, 10k 801.4 ms; a 50k acceptance run stalled until
interrupted. The same 50k regression now completes with the full library suite.
All artifacts are local Node/sql.js evidence; Android must be rerun separately.
