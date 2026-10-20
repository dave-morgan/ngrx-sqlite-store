#!/usr/bin/env node
// Phase 9 benchmark: classic @ngrx/store vs ngrx-sqlite-store on a real Android WebView.
//
// Usage: node tools/android-bench.mjs [--impl classic,sqlite] [--sizes 1000,10000,50000] [--runs 200] [--skip-build]
// Needs: a booted device/emulator (adb), JDK 21 (JAVA_HOME or Android Studio JBR), debug build (WebView debugging on).
//
// Per implementation × seed size it records:
//   - first-ready: ms from navigation start to the todo summary rendering (fresh seed and relaunch)
//   - JS heap (after forced GC) on /todos (list mounted) and on /notes (no list mounted)
//   - process PSS from dumpsys meminfo
//   - dispatch → DOM latency for toggling a todo (p50/p95), and the in-app selector-emission benchmark
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const PKG = 'dev.ngrxsqlite.harness';
const ORIGIN = 'https://localhost';
const CDP_PORT = 9333;

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]]] : acc), []),
);
const impls = (args.impl ?? 'classic,sqlite').split(',');
const sizes = (args.sizes ?? '1000,10000,50000').split(',').map(Number);
const runs = Number(args.runs ?? 200);
const toggles = 30;

const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
const ADB = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const JAVA_HOME = process.env.JAVA_HOME_21 ?? 'C:\\Program Files\\Android\\Android Studio\\jbr';

const sh = (cmd, argv, opts = {}) =>
  execFileSync(cmd, argv, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32', ...opts });
const adb = (...a) => sh(ADB, a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))];
const log = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);

function buildAndInstall(impl) {
  log(`build ${impl}`);
  sh('npx', ['ng', 'build', 'harness', '-c', `production,${impl}`]);
  sh('npx', ['cap', 'sync', 'android']);
  sh(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['assembleDebug', '-q', '--no-daemon'], {
    cwd: join(ROOT, 'android'),
    env: { ...process.env, JAVA_HOME },
  });
  adb('install', '-r', join(ROOT, 'android/app/build/outputs/apk/debug/app-debug.apk'));
}

