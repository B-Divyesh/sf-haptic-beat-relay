# Haptic Beat Relay — verification 19 handoff

## Status: PASS

- **Verified candidate:** `1a9cd415c5d3f6db834b57cc1e68f6f58b93b4df`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Date:** 2026-08-29 UTC
- **Full independent evidence:** [verification-19.md](verification-19.md)

Independent QA passed. The live health response, Azure singleton revision, full
immutable image tag, and browser assets match the candidate. Azure reports
HTTP ingress, exactly one active revision, min/max one, and one ready replica;
the prior deployment-only multi-replica failure is not reproduced.

Every manifest claim command passed from a clean `npm ci` install, as did
`npm test`, strict Rust format/Clippy/release-build checks, empty-environment
runtime, local error/concurrency/boundary flows, and live desktop/390 px
WebSocket relay flows. The observed allowance is exactly **40 room API requests
per client per second**, then **429 with `Retry-After: 1`**, confirmed for five
fresh live client identities.

The first-read/sample-demo gate, Axe, keyboard/focus/reduced-motion, privacy
request log and storage checks, response headers, caching, and bundle budgets
all passed. No defects were found. Docker and a standalone Lighthouse command
are absent from this verifier image; their repository contract checks passed,
and the full browser/header/cache evidence is in the report.

Reproduce with:

```sh
npm ci
npm test
npm run build
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
npm run test:live-topology
```

---

## Prior repair 18 deployment record

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

The guarded ACR build and rollout for the implementation/handoff commit
`f533f683511c3f109827b08d503074d547266238` completed successfully. Its image
digest is `sha256:41ec01fb936c3e049f0ab52ed9032e25f0b3d6aab653a0f49288dc1c9aae159b`.
The source-owned deploy command returned this topology both before and after
its final 60-second stability window:

```json
{
  "revision": "sf-haptic-beat-relay--rf533f68351",
  "activeRevisions": 1,
  "minReplicas": 1,
  "maxReplicas": 1,
  "runningReplicas": 1,
  "readyReplicas": 1,
  "transport": "Http",
  "image": "sociobotregistry.azurecr.io/sf-haptic-beat-relay:f533f683511c3f109827b08d503074d547266238",
  "buildSha": "f533f683511c3f109827b08d503074d547266238"
}
```

`RELAY_ROUNDS=30 npm run test:live-relay` passed 30/30 fresh API
create→join checks and 30/30 fresh desktop-host/390 px companion WebSocket
rounds. `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` passed for five
fresh clients; every burst returned exactly 40 successes, five `429` responses,
and `Retry-After: 1`.

Post-deploy `verify-url.sh` returned HTTPS 200 in 595 ms with no console errors,
the correct title and language, one h1/main, and no missing alt text or button
names. `/health` returned the full deployed SHA. `/`, `/demo`, `/host`, `/join`,
`/privacy`, and `/terms` returned 200; `/404` and an unknown route returned 404.
Response headers included the self-only CSP with `frame-ancestors 'none'`,
`nosniff`, strict-origin referrer policy, and `no-cache` for HTML. Live JS and
CSS hashes remained `dbddb8d…26d3` and `75f3085…8e87`, matching the independently
verified candidate assets.

This evidence-only handoff update is committed and pushed before the final
guarded rollout, so the public `/health`, image tag, and revision suffix must
identify the final repository `HEAD` when the work order completes. No product
gaps remain while the documented singleton boundary is retained. Do not scale
beyond one replica unless room, WebSocket, and rate-limit state move together
to shared storage.
