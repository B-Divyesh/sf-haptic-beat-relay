import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// @claim:live-relay

const baseURL = (process.env.RELAY_BASE_URL ?? 'https://haptic-beat-relay.sociobot.in').replace(/\/$/, '');
const rounds = Number.parseInt(process.env.RELAY_ROUNDS ?? '30', 10);

assert.ok(Number.isInteger(rounds) && rounds > 0, 'RELAY_ROUNDS must be a positive integer');

// This is the precise production failure that a split process-local relay
// produces: the create request reaches one process and a fresh companion join
// reaches another, returning room_not_found. Do this separately from the
// browser flow so a routing failure is reported at its HTTP boundary first.
async function verifyFreshApiRooms() {
  for (let attempt = 1; attempt <= rounds; attempt += 1) {
    const forwardedFor = `198.18.90.${attempt}`;
    const headers = { 'X-Forwarded-For': forwardedFor };
    const created = await fetch(`${baseURL}/api/rooms`, {
      method: 'POST',
      cache: 'no-store',
      headers,
    });
    const createBody = await created.text();
    assert.equal(created.status, 200, `API room ${attempt}: create failed: ${createBody}`);
    const room = JSON.parse(createBody);
    assert.match(room.code, /^[A-Z0-9]{6}$/, `API room ${attempt}: invalid room code`);

    const joined = await fetch(`${baseURL}/api/rooms/${room.code}/join`, {
      method: 'POST',
      cache: 'no-store',
      headers,
    });
    const joinBody = await joined.text();
    assert.equal(
      joined.status,
      200,
      `API room ${attempt}: fresh companion join for ${room.code} failed: ${joinBody}`,
    );
    assert.match(JSON.parse(joinBody).companion_token, /^[A-Z0-9]{32}$/, `API room ${attempt}: invalid companion token`);
  }
}

await verifyFreshApiRooms();

const browser = await chromium.launch({ headless: true });
let completed = 0;

try {
  for (let attempt = 1; attempt <= rounds; attempt += 1) {
    const hostContext = await browser.newContext();
    const companionContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const host = await hostContext.newPage();
    const companion = await companionContext.newPage();
    const faults = [];
    const recordFault = (where) => (message) => {
      if (message.type() === 'error') faults.push(`${where}: ${message.text()}`);
    };
    host.on('console', recordFault('host console'));
    companion.on('console', recordFault('companion console'));
    host.on('pageerror', (error) => faults.push(`host page error: ${error.message}`));
    companion.on('pageerror', (error) => faults.push(`companion page error: ${error.message}`));

    try {
      await host.goto(`${baseURL}/host`, { waitUntil: 'domcontentloaded' });
      await host.waitForFunction(
        () => /^[A-Z0-9]{6}$/.test(document.querySelector('#room-code')?.textContent?.trim() ?? ''),
        undefined,
        { timeout: 10_000 },
      );
      const code = (await host.locator('#room-code').textContent())?.trim();
      assert.match(code ?? '', /^[A-Z0-9]{6}$/, `round ${attempt}: host did not create a room`);

      await companion.goto(`${baseURL}/join/${code}`, { waitUntil: 'domcontentloaded' });
      await companion.locator('#connection-state').waitFor({ state: 'visible' });
      await companion.locator('#connection-state').waitFor({ state: 'visible' });
      await companion.waitForFunction(
        (roomCode) => document.querySelector('#connection-state')?.textContent?.includes(`Connected to room ${roomCode}`),
        code,
        { timeout: 10_000 },
      );
      await host.getByRole('button', { name: 'Start 60-second round' }).waitFor({ state: 'visible' });
      await host.waitForFunction(() => !(document.querySelector('#start-round')).disabled, undefined, { timeout: 10_000 });
      await host.locator('#bpm').fill('180');
      await host.getByRole('button', { name: 'Start 60-second round' }).click();
      await companion.waitForFunction(() => !(document.querySelector('#tap-pad')).disabled, undefined, { timeout: 10_000 });
      await companion.locator('#tap-pad').click();
      await host.waitForFunction(() => document.querySelector('#tap-count')?.textContent === '1 returned tap.', undefined, { timeout: 10_000 });

      const [hostScore, companionScore, hostState, companionState] = await Promise.all([
        host.locator('#score-value').textContent(),
        companion.locator('#score-value').textContent(),
        host.locator('#connection-state').textContent(),
        companion.locator('#connection-state').textContent(),
      ]);
      assert.equal(companionScore, hostScore, `round ${attempt}: score did not reach the companion`);
      assert.doesNotMatch(`${hostState} ${companionState}`, /room is not open|relay connection (closed|failed)/i, `round ${attempt}: room state failed`);
      assert.deepEqual(faults, [], `round ${attempt}: browser errors indicate a failed HTTP or WebSocket request`);
      completed += 1;
    } finally {
      await hostContext.close();
      await companionContext.close();
    }
    // Four room API/upgrade requests per round remain well under the 40/s API
    // allowance while still using fresh browser contexts for every round.
    await new Promise((resolve) => setTimeout(resolve, 550));
  }
} finally {
  await browser.close();
}

console.log(`live relay regression passed: ${rounds}/${rounds} fresh API create→join checks and ${completed}/${rounds} fresh desktop-host + 390px-companion WebSocket rounds at ${baseURL}`);
