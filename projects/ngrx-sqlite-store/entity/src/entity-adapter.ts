import { isDevMode } from '@angular/core';
import { createEntityAdapter as classicAdapter } from '@ngrx/entity';
import type { Comparer, EntityState, IdSelector, Update } from '@ngrx/entity';
import { createSelector, StoreTx, ɵbrandEntityState, ɵisStoreTx } from 'ngrx-sqlite-store';
import type { EntityAdapter, EntityOperations, EntityOptions } from './types';

export type { EntityAdapter, EntityOperations } from './types';
type Id = string | number;
const PAGE_SIZE = 500;

export function createEntityAdapter<T extends { id: string | number }>(options?: {
  sortComparer?: false | Comparer<T>;
}): EntityAdapter<T, T extends { id: infer U } ? U : never>;
export function createEntityAdapter<T>(options: {
  selectId: (entity: T) => string;
  sortComparer?: false | Comparer<T>;
}): EntityAdapter<T, string>;
export function createEntityAdapter<T>(options: {
  selectId: (entity: T) => number;
  sortComparer?: false | Comparer<T>;
}): EntityAdapter<T, number>;
export function createEntityAdapter<T>(options: {
  selectId: IdSelector<T>;
  sortComparer?: false | Comparer<T>;
}): EntityAdapter<T>;
export function createEntityAdapter<T>(): EntityAdapter<T>;
export function createEntityAdapter<T>(options: EntityOptions<T> = {}): EntityAdapter<T> {
  const classic = classicAdapter<T>(
    options as { selectId: IdSelector<T>; sortComparer?: false | Comparer<T> },
  );
  const selectId = classic.selectId as (entity: T) => Id;
  const comparer = classic.sortComparer;

  function at(tx: StoreTx, path: string): EntityOperations<T> {
    const collection = tx.entities<T>(path);
    const row = (entity: T) => ({ id: selectId(entity), entity });

    async function addMany(entities: T[]): Promise<void> {
      if (!comparer) return collection.insert(entities.map(row));
      // NgRx merges the stable sorted batch before existing equal-valued rows.
      // Reverse traversal with lower-bound insertion preserves order within ties.
      const seen = new Set<Id>();
      const models = entities.filter((entity) => {
        const id = selectId(entity);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      models.sort(comparer);
      for (const entity of models.reverse()) {
        if (await collection.has(selectId(entity))) continue;
        const pos = await collection.positionFor(entity, comparer);
        await collection.insert([row(entity)], { pos });
      }
    }

    async function setOne(entity: T): Promise<void> {
      const id = selectId(entity);
      if (!comparer) return collection.upsert([row(entity)]);
      const pos = await collection.positionFor(entity, comparer, id);
      await collection.upsert([{ ...row(entity), pos }]);
    }

    async function updateMany(updates: Update<T>[]): Promise<void> {
      if (!updates.length) return;
      // Unsorted NgRx filters against the state before any update in the batch.
      // A newly renamed ID must not make an initially missing update eligible.
      const initial = comparer ? undefined : await collection.getMany(updates.map(({ id }) => id));
      const eligible = initial
        ? updates.filter((_, index) => initial[index] !== undefined)
        : updates;
      // A sorted batch removes its old models before merging the updated batch,
      // matching NgRx's stable ordering even when multiple updates compare equal.
      const pending: { id: Id; entity: T }[] = [];
      let warned = false;
      for (const update of eligible) {
        const original = await collection.get(update.id);
        if (original === undefined) continue;
        const entity = { ...original, ...update.changes };
        const id = selectId(entity);
        const pendingTarget = pending.findIndex((model) => model.id === id);
        const collision = id !== update.id && (pendingTarget !== -1 || (await collection.has(id)));
        if (collision && isDevMode() && !warned) {
          console.warn(
            'ngrx-sqlite-store/entity: an id change overwrote an existing entity; ids remain unique.',
          );
          warned = true;
        }
        if (id !== update.id) {
          const sourcePosition = await collection.getPosition(update.id);
          if (collision && pendingTarget !== -1) pending.splice(pendingTarget, 1);
          await collection.remove([update.id, ...(collision ? [id] : [])]);
          if (!comparer || collision) {
            await collection.upsert([{ id, entity, pos: sourcePosition }]);
            continue;
          }
        } else if (!comparer) {
          await collection.update(id, entity);
          continue;
        }
        {
          // Remove before merging so repeated updates in one sorted batch have
          // the same missing-id semantics as the real adapter.
          await collection.remove([update.id]);
          pending.push({ id, entity });
        }
      }
      if (comparer) {
        pending.sort((a, b) => comparer(a.entity, b.entity));
        for (const model of pending.reverse()) {
          const pos = await collection.positionFor(model.entity, comparer);
          await collection.upsert([{ id: model.id, entity: model.entity, pos }]);
        }
      }
    }

    async function updateOne(update: Update<T>): Promise<void> {
      if (!comparer) return updateMany([update]);
      const original = await collection.get(update.id);
      if (original === undefined) return;
      const entity = { ...original, ...update.changes };
      if (selectId(entity) !== update.id) return updateMany([update]);
      const pos = await collection.positionForUpdate(update.id, entity, comparer);
      // Binary search may renormalise positions before returning.
      const previous = await collection.getPosition(update.id);
      await collection.update(update.id, entity);
      if (pos !== previous) await collection.setPosition(update.id, pos);
    }

    async function upsertMany(entities: T[]): Promise<void> {
      const added: T[] = [];
      const updated: Update<T>[] = [];
      for (const entity of entities) {
        const id = selectId(entity);
        if (await collection.has(id)) updated.push({ id, changes: entity } as Update<T>);
        else added.push(entity);
      }
      await updateMany(updated);
      await addMany(added);
    }

    const operations: EntityOperations<T> = {
      addOne: (entity) => addMany([entity]),
      addMany,
      setOne,
      async setMany(entities) {
        for (const entity of entities) await setOne(entity);
      },
      async setAll(entities) {
        await collection.clear();
        const models = comparer ? [...entities].sort(comparer) : entities;
        await collection.insert(models.map(row));
      },
      removeOne: (id) => collection.remove([id]),
      async removeMany(idsOrPredicate) {
        if (typeof idsOrPredicate !== 'function') return collection.remove(idsOrPredicate);
        let offset = 0;
        while (true) {
          const page = await collection.page(offset, PAGE_SIZE);
          if (!page.length) break;
          const removed = page.filter(({ entity }) => idsOrPredicate(entity)).map(({ id }) => id);
          await collection.remove(removed);
          offset += page.length - removed.length;
        }
      },
      removeAll: () => collection.clear(),
      updateOne,
      updateMany,
      upsertOne: (entity) => upsertMany([entity]),
      upsertMany,
      async mapOne({ id, map }) {
        const entity = await collection.get(id);
        if (entity !== undefined) await updateOne({ id, changes: map(entity) } as Update<T>);
      },
      async map(mapper) {
        // Collect only changed models before mutating ordering, so no row is
        // skipped or visited twice when the comparer or id changes.
        const updates: Update<T>[] = [];
        for (let offset = 0; ; offset += PAGE_SIZE) {
          const page = await collection.page(offset, PAGE_SIZE);
          for (const { id, entity } of page) {
            const changes = mapper(entity);
            if (changes !== entity) updates.push({ id, changes } as Update<T>);
          }
          if (page.length < PAGE_SIZE) break;
        }
        await updateMany(updates);
      },
    };
    return operations;
  }

  function getSelectors<V>(selectState?: (state: V) => EntityState<T>) {
    const identity = (state: EntityState<T>) => state;
    const selectIds = createSelector(identity, (state) => state.ids);
    const selectEntities = createSelector(identity, (state) => state.entities);
    const selectAll = createSelector(selectIds, selectEntities, (ids, entities) =>
      ids.map((id) => entities[id]!),
    );
    const selectTotal = createSelector(selectIds, (ids) => ids.length);
    const relative = { selectIds, selectEntities, selectAll, selectTotal };
    if (!selectState) return relative;
    return {
      selectIds: createSelector(selectState, (state) => relative.selectIds(state)),
      selectEntities: createSelector(selectState, (state) => relative.selectEntities(state)),
      selectAll: createSelector(selectState, (state) => relative.selectAll(state)),
      selectTotal: createSelector(selectState, (state) => relative.selectTotal(state)),
    };
  }

  const adapter = {
    ...classic,
    at,
    getInitialState: (extra?: object) => ɵbrandEntityState(classic.getInitialState(extra ?? {})),
    getSelectors,
  };
  const names: (keyof EntityOperations<T>)[] = [
    'addOne',
    'addMany',
    'setAll',
    'setOne',
    'setMany',
    'removeOne',
    'removeMany',
    'removeAll',
    'updateOne',
    'updateMany',
    'upsertOne',
    'upsertMany',
    'mapOne',
    'map',
  ];
  for (const name of names) {
    const classicOperation = classic[name] as (...args: unknown[]) => unknown;
    Object.assign(adapter, {
      [name]: (first: unknown, ...args: unknown[]) => {
        if (ɵisStoreTx(first)) {
          const operation = at(first, '')[name] as (...args: unknown[]) => Promise<void>;
          return operation(...args);
        }
        return classicOperation(first, ...args);
      },
    });
  }
  return adapter as EntityAdapter<T>;
}
