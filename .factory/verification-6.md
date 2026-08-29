# Independent verification 6 — FAIL

**Work order:** `haptic-beat-relay-verify-6`

**Candidate:** `ed2fa4c3de1c4e4b2dc253b6d40102e1f15a3651`

**Live URL:** <https://haptic-beat-relay.sociobot.in>

**Verified:** 2026-08-29 UTC

## Result

**FAIL — do not release.** The live image and frontend match the candidate, but
the researched core job is unreliable because the in-memory room service is
running on three replicas. Fresh desktop-host/390 px-companion testing completed
only **1 of 10** cue-synchronised attempts; nine failed with a room-not-open
response or a WebSocket HTTP 404. The required `rate-limit` claim command and
the repository-wide `npm test` command also fail.

No product code was modified during verification.

## Release-blocking findings

### P0 — live room state is split across three replicas

The checked-in deployment contract says one replica and HTTP transport. Fresh,
read-only Azure queries found the opposite in the running candidate revision:

- revision: `sf-haptic-beat-relay--0000013`;
- image: `sociobotregistry.azurecr.io/sf-haptic-beat-relay:ed2fa4c3de1c`;
- active revision mode: `Single`, with 100% traffic;
- **`minReplicas: 1`, `maxReplicas: 3`, three ready/running replicas**;
- ingress transport: **`Auto`**, not `Http`.

The backend stores each room in a process-local `HashMap`. Fresh live evidence:

- The builder's `npm run test:live-relay` failed on round 1 because the host
  showed `90%` while the companion remained at `0%`.
- A separate test waited for the visual cue before tapping in ten fresh pairs.
  Only room `EA8UWT` completed and shared `96%`. The other nine attempts timed
  out with host WebSocket 404s or companion room-not-open 404s.
- For room `DMQM6W`, 12 immediate joins returned `200, 404, 404, 409, 404,
  404, 404, 409, 404, 404, 404, 404`. The 200/409 responses came from the
  process holding the room; the 404s came from processes without it.

This directly fails the smallest useful product: a second device cannot
reliably join, receive a cue, tap back, and share a score.

### High — the required claim gate and `npm test` fail

After `npm ci`, every command in `.factory/claims.json` was invoked exactly.
Eleven passed. `npm run test:browser -- --grep @claim:rate-limit` failed: the
desktop project consumed the app-wide allowance while the concurrently running
mobile project received **0 successful responses instead of 40**.

| Claim | Result | Fresh evidence |
| --- | --- | --- |
| `demo-sandbox` | PASS | Desktop and mobile started, completed, and reset the isolated sample. |
| `sample-duration` | PASS | Both projects observed the 12-second completion. |
| `local-audio` | PASS | Marker bytes did not occur in outgoing requests. |
| `no-third-party` | PASS | Claim capture contained only same-origin requests. |
| `no-account` | PASS | A room opened without sign-in. |
| `free-use` | PASS | No payment or purchase gate appeared. |
| `shared-score` | PASS locally | One-process host and companion shared a score. |
| `ephemeral-rooms` | PASS | TTL eviction and restart loss passed in Rust. |
| `rate-limit` | **FAIL** | Mobile got 0 successes after desktop consumed the global burst. |
| `health` | PASS | `/health` returned status and build SHA. |
| `connection-required` | PASS | Offline creation showed recovery guidance. |
| `visual-cue` | PASS locally | Vibration-unavailable companion entered cue state. |

`npm test` independently failed with **3 failed, 28 passed, 1 skipped** in the
browser phase:

1. mobile `local-audio` could not create a room after another test consumed the
   global allowance;
2. mobile `rate-limit` got 38 successes rather than 40;
3. the independent create/join regression received 429 on its first join.

The backend's global 40-request guard makes unrelated client identities and
parallel test projects consume one shared quota. This contradicts the required
per-client allowance and makes the shipped test suite nondeterministic.

### High — live 40-request allowance is not enforced

The README documents a 40-request burst per client. A fresh live burst from one
forwarded identity returned **45 × 200 and no 429**. A 150-request burst from
one identity returned **120 × 200 and 30 × 429**; all limited responses had
`Retry-After: 1`. The observed allowance is therefore **120 requests per
second**, multiplied across three replicas, not the documented 40.

Locally, one process correctly returned 40 × 200 and 5 × 429 for one client.
However, 100 simultaneous requests from 100 distinct clients returned only
40 × 200 and 60 × 429, confirming the separate global-cap availability defect.

The README's statement that the service runs as exactly one replica is also a
false live claim and is not represented by a claim that checks deployed state.

## Cold first-read — PASS

The cold live page answers the required questions in its first viewport on
desktop and 390 px mobile:

- what it does: “Send every beat to a friend”;
- for whom: friends and rhythm-game makers needing tactile cues and shared
  timing;
- what to click: **Try it with sample data**, beside “A paired sample round
  opens now.”

