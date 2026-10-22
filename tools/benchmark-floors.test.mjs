import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transform } from 'esbuild';

test('native controls send exact complete wire chunks in one transaction, with N scratch rows', async () => {
  const calls = [];
  globalThis.window = {};
  globalThis.document = { body: {} };
  globalThis.__floorPlugin = {
    async createConnection() {}, async open() {}, async execute() {},
    async query({ statement }) {
      return { values: statement.includes('journal_mode') ? [{ journal_mode: 'wal' }] : statement.includes('synchronous') ? [{ synchronous: 1 }] : [{ k: 1 }] };
    },
    async executeSet(payload) { calls.push(['set', structuredClone(payload)]); },
    async beginTransaction() { calls.push(['begin']); },
    async commitTransaction() { calls.push(['commit']); },
  };
  try {
    const source = await readFile(new URL('../projects/harness/src/benchmark-floors.ts', import.meta.url), 'utf8');
    const { code } = await transform(source.replace("await import('@capacitor-community/sqlite')", '({ CapacitorSQLite: globalThis.__floorPlugin })'), { loader: 'ts', format: 'esm' });
    const { floorBenchmark } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    await floorBenchmark();
    const commit = await window.__floor.commit();
    assert.equal(commit.length, 20);
    assert(calls.every(([kind, payload]) => kind === 'set' && payload.transaction === true && payload.set[0].values[0].length === 32));
    calls.length = 0;
    const chunks = [262198, 169531, 295, 1799, 3650];
    const result = await window.__floor.seed(2000, chunks);
    assert.equal(result.samples.length, 5);
    assert.deepEqual(result.chunkBytes, chunks);
    assert.equal(calls.length, 5 * (chunks.length + 2));
    for (let trial = 0; trial < 5; trial++) {
      const segment = calls.slice(trial * 7, (trial + 1) * 7);
      assert.equal(segment[0][0], 'begin');
      assert.equal(segment.at(-1)[0], 'commit');
      const payloads = segment.slice(1, -1).map((row) => row[1]);
      assert.deepEqual(payloads.map((row) => Buffer.byteLength(JSON.stringify(row))), chunks);
      assert.equal(payloads.flatMap((row) => JSON.parse(row.set[0].values[0])).length, 2000);
      assert(payloads.every((row) => row.transaction === false && row.database === 'ngrx-harness'));
    }
  } finally {
    delete globalThis.window; delete globalThis.document; delete globalThis.__floorPlugin;
  }
});

test('startup source groups only executeSet writes within their actual transactions', async () => {
  globalThis.localStorage = { getItem: () => 'true' };
  globalThis.window = { Capacitor: { async nativePromise() {} } };
  try {
    const source = await readFile(new URL('../projects/harness/src/benchmark-startup.ts', import.meta.url), 'utf8');
    const { code } = await transform(source, { loader: 'ts', format: 'esm' });
    const { traceStartup } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    traceStartup();
    const call = (method, options = {}) => window.Capacitor.nativePromise('CapacitorSQLite', method, options);
    await call('executeSet', { transaction: true, set: [{ statement: 'initial metadata' }] });
    await call('beginTransaction');
    await call('query', { statement: 'read before writes' });
    await call('executeSet', { transaction: false, set: [{ statement: 'seed chunk one' }] });
    await call('executeSet', { transaction: false, set: [{ statement: 'seed chunk two' }] });
    await call('commitTransaction');
    await call('executeSet', { transaction: true, set: [{ statement: 'effect dispatch' }] });
    const writes = window.__startupTrace.filter((row) => row.method === 'executeSet');
    assert.equal(writes[1].transaction, writes[2].transaction);
    assert.notEqual(writes[0].transaction, writes[1].transaction);
    assert.notEqual(writes[2].transaction, writes[3].transaction);
    assert.equal(writes[1].bytes, Buffer.byteLength(JSON.stringify({ transaction: false, set: [{ statement: 'seed chunk one' }] })));
  } finally {
    delete globalThis.window; delete globalThis.localStorage;
  }
});
