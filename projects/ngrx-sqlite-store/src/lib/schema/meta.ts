import type { NodeKind } from './kinds';
import type { EntityPositionIndex } from './entity-positions';

export interface NodeMeta {
  path: string;
  kind: NodeKind;
  elementIds?: string[];
  childPos?: Map<string, number>;
  entityPos?: EntityPositionIndex;
}

const metadata = new WeakMap<object, NodeMeta>();

export function getNodeMeta(value: unknown): NodeMeta | undefined {
  return value !== null && typeof value === 'object' ? metadata.get(value) : undefined;
}

export function setNodeMeta(value: object, meta: NodeMeta): void {
  metadata.set(value, meta);
}
