# Haptic Beat Relay — repair handoff

## Status: deployed and verified

Repair revision `e4828c4f901cbf8ca457b33d11b066c80e97867c` is deployed to <https://haptic-beat-relay.sociobot.in>. `/health` returned `{"build_sha":"e4828c4f901cbf8ca457b33d11b066c80e97867c","status":"ok"}`.

## What was repaired

- Reproduced the verifier P0 locally with two real Axum processes: HTTP room creation on process A and a real WebSocket upgrade on process B returns HTTP `404`; process A accepts it. Covered by `regression_p0_separate_process_room_state_reproduces_the_websocket_404`.
- Deployment now enforces one active revision, `minReplicas: 1`, `maxReplicas: 1`, and HTTP ingress for WebSocket upgrades. The deploy script queries Azure after updating and fails unless those settings are live.
- Added `npm run test:live-relay`: 30 fresh desktop-host/390 px-companion browser rounds. It requires connect, cue, tap, matching shared score, and no browser/WebSocket/room-not-open failure.
- Canonicalized forwarded `IP:port` client identities and added a 40-request app-wide burst guard so Azure ingress variants cannot evade `429` plus `Retry-After: 1`.

## Verification evidence

- Fresh `npm ci` completed with 0 reported vulnerabilities. `npm test` passed: Vitest, release contract, Rust, clean browser entry-point, and desktop + 390 px Playwright. Final rate regressions, formatting, Clippy, release build, and `git diff --check` passed.
- ACR build succeeded from the root Dockerfile with `.git` excluded.
- Final live deployment is revision `sf-haptic-beat-relay--0000012`, `Single` mode, one active healthy replica at 100% traffic, `minReplicas=1`, `maxReplicas=1`, ingress `Http`.
- Final `npm run test:live-relay` completed 30 fresh two-browser rounds with no 404, room-not-open, or failed-WebSocket state.
- Final concurrent live `fetch` burst: **40 × 200**, **5 × 429**, and all five limited responses had `Retry-After: 1`.
- Existing local browser coverage exercises keyboard recovery, Axe serious/critical checks, desktop + 390 px layout/touch targets, privacy request capture, offline demo reload, service worker, reduced motion, and route/error semantics. The frontend artifact did not change in this repair.

## Run and deploy

```sh
npm ci
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
npm run test:live-relay
scripts/deploy-containerapp.sh <full-git-sha>
```

## Known gap

Rooms are intentionally ephemeral and disappear on restart. Scaling beyond one replica still requires replacing the in-memory room and broadcast transport with shared infrastructure.
