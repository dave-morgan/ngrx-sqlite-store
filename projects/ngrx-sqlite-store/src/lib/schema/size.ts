import { escapeSegment } from '../storage/path';
import { NonSerializableStateError } from './errors';

/** JSON string bytes without allocating the encoded string. */
export function serializedStringSize(value: string): number {
  // Printable ASCII (the common case) only escapes quote and backslash: one tight pass,
  // falling back to the full UTF-8/escape accounting below on the first other character.
  let extra = 0;
  let ascii = true;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c === 34 || c === 92) extra++;
    else if (c < 32 || c > 127) {
      ascii = false;
      break;
    }
  }
  if (ascii) return value.length + 2 + extra;
  let bytes = 2;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c === 34 || c === 92 || c === 8 || c === 9 || c === 10 || c === 12 || c === 13) bytes += 2;
    else if (c < 32) bytes += 6;
    else if (c < 0x80) bytes++;
    else if (c < 0x800) bytes += 2;
    else if (
      c >= 0xd800 &&
      c <= 0xdbff &&
      i + 1 < value.length &&
      value.charCodeAt(i + 1) >= 0xdc00 &&
      value.charCodeAt(i + 1) <= 0xdfff
    ) {
      bytes += 4;
      i++;
    } else bytes += c >= 0xd800 && c <= 0xdfff ? 6 : 3;
  }
  return bytes;
}

// V8 keeps a WeakMap's large backing table after its keys die. Bound the
// memo table as well as its live keys; retain the most recently sized roots.
const SIZE_CACHE_LIMIT = 1024;
let sizes = new WeakMap<object, number>();
let cachedSizes = 0;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Entity collections repeat the same property names: size each key once.
const KEY_CACHE_LIMIT = 4096;
const keySizes = new Map<string, number>();
function keySize(key: string): number {
  let size = keySizes.get(key);
  if (size === undefined) {
    size = serializedStringSize(key);
    if (keySizes.size >= KEY_CACHE_LIMIT) keySizes.clear();
    keySizes.set(key, size);
  }
  return size;
}

/** Carries a failure location outward; path segments are only built on failure. */
class SizePathError {
  readonly segments: string[] = [];
}

/** Immutable JSON state only. Each object's validated size is memoized once. */
export function serializedSize(value: unknown, path: string | (() => string) = ''): number {
  try {
    return measure(value, new WeakSet<object>());
  } catch (error) {
    if (!(error instanceof SizePathError)) throw error;
    const suffix = error.segments.reverse().map((segment) => `/${segment}`).join('');
    throw new NonSerializableStateError((typeof path === 'function' ? path() : path) + suffix);
  }
}

function measure(value: unknown, visiting: WeakSet<object>): number {
  if (value === null) return 4;
  if (typeof value === 'string') return serializedStringSize(value);
  if (typeof value === 'boolean') return value ? 4 : 5;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).length;
  if (typeof value !== 'object' || (!Array.isArray(value) && !isPlainObject(value))) {
    throw new SizePathError();
  }
  if (Array.isArray(value) && Object.getPrototypeOf(value) !== Array.prototype) {
    throw new SizePathError();
  }
  const jsonHook = Object.getOwnPropertyDescriptor(value, 'toJSON');
  if (jsonHook && (!('value' in jsonHook) || typeof jsonHook.value === 'function')) {
    throw new SizePathError();
  }
  if (visiting.has(value)) throw new SizePathError();
  const cached = sizes.get(value);
  if (cached !== undefined) return cached;
  visiting.add(value);
  let bytes = 2;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      try {
        bytes += (i ? 1 : 0) + measure(value[i], visiting);
      } catch (error) {
        if (error instanceof SizePathError) error.segments.push(String(i));
        throw error;
      }
    }
  } else {
    let count = 0;
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      try {
        if (!('value' in descriptor)) throw new SizePathError();
        bytes += (count++ ? 1 : 0) + keySize(key) + 1 + measure(descriptor.value, visiting);
      } catch (error) {
        if (error instanceof SizePathError) error.segments.push(escapeSegment(key));
        throw error;
      }
    }
  }
  visiting.delete(value);
  if (cachedSizes >= SIZE_CACHE_LIMIT) {
    sizes = new WeakMap();
    cachedSizes = 0;
  }
  sizes.set(value, bytes);
  cachedSizes++;
  return bytes;
}
