import assert from 'node:assert/strict';
import test from 'node:test';
import { workloadCodeBaseline, codeBaseline, emptyControlPlan, latencyFloor, platformBaseline, summarize, verdict, trialOrder, validateControlProvenance } from './benchmark-statistics.mjs';

test('real empty stores alternate APKs and keep each store paired with its own implementation', () => {
  const plan = emptyControlPlan(true, 5);
  assert.deepEqual(plan.map((row) => row.apk), ['classic', 'sqlite', 'sqlite', 'classic', 'classic', 'sqlite', 'sqlite', 'classic', 'classic', 'sqlite']);
  assert.ok(plan.every((row) => row.pairs.length === 1 && row.pairs[0].impl === row.apk));
  for (const apk of ['classic', 'sqlite'])
    assert.deepEqual(plan.filter((row) => row.apk === apk).map((row) => row.pairs[0].trial), [1, 2, 3, 4, 5]);
  assert.equal(emptyControlPlan(false, 5).flatMap((row) => row.pairs).length, 20);
  assert.throws(() => emptyControlPlan(true, 1), /two/);
  assert.throws(() => emptyControlPlan(true, NaN), /two/);
});

test('CODE-BOUND uses five paired real empty stores, heap only and no SD inflation', () => {
  const rows = trialOrder(['classic', 'sqlite'], 5).map(({ impl, trial }) => ({
    apk: impl, mode: impl, kind: 'empty-store', trial, heapMb: impl === 'classic' ? 4 : 5,
  }));
  const code = { ...codeBaseline(rows), metric: 'heapTodosMb', justification: 'Real zero-feature stores, same-session post-GC controls' };
  assert.equal(verdict({ mean: 4, sd: 0.1 }, { mean: 5.1, sd: 100 }, null, null, null, null, code).status, 'CODE-BOUND');
  assert.equal(verdict({ mean: 4, sd: 0.1 }, { mean: 5.101, sd: 100 }, null, null, null, null, code).status, 'FAIL');
  for (const metric of ['relaunchReadyMs', 'pssTotalMb', 'emitP50'])
    assert.equal(verdict({ mean: 4, sd: 0.1 }, { mean: 5, sd: 100 }, null, null, null, null, { ...code, metric }).status, 'FAIL');
  assert.equal(verdict({ mean: 4, sd: 0.1 }, { mean: 4.05, sd: 0 }, null, null, null, null, code).status, 'PASS');
  assert.throws(() => codeBaseline(rows.slice(1)), /paired/);
  assert.throws(() => codeBaseline([...rows, rows[0]]), /paired/);
  assert.throws(() => codeBaseline(rows.map((row) => ({ ...row, kind: 'empty-plugin' }))), /paired/);
  assert.throws(() => codeBaseline(rows.map((row) => ({ ...row, heapMb: NaN }))), /finite/);
});

test('sample SD uses n - 1 and preserves unrounded mean', () => {
  assert.deepEqual(summarize([1, 2, 3]), { n: 3, mean: 2, sd: 1 });
  assert.throws(() => summarize([1]), /two/);
});

test('trial order alternates implementations without grouping all classic trials', () => {
  assert.deepEqual(trialOrder(['classic', 'sqlite'], 3), [
    { trial: 1, impl: 'classic' }, { trial: 1, impl: 'sqlite' },
    { trial: 2, impl: 'sqlite' }, { trial: 2, impl: 'classic' },
    { trial: 3, impl: 'classic' }, { trial: 3, impl: 'sqlite' },
  ]);
});

test('acceptance uses classic sample SD, measured bridge arithmetic and evidence', () => {
  const classic = { mean: 10, sd: 2 };
  assert.equal(verdict(classic, { mean: 12, sd: 0 }).status, 'PASS');
  const bound = { callsMin: 1, bytesMin: 100, justification: 'one commit; required payload' };
  const bridge = { rttMs: 3, bytesPerMs: 50 };
  const result = verdict(classic, { mean: 18, sd: 1 }, bridge, bound);
  assert.equal(result.status, 'BRIDGE-BOUND');
  assert.equal(result.allowance, 8);
  assert.equal(verdict(classic, { mean: 18.1, sd: 1 }, bridge, bound).status, 'FAIL');
  assert.equal(verdict(classic, { mean: 13, sd: 5 }).status, 'FAIL');
  assert.equal(verdict(classic, { mean: 13, sd: 5 }, bridge, { ...bound, justification: '' }).status, 'FAIL');
  assert.equal(verdict(classic, { mean: 13, sd: 5 }, { ...bridge, bytesPerMs: Infinity }, bound).status, 'FAIL');
  assert.equal(verdict(classic, { mean: 13, sd: 5 }, { ...bridge, rttMs: -1 }, bound).status, 'FAIL');
});

