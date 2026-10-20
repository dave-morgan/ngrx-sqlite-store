// Classic @ngrx/store reducers: synchronous (state, action) => state.
import { createFeature, createReducer, on } from '@ngrx/store';

import { NotesActions, SeedActions, TodosActions, UiActions, UsersActions, benchmarkTick } from '../../state/actions';
import {
  mapFolder,
  mapNote,
  moveItem,
  newTodoId,
  pushVisited,
  todosExtraSelectors,
  toggleChecklist,
} from '../../state/logic';
import { makeAttachmentData } from '../../state/seed';
import {
  initialNotesState,
  initialTodosState,
  initialUiState,
  initialUsersState,
  todoAdapter,
  userAdapter,
} from '../../state/state';

export const todosFeature = createFeature({
  name: 'todos',
  reducer: createReducer(
    initialTodosState,
    on(SeedActions.seedLoaded, (state, { data, version }) =>
      todoAdapter.setAll(data.todos, { ...state, loaded: true, seedVersion: version }),
    ),
    on(SeedActions.reset, () => initialTodosState),
    on(TodosActions.todoAdded, (state, { title, userId, priority }) =>
      todoAdapter.addOne(
        { id: newTodoId(), title, userId, priority, done: false, tags: [], createdAt: Date.now() },
        state,
      ),
    ),
    on(TodosActions.todoToggled, (state, { id }) =>
      todoAdapter.mapOne({ id, map: (t) => ({ ...t, done: !t.done }) }, state),
    ),
    on(TodosActions.bulkToggled, (state, { ids }) =>
      todoAdapter.updateMany(
        ids.filter((id) => state.entities[id]).map((id) => ({ id, changes: { done: !state.entities[id]!.done } })),
        state,
      ),
    ),
    on(TodosActions.todoRenamed, (state, { id, title }) => todoAdapter.updateOne({ id, changes: { title } }, state)),
    on(TodosActions.todoRemoved, (state, { id }) => todoAdapter.removeOne(id, state)),
    on(TodosActions.completedCleared, (state) => todoAdapter.removeMany((t) => t.done, state)),
    on(TodosActions.filterChanged, (state, { filter }) => ({ ...state, filter })),
    on(TodosActions.queryChanged, (state, { query }) => ({ ...state, query })),
    on(TodosActions.userFilterChanged, (state, { userId }) => ({ ...state, userId })),
  ),
  extraSelectors: todosExtraSelectors,
});

export const usersFeature = createFeature({
  name: 'users',
  reducer: createReducer(
    initialUsersState,
    on(SeedActions.seedLoaded, (state, { data }) => userAdapter.setAll(data.users, state)),
    on(SeedActions.reset, () => initialUsersState),
    on(UsersActions.userRenamed, (state, { id, name }) => userAdapter.updateOne({ id, changes: { name } }, state)),
    on(UsersActions.usersReplaced, (state, { users }) => userAdapter.setAll(users, state)),
  ),
  extraSelectors: ({ selectUsersState }) => {
    const { selectAll, selectEntities } = userAdapter.getSelectors(selectUsersState);
    return { selectAllUsers: selectAll, selectUserEntities: selectEntities };
  },
});

export const notesFeature = createFeature({
  name: 'notes',
  reducer: createReducer(
    initialNotesState,
    on(SeedActions.seedLoaded, (state, { data }) => ({ ...state, folders: data.folders })),
    on(SeedActions.reset, () => initialNotesState),
    on(NotesActions.folderAdded, (state, { folder }) => ({ ...state, folders: [...state.folders, folder] })),
    on(NotesActions.noteAdded, (state, { folderId, title }) => ({
      ...state,
      folders: mapFolder(state.folders, folderId, (notes) => [
        ...notes,
        { id: `${folderId}n${Date.now().toString(36)}`, title, body: '', checklist: [] },
      ]),
    })),
    on(NotesActions.noteBodyChanged, (state, { folderId, noteId, body }) => ({
      ...state,
      folders: mapFolder(state.folders, folderId, (notes) => mapNote(notes, noteId, (n) => ({ ...n, body }))),
    })),
    on(NotesActions.checklistItemToggled, (state, { folderId, noteId, index }) => ({
      ...state,
      folders: mapFolder(state.folders, folderId, (notes) => mapNote(notes, noteId, (n) => toggleChecklist(n, index))),
    })),
    on(NotesActions.noteMoved, (state, { folderId, from, to }) => ({
      ...state,
      folders: mapFolder(state.folders, folderId, (notes) => moveItem(notes, from, to)),
    })),
    on(NotesActions.noteRemoved, (state, { folderId, noteId }) => ({
      ...state,
      folders: mapFolder(state.folders, folderId, (notes) => notes.filter((n) => n.id !== noteId)),
    })),
    on(NotesActions.attachmentSet, (state, { sizeKb }) => ({
      ...state,
      attachment: { name: `blob-${sizeKb}kb.bin`, sizeKb, data: makeAttachmentData(sizeKb) },
    })),
    on(NotesActions.attachmentCleared, (state) => ({ ...state, attachment: null })),
  ),
});

export const uiFeature = createFeature({
  name: 'ui',
  reducer: createReducer(
    initialUiState,
    on(UiActions.themeToggled, (state) => ({ ...state, theme: state.theme === 'light' ? 'dark' : 'light' }) as const),
    on(UiActions.themeSet, (state, { theme }) => ({ ...state, theme })),
    on(UiActions.pageVisited, (state, { url }) => ({ ...state, visited: pushVisited(state.visited, url) })),
    on(UiActions.effectObserved, (state, { observation }) => ({ ...state, lastObservation: observation })),
    on(benchmarkTick, (state, { n }) => ({ ...state, benchmarkCount: n })),
  ),
});
