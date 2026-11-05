import { isDevMode } from '@angular/core';
import { NodeKind } from '../schema/kinds';
import { getNodeMeta } from '../schema/meta';
import type { NodeStore } from '../schema/node-store';
import type { ChangeSet } from '../storage/change-set';
import { escapeSegment, isAncestorOrSelf, parentPath, unescapeSegment } from '../storage/path';
import type { SqlExecutor } from '../storage/storage-engine';
import { recordReferences, recordReplacement } from '../storage/reference-changes';
import type { EntityRow, NodeRow } from '../schema/row-writer';
import { EntityTx } from './entity-tx';
import type { SqlValue } from '../driver/sql-driver';
import { queryBatch, SUBTREE_COLUMNS } from '../selectors/query-batch';

export const STORE_TX_BRAND = Symbol.for('ngrx-sqlite-store/StoreTx');
export function isStoreTx(value: unknown): value is StoreTx {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as Record<symbol, unknown>)[STORE_TX_BRAND] === true
  );
}

export interface CommittedCache {
  peek(fullPath: string): unknown | undefined;
  /** A fresh cached owner may prove that a path is absent. */
  ready?(fullPath: string): boolean;
  peekEntity?(coll: string, id: string): EntityRow | undefined;
  location?(path: string): Pick<NodeRow, 'parent' | 'pos'> | undefined;
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
  readonly [STORE_TX_BRAND] = true;
  private readonly entityCollections = new Map<string, EntityTx<unknown>>();
  private readonly root: string;
  private readonly locations = new Map<string, NodeRow>();
  /** Physical child positions per parent path, valid until the parent itself is rewritten. */
  private readonly childPositions = new Map<string, ReadonlyMap<string, number>>();
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

  entities<T = unknown>(path = ''): EntityTx<T> {
    const full = this.fullPath(path);
    let collection = this.entityCollections.get(full);
    if (!collection) {
      collection = new EntityTx(
        this.sql,
        this.nodes,
        this.changes,
        full,
        () => {
          for (const key of this.locations.keys()) {
            if (isAncestorOrSelf(full, key) || isAncestorOrSelf(key, full))
              this.locations.delete(key);
          }
          for (const key of this.cache.keys()) {
            if (isAncestorOrSelf(full, key) || isAncestorOrSelf(key, full)) this.cache.delete(key);
          }
          for (const [key, other] of this.entityCollections) {
            if (isAncestorOrSelf(full, key) || isAncestorOrSelf(key, full)) other.invalidate();
          }
        },
        this.cache.get(full) ??
          (this.changes.overlaps(full) ? undefined : this.committedCache.peek(full)),
        (id) =>
          this.changes.overlaps(full) ? undefined : this.committedCache.peekEntity?.(full, id),
      );
      this.entityCollections.set(full, collection);
    }
    return collection as EntityTx<T>;
  }

  /**
   * Synchronously true when `value` is the identical value already at `path` (cached in
   * this transaction or committed and unchanged since). set() would return early for it.
   */
  isCurrent(path: string, value: unknown): boolean {
    const full = this.fullPath(path);
    if (this.cache.has(full)) return this.cache.get(full) === value;
    if (value === undefined || this.changes.overlaps(full)) return false;
    return this.committedCache.peek(full) === value;
  }

  /**
   * The feature root object when it is known without a read: cached in this transaction,
   * or committed and untouched since. isCurrent(key, v) equals `root[key] === v` for it.
   */
  currentRoot(): Readonly<Record<string, unknown>> | undefined {
    const value = this.cache.has(this.root)
      ? this.cache.get(this.root)
      : this.changes.overlaps(this.root)
        ? undefined
        : this.committedCache.peek(this.root);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }

  async get<T = S>(path = ''): Promise<T> {
    return this.load<T>(path, this.sql);
  }

