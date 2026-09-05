# Haptic Beat Relay — verification 30 handoff

## Outcome

**PASS.** Independent QA found zero findings at every severity and zero
untested public claims. No product code changed. The full report is
`.factory/verification-30.md`.

## Release identities

- Implementation SHA: `1964c68a15d95639acddeaf011e778d479bc4895`
- Documentation SHA: `f1441e4893d4c6f30bbf4d18262594c5b3fd7023`
- Verification base: `3976ed04a7b47b5d0db3b7808ca6c47b49145e27`

The live health response, immutable image, revision, and frontend bytes match
the implementation SHA. Later commits only repair or record verification.

## What was verified

- All 22 exact claim commands passed from a fresh clone after `npm ci`.
- `npm test`, `npm run build`, Rust format, and strict Clippy passed.
- Fresh desktop and phone pages show the job, audience, sample action, and
  three facts before scrolling.
- The populated sample kept its demo label, reset to 86% and three taps, made
  no API request, and wrote no browser storage.
- A fresh host and phone friend exchanged a cue and showed the same non-zero
  score. Invalid, unknown, and second-friend cases returned clear responses.
- Sixteen live route/Axe checks found zero serious or critical issues. Keyboard,
  focus, 44 px targets, 200% text, reduced motion, offline reload, links, legal
  pages, route titles, and the designed HTTP 404 passed.
- Lighthouse mobile scored 100 in Performance, Accessibility, Best Practices,
  and SEO. LCP was 1.5 s, total blocking time 20 ms, and CLS 0.
- One HTTP replica uses durable SQLite under `/data`. Restart persistence,
  post-restart writes, relay recovery, health identity, tenant boundaries, and
  five exact rate-limit bursts passed.
- A 100-request smoke with distinct client identities returned 100 successes.

Evidence is in `.factory/evidence/verification-30/`. The URL verifier result is
`.factory/evidence/verification-30/verify-url/verify.json`.

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

## Known gaps and next steps

None. No redeploy is needed for this report-only verification.
