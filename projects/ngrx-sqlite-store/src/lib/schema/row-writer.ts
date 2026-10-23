import { committedWrites } from '../storage/committed-writes';
import { entityChanges } from '../storage/entity-changes';
import { BATCH_BYTE_BUDGET, statementByteLength } from '../driver/batch-budget';
import type { SqlValue } from '../driver/sql-driver';
import type { ChangeSet } from '../storage/change-set';
import { escapeSegment, subtreeRange } from '../storage/path';
import type { SqlExecutor } from '../storage/storage-engine';
import { RowCapExceededError } from './errors';
import type { NodeKind } from './kinds';
import { utf8ByteLength } from './utf8';
import { serializedStringSize } from './size';

/** Preserve lexical whitespace and avoid adding depth to JSON1's parser limit. */
function needsStringEnvelope(data: string): boolean {
  let quoted = false;
  let depth = 0;
  for (let index = 0; index < data.length; index++) {
    const char = data[index];
    if (quoted && char === '\\') index++;
    else if (char === '"') quoted = !quoted;
    else if (!quoted) {
      if (char === ' ' || char === '\n' || char === '\r' || char === '\t') return true;
      if (char === '[' || char === '{') {
        if (++depth > 900) return true;
      } else if (char === ']' || char === '}') depth--;
    }
  }
  return false;
}

export interface NodeRow {
  path: string;
  parent: string | null;
  kind: NodeKind;
  pos: number | null;
  value: string | null;
}
export interface EntityRow {
  sortkey?: string | null;
  coll: string;
  id: string;
  pos: number;
  data: string;
}

/** The sole mutation boundary for all three schema tables. */
export class RowWriter {
  private readonly pending = new Map<string, { columns: string[]; rows: SqlValue[][] }>();

  constructor(
    private readonly exec: SqlExecutor,
    private readonly changes: ChangeSet,
    readonly rowCap: number,
  ) {}

  private async write(sql: string, params?: SqlValue[]): Promise<void> {
    if (this.exec.write) await this.exec.write(sql, params);
    else await this.exec.run(sql, params);
  }

  private check(path: string, value: string | null): void {
    if (value === null) return;
    const bytes = utf8ByteLength(value);
    if (bytes > this.rowCap) throw new RowCapExceededError(path, bytes, this.rowCap);
  }

  private insert(table: string, columns: string[], row: SqlValue[]): void {
    let batch = this.pending.get(table);
    if (!batch) {
      batch = { columns, rows: [] };
      this.pending.set(table, batch);
    }
    batch.rows.push(row);
  }

  insertNode(row: NodeRow, changePath = row.path): void {
    this.check(row.path, row.value);
    this.insert(
      'nss_node',
      ['path', 'parent', 'kind', 'pos', 'value'],
      [row.path, row.parent, row.kind, row.pos, row.value],
    );
    this.changes.add(changePath);
  }

  insertChunk(path: string, seq: number, data: string, changePath = path): void {
    this.check(path, data);
    this.insert('nss_chunk', ['path', 'seq', 'data'], [path, seq, data]);
    this.changes.add(changePath);
  }

  insertEntity(row: EntityRow): void {
    this.check(row.coll, row.data);
    this.check(row.coll, row.sortkey ?? null);
    this.insert(
      'nss_entity',
      ['coll', 'id', 'pos', 'data', 'sortkey'],
      [row.coll, row.id, row.pos, row.data, row.sortkey ?? null],
    );
    this.changes.addEntity(row.coll, row.id);
    this.changes.addEntityOrder(row.coll);
  }

  async flush(): Promise<void> {
    for (const [table, { columns, rows }] of this.pending) {
      for (const batch of this.insertBatches(
        rows,
        `INSERT INTO ${table} (${columns.join(',')}) VALUES `,
        '',
        (row) => row,
      )) {
        await this.write(batch.sql, batch.params);
      }
    }
    this.pending.clear();
  }

