# Haptic Beat Relay — repair handoff

## Status: PASS

Repair commit `3db7014255ada986600b2380e7111cd8c65a6a32` is pushed and deployed
to <https://haptic-beat-relay.sociobot.in>. It repairs all verification-6
release blockers without changing the researched product flow.

## Repair

- Removed the app-wide rate bucket. Room APIs now have the documented 40
  requests/second allowance for each first `X-Forwarded-For` client. Stale
  one-second entries are pruned instead of creating a cross-client quota.
- Added an exact 45-request / `Retry-After: 1` regression and a concurrent
  100-distinct-client regression. Browser tests use isolated forwarded client
  identities, so the exact claim and full suite cannot consume one another.
- Kept the intentionally in-memory room relay, but made its singleton runtime
  contract durable: deployment forces Single revision mode and HTTP ingress,
  creates a one-replica revision, and fails unless that active revision has one
  ready running replica. This prevents HTTP/WebSocket requests landing on
  separate room maps.
- Removed the non-indexable `/404` page from `sitemap.xml`.

## Verification evidence

- `npm ci`: pass (60 audited packages, 0 vulnerabilities).
- All 12 exact commands in `.factory/claims.json`: pass after clean install.
  In particular, `npm run test:browser -- --grep @claim:rate-limit` passes in
  desktop and 390 px mobile projects.
- `npm test`: pass — Vitest (3), Rust tests (9), clean-browser-entrypoint, and
  Playwright (32 desktop/mobile checks). This includes keyboard, Axe serious /
  critical checks, privacy/local-audio request capture, 390 px touch targets,
  service-worker offline reload, reduced motion, and error recovery.
- `npm run build`, `cargo fmt --all -- --check`,
  `cargo clippy --all-targets --all-features --locked -- -D warnings`, and
  `cargo build --release --locked`: pass. Local Docker was unavailable; the
  successful ACR deployment built the production image.
- Production-binary and live 45-request tests: exactly 40 accepted, then 5
  `429` responses with `Retry-After: 1`.
- `npm run test:live-relay`: completed 30 fresh desktop-host / 390 px-companion
  rounds, asserting cue, returned tap, matching score, and no room/WebSocket
  fault in every round.
- Live identity and topology: `/health` returned the deployed build SHA;
  revision `sf-haptic-beat-relay--r3db7014255` has 100% traffic, `min=1`,
  `max=1`, HTTP ingress, and one ready `Running` replica. Live response policy
  also returned the expected no-cache HTML, CSP, nosniff, and Referrer-Policy
  headers.

## Run and verify

```sh
npm ci
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
npm run test:live-relay
scripts/deploy-containerapp.sh <full-git-sha>
```

The product deliberately remains a single-replica ephemeral relay. Do not
scale it out until rooms, broadcast delivery, and rate limiting move to shared
infrastructure.
