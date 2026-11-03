#!/usr/bin/env node
import { benchmarkSerial } from './android-benchmark-target.mjs';
// Phase 15f seed ladder: morph the F_seed control into the store's bulk entity insert one
// feature at a time, on a scratch database, using the store's real persisted rows.
// --size 50000 [--samples 6] [--steps a,b] [--serial emulator-5554] [--output FILE]
// Diagnostic only; never run alongside another device runner.
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
const pkg = `${base}.sqlite`;
const size = Number(option('size', '50000'));
const samples = Number(option('samples', '6'));
const date = new Date().toISOString().slice(0, 10);

/**
 * Each step: table shape, transport encoding of the entity JSON, and indexes.
 * transport 'string': data travels as a JSON string ([id,pos,"{...}"]) and is
 *   extracted with json_extract (no re-render); 'embed': data travels as a JSON value
 *   ([id,pos,[{...}]]) and is re-rendered with `value -> '$[2][0]'` (production shape).
 * table 'int': (k INTEGER PRIMARY KEY, v TEXT) like F_seed; 'ent': production
 *   nss_entity shape (coll,id TEXT key, WITHOUT ROWID); 'entrow': same columns as a
 *   rowid table with a UNIQUE(coll,id) constraint.
 * indexes: 'order' = (coll,pos)+(coll,sortkey,pos); 'expr' = the two declared
 *   json_extract partial query indexes (production); 'cols' = the same keys computed in
 *   JS into plain columns with ordinary indexes.
 */
const STEPS = {
  floor: { table: 'int', transport: 'string', indexes: [] },
  'int-embed': { table: 'int', transport: 'embed', indexes: [] },
  'ent-string': { table: 'ent', transport: 'string', indexes: [] },
  'ent-embed': { table: 'ent', transport: 'embed', indexes: [] },
  'ent-embed-order': { table: 'ent', transport: 'embed', indexes: ['order'] },
  production: { table: 'ent', transport: 'embed', indexes: ['order', 'expr'] },
  'ent-string-order-expr': { table: 'ent', transport: 'string', indexes: ['order', 'expr'] },
  'ent-string-order-cols': { table: 'ent', transport: 'string', indexes: ['order', 'cols'] },
  'ent-embed-order-cols': { table: 'ent', transport: 'embed', indexes: ['order', 'cols'] },
  'entrow-embed-order-expr': { table: 'entrow', transport: 'embed', indexes: ['order', 'expr'] },
};
const stepNames = option('steps', Object.keys(STEPS).join(',')).split(',');

async function launch() {
  for (const name of [base, `${base}.classic`, `${base}.sqlite`]) adb('shell', 'am', 'force-stop', name);
  adb('shell', 'am', 'start', '-n', `${pkg}/${base}.MainActivity`);
  for (let i = 0; i < 150; i++) {
    await delay(200);
    try {
      const pid = adb('shell', 'pidof', pkg).trim().split(/\s+/)[0];
      const socket = `webview_devtools_remote_${pid}`;
      if (!adb('shell', 'cat', '/proc/net/unix').includes(socket)) continue;
      adb('forward', 'tcp:9337', `localabstract:${socket}`);
      const browser = await chromium.connectOverCDP('http://localhost:9337');
      const page = browser.contexts()[0]?.pages()[0];
      if (page) return { browser, page };
      await browser.close();
    } catch { /* socket and page can appear independently */ }
  }
  throw new Error(`Cannot attach to ${pkg}`);
}

