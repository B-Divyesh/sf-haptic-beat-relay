# Haptic Beat Relay — send beat cues to a friend: review 4

## Verdict: FAIL

- **Implementation candidate reviewed:** `1964c68a15d95639acddeaf011e778d479bc4895`
- **Documentation checkout reviewed:** `66b87c34f85c161bfb9937896e791c84361c0682`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Live build:** `1964c68a15d95639acddeaf011e778d479bc4895`
- **Reviewed:** 2026-09-05 UTC
- **Findings:** 1 high-severity release-process finding
- **Untested public claims:** 0

The live product works, and its deployed image matches the last implementation
candidate. One of the 22 exact claim commands fails from the clean documentation
checkout. The claims contract makes that failure release-blocking even though an
explicit check of the deployed implementation passes.

## Job, audience, and first action

The job is to send beat cues to one friend's phone and score the taps returned
by that friend. The audience is friends and rhythm-game makers. Before scrolling,
fresh 1440 × 900 desktop and 390 × 844 phone browsers showed:

- **Job:** “Send beat cues to a friend's phone.”
- **Audience:** friends and rhythm-game makers who need vibration cues and a
  shared timing score without an account.
- **First action:** **Try it with sample data**, followed by “A paired sample
  round opens now.”

Both views also showed the three required facts: free to use, audio loops stay
on the host device, and the relay needs a connection.

## Finding

### F-4-1 — High — the exact deployment claim command fails after a report-only commit

- **Declared claim:** `singleton-deployment`
- **Exact command:** `npm run test:live-topology`
- **Clean checkout result:** exit 1.
- **Observed:** the checker expected image tag
  `66b87c34f85c161bfb9937896e791c84361c0682`, the documentation HEAD, but the
  active image correctly uses implementation
  `1964c68a15d95639acddeaf011e778d479bc4895`.
- **Live truth:**
  `RELAY_EXPECTED_SHA=1964c68a15d95639acddeaf011e778d479bc4895 npm run test:live-topology`
  passed. It found one active, running, ready HTTP replica, min/max one, the
  `/data` volume, the full implementation image tag, and the matching health
  identity.
- **Why this is a finding:** the manifest promises that its exact command
  proves the claim from a clean checkout. It instead treats a later report-only
  commit as an undeployed implementation. The work order says a report-only
  commit does not require a new product image.
- **Required resolution:** record the deployed implementation SHA as release
  metadata and make the exact manifest command use that value by default. Keep
  the explicit environment override for release checks. Do not deploy a report
  commit merely to make the test follow repository HEAD.

## Sample and real-room checks

- One click opened `/?demo=1` with the persistent **Demo — sample data,
  nothing is saved** label.
- The initial sample showed Sam's three returned taps, an 86% shared score, and
  the sample-round action in both first viewports.
- Starting the sample changed the round state. **Reset demo** restored the 86%
  score and three returned taps.
- The complete sample flow made no `/api/` request and created no local or
  session storage entry. It did not read or change real room data.
- A fresh desktop host and 390 px friend connected. The host selected 180 BPM,
  the friend pressed Space on the cue, and both views showed one returned tap
  and the same non-zero 86% score. No console or page error occurred.
- Invalid `A2` returned 400 `invalid_code`; unknown `ZZZZZZ` returned 404
  `room_not_found`; a second friend returned 409 `room_full`.

## Declared claims

After `npm ci`, every exact command in `.factory/claims.json` ran in manifest
order from the clean documentation checkout.

| Claim | Result |
| --- | --- |
| `demo-sandbox` | PASS |
| `sample-duration` | PASS |
| `sample-tempo` | PASS |
| `tempo-and-loop-controls` | PASS |
| `local-audio` | PASS |
| `no-third-party` | PASS |
| `no-account` | PASS |
| `free-use` | PASS |
| `copy-room-link` | PASS |
| `shared-score` | PASS |
| `live-relay` | PASS — 30 fresh API rooms and 30 reconnecting browser pairs |
| `ephemeral-rooms` | PASS |
| `rate-limit` | PASS — five clients each received 40 successes, then five 429 responses with `Retry-After: 1` |
| `health` | PASS |
| `connection-required` | PASS |
| `visual-cue` | PASS |
| `space-key-tap` | PASS |
| `haptic-output` | PASS |
| `real-round-duration` | PASS |
| `singleton-deployment` | **FAIL — exact command uses documentation HEAD; see F-4-1** |
| `database-path` | PASS |
| `public-records` | PASS |

The landing page, room views, privacy page, terms, footer, README, and copy
audit were cross-checked against the manifest. No public promise is unlisted or
untested. There is no obvious missed AI, import, export, or additional sync
step for this short-lived two-device relay.

