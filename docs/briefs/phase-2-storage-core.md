# Brief: Phase 2 — Storage core

Repo: `C:\Development\ngrx-sqlite-store`. Read `CLAUDE.md`, `docs/architecture.md` §2–§3 and §6 first. Library project: `projects/ngrx-sqlite-store` (Angular 22 library, ng-packagr; tests are Vitest via `npx ng test ngrx-sqlite-store --watch=false`).

## Scope
Build the SQLite driver abstraction, the serial write queue, transactions, and post-commit change notifications. **Do not** implement the schema engine (node/entity tables), Store, selectors, or reducers. Those come in later phases.

## Files to create (under `projects/ngrx-sqlite-store/src/lib/`)
1. `driver/sql-driver.ts`
   - `export type SqlValue = string | number | null | Uint8Array;`
   - `export type Row = Record<string, SqlValue>;`
   - `export interface SqlDriver { open(): Promise<void>; close(): Promise<void>; exec(sql: string): Promise<void>; run(sql: string, params?: SqlValue[]): Promise<{ changes: number; lastId?: number }>; query<R = Row>(sql: string, params?: SqlValue[]): Promise<R[]>; begin(): Promise<void>; commit(): Promise<void>; rollback(): Promise<void>; }`
   - `export const SQL_DRIVER = new InjectionToken<SqlDriver>('ngrx-sqlite-store SqlDriver');`
2. `driver/sqljs-driver.ts`: `SqlJsDriver implements SqlDriver` over `sql.js`. The constructor takes `{ sqlJs?: () => Promise<SqlJsStatic>; data?: Uint8Array; locateFile?: (f: string) => string }`. Use prepared statements (`db.prepare`, `bind`, `step`, `getAsObject`, `free`). `run` returns `db.getRowsModified()` and `last_insert_rowid()`. Add an `export(): Uint8Array` helper. It must work in Vitest under Node/jsdom. Make sure sql.js's WASM loads there; in Node the default `locateFile` should resolve `sql.js/dist/sql-wasm.wasm` from node_modules. If the Angular unit-test builder bundling breaks WASM resolution, provide a test helper `createTestDriver()` in `testing/test-driver.ts` that handles it, and document how.
3. `driver/capacitor-sqlite-driver.ts`: `CapacitorSqliteDriver implements SqlDriver` over `@capacitor-community/sqlite` 8.x (`SQLiteConnection`, `SQLiteDBConnection`, `CapacitorSQLite`). Options: `{ database: string; encrypted?: boolean; mode?: string; version?: number; readonly?: boolean }`. On web (`Capacitor.getPlatform() === 'web'`), call `sqlite.initWebStore()` before opening. Note that `jeep-sqlite` element setup is the app's job; document it in TSDoc. **Always pass `transaction: false`** to `run`/`query`/`execute`, because the store owns transactions through `beginTransaction`/`commitTransaction`/`rollbackTransaction`, or `BEGIN`/`COMMIT` via `execute(..., false)`. Check the installed plugin's `.d.ts` (`node_modules/@capacitor-community/sqlite/dist/esm/definitions.d.ts`) for exact signatures. On web, call `saveToStore` after commit. It cannot be unit-tested without a device, so keep it thin and typed. Mapping: `query` → `values` array of row objects.
4. `storage/path.ts`: path utilities (ADR-0004). `escapeSegment` (`~`→`~0`, `/`→`~1`), `unescapeSegment`, `joinPath(...segs)`, `splitPath(p)`, `parentPath(p)`, `isAncestorOrSelf(a, b)` and `pathsOverlap(a, b)` on **segment boundaries** (`todos` overlaps `todos/items`, not `todos2`), `subtreeRange(p)` returning `[p + '/', p + '0']` bounds for SQL range scans. Root path is `''`, and it overlaps everything.
5. `storage/change-set.ts`: `ChangeSet` records changed paths (dedupe, collapse descendants under recorded ancestors). Methods: `add(path)`, `paths(): readonly string[]`, `overlaps(path): boolean`, `isEmpty`, `merge(other)`.
6. `storage/write-queue.ts`: `WriteQueue`, a strict FIFO serial executor. `enqueue<T>(task: () => Promise<T>): Promise<T>`. Exactly one task runs at a time. A rejected task does not block later tasks. Expose `idle(): Promise<void>` (resolves when the queue drains) and `size`.
7. `storage/storage-engine.ts`: `StorageEngine` (an `@Injectable()` that also has a plain constructor usable in tests).
   - `constructor(driver: SqlDriver, options?: { migrations?: Migration[] })`
   - `open()`: opens the driver and runs **internal migrations** recorded in `nss_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)`, key `schema_version`. A migration is `{ version: number; up: (exec: SqlExecutor) => Promise<void> }`. Ship migration v1 as **only** the `nss_meta` table for now (the node/entity tables come in phase 3).
   - `transaction<T>(fn: (tx: TxContext) => Promise<T>): Promise<{ result: T; changes: ChangeSet }>`: enqueued on the WriteQueue. Runs `BEGIN` (`BEGIN IMMEDIATE`), then `fn`, then `COMMIT`. On throw it runs `ROLLBACK`, rethrows, and emits no notification. `TxContext` exposes `run`, `query`, `exec`, `changes: ChangeSet` (callers record paths via `tx.changes.add`), and `afterCommit(cb)`.
   - Post-commit: after `COMMIT` resolves, emit on `changes$: Observable<ChangeSet>` (RxJS `Subject`) **only if non-empty**, then run the `afterCommit` callbacks, then resolve the promise. Nothing is emitted before commit.
   - `read<T>(fn: (q: SqlExecutor) => Promise<T>): Promise<T>`: reads outside the queue are allowed, but document that they observe only committed data (SQLite single connection: reads during an open tx would see uncommitted data). **Therefore route reads through the queue as well** (enqueue them), unless a `concurrentReads` option is set. Keep it simple: enqueue them.
   - `status: Signal<'closed'|'opening'|'ready'|'error'>`, `close()`.
