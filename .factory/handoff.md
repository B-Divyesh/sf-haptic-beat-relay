# Haptic Beat Relay — repair 16 handoff

## Status: PASS — repaired, deployed, and live verified

- **Work order:** `haptic-beat-relay-repair-16`
- **Independent failure report:** [`verification-16.md`](verification-16.md)
- **Failed candidate:** `01418ef9dab97602e63e621f05eceaf33f9ffe0d`
- **Repair deployment:** `9c4f97fc72cee51e81cc9431d4e463af7c90adf3`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 UTC

## Root cause reproduced and repaired

The report's three P0 findings shared one runtime cause. Rooms, WebSocket
subscriptions, and rate buckets are deliberately process-local, but the failed
candidate reached Azure through the generic container rollout instead of the
repository's guarded deployment path.

Read-only Azure inspection reproduced the drift before repair:
`activeRevisionsMode=Single`, `transport=Auto`, `minReplicas=1`, and
`maxReplicas=3` on `sf-haptic-beat-relay--0000023`. Its active image was the
generic shortened tag
`sociobotregistry.azurecr.io/sf-haptic-beat-relay:01418ef9dab9` and it had no
SHA-derived guarded revision suffix. The exact `npm run test:live-topology`
command failed at `auto !== http`.

This configuration explains both observed product failures. When Container
Apps creates a second process, a host create, companion join, or WebSocket
upgrade can reach different room maps; likewise each process grants its own
40-request rate bucket. Verification 16 captured the resulting lost score and
45/45 accepted request burst. A one-off burst can pass while the unsafe app is
temporarily idling at one replica, so the configured `1–3` range itself is the
release blocker.

The guarded deployment for `9c4f97f…` now reports one active revision at 100%
traffic, `Http` ingress, min/max `1/1`, one running replica, the full immutable
image tag
`sociobotregistry.azurecr.io/sf-haptic-beat-relay:9c4f97fc72cee51e81cc9431d4e463af7c90adf3`,
and revision `sf-haptic-beat-relay--r9c4f97fc72`. `/health` returns the same
full SHA.

## Regression coverage

`scripts/verify-live-topology.mjs` now requires all of the following for the
singleton-deployment claim:

- single-revision mode, HTTP ingress, min/max `1/1`, one active 100%-traffic
  revision, and one running replica;
- `/health` to report the expected full build SHA;
- the active container image to use that exact full immutable ACR tag; and
- the active revision name to carry the guarded `r<first-10-SHA>` suffix.

This detects the extra failure mode in candidate `01418ef…`: a generic image
rollout can bake the expected SHA into `/health` while silently restoring
generic ingress and scale settings. The release contract and deployment harness
assert the full image tag and suffix, and the harness still reproduces the
exact `Auto` / max-three / three-running-replica drift before any live success
gate can run.

## Verification evidence

### Clean local gates

- `npm ci`: passed; 59 locked packages and zero audit vulnerabilities.
- `npm test`: passed — 3 Vitest tests, release/deployment contract checks, 10
  Rust tests, 2 clean-entry-point browser checks, and 36 desktop/390 px
  Playwright checks; 2 intentional duplicate project cases skipped.
- `npm run build`: passed. Initial JavaScript is 23.16 kB raw / 7.84 kB gzip;
  CSS is 15.59 kB raw / 4.21 kB gzip.
- `cargo fmt --all -- --check`, locked strict Clippy, and
  `BUILD_SHA=repair16-local cargo build --release --locked`: passed.
- The release binary started with only `PORT=18080`, logged
  `PORT supplied; no secrets required`, and `/health` returned
  `repair16-local`.
- `/opt/fleet/lib/verify-url.sh` passed against that binary: HTTP 200, no
  console errors, valid title/lang, one `h1`, one `main`, complete image alt
  text, and labeled controls at desktop and 390 px.
- The complete Playwright Axe matrix found no serious or critical violations
  on `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`, `/404`, and an
  unknown route at desktop and 390 px. Standalone Axe CLI was attempted but
  cannot launch without a system Chrome binary in this worker; the preinstalled
  Playwright Chromium ran the passing Axe coverage instead.
- Privacy, local-audio, offline service-worker reload/update, keyboard skip
  navigation, route focus, reduced motion, 200% text, touch targets, response
  and cache policy, real 404, and desktop/mobile console checks all pass in the
  browser suite. No package/consumer test applies to this `web-with-backend`
  artifact. Docker CLI is unavailable; the Dockerfile contract and its locked
  frontend/Rust release stages passed.

### Guarded live deployment

- `npm run deploy -- 9c4f97fc72cee51e81cc9431d4e463af7c90adf3`: passed. ACR
  built the root multi-stage Dockerfile, then the repository script forced
  single-revision mode, min/max `1/1`, and HTTP ingress after the image
  rollout.
- `npm run test:live-topology`: passed with the full image tag, guarded suffix,
  one active revision, one running replica, `Http` transport, and matching
  health SHA recorded above.
- `RELAY_ROUNDS=30 npm run test:live-relay`: passed from fresh API rooms and
  fresh desktop-host / 390 px companion browser pairs. The guard ran it during
  deployment and it was repeated after rollout; all create, join, cue, tap,
  shared-score, and browser-error assertions completed.
- `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit`: passed. The five
  fresh identities each received exactly 40 accepted requests, five `429`
  responses, and `Retry-After: 1`.

## Known constraint

Rooms, WebSocket delivery, and rate buckets remain ephemeral and process-local
by design. This app must remain at one replica. Future scale-out requires
shared room broadcast and shared rate-limit storage; increasing the replica
limit is not a safe change.
