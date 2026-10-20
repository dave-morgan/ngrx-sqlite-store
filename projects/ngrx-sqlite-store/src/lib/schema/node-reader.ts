import { isDevMode } from '@angular/core';
import { escapeSegment, subtreeRange, unescapeSegment } from '../storage/path';
import type { SqlExecutor } from '../storage/storage-engine';
import { brandEntityState } from './entity-brand';
import { getEntityOrder, setEntityOrder } from './entity-order';
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

async function assemble(
  exec: Pick<SqlExecutor, 'query'>,
  path: string,
  rows: NodeRow[],
): Promise<unknown | undefined> {
  if (!rows.some((row) => row.path === path)) return undefined;
  const [lower, upper] = subtreeRange(path);
  const entities = await exec.query<EntityRow>(
    'SELECT coll, id, pos, data, sortkey FROM nss_entity WHERE (coll >= ? AND coll < ?) OR coll = ? ORDER BY coll, sortkey, pos',
    [lower, upper, path],
  );
  const chunks = await exec.query<{ path: string; seq: number; data: string }>(
    'SELECT path, seq, data FROM nss_chunk WHERE path = ? OR (path >= ? AND path < ?) ORDER BY path, seq',
    [path, lower, upper],
  );
  const chunkData = new Map<string, string[]>();
  for (const chunk of chunks) {
    const parts = chunkData.get(chunk.path) ?? [];
    parts.push(chunk.data);
    chunkData.set(chunk.path, parts);
  }
  const values = new Map<string, unknown>();
  const metas = new Map<string, NodeMeta>();
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
        setEntityOrder(entity, { positions: new Map(), keys: new Map() });
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
        if (row.kind === NodeKind.Entity) meta.entityPos = new Map();
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
    getEntityOrder(value)!.positions.set(row.id, row.pos);
    getEntityOrder(value)!.keys.set(row.id, row.sortkey ?? null);
    const data =
      row.data === '' ? values.get(entityValuePath(row.coll, row.id)) : JSON.parse(row.data);
    if (row.data !== '') attachJsonMeta(data, entityValuePath(row.coll, row.id));
    setKey(value.entities, String(id), data);
    metas.get(row.coll)!.entityPos!.set(row.id, row.pos);
  }
  const result = values.get(path);
  if (isDevMode()) freeze(result);
  return result;
}

export async function readSubtree(
  exec: Pick<SqlExecutor, 'query'>,
  path: string,
): Promise<unknown | undefined> {
  const [lower, upper] = subtreeRange(path);
  const rows = await exec.query<NodeRow>(
    'SELECT path, parent, kind, pos, value FROM nss_node WHERE path = ? OR (path >= ? AND path < ?) ORDER BY parent, pos',
    [path, lower, upper],
  );
  return assemble(exec, path, rows);
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
  return assemble(exec, path, rows);
}
