# ngrx-sqlite-store — state file (hard-linked to AGENTS.md)

SQLite-backed replacement for @ngrx/store (Capacitor/Android). Design: `docs/` (start `docs/architecture.md`, `docs/open-questions.md`, `docs/decisions/`).

## Workspace
- Angular 22.2 CLI workspace. Library `projects/ngrx-sqlite-store` (ng-packagr, `/entity` available, `/testing` planned). Harness app `projects/harness` (Angular 22 + Capacitor Android).
- NgRx 22.0.1, @capacitor-community/sqlite 8.1.1, jeep-sqlite 2.8, sql.js 1.15 (test driver), TS 6.0, Vitest via `@angular/build:unit-test`.
- Tests: `npx ng test ngrx-sqlite-store --watch=false`. Build: `npx ng build ngrx-sqlite-store`.

## Rules for agents
- Docs first: update `docs/` when design changes; resolved open question → new ADR in `docs/decisions/`.
- Implementations bind to ORIGINAL `@ngrx/store` DI tokens (ADR-0010). `@ngrx/store` is a peer dep.
- All row writes through `RowWriter` (1 MB UTF-8 cap, ADR-0008).
- Agent has authority to decide (incl. API/schema) — log every decision in `docs/decisions/README.md` (register) + ADR. Only hard rule: stay compatible with other NgRx libs (effects, router-store, devtools, Store consumers). Exception: `@ngrx/entity` is folded in and may diverge.

## Progress
- [x] Phase 1 docs
- [x] Phase 2 storage core (driver abstraction, serial write queue, tx, post-commit notifications)
- [x] Phase 3 schema engine (v2 migration, range/CTE reads, capped full/diff writes, entities)
- [x] Phase 4 store contract
- [x] Phase 4a store write side and DI (ADR-0017)
- [x] Phase 4b selector read side (ADR-0018/0020/0021)
- [x] Phase 5 selectors
- [x] Phase 6 entity (ADR-0019 dual-form adapter and `/entity` entry point)
- [x] Phase 7 compat tests + harness e2e
- [x] Phase 8 spikes Q1/Q2/Q3/Q4
- [x] Phase 9 Android benchmarks (baseline recorded; re-run after phase 12) (tools/android-bench.mjs)
- [x] Phase 10 query selectors (ADR-0027) + entity sortKey (ADR-0024); brief docs/briefs/phase-10-query-and-sortkey.md
- [x] Phase 11 bridge cost (statement budgets); brief docs/briefs/phase-11-bridge-cost.md
- [x] Phase 12 scale (refresh granularity, per-commit work, memory); brief docs/briefs/phase-12-scale.md; baseline docs/benchmarks/android-baseline-2026-10-21.md
- [x] Phase 13 bridge floor + retention; brief docs/briefs/phase-13-bridge-floor-and-retention.md
- [x] Phase 14 query refresh (change-aware invalidation, batched refresh); brief docs/briefs/phase-14-query-refresh.md

## Harness (orchestrator-owned; agents don't touch unless briefed)
- `projects/harness`: README there. Aliases `@store`, `@store/entity`, `@impl` per build config (`-c classic|sqlite`). Shared code in `src/app/state`, pages in `src/app/pages`; only reducers differ (`store-impl/{classic,sqlite}`).
- Status (2026-10-22, HEAD 43a1704): 256 lib tests; e2e 26/26 (13 classic + 13 sqlite, `npx playwright test`); 1 harness unit test.
- sqlite harness lists/details/counts use query selectors (`@impl` visibleTodos/todoById/count); devtools dev-only; Seed Applied releases bulk payload (docs/guides/ram.md).
- Android: `android/` (Capacitor 8). Gradle needs JDK 21: `JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`. Emulator `Pixel_9_Pro` (headless). Bench: `node tools/android-bench.mjs [--impl] [--sizes] [--runs] [--skip-build]`; heap retainers: `node tools/heap-retainers.mjs --seed N`. Capacitor WebView drops query strings on reload → seed size via localStorage `harness:seed`. Emulator degrades over long sessions: reboot before benchmarking.
- Latest numbers: docs/benchmarks/android-after-phase14-2026-10-22.md.

## Codex handoff (Windows)
- Launch directly: `node <codex plugin>/scripts/codex-companion.mjs task --background --write --fresh --model gpt-6.1-sol "<ONE-LINE prompt>"` — cmd truncates multi-line prompts at the first newline. Codex sandbox can't write `.git`: orchestrator commits. Monitor `jobs/<id>.json` status + `.log` for `usage limit|rate.?limit|at capacity|insufficient_quota`.
- AGENTS.md must stay a hard link to CLAUDE.md (git operations can break it: `cmd /c mklink /H AGENTS.md CLAUDE.md`).

## Blocking / awaiting user
- None.

## Next steps
- Q17: cap post-bulk-write app-process memory (+68 MB after 50k seed in-session) — chunk executeSet payloads.
- Real-device (non-emulator) benchmark; iOS not yet attempted.
- Packaging: publishable build of `ngrx-sqlite-store` + verify Q15 (`@ngrx/store` path alias with prebuilt lib in node_modules).

