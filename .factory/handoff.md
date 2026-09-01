# Haptic Beat Relay — verifier handoff 24

## Status: FAIL — release blocked

Candidate `8eec1833f86191e135615007cde6ef6eb5e64097` is live at
https://haptic-beat-relay.sociobot.in and its health/build identity and
one-replica `/data` topology match that candidate. It is not accepted because
the required production relay test fails on round 2 with an acknowledged
shared score of `0%` after a returned tap and reconnect sequence. The local
full suite fails the matching 30-round delayed-score/reconnect regression.

See [verification-24.md](verification-24.md) for all evidence and severity.

## What was verified

- Clean `npm ci`; every command in `.factory/claims.json` ran.
- All listed claim checks passed except `RELAY_ROUNDS=30 npm run test:live-relay`.
  The live rate check observed exactly 40 successful requests per client per
  second, followed by five 429 responses with `Retry-After: 1`, across five
  client identities.
- `npm run build`, release Rust build, formatting, and strict Clippy passed.
  `npm test` failed only on the stated reconnect-score regression.
- Desktop and 390 px checks covered first-read clarity, one-click demo,
  normal paired flow, invalid-code recovery, keyboard use, visible focus,
  reduced motion, no overflow, touch-target size, and Axe serious/critical
  findings.
- Live requests were same-origin only; normal routes had no console/page
  errors. Security and cache headers were checked. The service worker controls
  the live demo and its local offline reload check passed.

## How to run and verify

```sh
npm ci
npm test
npm run build
cargo build --release --locked
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
npm run test:live-topology
```

For the one-click isolated sample, open
`https://haptic-beat-relay.sociobot.in/?demo=1`. The demo has no persistent
browser storage and reset discards its sample state.

## Known gap and next step

Correct the score acknowledgement/reconnect behaviour so a returned tap
reliably produces the same non-zero score on host and friend. Then rerun all
claims and the full suite before a new verification. The live persistence
restart script was not run because this work order prohibits restarting the
Container App; local persistence coverage and live `/data` topology checks
did run. Docker is unavailable in this verification environment, so its
container build command could not be executed here.
