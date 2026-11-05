#!/usr/bin/env node
import { benchmarkSerial } from './android-benchmark-target.mjs';
// Phase 15f diagnostic: perfetto system trace (sched + atrace) of android-bench's toggle loop,
// to find which app threads run or block during slow toggles. Not an acceptance input.
// [--impl sqlite] [--size 1000] [--toggles 30] [--serial emulator-5554]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { execAdb } from './android-adb.mjs';

const argv = process.argv.slice(2);
const option = (name, fallback) => argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback;
const serial = benchmarkSerial(option('serial'));
const adbFile = process.env.BENCH_ADB ?? join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe');
const adb = (...args) => execAdb(adbFile, ['-s', serial, ...args], { encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = 'dev.ngrxsqlite.harness';
const impl = option('impl', 'sqlite');
const pkg = `${base}.${impl}`;
const size = Number(option('size', '1000'));
const toggles = Number(option('toggles', '30'));
const traced = !argv.includes('--no-trace');

async function launch() {
  for (const name of [`${base}.classic`, `${base}.sqlite`]) adb('shell', 'am', 'force-stop', name);
  adb('shell', 'am', 'start', '-n', `${pkg}/${base}.MainActivity`);
  for (let i = 0; i < 400; i++) {
    await delay(200);
    try {
      const pid = adb('shell', 'pidof', pkg).trim().split(/\s+/)[0];
      const socket = `webview_devtools_remote_${pid}`;
      if (!adb('shell', 'cat', '/proc/net/unix').includes(socket)) continue;
      adb('forward', 'tcp:9349', `localabstract:${socket}`);
      const browser = await chromium.connectOverCDP('http://localhost:9349');
      const page = browser.contexts()[0]?.pages()[0];
      if (page) return { browser, page };
      await browser.close();
    } catch { /* retry */ }
  }
  throw new Error(`Cannot attach to ${pkg}`);
}

const config = `
buffers { size_kb: 65536 fill_policy: RING_BUFFER }
data_sources { config { name: "linux.ftrace" ftrace_config {
  ftrace_events: "sched/sched_switch" ftrace_events: "sched/sched_waking"
  atrace_categories: "view" atrace_categories: "gfx" atrace_categories: "webview" atrace_categories: "dalvik"
  atrace_categories: "binder_driver" atrace_categories: "input"
  atrace_apps: "${pkg}"
} } }
data_sources { config { name: "linux.process_stats" } }
duration_ms: 20000
`;

adb('shell', 'pm', 'clear', pkg);
const { browser, page } = await launch();
try {
  await page.waitForFunction(() => window.__harness?.ready, null, { timeout: 300000 });
  await page.evaluate(async (n) => {
    localStorage.setItem('harness:seed', String(n));
    window.__harness.dispatch({ type: '[Seed] Reset' });
    await window.__harness.settle();
  }, size);
  await page.reload();
  await page.waitForFunction(() => window.__harness?.ready, null, { timeout: 300000 });
  await page.evaluate(() => window.__harness.settle());
  const remote = '/data/misc/perfetto-traces/toggle.pftrace';
  const tracer = traced && spawn(adbFile, ['-s', serial, 'shell', 'perfetto', '--txt', '-c', '-', '-o', remote], { stdio: ['pipe', 'pipe', 'pipe'] });
  if (tracer) {
    tracer.stdin.end(config);
    await delay(2500);
  }
  // Same loop as android-bench toggleLatency, plus native call windows (wall clock for alignment).
  const run = await page.evaluate(async (n) => {
    const capacitor = window.Capacitor;
    const original = capacitor.nativePromise;
    const calls = [];
    capacitor.nativePromise = function (...values) {
      const row = { method: values[1], sql: values[2]?.set?.[0]?.statement?.slice(0, 50), start: performance.now() };
      calls.push(row);
      return Promise.resolve(original.apply(this, values)).finally(() => { row.end = performance.now(); });
    };
    const summary = () => document.querySelector('[data-testid=todo-summary]')?.textContent ?? '';
    const windows = [];
    try {
      for (let i = 0; i < n; i++) {
        const before = summary();
        const changed = new Promise((resolve) => {
          const obs = new MutationObserver(() => { if (summary() !== before) { obs.disconnect(); resolve(performance.now()); } });
          obs.observe(document.body, { subtree: true, characterData: true, childList: true });
        });
        const dispatchAt = performance.now();
        window.__harness.dispatch({ type: '[Todos] Todo Toggled', id: 't1' });
        windows.push({ dispatchAt, domAt: await changed });
        await new Promise((r) => setTimeout(r, 20));
      }
    } finally { capacitor.nativePromise = original; }
    return { epochAtZero: Date.now() - performance.now(), windows, calls };
  }, toggles);
  if (tracer) {
    await new Promise((resolve) => tracer.on('exit', resolve));
    adb('pull', remote, '.tmp/toggle.pftrace');
  }
  const pid = adb('shell', 'pidof', pkg).trim().split(/\s+/)[0];
  writeFileSync('.tmp/toggle-systrace-run.json', JSON.stringify({ pid, impl, ...run }, null, 2));
  console.log('pid', pid, 'toggles', run.windows.map((w) => Math.round(w.domAt - w.dispatchAt)).join(' '));
} finally {
  await browser.close().catch(() => {});
}
