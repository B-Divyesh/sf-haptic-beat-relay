# Independent verification 12 — FAIL

- **Work order:** `haptic-beat-relay-verify-12`
- **Candidate commit:** `117085a39f5c9d5d865fae71b38994c257e450f3`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 13:30 UTC

## Decision

**FAIL — release blocked.** The candidate is deployed byte-for-byte, the local
build and test gates pass, and the one-click sample is strong. The real relay
does not work reliably in production. Its active Container App revision is
configured for up to three replicas and had three replicas running, while room,
WebSocket, and rate-limit state exist only inside one process.

Fresh live testing produced zero usable pairings in ten attempts. It also made
the documented 40-request client allowance fail: later exact and independent
bursts admitted all 45 requests without a `429` or `Retry-After`.

## Mandatory opening gates

### First-read test — PASS

A cold desktop and 390 px visit says **“Send every beat to a friend.”** It names
**friends and rhythm-game makers** and says they get tactile cues and shared
timing without an account. **“Try it with sample data”** is visible in the first
mobile viewport, followed by **“A paired sample round opens now.”** This answers
what the product does, who it is for, and what to click first in plain words.

The action opens `/demo` in one click. The populated sample immediately shows
room `DEMO24`, companion Sam, 104 BPM, a practice loop, past scores, and the
persistent **“Demo — sample data, nothing is saved”** banner. A fresh live run
finished after 12 seconds at 89% accuracy; Reset demo restored 86%.

### Claims gate — FAIL

Every exact `.factory/claims.json` command was run after a clean `npm ci`. The
first pass had 13 passing claim commands and one failure. The live rate claim
then failed when repeated and is not reliably true.

| Claim | Exact-command result and evidence |
| --- | --- |
| `demo-sandbox` | PASS — desktop and mobile started, completed, and reset the sample; no API or storage use. |
| `sample-duration` | PASS — both projects observed the 12-second completion. |
| `local-audio` | PASS — the marked fixture bytes were not sent. |
| `no-third-party` | PASS — the claim test and live demo capture used only the product origin. |
| `no-account` | PASS — local room creation had no sign-in step. |
| `free-use` | PASS — no purchase or payment gate appeared. |
| `shared-score` | PASS locally — host and companion returned one tap and agreed on the score. **The equivalent live job fails because requests reach different replicas.** |
| `ephemeral-rooms` | PASS — the focused Rust TTL/restart test passed. |
| `rate-limit` | **FAIL live** — the first five-burst exact run happened to return 40 successes and five 429s per identity. A later identical command failed on its first client with 45 successes and zero 429s. Independent create, join, and socket-path bursts also admitted all 45. |
| `health` | PASS — `/health` reports status `ok` and the exact candidate SHA. |
| `connection-required` | PASS — offline creation showed actionable reload guidance. |
| `visual-cue` | PASS locally — the no-vibration browser entered the visual cue state. |
| `real-round-duration` | PASS — Chromium remained active at 59 seconds and completed at 60; the duplicate mobile project is intentionally skipped. |
| `singleton-deployment` | **FAIL** — `npm run test:live-topology` received ingress `Auto`, where the claim requires `http`. Follow-up Azure reads found max three and three running replicas. |

Any failing claim test is release-blocking under the acceptance contract.

### Unlisted claim — FAIL

The landing/legal copy and README promise vibration/controller haptics, including
“The companion uses phone vibration or a connected gamepad when supported.” No
entry in `claims.json` covers this promise. The shared-score test proves message
delivery and scoring; the visual-cue test deliberately removes
`navigator.vibrate` and proves only the fallback. No test observes
`navigator.vibrate()` or a gamepad `vibrationActuator`. This is an unlisted core
product claim and therefore also fails the claims contract.

## Release-blocking defects

### Critical — process-local relay is deployed across three replicas

Read-only Azure inspection at 13:22–13:30 UTC returned:

- active revision mode: `Single`;
- active revision: `sf-haptic-beat-relay--0000019`, 100% traffic;
- ingress transport: **`Auto`**, not required `http`;
- application and active-revision scale: `minReplicas: 1`, **`maxReplicas: 3`**;
- **three** replicas in `Running` state.

The source intentionally stores rooms, broadcast channels, WebSocket access,
and rate buckets in process memory. The checked-in deployment contract requires
HTTP ingress and min/max one for that reason.

Observable production impact:

- `RELAY_ROUNDS=30 npm run test:live-relay` timed out waiting for a companion
  connection during its first browser round.
- In ten additional fresh desktop-host/390 px-companion attempts, **zero**
  completed a usable pairing.
- Six companion joins returned `404 room_not_found`.
- Five host and three companion WebSocket handshakes returned HTTP 404.
- One companion appeared connected, but its host socket had already closed, so
  it still could not run a round.
- The UI recovery text was understandable, but retrying cannot repair the
  server topology.

This breaks the researched brief's smallest useful product.

### High — live per-client API allowance is not enforced

The documented allowance is exactly 40 room API requests per client per second,
then `429` with `Retry-After: 1`.

- The initial exact five-client claim run passed; the later failure shows the
  observed allowance is not stable under the live topology.
- The later exact command admitted all 45 requests for client
  `198.51.100.93` and failed.
- Separate 45-request concurrent bursts to create, join, and socket paths each
  returned all 45 non-429 responses.

The limit itself works in a single process: a local 100-request burst produced
40 successes and 60 `429` responses, all with `Retry-After: 1`. Production
splits the bucket among replicas, so the effective allowance is nondeterministic
and can exceed the documented value.

### High — vibration/controller claim has no claim test

