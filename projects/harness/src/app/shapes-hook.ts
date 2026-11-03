import { inject } from '@angular/core';
import { Action, MemoizedSelector, Store } from '@store';
import { workflowFeature } from '@impl/shapes';
import { filter, firstValueFrom } from 'rxjs';

import { FIELD_PATHS, FlatActions, FlatState, WorkflowActions, WorkflowEvent, flatKey, initialFlat } from './state/shapes';
import { FLAT_TARGET_KEY, selectEventCount, selectFlatTarget, selectWorkflowField } from './state/shapes-selectors';

type Sel<T> = MemoizedSelector<object, T>;
export interface ShapeSample {
  emit: number;
  dom: number;
}
export interface BurstResult {
  dispatched: number;
  observed: number;
  lagP50: number;
  lagP95: number;
  endLag: number;
  maxBacklog: number;
}

export interface ShapesHook {
  flatSetKey(n: number): Promise<ShapeSample[]>;
  flatSetKeys(n: number): Promise<ShapeSample[]>;
  flatReplace(n: number): Promise<ShapeSample[]>;
  flatBurst(rate: number, seconds: number): Promise<BurstResult>;
  wfEdit(depth: keyof typeof FIELD_PATHS, n: number): Promise<ShapeSample[]>;
  wfLoad(n: number): Promise<ShapeSample[]>;
  wfStep(n: number): Promise<ShapeSample[]>;
  wfReset(n: number): Promise<ShapeSample[]>;
  wfAppend(n: number, count: number): Promise<ShapeSample[]>;
  controlCommitRender(n: number): Promise<ShapeSample[]>;
}

declare global {
  interface Window {
    __shapes?: ShapesHook;
  }
}

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? 0;
};
const text = (testid: string) => document.querySelector(`[data-testid=${testid}]`)?.textContent?.trim() ?? '';

function waitText(testid: string, expected: string): Promise<void> {
  if (text(testid) === expected) return Promise.resolve();
  return new Promise((resolve) => {
    const obs = new MutationObserver(() => {
      if (text(testid) === expected) {
        obs.disconnect();
        resolve();
      }
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true });
  });
}

