import { TestBed } from '@angular/core/testing';
import * as ngrx from '@ngrx/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import type { SqlValue } from '../driver/sql-driver';
import { SqliteStoreCore } from '../store/core';
import { provideStore } from '../store/provide';
import { Store } from '../store/store';
import { querySources } from './metadata';
import { PathCache } from './path-cache';
import { createQuerySelector } from './query-selector';

let core: SqliteStoreCore | undefined;
const releases: Array<() => void> = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const release of releases.splice(0)) release();
  TestBed.resetTestingModule();
  await core?.engine.close();
  core = undefined;
});

async function boot(withQueries = false) {
  const driver = new SqlJsDriver();
  TestBed.configureTestingModule({ providers: [provideStore({
    flat: ngrx.createReducer({ counter: 0, other: 10 }),
  }, { sqlite: { driver, eager: ['flat'] } })] });
  core = TestBed.inject(SqliteStoreCore);
  await TestBed.inject(Store).settle();
  const cache = TestBed.inject(PathCache);
  const sources = withQueries ? [1, 2].flatMap((factor) => querySources(createQuerySelector({
    path: 'flat', key: `refresh-factor-${factor}`, initial: 0,
  }, async (sql) => {
    const [row] = await sql.query<{ value: string }>(
      'SELECT value AS value FROM nss_node WHERE path = ?', ['flat/counter'], ['value'],
    );
    return Number(row.value) * factor;
  }))) : [];
  cache.registerQueries(sources);
  for (const source of sources) releases.push(cache.retain(source.id));
  if (sources.length) await cache.ensureMany(sources.map((source) => source.id));
  return { driver, cache, sources };
}

async function persistedCounter(value: number) {
  await core!.engine.transaction(async (tx) => {
    await tx.run('UPDATE nss_node SET value = ? WHERE path = ?', [String(value), 'flat/counter']);
    tx.changes.add('flat/counter');
  });
}

describe('query work during cache refresh', () => {
  it('refreshes the persisted physical value without a query batch transport', async () => {
    const { cache, driver } = await boot();
    await persistedCounter(1);
    const query = vi.spyOn(driver, 'query');
    await cache.refresh();
    expect(cache.view).toEqual({ flat: { counter: 1, other: 10 } });
    expect(query.mock.calls.filter(([sql]) => sql.includes(' AS slot'))).toHaveLength(0);
  });

  it('shares one query reader across dirty queries after the physical refresh', async () => {
    const { cache, driver, sources } = await boot(true);
    await persistedCounter(3);
    const query = vi.spyOn(driver, 'query');
    await cache.refresh();
    expect(sources.map((source) => cache.queryValues(sources).get(source.id))).toEqual([3, 6]);
    const batches = query.mock.calls.filter(([sql]) => sql.includes(' AS slot'));
    expect(batches).toHaveLength(1);
    expect(batches[0][0]).toContain('SELECT 0 AS slot');
    expect(batches[0][0]).toContain('SELECT 1 AS slot');
    expect(cache.view).toEqual({ flat: { counter: 3, other: 10 } });
  });

  it('preserves original-reader fallback when JSON batch transport fails', async () => {
    const { cache, driver, sources } = await boot(true);
    await persistedCounter(4);
    const original = driver.query.bind(driver);
    vi.spyOn(driver, 'query').mockImplementation(<R>(sql: string, params?: SqlValue[]) => {
      if (sql.includes(' AS slot')) return Promise.reject(new Error('Unsupported transport'));
      return original<R>(sql, params);
    });
    await cache.refresh();
    expect(sources.map((source) => cache.queryValues(sources).get(source.id))).toEqual([4, 8]);
  });

  it('rejects failed query work and permits an explicit later refresh to recover', async () => {
    const { cache, driver, sources } = await boot(true);
    await persistedCounter(5);
    const original = driver.query.bind(driver);
    let fail = true;
    vi.spyOn(driver, 'query').mockImplementation(<R>(sql: string, params?: SqlValue[]) => {
      if (fail && (sql.includes(' AS slot') || sql.startsWith('SELECT value AS value')))
        return Promise.reject(new Error('Read rejected'));
      return original<R>(sql, params);
    });
    await expect(cache.refresh()).rejects.toThrow('Read rejected');
    fail = false;
    await cache.refresh();
    expect(sources.map((source) => cache.queryValues(sources).get(source.id))).toEqual([5, 10]);
  });
});
