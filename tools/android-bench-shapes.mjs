#!/usr/bin/env node
import { benchmarkSerial, benchmarkPort } from './android-benchmark-target.mjs';
// Phase 16: large flat objects + hybrid workflow, classic vs sqlite. Run alone on the bench
// emulator (never alongside another device runner). ADR-0038 statistics, ADR-0051 commit floor.
//
// node tools/android-bench-shapes.mjs --serial emulator-5556 [--port 9343] [--trials 5]
//   [--keys 50,500,5000] [--skip-build true] [--output docs/benchmarks/android-shapes-baseline-<date>.md]
//
// Before every trial it waits until no phase 15 device runner (android-bench /
// android-floor-controls / android-parity-profile) is running on this host, so the two
// benchmark streams never overlap. Classic and sqlite alternate per trial.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { platformBaseline } from './benchmark-statistics.mjs';
import { summarizeHeap } from './heap-summary.mjs';
import { runPairedShapes, settleShapes, waitForHarnessReady, assertCompleteShapes, prepareShapesDocument } from './shapes-lifecycle.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const argv = process.argv.slice(2);
const opt = (name, fallback) => (argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback);
const SERIAL = benchmarkSerial(opt('serial'));
const PORT = benchmarkPort(9343, opt('port'));
const TRIALS = Number(opt('trials', '5'));
const KEYS = opt('keys', '50,500,5000').split(',').map(Number);
const BASE = 'dev.ngrxsqlite.harness';
const ORIGIN = 'https://localhost';
const DATE = new Date().toISOString().slice(0, 10);
const OUT = join(ROOT, opt('output', `docs/benchmarks/android-shapes-baseline-${DATE}.md`));
const JAVA_HOME = process.env.JAVA_HOME_21 ?? 'C:\\Program Files\\Android\\Android Studio\\jbr';
const ADB = join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe');

const sh = (cmd, args, o = {}) =>
  execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32', ...o });
const adb = (...a) => execFileSync(ADB, ['-s', SERIAL, ...a], { encoding: 'utf8' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);
const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))];
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs) => (xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / (xs.length - 1)));

/** Block while a phase 15 device runner is active (they share host CPU with this emulator). */
async function waitQuiet() {
  for (let waited = 0; ; waited += 20) {
    let busy = '';
    try {
      busy = execFileSync(
        'powershell',
        ['-NoProfile', '-Command', "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | ForEach-Object { $_.CommandLine }"],
        { encoding: 'utf8' },
      )
        .split(/\r?\n/)
        .filter((l) => /android-(bench|floor-controls|parity-profile)\.mjs/.test(l) && !/android-bench-shapes/.test(l))
        .join(' | ');
    } catch {
      /* assume quiet */
    }
    if (!busy) return;
    if (waited % 120 === 0) log(`waiting for phase 15 runner to finish (${waited}s): ${busy.slice(0, 120)}`);
    await sleep(20_000);
  }
}

function buildAndInstall(impl) {
  // --apks DIR: reuse prebuilt APKs (e.g. .tmp/benchmark-apks, the list acceptance builds).
  const apkDir = opt('apks') ? join(ROOT, opt('apks')) : join(ROOT, '.tmp', 'shapes-apks');
  mkdirSync(apkDir, { recursive: true });
  const apk = join(apkDir, `${impl}.apk`);
  if (!opt('apks') && (opt('skip-build', 'false') !== 'true' || !existsSync(apk))) {
    log(`build ${impl}`);
    sh('npx', ['ng', 'build', 'harness', '-c', `production,${impl}`], { timeout: 600_000 });
    sh('npx', ['cap', 'sync', 'android'], { timeout: 180_000 });
    sh(join(ROOT, 'android', 'gradlew.bat'), ['assembleDebug', `-PbenchmarkImpl=${impl}`, '-q', '--no-daemon'], {
      cwd: join(ROOT, 'android'),
      env: { ...process.env, JAVA_HOME },
      timeout: 900_000,
    });
    execFileSync('cmd', ['/c', 'copy', '/y', join(ROOT, 'android/app/build/outputs/apk/debug/app-debug.apk'), apk]);
  }
  try {
    adb('uninstall', `${BASE}.${impl}`);
  } catch {
    /* not installed */
  }
  adb('install', '-r', apk);
}