  /** Size rows once, retaining only one bind/byte-bounded SQL group at a time. */
  private *insertBatches<T>(
    rows: readonly T[],
    prefix: string,
    suffix: string,
    values: (row: T) => SqlValue[],
    canonicalJson = false,
  ): Generator<{ sql: string; params: SqlValue[]; rows: T[] }> {
    if (rows.length && rows.length > Math.floor(999 / values(rows[0]).length)) {
      yield* this.jsonInsertBatches(rows, prefix, suffix, values, canonicalJson);
      return;
    }
    let index = 0;
    while (index < rows.length) {
      const group: T[] = [];
      const params: SqlValue[] = [];
      const placeholders: string[] = [];
      let bytes = statementByteLength(prefix + suffix) + 2;
      while (index < rows.length) {
        const row = rows[index];
        const fields = values(row);
        const placeholder = `(${fields.map(() => '?').join(',')})`;
        const addedBytes =
          utf8ByteLength(JSON.stringify(fields)) - 2 + placeholder.length + (group.length ? 2 : 0);
        if (
          group.length &&
          (params.length + fields.length > 999 || bytes + addedBytes > BATCH_BYTE_BUDGET)
        ) break;
        group.push(row);
        params.push(...fields);
        placeholders.push(placeholder);
        bytes += addedBytes;
        index++;
      }
      yield { sql: prefix + placeholders.join(',') + suffix, params, rows: group };
    }
  }

  private *jsonInsertBatches<T>(
    rows: readonly T[],
    prefix: string,
    suffix: string,
    values: (row: T) => SqlValue[],
    canonicalJson: boolean,
  ): Generator<{ sql: string; params: SqlValue[]; rows: T[] }> {
    const entityData = /^INSERT INTO nss_entity\b/.test(prefix);
    const firstFields = values(rows[0]);
    const sharedCollection = entityData && rows.every((row) => values(row)[0] === firstFields[0]);
    const columns = firstFields.map((_, index) =>
      sharedCollection && index === 0 ? '?' : `json_extract(value,'$[${index - (sharedCollection ? 1 : 0)}]')`,
    );
    const dataIndex = sharedCollection ? 2 : 3;
    if (entityData) columns[3] = `COALESCE(value -> '$[${dataIndex}][0]',json_extract(value,'$[${dataIndex}]'),'')`;
    const sql = prefix.replace(/VALUES\s*$/, '') +
      `SELECT ${columns.join(',')} FROM json_each(?) WHERE 1${suffix}`;
    const bindings: SqlValue[] = sharedCollection ? [firstFields[0]] : [];
    const framingBytes = statementByteLength(sql, [...bindings, '[]']) + 2;
    let index = 0;
    while (index < rows.length) {
      const group: T[] = [];
      const encoded: string[] = [];
      let bytes = framingBytes;
      while (index < rows.length) {
        const row = rows[index];
        const fields = values(row);
        let json: string;
        if (entityData) {
          const data = fields[3] as string;
          let encodedData = 'null';
          if (data) {
            try {
              // EntityTx already validated this state before JSON.stringify.
              // Keep the depth/envelope scan and hard row cap on both paths.
              if (!canonicalJson) JSON.parse(data);
              // JSON.stringify output has no insignificant whitespace, and nesting
              // deeper than 900 needs at least 1802 characters: skip the scan.
              const envelope = canonicalJson && data.length < 1802 ? false : needsStringEnvelope(data);
              encodedData = envelope ? JSON.stringify(data) : `[${data}]`;
            } catch {
              // RowWriter also accepts opaque data; SQL must preserve its text.
              encodedData = JSON.stringify(data);
            }
          }
          // Missing trailing sortkey extracts as SQL NULL. Keep mixed collections
          // in their original order instead of splitting them into tiny groups.
          const collection = sharedCollection ? '' : `${JSON.stringify(fields[0])},`;
          const sortkey = fields[4] === null ? '' : `,${JSON.stringify(fields[4])}`;
          json = `[${collection}${JSON.stringify(fields[1])},${JSON.stringify(fields[2])},${encodedData}${sortkey}]`;
        } else json = JSON.stringify(fields);
        // Bound the second JSON encoding used for the native string binding.
        const addedBytes = serializedStringSize(json) - 2 + (group.length ? 1 : 0);
        if (group.length && bytes + addedBytes > BATCH_BYTE_BUDGET) break;
        encoded.push(json);
        group.push(row);
        bytes += addedBytes;
        index++;
      }
      yield { sql, params: [...bindings, `[${encoded.join(',')}]`], rows: group };
    }
  }

