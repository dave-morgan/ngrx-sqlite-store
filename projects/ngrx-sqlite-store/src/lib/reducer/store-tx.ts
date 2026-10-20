import { isDevMode } from '@angular/core';
import { getNodeMeta } from '../schema/meta';
import type { NodeStore } from '../schema/node-store';
import type { ChangeSet } from '../storage/change-set';
import { escapeSegment, isAncestorOrSelf, parentPath, unescapeSegment } from '../storage/path';
import type { SqlExecutor } from '../storage/storage-engine';

export interface CommittedCache {
  peek(fullPath: string): unknown | undefined;
}

function child(value: unknown, segment: string): { found: boolean; value?: unknown } {
  if (value === null || typeof value !== 'object') return { found: false };
  if (Array.isArray(value)) {
    const ids = getNodeMeta(value)?.elementIds;
    if (ids) {
      const index = ids.indexOf(segment);
      return index < 0 ? { found: false } : { found: true, value: value[index] };
    }
  }
  const key = unescapeSegment(segment);
  return Object.hasOwn(value, key)
    ? { found: true, value: (value as Record<string, unknown>)[key] }
    : { found: false };
}

function freeze(value: unknown): void {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
  for (const item of Object.values(value)) freeze(item);
  Object.freeze(value);
}

/** A feature-scoped view of the executor; never queues nested engine work. */
export class StoreTx<S = unknown> {
  private readonly root: string;
  constructor(
    featureKey: string,
    private readonly nodes: NodeStore,
    readonly sql: SqlExecutor,
    private readonly changes: ChangeSet,
    private readonly cache = new Map<string, unknown>(),
    private readonly committedCache: CommittedCache = { peek: () => undefined },
    private readonly initialState?: S,
    private readonly resetAllFeatures?: () => Promise<void>,
  ) {
    this.root = escapeSegment(featureKey);
  }

  private fullPath(path: string): string {
    return path === '' ? this.root : `${this.root}/${path}`;
  }

  async get<T = S>(path = ''): Promise<T> {
    const full = this.fullPath(path);
    if (this.cache.has(full)) return this.cache.get(full) as T;
    let ancestor = parentPath(full);
    while (isAncestorOrSelf(this.root, ancestor)) {
      if (this.cache.has(ancestor)) {
        let value = this.cache.get(ancestor);
        let found = true;
        for (const segment of full.slice(ancestor.length + 1).split('/')) {
          const result = child(value, segment);
          if (!result.found) {
            found = false;
            break;
          }
          value = result.value;
        }
        if (found) {
          this.cache.set(full, value);
          return value as T;
        }
      }
      if (ancestor === this.root) break;
      ancestor = parentPath(ancestor);
    }
    let value = this.changes.overlaps(full) ? undefined : this.committedCache.peek(full);
    if (value === undefined) value = await this.nodes.read(this.sql, full);
    // Inline JSON children have no separate SQL row. Resolve through their parent.
    if (value === undefined && full !== this.root) {
      const parent = parentPath(path);
      const result = child(await this.get(parent), full.slice(full.lastIndexOf('/') + 1));
      if (result.found) value = result.value;
    }
    if (isDevMode()) freeze(value);
    this.cache.set(full, value);
    return value as T;
  }

  /** Ancestors are dropped after writes and reloaded on demand; descendants expire. */
  private invalidate(full: string, value: unknown): void {
    for (const key of this.cache.keys()) {
      if (isAncestorOrSelf(full, key) || isAncestorOrSelf(key, full)) this.cache.delete(key);
    }
    if (isDevMode()) freeze(value);
    this.cache.set(full, value);
  }

