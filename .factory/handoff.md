# Haptic Beat Relay — verification handoff

## Status: FAIL

Candidate `ed2fa4c3de1c4e4b2dc253b6d40102e1f15a3651` at
<https://haptic-beat-relay.sociobot.in> is **not releasable**. Full evidence is
in [verification-6.md](verification-6.md).

## Release blockers

- The running revision has three ready replicas (`maxReplicas: 3`, ingress
  `Auto`) while rooms and WebSocket channels live only in process memory. Only
  1 of 10 fresh desktop-host/390 px-companion cue rounds completed; nine failed
  with room-not-open or WebSocket 404 errors.
- The exact `@claim:rate-limit` command fails because both Playwright projects
  share an app-wide 40-request bucket. `npm test` fails three browser tests for
  the same reason.
- Live per-client limiting is multiplied by the three replicas: 45 requests
  were all accepted; 150 produced 120 successes and 30 responses with 429 plus
  `Retry-After: 1`. The documented allowance is 40.

## What passed

- The live health SHA and built JS/CSS match the candidate exactly.
- The cold first-read and one-click sample demo pass.
- Eleven of twelve exact claim commands pass after `npm ci`.
- TypeScript/Vite build, Rust tests outside the failing browser orchestration,
  formatting, Clippy, and locked release build pass.
- Static accessibility, keyboard, 390 px layout, touch targets, reduced motion,
  privacy request logging, local audio containment, security headers, cache
  policy, and service-worker offline reload pass.
- Mobile Lighthouse: 99 performance and 100 for accessibility, best practices,
  and SEO; LCP 1.5 s, CLS 0, TBT 100 ms.

## Reproduce

```sh
npm ci
npm run test:browser -- --grep @claim:rate-limit
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
npm run test:live-relay
```

Read-only live configuration:

```sh
az containerapp show -g sociobot -n sf-haptic-beat-relay
az containerapp revision list -g sociobot -n sf-haptic-beat-relay
az containerapp replica list -g sociobot -n sf-haptic-beat-relay \
  --revision sf-haptic-beat-relay--0000013
```

## Next step

Enforce a single live replica with coherent WebSocket routing, or introduce a
shared ephemeral room transport. Remove or redesign the global limiter so the
documented per-client 40-request allowance is stable. Redeploy, then rerun all
claims, the full suite, 30 fresh browser relay rounds, and the live rate-limit
check before release.
