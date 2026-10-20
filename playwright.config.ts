import { defineConfig, devices } from '@playwright/test';

/**
 * The same e2e suite runs against both store implementations (ADR-0011).
 * Select one with `--project=classic` / `--project=sqlite`.
 */
const impls = [
  { name: 'classic', port: 4301 },
  { name: 'sqlite', port: 4302 },
] as const;

const only = process.env['E2E_IMPL'];

export default defineConfig({
  testDir: './projects/harness/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  projects: impls.map(({ name, port }) => ({
    name,
    use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${port}` },
  })),
  webServer: impls
    .filter(({ name }) => !only || only === name)
    .map(({ name, port }) => ({
      command: `npx ng serve harness -c ${name} --port ${port}`,
      url: `http://localhost:${port}`,
      reuseExistingServer: true,
      timeout: 180_000,
    })),
});
