import { TestBed } from '@angular/core/testing';
import * as ngrx from '@ngrx/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { escapeSegment } from '../storage/path';
import { SqliteStoreCore } from '../store/core';
import { provideStore } from '../store/provide';
import { Store } from '../store/store';
import { NSS_DEPS } from './metadata';
import { PathCache } from './path-cache';

type Scope = Record<string, Record<string, unknown>>;
const setValue = ngrx.createAction('[primitive scope] set', ngrx.props<{ value: unknown }>());
const removeValue = ngrx.createAction('[primitive scope] remove');
const sibling = ngrx.createAction('[primitive scope] sibling');
let core: SqliteStoreCore | undefined;

afterEach(async () => {
  vi.restoreAllMocks();
  TestBed.resetTestingModule();
  await core?.engine.close();
  core = undefined;
});

async function boot(key = 'counter', value: unknown = 0, missing = false) {
  const initial: Record<string, unknown> = {
    ...(!missing ? { [key]: value } : {}),
    unrelated: { list: [1, 2, 3] },
  };
  const reducer = ngrx.createReducer(initial,
    ngrx.on(setValue, (state, action) => ({ ...state, [key]: action.value })),
    ngrx.on(removeValue, (state) => Object.fromEntries(Object.entries(state).filter(([name]) => name !== key))),
    ngrx.on(sibling, (state) => ({ ...state, unrelated: { list: [4, 5, 6] } })),
  );
  TestBed.configureTestingModule({ providers: [provideStore({ flat: reducer }, {
    sqlite: { driver: new SqlJsDriver(), eager: ['flat'] },
  })] });
  const store = TestBed.inject(Store);
  core = TestBed.inject(SqliteStoreCore);
  await store.settle();
  return store;
}

function selectorFor(key: string, views: Scope[], project = (value: unknown) => value) {
  const selector = (state: Scope) => {
    views.push(state);
    return project(state['flat'][key]);
  };
  Object.defineProperty(selector, NSS_DEPS, { value: [`flat/${escapeSegment(key)}`] });
  return selector;
}

function isCounterScope(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Object.keys(value).join() !== 'flat') return false;
  const flat = (value as Scope)['flat'];
  return !!flat && Object.keys(flat).join() === 'counter';
}

describe('loaded singleton primitive selector scope', () => {
  it('keeps initial construction, old snapshots and unchanged-input suppression', async () => {
    const store = await boot();
    const views: Scope[] = [];
    const freeze = vi.spyOn(Object, 'freeze');
    const selected = store.selectSignal(selectorFor('counter', views));
    expect(selected()).toBe(0);
    expect(freeze.mock.calls.filter(([value]) => isCounterScope(value))).toHaveLength(1);
    const first = views[0];
    await store.dispatchAsync(setValue({ value: 1 }));
    expect(selected()).toBe(1);
    expect(first['flat']['counter']).toBe(0);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first['flat'])).toBe(true);
    expect(Object.keys(views.at(-1)!['flat'])).toEqual(['counter']);
    const calls = views.length;
    await store.dispatchAsync(sibling());
    expect(selected()).toBe(1);
    expect(views).toHaveLength(calls);
  });

  for (const key of ['a/b', '__proto__']) {
    it(`keeps escaped/own property ${key} isolated`, async () => {
      const store = await boot(key);
      const views: Scope[] = [];
      const selected = store.selectSignal(selectorFor(key, views));
      expect(selected()).toBe(0);
      await store.dispatchAsync(setValue({ value: 1 }));
      expect(selected()).toBe(1);
      const flat = views.at(-1)!['flat'];
      expect(Object.keys(flat)).toEqual([key]);
      expect(Object.hasOwn(flat, key)).toBe(true);
      expect(Object.getPrototypeOf(flat)).toBe(Object.prototype);
      expect(views[0]['flat'][key]).toBe(0);
    });
  }

  it('preserves own undefined for a loaded missing source across add/remove', async () => {
    const store = await boot('counter', 0, true);
    const views: Scope[] = [];
    const selected = store.selectSignal(selectorFor('counter', views));
    await store.settle();
    expect(selected()).toBeUndefined();
    expect(Object.hasOwn(views.at(-1)!['flat'], 'counter')).toBe(true);
    await store.dispatchAsync(setValue({ value: 2 }));
    expect(selected()).toBe(2);
    await store.dispatchAsync(removeValue());
    expect(selected()).toBeUndefined();
    expect(Object.hasOwn(views.at(-1)!['flat'], 'counter')).toBe(true);
    expect(views[0]['flat']['counter']).toBeUndefined();
  });

  it('keeps object/primitive transitions and nested old values immutable', async () => {
    const store = await boot('counter', { x: 1 });
    const views: Scope[] = [];
    const selected = store.selectSignal(selectorFor('counter', views));
    const before = selected();
    await store.dispatchAsync(setValue({ value: 2 }));
    expect(selected()).toBe(2);
    await store.dispatchAsync(setValue({ value: { x: 3 } }));
    expect(selected()).toEqual({ x: 3 });
    expect(before).toEqual({ x: 1 });
    expect(Object.isFrozen(before)).toBe(true);
    expect(Object.isFrozen(selected())).toBe(true);
  });

  it('recovers projector failure on a later primitive value', async () => {
    const store = await boot();
    const selected = store.selectSignal(selectorFor('counter', [], (value) => {
      if (value === 1) throw new Error('primitive projection');
      return value;
    }));
    expect(selected()).toBe(0);
    await store.dispatchAsync(setValue({ value: 1 }));
    expect(() => selected()).toThrow('primitive projection');
    await store.dispatchAsync(setValue({ value: 2 }));
    expect(selected()).toBe(2);
  });

  it('tears down its single lease without retaining unrelated state', async () => {
    const store = await boot();
    const views: Scope[] = [];
    const selector = selectorFor('counter', views);
    const emitted: unknown[] = [];
    const subscription = store.select(selector).subscribe((value) => emitted.push(value));
    await store.dispatchAsync(setValue({ value: 1 }));
    expect(emitted).toEqual([0, 1]);
    expect(Object.keys(views.at(-1)!['flat'])).toEqual(['counter']);
    const cache = TestBed.inject(PathCache);
    const evicted = vi.spyOn(cache, 'whenEvicted');
    subscription.unsubscribe();
    expect(evicted).toHaveBeenCalledWith(['flat/counter'], selector);
    const calls = views.length;
    await store.dispatchAsync(setValue({ value: 2 }));
    expect(views).toHaveLength(calls);
    expect(emitted).toEqual([0, 1]);
  });
});
