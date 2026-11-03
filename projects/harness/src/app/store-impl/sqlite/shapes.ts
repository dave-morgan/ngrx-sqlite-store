// ngrx-sqlite-store reducers for the phase 16 workloads. Deliberately idiomatic, not tuned:
// this is the baseline. Mix of imperative tx.set, returned partials (diffed), an onState
// bridge handler, and entity adapter ops on a nested collection.
import { EnvironmentProviders } from '@angular/core';
import { createFeature, createReducer, on, onState, provideState } from 'ngrx-sqlite-store';

import {
  FlatActions,
  FlatState,
  FormNode,
  WorkflowActions,
  WorkflowEvent,
  WorkflowState,
  draftAdapter,
  initialFlat,
  initialForm,
  initialWorkflow,
  setIn,
} from '../../state/shapes';

export const flatFeature = createFeature({
  name: 'flat',
  reducer: createReducer<FlatState>(
    initialFlat(),
    on(FlatActions.keySet, (tx, { key, value }) => tx.set(key, value)),
    on(FlatActions.keysSet, async (_tx, { patch }) => patch),
    on(FlatActions.replaced, async (_tx, { profile }) => profile),
  ),
});

export const workflowFeature = createFeature({
  name: 'workflow',
  reducer: createReducer<WorkflowState>(
    initialWorkflow(),
    on(WorkflowActions.fieldEdited, async (tx, { path, value }) => ({
      form: setIn(await tx.get<FormNode>('form'), path, value),
    })),
    on(WorkflowActions.loadStarted, async () => ({ status: 'loading' as const, loading: true, error: null })),
    on(WorkflowActions.loadSucceeded, async () => ({ status: 'ready' as const, loading: false })),
    on(WorkflowActions.stepChanged, (tx, { step }) => tx.set('step', step)),
    // Classic handler through the compat bridge (ADR-0013).
    onState(WorkflowActions.formReset, (state) => ({ ...state, form: initialForm(), validation: initialWorkflow().validation })),
    on(WorkflowActions.eventsAppended, async (tx, { events }) => ({
      events: [...(await tx.get<WorkflowEvent[]>('events')), ...events],
    })),
    on(WorkflowActions.draftSaved, (tx, { draft }) => draftAdapter.at(tx, 'drafts').upsertOne(draft)),
  ),
});

/** Registered by the lazy shapes routes only: the list app never boots these features. */
export function provideShapesState(): EnvironmentProviders[] {
  return [provideState(flatFeature), provideState(workflowFeature)];
}