## Phase 8 spike findings
- `npm run spikes` bundles source with esbuild and runs Node/sql.js; code is in `projects/ngrx-sqlite-store/spikes`, excluded from the library build. Results: `docs/spikes/q1.md`, `q2.md`, `q3.md` (five-run medians and SQL counts).
- Final run: 106.39 seconds; 164 library tests, library build and strict spike type check pass. No library behavior changes or harness edits.
- Q1: 50k sorted insert 589.309 ms / 20 SQL vs sort-key prototype 0.285 ms / 5 SQL; declarative sortKey remains Proposed (ADR-0024).
- Q2: retain configurable 16 KiB provisionally; tiny hot leaves benefit from 2-8 KiB/hints. Existing changed-write demotion stays (ADR-0025).
- Q3: range/CTE matrix covers every depth 2-12 and breadth 10-10k. Five seeded 100k-node depth-12 round trips pass; swaps update one row, while a 10,011-row subtree rename rewrites 20,022 rows. Retain hidden array ids and range reads (ADR-0026).

## Storage core notes
- Tests load sql.js through Node's native createRequire and resolve its WASM from node_modules; no copied WASM or test helper is needed.
- Capacitor 8 query has no transaction flag; run/execute pass false, and web commits call saveToStore (apps set up jeep-sqlite).
- Reads, writes, open and close share a FIFO queue; use the supplied executor inside callbacks to avoid nested queue waits.
- DEADLOCK RULE: `changes$` emits and `afterCommit` runs INSIDE the queue task. Never await `engine.read/transaction` there; phase 4 must trigger selector re-queries + ScannedActions emission outside the task (after `transaction()` resolves).
- Extra migrations via `STORAGE_ENGINE_OPTIONS` token or constructor `{ migrations }`.
- Internal migration v1 creates only nss_meta. Post-commit callback failures reject after commit and cannot undo persisted data.

## Schema engine notes
- Register `SCHEMA_MIGRATIONS` via StorageEngine `{ migrations }` or `STORAGE_ENGINE_OPTIONS`; v2 adds the approved v1-format schema tables.
- `NodeStore` takes the supplied executor and ChangeSet; it never nests engine queue operations.
- All schema mutations pass through RowWriter; inserts batch at 999 parameters and every value is UTF-8 capped.
- Reads attach WeakMap metadata and freeze recursively in dev mode. Diff inputs must preserve immutable references; entity replacements must retain the brand or use an entity hint.
- Object children use pos too. Arrays/entities retain LIS positions and renormalise when gaps fall below 1e-9.
- Oversized entity data uses `data = ''` and promoted nodes at `coll/~2<escaped typed id>` (ADR-0016).
- Windows PowerShell may block npx.ps1; use npx.cmd for the same npm CLI commands.

## Store write-side notes
- Store, State and ReducerManager bind to the original NgRx tokens. ActionsSubject is unchanged; ScannedActionsSubject uses the guarded NSS subclass (ADR-0022). Bootstrap seeds versioned features before releasing INIT and buffered actions.
- Each action runs every feature handler in one transaction. Commit, awaited refresh and scanned emission finish before the next transaction (ADR-0023), outside the engine FIFO. dispatchAsync rejects reducer failures; plain dispatch reports nssReducerError and continues.
- StoreTx shares an identity cache across features. Writes drop overlapping cached ancestors/descendants and reload containers to preserve hidden array IDs. Unknown paths under inline nodes resolve through the owning container.
- Removing/destroying features keeps their data. purgeFeature deletes the subtree and version marker; settle includes purge work, refresh hooks and the engine queue.
- Foreign reducers with undefined initial state (routerReducer) seed only their version marker; reset/reseed deletes their subtree. Default router-store snapshots are converted to JSON before persistence (ADR-0020).
- Phase 7 verifies effects (including concatLatestFrom), lazy/NgModule providers, router timings/serializers/cancel/error/overlap, devtools, MockStore and runtime checks. 164 library tests and both required builds pass.
- Devtools is display-only and may lag one action; monitor actions cannot mutate SQLite. Services consume State directly; the root provider resolves StateObservable only to activate NgRx devtools. createFeature reads tx metadata without synchronous reducer calls.
- INIT/UPDATE/ROOT_EFFECTS_INIT delivery captures the original subscriber audience (RxJS 7 observers). Whole-store transport defers transient/superseded router views until the latest navigation terminates; normal selectors/effects retain intermediate commits (ADR-0023).
- Phase 4b hooks: internal ɵSELECTION_ENGINE, ɵCOMMITTED_CACHE, and multi ɵPOST_COMMIT_HOOK. Selector helpers wrap NgRx with hidden metadata and exact typings.

## Selector notes
- PathCache marks stale entries synchronously in changes$; committed peek excludes stale data. Refresh reads run after transaction resolution and preserve untouched siblings.
- Fresh cached dependencies emit synchronously on subscribe. Unloaded select waits; selectSignal starts from initial defaults and honors equal. Signal leases follow the caller's injection context, or store lifetime outside a context.
- Whole-store subscriptions pin registered features; materialize() reads all features. sqlite.eager preloads and pins names; sqlite.lruSize defaults to 32 inactive entries.
- Foreign selectors track feature accesses on each evaluation; new conditional branches load before ScannedActions. Logical array indices cache their physical owning container.
- StoreTx adds transient reference-replacement hints so equal-content immutable replacements retain NgRx projector-count behavior (ADR-0021). No schema change.
