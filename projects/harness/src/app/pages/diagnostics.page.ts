import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, inject, signal } from '@angular/core';
import { Store } from '@store';
import { IMPL_NAME, settleStore, todosFeature, uiFeature } from '@impl';
import { filter, firstValueFrom } from 'rxjs';

import { SeedActions, benchmarkTick } from '../state/actions';
import { selectUrl } from '../state/selectors';

interface BenchResult {
  runs: number;
  p50: number;
  p95: number;
  max: number;
  totalMs: number;
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
}

/** Live counters plus a dispatch → selector-emission latency benchmark (Q14, phase 9). */
@Component({
  selector: 'app-diagnostics-page',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page-head">
        <h1>Diagnostics</h1>
        <span class="muted mono">{{ url() }}</span>
      </div>

      <div class="stats">
        <div class="card stat"><span class="label">Implementation</span><span class="value" data-testid="diag-impl">{{ impl }}</span></div>
        <div class="card stat"><span class="label">Todos</span><span class="value" data-testid="diag-total">{{ total() }}</span></div>
        <div class="card stat"><span class="label">Seed version</span><span class="value">{{ seedVersion() }}</span></div>
        <div class="card stat"><span class="label">JS heap used</span><span class="value" data-testid="diag-heap">{{ heap() }}</span></div>
      </div>

      <div class="card panel">
        <header>
          <h2>Dispatch → emission latency</h2>
          <div class="row">
            <label class="muted" for="runs">Runs</label>
            <input id="runs" class="field runs" type="number" min="1" max="5000" [value]="runs()"
                   (change)="runs.set(+$any($event.target).value)" />
            <button class="btn primary" type="button" (click)="bench()" [disabled]="running()" data-testid="bench">
              {{ running() ? 'Running…' : 'Run' }}
            </button>
          </div>
        </header>
        @if (result(); as r) {
          <table class="mono" data-testid="bench-result">
            <tr><th>runs</th><th>p50 ms</th><th>p95 ms</th><th>max ms</th><th>total ms</th></tr>
            <tr>
              <td>{{ r.runs }}</td><td>{{ r.p50 | number: '1.2-2' }}</td><td>{{ r.p95 | number: '1.2-2' }}</td>
              <td>{{ r.max | number: '1.2-2' }}</td><td>{{ r.totalMs | number: '1.0-0' }}</td>
            </tr>
          </table>
        } @else {
          <p class="muted">Dispatches one action per run and waits for its selector to emit the new value.</p>
        }
      </div>

      <div class="card panel">
        <h2>Recently visited (router-store → effect → reducer)</h2>
        <ol class="visited" data-testid="visited">
          @for (v of visited(); track v) { <li class="mono">{{ v }}</li> } @empty { <li class="muted">none</li> }
        </ol>
      </div>

      <div class="card panel danger-zone">
        <div>
          <h2>Reset data</h2>
          <p class="muted">Clears every slice; the seed effect reloads on next start.</p>
        </div>
        <button class="btn danger" type="button" (click)="reset()" data-testid="reset">Reset &amp; reload</button>
      </div>
    </section>
  `,
  styles: `
    .stats { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
    .panel { display: grid; gap: var(--space-3); padding: var(--space-4); }
    .panel header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2); }
    .row { display: flex; align-items: center; gap: var(--space-2); }
    .runs { width: 90px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { text-align: right; padding: 6px 8px; border-bottom: 1px solid var(--border); }
    th { color: var(--muted); font-weight: 500; }
    .visited { margin: 0; padding-left: 20px; display: grid; gap: 2px; }
    .danger-zone { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; }
    .danger-zone p { margin: 2px 0 0; }
  `,
})
export class DiagnosticsPage {
  private readonly store = inject(Store);
  private readonly injector = inject(Injector);

  protected readonly impl = IMPL_NAME;
  protected readonly total = this.store.selectSignal(todosFeature.selectTodoTotal);
  protected readonly seedVersion = this.store.selectSignal(todosFeature.selectSeedVersion);
  protected readonly visited = this.store.selectSignal(uiFeature.selectVisited);
  protected readonly url = this.store.selectSignal(selectUrl);
  protected readonly runs = signal(200);
  protected readonly running = signal(false);
  protected readonly result = signal<BenchResult | null>(null);
  protected readonly heap = signal(this.readHeap());

  async bench(): Promise<void> {
    this.running.set(true);
    const count$ = this.store.select(uiFeature.selectBenchmarkCount);
    const start = await firstValueFrom(count$);
    const samples: number[] = [];
    const t0 = performance.now();
    for (let i = 1; i <= this.runs(); i++) {
      const n = start + i;
      const t = performance.now();
      const emitted = firstValueFrom(count$.pipe(filter((c) => c === n)));
      this.store.dispatch(benchmarkTick({ n }));
      await emitted;
      samples.push(performance.now() - t);
    }
    const totalMs = performance.now() - t0;
    samples.sort((a, b) => a - b);
    this.result.set({
      runs: samples.length,
      p50: percentile(samples, 50),
      p95: percentile(samples, 95),
      max: samples[samples.length - 1] ?? 0,
      totalMs,
    });
    this.heap.set(this.readHeap());
    this.running.set(false);
  }

  async reset(): Promise<void> {
    this.store.dispatch(SeedActions.reset());
    await settleStore(this.injector);
    location.reload();
  }

  private readHeap(): string {
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    return mem ? `${(mem.usedJSHeapSize / 1048576).toFixed(1)} MB` : 'n/a';
  }
}