async function launch(pkg) {
  for (const p of [BASE, `${BASE}.classic`, `${BASE}.sqlite`]) adb('shell', 'am', 'force-stop', p);
  adb('shell', 'am', 'start', '-n', `${pkg}/${BASE}.MainActivity`);
  for (let i = 0; i < 300; i++) {
    await sleep(200);
    try {
      const pid = adb('shell', 'pidof', pkg).trim().split(/\s+/)[0];
      if (!pid || !adb('shell', 'cat', '/proc/net/unix').includes(`webview_devtools_remote_${pid}`)) continue;
      adb('forward', `tcp:${PORT}`, `localabstract:webview_devtools_remote_${pid}`);
      const browser = await chromium.connectOverCDP(`http://localhost:${PORT}`);
      const page = browser.contexts()[0]?.pages()[0];
      if (page) return { browser, page };
      await browser.close();
    } catch {
      /* socket/page not ready yet */
    }
  }
  throw new Error(`cannot attach to ${pkg}`);
}

async function heapSplit(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  await sleep(300);
  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  const chunks = [];
  cdp.on('HeapProfiler.addHeapSnapshotChunk', ({ chunk }) => chunks.push(chunk));
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  await cdp.detach();
  const summary = summarizeHeap(JSON.parse(chunks.join('')));
  const codeMb = (summary.byType.find((row) => row.name === 'code')?.shallowBytes ?? 0) / 1048576;
  const dataMb = summary.byType.filter((row) => !['code', 'native', 'synthetic'].includes(row.name))
    .reduce((sum, row) => sum + row.shallowBytes, 0) / 1048576;
  return { heapMb: usedSize / 1048576, codeMb, dataMb };
}
const heapInto = async (target, prefix, page) => {
  const h = await heapSplit(page);
  target[`${prefix}Mb`] = h.heapMb;
  target[`${prefix}Code`] = h.codeMb;
  target[`${prefix}Data`] = h.dataMb;
};

/** Device PSS: app process (Java + native SQLite) plus WebView renderers (JS heap, code). */
function pssSplit(pkg) {
  const pssOf = (target) => {
    const m = adb('shell', 'dumpsys', 'meminfo', target).match(/TOTAL PSS:\s+(\d+)/);
    return m ? Number(m[1]) / 1024 : 0;
  };
  const renderers = adb('shell', 'ps', '-A')
    .split(/\r?\n/)
    .filter((l) => /sandboxed_process/.test(l))
    .map((l) => l.trim().split(/\s+/)[1]);
  const app = pssOf(pkg);
  const renderer = renderers.reduce((s, pid) => s + pssOf(pid), 0);
  return { total: app + renderer, app, renderer };
}
const pssInto = (target, pkg) => {
  const p = pssSplit(pkg);
  target.pssTotalMb = p.total;
  target.pssApp = p.app;
  target.pssRenderer = p.renderer;
};

const shapes = (page, method, ...args) => page.evaluate(([m, a]) => window.__shapes[m](...a), [method, args]);
const summarize = (samples) => ({
  emitP50: pct(samples.map((s) => s.emit), 50),
  emitP95: pct(samples.map((s) => s.emit), 95),
  domP50: pct(samples.map((s) => s.dom), 50),
  domP95: pct(samples.map((s) => s.dom), 95),
});

async function fCommit(page) {
  return page.evaluate(async () => {
    const native = (m, o) => window.Capacitor.nativePromise('CapacitorSQLite', m, { database: 'ngrx-harness', readonly: false, ...o });
    await native('execute', { statements: 'CREATE TABLE IF NOT EXISTS nss_bench(k INTEGER PRIMARY KEY,v TEXT)', transaction: false });
    const t = [];
    for (let i = 0; i < 25; i++) {
      const b = performance.now();
      await native('executeSet', {
        set: [{ statement: 'INSERT OR REPLACE INTO nss_bench(k,v) VALUES (1,?)', values: ['x'.repeat(32)] }],
        transaction: true, returnMode: 'no', isSQL92: true,
      });
      t.push(performance.now() - b);
    }
    return t.slice(5); // drop warm-up
  });
}

