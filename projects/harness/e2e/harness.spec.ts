import { Page, expect, test } from '@playwright/test';

const SEED = 120;

async function boot(page: Page, path = '/todos') {
  await page.goto(`${path}?seed=${SEED}`);
  await expect(page.getByTestId('impl')).toHaveText(test.info().project.name);
}

async function settle(page: Page) {
  await page.evaluate(() => (window as unknown as { __harness: { settle(): Promise<void> } }).__harness.settle());
}

function counts(text: string | null) {
  const m = /(\d+) open · (\d+) total/.exec(text ?? '');
  return { open: Number(m?.[1]), total: Number(m?.[2]) };
}

test.describe('ngrx harness', () => {
  test('boots, seeds deterministically and renders through select + selectSignal', async ({ page }) => {
    await boot(page);
    await expect(page.getByTestId('todo-summary')).toContainText(`${SEED} total`);
    await expect(page.getByTestId('visible-count')).toHaveText(`${SEED} shown`);
    await expect(page.getByTestId('todo-t1')).toContainText('#1');
  });

  test('effects observe post-reducer state via withLatestFrom (ADR-0003)', async ({ page }) => {
    await boot(page);
    const summary = page.getByTestId('todo-summary');
    await expect(summary).toContainText(`${SEED} total`);
    const before = counts(await summary.textContent());

    await page.getByTestId('new-title').fill('Write the e2e suite');
    await page.getByTestId('add').click();
    await expect(page.getByTestId('effect-observation')).toContainText(
      `Todo Added → open=${before.open + 1} total=${before.total + 1}`,
    );

    const t2WasDone = await page.getByTestId('toggle-t2').isChecked();
    await page.getByTestId('toggle-t2').click();
    const expectedOpen = before.open + 1 + (t2WasDone ? 1 : -1);
    await expect(page.getByTestId('effect-observation')).toContainText(`Todo Toggled → open=${expectedOpen}`);
    await expect(summary).toContainText(`${expectedOpen} open`);
  });

  test('filters, search and owner filter compose in derived selectors', async ({ page }) => {
    await boot(page);
    await expect(page.getByTestId('visible-count')).toHaveText(`${SEED} shown`);
    const { open, total } = counts(await page.getByTestId('todo-summary').textContent());

    await page.getByTestId('filter-done').click();
    await expect(page.getByTestId('visible-count')).toHaveText(`${total - open} shown`);
    await page.getByTestId('filter-open').click();
    await expect(page.getByTestId('visible-count')).toHaveText(`${open} shown`);
    await page.getByTestId('filter-all').click();
    // Dispatch is synchronous but state settles asynchronously with the sqlite store:
    // always wait for the expected UI state rather than for "anything changed".
    await expect(page.getByTestId('visible-count')).toHaveText(`${SEED} shown`);

    await page.getByTestId('search').fill('#11');
    const titles = page.getByTestId('todo-list').locator('a.title');
    await expect(titles.filter({ hasNotText: '#11' })).toHaveCount(0);
    await expect(titles.first()).toContainText('#11');
    await page.getByTestId('search').fill('');
    await expect(page.getByTestId('visible-count')).toHaveText(`${SEED} shown`);

    await page.getByTestId('user-filter').selectOption({ index: 1 });
    await expect(page.getByTestId('visible-count')).not.toHaveText(`${SEED} shown`);
  });

  test('remove and clear completed update entity state', async ({ page }) => {
    await boot(page);
    await expect(page.getByTestId('todo-summary')).toContainText(`${SEED} total`);
    await page.getByTestId('remove-t1').click();
    await expect(page.getByTestId('todo-t1')).toHaveCount(0);
    await expect(page.getByTestId('todo-summary')).toContainText(`${SEED - 1} total`);

    const { open } = counts(await page.getByTestId('todo-summary').textContent());
    await page.getByTestId('clear-completed').click();
    await expect(page.getByTestId('todo-summary')).toContainText(`${open} open · ${open} total`);
  });

  test('router-store: route params, navigation actions and effects', async ({ page }) => {
    await boot(page);
    await page.getByTestId('todo-t3').locator('a.title').click();
    await expect(page).toHaveURL(/\/todos\/t3$/);
    await expect(page.getByTestId('detail-id')).toHaveText('t3');
    await expect(page.getByTestId('detail-title')).toContainText('#3');

    await page.getByTestId('rename-input').fill('Renamed via detail page');
    await page.getByTestId('rename').click();
    await expect(page.getByTestId('detail-title')).toHaveText('Renamed via detail page');

    const status = page.getByTestId('detail-status');
    const before = (await status.textContent())!.trim();
    await page.getByTestId('detail-toggle').click();
    await expect(status).not.toHaveText(before);

    await page.getByTestId('nav-diagnostics').click();
    await expect(page.getByTestId('visited')).toContainText('/todos/t3');
    await expect(page.getByTestId('diag-total')).toHaveText(String(SEED));
  });

  test('users are sorted by sortComparer and link to filtered todos', async ({ page }) => {
    await boot(page, '/users');
    const grid = page.getByTestId('user-grid');
    await expect(grid.locator('strong')).toHaveCount(12);
    const names = await grid.locator('strong').allTextContents();
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
    await page.getByTestId('user-u2').click();
    await expect(page).toHaveURL(/\/todos$/);
    await expect(page.getByTestId('user-filter')).toHaveValue(/u2$/);
  });

  test('nested arrays: checklist toggle, note reorder, add and remove', async ({ page }) => {
    await boot(page, '/notes');
    const stats = page.getByTestId('note-stats');
    await expect(stats).toContainText('3 folders · 12 notes');

    const check = page.getByTestId('check-f1n1-0');
    const was = await check.isChecked();
    await check.click();
    await expect(check).toBeChecked({ checked: !was });

    const folder = page.getByTestId('folder-f1');
    await page.getByTestId('down-f1n1').click();
    await expect(folder.locator('article strong').first()).toHaveText('Inbox note 2');
    await expect(folder.locator('article strong').nth(1)).toHaveText('Inbox note 1');

    await page.getByTestId('add-note-f2').click();
    await expect(stats).toContainText('13 notes');
    await page.getByTestId('remove-note-f3n1').click();
    await expect(stats).toContainText('12 notes');
  });

  test('large scalars round-trip (1.5 MB and 3 MB attachments)', async ({ page }) => {
    await boot(page, '/notes');
    await page.getByTestId('attach-1536').click();
    await expect(page.getByTestId('attachment-summary')).toContainText(`${1536 * 1024} chars`);
    await page.getByTestId('attach-3072').click();
    await expect(page.getByTestId('attachment-summary')).toContainText(`${3072 * 1024} chars`);
    await page.getByTestId('attach-clear').click();
    await expect(page.getByTestId('attachment-summary')).toHaveText('none');
  });

  test('theme toggle is reflected by a non-dispatching effect', async ({ page }) => {
    await boot(page);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.getByTestId('theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('state survives a reload only with the sqlite store', async ({ page }) => {
    await boot(page);
    await page.getByTestId('new-title').fill('Persist me');
    await page.getByTestId('add').click();
    await expect(page.getByTestId('todo-summary')).toContainText(`${SEED + 1} total`);
    await settle(page);

    await page.reload();
    const persisted = test.info().project.name === 'sqlite';
    await expect(page.getByTestId('todo-summary')).toContainText(`${persisted ? SEED + 1 : SEED} total`);
    await page.getByTestId('search').fill('Persist me');
    await expect(page.getByTestId('visible-count')).toHaveText(`${persisted ? 1 : 0} shown`);
  });

  test('a fresh start begins at the launch URL, not the last visited route (ADR-0030)', async ({ page }) => {
    await boot(page, '/users');
    await expect(page.getByTestId('user-grid')).toBeVisible();
    await settle(page);
    // Fresh load of a different URL: router-store must not "restore" /users from persisted state.
    await page.goto(`/todos?seed=${SEED}`);
    await expect(page.getByTestId('todo-summary')).toContainText('total');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/todos/);
  });

  test('diagnostics benchmark completes', async ({ page }) => {
    await boot(page, '/diagnostics');
    await page.locator('#runs').fill('50');
    await page.locator('#runs').dispatchEvent('change');
    await page.getByTestId('bench').click();
    await expect(page.getByTestId('bench-result')).toContainText('50');
  });
});
