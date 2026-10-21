# ADR-0034: Seed retention preserves NgRx action and selector contracts

Status: Accepted. Date: 2026-10-21. Authority: Phase 13 device investigation.

Forced-GC Android snapshots identify two distinct 50k todo populations. The
submitted seed objects are reachable through ActionsSubject._value while Seed
Loaded is the last action, and through devtools liftedState -> ReplaySubject
._buffer -> actionsById -> PerformAction.action -> data.todos. The persisted
values are separately reachable through Store.selection -> viewState ->
todos.entities. Harness TodosEffects.observeAfterAdd$ subscribes to
selectOpenCount/selectTodoTotal, whose dependencies materialize/pin the entire
collection even though the visible list uses a 100-row page query.

After 30 small actions advance the configured maxAge=25 devtools history, the
production device snapshot drops from 100,101 todo-shaped objects to 50,101,
with only the selected-collection sample remaining. Heap drops from 36.82 MiB
to 15.82 MiB in this experiment. These are expected action/history/active-lease
retainers, not an idle transaction identity cache or bridge transport leak.
Do not mutate ActionsSubject's BehaviorSubject value, discard active selectors,
or change NgRx devtools history behavior in the library.

Keep exact write journals scoped to commit/refresh. Clear the engine journal in a
finally block after synchronous invalidation/callbacks; inactive entries adopt known node values directly without
keeping journals, and query row transport metadata belongs to its bounded
cache entry and participates in byte accounting. A --expose-gc spike proves a
50k payload, StoreTx and ChangeSet collect after a subsequent small action when
only a SQL count is subscribed and devtools is absent.

Proposed harness changes (not implemented): use SQL count selectors in
TodosEffects; exclude Seed Loaded from devtools via actionsBlocklist/predicate
(the installed NgRx reducer honors these before recording), and dispatch a
small completion action after a large seed so ActionsSubject advances. An
extension-only action sanitizer does not address all in-process retainers.
No harness, NgRx token, action-stream or on-disk-format change is authorized by
this decision. See docs/benchmarks/phase13-bridge-and-retention.md for evidence.
