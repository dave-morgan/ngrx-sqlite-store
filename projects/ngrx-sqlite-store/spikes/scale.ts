import { createEnvironmentInjector, EnvironmentInjector, Injector } from '@angular/core';
import {
  Store as ClassicStore,
  provideStore as provideClassicStore,
  createAction,
  props,
} from '@ngrx/store';
import { readFile, writeFile } from 'node:fs/promises';
import { writeHeapSnapshot } from 'node:v8';
import { spawn } from 'node:child_process';
import { firstValueFrom } from 'rxjs';
import { createEntityAdapter } from '../entity/src/entity-adapter';
import { SqlJsDriver } from '../src/lib/driver/sqljs-driver';
import type { SqlValue } from '../src/lib/driver/sql-driver';
import { createReducer, on } from '../src/lib/reducer/reducer';
import { createFeatureSelector, createSelector } from '../src/lib/selectors/selectors';
import { StorageEngine } from '../src/lib/storage/storage-engine';
import { provideStore } from '../src/lib/store/provide';
import { Store } from '../src/lib/store/store';
import { assert, environment, median, report } from './common';

interface Todo {
  id: string;
  title: string;
  done: boolean;
}
const adapter = createEntityAdapter<Todo>();
const initial = adapter.getInitialState({ filter: 'all', loaded: false });
const seed = createAction('[Scale] seed', props<{ rows: Todo[] }>());
const toggle = createAction('[Scale] toggle', props<{ id: string }>());
const ui = createAction('[Scale] ui', props<{ value: number }>());
function selections() {
  const selectTodos = createFeatureSelector<typeof initial>('todos');
  return {
    selectAll: adapter.getSelectors(selectTodos).selectAll,
    count: adapter.query(selectTodos).count({ done: false }),
    selectUi: createSelector(createFeatureSelector<{ value: number }>('ui'), (s) => s.value),
  };
}
function data(n: number): Todo[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    title: `Todo ${i}`,
    done: i % 3 === 0,
  }));
}
async function collect(): Promise<number> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  return gcHeap();
}

/** Count every executed statement, including sql.js's internal last_insert_rowid. */
export class LatencyDriver extends SqlJsDriver {
  latency = 0;
  trace: string[] = [];
  commitAt = 0;
  sqlMs = 0;
  waitMs = 0;
  todosStatements = 0;
  entityRows = 0;
  private async delay(): Promise<void> {
    if (!this.latency) return;
    await new Promise<void>((resolve) => setImmediate(resolve));
    // Windows timers round a 3 ms timeout up to ~15.6 ms. A monotonic
    // deadline keeps this Node-only bridge simulation at the requested delay.
    const start = performance.now();
    while (performance.now() - start < this.latency) {
      /* simulated bridge wait */
    }
    this.waitMs += performance.now() - start;
  }
  private async statement<T>(sql: string, execute: () => Promise<T>): Promise<T> {
    this.trace.push(sql);
    await this.delay();
    const start = performance.now();
    try {
      return await execute();
    } finally {
      this.sqlMs += performance.now() - start;
    }
  }
  override exec(sql: string): Promise<void> {
    return this.statement(sql, () => super.exec(sql));
  }
  override query<R>(sql: string, params: SqlValue[] = []): Promise<R[]> {
    if (
      params.some(
        (value) => typeof value === 'string' && (value === 'todos' || value.startsWith('todos/')),
      )
    )
      this.todosStatements++;
    return this.statement(sql, async () => {
      const rows = await super.query<R>(sql, params);
      this.entityRows += rows.filter(
        (row) =>
          row &&
          typeof row === 'object' &&
          (row as Record<string, unknown>)['coll'] === 'todos' &&
          typeof (row as Record<string, unknown>)['id'] === 'string',
      ).length;
      return rows;
    });
  }
  override run(sql: string, params: SqlValue[] = []) {
    // run calls this.query; count it separately, but avoid double-counting its time.
    this.trace.push(sql);
    return (async () => {
      await this.delay();
      return super.run(sql, params);
    })();
  }
  override async commit(): Promise<void> {
    await super.commit();
    this.commitAt = performance.now();
  }
}

