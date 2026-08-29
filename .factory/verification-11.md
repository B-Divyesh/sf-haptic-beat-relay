# Independent verification 11 — FAIL

- **Work order:** `haptic-beat-relay-verify-11`
- **Candidate commit:** `26b81ef9679e3f8b2d7a62338a7113d397ca37ed`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 11:59 UTC

## Decision

**FAIL — release blocked.** The candidate source builds and passes its complete
local test suite, and the deployed code bytes identify as the candidate. The
live Container App does not match the candidate's required singleton runtime
contract, however. It is configured for up to three replicas and had two
replicas running during this verification. The main create-and-join flow failed
immediately with `room_not_found`, a host WebSocket upgrade returned 404, and
five fresh rate-limit checks admitted all 45 requests instead of limiting the
client after 40.

This is fresh evidence of an active production failure, not a historical or
source-only concern.

## Mandatory first checks

### First-read test — PASS

A cold live visit says **“Send every beat to a friend.”** It names **friends and
rhythm-game makers** as the audience and says they receive tactile cues and
shared timing without an account. The primary action is **“Try it with sample
data”**, followed by **“A paired sample round opens now.”** All three answers —
what it does, who it is for, and what to click — are visible in the first 390 px
mobile viewport and on desktop.

The action opens `/demo` in one click. The populated demo shows room `DEMO24`,
companion Sam, 104 BPM, a practice loop, and past scores under the persistent
“Demo — sample data, nothing is saved” banner. A live 12-second sample completed
with 21 returned taps and 89% accuracy; Reset demo restored the seeded 86%
score. It made no API request and used no localStorage, sessionStorage, or
IndexedDB.

### Claims gate — FAIL

After `npm ci`, every exact command in `.factory/claims.json` was run before
broader QA. The first manifest pass produced 13 passing entries and one failure.
The rate-limit command initially observed the claimed 40 successes and five
`429` responses, but five fresh repetitions later admitted all 45 requests.
Because the claim is not reliably true, its final result is FAIL.

| Claim | Result | Evidence |
| --- | --- | --- |
| `demo-sandbox` | PASS | Desktop and 390 px projects started, completed, and reset the isolated sample. |
| `sample-duration` | PASS | Both projects observed completion after 12 seconds. |
| `local-audio` | PASS | The marked audio fixture was never sent. |
| `no-third-party` | PASS | Claim test and live demo capture contained only same-origin requests. |
| `no-account` | PASS | A room was created without sign-in. |
| `free-use` | PASS | No purchase or payment gate appeared. |
| `shared-score` | PASS locally | Two local contexts received a cue, returned a tap, and agreed on the score. The equivalent live flow is broken by the deployment defect below. |
| `ephemeral-rooms` | PASS | TTL/restart Rust claim passed. An actual release-process restart also made a previously created room return 404. |
| `rate-limit` | **FAIL live** | Initial exact run: 40 accepted, five 429, `Retry-After: 1`. Five subsequent fresh exact runs: 45 accepted and zero limited each time. |
| `health` | PASS | `/health` returned `status: ok` and the candidate SHA live. |
| `connection-required` | PASS | Offline room creation showed actionable reload guidance. |
| `visual-cue` | PASS | The vibration-unavailable companion received the cue state. |
| `real-round-duration` | PASS | Chromium kept the round active at 59 seconds and completed it at 60 seconds; the duplicate mobile project is intentionally skipped. |
| `singleton-deployment` | **FAIL** | `npm run test:live-topology` got ingress `Auto`, where the contract requires `http`. Read-only follow-up also found max three and two running replicas. |

Any failed claim is release-blocking.

## Release-blocking defect

### Critical — process-local relay is running on multiple replicas

Read-only Azure inspection found:

- active revision mode: `Single`;
- active revision: `sf-haptic-beat-relay--0000018`, 100% traffic;
- ingress transport: **`Auto`**, not required `http`;
- application/revision scale: `minReplicas: 1`, **`maxReplicas: 3`**;
- **two** replicas in `Running` state.

The candidate intentionally stores rooms, WebSocket broadcast channels, and
rate buckets in each process. Its checked-in deployment contract requires HTTP
ingress and min/max one for that reason. The invalid live topology caused three
independent observable failures:

1. `RELAY_ROUNDS=30 npm run test:live-relay` failed on API room 1: create
   returned code `EJUTHT`, then the fresh companion join returned 404
   `room_not_found`.
2. A separate live desktop route scan created room `7BZSKD`, after which the
   host WebSocket handshake returned HTTP 404 and logged a console error.
3. Five fresh executions of `npm run test:live-rate-limit` each admitted all
   45 requests from one client. The documented allowance is exactly 40 requests
   per second followed by 429 responses with `Retry-After: 1`.

This breaks the real job-to-be-done and the mandatory server-side rate limit.

## Candidate and deployment identity

The deployed application code matches the candidate:

