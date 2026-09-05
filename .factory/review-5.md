# Send beat cues to a friend's phone — review 5

## Verdict: FAIL

- **Implementation reviewed:** `1964c68a15d95639acddeaf011e778d479bc4895`
- **Documentation checkout:** `ae67bc7a5a260283b1f8e070cbbbaf6c49419b16`
- **Clean verification checkout:** `ae67bc7a5a260283b1f8e070cbbbaf6c49419b16`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Reviewed:** 2026-09-05 UTC
- **Findings:** 1
- **Untested public claims:** 0

The live health response, immutable image, active revision, and post-restart
topology identify implementation `1964c68…`. The later checkout is
documentation-only.

## Job, audience, and first action

Before scrolling, fresh 1440 × 900 desktop and 390 × 844 phone sessions show:

- **Job:** Send beat cues to a friend's phone.
- **Audience:** Friends and rhythm-game makers who need phone vibration cues
  and a shared timing score without an account.
- **First action:** **Try it with sample data**. It says a paired sample round
  opens now.

Both screens visibly include free use, local audio loops, and the connection
requirement. Screenshots are in `.factory/evidence/review-5/`.

## Finding

### F-5-1 — A copied friend link does not deliver the claimed first phone vibration

- **Severity:** P1
- **Where:** live `/join/<room-code>` friend page; `haptic-output` claim on the
  landing page, Terms, and README.
- **Evidence:** I opened a fresh phone-sized Chromium context directly at a
  newly created host's join URL, without any interaction in the friend frame.
  The host started the round. Chromium reported: `Blocked call to
  navigator.vibrate because user hasn't tapped on the frame or any embedded
  frame yet`. The source calls `navigator.vibrate(45)` at cue time and does
  not request a user gesture, check the false result, or tell the friend what
  to do. The host did receive the returned Space tap and both pages agreed on
  its score, so this is specifically the tactile-output failure.
- **Why this matters:** The product says each friend cue uses phone vibration
  when the browser supports it. Chromium supports the Vibration API but
  requires user activation. A friend who arrives through the documented Copy
  room link has no activation before the first cue, so the primary tactile
  cue is silently absent. The visual flash is a useful fallback, but it does
  not make the haptic statement true.
- **Required repair:** Require and explain one explicit friend-side “Enable
  vibration” tap before the host can start, or accurately narrow the public
  claim and add a visual recovery state. The claim test must use the real
  browser policy rather than a stub that always accepts `vibrate`.

## Sample, normal, invalid, and recovery paths

The one-click sample opened a realistic populated round for Sam: 104 BPM,
86% shared accuracy, and three returned taps. Its persistent **Demo — sample
data, nothing is saved** label remained visible. Reset restored the same
seeded result. The sample made no API request and wrote no local or session
storage, so it did not change a real room.

A fresh live host and 390 px friend created and joined a room, started a
round, returned a Space tap, and displayed the same score. Invalid code,
unknown-room, second-friend, offline, and visual-cue recovery paths are
covered by the clean browser commands below. The manual copied-link path is
the one exception: its first automatic vibration was blocked as F-5-1.

## Declared claims and quality gates

I ran `npm ci` in a separate clean clone at `ae67bc7…`, then ran each command
from `.factory/claims.json` exactly as declared. All 22 commands exited zero.
The `haptic-output` command is listed as command-pass only; its stubbed API
does not disprove F-5-1.

| Claims / command | Command result |
| --- | --- |
| `demo-sandbox`, `sample-duration` | PASS |
| `sample-tempo` | PASS |
| `tempo-and-loop-controls` | PASS |
| `local-audio`, `no-third-party` | PASS |
| `no-account`, `free-use` | PASS |
| `copy-room-link` | PASS |
| `shared-score`, `visual-cue` | PASS |
| `live-relay` | PASS — declared 30/30 API and reconnecting desktop/phone rounds |
| `ephemeral-rooms` | PASS |
| `rate-limit` | PASS — five identities, 40 accepts then five `429` with `Retry-After: 1` |
| `health` | PASS |
| `connection-required` | PASS |
| `space-key-tap` | PASS |
| `haptic-output` | PASS command, insufficient real-browser proof; see F-5-1 |
| `real-round-duration` | PASS — measured 60-second round |
| `singleton-deployment` | PASS — one ready HTTP replica, `/data`, full SHA image |
| `database-path` | PASS |
| `public-records` | PASS |

`npm test` and `npm run build` passed in the clean checkout. The build output
is 26.10 KB JavaScript and 17.67 KB CSS before compression. The suite covers
keyboard error recovery, skip-link focus, reduced motion, 200% text, offline
reload, legal routes, titles, headers, service worker behavior, and serious/
critical Axe issues. Fresh live `/health` returned `1964c68…`; deliberate
`/404` and unknown paths returned designed HTTP 404 responses.

`npm run test:live-persistence` restarted only this product and reported a
successful restart. The following topology check again found one active,
running, and ready `1964c68…` replica with durable `/data` SQLite storage.

## Earlier findings disposition

I reviewed every earlier review and verification report. Their previous
findings are currently resolved except where superseded by F-5-1:

| Earlier finding groups | Current proof |
| --- | --- |
| Review 1 F-1-1–F-1-41; review 2 F-2-1–F-2-25; review 3 F-3-1–F-3-8; review 4 F-4-1 | Clean suite/build, first-screen desktop and phone checks, copy audit, exact claim commands, and matching live identity passed. |
| Verifications 2–27: expiry, offline, 404, touch targets, Docker, replica split, joins, rate allowance, score acknowledgement, browser startup, and formatting | Local regression coverage passed; live topology shows one ready replica with `/data`; live 30-round relay and exact allowance checks passed. |
| Verifications 28–30: cold clean start, release identity, restart persistence, links, privacy, accessibility, and performance | Clean `npm ci` suite/build passed; post-restart health/topology match `1964c68…`; the fresh demo and live route checks above passed. |

The earlier haptic claim was not previously exercised under the real
user-activation policy. Its stubbed command passes, but the copied-link live
check makes its current public promise inaccurate.

## Final result

**FAIL.** There is one P1 finding and zero untested claim commands. Do not
declare the product PASS until F-5-1 is repaired and verified in a real
browser path without prior friend interaction.
