# Independent verification 28 — FAIL

**Work order:** `haptic-beat-relay-verify-28`  
**Candidate/source commit:** `2cde33453f204406dd72c77840fb9df2c279a68a`  
**Live URL:** <https://haptic-beat-relay.sociobot.in>  
**Verified:** 2026-09-02 06:24 UTC

## Decision

**FAIL — release blocked.** The deployed product matches the candidate and the
real host/friend job works. However, the first mandatory claim command failed
from the clean, initially unbuilt clone. The Playwright server timeout includes
the first Rust compile: compilation finished in 1 minute 59 seconds, then the
command exceeded its 120-second server-start budget. The acceptance contract
states that any failing claim test blocks release.

A warm rerun passed both desktop and mobile cases. This shows a clean-start test
reliability defect, not a broken live sample, but it does not erase the required
cold-run failure.

## Mandatory first checks

### First-read test — PASS

A fresh live browser opened to **“Send beat cues to a friend's phone.”** The
next sentence names friends and rhythm-game makers and says they receive phone
vibration cues and a shared timing score without an account. The primary action
is **“Try it with sample data”** and its adjacent explanation is **“A paired
sample round opens now.”**

Desktop 1440 × 900 and mobile 390 × 844 both showed the headline, audience,
sample action, real-room action, and the three privacy/price/connection facts
without scrolling. The sample opens in one click and immediately shows the
persistent “Demo — sample data, nothing is saved” banner, an 86% sample score,
Reset demo, and Create a real room.

### Claims gate — FAIL

After `npm ci`, every exact command in `.factory/claims.json` was run in manifest
order. The first command failed; the other 21 commands passed.

| Claim | Result | Evidence |
| --- | --- | --- |
| `demo-sandbox` | **FAIL** | `npm run test:browser -- --grep @claim:demo-sandbox` exited 1: first `cargo run` compiled for 1m59s and Playwright timed out waiting 120000ms for its web server. A later warm rerun passed 2/2 in 21.2s. |
| `sample-duration` | PASS | Desktop and mobile observed the 12-second completion. |
| `sample-tempo` | PASS | Chromium measured 104 BPM cue intervals. |
| `tempo-and-loop-controls` | PASS | Chromium selected 180 BPM, loaded the local fixture, and measured cues. |
| `local-audio` | PASS | The marked file bytes were not sent. |
| `no-third-party` | PASS | Observed requests stayed on the product origin. |
| `no-account` | PASS | A room opened without sign-in. |
| `free-use` | PASS | No purchase or payment gate appeared. |
| `copy-room-link` | PASS | A copied link joined from a fresh context and blocked-copy recovery appeared. |
| `shared-score` | PASS | Two devices exchanged a cue/tap and displayed the same score. |
| `live-relay` | PASS | 30/30 API create→join checks and 30/30 reconnecting desktop-host/390 px friend rounds passed. |
| `ephemeral-rooms` | PASS | The Rust restart/expiry test passed. |
| `rate-limit` | PASS | Five clients each received 40 successes, then five `429` responses with `Retry-After: 1`. |
| `health` | PASS | `/health` returned a build SHA. |
| `connection-required` | PASS | Offline room creation displayed recovery guidance. |
| `visual-cue` | PASS | The friend cue state appeared without vibration. |
| `space-key-tap` | PASS | Space returned a tap during a round. |
| `haptic-output` | PASS | Stubbed phone and controller haptics received the cue. |
| `real-round-duration` | PASS | Chromium observed completion after 60 seconds. |
| `singleton-deployment` | PASS | The scoped topology check found one ready HTTP replica, `/data`, and the full-SHA image. |
| `database-path` | PASS | Explicit, `/data`, and executable-directory path selection passed. |
| `public-records` | PASS | Version 1.0, MIT, source-art hash, and provenance passed. |

The observed live allowance is exactly **40 room API requests per client per
second**. Requests 41–45 returned `429` with `Retry-After: 1` for each of five
fresh forwarded client identities.

No material live or README claim lacked a corresponding manifest entry. This
tactile relay does not have an obvious need for an AI feature.

## Release-blocking defect

### High — a claim command fails from the clean checkout

The exact first claim invocation failed before running a test:

```text
[WebServer] Finished `dev` profile [unoptimized + debuginfo] target(s) in 1m 59s
[WebServer] Running `target/debug/haptic-beat-relay`
Error: Timed out waiting 120000ms from config.webServer.
```

`playwright.config.ts` gives the server 120 seconds and starts it with
`cargo run`. That limit is too close to a clean Rust build on this verifier.
Increase the clean-start allowance or build the backend before starting the
Playwright timer, then prove the command from an empty `target/` directory.

## Local quality gates

- `npm ci`: PASS; 59 packages installed, 0 reported vulnerabilities.
- `npm test`: PASS after the initial compile; 4 Vitest tests, Rust format,
  strict Clippy, release/deployment/handoff contracts, 18 Rust tests, the clean
  entrypoint check, and 42 Playwright tests passed; 8 intended project skips.
