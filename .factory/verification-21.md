# Independent verification 21 — FAIL

- **Candidate/source commit:** `982bf7a19a5aef658168e8ee3a5a22459f28a036`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verification date:** 2026-08-30 UTC

## Decision

**FAIL.** The candidate source is healthy and the deployed `/health` endpoint reports the exact candidate SHA, but the live deployment breaks the required singleton topology for its deliberately process-local room, WebSocket, and rate-limit state. Its exact `singleton-deployment` claim fails: Azure reports Auto ingress and a 1–3 replica scale range instead of HTTP ingress and exactly one replica. The required live rate-limit claim also failed once during this fresh verification (45/45 requests accepted); it passed on immediate repeat, which is not reliable enforcement of the documented allowance.

## Required preliminary checks

`.factory/claims.json` is present with 16 claims. `npm ci` completed from this clean checkout (59 packages; 0 vulnerabilities). The local claim-tagged Playwright cases ran against the app's built demo entry point; the initially separate `demo-sandbox` command and the subsequent combined tag invocation selected every remaining locally-run manifest test.

| Claim | Result and evidence |
| --- | --- |
| `demo-sandbox` | PASS — `npm run test:browser -- --grep @claim:demo-sandbox`; desktop/mobile sample starts, completes, resets, and sends no API/storage data. |
| `sample-duration` | PASS — measured 12-second sample on both browser projects. |
| `local-audio` | PASS — marked uploaded audio bytes never left the browser. |
| `no-third-party` | PASS — product test and fresh live request log saw only same-origin requests. |
| `no-account` | PASS — room creation has no sign-in step. |
| `free-use` | PASS — no purchase/payment gate. |
| `shared-score` | PASS — local browser test and fresh live host/friend run observed a returned tap and shared score. |
| `live-relay` | PASS — `RELAY_ROUNDS=30 npm run test:live-relay` exited 0. |
| `ephemeral-rooms` | PASS — `cargo test claim_ephemeral_rooms_evict_after_the_configured_ttl_and_on_restart` passed. |
| `rate-limit` | **FAIL (unstable)** — first required `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` failed at `verify-live-rate-limit.mjs:45`: client `198.51.100.106` received **45** successes, not 40. Immediate repeats passed: the same client and then five new identities each observed 40 × 200, 5 × 429, and `Retry-After: 1`. The documented allowance was therefore observed as both 45 and 40 during this verification; the failure is release-blocking. |
| `health` | PASS — health returns `status: ok` and a build SHA. |
| `connection-required` | PASS — offline real-room flow gives recovery guidance. |
| `visual-cue` | PASS — visual cue fallback test passed. |
| `haptic-output` | PASS — `vibrate(45)` and dual-rumble stub observed. |
| `real-round-duration` | PASS — active at 59 seconds, complete at 60 seconds. |
| `singleton-deployment` | **FAIL** — `npm run test:live-topology`: expected `http`, observed `auto`. |

Any failing manifest claim is release-blocking.

## First-read test — PASS

A cold desktop visit plainly says **“Send every beat to a friend.”** It says it is for **“friends and rhythm-game makers”** needing tactile cues and shared timing, and gives the first action **“Try it with sample data”** with the immediate outcome **“A paired sample round opens now.”** The one-click sample has the persistent **“Demo — sample data, nothing is saved”** banner, Reset demo, and Create a real room. Fresh `?demo=1` logging found one origin only and zero local/session storage keys.

## Local quality and functional verification

- `npm test`: PASS — 3 Vitest tests, release/deployment contract checks, 10 Rust tests, clean-browser entry point, and 38 Playwright tests.
- `cargo build --release` and `npm run build`: PASS. Vite emitted 24.30 kB raw / 8.17 kB gzip JS and 17.42 kB / 4.56 kB gzip CSS, below the budget.
- The core normal flow was also exercised freshly against live: a desktop host created `P8NDYX`, a 390 px companion joined it, the host started at 180 BPM, the companion tapped, and the host displayed `1 returned tap.`
- Invalid mobile join input (`A2`) remains focused and announces: “The code needs six letters and numbers. Check it and try again.” Local tests cover valid/invalid messages, expiry/restart, role validation, 60-second timing, and exact local rate-limit boundaries.
- Docker is not installed in this verifier environment (`docker: command not found`), so the Docker runtime command could not be independently executed.

## Live browser, privacy, accessibility, PWA, and HTTP

`GET /health` returned the candidate exactly:

```json
{"build_sha":"982bf7a19a5aef658168e8ee3a5a22459f28a036","status":"ok"}
```

Desktop and 390 px mobile were checked. The mobile demo rendering is recorded in `evidence/verification-21/mobile-demo.png`; desktop landing in `evidence/verification-21/desktop-landing.png`. A live mobile Axe scan found zero serious/critical violations. Keyboard testing reached the skip link first with a visible `3px` outline. The code honours reduced-motion CSS; the complete local browser suite also passes its keyboard, focus, and responsive checks. No console or page errors appeared on the cold live page.

The live request log contained only the site origin (document, self-hosted hashed JS/CSS, art, and favicon), with no third-party runtime requests. Headers include a self-only CSP with `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. HTML and `sw.js` are `no-cache`; hashed JS is `public, max-age=31536000, immutable`. The service worker controlled a reload, an offline `/demo` reload still showed the sample, and `registration.update()` completed with no waiting/installing worker. There is no sign-in flow, so no identity-provider check applies.

## Deployment mismatch and defects

Read-only Azure evidence for `sf-haptic-beat-relay` is:

```json
{
  "activeMode": "Single",
  "ingress": "Auto",
  "min": 1,
  "max": 3,
  "activeRevision": "sf-haptic-beat-relay--0000027",
  "image": "sociobotregistry.azurecr.io/sf-haptic-beat-relay:982bf7a19a5a"
}
```

The committed contract requires `Http`, min/max `1`, a full-SHA immutable image tag, and a SHA-derived revision suffix. The current generic rollout does not meet any of those provenance/topology requirements.

| Severity | Finding | Required resolution |
| --- | --- | --- |
| P0 | Live deployment is not a singleton HTTP relay. | Redeploy the candidate only through the guarded path so Azure uses HTTP ingress, exactly one min/max/running replica, the full SHA image, and SHA-derived revision. Rerun `npm run test:live-topology` and the 30-round live claim. |
| P0 | The documented 40-request allowance was not reliable in fresh evidence. | Treat the one 45-success burst as a production failure. After singleton redeploy, repeat five isolated 45-request bursts and require 40 × 200 plus 5 × 429 with `Retry-After: 1` every time. |
| P2 | Local container execution was unavailable. | Run the documented Docker build/run/health check in an environment with Docker before release. |

No product source code was modified during verification.
