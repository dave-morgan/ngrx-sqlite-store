// Counts every driver call, including transaction boundaries, internal sql.js
// queries and refresh reads for an active whole-store subscription.
import { TestBed } from '@angular/core/testing';
import { createAction } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import {
  bridgeBudgets,
  bridgeReducers,
  countingDriver,
  exerciseBridgeCost,
} from '../../../spikes/bridge-cost-workload';
import { provideStore } from '../store/provide';
import { createReducer, on } from '../reducer/reducer';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { Store } from '../store/store';

describe('bridge cost (statement budgets)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('preserves replacement identities on equal-content feature resets', async () => {
    const reset = createAction('[Bridge regression] Reset');
    const initial = { nested: { value: 1 }, items: [{ id: 1 }] };
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          {
            sample: createReducer(
              initial,
              on(reset, (tx) => tx.resetFeature()),
            ),
          },
          { sqlite: { driver: new SqlJsDriver() } },
        ),
      ],
    });
    const store = TestBed.inject(Store);
    await store.settle();
    const values: unknown[] = [];
    const selected = store.select((state: { sample: typeof initial }) => state.sample.nested);
    const subscription = selected.subscribe((value) => values.push(value));
    try {
      await firstValueFrom(selected);
      await store.dispatchAsync(reset());
      expect(values).toEqual([{ value: 1 }, { value: 1 }]);
      expect(values[1]).not.toBe(values[0]);
    } finally {
      subscription.unsubscribe();
    }
  });

  it.each([false, true])('enforces all budgets (active sources: %s)', async (active) => {
    const { driver, counts } = countingDriver();
    TestBed.configureTestingModule({
      providers: [provideStore(bridgeReducers, { sqlite: { driver } })],
    });
    const { report, traces } = await exerciseBridgeCost(
      TestBed.inject(Store),
      counts,
      active,
      (actual, expected, label) => expect(actual, label).toEqual(expected),
    );
    console.log('[bridge-cost]', JSON.stringify({ active, ...report }));
    for (const [operation, budget] of Object.entries(bridgeBudgets))
      expect
        .soft(report[operation], `${operation}: ${JSON.stringify(traces)}`)
        .toBeLessThanOrEqual(budget);
  });
});
