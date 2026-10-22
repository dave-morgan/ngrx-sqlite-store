import { Injector, inject } from '@angular/core';
import { Action, Store } from '@store';
import { IMPL_NAME, settleStore, uiFeature } from '@impl';
import { filter, firstValueFrom } from 'rxjs';
import { SeedActions, benchmarkTick } from './state/actions';
import { SEED_VERSION, generateSeed } from './state/seed';
import { SQL_DRIVER } from '../../../ngrx-sqlite-store/src/lib/driver/sql-driver';

export interface HarnessHook {
  impl: typeof IMPL_NAME;
  dispatch(action: Action): void;
  /** Resolves once every dispatched action is reduced and visible to selectors. */
  settle(): Promise<void>;
  /** Native-only measurement hook; never invoked by application UI. */
  benchBridge(): Promise<unknown>;
  benchEmit(runs: number): Promise<{ runs: number; p50: number; p95: number; max: number; samples: number[] }>;
  benchTrace(): Promise<unknown>;
  benchSeed(size: number): Promise<{ generateMs: number; reduceMs: number }>;
  /** First matching summary render, timestamped before CDP attaches. */
  ready?: { total: number; ms: number };
}

declare global {
  interface Window {
    __harness?: HarnessHook;
  }
}

/** Exposes a tiny test hook for Playwright e2e; identical surface for both implementations. */
export function installHarnessHook(): void {
  const store = inject(Store);
  const injector = inject(Injector);
  window.__harness = {
    impl: IMPL_NAME,
    dispatch: (action) => store.dispatch(action),
    settle: () => settleStore(injector),
    benchBridge,
    benchSeed: async (size) => {
      store.dispatch(SeedActions.reset());
      await settleStore(injector);
      const start = performance.now();
      const data = generateSeed(size);
      const generated = performance.now();
      store.dispatch(SeedActions.seedLoaded({ data, version: SEED_VERSION }));
      await settleStore(injector);
      return { generateMs: generated - start, reduceMs: performance.now() - generated };
    },
    benchTrace: async () => {
      await settleStore(injector);
      const driver = injector.get(SQL_DRIVER);
      const calls: { method: string; args: unknown[]; ms?: number }[] = [];
      const restore: (() => void)[] = [];
      try {
        for (const method of ['query', 'run', 'exec', 'batch', 'begin', 'commit', 'rollback'] as const) {
          const original = driver[method] as ((...args: unknown[]) => Promise<unknown>) | undefined;
          if (!original) continue;
          const descriptor = Object.getOwnPropertyDescriptor(driver, method);
          restore.push(() => descriptor ? Object.defineProperty(driver, method, descriptor) : Reflect.deleteProperty(driver, method));
          Object.defineProperty(driver, method, { configurable: true, value: async (...args: unknown[]) => {
            const call: { method: string; args: unknown[]; ms?: number } = { method, args: structuredClone(args) };
            calls.push(call);
            const start = performance.now();
            try { return await original.apply(driver, args); }
            finally { call.ms = performance.now() - start; }
          } });
        }
        const emission = await window.__harness!.benchEmit(3);
        await settleStore(injector);
        return { emission, calls };
      } finally {
        for (const undo of restore) undo();
      }
    },
    benchEmit: async (runs) => {
      const count$ = store.select(uiFeature.selectBenchmarkCount);
      const start = await firstValueFrom(count$);
      const samples: number[] = [];
      for (let i = 1; i <= runs; i++) {
        const n = start + i;
        const t = performance.now();
        const emitted = firstValueFrom(count$.pipe(filter((count) => count === n)));
        store.dispatch(benchmarkTick({ n }));
        await emitted;
        samples.push(performance.now() - t);
      }
      const sorted = [...samples].sort((a, b) => a - b);
      return { runs, p50: sorted[Math.floor(runs * 0.5)], p95: sorted[Math.floor(runs * 0.95)], max: sorted[runs - 1], samples };
    },
  };
  const total = Number(new URL(location.href).searchParams.get('seed') ?? localStorage.getItem('harness:seed') ?? 500);
  const observer = new MutationObserver(() => {
    const summary = document.querySelector('[data-testid=todo-summary]')?.textContent ?? '';
    if (new RegExp(`(^|\\D)${total} total`).test(summary)) {
      window.__harness!.ready = { total, ms: performance.now() };
      observer.disconnect();
    }
  });
  observer.observe(document.body, { subtree: true, characterData: true, childList: true });
}

async function benchBridge() {
  const { CapacitorSQLite } = await import('@capacitor-community/sqlite');
  const samples: number[] = [];
  for (let i = 0; i < 200; i++) {
    const start = performance.now();
    await CapacitorSQLite.echo({ value: 'parity' });
    samples.push(performance.now() - start);
  }
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const sd = Math.sqrt(samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (samples.length - 1));
  const database = 'parity_bridge';
  await CapacitorSQLite.createConnection({ database, version: 1, encrypted: false, mode: 'no-encryption' });
  await CapacitorSQLite.open({ database });
  const bandwidthSamples: { bytes: number; ms: number }[] = [];
  const settings = {
    journalMode: (await CapacitorSQLite.query({ database, statement: 'PRAGMA journal_mode', values: [] })).values,
    synchronous: (await CapacitorSQLite.query({ database, statement: 'PRAGMA synchronous', values: [] })).values,
  };
  try {
    await CapacitorSQLite.execute({ database, statements: 'CREATE TABLE IF NOT EXISTS payload (value TEXT)', transaction: true });
    for (const bytes of [65536, 262144, 1048576, 4194304]) {
      for (let repeat = 0; repeat < 5; repeat++) {
        const set = [{ statement: 'INSERT INTO payload VALUES (?)', values: ['x'.repeat(bytes)] }];
        const encodedBytes = new TextEncoder().encode(JSON.stringify({ database, set, transaction: true, readonly: false })).length;
        const start = performance.now();
        await CapacitorSQLite.executeSet({ database, set, transaction: true });
        bandwidthSamples.push({ bytes: encodedBytes, ms: performance.now() - start });
        await CapacitorSQLite.execute({ database, statements: 'DELETE FROM payload', transaction: true });
      }
    }
  } finally {
    await CapacitorSQLite.closeConnection({ database });
  }
  const xMean = bandwidthSamples.reduce((sum, row) => sum + row.bytes, 0) / bandwidthSamples.length;
  const yMean = bandwidthSamples.reduce((sum, row) => sum + row.ms, 0) / bandwidthSamples.length;
  const slope = bandwidthSamples.reduce((sum, row) => sum + (row.bytes - xMean) * (row.ms - yMean), 0) /
    bandwidthSamples.reduce((sum, row) => sum + (row.bytes - xMean) ** 2, 0);
  return {
    echo: { p50: [...samples].sort((a, b) => a - b)[100], mean, sd, samples },
    bandwidth: { bytesPerMs: 1 / slope, interceptMs: yMean - slope * xMean, samples: bandwidthSamples, settings },
  };
}
