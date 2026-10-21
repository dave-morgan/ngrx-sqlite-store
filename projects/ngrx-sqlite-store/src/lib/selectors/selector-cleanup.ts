import { pathsOverlap } from '../storage/path';

interface Releasable {
  release(): void;
}
/** Weak, deduplicated memos associated with source eviction, not subscriptions. */
export class SelectorCleanup {
  private readonly sources = new Map<string, Set<WeakRef<Releasable>>>();
  register(paths: readonly string[], selector: unknown): void {
    if (typeof (selector as Partial<Releasable>).release !== 'function') return;
    const target = selector as Releasable;
    for (const path of paths) {
      let refs = this.sources.get(path);
      if (!refs) this.sources.set(path, (refs = new Set()));
      let found = false;
      for (const ref of refs) {
        const previous = ref.deref();
        if (!previous) refs.delete(ref);
        else if (previous === target) found = true;
      }
      if (!found) refs.add(new WeakRef(target));
    }
  }
  evict(path: string): void {
    const released = new Set<Releasable>();
    for (const [source, refs] of this.sources) {
      if (!pathsOverlap(path, source)) continue;
      this.sources.delete(source);
      for (const ref of refs) {
        const target = ref.deref();
        if (target) released.add(target);
      }
    }
    for (const [source, refs] of this.sources) {
      for (const ref of refs) {
        const target = ref.deref();
        if (!target || released.has(target)) refs.delete(ref);
      }
      if (!refs.size) this.sources.delete(source);
    }
    for (const selector of released) selector.release();
  }
}
