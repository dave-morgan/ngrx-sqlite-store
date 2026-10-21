import { MemoizedSelector } from '@store';

import { Todo } from './models';

export interface VisibleTodoSelectors {
  page: MemoizedSelector<object, Todo[]>;
  count: MemoizedSelector<object, number>;
}
