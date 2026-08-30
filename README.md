# Haptic Beat Relay

Haptic Beat Relay sends a host's beat to one friend's device. Your friend feels
each cue, taps back, and builds a shared accuracy score.

It is for friends, music practice, and small rhythm-game prototypes. No account
is needed. It is free to use. Audio loops stay in the host browser. The server
relays temporary room and timing messages.

Live site: <https://haptic-beat-relay.sociobot.in>

## Try the sample

Open <http://localhost:8080/?demo=1> after starting the app. The paired sample
shows Sam's returned taps and shared score immediately. Start the 12-second
sample round, reset it, or create a real room. Sample state stays in page
memory and is discarded on reset.

## Run locally

```sh
npm ci
npm run build
cargo run
```

Open <http://localhost:8080>. For frontend work, run `npm run dev` while the
backend runs in another terminal.

The container stores SQLite at `/data/haptic-beat-relay.sqlite3`. A local run
uses `/data` when present, then falls back beside the executable. Set
`RELAY_DATABASE_PATH` only when a different local test path is needed.

## Test

```sh
npm test
```

Run every public claim from the manifest after a clean install:

```sh
node -e "for (const c of require('./.factory/claims.json')) console.log(c.test)"
```

The real connected-round check takes about one minute:

```sh
npm run test:browser -- --grep @claim:real-round-duration
```

Check the live service with:

```sh
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
npm run test:live-topology
```

## How it works

- The host opens a room and gets a six-character code.
- One friend joins with that code.
- A WebSocket relays beat, tap, presence, and score messages.
- The friend receives phone and controller vibration when supported.
- The screen flashes each cue when vibration is unavailable.

Rooms expire after two hours. SQLite stores temporary room and rate-limit
records under `/data`, so active rooms survive a restart. The live relay uses
one Container App replica because WebSocket delivery is process-local.

## Container

```sh
docker build --build-arg BUILD_SHA=local -t haptic-beat-relay .
docker run --rm -p 8080:8080 haptic-beat-relay
curl http://localhost:8080/health
```

## Deploy

Finish the handoff, commit it, push it, then run:

```sh
npm run deploy -- <full-git-sha>
```

This command is required for this product. It reads
`deploy/containerapp.json`, mounts durable storage at `/data`, pins HTTP
ingress and one ready replica, and checks the live room relay before it
returns. Do not use a generic rollout. Its Auto ingress and 1–3 replica
defaults split live WebSocket delivery.

## Project records

- [.factory/design.md](.factory/design.md) — visual system and art provenance
- [.factory/demo.md](.factory/demo.md) — sample sandbox contract
- [.factory/claims.json](.factory/claims.json) — public claims and proof commands
- [.factory/handoff.md](.factory/handoff.md) — verification record

Licensed under the [MIT License](LICENSE).
