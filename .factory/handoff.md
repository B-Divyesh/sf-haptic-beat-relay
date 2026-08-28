# Haptic Beat Relay — repair handoff

## Decision

**PASS locally.** This repair addresses every release blocker in the independent
report for candidate `a3a8726ab0302a00b0af43f3847911ede44e7dc8` while preserving
the two-device host/companion relay and the existing demo.

## Repairs

1. **Hard two-hour privacy boundary:** rooms now receive an absolute expiry when
   they are created. A scheduled task removes the room at that deadline and
   announces expiry; socket sessions also wait on the same deadline and send a
   close frame. Expired socket upgrades are rejected. The regression uses a
   short injected TTL to prove idle eviction, restart loss, and closure of an
   already-open WebSocket. Production keeps the exact 7,200-second limit.
2. **Complete claims proof:** the ephemeral-room claim now runs the controlling
   Rust regression instead of trusting an advertised field. The demo proof now
   asserts no API request or browser storage, and the rate-limit proof asserts
   exactly 40 successes followed by five `429` responses with `Retry-After: 1`.
   Added listed/proved claims for the 12-second sample round and the visual cue
   fallback when vibration is unavailable.
3. **Offline shell:** Vite now emits a versioned worker precache containing the
   hashed JS and CSS entry files, manifest, and responsive art. Offline asset
   misses return an asset error rather than HTML. The document links the web
   manifest. The browser regression clears the HTTP cache after worker control,
   reloads `/demo` offline, and asserts the interactive sample remains rendered.
4. **Mobile interaction targets:** header, demo-banner, footer, and legal links
   have 44 by 44 CSS-pixel targets. The 390px browser regression measures every
   visible interactive control on each routed screen.
5. **HTTP 404:** the client still renders the designed recovery page, but unknown
   frontend URLs (including `/404`) now return status 404. A browser and Rust
   regression cover this boundary.
6. **File validation:** non-audio file selections now say they were not loaded;
   they do not receive the false “ready” confirmation.

## Verification evidence

Run from a clean dependency install on 2026-08-28:

```sh
npm ci
# 59 packages; 0 vulnerabilities

# every command declared in .factory/claims.json, independently
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {execSync} from 'node:child_process'; for (const c of JSON.parse(readFileSync('.factory/claims.json', 'utf8'))) execSync(c.test, {stdio:'inherit'});"

npm test
# 3 Vitest + 5 Rust tests + clean-entry regression (2 browser projects)
# + 27 passed Playwright checks and 1 intentional desktop-only skip

cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
npm run build
git diff --check
```

All commands passed. The browser suite covers desktop Chromium and the 390px
mobile project, keyboard skip/navigation/error recovery, axe serious/critical
findings across product routes, reduced-motion behavior, no horizontal overflow,
privacy request capture, local audio, offline worker reload, update cache
replacement, API rate policy, visual fallback, and the real host/companion flow.

Final production bundle: JS 23.16 kB raw / 7.85 kB gzip; CSS 15.54 kB raw /
4.20 kB gzip. The production Rust binary built successfully.

## Run and deploy

```sh
npm ci
npm run build
cargo run --release
# visit http://localhost:8080/demo
```

The root Dockerfile remains the deployment artifact: multi-stage, non-root,
and serves the frontend and Axum service on `PORT=8080`. The repair commit
`ffe1cd25ff6f88ab9d3e6bb6c3097a07108a263c` was pushed to `main`, built in Azure
Container Registry as `sociobotregistry.azurecr.io/sf-haptic-beat-relay:ffe1cd25ff6f`
(ACR run `chj1`, succeeded), and deployed to Container App revision
`sf-haptic-beat-relay--0000002`. Live `https://haptic-beat-relay.sociobot.in/health`
returned that full build SHA. Live `/demo` returned the manifest link and security
headers; an unknown URL returned HTTP 404. Docker is not installed in this worker,
so the equivalent local image smoke was not available.

## Known gaps

- No Docker-compatible runtime is available in this worker for a local image
  smoke test; the remote ACR Docker build and live health check passed.
- No standalone Lighthouse executable is installed; the browser suite verifies
  the relevant accessibility, mobile, offline, and bundle-size gates.
