import { createEntityAdapter } from '../entity/src/entity-adapter';
import { StoreTx } from '../src/lib/reducer/store-tx';
import { NodeStore } from '../src/lib/schema/node-store';
import { RowWriter } from '../src/lib/schema/row-writer';
import { ChangeSet } from '../src/lib/storage/change-set';
import { assert, cells, database, environment, measure, method, report } from './common';
import type { Meter, Sample } from './common';

interface Entity {
  id: number;
  rank: number;
  title: string;
}
const comparer = (left: Entity, right: Entity) => left.rank - right.rank;
const sortKey = (entity: Entity) => String(entity.rank).padStart(12, '0');

// Prototype-only RowWriter extension: all schema-table writes still pass the
// cap-checking RowWriter; sortkey is a separate reserved metadata column.
class SortKeyWriter extends RowWriter {
  constructor(
    private readonly sql: Meter,
    changes: ChangeSet,
  ) {
    super(sql, changes, 1_048_576);
  }
  async keys(entities: Entity[]): Promise<void> {
    for (let offset = 0; offset < entities.length; offset += 333) {
      const batch = entities.slice(offset, offset + 333);
      await this.sql.run(
        `WITH keys(id,sortkey) AS (VALUES ${batch.map(() => '(?,?)').join(',')}) UPDATE nss_entity SET sortkey = keys.sortkey FROM keys WHERE nss_entity.coll = ? AND nss_entity.id = keys.id`,
        [...batch.flatMap((entity) => [`n:${entity.id}`, sortKey(entity)]), 'items'],
      );
    }
  }
}

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
        if (strategy === 'B')
          await meter.exec('CREATE INDEX spike_sortkey ON nss_entity(coll,sortkey,id)');
        const adapter = createEntityAdapter<Entity>({
          sortComparer: strategy === 'A' ? comparer : false,
        });
        const tx = () => new StoreTx('items', new NodeStore(), meter, new ChangeSet());
        const keyWriter = () => new SortKeyWriter(meter, new ChangeSet());
        await meter.driver.begin();
        await adapter.setAll(tx(), entities);
        if (strategy === 'B') await keyWriter().keys(entities);
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
          if (strategy === 'B') {
            const rows = await meter.query<{ id: string; data?: string }>(
              `SELECT id${page ? ',data' : ''} FROM nss_entity WHERE coll = ? ORDER BY sortkey,id${page ? ' LIMIT 50' : ''}`,
              ['items'],
            );
            return rows.map((row) =>
              page ? (JSON.parse(row.data!) as Entity).id : Number(row.id.slice(2)),
            );
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
            if (strategy === 'B') await keyWriter().keys([inserted]);
          },
          move: async () => {
            await adapter.updateOne(tx(), { id: moved.id, changes: moved });
            if (strategy === 'B') await keyWriter().keys([moved]);
          },
          setAll: async () => {
            await adapter.setAll(tx(), entities);
            if (strategy === 'B') await keyWriter().keys(entities);
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

A uses the actual createEntityAdapter tx operations, EntityTx binary search, RowWriter and pos index. B uses the same unsorted adapter and a spike-only RowWriter extension to populate the reserved TEXT sortkey plus an index on (coll,sortkey,id). Numeric ranks use fixed-width decimal strings because the existing column has TEXT affinity; raw numbers would sort lexically. B includes its two-stage data/key write overhead (not a production optimization). C stores insertion pos but ignores it for reads, parsing and sorting every entity in JS. Deterministic distinct ranks and scrambled input; inserts go to the middle and updates move the first entity to the end. Each table has only its strategy's required indexes (B retains the existing pos index). setAll replaces N existing rows. All page reads decode entity payloads before returning ids; A uses the real page API. Assertions verify every full/page order and both mutations outside timing. Tie, mixed-type, locale and custom-comparer semantics are not established by this scalar-key prototype.

| N | Strategy | Operation | Median ms | SQL statements |
| --- | --- | --- | --- | --- |
${lines.join('\n')}

## Conclusions
At 50k, A/B/C middle inserts take ${get('A', 'insert').ms.toFixed(3)}/${get('B', 'insert').ms.toFixed(3)}/${get('C', 'insert').ms.toFixed(3)} ms; moving updates ${get('A', 'move').ms.toFixed(3)}/${get('B', 'move').ms.toFixed(3)}/${get('C', 'move').ms.toFixed(3)} ms. First-page reads take ${get('A', 'page50').ms.toFixed(3)}/${get('B', 'page50').ms.toFixed(3)}/${get('C', 'page50').ms.toFixed(3)} ms. A's OFFSET probes scan progressively larger prefixes despite O(log N) statement counts. B avoids comparator probes and supports indexed pages; C pays full-read and JS sort costs for every page. Bulk B writes pay extra key/index maintenance in this conservative prototype.

Recommend retaining arbitrary sortComparer support and proposing an optional declarative sortKey fast path for frequent sorted mutations. B's mutation advantage must be considered alongside bulk costs and semantics; do not implement the API or schema migration yet. ADR-0024 proposes sortKey(entity): string | number, with explicit numeric encoding, tie, update and classic-form parity rules still required. Android validation remains phase 9.
`,
  );
}
