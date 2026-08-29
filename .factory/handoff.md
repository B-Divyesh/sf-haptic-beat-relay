# Haptic Beat Relay — repair handoff

## Status: PASS — deployed

- **Base verifier report:** [`verification-11.md`](verification-11.md)
- **Original failed candidate:** `26b81ef9679e3f8b2d7a62338a7113d397ca37ed`
- **Application repair commit:** `31713761d28bb1c7c532ca1fed09824547af4ae2`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 UTC

## Repair

The verifier found a deployment/runtime mismatch: the checked-in singleton
contract was not applied live. Ingress was `Auto`, the active revision allowed
three replicas, and two replicas had been observed. Since rooms, WebSocket
channels, and rate buckets are intentionally process-local, that split a
create→join flow between processes and made both relay delivery and the
40-request rate limit unreliable.

The guarded deployment workflow now:

- forces single-revision mode, min/max replicas of one, and HTTP ingress after
  each image rollout;
- waits for one active 100%-traffic revision and exactly one running replica;
- verifies the live `/health` build SHA, then runs 30 fresh API/browser relay
  rounds and five fresh-client rate-limit bursts;
- rejects a supplied revision that differs from checked-out `HEAD` before it
  calls Azure. This prevents an otherwise healthy deployment from carrying an
  identity that can never pass the live identity check.

The exact regression harness covers the rollout order, singleton settings,
post-rollout ingress, required topology/relay/rate gates, and rejection of an
identity mismatch before any Azure command is made. The live rate claim now
uses five distinct forwarded identities rather than one burst.

## Deployment evidence

`npm run deploy` built and pushed the root multi-stage Docker image in ACR and
deployed revision `sf-haptic-beat-relay--r31713761d2`.

- `/health` returned `{"build_sha":"31713761d28bb1c7c532ca1fed09824547af4ae2","status":"ok"}`.
- Azure reported `Single` revision mode, `Http` ingress, min/max replicas
  `1/1`, one active revision at 100% traffic, and one running replica.
- The built-in post-rollout gate passed **30/30** fresh API create→join checks
  and **30/30** fresh desktop-host + 390 px companion WebSocket cue/tap/shared
  score rounds.
- Five live rate bursts, each using a distinct TEST-NET-2 forwarded identity,
  each returned exactly **40** accepted requests and **five 429** responses
  with `Retry-After: 1`.

An intermediate rollout with a mistyped identity was not accepted: its
post-deploy identity gate failed. The final rollout above used `npm run deploy`
with no argument, so the new HEAD-match guard selected the verified commit.

## Verification

- `npm ci`: passed; 59 packages installed, 0 vulnerabilities.
- `npm test`: passed — 3 Vitest tests, release/deployment contract tests, 10
  Rust tests, clean-browser-entrypoint regression, and 34 Playwright tests
  across desktop and 390 px mobile (2 intentional project skips).
- `npm run build`: passed. Initial JS is 23.16 kB raw / 7.85 kB gzip; CSS is
  15.59 kB raw / 4.21 kB gzip.
- `cargo fmt --all -- --check`, strict `cargo clippy`, and locked
  `cargo build --release`: passed.
- Every exact command in [`claims.json`](claims.json) was rerun after the
  accepted rollout and passed, including the 12-second demo, local-audio and
  no-third-party capture, isolated demo storage, ephemeral-room expiry,
  60-second real round, five-burst live rate claim, and live singleton claim.
- Factory `verify-url.sh` passed against the live root: 597 ms load, no page
  or console errors, title/lang, one `h1`, one `main`, and no missing image
  alt text. Captures are in [`evidence/repair-11`](evidence/repair-11).
- Live Playwright Axe scans found zero serious or critical violations on `/`,
  `/demo`, `/host`, `/join`, `/privacy`, `/terms`, `/404`, and an unknown 404
  route in both desktop and 390 px mobile views. Every route had one `h1`, one
  `main`, and no horizontal overflow.
- The standalone Axe CLI was attempted twice, including with the installed
  Chromium path, but Selenium could not create a Chrome session in this worker.
  The shipped Playwright Axe integration and the fresh live Playwright Axe scan
  above both completed successfully.
- Live demo privacy/PWA smoke passed: only the product origin was requested,
  no `/api/` call occurred, local/session/IndexedDB counts were all zero, the
  service worker controlled the page, and `/demo` reloaded offline with HTTP
  200 and a usable sample action.
- Live response checks confirmed a self-only CSP with response-header
  `frame-ancestors 'none'`, `nosniff`, strict referrer policy, no-cache HTML /
  health / service worker, immutable hashed assets, and a real HTTP 404.
- Lighthouse 13.4.1 mobile: performance **100**, accessibility **100**, best
  practices **100**, SEO **100**; FCP 1.1 s, LCP 1.8 s, TBT 20 ms, CLS 0,
  total transfer 163 KiB. The JSON report is in
  [`evidence/repair-11/lighthouse-mobile.json`](evidence/repair-11/lighthouse-mobile.json).

## Known constraints

There are no known release blockers. This remains a deliberately singleton,
in-memory relay. Do not scale it beyond one replica unless room state,
WebSocket delivery, and per-client rate buckets move to shared infrastructure.
