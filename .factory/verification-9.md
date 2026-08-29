# Independent verification 9 — FAIL

**Work order:** `haptic-beat-relay-verify-9`
**Candidate/source commit:** `6eef0fca6ef691c396335cd7d292126037ca4eb3`
**Live URL:** <https://haptic-beat-relay.sociobot.in>
**Verified:** 2026-08-29 UTC

## Decision

**FAIL — release blocked.** The live response and static assets match the candidate, but the deployed, process-local relay cannot reliably keep a host and companion in the same room. In fresh production checks, every one of ten room creates returned `200` and its immediately following companion join returned `404 room_not_found`. A fresh browser host also logged a WebSocket upgrade `404`. This breaks the product's core job.

The required `singleton-deployment` claim also fails: the read-only live topology command reports ingress transport `auto`, while the release contract requires `http`. This is independently release-blocking.

## Required first checks

### First-read test — PASS

A cold live landing-page visit plainly says **“Send every beat to a friend.”** It says it is for friends and rhythm-game makers needing tactile cues and shared timing without an account. The visible first action is **“Try it with sample data”**, followed by **“A paired sample round opens now.”** The first screen therefore states what it does, for whom, and what to click first. It includes the required one-click sample action.

### Claims gate — FAIL

After `npm ci`, I executed every exact command from `.factory/claims.json` before broader QA.

| Claim | Result | Evidence |
| --- | --- | --- |
| `demo-sandbox` | PASS | Desktop and mobile seeded sample start/reset test passed. |
| `sample-duration` | PASS | The 12-second sample completion test passed. |
| `local-audio` | PASS | Marked fixture bytes were not sent. |
| `no-third-party` | PASS | Browser request test passed. |
| `no-account` | PASS | Host flow had no sign-in gate. |
| `free-use` | PASS | Host flow had no purchase or payment gate. |
| `shared-score` | PASS locally | Two contexts connected, cued, tapped, and agreed on score. |
| `ephemeral-rooms` | PASS | Rust TTL and restart test passed. |
| `rate-limit` | PASS | Live fresh-client burst: exactly 40 accepted, then 5 `429`, `Retry-After: 1`. |
| `health` | PASS | Browser health assertion passed. |
| `connection-required` | PASS | Offline creation showed the recovery message. |
| `visual-cue` | PASS locally | Vibration-unavailable companion visually cued. |
| `real-round-duration` | PASS locally | Chromium measured the 60-second round; mobile was intentionally skipped by the project test. |
| `singleton-deployment` | **FAIL** | `npm run test:live-topology`: assertion `actual: 'auto'`, `expected: 'http'`. |

Any failed listed claim blocks release.

## Release-blocking defects

### Critical — live host/companion relay is broken

`npm run test:live-relay` failed at `scripts/verify-live-relay.mjs:41`, waiting ten seconds for the host's disabled start action to become enabled. The companion reported **“That room is not open. Check the code with the host.”**

Independent API reproduction used ten fresh client identities. Each `POST /api/rooms` returned `200` and every immediate `POST /api/rooms/<returned-code>/join` returned `404`. A fresh desktop and 390 px companion browser reproduction recorded the same join `404`; the host remained **“Room open. Waiting for one companion…”**. Separate fresh `/host` visits also emitted WebSocket handshake `404` console errors.

The backend intentionally stores rooms and WebSocket broadcast state in process memory. The observed symptoms are exactly the split-state failure expected when traffic reaches different live processes. The service must run one verified process/replica or move this state to shared storage/relay infrastructure before release.

### High — deployed topology does not meet the singleton contract

The checked-in contract requires `activeRevisionsMode: Single`, HTTP ingress, and min/max replicas of one. The required live topology verification fails before the replica checks because Azure reports ingress `transport: auto`, not `http`. Do not accept the checked-in desired configuration as proof of the deployment's actual configuration.

## Candidate identity

Live `GET /health` returned:

```json
{"build_sha":"6eef0fca6ef691c396335cd7d292126037ca4eb3","status":"ok"}
```

It matches the tested commit. Local and live build assets also match byte-for-byte:

- JS `index-C0xTH8r-.js`: `8dc97d9d720d52121f4d0dabcca004af81be92f98871a033bcb175503f94dd4e`
- CSS `index-Dv3subRE.css`: `75f30853abea59ac8abbd47cba9705f22ae575f7ea21aa4cf28cf4d587398e87`

## Local checks — PASS

- `npm ci`: passed; 0 vulnerabilities reported.
- `npm test`: passed: 3 Vitest tests, 10 Rust tests, clean browser-entrypoint check, and 34 Playwright passes; 2 intentional project-specific skips.
- `npm run build`: passed. Output: JS 23.16 KB raw / 7.85 KB gzip; CSS 15.59 KB raw / 4.21 KB gzip.
- `cargo fmt --all -- --check`, `cargo clippy --all-targets --all-features --locked -- -D warnings`, and `cargo build --release --locked`: passed.
- The release binary started with only `PATH` and `PORT=18080`; `/health` answered and 100 concurrent room creates from distinct forwarded client identities all returned `200`.
- Docker is not installed in this verifier container, so an image build/run could not be executed locally.

## Accessibility, privacy, PWA, and headers

At desktop and 390 px mobile, `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`, `/404`, and an unknown route had `lang=en`, one `h1`, one `main`, useful titles, and no horizontal overflow. Axe found **zero serious or critical violations**. The normal `/host` page-error condition is the critical relay defect above; expected 404-document console messages were otherwise excluded.

Keyboard-only smoke at 390 px found the skip link first with a visible cyan `3px` outline. Invalid join codes announce the error with `role="alert"` and restore input focus. In a reduced-motion context, transition and animation durations computed to `0.01ms`.

Fresh live `/demo` request capture saw only same-origin document, JS, CSS, and favicon requests; it made no API call. It created no localStorage or sessionStorage entries. There are no accounts, payment controls, third-party fonts, analytics, or tracking requests.

Responses include the self-only CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `frame-ancestors 'none'`. HTML/service worker are `no-cache`; hashed JS has `public, max-age=31536000, immutable`. The project browser suite passed its service-worker offline reload test.

## Required repair and retest

1. Correct the actual Container App ingress/topology to the documented singleton boundary, then make `npm run test:live-topology` pass.
2. Verify the correction with `RELAY_ROUNDS=30 npm run test:live-relay`; every fresh desktop-host/390 px-companion round must create, join, cue, tap, and share a score with no HTTP/WebSocket failures.
3. Re-run all commands in `.factory/claims.json`, including the live rate-limit probe. The observed allowance for this verification was 40 room API requests per second, then `429` with `Retry-After: 1`.
