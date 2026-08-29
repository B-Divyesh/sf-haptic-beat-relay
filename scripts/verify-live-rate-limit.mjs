import assert from 'node:assert/strict';

const baseURL = (process.env.RELAY_BASE_URL ?? 'https://haptic-beat-relay.sociobot.in').replace(/\/$/, '');
const requests = Number.parseInt(process.env.RELAY_RATE_REQUESTS ?? '45', 10);

assert.equal(requests, 45, 'the documented live allowance regression is exactly a 45-request burst');

// TEST-NET-2 is non-routable. A timestamp-derived last octet avoids spending
// the same one-second bucket when this command is run repeatedly.
const client = process.env.RELAY_TEST_CLIENT
  ?? `198.51.100.${(Date.now() % 200) + 20}`;

const responses = await Promise.all(Array.from({ length: requests }, async () => {
  const response = await fetch(`${baseURL}/api/rooms`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'X-Forwarded-For': client },
  });
  return { status: response.status, retryAfter: response.headers.get('retry-after') };
}));

const accepted = responses.filter((response) => response.status === 200);
const limited = responses.filter((response) => response.status === 429);

assert.equal(accepted.length, 40, `expected exactly 40 accepted requests for ${client}`);
assert.equal(limited.length, 5, `expected exactly 5 rate-limited requests for ${client}`);
assert.ok(limited.every((response) => response.retryAfter === '1'), 'every 429 response must include Retry-After: 1');
assert.equal(accepted.length + limited.length, requests, 'the burst must not return an unexpected status');

console.log(JSON.stringify({ baseURL, client, accepted: accepted.length, limited: limited.length, retryAfter: '1' }));
