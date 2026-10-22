import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Shallow-size grouping only. No dominator, retained-size or native-PSS inference. */
export function summarizeHeap(snapshot) {
  const { nodes, edges, strings } = snapshot;
  const meta = snapshot.snapshot.meta;
  const fields = Object.fromEntries(meta.node_fields.map((name, index) => [name, index]));
  const edgeFields = Object.fromEntries(meta.edge_fields.map((name, index) => [name, index]));
  const stride = meta.node_fields.length;
  const edgeStride = meta.edge_fields.length;
  const types = meta.node_types[fields.type];
  const edgeTypes = meta.edge_types[edgeFields.type];
  const byType = new Map();
  const objectClasses = new Map();
  const objectShapes = new Map();
  const functions = new Map();
  const code = new Map();
  function add(map, name, bytes) {
    let item = map.get(name);
    if (!item) map.set(name, item = { name, count: 0, shallowBytes: 0 });
    item.count++;
    item.shallowBytes += bytes;
  }
  let edgeOffset = 0;
  let totalShallowBytes = 0;
  for (let offset = 0; offset < nodes.length; offset += stride) {
    const type = types[nodes[offset + fields.type]];
    const name = strings[nodes[offset + fields.name]];
    const bytes = nodes[offset + fields.self_size];
    const edgeEnd = edgeOffset + nodes[offset + fields.edge_count] * edgeStride;
    totalShallowBytes += bytes;
    add(byType, type, bytes);
    if (type === 'object') {
      add(objectClasses, name, bytes);
      const properties = [];
      let propertyCount = 0;
      for (let edge = edgeOffset; edge < edgeEnd; edge += edgeStride) {
        if (edgeTypes[edges[edge + edgeFields.type]] !== 'property') continue;
        const property = strings[edges[edge + edgeFields.name_or_index]];
        if (property === '__proto__') continue;
        propertyCount++;
        if (properties.length < 24) properties.push(property);
      }
      properties.sort();
      add(objectShapes, `${name} {${properties.join(',')}${propertyCount > properties.length ? `,... ${propertyCount} properties` : ''}}`, bytes);
    } else if (type === 'closure') add(functions, name || '(anonymous)', bytes);
    else if (type === 'code') add(code, name || '(unnamed code)', bytes);
    edgeOffset = edgeEnd;
  }
  if (edgeOffset !== edges.length) throw new Error('Heap snapshot edge metadata does not match edge array');
  const sorted = (map) => [...map.values()].sort((a, b) => b.shallowBytes - a.shallowBytes);
  return { nodeCount: nodes.length / stride, totalShallowBytes,
    byType: sorted(byType), objectClasses: sorted(objectClasses), objectShapes: sorted(objectShapes),
    functions: sorted(functions), code: sorted(code),
  };
}

export function compareHeaps(before, after) {
  const delta = (field) => {
    const left = new Map(before[field].map((entry) => [entry.name, entry]));
    const right = new Map(after[field].map((entry) => [entry.name, entry]));
    return [...new Set([...left.keys(), ...right.keys()])].map((name) => ({ name,
      beforeCount: left.get(name)?.count ?? 0, afterCount: right.get(name)?.count ?? 0,
      countDelta: (right.get(name)?.count ?? 0) - (left.get(name)?.count ?? 0),
      shallowBytesDelta: (right.get(name)?.shallowBytes ?? 0) - (left.get(name)?.shallowBytes ?? 0),
    })).sort((a, b) => Math.abs(b.shallowBytesDelta) - Math.abs(a.shallowBytesDelta)).slice(0, 60);
  };
  return { shallowBytesDelta: after.totalShallowBytes - before.totalShallowBytes,
    nodeCountDelta: after.nodeCount - before.nodeCount,
    byType: delta('byType'), objectClasses: delta('objectClasses'), objectShapes: delta('objectShapes'),
    functions: delta('functions'), code: delta('code'),
  };
}

async function main() {
  const [beforePath, afterPath, outputPath] = process.argv.slice(2);
  if (!beforePath) throw new Error('Usage: node tools/heap-summary.mjs before.heapsnapshot [after.heapsnapshot] [output.json]');
  const load = async (path) => summarizeHeap(JSON.parse(await readFile(path, 'utf8')));
  const before = await load(beforePath);
  const after = afterPath ? await load(afterPath) : undefined;
  const compact = (summary) => Object.fromEntries(Object.entries(summary).map(([key, value]) =>
    [key, Array.isArray(value) ? value.slice(0, 60) : value]));
  const result = {
    method: 'V8 snapshot self_size sums: shallow bytes only, not retained sizes or native memory. Groups overlap across tables. Object shapes use up to 24 property names; classes/function names may be minified differently across builds. Compare fresh-process snapshots captured on the same route, data size and GC policy; snapshots are diagnostics, not acceptance trials.',
    before: { path: beforePath, ...compact(before) },
    ...(after ? { after: { path: afterPath, ...compact(after) }, delta: compareHeaps(before, after) } : {}),
  };
  const json = JSON.stringify(result, null, 2) + '\n';
  if (outputPath) await writeFile(outputPath, json);
  else process.stdout.write(json);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await main();
