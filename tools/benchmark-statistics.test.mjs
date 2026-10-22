import assert from 'node:assert/strict';
import test from 'node:test';
import { platformBaseline, summarize, verdict, trialOrder } from './benchmark-statistics.mjs';

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
