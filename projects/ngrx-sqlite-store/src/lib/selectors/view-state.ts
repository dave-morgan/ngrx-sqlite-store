import { getNodeMeta, setNodeMeta } from '../schema/meta';
import { NSS_ENTITY_BRAND } from '../schema/entity-brand';
import { unescapeSegment } from '../storage/path';

function freezeTree(value: unknown, seen = new WeakSet<object>()): unknown {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freezeTree(child, seen);
  return Object.freeze(value);
}

export function child(value: unknown, segment: string): unknown {
  if (value === null || typeof value !== 'object') return undefined;
  if (Array.isArray(value) && segment.startsWith('#')) {
    const index = getNodeMeta(value)?.elementIds?.indexOf(segment) ?? -1;
    return value[index];
  }
  const key = unescapeSegment(segment);
  return Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined;
}
export function at(value: unknown, segments: string[]): unknown {
  for (const segment of segments) value = child(value, segment);
  return value;
}

/** Reconcile read results without losing schema metadata or the entity brand. */
export function share(
  previous: unknown,
  next: unknown,
  replaced?: ReadonlySet<string>,
  path = '',
): unknown {
  if (
    previous === next ||
    !previous ||
    !next ||
    typeof previous !== 'object' ||
    typeof next !== 'object' ||
    Array.isArray(previous) !== Array.isArray(next)
  )
    return freezeTree(next);
  // Loaded containers have already been reconciled; view construction must keep
  // deliberate new identities even when their JSON happens to be equal.
  if (replaced === undefined && getNodeMeta(next)) return next;
  const before = previous as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  const keys = Object.keys(after);
  const result: Record<string, unknown> = Array.isArray(next)
    ? ([] as unknown as Record<string, unknown>)
    : {};
  let same = !replaced?.has(path) && Object.keys(before).length === keys.length;
  const oldIds = getNodeMeta(previous)?.elementIds;
  const nextIds = getNodeMeta(next)?.elementIds;
  const oldItems =
    Array.isArray(previous) && oldIds
      ? new Map(oldIds.map((id, index) => [id, previous[index]]))
      : undefined;
  for (const key of keys) {
    const id = Array.isArray(next) ? nextIds?.[Number(key)] : undefined;
    const prior =
      oldItems && id ? oldItems.get(id) : Object.hasOwn(before, key) ? before[key] : undefined;
    const childPath =
      getNodeMeta(after[key])?.path ?? `${path}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`;
    const value = share(prior, after[key], replaced, childPath);
    Object.defineProperty(result, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    same &&= Object.hasOwn(before, key) && value === before[key];
  }
  const selected = same ? previous : result;
  const meta = getNodeMeta(next);
  if (meta) setNodeMeta(selected, meta);
  if (!same && NSS_ENTITY_BRAND in next)
    Object.defineProperty(result, NSS_ENTITY_BRAND, { value: true });
  return Object.freeze(selected);
}

/** Copy just the spine of a loaded object, preserving unchanged siblings. */
export function put(value: unknown, segments: string[], next: unknown, remove = false): unknown {
  if (segments.length === 0) return next;
  const [segment, ...rest] = segments;
  const key =
    Array.isArray(value) && segment.startsWith('#')
      ? String(getNodeMeta(value)?.elementIds?.indexOf(segment) ?? -1)
      : unescapeSegment(segment);
  const previous = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const result = (Array.isArray(previous) ? [...previous] : { ...previous }) as Record<
    string,
    unknown
  >;
  if (remove && rest.length === 0) delete result[key];
  else
    Object.defineProperty(result, key, {
      value: put(child(previous, segment), rest, next, remove),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  const meta = getNodeMeta(previous);
  if (meta) setNodeMeta(result, meta);
  if (NSS_ENTITY_BRAND in previous)
    Object.defineProperty(result, NSS_ENTITY_BRAND, { value: true });
  return Object.freeze(result);
}
