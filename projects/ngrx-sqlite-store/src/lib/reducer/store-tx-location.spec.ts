import { afterEach, describe, expect, it, vi } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { SCHEMA_MIGRATIONS } from '../schema/migrations';
import { NodeStore } from '../schema/node-store';
import { StorageEngine } from '../storage/storage-engine';
import { StoreTx } from './store-tx';

describe('transaction root locations', () => {
  const driver = new SqlJsDriver();
  const engine = new StorageEngine(driver, { migrations: SCHEMA_MIGRATIONS });
  afterEach(async () => { await engine.close(); vi.restoreAllMocks(); });

  it('keeps absent scalar descendants valid and invalidates them on container transitions and deletes', async () => {
    await engine.open();
    const nodes = new NodeStore();
    await engine.transaction((sql) => nodes.write(sql, 'flat', { a: 1, sibling: 8 }, sql.changes));
    await engine.transaction(async (sql) => {
      const cache = new Map<string, unknown>();
      const tx = new StoreTx('flat', nodes, sql, sql.changes, cache);
      expect(await tx.get('a/x')).toBeUndefined();
      await tx.set('a', 2);
      expect(await tx.get('a/x')).toBeUndefined();
      await tx.set('a', { x: 7 });
      expect(await tx.get('a/x')).toBe(7);
      await tx.set('a', null);
      expect(await tx.get('a/x')).toBeUndefined();
      await tx.set('a', { x: 9 });
      expect(await tx.get('a/x')).toBe(9);
      await tx.delete('a');
      expect(await tx.get('a/x')).toBeUndefined();
      expect(await tx.get('sibling')).toBe(8);
    });
    expect(await engine.read((sql) => nodes.read(sql, 'flat'))).toEqual({ sibling: 8 });
  });

  it('writes a known-absent feature root without looking up its location twice', async () => {
    await engine.open();
    const query = vi.spyOn(driver, 'query');
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('router', new NodeStore(), sql, sql.changes, new Map(), {
        peek: () => undefined, ready: () => true,
      });
      await tx.set('', { url: '/items/1' });
    });
    expect(query.mock.calls.filter(([text]) => text.includes('SELECT parent, pos'))).toHaveLength(0);
    expect(await engine.read((sql) => sql.query('SELECT parent,pos FROM nss_node WHERE path = ?', ['router'])))
      .toEqual([{ parent: null, pos: null }]);
    expect(await engine.read((sql) => new NodeStore().read(sql, 'router'))).toEqual({ url: '/items/1' });
  });

  it('honors an explicit location when replacing an absent or unannotated subtree', async () => {
    await engine.open();
    const query = vi.spyOn(driver, 'query');
    await engine.transaction(async (sql) => {
      await new NodeStore().diffWrite(sql, 'parent/child', undefined, 42, sql.changes,
        { parent: 'parent', pos: 7 });
    });
    expect(query.mock.calls.filter(([text]) => text.includes('SELECT parent, pos'))).toHaveLength(0);
    expect(await engine.read((sql) => sql.query('SELECT parent,pos,value FROM nss_node WHERE path = ?', ['parent/child'])))
      .toEqual([{ parent: 'parent', pos: 7, value: '42' }]);
  });
});