async function trial(impl, t) {
  const pkg = `${BASE}.${impl}`;
  const row = { impl, trial: t, flat: {}, workflow: {} };
  const browsers = new Set();
  try {
  for (const k of KEYS) {
    await waitQuiet();
    adb('shell', 'pm', 'clear', pkg);
    let { browser, page } = await launch(pkg);
    browsers.add(browser);
    await prepareShapesDocument(page, k);
    await page.goto(`${ORIGIN}/shapes/flat`);
    await page.waitForFunction(() => !!window.__shapes, null, { timeout: 120_000 });
    await page.waitForFunction((n) => document.querySelector('[data-testid=flat-count]')?.textContent?.trim() === `${n} keys`, k, { timeout: 180_000 });
    await settleShapes(page);
    const f = {};
    f.setKey = summarize(await shapes(page, 'flatSetKey', 30));
    f.setKeys = summarize(await shapes(page, 'flatSetKeys', 20));
    f.replace = summarize(await shapes(page, 'flatReplace', 20));
    f.burst = await shapes(page, 'flatBurst', 30, 3);
    await heapInto(f, 'heap', page);
    pssInto(f, pkg);
    if (impl === 'sqlite') {
      // Diagnostic store-free control: commit + visible DOM change, sampled like setKey.
      f.control = summarize(await shapes(page, 'controlCommitRender', 30));
      const fc = await fCommit(page);
      f.fCommitP50 = pct(fc, 50);
      f.fCommitP95 = pct(fc, 95);
    }
    row.flat[k] = f;
    writeFileSync(JOURNAL, JSON.stringify({ event: 'flat', keys: k, row }) + '\n', { flag: 'a' });
    log(impl, `t${t}`, `K=${k}`, `setKey p50 ${f.setKey.emitP50.toFixed(1)} ms`, `burst end ${f.burst.endLag.toFixed(0)} ms`);
    await browser.close();
  }
  // Workflow (independent of K): fresh app, persisted relaunch at the end.
  await waitQuiet();
  adb('shell', 'pm', 'clear', pkg);
  let { browser, page } = await launch(pkg);
  browsers.add(browser);
  await prepareShapesDocument(page, 50);
  await page.goto(`${ORIGIN}/shapes/workflow`);
  await page.waitForFunction(() => !!window.__shapes, null, { timeout: 120_000 });
  await page.waitForFunction(() => document.querySelector('[data-testid=wf-step]')?.textContent?.trim() === '1', null, { timeout: 120_000 });
  await settleShapes(page);
  const w = {};
  row.workflow = w;
  for (const d of ['d1', 'd4', 'd10']) w[`edit_${d}`] = summarize(await shapes(page, 'wfEdit', d, 30));
  w.loadCycle = summarize(await shapes(page, 'wfLoad', 15));
  w.step = summarize(await shapes(page, 'wfStep', 30));
  w.reset = summarize(await shapes(page, 'wfReset', 10));
  w.append100 = summarize(await shapes(page, 'wfAppend', 10, 100));
  if (impl === 'sqlite') w.control = summarize(await shapes(page, 'controlCommitRender', 30));
  await heapInto(w, 'heap', page);
  pssInto(w, pkg);
  await settleShapes(page);
  await browser.close();
  ({ browser, page } = await launch(pkg));
  browsers.add(browser);
  await waitForHarnessReady(page);
  await page.goto(`${ORIGIN}/shapes/workflow`);
  await page.waitForFunction(() => /^\d+$/.test(document.querySelector('[data-testid=wf-events]')?.textContent?.trim() ?? ''), null, { timeout: 120_000 });
  w.relaunchReadyMs = await page.evaluate(() => performance.now());
  await heapInto(w, 'relaunchHeap', page);
  await browser.close();
  row.workflow = w;
  log(impl, `t${t}`, 'workflow', `d10 p50 ${w.edit_d10.emitP50.toFixed(1)} ms`, `append p50 ${w.append100.emitP50.toFixed(1)} ms`);
  writeFileSync(JOURNAL, JSON.stringify({ event: 'complete', row }) + '\n', { flag: 'a' });
  return row;
  } catch (error) {
    writeFileSync(JOURNAL, JSON.stringify({ event: 'failure', row, error: String(error) }) + '\n', { flag: 'a' });
    throw error;
  } finally {
    for (const browser of browsers) await browser.close().catch(() => {});
  }
}