- `/health`: `26b81ef9679e3f8b2d7a62338a7113d397ca37ed`;
- JS `index-C0xTH8r-.js`: local/live SHA-256
  `8dc97d9d720d52121f4d0dabcca004af81be92f98871a033bcb175503f94dd4e`;
- CSS `index-Dv3subRE.css`: local/live SHA-256
  `75f30853abea59ac8abbd47cba9705f22ae575f7ea21aa4cf28cf4d587398e87`;
- generated production `sw.js`: local/live SHA-256
  `dd8381ccad961f6b5e1947e90d60f3c51f7b8b5442d56de3a88b840944d319a0`;
- live and local production `index.html`, manifest, robots, sitemap, and favicon
  also matched byte-for-byte.

The live runtime configuration does **not** match
`deploy/containerapp.json`, so deployment identity is only partially valid.

## Local build and test gates — PASS

- `npm ci`: passed; 59 locked packages installed and 0 vulnerabilities.
- `npm test`: passed — 3 Vitest tests, release and deployment contracts,
  10 Rust tests, clean-entrypoint regression, and 34 Playwright tests with two
  intentional project skips.
- `npm run build`: passed and produced `frontend/dist/`.
- `cargo fmt --all -- --check`: passed.
- `cargo clippy --all-targets --all-features --locked -- -D warnings`: passed.
- `cargo build --release --locked`: passed. A second build with the candidate
  `BUILD_SHA` also passed.
- There is no separate lint script; strict Clippy and TypeScript `--noEmit` are
  the available static checks.
- No Docker-compatible executable is installed in this verifier container, so
  the image could not be rebuilt locally. The two production build stages were
  run directly. The Dockerfile was inspected: multi-stage, `rust:1-slim`,
  locked build, non-root UID 10001, default `PORT=8080`, and build-arg identity.

The release binary started with an empty environment on default port 8080 and
reported that no secrets are required. A 100-request concurrent local smoke
from 100 client identities returned 100 HTTP 200 responses in 184 ms. Local
browser rounds at both 60 and 180 BPM connected, relayed a cue and tap, and
showed identical host/companion scores. Invalid short codes returned 400 with
recovery text; a duplicate companion returned 409; non-audio input was rejected.

## Accessibility and interaction — PASS apart from live relay errors

- Live desktop and 390 px scans covered `/`, `/demo`, `/host`, `/join`,
  `/privacy`, `/terms`, and the 404 screen. Every route had one `h1`, one
  `main`, a useful route title, no horizontal overflow, and zero Axe serious or
  critical findings.
- At 200% text on 390 px, every route retained zero horizontal overflow. All
  visible links, buttons, and inputs measured at least 44×44 CSS px.
- Keyboard-only checks reached the skip link first; its focus indicator was a
  visible 3 px cyan outline. Enter activated it. Keyboard activation of the
  demo route focused the new `h1`. Invalid `A2!` input announced the six-
  character error and returned focus to the input.
- With reduced motion enabled, the page matched the media query and reduced
  animation/transition duration to 0.01 ms.
- Landing and demo produced no console/page errors. `/host` can produce a 404
  WebSocket console error because of the critical topology defect.

## Privacy, network, headers, and routes — PASS

- The complete live 12-second demo made same-origin requests only and no API
  request. There were no third-party fonts, scripts, analytics, or trackers.
- Response headers include a self-only CSP with `frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin`.
- HTML, health, and service worker responses are `no-cache`; hashed JS/CSS are
  `public, max-age=31536000, immutable`; art is cached for one day.
- Every discovered internal route returned its intended status; all ordinary
  links and the external Sociobot link returned 200. Unknown routes return an
  actual HTTP 404 with the designed recovery screen.
- No sign-in exists, so the Entra External ID requirement is not applicable.

## Performance and PWA — PASS

Lighthouse 13.4.1 mobile results on the live landing page:

- performance 100;
- accessibility 100;
- best practices 100;
- SEO 100;
- FCP 0.9 s, LCP 1.4 s, TBT 90 ms, CLS 0, total transfer 163 KiB.

The clean build contains 23.16 KB JS raw / 7.87 KB gzip and 15.59 KB CSS raw /
4.22 KB gzip. The mobile hero is 26.19 KB. All are within the contract budgets.

The service worker registered and updated without a waiting worker, removed a
seeded stale cache during activation, and controlled the page. After the
ordinary HTTP cache was cleared and the browser went offline, `/demo` reloaded
with HTTP 200 and a usable sample action.

## Required repair and retest

1. Apply the candidate deployment contract to the actual Container App:
   transport `http`, `minReplicas: 1`, `maxReplicas: 1`.
2. Wait until Azure reports exactly one running replica.
3. Require `npm run test:live-topology` to pass.
4. Require `RELAY_ROUNDS=30 npm run test:live-relay` to pass all API and browser
   rounds.
5. Repeat `npm run test:live-rate-limit` with multiple fresh client identities;
   every run must return exactly 40 successes and five 429 responses with
   `Retry-After: 1`.
6. Rerun every command in `.factory/claims.json` before release.
