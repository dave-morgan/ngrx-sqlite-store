import { TestBed } from '@angular/core/testing';
import * as ngrx from '@ngrx/store';
import { afterEach, expect, it, vi } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { provideState, provideStore } from '../store/provide';
import { Store } from '../store/store';
import { SqliteStoreCore } from '../store/core';
import { NodeStore } from '../schema/node-store';
import { createReducer, on } from './reducer';

afterEach(() => TestBed.resetTestingModule());

const load = ngrx.createAction('[prefetch] load', ngrx.props<{ version: number }>());

// Phase 15x: a returned multi-key partial reads its previous values in one transport.
it('reads every key of a returned partial in one batched query', async () => {
  const driver = new SqlJsDriver();
  const reducer = createReducer(
    { loaded: false, version: 0, label: 'x', nested: { a: 1 } },
    on(load, async (_tx, { version }) => ({ loaded: true, version, nested: { a: version } })),
  );
  TestBed.configureTestingModule({
    providers: [provideStore({}, { sqlite: { driver } }), provideState('feature', reducer)],
  });
  const store = TestBed.inject(Store);
  const core = TestBed.inject(SqliteStoreCore);
  await core.initialize();
  await store.settle();
  const query = vi.spyOn(driver, 'query');
  await store.dispatchAsync(load({ version: 7 }));
  const subtreeReads = query.mock.calls.filter(([sql]) => /FROM nss_node WHERE path = \?/.test(sql));
  expect(subtreeReads).toHaveLength(1);
  expect(await core.engine.read((tx) => new NodeStore().read(tx, 'feature'))).toEqual({
    loaded: true, version: 7, label: 'x', nested: { a: 7 },
  });
  await core.engine.close();
});
