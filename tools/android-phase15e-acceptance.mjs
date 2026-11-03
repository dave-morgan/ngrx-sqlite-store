import { benchmarkSerial } from './android-benchmark-target.mjs';
if (benchmarkSerial() !== 'emulator-5554') throw Error('Legacy all-emulator runner is disabled for isolated benchmarks');
// Clean Phase 15e pipeline, adapted from /tmp/run15d-clean.sh.
// Prerequisites: both final APKs already built; writable Pixel_9_Pro AVD mirror.
// Never run alongside a build, test, profiler, other benchmark or emulator.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { join } from 'node:path';
import { execAdb } from './android-adb.mjs';
const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
const adbFile = process.env.BENCH_ADB ?? join(sdk, 'platform-tools/adb.exe');
const adb = (...args) => execAdb(adbFile, args, { encoding: 'utf8', timeout: 60000 });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const session = `15e-final-${date}-${Date.now()}`;
const stem = `docs/benchmarks/android-`;
const files = {
  floors: `${stem}floors-15e-${date}.json`, platform: `${stem}empty-15e-${date}.json`,
  code: `${stem}empty-store-15e-${date}.json`, report: `${stem}parity-15e-${date}.md`,
  log: `.tmp/phase15e/acceptance-${session}.log`,
};
const avdRoot = join(process.cwd(), '.tmp/phase15e/avd');
if (!existsSync(join(avdRoot, 'Pixel_9_Pro.ini'))) throw new Error('Missing writable Pixel_9_Pro mirror; see Phase 15e evidence');
const record = { session, files, startedAt: new Date().toISOString(), stages: [],
  adbFile, adbVersion: adb('version').trim(),
  apkHashes: Object.fromEntries(['classic', 'sqlite'].map((impl) => [impl,
    createHash('sha256').update(readFileSync(`.tmp/benchmark-apks/${impl}.apk`)).digest('hex')])),
};
const recordFile = `${stem}session-15e-${date}.json`;
const save = () => writeFileSync(recordFile, JSON.stringify(record, null, 2));
const log = (...args) => console.log(new Date().toISOString(), ...args);
async function consoleKill(serial) {
  const token = readFileSync(join(process.env.USERPROFILE, '.emulator_console_auth_token'), 'utf8').trim();
  await new Promise((resolve, reject) => {
    const socket = connect(Number(serial.split('-')[1]), '127.0.0.1');
    let stage = 0, buffer = '';
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('Emulator console kill timed out')); }, 10000);
    socket.on('error', (error) => { clearTimeout(timer); reject(error); });
    socket.on('data', (data) => {
      buffer += data.toString();
      if (stage === 0 && buffer.includes('OK')) { stage = 1; buffer = ''; socket.write(`auth ${token}\n`); }
      else if (stage === 1 && buffer.includes('OK')) { stage = 2; buffer = ''; socket.write('kill\n'); }
      else if (stage === 2 && buffer.includes('killing emulator')) { clearTimeout(timer); socket.end(); resolve(); }
    });
  });
}
async function kill(serial) {
  if (!adb('devices').includes(serial)) return;
  try { log(serial, 'adb emu kill:', adb('-s', serial, 'emu', 'kill').trim()); }
  catch { log(serial, 'adb emu kill failed; checking console'); }
  await delay(1500);
  if (adb('devices').includes(serial)) {
    log(serial, 'authenticated console kill fallback');
    await consoleKill(serial);
  }
  for (let i = 0; i < 60 && adb('devices').includes(serial); i++) await delay(1000);
  if (adb('devices').includes(serial)) throw new Error(`Emulator did not stop: ${serial}`);
}
async function run(args) {
  const stage = { args, startedAt: new Date().toISOString() };
  record.stages.push(stage); save(); log('START', args.join(' '));
  const fd = openSync(files.log, 'a');
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { windowsHide: true, stdio: ['ignore', fd, fd] });
    child.on('error', reject); child.on('exit', resolve);
  });
  stage.finishedAt = new Date().toISOString(); stage.exitCode = code; save();
  if (code !== 0) throw new Error(`Acceptance stage failed (${code}): ${args[0]}`);
  log('DONE', args[0]);
}
try {
  try { record.previousBootId = adb('-s', 'emulator-5554', 'shell', 'cat', '/proc/sys/kernel/random/boot_id').trim(); } catch { /* initially stopped */ }
  await kill('emulator-5556');
  await kill('emulator-5554');
  await delay(10000);
  const fd = openSync('.tmp/phase15e/emulator-final.log', 'a');
  const emulator = spawn(join(sdk, 'emulator/emulator.exe'), [
    '-avd', 'Pixel_9_Pro', '-port', '5554', '-no-window', '-no-audio', '-no-boot-anim', '-no-snapshot',
  ], { windowsHide: true, detached: true, stdio: ['ignore', fd, fd], env: { ...process.env,
    ANDROID_AVD_HOME: avdRoot, ANDROID_EMULATOR_HOME: join(process.cwd(), '.tmp/phase15e/emulator-home'),
  } });
  emulator.unref(); record.emulatorPid = emulator.pid; record.avdRoot = avdRoot; save();
  let booted = false;
  for (let i = 0; i < 120 && !booted; i++) {
    await delay(2500);
    try { booted = adb('-s', 'emulator-5554', 'shell', 'getprop', 'sys.boot_completed').trim() === '1'; } catch { /* cold boot */ }
  }
  if (!booted) throw new Error('Cold boot did not finish');
  record.bootId = adb('-s', 'emulator-5554', 'shell', 'cat', '/proc/sys/kernel/random/boot_id').trim();
  if (record.bootId === record.previousBootId) throw new Error('Emulator did not reboot');
  record.bootCompletedAt = new Date().toISOString(); save(); log('BOOTED; settling 60 seconds');
  await delay(60000);
  record.settledAt = new Date().toISOString();
  record.devices = adb('devices');
  if (record.devices.includes('emulator-5556')) throw new Error('Second emulator present');
  record.meminfo = adb('-s', 'emulator-5554', 'shell', 'cat', '/proc/meminfo').split('\n').slice(0,4);
  record.hardware = readFileSync(join(avdRoot, 'Pixel_9_Pro.avd/hardware-qemu.ini'), 'utf8').split(/\r?\n/).filter((s) => /^(hw.cpu.ncore|hw.ramSize|hw.gpu.|hw.lcd.)/.test(s));
  save();
  for (const impl of ['classic', 'sqlite']) adb('-s', 'emulator-5554', 'uninstall', `dev.ngrxsqlite.harness.${impl}`);
  await run(['tools/android-bench.mjs', '--build-only', 'true', '--skip-build', 'true', '--session', session]);
  await run(['tools/android-floor-controls.mjs', '--session', session, '--output', files.floors]);
  await run(['tools/android-parity-profile.mjs', '--empty', '--session', session, '--output', files.platform]);
  await run(['tools/android-parity-profile.mjs', '--empty-store', '--session', session, '--output', files.code]);
  await run(['tools/android-bench.mjs', '--trials', '5', '--skip-build', 'true', '--session', session,
    '--floors-json', files.floors, '--platform-json', files.platform, '--code-json', files.code,
    '--evidence-md', 'docs/benchmarks/android-parity-15e-evidence-2026-10-23.md',
    '--gap-adr', '../decisions/0065-phase15e-measured-outcomes.md', '--output', files.report]);
  record.finishedAt = new Date().toISOString(); record.counts = JSON.parse(readFileSync(files.report.replace('.md', '.json'))).counts; save();
  log('ACCEPTANCE COMPLETE', JSON.stringify(record.counts));
} catch (error) { record.error = error.message; save(); throw error; }
