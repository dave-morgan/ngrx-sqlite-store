import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { cpus, totalmem } from 'node:os';
import { SqlJsDriver } from '../src/lib/driver/sqljs-driver';
import type { SqlValue } from '../src/lib/driver/sql-driver';
import { SCHEMA_MIGRATIONS } from '../src/lib/schema/migrations';
import type { SqlExecutor } from '../src/lib/storage/storage-engine';

export { assert };
export const require = createRequire(import.meta.url);
const initSqlJs = require('sql.js');
const sqlJs = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
const sqlPackage = JSON.parse(
  await readFile(resolve(dirname(require.resolve('sql.js')), '../package.json'), 'utf8'),
);
const versionDb = new sqlJs.Database();
const sqliteVersion = versionDb.exec('SELECT sqlite_version()')[0].values[0][0];
versionDb.close();
export const environment = `Node ${process.version}; sql.js ${sqlPackage.version}; SQLite ${sqliteVersion}; ${process.platform}/${process.arch}; ${cpus()[0].model}; ${(totalmem() / 1024 ** 3).toFixed(1)} GiB RAM. Production mode (no dev freezing). In-memory WASM; no disk or Capacitor bridge.`;

export class Meter implements SqlExecutor {
  statements = 0;
  sqlMs = 0;
  boundBytes = 0;
  rewrittenRows = 0;
  constructor(readonly driver: SqlJsDriver) {}
  reset(): void {
    this.statements = this.sqlMs = this.boundBytes = this.rewrittenRows = 0;
  }
  async exec(sql: string): Promise<void> {
    this.statements++;
    const start = performance.now();
    try {
      await this.driver.exec(sql);
    } finally {
      this.sqlMs += performance.now() - start;
    }
  }
  async query<R>(sql: string, params: SqlValue[] = []): Promise<R[]> {
    this.statements++;
    const start = performance.now();
    try {
      const rows = await this.driver.query<R>(sql, params);
      if (/^DELETE/i.test(sql.trim())) this.rewrittenRows += rows.length;
      return rows;
    } finally {
      this.sqlMs += performance.now() - start;
    }
  }
  async run(sql: string, params: SqlValue[] = []): Promise<{ changes: number; lastId?: number }> {
    // SqlJsDriver.run also issues SELECT last_insert_rowid(): count that SQL,
    // while timing the complete driver call only once.
    this.statements += 2;
    if (/^(INSERT|UPDATE)/i.test(sql.trim())) {
      this.boundBytes += params.reduce<number>(
        (n, value) => n + (typeof value === 'string' ? Buffer.byteLength(value) : 0),
        0,
      );
    }
    const start = performance.now();
    try {
      const result = await this.driver.run(sql, params);
      this.rewrittenRows += result.changes;
      return result;
    } finally {
      this.sqlMs += performance.now() - start;
    }
  }
}

export async function database(): Promise<Meter> {
  const driver = new SqlJsDriver({ sqlJs: async () => sqlJs });
  await driver.open();
  const meter = new Meter(driver);
  for (const migration of SCHEMA_MIGRATIONS) await migration.up(meter);
  return meter;
}

export interface Sample {
  ms: number;
  sqlMs: number;
  statements: number;
  bytes: number;
  rows: number;
}
export function median(values: number[]): number {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
}
export async function measure(meter: Meter, operation: () => Promise<void>): Promise<Sample> {
  const samples: Sample[] = [];
  for (let run = -1; run < 5; run++) {
    await meter.driver.begin();
    meter.reset();
    const start = performance.now();
    try {
      await operation();
      const ms = performance.now() - start;
      if (run >= 0)
        samples.push({
          ms,
          sqlMs: meter.sqlMs,
          statements: meter.statements,
          bytes: meter.boundBytes,
          rows: meter.rewrittenRows,
        });
    } finally {
      await meter.driver.rollback();
    }
  }
  return Object.fromEntries(
    Object.keys(samples[0]).map((key) => [
      key,
      median(samples.map((sample) => sample[key as keyof Sample])),
    ]),
  ) as unknown as Sample;
}
export function cells(sample: Sample): string {
  return `${sample.ms.toFixed(3)} | ${sample.statements}`;
}
export async function report(id: string, content: string): Promise<void> {
  await mkdir('docs/spikes', { recursive: true });
  await writeFile(`docs/spikes/${id}.md`, `${content.trim()}\n`);
  console.log(`Wrote docs/spikes/${id}.md`);
}
export const method = `All numeric measurements are independent medians of five runs after one untimed warm-up. Each operation starts from the same seeded database using rollback outside the timer. Setup, BEGIN/ROLLBACK and assertions are excluded unless stated. Statement counts include the driver's internal last_insert_rowid query. SQL time includes WASM execution, row decoding and async driver overhead. Times are milliseconds; SQL counts are actual executed statements, not affected rows. No forced GC; absolute timings are machine-dependent.`;
