// `@impl` for the sqlite build: tx reducers + ngrx-sqlite-store provider wiring.
import { EnvironmentProviders, Injector } from '@angular/core';
import { routerReducer } from '@ngrx/router-store';
import { MemoizedSelector, Store, createSelector, provideState, provideStore } from 'ngrx-sqlite-store';
import type { Where } from 'ngrx-sqlite-store/entity';

import { Todo } from '../../state/models';
import { todoAdapter } from '../../state/state';
import { TodoCriteria, criteriaKey, memoFactory } from '../../state/todo-criteria';
import { VisibleTodoSelectors } from '../../state/visible-todos';
import { notesFeature, todosFeature, uiFeature, usersFeature } from './features';
import { createHarnessDriver } from './driver';

export { notesFeature, todosFeature, uiFeature, usersFeature };

/**
 * Always-mounted header count. A query selector (ADR-0027): one SQL COUNT(*) per
 * relevant commit; the todos collection itself is never loaded for it.
 */
const todoQuery = todoAdapter.query(todosFeature.selectTodosState);
export const selectOpenTodoCount = todoQuery.count({ done: false });
export const selectTodoTotalCount = todoQuery.count();

const visibleMemo = memoFactory<string, VisibleTodoSelectors>();

/**
 * Visible list page + match count as SQL queries (ADR-0027): only `limit` rows are ever
 * materialized, however large the collection.
 */
export function visibleTodos(criteria: TodoCriteria, limit: number): VisibleTodoSelectors {
  return visibleMemo(criteriaKey(criteria, limit), () => {
    const where: Where = {};
    if (criteria.filter !== 'all') where['done'] = criteria.filter === 'done';
    if (criteria.userId) where['userId'] = criteria.userId;
    // LIKE has no ESCAPE clause here: strip its wildcards from user input.
    const q = criteria.query.trim().replace(/[%_]/g, '');
    if (q) where['title'] = { like: `%${q}%` };
    return { page: todoQuery.page({ where, offset: 0, limit }), count: todoQuery.count(where) };
  });
}

const byIdMemo = memoFactory<string, MemoizedSelector<object, Todo | null>>();
export const todoById = (id: string) =>
  byIdMemo(id, () =>
    createSelector(todoQuery.page({ where: { id }, offset: 0, limit: 1 }), (rows: Todo[]): Todo | null => rows[0] ?? null),
  );

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
