import {
  DestroyRef,
  EnvironmentInjector,
  InjectionToken,
  NgModule,
  createEnvironmentInjector,
  inject,
  isDevMode,
  makeEnvironmentProviders,
  provideAppInitializer,
  provideEnvironmentInitializer,
} from '@angular/core';
import type { EnvironmentProviders, ModuleWithProviders, Provider } from '@angular/core';
import * as ngrx from '@ngrx/store';
import type {
  Action,
  ActionReducer,
  ActionReducerMap,
  FeatureSlice,
  RootStoreConfig,
  StoreConfig,
} from '@ngrx/store';
import { CapacitorSqliteDriver } from '../driver/capacitor-sqlite-driver';
import { SQL_DRIVER } from '../driver/sql-driver';
import { SCHEMA_MIGRATIONS } from '../schema/migrations';
import { STORAGE_ENGINE_OPTIONS, StorageEngine } from '../storage/storage-engine';
import { SqliteStoreCore, resolveInitial } from './core';
import { ReducerManager } from './reducer-manager';
import { State } from './state';
import { NssScannedActionsSubject } from './scanned-actions-subject';
import { Store } from './store';
import {
  COMMITTED_CACHE,
  DEFAULT_META_REDUCER,
  POST_COMMIT_HOOK,
  SELECTION_ENGINE,
  STORE_CONFIGURATION,
} from './tokens';
import { PathCache } from '../selectors/path-cache';
import { SqliteSelectionEngine } from '../selectors/selection-engine';
import type { SqliteFeatureConfig, SqliteStoreConfig } from './tokens';
import type { RegisteredFeature } from './tokens';

export type SqliteRootConfig<T, A extends Action = Action> = RootStoreConfig<T, A> & {
  sqlite?: SqliteStoreConfig;
};
export type SqliteStateConfig<T, A extends Action = Action> = StoreConfig<T, A> & {
  sqlite?: SqliteFeatureConfig;
};
const FEATURE_REGISTRATIONS = new InjectionToken<RegisteredFeature[]>('NSS feature registrations');
function checkActionTypes(): void {
  // The registry of createAction calls is private to NgRx. Run its own guard in
  // a short-lived empty store rather than duplicate or inspect private tokens.
  const boundary = createEnvironmentInjector(
    [{ provide: ngrx.Store, useValue: null }],
    inject(EnvironmentInjector),
  );
  try {
    const guard = createEnvironmentInjector(
      [ngrx.provideStore({}, { runtimeChecks: { strictActionTypeUniqueness: true } })],
      boundary,
    );
    guard.destroy();
  } finally {
    boundary.destroy();
  }
}
function rootProviders<T, A extends Action>(
  reducers:
    ActionReducerMap<T, A> | InjectionToken<ActionReducerMap<T, A>> = {} as ActionReducerMap<T, A>,
  config: SqliteRootConfig<T, A> = {},
): Array<Provider | EnvironmentProviders> {
  return [
    { provide: STORE_CONFIGURATION, useValue: config },
    {
      provide: SQL_DRIVER,
      useFactory: () => {
        const driver = config.sqlite?.driver;
        return typeof driver === 'function'
          ? driver()
          : (driver ?? new CapacitorSqliteDriver({ database: 'ngrx-sqlite-store' }));
      },
    },
    { provide: STORAGE_ENGINE_OPTIONS, useValue: { migrations: SCHEMA_MIGRATIONS } },
    StorageEngine,
    SqliteStoreCore,
    PathCache,
    SqliteSelectionEngine,
    { provide: COMMITTED_CACHE, useExisting: PathCache },
    { provide: SELECTION_ENGINE, useExisting: SqliteSelectionEngine },
    {
      provide: POST_COMMIT_HOOK,
      multi: true,
      useFactory: () => {
        const selection = inject(SqliteSelectionEngine);
        return () => selection.refresh();
      },
    },
    Store,
    State,
    ReducerManager,
    ngrx.ActionsSubject,
    NssScannedActionsSubject,
    { provide: ngrx.ScannedActionsSubject, useExisting: NssScannedActionsSubject },
    { provide: ngrx.ReducerManagerDispatcher, useExisting: ngrx.ActionsSubject },
    { provide: ngrx.Store, useExisting: Store },
    { provide: ngrx.ReducerManager, useExisting: ReducerManager },
    { provide: ngrx.ReducerObservable, useExisting: ReducerManager },
    { provide: ngrx.State, useExisting: State },
    { provide: ngrx.StateObservable, useExisting: State },
    { provide: ngrx.INITIAL_STATE, useFactory: () => resolveInitial(config.initialState) ?? {} },
    {
      provide: ngrx.INITIAL_REDUCERS,
      useFactory: () => (reducers instanceof InjectionToken ? inject(reducers) : reducers),
    },
    { provide: ngrx.META_REDUCERS, multi: true, useValue: DEFAULT_META_REDUCER },
    { provide: ngrx.USER_PROVIDED_META_REDUCERS, useValue: config.metaReducers ?? [] },
    { provide: ngrx.USER_RUNTIME_CHECKS, useValue: config.runtimeChecks ?? {} },
    {
      provide: ngrx.ACTIVE_RUNTIME_CHECKS,
      useFactory: () => ({
        strictStateImmutability: isDevMode(),
        strictActionImmutability: isDevMode(),
        strictStateSerializability: true,
        strictActionSerializability: false,
        strictActionWithinNgZone: false,
        strictActionTypeUniqueness: false,
        ...config.runtimeChecks,
      }),
    },
    { provide: ngrx.REDUCER_FACTORY, useValue: config.reducerFactory ?? ngrx.combineReducers },
    {
      provide: ngrx.ROOT_STORE_PROVIDER,
      useFactory: () => {
        inject(SqliteStoreCore);
        inject(Store);
        inject(ReducerManager);
        // NgRx devtools is activated lazily by its StateObservable provider.
        // Resolve it for initialization only; our services read State directly.
        inject(ngrx.StateObservable);
        if (config.runtimeChecks?.strictActionTypeUniqueness) checkActionTypes();
      },
    },
    provideEnvironmentInitializer(() => inject(ngrx.ROOT_STORE_PROVIDER)),
    provideAppInitializer(() => inject(SqliteStoreCore).initialize()),
  ];
}
export function provideStore<T = object, A extends Action = Action>(
  reducers?: ActionReducerMap<T, A> | InjectionToken<ActionReducerMap<T, A>>,
  config?: SqliteRootConfig<T, A>,
): EnvironmentProviders {
  return makeEnvironmentProviders(rootProviders(reducers, config));
}
function featureProviders<T, A extends Action>(
  nameOrSlice: string | FeatureSlice<T, A>,
  reducer?:
    | ActionReducer<T, A>
    | ActionReducerMap<T, A>
    | InjectionToken<ActionReducer<T, A> | ActionReducerMap<T, A>>,
  config: SqliteStateConfig<T, A> = {},
): Array<Provider | EnvironmentProviders> {
  return [
    {
      provide: FEATURE_REGISTRATIONS,
      multi: true,
      useFactory: () => ({
        key: typeof nameOrSlice === 'string' ? nameOrSlice : nameOrSlice.name,
        reducers: (typeof nameOrSlice === 'string'
          ? reducer instanceof InjectionToken
            ? inject(reducer)
            : reducer
          : nameOrSlice.reducer) as ActionReducer<any>,
        initialState: config.initialState,
        metaReducers: config.metaReducers,
        sqlite: config.sqlite,
      }),
    },
    {
      provide: ngrx.FEATURE_STATE_PROVIDER,
      useFactory: () => {
        inject(ngrx.ROOT_STORE_PROVIDER);
        if (inject(ngrx.ACTIVE_RUNTIME_CHECKS).strictActionTypeUniqueness) checkActionTypes();
        const manager = inject(ReducerManager);
        const features = inject(FEATURE_REGISTRATIONS);
        manager.addFeatures(features);
        inject(DestroyRef).onDestroy(() => manager.removeFeatures(features));
      },
    },
    provideEnvironmentInitializer(() => inject(ngrx.FEATURE_STATE_PROVIDER)),
  ];
}
export function provideState<T, A extends Action = Action>(
  slice: FeatureSlice<T, A>,
): EnvironmentProviders;
export function provideState<T, A extends Action = Action>(
  name: string,
  reducer:
    | ActionReducer<T, A>
    | ActionReducerMap<T, A>
    | InjectionToken<ActionReducer<T, A> | ActionReducerMap<T, A>>,
  config?: SqliteStateConfig<T, A>,
): EnvironmentProviders;
export function provideState<T, A extends Action = Action>(
  nameOrSlice: string | FeatureSlice<T, A>,
  reducer?:
    | ActionReducer<T, A>
    | ActionReducerMap<T, A>
    | InjectionToken<ActionReducer<T, A> | ActionReducerMap<T, A>>,
  config?: SqliteStateConfig<T, A>,
): EnvironmentProviders {
  return makeEnvironmentProviders(featureProviders(nameOrSlice, reducer, config));
}