- `npm run build`: PASS; TypeScript and Vite completed. Output is under
  `frontend/dist/`.
- `cargo build --release --locked`: PASS.
- `git diff --check`: PASS.
- No separate frontend lint script exists.
- Docker and Podman are unavailable in this verifier, so the image was not
  rebuilt locally. Static inspection confirms a multi-stage Dockerfile,
  `rust:1-slim`, `BUILD_SHA=dev`, non-root UID 10001, port 8080, and no `.git`
  dependency.

The release binary started with an otherwise empty environment plus
`PORT=18080`, logged its default SQLite path and that no secrets were required,
and returned `{"build_sha":"dev","status":"ok"}`. One hundred simultaneous
room creations from distinct forwarded identities all returned 200 in 1,384 ms.
An independent explicit-database restart preserved a room: joining it after the
second process started returned 200.

## Live identity and end-to-end behavior

`GET /health` returned build SHA
`2cde33453f204406dd72c77840fb9df2c279a68a`. The topology claim reported
revision `sf-haptic-beat-relay--r2cde33453f`, one active/running/ready replica,
HTTP ingress, `/data` mounted from `sf-haptic-beat-relay-data`, and image
`sociobotregistry.azurecr.io/sf-haptic-beat-relay:2cde33453f204406dd72c77840fb9df2c279a68a`.

Built and live assets were byte-identical:

- JS `index-ZbnKtGJZ.js`: SHA-256
  `7910320dd43997f2984433d7441e99a0ac04c7e6bf4551c2c6d401c62edb8f34`
- CSS `index-Bfq6hZYx.css`: SHA-256
  `77f0bcf469f982f198f656b245b5de9472a9de1f91997f1a4d733fdc7cb211ea`

An independent desktop-host/390 px-friend flow created a six-character room,
joined one friend, enabled the round, selected the 180 BPM boundary, loaded a
local WAV, received a visual cue, returned a tap, and displayed the same score
on both devices without console or page errors. A second immediate run produced
a non-zero shared score and one acknowledged tap.

Boundary and recovery responses were correct: malformed `A2` returned 400
`invalid_code`; unknown `ZZZZZZ` returned 404 `room_not_found`; a second friend
returned 409 `room_full`; created rooms reported 7,200 seconds. A text file was
rejected with a clear recovery message, while a local WAV was accepted.

## Privacy, accessibility, PWA, and performance

- The sample made no room API request, created no local/session storage, and
  reset to the seeded 86% state. The real flow contacted only the product
  origin; a marked local-file payload was not transmitted.
- Fresh 1440 × 900 and 390 × 844 checks covered `/`, `/demo`, `/host`, `/join`,
  `/privacy`, `/terms`, `/404`, and an unknown URL. Every page had `lang=en`,
  one `h1`, one `main`, no missing alt text, no horizontal overflow, and no
  serious/critical axe finding. Normal routes had no console/page errors.
- At 200% root text size, the same public pages had no horizontal overflow.
  The repository browser suite independently passed its 44 px touch-target
  assertions.
- Keyboard Tab exposed the skip link first with a 3 px cyan focus outline.
  Invalid `A2` produced a `role=alert` message and returned focus to the input.
  Reduced motion computed animation and transition durations of 0.01 ms and
  disabled smooth scrolling.
- `/opt/fleet/lib/verify-url.sh` passed live: 616 ms load, valid title/language,
  one heading and main landmark, complete alt text, labeled buttons, and no
  console errors.
- The service worker was active and had no waiting/installing update. An
  offline `/demo` reload returned 200 and retained the sample action.
- Mobile Lighthouse: performance **98**, accessibility **100**, best practices
  **100**, SEO **100**; FCP 1.3 s, LCP 2.0 s, TBT 140 ms, CLS 0.
- Production assets: JS 26,101 bytes raw / 8.76 KB gzip; CSS 17,673 bytes raw /
  4.62 KB gzip; mobile hero 26,186 bytes. These are within the stated budgets.
- HTML, API errors, the manifest, and service worker carry the self-only CSP,
  response-header `frame-ancestors 'none'`, `nosniff`, and
  `strict-origin-when-cross-origin`. HTML and the worker are `no-cache`; hashed
  JS is `public, max-age=31536000, immutable`.
- All rendered links were crawled. Product routes and Sociobot returned 200;
  the designed 404 links correctly remained on a 404 document; the privacy
  mail link was recognized as `mailto:`.

## Required repair and retest

1. Make every Playwright-backed claim command reliable on the first invocation
   from an empty Rust target cache. The server-start timeout must include enough
   margin or the backend must be prebuilt by the command.
2. From a fresh clone, run `npm ci` and every exact manifest command again
   before any warming build. Then rerun `npm test`, `npm run build`, release
   build, and live identity/topology/rate-limit/30-round relay checks.
