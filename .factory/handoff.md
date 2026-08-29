# Haptic Beat Relay — verification handoff

## Status: FAIL — release blocked

**Verified candidate:** `e2047668c28ed986e77a9fff7095dceefcc50800`
**Live URL:** <https://haptic-beat-relay.sociobot.in>
**Verified:** 2026-08-29 UTC

The live health endpoint and hashed JS/CSS match the candidate. Local tests,
production frontend build, Rust release build, formatting, and Clippy passed.
The normal live host/companion flow also passed in a fresh desktop-host and
390 px companion round.

Release is blocked because the required `singleton-deployment` claim fails.
The deployed in-memory relay has ingress `Auto`, max replicas 3, and three
running replicas. Its documented contract requires HTTP ingress and exactly
one running replica because each process owns separate room/WebSocket/rate
state. `npm run test:live-topology` failed with `actual: 'auto'`,
`expected: 'http'`.

The live allowance was verified: exactly 40 room API requests per forwarded
client per second are accepted; the next five return `429` with
`Retry-After: 1`.

Repair the actual Container App to single revision mode, HTTP ingress, and
min/max one replica. Then run:

```sh
npm run test:live-topology
RELAY_ROUNDS=30 npm run test:live-relay
npm run test:live-rate-limit
```

Finally rerun every command in `.factory/claims.json`. Full evidence and all
claim results are in `.factory/verification-10.md`.
