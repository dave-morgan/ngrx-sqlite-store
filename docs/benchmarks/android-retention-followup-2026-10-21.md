# Android retention follow-up after ADR-0035

The query-map fix is present in the running Android build. CDP inspection of
`PathCache.queryValues.toString()` confirms that it iterates supplied query
sources and looks up their ids individually.

On `https://localhost/todos?seed=50000`, live CDP inspection reports:

- `SqliteSelectionEngine.wholeSubscribers.size = 3`.
- Whole-feature references: todos=3, notes=3, router=3, users=5, ui=4.
- Additional todo references: todos/filter=1, todos/query=1, todos/userId=1.
- The `todos` cache entry is fresh, has refcount=6 and contains 50,000 ids.
- SQL count queries and the 100-row page are also subscribed separately.

The saved device snapshot `tmp/phase13/android.heapsnapshot` contains 50,101
todo-shaped objects. Its sample strong path is Window.__harness -> dispatch
closure -> Store.selection -> viewState.todos.entities.t12345. Snapshot analysis:
`node tools/heap-retainers.mjs --input tmp/phase13/android.heapsnapshot`.

The installed NgRx router-store source (`setUpStoreStateListener` and
`setUpRouterEventsListener`) accounts for three whole-store subscriptions:

1. `store.pipe(select(stateKey), withLatestFrom(store))` subscribes twice to Store.
2. `router.events.pipe(withLatestFrom(store))` subscribes once to Store.

`Store.source` calls `selection.pinAll()` for each subscription. These references
are active, so neither the byte budget nor memo cleanup can evict the collection.
The current harness source uses SQL count selectors in its header and effects;
the earlier ADR-0034 effect explanation does not explain this follow-up run.

This is a separate compatibility constraint from the evicted-query-map bug.
ADR-0018 requires whole-store subscriptions to pin registered features. NgRx
router-store also attaches the pre-navigation whole-store state to cancellation
and error actions. Silently changing all Store subscriptions to emit only loaded
paths would violate that contract and can alter cancellation payloads.

## Approved fix and device verification (ADR-0036)

The orchestrator approved loaded-path whole-store transport by default, with
`sqlite.wholeStore: 'pin-all'` preserving complete snapshots. The conventional
bridged `router` slice is automatically preloaded and pinned; custom state keys
use `sqlite.eager`. Cancel/error payloads carry loaded paths in the default mode.
ADR-0035 remains in place.

Rebuilt the production/sqlite web assets and Android debug APK, installed it on
`emulator-5554` without clearing app data, then ran:

```text
node tools/heap-retainers.mjs --seed 50000 --report tmp/p14-retainers.json
```

Forced-GC results: **101 todo-shaped objects**, down from **50,101**. The 50k
feature population and the sample retainer path to `#12345` are gone (`samples:
[]`). The bounded 100-row query page remains. Navigating to `/notes` and taking
another snapshot still reports 101 objects: the released page fits the inactive
LRU budget. Report: `tmp/p14-retainers-notes.json`.

All 232 library tests, the library build, and the development/sqlite harness build
pass. Regressions cover real router-store with query-only subscriptions and the
full harness subscription set, both transport modes, navigation/cancel/error,
loaded cancel/error payloads, eager/materialize, and persisted-route restoration
without explicit eager configuration. Harness source was not changed.
