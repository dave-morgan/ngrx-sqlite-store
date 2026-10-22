#!/usr/bin/env node
// Phase 9 benchmark: classic @ngrx/store vs ngrx-sqlite-store on a real Android WebView.
//
// Usage: node tools/android-bench.mjs [--impl classic,sqlite] [--sizes 1000,10000,50000]
//   [--runs 200] [--trials 5] [--skip-build] [--serial emulator-5554]
//   [--profile] [--output docs/benchmarks/custom.md] [--bounds-json tmp/bounds.json]
// Needs: a booted device/emulator (adb), JDK 21 (JAVA_HOME or Android Studio JBR), debug build (WebView debugging on).
//
// Per implementation × seed size it records:
//   - first-ready: ms from navigation start to the todo summary rendering (fresh seed and relaunch)
//   - JS heap (after forced GC) on /todos (list mounted) and on /notes (no list mounted)
//   - process PSS from dumpsys meminfo
//   - dispatch → DOM latency for toggling a todo (p50/p95), and the in-app selector-emission benchmark
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { latencyFloor, platformBaseline, summarize, trialOrder, validateControlProvenance, verdict } from './benchmark-statistics.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASE_PKG = 'dev.ngrxsqlite.harness';
let PKG = BASE_PKG;
const ORIGIN = 'https://localhost';
const CDP_PORT = 9333;

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]]] : acc), []),
);
const impls = (args.impl ?? 'classic,sqlite').split(',');
const sizes = (args.sizes ?? '1000,10000,50000').split(',').map(Number);
const runs = Number(args.runs ?? 200);
const trials = Number(args.trials ?? 5);
if (!Number.isInteger(trials) || trials < 1) throw new Error('--trials must be a positive integer; >= 2 required for acceptance');
if (impls.some((impl) => !['classic', 'sqlite'].includes(impl))) throw new Error('Unknown --impl');
if (sizes.some((size) => !Number.isInteger(size) || size < 1)) throw new Error('Invalid --sizes');
const toggles = 30;

const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
const ADB = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const JAVA_HOME = process.env.JAVA_HOME_21 ?? 'C:\\Program Files\\Android\\Android Studio\\jbr';

const sh = (cmd, argv, opts = {}) =>
  execFileSync(cmd, argv, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32', ...opts });
const adb = (...a) => sh(ADB, ['-s', args.serial ?? 'emulator-5554', ...a]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))];
const log = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);

