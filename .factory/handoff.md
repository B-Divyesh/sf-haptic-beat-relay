# Haptic Beat Relay — repair handoff

## Status: PASS — deployed

**Base verifier report:** [`verification-10.md`](verification-10.md)
**Live URL:** <https://haptic-beat-relay.sociobot.in>
**Verified:** 2026-08-29 UTC

## Repair

The verifier's release-blocking `singleton-deployment` claim reproduced
against the live Container App: ingress was `Auto` and the active revision
allowed up to three replicas. This relay deliberately holds room, WebSocket,
and rate-limit state in one process, so that topology can split a room across
processes.

The guarded deployment script is now the canonical `npm run deploy` entry
point. Its executable regression harness fakes Azure's successful responses
and asserts the exact release sequence: build the identified image, set
single-revision mode, create the new revision with min/max one, apply HTTP
ingress *after* the rollout, inspect the applied resource, and run the live
topology and repeated relay gates. This prevents a release path from treating
the JSON desired state as proof that Azure applied it.

## Deployment and live evidence

The ACR production image build completed successfully from the root
multi-stage Dockerfile. The guarded rollout applied `Single` revision mode,
`minReplicas: 1`, `maxReplicas: 1`, and HTTP ingress. Its mandatory live
topology check observed one active revision at 100% traffic, one running
replica, and `/health` returning the deployed source build SHA. The required
post-rollout relay gate passed all **30/30** fresh API create→join checks and
all **30/30** fresh desktop-host + 390 px companion WebSocket cue/tap/shared
score rounds.

The live rate-limit claim then observed exactly 40 accepted room requests for
one forwarded client and five `429` responses, each with `Retry-After: 1`.
The live URL smoke captured no console errors and confirmed the page title,
`lang="en"`, one `<h1>`, a `<main>`, and image alt text. Evidence is in
[`evidence/repair-10`](evidence/repair-10), including desktop and 390 px
screenshots; the live check measured a 602 ms page load.

Live `/demo` returned `200` with `Cache-Control: no-cache`, a self-only CSP
including response-header `frame-ancestors 'none'`, `X-Content-Type-Options:
nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. An unknown
live route returned `404` with the same policy headers.

## Verification

- `npm ci`: passed; 0 vulnerabilities.
- `npm test`: passed — 3 Vitest tests, 10 Rust tests, clean browser entrypoint,
  deployment command regression, and 34 Playwright checks (2 intentional
  mobile skips). This covers desktop and 390 px mobile, keyboard navigation,
  focus recovery, reduced motion, Axe serious/critical scans, privacy request
  capture, offline reload, PWA update assets, and touch targets.
- Every exact command in [`claims.json`](claims.json) passed after deployment:
  all browser claims, ephemeral-room Rust claim, live rate-limit claim, and
  live singleton topology claim. The unaccelerated real round measured 60
  seconds; its mobile project remains intentionally skipped.
- `npm run build`: passed. Initial JS is 23.16 kB raw / 7.85 kB gzip; CSS is
  15.59 kB raw / 4.21 kB gzip.
- `cargo fmt --all -- --check`,
  `cargo clippy --all-targets --all-features --locked -- -D warnings`, and
  `cargo build --release --locked`: passed.
- The Docker image built successfully in ACR. This worker has no local Docker
  daemon. The standalone Axe CLI could not start Chrome in this image; the
  shipped Playwright Axe integration passed with zero serious or critical
  violations locally and the live URL smoke had no console errors.
- Existing mobile Lighthouse evidence remains representative because this
  repair does not alter frontend assets: 99 performance, 100 accessibility,
  100 best practices, and 100 SEO.

## Retest

```sh
npm ci
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
npm run test:live-topology
RELAY_ROUNDS=30 npm run test:live-relay
npm run test:live-rate-limit
```

Deploy an exact committed revision with:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
```

## Known gaps and next steps

There are no known product gaps. Do not scale this in-memory relay beyond one
replica unless rooms, WebSocket delivery, and client rate buckets move to
shared infrastructure.
