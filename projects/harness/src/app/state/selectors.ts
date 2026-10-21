import { getRouterSelectors } from '@ngrx/router-store';
import { createSelector } from '@store';
import { notesFeature, todosFeature, uiFeature, usersFeature } from '@impl';

// Router selectors come from @ngrx/router-store, which builds them with the *real*
// @ngrx/store createFeatureSelector: "foreign" selectors for the sqlite store (Q8).
export const { selectRouteParam, selectUrl } = getRouterSelectors();

export const selectRouteTodoId = selectRouteParam('id');

export const selectTodoCountsByUser = createSelector(todosFeature.selectAllTodos, (todos) => {
  const counts: Record<string, { open: number; done: number }> = {};
  for (const t of todos) {
    const c = (counts[t.userId] ??= { open: 0, done: 0 });
    if (t.done) c.done++;
    else c.open++;
  }
  return counts;
});

export const selectUsersWithCounts = createSelector(
  usersFeature.selectAllUsers,
  selectTodoCountsByUser,
  (users, counts) => users.map((u) => ({ ...u, open: counts[u.id]?.open ?? 0, done: counts[u.id]?.done ?? 0 })),
);

export const selectNoteStats = createSelector(notesFeature.selectFolders, (folders) => {
  let notes = 0;
  let items = 0;
  let checked = 0;
  for (const f of folders) {
    notes += f.notes.length;
    for (const n of f.notes) {
      items += n.checklist.length;
      checked += n.checklist.filter((c) => c.done).length;
    }
  }
  return { folders: folders.length, notes, items, checked };
});

export const selectAttachmentSummary = createSelector(notesFeature.selectAttachment, (a) =>
  a ? { name: a.name, sizeKb: a.sizeKb, length: a.data.length, head: a.data.slice(0, 16) } : null,
);

export const selectTheme = uiFeature.selectTheme;
