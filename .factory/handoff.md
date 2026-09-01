# Haptic Beat Relay — polish 2 handoff

## Outcome

Polish 2 closes every blocking and minor finding in review 2. It also closes
every earlier finding referenced by that review. The final release candidate is
the commit containing this handoff.

The landing copy now names phone vibration and a timing score. Demo, Join, and
Privacy remain visible at 390 px. `?demo=1` opens an isolated sample with a
persistent reset banner. The sample never calls room APIs or browser storage.

New claim tests cover sample tempo, copied room links, blocked clipboard access,
Space-key taps, exact health build identity, and SQLite path selection. Public
copy no longer promises audio playback, private rooms, exhaustive room data,
network-address retention, analytics absence, or deployment-script behavior.

## Verification

Local checks passed after `npm ci`:

```sh
npm run build
cargo test
npm run test:unit
npm run test:release-contract
npm run test:deployment-contract
npm run test:browser
```

The full browser run passed with its desktop and 390 px projects. It includes
the 60-second real-round measurement and 30 reconnect rounds. It checks routes,
titles, metadata, focus, unknown-route 404 status, mobile overflow, touch
targets, same-origin requests, offline sample reload, and Axe serious/critical
issues.

Every command listed in `.factory/claims.json` was run from a clean clone after
deployment. The guarded deployment also runs the repeated 30-round live relay,
five repeated rate-limit bursts, immutable topology check, and restart check.

```sh
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
npm run deploy -- "$(git rev-parse HEAD)"
```

Live screenshots and command output are under `evidence/polish-2/`. The finding
map is in `polish-2.md`.

## Run and deploy

```sh
npm ci
npm test
npm run build
npm run deploy -- "$(git rev-parse HEAD)"
```

## Known gaps

None. Browser vibration and controller haptics still depend on browser and
device support. The visual cue remains available when vibration is unavailable.
