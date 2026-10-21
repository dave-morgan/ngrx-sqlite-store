import type { ChangeSet } from '../storage/change-set';
import { escapeSegment, parentPath } from '../storage/path';
import type { SqlExecutor } from '../storage/storage-engine';
import type { EntityValue } from './entity-brand';
import { getEntityOrder } from './entity-order';
import { encodeEntityId, newElementId } from './ids';
import { NodeKind } from './kinds';
import { getNodeMeta } from './meta';
import type { NodeMeta } from './meta';
import { entityValuePath } from './node-reader';
import { matchElements, reorderedPositions } from './ordering';
import { StoragePolicy } from './policy';
import { initial } from './positions';
import { RowWriter } from './row-writer';
import type { EntityRow } from './row-writer';
import { serializedSize } from './size';

export interface Location {
  parent: string | null;
  pos: number | null;
}

function depth(path: string): number {
  return path.split('/').length - 1;
}

function childPath(path: string, key: string): string {
  return `${path}/${escapeSegment(key)}`;
}

function valueText(value: unknown, kind: NodeKind): string | null {
  return kind === NodeKind.Null || kind >= NodeKind.Obj ? null : JSON.stringify(value);
}

/** Split encoded JSON on Unicode boundaries, with each fragment within the cap. */
function chunks(text: string, cap: number): string[] {
  const result: string[] = [];
  let start = 0;
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    const pair =
      c >= 0xd800 &&
      c <= 0xdbff &&
      i + 1 < text.length &&
      text.charCodeAt(i + 1) >= 0xdc00 &&
      text.charCodeAt(i + 1) <= 0xdfff;
    const width = pair ? 4 : c < 0x80 ? 1 : c < 0x800 ? 2 : 3;
    if (bytes + width > cap) {
      result.push(text.slice(start, i));
      start = i;
      bytes = 0;
    }
    bytes += width;
    if (pair) i++;
  }
  if (start < text.length) result.push(text.slice(start));
  return result;
}

class SubtreeWriter {
  constructor(
    readonly rows: RowWriter,
    private readonly policy: StoragePolicy,
  ) {}

  insert(path: string, value: unknown, location: Location, changePath?: string): void {
    const kind = this.policy.decideKind(path, value, depth(path));
    this.rows.insertNode({ path, ...location, kind, value: valueText(value, kind) }, changePath);
    if (kind === NodeKind.Chunked) this.insertChunks(path, value as string, changePath);
    else if (kind === NodeKind.Obj || kind === NodeKind.Arr || kind === NodeKind.Entity) {
      if (kind === NodeKind.Entity) {
        const entity = value as EntityValue;
        const positions = initial(entity.ids.length);
        entity.ids.forEach((id, i) => {
          const encoded = encodeEntityId(id);
          const data = entity.entities[String(id)];
          const oversized =
            serializedSize(data, entityValuePath(path, encoded)) > this.policy.rowCap;
          this.rows.insertEntity({
            coll: path,
            id: encoded,
            pos: getEntityOrder(entity)?.positions.get(id) ?? positions[i],
            sortkey: getEntityOrder(entity)?.keys.get(encoded),
            data: oversized ? '' : JSON.stringify(data),
          });
          if (oversized)
            this.insert(
              entityValuePath(path, encoded),
              data,
              { parent: path, pos: null },
              changePath ?? path,
            );
        });
      }
      const entries =
        kind === NodeKind.Arr
          ? (value as unknown[]).map((child) => [newElementId(), child] as const)
          : Object.entries(value as Record<string, unknown>)
              .filter(([key]) => kind !== NodeKind.Entity || (key !== 'ids' && key !== 'entities'))
              .map(([key, child]) => [escapeSegment(key), child] as const);
      const positions = initial(entries.length);
      entries.forEach(([segment, child], i) =>
        this.insert(`${path}/${segment}`, child, { parent: path, pos: positions[i] }, changePath),
      );
    }
  }

  private insertChunks(path: string, value: string, changePath?: string): void {
    chunks(JSON.stringify(value), this.policy.rowCap).forEach((data, seq) =>
      this.rows.insertChunk(path, seq, data, changePath),
    );
  }

  async replace(
    path: string,
    value: unknown,
    location: Location,
    changePath?: string,
  ): Promise<void> {
    await this.rows.deletePrefix(path, changePath);
    this.insert(path, value, location, changePath);
  }

  private async remove(path: string, value: unknown, changePath?: string): Promise<void> {
    const kind = getNodeMeta(value)?.kind ?? this.policy.decideKind(path, value, depth(path));
    if (kind <= NodeKind.Json) await this.rows.deleteLeaf(path, changePath);
    else await this.rows.deletePrefix(path, changePath);
  }

