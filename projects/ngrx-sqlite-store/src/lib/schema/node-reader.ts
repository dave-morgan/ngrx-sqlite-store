import { isDevMode } from '@angular/core';
import { escapeSegment, subtreeRange, unescapeSegment } from '../storage/path';
import type { SqlExecutor } from '../storage/storage-engine';
import { brandEntityState } from './entity-brand';
import { getEntityOrder, setEntityOrder } from './entity-order';
import { EntityPositions } from './entity-positions';
import { decodeEntityId } from './ids';
import { NodeKind } from './kinds';
import { setNodeMeta } from './meta';
import type { NodeMeta } from './meta';
import type { EntityRow, NodeRow } from './row-writer';

/** ~2 cannot occur at the start of a JSON-Pointer escaped object key. */
export function entityValuePath(coll: string, id: string): string {
  return `${coll}/~2${escapeSegment(id)}`;
}

function setKey(object: object, key: string, value: unknown): void {
  // defineProperty also handles __proto__ as an ordinary JSON key.
  Object.defineProperty(object, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

function attachJsonMeta(value: unknown, path: string): void {
  if (!value || typeof value !== 'object') return;
  setNodeMeta(value, { path, kind: NodeKind.Json });
  for (const key of Object.keys(value)) {
    attachJsonMeta((value as Record<string, unknown>)[key], `${path}/${escapeSegment(key)}`);
  }
}

function freeze(value: unknown): void {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) freeze(child);
  Object.freeze(value);
}

function assemble(
  path: string,
  rows: NodeRow[],
  entities: EntityRow[],
  chunks: { path: string; seq: number; data: string }[],
): unknown | undefined {
  if (!rows.some((row) => row.path === path)) return undefined;
  const chunkData = new Map<string, string[]>();
  for (const chunk of chunks) {
    const parts = chunkData.get(chunk.path) ?? [];
    parts.push(chunk.data);
    chunkData.set(chunk.path, parts);
  }
  const values = new Map<string, unknown>();
  const metas = new Map<string, NodeMeta>();
  const positions = new Map<string, Map<string | number, number>>();
  for (const row of rows) {
    let value: unknown;
    switch (row.kind) {
      case NodeKind.Obj:
        value = {};
        break;
      case NodeKind.Arr:
        value = [];
        break;
      case NodeKind.Entity: {
        const entity = brandEntityState({ ids: [], entities: {} });
        const index = new Map<string | number, number>();
        positions.set(row.path, index);
        setEntityOrder(entity, { positions: index, keys: new Map() });
        setNodeMeta(entity.ids, { path: `${row.path}/ids`, kind: NodeKind.Json });
        setNodeMeta(entity.entities, { path: `${row.path}/entities`, kind: NodeKind.Json });
        value = entity;
        break;
      }
      case NodeKind.Null:
        value = null;
        break;
      case NodeKind.Chunked:
        value = JSON.parse(chunkData.get(row.path)!.join(''));
        break;
      default:
        value = JSON.parse(row.value!);
        break;
    }
    values.set(row.path, value);
    if (value && typeof value === 'object') {
      if (row.kind === NodeKind.Json) attachJsonMeta(value, row.path);
      else {
        const meta: NodeMeta = { path: row.path, kind: row.kind, childPos: new Map() };
        if (row.kind === NodeKind.Arr) meta.elementIds = [];
        if (row.kind === NodeKind.Entity)
          meta.entityPos = getEntityOrder(value as object)!.positions;
        setNodeMeta(value, meta);
        metas.set(row.path, meta);
      }
    }
  }
  // Rows are already ordered by (parent, pos); allocated containers allow each
  // child to be linked exactly once without depth sorting or recursive queries.
  for (const row of rows) {
    if (row.path === path || row.parent === null) continue;
    const parent = values.get(row.parent);
    const meta = metas.get(row.parent);
    if (!parent || !meta) continue;
    const segment = row.path.slice(row.parent.length + 1);
    if (meta.kind === NodeKind.Entity && segment.startsWith('~2')) continue;
    meta.childPos!.set(segment, row.pos!);
    if (Array.isArray(parent)) {
      parent.push(values.get(row.path));
      meta.elementIds!.push(segment);
    } else setKey(parent as object, unescapeSegment(segment), values.get(row.path));
  }
  for (const row of entities) {
    const value = values.get(row.coll) as
      { ids: (string | number)[]; entities: Record<string, unknown> } | undefined;
    if (!value) continue;
    const id = decodeEntityId(row.id);
    value.ids.push(id);
    positions.get(row.coll)!.set(id, row.pos);
    if (row.sortkey != null) getEntityOrder(value)!.keys.set(row.id, row.sortkey);
    const data =
      row.data === '' ? values.get(entityValuePath(row.coll, row.id)) : JSON.parse(row.data);
    setKey(value.entities, String(id), data);
  }
  for (const [coll, index] of positions) {
    const packed = new EntityPositions(index);
    metas.get(coll)!.entityPos = packed;
    getEntityOrder(values.get(coll) as object)!.positions = packed;
  }
  const result = values.get(path);
  if (isDevMode()) freeze(result);
  return result;
}

export async function readSubtree(
  exec: Pick<SqlExecutor, 'query'>,
  path: string,
  onRows?: (rows: NodeRow[]) => void,
): Promise<unknown | undefined> {
  const [lower, upper] = subtreeRange(path);
  // Flat UNION rows avoid both extra bridge calls and a giant JSON aggregate.
  const transport = await exec.query<
    | (NodeRow & { source: 0 })
    | (EntityRow & { source: 1 })
    | { path: string; seq: number; data: string; source: 2 }
  >(
    // ADR-0070: `key = ? OR (key >= ? AND key < ?)` plans as MULTI-INDEX OR, which on these
    // WITHOUT ROWID tables cost ~185 ms for an empty 10k-collection lookup on Android; an
    // equality arm plus a disjoint range arm (the path itself is outside [path/, path0))
    // uses the primary key directly (~9 ms). Parameter order is unchanged.
    `SELECT path, parent, kind, pos, value, source, coll, id, data, sortkey, seq FROM (
      SELECT path, parent, kind, pos, value, 0 AS source,
        NULL AS coll, NULL AS id, NULL AS data, NULL AS sortkey, NULL AS seq
      FROM nss_node WHERE path = ?
      UNION ALL
      SELECT path, parent, kind, pos, value, 0, NULL, NULL, NULL, NULL, NULL
      FROM nss_node WHERE path >= ? AND path < ?
      UNION ALL
      SELECT NULL, coll, NULL, pos, NULL, 1, coll, id, data, sortkey, NULL
      FROM nss_entity WHERE coll = ?
      UNION ALL
      SELECT NULL, coll, NULL, pos, NULL, 1, coll, id, data, sortkey, NULL
      FROM nss_entity WHERE coll >= ? AND coll < ?
      UNION ALL
      SELECT path, path, NULL, NULL, NULL, 2, NULL, NULL, data, NULL, seq
      FROM nss_chunk WHERE path = ?
      UNION ALL
      SELECT path, path, NULL, NULL, NULL, 2, NULL, NULL, data, NULL, seq
      FROM nss_chunk WHERE path >= ? AND path < ?
    ) ORDER BY source, parent, sortkey, pos, seq`,
    [path, lower, upper, path, lower, upper, path, lower, upper],
  );
  const nodes = transport.filter((row) => row.source === 0);
  onRows?.(nodes);
  return assemble(
    path,
    nodes,
    transport.filter((row) => row.source === 1),
    transport.filter((row) => row.source === 2),
  );
}

export async function readSubtreeCte(
  exec: Pick<SqlExecutor, 'query'>,
  path: string,
): Promise<unknown | undefined> {
  const rows = await exec.query<NodeRow>(
    `
    WITH RECURSIVE subtree AS (
      SELECT path, parent, kind, pos, value FROM nss_node WHERE path = ?
      UNION ALL
      SELECT n.path, n.parent, n.kind, n.pos, n.value FROM nss_node n
      JOIN subtree s ON n.parent = s.path
    ) SELECT * FROM subtree ORDER BY parent, pos`,
    [path],
  );
  const entities = rows.some((row) => row.kind === NodeKind.Entity)
    ? await exec.query<EntityRow>(
        'SELECT coll,id,pos,data,sortkey FROM nss_entity WHERE coll = ? UNION ALL ' +
          'SELECT coll,id,pos,data,sortkey FROM nss_entity WHERE coll >= ? AND coll < ? ORDER BY coll,sortkey,pos',
        [path, ...subtreeRange(path)],
      )
    : [];
  const chunks = rows.some((row) => row.kind === NodeKind.Chunked)
    ? await exec.query<{ path: string; seq: number; data: string }>(
        'SELECT path,seq,data FROM nss_chunk WHERE path = ? UNION ALL ' +
          'SELECT path,seq,data FROM nss_chunk WHERE path >= ? AND path < ? ORDER BY path,seq',
        [path, ...subtreeRange(path)],
      )
    : [];
  return assemble(path, rows, entities, chunks);
}
