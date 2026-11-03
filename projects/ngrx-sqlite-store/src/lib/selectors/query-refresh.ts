import type { EntityRow } from '../schema/row-writer';
import { encodeEntityId } from '../schema/ids';
import { entityChanges, entityReplacement } from '../storage/entity-changes';
import type { ChangeSet } from '../storage/change-set';
import { escapeSegment, pathsOverlap } from '../storage/path';
import type { QuerySource } from './metadata';
import { share } from './view-state';

export interface QueryEntry {
  value: unknown;
  entityRows?: Map<string, EntityRow>;
  matchCount?: number;
  dirty: ChangeSet;
}

/** Return false whenever the journal cannot prove the complete query result. */
export function refreshQuery(source: QuerySource, entry: QueryEntry): boolean {
  const query = source.entity;
  if (!query) return false;
  const aggregate = query.kind === 'count' || query.kind === 'exists';
  // An inline-only whole-collection replacement with no later overlapping write
  // determines the collection exactly: recount it without a table scan.
  const replaced = aggregate ? entityReplacement(entry.dirty, source.path) : undefined;
  if (replaced) {
    let count = 0;
    for (const entity of replaced) if (query.test(entity)) count++;
    entry.value = query.kind === 'exists' ? count > 0 : count;
    entry.matchCount = count;
    entry.entityRows = undefined;
    return true;
  }
  if (entry.dirty.physicalOverlaps(source.path)) return false;
  const changes = entityChanges(entry.dirty).get(source.path);
  if (!changes) return false;
  const known = new Set([...changes.keys()].map((id) => `${source.path}/${escapeSegment(id)}`));
  const order = `${source.path}/#order`;
  for (const path of entry.dirty.paths())
    if (pathsOverlap(path, source.path) && path !== order && !known.has(path)) return false;
  if (!aggregate && (entry.dirty.paths().includes(order) || query.sorted)) return false;
  if (aggregate && entry.matchCount === undefined) return false;
  let value = entry.value;
  let count = entry.matchCount ?? 0;
  let rows = entry.entityRows;
  for (const change of changes.values()) {
    if (change.kind === 'reorder') continue;
    if (
      aggregate &&
      change.kind === 'update' &&
      ![...change.fields].some((field) => query.fields.has(field))
    )
      continue;
    const before = change.prev !== undefined && query.test(change.prev);
    const after = change.next !== undefined && query.test(change.next);
    if (aggregate) {
      count += Number(after) - Number(before);
    } else {
      if (change.kind !== 'update' || before !== after) return false;
      if (query.kind === 'page') {
        const page = value as unknown[];
        const index = page.findIndex(
          (entity) => encodeEntityId(query.selectId(entity)) === change.id,
        );
        if (index !== -1) {
          const row = share(page[index], change.next);
          if (row !== page[index]) {
            const next = [...page];
            next[index] = row;
            value = Object.freeze(next);
          }
        }
      }
    }
    if (rows?.has(change.id)) {
      rows = new Map(rows);
      if (change.next === undefined) rows.delete(change.id);
      else rows.set(change.id, { ...rows.get(change.id)!, data: JSON.stringify(change.next) });
    }
  }
  entry.value = aggregate ? (query.kind === 'exists' ? count > 0 : count) : value;
  entry.matchCount = aggregate ? count : undefined;
  entry.entityRows = rows;
  return true;
}
