# Haptic Beat Relay — send beat cues to a friend: verification 29

**Verdict: PASS**

- **Implementation candidate reviewed:** `1964c68a15d95639acddeaf011e778d479bc4895`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Implementation and release-documentation SHA:** `1964c68a15d95639acddeaf011e778d479bc4895`
- **Verified:** 2026-09-05
- **Findings:** 0 (all severities)
- **Untested public claims:** 0

This report is review documentation created after the implementation candidate.
It does not change the reviewed product image.

## Job, audience, and first action

The job is to send a beat cue to one friend's phone and receive a tap back for
a shared timing score. It is for friends and rhythm-game makers. Before
scrolling, fresh 1440 × 900 desktop and 390 × 844 phone browsers both showed
the headline “Send beat cues to a friend's phone,” the audience sentence, and
the first action **Try it with sample data** with “A paired sample round opens
now.” The three facts were also visible: free to use, audio loops stay on the
host device, and the relay needs a connection.

Both fresh loads returned HTTP 200 with no console or page errors. Evidence:
`.factory/evidence/verification-29/live-desktop-first-screen.png` and
`.factory/evidence/verification-29/live-phone-first-screen.png`.

## Sample sandbox and main job

- Opening `/?demo=1` showed the persistent **Demo — sample data, nothing is
  saved** label, Sam's three returned taps, and the seeded previous score.
- Starting the sample changed its state to “Listen for the pulse. Sam is
  tapping it back.” Reset restored the seeded state.
- The sample made zero `/api/` requests and created no local or session
  storage entries. It therefore did not read or write real room data.
- A fresh desktop host created room `HGVSN4`; a fresh 390 px friend joined,
  received the round, pressed Space on the tap pad, and both views showed the
  same non-zero 60% score and one returned tap. There were no browser errors.
- Invalid `A2` returned 400 `invalid_code`; unknown `ZZZZZZ` returned 404
  `room_not_found`; a second companion returned 409 `room_full`. These are
  clear recovery responses, not defects.

## Declared claims

From a disposable clone at the candidate with no `node_modules`, frontend
build, or Rust target cache, I ran `npm ci` and then every exact command in
`.factory/claims.json` in manifest order. The cold first browser command built
the locked Rust backend before Playwright's server timer and passed. A second
logged manifest pass recorded exit code 0 for every entry.

| Claim | Result |
| --- | --- |
| demo-sandbox | PASS |
| sample-duration | PASS |
| sample-tempo | PASS |
| tempo-and-loop-controls | PASS |
| local-audio | PASS |
| no-third-party | PASS |
| no-account | PASS |
| free-use | PASS |
| copy-room-link | PASS |
| shared-score | PASS |
| live-relay | PASS — 30/30 fresh API and reconnecting desktop-host/390 px friend rounds |
| ephemeral-rooms | PASS |
| rate-limit | PASS — five identities, exactly 40 accepts then five 429 responses with `Retry-After: 1` |
| health | PASS |
| connection-required | PASS |
| visual-cue | PASS |
| space-key-tap | PASS |
| haptic-output | PASS |
| real-round-duration | PASS |
| singleton-deployment | PASS |
| database-path | PASS |
| public-records | PASS |

The logged command summary is retained for this verifier run at
`/tmp/hbr-verification-29-claims-summary.json`. I cross-checked the landing
page, room views, privacy page, terms, and README against the manifest. There
are no remaining unlisted public claims.

## Build and product checks

- `npm test`: PASS. Unit tests, Rust format and strict Clippy, release,
  deployment, handoff, Rust, clean-entrypoint, and Playwright gates completed;
  the final Playwright result is `passed` with no failed tests.
- `npm run build`: PASS. Vite output is 26.10 KB JavaScript raw / 8.76 KB gzip
  and 17.67 KB CSS raw / 4.62 KB gzip.
- `git diff --check`: PASS in the clean candidate checkout.
- `verify-url.sh`: PASS in 607 ms with title, `lang=en`, one h1, one main,
  complete image alt text, labeled controls, and no console errors. Evidence:
  `.factory/evidence/verification-29/verify-url/verify.json`.
- Independent live Playwright + Axe scans covered `/`, `/demo`, `/host`,
  `/join`, `/privacy`, `/terms`, `/404`, and an unknown path at desktop and
  390 px. Every page had one h1 and main, its route title, no overflow, and
  zero serious or critical Axe findings. The deliberate HTTP 404 has a styled
  route home; its failed-resource browser message was classified as expected.
- Keyboard, focus, Space-to-tap, invalid-form announcement, 44 px touch
  targets, 200% text, reduced motion, offline reload, and service-worker
  behavior are covered by the passing browser suite and claim commands.
- The live privacy request capture found only the product origin. No account,
  payment, analytics, third-party runtime request, or external font/script was
  observed. CSP, `nosniff`, and strict referrer-policy headers are present.

## Backend and deployment checks

- `/health` returned `{"build_sha":"1964c68a15d95639acddeaf011e778d479bc4895","status":"ok"}`.
- The live topology check found one active revision
  `sf-haptic-beat-relay--r1964c68a15`, min/max/running/ready replicas all one,
  HTTP transport, durable `/data` volume `sf-haptic-beat-relay-data`, and the
  full-SHA product image.
- `npm run test:live-persistence` passed. After a scoped restart, room
  `VQMWA5` joined from durable SQLite and a new room write passed. The ready
  replica changed from `…-5xr7t` to `…-f4x42` and retained the reviewed build
  identity.
- Tenant boundary behavior was checked with fresh room codes: one companion
  was admitted, a second was refused, and unknown/malformed codes did not gain
  access. The live rate-limit claim proved the advertised 429 recovery header.

## Earlier findings disposition

| Earlier finding set | Current disposition and proof |
| --- | --- |
| Review 1 F-1-1; review 2 F-2-1; review 3 F-3-1; verifications 4–18 and 20–22 (split replicas, stale topology, broken relay, or unstable allowance) | Fixed. Current topology is one HTTP ready replica with `/data`; the 30/30 reconnect relay and five exact rate bursts passed. |
| Review 1 F-1-2 to F-1-24; review 2 F-2-2 to F-2-13; review 3 F-3-2, F-3-3, F-3-8 (first read, plain wording, visible facts, navigation) | Fixed. Fresh desktop and phone first screens passed; the checked-in copy audit reports no sentence over 22 words or banned words and consistent terms. |
| Review 1 F-1-25 to F-1-41; review 2 F-2-5 to F-2-25; review 3 F-3-4, F-3-6, F-3-7 (unlisted, incomplete, or weakly proved claims) | Fixed. All 22 current public claims have exact passing manifest commands; page and README copy had no remaining unlisted claim. |
| Verification 2 (expiry, offline reload, touch targets, designed 404, invalid local file) | Fixed. Relevant claim/browser coverage passed; this review confirmed the real 404, recovery responses, and live sample isolation. |
| Verifications 23–24 (zero-score relay) | Fixed. The 30/30 delayed-score/reconnect check passed and the independent live round showed a matching non-zero 60% score. |
| Verification 27 (nondeterministic full suite and rustfmt) | Fixed. The full suite completed with final Playwright status `passed`; `cargo fmt --all -- --check` and strict Clippy passed inside `npm test`. |
| Verification 28 (cold-cache Playwright startup) | Fixed. A fresh empty-target clone passed its first browser claim, and the clean-entrypoint regression passed in the full suite. |

## Final result

**PASS.** There are zero findings and zero untested claims. The live service
matches the reviewed implementation candidate.
