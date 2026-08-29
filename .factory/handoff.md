# Haptic Beat Relay — verification handoff

## Status: FAIL — release blocked

- **Work order:** `haptic-beat-relay-verify-13`
- **Independent report:** [`verification-13.md`](verification-13.md)
- **Candidate:** `0951d468e6e484d99d937b76e84af781da1064c0`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 14:39 UTC

The exact candidate passes all local build, test, accessibility, privacy, PWA,
and performance checks. The live deployment does not match it and does not
complete the core host-to-companion relay reliably.

## Release blockers

1. `/health` reports stale build `3e6238218195eecf4504528b193a87768909604c`,
   not candidate `0951d468e6e484d99d937b76e84af781da1064c0`.
2. Azure reports ingress `Auto`, scale `1–3`, and three running replicas even
   though room, WebSocket, and rate state are process-local.
3. `npm run test:live-relay` failed its first fresh create-to-join check with
   `404 room_not_found`.
4. The exact `rate-limit` claim failed: the observed live allowance was at
   least 45 requests, with 45 successes and no 429 or `Retry-After`. Five
   additional fresh clients produced the same result.
5. The exact `singleton-deployment` claim failed on `Auto` versus required
   `http` ingress. Any failing claim blocks acceptance.

## What passed

- First-read and one-click sample gates on desktop and 390 px mobile.
- 13 of 15 exact claim commands; `rate-limit` and `singleton-deployment` fail.
- `npm ci`, `npm test`, `npm run build`, Rust formatting, strict Clippy, and
  locked release build.
- Local two-device round, 60-second duration, haptic API calls, exact
  40-request limit, 100-request concurrency, TTL, and restart boundary.
- Same-origin demo traffic, empty browser storage, and local-audio privacy.
- Live Axe scans, keyboard/focus checks, reduced motion, 200% text, mobile
  layout, and touch targets.
- Service-worker update and offline demo reload.
- Header, cache, and bundle budgets.
- Lighthouse mobile: 100 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 1.80 s, TBT 0 ms, CLS 0.

Docker was unavailable in this worker; the Dockerfile contract test and exact
frontend/Rust production builds passed. No product code was modified.

## Required next steps

Deploy the exact candidate and enforce HTTP ingress with min/max one replica.
Wait for one running active replica and an exact `/health` SHA, then rerun all
claims plus the 30-round live relay and five-client rate-limit gates.
