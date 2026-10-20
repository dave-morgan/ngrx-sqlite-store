import { InjectionToken } from '@angular/core';
import type { Signal } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Action, ActionReducer, MetaReducer, RootStoreConfig } from '@ngrx/store';
import type { SqlDriver } from '../driver/sql-driver';
import type { StorageHint } from '../schema/policy';
import type { ChangeSet } from '../storage/change-set';

export interface SqliteFeatureConfig {
  hints?: Record<string, StorageHint>;
  version?: number;
  onVersionMismatch?: 'error' | 'reseed';
}
export interface SqliteStoreConfig {
  driver?: SqlDriver | (() => SqlDriver);
  features?: Record<string, SqliteFeatureConfig>;
  eager?: string[];
  lruSize?: number;
  actionHooks?: Array<
    (action: Action, tx: import('../reducer/store-tx').StoreTx<unknown>) => void | Promise<void>
  >;
}
export interface SelectionEngine {
  select<T>(...args: unknown[]): Observable<T>;
  selectSignal<T>(...args: unknown[]): Signal<T>;
  pinAll(): () => void;
  materialize(): Promise<object>;
  preload(paths: string[]): Promise<void>;
}
export interface CommittedCache {
  peek(fullPath: string): unknown | undefined;
}
export const SELECTION_ENGINE = new InjectionToken<SelectionEngine>('NSS selection engine');
export const COMMITTED_CACHE = new InjectionToken<CommittedCache>('NSS committed cache', {
  factory: () => ({ peek: () => undefined }),
});
export const POST_COMMIT_HOOK = new InjectionToken<Array<(changes: ChangeSet) => Promise<void>>>(
  'NSS post commit hooks',
);
export const STORE_CONFIGURATION = new InjectionToken<
  RootStoreConfig<any> & { sqlite?: SqliteStoreConfig }
>('NSS configuration');
export const DEFAULT_META_REDUCER: MetaReducer = (reducer) => reducer;
export interface RegisteredFeature {
  key: string;
  reducers: ActionReducer<any> | Record<string, ActionReducer<any>>;
  initialState?: unknown;
  metaReducers?: MetaReducer<any, any>[];
  sqlite?: SqliteFeatureConfig;
  reducerFactory?: import('@ngrx/store').ActionReducerFactory<any>;
}
