import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { toggleLatency } from './android-toggle-workload.mjs';

test('toggle workload ignores unrelated DOM mutations and observes every committed count change', async () => {
  let summary = '1 open';
  let observer;
  let dispatches = 0;
  let disconnected = 0;
  let tick = 0;
  const context = vm.createContext({
    document: { body: {}, querySelector: () => ({ textContent: summary }) },
    MutationObserver: class {
      constructor(callback) { observer = callback; }
      observe() {}
      disconnect() { disconnected++; }
    },
    performance: { now: () => ++tick },
    setTimeout: (resolve, ms) => { assert.equal(ms, 20); resolve(); },
    window: { __harness: { dispatch(action) {
      assert.deepEqual(JSON.parse(JSON.stringify(action)), { type: '[Todos] Todo Toggled', id: 't1' });
      dispatches++;
      observer(); // Unrelated mutation must not finish the measurement.
      assert.equal(disconnected, dispatches - 1);
      summary = summary === '1 open' ? '0 open' : '1 open';
      observer();
    } } },
  });
  const page = { evaluate: (fn, n) => vm.runInContext(`(${fn.toString()})(${n})`, context) };
  const samples = await toggleLatency(page, 30);
  assert.equal(dispatches, 30);
  assert.equal(disconnected, 30);
  assert.equal(samples.length, 30);
  assert.ok(samples.every(value => Number.isFinite(value) && value >= 0));
  assert.equal(summary, '1 open');
});