let browser;
try {
  adb('shell', 'pm', 'clear', pkg);
  let session = await launch();
  ({ browser } = session);
  let { page } = session;
  await page.waitForFunction(() => window.__harness?.ready, null, { timeout: 300000 });
  await page.evaluate(async (n) => {
    localStorage.setItem('harness:seed', String(n));
    window.__harness.dispatch({ type: '[Seed] Reset' });
    await window.__harness.settle();
  }, size);
  await page.reload();
  await page.waitForFunction(() => window.__harness?.ready, null, { timeout: 300000 });
  await page.evaluate(() => window.__harness.settle());

  const result = await page.evaluate(async ({ steps, samples }) => {
    const native = (database, method, options) =>
      window.Capacitor.nativePromise('CapacitorSQLite', method, { database, readonly: false, ...options });
    // Real persisted rows of the largest collection, exactly as the store wrote them.
    const coll = (await native('ngrx-harness', 'query', {
      statement: 'SELECT coll, count(*) n FROM nss_entity GROUP BY coll ORDER BY n DESC LIMIT 1', values: [],
    })).values[0].coll;
    const rows = [];
    for (let offset = 0; ; offset += 5000) {
      const page = (await native('ngrx-harness', 'query', {
        statement: 'SELECT id,pos,sortkey,data FROM nss_entity WHERE coll=? ORDER BY pos LIMIT 5000 OFFSET ?',
        values: [coll, offset],
      })).values;
      rows.push(...page);
      if (page.length < 5000) break;
    }
    const db = 'nss_ladder';
    await window.Capacitor.nativePromise('CapacitorSQLite', 'checkConnectionsConsistency', { dbNames: ['ngrx-harness'], openModes: ['RW'] }).catch(() => undefined);
    await window.Capacitor.nativePromise('CapacitorSQLite', 'createConnection', {
      database: db, version: 1, encrypted: false, mode: 'no-encryption', readonly: false,
    }).catch(() => undefined);
    await window.Capacitor.nativePromise('CapacitorSQLite', 'open', { database: db, readonly: false });
    await native(db, 'query', { statement: 'PRAGMA journal_mode=WAL', values: [] });
    const pragma = async (database, name) => (await native(database, 'query', { statement: `PRAGMA ${name}`, values: [] })).values?.[0];
    const environment = {
      sqliteVersion: (await native(db, 'query', { statement: 'SELECT sqlite_version() v', values: [] })).values?.[0]?.v,
      coll, rows: rows.length,
      scratch: { journal: await pragma(db, 'journal_mode'), synchronous: await pragma(db, 'synchronous'), cache: await pragma(db, 'cache_size'), page: await pragma(db, 'page_size') },
      store: { journal: await pragma('ngrx-harness', 'journal_mode'), synchronous: await pragma('ngrx-harness', 'synchronous'), cache: await pragma('ngrx-harness', 'cache_size'), page: await pragma('ngrx-harness', 'page_size') },
    };
    const exec = (statements) => native(db, 'execute', { statements, transaction: false });
    const set = (statement, values) => native(db, 'executeSet', {
      set: [{ statement, values }], transaction: false, returnMode: 'no', isSQL92: true,
    });
    const BUDGET = 256 * 1024;
    const encoder = new TextEncoder();
    const fields = ['done', 'userId'];

    function build(step) {
      const began = performance.now();
      const embed = step.transport === 'embed';
      const cols = step.indexes.includes('cols');
      const encoded = rows.map((row, index) => {
        const data = embed ? `[${row.data}]` : JSON.stringify(row.data);
        const extra = cols ? (() => { const v = JSON.parse(row.data); return ',' + fields.map((f) => JSON.stringify(v[f] ?? null)).join(','); })() : '';
        return step.table === 'int'
          ? `[${index + 1},${data}]`
          : `[${JSON.stringify(row.id)},${row.pos},${data}${extra}]`;
      });
      const dataExpr = (i) => embed ? `value -> '$[${i}][0]'` : `json_extract(value,'$[${i}]')`;
      const sql = step.table === 'int'
        ? `INSERT INTO lad(k,v) SELECT json_extract(value,'$[0]'),${dataExpr(1)} FROM json_each(?)`
        : `INSERT INTO lad(coll,id,pos,data${cols ? ',ix0,ix1' : ''}) SELECT ?,json_extract(value,'$[0]'),json_extract(value,'$[1]'),${dataExpr(2)}${cols ? ",json_extract(value,'$[3]'),json_extract(value,'$[4]')" : ''} FROM json_each(?)`;
      const payloads = [];
      let group = [];
      let bytes = 0;
      const flush = () => {
        const json = `[${group.join(',')}]`;
        payloads.push(step.table === 'int' ? [json] : [coll, json]);
        group = []; bytes = 0;
      };
      for (const item of encoded) {
        const added = encoder.encode(JSON.stringify(item)).length;
        if (group.length && bytes + added > BUDGET) flush();
        group.push(item); bytes += added;
      }
      if (group.length) flush();
      const wireBytes = payloads.reduce((n, p) => n + encoder.encode(JSON.stringify(p)).length, 0);
      return { sql, payloads, wireBytes, encodeMs: performance.now() - began };
    }

    function ddl(step) {
      const out = ['DROP TABLE IF EXISTS lad'];
      const cols = step.indexes.includes('cols') ? ', ix0, ix1' : '';
      if (step.table === 'int') out.push('CREATE TABLE lad(k INTEGER PRIMARY KEY, v TEXT)');
      else if (step.table === 'ent') out.push(`CREATE TABLE lad(coll TEXT NOT NULL, id TEXT NOT NULL, pos REAL NOT NULL, sortkey TEXT, data TEXT NOT NULL${cols}, PRIMARY KEY(coll,id)) WITHOUT ROWID`);
      else out.push(`CREATE TABLE lad(coll TEXT NOT NULL, id TEXT NOT NULL, pos REAL NOT NULL, sortkey TEXT, data TEXT NOT NULL${cols}, UNIQUE(coll,id))`);
      if (step.indexes.includes('order')) out.push('CREATE INDEX lad_order ON lad(coll,pos)', 'CREATE INDEX lad_sort ON lad(coll,sortkey,pos)');
      if (step.indexes.includes('expr')) for (const f of fields)
        out.push(`CREATE INDEX lad_q_${f} ON lad(coll,json_extract(data,'$.${f}')) WHERE data != '' AND json_valid(data)`);
      if (step.indexes.includes('cols')) out.push('CREATE INDEX lad_c0 ON lad(coll,ix0)', 'CREATE INDEX lad_c1 ON lad(coll,ix1)');
      return out;
    }

    const results = Object.fromEntries(Object.keys(steps).map((name) => [name, { ...steps[name], samples: [] }]));
    const built = {};
    for (const [name, step] of Object.entries(steps)) built[name] = build(step);
    for (let sample = 0; sample < samples; sample++) {
      const order = Object.keys(steps);
      if (sample % 2) order.reverse();
      for (const name of order) {
        const step = steps[name];
        const { sql, payloads } = built[name];
        for (const statement of ddl(step)) await exec(statement);
        await exec('PRAGMA wal_checkpoint(TRUNCATE)').catch(() => undefined);
        const began = performance.now();
        await window.Capacitor.nativePromise('CapacitorSQLite', 'beginTransaction', { database: db });
        for (const values of payloads) await set(sql, values);
        await window.Capacitor.nativePromise('CapacitorSQLite', 'commitTransaction', { database: db });
        results[name].samples.push(performance.now() - began);
      }
    }
    const count = (await native(db, 'query', { statement: 'SELECT count(*) n FROM lad', values: [] })).values?.[0]?.n;
    await exec('DROP TABLE IF EXISTS lad');
    await window.Capacitor.nativePromise('CapacitorSQLite', 'closeConnection', { database: db, readonly: false }).catch(() => undefined);
    for (const name of Object.keys(steps)) {
      const s = results[name].samples;
      const mean = s.reduce((a, b) => a + b, 0) / s.length;
      Object.assign(results[name], {
        calls: built[name].payloads.length, wireBytes: built[name].wireBytes, encodeMs: built[name].encodeMs,
        mean, sd: Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, s.length - 1)),
      });
    }
    return { environment, lastCount: count, results };
  }, { steps: Object.fromEntries(stepNames.map((name) => [name, STEPS[name]])), samples });

  const output = option('output', `docs/benchmarks/android-seed-ladder-${date}.json`);
  writeFileSync(output, JSON.stringify({ date, size, samples, ...result }, null, 2) + '\n');
  console.log(JSON.stringify(result.environment));
  for (const [name, r] of Object.entries(result.results))
    console.log(`${name.padEnd(26)} mean ${r.mean.toFixed(1).padStart(8)} sd ${r.sd.toFixed(1).padStart(7)} calls ${r.calls} wire ${(r.wireBytes / 1048576).toFixed(2)}MB encode ${r.encodeMs.toFixed(0)}ms`);
} finally {
  await browser?.close().catch(() => {});
  adb('shell', 'am', 'force-stop', pkg);
}