  async set(path: string, value: unknown): Promise<void> {
    const full = this.fullPath(path);
    const previous = await this.get(path);
    if (previous === value) return;
    const [row] = await this.sql.query<{ path: string }>(
      'SELECT path FROM nss_node WHERE path = ?',
      [full],
    );
    if (!row && path !== '') {
      // New keys and descendants of inline nodes must update their owning container.
      const parent = parentPath(path);
      const owner = await this.get<Record<string, unknown>>(parent);
      if (owner === null || typeof owner !== 'object')
        throw new Error(`Cannot set missing parent: ${parent}`);
      const segment = path.slice(path.lastIndexOf('/') + 1);
      if (Array.isArray(owner)) {
        const index = getNodeMeta(owner)?.elementIds?.indexOf(segment) ?? -1;
        if (index < 0) throw new Error('Use insert() to add array elements');
        const next = [...owner];
        next[index] = value;
        await this.set(parent, next);
      } else await this.set(parent, { ...owner, [unescapeSegment(segment)]: value });
      return;
    }
    await this.nodes.diffWrite(this.sql, full, previous, value, this.changes);
    // Re-read containers to retain generated array ids and current position metadata.
    // Descendants expire on replacement, so references remain stable until a write.
    this.invalidate(
      full,
      value !== null && typeof value === 'object' ? await this.nodes.read(this.sql, full) : value,
    );
  }

  async patch(path: string, partial: Record<string, unknown>): Promise<void> {
    const previous = await this.get(path);
    if (!previous || typeof previous !== 'object' || Array.isArray(previous))
      throw new Error('patch() requires an object');
    await this.set(path, { ...previous, ...partial });
  }

  async delete(path: string): Promise<void> {
    const full = this.fullPath(path);
    const parent = parentPath(path);
    const segment = path.slice(path.lastIndexOf('/') + 1);
    let owner: Record<string, unknown> | undefined;
    if (path !== '') {
      const container = await this.get(parent);
      if (!container || typeof container !== 'object') return;
      if (Array.isArray(container)) {
        const ids = getNodeMeta(container)?.elementIds;
        const index = ids ? ids.indexOf(segment) : Number(segment);
        if (index < 0 || index >= container.length || !Number.isInteger(index)) return;
        // Pointer arrays use stable hidden ids; inline JSON arrays use indices.
        if (!ids && String(index) !== segment) return;
        await this.removeAt(parent, index);
        return;
      }
      owner = container as Record<string, unknown>;
      if (!Object.hasOwn(owner, unescapeSegment(segment))) return;
    }
    const [row] = await this.sql.query<{ path: string }>(
      'SELECT path FROM nss_node WHERE path = ?',
      [full],
    );
    if (!row && owner) {
      const next = { ...owner };
      delete next[unescapeSegment(segment)];
      await this.set(parent, next);
      return;
    }
    if (!row) return;
    await this.nodes.delete(this.sql, full, this.changes);
    this.invalidate(full, undefined);
  }

  private async array(path: string): Promise<unknown[]> {
    const value = await this.get(path);
    if (!Array.isArray(value)) throw new Error('Array operation requires an array');
    return value;
  }
  async insert(path: string, value: unknown, index?: number): Promise<void> {
    const items = [...(await this.array(path))];
    const position = index ?? items.length;
    this.checkIndex(position, items.length, true);
    items.splice(position, 0, value);
    await this.set(path, items);
  }
  async removeAt(path: string, index: number): Promise<void> {
    const items = [...(await this.array(path))];
    this.checkIndex(index, items.length);
    items.splice(index, 1);
    await this.set(path, items);
  }
  async move(path: string, from: number, to: number): Promise<void> {
    const items = [...(await this.array(path))];
    this.checkIndex(from, items.length);
    this.checkIndex(to, items.length);
    items.splice(to, 0, items.splice(from, 1)[0]);
    await this.set(path, items);
  }
  private checkIndex(index: number, length: number, allowEnd = false): void {
    if (!Number.isInteger(index) || index < 0 || index >= length + Number(allowEnd))
      throw new RangeError('Array index out of range');
  }
  async resetFeature(): Promise<void> {
    if (this.initialState === undefined) await this.delete('');
    else await this.set('', this.initialState);
  }
  async resetAll(): Promise<void> {
    if (this.resetAllFeatures) await this.resetAllFeatures();
    else await this.resetFeature();
  }
}
