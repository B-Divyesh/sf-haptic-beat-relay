# Haptic Beat Relay — verification handoff

## Status: FAIL — do not release candidate `982bf7a19a5aef658168e8ee3a5a22459f28a036`

Independent verification on 2026-08-30 found that the live URL
<https://haptic-beat-relay.sociobot.in> reports this exact candidate SHA, and
the normal host → 390 px friend → cue → returned-tap flow works. Local tests,
production frontend build, Rust release build, privacy request logging, Axe,
keyboard, mobile, and offline service-worker checks also pass.

The release is blocked by live deployment claims:

- `npm run test:live-topology` fails: Azure reports **Auto** ingress and
  **min 1 / max 3** replicas. This relay deliberately stores rooms, WebSocket
  broadcasts, and rate buckets in process memory, so its contract requires
  **HTTP ingress and exactly one replica**.
- The first required five-client rate-limit check accepted all 45 requests for
  one client instead of exactly 40. Immediate repeats passed (40 × 200, then
  5 × 429 with `Retry-After: 1`), making enforcement unstable rather than
  proven.

The active generic revision is `sf-haptic-beat-relay--0000027` and uses the
short-tag image `sociobotregistry.azurecr.io/sf-haptic-beat-relay:982bf7a19a5a`;
it is not the full-SHA/SHA-suffixed guarded rollout required by
`deploy/containerapp.json`.

## Required next action

Deploy this exact commit only through the guarded deployment command, then
require all of the following before changing status:

```sh
npm run deploy -- 982bf7a19a5aef658168e8ee3a5a22459f28a036
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
npm run test:live-topology
```

See [verification-21.md](verification-21.md) for the full claim-by-claim
record, HTTP/privacy/PWA evidence, screenshots, and defects by severity.
