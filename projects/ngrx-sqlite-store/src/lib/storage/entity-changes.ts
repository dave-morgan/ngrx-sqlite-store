import type { ChangeSet } from './change-set';
import { isAncestorOrSelf, pathsOverlap } from './path';

export interface EntityChange {
  id: string;
  kind: 'insert' | 'update' | 'delete' | 'reorder';
  prev?: unknown;
  next?: unknown;
  fields: ReadonlySet<string>;
}
const journals = new WeakMap<ChangeSet, Map<string, Map<string, EntityChange>>>();
export function entityChanges(changes: ChangeSet): Map<string, Map<string, EntityChange>> {
  let journal = journals.get(changes);
  if (!journal) {
    journal = new Map();
    journals.set(changes, journal);
  }
  return journal;
}
export function recordEntityChange(changes: ChangeSet, coll: string, change: EntityChange): void {
  const journal = entityChanges(changes);
  let rows = journal.get(coll);
  if (!rows) journal.set(coll, (rows = new Map()));
  rows.set(change.id, change);
}
export function releaseEntityChanges(changes: ChangeSet): void {
  journals.delete(changes);
}

// A whole-collection replacement whose rows are all inline JSON. Aggregate
// queries recount these entities in JS instead of rescanning the table. Any
// later overlapping write in the same change set drops the record.
const replacements = new WeakMap<ChangeSet, Map<string, readonly unknown[]>>();
export function entityReplacement(changes: ChangeSet, coll: string): readonly unknown[] | undefined {
  return replacements.get(changes)?.get(coll);
}
export function recordEntityReplacement(changes: ChangeSet, coll: string, entities: readonly unknown[]): void {
  let rows = replacements.get(changes);
  if (!rows) replacements.set(changes, (rows = new Map()));
  rows.set(coll, entities);
}
/**
 * Entity rows change only through entity writes, physical writes at or above the
 * collection, or promoted entity nodes (`coll/~2…`). Other physical children are
 * collection extras (`loaded`, `filter`) and leave the replaced rows exact.
 */
export function dropEntityReplacements(changes: ChangeSet, path: string, physical: boolean): void {
  const rows = replacements.get(changes);
  if (!rows) return;
  for (const coll of rows.keys()) {
    if (!pathsOverlap(coll, path)) continue;
    if (!physical || isAncestorOrSelf(path, coll) || path.slice(coll.length + 1).startsWith('~2'))
      rows.delete(coll);
  }
}
export function releaseEntityReplacements(changes: ChangeSet): void {
  replacements.delete(changes);
}
export function entityReplacements(changes: ChangeSet): ReadonlyMap<string, readonly unknown[]> | undefined {
  return replacements.get(changes);
}

export function changedFields(prev: unknown, next: unknown): ReadonlySet<string> {
  const before = (prev ?? {}) as Record<string, unknown>;
  const after = (next ?? {}) as Record<string, unknown>;
  return new Set(
    [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
      (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
    ),
  );
}