  async diff(
    path: string,
    prev: unknown,
    next: unknown,
    location: Location,
    changePath?: string,
  ): Promise<void> {
    if (prev === next) return;
    const kind = this.policy.decideKind(path, next, depth(path));
    const meta = getNodeMeta(prev);
    const prevKind = meta?.kind ?? this.policy.decideKind(path, prev, depth(path));
    if (
      kind !== prevKind ||
      (typeof prev === 'object' && prev !== null && (!meta || meta.path !== path))
    ) {
      await this.replace(path, next, location, changePath);
      return;
    }
    if (kind <= NodeKind.Json) {
      await this.rows.updateValue(path, valueText(next, kind), changePath);
    } else if (kind === NodeKind.Chunked) {
      await this.rows.deleteChunks(path, changePath);
      this.insertChunks(path, next as string, changePath);
    } else if (kind === NodeKind.Arr) {
      await this.diffArray(path, prev as unknown[], next as unknown[], meta!, changePath);
    } else if (kind === NodeKind.Entity) {
      await this.diffEntity(path, prev as EntityValue, next as EntityValue, meta!, changePath);
    } else {
      await this.diffObject(
        path,
        prev as Record<string, unknown>,
        next as Record<string, unknown>,
        meta!,
        false,
        changePath,
      );
    }
  }

  private async diffObject(
    path: string,
    prev: Record<string, unknown>,
    next: Record<string, unknown>,
    meta: NodeMeta,
    entity: boolean,
    changePath?: string,
  ): Promise<void> {
    const keys = (value: Record<string, unknown>) =>
      Object.keys(value).filter((key) => !entity || (key !== 'ids' && key !== 'entities'));
    const previousKeys = keys(prev);
    let lastPos = 0;
    for (const pos of meta.childPos!.values()) lastPos = Math.max(lastPos, pos);
    for (const key of previousKeys) {
      if (!Object.hasOwn(next, key)) await this.remove(childPath(path, key), prev[key], changePath);
    }
    for (const key of keys(next)) {
      if (!Object.hasOwn(prev, key)) {
        this.insert(childPath(path, key), next[key], { parent: path, pos: ++lastPos }, changePath);
      } else if (prev[key] !== next[key]) {
        await this.diff(
          childPath(path, key),
          prev[key],
          next[key],
          { parent: path, pos: meta.childPos!.get(escapeSegment(key))! },
          changePath,
        );
      }
    }
  }

  private async diffArray(
    path: string,
    prev: unknown[],
    next: unknown[],
    meta: NodeMeta,
    changePath?: string,
  ): Promise<void> {
    const matches = matchElements(prev, next);
    const matched = new Set(matches);
    const oldPositions = meta.elementIds!.map((id) => meta.childPos!.get(id)!);
    const positions = reorderedPositions(matches, oldPositions);
    const leaves: string[] = [];
    for (let i = 0; i < prev.length; i++) {
      if (matched.has(i)) continue;
      const child = `${path}/${meta.elementIds![i]}`;
      const kind =
        getNodeMeta(prev[i])?.kind ?? this.policy.decideKind(child, prev[i], depth(child));
      if (kind <= NodeKind.Json) leaves.push(child);
      else await this.remove(child, prev[i], changePath);
    }
    await this.rows.deleteLeaves(leaves, changePath);
    for (let i = 0; i < next.length; i++) {
      const old = matches[i];
      if (old < 0)
        this.insert(
          `${path}/${newElementId()}`,
          next[i],
          { parent: path, pos: positions[i] },
          changePath,
        );
      else if (positions[i] !== oldPositions[old]) {
        await this.rows.updatePosition(
          `${path}/${meta.elementIds![old]}`,
          positions[i],
          changePath,
        );
      }
    }
  }