/** Phase 16 measurement hook. Never used by application UI. */
export function installShapesHook(): void {
  const store = inject(Store);

  async function time<T>(action: Action, selector: Sel<T>, done: (v: T) => boolean, testid: string, expected: string) {
    const t0 = performance.now();
    const emitted = firstValueFrom(store.select(selector).pipe(filter(done)));
    const dom = waitText(testid, expected);
    store.dispatch(action);
    await emitted;
    const emit = performance.now() - t0;
    await dom;
    return { emit, dom: performance.now() - t0 };
  }

  async function repeat(n: number, run: (i: number) => Promise<ShapeSample>): Promise<ShapeSample[]> {
    const out: ShapeSample[] = [];
    for (let i = 0; i < n; i++) {
      out.push(await run(i));
      await new Promise((r) => setTimeout(r, 15));
    }
    return out;
  }

  let seq = 0;
  const unique = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${seq++}`;

  window.__shapes = {
    flatSetKey: (n) =>
      repeat(n, () => {
        const value = unique('set');
        return time(FlatActions.keySet({ key: FLAT_TARGET_KEY, value }), selectFlatTarget, (v) => v === value, 'flat-target', value);
      }),
    flatSetKeys: (n) =>
      repeat(n, () => {
        const value = unique('ten');
        const patch: FlatState = {};
        for (let k = 1; k <= 10; k++) patch[flatKey(k)] = k === 1 ? value : `${value}-${k}`;
        return time(FlatActions.keysSet({ patch }), selectFlatTarget, (v) => v === value, 'flat-target', value);
      }),
    flatReplace: (n) =>
      repeat(n, () => {
        // Replace the whole object with ~1% of keys changed (always including the target key).
        const value = unique('rep');
        const profile = initialFlat();
        const keys = Object.keys(profile);
        const changes = Math.max(1, Math.round(keys.length / 100));
        for (let c = 0; c < changes; c++) profile[keys[(1 + c * 97) % keys.length]] = `${value}-${c}`;
        profile[FLAT_TARGET_KEY] = value;
        return time(FlatActions.replaced({ profile }), selectFlatTarget, (v) => v === value, 'flat-target', value);
      }),
    flatBurst: async (rate, seconds) => {
      const total = Math.round(rate * seconds);
      const sentAt: number[] = [];
      const seenAt = new Map<number, number>();
      const prefix = unique('burst');
      const sub = store.select(selectFlatTarget).subscribe((v) => {
        const m = typeof v === 'string' && v.startsWith(prefix) ? Number(v.slice(prefix.length + 1)) : NaN;
        if (!Number.isNaN(m) && !seenAt.has(m)) seenAt.set(m, performance.now());
      });
      let maxBacklog = 0;
      await new Promise<void>((resolve) => {
        const start = performance.now();
        let i = 0;
        const tick = () => {
          while (i < total && performance.now() - start >= (i * 1000) / rate) {
            sentAt[i] = performance.now();
            store.dispatch(FlatActions.keySet({ key: FLAT_TARGET_KEY, value: `${prefix}-${i}` }));
            i++;
            const lastSeen = Math.max(-1, ...seenAt.keys());
            maxBacklog = Math.max(maxBacklog, i - 1 - lastSeen);
          }
          if (i < total) setTimeout(tick, 1);
          else resolve();
        };
        tick();
      });
      await firstValueFrom(store.select(selectFlatTarget).pipe(filter((v) => v === `${prefix}-${total - 1}`)));
      sub.unsubscribe();
      const lags = [...seenAt.entries()].map(([k, at]) => at - sentAt[k]);
      return {
        dispatched: total,
        observed: seenAt.size,
        lagP50: pct(lags, 50),
        lagP95: pct(lags, 95),
        endLag: (seenAt.get(total - 1) ?? performance.now()) - sentAt[total - 1],
        maxBacklog,
      };
    },
    wfEdit: (depth, n) =>
      repeat(n, () => {
        const value = unique(depth);
        return time(
          WorkflowActions.fieldEdited({ path: FIELD_PATHS[depth], value }),
          selectWorkflowField[depth],
          (v) => v === value,
          `wf-${depth}`,
          value,
        );
      }),
    wfLoad: (n) =>
      repeat(n, async () => {
        // Full load cycle: loading → (30 ms simulated API, same for both) → ready.
        const t0 = performance.now();
        const ready = firstValueFrom(store.select(workflowFeature.selectStatus).pipe(filter((s) => s === 'ready')));
        store.dispatch(WorkflowActions.loadStarted());
        await firstValueFrom(store.select(workflowFeature.selectStatus).pipe(filter((s) => s === 'loading')));
        await ready;
        const emit = performance.now() - t0;
        await waitText('wf-status', 'ready');
        return { emit, dom: performance.now() - t0 };
      }),
    wfStep: (n) =>
      repeat(n, async () => {
        const next = (await firstValueFrom(store.select(workflowFeature.selectStep))) + 1;
        return time(WorkflowActions.stepChanged({ step: next }), workflowFeature.selectStep, (s) => s === next, 'wf-step', String(next));
      }),
    wfReset: (n) =>
      repeat(n, async () => {
        // Dirty the form first (untimed), then time the reset through the onState bridge.
        const value = unique('dirty');
        store.dispatch(WorkflowActions.fieldEdited({ path: FIELD_PATHS.d1, value }));
        await firstValueFrom(store.select(selectWorkflowField.d1).pipe(filter((v) => v === value)));
        return time(WorkflowActions.formReset(), selectWorkflowField.d1, (v) => v === 'Ada Lovelace', 'wf-d1', 'Ada Lovelace');
      }),
    wfAppend: (n, count) =>
      repeat(n, async () => {
        const before = await firstValueFrom(store.select(selectEventCount));
        const now = Date.now();
        const events: WorkflowEvent[] = Array.from({ length: count }, (_, i) => ({ id: unique('ev') + i, type: 'tick', at: now + i }));
        const expected = before + count;
        return time(WorkflowActions.eventsAppended({ events }), selectEventCount, (c) => c === expected, 'wf-events', String(expected));
      }),
    // Store-free control (diagnostic): one durable single-row commit, then a visible DOM text
    // change, sampled exactly like time()/repeat(). Native builds only.
    controlCommitRender: (n) => {
      const capacitor = (window as unknown as { Capacitor?: { nativePromise?: (...a: unknown[]) => Promise<unknown> } }).Capacitor;
      if (!capacitor?.nativePromise) return Promise.resolve([]);
      const native = (method: string, options: object) =>
        capacitor.nativePromise!('CapacitorSQLite', method, { database: 'ngrx-harness', readonly: false, ...options });
      let el = document.querySelector<HTMLElement>('[data-testid=shapes-control]');
      if (!el) {
        el = document.createElement('div');
        el.dataset['testid'] = 'shapes-control';
        el.style.cssText = 'position:fixed;bottom:0;left:0;font:12px monospace;background:#fff';
        document.body.appendChild(el);
      }
      const target = el;
      return native('execute', { statements: 'CREATE TABLE IF NOT EXISTS nss_bench(k INTEGER PRIMARY KEY,v TEXT)', transaction: false }).then(() =>
        repeat(n, async () => {
          const value = unique('ctl');
          const t0 = performance.now();
          const dom = waitText('shapes-control', value);
          await native('executeSet', {
            set: [{ statement: 'INSERT OR REPLACE INTO nss_bench(k,v) VALUES (1,?)', values: [value] }],
            transaction: true, returnMode: 'no', isSQL92: true,
          });
          const emit = performance.now() - t0;
          target.textContent = value;
          await dom;
          return { emit, dom: performance.now() - t0 };
        }),
      );
    },
  };
}
