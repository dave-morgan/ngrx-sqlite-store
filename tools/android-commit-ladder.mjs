#!/usr/bin/env node
// Phase 15f diagnostic: single-transaction commit cost of F_commit's statement versus the
// store's real toggle writes, on the seeded harness database. Never an acceptance input.
// [--size 1000] [--samples 60] [--serial emulator-5554] [--output FILE]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { execAdb } from './android-adb.mjs';

const argv = process.argv.slice(2);
const option = (name, fallback) => argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback;
const adbFile = process.env.BENCH_ADB ?? join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe');
const adb = (...args) => execAdb(adbFile, ['-s', option('serial', 'emulator-5554'), ...args], {
  encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'],
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = 'dev.ngrxsqlite.harness';
const pkg = `${base}.sqlite`;
const size = Number(option('size', '1000'));
const samples = Number(option('samples', '60'));
const gap = Number(option('gap', '15'));

async function launch() {
  for (const name of [`${base}.classic`, pkg]) adb('shell', 'am', 'force-stop', name);
  adb('shell', 'am', 'start', '-n', `${pkg}/${base}.MainActivity`);
  for (let i = 0; i < 400; i++) {
    await delay(200);
    try {
      const pid = adb('shell', 'pidof', pkg).trim().split(/\s+/)[0];
      const socket = `webview_devtools_remote_${pid}`;
      if (!adb('shell', 'cat', '/proc/net/unix').includes(socket)) continue;
      adb('forward', 'tcp:9347', `localabstract:${socket}`);
      const browser = await chromium.connectOverCDP('http://localhost:9347');
      const page = browser.contexts()[0]?.pages()[0];
      if (page) return { browser, page };
      await browser.close();
    } catch { /* retry */ }
  }
  throw new Error(`Cannot attach to ${pkg}`);
}

adb('shell', 'pm', 'clear', pkg);
const { browser, page } = await launch();
try {
  await page.waitForFunction(() => window.__harness?.ready, null, { timeout: 300000 });
  await page.evaluate(async (n) => {
    localStorage.setItem('harness:seed', String(n));
    window.__harness.dispatch({ type: '[Seed] Reset' });
    await window.__harness.settle();
  }, size);
  await page.reload();
  await page.waitForFunction(() => window.__harness?.ready, null, { timeout: 300000 });
  await page.evaluate(() => window.__harness.settle());
  const result = await page.evaluate(async ({ count, gap }) => {
    const database = 'ngrx-harness';
    const native = (method, options) =>
      window.Capacitor.nativePromise('CapacitorSQLite', method, { database, readonly: false, ...options });
    const set = (statement, values) => native('executeSet', {
      set: [{ statement, values }], transaction: true, readonly: false, returnMode: 'no', isSQL92: true,
    });
    await native('execute', { statements: 'CREATE TABLE IF NOT EXISTS nss_bench(k INTEGER PRIMARY KEY, v TEXT)', transaction: false });
    const todo = (await native('query', { statement: "SELECT id, data FROM nss_entity WHERE coll='todos' ORDER BY pos LIMIT 1", values: [] })).values[0];
    const node = (await native('query', { statement: "SELECT path, value FROM nss_node WHERE value IS NOT NULL AND path GLOB 'ui/*' LIMIT 1", values: [] })).values[0];
    const flip = (json, i) => json.replace(/"done":(true|false)/, `"done":${i % 2 ? 'true' : 'false'}`);
    const steps = {
      'F_commit insert (nss_bench)': (i) => set('INSERT OR REPLACE INTO nss_bench(k,v) VALUES (1,?)', ['x'.repeat(32 + (i % 2))]),
      'todo UPDATE nss_entity (store toggle)': (i) => set('UPDATE nss_entity SET data = ? WHERE coll = ? AND id = ?', [flip(todo.data, i), 'todos', todo.id]),
      'node UPDATE nss_node (effect write)': (i) => set('UPDATE nss_node SET value = ? WHERE path = ?', [node.value, node.path]),
      'nss_bench UPDATE same bytes as todo': (i) => set('INSERT OR REPLACE INTO nss_bench(k,v) VALUES (2,?)', [flip(todo.data, i)]),
    };
    const out = {};
    for (const name of Object.keys(steps)) out[name] = [];
    for (let i = 0; i < count; i++) {
      const order = Object.keys(steps);
      if (i % 2) order.reverse();
      for (const name of order) {
        const began = performance.now();
        await steps[name](i);
        out[name].push(performance.now() - began);
        if (gap) await new Promise((r) => setTimeout(r, gap));
      }
    }
    const pragmas = {};
    for (const name of ['synchronous', 'journal_mode', 'wal_autocheckpoint', 'journal_size_limit', 'cache_size'])
      pragmas[name] = (await native('query', { statement: `PRAGMA ${name}`, values: [] })).values?.[0];
    const indexes = (await native('query', { statement: "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='nss_entity'", values: [] })).values;
    return { out, pragmas, indexes, todoBytes: todo.data.length, nodePath: node.path };
  }, { count: samples, gap });
  const pct = (v, p) => [...v].sort((a, b) => a - b)[Math.min(v.length - 1, Math.floor(v.length * p))];
  const summary = Object.fromEntries(Object.entries(result.out).map(([k, v]) => [k, { p50: pct(v, 0.5), p95: pct(v, 0.95), mean: v.reduce((a, b) => a + b, 0) / v.length }]));
  writeFileSync(option('output', `.tmp/commit-ladder-${size}-gap${gap}.json`), JSON.stringify({ size, samples, gap, ...result, summary }, null, 2) + '\n');
  console.log(JSON.stringify({ pragmas: result.pragmas, indexes: result.indexes, todoBytes: result.todoBytes, nodePath: result.nodePath }));
  for (const [k, v] of Object.entries(summary)) console.log(`${k.padEnd(40)} p50 ${v.p50.toFixed(2)} p95 ${v.p95.toFixed(2)} mean ${v.mean.toFixed(2)}`);
} finally {
  await browser.close().catch(() => {});
  adb('shell', 'am', 'force-stop', pkg);
}
