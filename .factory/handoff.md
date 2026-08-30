# Haptic Beat Relay — repair 21 handoff

## Status

Release-blocking verifier findings are repaired in source and covered by exact
regressions. The guarded release command below deploys only
`sf-haptic-beat-relay` and refuses success unless the live topology, build
identity, 30-round relay, and five independent rate-limit bursts all pass.

- Work order: `haptic-beat-relay-repair-21`
- Artifact: `web-with-backend`
- Live URL: <https://haptic-beat-relay.sociobot.in>
- Source report: [verification-22.md](verification-22.md)

## Reproduction before repair

- `npm run test:live-topology` failed with live ingress `auto` instead of
  `http`. Scoped inspection showed a 1–3 scale range and no `/data` mount.
- `RELAY_ROUNDS=30 npm run test:live-relay` failed at the companion connection
  wait in `verify-live-relay.mjs:72`, matching the independent verifier.
- The first repeated rate probe happened to pass 40/5 for all five identities.
  The verifier's 45/45 and 80/45 evidence remains explained by per-process
  counters across three replicas.
- `cargo fmt --check` reproduced the verifier's formatting diff.
- The 390 px screenshot reproduced headline words split across lines.
- The first durable `/data` rollout reproduced one additional live-only
  failure: SQLite WAL initialization returned `database is locked` on the
  Azure Files mount while revisions overlapped.

## Repairs

- Added a migrated SQLite store for temporary rooms and limiter buckets.
  Production defaults to `/data/relay.sqlite3`; local execution
  falls back beside the binary. Active room codes survive restart and expire
  after two hours. Stale companion leases are released at startup.
- Configured SQLite with a full-synchronous rollback journal and a 30-second
  busy timeout. WAL shared-memory files are unsafe on the Azure Files SMB
  mount. Because the mount also rejects SQLite's advisory locks, `/data` uses
  the `unix-none` VFS with one connection, and deployment stops every old
  revision before starting its successor. That three-part invariant prevents
  concurrent writers.
  The repaired store uses a clean `relay.sqlite3`; the unusable WAL database
  created by the blocked first rollout never served traffic and is ignored.
- Made the exact 40-request window one atomic SQLite upsert. Request arrival
  time is captured before storage contention, so a simultaneous burst cannot
  gain extra allowance while queued. All three room endpoints share it.
- Kept WebSocket fan-out deliberately singleton and strengthened the guarded
  deployment. It now renders the Azure Files mount, full-SHA image,
  SHA-derived revision suffix, one-replica scale, and HTTP ingress. It also
  removes the factory helper's legacy alias for the same mounted volume and
  enforces stop-before-start for the single SQLite writer.
- Extended live topology checks to require the `/data` volume on both the app
  template and active revision.
- Added regressions for shared room access across pools, shared rate limits
  across three pools, restart continuity, TTL eviction, every API route,
  30 fresh desktop-host/390 px companion rounds, response headers, and mobile
  word integrity.
- Reduced the mobile display size while retaining emergency wrapping for
  200% text on longer legal headings.
- Updated privacy, README, claims, copy audit, and screenshots for the durable
  temporary-state contract.

## Verification evidence

- Clean install: `npm ci` — 59 packages, 0 vulnerabilities.
- Full gate: `npm test` — 3 Vitest tests, 14 Rust tests, release/deployment/
  handoff contracts, 2 clean-entrypoint checks, then 37 Playwright checks
  passed with 3 intentional project skips.
- The Azure Files regression holds an exclusive rollback-journal lock, proves
  incoming startup waits for its release, asserts `journal_mode=delete`, and
  exercises the release SQLite build through the `unix-none` VFS.
- Formatting and lint: `cargo fmt --check` and
  `cargo clippy --all-targets --all-features -- -D warnings` passed.
- Production builds: `npm run build` and `cargo build --release --locked`
  passed. Output is 24,403 B JavaScript and 17,506 B CSS; the mobile hero is
  26,186 B.
- Exact local relay: `RELAY_BASE_URL=http://127.0.0.1:18080 RELAY_ROUNDS=30
  npm run test:live-relay` passed 30/30 API create→join checks and 30/30 fresh
  desktop-host/390 px companion WebSocket rounds.
- Exact local rate limit: five fresh client identities each received 40 × 200
  and 5 × 429 with `Retry-After: 1`.
- Load smoke: 100 concurrent creates from distinct clients returned 100 × 200
  in 191 ms.
- Browser coverage includes desktop and 390 px mobile, keyboard-only recovery,
  Axe serious/critical scans, 200% text, 44 px touch targets, reduced motion,
  no third-party requests, local-only audio, offline service-worker reload,
  update activation, and response/cache policies.
- Fresh screenshots: [desktop](evidence/screenshot-desktop.png) and
  [390 px mobile](evidence/screenshot-mobile.png). Both had one H1, one main,
  no console errors, no third-party requests, and no split headline words.
- Lighthouse 12.8.2 mobile: performance 100, accessibility 100, best practices
  100, SEO 100; FCP 1.1 s, LCP 1.7 s, TBT 30 ms, CLS 0, transfer 168 KiB.
- Minimal environment: the release binary started with only `PORT=18080`,
  defaulted SQLite beside the binary, served health/API/UI, and shut down on
  SIGINT without a secret.

## Release and live proof

The final handoff commit is deployed only with:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-persistence
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
```

The deploy command itself repeats topology after a reconciliation window. It
fails unless the active full-SHA revision has HTTP ingress, one ready replica,
the configured `/data` mount, a room survives a live replica restart, 30
stable rounds, and five exact 40/5 bursts.

## Known gaps

- Docker is not installed in this worker. The Dockerfile contract passed
  locally, and the ACR multi-stage build passed as the container build gate.
- Package/consumer checks do not apply to this backend web application.
