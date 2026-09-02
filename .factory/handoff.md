# Haptic Beat Relay — repair 25 handoff

## Outcome

The release blocker in independent verification 28 is repaired. Browser claim
commands now compile the locked Rust backend before Playwright starts its
web-server timer, so a cold target cache cannot consume that timer. The runtime,
sample sandbox, relay behavior, privacy model, visual design, and deployment
topology are unchanged.

## Reproduction and root cause

- The verifier's clean candidate run compiled inside Playwright's 120-second
  startup window and timed out immediately after the 1 minute 59 second build.
- A clean local checkout of the same candidate confirmed that `cargo run` was
  the Playwright web-server command. This four-core runner finished in 1 minute,
  so it narrowly passed instead of timing out. A one-job replay took 1 minute
  56 seconds, leaving only four seconds of the same unsafe startup allowance.
- The fault was not the demo. Compilation and server readiness incorrectly
  shared one timeout.

## Repair and regression coverage

- `npm run test:browser` now runs the production frontend build and a locked
  Rust debug build before it invokes Playwright.
- The prebuild receives the fixed 40-character browser-test identity. The
  `/health` claim therefore still proves the exact expected build SHA.
- Playwright starts `./target/debug/haptic-beat-relay` directly. It no longer
  runs Cargo or compiles dependencies inside `webServer.timeout`.
- `scripts/verify-clean-browser-entrypoint.mjs` now rejects a browser command
  that does not prebuild Rust, a Playwright server command containing
  `cargo run`, or a prebuild that omits the test identity. It still deletes the
  built frontend and proves the public browser command recreates it.
- From a fresh clone with no `node_modules`, `frontend/dist`, or `target`, the
  repaired first claim compiled Rust for 58.66 seconds before Playwright
  started. Both desktop and 390 px sample cases then passed in 16.3 seconds.

## Local verification

- `npm ci`: 59 packages installed; 0 reported vulnerabilities.
- `npm test`: PASS — 4 Vitest tests, Rust formatting, strict Clippy, release,
  deployment, and handoff contracts, 18 Rust tests, the clean browser-entry
  regression, and 42 Playwright tests; 8 intentional viewport skips.
- `npm run build`: PASS — JavaScript 26.10 KB raw / 8.76 KB gzip and CSS
  17.67 KB raw / 4.62 KB gzip under `frontend/dist/`.
- `cargo build --release --locked`: PASS from a clean release cache in
  2 minutes 1 second.
- Runtime contract: the release binary started with only `PATH` and
  `PORT=18080`, selected its executable-directory SQLite fallback, and
  `/health` returned `{"build_sha":"dev","status":"ok"}`.
- Load smoke: 100 concurrent room creations from 100 forwarded client
  identities returned 100 HTTP 200 responses.
- Browser coverage: desktop 1440 × 900 and mobile 390 × 844, keyboard and
  visible focus, every route at 200% text, 44 px touch targets, reduced motion,
  form-error focus, route titles, offline service-worker reload, response
  headers, privacy request capture, haptic fallbacks, and serious/critical axe
  checks all passed.
- URL verifier: 578 ms local load, no console errors, `lang=en`, one `h1`, one
  `main`, complete image alt text, and labeled buttons. Desktop and mobile
  screenshots are under `.factory/evidence/repair-25/local/`.
- Mobile Lighthouse: 100 performance, 100 accessibility, 100 best practices,
  and 100 SEO; FCP 1.1 s, LCP 1.8 s, TBT 30 ms, CLS 0. The report is
  `.factory/evidence/repair-25/lighthouse-mobile.json`.
- `git diff --check`: PASS.

## Claim and release verification

- From a new clone with empty dependency, frontend-build, and Rust-target
  caches, `npm ci` and all 22 exact commands in `.factory/claims.json` passed
  in manifest order.
- The first command proved the repaired cold path. Subsequent commands covered
  the 12-second 104 BPM sample, local audio, same-origin privacy, account-free
  rooms, copy recovery, shared scores, haptics, keyboard input, 60-second real
  rounds, durable expiry, database selection, public records, and live gates.
- The guarded deployment passed its build, one-revision/one-ready-replica
  topology, HTTP ingress, durable `/data` mount, restart persistence, 30 API
  and 30 reconnecting browser relay rounds, five exact rate-limit bursts, and
  final stability/identity check.
- The live URL verifier passed at desktop and 390 px mobile with no console
  error. Live `/health`, image tag, revision suffix, and built asset hashes
  matched the released commit.

Release commands:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
```

## Known limits

Phone vibration and controller haptics still depend on browser and device
support; the visual cue remains available. Rooms and scores are deliberately
ephemeral and expire after two hours. No new service, secret, analytics,
payment, AI dependency, storage account, or infrastructure resource was added.
