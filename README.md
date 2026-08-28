# Haptic Beat Relay

Haptic Beat Relay sends a host's beat to one companion device. The companion feels each cue, taps back, and builds a shared accuracy score. It is for friends, music practice, and small rhythm-game prototypes.

No account is needed, and the product is free to use. A loaded audio loop stays in the host browser. The server relays only temporary room and timing messages.

Live site: <https://haptic-beat-relay.sociobot.in>

## Try the sample

Open <http://localhost:8080/demo> after starting the app. The sample room is already paired and has two realistic past scores. Choose **Start sample round** to see returned taps and the shared score. Demo state stays in page memory and is discarded on reset.

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

This builds the frontend, runs TypeScript unit tests, runs Rust API tests, and runs Playwright in desktop and 390 px mobile views. Claim-specific commands are listed in [.factory/claims.json](.factory/claims.json).

## How it works

- `POST /api/rooms` opens an in-memory room and returns a six-character code.
- One companion joins through `POST /api/rooms/:code/join`.
- A WebSocket relays beat, tap, presence, and score messages.
- The host makes the audible click or plays a selected local loop.
- The companion uses phone vibration or a connected gamepad when supported.
- The screen cue remains available when haptics are unsupported.

Rooms expire after two hours and disappear on server restart. The service has no database, user accounts, music catalog, tracking script, or payment code.

## Container

```sh
docker build --build-arg BUILD_SHA=local -t haptic-beat-relay .
docker run --rm -p 8080:8080 haptic-beat-relay
curl http://localhost:8080/health
```

The multi-stage image runs as a non-root user. `/health` reports the build SHA. API routes use the first `X-Forwarded-For` address for a 40-request burst limit and return `429` with `Retry-After`.

## Deploy

The factory builds the root `Dockerfile` and supplies `BUILD_SHA`. The container serves the built frontend and relay backend together on `PORT`.

## Project records

- [.factory/design.md](.factory/design.md) — visual system and art provenance
- [.factory/demo.md](.factory/demo.md) — sample sandbox contract
- [.factory/claims.json](.factory/claims.json) — public claims and proof commands
- [.factory/handoff.md](.factory/handoff.md) — verification record

Licensed under the [MIT License](LICENSE).
