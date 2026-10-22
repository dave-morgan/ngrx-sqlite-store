#!/usr/bin/env node
// Diagnostic only. Never run alongside android-bench.mjs.
// --empty: five paired empty-plugin controls per APK; --startup: persisted boot trace.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { execAdb } from './android-adb.mjs';
import { emptyControlPlan, summarize } from './benchmark-statistics.mjs';

const argv = process.argv.slice(2);
const option = (name, fallback) => argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback;
const adbFile = process.env.BENCH_ADB ?? join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe');
const adb = (...args) => execAdb(adbFile, ['-s', option('serial', 'emulator-5554'), ...args], {
  encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'],
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = 'dev.ngrxsqlite.harness';
const date = new Date().toISOString().slice(0, 10);
const provenance = {
  date, session: option('session', undefined),
  device: adb('shell', 'getprop', 'ro.product.model').trim(),
  sdkLevel: adb('shell', 'getprop', 'ro.build.version.sdk').trim(),
  webview: (adb('shell', 'dumpsys', 'webviewupdate').match(/Current WebView package.*:\s*\(([^)]+)\)/) ?? [])[1] ?? '?',
  apkHashes: Object.fromEntries(['classic', 'sqlite'].map((impl) => [impl,
    createHash('sha256').update(readFileSync(`.tmp/benchmark-apks/${impl}.apk`)).digest('hex')])),
};

async function launch(pkg) {
  for (const name of [base, `${base}.classic`, `${base}.sqlite`]) adb('shell', 'am', 'force-stop', name);
  adb('shell', 'am', 'start', '-n', `${pkg}/${base}.MainActivity`);
  for (let i = 0; i < 150; i++) {
    await delay(200);
    try {
      const pid = adb('shell', 'pidof', pkg).trim().split(/\s+/)[0];
      const socket = `webview_devtools_remote_${pid}`;
      if (!adb('shell', 'cat', '/proc/net/unix').includes(socket)) continue;
      adb('forward', 'tcp:9336', `localabstract:${socket}`);
      const browser = await chromium.connectOverCDP('http://localhost:9336');
      const page = browser.contexts()[0]?.pages()[0];
      if (page) return { browser, page };
      await browser.close();
    } catch { /* socket and page can appear independently */ }
  }
  throw new Error(`Cannot attach to ${pkg}`);
}

function pss(pkg) {
  const read = (target) => {
    const raw = adb('shell', 'dumpsys', 'meminfo', target);
    const match = raw.match(/TOTAL PSS:\s+(\d+)/) ?? raw.match(/TOTAL\s+(\d+)/);
    if (!match) throw new Error(`No PSS for ${target}`);
    return { mb: Number(match[1]) / 1024, raw };
  };
  const app = read(pkg);
  const renderers = adb('shell', 'ps', '-A').split(/\r?\n/)
    .filter((line) => /sandboxed_process/.test(line)).map((line) => read(line.trim().split(/\s+/)[1]));
  return { app, renderers, totalMb: app.mb + renderers.reduce((sum, row) => sum + row.mb, 0) };
}

const results = [];
let active;
let browser;
try {
  if (argv.includes('--empty') || argv.includes('--empty-store')) {
    const emptyStore = argv.includes('--empty-store');
    const controlKey = emptyStore ? 'harness:empty-store' : 'harness:empty';
    const schedule = emptyControlPlan(emptyStore, Number(option('trials', 5)));
    for (const { apk, pairs } of schedule) {
      active = `${base}.${apk}`;
      ({ browser } = await launch(active));
      let page = browser.contexts()[0].pages()[0];
      await page.waitForFunction(() => window.__harness || window.__emptyReady);
      await page.evaluate(() => { localStorage.removeItem('harness:profile'); });
      for (const { impl: mode, trial } of pairs) {
        await page.evaluate(({ key, value }) => {
          localStorage.removeItem('harness:empty');
          localStorage.removeItem('harness:empty-store');
          localStorage.setItem(key, value);
        }, { key: controlKey, value: mode });
        // Chromium batches localStorage disk commits. Force-stop immediately
        // after setItem can discard a control that was visible in the old JS VM.
        await delay(6000);
        await browser.close();
        const session = await launch(active);
        browser = session.browser;
        page = session.page;
        await session.page.waitForFunction(() => window.__emptyReady);
        if (emptyStore && mode === 'sqlite') {
          const counts = await page.evaluate(async () => (await window.Capacitor.nativePromise('CapacitorSQLite', 'query', {
            database: 'ngrx-sqlite-store', readonly: false, values: [],
            statement: 'SELECT (SELECT count(*) FROM nss_node) + (SELECT count(*) FROM nss_entity) + (SELECT count(*) FROM nss_chunk) AS n',
          })).values);
          if (counts?.[0]?.n !== 0) throw new Error('Empty-store control contains state data');
        }
        await delay(2000);
        const cdp = await session.page.context().newCDPSession(session.page);
        await cdp.send('HeapProfiler.collectGarbage');
        await delay(300);
        await cdp.send('HeapProfiler.collectGarbage');
        const heap = await cdp.send('Runtime.getHeapUsage');
        await cdp.detach();
        const memory = pss(active);
        const timing = await session.page.evaluate(() => window.__emptyReady);
        if (emptyStore && timing.kind !== 'empty-store') throw new Error('Not a real empty store');
        const row = { apk, mode, trial, kind: emptyStore ? 'empty-store' : 'empty-plugin', heapMb: heap.usedSize / 1048576, pssTotalMb: memory.totalMb, timing, memory };
        results.push(row);
        console.log(JSON.stringify({ ...row, memory: undefined }));
      }
      await page.evaluate((key) => localStorage.removeItem(key), controlKey);
      await delay(6000);
      await browser.close();
      browser = undefined;
    }
  } else if (argv.includes('--memory')) {
    active = `${base}.sqlite`;
    const session = await launch(active);
    browser = session.browser;
    const page = session.page;
    await page.waitForFunction(() => window.__harness?.ready, null, { timeout: 300_000 });
    for (const size of option('sizes', '1000,10000,50000').split(',').map(Number)) {
      await page.evaluate(() => window.__harness.settle());
      const beforeSeed = pss(active);
      const seed = await page.evaluate((n) => window.__harness.benchSeed(n), size);
      const afterSeed = pss(active);
      const cache = await page.evaluate(async () => {
        const stats = {};
        for (const name of ['cache_size', 'page_size', 'page_count', 'freelist_count'])
          stats[name] = (await window.Capacitor.nativePromise('CapacitorSQLite', 'query', {
            database: 'ngrx-harness', statement: `PRAGMA ${name}`, values: [], readonly: false,
          })).values;
        await window.Capacitor.nativePromise('CapacitorSQLite', 'execute', {
          database: 'ngrx-harness', statements: 'PRAGMA shrink_memory', transaction: false, readonly: false,
        });
        return stats;
      });
      const afterShrink = pss(active);
      const row = { size, seed, beforeSeed, afterSeed, afterShrink, cache };
      results.push(row);
      console.log(JSON.stringify({ size, seed, beforeSeed: beforeSeed.totalMb,
        afterSeed: afterSeed.totalMb, afterShrink: afterShrink.totalMb, cache }));
    }
  } else {
    active = `${base}.sqlite`;
    let session = await launch(active);
    browser = session.browser;
    await session.page.waitForFunction(() => window.__harness || window.__emptyReady);
    const seed = option('seed', undefined);
    await session.page.evaluate(async ({ size, noPrewarm }) => {
      localStorage.removeItem('harness:empty');
      if (noPrewarm) localStorage.setItem('harness:no-prewarm', 'true');
      else localStorage.removeItem('harness:no-prewarm');
      if (size !== undefined) {
        await window.__harness.settle();
        await window.__harness.benchSeed(Number(size));
        localStorage.setItem('harness:seed', String(size));
      }
      localStorage.setItem('harness:profile', 'true');
    }, { size: seed === undefined ? undefined : Number(seed), noPrewarm: argv.includes('--no-prewarm') });
    await delay(6000);
    await browser.close();
    session = await launch(active);
    browser = session.browser;
    await session.page.waitForFunction(() => window.__harness?.ready, null, { timeout: 300_000 });
    await session.page.evaluate(() => window.__harness.settle());
    const startup = await session.page.evaluate(() => ({
      ready: window.__harness.ready, calls: window.__startupTrace,
      profileFlag: localStorage.getItem('harness:profile'),
      marks: performance.getEntriesByType('mark').map(({ name, startTime }) => ({ name, startTime })),
    }));
    if (!startup.calls?.length || startup.profileFlag !== 'true') throw new Error('Startup trace missing after restart: control not persisted');
    results.push(startup);
  }
  const summaries = argv.includes('--empty') ? ['classic', 'sqlite'].flatMap((apk) => ['classic', 'sqlite'].flatMap((mode) =>
    ['heapMb', 'pssTotalMb'].map((metric) => ({ apk, mode, metric,
      ...summarize(results.filter((row) => row.apk === apk && row.mode === mode).map((row) => row[metric])),
    })))) : undefined;
  const file = option('output', `docs/benchmarks/android-${argv.includes('--empty') ? 'empty-platform' : 'startup'}-${date}.json`);
  writeFileSync(file, JSON.stringify({ ...provenance, results, summaries }, null, 2) + '\n');
  console.log(file, summaries ?? '');
} finally {
  if (browser) {
    const page = browser.contexts()[0]?.pages()[0];
    await page?.evaluate(() => {
      localStorage.removeItem('harness:empty'); localStorage.removeItem('harness:empty-store'); localStorage.removeItem('harness:profile'); localStorage.removeItem('harness:no-prewarm');
    }).catch(() => {});
    await delay(6000);
    await browser.close().catch(() => {});
  }
  if (active) adb('shell', 'am', 'force-stop', active);
}
