import { NodeStore } from '../src/lib/schema/node-store';
import { StoragePolicy } from '../src/lib/schema/policy';
import { ChangeSet } from '../src/lib/storage/change-set';
import { assert, database, environment, measure, method, report } from './common';
import type { Sample } from './common';

interface Note {
  body: string;
  checklist: { reviewed: boolean; published: boolean };
}
interface Notes {
  folders: Record<string, { notes: Record<string, Note> }>;
}

function notes(target: number): Notes {
  const folders: Notes['folders'] = {};
  // Varied 0.5–24 KiB bodies put notes on both sides of the swept thresholds.
  let bytes = 0;
  let index = 0;
  while (bytes < target) {
    const folder = (folders[`folder${Math.floor(index / 20)}`] ??= { notes: {} });
    const bodySize = Math.min(target - bytes, [512, 3072, 12288, 24576][index % 4]);
    folder.notes[`note${index}`] = {
      body: 'n'.repeat(bodySize),
      checklist: { reviewed: false, published: false },
    };
    bytes += bodySize;
    index++;
  }
  return { folders };
}

export async function q2(): Promise<void> {
  const lines: string[] = [];
  const transitions: string[] = [];
  const large = new Map<number, { update: Sample; read: Sample; rows: number }>();
  for (const target of [50 * 1024, 256 * 1024, 1024 * 1024, 5 * 1024 * 1024]) {
    const input = notes(target);
    const actualBytes = Buffer.byteLength(JSON.stringify(input));
    for (const threshold of [2, 8, 16, 64, 256]) {
      const meter = await database();
      try {
        const nodes = new NodeStore(new StoragePolicy({ promotionThreshold: threshold * 1024 }));
        await meter.driver.begin();
        await nodes.write(meter, 'notes', input, new ChangeSet());
        await meter.driver.commit();
        const previous = (await nodes.read(meter, 'notes')) as Notes;
        // Edit a checkbox on a 12 KiB note, retaining every untouched reference.
        const folder = previous.folders['folder0'];
        const note = folder.notes['note2'];
        const next: Notes = {
          ...previous,
          folders: {
            ...previous.folders,
            folder0: {
              ...folder,
              notes: {
                ...folder.notes,
                note2: { ...note, checklist: { ...note.checklist, reviewed: true } },
              },
            },
          },
        };
        const update = await measure(meter, () =>
          nodes.diffWrite(meter, 'notes', previous, next, new ChangeSet()),
        );
        const read = await measure(meter, async () => {
          await nodes.read(meter, 'notes');
        });
        const [row] = await meter.query<{ count: number }>(
          'SELECT (SELECT count(*) FROM nss_node) + (SELECT count(*) FROM nss_chunk) + (SELECT count(*) FROM nss_entity) AS count',
        );
        assert.deepEqual(previous, input);
        await meter.driver.begin();
        await nodes.diffWrite(meter, 'notes', previous, next, new ChangeSet());
        assert.deepEqual(await nodes.read(meter, 'notes'), next);
        await meter.driver.rollback();
        lines.push(
          `| ${actualBytes} | ${threshold} | ${update.bytes} | ${update.ms.toFixed(3)} | ${update.statements} | ${read.ms.toFixed(3)} | ${read.statements} | ${row.count} |`,
        );
        if (target === 5 * 1024 * 1024) large.set(threshold, { update, read, rows: row.count });
      } finally {
        await meter.driver.close();
      }
    }
    console.log(`Q2 ${actualBytes} bytes`);
  }
  // Existing dynamic demotion, measured explicitly at the default boundary.
  const meter = await database();
  try {
    const nodes = new NodeStore();
    const big = {
      section: { note: { body: 'x'.repeat(20 * 1024), checklist: { reviewed: false } } },
    };
    await nodes.write(meter, 'demotion', big, new ChangeSet());
    const previous = (await nodes.read(meter, 'demotion')) as typeof big;
    const small = {
      ...previous,
      section: { note: { ...previous.section.note, body: 'x'.repeat(1024) } },
    };
    const shrink = await measure(meter, () =>
      nodes.diffWrite(meter, 'demotion', previous, small, new ChangeSet()),
    );
    await nodes.diffWrite(meter, 'demotion', previous, small, new ChangeSet());
    const smallRead = (await nodes.read(meter, 'demotion')) as typeof big;
    const grow = await measure(meter, () =>
      nodes.diffWrite(meter, 'demotion', smallRead, big, new ChangeSet()),
    );
    assert.deepEqual(smallRead, small);
    await nodes.diffWrite(meter, 'demotion', smallRead, big, new ChangeSet());
    assert.deepEqual(await nodes.read(meter, 'demotion'), big);
    transitions.push(
      `| 20 KiB → 1 KiB body (demote) | ${shrink.ms.toFixed(3)} | ${shrink.bytes} | ${shrink.rows} | ${shrink.statements} |`,
    );
    transitions.push(
      `| 1 KiB → 20 KiB body (promote) | ${grow.ms.toFixed(3)} | ${grow.bytes} | ${grow.rows} | ${grow.statements} |`,
    );
  } finally {
    await meter.driver.close();
  }
  await report(
    'q2',
    `# Q2 — Promotion threshold

## Method and environment
${environment}

${method}

Real NodeStore/StoragePolicy/RowWriter, default hard row cap, no hints. Notes shape: folders → folder → notes → note → checklist; five nested container levels, with varied 0.5/3/12/24 KiB note bodies. Sizes below report actual UTF-8 JSON bytes (target body bytes plus structure). Update toggles one checklist boolean on the same 12 KiB note with immutable structural sharing; metadata comes from a real read. Bytes written means UTF-8 string bind bytes in INSERT/UPDATE, including path/id metadata; excludes numeric binds, DELETEs, SQLite pages, indexes and WASM memory. It measures logical write amplification, not filesystem traffic. Rows count all three schema tables. Full reads and updated values are checked outside timing.

| JSON bytes | Threshold KiB | Update bound bytes | Update ms | Update SQL | Full read ms | Read SQL | Rows |
| --- | --- | --- | --- | --- | --- | --- | --- |
${lines.join('\n')}

## Boundary crossing (default 16 KiB)
This measures the dynamic promotion/demotion already implemented in ADR-0016, with one changed note and its ancestors; it does not add a new mechanism. Rewritten rows count deleted plus inserted/updated rows.

| Transition | Median ms | Bound bytes | Rewritten rows | SQL statements |
| --- | --- | --- | --- | --- |
${transitions.join('\n')}

## Conclusions
For the 5 MiB fixture, 2/8/16/64/256 KiB thresholds bind ${[2, 8, 16, 64, 256].map((t) => large.get(t)!.update.bytes).join('/')} bytes per leaf change, with ${[2, 8, 16, 64, 256].map((t) => large.get(t)!.rows).join('/')} stored rows. Larger thresholds reduce rows and can improve full reads but rewrite larger inline notes/folders. The 16 KiB default remains a conservative compromise, not a universal measured optimum; workloads dominated by tiny hot checklist updates can choose 2–8 KiB or collection hints. Keep configurable thresholds and the hard cap.

Dynamic demotion already exists on changed writes. Retain that behavior; there is no evidence here for a new background/access-frequency demoter or threshold oscillation controller. Boundary crossings rewrite the affected representation, so repeated shrink/grow can amplify writes; measure real Android workloads before adding hysteresis. ADR-0025 retains 16 KiB provisionally and documents the limits of this single-leaf workload. No library change is justified by these measurements.
`,
  );
}
