import { readFile, writeFile } from 'node:fs/promises';
import { posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const categories = {
  nss: (path) => path.startsWith('projects/ngrx-sqlite-store/'),
  sqlJsDriver: (path) => path.endsWith('/driver/sqljs-driver.ts'),
  sqlJs: (path) => path.includes('node_modules/sql.js/'),
  jeepSqlite: (path) => path.includes('node_modules/jeep-sqlite/'),
  webDriver: (path) => path.includes('@capacitor-community/sqlite/') && path.endsWith('/web.js'),
  devtools: (path) => path.includes('@ngrx/store-devtools/'),
  spikes: (path) => path.includes('/spikes/'),
};

/** Follow emitted static edges; dynamic imports are deliberately separate roots. */
export function audit(stats) {
  const outputs = stats.outputs;
  const javascript = Object.keys(outputs).filter((path) => /\.m?js$/.test(path));
  const main = javascript.find((path) => outputs[path].entryPoint === 'projects/harness/src/main.ts');
  if (!main) throw new Error('No harness main.ts entry in build stats');
  const target = (from, path) => outputs[path] ? path : posix.normalize(posix.join(posix.dirname(from), path));
  function closure(roots) {
    const seen = new Set();
    function visit(path) {
      if (seen.has(path)) return;
      if (!outputs[path]) throw new Error('Missing output graph target: ' + path);
      seen.add(path);
      for (const edge of outputs[path].imports ?? [])
        if (!edge.external && edge.kind !== 'dynamic-import') visit(target(path, edge.path));
    }
    for (const root of roots) visit(root);
    return seen;
  }
  const initial = closure([main]);
  const todos = javascript.find((path) => outputs[path].entryPoint === 'projects/harness/src/app/pages/todos.page.ts');
  const todosReady = closure([main, ...(todos ? [todos] : [])]);
  const bytes = (paths) => [...paths].reduce((sum, path) => sum + outputs[path].bytes, 0);
  function modules(paths) {
    const sizes = new Map();
    for (const path of paths)
      for (const [input, info] of Object.entries(outputs[path].inputs ?? {}))
        sizes.set(input, (sizes.get(input) ?? 0) + info.bytesInOutput);
    return sizes;
  }
  const initialModules = modules(initial);
  const todosModules = modules(todosReady);
  const allModules = modules(javascript);
  const total = (map, predicate) => [...map].reduce((sum, [path, size]) => sum + (predicate(path) ? size : 0), 0);
  const dynamicTargets = new Set();
  for (const path of javascript)
    for (const edge of outputs[path].imports ?? [])
      if (!edge.external && edge.kind === 'dynamic-import') dynamicTargets.add(target(path, edge.path));
  return {
    initial: { bytes: bytes(initial), outputs: [...initial] },
    todosReady: { bytes: bytes(todosReady), additionalRouteBytes: bytes(todosReady) - bytes(initial), outputs: [...todosReady] },
    allJavaScriptBytes: bytes(javascript),
    categories: Object.fromEntries(Object.entries(categories).map(([name, predicate]) => [name, {
      initialBytes: total(initialModules, predicate), todosReadyBytes: total(todosModules, predicate), allOutputsBytes: total(allModules, predicate),
    }])),
    dynamicEntrypoints: [...dynamicTargets].map((output) => {
      const dependencies = closure([output]);
      return { output, entryPoint: outputs[output].entryPoint ?? null, bytes: outputs[output].bytes,
        additionalBytes: bytes(new Set([...dependencies].filter((path) => !initial.has(path)))),
        alreadyInTodosReady: todosReady.has(output) };
    }),
    initialModules: Object.fromEntries(initialModules),
    todosReadyModules: Object.fromEntries(todosModules),
  };
}

function deltas(classic, sqlite, field) {
  const before = classic[field];
  const after = sqlite[field];
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .map((path) => ({ path, classicBytes: before[path] ?? 0, sqliteBytes: after[path] ?? 0, deltaBytes: (after[path] ?? 0) - (before[path] ?? 0) }))
    .sort((a, b) => Math.abs(b.deltaBytes) - Math.abs(a.deltaBytes)).slice(0, 30);
}

async function main() {
  const directory = process.argv[2] ?? '.tmp/benchmark-apks';
  const result = { generatedAt: new Date().toISOString(), source: directory,
    method: 'Emitted JavaScript bytes, uncompressed; static imports define initial reachability. Todos-ready additionally includes the lazy /todos route static closure. Lazy web and benchmark chunks are not charged to startup. These bytes do not measure live heap.',
  };
  for (const impl of ['classic', 'sqlite'])
    result[impl] = audit(JSON.parse(await readFile(`${directory}/${impl}-stats.json`, 'utf8')));
  result.deltas = {
    initialJavaScriptBytes: result.sqlite.initial.bytes - result.classic.initial.bytes,
    todosReadyJavaScriptBytes: result.sqlite.todosReady.bytes - result.classic.todosReady.bytes,
    topInitialModules: deltas(result.classic, result.sqlite, 'initialModules'),
    topTodosReadyModules: deltas(result.classic, result.sqlite, 'todosReadyModules'),
  };
  const stem = 'docs/benchmarks/android-bundle-15c-2026-10-22';
  await writeFile(`${stem}.json`, JSON.stringify(result, null, 2) + '\n');
  const lines = ['# Phase 15c Android bundle audit', '', result.method, '',
    '| JavaScript graph | Classic bytes | SQLite bytes | Delta |', '| --- | ---: | ---: | ---: |',
    `| Initial static imports | ${result.classic.initial.bytes} | ${result.sqlite.initial.bytes} | ${result.deltas.initialJavaScriptBytes} |`,
    `| Initial /todos route included | ${result.classic.todosReady.bytes} | ${result.sqlite.todosReady.bytes} | ${result.deltas.todosReadyJavaScriptBytes} |`, '',
    '| SQLite module group | Initial bytes | /todos ready bytes | All emitted bytes |', '| --- | ---: | ---: | ---: |'];
  for (const [name, group] of Object.entries(result.sqlite.categories))
    lines.push(`| ${name} | ${group.initialBytes} | ${group.todosReadyBytes} | ${group.allOutputsBytes} |`);
  lines.push('', 'Groups overlap: sqlJsDriver and spikes, if present, are also part of NSS. Module byte sums exclude emitted glue and therefore differ from total output bytes. Dynamic entry closures overlap and must not be summed.', '',
    'The /todos route is loaded by initial navigation after bootstrap; it is reported separately from static application startup. Optional web drivers, jeep-sqlite and sql.js require their dynamic import branches to execute. File presence in the APK does not demonstrate loading into the Android JavaScript heap.', '',
    'The JSON sidecar contains every dynamic entry point, output closure and the largest module deltas. Reproduce with `node tools/bundle-audit.mjs` after both APK statistics have been generated. Live heap attribution requires a same-session post-GC heap snapshot comparison; retained input data, compiled code, native contexts and selector/DI objects are different categories. Bundle byte deltas cannot be converted into retained heap bytes.');
  await writeFile(`${stem}.md`, lines.join('\n') + '\n');
  console.log(JSON.stringify({ delta: result.deltas.initialJavaScriptBytes, sqlite: result.sqlite.categories }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await main();
