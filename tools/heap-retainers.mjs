import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Parse independently of CDP so saved snapshots can be re-analysed offline.
export function analyse(snapshot, needle = '#12345') {
  const { nodes, edges, strings } = snapshot;
  const meta = snapshot.snapshot.meta;
  const nf = meta.node_fields,
    ef = meta.edge_fields;
  const stride = nf.length,
    estride = ef.length;
  const ni = Object.fromEntries(nf.map((s, i) => [s, i]));
  const ei = Object.fromEntries(ef.map((s, i) => [s, i]));
  const types = meta.node_types[ni.type],
    etypes = meta.edge_types[ei.type];
  const count = nodes.length / stride;
  const starts = new Uint32Array(count + 1);
  let offset = 0;
  for (let i = 0; i < count; i++) {
    starts[i] = offset;
    offset += nodes[i * stride + ni.edge_count] * estride;
  }
  starts[count] = offset;
  const nodeName = (i) => strings[nodes[i * stride + ni.name]];
  const nodeType = (i) => types[nodes[i * stride + ni.type]];
  const edgeName = (e) =>
    ['element', 'hidden'].includes(etypes[edges[e + ei.type]])
      ? String(edges[e + ei.name_or_index])
      : strings[edges[e + ei.name_or_index]];
  const targetOf = (e) => edges[e + ei.to_node] / stride;
  const shapes = new Map();
  const targets = [];
  const stringValue = (i, depth = 0) => {
    if (depth > 30) return '';
    if (nodeType(i) === 'string') return nodeName(i);
    if (nodeType(i) !== 'concatenated string') return '';
    let result = '';
    for (let e = starts[i]; e < starts[i + 1]; e += estride)
      if (['first', 'second'].includes(edgeName(e))) result += stringValue(targetOf(e), depth + 1);
    return result;
  };
  for (let i = 0; i < count; i++) {
    if (nodeType(i) !== 'object') continue;
    const props = [];
    for (let e = starts[i]; e < starts[i + 1]; e += estride) {
      if (etypes[edges[e + ei.type]] !== 'property') continue;
      const name = edgeName(e);
      props.push(name);
      const t = targetOf(e);
      if (name === 'title' && stringValue(t).includes(needle)) targets.push(i);
    }
    const shape = `${nodeName(i)} {${props
      .filter((p) => p !== '__proto__')
      .sort()
      .join(',')}}`;
    shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
  }
  const parents = new Int32Array(count).fill(-1);
  const via = new Int32Array(count).fill(-1);
  const queue = new Uint32Array(count);
  queue[0] = 0;
  parents[0] = 0;
  let tail = 1;
  for (let head = 0; head < tail; head++) {
    const i = queue[head];
    for (let e = starts[i]; e < starts[i + 1]; e += estride) {
      if (etypes[edges[e + ei.type]] === 'weak') continue;
      const t = targetOf(e);
      if (parents[t] !== -1) continue;
      parents[t] = i;
      via[t] = e;
      queue[tail++] = t;
    }
  }
  const paths = targets
    .filter((t) => parents[t] !== -1)
    .map((t) => {
      const path = [];
      for (let i = t; i !== 0; i = parents[i]) {
        const e = via[i];
        path.push(
          `${nodeName(parents[i])} --${etypes[edges[e + ei.type]]}:${edgeName(e)}--> ${nodeName(i)} [${nodes[i * stride + ni.id]}]`,
        );
      }
      return path.reverse();
    });
  return {
    needle,
    nodes: count,
    shapes: [...shapes].sort((a, b) => b[1] - a[1]).slice(0, 60),
    samples: paths,
  };
}

async function main() {
  const args = Object.fromEntries(
    process.argv
      .slice(2)
      .reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []),
  );
  await mkdir('tmp/phase13', { recursive: true });
  let snapshot;
  if (args.input) snapshot = JSON.parse(await readFile(args.input, 'utf8'));
  else {
    const adbPath = join(
      process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT,
      'platform-tools',
      'adb.exe',
    );
    const adb = (...a) =>
      execFileSync(adbPath, ['-s', 'emulator-5554', ...a], { encoding: 'utf8' });
    const socket = adb('shell', 'cat', '/proc/net/unix').match(/webview_devtools_remote_\d+/)?.[0];
    if (!socket) throw new Error('No debugging WebView; launch the debug APK first');
    adb('forward', 'tcp:9333', `localabstract:${socket}`);
    const browser = await chromium.connectOverCDP('http://localhost:9333');
    try {
      const page = browser.contexts()[0].pages()[0];
      if (args.seed) {
        await page.waitForFunction(() => !!window.__harness);
        await page.evaluate(async () => {
          window.__harness.dispatch({ type: '[Seed] Reset' });
          await window.__harness.settle();
        });
        await page.evaluate((n) => localStorage.setItem('harness:seed', n), args.seed);
        await page.goto(`https://localhost/todos?seed=${args.seed}`);
        await page.waitForFunction(
          (n) =>
            new RegExp(`(^|\\D)${n} total`).test(
              document.querySelector('[data-testid=todo-summary]')?.textContent ?? '',
            ),
          args.seed,
          { timeout: 300000 },
        );
        await page.evaluate(() => window.__harness.settle());
      }
      if (args['release-action']) {
        await page.evaluate(
          async (count) => {
            for (let i = 0; i < count; i++) {
              window.__harness.dispatch({ type: '[Diagnostics] Benchmark Tick', n: i + 1313 });
              await window.__harness.settle();
            }
          },
          Number(args['release-action']) || 1,
        );
      }
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('HeapProfiler.enable');
      await cdp.send('HeapProfiler.collectGarbage');
      await cdp.send('HeapProfiler.collectGarbage');
      const chunks = [];
      cdp.on('HeapProfiler.addHeapSnapshotChunk', ({ chunk }) => chunks.push(chunk));
      await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
      const file = args.output ?? 'tmp/phase13/android.heapsnapshot';
      const json = chunks.join('');
      await writeFile(file, json);
      snapshot = JSON.parse(json);
      console.log('Snapshot:', file, 'heap:', await cdp.send('Runtime.getHeapUsage'));
      await cdp.detach();
    } finally {
      await browser.close();
    }
  }
  const report = analyse(snapshot, args.needle ?? '#12345');
  await writeFile(args.report ?? 'tmp/phase13/retainers.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
