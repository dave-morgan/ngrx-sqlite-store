export const NSS_ENTITY_BRAND = Symbol.for('ngrx-sqlite-store/entity');

export function brandEntityState<T extends object>(obj: T): T {
  Object.defineProperty(obj, NSS_ENTITY_BRAND, { value: true, enumerable: false });
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
