# Independent verification 7 — FAIL

**Work order:** `haptic-beat-relay-verify-7`

**Candidate:** `39234467eae0bb1a54d72a7c7bc5ccb998ef7146`

**Live URL:** <https://haptic-beat-relay.sociobot.in>

**Verified:** 2026-08-29 UTC

## Result

**FAIL — do not release.** The live image and hashed frontend assets match the
candidate, and every declared claim command passes locally after a clean
install. The deployed product nevertheless fails its core two-device job. Its
process-local room state is split across three live replicas, so independent
host and companion devices frequently receive HTTP or WebSocket 404s. Only 1
of 10 fresh two-process relay attempts completed.

The candidate also fails the mandatory cold first-screen test on desktop: the
audience sentence is clipped and the sample action is below the 1440×900
viewport. The live API accepts 120 requests from one client before limiting,
not the documented 40.

No product code was modified during verification.

## Release-blocking findings

### Critical — live room state is split across three replicas

The backend stores rooms and broadcast channels in a process-local `HashMap`.
The checked-in deployment contract therefore requires exactly one replica and
HTTP ingress. Fresh Azure queries found the active deployment configured and
running differently:

- image: `sociobotregistry.azurecr.io/sf-haptic-beat-relay:39234467eae0`;
- active revision: `sf-haptic-beat-relay--0000014`, 100% traffic;
- revision mode: `Single`;
- **minimum 1, maximum 3 replicas**;
- ingress transport: **`Auto`**;
- **three ready, started, running replicas** at the final observation.

Fresh live behavior confirms that this breaks the real job:

- `npm run test:live-relay` aborted when the companion could not connect to
  its new room. A subsequent 10-round rerun passed because the reused browser
  network connection happened to remain sticky; this inconsistency is itself
  characteristic of the topology defect.
- A stricter test launched the host and 390 px companion in separate Chromium
  processes for each attempt. **1 of 10 passed**. Eight timed out with room or
  WebSocket 404s; one returned a score that did not match the companion.
- Ten API-created rooms received six immediate join attempts each. Results
  were **10 × 200, 35 × 404, and 15 × 409**. The 200/409 responses reached the
  room-owning process; the 404 responses reached another process.
- An ordinary live `/host` route check logged a WebSocket handshake 404.

Evidence: [`live-topology.json`](evidence/verification-7/live-topology.json),
[`live-replicas.json`](evidence/verification-7/live-replicas.json),
[`live-create-join-split.log`](evidence/verification-7/live-create-join-split.log),
and [`live-separate-process-relay.log`](evidence/verification-7/live-separate-process-relay.log).

### High — the live 40-request client allowance is not enforced

With three live replicas, a fresh 130-request burst from one forwarded client
returned **120 × 200 and 10 × 429**. Every limited response included
`Retry-After: 1`. The observed live allowance is therefore **120 requests per
second**, not the documented and locally tested 40. Earlier in the same run,
while two replicas were ready, the observed allowance was 80.

One local release-binary process behaves correctly: 45 requests returned
40 × 200 and 5 × 429 with `Retry-After: 1`. The defect is the deployed topology,
not the single-process limiter.

Evidence: [`live-rate-limit-current.log`](evidence/verification-7/live-rate-limit-current.log)
and [`local-release-api.log`](evidence/verification-7/local-release-api.log).

### High — the cold desktop first screen does not show what to click

The page's intended first read is clear in source:

- what it does: “Send every beat to a friend”;
- for whom: friends and rhythm-game makers needing tactile cues and shared
  timing;
- what to click first: **Try it with sample data**.

However, on a fresh 1440×900 desktop load the oversized heading ends at y=784,
the audience sentence runs from y=808 to y=912 and is clipped, and the primary
action starts at y=944. The action is entirely below the viewport. A cold
visitor therefore cannot see the complete audience statement or the first
action on the first screen. This independently fails the work order's mandatory
first-read gate.

