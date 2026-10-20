import { createEntityAdapter } from '../entity/src/entity-adapter';
import { StoreTx } from '../src/lib/reducer/store-tx';
import { NodeStore } from '../src/lib/schema/node-store';
import { ChangeSet } from '../src/lib/storage/change-set';
import { assert, cells, database, environment, measure, method, report } from './common';
import type { Sample } from './common';

interface Entity {
  id: number;
  rank: number;
  title: string;
}
const comparer = (left: Entity, right: Entity) => left.rank - right.rank;
export async function q1(): Promise<void> {
  const lines: string[] = [];
  const results = new Map<string, Sample>();
  for (const count of [1_000, 10_000, 50_000]) {
    // Permutation avoids feeding setAll an already ordered array.
    const entities = Array.from({ length: count }, (_, id) => ({
      id,
      rank: ((id * 7919) % count) * 2,
      title: `Note ${id}`,
    }));
    for (const strategy of ['A', 'B', 'C'] as const) {
      const meter = await database();
      try {
        const adapter = createEntityAdapter<Entity>({
          ...(strategy === 'B'
            ? { sortKey: (entity: Entity) => entity.rank }
            : { sortComparer: strategy === 'A' ? comparer : false }),
        });
        const tx = () => new StoreTx('items', new NodeStore(), meter, new ChangeSet());
        await meter.driver.begin();
        await adapter.setAll(tx(), entities);
        await meter.driver.commit();
        const read = async (page: boolean): Promise<number[]> => {
          if (strategy === 'C') {
            const rows = await meter.query<{ data: string }>(
              'SELECT data FROM nss_entity WHERE coll = ?',
              ['items'],
            );
            const sorted = rows
              .map((row) => JSON.parse(row.data) as Entity)
              .sort(comparer)
              .map((entity) => entity.id);
            return page ? sorted.slice(0, 50) : sorted;
          }
          const collection = tx().entities<Entity>();
          return page
            ? (await collection.page(0, 50)).map((row) => Number(row.id))
            : (await collection.ids()).map(Number);
        };
        const inserted = { id: count, rank: count + 1, title: 'Inserted' };
        const moved = { ...entities[0], rank: count * 2 + 1 };
        const operations = {
          insert: async () => {
            await adapter.addOne(tx(), inserted);
          },
          move: async () => {
            await adapter.updateOne(tx(), { id: moved.id, changes: moved });
          },
          setAll: async () => {
            await adapter.setAll(tx(), entities);
          },
          ids: async () => {
            await read(false);
          },
          page50: async () => {
            await read(true);
          },
        };
        for (const [operation, execute] of Object.entries(operations)) {
          const sample = await measure(meter, execute);
          results.set(`${count}/${strategy}/${operation}`, sample);
          lines.push(`| ${count} | ${strategy} | ${operation} | ${cells(sample)} |`);
        }
        const expected = [...entities].sort(comparer).map((entity) => entity.id);
        assert.deepEqual(await read(false), expected);
        assert.deepEqual(await read(true), expected.slice(0, 50));
        for (const operation of ['insert', 'move'] as const) {
          await meter.driver.begin();
          await operations[operation]();
          const models =
            operation === 'insert'
              ? [...entities, inserted]
              : entities.map((entity) => (entity.id === moved.id ? moved : entity));
          assert.deepEqual(
            await read(false),
            models.sort(comparer).map((entity) => entity.id),
          );
          await meter.driver.rollback();
        }
      } finally {
        await meter.driver.close();
      }
      console.log(`Q1 ${count} ${strategy}`);
    }
  }
  const get = (strategy: string, op: string) => results.get(`50000/${strategy}/${op}`)!;
  await report(
    'q1',
    `# Q1 — Entity sort strategies

## Method and environment
${environment}

${method}

A uses the actual createEntityAdapter sortComparer operations, EntityTx binary search and RowWriter. B uses the production sortKey adapter (numeric rank), sortable IEEE-754 hex encoding and migration v3 index on (coll,sortkey,pos). Data and keys are written together by RowWriter; key-changing updates use its capped metadata update. C uses the unsorted adapter and sorts every read in JS. All strategies run the current schema, including both entity indexes. Deterministic distinct ranks and scrambled input; inserts go to the middle and updates move the first entity to the end. setAll replaces N existing rows. Full/page reads use EntityTx.ids/page for A and B; page reads decode entity payloads. Assertions verify order and mutations outside timing. Stable ties, mixed-type rejection, signed/fractional/infinite encoding and classic parity are covered by library tests.

| N | Strategy | Operation | Median ms | SQL statements |
| --- | --- | --- | --- | --- |
${lines.join('\n')}

## Conclusions
At 50k, A/B/C middle inserts take ${get('A', 'insert').ms.toFixed(3)}/${get('B', 'insert').ms.toFixed(3)}/${get('C', 'insert').ms.toFixed(3)} ms; moving updates ${get('A', 'move').ms.toFixed(3)}/${get('B', 'move').ms.toFixed(3)}/${get('C', 'move').ms.toFixed(3)} ms. First-page reads take ${get('A', 'page50').ms.toFixed(3)}/${get('B', 'page50').ms.toFixed(3)}/${get('C', 'page50').ms.toFixed(3)} ms. A's OFFSET probes scan progressively larger prefixes despite O(log N) statement counts. B avoids comparator probes and supports indexed pages; C pays full-read and JS sort costs for every page. Bulk B writes include production key encoding and index maintenance.

ADR-0024 is Accepted: retain arbitrary sortComparer and provide the optional sortKey fast path. The real implementation removes OFFSET comparator probes while retaining ordered indexed pages. The query API (ADR-0027) additionally supports SQL filtering and aggregation without collection materialization. Android validation remains phase 9.
`,
  );
}
