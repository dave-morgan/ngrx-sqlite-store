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
  const observations = diagnostic?.samples ?? [diagnostic];
  if (!Array.isArray(observations) || !observations.length || observations.some((row) =>
      !Number.isFinite(row?.beforeSeed) || row.beforeSeed < 0 || !Number.isFinite(row?.afterSeed) || row.afterSeed < 0)) {
    throw new Error('Seed memory controls require finite nonnegative beforeSeed/afterSeed app PSS observations');
  }
  const samples = observations.map((row) => row.afterSeed - row.beforeSeed);
  return { samples, mean: samples.reduce((sum, value) => sum + value, 0) / samples.length,
    justification: `F_seed(${size}) app-process PSS growth before shrink_memory (ADR-0057)` };
}

export function verdict(classic, sqlite, bridge, bound, platform, floor) {
  const excess = sqlite.mean - classic.mean;
  if (excess <= classic.sd) return { status: 'PASS', excess, allowance: classic.sd };
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
    const allowance = classic.sd + Math.max(0, platform.sqlite.mean - platform.classic.mean, seedDelta);
    return { status: excess <= allowance ? 'PLATFORM-BOUND' : 'FAIL', excess, allowance };
  }
  const callMs = bound?.callCost === 'intercept' ? bridge?.interceptMs : bridge?.rttMs;
  if (bridge && bound?.justification && Number.isFinite(callMs) && callMs >= 0 &&
      Number.isFinite(bridge.bytesPerMs) && bridge.bytesPerMs > 0 &&
      Number.isInteger(bound.callsMin) && bound.callsMin >= 0 && Number.isFinite(bound.bytesMin) && bound.bytesMin >= 0) {
    const allowance = classic.sd + bound.callsMin * callMs + bound.bytesMin / bridge.bytesPerMs + sqlite.sd;
    if (excess <= allowance) return { status: 'BRIDGE-BOUND', excess, allowance };
    return { status: 'FAIL', excess, allowance };
  }
  return { status: 'FAIL', excess, allowance: classic.sd };
}

/** ADR-0051: derive floors from raw samples, rejecting undersampled controls. */
export function latencyFloor(results, size, metric) {
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
    return { ms: percentile(control.commit, percentileValue), justification: `F_commit p${percentileValue * 100}; 32-byte atomic scratch insert, same DB WAL/NORMAL` };
  }
  if (metric === 'relaunchReadyMs') return { ms: summarize(control.open).mean, justification: 'F_open mean; fresh process first plugin call through one populated-row read' };
  if (metric === 'firstReadyMs') return { ms: summarize(control.seed.samples).mean + summarize(control.open).mean,
    justification: `F_seed(${size}) mean + F_open mean; ${control.seed.totalBytes} measured seed wire bytes, exact chunks [${chunks.join(', ')}], plain scratch rows in one transaction` };
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
