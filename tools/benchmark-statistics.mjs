/** ADR-0038 statistics; retain full precision until rendering. */
export function summarize(values) {
  if (values.length < 2 || values.some((value) => !Number.isFinite(value))) {
    throw new Error('At least two finite independent trial values are required');
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sd = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
  return { n: values.length, mean, sd };
}

export function trialOrder(impls, trials) {
  return Array.from({ length: trials }, (_, index) =>
    (index % 2 ? [...impls].reverse() : impls).map((impl) => ({ trial: index + 1, impl })),
  ).flat();
}

/** Pair real stores in separate APKs; native-only controls vary mode in each APK. */
export function emptyControlPlan(store, trials) {
  if (!Number.isInteger(trials) || trials < 2) throw new Error('At least two empty-control trials required');
  return store
    ? trialOrder(['classic', 'sqlite'], trials).map(({ impl, trial }) => ({ apk: impl, pairs: [{ impl, trial }] }))
    : ['classic', 'sqlite'].map((apk) => ({ apk, pairs: trialOrder(['classic', 'sqlite'], trials) }));
}

/** Recompute native-only controls from raw paired trials, never supplied means. */
export function platformBaseline(results, metric) {
  const groups = ['classic', 'sqlite'].map((mode) => results.filter((row) => row.apk === 'classic' && row.mode === mode));
  const ids = groups.map((rows) => rows.map((row) => row.trial).sort((a, b) => a - b));
  if (ids.some((values) => values.length < 5 || new Set(values).size !== values.length ||
      values.some((value) => !Number.isInteger(value) || value < 1)) ||
      JSON.stringify(ids[0]) !== JSON.stringify(ids[1])) {
    throw new Error('At least five unique independent paired empty controls are required');
  }
  return Object.fromEntries(groups.map((rows, index) => [index ? 'sqlite' : 'classic', summarize(rows.map((row) => row[metric]))]));
}

/** ADR-0057: raw app-process PSS growth before shrink, scoped to post-seed PSS. */
export function seedMemoryFloor(results, size, metric) {
  if (metric !== 'pssTotalMb') return undefined;
  const matching = results.filter((row) => row.size === size);
  if (matching.length > 1) throw new Error(`Duplicate seed memory controls for ${size}`);
  if (!matching.length) throw new Error(`Missing seed memory controls for ${size}`);
  const diagnostic = matching[0].memoryDiagnostic;
  // ADR-0087: independent real-row brackets (fresh process each); mean growth.
  const once = diagnostic?.onceSamples;
  if (Array.isArray(once) && once.length >= 3 && once.every((row) =>
      Number.isFinite(row?.beforeOnce) && Number.isFinite(row?.afterOnce) && row.beforeOnce >= 0 && row.afterOnce >= 0)) {
    const samples = once.map((row) => row.afterOnce - row.beforeOnce);
    return { samples, mean: samples.reduce((sum, value) => sum + value, 0) / samples.length,
      justification: `F_seed(${size}) one real-row transfer then android-bench's pre-PSS V8 GCs: mean app-process PSS growth over ${samples.length} fresh-process brackets (ADR-0057/0070/0087)` };
  }
  // ADR-0070: the single real-row seed with android-bench's pre-PSS steps matches the store.
  if (Number.isFinite(diagnostic?.beforeOnce) && Number.isFinite(diagnostic?.afterOnce) &&
      diagnostic.beforeOnce >= 0 && diagnostic.afterOnce >= 0) {
    const samples = [diagnostic.afterOnce - diagnostic.beforeOnce];
    return { samples, mean: samples[0],
      justification: `F_seed(${size}) one real-row transfer then android-bench's pre-PSS V8 GCs: app-process PSS growth (ADR-0057/0070)` };
  }
  // ADR-0069: prefer the real-row seed bracket (ADR-0066 rows, bridge garbage included).
  if (Number.isFinite(diagnostic?.beforeRows) && Number.isFinite(diagnostic?.afterRows) &&
      diagnostic.beforeRows >= 0 && diagnostic.afterRows >= 0) {
    const samples = [diagnostic.afterRows - diagnostic.beforeRows];
    return { samples, mean: samples[0],
      justification: `F_seed(${size}) real-row (ADR-0066) app-process PSS growth before shrink_memory (ADR-0057/0069)` };
  }
  const observations = diagnostic?.samples ?? [diagnostic];
  if (!Array.isArray(observations) || !observations.length || observations.some((row) =>
      !Number.isFinite(row?.beforeSeed) || row.beforeSeed < 0 || !Number.isFinite(row?.afterSeed) || row.afterSeed < 0)) {
    throw new Error('Seed memory controls require finite nonnegative beforeSeed/afterSeed app PSS observations');
  }
  const samples = observations.map((row) => row.afterSeed - row.beforeSeed);
  return { samples, mean: samples.reduce((sum, value) => sum + value, 0) / samples.length,
    justification: `F_seed(${size}) app-process PSS growth before shrink_memory (ADR-0057)` };
}

/** ADR-0062: real Angular stores in their respective workload APKs, zero features/data. */
export function codeBaseline(results) {
  const rows = results.filter((row) => row.kind === 'empty-store' && row.apk === row.mode);
  if (rows.some((row) => !Number.isFinite(row.heapMb) || row.heapMb < 0))
    throw new Error('Empty-store heap controls must be finite and nonnegative');
  return platformBaseline(rows.map((row) => ({ ...row, apk: 'classic' })), 'heapMb');
}

const HEAP_POINTS = { heapTodosMb: 'todos', heapNotesMb: 'notes', heapRelaunchMb: 'relaunch' };

/**
 * ADR-0067: same-session paired snapshots of the same workload point, split into V8 code
 * space and data. Returns code means (the allowance input) and data means (the condition).
 */
export function workloadCodeBaseline(results, size, metric) {
  const point = HEAP_POINTS[metric];
  if (!point) return undefined;
  const rows = results.filter((row) => row.kind === 'workload-code' && row.size === size && row.point === point);
  if (!rows.length) return undefined;
  const group = (impl) => rows.filter((row) => row.impl === impl);
  const ids = ['classic', 'sqlite'].map((impl) => group(impl).map((row) => row.trial).sort((a, b) => a - b));
  if (ids.some((values) => values.length < 5 || new Set(values).size !== values.length) ||
      JSON.stringify(ids[0]) !== JSON.stringify(ids[1]) ||
      rows.some((row) => ![row.codeMb, row.dataMb].every((value) => Number.isFinite(value) && value >= 0)))
    throw new Error('Workload code controls require five unique paired finite trials per point (ADR-0067)');
  const summary = (key) => ({ classic: summarize(group('classic').map((row) => row[key])), sqlite: summarize(group('sqlite').map((row) => row[key])) });
  const code = summary('codeMb');
  return { ...code, data: summary('dataMb'), point };
}

export function verdict(classic, sqlite, bridge, bound, platform, floor, code) {
  const excess = sqlite.mean - classic.mean;
  let codeAllowance = 0;
  if (excess <= classic.sd) return { status: 'PASS', excess, allowance: classic.sd };
  if (/^heap\w*Mb$/.test(code?.metric) && code.justification && [code.classic, code.sqlite].every((control) =>
      control && Number.isInteger(control.n) && control.n >= 5 && Number.isFinite(control.mean) &&
      Number.isFinite(control.sd) && control.sd >= 0)) {
    const allowance = classic.sd + Math.max(0, code.sqlite.mean - code.classic.mean);
    codeAllowance = allowance;
    // ADR-0067: workload code controls only cover code; store data must be at parity.
    const dataParity = !code.data || code.data.sqlite.mean <= code.data.classic.mean + code.data.classic.sd;
    if (dataParity && excess <= allowance) return { status: 'CODE-BOUND', excess, allowance };
  }
  if (floor?.justification && Number.isFinite(floor.ms) && floor.ms >= 0) {
    const allowance = classic.sd + floor.ms + sqlite.sd;
    return { status: excess <= allowance ? 'PLATFORM-BOUND' : 'FAIL', excess, allowance };
  }
  if (platform?.justification && [platform.classic, platform.sqlite].every((control) =>
      control && Number.isInteger(control.n) && control.n >= 5 && Number.isFinite(control.mean) &&
      Number.isFinite(control.sd) && control.sd >= 0)) {
    const seed = platform.seed;
    const seedDelta = seed?.justification && Array.isArray(seed.samples) && seed.samples.length &&
      seed.samples.every(Number.isFinite) && Number.isFinite(seed.mean)
      ? seed.samples.reduce((sum, value) => sum + value, 0) / seed.samples.length : 0;
    // ADR-0070: the plugin baseline and the seed-transfer increment are additive; the seed
    // bracket starts with the plugin already loaded.
    const allowance = classic.sd + Math.max(0, platform.sqlite.mean - platform.classic.mean) + Math.max(0, seedDelta);
    if (excess <= allowance) return { status: 'PLATFORM-BOUND', excess, allowance };
    return { status: 'FAIL', excess, allowance: Math.max(allowance, codeAllowance) };
  }
  const callMs = bound?.callCost === 'intercept' ? bridge?.interceptMs : bridge?.rttMs;
  if (bridge && bound?.justification && Number.isFinite(callMs) && callMs >= 0 &&
      Number.isFinite(bridge.bytesPerMs) && bridge.bytesPerMs > 0 &&
      Number.isInteger(bound.callsMin) && bound.callsMin >= 0 && Number.isFinite(bound.bytesMin) && bound.bytesMin >= 0) {
    const allowance = classic.sd + bound.callsMin * callMs + bound.bytesMin / bridge.bytesPerMs + sqlite.sd;
    if (excess <= allowance) return { status: 'BRIDGE-BOUND', excess, allowance };
    return { status: 'FAIL', excess, allowance };
  }
  return { status: 'FAIL', excess, allowance: Math.max(classic.sd, codeAllowance) };
}

/** ADR-0051: derive floors from raw samples, rejecting undersampled controls. */
export function latencyFloor(results, size, metric, render) {
  const matching = results.filter((row) => row.size === size);
  if (matching.length > 1) throw new Error(`Duplicate floor controls for ${size}`);
  const control = matching[0];
  if (!control) throw new Error(`Missing floor controls for ${size}`);
  const valid = (values, count) => Array.isArray(values) && values.length >= count && values.every((value) => Number.isFinite(value) && value >= 0);
  if (!valid(control.commit, 20) || !valid(control.seed?.samples, 5) || !valid(control.open, 5)) throw new Error('Floors require 20 commit and five seed/open finite samples');
  const chunks = control.seed.chunkBytes;
  if (!Array.isArray(chunks) || !chunks.length || chunks.some((value) => !Number.isInteger(value) || value <= 0) ||
      control.seed.totalBytes !== chunks.reduce((sum, value) => sum + value, 0) || control.seed.rows !== size ||
      JSON.stringify(chunks) !== JSON.stringify(control.seedTrace?.map((row) => row.bytes))) throw new Error('Seed floor must match actual seed wire chunks and row count');
  if (control.database !== 'ngrx-harness' || control.pragmas?.journalMode?.[0]?.journal_mode !== 'wal' ||
      control.pragmas?.synchronous?.[0]?.synchronous !== 1) throw new Error('Floors require the harness database with WAL/NORMAL');
  const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))];
  if (/^(emit|toggle)P(50|95)$/.test(metric)) {
    const percentileValue = metric.endsWith('50') ? 0.5 : 0.95;
    if (metric.startsWith('toggle') && render) {
      // ADR-0069: one raw atomic commit issued 20 ms after a real classic toggle's DOM change,
      // i.e. during the same WebView repaint the store's next commit meets (no store code).
      const rows = render.filter((row) => row.kind === 'render-commit' && row.size === size);
      const single = rows.flatMap((row) => row.samples);
      if (rows.length < 3 || !valid(single, 90) || rows.some(row => !valid(row.samples, 30)))
        throw new Error('Toggle render floors require three trials of 30 samples (ADR-0069)');
      if (rows.some(row => !Number.isInteger(row.trial) || row.trial < 1) ||
          new Set(rows.map(row => row.trial)).size !== rows.length)
        throw new Error('Toggle render floors require independent trials (ADR-0069)');
      // ADR-0084 (user decision, amends ADR-0071): the workload persists the toggle's effect
      // action too; its commit and its own repaint precede the next toggle's commit
      // (ADR-0023), and Capacitor routes both round trips through the repainting Android
      // main thread (ADR-0083 perfetto evidence). The store-free pair series is the floor.
      const pairs = rows.flatMap((row) => row.pairSamples ?? []);
      if (rows.every((row) => valid(row.pairSamples, 30)))
        return { ms: percentile(pairs, percentileValue), justification: `F_commit_render_pair p${percentileValue * 100}: raw effect commit + its repaint, then the next raw commit 20 ms after a classic toggle's DOM change (${pairs.length} samples, ${rows.length} trials, classic APK, no store; ADR-0084); single-commit p${percentileValue * 100} ${percentile(single, percentileValue).toFixed(1)} ms` };
      return { ms: percentile(single, percentileValue), justification: `F_commit_render p${percentileValue * 100}: raw atomic commit 20 ms after a classic toggle's DOM change (${single.length} samples, ${rows.length} trials, classic APK, no store; ADR-0069); paced p${percentileValue * 100} ${percentile(control.commitPaced ?? control.commit, percentileValue).toFixed(1)} ms` };
    }
    if (metric.startsWith('toggle')) {
      // ADR-0066: toggles are paced 20 ms apart; their floor is paced the same way.
      if (!valid(control.commitPaced, 30)) throw new Error('Toggle floors require 30 paced F_commit samples (ADR-0066)');
      return { ms: percentile(control.commitPaced, percentileValue), justification: `F_commit paced 20 ms like the toggle loop, p${percentileValue * 100}; 32-byte atomic scratch insert, same DB WAL/NORMAL; unpaced p${percentileValue * 100} ${percentile(control.commit, percentileValue).toFixed(1)} ms` };
    }
    return { ms: percentile(control.commit, percentileValue), justification: `F_commit p${percentileValue * 100}; 32-byte atomic scratch insert back-to-back like the emission loop, same DB WAL/NORMAL` };
  }
  if (metric === 'relaunchReadyMs') return { ms: summarize(control.open).mean, justification: 'F_open mean; fresh process first plugin call through one populated-row read' };
  if (metric === 'firstReadyMs') {
    // ADR-0066: F_seed writes the store's own persisted rows; the padded-byte control
    // (ADR-0051) understated per-row JSON work and remains reported, not used.
    const rows = control.seedRows;
    if (!valid(rows?.samples, 5) || !Number.isInteger(rows.rows) || rows.rows < size || !(rows.wireBytes > 0))
      throw new Error('firstReadyMs floor requires ADR-0066 seedRows with five samples of at least size real rows');
    return { ms: summarize(rows.samples).mean + summarize(control.open).mean,
      justification: `F_seed(${size}) mean + F_open mean; ${rows.rows} persisted entity rows (${rows.wireBytes} wire bytes, ${rows.calls} calls) into (k INTEGER PRIMARY KEY, v TEXT), one transaction (ADR-0066); padded-byte control mean ${summarize(control.seed.samples).mean.toFixed(1)} ms over chunks [${chunks.join(', ')}]` };
  }
  return undefined;
}

/** Reject controls from another build/device/session; never trust absent hashes. */
export function validateControlProvenance(control, benchmark, label = 'Floor') {
  const keys = ['session', 'date', 'device', 'sdkLevel', 'webview'];
  if (keys.some((key) => typeof control?.[key] !== 'string' || !control[key].length || control[key] !== benchmark[key]) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(control.date) ||
      ['classic', 'sqlite'].some((impl) => !/^[a-f0-9]{64}$/.test(control.apkHashes?.[impl] ?? '') ||
        control.apkHashes[impl] !== benchmark.apkHashes?.[impl])) {
    throw new Error(`${label} controls must match benchmark session, device, WebView, date and APK hashes`);
  }
}
