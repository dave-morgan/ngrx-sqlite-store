/*
 * Public API Surface of ngrx-sqlite-store
 */

export * from './lib/driver/sql-driver';
export * from './lib/driver/sqljs-driver';
export * from './lib/driver/capacitor-sqlite-driver';
export * from './lib/schema/errors';
export type { StorageHint } from './lib/schema/policy';
export { createReducer, on, onState, fromSyncReducer } from './lib/reducer/reducer';
export type { TxReducer } from './lib/reducer/reducer';
export { StoreTx } from './lib/reducer/store-tx';
export { Store } from './lib/store/store';
export { State } from './lib/store/state';
export { ReducerManager } from './lib/store/reducer-manager';
export {
  provideStore,
  provideState,
  StoreModule,
  StoreRootModule,
  StoreFeatureModule,
} from './lib/store/provide';
export type { SqliteStoreConfig } from './lib/store/tokens';
export { nssReducerError } from './lib/store/core';
export {
  SELECTION_ENGINE as ɵSELECTION_ENGINE,
  POST_COMMIT_HOOK as ɵPOST_COMMIT_HOOK,
  COMMITTED_CACHE as ɵCOMMITTED_CACHE,
} from './lib/store/tokens';
export type { SelectionEngine, CommittedCache } from './lib/store/tokens';
export { StorageEngine as ɵStorageEngine } from './lib/storage/storage-engine';
export type { ChangeSet } from './lib/storage/change-set';
export {
  ACTIVE_RUNTIME_CHECKS,
  ActionsSubject,
  FEATURE_REDUCERS,
  FEATURE_STATE_PROVIDER,
  INIT,
  INITIAL_REDUCERS,
  INITIAL_STATE,
  META_REDUCERS,
  REDUCER_FACTORY,
  ROOT_STORE_PROVIDER,
  ReducerManagerDispatcher,
  ReducerObservable,
  STORE_FEATURES,
  ScannedActionsSubject,
  StateObservable,
  UPDATE,
  USER_PROVIDED_META_REDUCERS,
  USER_RUNTIME_CHECKS,
  combineReducers,
  compose,
  createAction,
  createActionGroup,
  createReducerFactory,
  defaultStateFn,
  emptyProps,
  isNgrxMockEnvironment,
  props,
  reduceState,
  setNgrxMockEnvironment,
  union,
} from '@ngrx/store';
export {
  createSelector,
  createSelectorFactory,
  defaultMemoize,
  resultMemoize,
  createFeatureSelector,
  select,
  createFeature,
} from './lib/selectors/selectors';
export type {
  Action,
  ActionCreator,
  ActionCreatorProps,
  ActionReducer,
  ActionReducerFactory,
  ActionReducerMap,
  ActionType,
  Creator,
  DefaultProjectorFn,
  FeatureConfig,
  FeatureSlice,
  FunctionWithParametersType,
  MemoizeFn,
  MemoizedProjection,
  MemoizedSelector,
  MemoizedSelectorWithProps,
  MetaReducer,
  NotAllowedCheck,
  ReducerTypes,
  RootStoreConfig,
  RuntimeChecks,
  SelectSignalOptions,
  Selector,
  SelectorWithProps,
  StoreConfig,
} from '@ngrx/store';
