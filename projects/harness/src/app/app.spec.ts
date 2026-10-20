import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { todosFeature, uiFeature } from '@impl';

import { App } from './app';

// provideMockStore compatibility (contract §2): the shell renders from overridden selectors.
describe('App shell with provideMockStore', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideMockStore()],
    }).compileComponents();
    const store = TestBed.inject(MockStore);
    store.overrideSelector(todosFeature.selectOpenCount, 7);
    store.overrideSelector(uiFeature.selectTheme, 'dark');
  });

  it('renders the open count from an overridden selector', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="open-count"]')?.textContent).toContain('7 open');
    expect(el.querySelector('[data-testid="impl"]')?.textContent?.trim()).toBe('classic');
  });
});
