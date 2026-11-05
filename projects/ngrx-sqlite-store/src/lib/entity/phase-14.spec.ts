import { TestBed } from '@angular/core/testing';
import { createAction, props } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { createEntityAdapter } from '../../../entity/src/entity-adapter';
import type { Where } from '../../../entity/src/query';
import { countingDriver } from '../../../spikes/bridge-cost-workload';
import { createReducer, on } from '../reducer/reducer';
import type { StoreTx } from '../reducer/store-tx';
import { createFeatureSelector } from '../selectors/selectors';
import { querySources } from '../selectors/metadata';
import { createQuerySelector } from '../selectors/query-selector';
import { PathCache } from '../selectors/path-cache';
import { RowWriter } from '../schema/row-writer';
import { provideStore } from '../store/provide';
import { Store } from '../store/store';
import { StorageEngine } from '../storage/storage-engine';
import { entityChanges } from '../storage/entity-changes';
import type { ChangeSet } from '../storage/change-set';

interface Item {
  key: number;
  done: boolean;
  title: string;
  rank: number;
  nested?: { value: number | null };
}
const perform = createAction('[Phase14] perform', props<{ run: (tx: StoreTx) => Promise<void> }>());
let engine: StorageEngine;
afterEach(async () => {
  TestBed.resetTestingModule();
  await engine?.close();
});

async function setup(mode: 'none' | 'key' | 'comparer' = 'none', lruSize = 0) {
  const { driver, counts } = countingDriver();
  const adapter = createEntityAdapter<Item>({
    selectId: (row) => row.key,
    ...(mode === 'key' ? { sortKey: (row: Item) => row.rank } : {}),
    ...(mode === 'comparer' ? { sortComparer: (a: Item, b: Item) => a.rank - b.rank } : {}),
  });
  const initial = adapter.getInitialState();
  const source = createFeatureSelector<typeof initial>('items');
  TestBed.configureTestingModule({
    providers: [
      provideStore(
        {
          items: createReducer(
            initial,
            on(perform, (tx, { run }) => run(tx)),
          ),
        },
        { sqlite: { driver, lruSize } },
      ),
    ],
  });
  const store = TestBed.inject(Store);
  engine = TestBed.inject(StorageEngine);
  await store.settle();
  const run = (work: (tx: StoreTx) => Promise<void>) => store.dispatchAsync(perform({ run: work }));
  await run((tx) =>
    adapter.setAll(
      tx,
      Array.from({ length: 15 }, (_, key) => ({
        key,
        done: key % 3 === 0,
        rank: key % 5,
        title: `Title ${key}`,
        nested: { value: key % 4 },
      })),
    ),
  );
  const queries = adapter.query(source);
  const observe = async <T>(selector: (state: object) => T) => {
    let value: T;
    const sub = store.select(selector).subscribe((next) => {
      value = next;
    });
    await firstValueFrom(store.select(selector));
    return {
      get value() {
        return value!;
      },
      stop: () => sub.unsubscribe(),
    };
  };
  return { adapter, store, run, queries, observe, counts, cache: TestBed.inject(PathCache) };
}

