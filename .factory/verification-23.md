# Independent verification 23 — FAIL

- Candidate: `ddecd1bbdd5552f772a49badf88a0e7483d57a46`
- URL: https://haptic-beat-relay.sociobot.in
- Date: 2026-09-01 UTC

## Decision

**FAIL — release blocked.** Live health, static JS/CSS bytes, and the scoped
one-replica HTTP topology match the candidate. The required production relay
claim failed: `RELAY_ROUNDS=30 npm run test:live-relay` stopped at round 23
because the host score was `78%` and companion score was `0%`.

## Claim evidence

Claims manifest exists with 16 entries; after clean `npm ci` (59 packages,
zero vulnerabilities), each listed command ran before broader QA. Demo,
sample-duration, local-audio, no-third-party, no-account, free-use,
shared-score (locally), ephemeral-rooms, rate-limit, health,
connection-required, visual-cue, haptic-output, and real-round-duration
passed. The rate claim observed exactly 40 × 200 then 5 × 429 with
`Retry-After: 1` for each of five identities. Singleton deployment passed:
one active/ready HTTP replica, `/data`, full SHA image and matching health.
`live-relay` failed as stated above, which is release-blocking.

## Other QA

First read passed on desktop and 390 px: it says what the product does, names
friends/rhythm-game makers, and offers “Try it with sample data” plus its
outcome. `npm run build` and `npm test` passed (37 passed, 3 intentional
skips). Fresh assets are 24,403 B JS (8.22 kB gzip) and 17,506 B CSS (4.59 kB
gzip). Axe scans across normal/legal/error routes at desktop and mobile found
zero serious/critical findings; each had lang, one h1/main, and no overflow.
The live demo made only same-origin requests, no API calls or browser storage,
had no normal-flow errors, and reloaded offline under its active service worker.

## Retest

Correct live host-to-companion score delivery, then rerun all claims. Require
all 30 fresh desktop-host/390 px companion rounds to have matching scores.
