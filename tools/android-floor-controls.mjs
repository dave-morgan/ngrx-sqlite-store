#!/usr/bin/env node
// ADR-0051 native controls. Never run alongside another device runner.
// --session ID [--sizes 1000,10000,50000] [--output FILE]
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const argv = process.argv.slice(2);
const option = (name, fallback) => argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback;
const adbFile = join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe');
const adb = (...args) => execFileSync(adbFile, ['-s', option('serial', 'emulator-5554'), ...args], {
  encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'],
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** App-process TOTAL PSS in MB (diagnostic only; acceptance uses android-bench's app+renderer total). */
const pss = (pkg) => {
  const out = adb('shell', 'dumpsys', 'meminfo', pkg);
  const m = out.match(/TOTAL PSS:\s+(\d+)/) ?? out.match(/TOTAL\s+(\d+)/);
  return m ? Number(m[1]) / 1024 : null;
};
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

const results = [];
const sizes = option('sizes', '1000,10000,50000').split(',').map(Number);
const active = `${base}.sqlite`;
let browser;
try {
  for (const size of sizes) {
    // Match the acceptance trial's fresh database and avoid previous scratch-file
    // growth influencing open. Each size is independently populated.
    adb('shell', 'pm', 'clear', active);
    let session = await launch(active);
    browser = session.browser;
    let page = session.page;
    await page.waitForFunction(() => window.__harness?.ready || window.__floor || window.__emptyReady, null, { timeout: 300000 });
    // Reset using a normal store run, then profile an actual fresh seed separately
    // from the controls. Its wire chunk bytes are the control input.
    // The first launch seeded the default size; reset it so the reload seeds `size`
    // (otherwise the persisted seed version skips seeding and `ready` never fires).
    await page.evaluate(async (n) => {
      localStorage.removeItem('harness:empty');
      localStorage.removeItem('harness:profile');
      localStorage.setItem('harness:seed', String(n));
      if (window.__harness?.dispatch) {
        window.__harness.dispatch({ type: '[Seed] Reset' });
        await window.__harness.settle();
      }
    }, size);
    await page.reload();
    await page.waitForFunction(() => window.__harness?.ready, null, { timeout: 300000 });
    await page.evaluate(async () => {
      window.__harness.dispatch({ type: '[Seed] Reset' });
      await window.__harness.settle();
      localStorage.setItem('harness:profile', 'true');
    });
    await page.reload();
    await page.waitForFunction(() => window.__harness?.ready, null, { timeout: 300000 });
    await page.evaluate(() => window.__harness.settle());
    const trace = await page.evaluate(() => window.__startupTrace);
    const groups = new Map();
    for (const call of trace.filter((row) => row.method === 'executeSet')) {
      const group = groups.get(call.transaction) ?? [];
      group.push(call);
      groups.set(call.transaction, group);
    }
    const seedCalls = [...groups.values()].sort((a, b) => b.reduce((n, r) => n + r.bytes, 0) - a.reduce((n, r) => n + r.bytes, 0))[0];
    if (!seedCalls?.some((row) => row.sql.some((sql) => sql.includes('nss_entity')))) throw new Error('Actual seed transaction not identified');
    const chunkBytes = seedCalls.map((row) => row.bytes);
    await page.evaluate(async () => {
      // Multi-statement `execute` with transaction:true silently applies no INSERT on the
      // Android plugin (changes:0). Create with execute, insert with executeSet, and verify.
      const native = (method, options) =>
        window.Capacitor.nativePromise('CapacitorSQLite', method, { database: 'ngrx-harness', readonly: false, ...options });
      await native('execute', { statements: 'CREATE TABLE IF NOT EXISTS nss_bench(k INTEGER PRIMARY KEY,v TEXT)', transaction: false });
      await native('executeSet', {
        set: [{ statement: 'INSERT OR REPLACE INTO nss_bench(k,v) VALUES (?,?)', values: [1, 'open'] }],
        transaction: true, returnMode: 'no', isSQL92: true,
      });
      const check = await native('query', { statement: 'SELECT k FROM nss_bench LIMIT 1', values: [] });
      if (!check.values?.length) throw new Error('scratch row was not persisted');
      localStorage.removeItem('harness:profile');
      localStorage.setItem('harness:empty', 'floor');
    });
    // WebView flushes localStorage lazily; a force-stop can drop the key. An in-process
    // reload commits it and proves floor mode boots before the fresh-process relaunch.
    await page.reload();
    await page.waitForFunction(() => window.__floor, null, { timeout: 120000 });
    await delay(2000);
    await browser.close();
    session = await launch(active);
    browser = session.browser;
    page = session.page;
    await page.waitForFunction(() => window.__floor, null, { timeout: 120000 });
    const open = [];
    for (let trial = 0; trial < 5; trial++) {
      await browser.close();
      session = await launch(active);
      browser = session.browser;
      page = session.page;
      await page.waitForFunction(() => window.__floor, null, { timeout: 120000 });
      open.push(await page.evaluate(() => window.__floor.openMs));
    }
    // Open controls precede bulk scratch inserts so F_open sees precisely the
    // populated store plus one scratch row, not a second N-row data set.
    const commit = await page.evaluate(() => window.__floor.commit(20));
    const beforeSeed = pss(active);
    const seed = await page.evaluate(({ size, chunkBytes }) => window.__floor.seed(size, chunkBytes, 5), { size, chunkBytes });
    const afterSeed = pss(active);
    const cache = await page.evaluate(async () => {
      const native = (method, options) => window.Capacitor.nativePromise('CapacitorSQLite', method, { database: 'ngrx-harness', readonly: false, ...options });
      const stats = {};
      for (const name of ['cache_size', 'page_size', 'page_count', 'freelist_count'])
        stats[name] = (await native('query', { statement: `PRAGMA ${name}`, values: [] })).values;
      await native('execute', { statements: 'PRAGMA shrink_memory', transaction: false });
      return stats;
    });
    const afterShrink = pss(active);
    const pragmas = await page.evaluate(() => window.__floor.pragmas);
    const row = { size, database: 'ngrx-harness', commit, seed, open, pragmas, seedTrace: seedCalls,
      memoryDiagnostic: { beforeSeed, afterSeed, afterShrink, cache } };
    results.push(row);
    console.log(JSON.stringify(row));
    await page.evaluate(() => localStorage.removeItem('harness:empty'));
    await delay(6000);
    await browser.close();
    browser = undefined;
    const file = option('output', `docs/benchmarks/android-floors-${date}.json`);
    writeFileSync(file, JSON.stringify({ ...provenance, results }, null, 2) + '\n');
  }
} finally {
  if (browser) {
    await browser.contexts()[0]?.pages()[0]?.evaluate(() => {
      localStorage.removeItem('harness:empty'); localStorage.removeItem('harness:profile');
    }).catch(() => {});
    await delay(6000);
    await browser.close().catch(() => {});
  }
  adb('shell', 'am', 'force-stop', active);
}
