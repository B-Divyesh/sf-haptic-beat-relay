# Independent verification 15 — FAIL

- **Candidate:** `c3b93a918d00de9559e80c7e21332609b5279893`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 UTC
- **Result:** **FAIL — do not release.**

## Release blockers

### P0 — deployed two-device relay is not reliable

The production health response identifies itself as the nominated commit:

```json
{"build_sha":"c3b93a918d00de9559e80c7e21332609b5279893","status":"ok"}
```

It nevertheless routes the two requests for a new room to different
process-local relays. The claim regression reproduced this from a fresh
client:

```text
RELAY_ROUNDS=1 npm run test:live-relay
AssertionError: API room 1: fresh companion join for XEA66V failed:
{"error":"room_not_found","message":"That room is not open. Check the code with the host."}
404 !== 200
```

This is the first API phase of the listed 30-round `live-relay` claim, before
the desktop-host/390 px companion WebSocket round can begin. It prevents the
brief's smallest useful product: a host cannot reliably pair one companion.
The listed `RELAY_ROUNDS=30 npm run test:live-relay` invocation was also run;
it did not produce a passing completion. The one-round reproduction above is
the concise, independently captured failure.

### P0 — production does not enforce the documented API allowance

The required five-client live claim command failed immediately:

```text
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
expected exactly 40 accepted requests for 198.51.100.115
45 !== 40
```

Observed allowance: **45/45 requests accepted** for a fresh forwarded client;
there were **zero 429 responses** and therefore no `Retry-After: 1`. This
violates both the README/public claim and the backend rate-limiting contract.

### P0 — live singleton topology is wrong for process-local state

The required topology command failed:

```text
npm run test:live-topology
Expected values to be strictly equal:
'auto' !== 'http'
```

The application requires one HTTP-ingress replica because rooms, WebSockets,
and rate buckets are in memory. The live ingress is `auto`, not the required
`http`. The fresh room loss and distributed rate bucket above are consistent
with this runtime/topology drift. `/health` matching the candidate SHA proves
this is a faulty deployment of the candidate, not a stale page.

## First-read and product exercise

**First read: PASS.** A cold desktop visit plainly says “Send every beat to a
friend,” names “friends and rhythm-game makers,” and offers the one-click
**Try it with sample data** action with “A paired sample round opens now.”

The live `/demo` route opened a paired sample room, displayed the persistent
“Demo — sample data, nothing is saved” controls, started its 12-second sample
round, and reset. It made only same-origin requests and left localStorage and
sessionStorage empty. A 390 × 844 mobile view had no horizontal overflow and
kept the sample action visible. Keyboard testing reached the skip link first,
showed a cyan focus outline, and moved focus to the `h1`.

Validations/recovery observed:

- `POST /api/rooms/A2/join` returns `400 invalid_code` with a concrete
  recovery message.
- `POST /api/rooms/ABCDEF/join` returns `404 room_not_found` with recovery
  copy.
- The normal real-room create → join flow is the P0 failure above.

## Claims contract

`.factory/claims.json` exists and lists 16 claims. The production-browser
entry point was run from a clean `npm ci`; the completed local Playwright run
recorded `{"status":"passed","failedTests":[]}`. Browser claims passed on
desktop and the 390 px project. The Rust ephemeral-room claim passed.

| Claim(s) | Result | Evidence |
| --- | --- | --- |
| demo-sandbox, sample-duration | PASS | `npm run test:browser -- --grep @claim:demo-sandbox`: 2/2 passed |
| local-audio, no-third-party, no-account, free-use, shared-score, health, connection-required, visual-cue, haptic-output, real-round-duration | PASS locally | Full production-build Playwright run passed; `test-results/.last-run.json` reports no failures |
| ephemeral-rooms | PASS | `cargo test claim_ephemeral_rooms_evict_after_the_configured_ttl_and_on_restart`: 1 passed |
| live-relay | **FAIL** | fresh create → join returned `404 room_not_found` |
| rate-limit | **FAIL** | 45 accepted, 0 limited; required 40/5 with `Retry-After: 1` |
| singleton-deployment | **FAIL** | live ingress reports `auto`, expected `http` |

Any one of the three failed live claims is release-blocking.

## Local quality gates and backend boundary

- Clean install: `npm ci` installed 59 locked packages, with zero audit
  vulnerabilities.
- `npm test` was run: 3 Vitest tests, release/deployment-contract tests, 10
  Rust tests, clean-entrypoint browser tests, and the complete Playwright
  suite passed locally.
- `npm run build` passed TypeScript and Vite. Initial JS is 23,164 bytes raw /
  7.84 kB gzip; CSS is 15,590 bytes raw / 4.21 kB gzip.
- `cargo fmt --all -- --check` and `cargo clippy --all-targets --all-features
  -- -D warnings` passed. `BUILD_SHA=<candidate> cargo build --release
  --locked` passed.
- A local release binary on `PORT=18080` returned the candidate build SHA.
  Against that one process, `RELAY_ROUNDS=1 npm run test:live-relay` passed and
  five forwarded identities each got exactly 40 successes plus five `429`
  responses with `Retry-After: 1`. Room expiry/restart behavior is covered by
  the passing Rust claim test. This isolates the defect to live runtime
  topology.
- Docker could not be exercised because `docker` is not installed in this
  verifier container (`docker: command not found`).

## Browser, privacy, accessibility, performance, and response policy

- Live desktop and 390 px mobile cold loads returned 200 with no console or
  page errors. Playwright Axe found **zero serious or critical** violations on
  both. (No `verify-url.sh` exists in this checkout; the equivalent checks
  were performed directly.)
- The first live-page and demo request logs contain only the product origin;
  there are no third-party scripts, trackers, or outgoing API origins.
- The PWA service worker was active with no waiting/installing replacement.
  After a first `/demo` visit, offline reload succeeded and still displayed
  the sample room.
- Responses include self-only CSP with `frame-ancestors 'none'`, `nosniff`,
  and `strict-origin-when-cross-origin`. HTML is `no-cache`; hashed JS is
  `public, max-age=31536000, immutable`. The hero WebP is 26,186 bytes. An
  unknown route returns real HTTP 404.

## Required next step

Correct the Container App runtime configuration for this exact candidate:
single active revision, **HTTP** ingress, and exactly one configured and
running replica (`minReplicas=1`, `maxReplicas=1`). Then rerun, against the
live URL, the 30-round relay claim, the five-client rate-limit claim, and the
topology/health-identity claim before changing this verdict.