  /**
   * Phase 15x: read several uncached paths through one batched transport instead of one
   * native round trip each (for example every key of a reducer's returned partial).
   * Values and row locations land in this transaction's cache exactly as get() would
   * leave them; a later get()/set() of those paths reads nothing.
   */
  async prefetch(paths: readonly string[]): Promise<void> {
    const unique = [...new Set(paths)];
    if (unique.length < 2) return;
    const batched = queryBatch(this.sql);
    const reader: SqlExecutor = {
      ...this.sql,
      query: <R>(statement: string, params?: SqlValue[]) =>
        batched.query<R>(statement, params, SUBTREE_COLUMNS),
    };
    await Promise.all(unique.map((path) => this.load(path, reader)));
  }

  private async load<T>(path: string, reader: SqlExecutor): Promise<T> {
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
    const unchanged = !this.changes.overlaps(full);
    let value = unchanged ? this.committedCache.peek(full) : undefined;
    if (value === undefined && !(unchanged && this.committedCache.ready?.(full)))
      value = await this.nodes.read(reader, full, (rows) => {
        for (const row of rows) this.locations.set(row.path, row);
      });
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
  private invalidate(full: string, value: unknown, cacheValue = true): void {
    // Child positions survive descendant writes; a rewrite of the parent or above drops them.
    for (const key of this.childPositions.keys()) if (isAncestorOrSelf(full, key)) this.childPositions.delete(key);
    for (const key of this.locations.keys()) {
      if (isAncestorOrSelf(full, key) || isAncestorOrSelf(key, full)) this.locations.delete(key);
    }
    for (const [key, collection] of this.entityCollections) {
      if (isAncestorOrSelf(full, key) || isAncestorOrSelf(key, full)) collection.invalidate();
    }
    for (const key of this.cache.keys()) {
      if (isAncestorOrSelf(full, key) || isAncestorOrSelf(key, full)) this.cache.delete(key);
    }
    if (isDevMode()) freeze(value);
    if (cacheValue) this.cache.set(full, value);
  }

  async set(path: string, value: unknown): Promise<void> {
    const full = this.fullPath(path);
    const previous = await this.get(path);
    if (previous === value) return;
    const parent = parentPath(full);
    const ownerMeta = getNodeMeta(
      this.cache.get(parent) ??
        (this.changes.overlaps(parent) ? undefined : this.committedCache.peek(parent)),
    );
    const segment = full.slice(full.lastIndexOf('/') + 1);
    // Parent metadata identifies physical children, including scalar leaves. Rewriting a
    // child keeps every sibling's row and position, so the map stays valid across child
    // writes in this transaction (one key after another needs no location read).
    let positions = this.childPositions.get(parent);
    if (!positions && ownerMeta && ownerMeta.kind !== NodeKind.Json && ownerMeta.childPos) {
      positions = ownerMeta.childPos;
      this.childPositions.set(parent, positions);
    }
    const physical = positions?.has(segment) === true;
    const row =
      this.locations.get(full) ??
      (this.changes.overlaps(full) ? undefined : this.committedCache.location?.(full)) ??
      (physical
        ? { parent, pos: positions!.get(segment)! }
        : path === '' && (previous === undefined || getNodeMeta(previous))
          ? { parent: null, pos: null }
          : (
              await this.sql.query<{ parent: string | null; pos: number | null }>(
                'SELECT parent, pos FROM nss_node WHERE path = ?',
                [full],
              )
            )[0]);
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
    // ADR-0021 identity hints first: they add equal-content descendant paths, which must not
    // invalidate the committed value diffWrite records next (ADR-0070 write-through).
    recordReferences(this.changes, full, previous, value);
    await this.nodes.diffWrite(this.sql, full, previous, value, this.changes, row);
    // Reload container metadata only if a later read needs it. This preserves
    // generated array ids without an unconditional sibling/container round trip.
    this.invalidate(full, value);
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
    else {
      await this.nodes.write(this.sql, this.root, this.initialState, this.changes);
      recordReplacement(this.changes, this.root, this.initialState);
      this.invalidate(this.root, undefined, false);
    }
  }
  async resetAll(): Promise<void> {
    if (this.resetAllFeatures) await this.resetAllFeatures();
    else await this.resetFeature();
  }
}
