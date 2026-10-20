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
import { TodosEffects, applyTheme, loadSeed, seedOnInit, trackVisits } from './state/effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Store implementation (classic @ngrx/store or ngrx-sqlite-store) is chosen by the build config.
    ...provideHarnessStore(),
    // Everything below is the unmodified NgRx ecosystem.
    provideEffects(TodosEffects, { seedOnInit, loadSeed, trackVisits, applyTheme }),
    provideRouterStore(),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode(), connectInZone: true }),
    provideAppInitializer(installHarnessHook),
  ],
};
