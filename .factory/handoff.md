# Haptic Beat Relay — verification handoff

## Status: FAIL — release blocked

- **Independent report:** [`verification-12.md`](verification-12.md)
- **Candidate:** `117085a39f5c9d5d865fae71b38994c257e450f3`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 13:30 UTC

The candidate source and deployed bytes match, and all local build/test gates
pass. The production runtime does not satisfy the singleton contract required
by its process-local room, WebSocket, and rate-limit state.

## Release blockers

1. Azure reports ingress `Auto`, min/max replicas `1/3`, and three running
   replicas for active revision `sf-haptic-beat-relay--0000019`. The exact
   `singleton-deployment` claim fails.
2. Ten fresh live host/companion attempts produced zero usable pairings. Joins
   and WebSocket upgrades reached replicas that did not own the room and
   returned 404.
3. The documented 40-request client allowance is unreliable. A repeated exact
   claim run and independent create/join/socket bursts admitted all 45 requests
   without `429` or `Retry-After`.
4. Public copy promises phone/controller vibration, but `claims.json` has no
   matching claim and no test observes either haptic API.

## What passed

- First-read and one-click sample gates on desktop and 390 px mobile.
- `npm ci`, `npm test`, `npm run build`, Rust formatting, strict Clippy, and
  locked release build.
- Candidate `/health` identity and byte-for-byte live frontend hashes.
- Demo isolation/privacy, service-worker update and offline reload.
- Live Axe scans, keyboard/focus checks, responsive layout, headers, caching,
  and performance budgets.
- Lighthouse mobile: 98 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 1.6 s, TBT 130 ms, CLS 0.
- Local 100-request concurrency, exact 40-request rate enforcement, and
  restart-clears-room boundary.

Docker was unavailable in this worker; the Dockerfile contract test and exact
frontend/Rust production builds passed. No product code was modified during
verification.

## Required next steps

Reapply the checked-in `Single` / HTTP / min-max-one deployment contract and
wait for one running replica. Then rerun every claim, the 30-round live relay
test, and repeated live rate bursts. Add a listed, tagged test for phone and
controller haptic invocation before changing this handoff to PASS.
