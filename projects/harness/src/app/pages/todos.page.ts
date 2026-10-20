import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@store';
import { todosFeature, uiFeature, usersFeature } from '@impl';

import { TodosActions } from '../state/actions';
import { Priority, TodoFilter } from '../state/models';

@Component({
  selector: 'app-todos-page',
  imports: [AsyncPipe, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page-head">
        <h1>Todos</h1>
        <span class="muted" data-testid="todo-summary">
          {{ open() }} open · {{ total() }} total
        </span>
      </div>

      <form class="card add" (ngSubmit)="add()" data-testid="add-form">
        <label class="sr-only" for="new-title">New todo</label>
        <input id="new-title" class="field grow" name="title" [(ngModel)]="title" placeholder="What needs doing?"
               autocomplete="off" data-testid="new-title" />
        <select class="field" name="priority" [(ngModel)]="priority" aria-label="Priority">
          <option [ngValue]="1">P1</option><option [ngValue]="2">P2</option><option [ngValue]="3">P3</option>
        </select>
        <select class="field" name="owner" [(ngModel)]="owner" aria-label="Owner" data-testid="new-owner">
          @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
        </select>
        <button class="btn primary" type="submit" [disabled]="!title().trim()" data-testid="add">Add</button>
      </form>

      <div class="toolbar">
        <div class="segmented" role="group" aria-label="Filter">
          @for (f of filters; track f) {
            <button type="button" [attr.aria-pressed]="filter() === f" (click)="setFilter(f)"
                    [attr.data-testid]="'filter-' + f">{{ f }}</button>
          }
        </div>
        <input class="field grow" type="search" placeholder="Search…" aria-label="Search"
               [ngModel]="query()" (ngModelChange)="setQuery($event)" data-testid="search" />
        <select class="field" aria-label="Filter by owner" [ngModel]="userId()" (ngModelChange)="setUser($event)"
                data-testid="user-filter">
          <option [ngValue]="null">Everyone</option>
          @for (u of users(); track u.id) { <option [ngValue]="u.id">{{ u.name }}</option> }
        </select>
        <button class="btn danger" type="button" (click)="clearCompleted()" data-testid="clear-completed">
          Clear completed
        </button>
      </div>

      @if (observation(); as o) {
        <p class="observation mono" data-testid="effect-observation">
          effect saw <b>{{ o.action }}</b> → open={{ o.openCount }} total={{ o.totalCount }}
        </p>
      }

      <!-- store.select + async pipe (Observable path); counts above use selectSignal. -->
      @if (visible$ | async; as visible) {
        <p class="muted" data-testid="visible-count">{{ visible.length }} shown</p>
        <ul class="card list" data-testid="todo-list">
          @for (t of visible.slice(0, limit()); track t.id) {
            <li [class.done]="t.done" [attr.data-testid]="'todo-' + t.id">
              <input type="checkbox" [checked]="t.done" (change)="toggle(t.id)"
                     [attr.aria-label]="'Toggle ' + t.title" [attr.data-testid]="'toggle-' + t.id" />
              <span class="prio" [attr.data-p]="t.priority" [attr.title]="'Priority ' + t.priority"></span>
              <a class="title" [routerLink]="['/todos', t.id]">{{ t.title }}</a>
              @for (tag of t.tags; track tag) { <span class="chip">{{ tag }}</span> }
              <span class="owner muted">{{ userNames()[t.userId]?.name }}</span>
              <button class="btn ghost danger" type="button" (click)="remove(t.id)"
                      [attr.aria-label]="'Delete ' + t.title" [attr.data-testid]="'remove-' + t.id">✕</button>
            </li>
          } @empty {
            <li class="empty muted">Nothing here.</li>
          }
        </ul>
        @if (visible.length > limit()) {
          <button class="btn more" type="button" (click)="limit.set(limit() + 100)">
            Show more ({{ visible.length - limit() }} hidden)
          </button>
        }
      }
    </section>
  `,
  styles: `
    .add, .toolbar { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
    .add { padding: var(--space-3); }
    .grow { flex: 1 1 200px; }
    .observation { margin: 0; color: var(--muted); }
    .list { list-style: none; margin: 0; padding: 0; overflow: hidden; }
    li {
      display: flex; align-items: center; gap: var(--space-2);
      padding: var(--space-2) var(--space-3); border-top: 1px solid var(--border);
    }
    li:first-child { border-top: 0; }
    li.done .title { color: var(--muted); text-decoration: line-through; }
    .title { flex: 1; min-width: 0; color: inherit; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .title:hover { color: var(--accent); }
    .prio { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--muted); }
    .prio[data-p='1'] { background: var(--danger); }
    .prio[data-p='2'] { background: var(--warn); }
    .owner { font-size: 12px; white-space: nowrap; }
    .empty { padding: var(--space-5); justify-content: center; }
    .more { justify-self: center; }
    @media (max-width: 640px) { .owner, .chip { display: none; } }
  `,
})
export class TodosPage {
  private readonly store = inject(Store);

  protected readonly filters: TodoFilter[] = ['all', 'open', 'done'];
  protected readonly visible$ = this.store.select(todosFeature.selectVisibleTodos);
  protected readonly open = this.store.selectSignal(todosFeature.selectOpenCount);
  protected readonly total = this.store.selectSignal(todosFeature.selectTodoTotal);
  protected readonly filter = this.store.selectSignal(todosFeature.selectFilter);
  protected readonly query = this.store.selectSignal(todosFeature.selectQuery);
  protected readonly userId = this.store.selectSignal(todosFeature.selectUserId);
  protected readonly users = this.store.selectSignal(usersFeature.selectAllUsers);
  protected readonly userNames = this.store.selectSignal(usersFeature.selectUserEntities);
  protected readonly observation = this.store.selectSignal(uiFeature.selectLastObservation);

  protected readonly title = signal('');
  protected readonly priority = signal<Priority>(2);
  protected readonly owner = signal('u1');
  protected readonly limit = signal(100);

  protected add(): void {
    const title = this.title().trim();
    if (!title) return;
    this.store.dispatch(TodosActions.todoAdded({ title, userId: this.owner(), priority: this.priority() }));
    this.title.set('');
  }

  protected toggle(id: string): void {
    this.store.dispatch(TodosActions.todoToggled({ id }));
  }
  protected remove(id: string): void {
    this.store.dispatch(TodosActions.todoRemoved({ id }));
  }
  protected clearCompleted(): void {
    this.store.dispatch(TodosActions.completedCleared());
  }
  protected setFilter(filter: TodoFilter): void {
    this.store.dispatch(TodosActions.filterChanged({ filter }));
  }
  protected setQuery(query: string): void {
    this.store.dispatch(TodosActions.queryChanged({ query }));
  }
  protected setUser(userId: string | null): void {
    this.store.dispatch(TodosActions.userFilterChanged({ userId }));
  }
}
