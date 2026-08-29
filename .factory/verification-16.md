# Independent verification 16 — FAIL

- **Candidate:** `01418ef9dab97602e63e621f05eceaf33f9ffe0d`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 UTC
- **Work order:** `haptic-beat-relay-verify-16`
- **Result:** **FAIL — do not release.**

The first-read gate passes, the candidate is built and served live, and all
local quality gates pass. Three mandatory live claims fail. The deployed
Container App has three running replicas even though rooms, WebSockets, and
rate buckets are process-local.

## Release-blocking defects

### P0 — a host and companion do not share one reliable relay

The exact listed claim command failed from a clean install:

```text
RELAY_ROUNDS=30 npm run test:live-relay
AssertionError: round 11: score did not reach the companion
'0%' !== '82%'
```

The 30 fresh API create/join checks completed before the browser phase. Ten
desktop-host/390 px companion rounds then completed, but round 11 lost the
host's score before it reached the companion.

Two separate fresh checks reproduced the same process-local routing failure:

- A cold 390 px visit to `/host` logged a WebSocket handshake `404` for the
  room it had just created.
- A direct `POST /api/rooms` returned room `S4ZFXS`; the immediately following
  `POST /api/rooms/S4ZFXS/join` returned `404 room_not_found` twice.

This prevents the brief's smallest useful product from working reliably.

### P0 — the documented per-client request allowance is not enforced live

The exact five-client claim command failed on its first fresh identity:

```text
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
expected exactly 40 accepted requests for 198.51.100.147
45 !== 40
```

Observed allowance in the required check: **at least 45 requests in one
second**; all 45 were accepted, with zero `429` responses and therefore no
`Retry-After` response.

An independent 150-request probe under three new forwarded identities exposed
the per-replica buckets:

```text
198.51.100.231: 120 x 200, 30 x 429
198.51.100.232:  80 x 200, 70 x 429
198.51.100.233:  80 x 200, 70 x 429
```

Every eventual `429` carried `Retry-After: 1`, but the client-wide allowance
varied between 80 and 120 rather than the documented 40.

### P0 — live topology violates the singleton deployment claim

The exact topology claim failed:

```text
npm run test:live-topology
Expected values to be strictly equal:
'auto' !== 'http'
```

Fresh read-only Azure queries showed:

```json
{
  "activeRevisionsMode": "Single",
  "transport": "Auto",
  "minReplicas": 1,
  "maxReplicas": 3,
  "activeRevision": "sf-haptic-beat-relay--0000023",
  "trafficWeight": 100,
  "runningReplicas": 3
}
```

The checked-in contract requires HTTP ingress, min/max `1/1`, and exactly one
running replica. This topology explains the lost rooms, score messages, and
distributed rate buckets.

No additional P1 or P2 product defects were found.

## Mandatory first-read gate — PASS

A cold visit at 1440 × 900 and 390 × 844 answers all three questions in plain
words:

- **What it does:** “Send every beat to a friend,” with tactile cues and shared
  timing explained directly below.
- **Who it is for:** friends and rhythm-game makers.
- **What to click first:** **Try it with sample data**, followed by “A paired
  sample round opens now.”

The action is visible without scrolling on both viewports and opens the used
product in one click. The demo banner says “Demo — sample data, nothing is
saved” and provides **Reset demo** and **Start for real**.

## Claims contract

`.factory/claims.json` exists with 16 entries. Every listed command was run
individually after `npm ci` from the initially clean candidate checkout.

| Claim | Result | Fresh evidence |
| --- | --- | --- |
| `demo-sandbox` | PASS | Exact grep command: 2/2 desktop/mobile passed |
| `sample-duration` | PASS | Exact grep command: 2/2 passed; completion observed after 12 seconds |
| `local-audio` | PASS | Exact grep command: 2/2 passed |
| `no-third-party` | PASS | Exact grep command: 2/2 passed |
| `no-account` | PASS | Exact grep command: 2/2 passed |
| `free-use` | PASS | Exact grep command: 2/2 passed |
| `shared-score` | PASS locally | Exact grep command: 2/2 passed; live 30-round claim fails |
| `live-relay` | **FAIL** | Round 11 companion stayed at `0%`; host had `82%` |
| `ephemeral-rooms` | PASS | Exact Cargo test: 1 passed |
| `rate-limit` | **FAIL** | 45/45 accepted for the first fresh client; expected 40/45 |
| `health` | PASS | Exact grep command: 2/2 passed |
| `connection-required` | PASS | Exact grep command: 2/2 passed |
| `visual-cue` | PASS | Exact grep command: 2/2 passed |
| `haptic-output` | PASS | Exact grep command: 2/2 passed |
| `real-round-duration` | PASS | Measured desktop test passed in about 1.1 minutes; mobile duplicate skipped by design |
| `singleton-deployment` | **FAIL** | `Auto`, max 3, and three running replicas |

Result: **13 passed, 3 failed**. Any failed claim is release-blocking. Landing,
legal-page, and README claims were cross-checked against the manifest; no
additional unlisted product claim was found.

