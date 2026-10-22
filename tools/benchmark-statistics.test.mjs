import assert from 'node:assert/strict';
import test from 'node:test';
import { summarize, verdict, trialOrder } from './benchmark-statistics.mjs';

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
