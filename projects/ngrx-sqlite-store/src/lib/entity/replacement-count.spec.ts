import { TestBed } from '@angular/core/testing';
import { createAction } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { createEntityAdapter } from '../../../entity/src/entity-adapter';
import { countingDriver } from '../../../spikes/bridge-cost-workload';
import { createReducer, on } from '../reducer/reducer';
import { createFeatureSelector } from '../selectors/selectors';
import { provideStore } from '../store/provide';
import { Store } from '../store/store';
import { StorageEngine } from '../storage/storage-engine';

interface Todo { id: string; done: boolean; title: string }
const seed = createAction('[Replacement] seed');
const reset = createAction('[Replacement] reset');
let engine: StorageEngine;
afterEach(async () => {
  TestBed.resetTestingModule();
  await engine?.close();
});

describe('inline replacement aggregates', () => {
  // A seed reducer typically returns collection extras with setAll (loaded, version).
  it.each([false, true])('recount in JS without a table scan (extras returned: %s)', async (partial) => {
    const { driver, counts } = countingDriver();
    const adapter = createEntityAdapter<Todo>();
    const initial = adapter.getInitialState({ loaded: false, seedVersion: 0, filter: 'all' });
    TestBed.configureTestingModule({
      providers: [provideStore({
        todos: createReducer<typeof initial>(initial,
          on(seed, async (tx) => {
            await adapter.setAll(tx, Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, done: i % 2 === 0, title: 'x' })));
            if (partial) return { loaded: true, seedVersion: 3 } as never;
            return;
          }),
          on(reset, (tx) => tx.resetFeature()),
        ),
      }, { sqlite: { driver } })],
    });
    const store = TestBed.inject(Store);
    engine = TestBed.inject(StorageEngine);
    await store.settle();
    const queries = adapter.query(createFeatureSelector<typeof initial>('todos'));
    let open = -1;
    const sub = store.select(queries.count({ done: false })).subscribe((v) => (open = v));
    await firstValueFrom(store.select(queries.count({ done: false })));
    counts.trace.length = 0;
    await store.dispatchAsync(seed());
    expect(open).toBe(10);
    expect(counts.trace.filter((s) => /COUNT\(/i.test(s))).toEqual([]);
    sub.unsubscribe();
  });
});
