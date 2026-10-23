/** Native platform controls. No injector, store, schema engine or selectors. */
export async function floorBenchmark(): Promise<void> {
  const { CapacitorSQLite: plugin } = await import('@capacitor-community/sqlite');
  const database = 'ngrx-harness';
  // Native connections outlive a WebView reload (ADR-0046): close any left by a previous
  // page in this process. Untimed — a fresh process has none, so F_open is unaffected.
  await plugin.checkConnectionsConsistency({ dbNames: [], openModes: [] }).catch(() => undefined);
  const start = performance.now(); // first plugin call through first persisted row
  await plugin.createConnection({ database, version: 1, encrypted: false, mode: 'no-encryption', readonly: false });
  await plugin.open({ database, readonly: false });
  const persisted = await plugin.query({ database, statement: 'SELECT k FROM nss_bench LIMIT 1', values: [], readonly: false });
  const openMs = performance.now() - start;
  if (!persisted.values?.length) throw new Error('F_open requires a populated scratch table');
  // `PRAGMA journal_mode=…` returns a row; Android's execute() rejects row-returning
  // statements ("Queries can be performed using … rawQuery only"), so use query().
  await plugin.query({ database, statement: 'PRAGMA journal_mode=WAL', values: [], readonly: false });
  await plugin.execute({ database, statements: 'CREATE TABLE IF NOT EXISTS nss_bench(k INTEGER PRIMARY KEY, v TEXT)', transaction: false, readonly: false });
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
    /**
     * F_commit. `gapMs` paces samples like the workload they bound: the toggle loop waits
     * 20 ms between toggles, so its floor includes the same idle-thread wake-ups (ADR-0066).
     */
    async commit(samples = 20, gapMs = 0) {
      if (samples < 20) throw new Error('F_commit needs at least 20 samples');
      const timings = [];
      for (let i = 0; i < samples; i++) {
        const payload = options([{ statement: 'INSERT OR REPLACE INTO nss_bench(k,v) VALUES (1,?)', values: ['x'.repeat(32)] }], true);
        const began = performance.now();
        await plugin.executeSet(payload);
        timings.push(performance.now() - began);
        if (gapMs) await new Promise((resolve) => setTimeout(resolve, gapMs));
      }
      return timings;
    },
    async seed(size: number, chunkBytes: number[], samples = 5) {
      if (samples < 5 || !chunkBytes.length) throw new Error('F_seed needs five samples and measured wire chunks');
      // Pad ASCII values, so JSON-encoded plugin option sizes match exactly.
      const total = chunkBytes.reduce((sum, value) => sum + value, 0);
      let nextId = 1;
      // Chunks too small to frame even one scratch row (e.g. a version-marker write) are
      // mirrored by a padded no-op write: same call count and wire bytes, zero rows. Their
      // rows go to the other chunks.
      const TINY = 512;
      const counts = chunkBytes.map((target) => (target < TINY ? 0 : Math.max(1, Math.floor(size * target / total))));
      const largest = chunkBytes.indexOf(Math.max(...chunkBytes));
      counts[largest] += size - counts.reduce((sum, count) => sum + count, 0);
      if (counts[largest] < 1) throw new Error('Too many wire chunks for scratch row count');
      const payloads = chunkBytes.map((target, index) => {
        const count = counts[index];
        if (count === 0) {
          const noop = [{ statement: 'DELETE FROM nss_bench WHERE 0', values: [] as (string | number)[] }];
          const payload = options(noop);
          const padding = target - bytes(payload);
          if (padding < 0) throw new Error(`No-op framing exceeds measured chunk: ${bytes(payload)} > ${target}`);
          noop[0].statement += ' '.repeat(padding);
          if (bytes(payload) !== target) throw new Error('F_seed wire size mismatch');
          return payload;
        }
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
        // execute(..., transaction:true) silently applied nothing on Android for writes; use executeSet.
        await plugin.executeSet(options([{ statement: 'DELETE FROM nss_bench', values: [] }], true));
        const began = performance.now();
        await plugin.beginTransaction({ database });
        for (const payload of payloads) await plugin.executeSet(payload);
        await plugin.commitTransaction({ database });
        timings.push(performance.now() - began);
      }
      return { samples: timings, chunkBytes: payloads.map(bytes), totalBytes: total, rows: size };
    },
    /**
     * ADR-0066 F_seed: the store's own persisted entity rows (real JSON, not padding)
     * into the minimal (k INTEGER PRIMARY KEY, v TEXT) table, cheapest JSON1 transport,
     * <=256 KiB executeSet groups, one transaction. WAL auto-checkpoint matches the
     * store's configuration; the checkpoint itself runs untimed after each sample.
     */
    async seedRows(samples = 5) {
      if (samples < 5) throw new Error('F_seed needs five samples');
      const data: string[] = [];
      for (let offset = 0; ; offset += 5000) {
        const page = (await plugin.query({ database, statement:
          "SELECT data FROM nss_entity WHERE data != '' ORDER BY coll, pos LIMIT 5000 OFFSET ?", values: [offset] })).values ?? [];
        for (const row of page) data.push(row['data'] as string);
        if (page.length < 5000) break;
      }
      if (!data.length) throw new Error('F_seed requires the persisted seed rows');
      const statement = "INSERT INTO nss_bench(k,v) SELECT json_extract(value,'$[0]'),value -> '$[1][0]' FROM json_each(?)";
      const payloads: ReturnType<typeof options>[] = [];
      let group: string[] = [];
      let groupBytes = 0;
      const flush = () => {
        payloads.push(options([{ statement, values: [`[${group.join(',')}]`] }]));
        group = [];
        groupBytes = 0;
      };
      data.forEach((json, index) => {
        const item = `[${index + 2},[${json}]]`; // k=1 is the F_open scratch row
        const added = bytes(item);
        if (group.length && groupBytes + added > 256 * 1024) flush();
        group.push(item);
        groupBytes += added;
      });
      if (group.length) flush();
      await plugin.query({ database, statement: 'PRAGMA wal_autocheckpoint=10000', values: [] });
      const timings = [];
      for (let i = 0; i < samples; i++) {
        await plugin.executeSet(options([{ statement: 'DELETE FROM nss_bench WHERE k > 1', values: [] }], true));
        await plugin.query({ database, statement: 'PRAGMA wal_checkpoint(TRUNCATE)', values: [] });
        const began = performance.now();
        await plugin.beginTransaction({ database });
        for (const payload of payloads) await plugin.executeSet(payload);
        await plugin.commitTransaction({ database });
        timings.push(performance.now() - began);
      }
      await plugin.executeSet(options([{ statement: 'DELETE FROM nss_bench WHERE k > 1', values: [] }], true));
      await plugin.query({ database, statement: 'PRAGMA wal_checkpoint(TRUNCATE)', values: [] });
      return { samples: timings, rows: data.length, calls: payloads.length, wireBytes: payloads.reduce((n, p) => n + bytes(p), 0) };
    },
  };
  Object.defineProperty(window, '__floor', { configurable: true, value: hook });
  document.body.textContent = 'Platform floor controls';
}
