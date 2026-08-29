import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// The product keys limits by the first forwarded client address. Give each
// browser test a stable, separate identity so a claim's intentional 45-request
// burst cannot spend the allowance used by an unrelated test or viewport.
let browserTestIdentity = 1;
test.beforeEach(async ({ context }, testInfo) => {
  const subnet = testInfo.project.name === 'mobile' ? 82 : 81;
  await context.setExtraHTTPHeaders({
    'X-Forwarded-For': `198.18.${subnet}.${browserTestIdentity++}`,
  });
});

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

test('regression: the audience and sample action fit in the first viewport', async ({ page }) => {
  await page.goto('/');
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  for (const locator of [
    page.locator('h1'),
    page.locator('.hero-copy .lede'),
    page.getByRole('link', { name: 'Try it with sample data' }),
  ]) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y, await locator.innerText()).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height, await locator.innerText()).toBeLessThanOrEqual(viewport!.height);
  }
});

test('keyboard users can skip navigation, change routes, and recover from form errors', async ({ page }) => {
  await page.goto('/join');
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toHaveCSS('outline-width', '3px');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/join#main$/);

  await page.goto('/');
  const demoLink = page.getByRole('link', { name: 'Try it with sample data' });
  await demoLink.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();

  await page.goto('/join');
  await page.locator('#join-code').fill('A2');
  await page.locator('#join-code').press('Enter');
  await expect(page.locator('#join-error')).toHaveText('The code needs six letters and numbers. Check it and try again.');
  await expect(page.locator('#join-code')).toBeFocused();
});

test('@claim:demo-sandbox @claim:sample-duration sample round starts in one click, stays private, and ends after 12 seconds', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByText('Sam is ready', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start sample round' }).click();
  await expect(page.locator('#tap-count')).not.toHaveText('No returned taps yet.');
  await expect(page.getByRole('button', { name: 'Sample round in progress' })).toBeDisabled();
  await page.waitForTimeout(11_000);
  await expect(page.getByRole('button', { name: 'Sample round in progress' })).toBeDisabled();
  await page.waitForTimeout(1_100);
  await expect(page.locator('#round-state')).toContainText('Sample round complete');
  await expect(page.getByRole('button', { name: 'Run the sample again' })).toBeEnabled();
  expect(requests.every((url) => !new URL(url).pathname.startsWith('/api/'))).toBe(true);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
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

test('room creation reports its memory lifetime', async ({ request }) => {
  const response = await request.post('/api/rooms', { headers: { 'X-Forwarded-For': '203.0.113.33' } });
  expect(response.ok()).toBe(true);
  const room = await response.json() as { code: string; expires_in_seconds: number };
  expect(room.code).toMatch(/^[A-Z0-9]{6}$/);
  expect(room.expires_in_seconds).toBe(7200);
});

test('local API bursts enforce exactly 40 requests and return Retry-After', async ({ request }, testInfo) => {
  const client = testInfo.project.name === 'mobile' ? '203.0.113.41' : '203.0.113.40';
  const responses = await Promise.all(Array.from({ length: 45 }, () => request.post('/api/rooms', {
    headers: { 'X-Forwarded-For': client },
  })));
  expect(responses.filter((response) => response.status() === 200)).toHaveLength(40);
  const limited = responses.filter((response) => response.status() === 429);
  expect(limited).toHaveLength(5);
  expect(limited.every((response) => response.headers()['retry-after'] === '1')).toBe(true);
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

test('@claim:shared-score @claim:visual-cue a companion joins, flashes each cue, and returns a scored tap', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const companionContext = await browser.newContext();
  await companionContext.addInitScript(() => {
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: undefined });
  });
  const host = await hostContext.newPage();
  const companion = await companionContext.newPage();
  await host.goto('/host');
  const code = await host.locator('#room-code').textContent();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);

  await companion.goto(`/join/${code}`);
  await expect(companion.locator('#connection-state')).toContainText(`Connected to room ${code}`);
  await expect(host.getByRole('button', { name: 'Start 60-second round' })).toBeEnabled();
  await host.locator('#bpm').fill('180');
  await host.getByRole('button', { name: 'Start 60-second round' }).click();
  await expect(companion.getByRole('button', { name: /Tap the beat/ })).toBeEnabled();
  await expect(companion.locator('#tap-pad')).toHaveClass(/cue/);
  await expect(companion.locator('#tap-pad')).toHaveCSS('animation-name', 'cue');
  await companion.getByRole('button', { name: /Tap the beat/ }).click();
  await expect(host.locator('#tap-count')).toHaveText('1 returned tap.');
  await expect(host.locator('#score-value')).toHaveAttribute('data-taps', '1');
  await expect(companion.locator('#score-value')).toHaveText(await host.locator('#score-value').textContent() ?? '0%');
  await hostContext.close();
  await companionContext.close();
});

