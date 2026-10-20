import { Injectable, Injector, effect, inject, untracked } from '@angular/core';
import type { EffectRef, Signal } from '@angular/core';
import { ActionsSubject } from '@ngrx/store';
import { select as ngrxSelect } from '@ngrx/store';
import type { Action, ActionCreator, ActionReducer, SelectSignalOptions } from '@ngrx/store';
import { Observable } from 'rxjs';
import type { Observer, Operator } from 'rxjs';
import { SqliteStoreCore } from './core';
import { ReducerManager } from './reducer-manager';
import { State } from './state';
import { SELECTION_ENGINE } from './tokens';
import { SELECT_OPERATOR } from '../selectors/metadata';

type NotCreator<T> = T extends ActionCreator
  ? 'Action creator is not allowed to be dispatched. Did you forget to call it?'
  : unknown;
@Injectable()
export class Store<T = object> extends Observable<T> implements Observer<Action> {
  private readonly actions = inject(ActionsSubject);
  private readonly manager = inject(ReducerManager);
  private readonly core = inject(SqliteStoreCore);
  private readonly selection = inject(SELECTION_ENGINE);
  private readonly injector = inject(Injector);
  readonly status = this.core.status;
  constructor() {
    super();
    const state = inject(State<T>);
    this.source = new Observable<T>((subscriber) => {
      const release = this.selection.pinAll();
      const subscription = state.subscribe({
        next: (value) => {
          if (!this.core.deferWholeState) subscriber.next(value);
        },
        error: (error: unknown) => subscriber.error(error),
        complete: () => subscriber.complete(),
      });
      return () => {
        subscription.unsubscribe();
        release();
      };
    });
  }
  select<K>(selector: (state: T) => K): Observable<K>;
  select<K, P>(selector: (state: T, props: P) => K, props: P): Observable<K>;
  select<A extends keyof T>(a: A): Observable<T[A]>;
  select<A extends keyof T, B extends keyof T[A]>(a: A, b: B): Observable<T[A][B]>;
  select<A extends keyof T, B extends keyof T[A], C extends keyof T[A][B]>(
    a: A,
    b: B,
    c: C,
  ): Observable<T[A][B][C]>;
  select<
    A extends keyof T,
    B extends keyof T[A],
    C extends keyof T[A][B],
    D extends keyof T[A][B][C],
  >(a: A, b: B, c: C, d: D): Observable<T[A][B][C][D]>;
  select<
    A extends keyof T,
    B extends keyof T[A],
    C extends keyof T[A][B],
    D extends keyof T[A][B][C],
    E extends keyof T[A][B][C][D],
  >(a: A, b: B, c: C, d: D, e: E): Observable<T[A][B][C][D][E]>;
  select<
    A extends keyof T,
    B extends keyof T[A],
    C extends keyof T[A][B],
    D extends keyof T[A][B][C],
    E extends keyof T[A][B][C][D],
    F extends keyof T[A][B][C][D][E],
  >(a: A, b: B, c: C, d: D, e: E, f: F): Observable<T[A][B][C][D][E][F]>;
  select<K = unknown>(
    a: string,
    b: string,
    c: string,
    d: string,
    e: string,
    f: string,
    ...rest: string[]
  ): Observable<K>;
  select<K>(...args: unknown[]): Observable<K> {
    if (this.operator)
      return (ngrxSelect as (...args: unknown[]) => (source: Observable<T>) => Observable<K>)(
        ...args,
      )(this);
    return this.selection.select<K>(this, ...args);
  }
  [SELECT_OPERATOR](...args: unknown[]): Observable<unknown> {
    return this.selection.select(this, ...args);
  }
  selectSignal<K>(selector: (state: T) => K, options?: SelectSignalOptions<K>): Signal<K> {
    return this.selection.selectSignal<K>(this, selector, options);
  }
  override lift<R>(operator: Operator<T, R>): Store<R> {
    const lifted = Object.create(this) as Store<R>;
    lifted.source = this;
    lifted.operator = operator;
    return lifted;
  }
  dispatch<V extends Action>(action: V & NotCreator<V>): void;
  dispatch<V extends () => Action>(
    dispatchFn: V & NotCreator<V>,
    config?: { injector: Injector },
  ): EffectRef;
  dispatch(action: Action | (() => Action), config?: { injector: Injector }): void | EffectRef {
    if (typeof action === 'function') {
      if ('type' in action) throw new TypeError('Action creator must be called before dispatch');
      return effect(
        () => {
          const value = action();
          untracked(() => this.next(value));
        },
        { injector: config?.injector ?? callerInjector() ?? this.injector },
      );
    }
    this.next(action);
  }
  dispatchAsync(action: Action): Promise<void> {
    return this.core.dispatchAsync(action);
  }
  next(action: Action): void {
    this.core.validate(action);
    this.actions.next(action);
  }
  error(error: unknown): void {
    this.actions.error(error);
  }
  complete(): void {
    this.actions.complete();
  }
  addReducer<S>(key: string, reducer: ActionReducer<S>): void {
    this.manager.addReducer(key, reducer);
  }
  removeReducer(key: string): void {
    this.manager.removeReducer(key);
  }
  purgeFeature(key: string): Promise<void> {
    return this.core.purgeFeature(key);
  }
  settle(): Promise<void> {
    return this.core.settle();
  }
  materialize(): Promise<object> {
    return this.selection.materialize();
  }
}
function callerInjector(): Injector | undefined {
  try {
    return inject(Injector);
  } catch {
    return undefined;
  }
}
