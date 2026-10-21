import { TodoFilter } from './models';

/** UI criteria for the todo list; each implementation turns it into selectors. */
export interface TodoCriteria {
  filter: TodoFilter;
  query: string;
  userId: string | null;
}

/** Stable cache key so selector factories return the same memoized selector for equal input. */
export const criteriaKey = (c: TodoCriteria, limit: number) => `${c.filter}|${c.userId ?? ''}|${c.query}|${limit}`;

/** Bounded memo for selector factories (avoid one selector per keystroke living forever). */
export function memoFactory<K, V>(max = 32) {
  const cache = new Map<K, V>();
  return (key: K, create: () => V): V => {
    let value = cache.get(key);
    if (value === undefined) {
      value = create();
      cache.set(key, value);
      if (cache.size > max) cache.delete(cache.keys().next().value as K);
    }
    return value;
  };
}
