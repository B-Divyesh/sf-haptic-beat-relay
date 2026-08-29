# Independent verification 19 — PASS

- **Work order:** `haptic-beat-relay-verify-19`
- **Candidate/source commit:** `1a9cd415c5d3f6db834b57cc1e68f6f58b93b4df`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 UTC

## Decision

**PASS.** The product meets the researched smallest useful product: a host can open an ephemeral six-character room, one companion can join, receive a cue, tap back, and see the shared accuracy score. The deployed service is the exact candidate and has the required singleton topology for its deliberately process-local room, WebSocket, and rate-limit state. No release-blocking defects were found.

## Mandatory first checks

### Claims gate — PASS

The checkout was clean at the candidate SHA. `.factory/claims.json` exists and contains 16 entries. From that clean checkout I ran `npm ci` (59 locked packages; audit reported zero vulnerabilities), then ran **every command in the manifest individually**. All exited zero. This was the first test action after reading the manifest; browser commands build their own production demo entry point.

| Claim | Exact command | Result / observed proof |
| --- | --- | --- |
| `demo-sandbox` | `npm run test:browser -- --grep @claim:demo-sandbox` | PASS — seeded sample starts and resets without API or browser storage. |
| `sample-duration` | `npm run test:browser -- --grep @claim:sample-duration` | PASS — measured 12-second sample. |
| `local-audio` | `npm run test:browser -- --grep @claim:local-audio` | PASS — marked local fixture bytes were not sent. |
| `no-third-party` | `npm run test:browser -- --grep @claim:no-third-party` | PASS — test request log remained same-origin. |
| `no-account` | `npm run test:browser -- --grep @claim:no-account` | PASS — a room opens without sign-in. |
| `free-use` | `npm run test:browser -- --grep @claim:free-use` | PASS — no payment/purchase gate. |
| `shared-score` | `npm run test:browser -- --grep @claim:shared-score` | PASS — host/companion exchanged a cue, tap, and equal score. |
| `live-relay` | `RELAY_ROUNDS=30 npm run test:live-relay` | PASS — 30/30 fresh API create→join checks and 30/30 desktop-host + 390 px-companion WebSocket rounds. |
| `ephemeral-rooms` | `cargo test claim_ephemeral_rooms_evict_after_the_configured_ttl_and_on_restart` | PASS — scheduled eviction rejects the room; a fresh server has no prior room. |
| `rate-limit` | `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` | PASS — each of five unique client identities received 40 × 200, then 5 × 429 with `Retry-After: 1`. |
| `health` | `npm run test:browser -- --grep @claim:health` | PASS — health reports status and build identity. |
| `connection-required` | `npm run test:browser -- --grep @claim:connection-required` | PASS — offline room creation offers reload/recovery guidance. |
| `visual-cue` | `npm run test:browser -- --grep @claim:visual-cue` | PASS — vibration-free companion receives the visual cue state. |
| `haptic-output` | `npm run test:browser -- --grep @claim:haptic-output` | PASS — stubs received `vibrate(45)` and dual-rumble actuation. |
| `real-round-duration` | `npm run test:browser -- --grep @claim:real-round-duration` | PASS — connected desktop run remained active through 59 seconds and completed at 60 seconds. |
| `singleton-deployment` | `npm run test:live-topology` | PASS — one active, running, ready HTTP replica with candidate image/build identity. |

### First-read test — PASS

A cold 1440 × 900 live visit says **“Send every beat to a friend.”** It says it is for **“friends and rhythm-game makers”** who need tactile cues and shared timing, and the first primary action is **“Try it with sample data”**, with the adjacent plain explanation **“A paired sample round opens now.”** One click opens `/demo`, seeded with Sam, room `DEMO24`, a 104 BPM night-practice click, two past scores, and the persistent **“Demo — sample data, nothing is saved”** banner with **Reset demo** and **Start for real**. The live 390 × 844 view has the same information and action without horizontal overflow.

## Local quality, runtime, and product-flow evidence

- `npm test`: PASS — 3 Vitest tests; release and deployment contract tests; 10 Rust tests; clean browser-entry test; 38 Playwright tests with the two intentional project skips.
- `npm run build`: PASS. Strict TypeScript plus Vite production build.
- `cargo fmt --all -- --check`, `cargo clippy --all-targets --all-features --locked -- -D warnings`, and `BUILD_SHA=1a9cd415c5d3f6db834b57cc1e68f6f58b93b4df cargo build --release --locked`: PASS.
- The release binary started with only `PATH` and `PORT=18080`; `/health` returned the exact candidate SHA and startup logged `PORT supplied; no secrets required`.
- A 100-request simultaneous create smoke with distinct forwarded clients returned 100 × 200. One fresh client’s 45-request burst returned exactly 40 × 200 and 5 × 429 with `Retry-After: 1`.
- Recovery boundaries passed: malformed code 400, missing room 404, second companion 409. Browser host/companion flows were independently exercised at the 60 and 180 BPM UI boundaries; each joined, started, returned one tap, and showed an equal shared score.
- The direct TTL/restart claim proves the intentional no-database persistence boundary. This is a web-with-backend product, not a library/CLI; consumer package checks do not apply.

## Deployment identity and live service checks

`GET /health` returned:

```json
{"build_sha":"1a9cd415c5d3f6db834b57cc1e68f6f58b93b4df","status":"ok"}
```

The fresh read-only Azure topology assertion returned one active revision, `sf-haptic-beat-relay--r1a9cd415c5`, min/max one, one running/ready replica, HTTP transport, and image `sociobotregistry.azurecr.io/sf-haptic-beat-relay:1a9cd415c5d3f6db834b57cc1e68f6f58b93b4df`. This is fresh evidence that the prior multi-replica deployment-only failure is not present. The live JavaScript and CSS byte-match the clean candidate build: `dbddb8d…26d3` and `75f3085…8e87`, respectively.

## Accessibility, privacy, HTTP, and performance

- `/opt/fleet/lib/verify-url.sh` passed live HTTPS with 668 ms load time, no console/page errors, title, `lang=en`, one `h1`, `<main>`, no missing image alt text, and no unlabeled buttons.
- Independent Axe scans found zero serious/critical findings across `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`, `/404`, and an unknown route at both desktop and 390 px mobile. Every scan had exactly one `h1` and `<main>` and no horizontal overflow. Normal 200 routes logged no console or page errors. The expected 404 navigation itself produces Chromium’s normal failed-resource console entry while returning the required HTTP 404.
- Keyboard-only smoke: Skip is first focus target, has a visible 3 px outline, follows to main, routes move focus to the heading, and invalid join input is announced and refocused by the browser suite. With reduced motion, computed beat animation and button transition duration are `1e-05s`.
- A fresh live Playwright demo start/reset logged 12 requests, all same-origin (only document, self-hosted JS/CSS/favicon, and route navigation); it made no API or third-party request and left localStorage, sessionStorage, and IndexedDB empty. Local audio privacy is covered by the exact marked-fixture claim. There is no account, so Entra tenant verification is not applicable.
- Live HTML uses `no-cache`; hashed JS/CSS use `public, max-age=31536000, immutable`; the mobile hero is 26,186 bytes. Response headers include self-only CSP with `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- Initial JS is 23,164 bytes raw / 7,861 bytes gzip; CSS is 15,590 / 4,216 bytes. Both are comfortably below the static-product budgets. Docker and a standalone Lighthouse executable are not installed in this verifier image; the checked-in Docker/release contracts pass, and browser accessibility, live load, asset, and caching checks above were run directly.

## Defects by severity

None found. No product-code change was made during verification.
