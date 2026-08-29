# Independent verification 18 — FAIL

- **Work order:** `haptic-beat-relay-verify-18`
- **Candidate/source commit:** `1745df706a38c6404d236768e9b0ab2d3d780dd7`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 UTC

## Decision

**FAIL — release blocked.** The live frontend and `/health` identify as the
candidate, and all local quality gates pass. The live Container App does not
use the candidate's required singleton topology, however. It has three ready
replicas while rooms, WebSockets, and rate buckets are process-local. Fresh
checks reproduced complete failure of the core pairing path and failure of the
documented per-client request allowance.

## Mandatory first checks

### First-read test — PASS

A cold 1440 × 900 visit showed **“Send every beat to a friend.”** The next
sentence names **friends and rhythm-game makers** and says they get tactile
cues and shared timing. The first action is **“Try it with sample data”**, with
the adjacent explanation **“A paired sample round opens now.”** One click
opened `/demo`, already seeded with Sam, a 104 BPM practice loop, two past
scores, and the persistent **“Demo — sample data, nothing is saved”** banner,
plus **Reset demo** and **Start for real**. The gate passes.

### Claims gate — FAIL

The checkout initially contained no installed Node packages, so the literal
pre-install browser invocations stopped at the absent `tsc`. `npm ci` then
installed the locked 59 packages with zero reported vulnerabilities, after
which every exact command in `.factory/claims.json` was rerun. The installed
clean-clone results below are the acceptance evidence. Any failed listed claim
is release-blocking.

| Claim | Result | Fresh evidence |
| --- | --- | --- |
| `demo-sandbox` | PASS | Desktop and 390 px projects started and reset the seeded demo; no API request or browser storage. |
| `sample-duration` | PASS | Both projects kept the sample active before completing it after 12 seconds. |
| `local-audio` | PASS | Marked audio bytes were not sent. |
| `no-third-party` | PASS | Requests remained on the product origin. |
| `no-account` | PASS | A local room opened without sign-in. |
| `free-use` | PASS | No purchase or payment gate appeared. |
| `shared-score` | PASS locally | Two local contexts exchanged a cue, tap, and equal shared score. |
| `live-relay` | **FAIL** | `RELAY_ROUNDS=30 npm run test:live-relay` stopped on API room 1: create returned 200, immediate join for `WUVMKT` returned 404 `room_not_found`. |
| `ephemeral-rooms` | PASS | The exact Cargo TTL/restart claim passed. |
| `rate-limit` | **FAIL** | `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` accepted 45/45 requests for `198.51.100.200`; expected 40 successes and five 429s. |
| `health` | PASS | The exact browser claim returned a status and build SHA. |
| `connection-required` | PASS | Offline real-room creation displayed recovery guidance. |
| `visual-cue` | PASS locally | A vibration-free companion received the cue visual. |
| `haptic-output` | PASS locally | Stubbed phone and controller APIs received `vibrate(45)` and dual-rumble. |
| `real-round-duration` | PASS locally | The desktop run remained active at 59 seconds and completed at 60 seconds; the duplicate mobile run is intentionally skipped by the test. |
| `singleton-deployment` | **FAIL** | `npm run test:live-topology` found ingress transport `auto`, expected `http`. |

An earlier bootstrap-time live rate probe happened to return 40/5 for five
clients. The installed claim run four minutes later returned 45/0, and Azure
then showed three ready replicas. This change is consistent with unsafe
autoscaling and is not a stable pass.

## Release-blocking defects

### Critical — the live core room flow is split across process-local replicas

Fresh read-only Azure queries returned:

```json
{
  "activeRevisionsMode": "Single",
  "transport": "Auto",
  "minReplicas": 1,
  "maxReplicas": 3,
  "activeRevision": "sf-haptic-beat-relay--0000025",
  "image": "sociobotregistry.azurecr.io/sf-haptic-beat-relay:1745df706a38",
  "runningReplicas": 3,
  "readyReplicas": 3
}
```

This contradicts the checked-in contract requiring HTTP ingress, min/max one,
one ready replica, a full-SHA image tag, and an `--r<sha>` revision suffix.
The backend deliberately keeps room records and WebSocket broadcast channels
inside one process.

The listed live claim failed on its first immediate join. A separate
continue-on-error sample then created 30 fresh rooms successfully and got
**30/30 immediate join failures**, all `404 room_not_found`. A cold live
desktop `/host` load also logged a WebSocket handshake `404`. The deployed
product therefore cannot reliably perform its smallest useful host/companion
job.

### High — the live 40-request allowance is not enforced per client

The documented and tested allowance is exactly 40 room API requests per client
per second, followed by 429 responses with `Retry-After: 1`. The exact claim
accepted all 45 requests. A separate 125-request burst from one fresh forwarded
identity completed in 503 ms with **80 accepted** and 45 rate-limited; the 429s
did carry `Retry-After: 1`. Thus the measured live allowance was at least 80,
not 40. The replicas own separate counters.

## Candidate and deployment identity

`GET /health` returned the requested candidate exactly:

```json
{"build_sha":"1745df706a38c6404d236768e9b0ab2d3d780dd7","status":"ok"}
```