// ── run ── (--report-only FILE.json re-reports saved rows without touching the device)
const RAW = OUT.replace(/\.md$/, '.json');
const JOURNAL = OUT.replace(/\.md$/, '.jsonl');
const rows = [];
if (opt('report-only')) rows.push(...JSON.parse(readFileSync(join(ROOT, opt('report-only')), 'utf8')));
else {
  if ([RAW, JOURNAL, OUT].some(existsSync)) throw new Error('Refusing to overwrite existing shapes samples; use a new output label');
  log(`device ${SERIAL} (${adb('shell', 'getprop', 'ro.product.model').trim()}), trials ${TRIALS}, keys ${KEYS}`);
  for (const impl of ['classic', 'sqlite']) buildAndInstall(impl);
  const apkDir = opt('apks') ? join(ROOT, opt('apks')) : join(ROOT, '.tmp', 'shapes-apks');
  const apkHashes = Object.fromEntries(['classic', 'sqlite'].map(impl => [impl,
    createHash('sha256').update(readFileSync(join(apkDir, `${impl}.apk`))).digest('hex')]));
  const session = opt('session');
  const platformFile = opt('platform-json');
  if (platformFile) {
    const control = JSON.parse(readFileSync(join(ROOT, platformFile), 'utf8'));
    if (session && control.session !== session) throw new Error('Shapes/control session mismatch');
    for (const impl of ['classic', 'sqlite'])
      if (control.apkHashes[impl] !== apkHashes[impl]) throw new Error('Shapes/control APK mismatch');
  }
  writeFileSync(OUT.replace(/\.md$/, '.provenance.json'), JSON.stringify({
    date: DATE, session, apkHashes, keys: KEYS, trials: TRIALS,
    startupBarrier: '__harness hook followed by settle() (route independent)',
    backgroundSeed: 50, backgroundNormalization: 'benchSeed(50) before flat/workflow setup navigation',
    platformFile, platformSha256: platformFile ? createHash('sha256').update(readFileSync(join(ROOT, platformFile))).digest('hex') : undefined,
  }, null, 2) + '\n');
  // Always save completed rows; trial() journals partial work and restores its browser.
  // Any failed trial exits the stage before another trial or acceptance calculation.
  await runPairedShapes(TRIALS, trial, rows, completed => {
    writeFileSync(RAW, JSON.stringify(completed, null, 2) + '\n');
  });
}

// ── acceptance (ADR-0038 / ADR-0051 style; preliminary: contended host, no memory platform control) ──
assertCompleteShapes(rows, TRIALS, KEYS);
const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
const metricsFor = (group) => {
  const sample = rows.find((r) => r[group] && Object.keys(r[group]).length)?.[group];
  if (!sample) return [];
  const leafs = [];
  const walk = (o, prefix) => {
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'number') leafs.push(prefix + k);
      else if (v && typeof v === 'object') walk(v, `${prefix}${k}.`);
    }
  };
  walk(sample, '');
  return leafs.filter((m) => !/fCommit|dispatched|observed|^control\.|Code$|Data$|pssApp$|pssRenderer$/.test(m));
};
const fc = rows.filter((r) => r.impl === 'sqlite').flatMap((r) => Object.values(r.flat).map((f) => [f.fCommitP50, f.fCommitP95]));
const F50 = mean(fc.map((x) => x[0])), F95 = mean(fc.map((x) => x[1]));
const commitsFor = (m) => (/loadCycle/.test(m) ? 2 : 1);

