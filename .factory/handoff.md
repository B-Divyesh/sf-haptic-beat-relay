# Haptic Beat Relay — repair 22 handoff

## Status

The release-blocking score-delivery race from
[verification-23.md](verification-23.md) is repaired and covered by a repeated
live-equivalent regression. This remains a `web-with-backend` container with
one replica and SQLite state under `/data`.

- Work order: `haptic-beat-relay-repair-22`
- Live URL: <https://haptic-beat-relay.sociobot.in>
- Scope: only `sf-haptic-beat-relay` and its existing data mount

## Reproduction before repair

- The unchanged 30-round live command passed once, confirming the reported
  round-23 defect was intermittent.
- A live WebSocket interception delayed only the companion's score frame. The
  host showed `40%` while the companion still showed `0%`, reproducing the
  verifier's host/non-host mismatch. Both eventually converged to `40%`.
- Evidence: `evidence/repair-22/reproduction-before.txt` and
  `evidence/repair-22/deterministic-reproduction-before.txt`.

## Root cause and repair

- The host updated its score before the score frame reached the companion.
  The two screens therefore exposed different states during normal network
  delay.
- The companion now applies each score and sends a validated `score_ack`. The
  host displays that score only after the acknowledgement matches its pending
  round and tap count.
- Tap messages carry a round and tap identifier. The host rejects stale and
  duplicate taps.
- Host and companion sockets reconnect automatically. The server sends an
  initial peer-presence snapshot, keeps reconnect tokens across restarts, and
  lets an inactive room accept a replacement companion.
- When a companion reconnects during a round, the host replays the active
  round and latest pending score. A lost score frame therefore converges.
- The 30-round local and live probes force a host reconnect, delay and discard
  the first companion score frame, then require a non-zero matching score in
  every fresh desktop/390 px pair.

## Verification evidence

- Clean dependency install: `npm ci` — 59 packages, 0 vulnerabilities.
- Full gate: `npm test` passed in 3.3 minutes — 3 Vitest tests, 14 Rust tests,
  release/deployment/handoff contracts, clean-entrypoint checks, and 37
  Playwright checks passed with 3 intentional project skips.
- All 13 non-live commands in `.factory/claims.json` passed exactly as listed
  after the clean install. The 60-second claim was measured independently.
- Formatting and lint: `cargo fmt --all -- --check` and strict locked Clippy
  passed. `cargo build --release --locked` passed.
- Exact local live-equivalent probe: 30/30 fresh API rooms and 30/30 fresh
  desktop-host/390 px companion pairs passed after forced host reconnect,
  delayed score loss, and forced companion reconnect.
- Five local rate probes each returned exactly 40 × 200 and 5 × 429 with
  `Retry-After: 1`.
- Minimal runtime: the release binary started with only `PORT=18080`, reported
  its default SQLite path, served UI/API/health, and stopped on SIGINT.
- Load smoke: 100 concurrent creates with separate client identities returned
  100 × 200 in 1,394 ms.
- Production bundle: JavaScript 25,629 bytes raw / 8,658 bytes gzip; CSS 17,506
  bytes raw / 4,603 bytes gzip. The first-load budgets remain well below the
  product limits.
- Browser coverage includes desktop and 390 px mobile, keyboard recovery,
  Axe scans on all routes, 200% text, 44 px touch targets, reduced motion,
  local-only audio, same-origin privacy, offline reload, response/cache policy,
  and zero normal-flow console errors.
- Fresh screenshots: `evidence/repair-22/desktop.png` and
  `evidence/repair-22/mobile.png`. Visual review found no overflow, clipping,
  or loading error.
- Lighthouse 12.8.2 mobile: performance 100, accessibility 100, best practices
  100, SEO 100; FCP 1.1 s, LCP 1.7 s, TBT 0 ms, CLS 0.

## Scoped deployment and live proof

The first committed repair candidate (`983cdd4`) was pushed and deployed with
the guarded repository command. It touched only `sf-haptic-beat-relay` and its
existing configured data mount.

- The ACR source-archive build passed all 23 Dockerfile steps. The runtime is
  non-root and contains the release Rust server plus the built frontend.
- Live topology passed before and after the stability window: one active
  revision, min/max one, one running and ready replica, HTTP ingress, `/data`
  mounted from `sf-haptic-beat-relay-data`, full-SHA image, and matching health
  identity.
- A room survived a live restart onto a different replica and joined after the
  restart from durable SQLite.
- The guarded release passed 30/30 fresh API checks and 30/30 forced-reconnect,
  delayed-score desktop/390 px rounds. The exact claim command passed again
  after deployment.
- Five rate probes during release and five after release each returned exactly
  40 × 200 and 5 × 429 with `Retry-After: 1`.
- Live browser QA covered eight routes at desktop and 390 px: 16 Axe scans had
  zero serious/critical findings, normal flows had zero console errors, and
  every route had `lang`, one H1, one main, alt text, and no overflow.
- The live demo made only same-origin non-API requests and wrote no browser
  storage. Keyboard error recovery, the designed focus ring, security headers,
  offline service-worker reload, and exact health identity passed.
- Live screenshots: `evidence/repair-22/live-desktop.png` and
  `evidence/repair-22/live-mobile.png`.

This final handoff commit changes documentation and evidence only. The same
guarded command is run again for `$(git rev-parse HEAD)` so the released health
identity and image tag match the final pushed repository state.

## Release command

The guarded command deploys only the configured product and refuses a dirty or
unpushed tree:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-persistence
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
```

## Known gaps

- Docker is unavailable locally. The factory ACR multi-stage build passed.
- Package/consumer checks do not apply to this backend web application.
