#!/usr/bin/env node
import { benchmarkSerial, benchmarkPort } from './android-benchmark-target.mjs';
// ADR-0067 workload code control: post-GC heap snapshots of classic and sqlite at the same
// three android-bench heap points (todos, notes, relaunch), split into V8 code space and
// data. Paired, alternating, fresh process per trial. Never run alongside another runner.
// --session ID [--size 1000] [--trials 5] [--serial emulator-5554] [--output FILE]
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { execAdb } from './android-adb.mjs';
import { toggleLatency } from './android-toggle-workload.mjs';
import { summarizeHeap } from './heap-summary.mjs';

const argv = process.argv.slice(2);
const option = (name, fallback) => argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback;
const adbFile = process.env.BENCH_ADB ?? join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe');
const adb = (...args) => execAdb(adbFile, ['-s', benchmarkSerial(option('serial')), ...args], {
  encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'],
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = 'dev.ngrxsqlite.harness';
const size = Number(option('size', '1000'));
const trials = Number(option('trials', '5'));
const date = new Date().toISOString().slice(0, 10);
const provenance = {
  workload: { togglesBeforeNotes: 30, toggleGapMs: 20 },
  date, session: option('session', undefined),
  device: adb('shell', 'getprop', 'ro.product.model').trim(),
  sdkLevel: adb('shell', 'getprop', 'ro.build.version.sdk').trim(),
  webview: (adb('shell', 'dumpsys', 'webviewupdate').match(/Current WebView package.*:\s*\(([^)]+)\)/) ?? [])[1] ?? '?',
  apkHashes: Object.fromEntries(['classic', 'sqlite'].map((impl) => [impl,
    createHash('sha256').update(readFileSync(`.tmp/benchmark-apks/${impl}.apk`)).digest('hex')])),
};

async function launch(pkg) {
  for (const name of [`${base}.classic`, `${base}.sqlite`]) adb('shell', 'am', 'force-stop', name);
  adb('shell', 'am', 'start', '-n', `${pkg}/${base}.MainActivity`);
  for (let i = 0; i < 400; i++) {
    await delay(200);
    try {
      const pid = adb('shell', 'pidof', pkg).trim().split(/\s+/)[0];
      const socket = `webview_devtools_remote_${pid}`;
      if (!adb('shell', 'cat', '/proc/net/unix').includes(socket)) continue;
      adb('forward', `tcp:${benchmarkPort(9348)}`, `localabstract:${socket}`);
      const browser = await chromium.connectOverCDP(`http://localhost:${benchmarkPort(9348)}`);
      const page = browser.contexts()[0]?.pages()[0];
      if (page) return { browser, page };
      await browser.close();
    } catch { /* retry */ }
  }
  throw new Error(`Cannot attach to ${pkg}`);
}

/** Same GC sequence as android-bench heapMb, then a snapshot split into code and data. */
async function measure(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  await delay(300);
  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  const chunks = [];
  cdp.on('HeapProfiler.addHeapSnapshotChunk', ({ chunk }) => chunks.push(chunk));
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  await cdp.detach();
  const summary = summarizeHeap(JSON.parse(chunks.join('')));
  const kb = (type) => (summary.byType.find((row) => row.name === type)?.shallowBytes ?? 0) / 1048576;
  const codeMb = kb('code');
  // V8-managed data: everything except code, external/native backing stores and synthetic roots.
  const dataMb = summary.byType.filter((row) => !['code', 'native', 'synthetic'].includes(row.name))
    .reduce((sum, row) => sum + row.shallowBytes, 0) / 1048576;
  return { heapMb: usedSize / 1048576, codeMb, dataMb };
}

async function trial(impl) {
  const pkg = `${base}.${impl}`;
  adb('shell', 'pm', 'clear', pkg);
  let { browser, page } = await launch(pkg);
  try {
    await page.waitForFunction(() => window.__harness?.ready, null, { timeout: 300000 });
    await page.evaluate(async (n) => {
      localStorage.setItem('harness:seed', String(n));
      window.__harness.dispatch({ type: '[Seed] Reset' });
      await window.__harness.settle();
    }, size);
    await page.goto(`https://localhost/todos?seed=${size}`);
    await page.waitForFunction((n) => window.__harness?.ready?.total === n, size, { timeout: 300000 });
    await page.evaluate(() => window.__harness.settle());
    const todos = await measure(page);
    // Acceptance executes these paths before navigating to notes (ADR-0071).
    await toggleLatency(page, 30);
    await page.getByTestId('nav-notes').click();
    await page.getByTestId('note-stats').waitFor();
    await delay(500);
    const notes = await measure(page);
    await browser.close().catch(() => {});
    ({ browser, page } = await launch(pkg));
    await page.waitForFunction((n) => window.__harness?.ready?.total === n, size, { timeout: 300000 });
    await page.evaluate(() => window.__harness.settle());
    const relaunch = await measure(page);
    return { todos, notes, relaunch };
  } finally {
    await browser.close().catch(() => {});
    adb('shell', 'am', 'force-stop', pkg);
  }
}

const results = [];
for (let index = 0; index < trials; index++) {
  for (const impl of index % 2 ? ['sqlite', 'classic'] : ['classic', 'sqlite']) {
    const points = await trial(impl);
    for (const [point, value] of Object.entries(points)) {
      const row = { kind: 'workload-code', impl, size, trial: index + 1, point, ...value };
      results.push(row);
      console.log(JSON.stringify(row));
    }
  }
}
const output = option('output', `docs/benchmarks/android-code-control-${date}.json`);
writeFileSync(output, JSON.stringify({ ...provenance, size, trials, results }, null, 2) + '\n');
console.log(`wrote ${output}`);
