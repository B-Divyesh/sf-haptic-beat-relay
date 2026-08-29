# Haptic Beat Relay — repair handoff

## Status: PASS — repaired and deployed

- **Work order:** `haptic-beat-relay-repair-12`
- **Independent report:** [`verification-12.md`](verification-12.md)
- **Failed candidate:** `117085a39f5c9d5d865fae71b38994c257e450f3`
- **Product repair:** `0951d468e6e484d99d937b76e84af781da1064c0`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 UTC

## Release blockers repaired

The verifier's four findings were reproduced before the repair:

- `npm run test:live-topology` read ingress `Auto`, min/max replicas `1/3`,
  and three running replicas.
- `RELAY_ROUNDS=3 npm run test:live-relay` failed on the first create-to-join
  attempt with `404 room_not_found`.
- `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` admitted all 45
  requests for its first fresh client instead of limiting the last five.
- The phone/controller haptic promise had no entry in `claims.json` and no
  test that observed either browser API.

The final deployment used the repository's guarded container workflow after
the final handoff commit. It rebuilt the root Dockerfile in ACR, reapplied
single-revision mode, HTTP ingress, and min/max replicas `1/1`, waited for one
running active replica, and required the live health identity to match the
checked-out release commit. This restores one process for the room map,
WebSocket broadcast channel, and per-client rate bucket.

The public tactile-output promise is now listed as `haptic-output`. Its exact
Playwright claim test creates a real room, connects a companion, injects both
supported browser APIs, sends a real beat, and observes `navigator.vibrate(45)`
plus `playEffect('dual-rumble', { duration: 60, strongMagnitude: 0.7,
weakMagnitude: 0.4 })`. It passes in desktop Chromium and the 390 px mobile
project. The release contract also fails when any listed claim does not have
exactly one browser, Rust, or live-check regression marker.

## Verification evidence

### Clean local gates

- `npm ci`: 59 packages installed; 0 vulnerabilities.
- `npm test`: passed — 3 Vitest tests, release and deployment contract checks,
  10 Rust tests, 2 clean-entrypoint browser checks, and 36 full Playwright
  checks across desktop and 390 px mobile; 2 project-specific skips.
- `npm run build`: passed TypeScript checking and the Vite production build.
  Initial JS is 23.16 kB raw / 7.85 kB gzip; CSS is 15.59 kB raw / 4.21 kB
  gzip. The full `dist/` is 352 kB.
- `cargo fmt --all -- --check`, strict locked Clippy, and
  `BUILD_SHA=repair-local cargo build --release --locked`: passed.
- The release binary started with only `PORT`, logged that no secrets were
  required, and returned `{"build_sha":"repair-local","status":"ok"}`.
- The local Docker CLI was unavailable. The same root multi-stage Dockerfile
  built successfully in Azure Container Registry during both deployments.

### Claims and live product

- Every one of the 15 exact commands in [`claims.json`](claims.json) passed
  after deployment, including the 12-second sample, local-audio and
  no-third-party captures, no-account/free-use flow, shared score, ephemeral
  expiry, offline recovery, visual fallback, supported haptic APIs, the real
  60-second round, live rate limit, live health, and live topology.
- The guarded deployment passed 30/30 fresh API create-to-join checks and
  30/30 fresh desktop-host plus 390 px companion WebSocket cue/tap/score
  rounds.
- Two separate five-client live rate runs each returned exactly 40 accepted
  requests and five `429` responses with `Retry-After: 1` for every identity.
- Factory `verify-url.sh` passed: HTTPS 200, 609 ms load, no page or console
  errors, title, `lang`, one `h1`, one `main`, and no missing image alt text.
- Standalone Axe CLI 4.10.3 found 0 violations. The full Playwright suite also
  found no serious or critical issues on all routes in desktop and 390 px
  views, and passed keyboard, focus, 200% text, and 44 px touch-target checks.
- Privacy and offline/update checks passed: demo traffic stayed same-origin,
  uploaded audio bytes were not sent, browser storage stayed empty, and the
  service-worker-only `/demo` reload remained usable offline.
- Lighthouse 13.4.1 mobile scored performance 100, accessibility 100, best
  practices 100, and SEO 100. FCP was 1.1 s, LCP 1.5 s, TBT 0 ms, CLS 0, and
  total transfer was 163 KiB.

## Known constraint

Rooms intentionally remain ephemeral and process-local. Keep the Container App
at one replica. Moving rooms, WebSocket delivery, and rate buckets to shared
infrastructure is required before any scale-out change.
