# Haptic Beat Relay — repair 17 handoff

## Release candidate

- **Repair base:** `b6e326aa4d4289f8f4f2d6b3db2f601a6dc31ff1`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Prior independent report:** [verification-17.md](verification-17.md)
- **Prepared:** 2026-08-29 UTC

## What changed

The independent verifier’s release blocker was reproduced against the existing
deployment before this repair. `RELAY_EXPECTED_SHA=f81c8daf05f9f1c4fc485cc7a80742df77dbf47f npm run test:live-topology`
failed at the required HTTP-ingress check with `actual: 'auto'` and
`expected: 'http'`. Azure also reported the unsafe `minReplicas: 1`,
`maxReplicas: 3` range and generic short-tag revision documented in the report.

The repair makes the singleton boundary executable and testable:

- `deploy/containerapp.json` records the only supported topology: Single
  revision mode, HTTP ingress, min/max one, and deliberately ephemeral
  process-local room, WebSocket, and rate-limit state. This preserves the
  researched brief: rooms expire after two hours and a restart clears them.
- `scripts/deploy-containerapp.sh` now waits for and requires exactly one
  active, running **and ready** replica, after applying single revision mode,
  the full candidate SHA image tag, SHA-derived revision suffix, min/max one,
  and HTTP ingress. It still refuses a dirty, unpushed candidate or a handoff
  from an earlier commit, then runs the topology, 30-round relay, and five
  fresh-client allowance gates.
- `scripts/verify-live-topology.mjs` independently asserts the ready container
  state in addition to active revision, traffic, ingress, scale, immutable full
  SHA image identity, revision suffix, and `/health` identity.
- The deploy harness now rejects both the verifier’s `Auto`/`1–3`/three-ready
  replica drift and a running-but-unready container before it can run a success
  gate.
- Rust regressions reproduce the exact process-local failure: a room created
  by one relay returns `404 room_not_found` on an immediate join routed to
  another; a 45-request burst spread over three relays admits all 45. The
  existing one-process regression proves the documented 40 successes then five
  `429` responses with `Retry-After: 1`.

## Verification completed before release

All commands below passed from this repair tree.

| Check | Evidence |
|---|---|
| Clean install | `npm ci` installed 59 packages and reported 0 vulnerabilities. |
| Unit, integration, browser, desktop/mobile | `npm test` passed: 3 Vitest tests, deployment/release contracts, 10 Rust tests, clean-browser entry-point check, and 38 Playwright checks at desktop and 390 px (the duplicate mobile 60-second timing case is intentionally skipped). |
| Regression reproduction | `cargo test` passed the exact separate-relay create→join `404` and three-relay 45/45 allowance reproductions. |
| Build/type checks | `npm run build` passed. Output: JS 23,164 bytes raw / 7.84 kB gzip; CSS 15,590 bytes raw / 4.21 kB gzip. |
| Rust quality/release | `cargo fmt --all -- --check`, `cargo clippy --all-targets --all-features --locked -- -D warnings`, and `BUILD_SHA=repair-local cargo build --release --locked` passed. |
| Runtime contract | With only `PORT=18080`, the release binary returned `{"build_sha":"repair-local","status":"ok"}` and logged `PORT supplied; no secrets required`. |
| Accessibility, keyboard, privacy, offline/update, response policy | The full Playwright suite covers Axe, skip-link and route-focus keyboard operation, labels/errors, desktop and 390 px overflow/touch checks, reduced motion, same-origin/no-audio-upload privacy capture, service-worker offline reload, headers/cache/CSP, and real 404 behavior. No serious or critical Axe violation was reported. |
| Container/package | This is a web-with-backend, not a consumer package. Docker is not installed in this worker, so image execution cannot be run locally; the multi-stage Docker/release contract test and its frontend and locked Rust builds passed. |

One direct live allowance check during reproduction,
`RELAY_RATE_REPETITIONS=1 RELAY_TEST_CLIENT=198.51.100.207 npm run test:live-rate-limit`,
returned the expected 40/5 while only one replica happened to be active. That
does not clear the blocker: verification 17 captured 45/45 after scale-out,
which is why the deployment guard now rejects the unsafe scale range and every
release runs five fresh-client bursts.

## Release procedure and remaining live evidence

Commit and push this handoff with the repair, then run `npm run deploy`. The
guarded command builds the candidate in ACR and is the final deployment action;
it blocks unless Azure reports Single revisions, HTTP ingress, min/max one, one
active 100%-traffic revision, one running and ready replica, the full candidate
SHA image tag, and the SHA-derived revision suffix. It then runs:

```sh
RELAY_EXPECTED_SHA=<candidate-sha> npm run test:live-topology
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
```

There are no known product gaps after the live gate passes. Do not scale this
implementation beyond one replica or add durable room storage without changing
the explicit ephemeral-room privacy/expiry contract and moving all relay and
rate-limit state together.
