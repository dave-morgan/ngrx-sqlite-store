// Host-only transport accounting: no SQL execution, device calls or benchmark claims.
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { build } from 'esbuild';

const baseline = process.argv[2] ?? 'c4232bd73277c1bc00f41f86d29efb764394c4c8';
const writerPath = 'projects/ngrx-sqlite-store/src/lib/schema/row-writer.ts';
const oldWriter = execFileSync('git', ['show', `${baseline}:${writerPath}`], { encoding: 'utf8' });
const entry = `
export { RowWriter } from './${writerPath}';
export { ChangeSet } from './projects/ngrx-sqlite-store/src/lib/storage/change-set';
export { generateSeed } from './projects/harness/src/app/state/seed';
`;

async function load(source) {
  const result = await build({
    stdin: { contents: entry, resolveDir: process.cwd(), loader: 'ts' },
    platform: 'node', format: 'esm', bundle: true, write: false,
    plugins: [{ name: 'writer-version', setup(builder) {
      builder.onLoad({ filter: /[\\/]row-writer\.ts$/ }, async ({ path }) => ({
        contents: source ?? await readFile(path, 'utf8'), loader: 'ts',
        resolveDir: path.replace(/[\\/][^\\/]+$/, ''),
      }));
    } }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}

const versions = { before: await load(oldWriter), after: await load() };
for (const size of [1_000, 10_000, 50_000]) {
  const seed = versions.after.generateSeed(size);
  // Controlled representative entity rows: IDs/positions are explicit and fixed.
  const rows = seed.todos.map((todo, index) => ({
    coll: 'todos', id: todo.id, pos: index, data: JSON.stringify(todo), sortkey: null,
  }));
  const result = { size, baseline, entityDataUtf8Bytes: rows.reduce((sum, row) => sum + Buffer.byteLength(row.data), 0) };
  for (const [name, { RowWriter, ChangeSet }] of Object.entries(versions)) {
    let bytes = 0;
    let statements = 0;
    let bindingsBytes = 0;
    const write = async (sql, params) => {
      bytes += Buffer.byteLength(JSON.stringify([{ statement: sql, values: params }]));
      bindingsBytes += Buffer.byteLength(JSON.stringify(params));
      statements++;
    };
    const start = performance.now();
    await new RowWriter({ write }, new ChangeSet(), 1_000_000).writeEntityRows(rows, true);
    result[name] = { statements, statementWireBytes: bytes, bindingsBytes, hostEncodeAndJournalMs: performance.now() - start };
  }
  console.log(JSON.stringify(result));
}
