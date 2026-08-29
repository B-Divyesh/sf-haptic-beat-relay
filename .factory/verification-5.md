# Independent verification 5 — FAIL

**Work order:** `haptic-beat-relay-verify-5`  
**Candidate:** `7f0403ee6c824a0f36bb20f2fa88fa76090ab488`  
**URL:** <https://haptic-beat-relay.sociobot.in>  
**Verified:** 2026-08-29

## Result

**FAIL — do not release.** The deployed page and `/health` identify as the
candidate, but its essential host-to-companion relay is intermittent in fresh
browser sessions. The HTTP create/join API can succeed while the WebSocket
upgrade is routed to a process that has no room. A companion therefore cannot
reliably receive cues or return a score, which fails the researched core job.

## Required claim gate — PASS

`.factory/claims.json` exists. From this clean checkout I ran every declared
command exactly after `npm ci`; all passed. The browser commands ran through
the product's production build/demo entry point on Chromium and the 390 px
mobile project.

| Claim | Result | Fresh evidence |
| --- | --- | --- |
| demo-sandbox | PASS | `/demo` opened the seeded round, banner, reset, and no browser storage. |
| sample-duration | PASS | Sample remained active and completed after 12 seconds. |
| local-audio | PASS | Marked audio fixture bytes never appeared in outgoing requests. |
| no-third-party | PASS | Claim request capture allowed only same-origin requests. |
| no-account | PASS | A host room opened without sign-in. |
| free-use | PASS | No payment or purchase gate appeared. |
| shared-score | PASS (local) | Two local contexts sent a tap and received the same score. |
| ephemeral-rooms | PASS | Rust TTL/restart claim test passed. |
| rate-limit | PASS | 40 accepted and 5 limited responses had `Retry-After: 1`. |
| health | PASS | `/health` returned a build SHA. |
| connection-required | PASS | Offline creation displayed recovery copy. |
| visual-cue | PASS (local) | Vibration-unavailable companion entered the visual cue state. |

Passing local claims do not outweigh the live P0 below: their web server is
one local process and therefore cannot exercise deployment routing.

## Cold first-read — PASS

Cold live landing text says **“Send every beat to a friend”**, names **friends
and rhythm-game makers**, and has **“Try it with sample data”** beside the
plain result **“A paired sample round opens now.”** The action is one click,
opens `/demo`, and the demo view has the persistent “Demo — sample data,
nothing is saved” banner. It answers what it does, for whom, and what to do
first in plain words.

## Release-blocking defect

### P0 — deployed room state is not consistently available to WebSocket/API requests

Five independent live desktop-host / 390 px-companion attempts were made from
new browser contexts. Results were:

| Attempt | Code | Result |
| --- | --- | --- |
| 1 | `QPZUVK` | Paired successfully. |
| 2 | `3XGPMQ` | Companion: “That room is not open”; browser logged a 404. |
| 3 | `94GAYA` | Paired successfully. |
| 4 | `QL3S8C` | Host WebSocket handshake returned HTTP 404; companion also reported room not open. |
| 5 | `SQXHF3` | Companion reported room not open; browser logged a 404. |

In a separate fresh failure for room `9RAOCZ`, the host WebSocket URL
`wss://haptic-beat-relay.sociobot.in/api/rooms/9RAOCZ/socket?...` failed its
handshake with **HTTP 404**. The host displayed “The relay connection closed.
Reload to make a new room.” The companion displayed “That room is not open.”

This is a **3/5 failure rate** in the smallest useful two-device flow. It is
consistent with the source's process-local `HashMap` room/broadcast state and
the prior verification's replica-routing diagnosis. A checked-in singleton
deployment contract does not prove that the running service honors it, and
REST success cannot validate the separately routed WebSocket request.

For comparison, 30 live REST create → first join → second join flows from
separate request connections were `30/30: 200 → 200 → 409`; this makes the
WebSocket-specific intermittent failure particularly important rather than a
bad code or input. Do not mask it with a retry: deploy one process with sticky
HTTP/WebSocket routing, or use shared ephemeral room state and broadcast
transport, then retest repeated real browser rounds.

## Local quality gates — PASS

Fresh install: `npm ci` installed 59 packages and reported 0 vulnerabilities.

```
npm test                                      PASS
npm run build                                 PASS
cargo fmt --all -- --check                    PASS
cargo clippy --all-targets --all-features --locked -- -D warnings  PASS
cargo build --release --locked                PASS
git diff --check                              PASS
```

`npm test` passed 3 Vitest tests, the singleton deployment-contract check, 5
Rust tests, the clean browser-entrypoint check, and Playwright: **31 passed,
1 intentional desktop-only touch-target skip**. The exact production build
emitted 23,162 B raw / 7.85 KB gzip JavaScript and 15,541 B raw / 4.20 KB gzip
CSS. Docker was unavailable in this verification container, so the Dockerfile
itself could not be built here; the release Rust build did pass.

## Live checks that passed

- `/health` returned exactly
  `{"build_sha":"7f0403ee6c824a0f36bb20f2fa88fa76090ab488","status":"ok"}`.
  SHA-256 of both candidate built assets equalled the live assets:
  JS `c264123e3287ec7d753927f9d1fad3eb7455cc70236fdde418b6bea9314f18ac`;
  CSS `51c4fb1a742cb3550e9714a429bac053f31f588b407313b723093bc3685ffc74`.
  The failure is therefore in the deployed candidate, not a stale frontend.
- A fresh one-client 45-request `POST /api/rooms` burst produced **40 × 200**
  and **5 × 429**. Every 429 included `Retry-After: 1`; observed allowance is
  **40 requests per second**. `/health` is exempt.
- The cold landing and a live `/demo` round made only same-origin requests.
  Demo made zero `/api` requests, used zero `localStorage`/`sessionStorage`
  entries, and raised no console/page errors.
- Live AxeBuilder scans on `/`, `/demo`, `/privacy`, and `/terms` at desktop
  and 390 px found **zero serious or critical** violations. Each had one `h1`
  and one `main`. The repository's complete local browser suite additionally
  passed its route/mobile/200%-text/44-px target checks. The standalone
  `@axe-core/cli` could not start because this container lacks a Chrome binary;
  that is an environment limitation, not a product axe finding.
- Keyboard skip navigation and invalid six-character-code recovery pass in
  the local browser suite. Service worker registration was `activated` and
  controlled the live demo after `registration.update()`; its cached demo
  reloaded offline with heading “Try a tactile beat round” and its start
  control.
- Live response headers include CSP with `frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff`, and strict-origin referrer policy. HTML,
  manifest, and service worker are `no-cache`; hashed JS/CSS are
  `public, max-age=31536000, immutable`. The missing-route response is HTTP
  404.

## Required repair and retest

1. Make the deployed WebSocket upgrade and REST requests reach the same room
   state: actually enforce one live instance/sticky routing, or introduce a
   shared ephemeral room and fan-out layer.
2. Prove the live revision has the candidate SHA and rerun at least 30 fresh
   browser host/companion attempts, not just REST joins. Each must connect,
   receive a cue, tap, and display the shared score with no 404 WebSocket
   handshake or “room not open” state.
3. Retest claims, 40-request rate limiting with `Retry-After`, privacy log,
   offline reload, accessibility, headers, and build-asset identity after the
   deploy change.
