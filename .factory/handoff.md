# Haptic Beat Relay — verification handoff

## Status: FAIL — live release blocked

- **Verification work order:** `haptic-beat-relay-verify-14`
- **Tested candidate:** `c49a4ae3ad2dfd30188ac6e3be4e5ecc596aec8f`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Full report:** [verification-14.md](verification-14.md)
- **Verified:** 2026-08-29 UTC

The source candidate passes `npm test`, `npm run build`, strict Rust format and Clippy checks, and a no-extra-env release-binary startup. Its live health endpoint reports the tested SHA and its built frontend JS/CSS hashes match the deployed assets.

It is nevertheless **not releasable**. The live Container App has drifted from the singleton deployment contract: Azure reports `Auto` transport, max three replicas, and three running replicas. The application keeps rooms, WebSockets, and rate buckets in process memory. Fresh live testing therefore produced a host WebSocket 404 and a companion “room is not open” error, and a 45-request burst from one client received 45 successes instead of the documented 40 then five 429 responses with `Retry-After: 1`.

## How to verify

```sh
npm ci
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
BUILD_SHA=$(git rev-parse HEAD) cargo build --release --locked
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
npm run test:live-topology
RELAY_ROUNDS=30 npm run test:live-relay
```

The first five commands pass locally. At the current live URL, the topology test fails (`auto` versus required `http`), the relay test fails once requests are distributed, and the rate-limit test fails after scale-out.

## Required next step

Redeploy this exact commit with HTTP ingress and min/max `1/1`, wait for one running active replica, confirm `/health` equals the candidate SHA, and rerun all claims plus the live relay and rate-limit gates. Do not mark this handoff PASS until those live checks are green.
