import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, mkdirSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export function validateDeviceConfig(config) {
  if (!/^Ngrx_SQLite_Benchmark_[A-Za-z0-9_]+$/.test(config.avd ?? '')) throw Error('A dedicated benchmark AVD is required');
  if (!Number.isInteger(config.port) || config.port <= 5554 || config.port > 5682 || config.port % 2 || config.serial !== `emulator-${config.port}`)
    throw Error('Benchmark serial and port must match a dedicated even port above5554');
  if (typeof config.dataDir !== 'string' || !(isAbsolute(config.dataDir) || win32.isAbsolute(config.dataDir))) throw Error('Absolute benchmark data directory required');
  return config;
}
export function benchmarkProcesses(processes, config) {
  validateDeviceConfig(config);
  const avd = new RegExp(`(?:^|\\s)-avd\\s+(?:"${config.avd}"|${config.avd})(?=\\s|$)`);
  const port = new RegExp(`(?:^|\\s)-port\\s+${config.port}(?=\\s|$)`);
  return processes.filter(process => /^(?:emulator|qemu-system-x86_64(?:-headless)?)\.exe$/i.test(process.name)
    && avd.test(process.commandLine ?? '') && port.test(process.commandLine ?? ''));
}
export function benchmarkStopScript(process) {
  if (!Number.isInteger(process.pid) || process.pid < 1 || typeof process.commandLine !== 'string') throw Error('Invalid benchmark process identity');
  const expected = process.commandLine.replace(/'/g, "''");
  return `$p=Get-CimInstance Win32_Process -Filter 'ProcessId=${process.pid}'; if(!$p){exit 0}; if($p.CommandLine -ne '${expected}'){throw 'Benchmark process identity changed'}; Stop-Process -Id ${process.pid} -Force`;
}
export async function rebootDevice(config, io) {
  validateDeviceConfig(config);
  const devices = await io.adb('devices');
  if (devices.split(/\r?\n/).some(line => line.split(/\s+/)[0] === config.serial)) {
    const identity = (await io.adb('-s', config.serial, 'emu', 'avd', 'name')).trim().split(/\r?\n/)[0].trim();
    if (identity !== config.avd) throw Error(`Benchmark device identity mismatch: ${identity}`);
    await io.adb('-s', config.serial, 'emu', 'kill');
    await io.pause(1000);
  }
  for (const process of benchmarkProcesses(await io.processes(), config)) await io.stop(process);
  for (let attempt = 0; ; attempt++) {
    if (!benchmarkProcesses(await io.processes(), config).length) break;
    if (attempt === 30) throw Error('Benchmark emulator processes did not exit');
    await io.pause(500);
  }
  await io.launch(config);
  let booted = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    await io.pause(5000);
    try { booted = (await io.adb('-s', config.serial, 'shell', 'getprop', 'sys.boot_completed')).trim() === '1'; } catch {}
    if (booted) break;
    if (attempt % 6 === 0) io.log('Waiting for benchmark boot');
  }
  if (!booted) throw Error('Benchmark emulator boot deadline exceeded');
  const identity = (await io.adb('-s', config.serial, 'emu', 'avd', 'name')).trim().split(/\r?\n/)[0].trim();
  if (identity !== config.avd) throw Error('Booted benchmark identity mismatch');
  io.log('Benchmark booted; settling60s');
  await io.pause(60000);
  return (await io.adb('-s', config.serial, 'shell', 'cat', '/proc/sys/kernel/random/boot_id')).trim();
}

async function main() {
  const config = validateDeviceConfig(JSON.parse(readFileSync(join(root, '.tmp/benchmark-device.json'), 'utf8')));
  const adbFile = join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe');
  const powershell = script => execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-OutputFormat', 'Text', '-EncodedCommand', Buffer.from("$ProgressPreference='SilentlyContinue';" + script, 'utf16le').toString('base64')], { encoding: 'utf8', timeout: 30000, windowsHide: true });
  const boot = await rebootDevice(config, {
    adb: async (...args) => execFileSync(adbFile, args, { encoding: 'utf8', timeout: 15000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }),
    processes: async () => {
      const output = powershell('[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); @(Get-CimInstance Win32_Process | Where-Object {$_.Name -match "^(emulator|qemu-system-x86_64(-headless)?)\\.exe$"} | Select-Object ProcessId,Name,CommandLine) | ConvertTo-Json -Compress');
      const parsed = JSON.parse(output || '[]');
      return (Array.isArray(parsed) ? parsed : parsed ? [parsed] : []).map(process => ({ pid: process.ProcessId, name: process.Name, commandLine: process.CommandLine }));
    },
    stop: async process => {
      powershell(benchmarkStopScript(process));
    },
    launch: async selected => {
      const folder = join(selected.dataDir, 'boot-logs'); mkdirSync(folder, { recursive: true });
      const prefix = join(folder, `boot-${Date.now()}`);
      const stdout = openSync(prefix + '.stdout.log', 'wx'), stderr = openSync(prefix + '.stderr.log', 'wx');
      const args = ['-avd', selected.avd, '-port', String(selected.port), '-no-window', '-no-audio', '-no-boot-anim', '-no-snapshot',
        '-datadir', selected.dataDir, '-data', join(selected.dataDir, 'userdata-qemu.img'), '-cache', join(selected.dataDir, 'cache.img'), '-encryption-key', join(selected.dataDir, 'encryptionkey.img')];
      try {
        const child = spawn(join(process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT, 'emulator', 'emulator.exe'), args, { detached: true, windowsHide: true, stdio: ['ignore', stdout, stderr] });
        await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
        writeFileSync(prefix + '.json', JSON.stringify({ pid: child.pid, args }, null, 2)); child.unref();
      } finally { closeSync(stdout); closeSync(stderr); }
    }, pause, log: console.log,
  });
  console.log(`EMULATOR_READY serial=${config.serial} avd=${config.avd} boot=${boot}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error); process.exitCode = 1; });