function buildAndInstall(impl) {
  const apkDir = join(ROOT, '.tmp', 'benchmark-apks');
  mkdirSync(apkDir, { recursive: true });
  const cached = join(apkDir, `${impl}.apk`);
  if (args['skip-build'] === 'true') {
    if (!existsSync(cached)) throw new Error(`Missing ${cached}; run without --skip-build first`);
    adb('install', '-r', cached);
    return;
  }
  log(`build ${impl}`);
  sh('npx', ['ng', 'build', 'harness', '-c', `production,${impl}`, '--stats-json'], { timeout: 300_000 });
  copyFileSync(join(ROOT, 'dist/harness/browser-stats.json'), join(apkDir, `${impl}-stats.json`));
  sh('npx', ['cap', 'sync', 'android'], { timeout: 120_000 });
  const gradle = process.env.GRADLE_EXECUTABLE ?? join(ROOT, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  const gradleArgs = ['assembleDebug', `-PbenchmarkImpl=${impl}`, '-q', '--no-daemon'];
  if (process.env.GRADLE_USER_HOME) gradleArgs.push('--gradle-user-home', process.env.GRADLE_USER_HOME);
  if (process.env.BENCH_GRADLE_OFFLINE === 'true') gradleArgs.push('--offline');
  sh(gradle, gradleArgs, {
    cwd: join(ROOT, 'android'),
    env: { ...process.env, JAVA_HOME },
  });
  copyFileSync(join(ROOT, 'android/app/build/outputs/apk/debug/app-debug.apk'), cached);
  adb('install', '-r', cached);
}

async function launch() {
  adb('shell', 'am', 'force-stop', PKG);
  adb('shell', 'am', 'start', '-n', `${PKG}/${BASE_PKG}.MainActivity`);
  let socket;
  // Generous: a cold WebView on a busy emulator can take well over 10 s; adb can also hiccup.
  for (let i = 0; i < 300 && !socket; i++) {
    await sleep(200);
    try {
      const pid = adb('shell', 'pidof', PKG).trim().split(/\s+/)[0];
      const expected = `webview_devtools_remote_${pid}`;
      if (adb('shell', 'cat', '/proc/net/unix').includes(expected)) socket = expected;
    } catch {
      /* transient adb daemon restart: retry */
    }
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
  const summary = () => page.locator('[data-testid=todo-summary]').textContent({ timeout: 1000 }).catch(() => '?');
  const timer = setInterval(async () => log(`    waiting for ${total} total; showing: ${(await summary()).trim()}`), 15_000);
  try {
    return await readyMsInner(page, total);
  } finally {
    clearInterval(timer);
  }
}

async function readyMsInner(page, total) {
  await page.waitForFunction(
    (t) => new RegExp(`(^|\\D)${t} total`).test(document.querySelector('[data-testid=todo-summary]')?.textContent ?? ''),
    total,
    { timeout: 300_000 },
  );
  return page.evaluate((t) => window.__harness?.ready?.total === t ? window.__harness.ready.ms : performance.now(), total);
}

async function heapMb(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage');
  await sleep(300);
  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  await cdp.detach();
  return usedSize / 1048576;
}

const pssOf = (target) => {
  const out = adb('shell', 'dumpsys', 'meminfo', target);
  const m = out.match(/TOTAL PSS:\s+(\d+)/) ?? out.match(/TOTAL\s+(\d+)/);
  return m ? Number(m[1]) / 1024 : 0;
};

function appMemory() {
  const raw = adb('shell', 'dumpsys', 'meminfo', PKG);
  const category = (label) => Number(raw.match(new RegExp(`${label}:\\s+(\\d+)`))?.[1] ?? 0) / 1024;
  return {
    timestamp: Date.now(), javaHeapMb: category('Java Heap'), nativeHeapMb: category('Native Heap'),
    codeMb: category('Code'), stackMb: category('Stack'), graphicsMb: category('Graphics'),
    privateOtherMb: category('Private Other'), systemMb: category('System'),
    totalPssMb: category('TOTAL PSS'), raw,
  };
}

/**
 * Device RAM attributable to the app: the app process (Java + native SQLite) PLUS the
 * WebView sandboxed renderer process, which is where the JS heap (and NgRx state) lives.
 */
function pssMb() {
  const app = pssOf(PKG);
  const renderer = adb('shell', 'ps', '-A')
    .split(/\r?\n/)
    .filter((l) => /sandboxed_process/.test(l))
    .map((l) => l.trim().split(/\s+/)[1])
    .reduce((sum, pid) => sum + pssOf(pid), 0);
  return { app, renderer, total: app + renderer };
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
  return page.evaluate((n) => window.__harness.benchEmit(n), runs);
}

async function measure(impl, size, trial) {
  log(`${impl} · ${size}: fresh install state`);
  adb('shell', 'pm', 'clear', PKG);
  let { browser, page } = await launch();
  let sampler;
  try {
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 120_000 });
  // The default boot seeds 500 todos asynchronously. Wait for it, reset, confirm the
  // reset committed, then reboot with the requested size (otherwise the default seed can
  // land after the reset and the reboot skips seeding).
  log('  wait default seed');
  await readyMs(page, 500);
  log('  reset');
  await page.evaluate(async () => {
    window.__harness.dispatch({ type: '[Seed] Reset' });
    await window.__harness.settle();
  });
  if (impl === 'sqlite') await readyMs(page, 0);
  log('  reboot with seed', size);
  // The Capacitor WebView drops query strings on reload; the harness also reads localStorage.
  await page.evaluate((n) => localStorage.setItem('harness:seed', String(n)), size);
  const profile = args.profile === 'true' ? { before: appMemory(), samples: [] } : undefined;
  sampler = profile ? setInterval(() => {
    try { profile.samples.push(appMemory()); } catch { /* process can transiently disappear during navigation */ }
  }, 500) : undefined;
  await page.goto(`${ORIGIN}/todos?seed=${size}`);
  let firstReadyMs;
  try { firstReadyMs = await readyMs(page, size); }
  finally { if (sampler) clearInterval(sampler); }
  log('  ready', Math.round(firstReadyMs), 'ms');
  await page.evaluate(() => window.__harness.settle());
  const heapTodos = await heapMb(page);
  if (profile) {
    profile.beforeGc = appMemory();
    const pid = adb('shell', 'pidof', PKG).trim();
    adb('shell', 'run-as', PKG, 'kill', '-10', pid);
    await sleep(2000);
    profile.afterGc = appMemory();
    profile.peak = [...profile.samples, profile.beforeGc].reduce((a, b) => a.totalPssMb > b.totalPssMb ? a : b);
  }
  const pss = pssMb();
  const memoryAfterSeed = appMemory();
  const toggle = await toggleLatency(page);

  await page.getByTestId('nav-notes').click();
  await page.getByTestId('note-stats').waitFor();
  await sleep(500);
  const heapNotes = await heapMb(page);

  await page.getByTestId('nav-diagnostics').click();
  const emission = await emissionBench(page);
  const bridge = impl === 'sqlite' ? await page.evaluate(() => window.__harness.benchBridge()) : undefined;
  await browser.close().catch(() => {});

  log(`${impl} · ${size}: relaunch`);
  ({ browser, page } = await launch());
  // Classic has no persistence: it re-seeds on boot (stands in for an API fetch), sized via localStorage.
  const relaunchReadyMs = await readyMs(page, size);
  await page.evaluate(() => window.__harness.settle());
  const heapRelaunch = await heapMb(page);
  await sleep(2000);
  const pssRelaunch = pssMb();
  await browser.close().catch(() => {});
  adb('shell', 'am', 'force-stop', PKG);

  return {
    impl,
    size,
    trial,
    firstReadyMs,
    relaunchReadyMs,
    heapTodosMb: heapTodos,
    heapNotesMb: heapNotes,
    heapRelaunchMb: heapRelaunch,
    pssAppMb: pss.app,
    pssRendererMb: pss.renderer,
    pssTotalMb: pss.total,
    pssRelaunchTotalMb: pssRelaunch.total,
    toggleP50: pct(toggle, 50),
    toggleP95: pct(toggle, 95),
    emitP50: emission.p50,
    emitP95: emission.p95,
    toggleSamples: toggle,
    emission,
    bridge,
    profile,
    memoryAfterSeed,
  };
  } finally {
    if (sampler) clearInterval(sampler);
    await browser.close().catch(() => {});
    adb('shell', 'am', 'force-stop', PKG);
  }
}

