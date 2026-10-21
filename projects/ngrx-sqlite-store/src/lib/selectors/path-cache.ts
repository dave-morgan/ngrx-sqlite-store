import type { EntityRow, NodeRow } from '../schema/row-writer';
import type { SqlValue } from '../driver/sql-driver';
import { committedWrites } from '../storage/committed-writes';
import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NodeKind } from '../schema/kinds';
import { getNodeMeta, setNodeMeta } from '../schema/meta';
import { NodeStore } from '../schema/node-store';
import { ChangeSet } from '../storage/change-set';
import { isAncestorOrSelf, parentPath, pathsOverlap } from '../storage/path';
import { StorageEngine } from '../storage/storage-engine';
import { referenceChanges } from '../storage/reference-changes';
import type { SqlExecutor } from '../storage/storage-engine';
import { STORE_CONFIGURATION } from '../store/tokens';
import { at, child, put, share } from './view-state';
import type { QuerySource } from './metadata';
import type { EntityValue } from '../schema/entity-brand';
import { refreshEntities } from './entity-refresh';
import { retainedSize } from './retained-size';
import { SelectorCleanup } from './selector-cleanup';

interface Entry {
  query?: QuerySource;
  entityRows?: Map<string, EntityRow>;
  location?: Pick<NodeRow, 'parent' | 'pos'>;
  value: unknown;
  refcount: number;
  version: number;
  lastUsed: number;
  dirty: ChangeSet;
  replaced: Set<string>;
  bytes?: number;
}

function isJsonTree(value: unknown, seen = new WeakSet<object>()): boolean {
  if (value === null || typeof value !== 'object') return typeof value !== 'function';
  if (seen.has(value)) return false;
  seen.add(value);
  if (
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== Object.prototype &&
    Object.getPrototypeOf(value) !== null
  )
    return false;
  return (
    !Object.getOwnPropertySymbols(value).length &&
    Object.values(value).every((child) => isJsonTree(child, seen))
  );
}

@Injectable()
export class PathCache {
  private readonly engine = inject(StorageEngine);
  private readonly limit = inject(STORE_CONFIGURATION).sqlite?.lruSize ?? 32;
  private readonly budget = inject(STORE_CONFIGURATION).sqlite?.cacheBudgetBytes ?? 4 * 1024 * 1024;
  private readonly nodes = new NodeStore();
  private readonly entries = new Map<string, Entry>();
  private readonly references = new Map<string, number>();
  private readonly pending = new Map<string, Promise<void>>();
  private readonly cleanup = new SelectorCleanup();
  private clock = 0;
  private revision = 0;
  private currentView: object = Object.freeze({});
  readonly generation = signal(0);
  readonly generations = new BehaviorSubject(0);
  private readonly subscription = this.engine.changes$.subscribe((changes) => {
    // This callback runs INSIDE the engine FIFO. Invalidate only; never query.
    for (const [path, entry] of this.entries)
      if (changes.overlaps(entry.query?.path ?? path)) {
        entry.dirty.merge(changes);
        const source = committedWrites(changes);
        const known = committedWrites(entry.dirty);
        for (const [key, value] of source.values)
          if (entry.refcount && pathsOverlap(path, key) && !entry.query)
            known.values.set(key, value);
        for (const [coll, rows] of source.entities)
          if (entry.refcount && pathsOverlap(path, coll) && !entry.query)
            known.entities.set(coll, new Map([...(known.entities.get(coll) ?? []), ...rows]));
        for (const [coll, ids] of source.removed)
          if (entry.refcount && pathsOverlap(path, coll) && !entry.query)
            known.removed.set(coll, new Set([...(known.removed.get(coll) ?? []), ...ids]));
        for (const replaced of referenceChanges(changes)) entry.replaced.add(replaced);
        entry.version = ++this.revision;
        // Inactive entries can adopt exact node writes without retaining a journal
        // or loading data. Unknown/entity SQL changes stay stale until leased.
        if (!entry.refcount && !entry.query) {
          const patches: { suffix: string[]; value: unknown; target: string }[] = [];
          for (const changed of entry.dirty.paths()) {
            if (!pathsOverlap(path, changed)) continue;
            const requested = isAncestorOrSelf(changed, path) ? path : changed;
            const owner = [...source.values.keys()].find((key) => isAncestorOrSelf(key, requested));
            if (owner === undefined) {
              patches.length = 0;
              break;
            }
            const target = isAncestorOrSelf(owner, path) ? path : owner;
            if (patches.some((patch) => patch.target === target)) continue;
            patches.push({
              target,
              suffix: target === path ? [] : target.slice(path.length + 1).split('/'),
              value: at(
                source.values.get(owner),
                target === owner ? [] : target.slice(owner.length + 1).split('/'),
              ),
            });
          }
          if (patches.length) {
            for (const patch of patches)
              entry.value = put(
                entry.value,
                patch.suffix,
                share(at(entry.value, patch.suffix), patch.value, entry.replaced, patch.target),
              );
            entry.dirty = new ChangeSet();
            entry.replaced.clear();
            entry.bytes = undefined;
          }
        }
      }
  });

