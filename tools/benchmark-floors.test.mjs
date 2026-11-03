import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transform } from 'esbuild';
import { seedMemoryFloor, verdict } from './benchmark-statistics.mjs';

test('ADR-0057 uses mean pre-shrink seed app PSS growth only for post-seed device PSS', () => {
  const rows = [{ size: 1000, memoryDiagnostic: { samples: [
    { beforeSeed: 100, afterSeed: 108, afterShrink: 101 },
    { beforeSeed: 120, afterSeed: 132, afterShrink: 121 },
  ] } }];
  const seed = seedMemoryFloor(rows, 1000, 'pssTotalMb');
  assert.deepEqual(seed.samples, [8, 12]);
  assert.equal(seed.mean, 10);
  const platform = { classic: { n: 5, mean: 20, sd: 90 }, sqlite: { n: 5, mean: 23, sd: 90 },
    justification: 'paired empty controls', seed };
  const classic = { mean: 100, sd: 2 };
  // ADR-0070: plugin baseline (23 - 20) plus seed increment (10) plus classic SD (2).
  assert.equal(verdict(classic, { mean: 115, sd: 100 }, undefined, undefined, platform).status, 'PLATFORM-BOUND');
  assert.equal(verdict(classic, { mean: 115.001, sd: 100 }, undefined, undefined, platform).status, 'FAIL');
  assert.equal(verdict(classic, { mean: 101, sd: 100 }, undefined, undefined, platform).status, 'PASS');
  const largerEmpty = { ...platform, sqlite: { ...platform.sqlite, mean: 35 } };
  assert.equal(verdict(classic, { mean: 117, sd: 100 }, undefined, undefined, largerEmpty).allowance, 27);
  for (const metric of ['heapTodosMb', 'heapNotesMb', 'heapRelaunchMb', 'pssRelaunchTotalMb', 'firstReadyMs']) {
    const seed = seedMemoryFloor(rows, 1000, metric);
    assert.equal(seed, undefined);
    assert.equal(verdict(classic, { mean: 106, sd: 100 }, undefined, undefined, { ...platform, seed }).status, 'FAIL');
  }
  assert.equal(seedMemoryFloor([{ size: 1000, memoryDiagnostic: { beforeSeed: 100, afterSeed: 109, afterShrink: 100 } }], 1000, 'pssTotalMb').mean, 9);
  assert.throws(() => seedMemoryFloor(rows, 10000, 'pssTotalMb'), /Missing/);
  assert.throws(() => seedMemoryFloor([...rows, rows[0]], 1000, 'pssTotalMb'), /Duplicate/);
  assert.throws(() => seedMemoryFloor([{ size: 1000, memoryDiagnostic: { beforeSeed: 100, afterSeed: NaN } }], 1000, 'pssTotalMb'), /finite/);
});

test('native controls send exact complete wire chunks in one transaction, with N scratch rows', async () => {
  const calls = [];
  globalThis.window = {};
  globalThis.document = { body: {} };
  globalThis.__floorPlugin = {
    async checkConnectionsConsistency() {}, async createConnection() {}, async open() {}, async execute() {},
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
    assert.equal(calls.length, 5 * (chunks.length + 3));
    for (let trial = 0; trial < 5; trial++) {
      const stride = chunks.length + 3;
      const cleanup = calls[trial * stride];
      assert.equal(cleanup[0], 'set');
      assert.equal(cleanup[1].set[0].statement, 'DELETE FROM nss_bench');
      assert.equal(cleanup[1].transaction, true);
      const segment = calls.slice(trial * stride + 1, (trial + 1) * stride);
      assert.equal(segment[0][0], 'begin');
      assert.equal(segment.at(-1)[0], 'commit');
      const payloads = segment.slice(1, -1).map((row) => row[1]);
      assert.deepEqual(payloads.map((row) => Buffer.byteLength(JSON.stringify(row))), chunks);
      assert.equal(payloads.flatMap((row) => row.set[0].values.length ? JSON.parse(row.set[0].values[0]) : []).length, 2000);
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
