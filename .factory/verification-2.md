# Independent verification 2 — FAIL

**Work order:** `haptic-beat-relay-verify-2`  
**Candidate/source commit:** `a3a8726ab0302a00b0af43f3847911ede44e7dc8`  
**Live URL:** <https://haptic-beat-relay.sociobot.in>  
**Verified:** 2026-08-28

## Decision

**FAIL — release blocked.** The repair makes every declared claim command self-contained after `npm ci`, and the live product completes the core two-device relay. Fresh QA nevertheless found three release-level contract failures:

1. The privacy promise that room state lasts **up to two hours** is not enforced for idle rooms or open WebSockets.
2. Published claims are incompletely listed or tested, including the two-hour lifetime itself.
3. The shipped service worker does not cache the built JS/CSS shell. An offline reload from service-worker cache alone renders a blank page.

No product code was modified during verification.

## Required claims gate

`.factory/claims.json` exists. After the required clean dependency install (`npm ci`, 59 packages, 0 vulnerabilities), every listed command was run independently. Each command builds `frontend/dist` itself and passed in desktop Chromium and the 390 px mobile project.

| Claim | Command result | Observable evidence |
| --- | --- | --- |
| `demo-sandbox` | PASS (2/2) | Sample starts and Reset returns the score to 86%. |
| `local-audio` | PASS (2/2) | Marker bytes were absent from all request bodies. |
| `no-third-party` | PASS (2/2) | Captured requests were same-origin. |
| `no-account` | PASS (2/2) | A real room opened without sign-in. |
| `free-use` | PASS (2/2) | No purchase/payment gate appeared. |
| `shared-score` | PASS (2/2) | Two contexts exchanged cues/taps and displayed one score. |
| `ephemeral-rooms` | **Test passes, claim not proved** | It only asserts the server reports `7200`; it does not wait, restart, or verify eviction. Runtime inspection shows the promise is not enforced. |
| `rate-limit` | PASS (2/2) | A 45-request local burst produced 429 and `Retry-After: 1`. |
| `health` | PASS (2/2) | `/health` returned status and a SHA string. |
| `connection-required` | PASS (2/2) | Offline room creation showed recovery copy. |

The clean-entry-point regression also deleted `frontend/dist`, invoked the previously failing claim command, rebuilt the app, and passed twice. The release remains blocked under the claims contract because a passing command must prove the whole claim, not merely an advertised field.

### Claims audit failures

- `@claim:ephemeral-rooms` checks only `expires_in_seconds === 7200`. It does not prove “stays in memory for up to two hours” or “disappears on restart.”
- `@claim:demo-sandbox` starts and resets the sample but does not assert the “nothing is saved” portion or isolate storage/network. Independent QA found no demo API request or browser storage, but the required claim test still omits the promise.
- Published claim-like copy is absent from `claims.json`, including “The screen still flashes each cue when vibration is unavailable” and the quantitative “The sample round lasts 12 seconds.”
- README's quantitative 40-request/first-`X-Forwarded-For` behavior is reduced to a generic rate-limit claim. The declared test accepts any threshold below 45 and never asserts 40 successes followed by limiting.

Each claim ID does occur in exactly one test source. The defect is assertion scope and missing entries, not duplicate tags.

## First-read gate — PASS

The cold live first screen answers all three questions in plain words:

- **What:** “Send every beat to a friend.”
- **For whom:** friends and rhythm-game makers who need tactile cues and shared timing.
- **First click:** **Try it with sample data**, beside “A paired sample round opens now.”

The one-click action opens `/demo`, already paired with Sam and populated with a realistic 104 BPM sample. The banner says “Demo — sample data, nothing is saved” and provides Reset and Start for real.

## Release-blocking defects

### High — the two-hour privacy boundary is not enforced

The live privacy page and README promise room memory for no more than two hours. In `src/lib.rs`, expiration is checked only when another room is created (`rooms.retain`) or when a companion joins. `room_socket` checks the token but not `created_at`, and an established socket session has no TTL timer. Therefore:

- an idle room remains in the map beyond two hours until later qualifying traffic or restart;
- a host with its token can reconnect to an expired room when no cleanup-triggering request occurred;
- already-open host/companion sockets can continue relaying beyond two hours, even after the map entry is removed, because both retain channel senders.

This contradicts a privacy claim and the brief's ephemeral-state boundary. The declared claim test merely trusts the advertised `7200` value.

Required repair: schedule hard eviction/connection closure at the TTL, reject expired socket upgrades, then test expiry with controllable time. Keep the restart persistence test as a separate assertion.

### High — offline service-worker reload is incomplete

The app ships and registers `sw.js`, but the install cache contains only `/`, `/demo`, the favicon, and manifest—not the hashed JavaScript, CSS, or responsive art. In a fresh browser:

1. load `/demo` online and wait for service-worker activation;
2. clear ordinary HTTP cache so only the service-worker cache remains;
3. go offline and reload `/demo`.

Result: HTTP 200 with an empty `#app`. The worker returns cached `/` HTML for missing JS and CSS requests, producing:

