# Getting the RAM win

`ngrx-sqlite-store` keeps state in SQLite. JS memory holds only what is **currently selected**, plus a small byte-budgeted cache (`sqlite.cacheBudgetBytes`, default 4 MB, ADR-0032). The rules below come from measuring the harness on Android (`docs/benchmarks/`).

## 1. Aggregate and list with query selectors, not `selectAll`
Any selector derived from `selectAll` or `selectEntities` materialises the **entire** collection and keeps it pinned while subscribed. That includes counts, filters, "find by id", and pages built in JS.

```ts
const q = todoAdapter.query(todosFeature.selectTodosState);
export const selectOpenCount = q.count({ done: false });               // SQL COUNT(*)
export const selectPage = (where: Where, limit: number) =>
  q.page({ where, offset: 0, limit });                                 // only `limit` rows in memory
export const selectTodo = (id: string) =>
  createSelector(q.page({ where: { id }, offset: 0, limit: 1 }), (r) => r[0] ?? null);
```

Query selectors also work on plain state, so `MockStore`, unit tests, and classic `@ngrx/store` keep working (ADR-0027).

## 2. Watch long-lived subscriptions
These hold their sources for the lifetime of the app:
- the header and other always-mounted components;
- `withLatestFrom(store.select(...))` in effects;
- `eager` features.

Keep them on query selectors or small paths. Avoid putting large features in `sqlite.eager`.

## 3. Don't let bulk payloads linger in action history
- **`ActionsSubject` is a `BehaviorSubject`** (NgRx contract). It keeps the **last dispatched action** alive. After a bulk load such as `loadSuccess({ items: 50_000 rows })`, dispatch a small follow-up action, for example `loadApplied()`. The payload can then be collected.
- **`@ngrx/store-devtools` keeps `maxAge` actions, payloads included.** `actionsBlocklist` only filters what is sent to the extension, not the recorded history. Provide devtools in dev builds only (`isDevMode() ? [provideStoreDevtools(...)] : []`).

Both apply to classic NgRx too. They only become visible with this store, because there the state no longer shares the payload's objects.

## 4. Prefer many small paths over one big object
Top-level feature properties are separate rows and separate sources. Selecting `todos/filter` loads only that value, while selecting the feature state loads everything. Use the per-property selectors from `createFeature`.

## 5. Session-only state
Use `sqlite.features[key].persist: false` for slices that shouldn't survive restarts (ADR-0030). The `router` slice already defaults to this.

## 6. Turn off Capacitor bridge logging
Capacitor's default `loggingBehavior: 'debug'` logs every bridge call with its full payload in debug builds. With devtools attached, those payloads are kept alive. Set `loggingBehavior: 'none'` (or `'production'`) in `capacitor.config.ts` (ADR-0045). On the harness at 50k this cut the JS heap from 14.5 MB to 5.5 MB and halved bridge latency.
