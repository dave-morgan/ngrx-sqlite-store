import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@store';
import { IMPL_NAME, selectOpenTodoCount } from '@impl';

import { UiActions } from './state/actions';
import { selectTheme } from './state/selectors';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bar">
      <div class="brand">
        <span class="logo" aria-hidden="true">◆</span>
        <strong>NgRx harness</strong>
        <span class="impl" [attr.data-impl]="impl" data-testid="impl">{{ impl }}</span>
      </div>
      <nav aria-label="Main">
        @for (link of links; track link.path) {
          <a [routerLink]="link.path" routerLinkActive="active" [attr.data-testid]="'nav-' + link.label.toLowerCase()">
            {{ link.label }}
          </a>
        }
      </nav>
      <div class="right">
        <span class="chip" data-testid="open-count">{{ open() }} open</span>
        <button class="btn ghost" type="button" (click)="toggleTheme()" data-testid="theme-toggle"
                [attr.aria-label]="'Switch to ' + (theme() === 'light' ? 'dark' : 'light') + ' theme'">
          {{ theme() === 'light' ? '☾' : '☀' }}
        </button>
      </div>
    </header>
    <main><router-outlet /></main>
  `,
  styles: `
    :host { display: grid; grid-template-rows: auto 1fr; min-height: 100dvh; }
    .bar {
      position: sticky; top: 0; z-index: 10;
      display: flex; align-items: center; gap: var(--space-4);
      padding: var(--space-2) var(--space-5);
      background: color-mix(in srgb, var(--surface) 88%, transparent);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border);
    }
    .brand { display: flex; align-items: center; gap: var(--space-2); }
    .logo { color: var(--accent); }
    .impl {
      padding: 1px 8px; border-radius: 999px; font: 600 11px/18px var(--mono);
      text-transform: uppercase; letter-spacing: .04em;
      background: var(--surface-2); color: var(--muted);
    }
    .impl[data-impl='sqlite'] { background: var(--accent-soft); color: var(--accent); }
    nav { display: flex; gap: 2px; overflow-x: auto; }
    nav a {
      padding: 6px 10px; border-radius: var(--radius-sm); color: var(--muted); white-space: nowrap;
    }
    nav a:hover { background: var(--surface-2); color: var(--text); }
    nav a.active { color: var(--text); background: var(--surface-2); font-weight: 600; }
    .right { margin-left: auto; display: flex; align-items: center; gap: var(--space-2); }
    @media (max-width: 640px) {
      .bar { flex-wrap: wrap; padding: var(--space-2) var(--space-3); gap: var(--space-2); }
      nav { order: 3; width: 100%; }
    }
  `,
})
export class App {
  private readonly store = inject(Store);

  protected readonly impl = IMPL_NAME;
  protected readonly theme = this.store.selectSignal(selectTheme);
  protected readonly open = this.store.selectSignal(selectOpenTodoCount);
  protected readonly links = [
    { path: '/todos', label: 'Todos' },
    { path: '/users', label: 'Users' },
    { path: '/notes', label: 'Notes' },
    { path: '/diagnostics', label: 'Diagnostics' },
  ];

  protected toggleTheme(): void {
    this.store.dispatch(UiActions.themeToggled());
  }
}
