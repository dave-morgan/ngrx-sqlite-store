import { isDevMode } from '@angular/core';
import { getEntityOrder } from '../schema/entity-order';
import { getNodeMeta } from '../schema/meta';
import { NodeKind } from '../schema/kinds';
import type { EntityValue } from '../schema/entity-brand';
import { decodeEntityId, encodeEntityId } from '../schema/ids';
import { entityValuePath } from '../schema/node-reader';
import type { NodeStore } from '../schema/node-store';
import { between } from '../schema/positions';
import { RowWriter } from '../schema/row-writer';
import type { EntityRow } from '../schema/row-writer';
import { serializedSize } from '../schema/size';
import { encodeSortKey } from '../schema/sort-key';
import { RowCapExceededError } from '../schema/errors';
import { utf8ByteLength } from '../schema/utf8';
import type { ChangeSet } from '../storage/change-set';
import type { SqlExecutor } from '../storage/storage-engine';
import { changedFields, entityChanges, recordEntityChange } from '../storage/entity-changes';
import { escapeSegment } from '../storage/path';

const EMPTY_CHANGED_FIELDS: ReadonlySet<string> = new Set<string>();

export type EntityId = string | number;
export interface EntityInput<T> {
  id: EntityId;
  entity: T;
  pos?: number;
}
export interface EntityPageRow<T> {
  id: EntityId;
  entity: T;
  pos: number;
}

function freeze(value: unknown): void {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) freeze(child);
  Object.freeze(value);
}

/** Indexed entity operations on the current transaction's executor. */
export class EntityTx<T> {
  private sortKey?: (entity: T) => string | number;
  private readonly cached = new Map<string, EntityRow | undefined>();
  private readonly writer: RowWriter;
  private snapshot?: EntityValue;
  constructor(
    private readonly sql: SqlExecutor,
    private readonly nodes: NodeStore,
    private readonly changes: ChangeSet,
    private readonly coll: string,
    private readonly onWrite: () => void,
    snapshot?: unknown,
    private readonly committedRow?: (id: string) => EntityRow | undefined,
  ) {
    this.writer = new RowWriter(sql, changes, nodes.policy.rowCap);
    if (getNodeMeta(snapshot)?.kind === NodeKind.Entity && getEntityOrder(snapshot as EntityValue))
      this.snapshot = snapshot as EntityValue;
  }

