# Node/sql.js spikes (phases 8, 11 and 12)

From the workspace root, run `npm run spikes` (use `npm.cmd` in PowerShell if its script policy blocks npm.ps1). No library build is required. The runner bundles the TypeScript entry with esbuild into ignored `tmp/spikes/main.mjs`, leaving installed packages external, then executes Node. Its source alias points at the actual library source, so Q1 uses the real entity adapter rather than a copied algorithm. Angular compiler is loaded for NgRx JIT metadata; production mode disables dev freezing. No harness files are involved.

The runner first measures scale in fresh Node processes with `--expose-gc`, then
bridgeCost using the shared acceptance workload, followed by Q1, Q2 and Q3. Scale
regenerates `docs/spikes/scale.md` against preserved `scale-baseline.json`, asserts
all five 50k targets, and includes profiling evidence from `scale-profile.md`.
`SCALE_LATENCY_MS` configures the LatencyDriver (default 3 ms per statement).
Windows timers round that delay up to about 15.6 ms, so this Node-only driver uses
an async turn followed by a measured monotonic CPU wait. Profiles isolate that
known delay from library work. Full-dispatch statements include BEGIN/COMMIT and
sql.js's internal last_insert_rowid; refresh counts and transported rows are
reported separately. Classic uses real NgRx with identical subscriptions/data.

`node projects/ngrx-sqlite-store/spikes/run.mjs --scale-only --profile` runs only
scale and writes a 50k worker CPU profile under ignored tmp/spikes. Add `--heap`
for loaded/released snapshots. `SCALE_CAPTURE_BASELINE=1` is only for a bundle
against the original pre-phase-12 source; ordinary runs never change the baseline.

The remaining reports are `bridge-cost.md`, `q1.md`, `q2.md`, `q3.md`, with
environment, methods, five-run medians, statement counts and conclusions. The
runner asserts ordering, exact round trips, hidden-id preservation and absence
of rename orphans. Errors or a total runtime >=600 seconds produce nonzero exit.
Keep other CPU-heavy jobs idle while collecting numbers. No harness edits occur.

Each operation has one warm-up and five timed runs against the same fixture using BEGIN/ROLLBACK outside the measured interval. Writes use the actual RowWriter; B adds a spike-only RowWriter subclass for the reserved sortkey metadata. SQL counts include SqlJsDriver.run's internal last_insert_rowid query. Counters reset after setup. Bytes in Q2 count UTF-8 INSERT/UPDATE string bindings (including path metadata), not disk-page writes. Row rewrite counts include deletes plus inserts/updates. SQL timings include WASM row decoding; Q3 separately replays captured rows through the real assembler without database access. See each report for fixture limits and comparison caveats.

Q3 runs a depth/breadth matrix, plus five seeded property cases with exactly 100,000 stored nodes at depth 12. It checks both readers and a reference-preserving array swap for every seed. A fully promoted policy makes pointer/path costs explicit. The object rename matrix measures the actual remove-and-insert implementation; this is not an invented SQL rename shortcut.

Optional strict type check: `npx.cmd tsc -p projects/ngrx-sqlite-store/spikes/tsconfig.json`. esbuild transpiles without type checking. Spikes are explicitly excluded from tsconfig.lib.json and already outside its src-only include; no experimental API or index ships in the library.

These are in-memory Node/WASM comparisons. They do not establish Android bridge, disk, heap or p95 latency claims. Phase 9 must validate those separately. Q4 was resolved by ADR-0022 and is intentionally not rerun here.
