// `@impl` for the classic build: reducers + provider wiring for the real @ngrx/store.
import { EnvironmentProviders, Injector } from '@angular/core';
import { MemoizedSelector, createSelector, provideState, provideStore } from '@ngrx/store';
import { routerReducer } from '@ngrx/router-store';

import { Todo } from '../../state/models';
import { TodoCriteria, criteriaKey, memoFactory } from '../../state/todo-criteria';
import { VisibleTodoSelectors } from '../../state/visible-todos';
import { notesFeature, todosFeature, uiFeature, usersFeature } from './features';

export { notesFeature, todosFeature, uiFeature, usersFeature };

/** Always-mounted header count: classic JS projection over selectAll. */
export const selectOpenTodoCount = todosFeature.selectOpenCount;
export const selectTodoTotalCount = todosFeature.selectTodoTotal;

const visibleMemo = memoFactory<string, VisibleTodoSelectors>();

/** Visible list page + match count for the given criteria (JS filter over the full collection). */
export function visibleTodos(criteria: TodoCriteria, limit: number): VisibleTodoSelectors {
  return visibleMemo(criteriaKey(criteria, limit), () => {
    const q = criteria.query.trim().toLowerCase();
    const matches = createSelector(todosFeature.selectAllTodos, (all) =>
      all.filter(
        (t) =>
          (criteria.filter === 'all' || (criteria.filter === 'done') === t.done) &&
          (!criteria.userId || t.userId === criteria.userId) &&
          (!q || t.title.toLowerCase().includes(q)),
      ),
    );
    return {
      page: createSelector(matches, (m) => m.slice(0, limit)),
      count: createSelector(matches, (m) => m.length),
    };
  });
}

const byIdMemo = memoFactory<string, MemoizedSelector<object, Todo | null>>();
export const todoById = (id: string) =>
  byIdMemo(id, () => createSelector(todosFeature.selectEntities, (e) => e[id] ?? null));

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