The action opens `/demo` in one click. It immediately shows a 104 BPM sample,
Sam as the paired companion, two past scores, and the persistent “Demo — sample
data, nothing is saved” banner with Reset and Start for real.

Evidence: `.factory/evidence/verification-6/first-read-desktop.png`,
`first-read-mobile.png`, and `mobile-demo.png`.

## Candidate and production identity

- Repository HEAD was exactly the requested candidate.
- Live `/health` returned
  `{"build_sha":"ed2fa4c3de1c4e4b2dc253b6d40102e1f15a3651","status":"ok"}`.
- Local and live JavaScript SHA-256 both equal
  `c264123e3287ec7d753927f9d1fad3eb7455cc70236fdde418b6bea9314f18ac`.
- Local and live CSS SHA-256 both equal
  `51c4fb1a742cb3550e9714a429bac053f31f588b407313b723093bc3685ffc74`.

The image matches the candidate. The live Container App configuration does not
match the candidate's checked-in deployment contract.

## Local build and backend evidence

- `npm ci`: PASS, 59 packages, 0 reported vulnerabilities.
- `npm run build`: PASS; TypeScript check and exact Vite production build.
- `cargo fmt --all -- --check`: PASS.
- `cargo clippy --all-targets --all-features --locked -- -D warnings`: PASS.
- `cargo build --release --locked`: PASS.
- `git diff --check`: PASS before report changes.
- `npm test`: **FAIL**, as detailed above.
- Docker and a local container-image build were unavailable in this worker.
  The Dockerfile was inspected: multi-stage, `rust:1-slim`, default build arg,
  non-root UID 10001, and port 8080.

The release binary started with only `PATH` and `PORT`; it logged supplied port,
`build_sha: dev`, and that no secrets are required. Local API checks confirmed:

- malformed code: 400 with recovery text;
- unknown code: 404;
- create → first join → second join: 200 → 200 → 409;
- room code length 6, random tokens length 32, advertised TTL 7200 seconds;
- a room created before restart returned 404 after restart;
- health returned 200 and the compiled build identity.

## Live UI, privacy, accessibility, and PWA evidence

- `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`, `/404`, and an unknown
  route were checked at 1440 px and 390 px. Every page had `lang=en`, one h1,
  one main, valid heading order, no missing image alt, and no horizontal
  overflow at normal or 200% text size. Unknown routes returned HTTP 404.
- Axe found **0 serious/critical violations** across all 16 route/viewport
  checks. Visible controls met the 44 px target at the normal 390 px scale.
- Keyboard checks passed: the first Tab focused the skip link with a 3 px cyan
  outline; Enter activated it; client-side navigation focused the new h1; an
  invalid code announced a `role=alert` error and returned focus to the input.
- Reduced-motion media matched and reduced control transition duration to
  `0.01ms`, with automatic scrolling disabled.
- A complete live sample round ended at 89%; Reset restored 86%. It made no API
  requests, used no local/session storage, raised no errors, and all requests
  were same-origin.
- A marked local WAV remained in a blob URL; its marker was absent from every
  request body. The host did log the P0 WebSocket 404.
- The service worker activated, removed a seeded old cache on clean
  registration, and reloaded `/demo` offline after ordinary HTTP cache was
  cleared. The sample heading and Start button remained usable.
- No sign-in exists, so the Entra-authority check is not applicable. This is not
  a library or CLI, so consumer-pack testing is not applicable.

## Headers, caching, and performance

Browser response inspection found:

- HTML: `Cache-Control: no-cache`;
- hashed JS/CSS: `public, max-age=31536000, immutable`;
- CSP with self-only scripts/styles and `frame-ancestors 'none'`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`.

Production budgets pass: JS is 23,162 bytes raw / 7.85 KB gzip; CSS is 15,541
bytes raw / 4.20 KB gzip; the mobile hero WebP is 26,186 bytes. Mobile
Lighthouse scored **99 performance, 100 accessibility, 100 best practices, and
100 SEO**, with LCP 1.5 s, CLS 0, TBT 100 ms, and 163 KiB total transfer.

Low-severity metadata issue: `sitemap.xml` includes `/404`, which correctly
returns HTTP 404 and should not be listed as an indexable URL.

## Required repair and retest

1. Make the running service truly singleton with HTTP/WebSocket-coherent
   routing, or replace process-local room and broadcast state with shared
   ephemeral infrastructure. Verify the live configuration, not only JSON in
   the repository.
2. Replace the app-wide rate bucket with the documented per-client behavior (or
   document and test an intentional separate global overload policy). Make the
   required claim command and full suite isolated and deterministic.
3. Redeploy and prove at least 30 fresh cross-device browser rounds, including
   cue receipt, returned tap, and matching score, with zero HTTP/WebSocket 404s.
4. Confirm one client gets exactly 40 accepted requests, then 429 responses with
   `Retry-After`, in the deployed topology. Rerun every claim and `npm test`.
