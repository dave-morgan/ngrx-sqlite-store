import type { SqlValue } from '../driver/sql-driver';
import type { ChangeSet } from '../storage/change-set';
import { subtreeRange } from '../storage/path';
import type { SqlExecutor } from '../storage/storage-engine';
import { RowCapExceededError } from './errors';
import type { NodeKind } from './kinds';
import { utf8ByteLength } from './utf8';

export interface NodeRow {
  path: string;
  parent: string | null;
  kind: NodeKind;
  pos: number | null;
  value: string | null;
}
export interface EntityRow {
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
    this.insert('nss_entity', ['coll', 'id', 'pos', 'data'], [row.coll, row.id, row.pos, row.data]);
    this.changes.add(row.coll);
  }

  async flush(): Promise<void> {
    for (const [table, { columns, rows }] of this.pending) {
      const batchSize = Math.floor(999 / columns.length);
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const placeholders = batch.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
        await this.exec.run(
          `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`,
          batch.flat(),
        );
      }
    }
    this.pending.clear();
  }

  async updateValue(path: string, value: string | null, changePath = path): Promise<void> {
    this.check(path, value);
    await this.flush();
    await this.exec.run('UPDATE nss_node SET value = ? WHERE path = ?', [value, path]);
    this.changes.add(changePath);
  }

  async updatePosition(path: string, pos: number, changePath = path): Promise<void> {
    await this.flush();
    await this.exec.run('UPDATE nss_node SET pos = ? WHERE path = ?', [pos, path]);
    this.changes.add(changePath);
  }

  async updateEntity(coll: string, id: string, data: string): Promise<void> {
    this.check(coll, data);
    await this.flush();
    await this.exec.run('UPDATE nss_entity SET data = ? WHERE coll = ? AND id = ?', [
      data,
      coll,
      id,
    ]);
    this.changes.add(coll);
  }

  async updateEntityPosition(coll: string, id: string, pos: number): Promise<void> {
    await this.flush();
    await this.exec.run('UPDATE nss_entity SET pos = ? WHERE coll = ? AND id = ?', [pos, coll, id]);
    this.changes.add(coll);
  }

  async deleteEntity(coll: string, id: string): Promise<void> {
    await this.flush();
    await this.exec.run('DELETE FROM nss_entity WHERE coll = ? AND id = ?', [coll, id]);
    this.changes.add(coll);
  }

  async deleteLeaf(path: string, changePath = path): Promise<void> {
    await this.flush();
    await this.exec.run('DELETE FROM nss_node WHERE path = ?', [path]);
    this.changes.add(changePath);
  }

  async deleteChunks(path: string, changePath = path): Promise<void> {
    await this.flush();
    await this.exec.run('DELETE FROM nss_chunk WHERE path = ?', [path]);
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
      await this.exec.run(
        `DELETE FROM ${table} WHERE ${column} = ? OR (${column} >= ? AND ${column} < ?)`,
        [path, lower, upper],
      );
    }
    this.changes.add(changePath);
  }
}
