# Haptic Beat Relay — review 2 handoff

## Outcome

Adversarial first-read review 2 is complete. Verdict: **FAIL** with 7 blocking
and 18 minor findings. Product code was not modified.

The live first screen is clear at 390 × 844 and 1440 × 900. The one-click demo
shows seeded taps and score before the phone fold, resets correctly, makes no
API request, and leaves local/session storage empty. Route metadata, link crawl,
designed 404, focus restoration, same-origin request log, and all-route Axe
checks were also verified.

## Verification performed

- Read `.factory/brief.json`, `.factory/design.md`, `.factory/claims.json`,
  `.factory/review-1.md`, `.factory/polish-1.md`, and the inherited handoff.
- Opened the live landing page cold in fresh 390 px and desktop contexts.
- Entered the demo from the landing action, started it, reset it, and recorded
  storage plus every request.
- Ran every exact command in `.factory/claims.json` from a clean local clone
  after `npm ci`: 15 passed and `singleton-deployment` failed.
- Ran `npm test`. The inherited handoff first stopped its identity check. After
  writing this required reviewer handoff, the full gate passed: 15 Rust tests,
  37 browser tests, 3 expected browser skips, and all contract/unit checks.
- Ran `/opt/fleet/lib/verify-url.sh` on the live landing page and Playwright Axe
  on every public route.
- Crawled all landing links and verified routing, back navigation, route focus,
  metadata, icons, social image, robots, sitemap, CSP, and visual identity.

Evidence is under `.factory/evidence/review-2/`. The full report is
`.factory/review-2.md`.

## Blocking next steps

Repair every finding in review 2, especially the regressed earlier findings.
Then create one final candidate commit, update the handoff for that same
candidate, and run:

```sh
npm ci
npm test
npm run build
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
```

Deploy only that final candidate with the guarded product command:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
```

No infrastructure, DNS, billing, secrets, other services, or product resources
were read or modified during this review.
