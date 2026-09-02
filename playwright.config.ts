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
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium', viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    // `npm run test:browser` builds this binary before Playwright starts its
    // web-server timer. Keep compilation outside that timer: a clean Rust
    // target can take longer than Playwright's startup allowance in CI.
    command: `BUILD_SHA=${testBuildSha} ./target/debug/haptic-beat-relay`,
    url: 'http://127.0.0.1:8080/health',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
