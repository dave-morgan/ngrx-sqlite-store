import type { ChangeSet } from './change-set';

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

export function changedFields(prev: unknown, next: unknown): ReadonlySet<string> {
  const before = (prev ?? {}) as Record<string, unknown>;
  const after = (next ?? {}) as Record<string, unknown>;
  return new Set(
    [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
      (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
    ),
  );
}
