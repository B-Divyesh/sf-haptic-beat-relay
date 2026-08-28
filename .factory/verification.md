# Independent verification — FAIL

**Work order:** `haptic-beat-relay-verify-1`  
**Candidate/source commit:** `07ebb2f3a8984b6ad8bc885a121ccc0520043e96`  
**Live URL:** <https://haptic-beat-relay.sociobot.in>  
**Verified:** 2026-08-28

## Decision

**FAIL — release blocked.** The required claim commands do not run from a clean checkout after dependency installation: they start `cargo run`, whose server serves `frontend/dist`, but that directory has not been built and is gitignored. The browser therefore has a blank page. This caused the exact `@claim:connection-required` command to time out in both Chromium projects. The contract says any failing claim test is release-blocking.

This is a test-entry-point/reproducibility defect, not evidence that the deployed application flow is broken: after `npm run build`, the full suite, including every claim assertion, passed.

## Required claim gate

I first confirmed `.factory/claims.json` exists and attempted every declared command from the clean checkout. Before dependencies, all ten could not load `@playwright/test`; after `npm ci`, the declared `npm run test:browser -- --grep …` commands were rerun before a build. `frontend/dist` did not exist.

| Claim | Clean-command result | Evidence |
| --- | --- | --- |
| `demo-sandbox` | FAIL | Browser app requires missing `frontend/dist`. |
| `local-audio` | FAIL | Browser app requires missing `frontend/dist`. |
| `no-third-party` | FAIL | Browser app requires missing `frontend/dist`. |
| `no-account` | FAIL | Browser app requires missing `frontend/dist`. |
| `free-use` | FAIL | Browser app requires missing `frontend/dist`. |
| `shared-score` | FAIL | Browser app requires missing `frontend/dist`. |
| `ephemeral-rooms` | PASS | API-only assertion ran against the Rust server. |
| `rate-limit` | PASS | API-only assertion ran against the Rust server. |
| `health` | PASS | API-only assertion ran against the Rust server. |
| `connection-required` | FAIL | Exact command failed in Chromium and mobile: `locator.click` waited 30 s for “Create a real room”; failure traces/screenshots are under `test-results/product--claim-connection--*`. The failure screenshot is blank because the server cannot find its built frontend. |

After `npm run build`, `npm test` passed: TypeScript production build, 3 Vitest tests, 3 Rust tests, and all 20 Playwright tests (two desktop/mobile instances for each browser case). This validates the claims’ observable behavior only after a separate build, which is insufficient for the required clean-command gate.

**Required repair:** make each command in `.factory/claims.json` self-sufficient (for example, run `npm run build` before the grep-filtered browser command), or make Playwright’s web-server command build the frontend before serving it. Re-run every entry from a newly cloned, dependency-installed checkout with no existing `frontend/dist`.

## First-read test — PASS

Cold desktop and 390 px live visits showed:

- **What:** “Send every beat to a friend” — a host sends beat cues and the companion taps them back for a shared score.
- **For whom:** “friends and rhythm-game makers … without an account.”
- **First click:** **Try it with sample data**, with the adjacent explanation “A paired sample round opens now.”

The first screen also exposes the required one-click sample action and the three plain facts: free, audio stays on the host device, and a connection is needed.

## Live deployment and end-to-end checks — PASS

- `/health` returned `{"build_sha":"07ebb2f3a8984b6ad8bc885a121ccc0520043e96","status":"ok"}`. The deployed build matches the candidate.
- In fresh desktop host and 390 px companion contexts, I opened a room, joined with its code, started a round, sent a tap, and observed `1 returned tap.` plus the same score on both devices.
- Invalid short code gave “The code needs six letters and numbers. Check it and try again.” An unknown six-character room gave the recovery message “That room is not open. Check the code with the host.”
- `/demo` started its seeded round, showed returned taps, and Reset restored the 86% sample score. The demo did not make API requests.
- The live host flow loaded a marked local audio fixture without sending its marker; all observed normal-flow requests were same-origin. No account or payment gate was present.
- A live 50-request `POST /api/rooms` burst with one `X-Forwarded-For` identity returned **40 × 200** and **10 × 429**; the 429 response included `Retry-After: 1`.
- Live PWA check: after one online `/demo` load and service-worker activation, an offline reload returned 200 and rendered the sample page. `sw.js` uses versioned cache replacement, `skipWaiting`, and `clients.claim`.

## Accessibility and UI — PASS

Desktop and 390 px mobile scans covered `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`, `/404`, and an unknown route.

- Axe: no serious or critical violations on all 16 route/viewport combinations.
- Every checked page had `lang="en"`, one `h1`, one `main`, no image missing an `alt`, no horizontal overflow, valid route title, and no normal-flow console/page errors.
- Keyboard/reduced-motion smoke: focus ring is cyan `3px` with `4px` offset; the join error has `role="alert"`; reduced motion changes animation/transition duration to `0.01ms` and disables smooth scrolling.
- The custom equivalent of `verify-url.sh` was run because no `verify-url.sh` exists in this checkout. `@axe-core/playwright` is already part of the browser suite and was also run independently against the live routes.

## Security, privacy, headers, and performance — PASS

- Live responses include CSP, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. The CSP permits only self-hosted scripts/styles/images and same-origin WebSocket connections.
- HTML is `no-cache`; hashed JS is `public, max-age=31536000, immutable`.
- Normal browser requests remained same-origin; no third-party fonts, scripts, trackers, sign-in provider, payment provider, or analytics request was observed.
- Production bundle: JavaScript 23,017 bytes raw / 7.79 KB gzip; CSS 14,865 bytes raw / 4.08 KB gzip; both are within budget. The 720 px and 1280 px hero WebPs are 28 KB and 76 KB.
- `npm ci` reported zero audited vulnerabilities.

## Build and tooling checks

- `npm run build`: PASS — TypeScript check and Vite production output.
- `npm test`: PASS after build — 3 Vitest, 3 Rust, 20 Playwright.
- `cargo build --release --locked`: PASS.
- `git diff --check`: PASS.
- No Docker executable or Lighthouse executable is installed in this verifier image, so local container-image and Lighthouse runs could not be performed. The Dockerfile was inspected; live health/build identity and browser performance budgets were verified.

## Defects

### Blocker

1. **Declared claim commands cannot run from a clean checkout.** `test:browser` starts the backend without producing `frontend/dist`; browser claims therefore fail before exercising the demo. This directly violates the claims contract and blocks release.

### No other defects found

The deployed candidate itself matched the requested commit and passed the exercised real product flows.
