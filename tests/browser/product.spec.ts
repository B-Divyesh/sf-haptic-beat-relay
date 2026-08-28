import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('landing page explains the job and passes an accessibility scan', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await expect(page).toHaveTitle('Haptic Beat Relay — send tactile beat cues');
  await expect(page.locator('h1')).toHaveText('Send every beat to a friend');
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeVisible();
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? ''))).toEqual([]);
  expect(errors).toEqual([]);
});

test('@claim:demo-sandbox sample round starts in one click and reset clears it', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByText('Sam is ready', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start sample round' }).click();
  await expect(page.locator('#tap-count')).not.toHaveText('No returned taps yet.');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#score-value')).toHaveText('86%');
});

test('@claim:local-audio and @claim:no-third-party uploaded audio stays in the host browser', async ({ page }) => {
  const requests: Array<{ url: string; method: string; body: string | null }> = [];
  page.on('request', (request) => requests.push({ url: request.url(), method: request.method(), body: request.postData() }));
  await page.goto('/host');
  await expect(page.locator('#room-code')).not.toHaveText('······');
  await page.locator('#audio-loop').setInputFiles({
    name: 'practice-loop.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from('private-audio-marker'),
  });
  await expect(page.locator('#file-name')).toContainText('stays on this device');
  expect(requests.some((request) => request.body?.includes('private-audio-marker'))).toBe(false);
  expect(requests.every((request) => new URL(request.url).origin === 'http://127.0.0.1:8080')).toBe(true);
});

test('@claim:ephemeral-rooms room creation reports its memory lifetime', async ({ request }) => {
  const response = await request.post('/api/rooms', { headers: { 'X-Forwarded-For': '203.0.113.33' } });
  expect(response.ok()).toBe(true);
  const room = await response.json() as { code: string; expires_in_seconds: number };
  expect(room.code).toMatch(/^[A-Z0-9]{6}$/);
  expect(room.expires_in_seconds).toBe(7200);
});

test('@claim:rate-limit API bursts return 429 and Retry-After', async ({ request }, testInfo) => {
  const client = testInfo.project.name === 'mobile' ? '203.0.113.41' : '203.0.113.40';
  const responses = await Promise.all(Array.from({ length: 45 }, () => request.post('/api/rooms', {
    headers: { 'X-Forwarded-For': client },
  })));
  const limited = responses.find((response) => response.status() === 429);
  expect(limited).toBeDefined();
  expect(limited?.headers()['retry-after']).toBe('1');
});

test('@claim:health health endpoint returns the build identity', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ status: 'ok', build_sha: expect.any(String) });
});

test('@claim:connection-required the real relay explains an offline failure', async ({ page, context }) => {
  await page.goto('/');
  await context.setOffline(true);
  await page.getByRole('link', { name: 'Create a real room' }).click();
  await expect(page.locator('#host-error')).toContainText('reload this page');
});

test('@claim:no-account and @claim:free-use host flow has no sign-in or payment gate', async ({ page }) => {
  await page.goto('/host');
  await expect(page.locator('#room-code')).not.toHaveText('······');
  await expect(page.getByText('Sign in')).toHaveCount(0);
  await expect(page.locator('a[href*="pay"], a[href*="checkout"], button:has-text("Buy")')).toHaveCount(0);
});

test('@claim:shared-score a companion joins, receives a cue, and returns a scored tap', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const companionContext = await browser.newContext();
  const host = await hostContext.newPage();
  const companion = await companionContext.newPage();
  await host.goto('/host');
  const code = await host.locator('#room-code').textContent();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);

  await companion.goto(`/join/${code}`);
  await expect(companion.locator('#connection-state')).toContainText(`Connected to room ${code}`);
  await expect(host.getByRole('button', { name: 'Start 60-second round' })).toBeEnabled();
  await host.getByRole('button', { name: 'Start 60-second round' }).click();
  await expect(companion.getByRole('button', { name: /Tap the beat/ })).toBeEnabled();
  await companion.getByRole('button', { name: /Tap the beat/ }).click();
  await expect(companion.locator('#tap-pad')).toHaveClass(/cue/);
  await expect(host.locator('#tap-count')).toHaveText('1 returned tap.');
  await expect(host.locator('#score-value')).toHaveAttribute('data-taps', '1');
  await expect(companion.locator('#score-value')).toHaveText(await host.locator('#score-value').textContent() ?? '0%');
  await hostContext.close();
  await companionContext.close();
});

test('real routes have one heading, useful titles, and no mobile overflow', async ({ page }, testInfo) => {
  for (const route of ['/', '/demo', '/host', '/join', '/privacy', '/terms', '/404', '/missing-page']) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page).not.toHaveTitle(/^Haptic Beat Relay$/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${route} overflow in ${testInfo.project.name}`).toBeLessThanOrEqual(1);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(
      accessibility.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? '')),
      `${route} accessibility in ${testInfo.project.name}`,
    ).toEqual([]);
  }
});
