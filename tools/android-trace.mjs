#!/usr/bin/env node
// Diagnostic only: stops harness apps. Never run alongside android-bench.mjs.
// Usage: node tools/android-trace.mjs [--serial emulator-5554] [--port 9335] [--seed 50000 | --toggle] [--cpu-profile]
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
const seed = args.includes('--seed') ? Number(option('seed')) : undefined;
if (seed !== undefined && (!Number.isInteger(seed) || seed < 1)) throw new Error('--seed must be a positive integer');
const toggle = args.includes('--toggle');
if (toggle && seed !== undefined) throw new Error('--toggle and --seed are mutually exclusive');
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
  if (!toggle) {
    await page.getByTestId('nav-diagnostics').click();
    await page.getByTestId('bench').waitFor({ timeout: 300_000 });
  }
  await page.evaluate(() => window.__harness.settle());
  let cdp;
  let cpuNavigationStartUs;
  if (args.includes('--cpu-profile')) {
    cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const { metrics } = await cdp.send('Performance.getMetrics');
    cpuNavigationStartUs = metrics.find((metric) => metric.name === 'NavigationStart')?.value * 1000000;
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
    await cdp.send('Profiler.start');
  }
  let trace;
  let cpuProfile;
  try {
    trace = toggle ? await page.evaluate(async (count) => {
      await window.__harness.settle();
      const capacitor = window.Capacitor;
      const original = capacitor.nativePromise;
      if (typeof original !== 'function') throw new Error('No Capacitor.nativePromise');
      const calls = [];
      const iterations = [];
      const summary = () => document.querySelector('[data-testid=todo-summary]')?.textContent ?? '';
      capacitor.nativePromise = function (...values) {
        const row = {
          plugin: values[0], method: values[1], options: structuredClone(values[2]),
          start: performance.now(), end: undefined, ms: undefined,
        };
        calls.push(row);
        return Promise.resolve(original.apply(this, values)).finally(() => {
          row.end = performance.now();
          row.ms = row.end - row.start;
        });
      };
      try {
        for (let index = 0; index < count; index++) {
          const before = summary();
          const firstCall = calls.length;
          let observer;
          let timeout;
          const changed = new Promise((resolve, reject) => {
            observer = new MutationObserver(() => {
              const after = summary();
              if (after !== before) {
                observer.disconnect();
                clearTimeout(timeout);
                resolve({ domAt: performance.now(), after });
              }
            });
            observer.observe(document.body, { subtree: true, characterData: true, childList: true });
            timeout = setTimeout(() => {
              observer.disconnect();
              reject(new Error('Todo summary did not change within 30 seconds'));
            }, 30_000);
          });
          const dispatchAt = performance.now();
          let change;
          try {
            window.__harness.dispatch({ type: '[Todos] Todo Toggled', id: 't1' });
            change = await changed;
          } finally {
            observer.disconnect();
            clearTimeout(timeout);
          }
          await window.__harness.settle();
          const settledAt = performance.now();
          const nativeCalls = calls.slice(firstCall);
          iterations.push({
            iteration: index + 1, before, after: change.after, dispatchAt,
            domAt: change.domAt, settledAt, domLatencyMs: change.domAt - dispatchAt,
            settleLatencyMs: settledAt - dispatchAt, nativeCalls,
            nativeStartedBeforeDom: nativeCalls.filter((call) => call.start <= change.domAt).length,
            nativeStartedAfterDom: nativeCalls.filter((call) => call.start > change.domAt).length,
            nativeFinishedBeforeDom: nativeCalls.filter((call) => call.end <= change.domAt).length,
          });
        }
        return { iterations, calls };
      } finally { capacitor.nativePromise = original; }
    }, Number(option('toggles', '3'))) : seed === undefined ? await page.evaluate(() => window.__harness.benchTrace())
      : await page.evaluate(async ({ size, nativeClock }) => {
        if (!window.__harness.benchSeed) throw new Error('APK has no benchSeed hook; rebuild first');
        const capacitor = window.Capacitor;
        const original = capacitor.nativePromise;
        if (typeof original !== 'function') throw new Error('No Capacitor.nativePromise');
        const calls = [];
        const encoder = new TextEncoder();
        const base = { database: 'ngrx-harness', readonly: false };
        const direct = (method, options) => original.call(capacitor, 'CapacitorSQLite', method, { ...base, ...options });
        if (nativeClock) await direct('execute', {
          statements: 'CREATE TEMP TABLE IF NOT EXISTS __nss_profile_clock (id INTEGER PRIMARY KEY, start REAL, end REAL); DELETE FROM __nss_profile_clock;',
          transaction: false,
        });
        const beganAt = performance.now();
        capacitor.nativePromise = function (...values) {
          const options = values[2];
          // Measure payload size before starting the native timer. Retain only summaries,
          // because retaining full bulk arguments would itself create a memory problem.
          const encodedOptionBytes = encoder.encode(JSON.stringify(options ?? {})).length;
          const statements = options?.set ?? [];
          const row = {
            plugin: values[0], method: values[1], encodedOptionBytes,
            statementCount: statements.length,
            sqlPrefixes: statements.map((statement) => String(statement.statement ?? '').slice(0, 160)),
            start: performance.now(), ms: undefined,
          };
          calls.push(row);
          if (nativeClock && values[0] === 'CapacitorSQLite' && values[1] === 'executeSet') {
            const id = calls.length;
            row.clockId = id;
            const clock = "(julianday('now') - 2440587.5) * 86400000.0";
            values[2] = { ...options, set: [
              { statement: `INSERT INTO __nss_profile_clock (id,start) VALUES (?,${clock})`, values: [id] },
              ...statements,
              { statement: `UPDATE __nss_profile_clock SET end=${clock} WHERE id=?`, values: [id] },
            ] };
          }
          return Promise.resolve(original.apply(this, values)).finally(() => { row.ms = performance.now() - row.start; });
        };
        let timing;
        let nativeSqlWindows;
        try {
          timing = await window.__harness.benchSeed(size);
          await window.__harness.settle();
          if (nativeClock) nativeSqlWindows = (await direct('query', {
            statement: 'SELECT id, start, end, end-start AS ms FROM __nss_profile_clock ORDER BY id', values: [],
          })).values;
        } finally {
          capacitor.nativePromise = original;
          if (nativeClock) await direct('execute', { statements: 'DROP TABLE IF EXISTS temp.__nss_profile_clock', transaction: false });
        }
        const totalElapsedMs = performance.now() - beganAt;
        const batches = calls.filter((call) => call.plugin === 'CapacitorSQLite' && call.method === 'executeSet');
        return {
          size, timing, totalElapsedMs, resetAndOtherMs: totalElapsedMs - timing.generateMs - timing.reduceMs,
          nativeSqlWindows,
          nativeSummary: {
            calls: calls.length, executeSetCalls: batches.length,
            encodedOptionBytes: calls.reduce((sum, call) => sum + call.encodedOptionBytes, 0),
            executeSetOptionBytes: batches.reduce((sum, call) => sum + call.encodedOptionBytes, 0),
            executeSetElapsedMs: batches.reduce((sum, call) => sum + call.ms, 0),
            nativeElapsedMs: calls.reduce((sum, call) => sum + call.ms, 0),
          },
          calls,
        };
      }, { size: seed, nativeClock: args.includes('--native-sql-clock') });
  } finally {
    if (cdp) {
      ({ profile: cpuProfile } = await cdp.send('Profiler.stop'));
      await cdp.detach();
    }
  }
  const date = new Date().toISOString().slice(0, 10);
  const report = {
    date, serial, packageName, cpuNavigationStartUs, device: adb('shell', 'getprop', 'ro.product.model').trim(),
    caveat: toggle
      ? `${Number(option('toggles', '3'))} toggles observed on /todos. DOM timestamp is the MutationObserver callback detecting an exact todo-summary text change, not a browser paint timestamp. Native call options are cloned before mutation; start/end classify activity relative to DOM change. settle includes queued follow-up work. Call timing alone does not prove an effect or rendering caused latency. Diagnostic only.`
      : seed === undefined
      ? 'Driver method timings can nest (e.g. commit includes batch), so summing all calls double-counts work. Three emissions are a diagnostic, not acceptance statistics.'
      : 'Native trace includes reset calls preceding the timed generate/reduce hook phases. Native elapsed includes bridge transport and native SQL, not native-only CPU. JSON byte counting happens before each native timer but perturbs total elapsed. Calls may overlap; sums need not equal wall time. Full bulk payloads are never retained. Diagnostic only.',
    ...trace,
  };
  const directory = join(root, 'docs', 'benchmarks');
  mkdirSync(directory, { recursive: true });
  const label = option('label', '');
  if (label && !/^[a-z0-9-]+$/i.test(label)) throw new Error('Invalid trace label');
  const basename = (toggle ? `android-toggle-trace-${date}` : seed === undefined ? `android-emission-trace-${date}` : `android-seed-trace-${seed}-${date}`) + (label ? `-${label}` : '');
  if (cpuProfile) {
    writeFileSync(join(directory, `${basename}.cpuprofile`), JSON.stringify(cpuProfile));
    const self = new Map();
    for (let index = 0; index < (cpuProfile.samples?.length ?? 0); index++) {
      const id = cpuProfile.samples[index];
      self.set(id, (self.get(id) ?? 0) + (cpuProfile.timeDeltas?.[index] ?? 1000));
    }
    report.cpuSelfTime = cpuProfile.nodes.map((node) => ({
      functionName: node.callFrame.functionName, url: node.callFrame.url,
      lineNumber: node.callFrame.lineNumber, selfMs: (self.get(node.id) ?? 0) / 1000,
    })).sort((a, b) => b.selfMs - a.selfMs).slice(0, 40);
  }
  const file = join(directory, `${basename}.json`);
  writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  console.log(file);
  console.log(JSON.stringify(toggle ? trace.iterations.map(({ iteration, domLatencyMs, settleLatencyMs, nativeStartedBeforeDom, nativeStartedAfterDom, nativeFinishedBeforeDom }) => ({ iteration, domLatencyMs, settleLatencyMs, nativeStartedBeforeDom, nativeStartedAfterDom, nativeFinishedBeforeDom })) : trace.emission ?? { timing: trace.timing, totalElapsedMs: trace.totalElapsedMs, nativeSummary: trace.nativeSummary }));
  for (const [index, call] of trace.calls.entries()) {
    const sql = call.options?.set ? call.options.set.map((row) => row.statement).join('; ')
      : call.options?.statement ?? (call.sqlPrefixes ? call.sqlPrefixes.join('; ') : typeof call.args?.[0] === 'string' ? call.args[0]
      : Array.isArray(call.args?.[0]) ? call.args[0].map((row) => row.sql ?? row.statement ?? '').join('; ')
      : JSON.stringify(call.args));
    console.log(`${index + 1}. ${call.method} ${Number(call.ms).toFixed(3)} ms ${call.encodedOptionBytes ?? ''} bytes ${sql}`);
  }
} finally {
  await browser?.close().catch(() => {});
  adb('shell', 'am', 'force-stop', packageName);
}
