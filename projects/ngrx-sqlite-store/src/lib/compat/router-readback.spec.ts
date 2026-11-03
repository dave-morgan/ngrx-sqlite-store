import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { getRouterSelectors, provideRouterStore, routerReducer } from '@ngrx/router-store';
import { describe, expect, it, vi } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { provideStore } from '../store/provide';
import { Store } from '../store/store';
import { PathCache } from '../selectors/path-cache';

@Component({ template: 'page' })
class Page {}

// ADR-0070: router commits must refresh selectors from the commit journal, not read back.
describe('router slice refresh', () => {
  it('reuses a selected, known-absent router slice for unrelated startup actions', async () => {
    const driver = new SqlJsDriver();
    TestBed.configureTestingModule({
      providers: [provideStore({ router: routerReducer }, { sqlite: { driver } })],
    });
    const store = TestBed.inject(Store);
    await store.settle();
    const cache = TestBed.inject(PathCache);
    await cache.ensure('router');
    expect(cache.ready('router')).toBe(true);
    expect(cache.peek('router')).toBeUndefined();
    const query = vi.spyOn(driver, 'query');
    store.dispatch({ type: 'unrelated startup action 1' });
    store.dispatch({ type: 'unrelated startup action 2' });
    await store.settle();
    expect(query.mock.calls.filter(([, params]) => params?.[0] === 'router')).toHaveLength(0);
  });

  it('does not read the router subtree back after each navigation commit', async () => {
    const driver = new SqlJsDriver();
    TestBed.configureTestingModule({
      providers: [
        provideStore({ router: routerReducer }, { sqlite: { driver } }),
        provideRouter([{ path: 'items/:id', component: Page }]),
        provideRouterStore(),
      ],
    });
    const store = TestBed.inject(Store);
    const urls: unknown[] = [];
    const { selectUrl } = getRouterSelectors();
    const subscription = store.select(selectUrl).subscribe((url) => urls.push(url));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/items/1');
    await store.settle();
    const query = vi.spyOn(driver, 'query');
    await harness.navigateByUrl('/items/2');
    await harness.navigateByUrl('/items/3');
    await store.settle();
    const routerReads = query.mock.calls.filter(([, params]) => params?.[0] === 'router');
    subscription.unsubscribe();
    expect(urls.at(-1)).toBe('/items/3');
    expect(routerReads.length).toBe(0);
  });
});
