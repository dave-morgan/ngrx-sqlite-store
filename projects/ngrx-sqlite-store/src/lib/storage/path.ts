/** @internal JSON-Pointer escaping applies to individual segments, not paths. */
export function escapeSegment(segment: string): string {
  // Hot path: most segments need no escaping.
  if (!segment.includes('~') && !segment.includes('/')) return segment;
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

/** @internal */
export function unescapeSegment(segment: string): string {
  // Hot path (every selector dependency and path walk): most segments hold no escapes.
  if (!segment.includes('~')) return segment;
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** @internal Joins raw segments into an escaped path; no segments denotes root. */
export function joinPath(...segments: string[]): string {
  return segments.map(escapeSegment).join('/');
}

/** @internal */
export function splitPath(path: string): string[] {
  return path === '' ? [] : path.split('/').map(unescapeSegment);
}

/** @internal The unescaped first segment ('' for the root). */
export function firstSegment(path: string): string {
  const separator = path.indexOf('/');
  return unescapeSegment(separator < 0 ? path : path.slice(0, separator));
}

/** @internal */
export function parentPath(path: string): string {
  const separator = path.lastIndexOf('/');
  return separator < 0 ? '' : path.slice(0, separator);
}

/** @internal */
export function isAncestorOrSelf(ancestor: string, path: string): boolean {
  return ancestor === '' || ancestor === path || path.startsWith(`${ancestor}/`);
}

/**
 * @internal The minimal cover ChangeSet path recording yields: a path is dropped when an
 * ancestor-or-self is also present. Order follows first occurrence.
 */
export function disjointPaths(paths: Iterable<string>): string[] {
  const unique = [...new Set(paths)];
  if (unique.length < 2) return unique;
  const kept = new Set<string>();
  for (const path of [...unique].sort((a, b) => a.length - b.length)) {
    let covered = false;
    for (let cursor = path; ; cursor = parentPath(cursor)) {
      if (kept.has(cursor)) {
        covered = true;
        break;
      }
      if (cursor === '') break;
    }
    if (!covered) kept.add(path);
  }
  return unique.filter((path) => kept.has(path));
}

/** @internal */
export function pathsOverlap(a: string, b: string): boolean {
  return isAncestorOrSelf(a, b) || isAncestorOrSelf(b, a);
}

/** @internal Descendant bounds [inclusive, exclusive]; root scans need no predicate. */
export function subtreeRange(path: string): [string, string] {
  return [`${path}/`, `${path}0`];
}
