import assert from 'node:assert/strict';
import test from 'node:test';
import { execAdb } from './android-adb.mjs';

test('retries transient ADB transport loss without restarting or killing the shared daemon', () => {
  let calls = 0;
  const pauses = [];
  const execute = (file, args) => {
    assert.equal(file, 'adb.exe');
    assert.deepEqual(args, ['-s', 'emulator-5554', 'shell', 'am', 'force-stop', 'pkg']);
    if (++calls < 3) throw Object.assign(new Error('daemon connection'), { stderr: 'could not read ok from ADB Server' });
    return 'OK';
  };
  assert.equal(execAdb('adb.exe', ['-s', 'emulator-5554', 'shell', 'am', 'force-stop', 'pkg'], {}, execute, (ms) => pauses.push(ms)), 'OK');
  assert.deepEqual(pauses, [250, 500]);
  assert.equal(calls, 3);
});

test('fails after three transient attempts and never retries a package or permission failure', () => {
  let calls = 0;
  assert.throws(() => execAdb('adb.exe', [], {}, () => { calls++; throw new Error('device offline'); }, () => {}), /offline/);
  assert.equal(calls, 3);
  for (const message of ['INSTALL_FAILED_UPDATE_INCOMPATIBLE', 'Permission denied']) {
    calls = 0;
    assert.throws(() => execAdb('adb.exe', [], {}, () => { calls++; throw new Error(message); }, () => {}), new RegExp(message));
    assert.equal(calls, 1);
  }
});
