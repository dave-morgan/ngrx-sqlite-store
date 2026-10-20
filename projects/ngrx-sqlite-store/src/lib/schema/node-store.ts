import type { ChangeSet } from '../storage/change-set';
import type { SqlExecutor } from '../storage/storage-engine';
import { readSubtree } from './node-reader';
import type { NodeRow } from './row-writer';
import type { Location } from './node-writer';
import { deleteSubtree, diffWrite, writeSubtree } from './node-writer';
import { StoragePolicy } from './policy';

/** Stateless facade: callers supply the current transaction executor/ChangeSet. */
export class NodeStore {
  constructor(readonly policy = new StoragePolicy()) {}

  read(
    exec: SqlExecutor,
    path: string,
    onRows?: (rows: NodeRow[]) => void,
  ): Promise<unknown | undefined> {
    return readSubtree(exec, path, onRows);
  }

  write(exec: SqlExecutor, path: string, value: unknown, changes: ChangeSet): Promise<void> {
    return writeSubtree(exec, path, value, changes, this.policy);
  }

  diffWrite(
    exec: SqlExecutor,
    path: string,
    prev: unknown,
    next: unknown,
    changes: ChangeSet,
    location?: Location,
  ): Promise<void> {
    return diffWrite(exec, path, prev, next, changes, this.policy, location);
  }

  delete(exec: SqlExecutor, path: string, changes: ChangeSet): Promise<void> {
    return deleteSubtree(exec, path, changes);
  }
}