  async updateValue(path: string, value: string | null, changePath = path): Promise<void> {
    this.check(path, value);
    await this.flush();
    await this.write('UPDATE nss_node SET value = ? WHERE path = ?', [value, path]);
    this.changes.add(changePath);
  }

  async updatePosition(path: string, pos: number, changePath = path): Promise<void> {
    await this.flush();
    await this.write('UPDATE nss_node SET pos = ? WHERE path = ?', [pos, path]);
    this.changes.add(changePath);
  }

  async updateEntity(coll: string, id: string, data: string): Promise<void> {
    this.check(coll, data);
    await this.flush();
    await this.write('UPDATE nss_entity SET data = ? WHERE coll = ? AND id = ?', [data, coll, id]);
    const previous = committedWrites(this.changes).entities.get(coll)?.get(id);
    const unknownOrder = !previous && this.changes.overlaps(`${coll}/${escapeSegment(id)}`);
    this.changes.addEntity(coll, id);
    if (unknownOrder) return;
    const known = committedWrites(this.changes).entities;
    let rows = known.get(coll);
    if (!rows) {
      rows = new Map();
      known.set(coll, rows);
    }
    rows.set(id, {
      coll,
      id,
      data,
      pos: previous?.pos ?? 0,
      sortkey: previous?.sortkey,
      keepOrder: previous?.keepOrder ?? previous?.insertOnly ?? true,
    });
  }

  async writeEntityRows(
    rows: EntityRow[],
    upsert: boolean,
    orderChanges?: ReadonlySet<string>,
    collectionReplacement = false,
    options: { canonicalJson?: boolean } = {},
  ): Promise<void> {
    for (const row of rows) {
      this.check(row.coll, row.data);
      this.check(row.coll, row.sortkey ?? null);
    }
    await this.flush();
    for (const batch of this.insertBatches(
      rows,
      'INSERT INTO nss_entity (coll,id,pos,data,sortkey) VALUES ',
      ` ON CONFLICT(coll,id) DO ${upsert ? 'UPDATE SET data = excluded.data, pos = excluded.pos, sortkey = excluded.sortkey' : 'NOTHING'}`,
      ({ coll, id, pos, data, sortkey }) => [coll, id, pos, data, sortkey ?? null],
      options.canonicalJson,
    )) {
      await this.write(batch.sql, batch.params);
      if (collectionReplacement) continue;
      for (const row of batch.rows) {
        const journal = committedWrites(this.changes);
        const previous = journal.entities.get(row.coll)?.get(row.id);
        const unknown =
          !previous &&
          !journal.removed.get(row.coll)?.has(row.id) &&
          this.changes.overlaps(`${row.coll}/${escapeSegment(row.id)}`);
        this.changes.addEntity(row.coll, row.id);
        if (!orderChanges || orderChanges.has(row.id)) this.changes.addEntityOrder(row.coll);
        {
          const known = committedWrites(this.changes).entities;
          let rows = known.get(row.coll);
          if (!rows) {
            rows = new Map();
            known.set(row.coll, rows);
          }
          if (upsert || !unknown)
            rows.set(row.id, !upsert && previous ? previous : { ...row, insertOnly: !upsert });
        }
      }
    }
  }

  async updateEntitySortKey(coll: string, id: string, sortkey: string): Promise<void> {
    this.check(coll, sortkey);
    await this.flush();
    await this.write('UPDATE nss_entity SET sortkey = ? WHERE coll = ? AND id = ?', [
      sortkey,
      coll,
      id,
    ]);
    this.changes.addEntity(coll, id);
    this.changes.addEntityOrder(coll);
  }

