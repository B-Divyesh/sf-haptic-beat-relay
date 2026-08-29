# Haptic Beat Relay — repair 8 handoff

## Status: repaired, verified, and deployed

Independent verification 8 found that the deployed Container App ignored the
checked-in singleton configuration. The service keeps rooms, WebSocket relay
channels, and client rate counters in process memory, so `Auto` ingress and a
maximum of three replicas split the core relay state. The repair deploys and
asserts the intended one-process boundary without changing the researched job,
the account-free flow, the demo, or the container deployment class.

## Reproduction and root cause

Before repair, `RELAY_EXPECTED_SHA=c181749f6b241078bda307e01464d8584a627c21 npm run test:live-topology`
failed with `actual: 'auto', expected: 'http'`. Read-only Azure state was
`activeRevisionsMode=Single`, `transport=Auto`, `minReplicas=1`, and
`maxReplicas=3`.

The existing separate-process WebSocket regression reproduces a room created
in one process returning a `404` upgrade in another. A new Rust regression
reproduces the companion rate failure: alternating 90 requests from one
forwarded identity between two independent process states admits exactly 80
and only then returns 10 `429` responses with `Retry-After: 1`.

## Repair

- `scripts/deploy-containerapp.sh` is the enforced deployment path. It builds
  the supplied source SHA, sets single active-revision mode, explicitly sets
  HTTP ingress, sets minimum and maximum replicas to one, and fails unless the
  live active revision has one running replica and min/max one.
- The checked-in `deploy/containerapp.json` remains the matching desired
  topology: `transport: http`, `minReplicas: 1`, and `maxReplicas: 1`.
- `scripts/verify-live-rate-limit.mjs` is a production response-policy
  regression. It sends a new 45-request burst for one forwarded identity and
  requires exactly 40 successes plus five `429` responses, all with
  `Retry-After: 1`. The public rate-limit claim now runs this live check.
- The deployed live relay probe creates fresh browser contexts for every round:
  a desktop host and a 390 px mobile companion create, join, connect by
  WebSocket, start, cue, tap, and agree on the score.

## Verification evidence

Completed after a clean `npm ci` on 2026-08-29 UTC:

- `npm ci`: 60 packages audited, 0 vulnerabilities.
- `npm test`: 3 Vitest tests, 10 Rust tests, the clean browser-entrypoint
  regression, and 34 Playwright tests passed; 2 intentional project-specific
  skips. It covered desktop and 390 px mobile, keyboard skip navigation and
  form recovery, serious/critical Axe scans, 200% text, 44 px touch targets,
  privacy request capture, local audio containment, PWA/service-worker offline
  reload, and the measured 60-second real round.
- `npm run build`: TypeScript no-emit and Vite production build passed. The
  built assets are 23.16 KB JavaScript raw / 7.85 KB gzip and 15.59 KB CSS raw
  / 4.21 KB gzip.
- `cargo fmt --all -- --check`, `cargo clippy --all-targets --all-features
  --locked -- -D warnings`, and `cargo build --release --locked` passed. The
  locked multi-stage ACR container build passed and runs as non-root on `PORT`.
- The post-deploy topology assertion reported one active revision, one running
  replica, min/max replicas `1/1`, HTTP ingress, and `/health` equal to the
  deployed Git SHA.
- The live response-policy probe returned `accepted: 40`, `limited: 5`, and
  `retryAfter: "1"` for its fresh 45-request burst.
- `RELAY_ROUNDS=30 npm run test:live-relay` passed `30/30` fresh
  desktop-host plus 390 px-companion WebSocket rounds with matching scores and
  no browser HTTP/WebSocket faults.

Run the relevant checks from a clean checkout:

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

## Deployment and remaining work

The production deployment is the root multi-stage `Dockerfile` served by Axum
on port 8080. Deploy with:

```sh
sh scripts/deploy-containerapp.sh "$(git rev-parse HEAD)"
```

Package/consumer testing does not apply: this is a web service, not a
published package. No release-blocking gaps remain. Do not increase replicas
or allow another active revision until room, WebSocket, and rate-limit state
are moved to shared infrastructure.