test('platform bounds require independent empty controls and never add workload SQLite SD', () => {
  const classic = { mean: 10, sd: 1 };
  const platform = {
    classic: { n: 5, mean: 20, sd: 2 }, sqlite: { n: 5, mean: 23, sd: 3 },
    justification: 'Paired empty controls isolate native loading in the same APK',
  };
  assert.equal(verdict(classic, { mean: 14, sd: 100 }, undefined, undefined, platform).status, 'PLATFORM-BOUND');
  assert.equal(verdict(classic, { mean: 14.001, sd: 100 }, undefined, undefined, platform).status, 'FAIL');
  assert.equal(verdict(classic, { mean: 12, sd: 100 }, undefined, undefined, { ...platform, justification: '' }).status, 'FAIL');
  assert.equal(verdict(classic, { mean: 12, sd: 100 }, undefined, undefined, { ...platform, sqlite: { ...platform.sqlite, n: 4 } }).status, 'FAIL');
  assert.equal(verdict(classic, { mean: 11, sd: 100 }, undefined, undefined, platform).status, 'PASS');
});

test('bulk first-ready can use measured executeSet intercept rather than echo RTT', () => {
  const classic = { mean: 10, sd: 1 };
  const bridge = { rttMs: 1, interceptMs: 3, bytesPerMs: 50 };
  const bound = { callsMin: 2, bytesMin: 100, callCost: 'intercept', justification: 'Read must precede seed commit' };
  assert.equal(verdict(classic, { mean: 19, sd: 0 }, bridge, bound).status, 'BRIDGE-BOUND');
  assert.equal(verdict(classic, { mean: 19.01, sd: 0 }, bridge, bound).status, 'FAIL');
  assert.equal(verdict(classic, { mean: 19, sd: 0 }, { ...bridge, interceptMs: -1 }, bound).status, 'FAIL');
});

test('platform summaries are recomputed from complete independent paired controls', () => {
  const rows = trialOrder(['classic', 'sqlite'], 5).map(({ impl: mode, trial }) => ({
    apk: 'classic', mode, trial, heapMb: mode === 'classic' ? 2 : 3,
  }));
  assert.deepEqual(platformBaseline(rows, 'heapMb'), {
    classic: { n: 5, mean: 2, sd: 0 }, sqlite: { n: 5, mean: 3, sd: 0 },
  });
  assert.throws(() => platformBaseline(rows.slice(1), 'heapMb'), /paired/);
  assert.throws(() => platformBaseline([...rows, rows[0]], 'heapMb'), /paired/);
  assert.throws(() => platformBaseline(rows.map((row) => ({ ...row, heapMb: NaN })), 'heapMb'), /finite/);
});

