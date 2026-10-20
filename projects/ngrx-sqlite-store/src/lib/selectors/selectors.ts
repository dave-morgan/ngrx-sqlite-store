import * as ngrx from '@ngrx/store';
import type { Observable } from 'rxjs';
import { escapeSegment } from '../storage/path';
import { derived, SELECT_OPERATOR, source } from './metadata';

// Retain every NgRx overload, including dictionaries, arrays and deprecated props.
export const createSelector: typeof ngrx.createSelector = ((...args: any[]) =>
  derived(
    (ngrx.createSelector as (...inputs: any[]) => object)(...args),
    args,
  )) as typeof ngrx.createSelector;

export const createSelectorFactory: typeof ngrx.createSelectorFactory = ((...args: any[]) => {
  const factory = (ngrx.createSelectorFactory as (...args: any[]) => (...inputs: any[]) => object)(
    ...args,
  );
  return (...inputs: any[]) => derived(factory(...inputs), inputs);
}) as typeof ngrx.createSelectorFactory;

export const defaultMemoize = ngrx.defaultMemoize;
export const resultMemoize = ngrx.resultMemoize;
export const createFeatureSelector: typeof ngrx.createFeatureSelector = ((name: string) =>
  source(
    ngrx.createFeatureSelector(name),
    escapeSegment(name),
  )) as typeof ngrx.createFeatureSelector;

export const createFeature: typeof ngrx.createFeature = ((config: any) => {
  // NgRx calls this callback after constructing base selectors and before extras.
  // Decorating here lets our createSelector see precise dependencies in extras.
  return ngrx.createFeature({
    ...config,
    extraSelectors: (base: Record<string, object>) => {
      const root = `select${capitalize(config.name)}State`;
      source(base[root], escapeSegment(config.name));
      const initial = config.reducer(undefined, { type: '@ngrx/feature/init' });
      if (initial && typeof initial === 'object' && !Array.isArray(initial)) {
        for (const key of Object.keys(initial)) {
          const selector = base[`select${capitalize(key)}`];
          if (selector) source(selector, `${escapeSegment(config.name)}/${escapeSegment(key)}`);
        }
      }
      return config.extraSelectors?.(base) ?? {};
    },
  });
}) as typeof ngrx.createFeature;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const select: typeof ngrx.select = ((...args: any[]) =>
  (observable: Observable<unknown>) => {
    const route = (
      observable as unknown as {
        [SELECT_OPERATOR]?: (...args: unknown[]) => Observable<unknown>;
      }
    )[SELECT_OPERATOR];
    return route && !observable.operator
      ? route.apply(observable, args)
      : (ngrx.select as (...args: any[]) => (source: Observable<unknown>) => Observable<unknown>)(
          ...args,
        )(observable);
  }) as typeof ngrx.select;
