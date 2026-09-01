import { defineConfig, devices } from '@playwright/test';

const testBuildSha = '0123456789abcdef0123456789abcdef01234567';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium', viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `BUILD_SHA=${testBuildSha} cargo run`,
    url: 'http://127.0.0.1:8080/health',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
