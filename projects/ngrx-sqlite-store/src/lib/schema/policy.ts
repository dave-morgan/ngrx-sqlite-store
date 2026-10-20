import { NonSerializableStateError } from './errors';
import { isBrandedEntity } from './entity-brand';
import { NodeKind } from './kinds';
import { isPlainObject, serializedSize } from './size';

export type StorageHint = 'collection' | 'inline' | 'entity';
export interface StoragePolicyOptions {
  rowCap?: number;
  promotionThreshold?: number;
  hints?: Record<string, StorageHint>;
}

function matches(pattern: string[], path: string[]): boolean {
  if (!pattern.length) return !path.length;
  if (pattern[0] === '**')
    return matches(pattern.slice(1), path) || (path.length > 0 && matches(pattern, path.slice(1)));
  return (
    path.length > 0 &&
    (pattern[0] === '*' || pattern[0] === path[0]) &&
    matches(pattern.slice(1), path.slice(1))
  );
}

export class StoragePolicy {
  readonly rowCap: number;
  readonly promotionThreshold: number;
  readonly hints: Record<string, StorageHint>;

  constructor(options: StoragePolicyOptions = {}) {
    this.rowCap = options.rowCap ?? 1_048_576;
    this.promotionThreshold = options.promotionThreshold ?? 16_384;
    this.hints = options.hints ?? {};
    if (
      !Number.isSafeInteger(this.rowCap) ||
      this.rowCap < 32 ||
      this.rowCap > 1_048_576 ||
      !Number.isFinite(this.promotionThreshold) ||
      this.promotionThreshold < 0
    ) {
      throw new Error('Invalid storage policy size limits');
    }
  }

  hint(path: string): StorageHint | undefined {
    const relative = path.split('/').slice(1).join('/');
    if (Object.hasOwn(this.hints, relative)) return this.hints[relative];
    for (const [pattern, hint] of Object.entries(this.hints)) {
      if (matches(pattern.split('/'), relative.split('/'))) return hint;
    }
    return undefined;
  }

  decideKind(path: string, value: unknown, depth: number): NodeKind {
    const size = serializedSize(value, path);
    if (value === null) return NodeKind.Null;
    if (typeof value === 'boolean') return NodeKind.Bool;
    if (typeof value === 'number') return NodeKind.Num;
    if (typeof value === 'string') return size > this.rowCap ? NodeKind.Chunked : NodeKind.Str;
    const hint = this.hint(path);
    if (isBrandedEntity(value as object) || hint === 'entity') {
      const entity = value as Record<string, unknown>;
      if (
        !isPlainObject(entity) ||
        !Array.isArray(entity['ids']) ||
        !isPlainObject(entity['entities'])
      ) {
        throw new NonSerializableStateError(path);
      }
      const ids = new Set<string>();
      for (const id of entity['ids']) {
        if (
          (typeof id !== 'string' && (typeof id !== 'number' || !Number.isFinite(id))) ||
          !Object.hasOwn(entity['entities'], String(id))
        )
          throw new NonSerializableStateError(`${path}/ids`);
        const key = `${typeof id}:${id}`;
        if (ids.has(key)) throw new NonSerializableStateError(`${path}/ids`);
        ids.add(key);
      }
      return NodeKind.Entity;
    }
    if (depth === 0 && Array.isArray(value)) throw new NonSerializableStateError(path);
    const pointer = Array.isArray(value) ? NodeKind.Arr : NodeKind.Obj;
    if (depth <= 1 || size > this.rowCap) return pointer;
    if (hint === 'inline') return NodeKind.Json;
    return hint === 'collection' || size > this.promotionThreshold ? pointer : NodeKind.Json;
  }
}