The fresh local production assets also byte-match the live assets:

- JavaScript: `dbddb8dcd88a7d77517153f3e1d6dede1bcbe65385cb5ea562eb74bc5e7c26d3`
- CSS: `75f30853abea59ac8abbd47cba9705f22ae575f7ea21aa4cf28cf4d587398e87`

This establishes that candidate code is being served. It does not satisfy the
deployment contract: Azure uses the short tag and generic revision above, not
the guarded full-SHA singleton rollout.

## Local quality and functional checks

- `npm ci`: PASS; 59 locked packages, zero vulnerabilities reported.
- `npm test`: PASS; 3 Vitest tests, release/deployment contracts, 10 Rust
  tests, the clean browser-entry regression, and 36 Playwright passes with two
  intentional project skips.
- `npm run build`: PASS; TypeScript check and exact Vite production build.
- `cargo fmt --all -- --check`: PASS.
- `cargo clippy --all-targets --all-features --locked -- -D warnings`: PASS.
- `BUILD_SHA=1745df706a38c6404d236768e9b0ab2d3d780dd7 cargo build --release --locked`:
  PASS.
- Release runtime with an empty environment except `PORT=18080`: PASS;
  `/health` returned the candidate SHA and startup logged
  `PORT supplied; no secrets required`.
- Local end to end at the UI tempo boundaries, 60 and 180 BPM: PASS. Each
  companion saw the correct live tempo, returned one tap, and matched the host
  score.
- Invalid and recovery paths: PASS. Short code returned 400 with correction
  text; unknown room returned 404; a second companion returned 409; non-audio
  upload was rejected with guidance.
- Local concurrency: PASS. 100 simultaneous distinct-client room creates all
  returned 200; a 45-request same-client burst returned exactly 40 successes,
  five 429s, and `Retry-After: 1`.
- Persistence boundary: PASS through the listed short-TTL/restart test. There
  is intentionally no database.
- Docker is unavailable in this worker, so an image could not be run locally.
  The checked-in multi-stage/non-root/build-argument contract tests passed.

## Live UI, accessibility, privacy, PWA, and HTTP

- `/opt/fleet/lib/verify-url.sh` passed: HTTPS 200, title, `lang=en`, one `h1`,
  one `main`, alt text, labels, and no landing-page console errors.
- Independent live scans of `/`, `/demo`, `/host`, `/join`, `/privacy`,
  `/terms`, `/404`, and an unknown route at 1440 px and 390 px found zero Axe
  serious/critical findings, no horizontal overflow, no undersized visible
  controls, and one `h1`/`main`. The normal `/host` WebSocket 404 is the runtime
  blocker above; intentional 404 documents log their 404 response.
- Keyboard-only checks passed: the skip link is first and has a 3 px cyan
  focus ring; Enter follows it; Enter opens the demo; route changes focus the
  new `h1`; invalid join input is announced by `role=alert` and returns focus
  to the input. All tested routes retained layout at 200% text.
- `prefers-reduced-motion: reduce` is honored; computed animation and
  transition durations collapse to `0.00001s`.
- A full demo start/reset made four same-origin static requests, no API request
  or WebSocket, and left localStorage, sessionStorage, and IndexedDB empty.
  A marked local audio fixture was not sent; all host traffic remained
  same-origin. No analytics, tracker, external font/script, payment, or sign-in
  traffic appeared. Entra verification is not applicable because the product
  has no authentication.
- Service-worker registration and `update()` passed. After a controlled reload,
  clearing the HTTP cache and going offline still reloaded `/demo` with its
  sample action.
- Documents, health, scripts, styles, images, service worker, manifest, and 404
  responses carried the self-only CSP as a response header, including
  `frame-ancestors 'none'`, plus `nosniff` and strict-origin referrer policy.
  HTML and `sw.js` are `no-cache`; hashed assets are immutable for one year.
  Internal routes and the one external site link resolved; mailto is exempt.

## Performance and bundle budgets

Lighthouse mobile on the live landing page scored **100 performance / 100
accessibility / 100 best practices / 100 SEO**. FCP was 1.2 s, LCP 1.5 s,
TBT 0 ms, CLS 0, and total transfer 166,634 bytes with no third-party bytes.

- JavaScript: 23,164 bytes raw / 7,864 bytes gzip (budget 200 KB)
- CSS: 15,590 bytes raw / 4,218 bytes gzip (budget 50 KB)
- Mobile hero: 26,186 bytes (budget 300 KB)
- Fonts: 0 bytes

The live JS and CSS hashes match the clean candidate build.

## Applicability notes and required repair

This is not a library or CLI, so consumer pack/install checks do not apply.
The product does not require sign-in or payment. AI would not improve the core
physical relay job, so no missing AI feature is reported.

Deploy the final committed candidate only through the guarded deployment path.
Before another verification, Azure must show HTTP ingress, min/max one, one
ready replica, the full candidate SHA image tag, and the SHA-derived revision
suffix. Then rerun every claim, especially the topology, 30-round relay, and
five-client rate-limit commands. Do not scale beyond one replica unless room,
WebSocket, and rate-limit state move to shared infrastructure.
