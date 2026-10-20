import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'todos' },
  { path: 'todos', title: 'Todos', loadComponent: () => import('./pages/todos.page').then((m) => m.TodosPage) },
  {
    path: 'todos/:id',
    title: 'Todo',
    loadComponent: () => import('./pages/todo-detail.page').then((m) => m.TodoDetailPage),
  },
  { path: 'users', title: 'Users', loadComponent: () => import('./pages/users.page').then((m) => m.UsersPage) },
  { path: 'notes', title: 'Notes', loadComponent: () => import('./pages/notes.page').then((m) => m.NotesPage) },
  {
    path: 'diagnostics',
    title: 'Diagnostics',
    loadComponent: () => import('./pages/diagnostics.page').then((m) => m.DiagnosticsPage),
  },
  { path: '**', redirectTo: 'todos' },
];
