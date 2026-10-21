import { getEntityOrder } from '../schema/entity-order';
import { getNodeMeta } from '../schema/meta';

// Called once when an entry becomes inactive; Entry caches the total. Avoid
// a per-entity WeakMap whose backing table would survive collection eviction.
export function retainedSize(value: unknown, seen = new WeakSet<object>()): number {
  if (typeof value === 'string') return 16 + value.length * 2;
  if (!value || typeof value !== 'object') return 8;
  if (seen.has(value)) return 0;
  seen.add(value);
  let bytes = 48;
  for (const [key, child] of Object.entries(value))
    bytes += 16 + key.length * 2 + retainedSize(child, seen);
  if (value instanceof Map)
    for (const [key, child] of value)
      bytes += 32 + retainedSize(key, seen) + retainedSize(child, seen);
  if (value instanceof Set) for (const child of value) bytes += 24 + retainedSize(child, seen);
  if (ArrayBuffer.isView(value)) bytes += value.byteLength;
  else if (value instanceof ArrayBuffer) bytes += value.byteLength;
  const meta = getNodeMeta(value);
  if (meta) {
    bytes += 64 + meta.path.length * 2;
    bytes += (meta.childPos?.size ?? 0) * 64;
    bytes += (meta.elementIds?.length ?? 0) * 40;
    bytes += (meta.entityPos?.size ?? 0) * 64;
  }
  const order = getEntityOrder(value);
  if (order) bytes += order.keys.size * 64;
  return bytes;
}
