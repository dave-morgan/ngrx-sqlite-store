import { createSelector } from '@ngrx/store';
import type { MemoizedSelector } from '@ngrx/store';
import type { SqlValue, Row } from '../driver/sql-driver';
import { NSS_DEPS, NSS_QUERIES, queryIdentity } from './metadata';
import type { QuerySource } from './metadata';

export interface SqlReader {
  query<R = Row>(sql: string, params?: SqlValue[], columns?: readonly string[]): Promise<R[]>;
}
export interface QueryOptions<T> {
  path: string;
  key: string;
  initial: T;
}

// Kept out of the public view tree: query results never become persisted state.
export const queryViews = new WeakMap<object, ReadonlyMap<string, unknown>>();

export function createQuerySelector<T, S = object>(
  options: QueryOptions<T>,
  reader: (sql: SqlReader) => Promise<T>,
): MemoizedSelector<S, T> {
  return querySelector(options, reader, () => options.initial);
}

export function querySelector<S, T>(
  options: QueryOptions<T>,
  reader: (sql: SqlReader) => Promise<T>,
  classic: (state: S) => T,
  entity?: QuerySource['entity'],
): MemoizedSelector<S, T> {
  const id = queryIdentity(options.path, options.key);
  const selector = createSelector(
    (state: S) => {
      const values = state && typeof state === 'object' ? queryViews.get(state) : undefined;
      return values ? (values.has(id) ? (values.get(id) as T) : options.initial) : classic(state);
    },
    (value) => value,
  );
  const source: QuerySource = { ...options, reader, id, entity };
  Object.defineProperty(selector, NSS_QUERIES, { value: [source] });
  Object.defineProperty(selector, NSS_DEPS, { value: [id] });
  return selector;
}
