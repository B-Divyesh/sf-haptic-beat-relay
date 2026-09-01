# Haptic Beat Relay — repair 23 handoff

## Status

Repair complete. This change resolves verification 24's release blocker: a
returned tap can no longer be scored from delayed WebSocket arrival time or
lost while its score acknowledgement is reconnecting.

## What changed

- Added `relay_round_state` to the existing SQLite database under `/data`.
  It holds only the current temporary round, score, tap count, and matching
  companion acknowledgement. It is removed with the two-hour room record.
- The relay commits round starts, scores, acknowledgements, and round ends
  before broadcasting them. Every authenticated socket reconnect receives a
  direct `relay_state` snapshot.
- The host renders its non-zero score after the relay commits it. The
  companion applies the replayed state and acknowledges only the exact stored
  score, round, and tap count.
- Taps now carry the companion's cue-to-tap delay. The host scores that delay,
  rather than the later WebSocket arrival time. The tap pad stays disabled
  until a cue arrives, preventing an unscored pre-cue tap.
- The existing 30-round desktop-host/390 px-companion regression and live
  probe now require a persisted `relay_state` replay after the forced delayed
  score disconnect. A Rust regression reopens SQLite and rejects a mismatched
  acknowledgement before accepting the exact one.

## Reproduction and verification

The verifier's documented failure was the baseline: after a 400 ms delayed
score frame and a companion reconnect, the host could retain `1 returned tap`
while showing `0%`. The failure was timing-sensitive in this environment, so
the repair covers both contributing paths instead of relying on a single
flaky run: durable score replay/acknowledgement and cue-local scoring.

Commands run successfully during this repair:

```sh
npm ci
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --locked --all-targets -- -D warnings
cargo test
cargo build --release --locked
cargo test regression_delayed_score_ack_replays_durable_round_state_after_companion_reconnect -- --nocapture
npx playwright test tests/browser/product.spec.ts --grep '30 delayed-score' --project=chromium
```

The strengthened 30-round regression passed all rounds locally. It forces a
host reconnect, delays and drops the first companion score frame, reconnects
the companion, observes the durable replay, and asserts the same non-zero
score on desktop host and 390 px companion. The production build is 26.35 KB
JavaScript raw / 8.85 KB gzip and 17.51 KB CSS raw / 4.59 KB gzip.
Docker is not installed in this worker, so the container build itself could
not run here; the locked Rust release build passed.

Run the final clean gate from this committed checkout:

```sh
npm ci
npm test
npm run build
cargo build --release --locked
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
```

Browser coverage includes desktop and 390 px mobile, keyboard skip/error
recovery, Axe serious/critical scans on every route, 200% text, privacy
request capture, service-worker offline reload, reduced motion, response
headers, and cache policy. No third-party runtime requests are allowed.

## Deploy

The guarded deployment only accepts a clean, pushed final handoff commit and
uses the existing one-replica `/data` volume configuration:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
```

It builds `sf-haptic-beat-relay`, pins HTTP WebSocket ingress, mounts
`sf-haptic-beat-relay-data` at `/data`, and runs the 30-round live relay,
rate-limit, persistence, and final identity checks.

## Known gaps and next steps

No product gaps remain from verification 24. Vibration and controller haptics
still depend on browser and device support; the visual cue remains the tested
fallback. No resources were created beyond the existing product deployment
configuration.
