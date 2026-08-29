# Independent verification 13 — FAIL

- **Work order:** `haptic-beat-relay-verify-13`
- **Candidate commit:** `0951d468e6e484d99d937b76e84af781da1064c0`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-08-29 14:39 UTC

## Decision

**FAIL — release blocked.** The exact candidate passes its local build and test
gates, and the one-click sample is clear and usable. The live service does not
match the candidate and cannot reliably complete the brief's core two-device
job. Its process-local room and rate-limit state is running across three
replicas.

Fresh live evidence found all of the following:

- `/health` reports build `3e6238218195eecf4504528b193a87768909604c`,
  not candidate `0951d468e6e484d99d937b76e84af781da1064c0`;
- Azure reports ingress `Auto`, scale `1–3`, and three running replicas;
- the live relay regression failed its first create-to-join attempt with
  `404 room_not_found`;
- the exact five-client rate-limit claim failed because a fresh client
  received 45 successes and no 429 response;
- five additional fresh client bursts each received 45/45 successes.

Any failing claim command is release-blocking under the acceptance contract.

## Mandatory opening gates

### First-read test — PASS

A cold desktop visit says **“Send every beat to a friend.”** The next sentence
names **friends and rhythm-game makers** and promises tactile cues and shared
timing without an account. **“Try it with sample data”** is visible as the
primary action, beside **“A paired sample round opens now.”** The same content
and action fit within a cold 390 × 844 viewport.

The one-click action opens `/demo`, already populated with room `DEMO24`,
companion Sam, 104 BPM, two past scores, and the persistent **“Demo — sample
data, nothing is saved”** banner. A fresh live run completed in 12 seconds at
89%; Reset demo restored 86%.

### Claims gate — FAIL

After checking out the exact candidate and running a clean `npm ci`, every
command in `.factory/claims.json` was run exactly as listed.

| Claim | Result and evidence |
| --- | --- |
| `demo-sandbox` | PASS — desktop and mobile started, completed, and reset the in-memory sample. |
| `sample-duration` | PASS — both browser projects observed completion after 12 seconds. |
| `local-audio` | PASS — marked fixture bytes were not sent. |
| `no-third-party` | PASS — requests remained same-origin. |
| `no-account` | PASS — room creation required no sign-in. |
| `free-use` | PASS — no purchase or payment gate appeared. |
| `shared-score` | PASS locally — a companion received a cue, returned a tap, and matched the host score. **The equivalent live flow fails.** |
| `ephemeral-rooms` | PASS — configured TTL eviction and fresh-process loss passed. |
| `rate-limit` | **FAIL live** — a fresh identity received 45 HTTP 200 responses instead of exactly 40 successes and five 429 responses. |
| `health` | PASS as written — `/health` returns a build string. The live value does not match this candidate. |
| `connection-required` | PASS — offline creation showed actionable reload guidance. |
| `visual-cue` | PASS — the companion entered its visible cue state without vibration support. |
| `haptic-output` | PASS locally — stubs observed `vibrate(45)` and the documented controller rumble call. |
| `real-round-duration` | PASS — the connected local round remained active at 59 seconds and completed at 60 seconds. |
| `singleton-deployment` | **FAIL live** — ingress is `Auto`, where the exact claim requires `http`; follow-up reads also found max three and three running replicas. |

The prior unlisted haptic-output promise is now listed and has exactly one
tagged regression. Cross-checking the landing, legal pages, and README found no
new unlisted end-user capability claim.

## Release-blocking defects

### Critical — live deployment is stale and violates the singleton contract

Read-only Azure inspection returned:

- active revision mode: `Single`;
- active revision: `sf-haptic-beat-relay--0000020`, 100% traffic;
- ingress transport: **`Auto`**, not required `http`;
- application and active-revision scale: `minReplicas: 1`,
  **`maxReplicas: 3`**;
- **three** replicas in `Running` state;
- live health build: **`3e6238218195eecf4504528b193a87768909604c`**,
  not the candidate.

The source stores rooms, WebSocket broadcast channels, and rate buckets only
in one process. `npm run test:live-relay` failed on API room 1: creation
returned a valid code, then a fresh companion join returned
`404 room_not_found`. The smallest useful product therefore does not work end
to end at the live URL.

Candidate and live frontend shell, JS, CSS, service worker, manifest, robots,
and sitemap hashes are equal because this candidate changes tests and claims,
not production frontend bytes. The backend build identity still does not match,
and the runtime configuration is observably wrong.

### High — documented live allowance is not enforced

The documented allowance is exactly 40 room API requests per client per
second, followed by 429 with `Retry-After: 1`.

- The exact command
  `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` failed on its first
  fresh client with **45 accepted / 0 limited**.
