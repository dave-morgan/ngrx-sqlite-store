import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@store';

import { TodosActions } from '../state/actions';
import { selectUsersWithCounts } from '../state/selectors';

@Component({
  selector: 'app-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page-head">
        <h1>Users</h1>
        <span class="muted">Sorted by name via <code>sortComparer</code> (Q1)</span>
      </div>
      <ul class="grid" data-testid="user-grid">
        @for (u of users(); track u.id) {
          <li>
            <button class="card user" type="button" (click)="showTodos(u.id)" [attr.data-testid]="'user-' + u.id">
              <span class="avatar" [style.--h]="u.hue" aria-hidden="true">{{ initials(u.name) }}</span>
              <span class="who">
                <strong>{{ u.name }}</strong>
                <span class="muted mail">{{ u.email }}</span>
              </span>
              <span class="counts">
                <span><b>{{ u.open }}</b> open</span>
                <span class="muted">{{ u.done }} done</span>
              </span>
            </button>
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    .grid {
      list-style: none; margin: 0; padding: 0;
      display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    }
    .user {
      width: 100%; display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-3) var(--space-4); text-align: left; cursor: pointer;
      transition: border-color .12s, transform .12s;
    }
    .user:hover { border-color: var(--accent); transform: translateY(-1px); }
    .avatar {
      width: 36px; height: 36px; flex: none; display: grid; place-items: center; border-radius: 50%;
      font-weight: 650; font-size: 13px; color: #fff; background: hsl(var(--h) 55% 48%);
    }
    .who { display: grid; min-width: 0; flex: 1; }
    .mail { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .counts { display: grid; text-align: right; font-size: 12px; font-variant-numeric: tabular-nums; }
  `,
})
export class UsersPage {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly users = this.store.selectSignal(selectUsersWithCounts);

  protected initials(name: string): string {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('');
  }

  protected showTodos(userId: string): void {
    this.store.dispatch(TodosActions.userFilterChanged({ userId }));
    void this.router.navigate(['/todos']);
  }
}
