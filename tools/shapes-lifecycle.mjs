/** Bound CDP evaluations as Playwright's action timeout does not cover evaluate().
 * A timeout aborts the trial; its finally block closes the browser. Never retry it.
 */
export async function boundedShapesStep(label, operation, timeoutMs = 120_000) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs} ms`)), timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
}

export function settleShapes(page, label = 'store settle', timeoutMs = 120_000) {
  return boundedShapesStep(label, () => page.evaluate(() => window.__harness.settle()), timeoutMs);
}

/** Finish initial startup before replacing its document and native transaction context. */
export async function waitForHarnessReady(page, timeoutMs = 120_000) {
  await page.waitForFunction(() => !!window.__harness, null, { timeout: timeoutMs });
  await settleShapes(page, 'startup settle', timeoutMs);
}

/** Reject incomplete/duplicated paired trials before calculating acceptance. */
export function assertCompleteShapes(rows, trials, keys) {
  if (rows.length !== trials * 2) throw new Error(`Incomplete shapes run: ${rows.length}/${trials * 2} trials`);
  const seen = new Set();
  for (const row of rows) {
    const id = `${row.impl}/${row.trial}`;
    if (!['classic', 'sqlite'].includes(row.impl) || !Number.isInteger(row.trial) || row.trial < 1 || row.trial > trials || seen.has(id))
      throw new Error(`Invalid or duplicate shapes trial: ${id}`);
    seen.add(id);
    if (keys.some(key => !row.flat?.[key]) || !Object.keys(row.workflow ?? {}).length)
      throw new Error(`Incomplete shapes workload: ${id}`);
  }
}

/** Match both implementations' background dataset before timed shapes actions. */
export async function prepareShapesDocument(page, keys, timeoutMs = 120_000) {
  await waitForHarnessReady(page, timeoutMs);
  await boundedShapesStep('background seed', () => page.evaluate(async (n) => {
    localStorage.setItem('harness:flatKeys', String(n));
    localStorage.setItem('harness:seed', '50');
    await window.__harness.benchSeed(50);
  }, keys), timeoutMs);
}

/** Run alternating paired trials and export completed rows even on failure. */
export async function runPairedShapes(trials, runTrial, rows, checkpoint) {
  try {
    for (let trial = 1; trial <= trials; trial++) {
      for (const impl of trial % 2 ? ['classic', 'sqlite'] : ['sqlite', 'classic']) {
        rows.push(await runTrial(impl, trial));
      }
    }
  } finally { await checkpoint(rows); }
}
