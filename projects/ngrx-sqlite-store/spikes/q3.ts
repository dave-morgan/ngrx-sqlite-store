import type { SqlValue } from '../src/lib/driver/sql-driver';
import { getNodeMeta } from '../src/lib/schema/meta';
import { readSubtree, readSubtreeCte } from '../src/lib/schema/node-reader';
import { NodeStore } from '../src/lib/schema/node-store';
import { StoragePolicy } from '../src/lib/schema/policy';
import { ChangeSet } from '../src/lib/storage/change-set';
import type { SqlExecutor } from '../src/lib/storage/storage-engine';
import { assert, database, environment, measure, method, report } from './common';
import type { Meter } from './common';

function fixture(depth: number, breadth: number): Record<string, unknown> {
  let value: Record<string, unknown> = Object.fromEntries(
    Array.from({ length: breadth }, (_, i) => [`leaf${i}`, i]),
  );
  for (let level = 1; level < depth; level++) value = { child: value };
  return value;
}

class Replay implements SqlExecutor {
  readonly responses: unknown[][] = [];
  index = 0;
  constructor(private readonly meter: Meter) {}
  exec(): Promise<void> {
    throw new Error('Replay must be read-only');
  }
  run(): Promise<never> {
    throw new Error('Replay must be read-only');
  }
  async query<R>(sql: string, params?: SqlValue[]): Promise<R[]> {
    const rows = await this.meter.query<R>(sql, params);
    this.responses.push(rows);
    return rows;
  }
  cached(): SqlExecutor {
    return {
      exec: this.exec,
      run: this.run,
      query: async <R>() => this.responses[this.index++] as R[],
    };
  }
}

// Seeded generative property fixture. Each branch has exactly 100 nodes:
// nine alternating arrays/objects + one 90-scalar leaf array, at max depth 12.
// 1 root + 1 outer array + 999*100 branches + 98 scalars = 100,000.
function propertyFixture(seed: number): { items: unknown[] } {
  let state = seed;
  const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
  const scalar = (): unknown => {
    const n = random();
    return [null, !!(n & 1), n, `text/~雪${n}`, ''][n % 5];
  };
  const items: unknown[] = [];
  for (let branch = 0; branch < 999; branch++) {
    let value: unknown = Array.from({ length: 90 }, scalar);
    for (let level = 0; level < 9; level++)
      value = level % 2 ? [value] : { [`key/~${level}`]: value };
    items.push(value);
  }
  items.push(...Array.from({ length: 98 }, scalar));
  return { items };
}

function shape(value: unknown, depth = 0): { nodes: number; depth: number } {
  let nodes = 1;
  let max = depth;
  if (value && typeof value === 'object')
    for (const child of Object.values(value)) {
      const result = shape(child, depth + 1);
      nodes += result.nodes;
      max = Math.max(max, result.depth);
    }
  return { nodes, depth: max };
}

