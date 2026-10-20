import { DestroyRef, Injectable, Injector, computed, inject, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { SqliteStoreCore } from '../store/core';
import { State } from '../store/state';
import type { SelectionEngine } from '../store/tokens';
import { escapeSegment, joinPath } from '../storage/path';
import { dependencies } from './metadata';
import { PathCache } from './path-cache';
import { share } from './view-state';

type Projection = (state: any, props?: any) => unknown;

@Injectable()
export class SqliteSelectionEngine implements SelectionEngine {
  private readonly cache = inject(PathCache);
  private readonly injector = inject(Injector);
  private readonly destroy = inject(DestroyRef);
  private readonly state = inject(State);
  private readonly wholeSubscribers = new Set<Map<string, () => void>>();
  private readonly eager = new Map<string, () => void>();
  private readonly loads = new Set<Promise<void>>();
  private registered?: Set<string>;
  private viewState: object = Object.freeze({});
  private readonly subscription = this.cache.generations.subscribe(() => this.publishView());
  private get core(): SqliteStoreCore {
    return this.injector.get(SqliteStoreCore);
  }

  select<T>(_store: unknown, ...args: unknown[]): Observable<T> {
    const { selector, props, paths } = this.arguments(args);
    return new Observable<T>((subscriber) =>
      this.watch(
        selector,
        props,
        paths,
        false,
        (value) => subscriber.next(value as T),
        (error) => subscriber.error(error),
      ),
    );
  }
  selectSignal<T>(
    _store: unknown,
    selector: Projection,
    options?: { equal?: (a: T, b: T) => boolean },
  ): Signal<T> {
    const value = signal<unknown>(undefined);
    let failure: unknown;
    let failed = false;
    const stop = this.watch(
      selector,
      undefined,
      dependencies(selector),
      true,
      (next) => {
        failed = false;
        failure = undefined;
        value.set(next);
      },
      (error) => {
        failed = true;
        failure = error;
        value.set({});
      },
    );
    let owner = this.destroy;
    try {
      owner = inject(DestroyRef);
    } catch {
      /* Outside a context, use the store's lifetime. */
    }
    owner.onDestroy(stop);
    return computed(() => {
      this.cache.generation();
      if (failed) throw failure;
      return value() as T;
    }, options);
  }

  private arguments(args: unknown[]): {
    selector: Projection;
    props?: unknown;
    paths: readonly string[] | 'dynamic';
  } {
    if (typeof args[0] === 'function')
      return {
        selector: args[0] as Projection,
        props: args[1],
        paths: dependencies(args[0]),
      };
    if (!args.length || args.some((key) => typeof key !== 'string'))
      throw new TypeError('select expects a selector function or string keys');
    const keys = args as string[];
    return {
      selector: (state) => keys.reduce((value, key) => value?.[key], state),
      paths: [joinPath(...keys)],
    };
  }

  private watch(
    selector: Projection,
    props: unknown,
    paths: readonly string[] | 'dynamic',
    defaults: boolean,
    emit: (value: unknown) => void,
    error: (error: unknown) => void,
  ): () => void {
    const leases = new Map<string, () => void>();
    const loading = new Set<string>();
    let stopped = false;
    let evaluating = false;
    let previous: unknown;
    let emitted = false;
    let defaultView: unknown;

    const update = (required: Set<string>) => {
      for (const [path, release] of leases)
        if (!required.has(path)) {
          leases.delete(path);
          release();
        }
      for (const path of required) if (!leases.has(path)) leases.set(path, this.cache.retain(path));
      for (const path of required)
        if (!this.cache.ready(path) && !loading.has(path)) {
          loading.add(path);
          void this.load(path).then(
            () => {
              loading.delete(path);
              evaluate();
            },
            (failure) => {
              loading.delete(path);
              if (!stopped) error(failure);
            },
          );
        }
    };
    const evaluate = () => {
      if (stopped || evaluating) return;
      evaluating = true;
      try {
        let view = this.viewState;
        if (defaults) {
          // Merge only unloaded branches; loaded null/undefined values are authoritative.
          const filled = this.cache.withDefaults(this.core.selectionFeatures());
          defaultView = share(defaultView, filled);
          view = defaultView as object;
        }
        const required = new Set<string>(paths === 'dynamic' ? [] : paths);
        let result: unknown;
        let thrown: unknown;
        let didThrow = false;
        if (paths === 'dynamic') {
          const root = { ...view };
          const track = (key: PropertyKey) => {
            if (typeof key === 'string') required.add(escapeSegment(key));
          };
          const proxy = new Proxy(root, {
            get: (target, key, receiver) => {
              track(key);
              return Reflect.get(target, key, receiver);
            },
            has: (target, key) => {
              track(key);
              return Reflect.has(target, key);
            },
            ownKeys: (target) => {
              const keys = new Set([
                ...Reflect.ownKeys(target),
                ...Object.keys(this.core.selectionFeatures()),
              ]);
              for (const key of keys) track(key);
              return [...keys];
            },
          });
          try {
            result = selector(proxy, props);
            if (result === proxy) {
              for (const key of Object.keys(this.core.selectionFeatures())) track(key);
              result = view;
            }
          } catch (failure) {
            thrown = failure;
            didThrow = true;
          }
        }
        update(required);
        const ready = [...required].every((path) => this.cache.ready(path));
        if (!ready && !defaults) return;
        if (didThrow) {
          // A missing feature may make an arbitrary lambda throw on the discovery pass.
          if (!ready) return;
          throw thrown;
        }
        if (paths !== 'dynamic') result = selector(view, props);
        if (defaults || !emitted || result !== previous) {
          previous = result;
          emitted = true;
          emit(result);
        }
      } catch (failure) {
        error(failure);
      } finally {
        evaluating = false;
      }
    };
    const generations = this.cache.generations.subscribe(evaluate);
    return () => {
      stopped = true;
      generations.unsubscribe();
      for (const release of leases.values()) release();
      leases.clear();
    };
  }
  private load(path: string): Promise<void> {
    const operation = this.core.initialize().then(() => this.cache.ensure(path));
    this.loads.add(operation);
    void operation.then(
      () => this.loads.delete(operation),
      () => this.loads.delete(operation),
    );
    return operation;
  }

  async refresh(): Promise<void> {
    this.registered = new Set(Object.keys(this.core.selectionFeatures()));
    for (const leases of this.wholeSubscribers) this.pinRegistered(leases);
    const pinned = new Set([...this.wholeSubscribers].flatMap((leases) => [...leases.keys()]));
    await Promise.all([...pinned].map((path) => this.cache.ensure(path)));
    await this.cache.refresh();
    this.cache.notify();
    // A conditional dynamic selector can discover another feature during refresh.
    // Drain those loads before ScannedActions, but never await bootstrap from its own hook.
    if (this.core.status() === 'ready') while (this.loads.size) await Promise.all([...this.loads]);
  }
  private publishView(): void {
    const next = this.registered
      ? Object.fromEntries(
          Object.entries(this.cache.view).filter(([key]) => this.registered!.has(key)),
        )
      : this.cache.view;
    const view = share(this.viewState, next) as object;
    if (view !== this.viewState) {
      this.viewState = view;
      this.state.next(view);
    }
  }
  private pinRegistered(leases: Map<string, () => void>): void {
    const keys = new Set(Object.keys(this.core.selectionFeatures()).map(escapeSegment));
    for (const [key, release] of leases)
      if (!keys.has(key)) {
        release();
        leases.delete(key);
      }
    for (const key of keys)
      if (!leases.has(key)) {
        leases.set(key, this.cache.retain(key));
        // The caller awaits these loads through refresh/preload as appropriate.
      }
  }
  pinAll(): () => void {
    const leases = new Map<string, () => void>();
    this.wholeSubscribers.add(leases);
    this.pinRegistered(leases);
    for (const path of leases.keys())
      void this.load(path).catch((error) => this.state.error(error));
    return () => {
      this.wholeSubscribers.delete(leases);
      for (const release of leases.values()) release();
    };
  }
  async preload(paths: string[]): Promise<void> {
    for (const key of paths) {
      const path = escapeSegment(key);
      if (!this.eager.has(path)) this.eager.set(path, this.cache.retain(path));
      await this.cache.ensure(path);
    }
  }
  async materialize(): Promise<object> {
    await this.core.initialize();
    const releases: Array<() => void> = [];
    try {
      for (const key of Object.keys(this.core.selectionFeatures())) {
        const path = escapeSegment(key);
        releases.push(this.cache.retain(path));
        await this.cache.ensure(path);
      }
      return this.viewState;
    } finally {
      for (const release of releases) release();
    }
  }
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    for (const release of this.eager.values()) release();
  }
}
