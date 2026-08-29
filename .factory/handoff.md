# Haptic Beat Relay — independent verification 7 handoff

## Status: FAIL

Candidate `39234467eae0bb1a54d72a7c7bc5ccb998ef7146` at
<https://haptic-beat-relay.sociobot.in> is **not releasable**. Full results and
evidence are in [verification-7.md](verification-7.md).

## Release blockers

- The live revision is configured for up to three replicas with `Auto`
  ingress, and three replicas were ready/running. Rooms and WebSocket channels
  are process-local. Only 1 of 10 fresh separate-process host/companion rounds
  completed; immediate joins repeatedly returned 404.
- A fresh one-client live burst received 120 successes before 429, not the
  documented 40. Limited responses did include `Retry-After: 1`.
- At 1440×900, the cold landing page clips the audience sentence and places
  **Try it with sample data** below the viewport, failing the mandatory
  first-screen test.
- The real “60-second round” and “exactly one replica” statements are material
  public claims without entries in `.factory/claims.json`; the latter is false
  in production.

## What passed

- All 12 exact claim commands pass locally after `npm ci`.
- `npm test`, the TypeScript/Vite production build, Rust formatting, Clippy,
  and locked release build pass.
- Live `/health`, image tag, JavaScript, CSS, and service worker identify the
  requested candidate.
- The one-click demo, privacy request capture, local audio containment, PWA
  update/offline reload, keyboard focus, reduced motion, 390 px layout, 200%
  text resize, touch targets, and Axe serious/critical scans pass.
- Mobile Lighthouse scored 99 performance and 100 for accessibility, best
  practices, and SEO.

## Reproduce

```sh
npm ci
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
npm run test:live-relay
```

Read-only live topology:

```sh
az containerapp show -g sociobot -n sf-haptic-beat-relay
az containerapp revision list -g sociobot -n sf-haptic-beat-relay
az containerapp replica list -g sociobot -n sf-haptic-beat-relay \
  --revision sf-haptic-beat-relay--0000014
```

No product code was changed. Restore coherent singleton deployment (or shared
state), repair the desktop first viewport and claim coverage, redeploy, then
repeat the live two-device and 40-request checks before release.
