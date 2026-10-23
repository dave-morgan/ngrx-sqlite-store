#!/usr/bin/env node
// Phase 15f diagnostic: attribute sampled CPU inside each toggle's dispatch -> DOM window.
// Requires a source-mapped sqlite APK and its maps directory. Never an acceptance input.
// --maps DIR [--size 1000] [--toggles 30] [--serial emulator-5554] [--output FILE]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';
import { execAdb } from './android-adb.mjs';

const argv = process.argv.slice(2);
const option = (name, fallback) => argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback;
const adbFile = process.env.BENCH_ADB ?? join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe');
const adb = (...args) => execAdb(adbFile, ['-s', option('serial', 'emulator-5554'), ...args], {
  encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'],
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = 'dev.ngrxsqlite.harness';
const pkg = `${base}.${option('impl', 'sqlite')}`;
const size = Number(option('size', '1000'));
const toggles = Number(option('toggles', '30'));
const mapsDir = option('maps');

const maps = new Map();
if (mapsDir) for (const f of readdirSync(mapsDir).filter((s) => s.endsWith('.js.map')))
  maps.set(f.replace(/\.map$/, ''), new TraceMap(JSON.parse(readFileSync(join(mapsDir, f)))));
const label = (cf) => {
  const name = cf.url.split('/').pop();
  const map = maps.get(name);
  if (!map || cf.lineNumber < 0) return `${cf.functionName || '(anon)'} [${name || 'native'}]`;
  const p = originalPositionFor(map, { line: cf.lineNumber + 1, column: cf.columnNumber });
  const src = (p.source ?? '?').replace(/.*node_modules\//, 'nm/').replace(/.*projects\//, '');
  return `${p.name ?? cf.functionName ?? '(anon)'} ${src}:${p.line}`;
};
const category = (lab) =>
  /^\((idle|program|garbage collector)\)/.test(lab) ? lab.split(' ')[0]
    : /ngrx-sqlite-store\/src\/lib\/(selectors|store\/selectors)/.test(lab) ? 'store: selectors/refresh'
    : /ngrx-sqlite-store\/src\/lib\/(storage|schema|driver)/.test(lab) ? 'store: storage/schema/driver'
    : /ngrx-sqlite-store\//.test(lab) ? 'store: other'
    : /nm\/@angular\//.test(lab) ? 'angular'
    : /nm\/rxjs\//.test(lab) ? 'rxjs'
    : /nm\/@ngrx\//.test(lab) ? 'ngrx'
    : /nm\/@capacitor|capacitor|postToNative|nativePromise/.test(lab) ? 'capacitor bridge'
    : /harness\//.test(lab) ? 'harness app'
    : 'other';

async function launch() {
  for (const name of [`${base}.classic`, `${base}.sqlite`]) adb('shell', 'am', 'force-stop', name);
  adb('shell', 'am', 'start', '-n', `${pkg}/${base}.MainActivity`);
  for (let i = 0; i < 150; i++) {
    await delay(200);
    try {
      const pid = adb('shell', 'pidof', pkg).trim().split(/\s+/)[0];
      const socket = `webview_devtools_remote_${pid}`;
      if (!adb('shell', 'cat', '/proc/net/unix').includes(socket)) continue;
      adb('forward', 'tcp:9338', `localabstract:${socket}`);
      const browser = await chromium.connectOverCDP('http://localhost:9338');
      const page = browser.contexts()[0]?.pages()[0];
      if (page) return { browser, page };
      await browser.close();
    } catch { /* retry */ }
  }
  throw new Error(`Cannot attach to ${pkg}`);
}

adb('shell', 'pm', 'clear', pkg);
let { browser, page } = await launch();
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
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
  await cdp.send('Profiler.start');
  const run = await page.evaluate(async (n) => {
    // Marker: a uniquely named busy loop whose first sample aligns profile and page clocks.
    const markerAt = performance.now();
    (function nssProfileClockMarker() { const end = performance.now() + 8; while (performance.now() < end); })();
    const capacitor = window.Capacitor;
    const original = capacitor.nativePromise;
    const calls = [];
    capacitor.nativePromise = function (...values) {
      const row = { method: values[1], sql: values[2]?.set?.[0]?.statement?.slice(0, 60) ?? values[2]?.statement?.slice(0, 60), start: performance.now() };
      calls.push(row);
      return Promise.resolve(original.apply(this, values)).finally(() => { row.end = performance.now(); });
    };
    const summary = () => document.querySelector('[data-testid=todo-summary]')?.textContent ?? '';
    const windows = [];
    try {
      for (let i = 0; i < n; i++) {
        const before = summary();
        const changed = new Promise((resolve) => {
          const obs = new MutationObserver(() => {
            if (summary() !== before) { obs.disconnect(); resolve(performance.now()); }
          });
          obs.observe(document.body, { subtree: true, characterData: true, childList: true });
        });
        const dispatchAt = performance.now();
        window.__harness.dispatch({ type: '[Todos] Todo Toggled', id: 't1' });
        const domAt = await changed;
        windows.push({ dispatchAt, domAt });
        await new Promise((r) => setTimeout(r, 20));
      }
      await window.__harness.settle();
    } finally { capacitor.nativePromise = original; }
    return { markerAt, windows, calls };
  }, toggles);
  const { profile } = await cdp.send('Profiler.stop');
  await cdp.detach();

  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const parent = new Map();
  for (const node of profile.nodes) for (const child of node.children ?? []) parent.set(child, node.id);
  const times = [];
  let t = profile.startTime;
  for (let i = 0; i < profile.samples.length; i++) { t += profile.timeDeltas[i]; times.push(t); }
  const inMarker = (id) => {
    for (let cur = id; cur !== undefined; cur = parent.get(cur))
      if (nodes.get(cur).callFrame.functionName === 'nssProfileClockMarker') return true;
    return false;
  };
  const markerIndex = profile.samples.findIndex(inMarker);
  if (markerIndex < 0) {
    const names = new Map();
    for (const id of profile.samples) { const f = nodes.get(id).callFrame.functionName || '(anon)'; names.set(f, (names.get(f) ?? 0) + 1); }
    console.error('samples', profile.samples.length, [...names].sort((a, b) => b[1] - a[1]).slice(0, 15));
    throw new Error('Clock marker not sampled');
  }
  const offsetUs = times[markerIndex] - run.markerAt * 1000; // profile µs = page ms * 1000 + offset

  const phases = {};
  const selfIn = new Map();
  const add = (map, key, ms) => map.set(key, (map.get(key) ?? 0) + ms);
  const perToggle = [];
  for (const w of run.windows) {
    const todo = run.calls.find((c) => c.start >= w.dispatchAt && c.start <= w.domAt && c.method === 'executeSet');
    const marks = { dispatch: w.dispatchAt, nativeStart: todo?.start ?? w.dispatchAt, nativeEnd: todo?.end ?? w.dispatchAt, dom: w.domAt };
    perToggle.push({ total: w.domAt - w.dispatchAt, toNative: marks.nativeStart - marks.dispatch,
      native: marks.nativeEnd - marks.nativeStart, afterNative: marks.dom - marks.nativeEnd,
      otherNativeBeforeDom: run.calls.filter((c) => c !== todo && c.start >= w.dispatchAt && c.start < w.domAt).map((c) => `${c.method}:${c.sql ?? ''}`) });
    for (let i = 0; i < profile.samples.length; i++) {
      const ms = (times[i] - offsetUs) / 1000;
      if (ms < w.dispatchAt || ms > w.domAt) continue;
      const dt = (profile.timeDeltas[i + 1] ?? profile.timeDeltas[i]) / 1000;
      const phase = ms < marks.nativeStart ? 'before native' : ms <= marks.nativeEnd ? 'during todo commit' : 'commit -> DOM';
      const lab = label(nodes.get(profile.samples[i]).callFrame);
      phases[phase] ??= new Map();
      add(phases[phase], category(lab), dt);
      if (phase !== 'during todo commit') add(selfIn, `${phase} | ${lab}`, dt);
    }
  }
  const n = run.windows.length;
  const mean = (key) => perToggle.reduce((s, r) => s + r[key], 0) / n;
  const sorted = perToggle.map((r) => r.total).sort((a, b) => a - b);
  const report = {
    size, toggles: n, p50: sorted[Math.floor(n * 0.5)], p95: sorted[Math.min(n - 1, Math.floor(n * 0.95))],
    meanMs: { total: mean('total'), toNative: mean('toNative'), native: mean('native'), afterNative: mean('afterNative') },
    phasesPerToggleMs: Object.fromEntries(Object.entries(phases).map(([p, m]) => [p, Object.fromEntries([...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / n).toFixed(3)]))])),
    topSelfPerToggleMs: [...selfIn].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => [k, +(v / n).toFixed(3)]),
    perToggle,
  };
  const output = option('output', `.tmp/toggle-profile-${size}.json`);
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ p50: report.p50, p95: report.p95, meanMs: report.meanMs, phasesPerToggleMs: report.phasesPerToggleMs }, null, 1));
  for (const [k, v] of report.topSelfPerToggleMs.slice(0, 30)) console.log(v.toFixed(3).padStart(7), k);
} finally {
  await browser.close().catch(() => {});
  adb('shell', 'am', 'force-stop', pkg);
}
