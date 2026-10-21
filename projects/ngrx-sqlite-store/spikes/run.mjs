import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

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
await new Promise((resolveRun, reject) => {
  const child = spawn(
    process.execPath,
    [
      '--expose-gc',
      ...(process.argv.includes('--profile') ? ['--cpu-prof', '--cpu-prof-dir=tmp/spikes'] : []),
      'tmp/spikes/main.mjs',
      ...process.argv.slice(2),
    ],
    { stdio: 'inherit' },
  );
  child.on('error', reject);
  child.on('exit', (code) =>
    code === 0 ? resolveRun() : reject(new Error(`Spikes exited ${code}`)),
  );
});
const seconds = (performance.now() - started) / 1000;
console.log(`Spikes completed in ${seconds.toFixed(2)} seconds (including bundle).`);
if (seconds >= 600) throw new Error('Spike runner exceeded the ten-minute budget');
