import { Injectable, NgZone, inject, isDevMode, signal } from '@angular/core';
import {
  ACTIVE_RUNTIME_CHECKS,
  ActionsSubject,
  INITIAL_REDUCERS,
  INITIAL_STATE,
  INIT,
  META_REDUCERS,
  ReducerManagerDispatcher,
  UPDATE,
  USER_PROVIDED_META_REDUCERS,
  combineReducers,
  createAction,
  props,
} from '@ngrx/store';
import type { Action, ActionReducer } from '@ngrx/store';
import type { Observer } from 'rxjs';
import {
  fromSyncReducer,
  getTxReducerMetadata,
  isTxReducer,
  runHandlers,
} from '../reducer/reducer';
import { StoreTx } from '../reducer/store-tx';
import { NodeStore } from '../schema/node-store';
import { StoragePolicy } from '../schema/policy';
import { ensureQueryIndexes } from '../schema/query-indexes';
import { serializedSize } from '../schema/size';
import { escapeSegment, splitPath } from '../storage/path';
import { StorageEngine } from '../storage/storage-engine';
import {
  COMMITTED_CACHE,
  DEFAULT_META_REDUCER,
  POST_COMMIT_HOOK,
  STORE_CONFIGURATION,
  SELECTION_ENGINE,
} from './tokens';
import type { RegisteredFeature } from './tokens';
import { Injector } from '@angular/core';
import { NSS_CAPTURE, NSS_EMIT, NssScannedActionsSubject } from './scanned-actions-subject';
import { State } from './state';
import { PREWARM_READY } from './prewarm';

export const nssReducerError = createAction(
  '[ngrx-sqlite-store] Reducer Error',
  props<{ action: Action; error: unknown }>(),
);
interface Feature extends RegisteredFeature {
  reducer: ActionReducer<any>;
  nodes: NodeStore;
  seed: unknown;
  router: boolean;
  persist: boolean;
  seeded: boolean;
}

@Injectable()
export class SqliteStoreCore {
  private readonly injector = inject(Injector);
  readonly engine = inject(StorageEngine);
  private readonly prewarm = inject(PREWARM_READY, { optional: true });
  private readonly actions = inject(ActionsSubject);
  private readonly scanned = inject(NssScannedActionsSubject);
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
  /** Router-store's synchronous feedback guard cannot span an async commit. */
  deferWholeState = false;
  private latestNavigationId?: number;
  private readonly pending: Array<{
    action: Action;
    validationError?: unknown;
    audience?: readonly Observer<Action>[];
  }> = [];
  private readonly completions = new WeakMap<Action, Promise<void>>();
  private readonly subscription = this.actions.subscribe((action) => {
    // The extension's separate ReducerManagerDispatcher is intentionally not
    // subscribed here: only ActionsSubject carries application work.
    if (action.type === '@ngrx/router-store/request')
      this.latestNavigationId = navigationId(action);
    let validationError: unknown;
    try {
      this.validate(action);
    } catch (error) {
      validationError = error;
    }
    // Lifecycle actions must only reach effects that could observe them when
    // dispatched. Async bootstrap must not replay early INIT/UPDATE to new effects.
    const audience = LIFECYCLE_ACTIONS.has(action.type) ? this.scanned[NSS_CAPTURE]() : undefined;
    if (!this.started) this.pending.push({ action, validationError, audience });
    else this.enqueue(action, validationError, audience);
  });

