// Classic @ngrx/store reducers for the phase 16 workloads.
import { EnvironmentProviders } from '@angular/core';
import { createFeature, createReducer, on, provideState } from '@ngrx/store';

import {
  FlatActions,
  FlatState,
  WorkflowActions,
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
    on(FlatActions.keySet, (state, { key, value }) => ({ ...state, [key]: value })),
    on(FlatActions.keysSet, (state, { patch }) => ({ ...state, ...patch })),
    on(FlatActions.replaced, (_state, { profile }) => profile),
  ),
});

export const workflowFeature = createFeature({
  name: 'workflow',
  reducer: createReducer<WorkflowState>(
    initialWorkflow(),
    on(WorkflowActions.fieldEdited, (state, { path, value }) => ({ ...state, form: setIn(state.form, path, value) })),
    on(WorkflowActions.loadStarted, (state) => ({ ...state, status: 'loading' as const, loading: true, error: null })),
    on(WorkflowActions.loadSucceeded, (state) => ({ ...state, status: 'ready' as const, loading: false })),
    on(WorkflowActions.stepChanged, (state, { step }) => ({ ...state, step })),
    on(WorkflowActions.formReset, (state) => ({ ...state, form: initialForm(), validation: initialWorkflow().validation })),
    on(WorkflowActions.eventsAppended, (state, { events }) => ({ ...state, events: [...state.events, ...events] })),
    on(WorkflowActions.draftSaved, (state, { draft }) => ({ ...state, drafts: draftAdapter.upsertOne(draft, state.drafts) })),
  ),
});

/** Registered by the lazy shapes routes only: the list app never boots these features. */
export function provideShapesState(): EnvironmentProviders[] {
  return [provideState(flatFeature), provideState(workflowFeature)];
}
