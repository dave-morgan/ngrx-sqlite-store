import { Injectable, inject } from '@angular/core';
import { INITIAL_REDUCERS, combineReducers } from '@ngrx/store';
import type { ActionReducer } from '@ngrx/store';
import { BehaviorSubject } from 'rxjs';
import { SqliteStoreCore } from './core';
import { State } from './state';
import type { RegisteredFeature } from './tokens';

@Injectable()
export class ReducerManager extends BehaviorSubject<ActionReducer<any>> {
  private readonly core = inject(SqliteStoreCore);
  readonly currentReducers: Record<string, ActionReducer<any>>;
  constructor() {
    const reducers = inject(INITIAL_REDUCERS) as Record<string, ActionReducer<any>>;
    const state = inject(State);
    super(() => state.value);
    this.currentReducers = { ...reducers };
  }
  addFeature(feature: RegisteredFeature): void {
    this.addFeatures([feature]);
  }
  addFeatures(features: RegisteredFeature[]): void {
    for (const feature of features)
      this.currentReducers[feature.key] =
        typeof feature.reducers === 'function'
          ? feature.reducers
          : combineReducers(feature.reducers);
    this.next(this.value);
    this.core.addFeatures(features);
  }
  removeFeature(feature: Pick<RegisteredFeature, 'key'>): void {
    this.removeReducers([feature.key]);
  }
  removeFeatures(features: Array<Pick<RegisteredFeature, 'key'>>): void {
    this.removeReducers(features.map((f) => f.key));
  }
  addReducer<S>(key: string, reducer: ActionReducer<S>): void {
    this.addReducers({ [key]: reducer });
  }
  addReducers(reducers: Record<string, ActionReducer<any>>): void {
    this.addFeatures(
      Object.entries(reducers).map(([key, reducer]) => ({ key, reducers: reducer })),
    );
  }
  removeReducer(key: string): void {
    this.removeReducers([key]);
  }
  removeReducers(keys: string[]): void {
    for (const key of keys) delete this.currentReducers[key];
    this.next(this.value);
    this.core.removeFeatures(keys);
  }
  ngOnDestroy(): void {
    this.complete();
  }
}
