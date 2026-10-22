/** Native platform controls. No injector, store, schema engine or selectors. */
export async function floorBenchmark(): Promise<void> {
  const { CapacitorSQLite: plugin } = await import('@capacitor-community/sqlite');
  const database = 'ngrx-harness';
  const start = performance.now(); // first plugin call through first persisted row
  await plugin.createConnection({ database, version: 1, encrypted: false, mode: 'no-encryption', readonly: false });
  await plugin.open({ database, readonly: false });
  const persisted = await plugin.query({ database, statement: 'SELECT k FROM nss_bench LIMIT 1', values: [], readonly: false });
  const openMs = performance.now() - start;
  if (!persisted.values?.length) throw new Error('F_open requires a populated scratch table');
  await plugin.execute({ database, statements: 'PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS nss_bench(k INTEGER PRIMARY KEY, v TEXT)', transaction: false, readonly: false });
  const pragmas = {
    journalMode: (await plugin.query({ database, statement: 'PRAGMA journal_mode', values: [] })).values,
    synchronous: (await plugin.query({ database, statement: 'PRAGMA synchronous', values: [] })).values,
  };
  if (pragmas.journalMode?.[0]?.['journal_mode'] !== 'wal' || pragmas.synchronous?.[0]?.['synchronous'] !== 1) {
    throw new Error('Native floor connection must match WAL/NORMAL without changing durability');
  }
  const encoder = new TextEncoder();
  const bytes = (value: unknown) => encoder.encode(JSON.stringify(value)).length;
  const options = (set: { statement: string; values: (string | number)[] }[], transaction = false) =>
    ({ database, set, transaction, readonly: false, returnMode: 'no', isSQL92: true });
  const hook = {
    openMs, pragmas,
    async commit(samples = 20) {
      if (samples < 20) throw new Error('F_commit needs at least 20 samples');
      const timings = [];
      for (let i = 0; i < samples; i++) {
        const payload = options([{ statement: 'INSERT OR REPLACE INTO nss_bench(k,v) VALUES (1,?)', values: ['x'.repeat(32)] }], true);
        const began = performance.now();
        await plugin.executeSet(payload);
        timings.push(performance.now() - began);
      }
      return timings;
    },
    async seed(size: number, chunkBytes: number[], samples = 5) {
      if (samples < 5 || !chunkBytes.length) throw new Error('F_seed needs five samples and measured wire chunks');
      // Pad ASCII values, so JSON-encoded plugin option sizes match exactly.
      const total = chunkBytes.reduce((sum, value) => sum + value, 0);
      let nextId = 1;
      const counts = chunkBytes.map((target) => Math.max(1, Math.floor(size * target / total)));
      const largest = chunkBytes.indexOf(Math.max(...chunkBytes));
      counts[largest] += size - counts.reduce((sum, count) => sum + count, 0);
      if (counts[largest] < 1) throw new Error('Too many wire chunks for scratch row count');
      const payloads = chunkBytes.map((target, index) => {
        const count = counts[index];
        const rows: (number | string)[][] = Array.from({ length: count }, () => [nextId++, '']);
        const set = [{ statement: "INSERT INTO nss_bench SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]') FROM json_each(?)", values: [JSON.stringify(rows)] }];
        const payload = options(set);
        const padding = target - bytes(payload);
        if (padding < 0) throw new Error(`Scratch row framing exceeds measured chunk: ${bytes(payload)} > ${target}`);
        rows[rows.length - 1][1] = 'x'.repeat(padding);
        set[0].values[0] = JSON.stringify(rows);
        if (bytes(payload) !== target) throw new Error('F_seed wire size mismatch');
        return payload;
      });
      const timings = [];
      for (let i = 0; i < samples; i++) {
        await plugin.execute({ database, statements: 'DELETE FROM nss_bench', transaction: true });
        const began = performance.now();
        await plugin.beginTransaction({ database });
        for (const payload of payloads) await plugin.executeSet(payload);
        await plugin.commitTransaction({ database });
        timings.push(performance.now() - began);
      }
      return { samples: timings, chunkBytes: payloads.map(bytes), totalBytes: total, rows: size };
    },
  };
  Object.defineProperty(window, '__floor', { configurable: true, value: hook });
  document.body.textContent = 'Platform floor controls';
}
