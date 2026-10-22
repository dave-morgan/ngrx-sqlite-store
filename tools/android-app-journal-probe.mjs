#!/usr/bin/env node
// Diagnostic only: stops harness apps. Never run alongside android-bench.mjs.
// Usage: node tools/android-app-journal-probe.mjs [--serial emulator-5554] [--port 9335]
// Temporarily changes the actual harness database PRAGMAs; restores both in finally.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? fallback : args[index + 1];
};
const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
if (!sdk) throw new Error('ANDROID_HOME or ANDROID_SDK_ROOT is required');
const adbFile = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const serial = option('serial', 'emulator-5554');
const adb = (...values) => execFileSync(adbFile, ['-s', serial, ...values], {
  cwd: root, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'],
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const packageName = 'dev.ngrxsqlite.harness.sqlite';
const port = Number(option('port', '9335'));
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
    } catch { /* retry during cold launch */ }
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
  await page.waitForFunction(() => Boolean(window.__harness?.benchTrace), null, { timeout: 300_000 });
  // Prior benchmark sessions may have persisted the diagnostics route.
  await page.getByTestId('nav-todos').click();
  await page.getByTestId('todo-summary').waitFor({ timeout: 300_000 });
  await page.getByTestId('nav-diagnostics').click();
  await page.getByTestId('bench').waitFor({ timeout: 300_000 });
  await page.evaluate(() => window.__harness.settle());
  const verifyDriver = args.includes('--verify-driver');
  const result = await page.evaluate(async ({ verifyDriver }) => {
    const plugin = window.Capacitor?.Plugins?.CapacitorSQLite;
    if (!plugin) throw new Error('No native SQLite proxy');
    const database = 'ngrx-harness';
    const base = { database, readonly: false };
    const query = (statement) => plugin.query({ ...base, statement, values: [] });
    const execute = (statements) => plugin.execute({ ...base, statements, transaction: false });
    const scalar = (response) => Object.values(response.values[0])[0];
    const settings = async () => ({ journalMode: await query('PRAGMA journal_mode'), synchronous: await query('PRAGMA synchronous') });
    const initial = await settings();
    if (verifyDriver) {
      const journalMode = String(scalar(initial.journalMode)).toLowerCase();
      const synchronous = Number(scalar(initial.synchronous));
      return { initial, verification: { pass: journalMode === 'wal', expectedJournalMode: 'wal', journalMode, synchronous } };
    }
    const originalJournal = String(scalar(initial.journalMode));
    const originalSync = Number(scalar(initial.synchronous));
    const output = { initial, regimes: [], nativeTrace: [], restored: undefined };
    const summarize = (emission) => {
      const mean = emission.samples.reduce((sum, value) => sum + value, 0) / emission.samples.length;
      const sd = Math.sqrt(emission.samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (emission.samples.length - 1));
      return { ...emission, mean, sd };
    };
    const measure = async (label) => {
      await window.__harness.settle();
      const actual = await settings();
      const emission = await window.__harness.benchEmit(100);
      await window.__harness.settle();
      output.regimes.push({ label, actual, ...summarize(emission) });
    };
    const restoreSettings = async () => {
      await window.__harness.settle();
      await query('PRAGMA journal_mode=' + originalJournal);
      await execute('PRAGMA synchronous=' + originalSync + ';');
      output.restored = await settings();
    };
    try {
      await measure('ORIGINAL');
      const capacitor = window.Capacitor;
      const nativePromise = capacitor.nativePromise;
      if (typeof nativePromise !== 'function') throw new Error('Capacitor.nativePromise missing');
      capacitor.nativePromise = function (...args) {
        const row = { plugin: args[0], method: args[1], options: structuredClone(args[2]), ms: undefined };
        output.nativeTrace.push(row);
        const start = performance.now();
        return Promise.resolve(nativePromise.apply(this, args)).finally(() => { row.ms = performance.now() - start; });
      };
      try {
        output.tracedEmission = await window.__harness.benchEmit(3);
        await window.__harness.settle();
      } finally {
        capacitor.nativePromise = nativePromise;
      }
      for (const [journal, synchronous] of [['WAL', 'FULL'], ['WAL', 'NORMAL']]) {
        await query('PRAGMA journal_mode=' + journal);
        await execute('PRAGMA synchronous=' + synchronous + ';');
        await measure(journal + '/' + synchronous);
      }
      await restoreSettings();
      await measure('ORIGINAL-RESTORED');
      return output;
    } finally {
      await restoreSettings();
    }
  }, { verifyDriver });
  const date = new Date().toISOString().slice(0, 10);
  const report = {
    date, serial, packageName, device: adb('shell', 'getprop', 'ro.product.model').trim(),
    caveat: verifyDriver ? 'Read-only verification of driver startup configuration; no PRAGMA settings are changed.'
      : 'Actual harness database. Regimes run in fixed order, 100 emissions each; diagnostic only. Original journal and synchronous settings are restored in finally. nativePromise trace captures options before mutation.',
    ...result,
  };
  const directory = join(root, 'docs', 'benchmarks');
  mkdirSync(directory, { recursive: true });
  const file = join(directory, (verifyDriver ? 'android-driver-journal-verification-' : 'android-app-journal-probe-') + date + '.json');
  writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  console.log(file);
  if (verifyDriver) {
    console.log(JSON.stringify(result.verification));
    if (!result.verification.pass) process.exitCode = 1;
  } else {
  for (const regime of result.regimes) console.log(JSON.stringify({ label: regime.label, mean: regime.mean, sd: regime.sd, p50: regime.p50, p95: regime.p95, actual: regime.actual }));
  console.log(JSON.stringify({ nativeTrace: result.nativeTrace, tracedEmission: result.tracedEmission, restored: result.restored }, null, 2));
  }
} finally {
  await browser?.close().catch(() => {});
  adb('shell', 'am', 'force-stop', packageName);
}
