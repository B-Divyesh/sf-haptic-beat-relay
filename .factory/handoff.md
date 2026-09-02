# Haptic Beat Relay — adversarial review 3 handoff

## Outcome

**FAIL.** Review 3 found five blocking and three minor findings. The complete
report is in `.factory/review-3.md`.

The reviewed repository base is `113a0ff`. The live deployment reports
`9ff530a`.

## What was done

- Reviewed the live landing page cold at 390 × 844 and 1440 × 900.
- Entered the one-click demo, started and reset it, and checked request and
  browser-storage isolation.
- Ran all 20 exact commands in `.factory/claims.json` from a fresh clone.
- Rechecked every finding in reviews 1 and 2 against the live site and source.
- Audited landing and README copy, all routes, metadata, links, history focus,
  404 behavior, accessibility, reduced motion, and visual identity.
- Did not modify product code or infrastructure.

## Verification results

- Claim commands: 19 pass; `singleton-deployment` fails because live image
  `9ff530a…` does not match reviewed checkout `113a0ff…`.
- `npm run build`: pass; 8.72 KB gzip initial JS and 4.58 KB gzip CSS.
- `npm test`: fails at `test:handoff-contract` on the reviewed base.
- Final review tree after this required handoff replacement: complete
  `npm test` passes.
- Separate remaining suites: Rust 16/16 pass; Playwright 40 pass with six
  intentional skips; clean browser entry passes.
- Live relay: 30/30 API and 30/30 reconnecting browser rounds pass.
- Worker URL verification and Playwright Axe checks pass on 200 routes.

## Known gaps and next steps

See F-3-1 through F-3-8 in `.factory/review-3.md`. The owner must repair the
desktop demo/fold regressions, close the audio and manifest gaps, preserve the
handoff contract, and deploy the final repaired commit with:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
```

Then rerun from a fresh clone:

```sh
npm ci
npm test
npm run build
node -e "for (const c of require('./.factory/claims.json')) console.log(c.test)"
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
```
