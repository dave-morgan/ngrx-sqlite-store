import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import * as lifecycle from './shapes-lifecycle.mjs';
import { waitForHarnessReady, assertCompleteShapes, prepareShapesDocument } from './shapes-lifecycle.mjs';

test('setup waits for startup readiness and queued persistence before replacing the page', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<script>
      window.persisted = false;
      window.__harness = { settle: async () => {
        await new Promise(resolve => setTimeout(resolve, 80));
        window.persisted = true;
      }};
      setTimeout(() => { window.__harness.ready = { total: 500, ms: 50 }; }, 50);
    </script>`);
    await waitForHarnessReady(page);
    assert.deepEqual(await page.evaluate(() => ({ ready: !!window.__harness.ready, persisted: window.persisted })),
      { ready: true, persisted: true });
  } finally { await browser.close(); }
});

const paired = () => ['classic', 'sqlite'].map(impl => ({ impl, trial: 1, flat: { 50: { heapMb: 1 } }, workflow: { heapMb: 1 } }));
test('incomplete measurements cannot produce acceptance', () => {
  assert.throws(() => assertCompleteShapes(paired().slice(0, 1), 1, [50]), /Incomplete shapes run/);
  assert.throws(() => assertCompleteShapes([paired()[0], paired()[0]], 1, [50]), /duplicate/);
  assert.throws(() => assertCompleteShapes(paired(), 1, [50, 500]), /Incomplete shapes workload/);
  assert.doesNotThrow(() => assertCompleteShapes(paired(), 1, [50]));
});

test('persisted data with no todos-ready marker still waits for store settle', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<script>
      window.persisted = false;
      window.__harness = { settle: async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        window.persisted = true;
      }};
    </script>`);
    await waitForHarnessReady(page, 1000);
    assert.equal(await page.evaluate(() => window.persisted), true);
  } finally { await browser.close(); }
});

test('setup normalizes persisted background data after store initialization', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route('https://harness.test/**', route => route.fulfill({ contentType: 'text/html', body: `<script>
      window.rootTodos = 500;
      const boot = new Promise(resolve => setTimeout(() => { window.booted = true; resolve(); }, 50));
      window.__harness = {
        settle: () => boot,
        benchSeed: async n => { if (!window.booted) throw Error('Startup interrupted'); window.rootTodos = n; }
      };
    </script>` }));
    await page.goto('https://harness.test/');
    await prepareShapesDocument(page, 500);
    assert.deepEqual(await page.evaluate(() => ({ total: window.rootTodos, keys: localStorage.getItem('harness:flatKeys') })),
      { total: 50, keys: '500' });
  } finally { await browser.close(); }
});


test('startup settle has a deadline when native initialization never resolves', async () => {
  const page = { waitForFunction: async () => {}, evaluate: () => new Promise(() => {}) };
  await assert.rejects(waitForHarnessReady(page, 25), /startup settle.*25 ms/);
});

test('background normalization has a deadline after startup has settled', async () => {
  let evaluations = 0;
  const page = { waitForFunction: async () => {}, evaluate: () => ++evaluations === 1 ? Promise.resolve() : new Promise(() => {}) };
  await assert.rejects(prepareShapesDocument(page, 5000, 25), /background seed.*25 ms/);
});


test('paired shapes stops at the first failure and checkpoints completed rows', async () => {
  const failure = new Error('native initialization failed');
  const visited = [];
  const rows = [];
  let saved;
  await assert.rejects(lifecycle.runPairedShapes(3, async (impl, trial) => {
    visited.push(`${impl}/${trial}`);
    if (impl === 'sqlite') throw failure;
    return { impl, trial };
  }, rows, completed => { saved = structuredClone(completed); }), error => error === failure);
  assert.deepEqual(visited, ['classic/1', 'sqlite/1']);
  assert.deepEqual(saved, [{ impl: 'classic', trial: 1 }]);
  assert.deepEqual(rows, saved);
});

test('complete paired shapes retains alternating order and checkpoints every row', async () => {
  const rows = [];
  let saved;
  await lifecycle.runPairedShapes(2, async (impl, trial) => ({ impl, trial }), rows, completed => { saved = structuredClone(completed); });
  assert.deepEqual(rows.map(row => `${row.impl}/${row.trial}`), ['classic/1', 'sqlite/1', 'sqlite/2', 'classic/2']);
  assert.deepEqual(saved, rows);
});
