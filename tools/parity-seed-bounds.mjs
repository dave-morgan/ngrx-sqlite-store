#!/usr/bin/env node
// Conservative necessary bytes: stored Todo JSON only, excluding all envelopes,
// duplicate IDs/positions, SQL, users, folders, metadata and return values.
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

await mkdir('.tmp', { recursive: true });
const outfile = resolve('.tmp/parity-seed.mjs');
await build({ entryPoints: ['projects/harness/src/app/state/seed.ts'], bundle: true, platform: 'node', format: 'esm', outfile });
const { generateSeed } = await import(pathToFileURL(outfile));
const bounds = [1000, 10000, 50000].flatMap((size) => [{
  size, metric: 'firstReadyMs', callsMin: 2,
  bytesMin: generateSeed(size, 42).todos.reduce((sum, todo) => sum + Buffer.byteLength(JSON.stringify(todo)), 0),
  callCost: 'intercept',
  justification: 'Persisted seed-version read causally precedes seed generation and at least one atomic durable write call (two minimum calls). Minimum bytes are exact UTF-8 lengths of deterministic stored Todo JSON values only; all SQL, transport escaping, duplicate IDs, positions, users, folders and metadata are excluded. Uses same-session executeSet regression intercept and effective bandwidth (including native insert work).',
}, {
  size, metric: 'relaunchReadyMs', callsMin: 2, bytesMin: 0,
  justification: 'Fresh native process must open SQLite before reading persisted state: at least one open and one causally subsequent read. No observed redundant probes, schema checks, effect commits or unisolated native-open cost are charged as a hard bound.',
}]);
await writeFile('docs/benchmarks/android-parity-final-bounds-2026-10-22.json', JSON.stringify(bounds, null, 2) + '\n');
console.log(bounds);
