# Haptic Beat Relay

Haptic Beat Relay sends beat cues to one friend's phone. Your friend feels
each cue, taps back, and builds a shared accuracy score.

It is for friends, music practice, and small rhythm-game prototypes. No account
is needed. It is free to use. Audio loops stay in the host browser.

Live site: <https://haptic-beat-relay.sociobot.in>

## Try the sample

Open <http://localhost:8080/?demo=1> after starting the app. The paired sample
shows Sam's returned taps and shared score immediately. It sends cues at 104
BPM. Start the 12-second sample round, reset it, or create a real room.

## Run locally

```sh
npm ci
npm run build
cargo run
```

Open <http://localhost:8080>. For frontend work, run `npm run dev` in another
terminal. Set `RELAY_DATABASE_PATH` to choose a different local database path.
Otherwise, the relay uses `/data` or its executable directory.

## Test

```sh
npm test
```

Run every public claim from the manifest after a clean install:

```sh
node -e "for (const c of require('./.factory/claims.json')) console.log(c.test)"
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
- Both devices reconnect and recover the shared score.
- The friend receives phone and controller vibration when supported.
- The screen flashes each cue when vibration is unavailable.

Room records expire after two hours.

## Container

```sh
docker build --build-arg BUILD_SHA=local -t haptic-beat-relay .
docker run --rm -p 8080:8080 haptic-beat-relay
curl http://localhost:8080/health
```

## Deploy

Finish the handoff, commit it, push it, then run:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
```

## Project records

- [.factory/design.md](.factory/design.md) — visual system and art provenance
- [.factory/demo.md](.factory/demo.md) — sample sandbox contract
- [.factory/claims.json](.factory/claims.json) — public claims and proof commands
- [.factory/handoff.md](.factory/handoff.md) — verification record

Licensed under the [MIT License](LICENSE).
