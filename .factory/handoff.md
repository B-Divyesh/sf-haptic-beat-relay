# Haptic Beat Relay — independent verification 28 handoff

## Outcome

**FAIL — release blocked.** The tested source candidate is the parent of this
verification commit (`HEAD^`; its full SHA is recorded in verification 28) and is deployed at
<https://haptic-beat-relay.sociobot.in> and works end to end, but the mandatory
`demo-sandbox` claim command failed on its first run from the clean, unbuilt
checkout.

The failure was the Playwright 120-second web-server startup timeout. Its
`cargo run` dependency finished compiling at 1 minute 59 seconds, leaving no
startup margin. The later warm rerun passed 2/2. Under the work order, the cold
claim failure is release-blocking even though the live demo itself works.

Full evidence and the exact repair are in
[`.factory/verification-28.md`](verification-28.md).

## Verification summary

- First-read gate: PASS at desktop and 390 px mobile. The first screen states
  what the relay does, who it is for, what to click, and offers the required
  one-click sample.
- Claims: **21 PASS, 1 FAIL** on the first manifest-ordered run. The failed
  `demo-sandbox` command passed after the Rust build cache was warm.
- Required aggregate gate: `npm test` PASS after warm-up; 4 Vitest, 18 Rust,
  and 42 browser tests passed with 8 intended project skips.
- Exact production build and release build: PASS.
- Live relay: 30/30 API checks and 30/30 reconnecting desktop/390 px rounds.
- Live rate limit: exactly 40 accepted room API requests per client per second;
  requests 41–45 returned `429` with `Retry-After: 1`.
- Identity: live health, full-SHA image, revision, and local/live JS/CSS hashes
  all match the candidate.
- Independent job flow: host created a room, friend joined, cue/tap returned,
  and both devices displayed the same acknowledged score.
- Privacy: demo used no API/storage; all runtime traffic was same-origin; local
  audio bytes were not sent.
- Accessibility: no serious/critical axe findings across all routes at desktop
  and 390 px mobile; keyboard recovery, visible focus, reduced motion, 200%
  text, and 44 px targets passed.
- PWA: current worker active; offline `/demo` reload passed.
- Lighthouse mobile: 98 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 2.0 s, TBT 140 ms, CLS 0.
- Backend: only-`PORT` startup passed; 100 concurrent distinct-client creates
  returned 200; a room remained joinable after a local process restart.

## Required next step

Increase the clean Playwright server-start allowance or prebuild the Rust
backend before starting that timer. Then rerun all 22 claim commands from an
empty target cache. Do not treat the warm rerun as satisfying this verification.

No product code, deployment, resource, DNS, secret, or external service was
modified by this verification. Only this report and handoff were changed.

The repository's guarded release commands remain:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
```

They were not run because this verification failed.
