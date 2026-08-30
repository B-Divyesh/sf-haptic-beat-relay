# Independent verification 22 — FAIL

- **Candidate/source commit:** `891be09025e08d1bba7c8b857fb0f52764da5fdf`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verification date:** 2026-08-30 UTC
- **Work order:** `haptic-beat-relay-verify-22`

## Decision

**FAIL.** The candidate builds and passes its local suite, the public `/health`
response identifies this exact commit, and the landing/demo experience passes
the first-read, accessibility, privacy, offline, and performance checks. The
live service nevertheless fails three mandatory claims. Its process-local room
and rate-limit state is running in three ready replicas rather than one. The
exact 30-round relay test timed out twice, and a fresh client received all 45
room requests instead of the documented 40. Any failed claim is release
blocking.

## Required preliminary checks

`.factory/claims.json` exists with 16 claims. `npm ci` completed from the clean
candidate (59 packages, 0 vulnerabilities). Every listed claim command was run
exactly as written before broader QA.

| Claim | Result and evidence |
| --- | --- |
| `demo-sandbox` | PASS — desktop and 390 px sample starts in one click, resets, calls no API, and writes no browser storage. |
| `sample-duration` | PASS — the sample remained active before and completed after 12 seconds on both projects. |
| `local-audio` | PASS — a marked WAV stayed in the browser; its marker appeared in no request body. |
| `no-third-party` | PASS — cold landing, demo flow, and audio upload logs contained no third-party network request. |
| `no-account` | PASS — a real room can be created without sign-in. |
| `free-use` | PASS — no payment or purchase gate appears. |
| `shared-score` | PASS locally — two browser contexts exchanged a cue, tap, and matching score. |
| `live-relay` | **FAIL** — `RELAY_ROUNDS=30 npm run test:live-relay` timed out at `verify-live-relay.mjs:72` waiting for the companion to connect. A complete fresh rerun failed at the same line. The script had already completed its 30 fresh API create→join checks before reaching the browser loop. A separate 10-pair live sample passed, proving intermittent rather than universal behavior. |
| `ephemeral-rooms` | PASS — the exact Cargo test proved TTL eviction and fresh-process loss. The live service was not restarted. |
| `rate-limit` | **FAIL** — `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` received 45 × `200`, not 40 × `200` plus 5 × `429`, for its first fresh identity. A second fixed fresh identity also received 45/45 successes. A 125-request probe received 80 × `200` and 45 × `429`; those 429 responses did carry `Retry-After: 1`. The documented per-client allowance of exactly 40 is not enforced. |
| `health` | PASS — local claim test passed; live health reports status and the exact candidate SHA. |
| `connection-required` | PASS — offline room creation explains that the page must be reloaded. |
| `visual-cue` | PASS — a friend without vibration receives the visual cue state. |
| `haptic-output` | PASS — stubs observed `vibrate(45)` and a 60 ms dual-rumble effect. |
| `real-round-duration` | PASS — one measured browser run remained active at 59 seconds and completed at 60 seconds. |
| `singleton-deployment` | **FAIL** — the exact topology test observed ingress `auto` rather than `http` and stopped. Independent scoped inspection found min/max `1/3` and three ready replicas, not one. |

## First-read test — PASS

A cold 1440 × 900 visit says **“Send every beat to a friend.”** The next line
names **friends and rhythm-game makers** and says they get tactile cues and
shared timing without an account. The first action is **“Try it with sample
data”**, followed by **“A paired sample round opens now.”** The action opens
the populated demo in one click. Its persistent banner says **“Demo — sample
data, nothing is saved”** and provides Reset demo and Create a real room.

## Local install, tests, types, lint, and build

- `npm ci`: PASS; 59 packages, 0 vulnerabilities.
- `npm test`: PASS; 3 Vitest tests, release/deployment/handoff contracts, 11
  Rust tests, clean-entrypoint coverage, and the full Playwright suite. The
  final browser run reported 36 passed and 2 intentionally skipped across
  desktop and mobile projects.
- `npm run build`: PASS. TypeScript checking passed and Vite emitted
  `frontend/dist/`.
- `cargo build --release --locked`: PASS.
- `cargo clippy --all-targets --all-features -- -D warnings`: PASS.
- `cargo fmt --check`: **FAIL**. The regression test around
  `src/lib.rs:752-794` is not rustfmt-formatted.
- `git diff --check`: PASS.
- Docker is unavailable in this worker (`docker: command not found`), so a
  second local container build was not possible. The Dockerfile contract and
  its fake-deployment regression passed, and the public container serves the
  exact candidate build.

The production frontend is well under budget: 24,303 B JS, 17,418 B CSS, no
webfont, and a 74,022 B hero image. Hashed JS/CSS return
`Cache-Control: public, max-age=31536000, immutable`; HTML and `sw.js` return
`no-cache`.

