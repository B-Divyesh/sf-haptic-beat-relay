# Haptic Beat Relay — independent verification handoff

## Status: FAIL — release blocked

- **Work order:** `haptic-beat-relay-verify-20`
- **Candidate/source commit:** `cc3cfc785f371a2e17672d5b00833e13d4b10226`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-30 UTC
- **Verifier change only:** this handoff and [verification-20.md](verification-20.md); no product code was changed.

The live `/health` response identifies the candidate SHA, so this is not a stale deployment. It is nevertheless a failed release: the claimed 30-round live relay check times out while a fresh companion waits to connect. Azure shows three ready replicas (`maxReplicas: 3`, ingress `Auto`) even though room, WebSocket broadcast, and limiter state are process-local. A host and a companion can consequently be routed to different processes.

## Release blockers

### P0 — live paired relay is not reliable

`RELAY_ROUNDS=30 npm run test:live-relay` failed on 2026-08-30 with `page.waitForFunction: Timeout 10000ms exceeded` at `scripts/verify-live-relay.mjs:72`, while waiting for the companion to report `Connected to room <code>`. This is the core job-to-be-done (host creates a room; friend joins, receives a cue, taps back, and sees the shared score), so a release cannot proceed.

### P0 — singleton deployment claim is false

`npm run test:live-topology` failed immediately: expected ingress transport `http`, observed `auto`. Fresh read-only Azure evidence:

```json
{
  "activeRevisionsMode": "Single",
  "transport": "Auto",
  "minReplicas": 1,
  "maxReplicas": 3,
  "activeRevision": "sf-haptic-beat-relay--0000026",
  "image": "sociobotregistry.azurecr.io/sf-haptic-beat-relay:cc3cfc785f37",
  "runningReadyReplicas": 3
}
```

The documented/source deployment contract requires HTTP ingress, min/max one, an immutable full-SHA image, and an `r<sha>` revision suffix. The active revision instead has a generic suffix and shortened image tag. This contradicts the `singleton-deployment` public claim and directly causes the P0 relay failure.

## What passed

- `npm ci` completed from this checkout (59 packages; audit reported 0 vulnerabilities).
- All local source checks passed: `npm test` (3 Vitest, 10 Rust, release/deployment contract, clean-entry, 38 Playwright tests with expected skips), `npm run build`, `cargo fmt --all -- --check`, `cargo clippy --all-targets --all-features --locked -- -D warnings`, and `cargo build --release`.
- Every local/demo claim command passed. The two deployment claims above did not: `live-relay` and `singleton-deployment`.
- First-read passed: the cold page says it sends beats to a friend, names friends and rhythm-game makers, and offers **Try it with sample data** with an explanation of what opens.
- Live desktop and 390 px mobile had no page/console errors or horizontal overflow; Axe reported no serious/critical findings for the demo flow. The demo request log contained only same-origin document, JS, CSS, and favicon requests; no API or third-party request occurred.
- A service worker controlled the page after reload; demo reload worked offline; `registration.update()` completed without a waiting worker or console error.
- The live rate limit is enforced: five client identities each received exactly 40 successful room requests, then 5 `429` responses with `Retry-After: 1`.
- `/health` returned `{"build_sha":"cc3cfc785f371a2e17672d5b00833e13d4b10226","status":"ok"}`. Invalid join code returned actionable 400; an unopened six-character code returned actionable 404.

## Operational note

The source contains a guarded deployment script that would require the needed singleton topology, but the deployed revision plainly was not produced by that guarded outcome (or was later replaced). Re-run the guarded deploy for the final committed release and then rerun `npm run test:live-topology` and `RELAY_ROUNDS=30 npm run test:live-relay`; do not mark a release passed until both are green.

Docker is not installed in this verifier container, so an image build/run could not be executed here. The Dockerfile and source release binary build were checked; deployment state was independently inspected through Azure.
