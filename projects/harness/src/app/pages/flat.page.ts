import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@store';

import { FlatActions } from '../state/shapes';
import { FLAT_TARGET_KEY, selectFlatDerived, selectFlatKeyCount, selectFlatTarget } from '../state/shapes-selectors';

/** Phase 16 workload (a): one large, flat, high-rewrite object. */
@Component({
  selector: 'app-flat-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page-head">
        <h1>Flat object</h1>
        <span class="muted" data-testid="flat-count">{{ count() }} keys</span>
      </div>
      <div class="stats">
        <div class="card stat">
          <span class="label">{{ key }}</span>
          <span class="value mono" data-testid="flat-target">{{ target() }}</span>
        </div>
        <div class="card stat">
          <span class="label">Derived (first 20 keys)</span>
          <span class="value" data-testid="flat-derived">{{ derived() }}</span>
        </div>
      </div>
      <label class="card edit">
        <span class="muted">Edit {{ key }}</span>
        <input class="field" [value]="target() ?? ''" (input)="edit($any($event.target).value)" data-testid="flat-input" />
      </label>
    </section>
  `,
  styles: `
    .stats { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .edit { display: grid; gap: var(--space-2); padding: var(--space-4); }
  `,
})
export class FlatPage {
  private readonly store = inject(Store);
  protected readonly key = FLAT_TARGET_KEY;
  protected readonly count = this.store.selectSignal(selectFlatKeyCount);
  protected readonly target = this.store.selectSignal(selectFlatTarget);
  protected readonly derived = this.store.selectSignal(selectFlatDerived);

  protected edit(value: string): void {
    this.store.dispatch(FlatActions.keySet({ key: FLAT_TARGET_KEY, value }));
  }
}