  get view(): object {
    return this.currentView;
  }
  registerQueries(queries: readonly QuerySource[]): void {
    for (const query of queries) {
      if (this.entries.has(query.id)) continue;
      const dirty = new ChangeSet();
      dirty.add(query.path);
      this.entries.set(query.id, {
        query,
        value: query.initial,
        refcount: 0,
        version: this.revision,
        lastUsed: ++this.clock,
        dirty,
        replaced: new Set(),
      });
    }
  }
  queryValues(): ReadonlyMap<string, unknown> {
    return new Map(
      [...this.entries]
        .filter(([, entry]) => entry.query && entry.dirty.isEmpty)
        .map(([key, entry]) => [key, entry.value]),
    );
  }
  withDefaults(defaults: object): object {
    let view: unknown = defaults;
    for (const [path, entry] of this.entries)
      if (!entry.query) view = put(view, path.split('/'), entry.value);
    return view as object;
  }
  notify(): void {
    this.publish();
    this.evict();
  }
  whenEvicted(paths: readonly string[], selector: unknown): void {
    this.cleanup.register(paths, selector);
    for (const path of paths) if (!this.ready(path)) this.cleanup.evict(path);
  }

  private owner(path: string): [string, Entry] | undefined {
    return [...this.entries].find(([root, entry]) =>
      entry.query ? root === path : isAncestorOrSelf(root, path),
    );
  }
  ready(path: string): boolean {
    const owner = this.owner(path);
    return !!owner && owner[1].dirty.isEmpty;
  }
  peek(path: string): unknown {
    const owner = this.owner(path);
    if (!owner || !owner[1].dirty.isEmpty) return undefined;
    owner[1].lastUsed = ++this.clock;
    return at(owner[1].value, path === owner[0] ? [] : path.slice(owner[0].length + 1).split('/'));
  }
  location(path: string): Pick<NodeRow, 'parent' | 'pos'> | undefined {
    const owner = this.owner(path);
    return owner?.[0] === path && owner[1].dirty.isEmpty ? owner[1].location : undefined;
  }
  peekEntity(coll: string, id: string): EntityRow | undefined {
    for (const entry of this.entries.values()) {
      if (entry.query?.path !== coll || !entry.dirty.isEmpty) continue;
      const row = entry.entityRows?.get(id);
      if (row) return row;
    }
    return undefined;
  }
  retain(path: string): () => void {
    this.references.set(path, (this.references.get(path) ?? 0) + 1);
    this.recount();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const count = this.references.get(path)! - 1;
      if (count) this.references.set(path, count);
      else this.references.delete(path);
      const owner = this.owner(path);
      if (owner) owner[1].lastUsed = ++this.clock;
      this.recount();
      this.evict();
    };
  }
  ensure(path: string): Promise<void> {
    if (this.ready(path)) return Promise.resolve();
    const pending = this.pending.get(path);
    if (pending) return pending;
    const operation = this.load(path);
    this.pending.set(path, operation);
    void operation.then(
      () => this.pending.delete(path),
      () => this.pending.delete(path),
    );
    return operation;
  }
  private async load(path: string): Promise<void> {
    await this.engine.read(async (sql) => {
      if (this.ready(path)) return;
      const existing = this.owner(path);
      if (existing) {
        await this.refreshEntry(sql, ...existing);
        return;
      }
      // Logical array indices and inline/entity children have no physical row.
      // Cache their owning container so physical-id changes invalidate them too.
      const resolved = await this.resolveRead(sql, path);
      const root = resolved.path;
      let value = resolved.value;
      for (const [descendant, entry] of this.entries) {
        if (entry.query) continue;
        if (!isAncestorOrSelf(root, descendant)) continue;
        const suffix = descendant === root ? [] : descendant.slice(root.length + 1).split('/');
        const loaded = at(value, suffix);
        const shared = share(entry.value, loaded, entry.replaced, descendant);
        if (shared !== loaded) value = put(value, suffix, shared);
        this.entries.delete(descendant);
      }
      this.entries.set(root, {
        value,
        location: resolved.location,
        refcount: 0,
        version: this.revision,
        lastUsed: ++this.clock,
        dirty: new ChangeSet(),
        replaced: new Set(),
      });
      this.recount();
    });
    this.publish();
    this.evict();
  }
  private async read(sql: SqlExecutor, path: string, entry?: Entry): Promise<unknown> {
    const value = await this.nodes.read(sql, path, (rows) => {
      if (entry) {
        const row = rows.find((row) => row.path === path);
        entry.location = row && { parent: row.parent, pos: row.pos };
      }
    });
    if (value !== undefined || !path.includes('/')) return value;
    // Inline JSON and EntityState logical children have no independent SQL row.
    return child(await this.read(sql, parentPath(path)), path.slice(path.lastIndexOf('/') + 1));
  }
  private async resolveRead(
    sql: SqlExecutor,
    path: string,
  ): Promise<{ path: string; value: unknown; location?: Pick<NodeRow, 'parent' | 'pos'> }> {
    let location: Pick<NodeRow, 'parent' | 'pos'> | undefined;
    const value = await this.nodes.read(sql, path, (rows) => {
      const row = rows.find((row) => row.path === path);
      location = row && { parent: row.parent, pos: row.pos };
    });
    if (value !== undefined || !path.includes('/')) return { path, value, location };
    return this.resolveRead(sql, parentPath(path));
  }
  async refresh(): Promise<void> {
    if (![...this.entries.values()].some((entry) => entry.refcount && !entry.dirty.isEmpty)) return;
    await this.engine.read(async (sql) => {
      for (const [path, entry] of this.entries) {
        if (entry.refcount && !entry.dirty.isEmpty) await this.refreshEntry(sql, path, entry);
      }
    });
    this.publish();
  }
  private async refreshEntry(sql: SqlExecutor, path: string, entry: Entry): Promise<void> {
    entry.bytes = undefined;
    if (entry.query) {
      const entityRows = new Map<string, EntityRow>();
      const queryPath = entry.query.path;
      const next = await entry.query.reader({
        query: async <R>(statement: string, params?: SqlValue[]) => {
          const rows = await sql.query<R>(statement, params);
          if (/FROM nss_entity/.test(statement) && params?.[0] === queryPath) {
            for (const candidate of rows) {
              const row = candidate as Partial<EntityRow>;
              if (
                typeof row.id === 'string' &&
                typeof row.data === 'string' &&
                typeof row.pos === 'number'
              )
                entityRows.set(row.id, { ...row, coll: queryPath } as EntityRow);
            }
          }
          return rows;
        },
      });
      entry.entityRows = entityRows;
      entry.value = isJsonTree(entry.value) && isJsonTree(next) ? share(entry.value, next) : next;
      entry.dirty = new ChangeSet();
      entry.version = this.revision;
      return;
    }
    const targets = new ChangeSet();
    for (const changed of entry.dirty.paths()) {
      if (!pathsOverlap(path, changed)) continue;
      let target = isAncestorOrSelf(changed, path) ? path : changed;
      if (committedWrites(entry.dirty).values.has(target)) {
        targets.add(target);
        continue;
      }
      let cursor = path;
      let value = entry.value;
      // Array order/ids, inline JSON and entity containers are atomic read units.
      for (const segment of target.slice(path.length + 1).split('/')) {
        const kind = getNodeMeta(value)?.kind;
        if (Array.isArray(value) || kind === NodeKind.Entity || kind === NodeKind.Json) {
          target = cursor;
          break;
        }
        if (target === path) break;
        value = child(value, segment);
        cursor += `/${segment}`;
      }
      targets.add(target);
    }
    for (const target of targets.paths()) {
      const suffix = target === path ? [] : target.slice(path.length + 1).split('/');
      const previous = at(entry.value, suffix);
      if (
        !committedWrites(entry.dirty).values.has(target) &&
        getNodeMeta(previous)?.kind === NodeKind.Entity
      ) {
        const patched = await refreshEntities(
          sql,
          this.nodes,
          target,
          previous as EntityValue,
          entry.dirty,
          entry.replaced,
        );
        if (patched) {
          entry.value = put(entry.value, suffix, patched);
          continue;
        }
      }
      const known = committedWrites(entry.dirty).values;
      let knownPath = [...known.keys()].find((key) => isAncestorOrSelf(key, target));
      const next =
        knownPath === undefined
          ? await this.read(sql, target, target === path ? entry : undefined)
          : at(
              known.get(knownPath),
              target === knownPath ? [] : target.slice(knownPath.length + 1).split('/'),
            );
      entry.value = put(
        entry.value,
        suffix,
        share(at(entry.value, suffix), next, entry.replaced, target),
        next === undefined,
      );
      // A spliced pointer object needs current child positions for later tx diffs.
      let cursor = path;
      let value = entry.value;
      for (const segment of knownPath === undefined ? suffix : []) {
        const meta = getNodeMeta(value);
        if (meta?.kind === NodeKind.Obj && value && typeof value === 'object') {
          const rows = await sql.query<{ path: string; pos: number }>(
            'SELECT path, pos FROM nss_node WHERE parent = ? ORDER BY pos',
            [cursor],
          );
          setNodeMeta(value, {
            ...meta,
            childPos: new Map(rows.map((row) => [row.path.slice(cursor.length + 1), row.pos])),
          });
        }
        value = child(value, segment);
        cursor += `/${segment}`;
      }
    }
    entry.dirty = new ChangeSet();
    entry.replaced.clear();
    entry.version = this.revision;
  }
  private recount(): void {
    for (const [root, entry] of this.entries) {
      entry.refcount = 0;
      for (const [path, count] of this.references)
        if (entry.query ? root === path : pathsOverlap(root, path)) entry.refcount += count;
    }
  }
  private evict(): void {
    const inactive = [...this.entries]
      .filter(([, entry]) => !entry.refcount)
      .sort((a, b) => b[1].lastUsed - a[1].lastUsed);
    let removed = false;
    let bytes = 0;
    for (const [index, [path, entry]] of inactive.entries()) {
      const size = (entry.bytes ??= retainedSize([entry.value, entry.entityRows]));
      if (index >= Math.max(0, this.limit) || bytes + size > Math.max(0, this.budget)) {
        this.entries.delete(path);
        this.cleanup.evict(path);
        removed = true;
      } else bytes += size;
    }
    if (removed) this.publish();
  }
  private publish(): void {
    let view: unknown = Object.freeze({});
    for (const [path, entry] of this.entries)
      if (!entry.query) view = put(view, path.split('/'), entry.value);
    this.currentView = share(this.currentView, view) as object;
    const generation = this.generation() + 1;
    this.generation.set(generation);
    this.generations.next(generation);
  }
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.cleanup.evict('');
    this.generations.complete();
  }
}
