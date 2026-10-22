import { TestBed } from '@angular/core/testing';
import { ActionsSubject } from '@ngrx/store';
import type { ActionReducer } from '@ngrx/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SqlJsDriver } from '../driver/sqljs-driver';
import { createEntityAdapter } from '../../../entity/src/entity-adapter';
import { createReducer } from '../reducer/reducer';
import { NodeStore } from '../schema/node-store';
import { nssReducerError, SqliteStoreCore } from './core';
import { provideStore } from './provide';
import { Store } from './store';

let core: SqliteStoreCore | undefined;
afterEach(async () => {
  TestBed.resetTestingModule();
  await core?.engine.close();
  core = undefined;
});

function configure(reducers: Record<string, ActionReducer<unknown>>) {
  const driver = new SqlJsDriver();
  const query = vi.spyOn(driver, 'query');
  TestBed.configureTestingModule({ providers: [provideStore(reducers, { sqlite: { driver } })] });
  core = TestBed.inject(SqliteStoreCore);
  const markers = () => query.mock.calls.filter(([sql, params]) =>
    /FROM nss_meta WHERE key/.test(sql) &&
    (sql.includes(' IN (') || params?.some((value) => String(value).startsWith('feature:'))),
  );
  return { driver, query, markers, core };
}

describe('feature registration metadata query budgets', () => {
  it('preloads the registered router and eager roots in one read after seeding', async () => {
    const driver = new SqlJsDriver();
    const query = vi.spyOn(driver, 'query');
    TestBed.configureTestingModule({ providers: [provideStore({
      router: (state = { route: 'initial' }) => state,
      ui: (state = { ready: true }) => state,
    }, { sqlite: { driver, eager: ['ui'] } })] });
    core = TestBed.inject(SqliteStoreCore);
    await core.initialize();
    const preloads = query.mock.calls.filter(([sql]) =>
      sql.includes('SELECT 0 AS slot') && sql.includes('FROM nss_node WHERE path'),
    );
    expect(preloads).toHaveLength(1);
  });
  it('installs declared indexes during registration and performs no index work on dispatch', async () => {
    const adapter = createEntityAdapter<{ id: string; done: boolean }>({ query: { index: ['done'] } });
    const setup = configure({ todos: createReducer<unknown>(adapter.getInitialState()) });
    await setup.core.initialize();
    await setup.core.settle();
    expect(await setup.driver.query("SELECT name FROM sqlite_master WHERE name = 'nss_query_646f6e65'"))
      .toEqual([{ name: 'nss_query_646f6e65' }]);
    setup.query.mockClear();
    const exec = vi.spyOn(setup.driver, 'exec');
    await TestBed.inject(Store).dispatchAsync({ type: 'irrelevant' });
    expect(exec).not.toHaveBeenCalled();
    expect(setup.query.mock.calls.filter(([sql]) => sql.includes('sqlite_master'))).toHaveLength(0);
  });

  it('resets a changed session feature with one atomic batch and no separate marker write', async () => {
    const setup = configure({});
    await setup.core.initialize();
    await setup.core.settle();
    const reducer = (state = { value: 0 }) => state;
    setup.core.addFeatures([{ key: 'session', reducers: reducer, sqlite: { persist: false } }]);
    await setup.core.settle();
    await setup.core.engine.transaction(async (tx) => {
      await new NodeStore().write(tx, 'session', { value: 42 }, tx.changes);
    });
    const batch = vi.spyOn(setup.driver, 'batch');
    const begin = vi.spyOn(setup.driver, 'begin');
    const run = vi.spyOn(setup.driver, 'run');
    setup.core.addFeatures([{ key: 'session', reducers: reducer, sqlite: { persist: false } }]);
    await setup.core.settle();
    expect(batch.mock.calls).toHaveLength(1);
    expect(batch.mock.calls[0][1]).toEqual({ transaction: true });
    expect(begin).not.toHaveBeenCalled();
    expect(run.mock.calls.filter(([sql]) => sql.includes('nss_meta'))).toHaveLength(0);
    expect(await setup.core.engine.read((tx) => new NodeStore().read(tx, 'session'))).toEqual({ value: 0 });
    batch.mockClear();
    setup.core.addFeatures([{ key: 'session', reducers: reducer, sqlite: { persist: false } }]);
    await setup.core.settle();
    expect(batch).not.toHaveBeenCalled();
  });

  it('reads four feature markers in one query without changing their seeded values', async () => {
    const setup = configure(Object.fromEntries(
      ['a', 'b', 'c', 'd'].map((key) => [key, (state = key) => state]),
    ));
    await setup.core.initialize();
    await TestBed.inject(Store).settle();
    expect(setup.markers()).toHaveLength(1);
    expect(setup.markers()[0][1]).toEqual([
      'feature:a:version', 'feature:b:version', 'feature:c:version', 'feature:d:version',
    ]);
    expect(await setup.core.engine.read((tx) => new NodeStore().read(tx, 'c'))).toBe('c');
  });

  it('chunks marker queries at 999 bindings for large registrations', async () => {
    const setup = configure(Object.fromEntries(
      Array.from({ length: 1000 }, (_, index) => [`f${index}`, (state = index) => state]),
    ));
    await setup.core.initialize();
    expect(setup.markers().map(([, params]) => params?.length)).toEqual([999, 1]);
    expect(await setup.driver.query('SELECT COUNT(*) AS count FROM nss_meta WHERE key LIKE ?', [
      'feature:%:version',
    ])).toEqual([{ count: 1000 }]);
  });

  it('does not issue an empty IN query when no features are registered', async () => {
    const setup = configure({});
    await setup.core.initialize();
    expect(setup.markers()).toEqual([]);
  });

  it('preserves sequential duplicate-key decisions within a lazy registration', async () => {
    const setup = configure({});
    await setup.core.initialize();
    await TestBed.inject(Store).settle();
    setup.core.addFeatures([
      { key: 'lazy', reducers: (state = 'first') => state },
      { key: 'lazy', reducers: (state = 'second') => state },
    ]);
    await setup.core.settle();
    expect(await setup.core.engine.read((tx) => new NodeStore().read(tx, 'lazy'))).toBe('first');
  });

  it('rolls back earlier lazy seeds and markers when a later feature version mismatches', async () => {
    const setup = configure({});
    await setup.core.initialize();
    await TestBed.inject(Store).settle();
    await setup.core.engine.transaction(async (tx) => {
      await tx.run('INSERT INTO nss_meta (key, value) VALUES (?, ?)', ['feature:existing:version', '1']);
    });
    setup.query.mockClear();
    const errors: unknown[] = [];
    const subscription = TestBed.inject(ActionsSubject).subscribe((action) => {
      if (action.type === nssReducerError.type && 'error' in action) errors.push(action.error);
    });
    setup.core.addFeatures([
      { key: 'fresh', reducers: createReducer('new') },
      { key: 'existing', reducers: createReducer('replacement'), sqlite: { version: 2 } },
    ]);
    await setup.core.settle();
    subscription.unsubscribe();
    expect(errors).toContainEqual(new Error('Feature version mismatch: existing'));
    expect(setup.markers()).toHaveLength(1);
    expect(await setup.core.engine.read((tx) => new NodeStore().read(tx, 'fresh'))).toBeUndefined();
    expect(await setup.driver.query('SELECT key, value FROM nss_meta WHERE key LIKE ?', [
      'feature:%:version',
    ])).toEqual([{ key: 'feature:existing:version', value: '1' }]);
  });
});
