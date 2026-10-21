export type EntityId = string | number;
export interface EntityPositionIndex {
  readonly size: number;
  get(id: EntityId): number | undefined;
  values(): IterableIterator<number>;
}
function compare(a: EntityId, b: EntityId): number {
  if (typeof a !== typeof b) return typeof a === 'number' ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Immutable compact index: reuse the ids' strings instead of a hash table. */
export class EntityPositions implements EntityPositionIndex {
  private readonly ids: EntityId[];
  private readonly positions: Float64Array;
  readonly size: number;
  constructor(entries: Iterable<readonly [EntityId, number]>) {
    const sorted = [...entries].sort((a, b) => compare(a[0], b[0]));
    this.ids = sorted.map(([id]) => id);
    this.positions = Float64Array.from(sorted, ([, pos]) => pos);
    this.size = sorted.length;
  }
  get(id: EntityId): number | undefined {
    let low = 0,
      high = this.ids.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      const order = compare(this.ids[mid], id);
      if (order === 0) return this.positions[mid];
      if (order < 0) low = mid + 1;
      else high = mid;
    }
    return undefined;
  }
  *values(): IterableIterator<number> {
    yield* this.positions;
  }
}
