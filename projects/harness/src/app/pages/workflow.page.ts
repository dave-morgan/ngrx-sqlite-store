import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@store';
import { workflowFeature } from '@impl/shapes';

import { FIELD_PATHS, WorkflowActions } from '../state/shapes';
import { selectDraftCount, selectEventCount, selectValidationErrors, selectWorkflowField } from '../state/shapes-selectors';

/** Phase 16 workload (b): hybrid workflow state — status, steps, nested form (depth 1/4/10), events, drafts. */
@Component({
  selector: 'app-workflow-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page-head">
        <h1>Workflow</h1>
        <span class="chip" data-testid="wf-status">{{ status() }}{{ loading() ? '…' : '' }}</span>
      </div>
      <div class="stats">
        <div class="card stat"><span class="label">Step</span><span class="value" data-testid="wf-step">{{ step() }}</span></div>
        <div class="card stat"><span class="label">Events</span><span class="value" data-testid="wf-events">{{ events() }}</span></div>
        <div class="card stat"><span class="label">Drafts</span><span class="value" data-testid="wf-drafts">{{ drafts() }}</span></div>
        <div class="card stat"><span class="label">Errors</span><span class="value">{{ errors() }}</span></div>
      </div>
      <div class="card form">
        <label><span class="muted">Depth 1</span>
          <input class="field" [value]="d1()" (input)="edit('d1', $any($event.target).value)" />
          <span class="mono" data-testid="wf-d1">{{ d1() }}</span></label>
        <label><span class="muted">Depth 4</span>
          <input class="field" [value]="d4()" (input)="edit('d4', $any($event.target).value)" />
          <span class="mono" data-testid="wf-d4">{{ d4() }}</span></label>
        <label><span class="muted">Depth 10</span>
          <input class="field" [value]="d10()" (input)="edit('d10', $any($event.target).value)" />
          <span class="mono" data-testid="wf-d10">{{ d10() }}</span></label>
      </div>
      <div class="actions">
        <button class="btn" type="button" (click)="load()" data-testid="wf-load">Load</button>
        <button class="btn" type="button" (click)="next()" data-testid="wf-next">Next step</button>
        <button class="btn danger" type="button" (click)="reset()" data-testid="wf-reset">Reset form</button>
      </div>
    </section>
  `,
  styles: `
    .stats { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
    .form { display: grid; gap: var(--space-3); padding: var(--space-4); }
    .form label { display: grid; gap: var(--space-1); }
    .actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
  `,
})
export class WorkflowPage {
  private readonly store = inject(Store);
  protected readonly status = this.store.selectSignal(workflowFeature.selectStatus);
  protected readonly loading = this.store.selectSignal(workflowFeature.selectLoading);
  protected readonly step = this.store.selectSignal(workflowFeature.selectStep);
  protected readonly events = this.store.selectSignal(selectEventCount);
  protected readonly drafts = this.store.selectSignal(selectDraftCount);
  protected readonly errors = this.store.selectSignal(selectValidationErrors);
  protected readonly d1 = this.store.selectSignal(selectWorkflowField.d1);
  protected readonly d4 = this.store.selectSignal(selectWorkflowField.d4);
  protected readonly d10 = this.store.selectSignal(selectWorkflowField.d10);

  protected edit(depth: keyof typeof FIELD_PATHS, value: string): void {
    this.store.dispatch(WorkflowActions.fieldEdited({ path: FIELD_PATHS[depth], value }));
  }
  protected load(): void {
    this.store.dispatch(WorkflowActions.loadStarted());
  }
  protected next(): void {
    this.store.dispatch(WorkflowActions.stepChanged({ step: this.step() + 1 }));
  }
  protected reset(): void {
    this.store.dispatch(WorkflowActions.formReset());
  }
}
