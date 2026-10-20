// ngrx-sqlite-store reducers: async transaction handlers (ADR-0013/0014).
// Each feature deliberately uses a different write style so the harness covers them all:
//   todos/users → entity adapter tx ops (SQL, ADR-0019) + returned partials
//   notes       → read via tx.get, return a new partial (diffed write, ADR-0009)
//   ui          → imperative tx.set/patch + classic onState handlers (compat bridge)
import { createFeature, createReducer, on, onState } from 'ngrx-sqlite-store';

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
import { Folder } from '../../state/models';
import { makeAttachmentData } from '../../state/seed';
import {
  NotesState,
  TodosState,
  UiState,
  initialNotesState,
  initialTodosState,
  initialUiState,
  initialUsersState,
  todoAdapter,
  userAdapter,
} from '../../state/state';

export const todosFeature = createFeature({
  name: 'todos',
  reducer: createReducer<TodosState>(
    initialTodosState,
    on(SeedActions.seedLoaded, async (tx, { data, version }) => {
      await todoAdapter.setAll(tx, data.todos);
      return { loaded: true, seedVersion: version };
    }),
    on(SeedActions.reset, (tx) => tx.resetFeature()),
    on(TodosActions.todoAdded, (tx, { title, userId, priority }) =>
      todoAdapter.addOne(tx, { id: newTodoId(), title, userId, priority, done: false, tags: [], createdAt: Date.now() }),
    ),
    on(TodosActions.todoToggled, (tx, { id }) => todoAdapter.mapOne(tx, { id, map: (t) => ({ ...t, done: !t.done }) })),
    on(TodosActions.bulkToggled, async (tx, { ids }) => {
      for (const id of ids) await todoAdapter.mapOne(tx, { id, map: (t) => ({ ...t, done: !t.done }) });
    }),
    on(TodosActions.todoRenamed, (tx, { id, title }) => todoAdapter.updateOne(tx, { id, changes: { title } })),
    on(TodosActions.todoRemoved, (tx, { id }) => todoAdapter.removeOne(tx, id)),
    on(TodosActions.completedCleared, (tx) => todoAdapter.removeMany(tx, (t) => t.done)),
    on(TodosActions.filterChanged, async (_tx, { filter }) => ({ filter })),
    on(TodosActions.queryChanged, async (_tx, { query }) => ({ query })),
    on(TodosActions.userFilterChanged, async (_tx, { userId }) => ({ userId })),
  ),
  extraSelectors: todosExtraSelectors,
});

export const usersFeature = createFeature({
  name: 'users',
  reducer: createReducer(
    initialUsersState,
    on(SeedActions.seedLoaded, (tx, { data }) => userAdapter.setAll(tx, data.users)),
    on(SeedActions.reset, (tx) => tx.resetFeature()),
    on(UsersActions.userRenamed, (tx, { id, name }) => userAdapter.updateOne(tx, { id, changes: { name } })),
    on(UsersActions.usersReplaced, (tx, { users }) => userAdapter.setAll(tx, users)),
  ),
  extraSelectors: ({ selectUsersState }) => {
    const { selectAll, selectEntities } = userAdapter.getSelectors(selectUsersState);
    return { selectAllUsers: selectAll, selectUserEntities: selectEntities };
  },
});

/** Read `folders` through the tx identity cache, transform purely, return a partial to be diffed. */
const withFolders =
  <A>(fn: (folders: Folder[], action: A) => Folder[]) =>
  async (tx: { get<T>(path: string): Promise<T> }, action: A): Promise<Partial<NotesState>> => ({
    folders: fn(await tx.get<Folder[]>('folders'), action),
  });

export const notesFeature = createFeature({
  name: 'notes',
  reducer: createReducer<NotesState>(
    initialNotesState,
    on(SeedActions.seedLoaded, async (_tx, { data }) => ({ folders: data.folders })),
    on(SeedActions.reset, (tx) => tx.resetFeature()),
    on(NotesActions.folderAdded, withFolders((folders, { folder }) => [...folders, folder])),
    on(
      NotesActions.noteAdded,
      withFolders((folders, { folderId, title }) =>
        mapFolder(folders, folderId, (notes) => [
          ...notes,
          { id: `${folderId}n${Date.now().toString(36)}`, title, body: '', checklist: [] },
        ]),
      ),
    ),
    on(
      NotesActions.noteBodyChanged,
      withFolders((folders, { folderId, noteId, body }) =>
        mapFolder(folders, folderId, (notes) => mapNote(notes, noteId, (n) => ({ ...n, body }))),
      ),
    ),
    on(
      NotesActions.checklistItemToggled,
      withFolders((folders, { folderId, noteId, index }) =>
        mapFolder(folders, folderId, (notes) => mapNote(notes, noteId, (n) => toggleChecklist(n, index))),
      ),
    ),
    on(
      NotesActions.noteMoved,
      withFolders((folders, { folderId, from, to }) => mapFolder(folders, folderId, (notes) => moveItem(notes, from, to))),
    ),
    on(
      NotesActions.noteRemoved,
      withFolders((folders, { folderId, noteId }) =>
        mapFolder(folders, folderId, (notes) => notes.filter((n) => n.id !== noteId)),
      ),
    ),
    // Imperative write of a > 1 MB scalar: stored as chunk rows (ADR-0008).
    on(NotesActions.attachmentSet, (tx, { sizeKb }) =>
      tx.set('attachment', { name: `blob-${sizeKb}kb.bin`, sizeKb, data: makeAttachmentData(sizeKb) }),
    ),
    on(NotesActions.attachmentCleared, (tx) => tx.set('attachment', null)),
  ),
});

export const uiFeature = createFeature({
  name: 'ui',
  reducer: createReducer<UiState>(
    initialUiState,
    // Classic handlers through the compat bridge (ADR-0013): unchanged NgRx-style code.
    onState(UiActions.themeToggled, (state) => ({ ...state, theme: state.theme === 'light' ? 'dark' : 'light' }) as const),
    onState(UiActions.themeSet, (state, { theme }) => ({ ...state, theme })),
    // Targeted reads and imperative writes.
    on(UiActions.pageVisited, async (tx, { url }) =>
      tx.set('visited', pushVisited(await tx.get<string[]>('visited'), url)),
    ),
    on(UiActions.effectObserved, (tx, { observation }) => tx.set('lastObservation', observation)),
    on(benchmarkTick, (tx, { n }) => tx.set('benchmarkCount', n)),
  ),
});
