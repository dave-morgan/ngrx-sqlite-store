import { brandEntityState } from '../schema/entity-brand';
import type { EntityValue } from '../schema/entity-brand';
import { getEntityOrder, setEntityOrder } from '../schema/entity-order';
import { decodeEntityId } from '../schema/ids';
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
  const ids = new Set<string>();
  if (changes.physicalOverlaps(coll)) return undefined;
  for (const path of changes.paths()) {
    if (isAncestorOrSelf(path, coll)) return undefined;
    if (!isAncestorOrSelf(coll, path)) continue;
    const suffix = path.slice(coll.length + 1);
    if (suffix.includes('/') || !/^[sn]:/.test(suffix)) return undefined;
    ids.add(unescapeSegment(suffix));
  }
  if (!ids.size) return undefined;
  const entities = { ...previous.entities };
  const allIds = [...ids];
  for (let i = 0; i < allIds.length; i += 998) {
    const batch = allIds.slice(i, i + 998);
    const rows = await sql.query<EntityRow>(
      `SELECT coll,id,pos,data,sortkey FROM nss_entity WHERE coll = ? AND id IN (${batch.map(() => '?').join(',')})`,
      [coll, ...batch],
    );
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