8. `index` exports: add the public items (driver interfaces, the two drivers, `SQL_DRIVER`, `StorageEngine`, `ChangeSet`, path utils marked `@internal` or exported from an internal barrel) to `src/public-api.ts`. Delete the generated placeholder component `ngrx-sqlite-store.ts` and its spec.

## Tests (Vitest, `*.spec.ts` next to the sources)
- path utils: escaping round-trip, overlap on segment boundaries, root overlap.
- ChangeSet: dedupe and ancestor collapse.
- WriteQueue: FIFO order under concurrent enqueues with random delays, failure isolation, `idle()`.
- SqlJsDriver: CRUD, params, `lastId`, begin/rollback.
- StorageEngine: migration idempotent (open twice on the same exported data); transactions serial (two overlapping `transaction()` calls never interleave; log entry/exit order); rollback on throw (data not visible, no `changes$` emission, queue continues); `changes$` emits after commit only (assert inside a subscriber that the data is queryable *and* that the emission happens after COMMIT); `afterCommit` ordering.
- `peerDependencies` in `projects/ngrx-sqlite-store/package.json`: `@angular/core ^22`, `@ngrx/store ^22`, `rxjs ^7.5`, and optional `@capacitor-community/sqlite ^8`, `@capacitor/core ^8`, `sql.js ^1.15` (`peerDependenciesMeta` optional). Add `allowedNonPeerDependencies` if ng-packagr complains.

## Done when
- `npx ng test ngrx-sqlite-store --watch=false` passes and `npx ng build ngrx-sqlite-store` succeeds.
- `CLAUDE.md`: tick phase 2 and add a 3–5 line note on anything non-obvious, such as how WASM loads in tests.
- Update `docs/architecture.md` §2 if the driver interface changed.
- Commit using a Conventional Commit message ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (git user is already configured). No push.
- Return a ≤15-line summary: files, test count, deviations, open issues.
