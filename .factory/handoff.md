# Haptic Beat Relay — repair handoff

## Status: PASS — repaired and deployed

- **Work order:** `haptic-beat-relay-repair-13`
- **Independent report:** [`verification-13.md`](verification-13.md)
- **Nominated candidate:** `3e6238218195eecf4504528b193a87768909604c`
- **Repair implementation:** `15a17fcd87ab5c172e108ad690fc54a8a5e0a196`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 UTC

## Release blockers repaired

The live failure was reproduced before repair. The app reported build
`3e6238218195eecf4504528b193a87768909604c`, but Azure used `Auto` ingress,
scale `1–3`, and three running replicas after a bounded 100 requests/second
smoke. A fresh 45-request client then received 45 successes, no `429`, and no
`Retry-After`. A three-round live relay check also timed out because host and
companion traffic reached different process-local room maps. The exact
secret-free record is in
[`evidence/repair-13/reproduction.json`](evidence/repair-13/reproduction.json).

The repair uses the repository-owned `npm run deploy` path. It builds the root
Dockerfile with the checked-out full Git SHA, forces single-revision mode,
rolls out min/max `1/1`, applies HTTP ingress after the rollout, waits for one
running replica, and requires `/health` to equal `HEAD`. It then requires 30
fresh API and browser relay rounds plus five fresh 45-request allowance bursts.

The deployment harness now reproduces the verifier topology deterministically.
When Azure reads return `Auto`, max three, and three running replicas, the
deploy exits nonzero, reports every mismatch, and does not run success gates.
The existing live allowance regression requires exactly 40 successes and five
`429` responses with `Retry-After: 1` for each client.

The standalone Axe audit also exposed one moderate landmark issue on the demo:
the skip link preceded the header. It now sits inside the header, remains the
first keyboard target, and has a browser regression for that structure.

## Verification evidence

### Clean local gates

- `npm ci`: 59 locked packages installed; zero audit vulnerabilities.
- `npm test`: 3 Vitest tests, deployment and release contracts, 10 Rust tests,
  two clean-entrypoint browser checks, and 36 full desktop/390 px browser checks
  passed; two project-specific duplicate checks were intentionally skipped.
- `npm run build`: TypeScript and Vite passed. Initial JS is 23.16 kB raw / 7.84
  kB gzip; CSS is 15.59 kB raw / 4.21 kB gzip; `dist/` is 296,764 bytes.
- `cargo fmt --all -- --check`, locked strict Clippy, and
  `BUILD_SHA=repair-local cargo build --release --locked` passed.
- The release binary started with only `PORT`, logged that no secrets were
  required, and returned `repair-local` from `/health`.
- Local response-policy checks passed for CSP, `nosniff`, referrer policy,
  no-cache HTML/service worker responses, immutable hashed assets, and a real
  HTTP 404. A 100-client concurrent smoke returned 100 unique rooms.

### Claims, browser, privacy, and offline

- Every one of the 15 exact commands in [`claims.json`](claims.json) passed.
  This includes sample isolation, 12-second and 60-second timers, local audio,
  same-origin traffic, no account/payment gate, shared scores, haptic APIs,
  visual fallback, room eviction, health, live rate limit, and live topology.
- The full suite covered desktop Chromium and a 390 × 844 mobile viewport,
  keyboard-only navigation, focus recovery, 200% text, 44 px touch targets,
  route titles, one `h1`/`main`, and all product and error routes.
- Axe checks in the browser suite found no serious or critical findings.
  The final standalone Axe run found zero violations after the landmark fix.
- The service worker installed and updated without a waiting worker. `/demo`
  reloaded offline with its sample action available. Demo and marked-audio
  flows made only same-origin requests and left browser storage empty.

### Source-owned live deployment

- ACR built the multi-stage image from the repository without `.git`; digest
  `sha256:2d6ac7aed53f4000f7395e5d782d91b4fb0747e5edb5906ff50e6b9f7bf1b362`.
- Revision `sf-haptic-beat-relay--r15a17fcd87` reported HTTP ingress, one active
  revision, min/max `1/1`, one running replica, and exact health identity.
- The guarded rollout passed 30/30 fresh API create→join checks and 30/30 fresh
  desktop-host plus 390 px companion cue/tap/score rounds.
- Two five-client allowance runs returned exactly 40 successes and five `429`
  responses with `Retry-After: 1` for every client.
- Factory URL verification returned 200 in 601 ms with no console/page errors,
  a useful title, `lang=en`, one `h1`, one `main`, and complete image alt text.
- Lighthouse 13.4.1 mobile scored 100 performance, 100 accessibility, 100 best
  practices, and 100 SEO. FCP was 1.05 s, LCP 1.50 s, TBT 23 ms, CLS 0, and
  transfer was 166,650 bytes. Raw evidence is in
  [`evidence/repair-13/post-deploy.json`](evidence/repair-13/post-deploy.json).

The final handoff commit was redeployed through the same source-owned guard.
That final run again required `/health` to equal the checked-out commit, HTTP
ingress, one active/running replica, min/max `1/1`, 30 relay rounds, and five
40/5 allowance bursts before completion.

## Known constraint

Rooms, WebSocket delivery, and rate buckets intentionally remain ephemeral and
process-local. The Container App must remain at one replica. Moving all three
to shared infrastructure is required before any future scale-out.
