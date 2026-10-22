import { InjectionToken } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import { CapacitorSqliteDriver } from '../driver/capacitor-sqlite-driver';
import type { SqlDriver } from '../driver/sql-driver';
import { SCHEMA_MIGRATIONS } from '../schema/migrations';
import { StorageEngine } from '../storage/storage-engine';
import { escapeSegment } from '../storage/path';
import { RowWriter } from '../schema/row-writer';
import type { SqliteStoreConfig } from './tokens';

interface Prewarm {
  driver: SqlDriver;
  engine: StorageEngine;
  ready: Promise<void>;
}
const defaultDriver = {};
const pending = new WeakMap<object, Prewarm>();
export interface PrewarmFeature {
  key: string;
  persist?: boolean;
  router: boolean;
}
const configurations = new WeakMap<object, { config: SqliteStoreConfig; features: PrewarmFeature[] }>();
const registrations = new WeakMap<object, PrewarmFeature>();
export function registerPrewarm(providers: EnvironmentProviders, config: SqliteStoreConfig, features: PrewarmFeature[]): void {
  configurations.set(providers, { config, features });
}
export function registerPrewarmFeature(providers: EnvironmentProviders, feature: PrewarmFeature): void {
  registrations.set(providers, feature);
}
export const PREWARM_READY = new InjectionToken<Promise<void> | undefined>('NSS prewarm ready');

/** Start recovery and schema open before bootstrap; provideStore adopts by driver identity. */
export function prewarmSqliteStore(input: SqliteStoreConfig | readonly unknown[] = {}): Promise<void> {
  const providers: readonly unknown[] = Array.isArray(input) ? input : [];
  const matches = providers.filter((value) => value && typeof value === 'object' && configurations.has(value));
  if (Array.isArray(input) && matches.length !== 1) throw new Error('Prewarm requires exactly one provideStore root');
  const declaration = Array.isArray(input) ? configurations.get(matches[0] as object)! : undefined;
  const config = (declaration?.config ?? input) as SqliteStoreConfig;
  const additional = providers.flatMap((value) => {
    const registration = value && typeof value === 'object' ? registrations.get(value) : undefined;
    return registration ? [registration] : [];
  });
  const features = declaration ? [...declaration.features, ...additional] : [];
  const persistent = new Map<string, boolean>();
  for (const feature of features) {
    const keep = feature.persist ?? config.features?.[feature.key]?.persist ?? !feature.router;
    // Conflicting duplicate declarations wait for DI to establish precedence.
    persistent.set(feature.key, (persistent.get(feature.key) ?? false) || keep);
  }
  const session = [...persistent].filter(([, keep]) => !keep).map(([key]) => key);
  const key = config.driver ?? defaultDriver;
  let warm = pending.get(key);
  if (!warm) {
    const driver = typeof config.driver === 'function' ? config.driver() :
      config.driver ?? new CapacitorSqliteDriver({ database: 'ngrx-sqlite-store' });
    const engine = new StorageEngine(driver, { migrations: SCHEMA_MIGRATIONS });
    const ready = engine.open().then(async () => {
      if (!session.length) return;
      await engine.transaction(async (tx) => {
        const writer = new RowWriter(tx, tx.changes, 1_048_576);
        for (const key of session) await writer.deletePrefix(escapeSegment(key));
      });
    });
    // Keep the original rejected promise for bootstrap. This handler only prevents
    // an unhandled rejection while the framework is still starting.
    void ready.catch(() => undefined);
    warm = { driver, engine, ready };
    pending.set(key, warm);
  }
  return warm.ready;
}

export function takePrewarm(driver: SqliteStoreConfig['driver']): Prewarm | undefined {
  const key = driver ?? defaultDriver;
  const warm = pending.get(key);
  pending.delete(key);
  return warm;
}
