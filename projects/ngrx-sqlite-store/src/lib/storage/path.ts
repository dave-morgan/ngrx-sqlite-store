/** @internal JSON-Pointer escaping applies to individual segments, not paths. */
export function escapeSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

/** @internal */
export function unescapeSegment(segment: string): string {
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

/** @internal */
export function parentPath(path: string): string {
  const separator = path.lastIndexOf('/');
  return separator < 0 ? '' : path.slice(0, separator);
}

/** @internal */
export function isAncestorOrSelf(ancestor: string, path: string): boolean {
  return ancestor === '' || ancestor === path || path.startsWith(`${ancestor}/`);
}

/** @internal */
export function pathsOverlap(a: string, b: string): boolean {
  return isAncestorOrSelf(a, b) || isAncestorOrSelf(b, a);
}

/** @internal Descendant bounds [inclusive, exclusive]; root scans need no predicate. */
export function subtreeRange(path: string): [string, string] {
  return [`${path}/`, `${path}0`];
}