describe('Phase 14 query maintenance', () => {
  it.each(['none', 'key', 'comparer'] as const)(
    'matches fresh SQL after seeded random mutations and where trees (%s)',
    async (mode) => {
      const { adapter, run, queries, observe } = await setup(mode);
      let seed = 0x14ad33;
      const random = (n: number) => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return Math.floor((seed / 0x100000000) * n);
      };
      const tree = (depth = 0): Where => {
        if (depth < 3 && random(3) !== 0) {
          const children = Array.from({ length: random(4) }, () => tree(depth + 1));
          return random(3) === 0
            ? { not: tree(depth + 1) }
            : random(2)
              ? { and: children }
              : { or: children };
        }
        const leaves: Where[] = [
          { done: !!random(2) },
          { rank: { gte: random(6) } },
          { 'nested.value': { ne: null } },
          { key: { in: [random(20), random(20)] } },
          { title: { like: '%1%' } },
          { missing: null },
        ];
        return leaves[random(leaves.length)];
      };
      const wheres = [{}, { done: false }, ...Array.from({ length: 6 }, () => tree())];
      const selectors: ((state: object) => unknown)[] = wheres.flatMap((where, i) => [
        queries.count(where),
        queries.exists(where),
        queries.ids(where),
        queries.page({ where, offset: i % 4, limit: i % 3 === 0 ? 0 : 5 }),
      ]);
      const observed = await Promise.all(selectors.map((selector) => observe(selector)));
      for (let step = 0; step < 90; step++) {
        const key = random(22);
        const item: Item = {
          key,
          rank: random(7),
          done: !!random(2),
          title: `Title ${random(30)}`,
          ...(random(3) ? { nested: { value: random(3) ? random(10) : null } } : {}),
        };
        const operation = random(7);
        await run(async (tx) => {
          if (operation === 0) await adapter.addOne(tx, item);
          else if (operation === 1) await adapter.removeOne(tx, key);
          else if (operation === 2) await adapter.updateOne(tx, { id: key, changes: item });
          else if (operation === 3)
            await adapter.mapOne(tx, { id: key, map: (row) => ({ ...row, done: !row.done }) });
          else if (operation === 4) await adapter.upsertOne(tx, item);
          else if (operation === 5) {
            await adapter.updateOne(tx, { id: key, changes: { done: true } });
            await adapter.updateOne(tx, { id: key, changes: { done: false, title: item.title } });
          } else {
            await adapter.removeOne(tx, key);
            await adapter.addOne(tx, item);
          }
        });
        for (const [index, selector] of selectors.entries()) {
          const fresh = await engine.read((sql) => querySources(selector)[0].reader(sql));
          expect(
            observed[index].value,
            `mode ${mode}, step ${step}, op ${operation}, query ${index}`,
          ).toEqual(fresh);
        }
      }
      observed.forEach((value) => value.stop());
    },
    30000,
  );

  it('patches only the changed page row, keeps ids and aggregates fresh without SQL, and serves the next update', async () => {
    const { run, adapter, queries, observe, counts, cache } = await setup();
    const page = await observe(queries.page({ offset: 0, limit: 5 }));
    const ids = await observe(queries.ids());
    const count = await observe(queries.count({ done: false }));
    const exists = await observe(queries.exists({ done: false }));
    const before = page.value;
    const beforeIds = ids.value;
    for (const title of ['changed', 'again']) {
      counts.statements = 0;
      await run((tx) => adapter.updateOne(tx, { id: 1, changes: { title } }));
      expect(counts.statements).toBe(1);
      expect(page.value[1].title).toBe(title);
      expect(cache.peekEntity('items', 'n:1')?.data).toContain(title);
      expect(ids.value).toBe(beforeIds);
      expect(count.value).toBe(10);
      expect(exists.value).toBe(true);
    }
    expect(page.value).not.toBe(before);
    expect(page.value[0]).toBe(before[0]);
    expect(page.value[2]).toBe(before[2]);
    const unchanged = page.value;
    await run((tx) => adapter.updateOne(tx, { id: 1, changes: { title: 'again' } }));
    expect(page.value).toBe(unchanged);
    [page, ids, count, exists].forEach((value) => value.stop());
  });

  it('preserves aggregate deltas across reorder then update and update then reorder', async () => {
    const { run, adapter, queries, observe } = await setup();
    const count = await observe(queries.count({ done: false }));
    await run(async (tx) => {
      await tx.entities().setPosition(1, 30);
      await adapter.updateOne(tx, { id: 1, changes: { done: true } });
    });
    expect(count.value).toBe(9);
    await run(async (tx) => {
      await adapter.updateOne(tx, { id: 2, changes: { done: true } });
      await tx.entities().setPosition(2, 31);
    });
    expect(count.value).toBe(8);
    count.stop();
  });

  it('always reruns generic readers and unknown row mutations', async () => {
    const { run, adapter, queries, observe } = await setup();
    let reads = 0;
    const generic = await observe(
      createQuerySelector({ path: 'items', key: 'sql', initial: 0 }, async (sql) => {
        reads++;
        return (
          await sql.query<{ n: number }>('SELECT count(*) AS n FROM nss_entity WHERE coll = ?', [
            'items',
          ])
        )[0].n;
      }),
    );
    const count = await observe(queries.count({ done: false }));
    const before = reads;
    await run((tx) => adapter.updateOne(tx, { id: 1, changes: { title: 'hello' } }));
    expect(reads).toBe(before + 1);
    await engine.transaction(async (sql) => {
      await new RowWriter(sql, sql.changes, 1048576).updateEntity(
        'items',
        'n:1',
        JSON.stringify({ key: 1, done: true, title: 'unknown', rank: 0 }),
      );
    });
    await TestBed.inject(PathCache).refresh();
    expect(count.value).toBe(9);
    expect(generic.value).toBe(15);
    generic.stop();
    count.stop();
  });

  it('incrementally inserts and deletes matching rows, including duplicate and multi-write cases', async () => {
    const { run, adapter, queries, observe, counts } = await setup();
    const count = await observe(queries.count({ done: false }));
    const exists = await observe(queries.exists({ key: 90 }));
    counts.trace.length = 0;
    await run((tx) => adapter.addOne(tx, { key: 90, done: false, title: 'new', rank: 0 }));
    expect(count.value).toBe(11);
    expect(exists.value).toBe(true);
    expect(counts.trace.some((sql) => sql.includes('json_group_array'))).toBe(false);
    await run(async (tx) => {
      await adapter.addOne(tx, { key: 90, done: true, title: 'duplicate', rank: 1 });
      await adapter.updateOne(tx, { id: 90, changes: { done: true } });
      await adapter.addOne(tx, { key: 90, done: false, title: 'duplicate again', rank: 2 });
    });
    expect(count.value).toBe(10);
    expect(exists.value).toBe(true);
    counts.trace.length = 0;
    await run((tx) => adapter.removeOne(tx, 90));
    expect(count.value).toBe(10);
    expect(exists.value).toBe(false);
    expect(counts.trace.some((sql) => sql.includes('json_group_array'))).toBe(false);
    count.stop();
    exists.stop();
  });

  it('batches generic SQL reruns and entity queries after mixed path refresh', async () => {
    const { run, adapter, queries, observe, counts, store } = await setup();
    const generic = (key: string) =>
      createQuerySelector(
        { path: 'items', key, initial: 0 },
        async (sql) =>
          (
            await sql.query<{ total: number }>(
              'SELECT count(*) AS total FROM nss_entity WHERE coll = ?;',
              ['items'],
            )
          )[0].total,
      );
    const a = await observe(generic('a'));
    // Interleave a path entry to exercise refresh ordering independently of registration order.
    const path = store.select('items', 'ids').subscribe();
    await firstValueFrom(store.select('items', 'ids'));
    const b = await observe(generic('b'));
    const page = await observe(queries.page({ offset: 0, limit: 3 }));
    counts.trace.length = 0;
    await run((tx) => adapter.addOne(tx, { key: 91, done: false, title: 'new', rank: 0 }));
    expect(counts.trace.filter((sql) => sql.includes('AS slot'))).toHaveLength(1);
    expect(counts.trace.find((sql) => sql.includes('AS slot'))?.match(/AS slot/g)).toHaveLength(3);
    expect(a.value).toBe(16);
    expect(b.value).toBe(16);
    a.stop();
    b.stop();
    page.stop();
    path.unsubscribe();
  });

  it('falls back to row transport when a UTF-8 JSON query cell exceeds the cap', async () => {
    const { run, adapter, queries, observe, counts } = await setup();
    const title = '😀'.repeat(150000);
    await run((tx) =>
      adapter.setAll(tx, [
        { key: 1, done: false, rank: 0, title },
        { key: 2, done: false, rank: 0, title },
      ]),
    );
    counts.trace.length = 0;
    const page = await observe(queries.page({ offset: 0, limit: 2 }));
    expect(page.value.map((row) => row.title)).toEqual([title, title]);
    expect(counts.trace.filter((sql) => sql.includes('AS slot'))).toHaveLength(1);
    expect(counts.trace.filter((sql) => sql.startsWith('WITH promoted'))).toHaveLength(1);
    page.stop();
  });

  it('never uses dirty page rows for a subsequent transaction or re-lease', async () => {
    const { run, adapter, queries, observe, cache } = await setup('none', 32);
    const selector = queries.page({ offset: 0, limit: 5 });
    const page = await observe(selector);
    const commits = engine.changes$.subscribe(() => {
      expect(cache.peekEntity('items', 'n:1')).toBeUndefined();
    });
    await run((tx) => adapter.updateOne(tx, { id: 1, changes: { done: true } }));
    expect(page.value[1].done).toBe(true);
    page.stop();
    await run((tx) => adapter.updateOne(tx, { id: 1, changes: { title: 'cold' } }));
    const reloaded = await observe(selector);
    expect(reloaded.value[1]).toMatchObject({ done: true, title: 'cold' });
    commits.unsubscribe();
    reloaded.stop();
  });

  it('keeps generic SQL numbers and strings exact through batched reruns', async () => {
    const { run, adapter, observe } = await setup();
    const selector = createQuerySelector(
      { path: 'items', key: 'real', initial: [] as { real: number; text: string }[] },
      (sql) =>
        sql.query<{ real: number; text: string }>('SELECT ? AS real, ? AS text', [
          1.2345678901234567,
          '1.2345678901234567',
        ]),
    );
    const result = await observe(selector);
    const before = result.value;
    await run((tx) => adapter.updateOne(tx, { id: 1, changes: { done: true } }));
    expect(result.value).toEqual(before);
    expect(result.value[0].real).toBe(1.2345678901234567);
    result.stop();
  });

  it('preserves duplicate and wildcard SQL column semantics on every refresh', async () => {
    const { run, adapter, observe } = await setup();
    const generic = await observe(
      createQuerySelector(
        { path: 'items', key: 'duplicate', initial: [] as { x: number }[] },
        (sql) => sql.query<{ x: number }>('SELECT 1 AS x, 2 AS x'),
      ),
    );
    expect(generic.value).toEqual([{ x: 2 }]);
    await run((tx) => adapter.updateOne(tx, { id: 1, changes: { done: true } }));
    expect(generic.value).toEqual([{ x: 2 }]);
    generic.stop();
  });

  it('releases entity payload journals when a query becomes inactive before refresh', async () => {
    const { run, adapter, observe, queries, cache } = await setup('none', 32);
    const selector = queries.count();
    const result = await observe(selector);
    const stopAtCommit = engine.changes$.subscribe(() => result.stop());
    await run((tx) => adapter.updateOne(tx, { id: 1, changes: { title: 'large'.repeat(10000) } }));
    const id = querySources(selector)[0].id;
    const entry = (cache as unknown as { entries: Map<string, { dirty: ChangeSet }> }).entries.get(
      id,
    )!;
    expect(entry.dirty.isEmpty).toBe(false);
    expect(entityChanges(entry.dirty).size).toBe(0);
    stopAtCommit.unsubscribe();
    const again = await observe(selector);
    expect(again.value).toBe(15);
    again.stop();
  });

  it('incrementally clears all rows and retains exact exists multiplicities', async () => {
    const { run, adapter, queries, observe, counts } = await setup();
    const exists = await observe(queries.exists({ done: false }));
    const count = await observe(queries.count({ done: false }));
    await run((tx) => adapter.removeMany(tx, [1, 2]));
    expect(exists.value).toBe(true);
    expect(count.value).toBe(8);
    counts.trace.length = 0;
    await run((tx) => adapter.removeAll(tx));
    expect(exists.value).toBe(false);
    expect(count.value).toBe(0);
    expect(counts.trace.some((sql) => sql.includes('AS slot'))).toBe(false);
    exists.stop();
    count.stop();
  });

  it('recounts an inline whole-collection replacement in JS and falls back after later writes', async () => {
    const { run, adapter, queries, observe, counts } = await setup();
    const open = await observe(queries.count({ done: false }));
    const all = await observe(queries.count());
    const ranked = await observe(queries.exists({ rank: { gte: 7 } }));
    const rows = (n: number, offset = 0): Item[] =>
      Array.from({ length: n }, (_, i) => ({ key: i + offset, done: i % 4 === 0, title: `R${i}`, rank: i % 9 }));
    counts.trace.length = 0;
    await run((tx) => adapter.setAll(tx, rows(40)));
    expect([open.value, all.value, ranked.value]).toEqual([30, 40, true]);
    expect(counts.trace.some((sql) => sql.includes('nss_entity') && /COUNT\(/i.test(sql))).toBe(false);
    // A later write to the replaced collection in the same transaction needs SQL.
    counts.trace.length = 0;
    await run(async (tx) => {
      await adapter.setAll(tx, rows(12, 100));
      await adapter.updateOne(tx, { id: 100, changes: { done: false } });
    });
    expect([open.value, all.value, ranked.value]).toEqual([10, 12, true]);
    expect(counts.trace.some((sql) => sql.includes('AS slot'))).toBe(true);
    // A replacement after other writes is still exact; duplicates count once.
    await run(async (tx) => {
      await adapter.removeOne(tx, 100);
      await adapter.setAll(tx, [...rows(5, 200), ...rows(5, 200)]);
    });
    expect([open.value, all.value, ranked.value]).toEqual([3, 5, false]);
    open.stop();
    all.stop();
    ranked.stop();
    const fresh = await observe(queries.count({ done: false }));
    expect(fresh.value).toBe(3);
    fresh.stop();
  });

  it('reads promoted page rows through the partial promoted index, not a collection scan', async () => {
    const { queries, observe, counts } = await setup();
    counts.trace.length = 0;
    const page = await observe(queries.page({ offset: 0, limit: 5 }));
    expect(page.value).toHaveLength(5);
    const statement = counts.trace.find((sql) => sql.includes('WITH promoted AS'))!;
    const params = (statement.match(/\?/g) ?? []).map(() => 'items');
    const plan = await engine.read((sql) =>
      sql.query<{ detail: string }>(`EXPLAIN QUERY PLAN ${statement}`, params),
    );
    const details = plan.map((row) => row.detail);
    expect(details.filter((detail) => detail.includes('nss_entity_sortkey'))).toHaveLength(1);
    expect(details.some((detail) => detail.includes('USING INDEX nss_entity_promoted'))).toBe(true);
    page.stop();
  });

  it('keeps SQL aggregates for replacements with promoted rows', async () => {
    const { run, adapter, queries, observe, counts } = await setup();
    const open = await observe(queries.count({ done: false }));
    counts.trace.length = 0;
    await run((tx) =>
      adapter.setAll(tx, [
        { key: 1, done: false, title: 'x'.repeat(1_100_000), rank: 0 },
        { key: 2, done: true, title: 'small', rank: 0 },
      ]),
    );
    expect(open.value).toBe(1);
    expect(counts.trace.some((sql) => sql.includes('AS slot'))).toBe(true);
    open.stop();
  });
});
