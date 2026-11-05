import { invalidateWrites } from './committed-writes';
import {
  dropEntityReplacements,
  entityChanges,
  entityReplacements,
  recordEntityChange,
  recordEntityReplacement,
  releaseEntityChanges,
  releaseEntityReplacements,
} from './entity-changes';
interface Branch {
  path?: string;
  children: Map<string, Branch>;
}

export class ChangeSet {
  private readonly changed = new Set<string>();
  private readonly root: Branch = { children: new Map() };
  private readonly physical = new Set<string>();

  add(path: string): void {
    this.physical.add(path);
    dropEntityReplacements(this, path, true);
    this.record(path);
  }
  addEntity(coll: string, id: string): void {
    entityChanges(this).get(coll)?.delete(id);
    this.touchEntities(coll);
    this.record(`${coll}/${escapeSegment(id)}`);
  }
  addEntityOrder(coll: string): void {
    this.touchEntities(coll);
    this.record(`${coll}/#order`);
  }
  /** Collections with entity row or order writes (drops replacement records on merge). */
  private readonly entityCollections = new Set<string>();
  private touchEntities(coll: string): void {
    this.entityCollections.add(coll);
    dropEntityReplacements(this, coll, false);
  }
  physicalOverlaps(path: string): boolean {
    for (const changed of this.physical) if (pathsOverlap(changed, path)) return true;
    return false;
  }
  private record(path: string): void {
    invalidateWrites(this, path);
    let node = this.root;
    for (const segment of path === '' ? [] : path.split('/')) {
      if (node.path !== undefined) return;
      let child = node.children.get(segment);
      if (!child) {
        child = { children: new Map() };
        node.children.set(segment, child);
      }
      node = child;
    }
    if (node.path !== undefined) return;
    const discard = (branch: Branch) => {
      if (branch.path !== undefined) this.changed.delete(branch.path);
      for (const child of branch.children.values()) discard(child);
    };
    discard(node);
    node.children.clear();
    node.path = path;
    this.changed.add(path);
  }

  paths(): readonly string[] {
    return [...this.changed];
  }

  overlaps(path: string): boolean {
    let node = this.root;
    for (const segment of path === '' ? [] : path.split('/')) {
      if (node.path !== undefined) return true;
      const child = node.children.get(segment);
      if (!child) return false;
      node = child;
    }
    return node.path !== undefined || node.children.size > 0;
  }

  get isEmpty(): boolean {
    return this.changed.size === 0;
  }

  merge(other: ChangeSet, includeEntities = true): void {
    // A delta describes one transaction's before/after. Keep only independent
    // deltas when merging; repeated/unknown overlapping mutations require SQL.
    const incoming = includeEntities
      ? [...entityChanges(other)].flatMap(([coll, rows]) =>
          [...rows.values()]
            .filter((change) => !this.overlaps(`${coll}/${escapeSegment(change.id)}`))
            .map((change) => ({ coll, change })),
        )
      : [];
    for (const [coll, rows] of entityChanges(this))
      for (const id of rows.keys())
        if (other.overlaps(`${coll}/${escapeSegment(id)}`)) rows.delete(id);
    for (const coll of other.entityCollections) dropEntityReplacements(this, coll, false);
    for (const path of other.physical) dropEntityReplacements(this, path, true);
    for (const coll of other.entityCollections) this.entityCollections.add(coll);
    for (const path of other.paths()) this.record(path);
    for (const path of other.physical) this.physical.add(path);
    for (const { coll, change } of incoming) recordEntityChange(this, coll, change);
    // A replacement determines the whole collection, superseding earlier history.
    if (includeEntities)
      for (const [coll, entities] of entityReplacements(other) ?? [])
        recordEntityReplacement(this, coll, entities);
    if (!includeEntities) {
      releaseEntityChanges(this);
      releaseEntityReplacements(this);
    }
  }
}
import { escapeSegment, pathsOverlap } from './path';
