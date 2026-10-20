import { Injectable, NgZone, inject, isDevMode, signal } from '@angular/core';
import {
  ACTIVE_RUNTIME_CHECKS,
  ActionsSubject,
  INITIAL_REDUCERS,
  INITIAL_STATE,
  META_REDUCERS,
  ReducerManagerDispatcher,
  ScannedActionsSubject,
  UPDATE,
  USER_PROVIDED_META_REDUCERS,
  combineReducers,
  createAction,
  props,
} from '@ngrx/store';
import type { Action, ActionReducer } from '@ngrx/store';
import {
  fromSyncReducer,
  getTxReducerMetadata,
  isTxReducer,
  runHandlers,
} from '../reducer/reducer';
import { StoreTx } from '../reducer/store-tx';
import { NodeStore } from '../schema/node-store';
import { StoragePolicy } from '../schema/policy';
import { serializedSize } from '../schema/size';
import { escapeSegment } from '../storage/path';
import { StorageEngine } from '../storage/storage-engine';
import {
  COMMITTED_CACHE,
  DEFAULT_META_REDUCER,
  POST_COMMIT_HOOK,
  STORE_CONFIGURATION,
} from './tokens';
import type { RegisteredFeature } from './tokens';

export const nssReducerError = createAction(
  '[ngrx-sqlite-store] Reducer Error',
  props<{ action: Action; error: unknown }>(),
);
interface Feature extends RegisteredFeature {
  reducer: ActionReducer<any>;
  nodes: NodeStore;
  seed: unknown;
}

@Injectable()
export class SqliteStoreCore {
  readonly engine = inject(StorageEngine);
  private readonly actions = inject(ActionsSubject);
  private readonly scanned = inject(ScannedActionsSubject);
  private readonly dispatcher = inject(ReducerManagerDispatcher);
  private readonly config = inject(STORE_CONFIGURATION);
  private readonly initial = inject(INITIAL_STATE) as Record<string, unknown>;
  private readonly reducers = inject(INITIAL_REDUCERS) as Record<string, ActionReducer<any>>;
  private readonly metas = [
    ...inject(META_REDUCERS),
    ...inject(USER_PROVIDED_META_REDUCERS),
  ].filter((meta) => meta !== DEFAULT_META_REDUCER);
  private readonly checks = inject(ACTIVE_RUNTIME_CHECKS);
  private readonly cache = inject(COMMITTED_CACHE);
  private readonly hooks = inject(POST_COMMIT_HOOK, { optional: true }) ?? [];
  private readonly features = new Map<string, Feature>();
  private readonly state = signal<'closed' | 'opening' | 'ready' | 'error'>('closed');
  readonly status = this.state.asReadonly();
  private work: Promise<void> = Promise.resolve();
  private emission: Promise<void> = Promise.resolve();
  private readonly maintenance = new Set<Promise<void>>();
  private startup?: Promise<void>;
  private started = false;
  private readonly pending: Array<{ action: Action; validationError?: unknown }> = [];
  private readonly completions = new WeakMap<Action, Promise<void>>();
  private readonly subscription = this.actions.subscribe((action) => {
    let validationError: unknown;
    try {
      this.validate(action);
    } catch (error) {
      validationError = error;
    }
    if (!this.started) this.pending.push({ action, validationError });
    else this.enqueue(action, validationError);
  });

