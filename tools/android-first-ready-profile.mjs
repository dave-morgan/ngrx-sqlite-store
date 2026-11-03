#!/usr/bin/env node
import { benchmarkSerial, benchmarkPort } from './android-benchmark-target.mjs';
// Diagnostic only. Never run alongside another device runner.
// Fresh-install first-ready trace for one size: bridge calls, timeline, optional CPU profile.
// --size 50000 [--impl sqlite|classic] [--cpu true] [--output FILE]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { execAdb } from './android-adb.mjs';

const argv = process.argv.slice(2);
const option = (name, fallback) => argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback;
const adbFile = process.env.BENCH_ADB ?? join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe');
const adb = (...args) => execAdb(adbFile, ['-s', benchmarkSerial(option('serial')), ...args], {
  encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'],
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = 'dev.ngrxsqlite.harness';
const pkg = `${base}.${option('impl', 'sqlite')}`;
const size = Number(option('size', 50000));
const ready = (total) => (t) => new RegExp(`(^|\\D)${t} total`).test(document.querySelector('[data-testid=todo-summary]')?.textContent ?? '');

async function launch() {
  for (const name of [base, `${base}.classic`, `${base}.sqlite`]) adb('shell', 'am', 'force-stop', name);
  adb('shell', 'am', 'start', '-n', `${pkg}/${base}.MainActivity`);
  for (let i = 0; i < 150; i++) {
    await delay(200);
    try {
      const pid = adb('shell', 'pidof', pkg).trim().split(/\s+/)[0];
      const socket = `webview_devtools_remote_${pid}`;
      if (!adb('shell', 'cat', '/proc/net/unix').includes(socket)) continue;
      adb('forward', `tcp:${benchmarkPort(9337)}`, `localabstract:${socket}`);
      const browser = await chromium.connectOverCDP(`http://localhost:${benchmarkPort(9337)}`);
      const page = browser.contexts()[0]?.pages()[0];
      if (page) return { browser, page };
      await browser.close();
    } catch { /* retry */ }
  }
  throw new Error(`Cannot attach to ${pkg}`);
}

// CDP calls can hang without a timeout; never let one diagnostic stall a series.
const watchdog = setTimeout(() => {
  console.error('first-ready profile timed out');
  try { adb('shell', 'am', 'force-stop', pkg); } catch { /* best effort */ }
  process.exit(2);
}, Number(option('timeout-ms', 600_000)));
adb('shell', 'pm', 'clear', pkg);
const { browser, page } = await launch();
try {
  await page.waitForFunction(ready(), 500, { timeout: 300_000 });
  await page.evaluate(async () => {
    window.__harness.dispatch({ type: '[Seed] Reset' });
    await window.__harness.settle();
  });
  await page.evaluate((n) => { localStorage.setItem('harness:seed', String(n)); localStorage.setItem('harness:profile', 'true'); }, size);
  await page.reload();
  await page.waitForFunction(ready(), 500, { timeout: 300_000 }).catch(() => {});
  // The reload above re-seeded the default; reset again so the profiled reload seeds `size`.
  await page.evaluate(async () => {
    window.__harness.dispatch({ type: '[Seed] Reset' });
    await window.__harness.settle();
  });
  const cdp = option('cpu', 'false') === 'true' ? await page.context().newCDPSession(page) : undefined;
  if (cdp) {
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    await cdp.send('Profiler.start');
  }
  await page.goto(`https://localhost/todos?seed=${size}`);
  await page.waitForFunction(ready(), size, { timeout: 300_000 });
  await page.evaluate(() => window.__harness.settle());
  const cpu = cdp ? (await cdp.send('Profiler.stop')).profile : undefined;
  const result = await page.evaluate(() => ({
    ready: window.__harness.ready, calls: window.__startupTrace, timeline: window.__startupTimeline,
    marks: performance.getEntriesByType('mark').map(({ name, startTime }) => ({ name, startTime })),
  }));
  await page.evaluate(() => localStorage.removeItem('harness:profile'));
  await delay(3000);
  const file = option('output', `.tmp/first-ready-${pkg.split('.').pop()}-${size}.json`);
  writeFileSync(file, JSON.stringify({ size, pkg, ...result }, null, 1) + '\n');
  if (cpu) writeFileSync(file.replace(/\.json$/, '.cpuprofile'), JSON.stringify(cpu));
  console.log('ready', result.ready, 'calls', result.calls?.length, '->', file);
} finally {
  await browser.close().catch(() => {});
  adb('shell', 'am', 'force-stop', pkg);
  clearTimeout(watchdog);
}
