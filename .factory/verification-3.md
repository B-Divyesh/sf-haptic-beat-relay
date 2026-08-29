# Independent verification 3 — FAIL

**Work order:** `haptic-beat-relay-verify-3`  
**Candidate/source commit:** `4909e0c8c7301dee8b8da8150c8d89423a7e5da3`  
**Live URL:** <https://haptic-beat-relay.sociobot.in>  
**Verified:** 2026-08-29

## Decision

**FAIL — release blocked by the checked-in production Dockerfile.** Fresh evidence
shows that the deployed application is the requested candidate and that its core
product flow works. All declared claim commands and all native test/build gates
pass. However, `Dockerfile` uses `FROM rust:1.85-bookworm AS backend-builder`.
The mandatory backend Docker contract requires `FROM rust:1-slim` or
`rust:1-alpine`, explicitly forbids pinning a Rust minor release, and warns that a
minor pin can fail ACR builds as dependencies move. This candidate therefore is
not releasable as submitted.

Docker is not installed in this verifier container, so a local container build
was not possible. This is not the basis for the failure: the Dockerfile itself
plainly violates the required production-build contract. No product code was
modified during verification.

## First-read gate — PASS

A cold, new desktop browser context loaded the live home page successfully with
no page errors or console errors. Its first screen says:

- **What:** “Send every beat to a friend.”
- **For whom:** “For friends and rhythm-game makers who need tactile cues and
  shared timing without an account.”
- **What to click first:** **Try it with sample data**, followed immediately by
  “A paired sample round opens now.”

The required one-click demo is present. `/demo` opens an already paired sample
with Sam, a 104 BPM practice loop, a 12-second round, persistent “Demo — sample
data, nothing is saved” banner, Reset demo, and Start for real.

## Required claims gate — PASS

`.factory/claims.json` exists. From the clean candidate checkout, I ran `npm ci`
(59 packages, 0 vulnerabilities) and then invoked **every test command exactly
as listed** in the file. All completed successfully; browser claims ran in both
Chromium desktop and the 390 px mobile project.

| Claim | Result | Evidence asserted by the listed test |
| --- | --- | --- |
| `demo-sandbox` | PASS | Sample starts, resets, reaches no API route, and leaves local/session storage empty. |
| `sample-duration` | PASS | Sample remains active before 12 seconds and completes after it. |
| `local-audio` | PASS | Marked local audio bytes do not occur in request bodies. |
| `no-third-party` | PASS | Captured requests remain on the product origin. |
| `no-account` | PASS | A real room opens with no sign-in. |
| `free-use` | PASS | No payment/purchase gate appears. |
| `shared-score` | PASS | Two fresh contexts exchange cue and tap and display one score. |
| `ephemeral-rooms` | PASS | Rust test proves scheduled TTL eviction, restart loss, and expiry closure of an open socket. |
| `rate-limit` | PASS | 45-request burst gives exactly 40 successes then five 429s with `Retry-After: 1`. |
| `health` | PASS | `/health` returns `status` and `build_sha`. |
| `connection-required` | PASS | Offline room creation gives a recovery message. |
| `visual-cue` | PASS | A no-vibration companion receives the visual cue state. |

## Live deployment, privacy, and backend checks — PASS

- `GET /health` returned `{"build_sha":"4909e0c8c7301dee8b8da8150c8d89423a7e5da3","status":"ok"}`.
  The live deployment therefore matches the candidate exactly; the previously
  reported deployment-only problem is not reproducible.
- In fresh desktop-host and 390 px companion contexts, a host created room
  `EEDBCH`, the companion joined with its six-character code, the host started a
  180 BPM round, the companion entered its cue state and tapped, and both views
  showed the same shared accuracy value with `1 returned tap.` No console or
  page errors occurred.
- Invalid input (`A2`) kept focus in the code field and announced “The code
  needs six letters and numbers. Check it and try again.” An unknown valid-format
  room showed a clear recovery message. A non-audio upload is rejected.
- A fresh cold-page request log contained only the live origin for document,
  JS, CSS, art, and favicon. The marked-local-audio test confirms its bytes are
  not sent. No analytics, ad/tracker, third-party font/script, account provider,
  or payment route was observed. Sign-in is not used, so the Entra check is not
  applicable.
- Live API rate test, one forwarded client: **40 × 200**, then **5 × 429**, each
  429 with `Retry-After: 1`. The observed allowance is 40 requests per second
  burst. A 100-request concurrent room-create smoke using distinct forwarded
  client identities returned **100 × 200** in 1,481 ms.
- The claimed two-hour memory boundary and restart loss are covered by the
  listed short-TTL Rust regression. The live server correctly reports a
  7,200-second lifetime when opening a room.

## Accessibility, PWA, headers, and budgets — PASS

- Independent axe scans found **zero serious or critical findings** on `/`,
  `/demo`, `/host`, `/join`, `/privacy`, `/terms`, and a 404 route on desktop and
  at 390 px. Each page had one `h1`, one `main`, no horizontal overflow, and no
  undersized visible interactive targets at 390 px.
- Keyboard smoke passed: the skip link receives a visible 3 px focus outline,
  route navigation moves focus to the new heading, Enter submits the join form,
  and validation error recovery restores field focus. Reduced-motion media
  emulation yields `0.01ms` transitions/animations.
- After online service-worker activation, `/demo` remained interactive after an
  offline reload. `registration.update()` left the live worker controlled with
  no waiting worker. `robots.txt`, `sitemap.xml`, manifest, 404 asset, and
  Static Web Apps configuration all return 200.
- HTML responses are `no-cache`; the hashed JS is
  `public, max-age=31536000, immutable`; the 74 KB hero WebP is cached for one
  day. Responses include CSP, `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin`.
- The production Vite output is 23.16 KB raw / 7.85 KB gzip JavaScript and
  15.54 KB raw / 4.20 KB gzip CSS, well below the static bundle budgets.

## Local quality gates — PASS

The following all passed after the clean install:

```sh
npm test
# 3 Vitest tests; 5 Rust tests; clean browser entry-point test (2/2);
# full browser suite: 27 passed, 1 intentional desktop-only skip

cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
npm run build
git diff --check
```

`npm run build` generated `frontend/dist` with the manifest, service worker,
hashed JS, CSS, responsive art, and legal/site metadata assets.

## Defects

### Blocker — Dockerfile violates the mandatory Rust image contract

`Dockerfile:8` pins the backend builder to `rust:1.85-bookworm`. The factory
requires `rust:1-slim` or `rust:1-alpine` and explicitly says never to pin a
minor Rust release, because lockfile dependencies can require newer stable
Rust and ACR builds can then fail. Change that stage to an approved current
stable base, rebuild the image from a source tarball without `.git`, and repeat
the container health smoke with a supplied `BUILD_SHA`.

### No functional product defects found

The candidate resolves the earlier claim-entry, TTL, offline-shell, touch
target, and HTTP-404 findings. The live build identity matches this candidate.
