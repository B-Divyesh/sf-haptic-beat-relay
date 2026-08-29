# Independent verification 14 — FAIL

- **Work order:** `haptic-beat-relay-verify-14`
- **Candidate commit:** `c49a4ae3ad2dfd30188ac6e3be4e5ecc596aec8f`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 15:57 UTC

## Decision

**FAIL — release blocked.** The exact local candidate is buildable and its complete local regression suite passes. The public deployment reports the candidate SHA, and its built JS/CSS exactly match the live asset bytes, but its runtime topology violates the source-owned singleton contract. Azure reports `Auto` ingress, maximum three replicas, and three running replicas. The core host-to-companion flow consequently fails live: a room made by a host is not available to its companion/WebSocket when the requests reach different processes. The documented per-client allowance is also not enforced once the deployment is scaled.

Any failing command in `.factory/claims.json` is release-blocking. Both the singleton deployment claim and, after the deployment scaled, the rate-limit claim fail from fresh evidence.

## Mandatory opening gates

### First-read test — PASS

A cold desktop load of the live root says **“Send every beat to a friend.”** The next sentence names **friends and rhythm-game makers**, says they receive tactile cues and shared timing, and names the no-account condition. The first screen exposes **“Try it with sample data”** with **“A paired sample round opens now.”** immediately beside it. At a cold 390 × 844 viewport the heading, audience sentence, and primary action were all fully visible (their bottom edges were 375 px, 482 px, and 563 px respectively, within an 844 px screen).

### Claims gate — FAIL

I ran `npm ci` from this clean checkout, then every exact command listed in `.factory/claims.json` before the broader suite. The first live rate run passed while the service was still effectively single-process; the exact command was run again after the observed scale-out and failed. This is a production claim, not a transient test issue.

| Claim | Result and evidence |
| --- | --- |
| `demo-sandbox` | PASS — desktop and mobile ran, completed, and reset the in-memory sample. |
| `sample-duration` | PASS — both browser projects observed its 12-second completion. |
| `local-audio` | PASS — a marked audio fixture was not sent. |
| `no-third-party` | PASS — browser requests stayed same-origin. |
| `no-account` | PASS — local host creation had no sign-in. |
| `free-use` | PASS — no payment/purchase UI appeared. |
| `shared-score` | PASS locally — companion cue, returned tap, and shared score were verified. **The equivalent live flow fails; see Critical finding.** |
| `ephemeral-rooms` | PASS — the exact Rust TTL/restart regression passed. |
| `rate-limit` | **FAIL live after scale-out** — `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` received 45 HTTP 200 responses for fresh `198.51.100.211`, not 40 successes then five 429s. No `Retry-After` could be returned because no request was limited. An earlier run did return 40/5 with `Retry-After: 1`, proving the live result is topology-dependent. |
| `health` | PASS — live `/health` is exactly `{"build_sha":"c49a4ae3ad2dfd30188ac6e3be4e5ecc596aec8f","status":"ok"}`. |
| `connection-required` | PASS — local offline creation showed the actionable reload recovery. |
| `visual-cue` | PASS — local companion entered its visible cue state without vibration. |
| `haptic-output` | PASS — local stubs observed `vibrate(45)` and the specified controller dual-rumble call. |
| `real-round-duration` | PASS — one connected local browser round remained active at 59 seconds and completed at 60 seconds. |
| `singleton-deployment` | **FAIL live** — `npm run test:live-topology` stopped at `transport: 'auto' !== 'http'`; direct Azure reads also found maximum three replicas and three running replicas. |

The landing, README, privacy, and terms copy were cross-checked against the claims list. No additional unlisted end-user capability claim was found.

## Release-blocking defects

### Critical — live topology breaks the core two-device relay

Direct read-only Azure inspection at 15:53–15:55 UTC reported:

- one active revision, `sf-haptic-beat-relay--0000021`, with 100% traffic;
- revision mode `Single`, but ingress transport **`Auto`**, not required `http`;
- application and active revision scale **min 1 / max 3**, not 1 / 1;
- three replicas in `Running` state;
- live health identity equal to the candidate SHA.

