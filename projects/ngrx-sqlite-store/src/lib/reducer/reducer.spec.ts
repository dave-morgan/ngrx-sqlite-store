import { createAction, props } from '@ngrx/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { SCHEMA_MIGRATIONS } from '../schema/migrations';
import { getNodeMeta } from '../schema/meta';
import { NodeStore } from '../schema/node-store';
import { StoragePolicy } from '../schema/policy';
import { StorageEngine } from '../storage/storage-engine';
import {
  createReducer,
  fromSyncReducer,
  getTxReducerMetadata,
  isTxReducer,
  NSS_TX_REDUCER,
  on,
  onState,
  runHandlers,
} from './reducer';
import { StoreTx } from './store-tx';

interface Slice {
  count: number;
  nested: { value: number };
  items: { id: number }[];
}
const initial: Slice = { count: 0, nested: { value: 1 }, items: [{ id: 1 }, { id: 2 }] };
const add = createAction('add', props<{ amount: number }>());

describe('transaction reducer authoring', () => {
  let engine: StorageEngine;
  let nodes: NodeStore;
  beforeEach(async () => {
    engine = new StorageEngine(new SqlJsDriver(), { migrations: SCHEMA_MIGRATIONS });
    nodes = new NodeStore(new StoragePolicy({ hints: { items: 'collection' } }));
    await engine.open();
    await engine.transaction((sql) => nodes.write(sql, 'slice', initial, sql.changes));
  });
  afterEach(async () => {
    await engine.close();
  });

  it('brands a synchronous safe reducer and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const reducer = createReducer(initial);
      expect(isTxReducer(reducer)).toBe(true);
      expect(Object.getOwnPropertyDescriptor(reducer, NSS_TX_REDUCER)?.enumerable).toBe(false);
      expect(getTxReducerMetadata(reducer).initialState).toBe(initial);
      expect(reducer(undefined, add({ amount: 1 }))).toBe(initial);
      expect(reducer(initial, add({ amount: 1 }))).toBe(initial);
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('still awaits a foreign reducer for an unknown action', async () => {
    const classic = vi.fn((state: Slice = initial) => state);
    const reducer = fromSyncReducer(classic);
    classic.mockClear();
    await engine.transaction(async (sql) => {
      const work = runHandlers(reducer, new StoreTx('slice', nodes, sql, sql.changes), { type: 'unknown' });
      expect(work).toBeInstanceOf(Promise);
      await work;
      expect(classic).toHaveBeenCalledExactlyOnceWith(expect.anything(), { type: 'unknown' });
    });
  });

  it('executes imperative writes then returned partials in registration order', async () => {
    const reducer = createReducer(
      initial,
      on(add, async (tx, action) => {
        await tx.set('count', action.amount);
        return { count: (await tx.get<number>('count')) + 1 };
      }),
      onState(add, (state, action) => ({ ...state, count: state.count + action.amount })),
    );
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('slice', nodes, sql, sql.changes, new Map(), undefined, initial);
      await runHandlers(reducer, tx, add({ amount: 3 }));
    });
    expect(await engine.read((sql) => nodes.read(sql, 'slice'))).toEqual({ ...initial, count: 7 });
  });

  it('bridges classic reducers for every action and seeds with INIT', async () => {
    const reducer = fromSyncReducer((state: Slice = initial, action) =>
      action.type === 'add' ? { ...state, count: state.count + 5 } : state,
    );
    expect(getTxReducerMetadata(reducer).initialState).toBe(initial);
    await engine.transaction(async (sql) => {
      await runHandlers(reducer, new StoreTx('slice', nodes, sql, sql.changes), add({ amount: 1 }));
    });
    expect(await engine.read((sql) => nodes.read(sql, 'slice'))).toEqual({ ...initial, count: 5 });
  });

  it('shares references for exact and ancestor reads and invalidates stale committed values', async () => {
    const stale = (await engine.read((sql) => nodes.read(sql, 'slice'))) as Slice;
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('slice', nodes, sql, sql.changes, new Map(), {
        peek: (path) => (path === 'slice' ? stale : undefined),
      });
      expect(await tx.get()).toBe(stale);
      expect(await tx.get('nested')).toBe(stale.nested);
      await tx.set('nested/value', 8);
      expect(await tx.get('nested/value')).toBe(8);
      expect(await tx.get<Slice>()).toEqual({ ...initial, nested: { value: 8 } });
      expect(await tx.get()).toBe(await tx.get());
    });
    expect(await engine.read((sql) => nodes.read(sql, 'slice'))).toEqual({
      ...initial,
      nested: { value: 8 },
    });
  });

  it('derives array elements by their hidden ids and writes inline descendants', async () => {
    await engine.transaction(async (sql) => {
      const tx = new StoreTx<Slice>('slice', nodes, sql, sql.changes);
      const items = await tx.get<Slice['items']>('items');
      const elementId = getNodeMeta(items)!.elementIds![0];
      expect(await tx.get(`items/${elementId}`)).toBe(items[0]);
      await tx.set(`items/${elementId}/id`, 10);
      expect(await tx.get('items')).toEqual([{ id: 10 }, { id: 2 }]);
    });
  });

  it('keeps stable row ids through multiple array edits in one transaction', async () => {
    await engine.transaction(async (sql) => {
      const tx = new StoreTx<Slice>('slice', nodes, sql, sql.changes);
      const before = getNodeMeta(await tx.get('items'))!.elementIds!;
      await tx.insert('items', { id: 3 });
      await tx.move('items', 2, 0);
      const persisted = await nodes.read(sql, 'slice/items');
      const after = getNodeMeta(persisted)!.elementIds!;
      expect(after.slice(1)).toEqual(before);
    });
  });

  it('leaves arrays and the change set unchanged when deleting a missing hidden id', async () => {
    await engine.transaction(async (sql) => {
      const tx = new StoreTx<Slice>('slice', nodes, sql, sql.changes);
      const items = await tx.get('items');
      await tx.delete('items/#missing');
      expect(await tx.get('items')).toBe(items);
      expect(await nodes.read(sql, 'slice/items')).toEqual(initial.items);
      expect(sql.changes.isEmpty).toBe(true);
    });
  });

  it('does not write when deleting a missing object property', async () => {
    await engine.transaction(async (sql) => {
      const tx = new StoreTx<Slice>('slice', nodes, sql, sql.changes);
      const nested = await tx.get('nested');
      await tx.delete('nested/missing');
      expect(await tx.get('nested')).toBe(nested);
      expect(sql.changes.isEmpty).toBe(true);
    });
  });

  it('removes an inline array element without converting its container to an object', async () => {
    await engine.transaction(async (sql) => {
      const tx = new StoreTx<Slice>('slice', nodes, sql, sql.changes);
      await tx.set('nested/list', ['first', 'second', 'third']);
      await tx.delete('nested/list/1');
      expect(await tx.get('nested/list')).toEqual(['first', 'third']);
      const persisted = await nodes.read(sql, 'slice/nested/list');
      expect(Array.isArray(persisted)).toBe(true);
      expect(persisted).toEqual(['first', 'third']);
    });
  });

  it('removes hidden array ids and preserves the remaining id', async () => {
    await engine.transaction(async (sql) => {
      const tx = new StoreTx<Slice>('slice', nodes, sql, sql.changes);
      const ids = getNodeMeta(await tx.get('items'))!.elementIds!;
      await tx.delete(`items/${ids[0]}`);
      const remaining = await tx.get('items');
      expect(remaining).toEqual([{ id: 2 }]);
      expect(getNodeMeta(remaining)!.elementIds).toEqual([ids[1]]);
    });
  });
  it('resets a foreign reducer with undefined initial state by removing its subtree', async () => {
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('slice', nodes, sql, sql.changes);
      await tx.resetFeature();
      expect(await tx.get()).toBeUndefined();
      expect(await nodes.read(sql, 'slice')).toBeUndefined();
    });
  });
  it('patches, inserts, moves, removes, deletes and resets', async () => {
    let resetAll = false;
    await engine.transaction(async (sql) => {
      const tx = new StoreTx<Slice>(
        'slice',
        nodes,
        sql,
        sql.changes,
        new Map(),
        undefined,
        initial,
        async () => {
          resetAll = true;
        },
      );
      await tx.patch('nested', { value: 9 });
      await tx.insert('items', { id: 3 });
      await tx.move('items', 2, 0);
      await tx.removeAt('items', 1);
      expect(await tx.get('items')).toEqual([{ id: 3 }, { id: 2 }]);
      await tx.delete('nested/value');
      expect(await tx.get('nested')).toEqual({});
      await tx.resetFeature();
      expect(await tx.get()).toEqual(initial);
      await tx.resetAll();
      expect(resetAll).toBe(true);
      expect(sql.changes.overlaps('slice')).toBe(true);
    });
  });
});
