// `@impl` for the classic build: reducers + provider wiring for the real @ngrx/store.
import { EnvironmentProviders, Injector } from '@angular/core';
import { provideState, provideStore } from '@ngrx/store';
import { routerReducer } from '@ngrx/router-store';

import { notesFeature, todosFeature, uiFeature, usersFeature } from './features';

export { notesFeature, todosFeature, uiFeature, usersFeature };

/** Always-mounted header count: classic JS projection over selectAll. */
export const selectOpenTodoCount = todosFeature.selectOpenCount;

export const IMPL_NAME = 'classic' as const;

export function provideHarnessStore(): EnvironmentProviders[] {
  return [
    provideStore(
      { router: routerReducer },
      {
        runtimeChecks: {
          strictStateImmutability: true,
          strictActionImmutability: true,
          strictActionTypeUniqueness: true,
        },
      },
    ),
    provideState(todosFeature),
    provideState(usersFeature),
    provideState(notesFeature),
    provideState(uiFeature),
  ];
}

/** Classic reducers are synchronous: state is settled as soon as dispatch returns. */
export function settleStore(_injector: Injector): Promise<void> {
  return Promise.resolve();
}
