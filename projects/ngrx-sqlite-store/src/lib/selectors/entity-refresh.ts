import { NodeKind } from '../schema/kinds';
import { EntityPositions } from '../schema/entity-positions';
import { committedWrites } from '../storage/committed-writes';
import { brandEntityState } from '../schema/entity-brand';
import type { EntityValue } from '../schema/entity-brand';
import { getEntityOrder, setEntityOrder } from '../schema/entity-order';
import { decodeEntityId, encodeEntityId } from '../schema/ids';
import { getNodeMeta, setNodeMeta } from '../schema/meta';
import { entityValuePath } from '../schema/node-reader';
import type { NodeStore } from '../schema/node-store';
import type { EntityRow } from '../schema/row-writer';
import { escapeSegment, isAncestorOrSelf, unescapeSegment } from '../storage/path';
import type { SqlExecutor } from '../storage/storage-engine';
import { share } from './view-state';
import type { ChangeSet } from '../storage/change-set';

/** Undefined means an order, scalar, promoted or whole-container change needs the normal reader. */
export async function refreshEntities(
  sql: SqlExecutor,
  nodes: NodeStore,
  coll: string,
  previous: EntityValue,
  changes: ChangeSet,
  replaced: ReadonlySet<string>,
): Promise<EntityValue | undefined> {
  const known = committedWrites(changes);
  const rowsWritten = known.entities.get(coll);
  const removed = known.removed.get(coll);
  const orderChanged = changes.paths().includes(`${coll}/#order`);
  const ids = new Set<string>();
  if (changes.physicalOverlaps(coll)) return undefined;
  for (const path of changes.paths()) {
    if (isAncestorOrSelf(path, coll)) return undefined;
    if (!isAncestorOrSelf(coll, path)) continue;
    const suffix = path.slice(coll.length + 1);
    if (suffix === '#order') continue;
    if (suffix.includes('/') || !/^[sn]:/.test(suffix)) return undefined;
    ids.add(unescapeSegment(suffix));
  }
  if (!ids.size) return undefined;
  if (orderChanged) {
    // Membership/order can be reconstructed only when every changed row is known.
    if ([...ids].some((id) => !rowsWritten?.has(id) && !removed?.has(id))) return undefined;
    const entities = { ...previous.entities };
    const hints = new Set(replaced);
    const order = getEntityOrder(previous)!;
    const positions = new Map(previous.ids.map((id) => [id, order.positions.get(id)!] as const));
    const keys = new Map(order.keys);
    for (const id of removed ?? []) {
      delete entities[String(decodeEntityId(id))];
      positions.delete(decodeEntityId(id));
      keys.delete(id);
    }
    for (const id of ids) {
      const row = rowsWritten?.get(id);
      if (!row) continue;
      const decoded = decodeEntityId(id);
      if (row.insertOnly && positions.has(decoded)) continue;
      if (row.data === '') return undefined;
      hints.add(`${coll}/entities/${escapeSegment(String(decoded))}`);
      Object.defineProperty(entities, String(decoded), {
        value: share(previous.entities[String(decoded)], JSON.parse(row.data), new Set(['']), ''),
        enumerable: true,
        configurable: true,
        writable: true,
      });
      if (!row.keepOrder || !positions.has(decoded)) {
        positions.set(decoded, row.pos);
        if (row.sortkey == null) keys.delete(id);
        else keys.set(id, row.sortkey);
      }
    }
    const sorted = [...positions.keys()].sort((a, b) => {
      const left = keys.get(encodeEntityId(a)) ?? '',
        right = keys.get(encodeEntityId(b)) ?? '';
      return left < right ? -1 : left > right ? 1 : positions.get(a)! - positions.get(b)!;
    });
    const packed = new EntityPositions(positions);
    const orderedEntities = Object.fromEntries(
      sorted.map((id) => [String(id), entities[String(id)]]),
    );
    const next = brandEntityState({
      ...previous,
      ids: sorted,
      entities: Object.freeze(orderedEntities),
    });
    Object.freeze(sorted);
    setNodeMeta(next, { ...getNodeMeta(previous)!, entityPos: packed });
    setNodeMeta(next.ids, { path: `${coll}/ids`, kind: NodeKind.Json });
    setNodeMeta(orderedEntities, { path: `${coll}/entities`, kind: NodeKind.Json });
    setEntityOrder(next, { positions: packed, keys });
    return share(previous, next, hints, coll) as EntityValue;
  }
  const entities = { ...previous.entities };
  const allIds = [...ids];
  for (let i = 0; i < allIds.length; i += 998) {
    const batch = allIds.slice(i, i + 998);
    const known = committedWrites(changes).entities.get(coll);
    const missing = batch.filter((id) => !known?.has(id));
    const rows = [
      ...batch.flatMap((id) => (known?.has(id) ? [known.get(id)!] : [])),
      ...(missing.length
        ? await sql.query<EntityRow>(
            `SELECT coll,id,pos,data,sortkey FROM nss_entity WHERE coll = ? AND id IN (${missing.map(() => '?').join(',')})`,
            [coll, ...missing],
          )
        : []),
    ];
    // Membership changes must carry #order. Defensively use the full reader if
    // custom internal writers violate that invariant.
    if (
      rows.length !== batch.length ||
      rows.some((row) => !Object.hasOwn(entities, String(decodeEntityId(row.id))))
    )
      return undefined;
    for (const row of rows) {
      const id = String(decodeEntityId(row.id));
      const path = entityValuePath(coll, row.id);
      const next = row.data === '' ? await nodes.read(sql, path) : JSON.parse(row.data);
      const hints = new Set(replaced);
      // An explicit element write replaces that entity even for equal JSON.
      // Generic reducer hints use logical entities keys, not physical ~2 paths.
      hints.add(path);
      const logical = `${coll}/entities/${escapeSegment(id)}`;
      for (const hint of replaced)
        if (isAncestorOrSelf(logical, hint)) hints.add(path + hint.slice(logical.length));
      Object.defineProperty(entities, id, {
        value: share(previous.entities[id], next, hints, path),
        enumerable: true,
      });
    }
  }
  const next = brandEntityState({
    ...previous,
    ids: previous.ids,
    entities: Object.freeze(entities),
  });
  const entitiesMeta = getNodeMeta(previous.entities);
  if (entitiesMeta) setNodeMeta(entities, entitiesMeta);
  setNodeMeta(next, getNodeMeta(previous)!);
  const order = getEntityOrder(previous);
  if (order) setEntityOrder(next, order);
  return Object.freeze(next);
}
