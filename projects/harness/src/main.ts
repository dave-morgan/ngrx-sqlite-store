import { bootstrapApplication } from '@angular/platform-browser';
import { isDevMode } from '@angular/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { emptyBenchmark, traceStartup } from './benchmark-startup';

traceStartup();
const emptyMode = localStorage.getItem('harness:empty');
(emptyMode ? emptyBenchmark(emptyMode) : bootstrapHarness()).catch((err) => console.error(err));

async function bootstrapHarness() {
  // Keep optional devtools code out of production startup, including its module
  // initialization. Development still installs providers before creating the store.
  const devtools = isDevMode()
    ? [(await import('@ngrx/store-devtools')).provideStoreDevtools({ maxAge: 25, connectInZone: true })]
    : [];
  return bootstrapApplication(App, { ...appConfig, providers: [...appConfig.providers, ...devtools] });
}