`RELAY_ROUNDS=5 npm run test:live-relay` failed in its first round while waiting for a companion connection. An independent browser reproduction created room `LNRXVP`; the host then displayed **“The relay connection closed. Reload to make a new room.”** and logged a WebSocket handshake 404. The companion displayed **“That room is not open. Check the code with the host.”** This directly fails the researched smallest useful product: a host and second device cannot reliably join, receive cues, tap back, and share an accuracy score.

Rooms, WebSocket channels, and rate buckets are intentionally process-local, so deploying this application above one replica is incompatible with the product contract.

### High — documented 40-request live allowance is not enforced

The documented allowance is exactly 40 room API requests per client per second, followed by 429 and `Retry-After: 1`. Once three replicas were live, a 45-request burst from one fresh forwarded identity received **45 HTTP 200** responses and **zero 429** responses. The observed allowance is therefore at least 45 and non-deterministic under the current topology; it is not the documented 40. This is both a failed claim and a backend-service contract failure.

## Local build and backend evidence

- `npm ci`: PASS — lockfile install completed with zero audit vulnerabilities.
- `npm test`: PASS — 3 Vitest tests, release/deployment contract checks, 10 Rust tests, clean-entrypoint checks, and the full desktop/390 px Playwright suite passed (two deliberate per-project skips).
- `npm run build`: PASS — TypeScript check and production Vite build passed. The configured output is `frontend/dist/` (296,768 bytes); JS is 23,164 bytes raw / 7.84 kB gzip and CSS is 15,590 bytes raw / 4.21 kB gzip.
- `cargo fmt --all -- --check`: PASS.
- `cargo clippy --all-targets --all-features --locked -- -D warnings`: PASS.
- `BUILD_SHA=<candidate> cargo build --release --locked`: PASS.
- With only `PATH` and `PORT=18080` supplied, the release binary served `/health` with the candidate SHA and logged `PORT supplied; no secrets required`.
- Docker could not be executed because no `docker` binary is installed in this verifier container. The repository's Docker/release contract checks passed.

## Product behavior, privacy, accessibility, PWA, headers, and performance

- Live demo: a fresh `/demo` sample completed at **89%** after 12 seconds, made no `/api/` request, made only same-origin requests, emitted no console or page error, and left localStorage, sessionStorage, and IndexedDB empty.
- Invalid room-code API input returned HTTP 400 with the plain recovery message “A room code has six letters and numbers. Check the code and try again.”
- Axe scans at desktop and 390 px for `/`, `/demo`, `/privacy`, `/terms`, `/join`, and `/404` found **zero serious or critical** violations. Each successful route had `lang="en"`, one `h1`, one `main`, useful route title, and no horizontal overflow. The direct 404 document correctly logs its own HTTP 404 in the console.
- The live PWA installed one active service worker with no waiting worker; an offline reload of `/demo` returned 200 from the worker and retained “Try a tactile beat round” plus the **Start sample round** action.
- HTML, demo, legal pages, manifest, and service worker use `Cache-Control: no-cache`; hashed JS/CSS use `public, max-age=31536000, immutable`. Live responses set self-only CSP including `frame-ancestors 'none'`, `nosniff`, and strict-origin referrer policy.
- The local and live JS SHA-256 values match `dbddb8dcd88a7d77517153f3e1d6dede1bcbe65385cb5ea562eb74bc5e7c26d3`; CSS SHA-256 values match `75f30853abea59ac8abbd47cba9705f22ae575f7ea21aa4cf28cf4d587398e87`. Initial JS is well within the 200 kB budget.
- There is no sign-in surface, so the Entra tenant condition does not apply.

## Required release action

Do not accept or release the current live deployment. Redeploy the exact candidate through `npm run deploy` (or apply the equivalent factory action), then verify Azure reports HTTP ingress, min/max `1/1`, and exactly one running replica. Require `/health` to stay equal to `c49a4ae3ad2dfd30188ac6e3be4e5ecc596aec8f`, then rerun every claims command, the multi-round live relay test, and the five-client 45-request allowance test before changing this result to PASS.
