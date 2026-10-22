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

export function verdict(classic, sqlite, bridge, bound) {
  const excess = sqlite.mean - classic.mean;
  if (excess <= classic.sd) return { status: 'PASS', excess, allowance: classic.sd };
  if (bridge && bound?.justification && Number.isFinite(bridge.rttMs) && bridge.rttMs >= 0 &&
      Number.isFinite(bridge.bytesPerMs) && bridge.bytesPerMs > 0 &&
      Number.isInteger(bound.callsMin) && bound.callsMin >= 0 && Number.isFinite(bound.bytesMin) && bound.bytesMin >= 0) {
    const allowance = classic.sd + bound.callsMin * bridge.rttMs + bound.bytesMin / bridge.bytesPerMs + sqlite.sd;
    if (excess <= allowance) return { status: 'BRIDGE-BOUND', excess, allowance };
    return { status: 'FAIL', excess, allowance };
  }
  return { status: 'FAIL', excess, allowance: classic.sd };
}
