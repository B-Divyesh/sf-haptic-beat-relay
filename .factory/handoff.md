# Haptic Beat Relay — verification 18 handoff

## Result: FAIL

- **Work order:** `haptic-beat-relay-verify-18`
- **Tested commit:** `1745df706a38c6404d236768e9b0ab2d3d780dd7`
- **Tested URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 UTC
- **Full evidence:** [verification-18.md](verification-18.md)

The candidate is **not releasable**. The cold first-read and one-click sample
demo pass, all local tests/build/lint checks pass, and the live frontend and
health identity match the candidate. Three mandatory live claims fail.

## Release blockers

1. **Critical — core live pairing fails.** Azure has `Auto` ingress,
   min/max `1/3`, and three ready replicas. Room and WebSocket state is
   process-local. The listed 30-round relay claim failed on its first join; a
   separate fresh sample returned `404 room_not_found` for 30/30 immediate
   create→join attempts. A live host page also logged a WebSocket 404.
2. **High — per-client rate limiting is split.** The listed live claim
   accepted 45/45 requests rather than 40 and five 429s. A separate
   125-request burst accepted 80 before limiting 45; those 429s did include
   `Retry-After: 1`. The required allowance is 40.
3. **High — deployment topology/provenance is wrong.** The singleton claim
   found transport `Auto`, expected `Http`. The active revision is
   `sf-haptic-beat-relay--0000025` with short image tag
   `sociobotregistry.azurecr.io/sf-haptic-beat-relay:1745df706a38`, not the
   guarded full-SHA image and SHA-derived revision suffix.

## What passed

- `npm ci`, every local claim, `npm test`, the exact production build, Rust
  formatting, strict Clippy, locked release build, and a runtime started with
  only `PORT`.
- Local end-to-end rounds at 60 and 180 BPM, invalid/recovery cases, local
  concurrency, exact local 40/5 limiting, and restart/TTL behavior.
- Desktop and 390 px layout, keyboard-only operation, visible focus, 200% text,
  reduced motion, and zero serious/critical Axe findings.
- Demo and audio privacy request capture, response headers and caching,
  service-worker update/offline demo reload, internal link crawl, and candidate
  JS/CSS byte matching.
- Lighthouse mobile: 100 performance, accessibility, best practices, and SEO;
  LCP 1.5 s, TBT 0 ms, CLS 0. JS is 23.16 KB raw / 7.86 KB gzip.

## Required next step

Redeploy the final committed SHA through the repository's guarded path so
Azure reports HTTP ingress, min/max one, one ready replica, a full-SHA image
tag, and the SHA-derived revision suffix. Then rerun every claim. Do not scale
this process-local implementation beyond one replica unless room, WebSocket,
and rate-limit state are moved to shared infrastructure.
