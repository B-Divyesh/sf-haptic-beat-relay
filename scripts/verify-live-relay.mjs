import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// @claim:live-relay

const baseURL = (process.env.RELAY_BASE_URL ?? 'https://haptic-beat-relay.sociobot.in').replace(/\/$/, '');
const rounds = Number.parseInt(process.env.RELAY_ROUNDS ?? '30', 10);

assert.ok(Number.isInteger(rounds) && rounds > 0, 'RELAY_ROUNDS must be a positive integer');

async function waitUntil(predicate, label, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.fail(`timed out waiting for ${label}`);
}

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
    const hostContext = await browser.newContext({
      extraHTTPHeaders: { 'X-Forwarded-For': `198.18.91.${attempt}` },
    });
    const companionContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      extraHTTPHeaders: { 'X-Forwarded-For': `198.18.92.${attempt}` },
    });
    const host = await hostContext.newPage();
    const companion = await companionContext.newPage();
    let hostSocket;
    let companionSocket;
    let hostConnections = 0;
    let companionConnections = 0;
    let delayedScoreFrames = 0;
    let replayedRoundStates = 0;
    const faults = [];
    const recordFault = (where) => (message) => {
      if (message.type() === 'error') faults.push(`${where}: ${message.text()}`);
    };
    host.on('console', recordFault('host console'));
    companion.on('console', recordFault('companion console'));
    host.on('pageerror', (error) => faults.push(`host page error: ${error.message}`));
    companion.on('pageerror', (error) => faults.push(`companion page error: ${error.message}`));

    await host.routeWebSocket(/\/api\/rooms\/.*\/socket/, (route) => {
      hostConnections += 1;
      hostSocket = route;
      route.connectToServer();
    });
    await companion.routeWebSocket(/\/api\/rooms\/.*\/socket/, (route) => {
      companionConnections += 1;
      companionSocket = route;
      const server = route.connectToServer();
      server.onMessage((message) => {
        let type = '';
        try { type = JSON.parse(String(message)).type; } catch { /* Forward malformed frames unchanged. */ }
        if (type === 'relay_state' && companionConnections > 1) replayedRoundStates += 1;
        const isScore = type === 'score';
        if (!isScore) {
          route.send(message);
          return;
        }
        delayedScoreFrames += 1;
        setTimeout(() => {
          if (companionSocket === route) route.send(message);
        }, 400);
      });
    });

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
      await waitUntil(() => hostConnections === 1, `round ${attempt} initial host socket`);
      await hostSocket.close({ code: 1012, reason: 'live regression host reconnect' });
      await waitUntil(() => hostConnections === 2, `round ${attempt} host reconnect`);
      await host.waitForFunction(() => !(document.querySelector('#start-round')).disabled, undefined, { timeout: 10_000 });

      await host.locator('#bpm').fill('60');
      await host.getByRole('button', { name: 'Start 60-second round' }).click();
      await companion.waitForFunction(() => !(document.querySelector('#tap-pad')).disabled, undefined, { timeout: 10_000 });
      await companion.locator('#tap-pad').click();
      await waitUntil(() => delayedScoreFrames > 0, `round ${attempt} delayed score frame`);
      await companionSocket.close({ code: 1012, reason: 'live regression companion reconnect during score' });
      await waitUntil(() => companionConnections === 2, `round ${attempt} companion reconnect`);
      await waitUntil(() => replayedRoundStates > 0, `round ${attempt} persisted relay state replay`);
      await host.waitForFunction(() => document.querySelector('#tap-count')?.textContent === '1 returned tap.', undefined, { timeout: 10_000 });

      const [hostScore, companionScore, hostState, companionState] = await Promise.all([
        host.locator('#score-value').textContent(),
        companion.locator('#score-value').textContent(),
        host.locator('#connection-state').textContent(),
        companion.locator('#connection-state').textContent(),
      ]);
      assert.notEqual(hostScore, '0%', `round ${attempt}: acknowledged score must be non-zero`);
      assert.equal(companionScore, hostScore, `round ${attempt}: score did not reach the companion`);
      assert.doesNotMatch(`${hostState} ${companionState}`, /room is not open|relay connection (closed|failed)/i, `round ${attempt}: room state failed`);
      assert.deepEqual(faults, [], `round ${attempt}: browser errors indicate a failed HTTP or WebSocket request`);
      completed += 1;
    } finally {
      await hostContext.close();
      await companionContext.close();
    }
    // Every browser context uses its own forwarded identity, matching separate
    // phones while keeping reconnection upgrades independent of the API probe.
  }
} finally {
  await browser.close();
}

console.log(`live relay regression passed: ${rounds}/${rounds} fresh API create→join checks and ${completed}/${rounds} delayed-score desktop-host + 390px-companion rounds with host and companion reconnection at ${baseURL}`);