The 390×844 mobile first screen does show the headline, complete audience
sentence, and primary action. The action opens `/demo` in one click.

Evidence: [`first-read-desktop.png`](evidence/verification-7/first-read-desktop.png),
[`first-read-mobile.png`](evidence/verification-7/first-read-mobile.png), and
[`first-read.json`](evidence/verification-7/first-read.json).

### High — material public claims are absent from `claims.json`

The claim manifest exists and every listed command passes, but the landing
page and README contain material claims with no corresponding manifest entry:

- “Start 60-second round” is a quantitative real-round claim. The browser
  suite starts the round but does not measure a 60-second completion.
- The README says the relay runs as **exactly one Container App replica**.
  That claim is not listed and is false in the live deployment.

The claims contract states that an unlisted claim fails review. The singleton
claim is also operationally essential, because room state is process-local.

## Required claims gate

After `npm ci`, every exact command in `.factory/claims.json` was run separately
from the clean checkout. All 12 passed:

| Claim | Result | Fresh evidence |
| --- | --- | --- |
| `demo-sandbox` | PASS | Desktop and mobile started, completed, and reset the in-memory sample. |
| `sample-duration` | PASS | Both projects observed the 12-second completion. |
| `local-audio` | PASS | Marker audio bytes did not occur in outgoing requests. |
| `no-third-party` | PASS | Captured requests were same-origin. |
| `no-account` | PASS | A local room opened without sign-in. |
| `free-use` | PASS | No purchase or payment gate appeared. |
| `shared-score` | PASS locally | One-process host and companion returned the same scored tap. |
| `ephemeral-rooms` | PASS | TTL eviction and new-process loss passed in Rust. |
| `rate-limit` | PASS locally | Each project saw exactly 40 successes, then five 429s with `Retry-After`. |
| `health` | PASS | `/health` returned status and build identity. |
| `connection-required` | PASS | Offline room creation showed recovery guidance. |
| `visual-cue` | PASS locally | A vibration-unavailable companion entered the cue state. |

The raw outputs are in [`claims/`](evidence/verification-7/claims/). These local
passes do not override the contradictory live core-flow and rate-limit evidence.

## One-click demo

The demo itself passes:

- `/demo` opens with one click and immediately shows a 104 BPM paired sample,
  Sam as companion, two prior scores, and the sample-round control;
- the persistent banner says “Demo — sample data, nothing is saved” and offers
  **Reset demo** and **Start for real**;
- a full live sample round completed and Reset restored the 86% seed score;
- Playwright recorded only the product origin, no `/api` requests, no local or
  session storage, and no console/page errors during the demo flow.

## Candidate and deployment identity

- Repository HEAD was exactly the requested candidate.
- Live `/health` returned
  `{"build_sha":"39234467eae0bb1a54d72a7c7bc5ccb998ef7146","status":"ok"}`.
- Local and live JavaScript SHA-256 were both
  `c264123e3287ec7d753927f9d1fad3eb7455cc70236fdde418b6bea9314f18ac`.
- Local and live CSS SHA-256 were both
  `51c4fb1a742cb3550e9714a429bac053f31f588b407313b723093bc3685ffc74`.
- The built service worker and live service worker also matched.

The deployed image matches the candidate. The live Container App configuration
does not match the candidate's checked-in singleton/HTTP contract.

## Clean install, test, type, lint, and build evidence

- `npm ci`: PASS, 60 packages audited, 0 vulnerabilities.
- `npm test`: PASS — 3 Vitest tests, 9 Rust tests, the clean browser-entrypoint
  regression, and 31 Playwright tests passed; one desktop-only touch-target
  duplicate was intentionally skipped.
- `npm run build`: PASS; this runs the TypeScript no-emit check and exact Vite
  production build into `frontend/dist`.
