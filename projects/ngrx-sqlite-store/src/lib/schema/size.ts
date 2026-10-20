import { escapeSegment } from '../storage/path';
import { NonSerializableStateError } from './errors';

/** JSON string bytes without allocating the encoded string. */
export function serializedStringSize(value: string): number {
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

const sizes = new WeakMap<object, number>();

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Immutable JSON state only. Each object's validated size is memoized once. */
export function serializedSize(
  value: unknown,
  path = '',
  visiting = new WeakSet<object>(),
): number {
  if (value === null) return 4;
  if (typeof value === 'string') return serializedStringSize(value);
  if (typeof value === 'boolean') return value ? 4 : 5;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).length;
  if (typeof value !== 'object' || (!Array.isArray(value) && !isPlainObject(value))) {
    throw new NonSerializableStateError(path);
  }
  if (Array.isArray(value) && Object.getPrototypeOf(value) !== Array.prototype) {
    throw new NonSerializableStateError(path);
  }
  const jsonHook = Object.getOwnPropertyDescriptor(value, 'toJSON');
  if (jsonHook && (!('value' in jsonHook) || typeof jsonHook.value === 'function')) {
    throw new NonSerializableStateError(path);
  }
  if (visiting.has(value)) throw new NonSerializableStateError(path);
  const cached = sizes.get(value);
  if (cached !== undefined) return cached;
  visiting.add(value);
  let bytes = 2;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      bytes += (i ? 1 : 0) + serializedSize(value[i], `${path}/${i}`, visiting);
    }
  } else {
    let count = 0;
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!('value' in descriptor))
        throw new NonSerializableStateError(`${path}/${escapeSegment(key)}`);
      bytes +=
        (count++ ? 1 : 0) +
        serializedStringSize(key) +
        1 +
        serializedSize(value[key], `${path}/${escapeSegment(key)}`, visiting);
    }
  }
  visiting.delete(value);
  sizes.set(value, bytes);
  return bytes;
}