- “Refused to apply style … MIME type (`text/html`)”; and
- “Failed to load module script … MIME type `text/html`.”

A normal offline reload can appear to pass while the browser's ordinary HTTP cache still contains the assets, which can mask this defect in a lighter smoke test. The forced service-worker update itself passed: it activated and removed a seeded stale cache. The page also omits `<link rel="manifest">`, so the shipped manifest is not discoverable.

Required repair: include the hashed build shell in a versioned precache (or generate a build manifest), return an offline response appropriate to the request type, link the web manifest, and test after clearing HTTP cache.

## Other defects

### Medium — required 44 × 44 touch targets are not met

At 390 px, measured hit boxes include:

- Reset demo: `99.7 × 36` px;
- Start for real: `101 × 22` px;
- header Join link: `25.6 × 44` px.

Footer links are also about 22 px tall. These fail the supplied non-negotiable touch-target baseline even though axe reports no serious/critical automated violation.

### Medium — unknown routes are soft 404s

`/definitely-not-a-real-route` and the designed `/404` both return HTTP 200. The client renders the recovery screen and correct title, but crawlers, caches, and monitoring receive success. The backend fallback always serves `index.html` without a 404 status.

### Low — a non-audio file is announced as ready

Supplying `not-audio.txt` with MIME `text/plain` makes the host say “not-audio.txt is ready and stays on this device.” Playback later falls back to the built-in click, but the initial validation/feedback is inaccurate.

## End-to-end and backend evidence

- Live `/health` returned `build_sha: a3a8726ab0302a00b0af43f3847911ede44e7dc8`; deployment matches the candidate.
- Desktop host + 390 px companion: room created, companion joined, a 60-second round started, vibration was invoked for cues, one pointer tap and one Space-key tap returned, and both devices displayed the same 56% score.
- Tempo boundaries displayed 60 BPM and 180 BPM correctly.
- Invalid short code: HTTP/UI recovery; unknown six-character room: 404 recovery; second companion: 409 with “room already has a companion” and an Enter another code link.
- A marked local file never appeared in request bodies; every captured runtime request was same-origin.
- Demo created no API requests and no local/session storage. Reset restored 86%.
- Live rate limit: 50 concurrent requests from one forwarded identity returned **40 × 200** then **10 × 429**; `Retry-After: 1`.
- Local concurrency smoke: 100 concurrent room creates with distinct forwarded identities returned **100 × 200** in 190 ms (about 525 requests/s in this environment).
- Local persistence boundary: after process restart, joining a room made before restart returned 404.
- The release binary started with an empty environment except `PATH` and `PORT`; startup logged supplied/default configuration without secrets. `/health` worked.
- Sign-in is not required, so the Entra authority check is not applicable. No library/CLI consumer-pack gate applies.

## Accessibility, responsive behavior, and browser policy

- Independent axe scans on `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`, `/404`, and an unknown route in desktop and 390 px mobile found **0 serious/critical violations**.
- All 16 route/viewport combinations had `lang=en`, one `h1`, one `main`, route-specific titles, alt text, no horizontal overflow, and no console/page/request errors in normal online use.
- At 200% root text size, all checked routes remained within the viewport.
- Keyboard smoke passed: first Tab reveals the skip link with a 3 px cyan focus outline; after activation, the next Tab reaches the join input; Enter submits; the validation error is `role=alert` and restores input focus. Space sends a companion tap.
- Reduced motion matched and computed transitions at `0.01 ms`; scroll behavior became `auto`.
- `/opt/fleet/lib/verify-url.sh`: HTTP 200, 631 ms load, no console errors, valid title/lang, one h1/main, no missing alt, no unlabeled buttons.
- CSP, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin` are present. HTML is `no-cache`; hashed JS is `public, max-age=31536000, immutable`.
- No analytics, tracker, external font/script, account provider, payment provider, or runtime third-party request was observed.

## Build, tests, and performance

- `npm ci`: PASS, 59 packages, 0 vulnerabilities.
- `npm test`: PASS — 3 Vitest, 3 Rust, clean-entry regression 2/2, full Playwright 22/22.
- `cargo fmt --all -- --check`: PASS.
- `cargo clippy --all-targets --all-features --locked -- -D warnings`: PASS.
- `cargo build --release --locked`: PASS.
- `npm run build`: PASS; `dist/` produced.
- `git diff --check`: PASS before report changes.
- Bundle: JS 23,030 bytes raw / 7.79 KB gzip; CSS 15,317 bytes raw / 4.17 KB gzip; 720 px hero 26,186 bytes. All stated budgets pass.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.2 s, LCP 1.6 s, TBT 10 ms, CLS 0, total transfer 112 KiB. Lab INP was not measured.
- No Docker-compatible executable is available in this verifier container. Both native production stages passed; the Dockerfile was inspected as multi-stage, non-root, `.git`-independent, and `BUILD_SHA`-driven.

## Acceptance summary

The candidate fixes the earlier clean-claim-command blocker and the core relay works. It is **not releasable** until the hard TTL, claims coverage, service-worker shell, touch targets, and HTTP 404 behavior are corrected and reverified.