  async deleteEntities(
    coll: string,
    ids?: readonly string[],
    beforeChange?: (row: { id: string; data: string }) => () => void,
  ): Promise<{ id: string; data: string }[]> {
    await this.flush();
    const deleted: { id: string; data: string }[] = [];
    const batches =
      ids === undefined
        ? [undefined]
        : Array.from({ length: Math.ceil(ids.length / 998) }, (_, index) =>
            ids.slice(index * 998, (index + 1) * 998),
          );
    for (const batch of batches) {
      deleted.push(
        ...(await this.exec.query<{ id: string; data: string }>(
          `DELETE FROM nss_entity WHERE coll = ?${batch ? ` AND id IN (${batch.map(() => '?').join(',')})` : ''} RETURNING id,data`,
          [coll, ...(batch ?? [])],
        )),
      );
    }
    for (const row of deleted) {
      const afterChange = beforeChange?.(row);
      this.changes.addEntity(coll, row.id);
      afterChange?.();
    }
    if (deleted.length) {
      const known = committedWrites(this.changes);
      let removed = known.removed.get(coll);
      if (!removed) {
        removed = new Set();
        known.removed.set(coll, removed);
      }
      for (const row of deleted) removed.add(row.id);
    }
    if (deleted.length) this.changes.addEntityOrder(coll);
    return deleted;
  }

  /** Delete entity data and promoted entity subtrees, preserving collection extras. */
  async clearEntities(coll: string): Promise<void> {
    await this.flush();
    const lower = `${coll}/~2`;
    const upper = `${coll}/~3`;
    for (const [table, column] of [['nss_node', 'path'], ['nss_chunk', 'path'], ['nss_entity', 'coll']]) {
      await this.write(
        `DELETE FROM ${table} WHERE ${column} >= ? AND ${column} < ?${table === 'nss_entity' ? ' OR coll = ?' : ''}`,
        table === 'nss_entity' ? [lower, upper, coll] : [lower, upper],
      );
    }
    this.changes.add(coll);
    for (const key of entityChanges(this.changes).keys())
      if (key === coll || (key >= lower && key < upper)) entityChanges(this.changes).delete(key);
  }

  async updateEntityPosition(coll: string, id: string, pos: number): Promise<void> {
    await this.flush();
    await this.write('UPDATE nss_entity SET pos = ? WHERE coll = ? AND id = ?', [pos, coll, id]);
    this.changes.addEntity(coll, id);
    this.changes.addEntityOrder(coll);
  }

  async deleteEntity(coll: string, id: string): Promise<void> {
    await this.flush();
    await this.write('DELETE FROM nss_entity WHERE coll = ? AND id = ?', [coll, id]);
    this.changes.addEntity(coll, id);
    this.changes.addEntityOrder(coll);
  }

  async deleteLeaf(path: string, changePath = path): Promise<void> {
    await this.flush();
    await this.write('DELETE FROM nss_node WHERE path = ?', [path]);
    this.changes.add(changePath);
  }

  async deleteLeaves(paths: readonly string[], changePath?: string): Promise<void> {
    await this.flush();
    for (let i = 0; i < paths.length; i += 900) {
      const batch = paths.slice(i, i + 900);
      await this.write(
        `DELETE FROM nss_node WHERE path IN (${batch.map(() => '?').join(',')})`,
        batch,
      );
      for (const path of batch) this.changes.add(changePath ?? path);
    }
  }

  async deleteChunks(path: string, changePath = path): Promise<void> {
    await this.flush();
    await this.write('DELETE FROM nss_chunk WHERE path = ?', [path]);
    this.changes.add(changePath);
  }

  async deletePrefix(path: string, changePath = path): Promise<void> {
    await this.flush();
    const [lower, upper] = subtreeRange(path);
    for (const [table, column] of [
      ['nss_node', 'path'],
      ['nss_chunk', 'path'],
      ['nss_entity', 'coll'],
    ]) {
      await this.write(
        `DELETE FROM ${table} WHERE ${column} = ? OR (${column} >= ? AND ${column} < ?)`,
        [path, lower, upper],
      );
    }
    this.changes.add(changePath);
  }
}
