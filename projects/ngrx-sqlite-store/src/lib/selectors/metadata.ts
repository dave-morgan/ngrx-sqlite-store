export const NSS_SOURCE = Symbol('NSS_SOURCE');
export const NSS_DEPS = Symbol('NSS_DEPS');
export const NSS_QUERIES = Symbol('NSS_QUERIES');
export interface QuerySource {
  id: string;
  path: string;
  key: string;
  initial: unknown;
  reader: (sql: import('./query-selector').SqlReader) => Promise<unknown>;
  entity?: {
    kind: 'count' | 'exists' | 'page' | 'ids';
    fields: ReadonlySet<string>;
    test: (entity: unknown) => boolean;
    selectId: (entity: unknown) => string | number;
    sorted: boolean;
  };
}
export function queryIdentity(path: string, key: string): string {
  return '\u0000query:' + JSON.stringify([path, key]);
}
export function querySources(selector: unknown): readonly QuerySource[] {
  return (selector as SelectorMetadata)[NSS_QUERIES] ?? [];
}
export const SELECT_OPERATOR = Symbol('NSS_SELECT_OPERATOR');

export type Dependencies = readonly string[] | 'dynamic';
export interface SelectorMetadata {
  [NSS_QUERIES]?: readonly QuerySource[];
  [NSS_SOURCE]?: { path: string };
  [NSS_DEPS]?: Dependencies;
}
export function dependencies(selector: unknown): Dependencies {
  const metadata = selector as SelectorMetadata;
  return metadata[NSS_SOURCE] ? [metadata[NSS_SOURCE]!.path] : (metadata[NSS_DEPS] ?? 'dynamic');
}
export function source<T extends object>(selector: T, path: string): T {
  Object.defineProperty(selector, NSS_SOURCE, { value: { path }, configurable: true });
  return selector;
}
export function derived<T extends object>(selector: T, args: unknown[]): T {
  const inputs = Array.isArray(args[0])
    ? args[0]
    : args.length === 1 && typeof args[0] === 'object' && args[0] !== null
      ? Object.values(args[0])
      : args.slice(0, -1);
  const paths = inputs.map(dependencies);
  Object.defineProperty(selector, NSS_QUERIES, {
    value: [
      ...new Map(
        inputs.flatMap((input) => querySources(input)).map((query) => [query.id, query]),
      ).values(),
    ],
  });
  Object.defineProperty(selector, NSS_DEPS, {
    value: paths.includes('dynamic') ? 'dynamic' : [...new Set(paths.flat())],
  });
  return selector;
}
