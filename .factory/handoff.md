# Haptic Beat Relay — repair 16 handoff

## Status: ready for guarded deployment

- **Work order:** `haptic-beat-relay-repair-16`
- **Independent failure report:** [`verification-16.md`](verification-16.md)
- **Failed candidate:** `01418ef9dab97602e63e621f05eceaf33f9ffe0d`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Prepared:** 2026-08-29 UTC

## Root cause reproduced

The report's three P0 findings share one runtime cause: rooms, WebSocket
subscriptions, and rate buckets are intentionally process-local, but the
candidate was put live through the generic container rollout instead of the
repository's guarded deployment path.

Before this repair, read-only Azure inspection returned
`activeRevisionsMode=Single`, `transport=Auto`, `minReplicas=1`, and
`maxReplicas=3` for active revision `sf-haptic-beat-relay--0000023`. The active
container image was the generic shortened tag
`sociobotregistry.azurecr.io/sf-haptic-beat-relay:01418ef9dab9`, with no
SHA-derived guarded revision suffix. The exact `npm run test:live-topology`
command failed at `auto !== http`.

That drift is sufficient to reproduce the reported room loss and allowance
failure: once Container Apps starts more than one process, a create, join, or
WebSocket upgrade can reach different room maps and each process grants its own
40-request bucket. Verification 16 captured the resulting 30-round relay loss
and 45/45 request allowance. A one-off burst can pass while the unsafe app is
temporarily idling at one replica; it is not evidence that the configured
`1–3` topology is safe.

## Repair and exact regression coverage

`scripts/verify-live-topology.mjs` now requires all of the following for the
singleton-deployment claim:

- single-revision mode, HTTP ingress, min/max `1/1`, one active 100%-traffic
  revision, and one running replica;
- `/health` to report the expected full build SHA;
- the active container image to use that exact full immutable ACR tag; and
- the active revision name to carry the guarded `r<first-10-SHA>` suffix.

This catches the additional failure mode that affected candidate `01418ef…`:
a generic image rollout can bake the expected SHA into `/health` while silently
reinstating generic ingress and scale defaults. The release contract and
deployment harness now assert the full image tag and guarded suffix. The
harness also continues to reject the exact `Auto` / max-three / three-running
replica state before it can run any live success gate.

## Local verification

- `npm ci`: passed; 59 locked packages installed and zero audit vulnerabilities.
- `npm test`: passed — 3 Vitest tests, release/deployment contract checks, 10
  Rust tests, 2 clean-entry-point browser checks, and 36 desktop/390 px
  Playwright checks; 2 intentionally duplicate project cases skipped.
- `npm run build`: passed. Initial JavaScript is 23.16 kB raw / 7.84 kB gzip;
  CSS is 15.59 kB raw / 4.21 kB gzip.
- `cargo fmt --all -- --check`, locked strict Clippy, and
  `BUILD_SHA=repair16-local cargo build --release --locked`: passed.
- The release binary started with only `PORT=18080`, logged
  `PORT supplied; no secrets required`, and `/health` returned
  `repair16-local`.
- `/opt/fleet/lib/verify-url.sh` passed against that release binary: HTTP 200,
  no console errors, valid title/lang, one `h1`, one `main`, complete image
  alt text, and labeled controls at desktop and 390 px.
- Playwright Axe scans in the complete browser matrix found no serious or
  critical violations on `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`,
  `/404`, and an unknown route at desktop and 390 px. The standalone Axe CLI
  was attempted but cannot start because this worker has no system Chrome
  binary; the preinstalled Playwright Chromium was used by the passing browser
  Axe coverage instead.
- Privacy, local-audio, offline service-worker reload/update, keyboard skip
  navigation, route focus, reduced motion, 200% text, touch targets, response
  policy, cache policy, real 404, and desktop/mobile console checks are covered
  by the passing browser matrix. No package/consumer test applies to this
  `web-with-backend` artifact. Docker CLI is unavailable in this worker;
  the Dockerfile contract and locked frontend/Rust release stages passed.

## Required terminal action

After this handoff and the source changes are committed and pushed, run the
repository-owned `npm run deploy -- <HEAD SHA>` command. It must build the
full-SHA image, apply single-revision HTTP ingress and min/max `1/1`, wait for
one running replica, then pass all three live release gates:

```sh
npm run test:live-topology
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
```

Rooms remain deliberately ephemeral and process-local. A future scale-out
requires shared room broadcast and shared rate-limit storage; it is not safe to
raise the replica limit for this implementation.