## Functional, invalid-input, and recovery coverage

- The local two-device flow creates and joins a six-character room, starts at
  the 60 and 180 BPM boundaries, sends cues, returns taps, and synchronizes the
  score.
- A live 10-pair desktop-host/390 px-friend sample completed all 10 cue/tap
  exchanges, but the required 30-pair gate failed twice. This is consistent
  with routing ephemeral state across multiple processes.
- Join input `A2` gives “The code needs six letters and numbers. Check it and
  try again,” keeps focus on the field, and announces the error.
- A valid-looking closed code gives “That room is not open. Check the code with
  the host” plus an Enter another code recovery link.
- A non-audio upload is rejected locally. A valid marked audio file shows that
  it stays on the device and sends no file bytes.
- Local backend tests cover message-role validation, unknown routes, exact
  single-process rate limits, concurrent bursts, two-hour eviction, and
  restart loss. Live restart was neither needed nor performed.

## Live identity, topology, and backend evidence

`GET /health` returned:

```json
{"build_sha":"891be09025e08d1bba7c8b857fb0f52764da5fdf","status":"ok"}
```

Read-only inspection was limited to `sf-haptic-beat-relay` and found:

```json
{
  "revisionMode": "Single",
  "transport": "Auto",
  "minReplicas": 1,
  "maxReplicas": 3,
  "activeRevision": "sf-haptic-beat-relay--0000028",
  "image": "sociobotregistry.azurecr.io/sf-haptic-beat-relay:891be09025e0",
  "runningReadyReplicas": 3
}
```

The committed contract requires HTTP ingress, min/max one, one ready replica,
a full-SHA immutable image tag, and an SHA-derived revision suffix. The public
binary identity matches the candidate, but its deployment topology and image
provenance do not.

The release binary also started with an empty environment except `PORT=18080`.
It logged the supplied/defaulted configuration without a secret, served the
frontend, returned health, and returned a structured `400` recovery message for
an invalid room code. It shut down cleanly on SIGINT.

## Privacy, headers, accessibility, PWA, and performance

- Cold landing requests were limited to the document, same-origin hashed JS
  and CSS, the product image, and favicon. Demo use made no API request, stored
  zero local/session keys, and contacted no third party. Host upload traffic
  stayed same-origin plus a local `blob:` URL; the marked audio bytes were
  absent from every request body.
- Live HTML and API responses include a self-only CSP with
  `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin`. The cold page produced no
  console or page error.
- Desktop and 390 px checks across `/`, `/demo`, `/host`, `/join`, `/privacy`,
  `/terms`, and the 404 route found one H1, one main, `lang=en`, useful route
  titles, no normal or 200%-text overflow, no undersized mobile controls, and
  zero serious/critical Axe findings. All internal links returned 200.
- Keyboard-only use reaches the skip link first with a visible 3 px outline;
  Enter activates it, route changes focus the H1, and invalid form submission
  returns focus to the code field. Reduced-motion emulation reduces animation
  and transition durations to 0.01 ms.
- `registration.update()` produced an activated, controlling `/sw.js` with no
  waiting worker. After browser-cache clearing and offline mode, `/demo`
  reloaded with the sample heading and Start sample round control.
- Lighthouse 12.8.2 mobile: **Performance 99, Accessibility 100, Best Practices
  100, SEO 100**. FCP 1.2 s, LCP 1.8 s, total blocking time 50 ms, CLS 0, and
  total transfer 166 KiB.
- There is no sign-in flow, so the Entra authority requirement does not apply.

## Defects

| Severity | Finding | Required resolution |
| --- | --- | --- |
| P0 | The live process-local relay runs on three ready replicas. The mandatory 30-round host/friend flow timed out twice. | Deploy only through the guarded singleton path: HTTP ingress, min/max/running one, then pass the exact 30-round gate repeatedly. |
| P0 | The live endpoint does not enforce the documented 40-request per-client allowance. Fresh identities received 45/45 successes; a larger burst received 80 successes before aggregate limits appeared. | Restore one limiter process or move limits to shared state, then prove exactly 40 successes followed by five `429` responses with `Retry-After: 1` for all five fresh identities. |
| P1 | Deployed provenance/topology differs from the committed deployment contract: Auto ingress, 1–3 scale, short image tag, generic revision suffix. | Roll out the full-SHA image and SHA-derived revision with `deploy/containerapp.json`, then rerun identity/topology checks. |
| P2 | `cargo fmt --check` fails on `src/lib.rs`. | Apply rustfmt and keep the formatting check in the normal gate. |
| P2 | At 390 px, the landing display type breaks words such as “EVERY” and “FRIEND” across lines. | Reduce the mobile display size/measure or avoid `overflow-wrap: anywhere` for the hero headline. |

No product source code or infrastructure was modified during verification.
