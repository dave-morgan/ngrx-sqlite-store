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

export function verdict(classic, sqlite, bridge, bound, platform) {
  const excess = sqlite.mean - classic.mean;
  if (excess <= classic.sd) return { status: 'PASS', excess, allowance: classic.sd };
  if (platform?.justification && [platform.classic, platform.sqlite].every((control) =>
      control && Number.isInteger(control.n) && control.n >= 5 && Number.isFinite(control.mean) &&
      Number.isFinite(control.sd) && control.sd >= 0)) {
    const allowance = classic.sd + Math.max(0, platform.sqlite.mean - platform.classic.mean);
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
