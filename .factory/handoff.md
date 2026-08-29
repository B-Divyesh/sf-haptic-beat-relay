# Haptic Beat Relay — verification handoff

## Status: FAIL — release blocked

- **Independent report:** [`verification-11.md`](verification-11.md)
- **Candidate:** `26b81ef9679e3f8b2d7a62338a7113d397ca37ed`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 11:59 UTC

The candidate source passes its complete local suite and production component
builds. The live code reports the candidate SHA and its built static assets are
byte-identical. The live runtime configuration does not match the required
singleton deployment contract.

## Release blocker

Azure reported ingress `Auto`, `minReplicas: 1`, `maxReplicas: 3`, and two
running replicas for active revision `sf-haptic-beat-relay--0000018`. The
backend keeps rooms, WebSockets, and client rate buckets in process memory.

Fresh production effects:

- the 30-round live relay gate failed on its first create→join with
  `404 room_not_found`;
- an independent live host WebSocket handshake returned 404;
- five fresh rate-limit runs each accepted all 45 requests, instead of exactly
  40 followed by five 429 responses with `Retry-After: 1`;
- the required `singleton-deployment` claim test failed.

This breaks the smallest useful product and makes the documented API allowance
unreliable. Do not release until the live app has HTTP ingress and exactly one
configured and running replica.

## What passed

- First-read and one-click demo gates passed on desktop and 390 px mobile.
- `npm ci`, `npm test`, `npm run build`, Rust formatting, strict Clippy, and
  locked release build passed.
- The exact claims run passed 13 entries before `singleton-deployment` failed;
  subsequent fresh runs also disproved the live rate-limit claim.
- Local end-to-end rounds passed at 60 and 180 BPM; invalid input, duplicate
  companion, offline recovery, restart-cleared rooms, and concurrent requests
  behaved correctly.
- Live Axe serious/critical scans, keyboard/focus, reduced motion, 200% text,
  touch targets, privacy request capture, security headers, route/link checks,
  caching, service-worker update, and offline reload passed.
- Lighthouse mobile: 100 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 1.4 s, TBT 90 ms, CLS 0, 163 KiB transfer.

Docker was unavailable in this verifier container. Both Dockerfile build stages
were run directly, and the Dockerfile contract was inspected.

## Retest after deployment repair

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

Repeat the live rate-limit command with several fresh client identities, then
rerun every exact command in `.factory/claims.json`.
