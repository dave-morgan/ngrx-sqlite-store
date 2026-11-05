/** Opt-in diagnostics; normal benchmark trials do not install this wrapper. */
export function traceStartup(): void {
  if (localStorage.getItem('harness:profile') !== 'true') return;
  const capacitor = (window as unknown as { Capacitor?: {
    nativePromise?: (...args: unknown[]) => Promise<unknown>;
  } }).Capacitor;
  if (!capacitor?.nativePromise) throw new Error('Startup profiling needs a native bridge');
  const original = capacitor.nativePromise;
  const calls: { method: unknown; start: number; ms?: number; bytes: number; sql: string[]; transaction: number; values?: unknown }[] = [];
  const encoder = new TextEncoder();
  let transaction = 0;
  Object.defineProperty(window, '__startupTrace', { configurable: true, value: calls });
  // Diagnostic timeline: JS long tasks, animation frames and summary text changes.
  const timeline: { kind: string; at: number; ms?: number; text?: string }[] = [];
  Object.defineProperty(window, '__startupTimeline', { configurable: true, value: timeline });
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) timeline.push({ kind: 'longtask', at: entry.startTime, ms: entry.duration });
    }).observe({ type: 'longtask', buffered: true });
  } catch { /* unsupported */ }
  let frames = 0;
  const frame = (at: number) => {
    timeline.push({ kind: 'raf', at });
    if (++frames < 400 && typeof requestAnimationFrame === 'function') requestAnimationFrame(frame);
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(frame);
  if (typeof MutationObserver === 'function') new MutationObserver(() => {
    const text = document.querySelector('[data-testid=todo-summary]')?.textContent?.trim();
    if (text) timeline.push({ kind: 'summary', at: performance.now(), text });
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  capacitor.nativePromise = function (...args: unknown[]) {
    const options = args[2] as { statement?: string; statements?: string; transaction?: boolean; set?: { statement: string }[] } | undefined;
    if (args[1] === 'beginTransaction' || (args[1] === 'executeSet' && options?.transaction)) transaction++;
    const json = JSON.stringify(options ?? {});
    const row = {
      transaction,
      method: args[1], start: performance.now(), ms: undefined as number | undefined,
      bytes: encoder.encode(json).length,
      // Small payloads only: statement parameters identify paths in diagnostics.
      values: json.length < 4096
        ? (options as { values?: unknown; set?: { values?: unknown }[] } | undefined)?.set?.map((entry) => entry.values) ??
          (options as { values?: unknown } | undefined)?.values
        : undefined,
      sql: options?.set?.map((entry) => entry.statement.slice(0, 200)) ??
        [String(options?.statement ?? options?.statements ?? '').slice(0, 200)],
    };
    calls.push(row);
    if (args[1] === 'commitTransaction' || args[1] === 'rollbackTransaction') transaction++;
    return original.apply(this, args).finally(() => { row.ms = performance.now() - row.start; });
  };
}

/** Empty native/plugin control: no Angular injector, store or schema is created. */
export async function emptyBenchmark(mode: string): Promise<void> {
  if (mode === 'floor') {
    const { floorBenchmark } = await import('./benchmark-floors');
    await floorBenchmark();
    return;
  }
  if (mode !== 'classic' && mode !== 'sqlite') throw new Error('Invalid empty benchmark mode');
  const start = performance.now();
  let openMs = 0;
  if (mode === 'sqlite') {
    const { CapacitorSQLite } = await import('@capacitor-community/sqlite');
    const database = 'parity_empty';
    await CapacitorSQLite.createConnection({ database, version: 1, encrypted: false, mode: 'no-encryption' });
    const opened = performance.now();
    await CapacitorSQLite.open({ database });
    openMs = performance.now() - opened;
  }
  document.body.textContent = 'Empty benchmark: 0 items';
  Object.defineProperty(window, '__emptyReady', {
    configurable: true, value: { mode, ms: performance.now() - start, openMs },
  });
}