The product's defining tactile-output promise is absent from `claims.json` and
is not observed by any test. Add a tagged claim test using browser stubs for
phone vibration and gamepad actuation, or narrow the public copy.

## Candidate and live identity

The deployed application bytes do match the candidate:

- `/health`: `117085a39f5c9d5d865fae71b38994c257e450f3`;
- JS local/live SHA-256:
  `8dc97d9d720d52121f4d0dabcca004af81be92f98871a033bcb175503f94dd4e`;
- CSS local/live SHA-256:
  `75f30853abea59ac8abbd47cba9705f22ae575f7ea21aa4cf28cf4d587398e87`;
- service worker local/live SHA-256:
  `dd8381ccad961f6b5e1947e90d60f3c51f7b8b5442d56de3a88b840944d319a0`;
- `index.html`, manifest, robots, and sitemap also matched byte-for-byte.

The deployed code identity is correct; the live runtime configuration is not.

## Local build and backend verification

- `npm ci`: PASS — 59 locked packages, zero audit vulnerabilities.
- `npm test`: PASS — 3 Vitest tests, release/deployment contract checks, 10
  Rust tests, clean-entrypoint regression, and 34 browser tests; two
  project-specific duplicates were intentionally skipped.
- `npm run build`: PASS — TypeScript `--noEmit` and Vite production build.
- `cargo fmt --all -- --check`: PASS.
- `cargo clippy --all-targets --all-features --locked -- -D warnings`: PASS.
- `BUILD_SHA=<candidate> cargo build --release --locked`: PASS.
- Release binary startup with only `PORT`: PASS; startup logged that no secrets
  were required, and health returned the candidate SHA.
- Local 100-request concurrent load across distinct clients: 100/100 HTTP 200
  with 100 unique room codes.
- Local one-client 100-request burst: exactly 40 HTTP 200 and 60 HTTP 429, all
  with `Retry-After: 1`.
- Persistence boundary: a room created before a process restart returned 404
  after restart, as documented.
- Docker build was not run because this worker has no `docker` executable. The
  Dockerfile/release contract test and the exact component production builds
  passed.

There is no separate frontend lint script. Strict Clippy and TypeScript
checking are the available static gates.

## Product, error, and boundary cases

- One-click sample: completed, reset, and remained isolated.
- Real connected room: passes locally; fails live as detailed above.
- Tempo boundaries: live UI reported 60 BPM at minimum and 180 BPM at maximum.
- Invalid file: a text file was rejected with “Choose an audio file. This file
  was not loaded.”
- Invalid short code: the error explained the six-character requirement,
  remained associated through `aria-describedby`, and returned focus to the
  input.
- Formatted code `ab-12cd` normalized to `AB12CD`; an absent room gave a plain
  recovery message and working “Enter another code” link.
- Unknown routes returned a real HTTP 404 and a styled route back home.
- All crawled product links were live; the intentional `/404` document remained
  HTTP 404 and the privacy `mailto:` was present.

## Privacy, accessibility, PWA, and browser evidence

### Privacy and network

- Cold root and complete live demo request logs contained only
  `https://haptic-beat-relay.sociobot.in`.
- The 12-second demo made no `/api/` request.
- After start, completion, and reset, localStorage, sessionStorage, and
  IndexedDB counts were all zero.
- Uploaded audio privacy passed the marked-byte browser claim test.
- No analytics, advertising, third-party font, or runtime script request was
  observed.

### Accessibility and responsive behavior

- Fresh Axe scans of `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`,
  `/404`, and an unknown route found zero serious or critical violations in
  desktop and 390 px contexts.
- Every tested route had one `h1`, one `main`, a useful route title, and no
  horizontal overflow.
- The landing image had meaningful alt text; other tested pages had no images.
- Keyboard-only use passed: the first Tab focused the skip link; its focus ring
  was a visible 3 px cyan outline; Enter moved to `#main`; the sample link and
  sample start worked by keyboard; SPA navigation focused the new `h1`; invalid
  form submission returned focus to the field.
- Reduced-motion media queries matched in the reduced-motion contexts, and the
  stylesheet reduces animations/transitions to an effectively instant state.
- The local browser suite passed 390 px touch-target and 200% text checks.
- Expected 404 document loads generated browser resource errors. More
  importantly, `/host` generated WebSocket 404 console errors on both desktop
  and mobile because of the critical live defect.

### PWA and offline behavior

- The service worker installed, controlled the demo, and completed an explicit
  update check with no waiting worker.
- After clearing the browser network path and going offline, `/demo` reloaded
  with HTTP 200 and retained its heading and usable sample action.

### Headers, caching, and performance

- HTML, health, service worker, manifest, robots, sitemap, and 404 responses use
  `Cache-Control: no-cache`.
- Hashed JS/CSS use `public, max-age=31536000, immutable`; responsive art uses a
  one-day public cache.
- Responses include `nosniff`, strict-origin referrer policy, and a self-only
  CSP with `frame-ancestors 'none'` in the response header.
- Initial JS: 23.16 kB raw / 7.87 kB gzip. CSS: 15.59 kB raw / 4.22 kB gzip.
  The mobile hero is 26.19 kB. All are well inside budget.
- Fresh Lighthouse 13.4.1 mobile: performance **98**, accessibility **100**,
  best practices **100**, SEO **100**; FCP 1.2 s, LCP 1.6 s, TBT 130 ms,
  CLS 0, total transfer 163 KiB.

## Required release action

Do not release while the app is scaled beyond one process. Reapply the checked-in
deployment contract (`Single`, HTTP transport, min/max one), wait for exactly
one running active replica, and rerun all manifest claims plus the 30-round live
relay gate. Add a listed and tagged browser claim for phone vibration and
gamepad actuation before acceptance.
