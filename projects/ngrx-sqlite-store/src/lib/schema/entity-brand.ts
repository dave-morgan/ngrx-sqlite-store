export const NSS_ENTITY_BRAND = Symbol.for('ngrx-sqlite-store/entity');
const NSS_QUERY_INDEXES = Symbol.for('ngrx-sqlite-store/query-indexes');

export function validateQueryIndexes(fields: readonly string[]): readonly string[] {
  if (fields.length > 8) throw new RangeError('At most 8 query indexes per adapter');
  for (const field of fields)
    if (
      typeof field !== 'string' ||
      field.length > 128 ||
      !/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(field)
    )
      throw new TypeError('Invalid query index field: ' + field);
  return Object.freeze([...new Set(fields)]);
}

export function getQueryIndexes(value: object): readonly string[] {
  return (value as Record<symbol, readonly string[]>)[NSS_QUERY_INDEXES] ?? [];
}

export function brandEntityState<T extends object>(obj: T, queryIndexes?: readonly string[]): T {
  Object.defineProperty(obj, NSS_ENTITY_BRAND, { value: true, enumerable: false });
  if (queryIndexes?.length)
    Object.defineProperty(obj, NSS_QUERY_INDEXES, { value: queryIndexes, enumerable: false });
  return obj;
}

export function isBrandedEntity(value: object): boolean {
  return (value as Record<symbol, unknown>)[NSS_ENTITY_BRAND] === true;
}

export interface EntityValue {
  ids: (string | number)[];
  entities: Record<string, unknown>;
  [key: string]: unknown;
}
