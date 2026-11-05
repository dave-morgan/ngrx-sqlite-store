import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
function configuredDevice() {
  try { return JSON.parse(readFileSync(join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), '.tmp/benchmark-device.json'), 'utf8').replace(/^\uFEFF/, '')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
/** Prevent an explicit legacy serial or environment override from targeting other work. */
export function benchmarkSerial(explicit, config = configuredDevice(), env = process.env) {
  const serial = explicit ?? env.BENCH_SERIAL ?? config?.serial ?? 'emulator-5554';
  if (config?.userAuthorizedIsolation && serial !== config.serial)
    throw new Error(`Target ${serial} is not the isolated benchmark device ${config.serial}`);
  return serial;
}

/** Keep isolated CDP forwarding away from the shared device's legacy ports. */
export function benchmarkPort(defaultPort, explicit, config = configuredDevice()) {
  const isolated = !!config?.userAuthorizedIsolation;
  const port = explicit === undefined ? defaultPort + (isolated ? 10000 : 0) : Number(explicit);
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || (isolated && port < 19000))
    throw new Error('Invalid isolated benchmark CDP port');
  return port;
}
