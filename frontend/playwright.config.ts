import { defineConfig, devices } from '@playwright/test';

const frontendPort = 9527;
const backendPort = 8080;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 120_000,
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: [
    {
      command:
        "powershell -Command \"$env:PYTHONPATH='.'; alembic upgrade head; python scripts/seed_rbac_data.py; python -m uvicorn app.main:app --host 127.0.0.1 --port 8080\"",
      cwd: '../backend',
      reuseExistingServer: true,
      timeout: 180_000,
      url: `http://127.0.0.1:${backendPort}/health`
    },
    {
      command: 'pnpm exec vite --mode test --host 127.0.0.1 --port 9527 --open false',
      cwd: '.',
      reuseExistingServer: true,
      timeout: 180_000,
      url: `http://127.0.0.1:${frontendPort}`
    }
  ]
});
