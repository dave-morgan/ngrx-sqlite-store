#!/usr/bin/env node
// Run only while the statistical benchmark is stopped: this force-stops harness apps.
// Usage: node tools/android-commit-probe.mjs [--bulk] [--samples 100] [--serial emulator-5554]
// Timings are WebView -> native -> WebView elapsed times, including bridge transport.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const options = process.argv.slice(2);
const option = (name, fallback) => {
  const index = options.indexOf(`--${name}`);
  return index < 0 ? fallback : options[index + 1];
};
const samples = Number(option('samples', '100'));
if (!Number.isInteger(samples) || samples < 2) throw new Error('--samples must be an integer >= 2');
const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
if (!sdk) throw new Error('ANDROID_HOME or ANDROID_SDK_ROOT is required');
const adbPath = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const serial = option('serial', 'emulator-5554');
const adb = (...args) => execFileSync(adbPath, ['-s', serial, ...args], {
  cwd: root, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'],
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const packageName = 'dev.ngrxsqlite.harness.sqlite';
const port = Number(option('port', '9334'));
let browser;

try {
  for (const name of ['dev.ngrxsqlite.harness', 'dev.ngrxsqlite.harness.classic', packageName]) {
    adb('shell', 'am', 'force-stop', name);
  }
  adb('shell', 'am', 'start', '-n', `${packageName}/dev.ngrxsqlite.harness.MainActivity`);
  let socket;
  for (let attempt = 0; attempt < 300 && !socket; attempt++) {
    await delay(200);
    try {
      const pid = adb('shell', 'pidof', packageName).trim().split(/\s+/)[0];
      const candidate = `webview_devtools_remote_${pid}`;
      if (adb('shell', 'cat', '/proc/net/unix').includes(candidate)) socket = candidate;
    } catch { /* cold launch can temporarily have no PID */ }
  }
  if (!socket) throw new Error('No WebView CDP socket for sqlite benchmark APK');
  adb('forward', `tcp:${port}`, `localabstract:${socket}`);
  for (let attempt = 0; attempt < 50 && !browser; attempt++) {
    browser = await chromium.connectOverCDP(`http://localhost:${port}`).catch(() => undefined);
    if (!browser) await delay(200);
  }
  if (!browser) throw new Error('Could not connect to WebView');
  let page;
  for (let attempt = 0; attempt < 50 && !page; attempt++) {
    page = browser.contexts()[0]?.pages()[0];
    if (!page) await delay(200);
  }
  if (!page) throw new Error('No WebView page');
  await page.waitForFunction(() => Boolean(window.__harness), null, { timeout: 300_000 });
  await page.evaluate(() => window.__harness.settle());
  const result = await page.evaluate(async ({ count, bulk }) => {
    const plugin = window.Capacitor?.Plugins?.CapacitorSQLite;
    if (!plugin) throw new Error('Native CapacitorSQLite proxy unavailable on window.Capacitor.Plugins');
    const database = 'parity_commit';
    const base = { database, readonly: false };
    const query = (statement, values = []) => plugin.query({ ...base, statement, values });
    const execute = (statements) => plugin.execute({ ...base, statements, transaction: false });
    const batch = (set, transaction) => plugin.executeSet({ ...base, set, transaction, returnMode: 'no' });
    const stats = (values) => {
      const sorted = [...values].sort((a, b) => a - b);
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      return {
        n: values.length, mean, p50: sorted[Math.floor(values.length * 0.5)],
        p95: sorted[Math.min(values.length - 1, Math.floor(values.length * 0.95))],
        sd: Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)),
        samples: values,
      };
    };
    const output = { initial: {}, regimes: [], bulk: [] };
    let connected = false;
    let counter = 0;
    try {
      await plugin.createConnection({ ...base, encrypted: false, mode: 'no-encryption', version: 1 });
      connected = true;
      await plugin.open(base);
      output.initial = {
        journalMode: await query('PRAGMA journal_mode'), synchronous: await query('PRAGMA synchronous'),
        sqliteVersion: await query('SELECT sqlite_version() AS version'),
      };
      await execute('CREATE TABLE IF NOT EXISTS parity_update (id INTEGER PRIMARY KEY, value TEXT NOT NULL); INSERT OR IGNORE INTO parity_update(id,value) VALUES (1,\'initial\');');
      for (const [journal, synchronous] of [['DELETE', 'FULL'], ['WAL', 'FULL'], ['WAL', 'NORMAL']]) {
        const selectedJournal = await query(`PRAGMA journal_mode=${journal}`);
        await execute(`PRAGMA synchronous=${synchronous};`);
        const actual = { journalMode: await query('PRAGMA journal_mode'), synchronous: await query('PRAGMA synchronous') };
        const timings = [];
        for (let index = 0; index < count; index++) {
          const value = `update-${++counter}`;
          const start = performance.now();
          await batch([{ statement: 'UPDATE parity_update SET value=? WHERE id=1', values: [value] }], true);
          timings.push(performance.now() - start);
        }
        output.regimes.push({ requested: { journal, synchronous }, selectedJournal, actual, ...stats(timings) });
      }
      if (bulk) {
        // Identical 5-column records and 199 rows per bridge call in both variants.
        // Scalar variant has at most 995 bind parameters (< SQLite's portable 999 limit).
        await execute('CREATE TABLE IF NOT EXISTS parity_bulk (coll TEXT NOT NULL,id TEXT NOT NULL,pos REAL,sortkey TEXT,data TEXT NOT NULL,PRIMARY KEY(coll,id));');
        const rows = Array.from({ length: 5000 }, (_, id) => ['todos', `s:t${id}`, id, '', 'x'.repeat(136)]);
        const groups = [];
        for (let index = 0; index < rows.length; index += 199) groups.push(rows.slice(index, index + 199));
        for (const variant of ['scalar-values', 'json1']) {
          const statements = groups.map((group) => variant === 'scalar-values'
            ? { statement: `INSERT INTO parity_bulk(coll,id,pos,sortkey,data) VALUES ${group.map(() => '(?,?,?,?,?)').join(',')}`, values: group.flat() }
            : { statement: "INSERT INTO parity_bulk(coll,id,pos,sortkey,data) SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]'),json_extract(value,'$[3]'),json_extract(value,'$[4]') FROM json_each(?)", values: [JSON.stringify(group)] });
          await execute('DELETE FROM parity_bulk;');
          const start = performance.now();
          await plugin.beginTransaction(base);
          try {
            for (const statement of statements) await batch([statement], false);
            await plugin.commitTransaction(base);
          } catch (error) {
            await plugin.rollbackTransaction(base);
            throw error;
          }
          const elapsedMs = performance.now() - start;
          const check = await query('SELECT COUNT(*) AS count, SUM(length(data)) AS dataBytes FROM parity_bulk');
          output.bulk.push({ variant, rows: rows.length, rowsPerCall: 199, calls: statements.length,
            maxParameters: variant === 'scalar-values' ? 995 : 1,
            executeSetPayloadBytes: new TextEncoder().encode(JSON.stringify(statements)).length,
            elapsedMs, check, journalMode: await query('PRAGMA journal_mode'), synchronous: await query('PRAGMA synchronous') });
        }
      }
      return output;
    } finally {
      if (connected) {
        try { await plugin.close(base); }
        finally { await plugin.closeConnection(base); }
      }
    }
  }, { count: samples, bulk: options.includes('--bulk') });
  const date = new Date().toISOString().slice(0, 10);
  const report = {
    date, serial, packageName,
    device: adb('shell', 'getprop', 'ro.product.model').trim(),
    caveats: ['Regimes run DELETE/FULL, WAL/FULL, WAL/NORMAL in order; this is a diagnostic, not randomized acceptance evidence.',
      'Timings include bridge serialization, dispatch, native SQL/commit and response; they are not native-only CPU measurements.',
      'Bulk preparation is outside the timer; bulk operations share one transaction, equal row groups, schema, data and call counts.',
      'Database is isolated from harness state; no production driver settings are changed.'],
    ...result,
  };
  const directory = join(root, 'docs', 'benchmarks');
  mkdirSync(directory, { recursive: true });
  const file = join(directory, `android-commit-probe-${date}.json`);
  writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  console.log(file);
  console.log(JSON.stringify(result.regimes.map(({ requested, mean, p50, p95, sd }) => ({ requested, mean, p50, p95, sd })), null, 2));
  if (result.bulk.length) console.log(JSON.stringify(result.bulk, null, 2));
} finally {
  await browser?.close().catch(() => {});
  adb('shell', 'am', 'force-stop', packageName);
}
