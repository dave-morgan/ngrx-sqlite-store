import type {
  Comparer,
  EntityAdapter as ClassicAdapter,
  EntityMap,
  EntityMapOne,
  EntityState,
  Predicate,
  Update,
} from '@ngrx/entity';
import type { StoreTx } from 'ngrx-sqlite-store';
import type { EntityQueries } from './query';

/** Transaction-bound operations returned by adapter.at(tx, path). */
export interface EntityOperations<T> {
  addOne(entity: T): Promise<void>;
  addMany(entities: T[]): Promise<void>;
  setAll(entities: T[]): Promise<void>;
  setOne(entity: T): Promise<void>;
  setMany(entities: T[]): Promise<void>;
  removeOne(id: string | number): Promise<void>;
  removeMany(idsOrPredicate: string[] | number[] | Predicate<T>): Promise<void>;
  removeAll(): Promise<void>;
  updateOne(update: Update<T>): Promise<void>;
  updateMany(updates: Update<T>[]): Promise<void>;
  upsertOne(entity: T): Promise<void>;
  upsertMany(entities: T[]): Promise<void>;
  mapOne(map: EntityMapOne<T>): Promise<void>;
  map(map: EntityMap<T>): Promise<void>;
}

// Classic signatures copied from @ngrx/entity 22.0.1 types/ngrx-entity.d.ts.
interface ClassicOperations<T> {
  addOne<S extends EntityState<T>>(entity: T, state: S): S;
  addMany<S extends EntityState<T>>(entities: T[], state: S): S;
  setAll<S extends EntityState<T>>(entities: T[], state: S): S;
  setOne<S extends EntityState<T>>(entity: T, state: S): S;
  setMany<S extends EntityState<T>>(entities: T[], state: S): S;
  removeOne<S extends EntityState<T>>(key: string, state: S): S;
  removeOne<S extends EntityState<T>>(key: number, state: S): S;
  removeMany<S extends EntityState<T>>(keys: string[], state: S): S;
  removeMany<S extends EntityState<T>>(keys: number[], state: S): S;
  removeMany<S extends EntityState<T>>(predicate: Predicate<T>, state: S): S;
  removeAll<S extends EntityState<T>>(state: S): S;
  updateOne<S extends EntityState<T>>(update: Update<T>, state: S): S;
  updateMany<S extends EntityState<T>>(updates: Update<T>[], state: S): S;
  upsertOne<S extends EntityState<T>>(entity: T, state: S): S;
  upsertMany<S extends EntityState<T>>(entities: T[], state: S): S;
  mapOne<S extends EntityState<T>>(map: EntityMapOne<T>, state: S): S;
  map<S extends EntityState<T>>(map: EntityMap<T>, state: S): S;
}

// Intersections retain the classic overloads alongside transaction overloads.
type DualOperations<T> = {
  [K in keyof EntityOperations<T>]: ClassicOperations<T>[K] &
    ((tx: StoreTx, ...args: Parameters<EntityOperations<T>[K]>) => Promise<void>);
};

export type EntityAdapter<T, IdType = string | number> = Omit<
  ClassicAdapter<T, IdType>,
  keyof EntityOperations<T>
> &
  DualOperations<T> & {
    at(tx: StoreTx, path: string): EntityOperations<T>;
    query(): EntityQueries<EntityState<T>, T, IdType>;
    query<S>(selectState: (state: S) => EntityState<T>): EntityQueries<S, T, IdType>;
  };

export interface EntityOptions<T> {
  sortKey?: (entity: T) => string | number;
  selectId?: (entity: T) => string | number;
  sortComparer?: false | Comparer<T>;
}
