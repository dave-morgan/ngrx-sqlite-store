import { createAction, createActionGroup, emptyProps, props } from '@store';

import { EffectObservation, Folder, Priority, SeedData, Theme, TodoFilter, User } from './models';

export const SeedActions = createActionGroup({
  source: 'Seed',
  events: {
    'Seed Requested': props<{ size: number }>(),
    'Seed Loaded': props<{ data: SeedData; version: number }>(),
    /** Small follow-up so ActionsSubject (a BehaviorSubject) stops retaining the bulk payload. */
    'Seed Applied': emptyProps(),
    'Seed Skipped': emptyProps(),
    Reset: emptyProps(),
  },
});

export const TodosActions = createActionGroup({
  source: 'Todos',
  events: {
    'Todo Added': props<{ title: string; userId: string; priority: Priority }>(),
    'Todo Toggled': props<{ id: string }>(),
    'Todo Renamed': props<{ id: string; title: string }>(),
    'Todo Removed': props<{ id: string }>(),
    'Completed Cleared': emptyProps(),
    'Filter Changed': props<{ filter: TodoFilter }>(),
    'Query Changed': props<{ query: string }>(),
    'User Filter Changed': props<{ userId: string | null }>(),
    'Bulk Toggled': props<{ ids: string[] }>(),
  },
});

export const UsersActions = createActionGroup({
  source: 'Users',
  events: {
    'User Renamed': props<{ id: string; name: string }>(),
    'Users Replaced': props<{ users: User[] }>(),
  },
});

export const NotesActions = createActionGroup({
  source: 'Notes',
  events: {
    'Folder Added': props<{ folder: Folder }>(),
    'Note Added': props<{ folderId: string; title: string }>(),
    'Note Body Changed': props<{ folderId: string; noteId: string; body: string }>(),
    'Checklist Item Toggled': props<{ folderId: string; noteId: string; index: number }>(),
    'Note Moved': props<{ folderId: string; from: number; to: number }>(),
    'Note Removed': props<{ folderId: string; noteId: string }>(),
    'Attachment Set': props<{ sizeKb: number }>(),
    'Attachment Cleared': emptyProps(),
  },
});

export const UiActions = createActionGroup({
  source: 'UI',
  events: {
    'Theme Toggled': emptyProps(),
    'Theme Set': props<{ theme: Theme }>(),
    'Page Visited': props<{ url: string }>(),
    'Effect Observed': props<{ observation: EffectObservation }>(),
  },
});

/** Plain createAction (not a group) to cover both creator styles. */
export const benchmarkTick = createAction('[Diagnostics] Benchmark Tick', props<{ n: number }>());
