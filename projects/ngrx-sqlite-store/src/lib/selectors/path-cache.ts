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

interface Entry {
  query?: QuerySource;
  value: unknown;
  refcount: number;
  version: number;
  lastUsed: number;
  dirty: ChangeSet;
  replaced: Set<string>;
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
  private readonly nodes = new NodeStore();
  private readonly entries = new Map<string, Entry>();
  private readonly references = new Map<string, number>();
  private readonly pending = new Map<string, Promise<void>>();
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
        for (const replaced of referenceChanges(changes)) entry.replaced.add(replaced);
        entry.version = ++this.revision;
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
  private async read(sql: SqlExecutor, path: string): Promise<unknown> {
    const value = await this.nodes.read(sql, path);
    if (value !== undefined || !path.includes('/')) return value;
    // Inline JSON and EntityState logical children have no independent SQL row.
    return child(await this.read(sql, parentPath(path)), path.slice(path.lastIndexOf('/') + 1));
  }
  private async resolveRead(
    sql: SqlExecutor,
    path: string,
  ): Promise<{ path: string; value: unknown }> {
    const value = await this.nodes.read(sql, path);
    if (value !== undefined || !path.includes('/')) return { path, value };
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
    if (entry.query) {
      const next = await entry.query.reader({ query: sql.query.bind(sql) });
      entry.value = isJsonTree(entry.value) && isJsonTree(next) ? share(entry.value, next) : next;
      entry.dirty = new ChangeSet();
      entry.version = this.revision;
      return;
    }
    const targets = new ChangeSet();
    for (const changed of entry.dirty.paths()) {
      if (!pathsOverlap(path, changed)) continue;
      let target = isAncestorOrSelf(changed, path) ? path : changed;
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
      const next = await this.read(sql, target);
      entry.value = put(
        entry.value,
        suffix,
        share(at(entry.value, suffix), next, entry.replaced, target),
        next === undefined,
      );
      // A spliced pointer object needs current child positions for later tx diffs.
      let cursor = path;
      let value = entry.value;
      for (const segment of suffix) {
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
    for (const [path] of inactive.slice(Math.max(0, this.limit))) {
      this.entries.delete(path);
      removed = true;
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
    this.generations.complete();
  }
}
