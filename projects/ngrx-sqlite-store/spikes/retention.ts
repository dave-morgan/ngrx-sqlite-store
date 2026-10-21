import { createEnvironmentInjector, EnvironmentInjector, Injector } from '@angular/core';
import { createAction, props } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { createEntityAdapter } from '../entity/src/entity-adapter';
import { SqlJsDriver } from '../src/lib/driver/sqljs-driver';
import { createReducer, on } from '../src/lib/reducer/reducer';
import { StoreTx } from '../src/lib/reducer/store-tx';
import { createFeatureSelector, createSelector } from '../src/lib/selectors/selectors';
import { PathCache } from '../src/lib/selectors/path-cache';
import { querySources } from '../src/lib/selectors/metadata';
import { StorageEngine } from '../src/lib/storage/storage-engine';
import { committedWrites } from '../src/lib/storage/committed-writes';
import type { ChangeSet } from '../src/lib/storage/change-set';
import { provideStore } from '../src/lib/store/provide';
import { Store } from '../src/lib/store/store';
import { assert, report } from './common';

export async function retention(): Promise<void> {
  const adapter = createEntityAdapter<{ id: string; title: string }>();
  const seed = createAction('[Retention] Seed', props<{ rows: { id: string; title: string }[] }>());
  const tick = createAction('[Retention] Tick');
  const initial = adapter.getInitialState();
  let transaction: WeakRef<StoreTx> | undefined;
  let changes: WeakRef<ChangeSet> | undefined;
  const parent = Injector.create({ providers: [] });
  const injector = createEnvironmentInjector(
    [
      provideStore(
        {
          todos: createReducer(
            initial,
            on(seed, (tx, { rows }) => adapter.setAll(tx, rows)),
          ),
          ui: createReducer(
            { value: 0 },
            on(tick, () => ({ value: 1 })),
          ),
        },
        {
          sqlite: {
            driver: new SqlJsDriver(),
            cacheBudgetBytes: 0,
            actionHooks: [
              (action, tx) => {
                if (action.type === seed.type) transaction = new WeakRef(tx);
              },
            ],
          },
        },
      ),
    ],
    parent as EnvironmentInjector,
  );
  const store = injector.get(Store);
  const engine = injector.get(StorageEngine);
  await store.settle();
  const source = createFeatureSelector<typeof initial>('todos');
  const selected = store.select(adapter.query(source).count());
  const subscription = selected.subscribe();
  await firstValueFrom(selected);
  const committed = engine.changes$.subscribe((c) => {
    changes = new WeakRef(c);
  });
  async function seedRows() {
    const rows = Array.from({ length: 50000 }, (_, i) => ({ id: `t${i}`, title: `Todo #${i}` }));
    const sample = new WeakRef(rows[12345]);
    await store.dispatchAsync(seed({ rows }));
    return sample;
  }
  const sample = await seedRows();
  assert.equal(
    committedWrites(changes!.deref()!).values.size,
    0,
    'retained ChangeSet must not keep exact write values',
  );
  assert.equal(
    committedWrites(changes!.deref()!).entities.size,
    0,
    'retained ChangeSet must not keep entity transport rows',
  );
  // ActionsSubject intentionally keeps the current action. Do not change its contract.
  await new Promise<void>((resolve) => setImmediate(resolve));
  globalThis.gc!();
  assert.ok(sample.deref(), 'last seed action retains its payload by NgRx contract');
  committed.unsubscribe();
  await store.dispatchAsync(tick());
  await store.settle();
  for (let i = 0; i < 5; i++) {
    await new Promise<void>((resolve) => setImmediate(resolve));
    globalThis.gc!();
  }
  assert.equal(sample.deref(), undefined, 'seed payload must collect after the next action');
  assert.equal(transaction?.deref(), undefined, 'StoreTx identity/buffer must collect');
  assert.equal(changes?.deref(), undefined, 'commit write-through journal must collect');
  async function selectPageThenCount() {
    const queries = adapter.query(source);
    const page = queries.page({ offset: 0, limit: 50000 });
    const pageSubscription = store.select(page).subscribe();
    const rows = await firstValueFrom(store.select(page));
    const sample = new WeakRef(rows[12345]);
    const count = createSelector(queries.count(), (value) => value);
    const countSubscription = store.select(count).subscribe();
    assert.equal(await firstValueFrom(store.select(count)), 50000);
    await store.settle();
    pageSubscription.unsubscribe();
    assert.equal(injector.get(PathCache).ready(querySources(page)[0].id), false);
    return { sample, count, countSubscription };
  }
  const pageRetention = await selectPageThenCount();
  for (let i = 0; i < 5; i++) {
    await new Promise<void>((resolve) => setImmediate(resolve));
    globalThis.gc!();
  }
  assert.equal(
    pageRetention.sample.deref(),
    undefined,
    'evicted page rows must collect while an unrelated count memo stays active',
  );
  pageRetention.countSubscription.unsubscribe();
  subscription.unsubscribe();
  await engine.close();
  injector.destroy();
  parent.destroy();
  await report(
    'retention',
    `# Library retention regressions\n\nRun: node projects/ngrx-sqlite-store/spikes/run.mjs --retention-only\n\nNode --expose-gc; 50k seed rows, count query subscribed. The last seed action keeps its sample alive. After a small tick action replaces ActionsSubject._value, five event-loop turns and forced GCs collect the sample, StoreTx and ChangeSet (including the write-through journal).\n\nADR-0035: load a 50k query page, then subscribe to a derived count. Unsubscribe the page with cacheBudgetBytes=0 and verify eviction. Five event-loop turns and forced GCs collect the page sample while the derived count selector, its memo and subscription remain alive. Before the fix this assertion fails: the count memo's queryViews map retains the page. No manual selector release or action subject mutation.\n`,
  );
  console.log(
    'retention: seed payload/transaction/journal collected; evicted page collected with count memo active',
  );
}
