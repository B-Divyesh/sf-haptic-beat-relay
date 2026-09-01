# Independent verification 24 — FAIL

- Candidate: `8eec1833f86191e135615007cde6ef6eb5e64097`
- URL: https://haptic-beat-relay.sociobot.in
- Date: 2026-09-01 UTC

## Decision

**FAIL — release blocked.** The live deployment identity matches the candidate,
but the required multi-device relay reliability claim does not pass. The
required 30-round production check stopped in round 2 because the host's
acknowledged score was `0%` after a returned tap and the required reconnect
sequence. The local full suite also failed its corresponding 30-round
delayed-score/reconnect regression with the host showing one returned tap and
`0%`.

## Required claim checks

`npm ci` completed from this checkout (59 packages; audit reported zero
vulnerabilities). The claims manifest exists with 16 entries. Every command
listed in it ran before broader QA.

| Claim check | Result | Evidence |
| --- | --- | --- |
| Demo sandbox, sample duration | PASS | Exact browser commands passed for desktop and 390 px mobile. The 12-second sample starts, completes, resets, makes no API request, and leaves local/session storage empty. |
| Local audio, no third-party runtime requests | PASS | Exact browser commands passed. The marked audio fixture did not appear in a request body; observed requests were same-origin. |
| No account, free use | PASS | Exact browser commands passed; a host room opens without sign-in or a payment step. |
| Shared score, visual cue, haptic output | PASS locally | Exact browser commands passed with the supplied phone/controller API stubs and paired browser contexts. |
| Ephemeral rooms | PASS | `cargo test claim_ephemeral_rooms_persist_across_restart_until_the_configured_ttl` passed. |
| Rate limit | PASS | `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` observed, for each of five forwarded client identities, exactly 40 successful room requests then 5 responses with status 429 and `Retry-After: 1`. |
| Health | PASS | Exact browser command passed; live `/health` returns status `ok` and `build_sha` `8eec1833f86191e135615007cde6ef6eb5e64097`. |
| Connection-required, real 60-second duration | PASS locally | Exact browser commands passed. |
| Live relay | **FAIL** | `RELAY_ROUNDS=30 npm run test:live-relay` failed: `round 2: acknowledged score must be non-zero`, actual `0%`. |
| Singleton deployment | PASS | `npm run test:live-topology` reported one active ready HTTP replica, min/max 1, `/data` mounted from `sf-haptic-beat-relay-data`, full-SHA image, and matching health identity. |

The failed live-relay claim is release-blocking under the claims contract.

## Independent product QA

- First read: **PASS.** A cold live visit states that it sends beat cues to a
  friend, names friends and rhythm-game makers, and presents **Try it with
  sample data** with the immediate outcome. The sample action is one click.
- Normal connected flow: at 60 BPM a fresh desktop host and 390 px friend
  joined one room, returned one tap, and displayed the same 45% score. The
  same check at the 180 BPM control boundary returned a tap but 0%; this is
  supplementary evidence only, not the release decision.
- Invalid recovery: entering `A2` shows “The code needs six letters and
  numbers. Check it and try again.” and keeps focus in the code field.
- `npm test`: **FAIL.** Unit tests, Rust tests, contracts, clean-entrypoint,
  and most browser checks ran; the local 30-round delayed-score/reconnect
  regression failed with one returned tap and a 0% host score.
- `npm run build`: **PASS.** Type checking and Vite production build passed.
  Built JavaScript is 25,629 bytes raw / 8,658 bytes gzip; CSS is 17,506 bytes
  raw / 4,603 bytes gzip, within the applicable initial bundle budgets.
- `cargo build --release --locked`, `cargo fmt --all -- --check`, and
  `cargo clippy --locked --all-targets -- -D warnings`: **PASS.** Docker is
  not installed in this verifier environment, so the Docker command itself
  could not be run.
- Accessibility and interaction: independent Playwright Axe scans of `/`,
  `/demo`, `/join`, `/privacy`, `/terms`, and `/404` found no serious or
  critical findings. Keyboard skip navigation has a 3 px visible outline;
  keyboard routing and error recovery pass. Targeted local checks passed for
  200% text, 44 px mobile controls, one h1/main per route, and no 390 px
  overflow.
- Motion/PWA: reduced-motion media is active with animation and transition
  duration reduced to `0.01ms`. The active live service worker is `/sw.js`;
  its update check completed without a waiting worker. The product's local
  service-worker offline reload test passed for desktop and mobile.
- Privacy/network: outgoing requests across the live landing/demo and paired
  flow were only to `https://haptic-beat-relay.sociobot.in`; no third-party
  runtime origin was observed. Normal routes showed no console or page errors.
  Visiting the intentional HTTP 404 route produces the browser's expected
  failed-resource console line for that 404 response.
- Response/caching: HTML returned CSP with `frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, and `Cache-Control: no-cache`. The hashed
  JavaScript asset returned `Cache-Control: public, max-age=31536000,
  immutable`.
- Link check: all same-origin links exposed on the landing page returned 200.

## Defects by severity

### Critical

1. **Reconnect score acknowledgement can remain at 0%.**
   Reproduction: run `RELAY_ROUNDS=30 npm run test:live-relay` against the
   stated URL. The check failed on round 2 after forced host and friend
   reconnects plus delayed score delivery. The local regression in `npm test`
   fails with the same observable state: one returned tap and 0% accuracy.
   Impact: the principal host/friend round does not reliably show the promised
   shared accuracy result. Repair the score/reconnect state handling, then
   require all 30 production rounds and the complete suite to pass.

## Scope note

The live persistence script restarts the Container App revision. This work
order prohibits restarting the service, so I did not run that script. The
SQLite expiry/restart behaviour was covered by the local claim test, and the
live topology check confirmed the `/data` mount and singleton replica.

## Retest

After the critical relay result is corrected, rerun every command in
`.factory/claims.json`, `npm test`, `npm run build`, the release build checks,
and the live accessibility/privacy/mobile checks. Acceptance requires
`RELAY_ROUNDS=30 npm run test:live-relay` to complete all 30 matched,
non-zero acknowledged-score rounds.
