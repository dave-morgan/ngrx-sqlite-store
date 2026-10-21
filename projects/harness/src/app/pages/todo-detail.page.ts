import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@store';
import { todoById, usersFeature } from '@impl';

import { TodosActions } from '../state/actions';
import { selectRouteTodoId } from '../state/selectors';

/** Reads its id exclusively through @ngrx/router-store selectors. */
@Component({
  selector: 'app-todo-detail-page',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a routerLink="/todos" class="back">← All todos</a>
      @if (todo(); as t) {
        <article class="card detail" data-testid="todo-detail">
          <header>
            <span class="chip mono" data-testid="detail-id">{{ routeId() }}</span>
            <span class="chip" [class.ok]="t.done" data-testid="detail-status">{{ t.done ? 'Done' : 'Open' }}</span>
            <span class="chip">P{{ t.priority }}</span>
          </header>
          <h1 data-testid="detail-title">{{ t.title }}</h1>
          <dl>
            <dt>Owner</dt><dd>{{ users()[t.userId]?.name ?? t.userId }}</dd>
            <dt>Created</dt><dd>{{ created(t.createdAt) }}</dd>
            <dt>Tags</dt><dd>{{ t.tags.join(', ') || '—' }}</dd>
          </dl>
          <form class="rename" (ngSubmit)="rename(t.id)">
            <label class="sr-only" for="rename">Title</label>
            <input id="rename" class="field" name="title" [(ngModel)]="draft" data-testid="rename-input" />
            <button class="btn" type="submit" data-testid="rename">Rename</button>
            <button class="btn primary" type="button" (click)="toggle(t.id)" data-testid="detail-toggle">
              Mark {{ t.done ? 'open' : 'done' }}
            </button>
          </form>
        </article>
      } @else {
        <p class="card missing muted" data-testid="todo-missing">No todo with id “{{ routeId() }}”.</p>
      }
    </section>
  `,
  styles: `
    .back { justify-self: start; }
    .detail { display: grid; gap: var(--space-4); padding: var(--space-5); }
    header { display: flex; gap: var(--space-2); flex-wrap: wrap; }
    .chip.ok { color: var(--ok); }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-2) var(--space-4); margin: 0; }
    dt { color: var(--muted); }
    dd { margin: 0; }
    .rename { display: flex; gap: var(--space-2); flex-wrap: wrap; }
    .rename .field { flex: 1 1 220px; }
    .missing { padding: var(--space-5); }
  `,
})
export class TodoDetailPage {
  private readonly store = inject(Store);

  protected readonly routeId = this.store.selectSignal(selectRouteTodoId);
  // Route param from @ngrx/router-store selectors; the todo by id (sqlite: one-row query).
  protected readonly todo = toSignal(
    toObservable(this.routeId).pipe(switchMap((id) => (id ? this.store.select(todoById(id)) : of(null)))),
    { initialValue: null },
  );
  protected readonly users = this.store.selectSignal(usersFeature.selectUserEntities);
  protected readonly draft = signal('');

  constructor() {
    effect(() => this.draft.set(this.todo()?.title ?? ''));
  }

  protected created(ts: number): string {
    return new Date(ts).toISOString().slice(0, 10);
  }
  protected rename(id: string): void {
    const title = this.draft().trim();
    if (title) this.store.dispatch(TodosActions.todoRenamed({ id, title }));
  }
  protected toggle(id: string): void {
    this.store.dispatch(TodosActions.todoToggled({ id }));
  }
}
