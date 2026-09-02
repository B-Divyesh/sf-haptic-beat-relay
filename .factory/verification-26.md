# Verification 26 — PASS

**Candidate:** `9ff530a030b8d4cc20dbd22d4d35fad993c4bde8`  
**Live URL:** <https://haptic-beat-relay.sociobot.in>  
**Verified:** 2026-09-02

## Release decision

**PASS.** The live service identifies as the candidate commit and the complete local, claim, deployment, accessibility, privacy, PWA, and paired-device checks passed. No release-blocking defects were found.

## First-read check

Cold-load desktop and 390 px mobile both show the same first screen:

- **What it does:** “Send every beat to a friend.” It describes phone vibration cues and a shared timing score.
- **Who it is for:** friends and rhythm-game makers.
- **What to do first:** the prominent “Try it with sample data” link says that a paired sample round opens immediately.

The one-click action opens `/?demo=1`, with the persistent “Demo — sample data, nothing is saved” banner, Reset demo, and Create a real room controls. This satisfies the plain-words and demo-sandbox gates.

## Claim manifest

`.factory/claims.json` is present. From the clean checkout, after `npm ci`, I ran every command named by its 20 entries (each browser claim through the shipped demo entry point). All passed. The full clean-suite rerun below also covered the browser and Rust claim assertions; fresh captured live results are included for the deployment-sensitive claims.

| Claims | Required command | Result |
| --- | --- | --- |
| `demo-sandbox`, `sample-duration`, `sample-tempo` | `npm run test:browser -- --grep @claim:<id>` | PASS — isolated 104 BPM sample, measured 12-second round, reset path. |
| `local-audio`, `no-third-party` | respective browser claim commands | PASS — fixture bytes stay in-browser and recorded requests are same-origin. |
| `no-account`, `free-use`, `connection-required` | respective browser claim commands | PASS — real-room/offline recovery contains no sign-in or payment gate. |
| `copy-room-link`, `shared-score`, `visual-cue`, `space-key-tap`, `haptic-output` | respective browser claim commands | PASS — usable join URL and fallback, paired score/cue, Space tap, `vibrate(45)`, and controller-rumble stubs all asserted. |
| `health`, `real-round-duration` | respective browser claim commands | PASS — health identity and 60-second real round asserted. |
| `live-relay` | `RELAY_ROUNDS=30 npm run test:live-relay` | PASS — 30/30 fresh API create→join and 30/30 reconnecting desktop-host + 390 px companion rounds; delayed score replay acknowledged equally. |
| `ephemeral-rooms` | `cargo test claim_ephemeral_rooms_persist_across_restart_until_the_configured_ttl` | PASS — included in Rust suite. |
| `rate-limit` | `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` | PASS — each of five identities had exactly **40** accepted requests then **5** `429` responses with `Retry-After: 1`. |
| `singleton-deployment` | `npm run test:live-topology` | PASS — one active/ready HTTP replica, min/max one, `/data` mounted from `sf-haptic-beat-relay-data`, candidate image and health identity. |
| `database-path` | `cargo test claim_database_path_uses_an_explicit_path_then_data_or_the_executable_directory` | PASS — included in Rust suite. |

The observed documented API allowance is **40 room API requests per client per second**, followed by `429 Retry-After: 1`.

## Local quality gates

Fresh install: `npm ci` completed with no vulnerabilities reported.

- `npm test`: **PASS** — Vitest 3/3, release/deployment/handoff contracts, Rust 16/16, clean browser entry point, and Playwright **40 passed** (six deliberate browser-project skips).
- `npm run build`: **PASS** — TypeScript no-emit check and production Vite build. No separate lint script is defined by this repository.
- Browser suite covered the normal paired flow, malformed room code recovery, offline real-room recovery, invalid non-audio file handling, 60-second boundary, service-worker offline reload, 30 delayed-score reconnect rounds, and 390 px layout/touch targets.
- Production bundle: JS 26,088 bytes / **8.72 KB gzip**; CSS 17,462 bytes / **4.58 KB gzip**. Responsive hero files are 26,186 and 74,022 bytes. This is within the applicable budgets.

## Live deployment and end-to-end evidence

`/health` returned HTTP 200 with:

```json
{"build_sha":"9ff530a030b8d4cc20dbd22d4d35fad993c4bde8","status":"ok"}
```

`npm run test:live-topology` returned one active revision `sf-haptic-beat-relay--r9ff530a030`, one running and ready replica, HTTP transport, durable `/data`, and image `sociobotregistry.azurecr.io/sf-haptic-beat-relay:9ff530a030b8d4cc20dbd22d4d35fad993c4bde8`. The live deployment therefore matches the candidate.

Routes `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`, `robots.txt`, and `sitemap.xml` returned 200; an unknown route returned HTTP 404. Hashed assets are `public, max-age=31536000, immutable`; HTML and service-worker responses are `no-cache`.

## Privacy, security, accessibility, and PWA

- Cold desktop and 390 px Playwright loads made requests only to `https://haptic-beat-relay.sociobot.in`; no console or page errors occurred.
- A separate live `?demo=1` run started the sample and recorded no `/api/` calls, no local/session storage keys, and no external origin. The demo banner remained visible.
- Headers on HTML, 404, and health responses included `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a same-origin CSP with `frame-ancestors 'none'`. No third-party fonts or runtime scripts were loaded.
- `/opt/fleet/lib/verify-url.sh` passed: HTTPS 200, 611 ms cold load, title, `lang=en`, exactly one h1, a main landmark, no missing image alt attributes, no unlabeled buttons, and no console errors. Evidence is in `.factory/evidence/verification-26/`.
- Independent Axe scans at desktop and 390 px found **zero serious or critical violations**. The browser suite also passed keyboard skip-link/navigation/form-error recovery, visible focus checks, and touch-target checks.
- The registered `/sw.js` is no-cache, precaches the shell with cache version `haptic-beat-relay-v2`, calls `skipWaiting()` and `clients.claim()`, and the live demo reload succeeded offline under its controlling service worker.

## Defects

None found at P0, P1, P2, or P3 severity.
