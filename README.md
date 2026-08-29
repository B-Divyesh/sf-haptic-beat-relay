# Haptic Beat Relay

Haptic Beat Relay sends a host's beat to one companion device. The companion feels each cue, taps back, and builds a shared accuracy score. It is for friends, music practice, and small rhythm-game prototypes.

No account is needed, and the product is free to use. A loaded audio loop stays in the host browser. The server relays only temporary room and timing messages.

Live site: <https://haptic-beat-relay.sociobot.in>

## Try the sample

Open <http://localhost:8080/demo> after starting the app. The sample room is already paired and has two realistic past scores. Choose **Start sample round** to see returned taps and the shared score over 12 seconds. Demo state stays in page memory and is discarded on reset.

## Run locally

Requirements: Node.js 22 or newer and stable Rust.

```sh
npm install
npm run build
cargo run
```

Open <http://localhost:8080>. The server uses `PORT=8080` by default and needs no other environment variables.

For frontend work with live reload, run the backend and `npm run dev` in separate terminals. Vite proxies room requests to port 8080.

## Test

```sh
npm test
```

This runs TypeScript unit tests, the production container contract check, Rust API tests, the clean-entry-point regression, and Playwright in desktop and 390 px mobile views. The browser-test entry point builds the production frontend, so every claim-specific command in [.factory/claims.json](.factory/claims.json) works after a clean `npm ci` without a separate build step.

To run the verifier regression by itself:

```sh
npm run test:clean-entrypoint
```

It removes only the generated `frontend/dist` directory, runs the exact previously failing claim command, and checks that the browser entry point rebuilt the app.

## How it works

- `POST /api/rooms` opens an in-memory room and returns a six-character code.
- One companion joins through `POST /api/rooms/:code/join`.
- A WebSocket relays beat, tap, presence, and score messages.
- The host makes the audible click or plays a selected local loop.
- The companion uses phone vibration or a connected gamepad when supported.
- The screen flashes each cue when vibration is unavailable.

Rooms expire after two hours and disappear on server restart. The relay intentionally runs as exactly one Container App replica because its temporary room and WebSocket state are held in that process. The checked-in deployment contract pins both the minimum and maximum to one; it must not be scaled out without moving room state and broadcast delivery to a shared service. The service has no database, user accounts, music catalog, tracking script, or payment code.

## Container

```sh
docker build --build-arg BUILD_SHA=local -t haptic-beat-relay .
docker run --rm -p 8080:8080 haptic-beat-relay
curl http://localhost:8080/health
```

The multi-stage image runs as a non-root user. `/health` reports the build SHA. API routes use the first `X-Forwarded-For` address for a 40-request burst limit and return `429` with `Retry-After`.

## Deploy

The factory builds the root `Dockerfile` and supplies `BUILD_SHA`. The container serves the built frontend and relay backend together on `PORT`. [`deploy/containerapp.json`](deploy/containerapp.json) is the source-of-truth scale contract: active revisions are single and both `minReplicas` and `maxReplicas` are `1`. Deploy a revision with `scripts/deploy-containerapp.sh <full-git-sha>`; it builds in ACR and reapplies that scale constraint.

## Project records

- [.factory/design.md](.factory/design.md) — visual system and art provenance
- [.factory/demo.md](.factory/demo.md) — sample sandbox contract
- [.factory/claims.json](.factory/claims.json) — public claims and proof commands
- [.factory/handoff.md](.factory/handoff.md) — verification record

Licensed under the [MIT License](LICENSE).