## Candidate identity and local quality gates

The checkout began clean at the nominated SHA. The live health response is:

```json
{"build_sha":"01418ef9dab97602e63e621f05eceaf33f9ffe0d","status":"ok"}
```

The rebuilt `index.html`, hashed JavaScript, hashed CSS, both hero images,
generated service worker, and web manifest each matched the live response
byte-for-byte by SHA-256. The deployment therefore serves this candidate; it
is not stale.

- `npm ci`: 59 locked packages installed; zero audit vulnerabilities.
- `npm test`: PASS — 3 Vitest tests, release/deployment contract checks, 10
  Rust tests, 2 clean-entry-point checks, and 36 Playwright checks passed; 2
  intentional project duplicates skipped.
- `npm run build`: PASS — TypeScript and Vite production build.
- `cargo fmt --all -- --check`: PASS.
- `cargo clippy --all-targets --all-features --locked -- -D warnings`: PASS.
- `BUILD_SHA=01418ef... cargo build --release --locked`: PASS.
- Docker image build: not run because this verifier image has no `docker`
  executable. The Docker contract test passed, and both Docker build stages
  were exercised directly through the exact frontend and locked Rust release
  builds.

A release binary started with only `PATH` and `PORT=18080`, logged that no
secrets were required, and returned the candidate SHA from `/health`. Against
that one local process, 3/3 fresh API plus desktop-host/390 px companion rounds
passed. Five fresh clients each received exactly 40 successes and five `429`
responses with `Retry-After: 1`. The Rust expiry/restart claim also passed.
This isolates the blockers to the deployed runtime topology.

## End-to-end, validation, and recovery

- The live sample opened in one click, started, completed with 89% accuracy,
  and reset to its seeded 86% state.
- A two-character code and a code containing punctuation each returned
  `400 invalid_code` with a concrete recovery instruction.
- A well-formed absent code returned `404 room_not_found` with a concrete
  recovery instruction and an **Enter another code** link.
- The join form announces its error, keeps focus in the field, and references
  help plus error text through `aria-describedby`.
- Non-audio input was rejected without replacing the built-in click; a valid
  local WAV produced the promised local-device status.
- The actual host → companion → cue → tap → shared-score path remains blocked
  by the P0 live relay defect above.

## Privacy, accessibility, mobile, and PWA

- The complete live demo flow made only same-origin static requests, made no
  `/api` request, and left `localStorage` and `sessionStorage` empty.
- A marked selected audio fixture never appeared in any request body. The only
  API request was the same-origin empty room-creation POST.
- No third-party fonts, scripts, trackers, or runtime requests were observed.
- The live document sends a self-only CSP with `frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin`. HTTP redirects to HTTPS.
- Playwright Axe found zero violations of any impact on `/`, `/demo`, `/host`,
  `/join`, `/privacy`, `/terms`, and the real 404 route at desktop and 390 px.
- Those routes have `lang=en`, one `h1`, one `main`, useful per-route titles,
  complete image alt text, and no horizontal overflow. Local checks also
  passed at 200% text size and for all 44 px mobile touch targets.
- Keyboard order begins with the skip link. Its focus ring is a visible 3 px
  cyan outline; activation skips to the main sequence. SPA route changes move
  focus to the new `h1`.
- With reduced motion requested, the active sample had no running animations.
- The factory URL verifier passed: HTTP 200 in 589 ms, no console errors,
  title/lang/main/alt/button-label checks all valid.
- The service worker was activated with no waiting or installing update. After
  an update check and browser-cache clear, `/demo` reloaded offline with its
  sample controls available.

Real routes loaded without console or page errors except the live mobile
`/host` WebSocket `404` described in the P0 finding. A deliberate 404 document
produced the browser's expected failed-resource console message.

## Headers, caching, and performance

- HTML, health, service worker, and manifest: `Cache-Control: no-cache`.
- Hashed JavaScript and CSS: `public, max-age=31536000, immutable`.
- Art: `public, max-age=86400`.
- Unknown paths return a real HTTP `404`. All product links returned their
  intended status; the external factory link returned 200.
- Initial JavaScript: 23,164 bytes raw / 7.84 kB gzip (budget 200 kB).
- CSS: 15,590 bytes raw / 4.21 kB gzip (budget 50 kB).
- Mobile hero WebP: 26,186 bytes (budget 300 kB).
- Lighthouse 13.0.1 mobile: performance 100, accessibility 100, best practices
  100, SEO 100; FCP 1.1 s, LCP 1.8 s, TBT 30 ms, CLS 0; 166,661 bytes total
  transfer and zero third-party bytes.

## Required next step

Correct the live Container App for this exact candidate to HTTP ingress,
single-revision mode, min/max replicas `1/1`, and one running replica. Then run
all three live claims again without changing the candidate:

```sh
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
npm run test:live-topology
```

Do not change this verdict until all three commands pass from fresh clients.
