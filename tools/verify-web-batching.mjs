import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto(`${process.env.WEB_VERIFY_URL ?? 'http://localhost:4303'}/todos?seed=1000`);
  await page.waitForFunction(() => !!window.__harness);
  await page.waitForFunction(() =>
    /1000 total/.test(document.querySelector('[data-testid=todo-summary]')?.textContent ?? ''),
  );
  await page.evaluate(() => window.__harness.settle());
  const result = await page.evaluate(async () => {
    const jeep = document.querySelector('jeep-sqlite');
    const calls = [];
    const original = jeep.executeSet.bind(jeep);
    Object.defineProperty(jeep, 'executeSet', {
      configurable: true,
      value: async (opts) => {
        calls.push({ transaction: opts.transaction, statements: opts.set.length });
        return original(opts);
      },
    });
    window.__harness.dispatch({ type: '[Diagnostics] Benchmark Tick', n: 23 });
    await window.__harness.settle();
    window.__harness.dispatch({ type: '[UI] Theme Toggled' });
    await window.__harness.settle();
    const database = 'ngrx-harness';
    await original({
      database,
      set: [{ statement: 'CREATE TABLE phase13_probe(id INTEGER PRIMARY KEY)', values: [] }],
      transaction: true,
    });
    let rejected = false;
    try {
      await original({
        database,
        set: [1, 1].map((id) => ({
          statement: 'INSERT INTO phase13_probe(id) VALUES (?)',
          values: [id],
        })),
        transaction: true,
      });
    } catch {
      rejected = true;
    }
    const afterFailure = await jeep.query({
      database,
      statement: 'SELECT * FROM phase13_probe',
      values: [],
    });
    await jeep.beginTransaction({ database });
    await original({
      database,
      set: [{ statement: 'INSERT INTO phase13_probe(id) VALUES (?)', values: [2] }],
      transaction: false,
    });
    const inside = await jeep.query({
      database,
      statement: 'SELECT * FROM phase13_probe',
      values: [],
    });
    await jeep.rollbackTransaction({ database });
    const afterRollback = await jeep.query({
      database,
      statement: 'SELECT * FROM phase13_probe',
      values: [],
    });
    const active = await jeep.isTransactionActive({ database });
    await original({
      database,
      set: [{ statement: 'DROP TABLE phase13_probe', values: [] }],
      transaction: true,
    });
    return { calls, rejected, afterFailure, inside, afterRollback, active };
  });
  console.log(JSON.stringify({ ...result, failures }, null, 2));
  if (result.calls.length !== 2 || result.calls.some((c) => !c.transaction || c.statements !== 1))
    throw new Error('Expected one batch per scalar dispatch');
  if (
    !result.rejected ||
    result.afterFailure.values.length ||
    result.afterRollback.values.length ||
    result.inside.values[0].id !== 2 ||
    result.active.result
  )
    throw new Error('Web transaction state/rollback mismatch');
  if (failures.length) throw new Error(failures.join('\n'));
  await writeFile('tmp/phase13/web-batching.json', JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