test('ADR-0051 latency floor uses matching percentile and both workload SDs', () => {
  const rows = [{ size: 1000, database: 'ngrx-harness', commit: Array.from({ length: 20 }, (_, i) => i + 1),
    commitPaced: Array.from({ length: 30 }, (_, i) => i + 101),
    open: [1, 2, 3, 4, 5], seed: { samples: [10, 20, 30, 40, 50], chunkBytes: [200, 300], totalBytes: 500, rows: 1000 },
    seedRows: { samples: [40, 50, 60, 70, 80], rows: 1012, calls: 2, wireBytes: 480 },
    seedTrace: [{ bytes: 200 }, { bytes: 300 }], pragmas: { journalMode: [{ journal_mode: 'wal' }], synchronous: [{ synchronous: 1 }] } }];
  assert.equal(latencyFloor(rows, 1000, 'emitP50').ms, 11);
  // ADR-0066: toggle floors use the paced control (30 samples: p95 index 28).
  assert.equal(latencyFloor(rows, 1000, 'toggleP95').ms, 129);
  assert.equal(latencyFloor(rows, 1000, 'emitP95').ms, 20);
  assert.throws(() => latencyFloor([{ ...rows[0], commitPaced: undefined }], 1000, 'toggleP50'), /paced/);
  assert.equal(latencyFloor(rows, 1000, 'firstReadyMs').ms, 63);
  // ADR-0066: the real-row control is required; the padded-byte control alone is rejected.
  assert.throws(() => latencyFloor([{ ...rows[0], seedRows: undefined }], 1000, 'firstReadyMs'), /seedRows/);
  assert.throws(() => latencyFloor([{ ...rows[0], seedRows: { ...rows[0].seedRows, rows: 999 } }], 1000, 'firstReadyMs'), /seedRows/);
  assert.equal(latencyFloor(rows, 1000, 'relaunchReadyMs').ms, 3);
  const floor = latencyFloor(rows, 1000, 'emitP50');
  assert.equal(verdict({ mean: 10, sd: 2 }, { mean: 26, sd: 3 }, undefined, undefined, undefined, floor).status, 'PLATFORM-BOUND');
  assert.equal(verdict({ mean: 10, sd: 2 }, { mean: 26.001, sd: 3 }, undefined, undefined, undefined, floor).status, 'FAIL');
  assert.throws(() => latencyFloor([{ ...rows[0], commit: [1, 2] }], 1000, 'emitP50'), /20 commit/);
  assert.throws(() => latencyFloor([{ ...rows[0], seed: { ...rows[0].seed, chunkBytes: [201, 299] } }], 1000, 'firstReadyMs'), /wire chunks/);
  assert.throws(() => latencyFloor([{ ...rows[0], database: 'another' }], 1000, 'emitP50'), /harness database/);
});

test('floor provenance rejects stale sessions, dates, devices, APIs, WebViews and APK hashes', () => {
  const expected = { session: 'test-session', date: '2026-10-22', device: 'Pixel', sdkLevel: '36', webview: '143',
    apkHashes: { classic: 'a'.repeat(64), sqlite: 'b'.repeat(64) } };
  assert.doesNotThrow(() => validateControlProvenance(expected, expected));
  for (const key of ['session', 'date', 'device', 'sdkLevel', 'webview']) {
    assert.throws(() => validateControlProvenance({ ...expected, [key]: 'stale' }, expected), /must match/);
  }
  assert.throws(() => validateControlProvenance({ ...expected, apkHashes: { ...expected.apkHashes, sqlite: 'c'.repeat(64) } }, expected), /APK hashes/);
  assert.throws(() => validateControlProvenance({ ...expected, apkHashes: {} }, { ...expected, apkHashes: {} }), /APK hashes/);
  assert.throws(() => latencyFloor([{ size: 1000 }, { size: 1000 }], 1000, 'emitP50'), /Duplicate/);
});

test('ADR-0067 workload code control: code delta allowance only with data parity', () => {
  const rows = [];
  for (let trial = 1; trial <= 5; trial++) {
    rows.push({ kind: 'workload-code', impl: 'classic', size: 1000, trial, point: 'todos', codeMb: 1.9, dataMb: 3.0 + trial / 1000 });
    rows.push({ kind: 'workload-code', impl: 'sqlite', size: 1000, trial, point: 'todos', codeMb: 2.7, dataMb: 2.9 });
  }
  const code = { ...workloadCodeBaseline(rows, 1000, 'heapTodosMb'), metric: 'heapTodosMb', justification: 'test' };
  assert.equal(code.point, 'todos');
  assert.equal(workloadCodeBaseline(rows, 10000, 'heapTodosMb'), undefined);
  assert.equal(verdict({ mean: 4.6, sd: 0.001 }, { mean: 5.38, sd: 0.01 }, undefined, undefined, undefined, undefined, code).status, 'CODE-BOUND');
  assert.equal(verdict({ mean: 4.6, sd: 0.001 }, { mean: 5.5, sd: 0.01 }, undefined, undefined, undefined, undefined, code).status, 'FAIL');
  const heavy = rows.map((row) => row.impl === 'sqlite' ? { ...row, dataMb: 3.2 } : row);
  const noParity = { ...workloadCodeBaseline(heavy, 1000, 'heapTodosMb'), metric: 'heapTodosMb', justification: 'test' };
  assert.equal(verdict({ mean: 4.6, sd: 0.001 }, { mean: 5.38, sd: 0.01 }, undefined, undefined, undefined, undefined, noParity).status, 'FAIL');
  assert.throws(() => workloadCodeBaseline(rows.slice(2), 1000, 'heapTodosMb'), /five unique paired/);
});
