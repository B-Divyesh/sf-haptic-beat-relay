# Independent verification 25 — PASS

**Work order:** `haptic-beat-relay-verify-25`  
**Candidate/source commit:** `635cf01c74b8b712e70634e4094a9f61d3befd1b`  
**Live URL:** <https://haptic-beat-relay.sociobot.in>  
**Verified:** 2026-09-01

## Decision

**PASS — candidate accepted.** The previously reported clean-entry failure is
resolved: each browser claim command now builds the frontend before it starts
the local server. All declared claim commands, the complete local suite, and
the independent live checks passed.

## First-read test

Fresh desktop visit to the live root page passed the plain-words gate:

- **What:** “Send every beat to a friend” describes sending tactile cues and
  returning taps for a shared timing score.
- **For whom:** the first screen names “friends and rhythm-game makers”.
- **First action:** the visible **Try it with sample data** button says that a
  paired sample round opens now.

The first screen also states the three relevant facts: it is free, audio loops
stay on the host device, and the relay needs a connection. `/demo` directly
opened the isolated sample round with the persistent “Demo — sample data,
nothing is saved” banner, Reset demo, and Start for real control.

## Required claim gate

Ran from this clean checkout after `npm ci`, using the exact commands in
`.factory/claims.json`. Every result passed.

| Claims | Command | Result |
| --- | --- | --- |
| demo-sandbox; sample-duration | `npm run test:browser -- --grep @claim:demo-sandbox`; `…@claim:sample-duration` | PASS — 12-second sample on desktop and 390px mobile |
| local-audio; no-third-party | `npm run test:browser -- --grep @claim:local-audio`; `…@claim:no-third-party` | PASS |
| no-account; free-use | `npm run test:browser -- --grep @claim:no-account`; `…@claim:free-use` | PASS |
| shared-score; visual-cue | `npm run test:browser -- --grep @claim:shared-score`; `…@claim:visual-cue` | PASS |
| haptic-output | `npm run test:browser -- --grep @claim:haptic-output` | PASS |
| real-round-duration | `npm run test:browser -- --grep @claim:real-round-duration` | PASS — 60-second round |
| health | `npm run test:browser -- --grep @claim:health` | PASS |
| connection-required | `npm run test:browser -- --grep @claim:connection-required` | PASS |
| ephemeral-rooms | `cargo test claim_ephemeral_rooms_persist_across_restart_until_the_configured_ttl` | PASS |
| live-relay | `RELAY_ROUNDS=30 npm run test:live-relay` | PASS — 30/30 fresh API and reconnecting desktop-host/390px companion rounds |
| rate-limit | `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` | PASS — each of five identities received exactly 40 accepts then five `429` responses with `Retry-After: 1` |
| singleton-deployment | `npm run test:live-topology` | PASS |

## Build, tests, and code quality

- `npm ci`: PASS; zero audited vulnerabilities.
- `npm test`: PASS — 3 Vitest, 15 Rust, release/deployment/handoff contracts,
  clean browser entry point, and 37 passing Playwright tests (3 intentional
  skips).
- `cargo build --release`: PASS.
- `npm run build`: PASS — JavaScript 26.35 KB raw / 8.85 KB gzip; CSS 17.51 KB
  raw / 4.59 KB gzip, within the static budget.
- `cargo fmt --all -- --check`, `cargo clippy --locked --all-targets -- -D
  warnings`, and `git diff --check`: PASS.
- The Docker client is not installed in this verifier environment, so an
  image build could not be run locally. The independent live deployment
  identity/topology check below covers the deployed image.

## Live deployment, product flow, and boundaries

- `/health` returned `status: ok` and build SHA
  `635cf01c74b8b712e70634e4094a9f61d3befd1b`, matching the candidate.
- Live topology passed: one active revision (`sf-haptic-beat-relay--r635cf01c74`),
  min/max/running/ready replicas all one, HTTP WebSocket ingress, durable
  `/data` volume `sf-haptic-beat-relay-data`, and image
  `sociobotregistry.azurecr.io/sf-haptic-beat-relay:635cf01c74b8b712e70634e4094a9f61d3befd1b`.
- The 30-round live regression exercised fresh rooms, a delayed/dropped first
  score frame, host and companion reconnection, and matching acknowledged
  scores in desktop-host and 390px companion sessions.
- Live rate-limit assertion observed a documented allowance of exactly **40
  room API requests per second per forwarded client identity**; all later
  burst requests returned `429` with `Retry-After: 1`.
- `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`, manifest, social art,
  sitemap, and robots return 200. `/404` correctly returns 404.

## Accessibility, privacy, security, and responsiveness

- Independent Playwright + `@axe-core/playwright` scans of the live demo on
  desktop and 390px mobile found **zero serious or critical violations**.
  Both had one h1, no horizontal overflow, a real demo banner, and visible
  solid focus outlines while keyboard-tabbing. Reduced-motion context loaded
  without errors.
- No console errors or page errors occurred. The normal demo request log had
  only `https://haptic-beat-relay.sociobot.in`; no third-party fonts, scripts,
  trackers, analytics, accounts, or payment requests were seen.
- Root, demo, and health responses supply `X-Content-Type-Options: nosniff`,
  strict referrer policy, and a self-only CSP with response-header
  `frame-ancestors 'none'`. HTML is `no-cache`; hashed JavaScript and CSS are
  `public, max-age=31536000, immutable`.

## Defects by severity

None found.

## Known verification limitation

There is no `verify-url.sh` or Docker executable in this checkout/container.
The existing Playwright route checks plus the independent live Playwright,
axe, console, header, cache, focus, and request-log checks were used as the
equivalent URL verification; Docker image build could not be executed locally.
