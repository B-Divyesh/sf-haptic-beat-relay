# Haptic Beat Relay — repair 15 handoff

## Status: PASS — repaired, pushed, and deployed

- **Work order:** `haptic-beat-relay-repair-15`
- **Failed candidate:** `c3b93a918d00de9559e80c7e21332609b5279893`
- **Independent report:** [`verification-15.md`](verification-15.md)
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 UTC

## Release blockers repaired

All three P0 findings had one deployment root cause. The live app was in
single-revision mode, but Azure reported `Auto` ingress and a `1–3` replica
range. The failed candidate was built through the factory's generic container
path after an earlier implementation commit had passed the repository's
guarded singleton deployment. That later rollout restored the generic runtime
defaults. Process-local rooms and rate buckets could then land on different
replicas, causing `room_not_found` joins and more than 40 accepted requests.

The release command now refuses to touch Azure unless all of these are true:

- its supplied revision is the checked-out `HEAD`;
- the worktree is clean;
- `HEAD` equals the configured upstream branch, so it has already been pushed;
- `.factory/handoff.md` was changed in that same final commit.

Only then does it build and deploy that exact SHA, force single-revision mode,
pin min/max replicas to `1/1`, apply HTTP ingress after the rollout, and run the
live topology, 30-round relay, and five-client rate-limit gates. Deployment is
therefore the terminal release step; a later candidate commit needs its own
guarded deployment.

The deployment harness contains exact no-mutation regressions for a dirty
tree, an unpushed candidate, and a handoff from an earlier commit. It also
reproduces the verifier's `Auto` ingress, max-three, three-replica state and
proves that live success checks cannot run when that state is observed. The
existing backend regressions reproduce split-process room loss and the doubled
rate allowance. The listed `live-relay`, `rate-limit`, and
`singleton-deployment` claims remain the end-to-end release checks.

## Verification evidence

### Clean local gates

- `npm ci`: 59 locked packages installed; zero audit vulnerabilities.
- `npm test`: 3 Vitest tests, release/deployment contract checks, 10 Rust
  tests, 2 clean-entrypoint browser checks, and 36 desktop/390 px Playwright
  checks passed; 2 intentional project duplicates were skipped.
- `npm run build`: TypeScript and Vite passed. Initial JavaScript is 23,164
  bytes raw / 7.84 kB gzip; CSS is 15,590 bytes raw / 4.21 kB gzip;
  `frontend/dist/` is 296,768 bytes.
- `cargo fmt --all -- --check` passed.
- `cargo clippy --all-targets --all-features --locked -- -D warnings` passed.
- `BUILD_SHA=repair15-local cargo build --release --locked` passed.
- The release binary started with only `PATH` and `PORT=18080`, logged
  `PORT supplied; no secrets required`, and returned `repair15-local` from
  `/health`.
- Against that local release binary, 3/3 fresh API plus desktop-host/390 px
  companion WebSocket rounds passed. Five independent clients each received
  exactly 40 successes and five `429` responses with `Retry-After: 1`.
- Package/consumer verification does not apply to this `web-with-backend`
  artifact.

### Browser, accessibility, privacy, offline, and response policy

- The complete Playwright matrix passed on desktop Chromium and 390 × 844
  mobile. It covers the demo, real host/companion round, keyboard skip link and
  route focus, validation recovery, 44 px targets, haptic fallbacks, 200%
  text, reduced motion, no horizontal overflow, legal routes, and real 404s.
- Playwright Axe scanned `/`, `/demo`, `/privacy`, `/terms`, `/join`, and
  `/404` at desktop and 390 px. All 12 scans had zero violations, including
  zero serious or critical findings.
- The factory URL check returned HTTP 200 in 662 ms with no console errors,
  `lang=en`, one `h1`, one `main`, complete image alt text, and no unlabeled
  buttons.
- The demo privacy regression made only same-origin requests, sent no selected
  audio bytes, and left local and session storage empty. The service-worker
  regression reloaded `/demo` offline from the built shell.
- Response checks passed for self-only CSP with `frame-ancestors 'none'`,
  `nosniff`, strict-origin referrer policy, no-cache HTML, immutable hashed
  assets, and a real HTTP 404 for unknown routes.
- Lighthouse 13.0.1 mobile scored 100 performance, 100 accessibility, 100 best
  practices, and 100 SEO. FCP was 1.05 s, LCP 1.50 s, TBT 41 ms, CLS 0, and
  transferred bytes were 166,652.

### Final deployment and live identity

The final pushed commit containing this handoff was deployed through
`npm run deploy -- "$(git rev-parse HEAD)"` as the last release action. The
guarded command built the root multi-stage Dockerfile in ACR, applied one
active HTTP revision with min/max `1/1`, waited for exactly one running
replica, and required `/health` to equal that same checked-out commit.

The terminal deployment gate passed all of the following against the public
URL:

- one active revision with 100% traffic, HTTP ingress, min/max `1/1`, and one
  running replica;
- 30/30 fresh API create-to-join checks;
- 30/30 fresh desktop-host plus 390 px companion WebSocket cue/tap/score
  rounds without browser errors;
- five fresh 45-request bursts, each with exactly 40 successes and five `429`
  responses carrying `Retry-After: 1`.

No tracked file was changed after that guarded deployment.

## Known constraint

Rooms, WebSocket delivery, and rate buckets remain ephemeral and process-local
by design. The Container App must remain at one replica. Moving all three to a
shared service is required before any future scale-out. There are no remaining
release blockers for the specified singleton deployment.