  invalidate(): void {
    this.cached.clear();
    this.snapshot = undefined;
  }
  async prepareSortKey(sortKey: (entity: T) => string | number): Promise<void> {
    if (this.sortKey === sortKey) return;
    this.sortKey = sortKey;
    const rows = await this.sql.query<EntityRow>(
      'SELECT coll,id,pos,data FROM nss_entity WHERE coll = ? AND sortkey IS NULL ORDER BY pos',
      [this.coll],
    );
    for (const row of rows)
      await this.writer.updateEntitySortKey(this.coll, row.id, this.key(await this.value(row))!);
    if (rows.length) this.changed();
  }
  private key(entity: T): string | undefined {
    if (!this.sortKey) return undefined;
    const encoded = encodeSortKey(this.sortKey(entity));
    return encoded;
  }
  async validateSortKeys(): Promise<void> {
    if (!isDevMode() || !this.sortKey) return;
    // Two index endpoint probes check the final collection, including replacements
    // that legitimately change every row's key type in a single operation.
    const [row] = await this.sql.query<{ first: string | null; last: string | null }>(
      `SELECT (SELECT sortkey FROM nss_entity WHERE coll = ? AND sortkey IS NOT NULL ORDER BY sortkey LIMIT 1) AS first,
       (SELECT sortkey FROM nss_entity WHERE coll = ? AND sortkey IS NOT NULL ORDER BY sortkey DESC LIMIT 1) AS last`,
      [this.coll, this.coll],
    );
    if (row.first?.[0] !== row.last?.[0])
      throw new TypeError('An entity collection cannot mix string and number sort keys');
  }
  private changed(): void {
    this.invalidate();
    this.onWrite();
  }
  private track(id: string): (prev: unknown, next: unknown, reorder?: boolean) => void {
    const earlier = entityChanges(this.changes).get(this.coll)?.get(id);
    const unknown = !earlier && this.changes.overlaps(`${this.coll}/${escapeSegment(id)}`);
    return (before, next, reorder = false) => {
      if (unknown) return;
      if (reorder && earlier) {
        recordEntityChange(this.changes, this.coll, earlier);
        return;
      }
      const prev = earlier && earlier.kind !== 'reorder' ? earlier.prev : before;
      recordEntityChange(this.changes, this.coll, {
        id,
        prev,
        next,
        kind: reorder
          ? 'reorder'
          : prev === undefined
            ? 'insert'
            : next === undefined
              ? 'delete'
              : 'update',
        fields: !reorder && prev !== undefined && next !== undefined
          ? changedFields(prev, next)
          : EMPTY_CHANGED_FIELDS,
      });
    };
  }
  private async row(id: EntityId): Promise<EntityRow | undefined> {
    const encoded = encodeEntityId(id);
    if (!this.cached.has(encoded) && this.snapshot) {
      const order = getEntityOrder(this.snapshot)!;
      const pos = order.positions.get(id);
      this.cached.set(
        encoded,
        pos === undefined
          ? undefined
          : {
              coll: this.coll,
              id: encoded,
              pos,
              sortkey: order.keys.get(encoded),
              data: this.data(id, this.snapshot.entities[String(id)] as T),
            },
      );
    }
    if (!this.cached.has(encoded)) {
      const committed = this.committedRow?.(encoded);
      if (committed) this.cached.set(encoded, committed);
    }
    if (!this.cached.has(encoded)) {
      const [row] = await this.sql.query<EntityRow>(
        'SELECT coll,id,pos,data,sortkey FROM nss_entity WHERE coll = ? AND id = ?',
        [this.coll, encoded],
      );
      this.cached.set(encoded, row);
    }
    return this.cached.get(encoded);
  }
  private async value(row: EntityRow): Promise<T> {
    const value =
      row.data === ''
        ? await this.nodes.read(this.sql, entityValuePath(this.coll, row.id))
        : JSON.parse(row.data);
    if (isDevMode()) freeze(value);
    return value as T;
  }
  async get(id: EntityId): Promise<T | undefined> {
    const row = await this.row(id);
    return row ? this.value(row) : undefined;
  }
  async getPosition(id: EntityId): Promise<number | undefined> {
    return (await this.row(id))?.pos;
  }
  async getMany(ids: readonly EntityId[]): Promise<(T | undefined)[]> {
    for (const id of ids) {
      const encoded = encodeEntityId(id);
      const row = this.committedRow?.(encoded);
      if (!this.cached.has(encoded) && row) this.cached.set(encoded, row);
    }
    const missing = [...new Set(ids)].filter(
      (id) => !this.cached.has(encodeEntityId(id)) && !this.snapshot,
    );
    for (let index = 0; index < missing.length; index += 998) {
      const batch = missing.slice(index, index + 998).map(encodeEntityId);
      const rows = await this.sql.query<EntityRow>(
        `SELECT coll,id,pos,data FROM nss_entity WHERE coll = ? AND id IN (${batch.map(() => '?').join(',')})`,
        [this.coll, ...batch],
      );
      for (const id of batch) this.cached.set(id, undefined);
      for (const row of rows) this.cached.set(row.id, row);
    }
    const result: (T | undefined)[] = [];
    for (const id of ids) {
      const row = await this.row(id);
      result.push(row ? await this.value(row) : undefined);
    }
    return result;
  }
  async has(id: EntityId): Promise<boolean> {
    return !!(await this.row(id));
  }
  async count(): Promise<number> {
    const [row] = await this.sql.query<{ count: number }>(
      'SELECT COUNT(*) AS count FROM nss_entity WHERE coll = ?',
      [this.coll],
    );
    return row.count;
  }
  async ids(): Promise<EntityId[]> {
    return (
      await this.sql.query<{ id: string }>(
        'SELECT id FROM nss_entity WHERE coll = ? ORDER BY sortkey, pos',
        [this.coll],
      )
    ).map(({ id }) => decodeEntityId(id));
  }
  async page(offset: number, limit: number): Promise<EntityPageRow<T>[]> {
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 0)
      throw new RangeError('Invalid entity page');
    const rows = await this.sql.query<EntityRow>(
      'SELECT coll,id,pos,data FROM nss_entity WHERE coll = ? ORDER BY sortkey, pos LIMIT ? OFFSET ?',
      [this.coll, limit, offset],
    );
    const result: EntityPageRow<T>[] = [];
    for (const row of rows) {
      result.push({ id: decodeEntityId(row.id), entity: await this.value(row), pos: row.pos });
    }
    return result;
  }
  private async lastPosition(): Promise<number> {
    if (this.snapshot) {
      let last: number | undefined;
      for (const pos of getEntityOrder(this.snapshot)!.positions.values())
        last = last === undefined ? pos : Math.max(last, pos);
      return last ?? 0;
    }
    const [row] = await this.sql.query<{ pos: number }>(
      'SELECT pos FROM nss_entity WHERE coll = ? ORDER BY pos DESC LIMIT 1',
      [this.coll],
    );
    return row?.pos ?? 0;
  }
  private data(id: EntityId, entity: T): string {
    return serializedSize(entity, () => entityValuePath(this.coll, encodeEntityId(id))) >
      this.nodes.policy.rowCap
      ? ''
      : JSON.stringify(entity);
  }
  private encodeInput(row: EntityInput<T>, position?: number): { data: string; sortkey: string | undefined } {
    if (position !== undefined && !Number.isFinite(position))
      throw new RangeError('Invalid entity position');
    const sortkey = this.key(row.entity);
    if (sortkey !== undefined) {
      const bytes = utf8ByteLength(sortkey);
      if (bytes > this.nodes.policy.rowCap)
        throw new RowCapExceededError(this.coll, bytes, this.nodes.policy.rowCap);
    }
    return { data: this.data(row.id, row.entity), sortkey };
  }
  async insert(
    rows: readonly EntityInput<T>[],
    options: { pos?: number | readonly number[] } = {},
  ): Promise<void> {
    await this.insertRows(rows, options, false);
  }
  private async insertRows(
    rows: readonly EntityInput<T>[],
    options: { pos?: number | readonly number[] },
    replace = false,
  ): Promise<void> {
    if (!rows.length && !replace) return;
    const seen = new Set<string>();
    const encoded = rows
      .filter(({ id }) => {
        const key = encodeEntityId(id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((row, index) => ({
        ...row,
        ...this.encodeInput(row, row.pos ?? (typeof options.pos === 'number' ? options.pos + index : options.pos?.[index])),
      }));
    // One indexed transport supplies both the append endpoint and conflict ids.
    // Knowing which rows actually insert makes aggregate deltas exact without
    // adding a bridge call to the ordinary cold append path.
    const existing = new Set<string>();
    let last: number | undefined;
    const append = encoded.some(
      (row, index) =>
        row.pos === undefined &&
        (typeof options.pos === 'number' ? options.pos + index : options.pos?.[index]) ===
          undefined,
    );
    if (replace) {
      await this.writer.clearEntities(this.coll);
      last = 0;
    } else if (this.snapshot) {
      for (const row of encoded)
        if (getEntityOrder(this.snapshot)!.positions.get(row.id) !== undefined)
          existing.add(encodeEntityId(row.id));
      if (append) last = await this.lastPosition();
    } else {
      const rows = await this.sql.query<{ id: string | null; pos: number }>(
        `SELECT id, pos FROM nss_entity WHERE coll = ? AND id IN (SELECT value FROM json_each(?))
         ${append ? 'UNION ALL SELECT NULL, COALESCE((SELECT pos FROM nss_entity WHERE coll = ? ORDER BY pos DESC LIMIT 1), 0)' : ''}`,
        [
          this.coll,
          JSON.stringify(encoded.map((row) => encodeEntityId(row.id))),
          ...(append ? [this.coll] : []),
        ],
      );
      for (const row of rows) {
        if (row.id === null) last = row.pos;
        else existing.add(row.id);
      }
    }
    const deltas: (() => void)[] = [];
    const batch: EntityRow[] = [];
    for (const [index, row] of encoded.entries()) {
      // A duplicate promoted insert must leave the existing promoted subtree intact.
      if (row.data === '' && existing.has(encodeEntityId(row.id))) continue;
      if (!replace) {
        const record = this.track(encodeEntityId(row.id));
        deltas.push(() =>
          existing.has(encodeEntityId(row.id))
            ? record(undefined, undefined, true)
            : record(undefined, row.entity),
        );
      }
      const explicit =
        row.pos ?? (typeof options.pos === 'number' ? options.pos + index : options.pos?.[index]);
      if (explicit === undefined && last === undefined) last = await this.lastPosition();
      const pos = explicit ?? ++last!;
      if (!Number.isFinite(pos)) throw new RangeError('Invalid entity position');
      batch.push({
        coll: this.coll,
        id: encodeEntityId(row.id),
        pos,
        data: row.data,
        sortkey: row.sortkey,
      });
      if (row.data === '')
        await this.nodes.write(
          this.sql,
          entityValuePath(this.coll, encodeEntityId(row.id)),
          row.entity,
          this.changes,
        );
    }
    await this.writer.writeEntityRows(batch, false, undefined, replace, { canonicalJson: true });
    for (const record of deltas) record();
    this.changed();
  }
  /** Full replacement invalidates the collection instead of retaining one delta per row. */
  async replaceAll(rows: readonly EntityInput<T>[]): Promise<void> {
    if (this.snapshot) {
      // A materialized collection can refresh from precise deltas without a
      // collection read-back. Query-only consumers use the coarse bulk path.
      for (const row of rows) this.encodeInput(row, row.pos);
      await this.clear();
      await this.insert(rows);
      return;
    }
    await this.insertRows(rows, {}, true);
  }
  async upsert(rows: readonly EntityInput<T>[]): Promise<void> {
    if (!rows.length) return;
    // Validate every value before the first mutation.
    const encoded = rows.map((row) => ({
      ...row,
      data: this.data(row.id, row.entity),
      sortkey: this.key(row.entity),
    }));
    let last: number | undefined;
    const batch: EntityRow[] = [];
    const orderChanges = new Set<string>();
    const deltas: (() => void)[] = [];
    for (const row of encoded) {
      const old = await this.row(row.id);
      const record = this.track(encodeEntityId(row.id));
      const prev = old ? await this.value(old) : undefined;
      deltas.push(() => record(prev, row.entity));
      if (row.pos === undefined && !old && last === undefined) last = await this.lastPosition();
      const pos = row.pos ?? old?.pos ?? ++last!;
      if (!old || pos !== old.pos || (row.sortkey ?? null) !== (old.sortkey ?? null))
        orderChanges.add(encodeEntityId(row.id));
      if (!Number.isFinite(pos)) throw new RangeError('Invalid entity position');
      const path = entityValuePath(this.coll, encodeEntityId(row.id));
      if (old?.data === '') await this.writer.deletePrefix(path, this.coll);
      if (row.data === '') await this.nodes.write(this.sql, path, row.entity, this.changes);
      batch.push({
        coll: this.coll,
        id: encodeEntityId(row.id),
        pos,
        data: row.data,
        sortkey: row.sortkey,
      });
    }
    await this.writer.writeEntityRows(batch, true, orderChanges, false, { canonicalJson: true });
    for (const record of deltas) record();
    this.changed();
  }
  async update(id: EntityId, entity: T): Promise<void> {
    const sortkey = this.key(entity);
    const data = this.data(id, entity);
    const old = await this.row(id);
    if (!old) return;
    const record = this.track(encodeEntityId(id));
    const prev = await this.value(old);
    const path = entityValuePath(this.coll, encodeEntityId(id));
    if (old.data === '') await this.writer.deletePrefix(path, this.coll);
    if (data === '') await this.nodes.write(this.sql, path, entity, this.changes);
    await this.writer.updateEntity(this.coll, encodeEntityId(id), data);
    if (sortkey !== undefined && sortkey !== old.sortkey)
      await this.writer.updateEntitySortKey(this.coll, encodeEntityId(id), sortkey);
    record(prev, entity);
    this.changed();
  }
  async setPosition(id: EntityId, pos: number): Promise<void> {
    if (!Number.isFinite(pos)) throw new RangeError('Invalid entity position');
    const record = this.track(encodeEntityId(id));
    await this.writer.updateEntityPosition(this.coll, encodeEntityId(id), pos);
    record(undefined, undefined, true);
    this.changed();
  }
  async remove(ids: readonly EntityId[]): Promise<void> {
    const records = new Map(ids.map((id) => [encodeEntityId(id), this.track(encodeEntityId(id))]));
    const deleted = await this.writer.deleteEntities(this.coll, ids.map(encodeEntityId));
    for (const row of deleted)
      if (row.data !== '') records.get(row.id)?.(JSON.parse(row.data), undefined);
    for (const row of deleted)
      if (row.data === '')
        await this.writer.deletePrefix(entityValuePath(this.coll, row.id), this.coll);
    if (deleted.length) this.changed();
  }
  async clear(): Promise<void> {
    const deleted = await this.writer.deleteEntities(this.coll, undefined, (row) => {
      const record = this.track(row.id);
      return () => {
        if (row.data !== '') record(JSON.parse(row.data), undefined);
      };
    });
    for (const row of deleted)
      if (row.data === '')
        await this.writer.deletePrefix(entityValuePath(this.coll, row.id), this.coll);
    if (deleted.length) this.changed();
  }
  async positionForUpdate(
    id: EntityId,
    entity: T,
    comparer: (left: T, right: T) => number,
  ): Promise<number> {
    const current = await this.row(id);
    if (!current) return this.positionFor(entity, comparer);
    const [previous] = await this.sql.query<EntityRow>(
      'SELECT coll,id,pos,data FROM nss_entity WHERE coll = ? AND pos < ? ORDER BY pos DESC LIMIT 1',
      [this.coll, current.pos],
    );
    const [next] = await this.sql.query<EntityRow>(
      'SELECT coll,id,pos,data FROM nss_entity WHERE coll = ? AND pos > ? ORDER BY pos LIMIT 1',
      [this.coll, current.pos],
    );
    if (
      (!previous || comparer(await this.value(previous), entity) < 0) &&
      (!next || comparer(await this.value(next), entity) >= 0)
    )
      return current.pos;
    return this.positionFor(entity, comparer, id);
  }
  async positionFor(
    entity: T,
    comparer: (left: T, right: T) => number,
    excludeId?: EntityId,
  ): Promise<number> {
    const exclusion = excludeId === undefined ? '' : ' AND id != ?';
    const params = excludeId === undefined ? [this.coll] : [this.coll, encodeEntityId(excludeId)];
    const [total] = await this.sql.query<{ count: number }>(
      `SELECT COUNT(*) AS count FROM nss_entity WHERE coll = ?${exclusion}`,
      params,
    );
    let low = 0;
    let high = total.count;
    let previous: EntityRow | undefined;
    let next: EntityRow | undefined;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const [row] = await this.sql.query<EntityRow>(
        `SELECT coll,id,pos,data FROM nss_entity WHERE coll = ?${exclusion} ORDER BY pos LIMIT 1 OFFSET ?`,
        [...params, mid],
      );
      if (comparer(await this.value(row), entity) < 0) {
        low = mid + 1;
        previous = row;
      } else {
        high = mid;
        next = row;
      }
    }
    const position = between(previous?.pos, next?.pos);
    if (
      !Number.isFinite(position) ||
      (previous && position <= previous.pos) ||
      (next && position >= next.pos) ||
      (previous && next && next.pos - previous.pos < 1e-9)
    ) {
      const all = await this.sql.query<{ id: string }>(
        'SELECT id FROM nss_entity WHERE coll = ? ORDER BY pos',
        [this.coll],
      );
      for (const [index, row] of all.entries())
        await this.writer.updateEntityPosition(this.coll, row.id, index + 1);
      this.changed();
      return this.positionFor(entity, comparer, excludeId);
    }
    return position;
  }
}
