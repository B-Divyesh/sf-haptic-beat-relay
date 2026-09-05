# Haptic Beat Relay — repair 27 handoff

## Outcome

The copied-link vibration failure is repaired and deployed. A
friend must choose **Enable vibration** before the host can start. That trusted
tap activates Chromium's native vibration policy, confirms the available cue
mode, and moves the tap pad into view.

## Release identities

- Implementation SHA: `eaa617649adcaf745ef3aac9e7740a85fc24ff94`
- Documentation SHA: `f1441e4893d4c6f30bbf4d18262594c5b3fd7023`

The implementation SHA is the immutable image, health identity, and active
revision. The following release-metadata commit will point the documentation
SHA at this post-deployment record.

## What changed

- The joined friend view explains why one tap is required and keeps the action
  inside the first 390 × 844 screen.
- The host remains locked while a friend is merely connected. It unlocks only
  after the friend's trusted activation signal.
- The friend repeats that ready signal after either socket reconnects.
- Unsupported phones keep the existing visual cue fallback.
- The claims, public copy, design record, and live relay check now include the
  activation step.

## Regression coverage

The `haptic-output` browser claim opens the copied room link in a fresh 390 px
Chromium context. It proves these observable results:

- no friend interaction leaves the host action disabled;
- a programmatic click cannot unlock the host;
- a trusted tap calls Chromium's native vibration function successfully;
- the first relayed `45 ms` cue succeeds without the blocked-call error;
- controller dual-rumble and the visual cue still run;
- the active tap pad remains inside the phone viewport.

The paired browser and live relay checks also perform the activation step
before starting, including host and friend reconnection.

## Verification before deployment

- `npm ci`: passed with zero reported vulnerabilities.
- `npm test`: passed all 4 unit, 3 release-identity, 18 Rust, clean-start,
  formatting, strict Clippy, contract, and browser gates.
- The browser suite passed 42 checks with 8 intended project skips, including
  the native Chromium haptic claim in desktop and 390 px projects.
- Thirty local reconnecting host/friend relay rounds passed with equal,
  non-zero acknowledged scores.
- Production build: JavaScript 27.99 KB raw / 9.25 KB gzip; CSS 18.40 KB raw /
  4.76 KB gzip.

## Deployment verification

- The guarded deployment built and pushed the full-SHA image.
- One active HTTP revision runs one ready replica with durable SQLite at
  `/data`.
- A room remained joinable across a scoped restart, and a new write worked.
- All 30 live API rooms and 30 reconnecting desktop/phone pairs passed.
- Five clients each received 40 successful requests, then five `429` responses
  with `Retry-After: 1`.
- The final stability check still reported the exact implementation SHA and
  singleton topology after 60 seconds.

The clean declared-claim pass and cold HTTPS browser checks remain for the
final verification record.

## Run and verify

```sh
npm ci
npm test
npm run build
npm run test:live-topology
npm run test:live-persistence
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
```

For a future release candidate, commit and push its handoff, then run:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
```

## Known gaps

Physical vibration still depends on browser and device support. The product
states that limitation and keeps the visual cue fallback.
