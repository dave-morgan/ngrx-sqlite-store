import { Component, Injectable, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationStart, Router, provideRouter } from '@angular/router';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Actions, createEffect, provideEffects } from '@ngrx/effects';
import {
  NavigationActionTiming,
  ROUTER_CANCEL,
  ROUTER_ERROR,
  ROUTER_NAVIGATION,
  ROUTER_NAVIGATED,
  RouterState,
  RouterStateSerializer,
  getRouterSelectors,
  provideRouterStore,
  routerReducer,
} from '@ngrx/router-store';
import * as ngrx from '@ngrx/store';
import { Subscription, firstValueFrom, tap } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { SqliteStoreCore } from '../store/core';
import { provideStore } from '../store/provide';
import { Store } from '../store/store';

@Component({ template: 'router compatibility page' })
class Page {}

interface JsonRoute {
  params: Record<string, unknown>;
  queryParams: Record<string, unknown>;
  data: Record<string, unknown>;
  firstChild: JsonRoute | null;
}

@Injectable()
class JsonRouterSerializer implements RouterStateSerializer<{ url: string; root: JsonRoute }> {
  serialize(snapshot: RouterStateSnapshot) {
    const route = (value: ActivatedRouteSnapshot): JsonRoute => ({
      params: { ...value.params },
      queryParams: { ...value.queryParams },
      data: { ...value.data },
      firstChild: value.firstChild ? route(value.firstChild) : null,
    });
    return { url: snapshot.url, root: route(snapshot.root) };
  }
}