  initialize(): Promise<void> {
    return (this.startup ??= this.boot());
  }
  private async boot(): Promise<void> {
    this.state.set('opening');
    try {
      await this.engine.open();
      for (const [key, reducer] of Object.entries(this.reducers)) {
        this.register({
          key,
          reducers: reducer as ActionReducer<any>,
          initialState: this.initial?.[key],
        });
      }
      await this.seed([...this.features.values()]);
      // Features may register while open/seeding awaits I/O. Their queued seeds
      // must finish before the buffered INIT and subsequent actions are released.
      let registrations: Promise<void>;
      do {
        registrations = this.work;
        await registrations;
      } while (registrations !== this.work);
      this.state.set('ready');
      this.started = true;
      for (const { action, validationError } of this.pending.splice(0))
        this.enqueue(action, validationError);
    } catch (error) {
      this.state.set('error');
      if (isDevMode()) throw error;
    }
  }
  private register(feature: RegisteredFeature): Feature {
    if (
      typeof feature.reducers !== 'function' &&
      Object.values(feature.reducers).some(isTxReducer)
    ) {
      throw new Error(
        'Reducer maps use classic bridge reducers; register transaction reducers as individual features',
      );
    }
    let reducer: ActionReducer<any> =
      typeof feature.reducers === 'function'
        ? feature.reducers
        : (feature.reducerFactory ?? combineReducers)(feature.reducers);
    const metas = [...this.metas, ...(feature.metaReducers ?? [])];
    if (isTxReducer(reducer)) {
      if (metas.length && isDevMode() && !this.warnedMeta) {
        console.warn('Meta-reducers are ignored for transaction reducers');
        this.warnedMeta = true;
      }
    } else {
      for (const meta of [...metas].reverse()) reducer = meta(reducer);
      reducer = fromSyncReducer(reducer);
    }
    const registered = {
      ...feature,
      reducer,
      nodes: new NodeStore(
        new StoragePolicy({
          hints: (feature.sqlite ?? this.config.sqlite?.features?.[feature.key])?.hints,
        }),
      ),
      seed:
        feature.initialState === undefined
          ? getTxReducerMetadata(reducer)!.initialState
          : resolveInitial(feature.initialState),
    };
    this.features.set(feature.key, registered);
    return registered;
  }
  private warnedMeta = false;
  private async seed(features: Feature[]): Promise<void> {
    const { changes } = await this.engine.transaction(async (tx) => {
      for (const feature of features) {
        const options = feature.sqlite ?? this.config.sqlite?.features?.[feature.key];
        const version = options?.version ?? 1;
        const key = `feature:${feature.key}:version`;
        const [row] = await tx.query<{ value: string }>(
          'SELECT value FROM nss_meta WHERE key = ?',
          [key],
        );
        if (row && row.value === String(version)) continue;
        if (row && options?.onVersionMismatch !== 'reseed')
          throw new Error(`Feature version mismatch: ${feature.key}`);
        // Some foreign reducers (notably routerReducer) have no state until their first action.
        if (feature.seed !== undefined)
          await feature.nodes.write(tx, escapeSegment(feature.key), feature.seed, tx.changes);
        else if (row) await feature.nodes.delete(tx, escapeSegment(feature.key), tx.changes);
        await tx.run('INSERT OR REPLACE INTO nss_meta (key, value) VALUES (?, ?)', [
          key,
          String(version),
        ]);
      }
    });
    await Promise.all(this.hooks.map((hook) => hook(changes)));
  }
  addFeatures(features: RegisteredFeature[]): void {
    const registered = features.map((feature) => this.register(feature));
    if (this.started || this.startup) this.work = this.work.then(() => this.seed(registered));
    this.update(features.map((f) => f.key));
  }
  removeFeatures(keys: string[]): void {
    // Registry snapshots are captured at dispatch time, preserving queued actions.
    for (const key of keys) this.features.delete(key);
    this.update(keys);
  }
  private update(features: string[]): void {
    const action = { type: UPDATE, features };
    this.dispatcher.next(action);
    if (this.dispatcher !== this.actions) this.actions.next(action);
  }
  validate(action: Action): void {
    if (typeof action === 'function')
      throw new TypeError('Dispatch expected an object, instead it received a function.');
    if (!action) throw new TypeError('Actions must be objects');
    if (typeof action.type !== 'string') throw new TypeError('Actions must have a type property');
    if (
      this.checks.strictActionWithinNgZone &&
      !action.type.startsWith('@ngrx') &&
      action.type !== nssReducerError.type &&
      !NgZone.isInAngularZone()
    )
      throw new Error('Action dispatched outside NgZone');
    if (this.checks.strictActionSerializability && action.type !== nssReducerError.type)
      serializedSize(action, 'action');
    if (this.checks.strictActionImmutability) freeze(action);
  }
  dispatchAsync(action: Action): Promise<void> {
    this.validate(action);
    this.actions.next(action);
    if (!this.started) return this.initialize().then(() => this.completions.get(action));
    return this.completions.get(action)!;
  }
  private enqueue(action: Action, validationError?: unknown): void {
    const features = [...this.features.values()];
    const transaction = this.work.then(() =>
      this.engine.transaction(async (sql) => {
        if (validationError !== undefined) throw validationError;
        const cache = new Map<string, unknown>();
        const handles = features.map(
          (feature) =>
            new StoreTx(
              feature.key,
              feature.nodes,
              sql,
              sql.changes,
              cache,
              this.cache,
              feature.seed,
              async () => {
                for (const handle of handles) await handle.resetFeature();
              },
            ),
        );
        if (handles.length)
          for (const hook of this.config.sqlite?.actionHooks ?? []) await hook(action, handles[0]);
        for (const [index, feature] of features.entries())
          await runHandlers(feature.reducer, handles[index], action);
      }),
    );
    this.work = transaction.then(
      () => undefined,
      () => undefined,
    );
    const completion = this.emission.then(async () => {
      try {
        const { changes } = await transaction;
        await Promise.all(this.hooks.map((hook) => hook(changes)));
        this.scanned.next(action);
      } catch (error) {
        if (action.type !== nssReducerError.type)
          this.actions.next(nssReducerError({ action, error }));
        throw error;
      }
    });
    this.completions.set(action, completion);
    // Plain dispatch never observes the rejection; nssReducerError reports it instead.
    completion.catch(() => undefined);
    this.emission = completion.then(
      () => undefined,
      () => undefined,
    );
  }
  async settle(): Promise<void> {
    await this.initialize();
    do {
      const work = this.work,
        emission = this.emission;
      await Promise.all([work, emission, ...this.maintenance]);
      await this.engine.read(async () => undefined);
      if (work === this.work && emission === this.emission && this.maintenance.size === 0) return;
    } while (true);
  }
  purgeFeature(key: string): Promise<void> {
    const operation = this.purge(key);
    this.maintenance.add(operation);
    const cleanup = () => this.maintenance.delete(operation);
    void operation.then(cleanup, cleanup);
    return operation;
  }
  private async purge(key: string): Promise<void> {
    await this.initialize();
    await this.work;
    const { changes } = await this.engine.transaction(async (tx) => {
      await new NodeStore().delete(tx, escapeSegment(key), tx.changes);
      await tx.run('DELETE FROM nss_meta WHERE key = ?', [`feature:${key}:version`]);
    });
    await Promise.all(this.hooks.map((hook) => hook(changes)));
  }
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
export function resolveInitial(value: unknown): any {
  return typeof value === 'function' ? value() : value;
}
function freeze(value: unknown, seen = new WeakSet<object>()): void {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  Object.freeze(value);
  for (const child of Object.values(value)) freeze(child, seen);
}
