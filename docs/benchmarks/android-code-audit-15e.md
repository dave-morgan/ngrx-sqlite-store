# Phase 15e startup code audit

Android production graphs; uncompressed emitted JS bytes. Initial means static imports; /todos-ready includes deferred app/config and the initial route. Native /todos-ready additionally includes the runtime plugin/core dynamic imports. Code bytes are not retained heap bytes.

| Graph | Before classic | Before sqlite | After classic | After sqlite |
| --- | ---: | ---: | ---: | ---: |
| initial | 310508 | 412353 | 308164 | 405014 |
| todosReady | 359383 | 461329 | 370542 | 467529 |
| nativeTodosReady | 359383 | 475394 | 370542 | 481592 |

| Library module before first-ready | Before bytes | After bytes | Why required |
| --- | ---: | ---: | --- |
| projects/ngrx-sqlite-store/entity/src/entity-adapter.ts | 5670 | 5654 | Dual-form adapter and query compilation for initial page/count and seed users/todos. |
| projects/ngrx-sqlite-store/entity/src/public-api.ts | 0 | 0 | Dual-form adapter and query compilation for initial page/count and seed users/todos. |
| projects/ngrx-sqlite-store/entity/src/query.ts | 7173 | 7152 | Dual-form adapter and query compilation for initial page/count and seed users/todos. |
| projects/ngrx-sqlite-store/src/lib/driver/batch-budget.ts | 285 | 284 | Native open/recovery, commit transport or byte budgets. |
| projects/ngrx-sqlite-store/src/lib/driver/capacitor-sqlite-driver.ts | 2619 | 2900 | Native open/recovery, commit transport or byte budgets. |
| projects/ngrx-sqlite-store/src/lib/driver/sql-driver.ts | 55 | 55 | Native open/recovery, commit transport or byte budgets. |
| projects/ngrx-sqlite-store/src/lib/reducer/entity-tx.ts | 11746 | 11711 | Bootstrap session reset, fresh seed reducers, returned partials and entity writes. |
| projects/ngrx-sqlite-store/src/lib/reducer/reducer.ts | 1421 | 1417 | Bootstrap session reset, fresh seed reducers, returned partials and entity writes. |
| projects/ngrx-sqlite-store/src/lib/reducer/router-snapshot.ts | 314 | 313 | Bootstrap session reset, fresh seed reducers, returned partials and entity writes. |
| projects/ngrx-sqlite-store/src/lib/reducer/store-tx.ts | 6310 | 6291 | Bootstrap session reset, fresh seed reducers, returned partials and entity writes. |
| projects/ngrx-sqlite-store/src/lib/schema/entity-brand.ts | 739 | 737 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/entity-order.ts | 99 | 99 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/entity-positions.ts | 529 | 527 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/errors.ts | 420 | 419 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/ids.ts | 318 | 317 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/meta.ts | 144 | 143 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/migrations.ts | 970 | 967 | Required for a fresh database before the fresh-seed first-ready metric. |
| projects/ngrx-sqlite-store/src/lib/schema/node-reader.ts | 3308 | 3299 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/node-store.ts | 280 | 279 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/node-writer.ts | 7566 | 7544 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/ordering.ts | 917 | 914 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/policy.ts | 1771 | 1766 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/positions.ts | 265 | 264 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/query-indexes.ts | 1512 | 1514 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/row-writer.ts | 8302 | 8277 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/size.ts | 1648 | 1643 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/schema/sort-key.ts | 482 | 481 | Synchronous dual-form entity adapter contract; classic form cannot import asynchronously. |
| projects/ngrx-sqlite-store/src/lib/schema/utf8.ts | 259 | 258 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |
| projects/ngrx-sqlite-store/src/lib/selectors/entity-refresh.ts | 2761 | 2753 | Initial page/count, small eager roots, router/foreign selector leases and publication. |
| projects/ngrx-sqlite-store/src/lib/selectors/metadata.ts | 874 | 872 | Initial page/count, small eager roots, router/foreign selector leases and publication. |
| projects/ngrx-sqlite-store/src/lib/selectors/path-cache.ts | 10487 | 10456 | Initial page/count, small eager roots, router/foreign selector leases and publication. |
| projects/ngrx-sqlite-store/src/lib/selectors/query-batch.ts | 2412 | 2405 | Initial page/count, small eager roots, router/foreign selector leases and publication. |
| projects/ngrx-sqlite-store/src/lib/selectors/query-refresh.ts | 1357 | 1353 | Initial page/count, small eager roots, router/foreign selector leases and publication. |
| projects/ngrx-sqlite-store/src/lib/selectors/query-selector.ts | 369 | 367 | Initial page/count, small eager roots, router/foreign selector leases and publication. |
| projects/ngrx-sqlite-store/src/lib/selectors/retained-size.ts | 696 | 694 | Initial page/count, small eager roots, router/foreign selector leases and publication. |
| projects/ngrx-sqlite-store/src/lib/selectors/selection-engine.ts | 6055 | 6037 | Initial page/count, small eager roots, router/foreign selector leases and publication. |
| projects/ngrx-sqlite-store/src/lib/selectors/selector-cleanup.ts | 682 | 680 | Initial page/count, small eager roots, router/foreign selector leases and publication. |
| projects/ngrx-sqlite-store/src/lib/selectors/selectors.ts | 667 | 665 | Initial page/count, small eager roots, router/foreign selector leases and publication. |
| projects/ngrx-sqlite-store/src/lib/selectors/view-state.ts | 2104 | 2098 | Initial page/count, small eager roots, router/foreign selector leases and publication. |
| projects/ngrx-sqlite-store/src/lib/storage/change-set.ts | 1607 | 1602 | Schema open, FIFO transactions, change journals and post-commit cache invalidation. |
| projects/ngrx-sqlite-store/src/lib/storage/committed-writes.ts | 521 | 520 | Schema open, FIFO transactions, change journals and post-commit cache invalidation. |
| projects/ngrx-sqlite-store/src/lib/storage/entity-changes.ts | 444 | 443 | Schema open, FIFO transactions, change journals and post-commit cache invalidation. |
| projects/ngrx-sqlite-store/src/lib/storage/path.ts | 538 | 536 | Schema open, FIFO transactions, change journals and post-commit cache invalidation. |
| projects/ngrx-sqlite-store/src/lib/storage/reference-changes.ts | 872 | 869 | Schema open, FIFO transactions, change journals and post-commit cache invalidation. |
| projects/ngrx-sqlite-store/src/lib/storage/storage-engine.ts | 4350 | 4550 | Schema open, FIFO transactions, change journals and post-commit cache invalidation. |
| projects/ngrx-sqlite-store/src/lib/storage/write-queue.ts | 294 | 293 | Schema open, FIFO transactions, change journals and post-commit cache invalidation. |
| projects/ngrx-sqlite-store/src/lib/store/core.ts | 8917 | 9261 | Original NgRx DI tokens, startup registration, dispatch, signals, router and effect ordering. |
| projects/ngrx-sqlite-store/src/lib/store/prewarm.ts | 0 | 1421 | Explicit early open/adoption and declared session reset in native main.ts. |
| projects/ngrx-sqlite-store/src/lib/store/provide.ts | 2376 | 3002 | Original NgRx DI tokens, startup registration, dispatch, signals, router and effect ordering. |
| projects/ngrx-sqlite-store/src/lib/store/reducer-manager.ts | 1069 | 1066 | Original NgRx DI tokens, startup registration, dispatch, signals, router and effect ordering. |
| projects/ngrx-sqlite-store/src/lib/store/scanned-actions-subject.ts | 542 | 540 | Original NgRx DI tokens, startup registration, dispatch, signals, router and effect ordering. |
| projects/ngrx-sqlite-store/src/lib/store/state.ts | 264 | 263 | Original NgRx DI tokens, startup registration, dispatch, signals, router and effect ordering. |
| projects/ngrx-sqlite-store/src/lib/store/store.ts | 1745 | 1740 | Original NgRx DI tokens, startup registration, dispatch, signals, router and effect ordering. |
| projects/ngrx-sqlite-store/src/lib/store/tokens.ts | 216 | 215 | Original NgRx DI tokens, startup registration, dispatch, signals, router and effect ordering. |
| projects/ngrx-sqlite-store/src/public-api.ts | 0 | 0 | Required schema read/write, validation, promotion/chunks, array positions or entity ordering during fresh seed and router writes. |

Optional modules are already absent from both initial graphs: sql.js, jeep-sqlite, the plugin web implementation, devtools and spikes. The native plugin index is a required dynamic runtime, not the optional web implementation.

The writer-module import split reduced the candidate static delta from 101,845 to 89,246 bytes, but 1k post-seed heap rose to 5.420 MiB and relaunch mean to 2,277 ms in its two-trial diagnostic. Fresh seed, router reset and router writes load that writer before readiness anyway. Reverted the split. No heap win is claimed for moving required work between bundles.

The final initial-JS sqlite-minus-classic delta is 96850 bytes, versus 101,845 before. The /todos-ready delta is 96987 versus 101,946 before. NSS module bytes increased by 2585 for the explicit prewarm/session protocol. Common app/config chunks defer together in both builds; required bytes remain charged in /todos-ready.

Synchronous error construction and sort-key encoding stay in required modules to preserve synchronous API behavior. materialize and purge are cold methods on required classes; splitting their containing modules would also delay required selectors/registration. Their bodies are not proof of eager retained state. The tiny migration bodies are required on fresh seed; importing them later would still load them before the measured post-seed heap. No additional optional module remains in the startup graph without a reason above.
