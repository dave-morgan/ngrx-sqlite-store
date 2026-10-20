import { Capacitor } from '@capacitor/core';
import { CapacitorSqliteDriver, SqlDriver } from 'ngrx-sqlite-store';

export const HARNESS_DB = 'ngrx-harness';

/**
 * Native (Android): @capacitor-community/sqlite directly.
 * Web: the same plugin backed by the jeep-sqlite web component (sql.js + IndexedDB),
 * which must be defined and mounted before the connection opens.
 */
export function createHarnessDriver(): SqlDriver {
  const driver = new CapacitorSqliteDriver({ database: HARNESS_DB });
  if (Capacitor.isNativePlatform()) return driver;
  const open = driver.open.bind(driver);
  driver.open = async () => {
    await mountJeepSqlite();
    await open();
  };
  return driver;
}

let jeepReady: Promise<void> | undefined;

function mountJeepSqlite(): Promise<void> {
  return (jeepReady ??= (async () => {
    const { defineCustomElements } = await import('jeep-sqlite/loader');
    await defineCustomElements(window);
    if (!document.querySelector('jeep-sqlite')) {
      const el = document.createElement('jeep-sqlite');
      el.setAttribute('autoSave', 'true');
      el.setAttribute('wasmPath', 'assets');
      document.body.appendChild(el);
    }
    await customElements.whenDefined('jeep-sqlite');
  })());
}