test('@claim:haptic-output a supported phone and controller receive each companion cue', async ({ browser }) => {
  const hostContext = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-For': '198.18.85.45' },
  });
  const companionContext = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-For': '198.18.86.45' },
  });
  await companionContext.addInitScript(() => {
    const calls = {
      phone: [] as number[],
      controller: [] as Array<{ type: string; duration: number; strongMagnitude: number; weakMagnitude: number }>,
    };
    Object.defineProperty(window, '__hapticCalls', { configurable: true, value: calls });
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (duration: number) => {
        calls.phone.push(duration);
        return true;
      },
    });
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () => [{
        vibrationActuator: {
          playEffect: (type: string, parameters: { duration: number; strongMagnitude: number; weakMagnitude: number }) => {
            calls.controller.push({ type, ...parameters });
            return Promise.resolve('complete');
          },
        },
      }],
    });
  });

  const host = await hostContext.newPage();
  const companion = await companionContext.newPage();
  await host.goto('/host');
  const code = await host.locator('#room-code').textContent();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  await companion.goto(`/join/${code}`);
  await expect(companion.locator('#connection-state')).toContainText(`Connected to room ${code}`);

  await host.locator('#bpm').fill('180');
  await host.getByRole('button', { name: 'Start 60-second round' }).click();
  await expect.poll(() => companion.evaluate(() => {
    const calls = (window as unknown as { __hapticCalls: { phone: number[] } }).__hapticCalls;
    return calls.phone;
  })).toContain(45);
  await expect.poll(() => companion.evaluate(() => {
    const calls = (window as unknown as {
      __hapticCalls: {
        controller: Array<{ type: string; duration: number; strongMagnitude: number; weakMagnitude: number }>;
      };
    }).__hapticCalls;
    return calls.controller;
  })).toContainEqual({
    type: 'dual-rumble',
    duration: 60,
    strongMagnitude: 0.7,
    weakMagnitude: 0.4,
  });

  await hostContext.close();
  await companionContext.close();
});

test('@claim:real-round-duration a real round completes after 60 seconds', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One measured browser run proves the shared 60-second timer.');
  test.setTimeout(80_000);
  const hostContext = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-For': '198.18.83.60' },
  });
  const companionContext = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-For': '198.18.84.60' },
  });
  const host = await hostContext.newPage();
  const companion = await companionContext.newPage();

  await host.goto('/host');
  const code = await host.locator('#room-code').textContent();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  await companion.goto(`/join/${code}`);
  await expect(companion.locator('#connection-state')).toContainText(`Connected to room ${code}`);

  const start = host.getByRole('button', { name: 'Start 60-second round' });
  await expect(start).toBeEnabled();
  const startedAt = Date.now();
  await start.click();
  await host.waitForTimeout(59_000);
  await expect(host.getByRole('button', { name: 'Round in progress' })).toBeDisabled();
  await expect(host.locator('#round-state')).not.toContainText('Round complete');
  await expect(host.getByRole('button', { name: 'Start another 60-second round' })).toBeEnabled({ timeout: 3_000 });
  const elapsed = Date.now() - startedAt;
  expect(elapsed).toBeGreaterThanOrEqual(59_500);
  expect(elapsed).toBeLessThan(63_000);
  await expect(companion.locator('#round-state')).toContainText('Round complete');

  await hostContext.close();
  await companionContext.close();
});