const replay = args['report-only'] ? JSON.parse(readFileSync(join(ROOT, args['report-only']), 'utf8')) : undefined;
const device = replay?.device ?? adb('shell', 'getprop', 'ro.product.model').trim();
const sdkLevel = replay?.sdkLevel ?? adb('shell', 'getprop', 'ro.build.version.sdk').trim();
const webview = replay?.webview ?? (adb('shell', 'dumpsys', 'webviewupdate').match(/Current WebView package.*:\s*\(([^)]+)\)/) ?? [])[1] ?? '?';
log(`device ${device} (API ${sdkLevel}), WebView ${webview}`);

const results = replay?.results ?? [];
if (!replay) for (const impl of impls) buildAndInstall(impl);
if (args['build-only'] === 'true') process.exit(0);
const apkHashes = replay?.apkHashes ?? Object.fromEntries(impls.map((impl) => [impl,
  createHash('sha256').update(readFileSync(join(ROOT, '.tmp', 'benchmark-apks', `${impl}.apk`))).digest('hex')]));
// Each paired trial reverses its implementation order. Every size starts with pm clear
// and a new process; force-stop the inactive implementation to exclude its memory.
for (const { impl, trial } of replay ? [] : trialOrder(impls, trials)) {
  for (const pkg of [BASE_PKG, `${BASE_PKG}.classic`, `${BASE_PKG}.sqlite`]) adb('shell', 'am', 'force-stop', pkg);
  PKG = `${BASE_PKG}.${impl}`;
  for (const size of sizes) {
    let result;
    for (let attempt = 1; attempt <= 2 && !result; attempt++) {
      try {
        result = await measure(impl, size, trial);
        log(JSON.stringify({ ...result, bridge: undefined, profile: undefined, toggleSamples: undefined,
          emission: { ...result.emission, samples: undefined } }));
      } catch (e) {
        log(`FAILED ${impl} ${size} (attempt ${attempt}): ${e.message}`);
        if (attempt === 2) result = { impl, size, trial, error: e.message.slice(0, 200) };
      }
    }
    results.push(result);
    mkdirSync(join(ROOT, '.tmp'), { recursive: true });
    writeFileSync(join(ROOT, '.tmp', 'android-bench-progress.json'), JSON.stringify(results, null, 2));
  }
}

const metrics = ['firstReadyMs', 'relaunchReadyMs', 'heapTodosMb', 'heapNotesMb', 'heapRelaunchMb', 'pssTotalMb', 'pssRelaunchTotalMb', 'toggleP50', 'toggleP95', 'emitP50', 'emitP95'];
const cols = ['impl', 'size', 'trial', ...metrics];
const table = [
  `| ${cols.join(' | ')} |`,
  `| ${cols.map(() => '---').join(' | ')} |`,
  ...results.map((r) => `| ${cols.map((c) => r[c] ?? (c === 'firstReadyMs' && r.error ? 'ERR' : '')).join(' | ')} |`),
].join('\n');