- `cargo fmt --all -- --check`: PASS.
- `cargo clippy --all-targets --all-features --locked -- -D warnings`: PASS.
- `cargo build --release --locked`: PASS.
- `git diff --check`: PASS before report changes.
- No ESLint or other repository lint command exists.
- Docker is not installed in this worker, so a local image build was not
  possible. The Dockerfile contract test passed, and the live ACR-built image
  reports the exact candidate SHA.

The production frontend is small: JavaScript 23,162 bytes raw / 7.85 KB gzip;
CSS 15,541 bytes raw / 4.20 KB gzip; mobile hero WebP 26,186 bytes. It stays
comfortably inside the stated budgets.

## Backend boundary evidence

The release binary started with only `PATH` and `PORT=18080`; it reported the
supplied port, `build_sha: dev`, and that no secrets are required.

One-process local checks passed:

- malformed code: 400 with actionable text;
- unknown room: 404;
- create → first join → second join: 200 → 200 → 409;
- six-character code, 32-character tokens, 7,200-second advertised TTL;
- the 45-request client burst enforced 40 + five 429s;
- 100 simultaneous requests from 100 identities all succeeded;
- a room created before process restart returned 404 afterward;
- `/health` returned 200 and build identity.

The live multi-process boundary fails as detailed above.

## Accessibility, keyboard, layout, and errors

Fresh live checks covered `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`,
`/404`, and an unknown route at 1440 px and 390 px:

- every route had `lang=en`, one h1, one main, ordered headings, titles, and no
  images missing alt text;
- Axe reported **0 serious or critical violations** across all 16 checks;
- no horizontal overflow occurred at normal size or 200% text size;
- all visible mobile links, buttons, and inputs met 44×44 px after text resize;
- the first Tab focused the skip link with a visible 3 px cyan outline;
- keyboard activation of the demo link changed the route and focused its h1;
- reduced-motion media matched and reduced animation/transition duration to
  `0.01ms`;
- internal and external link crawl targets returned 200; intentional missing
  routes returned 404 with the designed page.

The demo had no console or page errors. The real host flow logged the
release-blocking WebSocket 404. Browser console resource errors for the two
intentional 404 route checks were not treated as ordinary-page failures.

## Privacy, headers, caching, PWA, and performance

Playwright request capture confirmed:

- the live demo used only `https://haptic-beat-relay.sociobot.in`, made no API
  requests, and stored nothing in local/session storage;
- a marked local WAV stayed in a blob URL; its marker appeared in no request
  body, and every request origin was the product origin;
- there are no sign-in controls, so the Entra-authority check is not applicable;
- this is not a library or CLI, so pack/consumer testing is not applicable.

Browser response inspection found:

- HTML and service worker: `Cache-Control: no-cache`;
- hashed JS/CSS: `public, max-age=31536000, immutable`;
- self-only script/style CSP with `frame-ancestors 'none'`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`.

The service worker activated, removed a seeded old cache during update, and
reloaded `/demo` offline after the ordinary browser cache was cleared. The
sample heading and Start button remained usable.

Fresh mobile Lighthouse: **99 performance, 100 accessibility, 100 best
practices, 100 SEO**; LCP 1.50 s, CLS 0, TBT 106 ms, total transfer 166,585
bytes. Evidence: [`lighthouse-mobile.json`](evidence/verification-7/lighthouse-mobile.json).

## Required repair and retest

1. Make the deployed relay truly singleton with HTTP ingress, or move rooms,
   WebSocket broadcast state, and rate-limit state to shared infrastructure.
2. Make the normal factory deployment path enforce and verify that runtime
   contract; a checked-in JSON file and optional deploy script are insufficient.
3. Redeploy and pass at least 30 host/companion rounds using separate browser
   processes or devices, with zero room/WebSocket 404s and matching scores.
4. Confirm one deployed client receives exactly 40 accepted API requests, then
   429 responses with `Retry-After`.
5. Fit the audience and sample action inside a normal desktop first viewport.
6. Add manifest-backed tests for the real 60-second round and live singleton
   claim, or remove those claims. Rerun every claim command and the full suite.
