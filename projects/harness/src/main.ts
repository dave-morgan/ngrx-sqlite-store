import { bootstrapApplication } from '@angular/platform-browser';
import { Component, isDevMode } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { IMPL_NAME, provideHarnessStore } from '@impl';
import { provideStore } from '@store';
import { emptyBenchmark, traceStartup } from './benchmark-startup';

traceStartup();
const emptyMode = localStorage.getItem('harness:empty');
const emptyStore = localStorage.getItem('harness:empty-store');
(emptyStore ? bootstrapEmptyStore() : emptyMode ? emptyBenchmark(emptyMode) : bootstrapHarness()).catch((err) => console.error(err));

@Component({ selector: 'app-root', template: '<h1>NgRx SQLite harness</h1><p>Empty store: 0 items</p>' })
class EmptyStoreShell {}

async function bootstrapEmptyStore() {
  const store = provideStore();
  const app = await bootstrapApplication(EmptyStoreShell, { providers: [store] });
  await app.whenStable();
  Object.defineProperty(window, '__emptyReady', {
    configurable: true, value: { mode: IMPL_NAME, kind: 'empty-store', ms: performance.now() },
  });
}

async function bootstrapHarness() {
  if ((IMPL_NAME as string) === 'sqlite' && Capacitor.isNativePlatform() && localStorage.getItem('harness:no-prewarm') !== 'true') {
    const prewarm = (provideStore as typeof provideStore & { prewarm?: (providers: unknown[]) => Promise<void> }).prewarm;
    void prewarm?.(provideHarnessStore());
  }
  const [{ appConfig }, { App }] = await Promise.all([import('./app/app.config'), import('./app/app')]);
  // Keep optional devtools code out of production startup, including its module
  // initialization. Development still installs providers before creating the store.
  const devtools = isDevMode()
    ? [(await import('@ngrx/store-devtools')).provideStoreDevtools({ maxAge: 25, connectInZone: true })]
    : [];
  return bootstrapApplication(App, { ...appConfig, providers: [...appConfig.providers, ...devtools] });
}
