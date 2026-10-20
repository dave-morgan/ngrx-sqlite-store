export type Priority = 1 | 2 | 3;
export type TodoFilter = 'all' | 'open' | 'done';
export type Theme = 'light' | 'dark';

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  userId: string;
  tags: string[];
  priority: Priority;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  hue: number;
}

export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  checklist: ChecklistItem[];
}

export interface Folder {
  id: string;
  name: string;
  notes: Note[];
}

export interface Attachment {
  name: string;
  sizeKb: number;
  /** Base64 payload: deliberately large (> 1 MB) to exercise chunked rows. */
  data: string;
}

export interface SeedData {
  todos: Todo[];
  users: User[];
  folders: Folder[];
}

/** Snapshot an effect captures via withLatestFrom right after `todoAdded`. */
export interface EffectObservation {
  action: string;
  openCount: number;
  totalCount: number;
}
