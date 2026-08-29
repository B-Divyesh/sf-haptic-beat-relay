# Haptic Beat Relay — independent verification 16 handoff

## Status: FAIL — do not release

- **Candidate:** `01418ef9dab97602e63e621f05eceaf33f9ffe0d`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 UTC
- **Full report:** [`verification-16.md`](verification-16.md)

The candidate builds cleanly, matches the tested live frontend artifacts
byte-for-byte, and passes every local test. It fails three mandatory live
claims because the process-local relay is deployed with `Auto` ingress,
min/max replicas `1/3`, and three running replicas.

## Release blockers

1. **P0 — unreliable two-device relay.** The required 30-round live check lost
   the shared score on round 11 (`0%` companion versus `82%` host). A separate
   cold mobile host received a WebSocket handshake `404`, and a fresh room's
   immediate join returned `404 room_not_found`.
2. **P0 — rate allowance not enforced per client.** The required first
   45-request burst accepted all 45 instead of 40. Larger fresh bursts accepted
   80 or 120 before limiting, depending on replica routing.
3. **P0 — singleton topology claim fails.** Azure reports one active revision
   at 100% traffic, but `transport=Auto`, `min=1`, `max=3`, and three running
   replicas. The contract requires HTTP, `1/1`, and one running replica.

The live `/health` response reports the exact candidate SHA, so this is fresh
evidence against the nominated deployment rather than a stale build.

## Verification summary

- Mandatory first-read and one-click sample gates: PASS at desktop and 390 px.
- `.factory/claims.json`: present; all 16 exact commands run; **13 PASS, 3
  FAIL** (`live-relay`, `rate-limit`, `singleton-deployment`).
- `npm ci`: PASS, 59 packages, zero vulnerabilities.
- `npm test`: PASS; complete local unit, Rust, contract, and desktop/mobile
  browser suite.
- TypeScript/Vite build, Rust locked release build, formatting, and Clippy:
  PASS. Docker CLI was unavailable in the verifier image.
- Single-process local release: 3/3 paired rounds and five exact 40/5 rate
  bursts PASS.
- Privacy, PWA offline reload/update, keyboard, reduced motion, 200% text,
  44 px targets, link crawl, response headers, and caching: PASS apart from
  the live relay error.
- Axe: zero violations on all real routes at desktop and 390 px.
- Lighthouse mobile: 100/100/100/100; LCP 1.8 s, TBT 30 ms, CLS 0.
- Budgets: JS 23,164 bytes, CSS 15,590 bytes, mobile hero 26,186 bytes.

No product code was modified during verification.

## Required next step

Redeploy this exact candidate with HTTP ingress, single-revision mode,
min/max replicas `1/1`, and exactly one running replica. Then require all of:

```sh
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
npm run test:live-topology
```

All three must pass from fresh clients before release.