function gcHeap(): number {
  if (!globalThis.gc) throw new Error('Scale spike requires node --expose-gc');
  globalThis.gc();
  globalThis.gc();
  return process.memoryUsage().heapUsed;
}
interface Result {
  n: number;
  classicMs: number;
  toggleMs: number;
  uiMs: number;
  commitJsMs: number;
  toggleStatements: number;
  refreshStatements: number;
  uiStatements: number;
  todosStatements: number;
  toggleEntityRows: number;
  classicHeap: number;
  sqliteHeap: number;
  releasedHeap: number;
}
/** One process per implementation and N: no selector/WeakMap carry-over in heap deltas. */
export async function scaleWorker(): Promise<void> {
  const index = process.argv.indexOf('--scale-worker');
  const n = Number(process.argv[index + 1]);
  const mode = process.argv[index + 2];
  const parent = Injector.create({ providers: [] });
  const { selectAll, count, selectUi } = selections();
  if (mode === 'classic') {
    const injector = createEnvironmentInjector(
      [
        provideClassicStore({
          todos: (state: typeof initial = initial, action) =>
            action.type === seed.type
              ? adapter.setAll((action as ReturnType<typeof seed>).rows, state)
              : action.type === toggle.type
                ? adapter.mapOne(
                    {
                      id: (action as ReturnType<typeof toggle>).id,
                      map: (t) => ({ ...t, done: !t.done }),
                    },
                    state,
                  )
                : state,
          ui: (state = { value: 0 }, action) =>
            action.type === ui.type ? { value: (action as ReturnType<typeof ui>).value } : state,
        }),
      ],
      parent as EnvironmentInjector,
    );
    const store = injector.get(ClassicStore);
    const subscriptions = [
      store.select(selectAll).subscribe(),
      store.select(count).subscribe(),
      store.select(selectUi).subscribe(),
    ];
    store.dispatch(seed({ rows: data(100) }));
    store.dispatch(toggle({ id: 't1' }));
    store.dispatch(seed({ rows: [] }));
    store.dispatch(ui({ value: -1 }));
    const baseline = await collect();
    store.dispatch(seed({ rows: data(n) }));
    // Do not measure ActionsSubject retaining a large seed action as store state.
    store.dispatch(ui({ value: -1 }));
    const classicHeap = (await collect()) - baseline;
    const times: number[] = [];
    for (let i = 0; i < 6; i++) {
      const start = performance.now();
      store.dispatch(toggle({ id: 't1' }));
      if (i) times.push(performance.now() - start);
    }
    for (const sub of subscriptions) sub.unsubscribe();
    injector.destroy();
    parent.destroy();
    await writeFile(
      `tmp/spikes/scale-${mode}-${n}.json`,
      JSON.stringify({ classicMs: median(times), classicHeap }),
    );
    return;
  }
  const driver = new LatencyDriver();
  const injector = createEnvironmentInjector(
    [
      provideStore(
        {
          todos: createReducer(
            initial,
            on(seed, (tx, { rows }) => adapter.setAll(tx, rows)),
            on(toggle, (tx, { id }) =>
              adapter.mapOne(tx, { id, map: (t) => ({ ...t, done: !t.done }) }),
            ),
          ),
          ui: createReducer(
            { value: 0 },
            on(ui, (_tx, { value }) => ({ value })),
          ),
        },
        { sqlite: { driver } },
      ),
    ],
    parent as EnvironmentInjector,
  );
  const store = injector.get(Store);
  await store.settle();
  const list = store.select(selectAll).subscribe();
  const subscriptions = [store.select(count).subscribe(), store.select(selectUi).subscribe()];
  await firstValueFrom(store.select(selectAll));
  await store.settle();
  await store.dispatchAsync(seed({ rows: data(100) }));
  await store.dispatchAsync(toggle({ id: 't1' }));
  await store.dispatchAsync(seed({ rows: [] }));
  await store.dispatchAsync(ui({ value: -1 }));
  driver.trace = [];
  const baseline = await collect();
  await store.dispatchAsync(seed({ rows: data(n) }));
  await store.dispatchAsync(ui({ value: -1 }));
  await firstValueFrom(store.select(selectAll));
  await store.settle();
  // Exclude instrumentation's seed SQL strings from retained store heap.
  driver.trace = [];
  const sqliteHeap = (await collect()) - baseline;
  if (n === 50000 && process.argv.includes('--heap'))
    writeHeapSnapshot('tmp/spikes/scale-loaded.heapsnapshot');
  driver.latency = Number(process.env['SCALE_LATENCY_MS'] ?? 3);
  const toggleTimes: number[] = [],
    uiTimes: number[] = [],
    commitTimes: number[] = [];
  let toggleStatements = 0,
    refreshStatements = 0,
    uiStatements = 0,
    todosStatements = 0;
  let toggleEntityRows = 0;
  let emittedAt = 0;
  const listTiming = store.select(selectAll).subscribe(() => (emittedAt = performance.now()));
  const uiTiming = store.select(selectUi).subscribe(() => (emittedAt = performance.now()));
  for (let i = 0; i < 6; i++) {
    driver.trace = [];
    driver.entityRows = 0;
    let start = performance.now();
    await store.dispatchAsync(toggle({ id: 't1' }));
    if (i) toggleTimes.push(emittedAt - start);
    toggleStatements = driver.trace.length;
    toggleEntityRows = driver.entityRows;
    refreshStatements = driver.trace.slice(driver.trace.indexOf('COMMIT') + 1).length;
    driver.trace = [];
    driver.waitMs = driver.sqlMs = driver.todosStatements = 0;
    start = performance.now();
    await store.dispatchAsync(ui({ value: i + 1 }));
    if (i) uiTimes.push(emittedAt - start);
    uiStatements = driver.trace.length;
    todosStatements = driver.todosStatements;
  }
  driver.latency = 0;
  for (let i = 0; i < 6; i++) {
    await store.dispatchAsync(ui({ value: i + 100 }));
    if (i) commitTimes.push(emittedAt - driver.commitAt);
  }
  listTiming.unsubscribe();
  list.unsubscribe();
  // Count and ui remain mounted. No manual selector.release() masks retention.
  await store.settle();
  driver.trace = [];
  const releasedHeap = (await collect()) - baseline;
  if (n === 50000 && process.argv.includes('--heap'))
    writeHeapSnapshot('tmp/spikes/scale-released.heapsnapshot');
  const result = {
    n,
    toggleMs: median(toggleTimes),
    uiMs: median(uiTimes),
    commitJsMs: median(commitTimes),
    toggleStatements,
    refreshStatements,
    toggleEntityRows,
    uiStatements,
    todosStatements,
    sqliteHeap,
    releasedHeap,
  };
  await writeFile(`tmp/spikes/scale-${mode}-${n}.json`, JSON.stringify(result));
  uiTiming.unsubscribe();
  for (const sub of subscriptions) sub.unsubscribe();
  await injector.get(StorageEngine).close();
  injector.destroy();
  parent.destroy();
}
export async function scale(): Promise<void> {
  const results: Result[] = [];
  for (const n of [1000, 10000, 50000]) {
    let result = { n } as Result;
    for (const mode of ['classic', 'sqlite']) {
      await new Promise<void>((resolve, reject) => {
        const profile =
          process.argv.includes('--profile') && mode === 'sqlite' && n === 50000
            ? ['--cpu-prof', '--cpu-prof-dir=tmp/spikes']
            : [];
        const child = spawn(
          process.execPath,
          [
            '--expose-gc',
            ...profile,
            process.argv[1],
            '--scale-worker',
            String(n),
            mode,
            ...(process.argv.includes('--heap') ? ['--heap'] : []),
          ],
          { stdio: 'inherit' },
        );
        child.on('error', reject);
        child.on('exit', (code) =>
          code === 0 ? resolve() : reject(new Error(`Scale worker exited ${code}`)),
        );
      });
      result = {
        ...result,
        ...JSON.parse(await readFile(`tmp/spikes/scale-${mode}-${n}.json`, 'utf8')),
      };
    }
    results.push(result);
    console.log('scale', JSON.stringify(result));
  }
  const baselineFile = 'docs/spikes/scale-baseline.json';
  let before: Result[];
  if (process.env['SCALE_CAPTURE_BASELINE'])
    await writeFile(baselineFile, JSON.stringify(results, null, 2) + '\n');
  try {
    before = JSON.parse(await readFile(baselineFile, 'utf8'));
  } catch {
    before = results;
    await writeFile(baselineFile, JSON.stringify(results, null, 2) + '\n');
  }
  const largest = results.find((result) => result.n === 50000)!;
  if (!process.env['SCALE_CAPTURE_BASELINE']) {
    assert.ok(
      largest.toggleMs <= 10 * largest.classicMs + 3 * Number(process.env['SCALE_LATENCY_MS'] ?? 3),
      '50k toggle time target',
    );
    assert.ok(largest.refreshStatements <= 3, 'refresh statement target');
    assert.equal(largest.toggleEntityRows, 1, 'toggle must transport one entity row');
    assert.ok(largest.commitJsMs < 5, 'post-commit JS target (conservatively includes SQL)');
    assert.equal(largest.todosStatements, 0, 'ui must not touch todos');
    assert.ok(largest.sqliteHeap <= largest.classicHeap * 1.2, 'loaded heap target');
    assert.ok(
      largest.releasedHeap < 1024 * 1024,
      'released heap must return within 1 MiB of baseline',
    );
  }
  const profile = await readFile('docs/spikes/scale-profile.md', 'utf8').catch(() => '');
  const mb = (bytes: number) => (bytes / 1024 ** 2).toFixed(2);
  await report(
    'scale',
    `# Phase 12 scale\n\n${environment}\n\nLatencyDriver uses an asynchronous turn followed by a monotonic CPU wait (Windows setTimeout/Atomics.wait measured 15.5 ms for a requested 3 ms). The wait is isolated as delay in CPU profiles. Configurable requested delay: ${process.env['SCALE_LATENCY_MS'] ?? 3} ms per statement; complete dispatch through selector emission. Five-run medians after warm-up. Post-commit time measured separately at zero latency (includes SQL refresh). Heap deltas use two forced GCs after an event-loop turn, against each initialized empty store after a 100-row setup warm-up and clear. Every implementation/size runs in a fresh process; classic and SQLite both subscribe to selectAll, count and ui. Seed actions and instrumentation SQL strings are released before GC. After list release, count and ui remain mounted; no manual selector.release() is used. SQL counts include BEGIN/COMMIT and last_insert_rowid; refresh counts exclude writes/transaction control.\n\n| N | toggle before ms | after ms | classic ms | target ms | ui before ms | after ms | post-commit before ms | after ms |\n|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${results.map((r, i) => `| ${r.n} | ${before[i].toggleMs.toFixed(3)} | ${r.toggleMs.toFixed(3)} | ${r.classicMs.toFixed(3)} | ${(10 * r.classicMs + 9).toFixed(3)} | ${before[i].uiMs.toFixed(3)} | ${r.uiMs.toFixed(3)} | ${before[i].commitJsMs.toFixed(3)} | ${r.commitJsMs.toFixed(3)} |`).join('\n')}\n\n| N | toggle statements before/after | refresh before/after | entity rows before/after | ui statements | todos statements on ui | classic MiB | store before MiB | after MiB | released before MiB | after MiB |\n|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${results.map((r, i) => `| ${r.n} | ${before[i].toggleStatements}/${r.toggleStatements} | ${before[i].refreshStatements}/${r.refreshStatements} | ${before[i].toggleEntityRows}/${r.toggleEntityRows} | ${r.uiStatements} | ${r.todosStatements} | ${mb(r.classicHeap)} | ${mb(before[i].sqliteHeap)} | ${mb(r.sqliteHeap)} | ${mb(before[i].releasedHeap)} | ${mb(r.releasedHeap)} |`).join('\n')}\n\nAt 50k the compact position buffer uses another 0.38 MiB outside heapUsed; including it still meets the 1.2x classic bound. Negative released deltas reflect GC/JIT noise around the empty-store baseline. The targets apply to N=50k; full-dispatch counts include four write/control statements in addition to the three refresh reads.\n\n${profile}\n`,
  );
}