const date = new Date().toISOString().slice(0, 10);
const dir = join(ROOT, 'docs', 'benchmarks');
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const file = args.output ? join(ROOT, args.output) : join(dir, `android-parity-${date}.md`);
const fmt = (value) => Number.isFinite(value) ? value.toFixed(3) : '?';
const summaries = [];
for (const size of sizes) {
  for (const impl of impls) {
    const rows = results.filter((row) => row.impl === impl && row.size === size && !row.error);
    if (rows.length !== trials || rows.length < 2) continue;
    for (const metric of metrics) summaries.push({ impl, size, metric, ...summarize(rows.map((row) => row[metric])) });
  }
}
const summaryTable = ['| Impl | Size | Metric | N | Mean | Sample SD |', '| --- | --- | --- | --- | --- | --- |',
  ...summaries.map((row) => `| ${row.impl} | ${row.size} | ${row.metric} | ${row.n} | ${fmt(row.mean)} | ${fmt(row.sd)} |`)].join('\n');
// Bounds can only be entered with written minimum-operation evidence. No memory metric
// can be bridge-bound: its units are MiB, whereas RTT/bandwidth bounds are milliseconds.
const extraBounds = args['bounds-json'] ? JSON.parse(readFileSync(join(ROOT, args['bounds-json']), 'utf8')) : [];
const platformControls = args['platform-json'] ? JSON.parse(readFileSync(join(ROOT, args['platform-json']), 'utf8')) : undefined;
if (platformControls && (!platformControls.session || platformControls.session !== (replay?.session ?? args.session) ||
    platformControls.device !== device || platformControls.sdkLevel !== sdkLevel || platformControls.webview !== webview ||
    platformControls.date !== (replay?.date ?? date) ||
    ['classic', 'sqlite'].some((impl) => platformControls.apkHashes?.[impl] !== apkHashes[impl]))) {
  throw new Error('Platform controls must match benchmark session, device, WebView, date and APK hashes');
}
const floorControls = args['floors-json'] ? JSON.parse(readFileSync(join(ROOT, args['floors-json']), 'utf8')) : undefined;
if (floorControls) validateControlProvenance(floorControls, {
  session: replay?.session ?? args.session, date: replay?.date ?? date,
  device, sdkLevel, webview, apkHashes,
});
const acceptance = [];
for (const size of sizes) {
  const probes = results.filter((row) => row.impl === 'sqlite' && row.size === size && row.bridge);
  const bridge = probes.length ? {
    rttMs: probes.reduce((sum, row) => sum + row.bridge.echo.p50, 0) / probes.length,
    bytesPerMs: probes.reduce((sum, row) => sum + row.bridge.bandwidth.bytesPerMs, 0) / probes.length,
    interceptMs: probes.reduce((sum, row) => sum + row.bridge.bandwidth.interceptMs, 0) / probes.length,
  } : undefined;
  for (const metric of metrics) {
    const classic = summaries.find((row) => row.impl === 'classic' && row.size === size && row.metric === metric);
    const sqlite = summaries.find((row) => row.impl === 'sqlite' && row.size === size && row.metric === metric);
    if (!classic || !sqlite) {
      acceptance.push({ size, metric, status: 'FAIL', explanation: 'Insufficient independent trials or failed measurement' });
      continue;
    }
    const defaultBound = /^(toggle|emit)/.test(metric) ? { callsMin: 1, bytesMin: 0, justification: 'One notify-after-commit dispatch requires at least one native commit round trip (ADR-0003).' } : undefined;
    const supplied = extraBounds.find((row) => row.size === size && row.metric === metric);
    const bound = metric.endsWith('Mb') ? undefined : supplied ?? defaultBound;
    // Use the same classic APK in both empty modes: its identical loaded application
    // code cancels, isolating the cost of the native SQLite plugin rather than NSS.
    const platformMetric = metric.startsWith('heap') ? 'heapMb' : 'pssTotalMb';
    const platform = metric.endsWith('Mb') && platformControls ? {
      ...platformBaseline(platformControls.results, platformMetric),
      justification: `Five paired empty native-plugin controls in the identical classic APK, ${args['platform-json']}; no Angular injector/store/schema/data. Matching ${platformMetric} units.`,
    } : undefined;
    const floor = floorControls && !metric.endsWith('Mb') ? latencyFloor(floorControls.results, size, metric) : undefined;
    const decision = verdict(classic, sqlite, bridge, bound, platform, floor);
    const callMs = bound?.callCost === 'intercept' ? bridge?.interceptMs : bridge?.rttMs;
    acceptance.push({ size, metric, classic, sqlite, ...decision,
      explanation: decision.status === 'PASS' ? 'sqlite mean <= classic mean + classic SD' : floor
        ? `${floor.justification}; ${fmt(classic.sd)} + ${fmt(floor.ms)} + ${fmt(sqlite.sd)} = ${fmt(decision.allowance)} ms; excess=${fmt(decision.excess)} ms` : bound && bridge
        ? `${bound.justification} calls_min=${bound.callsMin}, bytes_min=${bound.bytesMin}; ${fmt(classic.sd)} + ${bound.callsMin} * ${fmt(callMs)} ms (${bound.callCost === 'intercept' ? 'intercept' : 'echo RTT'}) + ${bound.bytesMin} / ${fmt(bridge.bytesPerMs)} bytes/ms + ${fmt(sqlite.sd)} = ${fmt(decision.allowance)} ms; excess=${fmt(decision.excess)} ms`
        : platform ? `${platform.justification} ${fmt(classic.sd)} + max(0, ${fmt(platform.sqlite?.mean)} - ${fmt(platform.classic?.mean)}) = ${fmt(decision.allowance)} MiB; excess=${fmt(decision.excess)} MiB. Empty classic SD=${fmt(platform.classic?.sd)}, empty sqlite SD=${fmt(platform.sqlite?.sd)} (not added).`
        : 'No justified bridge bound (memory uses MiB, timing uses ms).' });
    if (decision.status === 'FAIL' && args['gap-adr']) {
      acceptance.at(-1).explanation += ` Remaining gap and attempts: [ADR](${args['gap-adr']}).`;
    }
  }
}
const acceptanceTable = ['| Size | Metric | Classic mean ± SD | SQLite mean ± SD | Verdict | Evidence / arithmetic |', '| --- | --- | --- | --- | --- | --- |',
  ...acceptance.map((row) => `| ${row.size} | ${row.metric} | ${row.classic ? `${fmt(row.classic.mean)} ± ${fmt(row.classic.sd)}` : '?'} | ${row.sqlite ? `${fmt(row.sqlite.mean)} ± ${fmt(row.sqlite.sd)}` : '?'} | ${row.status} | ${row.explanation} |`)].join('\n');
