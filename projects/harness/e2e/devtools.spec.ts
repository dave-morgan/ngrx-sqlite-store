import { expect, test } from '@playwright/test';

test('devtools keeps effects exactly once after commit without reducer warnings', async ({
  page,
}) => {
  const warnings: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  await page.addInitScript(() => {
    const actions: Array<{ type: string; observation?: { totalCount: number } }> = [];
    const monitor = {
      actions,
      receive: (_message: unknown) => {},
    };
    Object.assign(window, {
      __compatMonitor: monitor,
      __REDUX_DEVTOOLS_EXTENSION__: {
        connect: () => ({
          subscribe: (listener: (message: unknown) => void) => {
            monitor.receive = listener;
            queueMicrotask(() => listener({ type: 'START' }));
          },
          unsubscribe: () => {},
          init: () => {},
          error: () => {},
          send: (lifted: { action: (typeof actions)[number] }) => actions.push(lifted.action),
        }),
        send: () => {},
      },
    });
  });
  await page.goto('/todos?seed=120');
  await expect(page.getByTestId('todo-summary')).toContainText('120 total');
  await page.getByTestId('new-title').fill('Devtools exactly once');
  await page.getByTestId('add').click();
  await expect(page.getByTestId('effect-observation')).toContainText('total=121');
  await page.evaluate(async () => {
    const hook = (window as unknown as { __harness: { settle(): Promise<void> } }).__harness;
    await hook.settle();
  });
  const observed = await page.evaluate(() => {
    const monitor = (
      window as unknown as {
        __compatMonitor: { actions: Array<{ type: string; observation?: { totalCount: number } }> };
      }
    ).__compatMonitor;
    return monitor.actions;
  });
  const effects = observed.filter((action) => action.type === '[UI] Effect Observed');
  expect(effects, JSON.stringify(observed)).toHaveLength(1);
  expect(effects[0].observation?.totalCount).toBe(121);
  expect(
    warnings.filter((message) => message.includes('Transaction reducers run through')),
  ).toEqual([]);
});
