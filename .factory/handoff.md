# Haptic Beat Relay — repair 24 handoff

## Outcome

The two release blockers in independent verification 27 are repaired. The
existing host, friend, demo, privacy, offline, and deployment behavior remains
in place.

## Repairs

- Replaced interval-relative beat timers with a deadline-anchored beat clock.
  Both real and sample rounds now calculate each cue from the round start, so a
  delayed task does not move every later cue.
- Added a unit regression for the verifier's 126.67 ms stall. It proves the
  next cue returns to the original 180 BPM deadline.
- Strengthened the paired browser claim from two visual-animation samples to
  four direct vibration intervals. Every interval still has to stay within the
  existing 110 ms bound. The check passed 20 consecutive runs with two workers.
- Applied `cargo fmt --all` to the three reported Rust regions.
- Added Rust format and strict Clippy checks to `npm test`. A formatting or lint
  regression now fails the required product gate.
- The first guarded rollout reproduced an Azure Files restart edge: the room
  row survived, but its optional expiry-index page did not. The next room write
  failed with SQLite extended code 779. Migration 0003 removes both optional
  expiry indexes; the small, short-lived tables remain efficient to scan.
- Extended the live persistence gate. It now joins the pre-restart room and
  creates a fresh room after restart, covering both durable reads and writes.
- Added a narrow startup recovery for an already-corrupt `/data` database. It
  first removes only the known optional indexes. If SQLite still reports a
  malformed file, it recreates the product's already-unusable two-hour room,
  rate-limit, and round-state store. A regression starts from corrupt bytes and
  proves a new room can then be created.

## Local evidence

- Clean dependency install: `npm ci` installed 59 packages with no reported
  vulnerability.
- Required gate: `npm test` passed 4 Vitest tests, Rust format, strict Clippy,
  release/deployment/handoff contracts, 18 Rust tests, the clean browser entry
  check, and 42 Playwright tests with 8 intended project skips.
- Timing stress: the exact 180 BPM browser claim passed 20 of 20 runs with two
  workers. It measured five haptic cues and enforced less than 110 ms error on
  all four intervals.
- Production build: `npm run build` passed TypeScript and Vite. The entry is
  26,101 bytes raw and 8.76 KB gzip; CSS is 17,673 bytes raw and 4.62 KB gzip.
- Backend: `cargo build --release --locked`, format, and strict Clippy passed.
  A release binary started with only `PATH` and `PORT=18080`; `/health` returned
  build identity `dev`.
- Load smoke: 100 concurrent room creations from 100 client identities all
  returned 200 in 1,140 ms.
- Browser baseline: desktop and 390 px mobile routes, keyboard recovery, 200%
  text, 44 px targets, reduced motion, route titles, offline reload, response
  headers, and serious/critical axe checks passed in the Playwright suite.
- Privacy: the sample flow made no room API request or browser-storage entry;
  the local-audio marker was never sent; observed product requests stayed on
  the product origin.
- URL verifier: 576 ms local load, no console errors, one `h1`, one `main`,
  `lang=en`, complete image alt text, and labeled buttons. Screenshots and the
  JSON report are under `.factory/evidence/repair-24/local/`.

## Release verification

The guarded deployment command below builds the final full-SHA image, keeps
one HTTP replica, mounts the existing product data share at `/data`, and runs
the 30-round relay, repeated rate-limit, persistence, topology, and stability
checks. The final live results will be recorded here after that rollout.

```sh
npm run deploy -- "$(git rev-parse HEAD)"
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
```

The final acceptance pass also runs every exact command in
`.factory/claims.json` from a fresh clone, the fleet URL verifier, and mobile
Lighthouse against <https://haptic-beat-relay.sociobot.in>.

## Known limits

Phone and controller vibration still depend on browser and device support. The
friend view keeps its visual cue when haptics are unavailable. No new resource,
secret, account, analytics, payment, or AI dependency was added.