## Quality, accessibility, privacy, and site structure

- `npm run build`: PASS. JavaScript is 26.10 KB raw / 8.76 KB gzip; CSS is
  17.67 KB raw / 4.62 KB gzip.
- The initial `npm test` at documentation base stopped at
  `test:handoff-contract` because the earlier handoff named the truthful
  implementation SHA instead of documentation HEAD. The required handoff
  update in this review now separates those roles without changing product
  code. A final complete `npm test` then passed: 4 Vitest tests, format, strict
  Clippy, 18 Rust tests, clean entry, and 42 Playwright tests with 8 intentional
  project skips.
- The full browser suite passed keyboard navigation, focus recovery, 200% text,
  44 px touch targets, reduced motion, offline service-worker reload, update
  state, file rejection, route history, and response-policy checks.
- Fresh live Axe scans covered `/`, `/demo`, `/host`, `/join`, `/privacy`,
  `/terms`, `/404`, and an unknown path. Every route had zero serious or
  critical violations, one h1, one main, `lang=en`, a useful title, and no
  horizontal overflow.
- `/404` and the unknown path returned deliberate HTTP 404 responses with the
  designed page and a route home. They are expected results, not defects.
- Every rendered same-origin link returned 200. `robots.txt` and `sitemap.xml`
  were present and listed the six public routes.
- The live URL verifier passed in 583 ms with no console error, complete image
  alt text, labeled buttons, a title, language, one h1, and a main landmark.
- Live requests used the product origin. No analytics, advertising request,
  third-party font, third-party script, account, or payment flow appeared.
  Security headers include the self-only CSP, response-header
  `frame-ancestors 'none'`, `nosniff`, and strict referrer policy.

## Backend and recovery checks

- `/health` returned the implementation SHA and `status: ok`.
- The explicit implementation topology check passed with revision
  `sf-haptic-beat-relay--r1964c68a15`, one active/running/ready replica, HTTP
  transport, and durable `sf-haptic-beat-relay-data` mounted at `/data`.
- `RELAY_EXPECTED_SHA=1964c68a15d95639acddeaf011e778d479bc4895 npm run test:live-persistence`
  passed. A room remained joinable after the scoped product restart, a new
  room write succeeded, and the build identity remained unchanged.
- The exact 30-round live relay and five-client rate-limit checks passed before
  the restart. Local tests also passed cross-process room access, shared rate
  buckets, expiry, corruption recovery, role validation, and delayed-score
  replay.

## Earlier findings disposition

| Earlier finding set | Current disposition |
| --- | --- |
| Reviews 1–3 deployment identity findings F-1-1, F-2-1, and F-3-1 | **Runtime fixed; exact-command handling regressed as F-4-1.** The deployed implementation, topology, relay, persistence, and allowance are correct. The manifest command still follows report HEAD. |
| Review 3 F-3-5 handoff gate | Fixed by this required handoff update. It now distinguishes the implementation and documentation roles without claiming that the report commit was deployed. |
| Reviews 1–3 first-screen, demo visibility, wording, navigation, and all minor copy findings | Fixed. Both fresh viewports show the complete first screen and seeded sample. The current copy audit has no banned word or sentence over 22 words. |
| Reviews 1–3 unlisted, incomplete, or weak claim findings | Fixed. All 22 current claims were exercised; none is untested. One exact test command fails for F-4-1, not because its live statement is false. |
| Verification 2 expiry, offline, touch-target, invalid-file, and designed-404 findings | Fixed by the passing Rust/browser suite and fresh live route checks. |
| Verification 3 Docker toolchain finding | Fixed. The release contract passed with `rust:1-slim`; no product code changed in this review. |
| Verifications 4–22 split replicas, stale topology, broken room joins, and unstable rate allowance | Fixed in the live runtime. The 30-round relay, exact five-client allowance, one-replica topology, and restart persistence passed. |
| Verifications 23–24 zero-score relay | Fixed. The fresh live pair and 30-round regression produced matching non-zero acknowledged scores. |
| Verification 27 timing nondeterminism and rustfmt | Fixed. The full 42-test browser run, timing claim, and format check passed. |
| Verification 28 cold browser startup | Fixed. The first browser claim prebuilt Rust in 58.42 seconds and passed before Playwright started. |
| Verification 29 PASS report | Partly superseded. Its live-product conclusions remain true, but it recorded the implementation and documentation SHA as the same. The checkout is actually documentation commit `66b87c3` over implementation `1964c68`, exposing F-4-1. |

## Final result

**FAIL.** There is one finding and zero untested claims. The live job works and
the deployed implementation is correct, but the exact `singleton-deployment`
claim command does not work from the clean documentation checkout.
