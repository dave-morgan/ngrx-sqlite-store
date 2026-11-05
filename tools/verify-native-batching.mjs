import { benchmarkSerial } from './android-benchmark-target.mjs';
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
const adbPath = join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe');
const adb = (...a) => execFileSync(adbPath, ['-s', benchmarkSerial(), ...a], { encoding: 'utf8' });
const socket = adb('shell', 'cat', '/proc/net/unix').match(/webview_devtools_remote_\d+/)[0];
adb('forward', 'tcp:9333', `localabstract:${socket}`);
const browser = await chromium.connectOverCDP('http://localhost:9333');
const page = browser.contexts()[0].pages()[0];
try {
  if (process.argv.includes('--load')) {
    await page.evaluate(() => {
      void window.Capacitor.nativePromise('WebView', 'setServerBasePath', {
        path: '/data/user/0/dev.ngrxsqlite.harness/files/phase13-web',
      });
    });
    await page.waitForTimeout(1500);
  }
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 120000 });
  await page.evaluate(() => window.__harness.settle());
  console.log('platform', await page.evaluate(() => window.Capacitor.getPlatform()));
  await page.evaluate(() => {
    window.__phase13Calls = [];
    const original = window.Capacitor.nativePromise;
    window.Capacitor.nativePromise = function (plugin, method, opts) {
      if (plugin === 'CapacitorSQLite')
        window.__phase13Calls.push({
          method,
          statements: opts?.set?.length,
          transaction: opts?.transaction,
        });
      return original.apply(this, arguments);
    };
  });
  const measure = async (name, action) => {
    const result = await page.evaluate(async (action) => {
      window.__phase13Calls.length = 0;
      const start = performance.now();
      window.__harness.dispatch(action);
      await window.__harness.settle();
      return { calls: [...window.__phase13Calls], ms: performance.now() - start };
    }, action);
    console.log(name, JSON.stringify(result));
    return result;
  };
  const scalar = await measure('scalar', {
    type: '[Diagnostics] Benchmark Tick',
    n: Date.now() % 10000,
  });
  const toggle = await measure('toggle (includes harness effect action)', {
    type: '[Todos] Todo Toggled',
    id: 't1',
  });
  if (!scalar.calls.some((c) => c.method === 'executeSet'))
    throw new Error('Scalar did not use executeSet');
  if (scalar.calls.length > 1) throw new Error(`Scalar used ${scalar.calls.length} bridge calls`);
  const failures = [];
  page.on('pageerror', (e) => failures.push(e.message));
  for (let i = 0; i < 3; i++)
    await measure('repeat', { type: '[Diagnostics] Benchmark Tick', n: i + 20000 });
  if (failures.length) throw new Error(failures.join('\n'));
  const probe = await page.evaluate(async () => {
    const database = 'ngrx-harness';
    const call = (method, opts = {}) =>
      window.Capacitor.nativePromise('CapacitorSQLite', method, {
        database,
        readonly: false,
        ...opts,
      });
    const batch = (set, transaction) => call('executeSet', { set, transaction });
    await batch(
      [{ statement: 'CREATE TABLE phase13_probe(id INTEGER PRIMARY KEY)', values: [] }],
      true,
    );
    let rejected = false;
    try {
      await batch(
        [1, 1].map((id) => ({
          statement: 'INSERT INTO phase13_probe(id) VALUES (?)',
          values: [id],
        })),
        true,
      );
    } catch {
      rejected = true;
    }
    const query = () => call('query', { statement: 'SELECT * FROM phase13_probe', values: [] });
    const afterFailure = await query();
    await call('beginTransaction');
    await batch([{ statement: 'INSERT INTO phase13_probe(id) VALUES (?)', values: [2] }], false);
    const inside = await query();
    await call('rollbackTransaction');
    const afterRollback = await query();
    const active = await call('isTransactionActive');
    await batch([{ statement: 'DROP TABLE phase13_probe', values: [] }], true);
    return { rejected, afterFailure, inside, afterRollback, active };
  });
  console.log('transaction probe', JSON.stringify(probe));
  if (
    !probe.rejected ||
    probe.afterFailure.values.length ||
    probe.afterRollback.values.length ||
    probe.inside.values[0].id !== 2 ||
    probe.active.result
  )
    throw new Error('Native transaction state/rollback mismatch');
  await writeFile(
    'tmp/phase13/native-batching.json',
    JSON.stringify({ scalar, toggle, probe, failures }, null, 2),
  );
} finally {
  await browser.close();
}
