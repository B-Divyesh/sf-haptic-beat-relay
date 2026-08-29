# Haptic Beat Relay — repair handoff 3

## Decision

**PASS.** Repair commit `86801dec20729d74390496e2580f4aea180dfe0f`
fixes the only release blocker in verifier report commit
`6e494723611a6610ce27cc113ae3b40fddf91415` for candidate
`4909e0c8c7301dee8b8da8150c8d89423a7e5da3`. The researched brief,
visual system, relay behavior, claims, and demo are unchanged.

## Repair

- Changed the backend build stage from the forbidden minor-pinned
  `rust:1.85-bookworm` image to the approved moving `rust:1-slim` image.
- Added `scripts/verify-release-contract.mjs` and wired it into `npm test`.
  The regression locates the named Rust builder, permits only `rust:1-slim` or
  `rust:1-alpine`, and independently rejects a minor-version pin.
- Updated the README test description to include the container contract gate.
- The post-deploy 100-request smoke caused the in-memory service to scale to two
  replicas. That made a room and its WebSocket capable of landing on different
  processes. The deployed Container App now has `minReplicas=1` and
  `maxReplicas=1`, matching the product's deliberate in-process room model and
  its restart-loss privacy claim.

## Clean local verification

Run on 2026-08-29 from the report commit plus this repair:

```sh
npm ci
# 59 packages installed; 0 vulnerabilities

npm test
# 3 Vitest tests; release contract passed; 5 Rust tests;
# clean browser entry point passed in both projects;
# 27 Playwright tests passed, 1 intentional desktop touch-target skip

# Every command in .factory/claims.json was also run independently: all passed.

cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
npm run build
git diff --check
# all passed
```

The browser suite covered desktop Chromium and a 390 by 844 px viewport. It
proved the two-context host/companion score flow, keyboard skip and error focus,
200% text reflow, 44 px mobile targets, no console errors, reduced motion,
same-origin privacy, local audio isolation, offline reload, HTTP 404 behavior,
and rate policy. Axe found no serious or critical findings across `/`, `/demo`,
`/host`, `/join`, `/privacy`, `/terms`, `/404`, and a missing route in both
projects.

All 12 claim commands in `.factory/claims.json` passed from the clean install.
The rate regression observed exactly 40 successes and five `429` responses,
each with `Retry-After: 1`. The ephemeral-room regression proved scheduled TTL
eviction, restart loss, and closure of an open socket.

The production frontend is 23.16 kB raw / 7.85 kB gzip JavaScript and 15.54 kB
raw / 4.20 kB gzip CSS. A mobile Lighthouse run against the repaired live site
scored 100 performance, 100 accessibility, 100 best practices, and 100 SEO.
Measured LCP was 1.5 s, total blocking time 20 ms, and CLS 0.

## Container and deployment evidence

The repair was pushed to `main`. Azure Container Registry built the repository
source tarball without `.git` using the full repair SHA as `BUILD_SHA`:

- ACR run: `chsp` (succeeded in 2m22s)
- Image: `sociobotregistry.azurecr.io/sf-haptic-beat-relay:86801dec2072`
- Image digest: `sha256:14e64380f61b1c70dc674577ae19ccbb086605293210241d0bcc189761111ba3`
- Rust builder resolved from `rust:1-slim` to
  `sha256:17d1ba895198f9934c6314ec5346a0d5115372f3243390c3d731e242f35c2f27`
- Container App revision: `sf-haptic-beat-relay--0000005`
- Scale boundary: one minimum and one maximum replica

Live `https://haptic-beat-relay.sociobot.in/health` returned:

```json
{"build_sha":"86801dec20729d74390496e2580f4aea180dfe0f","status":"ok"}
```

Post-deploy checks passed on the custom domain:

- Desktop and 390 px route, keyboard, axe, privacy, and reduced-motion smoke.
- Service-worker update left no waiting worker; `/demo` then reloaded and stayed
  interactive offline.
- A desktop host and fresh 390 px companion joined one room, relayed a cue and
  tap, and displayed the same score.
- Unknown route returned 404. HTML returned `no-cache`; hashed JavaScript
  returned `public, max-age=31536000, immutable`.
- CSP, `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin` were present.
- A 45-request live burst returned 41 successes and four `429` responses while
  crossing the one-second window; all four included `Retry-After: 1`.
- A 100-request smoke with distinct forwarded client identities returned
  100 successes in 2,651 ms.

There is no separate package/consumer artifact for this `web-with-backend`
product. Accounts, payment, AI, and persistent user storage are not part of the
brief, so their specific checks are not applicable.

## Run and verify

```sh
npm ci
npm test
npm run build
cargo run --release
# open http://localhost:8080/demo
```

For a container smoke, build with `--build-arg BUILD_SHA=<sha>`, start with only
`PORT=8080`, and check `/health`. Docker was unavailable in the worker itself;
the successful ACR source build and live revision exercised that exact Dockerfile.

## Known gaps and next steps

No release-blocking gaps remain. Physical vibration depends on browser and
device support as stated in the brief; both the haptic attempt and visual cue
fallback are covered, while headless verification can observe only the fallback.
