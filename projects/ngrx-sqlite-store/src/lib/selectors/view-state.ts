import { getNodeMeta, setNodeMeta } from '../schema/meta';
import { NSS_ENTITY_BRAND } from '../schema/entity-brand';
import { getEntityOrder, setEntityOrder } from '../schema/entity-order';
import { unescapeSegment } from '../storage/path';

function freezeTree(value: unknown, seen = new WeakSet<object>()): unknown {
  if (!value || typeof value !== 'object' || Object.isFrozen(value) || seen.has(value))
    return value;
  seen.add(value);
  for (const child of Object.values(value)) freezeTree(child, seen);
  return Object.freeze(value);
}

/** Own data property; plain assignment is far cheaper than defineProperty on hot paths. */
function assign(target: Record<string, unknown>, key: string, value: unknown): void {
  if (key === '__proto__') Object.defineProperty(target, key, { value, enumerable: true, configurable: true, writable: true });
  else target[key] = value;
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
  if (previous === next) return next;
  if (
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
    assign(result, key, value);
    same &&= Object.hasOwn(before, key) && value === before[key];
  }
  const selected = same ? previous : result;
  const meta = getNodeMeta(next);
  if (meta) setNodeMeta(selected, meta);
  const order = getEntityOrder(next);
  if (order) setEntityOrder(selected, order);
  if (!same && NSS_ENTITY_BRAND in next)
    Object.defineProperty(result, NSS_ENTITY_BRAND, { value: true });
  return Object.freeze(selected);
}

export interface PutUpdate {
  segments: string[];
  next: unknown;
  remove?: boolean;
}

/**
 * Apply disjoint updates (no path is an ancestor of another) in one pass: each touched
 * container is copied once, not once per update (O(changed + touched size), not
 * O(changed x size)). Equivalent to applying `put` for each update in turn.
 */
export function putMany(value: unknown, updates: readonly PutUpdate[]): unknown {
  if (updates.length === 0) return value;
  if (updates.length === 1) return put(value, updates[0].segments, updates[0].next, updates[0].remove);
  const groups = new Map<string, PutUpdate[]>();
  for (const update of updates) {
    // A root replacement cannot be disjoint from any other update.
    if (update.segments.length === 0) return update.next;
    const [segment, ...rest] = update.segments;
    let group = groups.get(segment);
    if (!group) groups.set(segment, (group = []));
    group.push({ segments: rest, next: update.next, remove: update.remove });
  }
  const previous = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const changes: [string, unknown, boolean][] = [];
  for (const [segment, group] of groups) {
    const key =
      Array.isArray(previous) && segment.startsWith('#')
        ? String(getNodeMeta(previous)?.elementIds?.indexOf(segment) ?? -1)
        : unescapeSegment(segment);
    if (group.length === 1 && group[0].remove && group[0].segments.length === 0) {
      if (Object.hasOwn(previous, key)) changes.push([key, undefined, true]);
    } else {
      const nextChild = putMany(child(previous, segment), group);
      if (!Object.hasOwn(previous, key) || previous[key] !== nextChild) changes.push([key, nextChild, false]);
    }
  }
  // Nothing changed: keep the original container by reference.
  if (!changes.length && value === previous) return value;
  const result = (Array.isArray(previous) ? [...previous] : { ...previous }) as Record<string, unknown>;
  for (const [key, nextChild, remove] of changes) {
    if (remove) delete result[key];
    else assign(result, key, nextChild);
  }
  const meta = getNodeMeta(previous);
  if (meta) setNodeMeta(result, meta);
  const order = getEntityOrder(previous);
  if (order) setEntityOrder(result, order);
  if (NSS_ENTITY_BRAND in previous)
    Object.defineProperty(result, NSS_ENTITY_BRAND, { value: true });
  return Object.freeze(result);
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
  const nextChild = remove && rest.length === 0 ? undefined : put(child(previous, segment), rest, next, remove);
  // Nothing changed: keep the original container (and every ancestor) by reference.
  if (value === previous && (remove && rest.length === 0 ? !Object.hasOwn(previous, key) : Object.hasOwn(previous, key) && previous[key] === nextChild))
    return value;
  const result = (Array.isArray(previous) ? [...previous] : { ...previous }) as Record<
    string,
    unknown
  >;
  if (remove && rest.length === 0) delete result[key];
  else assign(result, key, nextChild);
  const meta = getNodeMeta(previous);
  if (meta) setNodeMeta(result, meta);
  const order = getEntityOrder(previous);
  if (order) setEntityOrder(result, order);
  if (NSS_ENTITY_BRAND in previous)
    Object.defineProperty(result, NSS_ENTITY_BRAND, { value: true });
  return Object.freeze(result);
}
