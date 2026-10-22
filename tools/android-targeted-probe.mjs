// Phase 15e diagnostic experiments; never run alongside acceptance or another probe.
// Interposes only on the diagnostic seed; restores bridge, indexes and cache in finally.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback;
const adb = (...values) => execFileSync(join(process.env.ANDROID_HOME, 'platform-tools/adb.exe'),
  ['-s', 'emulator-5554', ...values], { encoding: 'utf8' });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pkg = 'dev.ngrxsqlite.harness.sqlite';
for (const name of [pkg, 'dev.ngrxsqlite.harness.classic', 'dev.ngrxsqlite.harness']) adb('shell', 'am', 'force-stop', name);
adb('shell', 'am', 'start', '-n', `${pkg}/dev.ngrxsqlite.harness.MainActivity`);
let browser;
for (let i = 0; i < 150 && !browser; i++) {
  await delay(200);
  try {
    const pid = adb('shell', 'pidof', pkg).trim();
    adb('forward', 'tcp:9451', `localabstract:webview_devtools_remote_${pid}`);
    browser = await chromium.connectOverCDP('http://localhost:9451');
  } catch { /* boot */ }
}
const results = [];
function memory() {
  const names = [pkg, ...adb('shell', 'ps', '-A').split(/\r?\n/).filter((s) => /sandboxed_process/.test(s)).map((s) => s.trim().split(/\s+/)[1])];
  return names.map((name) => {
    const raw = adb('shell', 'dumpsys', 'meminfo', name);
    return { name, mb: Number(raw.match(/TOTAL PSS:\s+(\d+)/)?.[1] ?? raw.match(/TOTAL\s+(\d+)/)?.[1]) / 1024, raw };
  });
}
try {
  const page = browser.contexts()[0].pages()[0];
  await page.waitForFunction(() => window.__harness || window.__emptyReady, null, { timeout: 300000 });
  if (await page.evaluate(() => Boolean(window.__emptyReady))) {
    await page.evaluate(() => {
      localStorage.removeItem('harness:empty'); localStorage.removeItem('harness:empty-store');
      localStorage.removeItem('harness:profile');
    });
    await page.reload();
  }
  await page.waitForFunction(() => window.__harness?.benchSeed, null, { timeout: 300000 });
  await page.evaluate(() => localStorage.removeItem('harness:profile'));
  const modes = option('modes', 'baseline,sorted,cache,sorted-cache,indexes,sorted-cache-indexes,values,sorted-values,baseline').split(',');
  for (let trial = 1; trial <= Number(option('trials', '3')); trial++) {
    for (const mode of trial % 2 ? modes : [...modes].reverse()) {
      const size = Number(option('size', '50000'));
      const before = memory();
      const seed = await page.evaluate(async ({ mode, size }) => {
        await window.__harness.settle();
        const capacitor = window.Capacitor;
        const original = capacitor.nativePromise;
        const base = { database: 'ngrx-harness', readonly: false };
        const direct = (method, options) => original.call(capacitor, 'CapacitorSQLite', method, { ...base, ...options });
        const query = async (statement) => (await direct('query', { statement, values: [] })).values;
        const execute = (statements) => direct('execute', { statements, transaction: false });
        const cache = (await query('PRAGMA cache_size'))[0].cache_size;
        const indexes = await query("SELECT name,sql FROM sqlite_master WHERE type='index' AND tbl_name='nss_entity' AND sql IS NOT NULL");
        let suspended = false;
        let nativeMs = 0, preparationMs = 0, calls = 0;
        const buffered = new Map();
        const bufferAll = mode.includes('global') || mode.includes('buffered');
        const flushBuffered = async () => {
          for (const { statement, coll, tuples } of buffered.values()) {
            if (mode.includes('global')) tuples.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
            let encoded = [], bytes = 1024;
            const send = async () => {
              if (!encoded.length) return;
              const start = performance.now();
              await direct('executeSet', { set: [{ statement, values: [coll, `[${encoded.join(',')}]`] }], transaction: false });
              nativeMs += performance.now() - start; calls++;
              encoded = []; bytes = 1024;
            };
            for (const tuple of tuples) {
              const json = JSON.stringify(tuple);
              const added = new TextEncoder().encode(JSON.stringify(json)).length + 1;
              if (encoded.length && bytes + added > 256 * 1024) await send();
              encoded.push(json); bytes += added;
            }
            await send();
          }
          buffered.clear();
        };
        const rebuild = async () => {
          if (suspended) { await execute(indexes.map((x) => x.sql).join(';')); suspended = false; }
        };
        if (mode.includes('cache')) await execute('PRAGMA cache_size=-16384');
        capacitor.nativePromise = async function (plugin, method, options) {
          const t = performance.now();
          if (method === 'rollbackTransaction') buffered.clear();
          if (method === 'query' || method === 'commitTransaction') await flushBuffered();
          if (suspended && (method === 'query' || method === 'commitTransaction')) await rebuild();
          const sets = [];
          for (const entry of options?.set ?? []) {
            if (/^INSERT INTO nss_entity .*FROM json_each/.test(entry.statement)) {
              if (mode.includes('indexes') && !suspended) {
                await execute(indexes.map((x) => `DROP INDEX ${x.name}`).join(';'));
                suspended = true;
              }
              let tuples = JSON.parse(entry.values.at(-1));
              const shared = entry.values.length === 2;
              if (bufferAll) {
                if (!shared) throw new Error('Global diagnostic expects one shared collection');
                if (options.transaction) throw new Error('Global diagnostic requires a streamed explicit transaction');
                const coll = entry.values[0];
                let pending = buffered.get(coll);
                if (!pending) { pending = { coll, statement: entry.statement, tuples: [] }; buffered.set(coll, pending); }
                pending.tuples.push(...tuples);
                continue;
              }
              if (mode.includes('sorted')) tuples.sort((a, b) => {
                const ai = shared ? a[0] : `${a[0]}\0${a[1]}`;
                const bi = shared ? b[0] : `${b[0]}\0${b[1]}`;
                return ai < bi ? -1 : ai > bi ? 1 : 0;
              });
              if (mode.includes('values')) {
                const suffix = entry.statement.slice(entry.statement.indexOf(' WHERE 1') + 8);
                for (let offset = 0; offset < tuples.length; offset += 199) {
                  const rows = tuples.slice(offset, offset + 199).map((tuple) => {
                    const row = shared ? [entry.values[0], ...tuple] : [...tuple];
                    row[3] = Array.isArray(row[3]) ? JSON.stringify(row[3][0]) : row[3] ?? '';
                    row[4] ??= null;
                    return row;
                  });
                  sets.push({ statement: `INSERT INTO nss_entity (coll,id,pos,data,sortkey) VALUES ${rows.map(() => '(?,?,?,?,?)').join(',')}${suffix}`, values: rows.flat() });
                }
              } else sets.push({ ...entry, values: [...entry.values.slice(0, -1), JSON.stringify(tuples)] });
            } else sets.push(entry);
          }
          preparationMs += performance.now() - t;
          if (options?.set && !sets.length) return { changes: { changes: 0 } };
          const start = performance.now();
          const groups = [[]];
          let bytes = 128;
          for (const entry of sets) {
            const added = new TextEncoder().encode(JSON.stringify(entry)).length + 1;
            if (groups.at(-1).length && bytes + added > 256 * 1024) { groups.push([]); bytes = 128; }
            groups.at(-1).push(entry);
            bytes += added;
          }
          if (groups.length > 1 && options.transaction) throw new Error('Probe cannot split an atomic executeSet');
          let result;
          if (options?.set) {
            for (const group of groups) {
              result = await original.call(this, plugin, method, { ...options, set: group });
              calls++;
            }
          } else {
            result = await original.call(this, plugin, method, options);
            calls++;
          }
          nativeMs += performance.now() - start;
          return result;
        };
        try {
          const timing = await window.__harness.benchSeed(size);
          await rebuild();
          return { timing, nativeMs, preparationMs, calls };
        } finally {
          capacitor.nativePromise = original;
          await rebuild();
          await execute(`PRAGMA cache_size=${cache}`);
        }
      }, { mode, size });
      const after = memory();
      const row = { trial, mode, size, seed, before, after };
      if (args.includes('--memory')) {
        row.maintenance = [];
        for (const pragma of ['wal_checkpoint(TRUNCATE)', 'shrink_memory', 'cache_size=-512', 'shrink_memory']) {
          const timing = await page.evaluate(async (pragma) => {
            const start = performance.now();
            const result = await window.Capacitor.nativePromise('CapacitorSQLite', 'query', {
              database: 'ngrx-harness', statement: `PRAGMA ${pragma}`, values: [], readonly: false,
            });
            return { ms: performance.now() - start, result };
          }, pragma);
          row.maintenance.push({ pragma, timing, memory: memory() });
        }
        await page.evaluate(() => window.Capacitor.nativePromise('CapacitorSQLite', 'execute', {
          database: 'ngrx-harness', statements: 'PRAGMA cache_size=-2000', transaction: false, readonly: false,
        }));
      }
      results.push(row);
      writeFileSync(option('output', 'docs/benchmarks/android-targeted-15e-probe.json'), JSON.stringify({ date: new Date().toISOString(), diagnostic: true, results }, null, 2));
      console.log(JSON.stringify({ trial, mode, size, ...seed, pssBefore: before.map((x) => x.mb), pssAfter: after.map((x) => x.mb), maintenance: row.maintenance?.map((x) => ({ pragma: x.pragma, ms: x.timing.ms, pss: x.memory.map((m) => m.mb) })) }));
    }
  }
} finally {
  await browser?.close();
  adb('shell', 'am', 'force-stop', pkg);
}
