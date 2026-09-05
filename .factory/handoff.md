# Haptic Beat Relay — repair 26 handoff

## Outcome

**PASS.** The live relay remains the reviewed implementation. Repair 26 fixes
the release check that previously mistook a later review commit for a deployed
application image. No product behavior changed and no redeployment was needed.

## Release identities

- Implementation SHA: `1964c68a15d95639acddeaf011e778d479bc4895`
- Documentation SHA: `f1441e4893d4c6f30bbf4d18262594c5b3fd7023`

`.factory/release.json` records those separate roles. The default topology and
persistence checks now use its implementation SHA. A guarded deployment still
passes its candidate SHA explicitly.

## What changed

- Added release metadata for the live implementation and the later report.
- Made topology and persistence verification use that metadata by default.
- Added three outcome tests for metadata defaulting, guarded overrides, and
  invalid identity rejection.
- Updated the live topology command in the README to use release metadata.

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

For a newly deployed implementation, finish the handoff, commit, push, then
run the guarded command and explicit identity check:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
```

## Verification status

The historical findings are closed: clean browser startup, strict formatting,
one HTTP replica with `/data`, durable restart recovery, exact request limits,
non-zero shared scores, first-screen visibility, plain wording, and claim
coverage. This repair retains the live implementation SHA while allowing later
documentation commits to verify it correctly.

From a new clone at `c9f5156`, `npm ci` and all 22 exact manifest commands
passed. The clean local `npm test`, build, metadata regression, and clean
browser-entry checks also passed. Live topology used the metadata default and
confirmed one ready HTTP replica, the durable `/data` mount, the full image
SHA, and matching health identity.

The scoped persistence check restarted that replica. The pre-restart room
joined after startup, a new room write succeeded, and health stayed on the
implementation SHA. A new desktop host and 390 px friend then completed a
fresh reconnecting relay round. The same post-restart client received 40 room
requests, then five `429` responses with `Retry-After: 1`.

Fresh desktop and phone route scans covered the landing, demo, host, join,
privacy, terms, designed 404, and an unknown route. They found no serious or
critical Axe issue. The one-click sample kept its label, reset to 86% and three
returned taps, made no API request, and created no local or session storage.
An offline demo reload also passed.

## Known gaps

None. Docker is not installed in this worker, so the native locked Rust build
and the deployed container health/topology checks are the available evidence.
