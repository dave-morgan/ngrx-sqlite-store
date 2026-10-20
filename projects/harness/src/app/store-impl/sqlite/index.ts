// `@impl` for the sqlite build: tx reducers + ngrx-sqlite-store provider wiring.
import { EnvironmentProviders, Injector } from '@angular/core';
import { routerReducer } from '@ngrx/router-store';
import { Store, provideState, provideStore } from 'ngrx-sqlite-store';

import { todoAdapter } from '../../state/state';
import { notesFeature, todosFeature, uiFeature, usersFeature } from './features';
import { createHarnessDriver } from './driver';

export { notesFeature, todosFeature, uiFeature, usersFeature };

/**
 * Always-mounted header count. A query selector (ADR-0027): one SQL COUNT(*) per
 * relevant commit; the todos collection itself is never loaded for it.
 */
export const selectOpenTodoCount = todoAdapter.query(todosFeature.selectTodosState).count({ done: false });

export const IMPL_NAME = 'sqlite' as const;

export function provideHarnessStore(): EnvironmentProviders[] {
  return [
    provideStore(
      // routerReducer is a foreign classic reducer: auto-wrapped by fromSyncReducer (ADR-0013).
      { router: routerReducer },
      {
        runtimeChecks: {
          strictStateImmutability: true,
          strictActionImmutability: true,
          strictActionTypeUniqueness: true,
        },
        sqlite: {
          driver: createHarnessDriver,
          // Only small slices: eager features stay pinned in memory (ADR-0018).
          eager: ['ui'],
          features: {
            // Folders hold arrays-in-objects-in-arrays: promote them to rows (D7).
            notes: { hints: { folders: 'collection', 'folders/*/notes': 'collection' } },
          },
        },
      },
    ),
    provideState(todosFeature),
    provideState(usersFeature),
    provideState(notesFeature),
    provideState(uiFeature),
  ];
}

/** Resolves once every queued action is committed and every live selector has refreshed. */
export function settleStore(injector: Injector): Promise<void> {
  return injector.get(Store).settle();
}