// ADR-0020 promises JSON data parity; Angular snapshot prototypes and undefined
// object fields are deliberately outside the persisted router contract.
function json(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

interface ObservedRouterAction extends ngrx.Action {
  payload: {
    routerState: unknown;
    storeState?: unknown;
    event: { id: number; url: string; urlAfterRedirects?: string; code?: number; error?: unknown };
  };
}

async function runRouterScenario(
  sqlite: boolean,
  full: boolean,
  navigationActionTiming: NavigationActionTiming,
) {
  const actions: unknown[] = [];
  const timing: string[] = [];
  const urls: unknown[] = [];
  const ids: unknown[] = [];
  const queries: unknown[] = [];
  const states: unknown[] = [];
  const subscriptions = new Subscription();
  let core: SqliteStoreCore | undefined;
  const observe = createEffect(
    (source = inject(Actions<ngrx.Action>)) =>
      source.pipe(
        tap((action: ngrx.Action) => {
          if (!action.type.startsWith('@ngrx/router-store/')) return;
          const { payload } = action as ObservedRouterAction;
          // Full events contain Angular's cyclic snapshot. Compare their public
          // navigation identity and error as well as the entire serializer output.
          actions.push({
            type: action.type,
            routerState: json(payload.routerState),
            ...(payload.storeState === undefined ? {} : { storeState: json(payload.storeState) }),
            event: {
              id: payload.event.id,
              url: payload.event.url,
              urlAfterRedirects: payload.event.urlAfterRedirects,
              code: payload.event.code,
              error:
                payload.event.error instanceof Error
                  ? payload.event.error.message
                  : payload.event.error,
            },
          });
        }),
      ),
    { functional: true, dispatch: false },
  );
  try {
    TestBed.configureTestingModule({
      providers: [
        sqlite
          ? provideStore({ router: routerReducer }, { sqlite: { driver: new SqlJsDriver() } })
          : ngrx.provideStore({ router: routerReducer }),
        provideEffects({ observe }),
        provideRouter([
          {
            path: 'items/:id',
            component: Page,
            canActivate: [
              () => {
                timing.push('guard:allow');
                return true;
              },
            ],
          },
          {
            path: 'blocked',
            component: Page,
            canActivate: [
              () => {
                timing.push('guard:cancel');
                return false;
              },
            ],
          },
          {
            path: 'broken',
            component: Page,
            resolve: {
              value: () => {
                throw new Error('router compatibility failure');
              },
            },
          },
        ]),
        provideRouterStore({
          navigationActionTiming,
          ...(full ? { routerState: RouterState.Full, serializer: JsonRouterSerializer } : {}),
        }),
      ],
    });
    const store = TestBed.inject(ngrx.Store);
    if (sqlite) core = TestBed.inject(SqliteStoreCore);
    const settle = async () => {
      if (sqlite) await TestBed.inject(Store).settle();
    };
    await settle();
    subscriptions.add(
      TestBed.inject(ngrx.ActionsSubject).subscribe((action) => {
        if (action.type === ROUTER_NAVIGATION) timing.push('navigation');
      }),
    );
    const selectors = getRouterSelectors();
    subscriptions.add(store.select(selectors.selectUrl).subscribe((value) => urls.push(value)));
    subscriptions.add(
      store.select(selectors.selectRouteParam('id')).subscribe((value) => ids.push(value)),
    );
    subscriptions.add(
      store.select(selectors.selectQueryParam('q')).subscribe((value) => queries.push(value)),
    );
    await settle();
    const snapshot = async () => {
      await settle();
      states.push(
        json(
          sqlite
            ? await TestBed.inject(Store).materialize()
            : await firstValueFrom(store.select((state) => state)),
        ),
      );
    };
    const harness = await RouterTestingHarness.create('/items/1?q=first');
    await snapshot();
    await harness.navigateByUrl('/items/2?q=second');
    await snapshot();
    await harness.navigateByUrl('/blocked');
    await snapshot();
    await expect(harness.navigateByUrl('/broken')).rejects.toThrow('router compatibility failure');
    await snapshot();
    await harness.navigateByUrl('/items/3?q=last');
    await snapshot();
    expect(actions.filter((action) => (action as ngrx.Action).type === ROUTER_CANCEL)).toHaveLength(
      1,
    );
    expect(actions.filter((action) => (action as ngrx.Action).type === ROUTER_ERROR)).toHaveLength(
      1,
    );
    expect(urls.at(-1)).toBe('/items/3?q=last');
    expect(ids.at(-1)).toBe('3');
    expect(queries.at(-1)).toBe('last');
    const firstGuard = timing.indexOf('guard:allow');
    const firstNavigation = timing.indexOf('navigation');
    expect(firstNavigation < firstGuard).toBe(
      navigationActionTiming === NavigationActionTiming.PreActivation,
    );
    return { actions, timing, urls, ids, queries, states };
  } finally {
    subscriptions.unsubscribe();
    TestBed.resetTestingModule();
    await core?.engine.close();
  }
}

describe('router-store compatibility with real NgRx', () => {
  for (const persist of [undefined, false, true]) {
    it(`restarts with ${persist === true ? 'the saved URL' : 'the launch URL'} when router persist is ${persist}`, async () => {
      let data: Uint8Array | undefined;
      for (const restart of [false, true]) {
        const driver = new SqlJsDriver({ data });
        let core: SqliteStoreCore | undefined;
        const subscriptions = new Subscription();
        try {
          TestBed.configureTestingModule({
            providers: [
              provideStore({ router: routerReducer }, { sqlite: {
                driver,
                features: { router: { ...(persist === undefined ? {} : { persist }) } },
              } }),
              provideRouter([
                { path: '', component: Page },
                { path: 'saved', component: Page },
                { path: 'launch', component: Page },
              ]),
              provideRouterStore(),
            ],
          });
          core = TestBed.inject(SqliteStoreCore);
          const router = TestBed.inject(Router);
          const starts: string[] = [];
          subscriptions.add(router.events.subscribe((event) => {
            if (event instanceof NavigationStart) starts.push(event.url);
          }));
          const store = TestBed.inject(Store);
          await store.settle();
          const harness = await RouterTestingHarness.create();
          if (!restart) {
            await harness.navigateByUrl('/saved');
            await store.settle();
            data = driver.export();
          } else if (persist === true) {
            await expect.poll(() => router.url).toBe('/saved');
            await store.settle();
            expect(starts).toContain('/saved');
          } else {
            await harness.navigateByUrl('/launch');
            await store.settle();
            expect(router.url).toBe('/launch');
            expect(starts).not.toContain('/saved');
          }
        } finally {
          subscriptions.unsubscribe();
          TestBed.resetTestingModule();
          await core?.engine.close();
        }
      }
    });
  }

  for (const navigationActionTiming of [
    NavigationActionTiming.PreActivation,
    NavigationActionTiming.PostActivation,
  ]) {
    it(`matches overlapping navigations with ${NavigationActionTiming[navigationActionTiming]}`, async () => {
      const run = async (sqlite: boolean) => {
        let release!: (allow: boolean) => void;
        let entered!: () => void;
        const guard = new Promise<boolean>((resolve) => {
          release = resolve;
        });
        const waiting = new Promise<void>((resolve) => {
          entered = resolve;
        });
        const actions: unknown[] = [];
        const urls: unknown[] = [];
        const terminals: unknown[] = [];
        const subscriptions = new Subscription();
        let core: SqliteStoreCore | undefined;
        const observe = createEffect(
          (source = inject(Actions<ngrx.Action>)) =>
            source.pipe(
              tap((action: ngrx.Action) => {
                if (!action.type.startsWith('@ngrx/router-store/')) return;
                const { payload } = action as ObservedRouterAction;
                actions.push({ type: action.type, payload: json(payload) });
              }),
            ),
          { functional: true, dispatch: false },
        );
        try {
          TestBed.configureTestingModule({
            providers: [
              sqlite
                ? provideStore({ router: routerReducer }, { sqlite: { driver: new SqlJsDriver() } })
                : ngrx.provideStore({ router: routerReducer }),
              provideEffects({ observe }),
              provideRouter([
                { path: 'items/:id', component: Page },
                {
                  path: 'slow',
                  component: Page,
                  canActivate: [
                    () => {
                      entered();
                      return guard;
                    },
                  ],
                },
              ]),
              provideRouterStore({ navigationActionTiming }),
            ],
          });
          const store = TestBed.inject(ngrx.Store);
          if (sqlite) core = TestBed.inject(SqliteStoreCore);
          const settle = async () => {
            if (sqlite) await TestBed.inject(Store).settle();
          };
          await settle();
          const harness = await RouterTestingHarness.create('/items/1');
          await settle();
          let latestWhole: unknown;
          subscriptions.add(
            store.subscribe((state) => {
              latestWhole = json(state);
            }),
          );
          subscriptions.add(
            store.select(getRouterSelectors().selectUrl).subscribe((url) => urls.push(url)),
          );
          subscriptions.add(
            TestBed.inject(ngrx.ScannedActionsSubject).subscribe((action) => {
              if ([ROUTER_NAVIGATED, ROUTER_CANCEL, ROUTER_ERROR].includes(action.type))
                terminals.push(latestWhole);
            }),
          );
          await settle();
          const router = TestBed.inject(Router);
          const slow = router.navigateByUrl('/slow');
          await waiting;
          // Keep the guard pending until the preactivation commit has refreshed.
          await settle();
          const fast = router.navigateByUrl('/items/2');
          expect(await slow).toBe(false);
          expect(await fast).toBe(true);
          release(true);
          await settle();
          await harness.navigateByUrl('/items/3');
          await settle();
          expect(
            actions.filter((action) => (action as ngrx.Action).type === ROUTER_CANCEL),
          ).toHaveLength(1);
          expect(router.url).toBe('/items/3');
          return {
            actions,
            urls,
            terminals,
            state: json(await firstValueFrom(store.select((state) => state))),
          };
        } finally {
          release(true);
          subscriptions.unsubscribe();
          TestBed.resetTestingModule();
          await core?.engine.close();
        }
      };
      const classic = await run(false);
      const sqlite = await run(true);
      const { terminals: classicTerminals, ...classicContract } = classic;
      const { terminals: sqliteTerminals, ...sqliteContract } = sqlite;
      expect(sqliteContract).toEqual(classicContract);
      expect(sqliteTerminals).toHaveLength(classicTerminals.length);
      // ADR-0023 defers whole-store publication while a newer navigation is
      // pending. The superseded cancellation retains the last published view;
      // its transient navigationId can differ from classic's synchronous view.
      expect(sqliteTerminals[0]).toMatchObject({ router: { state: { url: '/items/1' } } });
      expect(sqliteTerminals.slice(1)).toEqual(classicTerminals.slice(1));
      expect(sqliteTerminals.at(-1)).toEqual(sqlite.state);
    });
  }
  for (const full of [false, true]) {
    for (const timing of [
      NavigationActionTiming.PreActivation,
      NavigationActionTiming.PostActivation,
    ]) {
      it(`matches ${full ? 'Full with custom JSON serializer' : 'default serializer'}, ${NavigationActionTiming[timing]}`, async () => {
        const classic = await runRouterScenario(false, full, timing);
        const sqlite = await runRouterScenario(true, full, timing);
        expect(sqlite).toEqual(classic);
      });
    }
  }
});
