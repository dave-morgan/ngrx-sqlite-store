#!/usr/bin/env node
import { benchmarkSerial } from './android-benchmark-target.mjs';
// Phase 15g diagnostic: app-process meminfo categories over time after a seed, following
// android-bench's sequence up to its PSS point (ready -> settle -> heapMb GC -> PSS).
// [--impl sqlite] [--size 10000] [--serial emulator-5554]
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { execAdb } from './android-adb.mjs';

const argv = process.argv.slice(2);
const option = (name, fallback) => argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback;
const adbFile = process.env.BENCH_ADB ?? join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe');
const adb = (...args) => execAdb(adbFile, ['-s', benchmarkSerial(option('serial')), ...args], { encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = 'dev.ngrxsqlite.harness';
const impl = option('impl', 'sqlite');
const pkg = `${base}.${impl}`;
const size = Number(option('size', '10000'));

async function launch() {
  for (const name of [`${base}.classic`, `${base}.sqlite`]) adb('shell', 'am', 'force-stop', name);
  adb('shell', 'am', 'start', '-n', `${pkg}/${base}.MainActivity`);
  for (let i = 0; i < 400; i++) {
    await delay(200);
    try {
      const pid = adb('shell', 'pidof', pkg).trim().split(/\s+/)[0];
      const socket = `webview_devtools_remote_${pid}`;
      if (!adb('shell', 'cat', '/proc/net/unix').includes(socket)) continue;
      adb('forward', 'tcp:9352', `localabstract:${socket}`);
      const browser = await chromium.connectOverCDP('http://localhost:9352');
      const page = browser.contexts()[0]?.pages()[0];
      if (page) return { browser, page };
      await browser.close();
    } catch { /* retry */ }
  }
  throw new Error(`Cannot attach to ${pkg}`);
}
const categories = (raw) => {
  const out = {};
  for (const label of ['Java Heap', 'Native Heap', 'Code', 'Stack', 'Graphics', 'Private Other', 'System', 'TOTAL PSS'])
    out[label] = Number(raw.match(new RegExp(`${label}:\\s+(\\d+)`))?.[1] ?? 0) / 1024;
  return out;
};

adb('shell', 'pm', 'clear', pkg);
const { browser, page } = await launch();
try {
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 120000 });
  await page.waitForFunction(() => window.__harness?.ready?.total === 500, null, { timeout: 300000 });
  await page.evaluate(async () => { window.__harness.dispatch({ type: '[Seed] Reset' }); await window.__harness.settle(); });
  await page.evaluate((n) => localStorage.setItem('harness:seed', String(n)), size);
  await page.goto(`https://localhost/todos?seed=${size}`);
  await page.waitForFunction((n) => window.__harness?.ready?.total === n, size, { timeout: 300000 });
  const t0 = Date.now();
  await page.evaluate(() => window.__harness.settle());
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage'); await delay(300); await cdp.send('HeapProfiler.collectGarbage');
  await cdp.detach();
  for (const at of [0, 500, 1000, 2000, 4000, 8000, 15000]) {
    const wait = at - (Date.now() - t0);
    if (wait > 0) await delay(wait);
    const c = categories(adb('shell', 'dumpsys', 'meminfo', pkg));
    console.log(`${impl} t+${String(Date.now() - t0).padStart(5)}ms`, Object.entries(c).map(([k, v]) => `${k}=${v.toFixed(1)}`).join(' '));
  }
} finally {
  await browser.close().catch(() => {});
  adb('shell', 'am', 'force-stop', pkg);
}
