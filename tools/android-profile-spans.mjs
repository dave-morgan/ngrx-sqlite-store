// Attribute sampled CPU in diagnostic toggle spans. Never used as an acceptance floor.
// Source maps must match the APK scripts exactly, except equal-length chunk hashes.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback;
const file = option('trace');
const trace = JSON.parse(readFileSync(file));
const profile = JSON.parse(readFileSync(file.replace(/\.json$/, '.cpuprofile')));
const maps = option('maps', '.tmp/phase15e/source-maps/browser');
const scripts = option('scripts', '.tmp/phase15e/apk-js');
const normalize = (s) => s.split('\n//#')[0].replace(/(main|chunk)-[a-zA-Z0-9_-]{8}\.js/g, '$1-XXXXXXXX.js');
const candidates = readdirSync(maps).filter((s) => s.endsWith('.js') && existsSync(join(maps, `${s}.map`))).map((name) => ({
  name, text: normalize(readFileSync(join(maps, name), 'utf8')),
}));
const matches = new Map();
for (const name of readdirSync(scripts).filter((s) => s.endsWith('.js'))) {
  const text = normalize(readFileSync(join(scripts, name), 'utf8'));
  const match = candidates.find((s) => s.text === text);
  if (match) matches.set(name, new TraceMap(JSON.parse(readFileSync(join(maps, `${match.name}.map`)))));
}
const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
const parents = new Map();
for (const node of profile.nodes) for (const id of node.children ?? []) parents.set(id, node.id);
function frame(id) {
  const call = nodes.get(id).callFrame;
  const map = matches.get(basename(call.url));
  const position = map ? originalPositionFor(map, { line: call.lineNumber + 1, column: call.columnNumber }) : {};
  return { generatedName: call.functionName, ...position };
}
function category(id) {
  const original = frame(id);
  if (/^\((idle|program|garbage collector)\)$/.test(original.generatedName)) return original.generatedName;
  let position = original;
  while (!position.source && parents.has(id)) { id = parents.get(id); position = frame(id); }
  const source = position.source ?? '';
  if (/selectors\/(query-refresh|entity-refresh|query-batch)/.test(source)) return 'query patch/refresh';
  if (/selectors\/(path-cache|selection-engine|view-state)/.test(source)) return 'selector publication/notification';
  if (/primitives\/signals|signals\./.test(source)) return 'Angular signals';
  if (/@angular\/core/.test(source)) return 'Angular scheduling/render';
  if (/lib\/(reducer|schema|driver)|write-queue/.test(source)) return 'write preparation/queue';
  if (/ngrx-sqlite-store/.test(source)) return 'other store commit/notification';
  if (/@ngrx\/(effects|store)|rxjs/.test(source)) return 'NgRx/effects/RxJS';
  if (/capacitor|androidBridge/.test(source + original.generatedName)) return 'native bridge JS';
  return source ? 'application/other mapped JS' : 'unattributed runtime/native';
}
let clock = profile.startTime;
const samples = profile.samples.map((id, index) => {
  const start = clock;
  clock += profile.timeDeltas[index];
  return { start: (start - trace.cpuNavigationStartUs) / 1000, end: (clock - trace.cpuNavigationStartUs) / 1000, id };
});
if (!Number.isFinite(trace.cpuNavigationStartUs)) throw new Error('Trace lacks the monotonic NavigationStart CPU clock anchor');
function span(start, end) {
  const cpu = {};
  for (const sample of samples) {
    const overlap = Math.max(0, Math.min(sample.end, end) - Math.max(sample.start, start));
    if (overlap) { const group = category(sample.id); cpu[group] = (cpu[group] ?? 0) + overlap; }
  }
  return { ms: end - start, sampledMs: cpu };
}
const iterations = trace.iterations.map((row) => ({
  iteration: row.iteration,
  preparation: span(row.dispatchAt, row.nativeCalls[0].start),
  commit: span(row.nativeCalls[0].start, row.nativeCalls[0].end),
  postCommitToDom: span(row.nativeCalls[0].end, row.domAt),
  effectNativeStartsBeforeDom: row.nativeCalls[1].start < row.domAt,
  effectNativeOverlapMs: Math.max(0, row.domAt - row.nativeCalls[1].start),
}));
writeFileSync(option('output', file.replace('.json', '-spans.json')), JSON.stringify({
  trace: file, matchedScripts: [...matches.keys()],
  caveat: '1 ms sampled CPU, mapped only after script equality validation. Categories allocate observed sample intervals, not exact function durations. Write preparation in the post-commit span belongs to the synchronous effect follow-up; other store cleanup is kept separate. Angular scheduling/render includes signal code outside primitives/signals. Program/idle/unattributed intervals cannot be assigned to an exact scheduler or treated as a platform floor. Bridge commit spans include waiting, not just native CPU.',
  iterations,
}, null, 2));
console.log(JSON.stringify(iterations));
