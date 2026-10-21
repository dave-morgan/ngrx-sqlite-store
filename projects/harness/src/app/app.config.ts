import {
  ApplicationConfig,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore } from '@ngrx/router-store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideHarnessStore } from '@impl';

import { routes } from './app.routes';
import { installHarnessHook } from './harness-hook';
import { TodosEffects, applyTheme, loadSeed, releaseSeedPayload, seedOnInit, trackVisits } from './state/effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Store implementation (classic @ngrx/store or ngrx-sqlite-store) is chosen by the build config.
    ...provideHarnessStore(),
    // Everything below is the unmodified NgRx ecosystem.
    provideEffects(TodosEffects, { seedOnInit, loadSeed, releaseSeedPayload, trackVisits, applyTheme }),
    provideRouterStore(),
    // Devtools keeps its last `maxAge` actions (payloads included) in liftedState; actionsBlocklist
    // only filters what is sent to the extension. Dev builds only (docs/guides/ram.md).
    ...(isDevMode() ? [provideStoreDevtools({ maxAge: 25, connectInZone: true })] : []),
    provideAppInitializer(installHarnessHook),
  ],
};
