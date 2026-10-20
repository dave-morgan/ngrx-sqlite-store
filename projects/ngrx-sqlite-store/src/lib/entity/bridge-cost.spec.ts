// Statement-count budgets for common operations. On Capacitor every statement is a
// native bridge round trip (~5-15 ms on Android), so statement count, not SQL time,
// dominates latency. Found via the phase 9 Android benchmark (reset took ~8 s).
import { TestBed } from '@angular/core/testing';
import { createAction, props } from '@ngrx/store';
import { afterEach, describe, expect, it } from 'vitest';
import { createEntityAdapter } from '../../../entity/src/entity-adapter';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { createReducer, on } from '../reducer/reducer';
import { provideStore } from '../store/provide';
import { Store } from '../store/store';

interface Todo {
  id: string;
  title: string;
  done: boolean;
}
const N = 500;
const rows: Todo[] = Array.from({ length: N }, (_, i) => ({ id: `t${i}`, title: `Todo ${i}`, done: i % 3 === 0 }));

const seed = createAction('[Bridge] Seed');
const reset = createAction('[Bridge] Reset');
const toggle = createAction('[Bridge] Toggle', props<{ id: string }>());
const add = createAction('[Bridge] Add', props<{ todo: Todo }>());
const filter = createAction('[Bridge] Filter', props<{ filter: string }>());

interface TodosState {
  ids: string[];
  entities: Record<string, Todo>;
  filter: string;
  loaded: boolean;
}
const adapter = createEntityAdapter<Todo>();
const initial = adapter.getInitialState<TodosState>({ filter: 'all', loaded: false });

function countingDriver() {
  const driver = new SqlJsDriver();
  const counts = { statements: 0 };
  for (const m of ['run', 'query', 'exec'] as const) {
    const original = driver[m].bind(driver) as (...a: unknown[]) => Promise<unknown>;
    (driver as unknown as Record<string, unknown>)[m] = (...a: unknown[]) => {
      counts.statements++;
      return original(...a);
    };
  }
  return { driver, counts };
}

describe('bridge cost (statement budgets)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('reports statement counts for common operations', async () => {
    const { driver, counts } = countingDriver();
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          {
            todos: createReducer<TodosState>(
              initial,
              on(seed, async (tx) => {
                await adapter.setAll(tx, rows);
                return { loaded: true };
              }),
              on(reset, (tx) => tx.resetFeature()),
              on(toggle, (tx, { id }) => adapter.mapOne(tx, { id, map: (t) => ({ ...t, done: !t.done }) })),
              on(add, (tx, { todo }) => adapter.addOne(tx, todo)),
              on(filter, async (_tx, { filter }) => ({ filter })),
            ),
          },
          { sqlite: { driver } },
        ),
      ],
    });
    const store = TestBed.inject(Store);
    await store.settle();

    const measure = async (action: Parameters<Store['dispatchAsync']>[0]) => {
      const before = counts.statements;
      await store.dispatchAsync(action);
      return counts.statements - before;
    };

    const report = {
      seedSetAll500: await measure(seed()),
      toggleOne: await measure(toggle({ id: 't1' })),
      addOne: await measure(add({ todo: { id: 'x', title: 'x', done: false } })),
      setScalar: await measure(filter({ filter: 'open' })),
      resetFeature500: await measure(reset()),
    };
    console.log('[bridge-cost]', JSON.stringify(report));

    expect(report.toggleOne).toBeLessThanOrEqual(8);
    expect(report.addOne).toBeLessThanOrEqual(8);
    expect(report.setScalar).toBeLessThanOrEqual(6);
    // Bulk operations must be O(batches), never O(rows).
    expect(report.seedSetAll500).toBeLessThanOrEqual(20);
    expect(report.resetFeature500).toBeLessThanOrEqual(20);
  });
});
