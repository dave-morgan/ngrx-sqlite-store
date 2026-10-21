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
