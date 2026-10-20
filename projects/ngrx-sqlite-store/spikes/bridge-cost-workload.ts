import { createAction, props } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { createEntityAdapter } from '../entity/src/entity-adapter';
import { SqlJsDriver } from '../src/lib/driver/sqljs-driver';
import { createReducer, on } from '../src/lib/reducer/reducer';
import type { Store } from '../src/lib/store/store';

interface Todo {
  id: string;
  title: string;
  done: boolean;
}
const N = 500;
const rows: Todo[] = Array.from({ length: N }, (_, i) => ({
  id: `t${i}`,
  title: `Todo ${i}`,
  done: i % 3 === 0,
}));

const seed = createAction('[Bridge] Seed');
const setInitial = createAction('[Bridge] Set initial');
const removeAll = createAction('[Bridge] Remove all');
const removeMany = createAction('[Bridge] Remove many');
const map = createAction('[Bridge] Map');
const update = createAction('[Bridge] Update');
const remove = createAction('[Bridge] Remove');
const arrayDiff = createAction('[Bridge] Array diff');
const reset = createAction('[Bridge] Reset');
const toggle = createAction('[Bridge] Toggle', props<{ id: string }>());
const add = createAction('[Bridge] Add', props<{ todo: Todo }>());
const filter = createAction('[Bridge] Filter', props<{ filter: string }>());

interface TodosState {
  ids: string[];
  entities: Record<string, Todo>;
  filter: string;
  loaded: boolean;
  page: number;
}
const adapter = createEntityAdapter<Todo>();
const initial = adapter.getInitialState<TodosState>({ filter: 'all', loaded: false, page: 0 });

export function countingDriver() {
  const driver = new SqlJsDriver();
  const counts = { statements: 0, trace: [] as string[] };
  // Include BEGIN/COMMIT and sql.js's real internal last_insert_rowid query.
  // Never bundle multiple SQL statements into one counted exec call.
  for (const m of ['run', 'query', 'exec'] as const) {
    const original = driver[m].bind(driver) as (...a: unknown[]) => Promise<unknown>;
    (driver as unknown as Record<string, unknown>)[m] = (...a: unknown[]) => {
      counts.statements++;
      counts.trace.push(String(a[0]));
      return original(...a);
    };
  }
  return { driver, counts };
}

export const bridgeReducers = {
  todos: createReducer<TodosState>(
    initial,
    on(seed, async (tx) => {
      await adapter.setAll(tx, rows);
      return { loaded: true };
    }),
    on(reset, (tx) => tx.resetFeature()),
    on(setInitial, (tx) => tx.set('', initial)),
    on(removeAll, (tx) => adapter.removeAll(tx)),
    on(removeMany, (tx) => adapter.removeMany(tx, (t) => t.done)),
    on(map, (tx) => adapter.map(tx, (t) => (t.done ? { ...t, title: 'changed' } : t))),
    on(update, (tx) => adapter.updateOne(tx, { id: 't2', changes: { title: 'updated' } })),
    on(remove, (tx) => adapter.removeOne(tx, 'x')),
    on(toggle, (tx, { id }) => adapter.mapOne(tx, { id, map: (t) => ({ ...t, done: !t.done }) })),
    on(add, (tx, { todo }) => adapter.addOne(tx, todo)),
    on(filter, async (_tx, { filter }) => ({ filter })),
  ),
  plain: createReducer(
    { items: Array.from({ length: 300 }, (_, i) => i) },
    on(arrayDiff, (tx) =>
      tx.set(
        'items',
        Array.from({ length: 300 }, (_, i) => i + 1000),
      ),
    ),
  ),
};

export const bridgeBudgets = {
  seedSetAll500: 15,
  toggleOne: 5,
  updateOne: 5,
  addOne: 5,
  removeOne: 5,
  setScalar: 5,
  resetFeature500: 12,
  setInitial500: 12,
  removeAll500: 6,
  removeManyThird: 12,
  mapThird: 15,
  arrayDiff300: 15,
};

export async function exerciseBridgeCost(
  store: Store,
  counts: ReturnType<typeof countingDriver>['counts'],
  active: boolean,
  verify: (actual: unknown, expected: unknown, label: string) => void,
) {
  await store.settle();
  const subscription = active ? store.subscribe() : undefined;
  if (active) await firstValueFrom(store.select((state) => (state as { todos: TodosState }).todos));
  await store.settle();
  const traces: Record<string, string[]> = {};
  const measure = async (action: Parameters<Store['dispatchAsync']>[0]) => {
    const before = counts.statements;
    const traceStart = counts.trace.length;
    await store.dispatchAsync(action);
    traces[action.type] = counts.trace.slice(traceStart);
    return counts.statements - before;
  };
  const report: Record<string, number> = {};
  try {
    report['seedSetAll500'] = await measure(seed());
    report['toggleOne'] = await measure(toggle({ id: 't1' }));
    report['updateOne'] = await measure(update());
    report['addOne'] = await measure(add({ todo: { id: 'x', title: 'x', done: false } }));
    report['removeOne'] = await measure(remove());
    report['setScalar'] = await measure(filter({ filter: 'open' }));
    report['resetFeature500'] = await measure(reset());
    verify(((await store.materialize()) as { todos: TodosState }).todos, initial, 'reset');
    await store.dispatchAsync(seed());
    report['setInitial500'] = await measure(setInitial());
    verify(((await store.materialize()) as { todos: TodosState }).todos, initial, 'reset');
    await store.dispatchAsync(seed());
    report['removeAll500'] = await measure(removeAll());
    verify(
      ((await store.materialize()) as { todos: TodosState }).todos,
      { ...initial, loaded: true },
      'removeAll',
    );
    await store.dispatchAsync(seed());
    report['removeManyThird'] = await measure(removeMany());
    const removed = ((await store.materialize()) as { todos: TodosState }).todos;
    verify(
      removed.ids,
      rows.filter((t) => !t.done).map((t) => t.id),
      'removeMany ids',
    );
    verify(
      Object.values(removed.entities),
      rows.filter((t) => !t.done),
      'removeMany entities',
    );
    await store.dispatchAsync(seed());
    report['mapThird'] = await measure(map());
    const mapped = ((await store.materialize()) as { todos: TodosState }).todos;
    verify(
      mapped.ids,
      rows.map((t) => t.id),
      'map ids',
    );
    verify(
      Object.values(mapped.entities),
      rows.map((t) => (t.done ? { ...t, title: 'changed' } : t)),
      'map entities',
    );
    report['arrayDiff300'] = await measure(arrayDiff());
    verify(
      ((await store.materialize()) as { plain: { items: number[] } }).plain.items,
      Array.from({ length: 300 }, (_, i) => i + 1000),
      'array diff',
    );
    return { report, traces };
  } finally {
    subscription?.unsubscribe();
  }
}
