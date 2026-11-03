// Phase 16 workloads. Everything here is lazy and route-scoped (features, effect,
// bench hook) so the list workloads' bundle, boot and heap stay unchanged.
import { provideEnvironmentInitializer } from '@angular/core';
import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideShapesState } from '@impl/shapes';

import { installShapesHook } from './shapes-hook';
import { simulateWorkflowLoad } from './state/shapes-selectors';

export const shapesRoutes: Routes = [
  {
    path: '',
    providers: [
      ...provideShapesState(),
      provideEffects({ simulateWorkflowLoad }),
      provideEnvironmentInitializer(installShapesHook),
    ],
    children: [
      { path: 'flat', title: 'Flat object', loadComponent: () => import('./pages/flat.page').then((m) => m.FlatPage) },
      { path: 'workflow', title: 'Workflow', loadComponent: () => import('./pages/workflow.page').then((m) => m.WorkflowPage) },
    ],
  },
];