test('regression: repeated independent host and companion connections always create, join, and complete a round', async ({ browser }) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const hostContext = await browser.newContext();
    const companionContext = await browser.newContext();
    const host = await hostContext.newPage();
    const companion = await companionContext.newPage();

    await host.goto('/host');
    const code = await host.locator('#room-code').textContent();
    expect(code, `room ${attempt} has a code`).toMatch(/^[A-Z0-9]{6}$/);
    await companion.goto(`/join/${code}`);
    await expect(companion.locator('#connection-state')).toContainText(`Connected to room ${code}`);

    await host.locator('#bpm').fill('180');
    await host.getByRole('button', { name: 'Start 60-second round' }).click();
    await expect(companion.getByRole('button', { name: /Tap the beat/ })).toBeEnabled();
    await companion.getByRole('button', { name: /Tap the beat/ }).click();
    await expect(host.locator('#tap-count')).toHaveText('1 returned tap.');
    await expect(companion.locator('#score-value')).toHaveText(await host.locator('#score-value').textContent() ?? '0%');

    await hostContext.close();
    await companionContext.close();
  }
});

test('regression: independent API request contexts never alternate room_not_found after create', async ({ playwright }) => {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const client = `198.51.100.${attempt}`;
    const creator = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8080' });
    const created = await creator.post('/api/rooms', { headers: { 'X-Forwarded-For': client } });
    expect(created.status()).toBe(200);
    const { code } = await created.json() as { code: string };
    await creator.dispose();

    const firstJoiner = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8080' });
    const firstJoin = await firstJoiner.post(`/api/rooms/${code}/join`, { headers: { 'X-Forwarded-For': client } });
    expect(firstJoin.status(), `first independent join for room ${code}`).toBe(200);
    await firstJoiner.dispose();

    const secondJoiner = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8080' });
    const secondJoin = await secondJoiner.post(`/api/rooms/${code}/join`, { headers: { 'X-Forwarded-For': client } });
    expect(secondJoin.status(), `second independent join for room ${code}`).toBe(409);
    await secondJoiner.dispose();
  }
});

test('service-worker-only offline reload keeps the built shell and manifest available', async ({ page, context }) => {
  await page.goto('/demo');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.clearBrowserCache');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Try a tactile beat round');
  await expect(page.getByRole('button', { name: 'Start sample round' })).toBeVisible();
});

test('unknown routes return an HTTP 404 and non-audio files are rejected', async ({ page }) => {
  const missing = await page.goto('/definitely-not-a-real-route');
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This beat has no room');

  await page.goto('/host');
  await expect(page.locator('#room-code')).not.toHaveText('······');
  await page.locator('#audio-loop').setInputFiles({
    name: 'not-audio.txt', mimeType: 'text/plain', buffer: Buffer.from('not audio'),
  });
  await expect(page.locator('#file-name')).toHaveText('Choose an audio file. This file was not loaded.');
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
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const resizedOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(resizedOverflow, `${route} overflow at 200% text size in ${testInfo.project.name}`).toBeLessThanOrEqual(1);
  }
});

test('all visible interactive controls meet the 44px touch-target baseline', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touch targets are measured at the 390px mobile viewport.');
  for (const route of ['/', '/demo', '/host', '/join', '/privacy', '/terms', '/404']) {
    await page.goto(route);
    const undersized = await page.locator('a, button, input').evaluateAll((elements) => elements
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { label: element.textContent?.trim() || element.getAttribute('aria-label') || element.id, width: rect.width, height: rect.height };
      })
      .filter((target) => target.width < 44 || target.height < 44));
    expect(undersized, `${route} has undersized interactive controls`).toEqual([]);
  }
});
