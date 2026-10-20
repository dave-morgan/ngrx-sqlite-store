import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const started = performance.now();
await mkdir('tmp/spikes', { recursive: true });
await build({
  entryPoints: ['projects/ngrx-sqlite-store/spikes/main.ts'],
  outfile: 'tmp/spikes/main.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  alias: { 'ngrx-sqlite-store': resolve('projects/ngrx-sqlite-store/src/public-api.ts') },
});
await import(pathToFileURL(resolve('tmp/spikes/main.mjs')).href);
const seconds = (performance.now() - started) / 1000;
console.log(`Spikes completed in ${seconds.toFixed(2)} seconds (including bundle).`);
if (seconds >= 600) throw new Error('Spike runner exceeded the ten-minute budget');
