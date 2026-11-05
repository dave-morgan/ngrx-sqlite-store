import { isDevMode } from '@angular/core';
import { INIT } from '@ngrx/store';
import type { Action, ActionCreator, ActionReducer, ActionType } from '@ngrx/store';
import { escapeSegment } from '../storage/path';
import type { StoreTx } from './store-tx';
import { routerSnapshot } from './router-snapshot';

export const NSS_TX_REDUCER = Symbol('NSS_TX_REDUCER');
export interface Handler<S> {
  kind: 'tx' | 'state';
  reducer: (tx: StoreTx<S>, action: Action) => void | Partial<S> | Promise<void | Partial<S>>;
}
export interface TxReducerMetadata<S> {
  initialState: S;
  handlers: Map<string, Handler<S>[]>;
  /** Foreign reducers must observe every action, including unknown types. */
  fallback?: Handler<S>;
}
export type TxReducer<S, A extends Action = Action> = ActionReducer<S, A> & {
  readonly [NSS_TX_REDUCER]: TxReducerMetadata<S>;
};
export interface ReducerTypes<S, Creators extends readonly ActionCreator[]> {
  types: { [Key in keyof Creators]: Creators[Key] extends ActionCreator<infer T> ? T : never };
  handler: Handler<S>;
}
export interface OnReducer<S, Creators extends readonly ActionCreator[], InferredState = S> {
  (
    tx: StoreTx<unknown extends S ? InferredState : S>,
    action: ActionType<Creators[number]>,
  ):
    | void
    | Partial<unknown extends S ? InferredState : S>
    | Promise<void | Partial<unknown extends S ? InferredState : S>>;
}
export function on<S, Creators extends readonly ActionCreator[], InferredState = S>(
  ...args: [
    ...creators: Creators,
    reducer: OnReducer<S extends infer State ? State : never, Creators, InferredState>,
  ]
): ReducerTypes<unknown extends S ? InferredState : S, Creators> {
  const reducer = args.pop() as OnReducer<S, Creators>;
  const creators = args as unknown as Creators;
  return {
    types: creators.map((creator) => creator.type) as ReducerTypes<S, Creators>['types'],
    handler: {
      kind: 'tx',
      reducer: reducer as Handler<unknown extends S ? InferredState : S>['reducer'],
    },
  };
}
export function onState<S, Creators extends readonly ActionCreator[], InferredState = S>(
  ...args: [
    ...creators: Creators,
    reducer: (
      state: unknown extends S ? InferredState : S,
      action: ActionType<Creators[number]>,
    ) => unknown extends S ? InferredState : S,
  ]
): ReducerTypes<unknown extends S ? InferredState : S, Creators> {
  type State = unknown extends S ? InferredState : S;
  const reducer = args.pop() as (state: State, action: Action) => State;
  const creators = args as unknown as Creators;
  return {
    types: creators.map((creator) => creator.type) as ReducerTypes<State, Creators>['types'],
    handler: {
      kind: 'state',
      reducer: async (tx, action) => {
        await tx.set('', reducer(await tx.get(), action));
      },
    },
  };
}
export function createReducer<S, A extends Action = Action>(
  initialState: S,
  ...ons: ReducerTypes<S, readonly ActionCreator[]>[]
): TxReducer<S, A> {
  const handlers = new Map<string, Handler<S>[]>();
  for (const registration of ons)
    for (const type of registration.types)
      handlers.set(type, [...(handlers.get(type) ?? []), registration.handler]);
  let warned = false;
  const reducer: ActionReducer<S, A> = (state) => {
    if (isDevMode() && !warned) {
      warned = true;
      console.warn(
        'Transaction reducers run through the SQLite store; synchronous calls return the current state.',
      );
    }
    return state ?? initialState;
  };
  Object.defineProperty(reducer, NSS_TX_REDUCER, {
    value: { initialState, handlers },
    enumerable: false,
  });
  return reducer as TxReducer<S, A>;
}
export function isTxReducer<S = unknown>(value: unknown): value is TxReducer<S> {
  return typeof value === 'function' && Object.hasOwn(value, NSS_TX_REDUCER);
}
export function getTxReducerMetadata<S>(reducer: ActionReducer<S>): TxReducerMetadata<S> {
  if (!isTxReducer<S>(reducer)) throw new Error('Reducer is not a transaction reducer');
  return reducer[NSS_TX_REDUCER];
}
export function fromSyncReducer<S, A extends Action = Action>(
  classic: ActionReducer<S, A>,
): TxReducer<S, A> {
  const reducer = createReducer<S, A>(classic(undefined, { type: INIT } as A));
  reducer[NSS_TX_REDUCER].fallback = {
    kind: 'state',
    reducer: async (tx, action) => {
      const previous = await tx.get();
      await tx.set('', routerSnapshot(previous, classic(previous, action as A), action));
    },
  };
  return reducer;
}
export async function runHandlers<S>(
  reducer: ActionReducer<S>,
  tx: StoreTx<S>,
  action: Action,
): Promise<void> {
  const metadata = getTxReducerMetadata(reducer);
  const handlers = metadata.fallback
    ? [metadata.fallback]
    : (metadata.handlers.get(action.type) ?? []);
  for (const handler of handlers) {
    const partial = await handler.reducer(tx, action);
    if (partial !== undefined) {
      // Unchanged keys (identical references) are no-ops for set(): skip them before any
      // read, so a whole-object return costs O(changed) store work, not O(keys).
      // One root lookup instead of a path lookup per key when the root is known.
      const root = tx.currentRoot();
      // Pairs are built only for changed keys: Object.entries would allocate one per key.
      const source = partial as Record<string, unknown>;
      const entries: [string, unknown][] = [];
      for (const key of Object.keys(source)) {
        const value = source[key];
        if (
          root && value !== undefined
            ? !Object.hasOwn(root, key) || root[key] !== value
            : !tx.isCurrent(escapeSegment(key), value)
        )
          entries.push([key, value]);
      }
      // One batched read for every key's previous value instead of one round trip each.
      await tx.prefetch(entries.map(([key]) => escapeSegment(key)));
      for (const [key, value] of entries) await tx.set(escapeSegment(key), value);
    }
  }
}
export { combineReducers, compose, createReducerFactory } from '@ngrx/store';
