# Independent verification 4 — FAIL

**Work order:** `haptic-beat-relay-verify-4`  
**Candidate:** `5c7c5ef6b9c850694d092579a6e7e66f571e8ae5`  
**URL:** <https://haptic-beat-relay.sociobot.in>  
**Verified:** 2026-08-29

## Result

**FAIL.** The deployed backend's in-memory room state is split across live
replicas, making the core host → companion join unreliable. This is a P0
release blocker even though the source suite and all claims pass locally.

## Required claim gate — PASS

`.factory/claims.json` exists. From a clean checkout after `npm ci`, I ran
every declared command exactly. All passed.

| Claim | Result | Evidence |
| --- | --- | --- |
| demo-sandbox | PASS | Browser claim passed on Chromium and 390 px mobile. |
| sample-duration | PASS | The seeded round stayed active then completed after 12 seconds. |
| local-audio | PASS | Marked fixture bytes did not appear in a request. |
| no-third-party | PASS | Claim captured only same-origin requests. |
| no-account | PASS | Host room opened with no sign-in. |
| free-use | PASS | No purchase/payment gate appeared. |
| shared-score | PASS | Two contexts relayed a tap and shared score locally. |
| ephemeral-rooms | PASS | Rust test proved TTL eviction and restart loss. |
| rate-limit | PASS | Exactly 40 accepted; five 429s carried `Retry-After: 1`. |
| health | PASS | `/health` exposed a build SHA. |
| connection-required | PASS | Offline host creation showed recovery copy. |
| visual-cue | PASS | Vibration-unavailable companion received visual cue state. |

## Cold first-read — PASS

The live first screen answers all three required questions in plain language:

- It does: “Send every beat to a friend.”
- It is for: “friends and rhythm-game makers” needing tactile cues and shared
  timing without an account.
- First click: **Try it with sample data**, explained beside the action as “A
  paired sample round opens now.”

The action opens `/demo` in one click and displays the persistent “Demo —
sample data, nothing is saved” banner with reset/start-real controls.

## Production mismatch / P0 evidence

`GET /health` returned the requested candidate SHA. Local production build
assets also byte-match live `/assets/index-ChbPiOug.js` and
`/assets/index-DssFcfwD.css`, so this is not stale frontend deployment.

Nevertheless, room creation and joining are not consistently served by the
same in-memory process:

1. One live room `XNZF3B` was created.
2. Ten immediate joins using the same forwarded client identity returned
   statuses: **404, 200, 404, 409, 404, 409, 404, 409, 404, 409**.
3. `200` proves one process stored the room; `409` proves that same process
   retained its one companion. The alternating `404 room_not_found` responses
   can only come from another process lacking that state.
4. A separate 30 fresh room create → first join sample produced **30/30 404**.

This violates the researched smallest useful product: a host cannot reliably
have a second device join by its six-character code. The source has an
in-process `HashMap` room store, so the deployment must be singleton or state
must become shared. Repair the deployment/configuration rather than masking
this with a retry message, then redeploy and rerun cross-replica verification.

One fresh browser host/companion attempt did complete (`1 returned tap.`, 8%
on both pages), which demonstrates intermittent success but does not cure the
failure rate. The live web UI's normal successful run had no console or page
errors.

## Local quality gates — PASS

- `npm ci`: PASS (59 packages, 0 audit vulnerabilities)
- `npm test`: PASS (3 Vitest; release-contract test; 5 Rust tests; clean
  browser entry-point; 27 Playwright passes, 1 deliberate skip)
- `npm run build`: PASS
- `cargo fmt --all -- --check`: PASS
- `cargo clippy --all-targets --all-features --locked -- -D warnings`: PASS
- `cargo build --release --locked`: PASS
- `git diff --check`: PASS

## Live UI, privacy, accessibility, and performance — PASS except P0 above

- Desktop and 390 px checks covered `/`, `/demo`, `/host`, `/join`, `/privacy`,
  `/terms`, and an unknown route. Routes had one h1, useful titles, 0 px
  horizontal overflow including at 200% text, and no visible target below
  44 px. The missing route returned HTTP 404.
- Axe found no serious/critical issues on those route/viewport combinations.
  Keyboard skip navigation and invalid-code error focus worked. Reduced motion
  reduced transitions/animations to `0.01ms`.
- A service-worker-controlled `/demo` reloaded offline with its sample heading
  and start button after an online visit. All landing/demo request logging was
  same-origin; no third-party runtime request was observed.
- Response headers supplied CSP (`frame-ancestors 'none'`),
  `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin`. HTML was `no-cache`;
  hashed assets were `public, max-age=31536000, immutable`.
- JS is 23,162 bytes raw / 7.85 KB gzip; CSS 15,541 bytes raw / 4.20 KB gzip.
  This is comfortably within the static bundle budgets.
- All visible site links returned HTTP 200 (or the explicit mailto link).

## Backend allowance

The required request-limit test on live `POST /api/rooms` used one client
identity and 45 concurrent requests: **40 × 200**, **5 × 429**, each limited
response carrying **`Retry-After: 1`**. Observed allowance: **40 requests per
second**. Health is appropriately exempt.

## Required repair / retest

Configure the deployed process-local implementation for one live replica, or
implement a shared ephemeral room/message layer appropriate for multiple
replicas. Then prove at least 30 repeated create → first-join attempts from
separate connections all return 200, followed by a second-join 409 for each,
and complete a two-browser host/companion round. Recheck the deployment SHA,
claims, privacy log, PWA offline reload, accessibility and rate limit.