  private async diffEntity(
    path: string,
    prev: EntityValue,
    next: EntityValue,
    meta: NodeMeta,
    changePath?: string,
  ): Promise<void> {
    const oldIds = prev.ids.map(encodeEntityId);
    const nextIds = next.ids.map(encodeEntityId);
    const oldIndex = new Map(oldIds.map((id, i) => [id, i]));
    const matches = nextIds.map((id) => oldIndex.get(id) ?? -1);
    const oldPositions = prev.ids.map((id) => meta.entityPos!.get(id)!);
    const order = getEntityOrder(next);
    const positions = order
      ? next.ids.map((id) => order.positions.get(id)!)
      : reorderedPositions(matches, oldPositions);
    const kept = new Set(nextIds);
    const removed: string[] = [];
    const updated: EntityRow[] = [];
    for (let i = 0; i < oldIds.length; i++) {
      if (kept.has(oldIds[i])) continue;
      if (serializedSize(prev.entities[String(prev.ids[i])]) > this.policy.rowCap) {
        await this.rows.deletePrefix(entityValuePath(path, oldIds[i]), changePath ?? path);
      }
      removed.push(oldIds[i]);
    }
    if (removed.length)
      await this.rows.deleteEntities(path, nextIds.length === 0 ? undefined : removed);
    for (let i = 0; i < nextIds.length; i++) {
      const id = nextIds[i];
      const data = next.entities[String(next.ids[i])];
      const entityPath = entityValuePath(path, id);
      const oversized = serializedSize(data, entityPath) > this.policy.rowCap;
      const old = matches[i];
      if (old < 0) {
        this.rows.insertEntity({
          coll: path,
          id,
          pos: positions[i],
          sortkey: order?.keys.get(id),
          data: oversized ? '' : JSON.stringify(data),
        });
        if (oversized)
          this.insert(entityPath, data, { parent: path, pos: null }, changePath ?? path);
      } else {
        const sortkey = order?.keys.get(id);
        const keyChanged = sortkey != null && sortkey !== getEntityOrder(prev)?.keys.get(id);
        let dataUpdated = false;
        const oldData = prev.entities[String(prev.ids[old])];
        if (oldData !== data) {
          const wasOversized = serializedSize(oldData) > this.policy.rowCap;
          if (wasOversized && oversized) {
            await this.diff(
              entityPath,
              oldData,
              data,
              { parent: path, pos: null },
              changePath ?? path,
            );
          } else {
            if (wasOversized) await this.rows.deletePrefix(entityPath, changePath ?? path);
            if (oversized)
              this.insert(entityPath, data, { parent: path, pos: null }, changePath ?? path);
            dataUpdated = true;
            updated.push({
              coll: path,
              id,
              pos: positions[i],
              sortkey: sortkey ?? getEntityOrder(prev)?.keys.get(id),
              data: oversized ? '' : JSON.stringify(data),
            });
          }
        }
        if (!dataUpdated) {
          if (keyChanged) await this.rows.updateEntitySortKey(path, id, sortkey!);
          if (positions[i] !== oldPositions[old])
            await this.rows.updateEntityPosition(path, id, positions[i]);
        }
      }
    }
    if (updated.length === 1) {
      const row = updated[0];
      await this.rows.updateEntity(path, row.id, row.data);
      const old = oldIndex.get(row.id)!;
      if (row.sortkey != null && row.sortkey !== getEntityOrder(prev)?.keys.get(row.id))
        await this.rows.updateEntitySortKey(path, row.id, row.sortkey);
      if (row.pos !== oldPositions[old])
        await this.rows.updateEntityPosition(path, row.id, row.pos);
    } else if (updated.length) {
      const orderChanges = new Set(
        updated
          .filter(
            (row) =>
              row.pos !== oldPositions[oldIndex.get(row.id)!] ||
              (row.sortkey ?? null) !== (getEntityOrder(prev)?.keys.get(row.id) ?? null),
          )
          .map((row) => row.id),
      );
      await this.rows.writeEntityRows(updated, true, orderChanges);
    }
    await this.diffObject(path, prev, next, meta, true, changePath);
  }
}

async function location(exec: SqlExecutor, path: string): Promise<Location> {
  const [existing] = await exec.query<Location>('SELECT parent, pos FROM nss_node WHERE path = ?', [
    path,
  ]);
  return existing ?? { parent: path.includes('/') ? parentPath(path) : null, pos: null };
}

export async function writeSubtree(
  exec: SqlExecutor,
  path: string,
  value: unknown,
  changes: ChangeSet,
  policy = new StoragePolicy(),
): Promise<void> {
  policy.decideKind(path, value, depth(path));
  const writer = new SubtreeWriter(new RowWriter(exec, changes, policy.rowCap), policy);
  await writer.replace(path, value, await location(exec, path));
  await writer.rows.flush();
}

export async function diffWrite(
  exec: SqlExecutor,
  path: string,
  prev: unknown,
  next: unknown,
  changes: ChangeSet,
  policy = new StoragePolicy(),
  knownLocation?: Location,
): Promise<void> {
  if (prev === next) return;
  if (
    prev === undefined ||
    (prev !== null &&
      typeof prev === 'object' &&
      (!getNodeMeta(prev) || getNodeMeta(prev)!.path !== path))
  ) {
    await writeSubtree(exec, path, next, changes, policy);
    return;
  }
  policy.decideKind(path, next, depth(path));
  const writer = new SubtreeWriter(new RowWriter(exec, changes, policy.rowCap), policy);
  await writer.diff(path, prev, next, knownLocation ?? (await location(exec, path)));
  await writer.rows.flush();
}

export async function deleteSubtree(
  exec: SqlExecutor,
  path: string,
  changes: ChangeSet,
): Promise<void> {
  await new RowWriter(exec, changes, 1_048_576).deletePrefix(path);
}
