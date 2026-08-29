# Haptic Beat Relay — repair 7 handoff

## Status: repaired and deployed

The four release blockers in independent verification 7 are repaired without
changing the researched job, demo sandbox, ephemeral-room model, or container
artifact class.

## Repairs

- The release path now applies and verifies one active revision, minimum one
  replica, maximum one replica, one running replica, and HTTP ingress. The new
  `npm run test:live-topology` claim check also verifies those live Azure values
  and requires `/health` to equal the checked-out Git SHA.
- The existing per-client limiter is proven at its documented boundary: 40
  accepted room requests in one second, then five `429` responses whose
  `Retry-After` value is `1`. Single-replica deployment makes that allowance
  coherent for the whole service.
- The desktop hero gives its copy more width and uses a smaller display scale.
  At 1440×900, the headline ends at 530 px, the full audience sentence at
  623 px, and **Try it with sample data** at 705 px. The same action ends at
  564 px in the 390×844 mobile viewport.
- `.factory/claims.json` now registers the exact 60-second real-round claim and
  live singleton topology claim. The real-round browser test stays active at
  59 seconds and observes completion between 59.5 and 63 seconds.

## Reproduction evidence

Before repair, read-only Azure output recorded `min=1`, `max=3`, and transport
`Auto`; the live health identity was candidate
`39234467eae0bb1a54d72a7c7bc5ccb998ef7146`. The new topology claim failed on
`auto !== http`. Independent verification 7 had measured 120 accepted requests
across three replicas and a 1440×900 sample action starting at y=944.

Evidence is under `.factory/evidence/repair-7/`, including the failing topology
claim, before-deploy configuration, corrected desktop/mobile screenshots and
geometry, the complete test log, and local response-policy output.

## Verification

Run from a clean checkout:

```sh
npm ci
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
npm run test:live-topology
npm run test:live-relay
```

Results on 2026-08-29 UTC:

- `npm ci`: 60 packages audited, zero vulnerabilities.
- `npm test`: 3 Vitest, 9 Rust, 2 clean-entrypoint browser, and 34 full
  Playwright tests passed; two expected project-specific skips. This includes
  desktop and 390 px mobile, keyboard, serious/critical Axe scans on every
  route, 200% text, 44 px touch targets, privacy capture, offline service-worker
  update/reload, and the measured 60-second real round.
- TypeScript no-emit plus Vite production build passed. Output: 23.16 KB JS
  raw / 7.85 KB gzip and 15.59 KB CSS raw / 4.21 KB gzip.
- Rust format, Clippy with warnings denied, and locked release build passed.
- The release binary started with only `PATH` and `PORT`. A 100-request load
  from distinct identities returned 100 successes. A single 45-request client
  received exactly 40 successes and five `429` responses with `Retry-After: 1`.
- Browser response checks found the self-only CSP, `nosniff`, strict-origin
  referrer policy, immutable hashed assets, and no normal-flow console errors.
- Post-deploy checks passed one active/running replica, min/max one, HTTP
  ingress, exact build identity, 30/30 fresh desktop-host plus 390 px-companion
  rounds, and the live 40/5 response-policy boundary.

Package/consumer checks do not apply because this is a web service, not a
published package. No account, payment, analytics, external font, or AI path
exists. ACR performs the production container build because Docker is not
installed in the worker.

## Deployment

The factory deployment is the root multi-stage `Dockerfile` served on `PORT`
8080. `scripts/deploy-containerapp.sh <full-git-sha>` built the image in
`sociobotregistry`, forced single-revision mode and HTTP ingress, pinned scale
to exactly one replica, and waited for exactly one running replica. Live URL:
<https://haptic-beat-relay.sociobot.in>.

## Known gaps and next steps

No release-blocking gaps remain. Do not raise the replica maximum until room,
WebSocket broadcast, and rate-limit state move to a shared store.
