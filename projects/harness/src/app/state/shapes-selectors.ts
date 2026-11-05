import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { MemoizedSelector, createSelector } from '@store';
import { flatFeature, workflowFeature } from '@impl/shapes';
import { delay, map } from 'rxjs';

import { FIELD_PATHS, FlatValue, WorkflowActions, flatKey, getIn } from './shapes';

type AnySelector<T> = MemoizedSelector<object, T>;

/** createFeature's per-property selector for a flat key (`k0001` → `selectK0001`). */
export function flatKeySelector(key: string): AnySelector<FlatValue | undefined> {
  const name = `select${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  const selector = (flatFeature as unknown as Record<string, AnySelector<FlatValue | undefined>>)[name];
  if (!selector) throw new Error(`No selector ${name}; is harness:flatKeys large enough?`);
  return selector;
}

export const FLAT_TARGET_KEY = flatKey(1);
export const selectFlatTarget = flatKeySelector(FLAT_TARGET_KEY);

/** Whole-object subscription: number of keys. */
export const selectFlatKeyCount = createSelector(flatFeature.selectFlatState, (s) => Object.keys(s).length);

/** Derived selector over the first 20 keys. */
const first20 = Array.from({ length: 20 }, (_, i) => flatKeySelector(flatKey(i)));
export const selectFlatDerived = (createSelector as unknown as (...args: unknown[]) => AnySelector<number>)(
  ...first20,
  (...values: (FlatValue | undefined)[]) => values.filter((v) => v !== false && v !== undefined).length,
);

export const selectWorkflowField = {
  d1: createSelector(workflowFeature.selectForm, (f) => String(getIn(f, FIELD_PATHS.d1))),
  d4: createSelector(workflowFeature.selectForm, (f) => String(getIn(f, FIELD_PATHS.d4))),
  d10: createSelector(workflowFeature.selectForm, (f) => String(getIn(f, FIELD_PATHS.d10))),
};
export const selectEventCount = createSelector(workflowFeature.selectEvents, (e) => e.length);
export const selectDraftCount = createSelector(workflowFeature.selectDrafts, (d) => d.ids.length);
export const selectValidationErrors = createSelector(
  workflowFeature.selectValidation,
  (v) => Object.values(v).filter((x) => x !== null).length,
);

/** Simulated API call: identical latency for both implementations. */
export const simulateWorkflowLoad = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(WorkflowActions.loadStarted),
      delay(30),
      map(() => WorkflowActions.loadSucceeded({ at: Date.now() })),
    ),
  { functional: true },
);
