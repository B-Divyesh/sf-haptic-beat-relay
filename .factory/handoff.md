# Haptic Beat Relay — repair 18 handoff

## Status: repaired and release-gated

- **Work order:** `haptic-beat-relay-repair-18`
- **Repair base:** `c61010cc7b3fc0cf85339af895f7be34b99bf71a`
- **Failed candidate:** `1745df706a38c6404d236768e9b0ab2d3d780dd7`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Independent report:** [verification-18.md](verification-18.md)
- **Verified:** 2026-08-29 UTC

## Finding reproduction and root cause

The fresh live topology command failed before repair with `actual: 'auto'` and
`expected: 'http'`. Azure showed the generic short-tag revision
`sf-haptic-beat-relay--0000025`, image tag `1745df706a38`, and a `1–3` replica
range. The report observed three ready replicas. Room records, WebSocket
broadcasts, and rate buckets are process-local, so that rollout caused all
three reported failures.

The existing exact Rust reproductions also passed:

- a room made in one relay returns `404 room_not_found` when the immediate
  companion join reaches a second relay;
- a 45-request burst spread across three independent rate buckets admits all
  45 requests rather than returning five `429` responses.

The prior guarded deployment had passed and was then replaced by the factory's
later generic work-order rollout. That release sequencing—not the frontend or
relay implementation—was the remaining root cause.

## Repair and regression coverage

The source-owned deployment already enforces Single revision mode, HTTP
ingress, min/max one replica, one running and ready container, a full immutable
SHA image, an SHA-derived revision suffix, and live relay/rate-limit checks.
This repair closes the late-replacement gap:

- `scripts/deploy-containerapp.sh` now waits 60 seconds after the functional
  live gates, then makes topology and immutable build identity the final gate.
- `scripts/verify-deploy-containerapp.mjs` reproduces verification 18's exact
  order: the initial topology, relay, and allowance checks pass; a later
  work-order replacement occurs; the final topology check fails the release.
- `scripts/verify-release-contract.mjs` requires both pre-functional and final
  topology/identity checks, plus the reconciliation window.
- `README.md` documents the final stability gate and release order.

The researched brief, visual system, ephemeral-room privacy boundary, and all
previously passing product behavior are unchanged.

## Local verification

| Check | Exact evidence |
|---|---|
| Clean install | `npm ci` installed 59 locked packages; audit reported 0 vulnerabilities. |
| Complete suite | `npm test` passed 3 Vitest tests, both release/deployment contract suites, 10 Rust tests, the clean-entry check, and 36 Playwright tests; 2 project-specific duplicates were intentionally skipped. |
| Exact new regression | `npm run test:deployment-contract` passed the late work-order replacement failure case and all prior drift/readiness/release-order cases. |
| Every local claim | Every non-live command listed in `.factory/claims.json` passed from the clean install, including the measured 12-second sample and 60-second real round. |
| Type and production build | `npm run build` passed; JS is 23.16 kB raw / 7.84 kB gzip and CSS is 15.59 kB raw / 4.21 kB gzip. |
| Rust quality | `cargo fmt --all -- --check`, strict locked Clippy, and `BUILD_SHA=repair-18-precommit cargo build --release --locked` passed. |
| Empty-environment runtime | The release binary started with only `PATH` and `PORT=18080`; `/health` returned `{"build_sha":"repair-18-precommit","status":"ok"}` and startup logged `PORT supplied; no secrets required`. |
| Accessibility and browser QA | Desktop and 390 px projects passed Axe, keyboard/skip-link/route focus, 200% text, 44 px touch targets, reduced motion, error announcements, and one-h1/main checks. |
| Privacy, offline, update, response policy | Browser tests passed same-origin/no-audio-upload capture, empty demo storage, service-worker update and offline reload, CSP/cache/security headers, route crawl, and real 404 checks. |
| Local URL smoke | `verify-url.sh` returned HTTP 200, title `Haptic Beat Relay — send tactile beat cues`, `lang=en`, one h1/main, no missing alt or button names, and no console errors. |
| Package/consumer | Not applicable: this is a `web-with-backend` product, not a package. |
| Container | Docker is unavailable in this worker. The locked multi-stage/non-root Docker contract passed locally; the work-order ACR build is the container build gate. |

## Final deployment evidence

The final handoff commit is pushed before deployment. The guarded container
deployment is then the last release mutation and must return all of the
following before success:

- one active revision at 100% traffic;
- `Http` ingress and min/max `1/1`;
- one running and ready replica;
- full `HEAD` SHA in the image tag, revision suffix, and `/health`;
- 30/30 fresh API and desktop-host/390 px companion relay rounds;
- five fresh-client bursts, each exactly 40 accepted and five `429` responses
  with `Retry-After: 1`;
- the same singleton topology and identity after the final 60-second stability
  window.

Post-deploy browser verification covers the landing page and `/demo` at desktop
and 390 px, keyboard use, accessibility, privacy, offline/update behavior,
response headers, and live build identity. No product gaps remain while the
documented singleton boundary is retained. Do not scale beyond one replica
unless room, WebSocket, and rate-limit state move together to shared storage.