async function launch() {
  adb('shell', 'am', 'force-stop', PKG);
  adb('shell', 'am', 'start', '-n', `${PKG}/.MainActivity`);
  let socket;
  for (let i = 0; i < 50 && !socket; i++) {
    await sleep(200);
    socket = adb('shell', 'cat', '/proc/net/unix').match(/webview_devtools_remote_\d+/)?.[0];
  }
  if (!socket) throw new Error('WebView devtools socket not found (debug build?)');
  adb('forward', `tcp:${CDP_PORT}`, `localabstract:${socket}`);
  let browser;
  for (let i = 0; i < 50 && !browser; i++) {
    browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`).catch(() => undefined);
    if (!browser) await sleep(200);
  }
  let page;
  for (let i = 0; i < 50 && !page; i++) {
    page = browser.contexts()[0]?.pages()[0];
    if (!page) await sleep(200);
  }
  return { browser, page };
}

async function readyMs(page, total) {
  await page.waitForFunction(
    (t) => (document.querySelector('[data-testid=todo-summary]')?.textContent ?? '').includes(`${t} total`),
    total,
    { timeout: 300_000 },
  );
  return page.evaluate(() => performance.now());
}

async function heapMb(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage');
  await sleep(300);
  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  await cdp.detach();
  return +(usedSize / 1048576).toFixed(1);
}

function pssMb() {
  const out = adb('shell', 'dumpsys', 'meminfo', PKG);
  const m = out.match(/TOTAL PSS:\s+(\d+)/) ?? out.match(/TOTAL\s+(\d+)/);
  return m ? +(Number(m[1]) / 1024).toFixed(1) : null;
}

async function toggleLatency(page) {
  return page.evaluate(async (n) => {
    const summary = () => document.querySelector('[data-testid=todo-summary]')?.textContent ?? '';
    const samples = [];
    for (let i = 0; i < n; i++) {
      const before = summary();
      const t = performance.now();
      const changed = new Promise((resolve) => {
        const obs = new MutationObserver(() => {
          if (summary() !== before) {
            obs.disconnect();
            resolve();
          }
        });
        obs.observe(document.body, { subtree: true, characterData: true, childList: true });
      });
      window.__harness.dispatch({ type: '[Todos] Todo Toggled', id: 't1' });
      await changed;
      samples.push(performance.now() - t);
      await new Promise((r) => setTimeout(r, 20));
    }
    return samples;
  }, toggles);
}

async function emissionBench(page) {
  await page.locator('#runs').fill(String(runs));
  await page.locator('#runs').dispatchEvent('change');
  await page.getByTestId('bench').click();
  const row = page.getByTestId('bench-result').locator('tr').nth(1);
  await row.waitFor({ timeout: 600_000 });
  const [r, p50, p95, max] = (await row.locator('td').allTextContents()).map((s) => Number(s.replace(/,/g, '')));
  return { runs: r, p50, p95, max };
}

async function measure(impl, size) {
  log(`${impl} · ${size}: fresh install state`);
  adb('shell', 'pm', 'clear', PKG);
  let { browser, page } = await launch();
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 120_000 });
  // Reset whatever the default boot seeded, then reboot the app with the requested seed size.
  await page.evaluate(async () => {
    window.__harness.dispatch({ type: '[Seed] Reset' });
    await window.__harness.settle();
  });
  await page.goto(`${ORIGIN}/todos?seed=${size}`);
  const firstReadyMs = await readyMs(page, size);
  await page.evaluate(() => window.__harness.settle());
  const heapTodos = await heapMb(page);
  const pssTodos = pssMb();
  const toggle = await toggleLatency(page);

  await page.getByTestId('nav-notes').click();
  await page.getByTestId('note-stats').waitFor();
  await sleep(500);
  const heapNotes = await heapMb(page);

  await page.getByTestId('nav-diagnostics').click();
  const emission = await emissionBench(page);
  await browser.close().catch(() => {});

  log(`${impl} · ${size}: relaunch`);
  ({ browser, page } = await launch());
  // Classic has no persistence: it re-seeds from the generator (stands in for an API fetch).
  if (impl === 'classic') await page.goto(`${ORIGIN}/todos?seed=${size}`);
  const relaunchReadyMs = await readyMs(page, size);
  await page.evaluate(() => window.__harness.settle());
  const heapRelaunch = await heapMb(page);
  await browser.close().catch(() => {});

  return {
    impl,
    size,
    firstReadyMs: Math.round(firstReadyMs),
    relaunchReadyMs: Math.round(relaunchReadyMs),
    heapTodosMb: heapTodos,
    heapNotesMb: heapNotes,
    heapRelaunchMb: heapRelaunch,
    pssTodosMb: pssTodos,
    toggleP50: +pct(toggle, 50).toFixed(1),
    toggleP95: +pct(toggle, 95).toFixed(1),
    emitP50: emission.p50,
    emitP95: emission.p95,
  };
}

const device = adb('shell', 'getprop', 'ro.product.model').trim();
const sdkLevel = adb('shell', 'getprop', 'ro.build.version.sdk').trim();
const webview = (adb('shell', 'dumpsys', 'webviewupdate').match(/Current WebView package.*?\(([^)]+)\)/) ?? [])[1] ?? '?';
log(`device ${device} (API ${sdkLevel}), WebView ${webview}`);

const results = [];
for (const impl of impls) {
  if (args['skip-build'] !== 'true') buildAndInstall(impl);
  for (const size of sizes) {
    try {
      results.push(await measure(impl, size));
      log(JSON.stringify(results.at(-1)));
    } catch (e) {
      log(`FAILED ${impl} ${size}: ${e.message}`);
      results.push({ impl, size, error: e.message.slice(0, 200) });
    }
  }
}

const cols = ['impl', 'size', 'firstReadyMs', 'relaunchReadyMs', 'heapTodosMb', 'heapNotesMb', 'heapRelaunchMb', 'pssTodosMb', 'toggleP50', 'toggleP95', 'emitP50', 'emitP95'];
const table = [
  `| ${cols.join(' | ')} |`,
  `| ${cols.map(() => '---').join(' | ')} |`,
  ...results.map((r) => `| ${cols.map((c) => r[c] ?? (c === 'firstReadyMs' && r.error ? 'ERR' : '')).join(' | ')} |`),
].join('\n');

const date = new Date().toISOString().slice(0, 10);
const dir = join(ROOT, 'docs', 'benchmarks');
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const file = join(dir, `android-${date}.md`);
writeFileSync(
  file,
  `# Android benchmark ${date}\n\nDevice: ${device} (API ${sdkLevel}), WebView ${webview}. Toggle samples: ${toggles}. Emission runs: ${runs}.\n\n${table}\n\n<details><summary>raw</summary>\n\n\`\`\`json\n${JSON.stringify(results, null, 2)}\n\`\`\`\n</details>\n`,
);
log(`wrote ${file}`);
console.log(table);