const counts = Object.fromEntries(['PASS', 'BRIDGE-BOUND', 'PLATFORM-BOUND', 'FAIL'].map((status) => [status, acceptance.filter((row) => row.status === status).length]));
const evidence = args['evidence-md'] ? readFileSync(join(ROOT, args['evidence-md']), 'utf8') : '';
writeFileSync(
  file,
  `# Android parity benchmark ${date}\n\nDevice: ${device} (API ${sdkLevel}), WebView ${webview}. Toggle samples: ${toggles}. Emission runs: ${runs}. Independent trials: ${trials}.\n\nAPK policy: distinct application IDs ${BASE_PKG}.classic and ${BASE_PKG}.sqlite; each APK installed once before trials. --skip-build reuses .tmp/benchmark-apks/<impl>.apk. Trial implementation order alternates; each size starts from a cleared app and a fresh process. Inactive implementation is force-stopped. RTT is the same-session echo p50 averaged across trials; bandwidth is the average executeSet throughput fit. Report retains sample SD and all raw probes. ${args.profile === 'true' ? 'Profiling enabled: 500 ms dumpsys sampling and requested Java GC perturb timings; use a separate run for acceptance.' : 'No meminfo peak polling during timed startup.'}\n\n${summaryTable}\n\n<details><summary>Per-trial table</summary>\n\n${table}\n\n</details>\n\n<details><summary>Raw per-trial measurements</summary>\n\n\`\`\`json\n${JSON.stringify(results, null, 2)}\n\`\`\`\n</details>\n\n${evidence}\n\n${floorControls ? `<details><summary>Raw ADR-0051 floor controls</summary>\n\n\`\`\`json\n${JSON.stringify(floorControls, null, 2)}\n\`\`\`\n</details>` : ''}\n\nAcceptance: PASS ${counts.PASS} / BRIDGE-BOUND ${counts['BRIDGE-BOUND']} / PLATFORM-BOUND ${counts['PLATFORM-BOUND']} / FAIL ${counts.FAIL}.\n\n${acceptanceTable}\n`,
);
writeFileSync(file.replace(/\.md$/, '.json'), JSON.stringify({ date: replay?.date ?? date, session: replay?.session ?? args.session, apkHashes, device, sdkLevel, webview, trials, results, summaries, acceptance, counts, bounds: extraBounds, platformControls, floorControls }, null, 2));
log(`wrote ${file}`);
console.log(acceptanceTable);
console.log(counts);
