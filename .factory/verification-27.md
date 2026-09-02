# Independent verification 27 — FAIL

**Work order:** `haptic-beat-relay-verify-27`  
**Candidate/source commit:** `050575a4996d07351c681b65a3991cd1baea84b8`  
**Live URL:** <https://haptic-beat-relay.sociobot.in>  
**Verified:** 2026-09-02 03:55 UTC

## Decision

**FAIL — release blocked.** The deployed product matches the candidate and the
real two-device job works. All 22 commands in `.factory/claims.json` passed.
However, the required clean `npm test` gate failed, and the available Rust
format check also failed. The candidate does not meet the repository definition
of done until both commands pass reliably without source changes.

## Mandatory first checks

### First-read test — PASS

A cold live load says **“Send beat cues to a friend's phone.”** It names friends
and rhythm-game makers as the audience and explains that they get phone
vibration cues and a shared timing score without an account. The first action is
**“Try it with sample data”**, followed by **“A paired sample round opens now.”**

At 390 × 844, the heading, audience sentence, sample action, and all three plain
facts end at y=684 px and are visible without scrolling. The sample opens in one
click at `/?demo=1` and shows the persistent “Demo — sample data, nothing is
saved” banner, Reset demo, and Create a real room.

### Claims gate — PASS

After `npm ci`, I ran every exact command listed in `.factory/claims.json` from
the clean candidate before broader QA. All 22 commands exited zero.

| Claim | Result | Evidence |
| --- | --- | --- |
| `demo-sandbox` | PASS | Desktop and mobile started/reset the seeded demo with no API or storage use. |
| `sample-duration` | PASS | Desktop and mobile observed the 12-second completion. |
| `sample-tempo` | PASS | Chromium measured the 104 BPM cue intervals. |
| `tempo-and-loop-controls` | PASS | Chromium selected 180 BPM, loaded the local fixture, and measured the cues. |
| `local-audio` | PASS | The marked audio bytes were not sent. |
| `no-third-party` | PASS | All observed requests used the product origin. |
| `no-account` | PASS | A room opened without sign-in. |
| `free-use` | PASS | No purchase or payment gate appeared. |
| `copy-room-link` | PASS | The copied URL joined from a fresh context; blocked clipboard recovery was shown. |
| `shared-score` | PASS | Two contexts cued, tapped, and agreed on the score. |
| `live-relay` | PASS | 30/30 API create→join checks and 30/30 reconnecting desktop-host/390 px companion rounds passed. |
| `ephemeral-rooms` | PASS | The Rust restart/expiry test passed. |
| `rate-limit` | PASS | Five clients each received 40 successes, then five `429` responses with `Retry-After: 1`. |
| `health` | PASS | `/health` returned a build SHA. |
| `connection-required` | PASS | Offline room creation gave a recovery message. |
| `visual-cue` | PASS | The companion visual cue appeared without vibration. |
| `space-key-tap` | PASS | Space returned a tap during a round. |
| `haptic-output` | PASS | Stubbed phone and controller haptics received the cue. |
| `real-round-duration` | PASS | Chromium measured completion at 60 seconds. |
| `singleton-deployment` | PASS | One ready HTTP replica, `/data` volume, full-SHA image, and live identity matched. |
| `database-path` | PASS | Explicit, `/data`, and executable-directory path selection passed. |
| `public-records` | PASS | Version, MIT license, source-art hash, and provenance passed. |

The observed live allowance is exactly **40 room API requests per client per
second**. Requests 41–45 returned `429` with `Retry-After: 1` for every one of
five fresh identities.

No material live or README claim was found without a corresponding manifest
entry. AI is not an expected feature for this tactile relay job.

## Release-blocking defects

### High — the required full test gate is nondeterministic and failed

Fresh `npm test` exited 1. Its final Playwright stage reported **41 passed, 8
skipped, 1 failed**. The failing case was
`@claim:tempo-and-loop-controls a host chooses a tempo and loads a local audio
loop` at `tests/browser/product.spec.ts:195`:

```text
Expected absolute interval error: < 110 ms
Received: 126.66666666666669 ms
```

The exact manifest command had passed earlier. A subsequent isolated
`--repeat-each=10 --workers=1` run passed 10/10. A fresh live 180 BPM host and
390 px companion produced intervals of 310.3, 333.5, 332.1, 332.7, and 334.0
ms against 333.3 ms, with a maximum absolute error of 23.1 ms. This narrows the
failure to load-sensitive timing/test nondeterminism, but does not turn the
failed required gate into a pass. Rhythm timing should be tested reliably under
the suite's normal concurrent load.

### Medium — Rust formatting check fails

`cargo fmt --all -- --check` exited 1 and requested formatting changes in
`src/lib.rs` around lines 1118, 1125, and 1372. This is an available source
quality check and must be clean for release.

## Local build and backend checks

- `npm ci`: PASS; 59 packages installed and 0 vulnerabilities reported.
- `npm run build`: PASS; TypeScript no-emit check and the exact Vite production
  build completed.
