import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Actions, ROOT_EFFECTS_INIT, createEffect, ofType } from '@ngrx/effects';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Store } from '@store';
import { todosFeature, uiFeature } from '@impl';
import { filter, map, switchMap, take, tap, withLatestFrom } from 'rxjs';

import { SeedActions, TodosActions, UiActions } from './actions';
import { DEFAULT_SEED_SIZE, SEED_VERSION, generateSeed } from './seed';

/**
 * Seed size can be overridden with `?seed=<n>` (e2e) or `localStorage['harness:seed']`
 * (Android benchmarks: the Capacitor WebView drops query strings on reload).
 */
function requestedSeedSize(doc: Document): number {
  const raw =
    new URL(doc.location.href).searchParams.get('seed') ?? doc.defaultView?.localStorage.getItem('harness:seed') ?? null;
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_SEED_SIZE;
}

// ── Functional effects ─────────────────────────────────────────────────────

/** On boot: seed only if the store has no data at the current seed version. */
export const seedOnInit = createEffect(
  (actions$ = inject(Actions), store = inject(Store), doc = inject(DOCUMENT)) =>
    actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      // switchMap+take(1), not withLatestFrom: the first read may be async (sqlite store).
      switchMap(() => store.select(todosFeature.selectSeedVersion).pipe(take(1))),
      map((version) =>
        version === SEED_VERSION ? SeedActions.seedSkipped() : SeedActions.seedRequested({ size: requestedSeedSize(doc) }),
      ),
    ),
  { functional: true },
);

export const loadSeed = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(SeedActions.seedRequested),
      map(({ size }) => SeedActions.seedLoaded({ data: generateSeed(size), version: SEED_VERSION })),
    ),
  { functional: true },
);

/** router-store integration: every completed navigation is recorded in the ui slice. */
export const trackVisits = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(routerNavigatedAction),
      map(({ payload }) => UiActions.pageVisited({ url: payload.routerState.url })),
    ),
  { functional: true },
);

/** Non-dispatching effect: reflects the theme onto <html>. */
export const applyTheme = createEffect(
  (store = inject(Store), doc = inject(DOCUMENT)) =>
    store.select(uiFeature.selectTheme).pipe(tap((theme) => (doc.documentElement.dataset['theme'] = theme))),
  { functional: true, dispatch: false },
);

// ── Class-based effects ────────────────────────────────────────────────────

@Injectable()
export class TodosEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);

  /**
   * The key ordering contract (ADR-0003): when this effect sees `todoAdded`,
   * withLatestFrom must already observe the state *after* the reducer ran.
   */
  readonly observeAfterAdd$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TodosActions.todoAdded, TodosActions.todoToggled, TodosActions.todoRemoved),
      withLatestFrom(this.store.select(todosFeature.selectOpenCount), this.store.select(todosFeature.selectTodoTotal)),
      filter(([, , total]) => total >= 0),
      map(([action, openCount, totalCount]) =>
        UiActions.effectObserved({ observation: { action: action.type, openCount, totalCount } }),
      ),
    ),
  );
}