const table = [];
const counts = { PASS: 0, 'PLATFORM-BOUND': 0, 'CODE-BOUND': 0, FAIL: 0 };
// --platform-json: android-parity-profile --empty output from the same session (ADR-0070 method).
let PLATFORM;
try {
  PLATFORM = opt('platform-json')
    ? platformBaseline(JSON.parse(readFileSync(join(ROOT, opt('platform-json')), 'utf8')).results.filter((r) => r.kind === 'empty-plugin'), 'pssTotalMb')
    : undefined;
} catch (error) {
  log(`platform control unavailable (${error.message}); PSS rows get no plugin baseline`);
}
for (const group of ['flat', 'workflow']) {
  for (const m of metricsFor(group)) {
    const c = rows.filter((r) => r.impl === 'classic').map((r) => get(r[group], m)).filter(Number.isFinite);
    const s = rows.filter((r) => r.impl === 'sqlite').map((r) => get(r[group], m)).filter(Number.isFinite);
    if (!c.length || !s.length) continue;
    const [mc, sc, ms, ss] = [mean(c), sd(c), mean(s), sd(s)];
    let verdict = ms <= mc + sc ? 'PASS' : 'FAIL';
    let note = '';
    const latency = !/Mb$/.test(m) && !/maxBacklog|relaunchReadyMs/.test(m);
    if (verdict === 'FAIL' && latency) {
      // ADR-0093: same-session store-free commit+render control sampled like the workload.
      const scope = group === 'flat' ? (r) => r.flat[m.split('.')[0]]?.control : (r) => r.workflow?.control;
      const key = `${/dom/.test(m) ? 'dom' : 'emit'}${/P95/.test(m) ? 'P95' : 'P50'}`;
      const control = rows.filter((r) => r.impl === 'sqlite').map((r) => scope(r)?.[key]).filter(Number.isFinite);
      if (control.length >= 5) {
        const allowance = sc + mean(control) * commitsFor(m) + ss;
        note = `allow ${allowance.toFixed(1)} (control ${key} ${mean(control).toFixed(1)}×${commitsFor(m)})`;
        if (ms - mc <= allowance) verdict = 'PLATFORM-BOUND';
      } else note = 'no control';
    }
    if (verdict === 'FAIL' && /heapMb$|HeapMb$/.test(m)) {
      // ADR-0067 method: code-space difference at the same point; store data must be at parity.
      const prefix = m.replace(/Mb$/, '');
      const part = (impl, suffix) => rows.filter((r) => r.impl === impl).map((r) => get(r[group], `${prefix}${suffix}`)).filter(Number.isFinite);
      const [cc, sc2, cd, sd2] = [part('classic', 'Code'), part('sqlite', 'Code'), part('classic', 'Data'), part('sqlite', 'Data')];
      if (cc.length >= 5 && sc2.length >= 5) {
        const allowance = sc + Math.max(0, mean(sc2) - mean(cc));
        const dataParity = mean(sd2) <= mean(cd) + sd(cd);
        note = `code +${(mean(sc2) - mean(cc)).toFixed(2)} MB; data ${mean(cd).toFixed(2)} -> ${mean(sd2).toFixed(2)} MB`;
        if (dataParity && ms - mc <= allowance) verdict = 'CODE-BOUND';
      }
    }
    if (verdict === 'FAIL' && /pssTotalMb$/.test(m) && PLATFORM) {
      // ADR-0070 method: same-session empty-plugin control (plugin + native SQLite baseline).
      const base = Math.max(0, PLATFORM.sqlite.mean - PLATFORM.classic.mean);
      const allowance = sc + base + ss;
      note = `allow ${allowance.toFixed(1)} (plugin baseline ${base.toFixed(1)} MB)`;
      if (ms - mc <= allowance) verdict = 'PLATFORM-BOUND';
    }
    counts[verdict]++;
    table.push(`| ${group} | ${m} | ${mc.toFixed(2)} ± ${sc.toFixed(2)} | ${ms.toFixed(2)} ± ${ss.toFixed(2)} | ${(ms / (mc || 1e-9)).toFixed(1)}× | ${verdict} | ${note} |`);
  }
}

