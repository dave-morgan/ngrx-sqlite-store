# Phase 13: bridge floor and post-seed retention

Date: 2026-10-21. Android emulator-5554, sdk_gphone64_x86_64, API 35.
Baseline evidence: android-after-phase12-2026-10-21.md. Decisions: ADR-0033 and ADR-0034.

## Bridge calls

Acceptance tests count driver method invocations, with batch = 1 and subscribed
refresh included. The before values were observed in the initial failing tests;
internal sql.js last_insert_rowid calls are excluded from this comparison.

| Scenario                                     |                  Before |       After |                       Budget |
| -------------------------------------------- | ----------------------: | ----------: | ---------------------------: |
| Fresh subscribed ui object, set scalar child |                       5 |           1 |                            1 |
| Cold todo toggle, count subscribed           |                       6 |           3 |                            3 |
| Cached collection toggle, no query           |                       4 |           1 |                            2 |
| Cached collection toggle, count subscribed   | not separately captured |           2 |                            2 |
| Cached page row toggle, page subscribed      | not separately captured |           2 |                            2 |
| Fresh subscribed scalar leaf                 | not separately captured |           1 |                            1 |
| 50k setAll, collection subscribed            | not separately captured | <=278 total | <=1 per 900 bound parameters |

The 50k test forbids full collection read-back. Its 252 parameterized INSERT
statements (199 rows / 995 parameters each, last batch smaller) share one
executeSet call. DELETE RETURNING uses explicit transaction control; an empty
clear still counts that query/control work. Per-statement SQLite parameter
limits and all RowWriter UTF-8 caps remain enforced.

Native actual CapacitorSQLite invocations, measured by wrapping nativePromise:
ui benchmark tick = one executeSet(transaction=true), one statement. Repeated
ticks and theme changes succeed. The native harness toggle uses five calls:
one write batch, three subscribed query transports, and the effect's separate
ui write batch. This includes more subscriptions/actions than the isolated
acceptance budgets. No entity row is read to toggle an already cached row.

Web verification wraps jeep-sqlite.executeSet using defineProperty (Stencil's
method accessor cannot be instrumented by ordinary assignment). A benchmark
tick and theme toggle each use one atomic batch. Both native and web also
verify: a duplicate-key atomic batch rejects and leaves zero rows; explicit
begin + non-atomic batch reads its own row; rollback removes the row; the
plugin reports transaction-active=false afterward. No raw BEGIN/COMMIT SQL
is sent through Capacitor.

The managed environment could not download Gradle's distribution. Native
verification therefore used the already installed debug APK and its native
SQLite plugin, adb-pushed freshly built web assets into the app's private files,
and selected them with the built-in WebView.setServerBasePath API. This runs
the actual native bridge/SQLite backend. No harness source was edited.

## Device retainers

`node tools/heap-retainers.mjs --seed 50000` forces two GCs, writes a V8 snapshot,
counts constructor/property shapes, and traces strong edges from the GC root
to todo objects whose title contains #12345. It handles concatenated strings
and excludes weak edges. `--input` analyses saved snapshots without a device.
Raw snapshots live under tmp/phase13, not in the repository. Summarized shape
counts and complete sample paths are in phase13-retainers.json.

Two independent copies are retained:

1. Submitted seed: GC roots -> Window.__harness -> dispatch context -> Store
   -> ActionsSubject._value -> Seed Loaded.data.todos -> array[12344].
   Devtools also retains it: injector -> StoreDevtools.liftedState -> source
   ReplaySubject._buffer[0] -> actionsById -> PerformAction.action.data.todos.
2. Materialized collection: GC roots -> Window.__harness -> dispatch context
   -> Store.selection -> SqliteSelectionEngine.viewState.todos.entities.t12345.
   The harness TodosEffects.observeAfterAdd$ selects selectOpenCount and
   selectTodoTotal from full collection selectors. Those active dependencies
   pin all todos despite the page itself using SQL page/count selectors.

| Production snapshot                                       | Heap MiB after GC | Todo-shaped objects | #12345 samples |
| --------------------------------------------------------- | ----------------: | ------------------: | -------------: |
| Installed pre-phase13 APK, immediately after 50k seed     |             34.73 |              100101 |              2 |
| Phase13, immediately after 50k seed                       |             36.82 |              100101 |              2 |
| Phase13, after 30 small actions advance maxAge=25 history |             15.82 |               50101 |              1 |

A development snapshot makes the devtools path readable with full class names;
one subsequent tick still leaves its recorded seed action reachable. Thirty
ticks remove that seed payload from production history; the remaining sample
has only the selected-collection path above. This is not a claim that batching
reduces the immediate seed heap. GC/compilation state and build mode affect heap
sizes; the object populations and retainer paths establish the causes.

Transaction identity caches, exact-write journals, SQL transport buffers,
bridge strings and effects do not supply another surviving #12345 population
after history advances. Effects indirectly pin the materialized collection via
active selector leases, so it cannot be evicted by the inactive LRU budget.

The Node --expose-gc retention spike independently verifies the BehaviorSubject
contract, then collection of a 50k seed sample, StoreTx and ChangeSet after a
small action with only a count query subscribed. Storage tests also hold onto
ChangeSet and verify that its exact values/entity transport rows are released,
even if an afterCommit callback throws. Query transport rows are owned by the
bounded cache entry and included in inactive byte estimates.

Proposed harness mitigations, intentionally not implemented: replace effect
collection counts with SQL query counts; block Seed Loaded in devtools using
its recording predicate/actionsBlocklist; dispatch a small completion action
following seeding so ActionsSubject no longer holds the payload. Preserve the
original NgRx subjects, devtools behavior, and active-selector contract.

## Reproduction and validation

224 library tests pass. Both requested builds, the spike type check, native/web
transaction probes and the 13-test SQLite Playwright suite pass. The scale
spike measures one ui call, two cached-toggle calls including count refresh,
and zero entity rows read back at 1k, 10k and 50k.

- npx.cmd ng test ngrx-sqlite-store --watch=false
- npx.cmd ng build ngrx-sqlite-store
- npx.cmd ng build harness -c development,sqlite
- E2E_IMPL=sqlite npx.cmd playwright test --project=sqlite
- node tools/verify-native-batching.mjs --load
- node tools/verify-web-batching.mjs (fresh sqlite server on port 4303)
- node tools/heap-retainers.mjs --seed 50000 --output tmp/phase13/production-after.heapsnapshot
- node tools/heap-retainers.mjs --release-action 30 --output tmp/phase13/production-drained.heapsnapshot
- npm run spikes; spike TypeScript check with --noEmit

A fresh port-4303 run of the same 13 Playwright tests supplements the exact
requested command because port 4302 was already occupied by an existing server.
No git commit; projects/harness remains unchanged.
