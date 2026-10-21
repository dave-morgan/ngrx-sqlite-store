/** Transient classic-form ordering metadata; persisted as sortkey and pos. */
export interface EntityOrder {
  positions: EntityPositionIndex;
  keys: Map<string, string | null>;
}
const orders = new WeakMap<object, EntityOrder>();
export function getEntityOrder(state: object): EntityOrder | undefined {
  return orders.get(state);
}
export function setEntityOrder(state: object, order: EntityOrder): void {
  orders.set(state, order);
}
import type { EntityPositionIndex } from './entity-positions';