@NgModule({ providers: [{ provide: ngrx.StoreRootModule, useExisting: StoreRootModule }] })
export class StoreRootModule {
  constructor() {
    inject(ngrx.ROOT_STORE_PROVIDER);
  }
}
@NgModule({ providers: [{ provide: ngrx.StoreFeatureModule, useExisting: StoreFeatureModule }] })
export class StoreFeatureModule {
  constructor() {
    inject(ngrx.FEATURE_STATE_PROVIDER);
  }
}
@NgModule({})
export class StoreModule {
  static forRoot<T = object, A extends Action = Action>(
    reducers?: ActionReducerMap<T, A> | InjectionToken<ActionReducerMap<T, A>>,
    config?: SqliteRootConfig<T, A>,
  ): ModuleWithProviders<StoreRootModule> {
    return { ngModule: StoreRootModule, providers: rootProviders(reducers, config) };
  }
  static forFeature<T, A extends Action = Action>(
    slice: FeatureSlice<T, A>,
  ): ModuleWithProviders<StoreFeatureModule>;
  static forFeature<T, A extends Action = Action>(
    name: string,
    reducer: ActionReducer<T, A> | ActionReducerMap<T, A>,
    config?: SqliteStateConfig<T, A>,
  ): ModuleWithProviders<StoreFeatureModule>;
  static forFeature<T, A extends Action = Action>(
    nameOrSlice: string | FeatureSlice<T, A>,
    reducer?: ActionReducer<T, A> | ActionReducerMap<T, A>,
    config?: SqliteStateConfig<T, A>,
  ): ModuleWithProviders<StoreFeatureModule> {
    return {
      ngModule: StoreFeatureModule,
      providers: featureProviders(nameOrSlice, reducer, config),
    };
  }
}
