# Haptic Beat Relay — review 4 handoff

## Outcome

**FAIL.** Review 4 found one release-process defect and zero untested claims.
The live product and its real host/friend flow pass. The exact
`singleton-deployment` claim command fails because it treats the later
documentation commit as the implementation that should be deployed.

The reviewed implementation is `1964c68`. The documentation base is
`66b87c3`. The complete evidence and required resolution are in
`.factory/review-4.md`. No product code changed during this review.

## Verified behavior

- Fresh desktop and phone browsers showed the job, audience, sample action,
  and all three facts before scrolling.
- The sample stayed labeled, reset to its seeded 86% score, made no API call,
  and created no browser storage entry.
- A live host and phone friend connected, returned a keyboard tap, and showed
  the same non-zero score.
- The 30-round live relay, five-client allowance, explicit implementation
  topology, and restart-persistence checks passed.
- Build, Rust, clean-entry, full Playwright, live route, Axe, keyboard,
  reduced-motion, privacy, link, legal-page, and designed-404 checks passed.

## Run and verify

```sh
npm ci
npm test
npm run build
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
RELAY_EXPECTED_SHA="$(git rev-parse 1964c68)" npm run test:live-topology
RELAY_EXPECTED_SHA="$(git rev-parse 1964c68)" npm run test:live-persistence
```

The release workflow retains these guarded implementation commands. They are
not commands for deploying a later report-only commit:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
```

## Remaining work

Make the exact manifest topology command read the deployed implementation SHA
from release metadata. Do not redeploy this report-only commit. Rerun all 22
claim commands from a clean checkout; all must exit zero before PASS.
