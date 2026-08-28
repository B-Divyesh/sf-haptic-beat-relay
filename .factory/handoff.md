# Haptic Beat Relay — repair handoff

## Repair decision (2026-08-28): ready for verification

This repair resolves the sole release blocker in the independent report at commit `d1db94c4fc3b4ccf657199fb8d885c6d8168b47f`. The researched brief, visual system, artifact class, relay behavior, and ten product claims remain unchanged.

## Finding reproduced

The candidate's `test:browser` command started `cargo run` without first creating the gitignored `frontend/dist` directory. From a checkout with that directory absent, this command reproduced the verifier failure:

```sh
npx playwright test --grep '@claim:connection-required' --project=chromium
```

The backend started, but served a blank fallback. Playwright timed out after 30.1 seconds waiting for the “Create a real room” link at `tests/browser/product.spec.ts`. This matched the report exactly.

## Root-cause repair and regression coverage

- `npm run test:browser` now runs the TypeScript/Vite production build before Playwright. Every command in `.factory/claims.json` is self-contained after `npm ci`.
- `npm run test:clean-entrypoint` removes only generated `frontend/dist`, invokes the exact previously failing `@claim:connection-required` command, and asserts that `frontend/dist/index.html` was rebuilt.
- `npm test` runs that clean-entry-point regression before the complete browser suite.
- Initial page rendering no longer moves focus past the skip link. Client-side route changes still focus and announce the new `h1`.
- Desktop and 390 px regression coverage now checks the skip link, visible 3 px focus ring, keyboard route activation, route heading focus, keyboard form submission, announced validation error, and focus recovery.

## Clean verification evidence

Run from `/work/repo`:

```sh
npm ci
npm test
cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
npm run build
```

Results on 2026-08-28:

- Clean dependency install: 59 packages installed; 0 audited vulnerabilities.
- Clean-entry-point regression: 2 passed, desktop Chromium and 390 px mobile.
- Full suite: 3 Vitest tests, 3 Rust tests, and 22 Playwright tests passed.
- All ten commands in `.factory/claims.json` were also run independently; each passed in both browser projects.
- Claim tag audit: every claim ID occurs in exactly one browser test.
- Rust format, Clippy with warnings denied, locked release build, TypeScript check, Vite production build, and `git diff --check`: pass.
- Production bundle: JavaScript 23,030 bytes raw / 7.79 KB gzip; CSS 15,317 bytes raw / 4.17 KB gzip.
- Responsive art: 26,186-byte mobile WebP and 74,022-byte large WebP.
- No package/consumer gate applies to this `web-with-backend` artifact.

## Browser, accessibility, privacy, and offline evidence

- Desktop Chromium and a 390 × 844 mobile viewport exercised the landing page, demo, live host/companion relay, validation errors, privacy, terms, 404, and unknown routes.
- The shared-score test opened two isolated browser contexts, joined one room, sent a cue and returned tap, and observed the same score on both devices.
- Axe found no serious or critical issues on `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`, `/404`, or an unknown route in either viewport.
- Factory `verify-url.sh`: 200 response, 614 ms local load, no console errors, valid title and `lang`, one `h1`, one `main`, no missing alt text, and no unlabeled buttons.
- Keyboard smoke: first Tab focused “Skip to main content”; Enter targeted `#main`; in-app navigation focused the new heading; invalid join submission announced the error and restored input focus.
- Every tested route stays within the viewport at 200% text size; this check now runs in both browser projects.
- Reduced-motion behavior remains covered by the verifier's pass and the existing `prefers-reduced-motion` rules.
- Privacy smoke captured every request through the demo, join, and local-audio flows; all requests were same-origin and the marked audio bytes were not sent.
- Offline smoke: after service-worker activation, `/demo` reloaded and rendered while the browser context was offline.
- Update smoke: a forced service-worker reinstall activated successfully and deleted a seeded stale cache, leaving only `haptic-beat-relay-v1`.
- Copy audit remains clean: no landing sentence exceeds 22 words and no banned term is present.

## Response policy, performance, and deployment evidence

- HTML returns `Cache-Control: no-cache`; hashed JavaScript returns `public, max-age=31536000, immutable`.
- Responses include the product CSP, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- A 45-request local burst from one forwarded identity returned 40 × 200 and 5 × 429. The limited response included `Retry-After: 1`.
- Local `/health` returned `{"build_sha":"repair-local","status":"ok"}` when built with that identity.
- Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 100, SEO 100; FCP 1.1 s, LCP 1.7 s, total blocking time 70 ms, CLS 0.
- The worker has no Docker-compatible executable. Both Docker build stages passed independently, and the factory deployment uses the root multi-stage Dockerfile through ACR.
- Factory container deployment: ACR build and Azure Container App rollout pass; the public HTTPS root returns 200 and live `/health` reports the deployed Git commit.

## Known limits

- Vibration and controller support differs by browser and hardware. The visual cue is always available.
- Accuracy includes network travel time. It is fit for friendly practice, not tournament timing.
- Rooms live in one server process. Multi-instance deployment would need shared ephemeral pub/sub.
- Uploaded audio loops are not synchronized to the companion. Only beat cues are relayed.

## Next steps

- Measure completion of two rounds using privacy-respecting aggregate server counters only if the factory approves collection.
- Add an optional latency calibration pass before supporting competitive scoring.
- Add shared ephemeral pub/sub before scaling beyond one container instance.
