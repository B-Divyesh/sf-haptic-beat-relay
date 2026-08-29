# Haptic Beat Relay — repair 4

## Repair summary

Candidate `5c7c5ef6b9c850694d092579a6e7e66f571e8ae5` failed because its live
Container App could scale from one to three replicas while the relay stores its
temporary rooms and WebSocket broadcast channels in a process-local `HashMap`.
One request could create a room on one replica and the next could join another,
causing alternating `404 room_not_found`, `200`, and `409` responses.

This repair keeps the intended ephemeral, in-memory design and makes its
deployment constraint explicit and enforceable:

- `deploy/containerapp.json` is the checked-in source of truth for
  `activeRevisionsMode: Single`, `minReplicas: 1`, and `maxReplicas: 1`.
- `scripts/deploy-containerapp.sh <full-git-sha>` builds the root Dockerfile in
  ACR and applies the image plus both scale limits in one deployment command.
- `scripts/verify-release-contract.mjs` fails unless the checked-in config and
  deploy script both pin exactly one live replica.
- `README.md` documents that this product must not scale out without replacing
  the room store and broadcast transport with shared infrastructure.

## Regression coverage

- A Playwright regression repeats three full host/companion rounds from fresh
  independent browser contexts. Each creates a room, joins, starts a round,
  sends a tap, and checks the shared score.
- A second Playwright regression opens ten independent API request contexts.
  For every newly created room, the first join must be `200` and an independent
  second join must be `409`; `404 room_not_found` is never accepted.
- Both regressions run in the desktop and 390 px mobile projects.

## Local verification

On 2026-08-29, all of the following passed from a clean dependency install:

```sh
npm ci
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
git diff --check
```

`npm ci` installed 59 packages with 0 reported vulnerabilities. `npm test`
passed Vitest, the release contract, five Rust tests, the clean browser-entrypoint
check, and Playwright including the new desktop and mobile regressions. The
production build emitted 23.16 KB raw / 7.85 KB gzip JavaScript and 15.54 KB raw
/ 4.20 KB gzip CSS. Browser coverage passed for keyboard, mobile, offline shell
reload, privacy, reduced motion, route semantics, 200% text, 44 px targets, and
Axe serious/critical findings.

## Deployment and live verification

Pending the committed repair revision. After deployment, verify the live build
SHA, Container App `minReplicas=1`/`maxReplicas=1`, repeated independent
create/join responses, a host/companion round, rate limiting, and the live
browser accessibility/privacy checks before treating this handoff as complete.

## Historical failure evidence

**FAIL — do not release candidate `5c7c5ef6b9c850694d092579a6e7e66f571e8ae5`.**

The live deployment identifies itself as that exact commit, and the locally
built JavaScript and CSS bytes match the deployed hashed assets. However, the
production relay is running with at least two isolated in-memory room stores.
Requests for one room alternate between stores. A companion can consequently
be told that a room does not exist immediately after a host creates it. This
breaks the product's core two-device job and its ephemeral-room contract.

## Release blocker

**P0 — live rooms are replica-local.** On 2026-08-29, create one live room and
then issue ten `POST /api/rooms/XNZF3B/join` requests with the same client
identity. The responses alternated exactly:

```
404 room_not_found, 200 companion_token, 404 room_not_found, 409 room_full,
404 room_not_found, 409 room_full, 404 room_not_found, 409 room_full,
404 room_not_found, 409 room_full
```

The successful `200` and correct `409` prove the room existed; the interleaved
`404`s prove other live replicas cannot see it. A separate 30-room
create-then-join sample returned `30 × 404` on the first join. This is not a
bad-code recovery path: it is an inconsistent production backend.

The source deliberately stores rooms in a process-local `HashMap`, so deploy
with exactly one replica for this design, or replace the room store with shared
ephemeral state and ensure WebSocket routing sees that state. Do not mark this
candidate releasable until a fresh deployment passes repeated cross-request,
cross-device create/join/round checks.

## What passed

- Clean `npm ci`: 59 packages installed; audit reported 0 vulnerabilities.
- Every one of the 12 exact commands in `.factory/claims.json` passed from the
  clean checkout. The browser claim entry point builds production assets itself.
- `npm test`: PASS — 3 Vitest tests, release contract, 5 Rust tests, clean
  browser entry-point regression, and 27 Playwright tests passed; 1 intentional
  desktop-only touch-target skip.
- `npm run build`, `cargo fmt --all -- --check`,
  `cargo clippy --all-targets --all-features --locked -- -D warnings`,
  `cargo build --release --locked`, and `git diff --check`: PASS.
- Cold first-read test: the landing page plainly says it sends beats to a
  friend, names friends and rhythm-game makers, and presents **Try it with
  sample data** with “A paired sample round opens now.”
- A lucky fresh desktop-host / 390 px-companion browser pairing completed one
  real round: returned tap `1`, shared score `8%`, visual cue fallback active,
  no console/page errors. This does not offset the deterministic replica-loss
  evidence above.
- Demo, PWA offline reload after activation, invalid short-code recovery,
  non-audio rejection, keyboard skip/error focus, reduced motion, and all
  visible links passed.
- Axe reported no serious or critical findings across `/`, `/demo`, `/host`,
  `/join`, `/privacy`, `/terms`, and a 404 route on desktop and 390 px mobile.
  Each had one `h1`, no horizontal overflow at normal or 200% text size, and no
  undersized visible controls.
- Live request recording during cold landing and demo flow saw only same-origin
  assets/API/WebSocket traffic. No third-party trackers, fonts, scripts,
  accounts, payment gates, or analytics were observed. A marked local audio
  fixture is covered by the passing claim test and never crossed the network.
- Headers include CSP with `frame-ancestors 'none'`, `nosniff`, and strict
  origin referrer policy. HTML is `no-cache`; hashed JS/CSS are one-year
  immutable cached. Initial JS is 23,162 bytes raw / 7.85 KB gzip; CSS is
  15,541 bytes raw / 4.20 KB gzip; both are under the budget.
- `/health` returned
  `{"build_sha":"5c7c5ef6b9c850694d092579a6e7e66f571e8ae5","status":"ok"}`.
  Matching local/deployed asset SHA-256 values confirmed the live frontend is
  candidate output.
- The required live rate-limit check passed: a 45-request `POST /api/rooms`
  burst from one identity returned `40 × 200`, `5 × 429`, and every 429 had
  `Retry-After: 1`. The observed allowance is 40 requests per second.

## Verify after repair

```sh
npm ci
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
```

Then, against the deployed URL, run repeated room create → join attempts from
separate request connections and two browser contexts. Each first join must be
`200`; a second join must be consistently `409`, never `404`; then complete a
host/companion beat-and-tap round. Retest the 40-request-per-second rate limit
and `/health` build SHA after deployment.
