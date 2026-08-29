import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';

const baseURL = (process.env.RELAY_BASE_URL ?? 'https://haptic-beat-relay.sociobot.in').replace(/\/$/, '');
const requests = Number.parseInt(process.env.RELAY_RATE_REQUESTS ?? '45', 10);
const repetitions = Number.parseInt(process.env.RELAY_RATE_REPETITIONS ?? '1', 10);

assert.equal(requests, 45, 'the documented live allowance regression is exactly a 45-request burst');
assert.ok(Number.isInteger(repetitions) && repetitions > 0 && repetitions <= 20, 'RELAY_RATE_REPETITIONS must be an integer from 1 through 20');

// TEST-NET-2 is non-routable. Each burst gets a distinct forwarded identity,
// so a five-burst release gate cannot accidentally reuse one rate window.
// An explicit identity remains available for a single-burst investigation.
assert.ok(
  !(process.env.RELAY_TEST_CLIENT && repetitions !== 1),
  'RELAY_TEST_CLIENT can only be used with one burst; repeated checks need distinct client identities',
);

const clients = process.env.RELAY_TEST_CLIENT
  ? [process.env.RELAY_TEST_CLIENT]
  : (() => {
      const usedOctets = new Set();
      while (usedOctets.size < repetitions) {
        usedOctets.add(randomInt(20, 220));
      }
      return [...usedOctets].map((octet) => `198.51.100.${octet}`);
    })();

const results = [];
for (const client of clients) {
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
  assert.ok(limited.every((response) => response.retryAfter === '1'), `every 429 response for ${client} must include Retry-After: 1`);
  assert.equal(accepted.length + limited.length, requests, `burst for ${client} must not return an unexpected status`);
  results.push({ client, accepted: accepted.length, limited: limited.length, retryAfter: '1' });
}

console.log(JSON.stringify({ baseURL, repetitions, results }));
