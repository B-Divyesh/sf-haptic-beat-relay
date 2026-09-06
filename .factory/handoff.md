# Haptic Beat Relay — repair 27 handoff

## Outcome

**PASS.** A friend who opens a copied room link now chooses **Enable
vibration** before the host can start. That trusted tap satisfies Chromium's
activation rule. The first relayed cue then uses phone vibration without the
blocked-call error. Phones without vibration keep the visual cue.

## Release identities

- Implementation SHA: `eaa617649adcaf745ef3aac9e7740a85fc24ff94`
- Documentation SHA: `48f512029a30bb300a8b59d4c79f1942124eb69a`
- Clean claims checkout: `affc6c1e883ede2607cfbe44f4e8503d6184adf5`
- Live URL: <https://haptic-beat-relay.sociobot.in>

The implementation SHA identifies the immutable image, health response, and
active revision. The later SHAs record deployment and verification only.

## What changed

- The joined friend view explains the required tap before the round.
- The host stays locked until it receives the friend's ready signal.
- A programmatic click cannot mark the friend ready.
- The friend repeats the ready signal after either socket reconnects.
- The activation panel collapses and places the tap pad in the phone viewport.
- Backend validation accepts the friend-only `haptic_ready` message.
- Public copy, the design record, claims, and live relay check describe the
  activation step.
- The `haptic-output` claim now delegates to Chromium's native Vibration API.
  It checks the activation pulse and the first relayed cue outcome.

## Verification

- A fresh remote clone at `affc6c1…` completed `npm ci` with zero reported
  vulnerabilities. All 22 declared claim commands then passed in manifest
  order.
- `npm test` passed 4 unit tests, 3 identity tests, 18 Rust tests, clean-start,
  formatting, strict Clippy, contract checks, and 42 browser checks. Eight
  browser-project skips were intentional.
- `npm run build` produced 27.99 KB JavaScript and 18.40 KB CSS. Gzip sizes are
  9.25 KB and 4.76 KB.
- The copied-link production check kept the host locked before interaction.
  It rejected an untrusted click, accepted the real tap, and returned `true`
  from native `vibrate(30)` and `vibrate(45)` calls.
- The same production round invoked 60 ms controller dual-rumble. The host and
  phone both showed one returned tap and 91% accuracy without browser errors.
- Desktop 1440 × 900 and phone 390 × 844 cold loads showed the job, audience,
  sample action, outcome, and three facts before scrolling.
- The sample opened in one click with its persistent label, 86% score, and
  three returned taps. Reset restored those values. It made no API or external
  request and left local storage, session storage, and IndexedDB empty.
- Sixteen desktop/phone route scans found one h1 and main, `lang=en`, useful
  titles, no overflow at normal or 200% text, and zero serious or critical Axe
  findings. Every visible phone target was at least 44 px.
- Keyboard focus reached the skip link first with a 3 px cyan outline. Reduced
  motion disabled smooth scrolling and reduced transitions to `0.01 ms`.
- The service worker reloaded the complete sample offline after the browser
  cache was cleared. Every rendered link resolved; the deliberate 404 routes
  returned HTTP 404 with the designed page.
- Invalid, unknown, first-friend, and second-friend API checks returned 400,
  404, 200, and 409 respectively.
- The guarded deployment passed restart persistence, 30 fresh API rooms, 30
  reconnecting desktop/phone rounds, and five exact rate-limit bursts. Each
  client received 40 successes and five `429` responses with
  `Retry-After: 1`.
- A 100-request concurrent load smoke returned 100 successful responses.
- The final stability check found one active HTTP revision, one ready replica,
  durable SQLite at `/data`, and the full implementation image.
- The standard URL verifier loaded HTTPS in 582 ms with no console error.
  Lighthouse mobile scored 99 performance, 100 accessibility, 100 best
  practices, and 100 SEO. LCP was 1.7 s, TBT 120 ms, and CLS 0.

Evidence is in `.factory/evidence/repair-27/`.

## Earlier findings

- Review 5 F-5-1 is fixed by the trusted activation gate and native-browser
  regression above.
- Reviews 1–3 copy, demo visibility, first-screen, route, and claims findings
  remain fixed in the cold screenshots, copy audit, route scans, and 22 passing
  claim commands.
- Verifications 1–3 clean startup, expiry, offline shell, targets, HTTP 404,
  invalid file, and Docker findings remain fixed in the passing suite.
- Verifications 4–22 topology, split-room, and allowance findings remain fixed.
  The live service uses one ready HTTP replica with durable `/data` storage.
- Verifications 23–24 score replay remains fixed by all 30 reconnect rounds.
- Verification 27 timing and formatting findings remain fixed by the complete
  suite, formatting check, and measured tempo claim.
- Verification 28 cold compilation remains fixed. The first browser claim in
  the fresh clone built Rust before Playwright's timer and passed.
- Review 4 F-4-1 remains fixed. The exact topology command used the recorded
  implementation SHA from the later clean checkout.

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

Physical vibration still depends on browser and device support. Automated
Chromium proved the native API accepted both calls, but cannot observe a real
phone motor. The product states this limitation and keeps visual cues.
