import type { ChangeSet } from './change-set';
import { escapeSegment } from './path';

const references = new WeakMap<ChangeSet, Set<string>>();

export function referenceChanges(changes: ChangeSet): ReadonlySet<string> {
  return references.get(changes) ?? new Set<string>();
}

/** A prefix replacement needs identity hints without loading its old subtree. */
export function recordReplacement(changes: ChangeSet, path: string, next: unknown): void {
  if (!next || typeof next !== 'object') return;
  let paths = references.get(changes);
  if (!paths) {
    paths = new Set();
    references.set(changes, paths);
  }
  paths.add(path);
  // Match recordReferences: arrays replace their container; stable physical IDs
  // determine which elements can be shared during the subsequent refresh.
  if (!Array.isArray(next)) {
    for (const [key, value] of Object.entries(next))
      recordReplacement(changes, `${path}/${escapeSegment(key)}`, value);
  }
}

/** ADR-0021: identity is observable even when an immutable replacement writes no rows. */
export function recordReferences(
  changes: ChangeSet,
  path: string,
  previous: unknown,
  next: unknown,
): boolean {
  if (previous === next) return true;
  if (
    !previous ||
    !next ||
    typeof previous !== 'object' ||
    typeof next !== 'object' ||
    Array.isArray(previous) !== Array.isArray(next)
  )
    return false;
  let paths = references.get(changes);
  if (!paths) {
    paths = new Set();
    references.set(changes, paths);
  }
  paths.add(path);
  let equal: boolean;
  if (Array.isArray(previous) && Array.isArray(next)) {
    // A replacement item gets a new physical id; reused items retain their ids.
    equal =
      previous.length === next.length && next.every((value, index) => value === previous[index]);
  } else {
    const before = previous as Record<string, unknown>;
    const after = next as Record<string, unknown>;
    equal = Object.keys(before).length === Object.keys(after).length;
    for (const key of Object.keys(after)) {
      const same =
        Object.hasOwn(before, key) &&
        recordReferences(changes, `${path}/${escapeSegment(key)}`, before[key], after[key]);
      equal = same && equal;
    }
  }
  if (equal) changes.add(path);
  return equal;
}
