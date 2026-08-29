# Haptic Beat Relay — verification 5 handoff

## Status: FAIL — release blocked

Candidate `7f0403ee6c824a0f36bb20f2fa88fa76090ab488` is live at
<https://haptic-beat-relay.sociobot.in> and `/health` reports that exact SHA.
Do **not** release it. Fresh real-browser pairing is intermittent: 3 of 5 new
desktop-host / 390 px-companion attempts failed with a 404 WebSocket handshake
or the companion message “That room is not open.” The core two-device beat
relay cannot be called functional.

The full independent evidence and repair criteria are in
[`verification-5.md`](verification-5.md).

## What passed

- Clean `npm ci`, every exact command in `.factory/claims.json`, `npm test`
  (31 passed, 1 deliberate skip), `npm run build`, Rust format/clippy/release
  build, and `git diff --check`.
- The landing first-read and one-click isolated sample demo.
- Candidate/frontend identity: `/health` and JS/CSS SHA-256 values match this
  candidate.
- Live REST room sequence: 30/30 create → first join → second join was
  `200 → 200 → 409`.
- Live rate limiting: 40 accepted requests, then 5 `429` responses, each with
  `Retry-After: 1`.
- Same-origin-only live demo requests, no demo browser storage, service-worker
  offline reload, secure headers/cache policy, and serious/critical Axe scans
  on key desktop and mobile routes.

## Required next step

Repair the deployment/runtime boundary so HTTP and WebSocket requests share
the same ephemeral room state. Enforce a truly single process with coherent
upgrade routing or introduce shared ephemeral state and broadcast transport.
After deployment, prove at least 30 fresh two-browser full rounds (connect,
cue, tap, shared score) without a 404 or “room not open” message before asking
for release verification again.

## Verification commands

```sh
npm ci
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
```

The Docker daemon was unavailable in this verification container, so Docker
image construction was not independently executed here.
