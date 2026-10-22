import { TestBed } from '@angular/core/testing';
import { ApplicationInitStatus } from '@angular/core';
import { afterEach, expect, it, vi } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { SqliteStoreCore } from './core';
import { prewarmSqliteStore } from './prewarm';
import { provideStore } from './provide';
import { StorageEngine } from '../storage/storage-engine';
import { SCHEMA_MIGRATIONS } from '../schema/migrations';
import { NodeStore } from '../schema/node-store';

afterEach(() => TestBed.resetTestingModule());

it.each([false, true])('clears declared session data before DI, preserving explicit persistence (%s)', async (persist) => {
  const driver = new SqlJsDriver();
  const fixture = new StorageEngine(driver, { migrations: SCHEMA_MIGRATIONS });
  await fixture.open();
  await fixture.transaction(async (tx) => {
    await new NodeStore().write(tx, 'router', { stale: true }, tx.changes);
    await tx.write!('INSERT INTO nss_meta(key,value) VALUES (?,?)', ['feature:router:version', '1']);
  });
  const providers = [provideStore({ router: (state: unknown) => state }, { sqlite: { driver, features: { router: { persist } } } })];
  const ready = prewarmSqliteStore(providers);
  await ready;
  expect(await driver.query('SELECT path FROM nss_node WHERE path = ?', ['router']))
    .toEqual(persist ? [{ path: 'router' }] : []);
  expect(await driver.query('SELECT value FROM nss_meta WHERE key = ?', ['feature:router:version']))
    .toEqual([{ value: '1' }]);
  TestBed.configureTestingModule({ providers });
  const core = TestBed.inject(SqliteStoreCore);
  await core.initialize();
  expect(await core.engine.read((tx) => new NodeStore().read(tx, 'router')))
    .toEqual(persist ? { stale: true } : undefined);
  await core.engine.close();
});

it('adopts an in-flight engine exactly once and keeps session reset before selection', async () => {
  const driver = new SqlJsDriver();
  const open = vi.spyOn(driver, 'open');
  const factory = vi.fn(() => driver);
  const warm = prewarmSqliteStore([provideStore({}, { sqlite: { driver: factory } })]);
  expect(prewarmSqliteStore({ driver: factory })).toBe(warm);
  TestBed.configureTestingModule({ providers: [provideStore({ router: (s = { route: 'initial' }) => s }, { sqlite: { driver: factory } })] });
  const core = TestBed.inject(SqliteStoreCore);
  await core.initialize();
  await warm;
  expect(open).toHaveBeenCalledTimes(1);
  expect(factory).toHaveBeenCalledTimes(1);
  expect(core.engine.status()).toBe('ready');
  expect(core.selectionReady('router')).toBe(true);
  await core.engine.close();
});

it('retains the original open error for adoption without retrying or unhandled rejection', async () => {
  const driver = new SqlJsDriver();
  const failure = new Error('prewarm failed');
  const open = vi.spyOn(driver, 'open').mockRejectedValue(failure);
  const warm = prewarmSqliteStore({ driver });
  await expect(warm).rejects.toBe(failure);
  TestBed.configureTestingModule({ providers: [provideStore({}, { sqlite: { driver } })] });
  const core = TestBed.inject(SqliteStoreCore);
  await expect(TestBed.inject(ApplicationInitStatus).donePromise).rejects.toBe(failure);
  await expect(core.initialize()).rejects.toBe(failure);
  expect(open).toHaveBeenCalledTimes(1);
  expect(core.status()).toBe('error');
});
