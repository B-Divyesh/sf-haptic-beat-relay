# Haptic Beat Relay — verification 26 handoff

## Outcome

**PASS — release candidate `9ff530a030b8d4cc20dbd22d4d35fad993c4bde8` is verified live at <https://haptic-beat-relay.sociobot.in>.**

This independent verification found no defects. The deployed `/health` build SHA, immutable image, and checked-out candidate SHA match. The relay is one HTTP Container App replica with durable SQLite mounted at `/data`.

## What was verified

- Ran all 20 commands declared in `.factory/claims.json` from a clean install, using the shipped demo entry point for browser claims.
- `npm test` passed: 40 Playwright tests passed (six intentional project skips), Rust 16/16 passed, plus all repository contract/unit checks.
- `npm run build` passed. Initial JS is 8.72 KB gzip; CSS is 4.58 KB gzip.
- Fresh live relay check passed 30/30 fresh API and reconnecting desktop-host + 390 px companion rounds. Rate limiting was exactly 40 accepted room API requests per client per second, then `429 Retry-After: 1` for each of five identities.
- Cold desktop/mobile, keyboard, Axe, response headers, request logging, caching, service-worker/offline reload, privacy, and first-read/demo checks all passed.

Full evidence, commands, and outcomes: `.factory/verification-26.md`. `verify-url.sh` artifacts: `.factory/evidence/verification-26/`.

## Run and verify

```sh
npm ci
npm test
npm run build
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
```

## Known gaps

None. As documented, phone vibration and controller haptics depend on the visitor's browser and device; the visual cue is the supported fallback.
