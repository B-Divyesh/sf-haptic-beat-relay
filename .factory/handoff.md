# Haptic Beat Relay — handoff

## Independent verifier decision (2026-08-28): **FAIL**

Candidate `07ebb2f3a8984b6ad8bc885a121ccc0520043e96` is deployed at <https://haptic-beat-relay.sociobot.in> and the live build identity matches it. The deployed product and the complete post-build test suite work, but release is blocked: every declared browser claim command is `npm run test:browser -- --grep …`; from a clean, dependency-installed checkout it starts `cargo run` before `frontend/dist` exists. The UI claim tests consequently receive a blank page; the exact `@claim:connection-required` command timed out in desktop and mobile. Claims must be runnable from the clean demo entry point. See `.factory/verification.md` for exact evidence and the required repair.

## What shipped

- A host opens an ephemeral room and gets a six-character code plus shareable join link.
- One companion joins from a second browser over a validated WebSocket relay.
- The host sets 60–180 BPM, uses the built-in click, or loads a local audio loop.
- Every beat sends a visual cue, phone vibration, and supported gamepad haptics to the companion.
- Companion taps return to the host and update the same timing score on both devices.
- Hosts can run repeated 60-second rounds without an account.
- `/demo` opens a paired 104 BPM sample with two past scores and a 12-second live sample round.
- `/privacy`, `/terms`, and a designed `/404` route are included.
- The responsive cinematic environment art is original and documented in `design.md`.
- A service worker caches the visited shell. The live relay still reports that it needs a connection.

## Backend and operations

- Rust 2021 with Axum and Tokio; no database is needed for ephemeral room state.
- Rooms expire after two hours. Companion access is released after disconnect.
- Room messages are limited to 2 KB and validated by sender role.
- API traffic uses `X-Forwarded-For` and allows a 40-request burst per client each second.
- Limited requests return `429` with `Retry-After: 1`; `/health` is exempt.
- The root multi-stage Dockerfile builds Vite and Rust, runs as UID 10001, and listens on `PORT` or 8080.
- `/health` returns the compile-time `BUILD_SHA`.

## Verification

Run from `/work/repo`:

```sh
npm ci
npm test
cargo build --release --locked
```

Results on 2026-08-28:

- Vite production build: pass; output `frontend/dist/index.html`.
- Initial JS: 23.02 KB raw / 7.79 KB gzip.
- CSS: 14.87 KB raw / 4.08 KB gzip.
- Mobile hero WebP: 26.19 KB; large hero WebP: 74.02 KB.
- Vitest: 3 passed.
- Rust: 3 passed, including room join, rate limit, and role validation.
- Playwright: 20 passed across desktop Chromium and a 390 × 844 mobile viewport.
- Claim tests: all ten entries in `claims.json` passed.
- Axe: no serious or critical findings on `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`, `/404`, or an unknown route.
- Factory `verify-url.sh`: pass; no console errors, one h1, one main, valid title/lang/alt text.
- Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 100, SEO 100.
- Lighthouse lab metrics: FCP 1.1 s, LCP 1.7 s, CLS 0, total blocking time 80 ms.
- Load smoke: 100 concurrent room creates completed; 40 returned 200 and 60 returned the expected 429.
- `npm audit`: zero known vulnerabilities.
- `git diff --check`: pass.

The worker did not have a Docker executable, so the container recipe was checked through both constituent release builds rather than a local image build.

## Known limits

- Vibration and controller support differs by browser and hardware. The visual cue is always available.
- Accuracy includes network travel time. It is fit for friendly practice, not tournament timing.
- Rooms live in one server process. Multi-instance deployment would need shared ephemeral pub/sub.
- Uploaded audio loops are not synchronized to the companion. Only beat cues are relayed.

## Next steps

- Measure completion of two rounds using privacy-respecting aggregate server counters only if the factory approves collection.
- Add an optional latency calibration pass before supporting competitive scoring.
- Add shared ephemeral pub/sub before scaling beyond one container instance.
