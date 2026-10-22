import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { brandEntityState } from '../schema/entity-brand';
import { SCHEMA_MIGRATIONS } from '../schema/migrations';
import { NodeStore } from '../schema/node-store';
import { StorageEngine } from '../storage/storage-engine';
import { StoreTx } from './store-tx';
import { entityChanges } from '../storage/entity-changes';

describe('transaction entities', () => {
  let engine: StorageEngine;
  const nodes = new NodeStore();
  beforeEach(async () => {
    engine = new StorageEngine(new SqlJsDriver(), { migrations: SCHEMA_MIGRATIONS });
    await engine.open();
    await engine.transaction(async (sql) => {
      await nodes.write(
        sql,
        'items',
        brandEntityState({ ids: [1], entities: { 1: { id: 1, value: 'a' } }, extra: true }),
        sql.changes,
      );
    });
  });
  afterEach(async () => engine.close());

  it('does not parse its already validated canonical JSON during bulk replacement', async () => {
    const entity = { id: 0, value: 'canonical bulk value "\\\n😀' };
    const text = JSON.stringify(entity);
    const parse = vi.spyOn(JSON, 'parse');
    try {
      await engine.transaction(async (sql) => {
        const rows = new StoreTx('items', nodes, sql, sql.changes).entities<typeof entity>('');
        await rows.replaceAll(Array.from({ length: 220 }, (_, id) => ({ id, entity })));
      });
      expect(parse.mock.calls.filter(([value]) => value === text)).toEqual([]);
    } finally {
      parse.mockRestore();
    }
    expect(await engine.read((sql) => sql.query('SELECT COUNT(*) AS count FROM nss_entity WHERE coll = ?', ['items']))).toEqual([{ count: 220 }]);
  });

  it('shares empty changed-field sets for inserts, deletes and reorders', async () => {
    await engine.transaction(async (sql) => {
      const rows = new StoreTx('items', nodes, sql, sql.changes).entities<{ id: number; value: string }>('');
      await rows.insert([{ id: 2, entity: { id: 2, value: 'b' } }, { id: 3, entity: { id: 3, value: 'c' } }]);
      await rows.setPosition(1, 10);
      const changes = [...entityChanges(sql.changes).get('items')!.values()];
      expect(changes.map(({ kind }) => kind).sort()).toEqual(['insert', 'insert', 'reorder']);
      for (const change of changes) {
        expect([...change.fields]).toEqual([]);
        expect(change.fields).toBe(changes[0].fields);
      }
      await rows.remove([1]);
      const deleted = [...entityChanges(sql.changes).get('items')!.values()].find(({ kind }) => kind === 'delete')!;
      expect(deleted.fields).toBe(changes[0].fields);
    });
  });

  it('retains exact changed fields for updates', async () => {
    await engine.transaction(async (sql) => {
      const rows = new StoreTx('items', nodes, sql, sql.changes).entities<{ id: number; value: string; added?: boolean }>('');
      await rows.update(1, { id: 1, value: 'updated', added: true });
      const [change] = entityChanges(sql.changes).get('items')!.values();
      expect(change.kind).toBe('update');
      expect([...change.fields].sort()).toEqual(['added', 'value']);
    });
  });

  it('updates a locally cached row without a read and one buffered UPDATE, invalidates cached state and preserves extras', async () => {
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('items', nodes, sql, sql.changes);
      await tx.get();
      const query = vi.spyOn(sql, 'query');
      const run = vi.spyOn(sql, 'write');
      const rows = tx.entities<{ id: number; value: string }>('');
      expect(await rows.get(1)).toEqual({ id: 1, value: 'a' });
      await rows.update(1, { id: 1, value: 'b' });
      expect(query).not.toHaveBeenCalled();
      expect(run).toHaveBeenCalledTimes(1);
      expect(run.mock.calls[0][0]).toMatch(/^UPDATE nss_entity/);
      expect(await tx.get()).toEqual({
        ids: [1],
        entities: { 1: { id: 1, value: 'b' } },
        extra: true,
      });
      expect(sql.changes.overlaps('items')).toBe(true);
    });
  });

  it('inserts, pages, upserts and removes typed IDs without disturbing insertion order', async () => {
    await engine.transaction(async (sql) => {
      const rows = new StoreTx('items', nodes, sql, sql.changes).entities<{
        id: string | number;
        value: string;
      }>('');
      await rows.insert([
        { id: '2', entity: { id: '2', value: 'c' } },
        { id: 1, entity: { id: 1, value: 'ignored' } },
      ]);
      expect(await rows.ids()).toEqual([1, '2']);
      await rows.upsert([{ id: 1, entity: { id: 1, value: 'd' } }]);
      expect(await rows.getMany(['2', 1, 'absent'])).toEqual([
        { id: '2', value: 'c' },
        { id: 1, value: 'd' },
        undefined,
      ]);
      expect((await rows.page(1, 1))[0].id).toBe('2');
      expect(await rows.has('absent')).toBe(false);
      await rows.remove([1]);
      expect(await rows.count()).toBe(1);
      await rows.clear();
      expect(await rows.ids()).toEqual([]);
    });
  });

  it('round trips promoted entities and deletes promoted nodes on replacement and removal', async () => {
    await engine.transaction(async (sql) => {
      const rows = new StoreTx('items', nodes, sql, sql.changes).entities<{
        id: number;
        value: string;
      }>('');
      const entity = { id: 2, value: 'x'.repeat(2_097_152) };
      await rows.insert([{ id: 2, entity }]);
      expect(await rows.get(2)).toEqual(entity);
      await rows.update(2, { id: 2, value: 'small' });
      expect(await rows.get(2)).toEqual({ id: 2, value: 'small' });
      await rows.upsert([{ id: 2, entity }]);
      await rows.remove([2]);
      expect(await sql.query('SELECT path FROM nss_node WHERE path LIKE ?', ['items/~2%'])).toEqual(
        [],
      );
    });
  });

  it('finds sorted positions using logarithmic single-row probes and renormalises exhausted gaps', async () => {
    await engine.transaction(async (sql) => {
      const rows = new StoreTx('items', nodes, sql, sql.changes).entities<{
        id: number;
        value: string;
      }>('');
      await rows.clear();
      await rows.insert(
        Array.from({ length: 128 }, (_, id) => ({ id, entity: { id, value: String(id) } })),
      );
      const query = vi.spyOn(sql, 'query');
      const pos = await rows.positionFor({ id: 50.5, value: '' }, (a, b) => a.id - b.id);
      const probes = query.mock.calls.filter(([statement]) => statement.includes('LIMIT 1 OFFSET'));
      expect(probes.length).toBeLessThanOrEqual(10);
      await rows.insert([{ id: 50.5, entity: { id: 50.5, value: '' } }], { pos });
      expect((await rows.ids()).slice(50, 53)).toEqual([50, 50.5, 51]);
      for (let id = 0; id < 40; id++) {
        const entity = { id: 50.5 + (id + 1) / 100, value: '' };
        await rows.insert([{ id: entity.id, entity }], {
          pos: await rows.positionFor(entity, (a, b) => a.id - b.id),
        });
      }
      const page = await rows.page(0, 200);
      expect(page.every((row, index) => index === 0 || row.pos > page[index - 1].pos)).toBe(true);
    });
  });

  it('retains valid sorted positions and relocates changed comparisons or preceding ties', async () => {
    await engine.transaction(async (sql) => {
      const rows = new StoreTx('items', nodes, sql, sql.changes).entities<{
        id: number;
        value: string;
      }>('');
      await rows.insert([
        { id: 2, entity: { id: 2, value: 'b' } },
        { id: 3, entity: { id: 3, value: 'c' } },
      ]);
      const compare = (a: { value: string }, b: { value: string }) =>
        a.value.localeCompare(b.value);
      expect(await rows.positionForUpdate(2, { id: 2, value: 'bb' }, compare)).toBe(2);
      const run = vi.spyOn(sql, 'write');
      await rows.update(2, { id: 2, value: 'bb' });
      expect(
        run.mock.calls.filter(([statement]) => statement.startsWith('UPDATE nss_entity SET pos')),
      ).toHaveLength(0);
      const moved = await rows.positionForUpdate(2, { id: 2, value: 'z' }, compare);
      expect(moved).toBeGreaterThan(3);
      await rows.update(2, { id: 2, value: 'z' });
      await rows.setPosition(2, moved);
      const tie = await rows.positionForUpdate(2, { id: 2, value: 'c' }, compare);
      expect(tie).toBeGreaterThan(1);
      expect(tie).toBeLessThan(3);
    });
  });

  it('streams pages without retaining raw rows in the targeted-read cache', async () => {
    await engine.transaction(async (sql) => {
      const rows = new StoreTx('items', nodes, sql, sql.changes).entities<{
        id: number;
        value: string;
      }>('');
      await rows.insert(
        Array.from({ length: 600 }, (_, index) => ({
          id: index + 2,
          entity: { id: index + 2, value: String(index) },
        })),
      );
      expect(await rows.page(0, 500)).toHaveLength(500);
      expect(await rows.page(500, 500)).toHaveLength(101);
      const query = vi.spyOn(sql, 'query');
      expect(await rows.get(2)).toEqual({ id: 2, value: '0' });
      expect(await rows.get(601)).toEqual({ id: 601, value: '599' });
      expect(query).toHaveBeenCalledTimes(2);
      await rows.update(2, { id: 2, value: 'updated' });
      expect((await rows.page(1, 1))[0].entity).toEqual({ id: 2, value: 'updated' });
    });
  });

  it('invalidates descendant collection row caches when replacing a promoted parent entity', async () => {
    await engine.transaction(async (sql) => {
      const tx = new StoreTx('items', nodes, sql, sql.changes);
      const parents = tx.entities<{ id: number; value: string; nested: object }>('');
      const make = (value: string) => ({
        id: 2,
        value: 'x'.repeat(1_048_576),
        nested: brandEntityState({ ids: [3], entities: { 3: { id: 3, value } } }),
      });
      await parents.insert([{ id: 2, entity: make('before') }]);
      const nested = tx.entities<{ id: number; value: string }>('~2n:2/nested');
      expect(await nested.get(3)).toEqual({ id: 3, value: 'before' });
      await parents.update(2, make('after'));
      expect(await nested.get(3)).toEqual({ id: 3, value: 'after' });
    });
  });
});
