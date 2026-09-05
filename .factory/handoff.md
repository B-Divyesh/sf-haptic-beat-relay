# Haptic Beat Relay — review 5 handoff

## Outcome

**FAIL.** Review 5 found one P1 live browser issue: a friend who opens a
copied join link receives no first phone vibration until they interact with
the page. No product code changed. The full report is `.factory/review-5.md`.

## Release identities

- Implementation SHA: `1964c68a15d95639acddeaf011e778d479bc4895`
- Documentation SHA: `ae67bc7a5a260283b1f8e070cbbbaf6c49419b16`
- Review base: `ae67bc7a5a260283b1f8e070cbbbaf6c49419b16`

The live health response, immutable image, revision, and topology match the
implementation SHA. Later commits only repair or record verification.

## What was verified

- All 22 exact claim commands passed from a fresh clone after `npm ci`.
- `npm test`, `npm run build`, Rust format, and strict Clippy passed.
- Fresh desktop and phone pages show the job, audience, sample action, and
  three facts before scrolling.
- The populated sample kept its demo label, reset to 86% and three taps, made
  no API request, and wrote no browser storage.
- A fresh host and phone friend exchanged a cue and showed the same score.
  Invalid, unknown, and second-friend cases returned clear responses.
- The checked-in browser suite covers Axe, keyboard, focus, 44 px targets,
  200% text, reduced motion, offline reload, links, legal pages, route titles,
  and the designed HTTP 404.
- One HTTP replica uses durable SQLite under `/data`. Restart persistence,
  health identity, tenant boundaries, relay recovery, and five exact
  rate-limit bursts passed.

Evidence is in `.factory/evidence/review-5/` and the full result is in
`.factory/review-5.md`.

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

## Known gap and next step

Before the host starts a round, require a friend who opened a copied link to
tap an explicit Enable vibration control. State the reason and preserve the
visual cue fallback. Update the haptic claim and its test to exercise a real
browser's user-activation rule, then redeploy and repeat the copied-link test.
