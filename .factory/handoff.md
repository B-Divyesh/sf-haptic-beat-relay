# Haptic Beat Relay — repair handoff

## Status: PASS — singleton container release repaired

- **Work order:** `haptic-beat-relay-repair-20`
- **Release class:** web with backend; Rust/axum serves the Vite build on
  `PORT` (default `8080`).
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Deployment configuration:** [deploy/containerapp.json](../deploy/containerapp.json)

## Release identity

This handoff belongs to the final checked-out candidate, not an earlier
implementation commit. It is deployed only with:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
```

That command refuses a dirty, unpushed candidate or a candidate whose handoff
did not change in `HEAD`. Its ACR build uses the full `HEAD` as the immutable
image tag and the health build identity. Check the active image, revision
suffix, single ready replica, HTTP ingress, and health identity with:

```sh
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
```

## Repair

Independent verification 21 found the live app running the generic container
rollout: Auto ingress and a one-to-three replica range. This product keeps
rooms, WebSocket broadcasts, and rate-limit buckets in process memory. That
topology split the state and let one fresh forwarded client receive 45 accepted
room requests instead of the documented 40.

The finding was reproduced before the repair: `npm run test:live-topology`
stopped at `auto !== http`. A fresh five-client live allowance run happened to
return the expected 40 successes and five retryable limits per client, matching
the verifier's later repeats; it does not make the configured one-to-three
process topology safe. The Rust three-process regression reproduces all 45
accepts, and the new one-process concurrent regression proves the exact limit.

The final candidate is released through the guarded deployment configuration.
It enforces one active revision, HTTP ingress, min/max one replica, a full-SHA
image, and an SHA-derived revision suffix. It waits for one ready process,
then requires the 30-room relay check and five isolated 45-request rate bursts
before a final topology/identity check.

The local limiter now has a regression test for the verifier's exact concurrent
burst: one client receives 40 successes, then five `429` responses, each with
`Retry-After: 1`. A separate release-handoff contract rejects documentation
that cites an older commit as the release candidate, preventing the sequence
that led to this report.

## Regression coverage

- `cargo test regression_p0_concurrent_45_request_burst_has_exactly_40_accepts_and_5_retryable_limits`
  sends the verifier's simultaneous 45-request burst through one process and
  proves the exact `40 × 200`, `5 × 429`, and `Retry-After: 1` boundary.
- `npm run test:deployment-contract` uses a fake Azure CLI to require the
  singleton rollout and rejects Auto ingress, a three-replica scale, an
  unready process, stale identities, and late replacement.
- `npm run test:handoff-contract` rejects a handoff that presents an earlier
  full commit ID as the release candidate and requires the guarded `HEAD`
  deployment and live identity commands above.
- `npm run test:live-topology`, `RELAY_ROUNDS=30 npm run test:live-relay`, and
  `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` are the live release
  gates run by the deployment command.

## Verification

Clean-install and local verification completed from this checkout:

```text
npm ci                                      PASS (59 packages; 0 vulnerabilities)
npm test                                    PASS
npm run build                               PASS
cargo build --release --locked              PASS
sh -n scripts/deploy-containerapp.sh        PASS
git diff --check                            PASS
```

`npm test` covers the Vite unit suite, release and deployment contracts, the
handoff identity contract, Rust integration tests, a clean browser entry point,
and desktop plus 390 px mobile Playwright. Browser coverage includes keyboard
navigation and form-error focus, Axe serious/critical checks, reduced motion,
200% text/no horizontal overflow, offline demo reload and service-worker
update, privacy request recording, real host/friend WebSockets, haptic stubs,
and the 60-second round.

The standalone release-binary smoke check also passed: `/health` returned
`status: ok`; `verify-url.sh` found a title, `lang`, one `h1`, a `main`
landmark, alt text, no unlabeled buttons, and no console errors. The
Playwright Axe integration found no serious or critical issues in either
desktop or 390 px mobile coverage.

## Final live evidence

The guarded release command completed for this handoff's `HEAD`. ACR built the
multi-stage image from the clean source archive, then Azure reported one active
revision with 100% traffic, one running and ready replica, HTTP ingress, and a
full-`HEAD` image tag with an SHA-derived revision suffix. The final `/health`
response returned the same `HEAD` build identity.

- The first and final `test:live-topology` checks both passed.
- `RELAY_ROUNDS=30 npm run test:live-relay` passed 30 fresh API create/join
  pairs and 30 fresh desktop-host/390 px companion WebSocket rounds, each with
  a returned tap and shared score.
- `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` passed five isolated
  clients: each observed exactly 40 `200` responses followed by five `429`
  responses carrying `Retry-After: 1`.
- The deployment command held the revision for its 60-second stability window
  and the final identity/topology check still passed.

The final guarded deployment is also the container build/run check: ACR builds
the multi-stage Dockerfile and Azure starts the immutable image before the live
checks run. Docker is not installed in this worker, so no local Docker command
is available. The product has no account, payment, analytics, AI, or external
identity flow.

## Known limits

- Phone and controller vibration depend on browser and hardware support; the
  visual cue remains available.
- Room, WebSocket, and rate-limit state intentionally disappear after two
  hours or a singleton process restart. This is the documented privacy model.
