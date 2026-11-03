#!/usr/bin/env node
import { benchmarkSerial } from './android-benchmark-target.mjs';
// Diagnostic only: CPU profile of a shapes scenario on the device (sqlite or classic).
// --impl sqlite --keys 500 --scenario flatSetKey --n 30 [--output .tmp/shapes-profile.cpuprofile]
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { prepareShapesDocument } from './shapes-lifecycle.mjs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { execAdb } from './android-adb.mjs';

const argv = process.argv.slice(2);
const option = (name, fallback) => argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback;
const adbFile = join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe');
const adb = (...args) => execAdb(adbFile, ['-s', benchmarkSerial(option('serial')), ...args], { encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = 'dev.ngrxsqlite.harness';
const pkg = `${base}.${option('impl', 'sqlite')}`;
const keys = Number(option('keys', 500));
const scenario = option('scenario', 'flatSetKey');
const n = Number(option('n', 30));
const watchdog = setTimeout(() => { console.error('timeout'); process.exit(2); }, 600_000);

async function launch() {
  for (const name of [base, `${base}.classic`, `${base}.sqlite`]) adb('shell', 'am', 'force-stop', name);
  adb('shell', 'am', 'start', '-n', `${pkg}/${base}.MainActivity`);
  for (let i = 0; i < 150; i++) {
    await delay(200);
    try {
      const pid = adb('shell', 'pidof', pkg).trim().split(/\s+/)[0];
      const socket = `webview_devtools_remote_${pid}`;
      if (!adb('shell', 'cat', '/proc/net/unix').includes(socket)) continue;
      adb('forward', 'tcp:9351', `localabstract:${socket}`);
      const browser = await chromium.connectOverCDP('http://localhost:9351');
      const page = browser.contexts()[0]?.pages()[0];
      if (page) return { browser, page };
      await browser.close();
    } catch { /* retry */ }
  }
  throw new Error(`Cannot attach to ${pkg}`);
}


const file = option('output', `.tmp/shapes-${pkg.split('.').pop()}-${scenario}-${keys}.cpuprofile`);
const evidenceFile = file.replace(/\.cpuprofile$/, '.json');
if (existsSync(file) || existsSync(evidenceFile)) throw new Error('Refusing to overwrite profile evidence');
const installedPath = adb('shell', 'pm', 'path', pkg).trim().split(/\r?\n/)[0].replace(/^package:/, '');
const installedApkHash = adb('shell', 'sha256sum', installedPath).trim().split(/\s+/)[0];
const expectedApk = option('expected-apk');
if (expectedApk && installedApkHash !== createHash('sha256').update(readFileSync(expectedApk)).digest('hex'))
  throw new Error('Installed APK does not match expected archive');
const metadata = { session: option('session'), installedApkHash, scenario, keys, requestedSamples: n, backgroundSeed: 50,
  diagnosticOnly: true, limitations: ['CPU sampling and native wrapper perturb timing.', 'Native spans measure JS-to-native response, not native SQL CPU time.'] };
adb('shell', 'pm', 'clear', pkg);
const { browser, page } = await launch();
let cdp;
try {
  await prepareShapesDocument(page, keys);
  const route = scenario.startsWith('wf') ? 'workflow' : 'flat';
  await page.goto(`https://localhost/shapes/${route}`);
  await page.waitForFunction(() => !!window.__shapes, null, { timeout: 120_000 });
  await page.waitForFunction((r) => r === 'flat' ? /keys$/.test(document.querySelector('[data-testid=flat-count]')?.textContent?.trim() ?? '') : document.querySelector('[data-testid=wf-step]')?.textContent?.trim() === '1', route, { timeout: 180_000 });
  await page.evaluate(() => window.__harness.settle());
  await page.evaluate(([s, c]) => window.__shapes[s](...c), [scenario, scenario.startsWith('wfEdit') ? ['d4', 10] : scenario === 'wfAppend' ? [3, 100] : [10]]);
  await page.evaluate(() => {
    const cap = window.Capacitor, original = cap.nativePromise;
    window.__shapeNativeCalls = [];
    window.__restoreShapeNative = () => { cap.nativePromise = original; };
    cap.nativePromise = function (...args) {
      if (args[0] !== 'CapacitorSQLite') return original.apply(this, args);
      const options = args[2] ?? {};
      const row = { method: args[1], start: performance.now(), transaction: options.transaction,
        sql: options.set?.map(x => x.statement) ?? [options.statement ?? options.statements ?? ''],
        parameterBytes: new TextEncoder().encode(JSON.stringify(options.set?.map(x => x.values) ?? options.values ?? [])).length };
      window.__shapeNativeCalls.push(row);
      return original.apply(this, args).finally(() => { row.end = performance.now(); });
    };
  });
  cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
  await cdp.send('Profiler.start');
  const samples = await page.evaluate(async ([s, c]) => {
    try { return await window.__shapes[s](...c); }
    finally { window.__restoreShapeNative(); }
  }, [scenario, scenario.startsWith('wfEdit') ? ['d4', n] : scenario === 'wfAppend' ? [n, 100] : [n]]);
  const { profile } = await cdp.send('Profiler.stop');
  const nativeCalls = await page.evaluate(() => window.__shapeNativeCalls);
  if (samples.length !== n || samples.some(s => !Number.isFinite(s.emit) || !Number.isFinite(s.dom)))
    throw new Error('Incomplete or non-finite scenario samples');
  writeFileSync(file, JSON.stringify(profile));
  writeFileSync(evidenceFile, JSON.stringify({ ...metadata, samples, nativeCalls }, null, 2));
  const emits = samples.map((s) => s.emit).sort((a, b) => a - b);
  console.log('emit p50', emits[Math.floor(emits.length / 2)].toFixed(2), 'native calls', nativeCalls.length, '->', file);
} catch (error) {
  const nativeCalls = await page.evaluate(() => { window.__restoreShapeNative?.(); return window.__shapeNativeCalls ?? []; }).catch(() => []);
  writeFileSync(evidenceFile, JSON.stringify({ ...metadata, error: String(error), nativeCalls }, null, 2));
  if (cdp) {
    const result = await cdp.send('Profiler.stop').catch(() => undefined);
    if (result?.profile) writeFileSync(file, JSON.stringify(result.profile));
  }
  throw error;
} finally {
  await browser.close().catch(() => {});
  adb('shell','am','force-stop',pkg);
  clearTimeout(watchdog);
}
