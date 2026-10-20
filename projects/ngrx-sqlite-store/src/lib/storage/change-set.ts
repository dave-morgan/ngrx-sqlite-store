import { isAncestorOrSelf, pathsOverlap } from './path';

export class ChangeSet {
  private readonly changed = new Set<string>();

  add(path: string): void {
    for (const recorded of this.changed) {
      if (isAncestorOrSelf(recorded, path)) return;
    }
    for (const recorded of this.changed) {
      if (isAncestorOrSelf(path, recorded)) this.changed.delete(recorded);
    }
    this.changed.add(path);
  }

  paths(): readonly string[] {
    return [...this.changed];
  }

  overlaps(path: string): boolean {
    return [...this.changed].some((changed) => pathsOverlap(changed, path));
  }

  get isEmpty(): boolean {
    return this.changed.size === 0;
  }

  merge(other: ChangeSet): void {
    for (const path of other.paths()) this.add(path);
  }
}
