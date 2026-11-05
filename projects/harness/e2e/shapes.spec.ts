import { Page, expect, test } from '@playwright/test';

// Phase 16 workloads: flat object + hybrid workflow. Same assertions for both implementations.
type Shapes = Record<string, (...args: unknown[]) => Promise<unknown>>;
const shapes = (page: Page, method: string, ...args: unknown[]) =>
  page.evaluate(([m, a]) => (window as unknown as { __shapes: Shapes }).__shapes[m as string](...(a as unknown[])), [method, args] as const);

async function open(page: Page, path: string, keys = 500) {
  await page.goto('/todos?seed=50');
  await page.evaluate((k) => localStorage.setItem('harness:flatKeys', String(k)), keys);
  await page.goto(`${path}?seed=50`);
  await expect(page.getByTestId('impl')).toHaveText(test.info().project.name);
  // The bench hook is installed by the lazy shapes routes.
  await page.waitForFunction(() => !!(window as unknown as { __shapes?: unknown }).__shapes);
}

test.describe('phase 16 shapes', () => {
  test('flat object: single key, ten keys, replace and burst', async ({ page }) => {
    await open(page, '/shapes/flat', 500);
    await expect(page.getByTestId('flat-count')).toHaveText('500 keys');
    const one = (await shapes(page, 'flatSetKey', 3)) as { emit: number }[];
    expect(one).toHaveLength(3);
    await shapes(page, 'flatSetKeys', 2);
    await shapes(page, 'flatReplace', 2);
    await expect(page.getByTestId('flat-count')).toHaveText('500 keys');
    const burst = (await shapes(page, 'flatBurst', 30, 1)) as { dispatched: number; observed: number };
    expect(burst.dispatched).toBe(30);
    expect(burst.observed).toBeGreaterThan(0);
    await expect(page.getByTestId('flat-target')).toContainText('burst-');
  });

  test('workflow: nested edits to depth 10, load cycle, steps, reset, events', async ({ page }) => {
    await open(page, '/shapes/workflow');
    for (const depth of ['d1', 'd4', 'd10']) await shapes(page, 'wfEdit', depth, 2);
    await expect(page.getByTestId('wf-d10')).toContainText('d10-');
    await shapes(page, 'wfLoad', 2);
    await expect(page.getByTestId('wf-status')).toHaveText('ready');
    await shapes(page, 'wfStep', 3);
    await shapes(page, 'wfReset', 1);
    await expect(page.getByTestId('wf-d1')).toHaveText('Ada Lovelace');
    const before = Number(await page.getByTestId('wf-events').textContent());
    await shapes(page, 'wfAppend', 2, 100);
    await expect(page.getByTestId('wf-events')).toHaveText(String(before + 200));
  });
});