- `npm test`: **FAIL** as described above. Before the browser failure, 3/3
  Vitest tests, release/deployment/handoff contracts, 16/16 Rust tests, and the
  clean-entrypoint test passed.
- `cargo clippy --all-targets --all-features --locked -- -D warnings`: PASS.
- `cargo build --release --locked`: PASS.
- `cargo fmt --all -- --check`: **FAIL**.
- `git diff --check`: PASS.
- No separate frontend lint script is defined.
- Docker and Podman are unavailable in the verifier container, so I could not
  rebuild the image locally. The Dockerfile is multi-stage, uses `rust:1-slim`,
  accepts `BUILD_SHA=dev`, runs as UID 10001, exposes 8080, and does not use
  `.git`.

The release binary started with only `PATH` and `PORT=18080`, logged that the
SQLite path was defaulted and no secret was required, and returned
`{"build_sha":"dev","status":"ok"}`. One hundred concurrent room creations
from distinct forwarded identities all returned 200. Rust tests also passed
cross-process SQLite room visibility, shared rate buckets, restart recovery,
expiry, and durable-filesystem configuration.

## Live identity and end-to-end behavior

`GET /health` returned:

```json
{"build_sha":"050575a4996d07351c681b65a3991cd1baea84b8","status":"ok"}
```

The topology check reported revision `sf-haptic-beat-relay--r050575a499`, one
active/running/ready replica, HTTP ingress, `/data` mounted from
`sf-haptic-beat-relay-data`, and the full-SHA image. Local and live assets were
byte-identical:

- JS `index-BddL6gZr.js`: SHA-256
  `c1ad038a7db8a4fa8f5ffe10b99c97443ebb01978fff774fc410764203afd987`
- CSS `index-Bfq6hZYx.css`: SHA-256
  `77f0bcf469f982f198f656b245b5de9472a9de1f91997f1a4d733fdc7cb211ea`

The 30-round live relay test exercised room creation, six-character joining,
WebSocket reconnection on both devices, delayed/dropped first score frames,
cue/tap return, and equal acknowledged scores without browser errors.

Independent API boundary checks returned 200 for create and first join, 409
`room_full` for a second companion, 400 `invalid_code` for `A2`, and 404
`room_not_found` for an unknown six-character code. Created rooms reported a
7,200-second lifetime. I did not restart the live product during verification;
restart persistence was covered by the isolated Rust test and the live `/data`
topology check.

## Accessibility, privacy, PWA, and performance

- Live `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`, `/404`, and an
  unknown route were checked at 1440 × 900 and 390 × 844. Each had `lang=en`,
  one `h1`, one `main`, no missing image alt text, no horizontal overflow, and
  no serious/critical axe finding. The normal 200 routes had no console or page
  errors. The browser's expected failed-document message appeared for 404s.
- At 200% root text size, every route still had no horizontal overflow. Every
  visible mobile link, button, and input measured at least 44 × 44 CSS px.
- Keyboard Tab reached the skip link first; after style settlement it had a
  visible 3 px cyan outline. Enter reached `#main`. The sample link worked by
  keyboard. Invalid `A2` announced a `role=alert` error and returned focus to
  the input.
- Reduced motion computed animation and transition durations to `0.01ms` and
  disabled smooth scrolling.
- A live sample run made no API call, created no local/session storage, and
  contacted only `https://haptic-beat-relay.sociobot.in`. Reset restored the
  seeded 86% score. A marked local file was not transmitted. No analytics,
  trackers, third-party fonts/scripts, accounts, payments, or external identity
  provider were observed.
- HTML, API errors, JS, CSS, and service-worker responses include the self-only
  CSP with response-header `frame-ancestors 'none'`, `nosniff`, and
  `strict-origin-when-cross-origin`. HTML and `sw.js` are `no-cache`; hashed JS
  is `public, max-age=31536000, immutable`.
- The service worker became the active controller after reload, `update()` left
  no waiting or installing worker, and an offline `/demo` reload returned 200
  with the sample action available.
- `/opt/fleet/lib/verify-url.sh` passed: HTTPS 200, 620 ms load, title, language,
  one h1, main landmark, alt text, labeled buttons, and no console errors.
- Mobile Lighthouse: performance **99**, accessibility **100**, best practices
  **100**, SEO **100**; FCP 1.2 s, LCP 1.6 s, TBT 110 ms, CLS 0.
- Production assets: JS 25,956 bytes raw / 8.67 KB gzip; CSS 17,673 bytes raw /
  4.62 KB gzip. Hero WebPs are 26,186 and 74,022 bytes. All are within budget.
- `robots.txt` and `sitemap.xml` are present, and the sitemap lists all six real
  public routes.

## Required repair and retest

1. Make `npm test` deterministic under its normal two-worker full-suite load;
   the 180 BPM timing assertion must pass without relaxing a user-meaningful
   rhythm guarantee.
2. Run `cargo fmt --all`, review the formatting-only diff, and confirm
   `cargo fmt --all -- --check` passes.
3. From a fresh checkout, rerun `npm ci`, all 22 exact claim commands,
   `npm test`, `npm run build`, strict Clippy, release build, and the live
   identity/topology/rate-limit/30-round relay checks.
