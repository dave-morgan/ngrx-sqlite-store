import { NodeKind } from '../schema/kinds';
import { getNodeMeta, setNodeMeta } from '../schema/meta';
import { escapeSegment, unescapeSegment } from '../storage/path';
import { share } from './view-state';

/** Reconcile a complete known write; ordinary read/view sharing stays in share. */
export function shareKnown(
  previous: unknown,
  next: unknown,
  replaced: ReadonlySet<string>,
  path: string,
): unknown {
  if (previous === next) return next;
  const meta = getNodeMeta(next);
  const positions = meta?.kind === NodeKind.Obj && meta.path === path
    ? meta.childPos : undefined;
  if (!positions) return share(previous, next, replaced, path);

  const compatible = !!previous && typeof previous === 'object' && !Array.isArray(previous);
  const before = (compatible ? previous : {}) as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  const keys = Array.from(positions.keys(), unescapeSegment);
  const beforeKeys = Object.keys(before);
  const priorMeta = getNodeMeta(previous);
  let same = compatible && !replaced.has(path) && beforeKeys.length === keys.length &&
    priorMeta?.kind === NodeKind.Obj && priorMeta.path === path &&
    priorMeta.childPos?.size === positions.size;
  if (same)
    for (const [segment, position] of positions)
      if (priorMeta?.childPos?.get(segment) !== position) {
        same = false;
        break;
      }

  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const value = shareKnown(
      Object.hasOwn(before, key) ? before[key] : undefined,
      after[key],
      replaced,
      `${path}/${escapeSegment(key)}`,
    );
    if (key === '__proto__')
      Object.defineProperty(result, key, { value, enumerable: true, configurable: true, writable: true });
    else result[key] = value;
    same &&= Object.hasOwn(before, key) && value === before[key];
  }
  // Normal construction canonicalizes integer keys before comparing enumeration.
  if (same) {
    const resultKeys = Object.keys(result);
    same = beforeKeys.every((key, index) => key === resultKeys[index]);
  }
  // A changed position map must never be attached to a previously shared object.
  const selected = same ? before : result;
  setNodeMeta(selected, meta!);
  return Object.freeze(selected);
}