export async function q3(): Promise<void> {
  const lines: string[] = [];
  const nodes = new NodeStore(new StoragePolicy({ promotionThreshold: 0 }));
  for (const depth of Array.from({ length: 11 }, (_, index) => index + 2))
    for (const breadth of [10, 100, 1000, 10000]) {
      const meter = await database();
      try {
        const input = fixture(depth, breadth);
        assert.deepEqual(shape(input), { nodes: depth + breadth, depth });
        await nodes.write(meter, 'tree', input, new ChangeSet());
        for (const [name, reader] of [
          ['range', readSubtree],
          ['CTE', readSubtreeCte],
        ] as const) {
          const sample = await measure(meter, async () => {
            await reader(meter, 'tree');
          });
          const replay = new Replay(meter);
          assert.deepEqual(await reader(replay, 'tree'), input);
          const assembly = await measure(meter, async () => {
            replay.index = 0;
            await reader(replay.cached(), 'tree');
          });
          lines.push(
            `| ${depth} | ${breadth} | ${depth + breadth} | ${name} | ${sample.ms.toFixed(3)} | ${sample.sqlMs.toFixed(3)} | ${assembly.ms.toFixed(3)} | ${sample.statements} |`,
          );
        }
      } finally {
        await meter.driver.close();
      }
      console.log(`Q3 depth ${depth}, breadth ${breadth}`);
    }
  const properties: string[] = [];
  // Five independent seeds; each timing row is itself a five-run median.
  for (const seed of [1, 17, 42, 12345, 0xdeadbeef]) {
    const meter = await database();
    try {
      const input = propertyFixture(seed);
      assert.deepEqual(shape(input), { nodes: 100000, depth: 12 });
      await nodes.write(meter, 'property', input, new ChangeSet());
      const [count] = await meter.query<{ count: number }>(
        'SELECT count(*) AS count FROM nss_node',
      );
      assert.equal(count.count, 100000);
      const read = await measure(meter, async () => {
        await nodes.read(meter, 'property');
      });
      for (const reader of [readSubtree, readSubtreeCte])
        assert.deepEqual(await reader(meter, 'property'), input);
      // A reference-preserving reorder is also a property of hidden array IDs.
      const previous = (await nodes.read(meter, 'property')) as typeof input;
      const oldIds = [...getNodeMeta(previous.items)!.elementIds!];
      const next = { items: [previous.items[1], previous.items[0], ...previous.items.slice(2)] };
      const reorder = await measure(meter, () =>
        nodes.diffWrite(meter, 'property', previous, next, new ChangeSet()),
      );
      await nodes.diffWrite(meter, 'property', previous, next, new ChangeSet());
      const reordered = (await nodes.read(meter, 'property')) as typeof input;
      assert.deepEqual(reordered, next);
      assert.equal(getNodeMeta(reordered.items)!.elementIds![0], oldIds[1]);
      assert.equal(getNodeMeta(reordered.items)!.elementIds![1], oldIds[0]);
      properties.push(
        `| ${seed} | ${count.count} | ${read.ms.toFixed(3)} | ${read.statements} | ${reorder.ms.toFixed(3)} | ${reorder.rows} | ${reorder.statements} |`,
      );
    } finally {
      await meter.driver.close();
    }
    console.log(`Q3 property seed ${seed}`);
  }
  const moves: string[] = [];
  for (const depth of [2, 6, 12])
    for (const breadth of [10, 1000, 10000]) {
      const meter = await database();
      try {
        const input = { old: fixture(depth - 1, breadth), retained: true };
        await nodes.write(meter, 'move', input, new ChangeSet());
        const previous = (await nodes.read(meter, 'move')) as typeof input;
        const next = { renamed: previous.old, retained: previous.retained };
        const moved = await measure(meter, () =>
          nodes.diffWrite(meter, 'move', previous, next, new ChangeSet()),
        );
        assert.equal(moved.rows, 2 * (depth - 1 + breadth));
        await nodes.diffWrite(meter, 'move', previous, next, new ChangeSet());
        assert.deepEqual(await nodes.read(meter, 'move'), next);
        const [orphans] = await meter.query<{ count: number }>(
          'SELECT count(*) AS count FROM nss_node n WHERE parent IS NOT NULL AND NOT EXISTS (SELECT 1 FROM nss_node p WHERE p.path = n.parent)',
        );
        assert.equal(orphans.count, 0);
        moves.push(
          `| ${depth} | ${breadth} | ${depth - 1 + breadth} | ${moved.ms.toFixed(3)} | ${moved.rows} | ${moved.statements} |`,
        );
      } finally {
        await meter.driver.close();
      }
    }
  await report(
    'q3',
    `# Q3 — Adjacency lists, readers and subtree identity

## Method and environment
${environment}

${method}

Real NodeStore with promotionThreshold=0 forces every container into pointer rows. Depth is the maximum edge distance from feature root to scalar. A spine ends in 10–10,000 scalar children: depth and breadth vary independently without exponential fixture growth. Rows = depth + breadth. Both readers use the production SQL and assembler; each performs node/entity/chunk queries. SQL time is measured at the executor boundary. JS reassembly is measured separately by replaying all three captured query results through the unchanged reader; this includes metadata attachment and async overhead but no database queries. SQL and replay medians need not sum to the independently measured total. No library exports or copies of the assembler were needed.

| Depth | Breadth | Rows | Reader | Total ms | SQL ms | JS replay ms | SQL statements |
| --- | --- | --- | --- | --- | --- | --- | --- |
${lines.join('\n')}

## Generative round-trip property at scale
Five deterministic seeds vary mixed scalars (null, boolean, number, Unicode and empty strings) and escaped object keys inside alternating arrays/objects. Each fixture contains exactly 100,000 JSON nodes / stored rows at maximum edge-depth 12. Both readers must deep-equal the input for every seed. A subsequent adjacent array swap must round-trip and preserve both hidden ids. Each numeric timing is a five-run median; assertions are outside timing. Failures abort the runner.

| Seed | Nodes | Range read ms | Read SQL | Swap ms | Rows updated | Swap SQL |
| --- | --- | --- | --- | --- | --- | --- |
${properties.join('\n')}

## Path-as-ID rename costs
Rename the object property old → renamed at the feature root while retaining the subtree reference. This moves every nested pointer and scalar path; an equivalent cross-parent move has the same path-prefix problem. Counts include deleted plus inserted/updated rows (not merely SQL statements). Orphan checks and deep equality run after every move. The scalar sibling is retained.

| Leaf depth | Breadth | Moved subtree rows | Median ms | Rewritten rows | SQL statements |
| --- | --- | --- | --- | --- | --- |
${moves.join('\n')}

## Conclusions
Keep the range reader as the default and the CTE reader as a verification alternative. Both perform three statements and round-trip deep structures; compare the measured SQL and replay columns rather than attributing all latency to SQLite. The CTE traverses the parent index per level whereas range reads exploit the contiguous path prefix. This is evidence for the existing model, not Android latency or heap targets.

Object renames/cross-parent moves cost O(subtree rows): pointer rows do not make paths independent of their ancestors. By contrast, the 100k-node array swaps change only position rows while all descendant paths stay stable. Keep hidden array ids and fractional positions (ADR-0006). Do not replace them with array indices. A global opaque node-id schema could make object moves cheaper but requires a migration and sacrifices simple prefix reads; defer until actual move-heavy workloads justify it. ADR-0026 resolves Q3 for Node/sql.js. No library change is justified.
`,
  );
}
