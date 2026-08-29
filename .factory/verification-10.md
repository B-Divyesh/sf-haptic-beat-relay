# Independent verification 10 — FAIL

**Work order:** `haptic-beat-relay-verify-10`
**Candidate/source commit:** `e2047668c28ed986e77a9fff7095dceefcc50800`
**Live URL:** <https://haptic-beat-relay.sociobot.in>
**Verified:** 2026-08-29 UTC

## Decision

**FAIL — release blocked.** The candidate source and live static application match, the core relay worked in a fresh one-round live desktop-host/390 px-companion exercise, and all local tests passed. However, a required claim test fails against the live deployment: its process-local room relay is deployed with `transport: Auto`, `maxReplicas: 3`, and three running replicas. The product contract requires HTTP ingress and exactly one replica because room, WebSocket broadcast, and rate-limit state are held only in process memory. This is an observable live deployment defect and a release blocker even when a sampled round happens to be routed coherently.

## Required first checks

### First-read test — PASS

A cold live visit says **“Send every beat to a friend.”** It identifies the audience as friends and rhythm-game makers who need tactile cues and shared timing without an account. The first action is **“Try it with sample data”** with the direct explanation **“A paired sample round opens now.”** This answers what it does, for whom, and what to click first in plain language, and supplies the one-click sample demo.

### Claims gate — FAIL

After `npm ci`, I ran every exact command listed in `.factory/claims.json` from the product browser entry point before broader QA.

| Claim | Result | Evidence |
| --- | --- | --- |
| `demo-sandbox` | PASS | Desktop and mobile seeded sample start/reset test passed. |
| `sample-duration` | PASS | The measured 12-second sample completion test passed. |
| `local-audio` | PASS | Marked audio fixture bytes were not sent. |
| `no-third-party` | PASS | Browser request assertion passed. |
| `no-account` | PASS | Host flow exposed no sign-in. |
| `free-use` | PASS | Host flow exposed no purchase/payment gate. |
| `shared-score` | PASS | Two local contexts connected, cued, tapped, and agreed on score. |
| `ephemeral-rooms` | PASS | Rust TTL/restart test passed. |
| `rate-limit` | PASS | Live burst: exactly 40 accepted, then 5 `429`, each `Retry-After: 1`. |
| `health` | PASS | Browser health assertion passed. |
| `connection-required` | PASS | Offline real-room creation displayed recovery instructions. |
| `visual-cue` | PASS | Vibration-unavailable companion received the visual cue. |
| `real-round-duration` | PASS | Chromium measured the 60-second round; the project intentionally skips mobile for this measured timer. |
| `singleton-deployment` | **FAIL** | `npm run test:live-topology` failed: ingress `actual: 'auto'`, `expected: 'http'`. |

Any failed listed claim is release-blocking.

## Release-blocking defects

### High — actual deployment breaks the required singleton boundary

Read-only Azure inspection on 2026-08-29 found:

- exactly one active revision, `sf-haptic-beat-relay--0000017`, receiving 100% traffic;
- revision and application scale `minReplicas: 1`, **`maxReplicas: 3`**;
- **three** replicas in `Running` state;
- ingress **`transport: Auto`**, not HTTP.

The checked-in deployment contract and README explicitly require one active/running replica, min/max one, and HTTP ingress. The backend keeps rooms, WebSocket broadcasts, and client rate buckets in `HashMap`s inside one process. Scaling it to three processes therefore creates split room state and makes a host, companion, and WebSocket upgrade susceptible to routing to different room maps. The existing live topology claim correctly treats this configuration as a failure. Restore and verify `Single` revision mode, `minReplicas: 1`, `maxReplicas: 1`, one running replica, and HTTP ingress before release.

## Candidate and live identity

`GET /health` returned:

```json
{"build_sha":"e2047668c28ed986e77a9fff7095dceefcc50800","status":"ok"}
```

It matches the candidate. Locally built and live assets were byte-identical:

- JS `index-C0xTH8r-.js`: `8dc97d9d720d52121f4d0dabcca004af81be92f98871a033bcb175503f94dd4e`
- CSS `index-Dv3subRE.css`: `75f30853abea59ac8abbd47cba9705f22ae575f7ea21aa4cf28cf4d587398e87`

`RELAY_ROUNDS=1 npm run test:live-relay` passed: one fresh API create→join and one fresh desktop-host + 390 px companion WebSocket cue/tap/shared-score round. This is useful confirmation of the normal path, not evidence that the invalid three-process topology is acceptable.

## Local quality gates — PASS

- `npm ci`: passed; 0 vulnerabilities reported.
- `npm test`: passed — 3 Vitest tests, 10 Rust tests, clean browser-entrypoint check, and Playwright desktop/mobile suite; Playwright recorded 34 passes and 2 intentional project skips.
- `npm run build`: passed; JS 23.16 KB raw / 7.85 KB gzip and CSS 15.59 KB raw / 4.21 KB gzip, both well inside the static budget.
- `cargo fmt --all -- --check`, `cargo clippy --all-targets --all-features --locked -- -D warnings`, and `cargo build --release --locked`: passed.
- Docker image build/run could not be performed because this verifier container has no `docker` executable. The root Dockerfile was inspected; it is multi-stage, non-root, supplies the build SHA, and defaults to `PORT=8080`.

## Product, accessibility, privacy, and HTTP checks — PASS

- Fresh live request capture during the cold landing visit contained only same-origin document, JS, CSS, image, and favicon requests; no console/page errors occurred. The sample flow is covered by its claim test: no API request and empty local/session storage.
- Axe 4.10.3 injected through Playwright found zero serious or critical (in fact zero) violations on live desktop and 390 px mobile pages. The built-in full browser suite also checks all real routes, 200% text, touch targets, and offline reload.
- Keyboard smoke on 390 px: Tab reached the skip link first with a visible `3px` outline; Enter navigated to `#main`; keyboard activation entered `/demo` and focused its `h1`; invalid `A2` join input announced “The code needs six letters and numbers. Check it and try again.” and restored input focus.
- Reduced-motion CSS changes animation/transition durations to `.01ms`; no flashing condition was observed.
- Response headers include self-only CSP with response-header `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. HTML is `no-cache`; hashed JS is `public, max-age=31536000, immutable`. All landing-page internal links returned 200; unknown routes returned 404.
- No sign-in path exists, so no identity-provider integration is applicable. No third-party fonts, analytics, trackers, payments, or external runtime calls were observed.

## Required repair and retest

1. Apply the checked-in singleton deployment contract to the actual Container App: HTTP ingress and min/max one, then wait until Azure reports one running replica.
2. Run `npm run test:live-topology`; it must pass rather than merely finding the right source configuration.
3. Run `RELAY_ROUNDS=30 npm run test:live-relay`, then every command in `.factory/claims.json` again. Reconfirm the observed room API allowance: exactly 40 requests per client per second, then `429` with `Retry-After: 1`.
