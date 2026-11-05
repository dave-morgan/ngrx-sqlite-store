#!/usr/bin/env node
import { benchmarkSerial, benchmarkPort } from './android-benchmark-target.mjs';
// ADR-0069 control F_commit_render: in the CLASSIC APK (same WebView, Capacitor and SQLite
// plugin, no ngrx-sqlite-store), run android-bench's real toggle loop; 20 ms after each
// toggle's DOM change -- exactly when the next benchmark toggle's commit would start --
// time one raw atomic native commit on a scratch database. Captures the Capacitor bridge's
// main-thread dependency during the toggle's repaint, without any store work.
// --session ID [--sizes 1000,10000,50000] [--samples 30] [--serial emulator-5554] [--output FILE]
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { execAdb } from './android-adb.mjs';

const argv = process.argv.slice(2);
const option = (name, fallback) => argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback;
const adbFile = process.env.BENCH_ADB ?? join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe');
const adb = (...args) => execAdb(adbFile, ['-s', benchmarkSerial(option('serial')), ...args], { encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = 'dev.ngrxsqlite.harness';
const pkg = `${base}.classic`;
const sizes = option('sizes', '1000,10000,50000').split(',').map(Number);
const samples = Number(option('samples', '30'));
const trials = Number(option('trials', '3'));
const date = new Date().toISOString().slice(0, 10);
const provenance = {
  date, session: option('session', undefined),
  device: adb('shell', 'getprop', 'ro.product.model').trim(),
  sdkLevel: adb('shell', 'getprop', 'ro.build.version.sdk').trim(),
  webview: (adb('shell', 'dumpsys', 'webviewupdate').match(/Current WebView package.*:\s*\(([^)]+)\)/) ?? [])[1] ?? '?',
  apkHashes: Object.fromEntries(['classic', 'sqlite'].map((impl) => [impl,
    createHash('sha256').update(readFileSync(`.tmp/benchmark-apks/${impl}.apk`)).digest('hex')])),
};

async function launch() {
  for (const name of [pkg, `${base}.sqlite`]) adb('shell', 'am', 'force-stop', name);
  adb('shell', 'am', 'start', '-n', `${pkg}/${base}.MainActivity`);
  for (let i = 0; i < 400; i++) {
    await delay(200);
    try {
      const pid = adb('shell', 'pidof', pkg).trim().split(/\s+/)[0];
      const socket = `webview_devtools_remote_${pid}`;
      if (!adb('shell', 'cat', '/proc/net/unix').includes(socket)) continue;
      adb('forward', `tcp:${benchmarkPort(9351)}`, `localabstract:${socket}`);
      const browser = await chromium.connectOverCDP(`http://localhost:${benchmarkPort(9351)}`);
      const page = browser.contexts()[0]?.pages()[0];
      if (page) return { browser, page };
      await browser.close();
    } catch { /* retry */ }
  }
  throw new Error(`Cannot attach to ${pkg}`);
}

const results = [];
for (let trial = 1; trial <= trials; trial++) {
  for (const size of sizes) {
    adb('shell', 'pm', 'clear', pkg);
    const { browser, page } = await launch();
    try {
      await page.waitForFunction(() => window.__harness?.ready, null, { timeout: 300000 });
      await page.evaluate((n) => localStorage.setItem('harness:seed', String(n)), size);
      await page.goto(`https://localhost/todos?seed=${size}`);
      await page.waitForFunction((n) => window.__harness?.ready?.total === n, size, { timeout: 300000 });
      await page.evaluate(() => window.__harness.settle());
      const commits = await page.evaluate(async (n) => {
        const native = (method, options) => window.Capacitor.nativePromise('CapacitorSQLite', method, options);
        const database = 'nss_render_control';
        await native('createConnection', { database, version: 1, encrypted: false, mode: 'no-encryption', readonly: false }).catch(() => undefined);
        await native('open', { database, readonly: false });
        await native('query', { database, readonly: false, statement: 'PRAGMA journal_mode=WAL', values: [] });
        await native('execute', { database, readonly: false, statements: 'CREATE TABLE IF NOT EXISTS nss_bench(k INTEGER PRIMARY KEY, v TEXT)', transaction: false });
        const commit = () => native('executeSet', { database, readonly: false, transaction: true, returnMode: 'no', isSQL92: true,
          set: [{ statement: 'INSERT OR REPLACE INTO nss_bench(k,v) VALUES (1,?)', values: ['x'.repeat(32)] }] });
        const summary = () => document.querySelector('[data-testid=todo-summary]')?.textContent ?? '';
        const out = [];
        const pairs = [];
        // ADR-0071 pair series: the store persists the toggle's effect action too. Its commit
        // starts right after the DOM change (scanned emission); the next toggle's commit
        // starts 20 ms later and, with ADR-0023 ordering, cannot complete before it.
        for (let i = 0; i < n; i++) {
          const before = summary();
          const changed = new Promise((resolve) => {
            const obs = new MutationObserver(() => { if (summary() !== before) { obs.disconnect(); resolve(); } });
            obs.observe(document.body, { subtree: true, characterData: true, childList: true });
          });
          window.__harness.dispatch({ type: '[Todos] Todo Toggled', id: 't1' });
          await changed;
          // The persisted effect action renders after its own commit: a second DOM change
          // (and frame), exactly where the store's effect-observation update lands.
          const observation = document.querySelector('[data-testid=effect-observation]');
          const effect = commit().then(() => {
            if (observation) observation.textContent = `${observation.textContent ?? ''}`.endsWith(' ')
              ? (observation.textContent ?? '').trimEnd() : `${observation.textContent ?? ''} `;
          });
          await new Promise((r) => setTimeout(r, 20));
          const began = performance.now();
          await effect;
          await commit();
          pairs.push(performance.now() - began);
        }
        for (let i = 0; i < n; i++) {
          const before = summary();
          const changed = new Promise((resolve) => {
            const obs = new MutationObserver(() => { if (summary() !== before) { obs.disconnect(); resolve(); } });
            obs.observe(document.body, { subtree: true, characterData: true, childList: true });
          });
          window.__harness.dispatch({ type: '[Todos] Todo Toggled', id: 't1' });
          await changed;
          await new Promise((r) => setTimeout(r, 20)); // android-bench toggle gap
          const began = performance.now();
          await commit();
          out.push(performance.now() - began);
        }
        await native('close', { database, readonly: false }).catch(() => undefined);
        await native('closeConnection', { database, readonly: false }).catch(() => undefined);
        return { out, pairs };
      }, samples);
      const row = { kind: 'render-commit', size, trial, samples: commits.out, pairSamples: commits.pairs };
      results.push(row);
      const mid = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
      console.log(JSON.stringify({ size, trial, p50: mid(commits.out), pairP50: mid(commits.pairs) }));
    } finally {
      await browser.close().catch(() => {});
      adb('shell', 'am', 'force-stop', pkg);
    }
  }
}
const output = option('output', `docs/benchmarks/android-render-commit-${date}.json`);
writeFileSync(output, JSON.stringify({ ...provenance, samples, trials, results }, null, 2) + '\n');
const pct = (v, p) => [...v].sort((a, b) => a - b)[Math.min(v.length - 1, Math.floor(v.length * p))];
for (const size of sizes) {
  const all = results.filter((row) => row.size === size).flatMap((row) => row.samples);
  const pairs = results.filter((row) => row.size === size).flatMap((row) => row.pairSamples ?? []);
  console.log(`size ${size}: n=${all.length} p50 ${pct(all, 0.5).toFixed(1)} p95 ${pct(all, 0.95).toFixed(1)} | pair p50 ${pct(pairs, 0.5).toFixed(1)} p95 ${pct(pairs, 0.95).toFixed(1)}`);
}
console.log(`wrote ${output}`);
