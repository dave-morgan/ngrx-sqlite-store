import { EntityState, createEntityAdapter } from '@store/entity';

import { Attachment, EffectObservation, Folder, Theme, Todo, TodoFilter, User } from './models';

// Adapters are shared: creation and getSelectors() are identical in both
// implementations. Only reducer-side adapter *operations* differ (ADR-0005).
export const todoAdapter = createEntityAdapter<Todo>();
export const userAdapter = createEntityAdapter<User>({
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

export interface TodosState extends EntityState<Todo> {
  filter: TodoFilter;
  query: string;
  userId: string | null;
  loaded: boolean;
  seedVersion: number;
}

export type UsersState = EntityState<User>;

export interface NotesState {
  folders: Folder[];
  attachment: Attachment | null;
}

export interface UiState {
  theme: Theme;
  visited: string[];
  lastObservation: EffectObservation | null;
  benchmarkCount: number;
}

export const initialTodosState: TodosState = todoAdapter.getInitialState({
  filter: 'all',
  query: '',
  userId: null,
  loaded: false,
  seedVersion: 0,
});

export const initialUsersState: UsersState = userAdapter.getInitialState();

export const initialNotesState: NotesState = { folders: [], attachment: null };

export const initialUiState: UiState = {
  theme: 'light',
  visited: [],
  lastObservation: null,
  benchmarkCount: 0,
};

export const MAX_VISITED = 8;
