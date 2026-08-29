# Haptic Beat Relay — repair handoff

## Status: PASS — repaired and deployed

- **Work order:** `haptic-beat-relay-repair-14`
- **Independent report:** [`verification-14.md`](verification-14.md)
- **Nominated candidate:** `c49a4ae3ad2dfd30188ac6e3be4e5ecc596aec8f`
- **Regression implementation:** `290581b6eb32f0bfba2b8df16a8175fe79931892`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 UTC

## Release blockers repaired

The verifier failure was reproduced before any repair action. Azure reported
`Auto` ingress, scale `1–3`, and three running replicas for revision
`sf-haptic-beat-relay--0000021`. A fresh room `MMAAK2` was created in one
process, but its companion reached another process and received HTTP 404
`room_not_found`. A fresh 45-request client (`198.51.100.144`) received 45
successes instead of 40 successes plus five `429` responses. The secret-free
record is in
[`evidence/repair-14/reproduction.json`](evidence/repair-14/reproduction.json).

The nominated `c49a4ae…` image was first redeployed exactly as directed with
single-revision mode, HTTP ingress, and min/max `1/1`. After Azure reached one
active/running replica, `/health` returned that full candidate SHA, 30/30 fresh
API and desktop-host/390 px companion relay rounds passed, and five independent
clients each received exactly 40 successes plus five `429` responses with
`Retry-After: 1`. The exact record is in
[`evidence/repair-14/nominated-candidate-redeploy.json`](evidence/repair-14/nominated-candidate-redeploy.json).

The root cause was deployment drift, not a room or limiter implementation
defect: temporary rooms, WebSockets, and rate buckets intentionally share one
process. The repository-owned deployment path remains the required release
path and rejects `Auto`, max three, or three running replicas before any live
success gate can run. The exact verification-14 topology is reproduced by the
deployment harness.

The production two-device relay is also now claim-level coverage. The new
`live-relay` entry in [`claims.json`](claims.json) requires 30 fresh API rooms
and 30 fresh desktop-host plus 390 px companion WebSocket rounds. The claims
contract requires exactly one `@claim:live-relay` regression, so future claim
reviews cannot omit the live room, cue, tap, and shared-score path.

## Verification evidence

### Clean local gates

- `npm ci`: 59 locked packages installed; zero audit vulnerabilities.
- `npm test`: 3 Vitest tests, release and deployment contracts, 10 Rust tests,
  2 clean-entrypoint browser checks, and 36 full desktop/390 px browser checks
  passed; 2 intentional per-project duplicates were skipped.
- Every one of the 16 exact commands in [`claims.json`](claims.json) passed.
  This includes the new 30-round live relay command, the five-client live
  allowance command, and live topology/identity.
- `npm run build`: TypeScript and Vite passed. Initial JS is 23,164 bytes raw /
  7.84 kB gzip; CSS is 15,590 bytes raw / 4.21 kB gzip; `frontend/dist/` is
  296,768 bytes.
- `cargo fmt --all -- --check`, locked strict Clippy, all Rust tests, and
  `BUILD_SHA=repair14-local cargo build --release --locked` passed.
- The release binary started with only `PATH` and `PORT=18080`, logged
  `PORT supplied; no secrets required`, and returned `repair14-local` from
  `/health`.
- Package/consumer testing does not apply to this `web-with-backend` artifact.

### Browser, accessibility, privacy, offline, and response policy

- Desktop Chromium and a 390 × 844 mobile viewport covered keyboard-only skip
  navigation, route focus, form recovery, 200% text, 44 px touch targets,
  reduced-motion-compatible UI, route titles, one `h1`/`main`, and all product,
  legal, error, and 404 routes.
- Playwright Axe found no serious or critical issues. Standalone Axe 4.10.3
  found zero violations on `/`, `/demo`, `/privacy`, `/terms`, `/join`, and
  `/404`. The full report is
  [`evidence/repair-14/axe-live.json`](evidence/repair-14/axe-live.json).
- The factory URL check returned 200 in 587 ms with no console/page errors,
  `lang=en`, one `h1`, one `main`, complete image alt text, and labeled buttons.
  Desktop/mobile captures and the report are in
  [`evidence/repair-14/live`](evidence/repair-14/live/verify.json).
- The live demo made only same-origin requests and left localStorage,
  sessionStorage, and IndexedDB empty. Its service worker was active with no
  waiting or installing worker; `/demo` reloaded offline with the sample action
  available.
- HTML, demo, legal pages, the manifest, and service worker return
  `Cache-Control: no-cache`; hashed JS/CSS return one-year immutable caching.
  Responses include self-only CSP with `frame-ancestors 'none'`, `nosniff`, and
  strict-origin referrer policy. An unknown route returns a real HTTP 404.
- Lighthouse 13.0.1 mobile scored 100 performance, 100 accessibility, 100 best
  practices, and 100 SEO. FCP was 1.20 s, LCP 1.50 s, TBT 69 ms, CLS 0, and
  transfer was 166,661 bytes. Raw evidence is in
  [`evidence/repair-14/lighthouse-mobile.json`](evidence/repair-14/lighthouse-mobile.json).

### Final source-owned deployment

- ACR built the repository root multi-stage Dockerfile without `.git` and ran
  the non-root image on port 8080.
- The final guarded deployment used the full checked-out Git SHA, forced
  single-revision mode, applied min/max `1/1`, applied HTTP ingress after the
  rollout, waited for exactly one active/running replica, and required
  `/health` to equal that checked-out SHA.
- The deployment gate then passed 30/30 fresh API create→join checks, 30/30
  fresh desktop-host plus 390 px companion cue/tap/score rounds, and five fresh
  45-request allowance bursts at exactly 40 successes plus five `429` responses
  with `Retry-After: 1` per client.

## Known constraint

Rooms, WebSocket delivery, and rate buckets remain ephemeral and process-local
by design. The Container App must stay at one replica. Moving all three to a
shared service is required before any future scale-out. There are no remaining
release blockers for the specified singleton deployment.