- A separate five-client measurement returned **45 HTTP 200 / 0 HTTP 429** for
  each of `198.51.100.221` through `.225`.
- No `Retry-After` header could be observed because no request was limited.

The same candidate enforces the boundary correctly in one local process: a
100-request same-client burst returned exactly 40 HTTP 200 and 60 HTTP 429,
and every 429 had `Retry-After: 1`. Production splits the bucket across
replicas, so the live allowance is not the documented allowance.

## Local build, tests, and backend boundaries

- `npm ci`: PASS — 59 locked packages, zero audit vulnerabilities.
- `npm test`: PASS — 3 Vitest tests, release/deployment contract checks, 10
  Rust tests, clean-entrypoint regression, and 36 Playwright checks; two
  project-specific duplicates were intentionally skipped.
- `npm run build`: PASS — TypeScript `--noEmit` and exact Vite production build.
- `cargo fmt --all -- --check`: PASS.
- `cargo clippy --all-targets --all-features --locked -- -D warnings`: PASS.
- `BUILD_SHA=<candidate> cargo build --release --locked`: PASS.
- The release binary started with only `PORT`, logged that no secrets were
  required, and `/health` returned the candidate SHA.
- Local concurrency: 100 simultaneous creates from 100 client identities
  returned 100 HTTP 200 responses and 100 unique room codes.
- Persistence boundary: a room created before restart returned 404 after the
  process restarted, as documented.
- Docker was not run because this worker has no `docker` executable. The
  checked-in Docker/release contract tests and exact component builds passed.

There is no separate frontend lint script. TypeScript checking and strict
Clippy are the available static checks.

## Product, error, and boundary cases

- Normal one-click sample: completed, reset, and remained isolated.
- Normal real host/companion round: passed locally; failed live as described.
- Tempo boundaries: the live UI reported 60 BPM minimum and 180 BPM maximum.
- Invalid short code: explained the six-character requirement and restored
  focus to the field.
- Formatted code `ab-12cd`: normalized to `AB12CD`; the absent room returned a
  plain error and working **Enter another code** recovery link.
- Invalid text upload: rejected with **“Choose an audio file. This file was not
  loaded.”**
- Unknown routes returned HTTP 404 and a styled way home.
- All expected product links returned 200; the intentional `/404` remained
  404, and the privacy email link was present.
- The product has no sign-in flow, so the Entra tenant requirement does not
  apply.

## Privacy, accessibility, PWA, headers, and performance

### Privacy and requests

- Cold root and full live sample flows made only same-origin requests.
- The live 12-second sample made no `/api/` request.
- After completion and reset, localStorage, sessionStorage, and IndexedDB were
  all empty.
- The local marked-audio test confirmed file bytes never left the host.
- No analytics, advertising, third-party font, script, or runtime request was
  observed.

### Accessibility and responsive behavior

- Fresh live Axe scans on `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`,
  and `/404` found zero serious or critical findings at desktop and 390 px.
- Every tested route had `lang="en"`, one `h1`, one `main`, a useful title, and
  no horizontal overflow.
- Keyboard smoke tests found the skip link first, with a visible 3 px cyan
  focus outline. SPA navigation focuses the destination heading, and invalid
  join input returns focus to the field.
- Reduced-motion contexts matched the stylesheet fallback, which shortens
  animation and transition durations to 0.01 ms.
- The full browser suite passed 390 px touch-target and 200% text checks.
- No console or page errors occurred on successful live routes. A direct 404
  document predictably logged its HTTP failure.

### PWA, headers, caching, and budgets

- The service worker installed and controlled `/demo`; an explicit update
  check left one active worker and no waiting worker.
- With the browser offline, `/demo` reloaded at HTTP 200 with its heading,
  sample action, and demo banner intact.
- HTML, service worker, manifest, and 404 responses use `Cache-Control:
  no-cache`; hashed JS/CSS use one-year `immutable` caching.
- Responses include a self-only CSP with `frame-ancestors 'none'`, `nosniff`,
  and strict-origin referrer policy.
- Initial JS: 23.16 kB raw / 7.87 kB gzip. CSS: 15.59 kB raw / 4.22 kB gzip.
  Mobile hero: 26.19 kB. Full `dist/`: 296.76 kB.
- Fresh Lighthouse 13.0.1 mobile: performance **100**, accessibility **100**,
  best practices **100**, SEO **100**; FCP 1.05 s, LCP 1.80 s, TBT 0 ms, CLS
  0, total transfer 166,632 bytes.

## Required release action

Do not release this candidate at the current URL. Deploy the exact candidate,
reapply the checked-in `Single` / HTTP / min-max-one contract, wait for exactly
one running active replica, and require `/health` to equal the candidate SHA.
Then rerun every claims command, the 30-round live relay regression, and the
five-client live allowance check before changing this result to PASS.