// Diagnostic only (not a floor): store-free commit + visible DOM change vs the sqlite single write.
const controlRows = KEYS.map((k) => {
  const s = rows.filter((r) => r.impl === 'sqlite' && r.flat[k]?.control);
  const v = (path) => mean(s.map((r) => get(r.flat[k], path)));
  return s.length ? `| ${k} | ${v('control.emitP50').toFixed(2)} | ${v('control.domP50').toFixed(2)} | ${v('control.domP95').toFixed(2)} | ${v('setKey.emitP50').toFixed(2)} | ${v('setKey.domP50').toFixed(2)} | ${v('setKey.domP95').toFixed(2)} |` : `| ${k} | – | – | – | – | – | – |`;
});
const pssRow = (label, pick) => {
  const v = (impl, key) => mean(rows.filter((r) => r.impl === impl).map((r) => pick(r)?.[key]).filter(Number.isFinite));
  return `| ${label} | ${v('classic', 'pssApp').toFixed(1)} | ${v('sqlite', 'pssApp').toFixed(1)} | ${v('classic', 'pssRenderer').toFixed(1)} | ${v('sqlite', 'pssRenderer').toFixed(1)} |`;
};
const pssRows = [...KEYS.map((k) => pssRow(`flat ${k}`, (r) => r.flat[k])), pssRow('workflow', (r) => r.workflow)];
const md = `# Phase 16 shapes — flat objects & hybrid workflow (${DATE})

Measured alone on \`${SERIAL}\` (ADR-0091). Relative verdicts come from alternating classic/sqlite trials; the library and harness are the current working tree.

- **Workloads:** \`projects/harness/src/app/state/shapes.ts\`, measured through \`window.__shapes\`.
  - **Flat:** K top-level keys (${KEYS.join(' / ')}).
  - **Workflow:** form nested to depth 10, status/loading, steps, events log, drafts.
- **Timings:** emit is dispatch → selector emits the new value; dom is dispatch → text in the DOM; p50/p95 are per trial, then mean ± SD across ${TRIALS} trials.
- **Burst:** 30 dispatches/s for 3 s into one key.
- **Commit floor:** F_commit (raw durable single-row commit, same session) p50 ${F50.toFixed(2)} ms, p95 ${F95.toFixed(2)} ms.
- **Verdicts:**
  - PASS: sqlite ≤ classic + SD.
  - PLATFORM-BOUND (latency, ADR-0093): excess ≤ classic SD + same-session store-free commit+render control × commits + sqlite SD.
  - CODE-BOUND (heap, ADR-0067 method): excess ≤ classic SD + V8 code-space difference, with store data at parity.
  - PLATFORM-BOUND (PSS, ADR-0070 method): excess ≤ classic SD + empty-plugin baseline + sqlite SD${PLATFORM ? '' : ' (no --platform-json: not applied)'}.
  - FAIL: everything else.

**Acceptance:** PASS ${counts.PASS} / PLATFORM-BOUND ${counts['PLATFORM-BOUND']} / CODE-BOUND ${counts['CODE-BOUND']} / FAIL ${counts.FAIL}

| Group | Metric | Classic mean ± SD | SQLite mean ± SD | Ratio | Verdict | Note |
| --- | --- | --- | --- | --- | --- | --- |
${table.join('\n')}

## Diagnostic: store-free commit + render control (not a floor)
One durable single-row commit, then a visible DOM text change, sampled exactly like the single-key write (sqlite trials, mean of per-trial percentiles, ms).

| K | control emit p50 | control dom p50 | control dom p95 | setKey emit p50 | setKey dom p50 | setKey dom p95 |
| --- | --- | --- | --- | --- | --- | --- |
${controlRows.join('\n')}

## Diagnostic: device PSS split (MB, means)
| Point | classic app | sqlite app | classic renderer | sqlite renderer |
| --- | --- | --- | --- | --- |
${pssRows.join('\n')}

<details><summary>Raw per-trial data</summary>

\`\`\`json
${JSON.stringify(rows, null, 2)}
\`\`\`
</details>
`;
mkdirSync(join(ROOT, 'docs', 'benchmarks'), { recursive: true });
writeFileSync(OUT, md);
log(`wrote ${OUT}`);
log(`PASS ${counts.PASS} / PLATFORM-BOUND ${counts['PLATFORM-BOUND']} / CODE-BOUND ${counts['CODE-BOUND']} / FAIL ${counts.FAIL}`);