  initialize(): Promise<void> {
    return (this.startup ??= this.boot());
  }
  private async boot(): Promise<void> {
    this.state.set('opening');
    try {
      await (this.prewarm ?? this.engine.open());
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
      await this.injector.get(SELECTION_ENGINE).preload(this.config.sqlite?.eager ?? []);
      this.state.set('ready');
      this.started = true;
      for (const { action, validationError, audience } of this.pending.splice(0))
        this.enqueue(action, validationError, audience);
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
    const bridge = !isTxReducer(reducer) || !!getTxReducerMetadata(reducer).fallback;
    const sqlite = { ...this.config.sqlite?.features?.[feature.key], ...feature.sqlite };
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
      sqlite,
      router: feature.key === 'router' && bridge,
      persist: sqlite.persist ?? !(feature.key === 'router' && bridge),
      seeded: false,
      nodes: new NodeStore(
        new StoragePolicy({
          hints: sqlite.hints,
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
  /** Session state is invisible to readers until its registration seed commits. */
  selectionReady(path: string): boolean {
    if (path === '')
      return [...this.features.values()].every((feature) => feature.persist || feature.seeded);
    const feature = this.features.get(splitPath(path)[0]);
    return !feature || feature.persist || feature.seeded;
  }
  /** Internal registry/default snapshot for the read side, including pre-bootstrap roots. */
  selectionFeatures(): Record<string, unknown> {
    const result = Object.fromEntries(
      [...this.features].map(([key, feature]) => [key, feature.seed]),
    );
    if (!this.started)
      for (const [key, reducer] of Object.entries(this.reducers)) {
        if (!Object.hasOwn(result, key))
          Object.defineProperty(result, key, {
            value:
              this.initial?.[key] ??
              (isTxReducer(reducer)
                ? getTxReducerMetadata(reducer)!.initialState
                : reducer(undefined, { type: '@ngrx/feature/init' })),
            enumerable: true,
            configurable: true,
            writable: true,
          });
      }
    return result;
  }
  private async seed(features: Feature[]): Promise<void> {
    const { changes } = await this.engine.transaction(async (tx) => {
      const versions = new Map<string, string>();
      const catalog: { name: string; tbl_name: string; sql: string }[] = [];
      const parameterLimit = 999;
      for (let offset = 0; offset < features.length; offset += parameterLimit) {
        const keys = features.slice(offset, offset + parameterLimit)
          .map((feature) => `feature:${feature.key}:version`);
        const rows = await tx.query<{ key: string | null; value: string; name: string; tbl_name: string; sql: string }>(
          `SELECT key, value, NULL AS name, NULL AS tbl_name, NULL AS sql FROM nss_meta WHERE key IN (${keys.map(() => '?').join(',')})` +
            (offset === 0 ? " UNION ALL SELECT NULL,NULL,name,tbl_name,sql FROM sqlite_master WHERE type = 'index' AND name GLOB 'nss_query_*'" : ''),
          keys,
        );
        for (const row of rows) {
          if (typeof row.key === 'string') versions.set(row.key, row.value);
          else catalog.push(row);
        }
      }
      await ensureQueryIndexes(tx, features.map((feature) => feature.seed), catalog);
      for (const feature of features) {
        const options = feature.sqlite ?? this.config.sqlite?.features?.[feature.key];
        const version = options?.version ?? 1;
        const key = `feature:${feature.key}:version`;
        const previousVersion = versions.get(key);
        if (feature.persist && previousVersion === String(version)) continue;
        if (feature.persist && previousVersion !== undefined && options?.onVersionMismatch !== 'reseed')
          throw new Error(`Feature version mismatch: ${feature.key}`);
        if (!feature.persist && previousVersion === String(version)) {
          const stored = await feature.nodes.read(tx, escapeSegment(feature.key));
          if (JSON.stringify(stored) === JSON.stringify(feature.seed)) continue;
        }
        // Some foreign reducers (notably routerReducer) have no state until their first action.
        if (feature.seed !== undefined)
          await feature.nodes.write(tx, escapeSegment(feature.key), feature.seed, tx.changes);
        else if (previousVersion !== undefined || !feature.persist)
          await feature.nodes.delete(tx, escapeSegment(feature.key), tx.changes);
        await (tx.write ?? tx.run)('INSERT OR REPLACE INTO nss_meta (key, value) VALUES (?, ?)', [
          key,
          String(version),
        ]);
        versions.set(key, String(version));
      }
    });
    for (const feature of features) feature.seeded = true;
    // NgRx router-store uses its own pipeable select, outside our path leases.
    // Pin its conventional bridge slice with this registration's eager roots.
    // All session seeds above have committed before these reads are queued.
    await this.injector.get(SELECTION_ENGINE).preload(
      features.filter((feature) =>
        feature.router || this.config.sqlite?.eager?.includes(feature.key),
      ).map((feature) => feature.key),
    );
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
  private enqueue(
    action: Action,
    validationError?: unknown,
    audience?: readonly Observer<Action>[],
  ): void {
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
    const completion = this.emission.then(async () => {
      try {
        const { changes } = await transaction;
        const state = this.injector.get(State);
        const previousView = state.value;
        const releaseWholeState =
          this.deferWholeState &&
          ROUTER_TERMINAL_ACTIONS.has(action.type) &&
          (this.latestNavigationId === undefined ||
            navigationId(action) === this.latestNavigationId);
        if (
          action.type === '@ngrx/router-store/request' ||
          action.type === '@ngrx/router-store/navigation'
        )
          this.deferWholeState = true;
        if (releaseWholeState) this.deferWholeState = false;
        await Promise.all(this.hooks.map((hook) => hook(changes)));
        if (releaseWholeState && state.value === previousView) state.next(state.value);
        // Classic NgRx completes bootstrap lifecycle actions before effects attach.
        this.scanned[NSS_EMIT](action, audience);
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
    // Keep each commit, refresh and scanned emission together. Otherwise a burst
    // from an effect can commit N+1 before selectors/effects observe N.
    this.work = this.emission;
  }
  async settle(): Promise<void> {
    await this.initialize();
    do {
      const work = this.work,
        emission = this.emission;
      await Promise.all([work, emission, ...this.maintenance]);
      await this.engine.read(async () => undefined);
      await this.engine.maintained();
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
const ROUTER_TERMINAL_ACTIONS = new Set([
  '@ngrx/router-store/navigated',
  '@ngrx/router-store/cancel',
  '@ngrx/router-store/error',
]);
const LIFECYCLE_ACTIONS = new Set([INIT, UPDATE, '@ngrx/effects/init']);
function navigationId(action: Action): number | undefined {
  return (action as Action & { payload?: { event?: { id?: number } } }).payload?.event?.id;
}
export function resolveInitial(value: unknown): any {
  return typeof value === 'function' ? value() : value;
}
function freeze(value: unknown, seen = new WeakSet<object>()): void {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  Object.freeze(value);
  // NgRx's immutability meta-reducer also skips already frozen children. Store
  // dispatch validates before ActionsSubject, whose direct callers need their
  // own validation; do not walk the same bulk payload again on that second pass.
  for (const child of Object.values(value))
    if (child && typeof child === 'object' && !Object.isFrozen(child)) freeze(child, seen);
}
