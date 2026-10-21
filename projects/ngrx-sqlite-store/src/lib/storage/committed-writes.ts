import type { ChangeSet } from './change-set';
import { isAncestorOrSelf, pathsOverlap, unescapeSegment } from './path';
import type { EntityRow } from '../schema/row-writer';

export interface KnownEntityRow extends EntityRow {
  insertOnly?: boolean;
  keepOrder?: boolean;
}
interface Writes {
  values: Map<string, unknown>;
  entities: Map<string, Map<string, KnownEntityRow>>;
  removed: Map<string, Set<string>>;
}
const writes = new WeakMap<ChangeSet, Writes>();
export function committedWrites(changes: ChangeSet): Writes {
  let value = writes.get(changes);
  if (!value) {
    value = { values: new Map(), entities: new Map(), removed: new Map() };
    writes.set(changes, value);
  }
  return value;
}
export function invalidateWrites(changes: ChangeSet, path: string): void {
  const known = writes.get(changes);
  if (!known) return;
  for (const key of known.values.keys()) if (pathsOverlap(key, path)) known.values.delete(key);
  for (const coll of known.removed.keys())
    if (isAncestorOrSelf(path, coll)) known.removed.delete(coll);
  for (const [coll, rows] of known.entities) {
    if (isAncestorOrSelf(path, coll)) known.entities.delete(coll);
    else if (isAncestorOrSelf(coll, path))
      rows.delete(unescapeSegment(path.slice(coll.length + 1)));
  }
}
export function releaseWrites(changes: ChangeSet): void {
  writes.delete(changes);
}
