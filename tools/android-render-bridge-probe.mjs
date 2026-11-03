#!/usr/bin/env node
import { benchmarkSerial } from './android-benchmark-target.mjs';
// Phase 15f control: native round trips issued while the WebView repaints a DOM change, on
// the real todos page with android-bench's toggle pacing, without the store. Measures
// the Capacitor bridge's main-thread dependency (WebMessageListener + RenderThread draw).
// [--size 1000] [--samples 30] [--serial emulator-5554] [--output FILE]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { execAdb } from './android-adb.mjs';

const argv = process.argv.slice(2);
const option = (name, fallback) => argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback;
const adbFile = process.env.BENCH_ADB ?? join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe');
const adb = (...args) => execAdb(adbFile, ['-s', benchmarkSerial(option('serial')), ...args], { encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = 'dev.ngrxsqlite.harness';
const pkg = `${base}.sqlite`;
const size = Number(option('size', '1000'));
const samples = Number(option('samples', '30'));

async function launch() {
  for (const name of [`${base}.classic`, pkg]) adb('shell', 'am', 'force-stop', name);
  adb('shell', 'am', 'start', '-n', `${pkg}/${base}.MainActivity`);
  for (let i = 0; i < 400; i++) {
    await delay(200);
    try {
      const pid = adb('shell', 'pidof', pkg).trim().split(/\s+/)[0];
      const socket = `webview_devtools_remote_${pid}`;
      if (!adb('shell', 'cat', '/proc/net/unix').includes(socket)) continue;
      adb('forward', 'tcp:9350', `localabstract:${socket}`);
      const browser = await chromium.connectOverCDP('http://localhost:9350');
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
  const result = await page.evaluate(async (n) => {
    const database = 'ngrx-harness';
    const native = (method, options) => window.Capacitor.nativePromise('CapacitorSQLite', method, options);
    await native('execute', { database, readonly: false, statements: 'CREATE TABLE IF NOT EXISTS nss_bench(k INTEGER PRIMARY KEY, v TEXT)', transaction: false });
    const commit = () => native('executeSet', { database, readonly: false, transaction: true, returnMode: 'no', isSQL92: true,
      set: [{ statement: 'INSERT OR REPLACE INTO nss_bench(k,v) VALUES (1,?)', values: ['x'.repeat(32)] }] });
    const echo = () => native('echo', { value: 'x' });
    // A visible text change in the same element the toggle benchmark observes.
    const target = document.querySelector('[data-testid=todo-summary]');
    const original = target.textContent;
    const row = document.querySelector('[data-testid^=todo-item], li, tr');
    const modes = {
      'commit, no DOM change': async () => { const t = performance.now(); await commit(); return performance.now() - t; },
      // Toggle-like: mutate DOM (as the previous toggle's render does), then the next
      // native call starts after the same 20 ms gap the benchmark uses.
      'commit after DOM change': async (i) => {
        target.textContent = `${original} ${i % 2 ? '·' : ''}`;
        row?.classList.toggle('nss-probe');
        await new Promise((r) => setTimeout(r, 20));
        const t = performance.now(); await commit(); return performance.now() - t;
      },
      'echo, no DOM change': async () => { const t = performance.now(); await echo(); return performance.now() - t; },
      'echo after DOM change': async (i) => {
        target.textContent = `${original} ${i % 2 ? '·' : ''}`;
        row?.classList.toggle('nss-probe');
        await new Promise((r) => setTimeout(r, 20));
        const t = performance.now(); await echo(); return performance.now() - t;
      },
    };
    const out = Object.fromEntries(Object.keys(modes).map((k) => [k, []]));
    for (const name of Object.keys(modes)) {
      for (let i = 0; i < n; i++) {
        out[name].push(await modes[name](i));
        await new Promise((r) => setTimeout(r, 20));
      }
    }
    target.textContent = original;
    return out;
  }, samples);
  const pct = (v, p) => [...v].sort((a, b) => a - b)[Math.min(v.length - 1, Math.floor(v.length * p))];
  const summary = Object.fromEntries(Object.entries(result).map(([k, v]) => [k, { p50: pct(v, 0.5), p95: pct(v, 0.95), mean: v.reduce((a, b) => a + b, 0) / v.length }]));
  writeFileSync(option('output', `.tmp/render-bridge-${size}.json`), JSON.stringify({ size, samples, result, summary }, null, 2) + '\n');
  for (const [k, v] of Object.entries(summary)) console.log(`${k.padEnd(26)} p50 ${v.p50.toFixed(1).padStart(6)} p95 ${v.p95.toFixed(1).padStart(6)} mean ${v.mean.toFixed(1).padStart(6)}`);
} finally {
  await browser.close().catch(() => {});
  adb('shell', 'am', 'force-stop', pkg);
}
