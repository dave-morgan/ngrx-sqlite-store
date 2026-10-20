import type { NodeKind } from './kinds';

export interface NodeMeta {
  path: string;
  kind: NodeKind;
  elementIds?: string[];
  childPos?: Map<string, number>;
  entityPos?: Map<string, number>;
}

const metadata = new WeakMap<object, NodeMeta>();

export function getNodeMeta(value: unknown): NodeMeta | undefined {
  return value !== null && typeof value === 'object' ? metadata.get(value) : undefined;
}

export function setNodeMeta(value: object, meta: NodeMeta): void {
  metadata.set(value, meta);
}
