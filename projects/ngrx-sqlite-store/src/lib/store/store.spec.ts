import { TestBed } from '@angular/core/testing';
import {
  ActionsSubject,
  INIT,
  ScannedActionsSubject,
  Store as NgrxStore,
  createAction,
  createReducer as syncReducer,
  on as syncOn,
} from '@ngrx/store';
import { afterEach, describe, expect, it } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { NodeStore } from '../schema/node-store';
import { StorageEngine } from '../storage/storage-engine';
import { provideStore } from './provide';
import { Store } from './store';
import { SqliteStoreCore } from './core';
import { POST_COMMIT_HOOK } from './tokens';

afterEach(() => TestBed.resetTestingModule());
describe('SQLite store write contract', () => {
  it('settles only after purge SQL and its refresh hooks finish', async () => {
    let purging = false;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          { counter: syncReducer({ count: 0 }) },
          { sqlite: { driver: new SqlJsDriver() } },
        ),
        {
          provide: POST_COMMIT_HOOK,
          multi: true,
          useValue: async () => {
            if (purging) await gate;
          },
        },
      ],
    });
    const store = TestBed.inject(Store);
    await store.settle();
    purging = true;
    let done = false;
    const purge = store.purgeFeature('counter').then(() => {
      done = true;
    });
    setTimeout(release, 25);
    await store.settle();
    expect(done).toBe(true);
    await purge;
  });
  it('seeds, binds original tokens and scans only after commit', async () => {
    const increment = createAction('increment');
    TestBed.configureTestingModule({
      providers: [
        provideStore(
          {
            counter: syncReducer(
              { count: 0 },
              syncOn(increment, (s) => ({ count: s.count + 1 })),
            ),
          },
          { sqlite: { driver: new SqlJsDriver() } },
        ),
      ],
    });
    const store = TestBed.inject(Store);
    const scanned: string[] = [];
    const reads: Promise<unknown>[] = [];
    const engine = TestBed.inject(StorageEngine);
    TestBed.inject(ScannedActionsSubject).subscribe((a) => {
      scanned.push(a.type);
      if (a.type === increment.type)
        reads.push(engine.read((sql) => new NodeStore().read(sql, 'counter')));
    });
    await TestBed.inject(SqliteStoreCore).initialize();
    await store.dispatchAsync(increment());
    expect(TestBed.inject(NgrxStore)).toBe(store);
    expect(scanned[0]).toBe(INIT);
    expect(await Promise.all(reads)).toEqual([{ count: 1 }]);
    expect(TestBed.inject(ActionsSubject).value.type).toBe(increment.type);
  });
});
