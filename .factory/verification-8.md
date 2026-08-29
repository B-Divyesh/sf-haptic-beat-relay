# Independent verification 8 — FAIL

**Work order:** haptic-beat-relay-verify-8  
**Candidate:** c181749f6b241078bda307e01464d8584a627c21  
**Live URL:** <https://haptic-beat-relay.sociobot.in>  
**Verified:** 2026-08-29 UTC

## Result

**FAIL — do not release.** The deployed response identifies the requested candidate, and the local product passes its unit, browser, accessibility, format, lint, and production-build checks. The deployment nevertheless allows the process-local relay to scale beyond one replica. That splits room, WebSocket, and rate-limit state, causing a live core-flow failure and an incorrect per-client allowance.

## Required first checks

### Cold first read — PASS

Fresh desktop page load says **“Send every beat to a friend.”** It identifies the audience as friends and rhythm-game makers who need tactile cues and shared timing without an account. The visible, one-click first action is **“Try it with sample data”**, with “A paired sample round opens now” beside it. This answers what it does, for whom, and what to click first in plain words.

The demo opens /demo with the seeded 104 BPM paired room, Sam, past scores, the 12-second sample round, and the persistent “Demo — sample data, nothing is saved” banner with Reset demo and Start for real.

### Claims gate — FAIL

After npm ci, I ran every command in .factory/claims.json individually before broader QA. The 13 local/demo claims passed; the required live singleton claim failed.

| Claim | Result | Evidence |
| --- | --- | --- |
| demo-sandbox | PASS | Desktop and mobile one-click sample run/reset passed. |
| sample-duration | PASS | The seeded round completed after 12 seconds. |
| local-audio | PASS | Marked audio bytes never left the host. |
| no-third-party | PASS | Browser test and fresh live demo log saw only the product origin. |
| no-account | PASS | Host flow has no sign-in. |
| free-use | PASS | No payment gate appears. |
| shared-score | PASS locally | Two contexts joined, cued, tapped, and shared a score. |
| ephemeral-rooms | PASS | Rust TTL and process-restart test passed. |
| rate-limit | PASS locally | Exactly 40 requests passed, then five 429 responses with Retry-After: 1. |
| health | PASS | Health returned status and a build SHA. |
| connection-required | PASS | Offline real-room creation presented recovery guidance. |
| visual-cue | PASS locally | A vibration-unavailable companion showed the visual cue. |
| real-round-duration | PASS locally | The 60-second completion measurement passed. |
| singleton-deployment | **FAIL** | npm run test:live-topology asserted auto !== http. Fresh Azure data also shows maxReplicas: 3, not 1. |

One failed listed claim is release-blocking.

## Release-blocking defects

### Critical — live relay breaks when Container Apps starts another replica

The backend holds rooms, WebSocket broadcast state, and the limiter in a process-local HashMap. Fresh Azure reads show active revision sf-haptic-beat-relay--0000015, 100% traffic, active-revision mode Single, but ingress transport **Auto**, minimum **1**, and maximum **3** replicas. Immediately after the live relay test, Azure listed **two Running replicas**: ...-rjq9k and ...-wssf7.

The impact is directly reproducible on the public product:

- RELAY_ROUNDS=30 npm run test:live-relay failed at the companion connection wait after 10 seconds.
- A following RELAY_ROUNDS=1 run failed waiting for the host’s round action to become enabled.
- During a fresh 390 px /host load, the browser logged a WebSocket upgrade 404 for /api/rooms/VWIXVP/socket?....

This prevents a host and a companion from reliably creating, joining, and running the shared tactile beat round.

### High — live per-client request allowance doubles to 80

The claim and backend contract require exactly 40 room API requests per client per second, then 429 with Retry-After. Before scale-out, a fresh 45-request burst correctly returned 40 × 200 and 5 × 429, all with Retry-After: 1. Once two replicas ran, a fresh 90-request burst for one X-Forwarded-For identity returned **80 × 200** and **10 × 429**, with Retry-After: 1 on every rejection. Each replica has an independent in-memory limiter.

## Candidate/deployment identity

Live GET /health returned:

json
{"build_sha":"c181749f6b241078bda307e01464d8584a627c21","status":"ok"}


Local and live hashed assets match byte-for-byte:

- JavaScript: 8dc97d9d720d52121f4d0dabcca004af81be92f98871a033bcb175503f94dd4e
- CSS: 75f30853abea59ac8abbd47cba9705f22ae575f7ea21aa4cf28cf4d587398e87

This rules out a stale deployment or stale frontend.

## Local quality checks — PASS

- npm ci: passed; 60 packages audited, 0 vulnerabilities.
- npm test: passed: 3 Vitest tests, 9 Rust tests, clean browser entrypoint, and 34 Playwright tests (2 expected project-specific skips).
- npm run build: passed TypeScript no-emit and production Vite build.
- cargo fmt --all -- --check, cargo clippy --all-targets --all-features --locked -- -D warnings, and cargo build --release --locked: passed.

Production output is 23,162 bytes JS raw (7.85 KB gzip), 15,590 bytes CSS raw (4.21 KB gzip), and a 26,186-byte mobile hero. This is a backend web service, not a library/CLI, so consumer-install testing does not apply.

The release binary also started with only PATH and PORT=18080; 100 simultaneous room creates from distinct forwarded clients all returned 200, and a room returned 404 after process restart. Those results agree with intended ephemeral storage and show that production scaling is the fault.

## Accessibility, privacy, PWA, headers, and errors

Fresh live Playwright scans at 1440 px and 390 px covered /, /demo, /host, /join, /privacy, /terms, and /404. Normal routes had one h1, one main, lang=en, and route titles; Axe found **0 serious or critical** violations. At 390 px, scrollWidth === innerWidth === 390. First keyboard Tab reaches the skip link with a visible cyan 3 px outline. Normal routes had no errors; /host logged the release-blocking WebSocket 404.

The live demo made only product-origin document, JS, CSS, and favicon requests; it made no API request and created no localStorage or sessionStorage keys before or after starting the sample. There are no account controls, so Entra checks do not apply.

The PWA registers /sw.js, has a controlling worker and cache haptic-beat-relay-v2, and reloaded /demo offline with its sample action usable. Headers include a self-only CSP, X-Content-Type-Options: nosniff, strict-origin referrer policy, and immutable one-year caching for hashed JS/CSS.

## Required repair and retest

1. Apply actual Container App HTTP ingress with minReplicas: 1 and maxReplicas: 1, then pass the live topology claim. Do not rely solely on checked-in desired configuration.
2. Or move rooms, WebSocket relay state, and rate limits to shared infrastructure before allowing multiple replicas.
3. Retest at least 30 fresh desktop-host plus 390 px-companion rounds with no room/WebSocket 404s and matching scores.
4. Retest a one-client live burst: only 40 requests may pass before 429 with Retry-After.

