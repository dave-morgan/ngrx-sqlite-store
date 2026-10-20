/** Binary UTF-8 string keys and sortable IEEE-754 numeric keys. */
export function encodeSortKey(value: string | number): string {
  if (typeof value === 'string') {
    return (
      's' +
      Array.from(new TextEncoder().encode(value), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('')
    );
  }
  if (typeof value !== 'number' || Number.isNaN(value))
    throw new TypeError('Invalid entity sortKey');
  const bytes = new DataView(new ArrayBuffer(8));
  bytes.setFloat64(0, value === 0 ? 0 : value);
  const bits = bytes.getBigUint64(0);
  const ordered = bits & (1n << 63n) ? ~bits & ((1n << 64n) - 1n) : bits ^ (1n << 63n);
  return 'n' + ordered.toString(16).padStart(16, '0');
}

export function decodeSortKey(key: string): string | number {
  if (key[0] === 's') {
    return new TextDecoder().decode(
      Uint8Array.from(key.slice(1).match(/../g) ?? [], (byte) => parseInt(byte, 16)),
    );
  }
  const ordered = BigInt('0x' + key.slice(1));
  const bits = ordered & (1n << 63n) ? ordered ^ (1n << 63n) : ~ordered & ((1n << 64n) - 1n);
  const bytes = new DataView(new ArrayBuffer(8));
  bytes.setBigUint64(0, bits);
  return bytes.getFloat64(0);
}
