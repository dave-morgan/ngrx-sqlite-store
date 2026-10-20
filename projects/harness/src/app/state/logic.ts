// Pure, implementation-agnostic state helpers shared by the classic and sqlite reducers,
// plus the extra selectors both createFeature calls use, so the two builds differ only in
// *how* they reduce (ADR-0011).
import { MemoizedSelector, createSelector } from '@store';

import { Folder, Note, Todo, TodoFilter } from './models';
import { MAX_VISITED, TodosState, todoAdapter } from './state';

let nextTodo = 0;
export const newTodoId = () => `n${Date.now().toString(36)}${(nextTodo++).toString(36)}`;

export function mapFolder(folders: readonly Folder[], folderId: string, fn: (notes: Note[]) => Note[]): Folder[] {
  return folders.map((f) => (f.id === folderId ? { ...f, notes: fn(f.notes) } : f));
}

export function mapNote(notes: Note[], noteId: string, fn: (n: Note) => Note): Note[] {
  return notes.map((n) => (n.id === noteId ? fn(n) : n));
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function toggleChecklist(note: Note, index: number): Note {
  return { ...note, checklist: note.checklist.map((c, i) => (i === index ? { ...c, done: !c.done } : c)) };
}

export function pushVisited(visited: readonly string[], url: string): string[] {
  return [url, ...visited.filter((u) => u !== url)].slice(0, MAX_VISITED);
}

interface TodosBaseSelectors {
  selectTodosState: MemoizedSelector<Record<string, any>, TodosState>;
  selectFilter: MemoizedSelector<Record<string, any>, TodoFilter>;
  selectQuery: MemoizedSelector<Record<string, any>, string>;
  selectUserId: MemoizedSelector<Record<string, any>, string | null>;
}

export function todosExtraSelectors({ selectTodosState, selectFilter, selectQuery, selectUserId }: TodosBaseSelectors) {
  const { selectAll, selectTotal } = todoAdapter.getSelectors(selectTodosState);
  const selectOpenCount = createSelector(selectAll, (all: Todo[]) => all.filter((t) => !t.done).length);
  const selectVisibleTodos = createSelector(
    selectAll,
    selectFilter,
    selectQuery,
    selectUserId,
    (all: Todo[], filter: TodoFilter, query: string, userId: string | null) => {
      const q = query.trim().toLowerCase();
      return all.filter(
        (t) =>
          (filter === 'all' || (filter === 'done') === t.done) &&
          (!userId || t.userId === userId) &&
          (!q || t.title.toLowerCase().includes(q)),
      );
    },
  );
  return { selectAllTodos: selectAll, selectTodoTotal: selectTotal, selectOpenCount, selectVisibleTodos };
}
