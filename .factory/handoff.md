# Haptic Beat Relay — repair handoff

## Status: PASS — deployed

**Repair commit:** `a3db9531f31ec65cb93eef235d0f422d0dd04219`
**Base verifier report:** `ddedbc9e2bbbe4286372bae82b7af1849f635834`
**Live URL:** <https://haptic-beat-relay.sociobot.in>
**Verified:** 2026-08-29 UTC

## Repair

The verifier's exact topology failure reproduced before the repair:
`npm run test:live-topology` reported live ingress `auto` where this
process-local relay requires `http`. The original verifier also recorded fresh
create-to-join `404`s and WebSocket upgrade `404`s when requests landed on
different processes.

`scripts/deploy-containerapp.sh` now applies the image revision and its
one-replica scale first, then reapplies HTTP ingress. This ordering prevents a
revision update from restoring Azure's `Auto` transport default. It verifies
single-revision mode, HTTP transport, min/max replica counts, the active
revision's own scale, and exactly one running replica. It then fails the
deployment unless live topology/build identity and 30 repeated fresh-room
checks pass.

`scripts/verify-live-relay.mjs` now first performs the exact independently
routed failure probe for every round: a fresh `POST /api/rooms` followed by a
fresh companion `POST /api/rooms/:code/join`. Each join must return `200` and
a 32-character companion token. It then runs the existing fresh desktop-host
and 390 px companion browser round, including WebSocket connection, cue, tap,
and shared score. The checked-in release-contract test asserts both the
post-rollout ingress order and mandatory post-deploy live checks.

## Deployment evidence

Deployed with:

```sh
RELAY_ROUNDS=30 scripts/deploy-containerapp.sh a3db9531f31ec65cb93eef235d0f422d0dd04219
```

ACR build `chxe` succeeded. The deployment command completed its built-in
topology and 30-round live relay gate. A second post-deploy run produced:

```json
{"app":"sf-haptic-beat-relay","revision":"sf-haptic-beat-relay--ra3db9531f3","activeRevisions":1,"minReplicas":1,"maxReplicas":1,"runningReplicas":1,"transport":"Http","buildSha":"a3db9531f31ec65cb93eef235d0f422d0dd04219"}
```

`RELAY_ROUNDS=30 npm run test:live-relay` then exited successfully: all 30
fresh API create-to-join checks and all 30 fresh desktop-host/390 px companion
WebSocket rounds completed. `npm run test:live-rate-limit` returned exactly
40 accepted requests followed by 5 `429` responses, each with `Retry-After: 1`.
Live `/health` returns the repair SHA and `status: ok`.

## Local verification

- `npm ci`: passed, 0 vulnerabilities.
- `npm test`: passed: 3 Vitest tests, 10 Rust tests, clean browser-entrypoint
  regression, and the complete desktop/mobile Playwright suite (including all
  listed browser claim tests, keyboard, 390 px, reduced motion, service-worker
  offline reload, privacy request capture, and Axe serious/critical scans).
- `npm run build`: passed. Frontend output is 23.16 kB JS (7.85 kB gzip) and
  15.59 kB CSS (4.21 kB gzip).
- `cargo fmt --all -- --check`,
  `cargo clippy --all-targets --all-features --locked -- -D warnings`, and
  `cargo build --release --locked`: passed.
- `sh -n scripts/deploy-containerapp.sh` and
  `npm run test:release-contract`: passed.
- Live `/demo` headers include the self-only CSP, `frame-ancestors 'none'`,
  `nosniff`, `strict-origin-when-cross-origin`, and `no-cache` HTML policy.

Docker is unavailable in this worker, so no local Docker daemon build/run was
possible. The deployed image was built successfully by ACR from the root
multi-stage Dockerfile.

## Retest

```sh
npm ci
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
npm run test:live-topology
npm run test:live-rate-limit
RELAY_ROUNDS=30 npm run test:live-relay
```
