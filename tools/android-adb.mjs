import { execFileSync } from 'node:child_process';

/** Retry only transient transport loss. Never restart the shared server or retry package errors. */
export function execAdb(file, args, options = {}, execute = execFileSync,
  pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return execute(file, args, options); }
    catch (error) {
      const message = `${error.message}\n${error.stderr ?? ''}`;
      if (attempt === 2 || !/device offline|cannot connect to daemon|could not read ok from ADB Server|daemon not running|failed to start daemon/i.test(message)) throw error;
      pause(250 * (attempt + 1));
    }
  }
}
