# Independent verification 17 — FAIL

- **Work order:** `haptic-beat-relay-verify-17`
- **Candidate/source commit:** `f81c8daf05f9f1c4fc485cc7a80742df77dbf47f`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 UTC

## Decision

**FAIL — release blocked.** The public deployment identifies as the requested candidate and its frontend assets byte-match a fresh local production build. However, fresh live checks reproduce the deployment-only split-process failure: a room created by one request immediately returned `404 room_not_found` to its companion join request, and a single client was allowed all 45 requests rather than the documented 40. This breaks the core host/companion job and the documented rate-limit boundary.

## Mandatory first checks

### First-read test — PASS

A cold desktop visit showed **“Send every beat to a friend.”** It says it is for **“friends and rhythm-game makers”** needing tactile cues and shared timing without an account. The visible first action is **“Try it with sample data”**, followed by **“A paired sample round opens now.”** It plainly answers what the product does, who it is for, and what to click first, with the required one-click demo.

### Claims gate — FAIL

From this clean checkout I ran `npm ci` and every exact command listed in `.factory/claims.json`; browser commands use the product's `/demo` entry point. A failing listed claim is release-blocking.

| Claim | Result | Fresh evidence |
| --- | --- | --- |
| `demo-sandbox` | PASS | Exact browser command passed in desktop and 390 px projects; demo start/reset completed. |
| `sample-duration` | PASS | Exact browser command passed; both projects measured the seeded 12-second round. |
| `local-audio` | PASS | Exact browser command passed; marked fixture bytes were not sent. |
| `no-third-party` | PASS | Exact browser command passed; request capture allowed only product origin. |
| `no-account` | PASS | Exact browser command passed; no sign-in step. |
| `free-use` | PASS | Exact browser command passed; no payment/purchase gate. |
| `shared-score` | PASS locally | Exact two-context browser command passed for cue, returned tap, and shared score. |
| `live-relay` | **FAIL** | `RELAY_ROUNDS=30 npm run test:live-relay` failed on API room 1: create returned 200, immediate join for `ZDXED6` returned 404 `room_not_found`. |
| `ephemeral-rooms` | PASS | Exact Cargo TTL/restart claim passed. |
| `rate-limit` | **FAIL** | `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` failed on its first fresh identity: **45**, not exactly 40, requests were accepted. |
| `health` | PASS | Exact browser health claim passed; direct live `/health` returned the candidate SHA. |
| `connection-required` | PASS | Exact browser command passed; offline real-room creation gives recovery guidance. |
| `visual-cue` | PASS locally | Exact browser command passed with vibration unavailable. |
| `haptic-output` | PASS locally | Exact browser command passed with phone/controller haptic APIs stubbed. |
| `real-round-duration` | PASS locally | Exact browser command passed; desktop measured 60 seconds (mobile intentionally skipped by this test). |
| `singleton-deployment` | **FAIL** | `npm run test:live-topology` failed: Azure ingress transport is `auto`, expected `http`. |

## Release-blocking defects

### Critical — live rooms are split between three process-local replicas

Read-only Azure inspection found one active revision, `sf-haptic-beat-relay--0000024`, receiving 100% traffic, but it is the generic short-image deployment:

- ingress transport: **Auto**, not required HTTP;
- scale range: **min 1 / max 3**, not 1 / 1;
- running replicas: **3**;
- image: `sociobotregistry.azurecr.io/sf-haptic-beat-relay:f81c8daf05f9`, not the required full immutable SHA tag or guarded revision suffix.

The backend deliberately holds room state, WebSocket subscribers, and rate buckets in process-local memory. The failed create → immediate join reproduced the user impact: a friend cannot reliably enter the host's six-character room, so the haptic round cannot start.

### High — the live per-client allowance is not enforced

The product documents exactly 40 room API requests per client per second, then five 429 responses with `Retry-After: 1` for the 45-request burst. Fresh live verification admitted **45/45** requests for `198.51.100.207`; it never reached the required rejection. Multiple replicas each have their own in-memory limiter, explaining the observed result.

## Candidate/live identity

`GET /health` returned:

```json
{"build_sha":"f81c8daf05f9f1c4fc485cc7a80742df77dbf47f","status":"ok"}
```

Fresh local production output matches the deployed hashed assets byte for byte:

- `index-DEGZqJFt.js`: `dbddb8dcd88a7d77517153f3e1d6dede1bcbe65385cb5ea562eb74bc5e7c26d3`
- `index-Dv3subRE.css`: `75f30853abea59ac8abbd47cba9705f22ae575f7ea21aa4cf28cf4d587398e87`

This rules out a stale frontend or unidentifiable deployment; the failed runtime topology is serving this candidate.

## Local quality gates — PASS

- `npm ci`: passed; 59 packages installed, zero vulnerabilities reported.
- `npm test`: passed — 3 Vitest tests, release/deployment contract checks, 10 Rust tests, clean browser-entrypoint regression, and the desktop/390 px Playwright suite.
- `npm run build`: passed; JS is 23.16 kB raw / 7.84 kB gzip and CSS 15.59 kB raw / 4.21 kB gzip.
- `cargo fmt --all -- --check`, locked strict Clippy, and `BUILD_SHA=f81c8daf05f9f1c4fc485cc7a80742df77dbf47f cargo build --release --locked` passed.
- With only `PORT=18080` set, the release binary started and `/health` returned the supplied build SHA; startup logged `PORT supplied; no secrets required`.
- This is a web-with-backend product, not a library/CLI; no consumer-package check applies. Docker is unavailable in this verifier container, so no local image build/run was possible.

## Product, privacy, accessibility, and HTTP checks

- Fresh Playwright scans of `/`, `/demo`, `/privacy`, `/terms`, `/join`, and `/404` at 1440 px and 390 px found zero Axe serious or critical violations, one `h1` and one `main` per page, no horizontal overflow, and no normal-route console/page errors. The expected HTTP 404 document logs its failed resource.
- Fresh `/demo` start/reset capture made four same-origin static requests only; it made no API request and left localStorage and sessionStorage empty. The persistent banner says `Demo — sample data, nothing is saved`; reduced-motion animation durations computed to `0.00001s`.
- Cold landing and normal routes requested only the product origin; no analytics, trackers, third-party scripts/fonts, payments, or sign-in traffic was observed. There is no sign-in path, so Entra configuration does not apply.
- Response headers include a self-only CSP with response-header `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. HTML and `sw.js` are `no-cache`; hashed JS is immutable for one year. Landing internal links returned 200; an unknown route returned 404.
- Invalid input recovery works: `POST /api/rooms/A2/join` returned 400 with the six-character recovery message; an unknown six-character room returned 404 with the room-not-open recovery message. The local browser keyboard suite passed skip navigation, visible focus, route focus, and invalid-code error announcement coverage.

## Required repair and retest

1. Deploy the actual Container App through the guarded path and verify live: Single revisions, HTTP ingress, min/max 1/1, one running replica, full immutable image tag, and SHA-derived revision suffix.
2. Do not scale this implementation beyond one replica unless rooms, WebSocket broadcast, and rate buckets move to shared services.
3. Re-run every claim, especially `npm run test:live-topology`, `RELAY_ROUNDS=30 npm run test:live-relay`, and `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit`. The observed allowance must become exactly **40 successes**, then **five 429 responses with `Retry-After: 1`** per fresh client.

