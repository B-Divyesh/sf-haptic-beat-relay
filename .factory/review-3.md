# Adversarial first-read review 3

- Product: Haptic Beat Relay
- Live URL: <https://haptic-beat-relay.sociobot.in>
- Reviewed: 2026-09-02 UTC
- Repository base: `113a0ffd62f0045b999be185039e254814bceb88`
- Live build reported by `/health`: `9ff530a030b8d4cc20dbd22d4d35fad993c4bde8`
- Viewports: 390 × 844 and 1440 × 900, each in a fresh Chromium context

## Verdict: FAIL

There are 5 blocking findings and 3 minor findings. Nineteen of the 20
declared claim commands pass from a clean clone. The immutable deployment
claim fails. The one-click demo hides its sample result on desktop, required
landing facts have moved below the desktop fold, and an earlier untested audio
output statement remains in the live host flow.

## First screen, before scrolling

My cold-read answers were the same on phone and desktop:

- What does it do? It sends a host's beat to a friend's phone as vibration
  cues and scores the taps returned by that friend.
- For whom? Friends and rhythm-game makers who want vibration cues and a
  shared timing score without an account.
- What should I click first? **Try it with sample data**.

The exact text supplying those answers was **“Send every beat to a friend,”**
**“For friends and rhythm-game makers who need phone vibration cues and a
shared timing score without an account,”** and **“Try it with sample data.”**
This mandatory clarity gate passes. At 390 px, those elements end at y=332,
y=427, and y=492. At desktop, they end at y=530, y=658, and y=739.

The required three plain facts all end at y=667 on the phone. On desktop they
start at y=845 and end at y=918, below the 900 px first screen. See F-3-3.

## Findings

### Blocking

#### F-3-1 / F-2-1 / F-1-1 regression — the declared deployment claim fails

- Location: `.factory/claims.json`, `singleton-deployment`.
- Exact claim: **“The live relay uses durable SQLite under /data and exactly
  one Container App replica for WebSocket delivery.”**
- Required command: `npm run test:live-topology`.
- Observed: exit 1 from a fresh clone. The command expected image
  `...:113a0ffd62f0045b999be185039e254814bceb88`; Azure and `/health` report
  `...:9ff530a030b8d4cc20dbd22d4d35fad993c4bde8`.
- Why this blocks: any failing listed claim command is blocking. This is the
  same immutable-identity regression recorded in both earlier reviews.
- Concrete fix: repair the other findings, commit the final candidate, deploy
  that exact SHA with `npm run deploy -- "$(git rev-parse HEAD)"`, then rerun
  the manifest command from a fresh clone.

#### F-3-2 / F-1-2 regression — the desktop demo hides the sample result below the first screen

- Location: live `/?demo=1`, 1440 × 900, immediately after choosing **Try it
  with sample data**.
- Exact hidden sample state: **“Sam returned 3 taps in the last round.”**,
  **“86%”**, and **“3 returned taps.”**
- Observed: **Start sample round** ends at y=821, but the sample state starts
  at y=982, the score starts at y=1012, and returned taps start at y=1090.
  The first desktop screen shows only the heading and the top of **Live round**.
- Why this blocks: the required one-click demo must already show the product
  being used with realistic sample data. The phone layout now passes, but the
  same demo defect from F-1-2 has moved to desktop.
- Concrete fix: reduce the desktop demo heading/spacing or place the live
  score panel beside the introduction. Keep the seeded state, 86% score,
  returned-tap count, and start action wholly inside 900 px.
- Test to add: remove the mobile-only condition around the viewport assertion
  in `@claim:demo-sandbox`; assert the seeded state, score, taps, and start
  action fit both configured projects.

#### F-3-3 / F-1-3 regression — all three required facts fall below the desktop fold

- Location: live landing page, 1440 × 900.
- Exact text: **“Free to use,” “Audio loops stay on the host device,”** and
  **“The relay needs a connection.”**
- Observed: every fact box starts at y=845 and ends at y=918. None is wholly
  visible without scrolling. Review 2 recorded all facts ending at y=884.
- Why this blocks: F-1-3 was marked fixed, but the same mandatory first-screen
  shape has regressed at the other required viewport. The history rule makes a
  regression blocking.
- Concrete fix: remove the decorative **“One host · one friend · one beat”**
  line and reduce the oversized desktop headline or hero gaps until all three
  fact boxes end above y=900. Add a desktop fact-bound regression assertion.

#### F-3-4 / F-2-6 / F-1-32 half-fixed — audible output is still promised without a claim test

- Location: live `/host`; `frontend/src/main.ts`, failed selected-loop path.
- Exact text: **“The audio loop could not play. The built-in click is
  running.”**
- Observed: I paired a real host and friend, selected an invalid `broken.wav`,
  and started a round. The live status changed to that exact sentence.
- Why this blocks: the earlier repair changed the initial status, but this
  remaining branch still promises audible output. No `claims.json` entry or
  test observes an oscillator reaching the audio output or proves the selected
  loop/fallback behavior.
- Concrete fix: add an `audio-output` claim and a test that stubs the Web Audio
  and media play paths, proving both selected-loop playback and the oscillator
  fallback. If audible output is not a public promise, rewrite the error as
  **“The audio loop could not play. Continue with the visual beat cues.”**

#### F-3-5 — `npm test` fails in the clean review clone

- Location: repository quality gate, `npm run test:handoff-contract`.
- Exact failure: **“the handoff must name the guarded command that deploys the
  final checked-out candidate.”**
- Observed: the reviewed-base `.factory/handoff.md` lists
  `RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology` but
  omits the required `npm run deploy -- "$(git rev-parse HEAD)"` command.
- Why this blocks: the product contract requires `npm test` to pass locally.
  The suite stops before its later Rust and browser stages.
- Concrete fix: keep the exact guarded deploy command in every release
  handoff, then run the complete `npm test` command from a fresh clone.

### Minor

#### F-3-6 — two useful control outcomes are absent from the claims manifest

- Locations: landing step **“Choose the tempo or load an audio loop from your
  device.”** and host help **“The button activates when your friend joins.”**
- Why: `sample-tempo` proves only the fixed 104 BPM sample. `local-audio`
  proves that selected bytes are not uploaded. `shared-score` happens to check
  the enabled button, but its listed claim does not state that outcome.
- Concrete fix: add one claim for selecting a real-round tempo and loading a
  local loop, with observable interval and file-ready assertions. Add button
  activation to the `shared-score` claim text or remove the help sentence.

#### F-3-7 — license, legal-date, and art-provenance statements are unlisted claims

- Locations and exact copy: README **“Licensed under the MIT License.”**;
  `/terms` **“These terms use the MIT license for the source code.”** and
  **“They were last updated on 28 August 2026.”**; footer **“Version 1.0 ·
  Original generated environment art.”**
- Why: these are facts a visitor can rely on, but no claim entry checks the
  license text, displayed version/date, or asset provenance record.
- Concrete fix: add a `public-records` claim that checks the MIT file, package
  version, legal date, and the asset hash/provenance entry. Remove
  **“Original”** if provenance cannot be proved by the sandbox.

#### F-3-8 — two landing labels carry no usable section information

- Location: landing eyebrow labels **“The shared view”** and **“Clear limits.”**
- Why: both are generic decorative labels above headings that already name the
  sections. They would survive unchanged on unrelated products.
- Concrete fix: delete both labels. Keep **“See the same round on both
  devices”** and **“Vibration varies by browser and device”** as the section
  headings.

## Copy audit

Counts use visible whitespace-delimited word tokens. Hyphenated terms, URLs,
and dotted filenames count as one word. Commands in fenced code blocks are
excluded. No sentence exceeds 22 words and no banned marketing adjective
appears. Landing actions name their result.

### Landing page

| Copy | Words | Type / flag |
|---|---:|---|
| Skip to main content | 4 | link |
| Haptic Beat Relay | 3 | wordmark |
| Demo | 1 | navigation link |
| Join | 1 | navigation link |
| Privacy | 1 | navigation link |
| One host · one friend · one beat | 6 | decorative tagline; contributes to F-3-3 |
| Send every beat to a friend | 6 | h1 |
| For friends and rhythm-game makers who need phone vibration cues and a shared timing score without an account. | 19 | audience sentence |
| Try it with sample data | 5 | result-naming action |
| A paired sample round opens now. | 6 | action result; `demo-sandbox` |
| Create a real room | 4 | result-naming action |
| Free to use | 3 | `free-use` |
| Audio loops stay on the host device | 7 | `local-audio` |
| The relay needs a connection | 5 | `connection-required` |
| Two glowing signal posts relay amber beats across a misty night clearing. | 12 | image alt |
| One device sends the pulse. | 5 | `shared-score` |
| The other taps it back. | 5 | `shared-score` |
| The shared view | 3 | decorative label; F-3-8 |
| See the same round on both devices | 7 | h2 |
| The host sets the pace. | 5 | product explanation |
| Your friend feels each cue and taps the beat back. | 10 | `shared-score`, `haptic-output` |
| Paired with your friend | 4 | preview status |
| Shared accuracy | 2 | preview label |
| How it works | 3 | section label |
| Run a round in three steps | 6 | h2 |
| Create a room. | 3 | step heading |
| Share its six-character code with one friend. | 7 | `shared-score`, `copy-room-link` |
| Set the beat. | 3 | step heading |
| Choose the tempo or load an audio loop from your device. | 11 | unlisted control outcomes; F-3-6 |
| Tap it back. | 3 | step heading |
| Your friend feels each cue and builds a shared score. | 10 | `shared-score`, `haptic-output` |
| Clear limits | 2 | decorative label; F-3-8 |
| Vibration varies by browser and device | 6 | h2 |
| Phone vibration and controller vibration vary by browser and device. | 10 | `haptic-output` |
| The screen still flashes each cue when vibration is unavailable. | 10 | `visual-cue` |
| Room records expire automatically after two hours. | 7 | `ephemeral-rooms` |
| Send beat cues between two devices. | 6 | footer sentence; `shared-score` |
| Terms | 1 | footer link |
| Built by Param Factory | 4 | external footer link |
| Version 1.0 · Original generated environment art | 6 | unlisted record claims; F-3-7 |

### README

| Copy | Words | Type / flag |
|---|---:|---|
| Haptic Beat Relay | 3 | heading |
| Haptic Beat Relay sends a host's beat to one friend's device. | 11 | product sentence |
| Your friend feels each cue, taps back, and builds a shared accuracy score. | 13 | `shared-score` |
| It is for friends, music practice, and small rhythm-game prototypes. | 10 | audience sentence |
| No account is needed. | 4 | `no-account` |
| It is free to use. | 5 | `free-use` |
| Audio loops stay in the host browser. | 7 | `local-audio` |
| Live site: https://haptic-beat-relay.sociobot.in | 3 | label |
| Try the sample | 3 | heading |
| Open http://localhost:8080/?demo=1 after starting the app. | 6 | instruction |
| The paired sample shows Sam's returned taps and shared score immediately. | 11 | `demo-sandbox` |
| It sends cues at 104 BPM. | 6 | `sample-tempo` |
| Start the 12-second sample round, reset it, or create a real room. | 12 | `sample-duration`, `demo-sandbox` |
| Run locally | 2 | heading |
| Open http://localhost:8080. | 2 | instruction |
| For frontend work, run npm run dev in another terminal. | 10 | instruction |
| Set RELAY_DATABASE_PATH to choose a different local database path. | 9 | `database-path` |
| Otherwise, the relay uses /data or its executable directory. | 9 | `database-path` |
| Test | 1 | heading |
| Run every public claim from the manifest after a clean install: | 11 | instruction |
| Check the live service with: | 5 | instruction |
| How it works | 3 | heading |
| The host opens a room and gets a six-character code. | 10 | room flow |
| One friend joins with that code. | 6 | `shared-score` |
| Both devices reconnect and recover the shared score. | 8 | `live-relay` |
| The friend receives phone and controller vibration when supported. | 9 | `haptic-output` |
| The screen flashes each cue when vibration is unavailable. | 9 | `visual-cue` |
| Room records expire after two hours. | 6 | `ephemeral-rooms` |
| Container | 1 | heading |
| Deploy | 1 | heading |
| Finish the handoff, commit it, push it, then run: | 9 | instruction |
| Project records | 2 | heading |
| .factory/design.md — visual system and art provenance | 6 | list item |
| .factory/demo.md — sample sandbox contract | 4 | list item |
| .factory/claims.json — public claims and proof commands | 6 | list item |
| .factory/handoff.md — verification record | 3 | list item |
| Licensed under the MIT License. | 5 | unlisted license claim; F-3-7 |

Terminology is consistent: **friend** is the second participant, **audio
loop** is the selected local sound, **room** is the temporary relay, **shared
accuracy** is the returned timing measure, and **sample** is demo data.

## Demo and sandbox

The one-click path is present and enters `/?demo=1` directly. At 390 px, the
first screen includes the persistent banner, start action, Sam's last-round
state, 86% score, and three returned taps by y=825. Starting changes the state
and score. **Reset demo** restores the seeded state.

The desktop first screen fails as described in F-3-2. The manifest test passes
because its viewport-bound assertions run only for the mobile project.

Across both live contexts, the complete demo request log contained no `/api/`
request and no third-party origin. A pre-existing `real:` localStorage and
sessionStorage sentinel remained unchanged after start and reset. Source
review confirms demo state stays in function-local memory and navigation
discards it.

## Claim command results

I cloned repository base `113a0ff…` into a new temporary directory, ran
`npm ci`, and ran each exact `test` string from `.factory/claims.json`
separately.

| Claim | Result | Evidence |
|---|---|---|
| `demo-sandbox` | PASS, insufficient desktop viewport assertion | Seeded state, reset, no API/storage; see F-3-2 |
| `sample-duration` | PASS | Active before and complete after 12 seconds |
| `sample-tempo` | PASS | Two measured 104 BPM intervals |
| `local-audio` | PASS | Marked bytes were not sent |
| `no-third-party` | PASS | All requests stayed same-origin |
| `no-account` | PASS | Room opened without sign-in |
| `free-use` | PASS | No purchase or payment gate |
| `copy-room-link` | PASS | Copied URL joined; blocked-copy message appeared |
| `shared-score` | PASS | Two contexts showed the same returned score |
| `live-relay` | PASS | 30/30 API and 30/30 reconnect rounds |
| `ephemeral-rooms` | PASS | SQLite restart and controlled expiry |
| `rate-limit` | PASS | Five clients each received 40 successes and five 429s |
| `health` | PASS | Exact known 40-character test SHA |
| `connection-required` | PASS | Offline room creation showed recovery text |
| `visual-cue` | PASS | Companion cue state appeared without vibration |
| `space-key-tap` | PASS | Space returned one tap |
| `haptic-output` | PASS | `vibrate(45)` and controller dual-rumble observed |
| `real-round-duration` | PASS | Active at 59 seconds; complete at 60 |
| `singleton-deployment` | **FAIL** | Immutable image SHA mismatch; F-3-1 |
| `database-path` | PASS | Explicit, `/data`, and executable paths checked |

## Earlier finding verification

I checked the live site and current source, not the assertions in the polish
documents. “Fixed” means the exact earlier issue is absent now.

### Review 1

| Earlier ID | Status | Independent check |
|---|---|---|
| F-1-1 | **Regressed → F-3-1** | Exact topology command fails on immutable image identity. |
| F-1-2 | **Regressed → F-3-2** | Phone is fixed; desktop again hides seeded result below its first screen. |
| F-1-3 | **Regressed → F-3-3** | Phone is fixed; desktop facts now end below 900 px. |
| F-1-4 | Fixed | Live copy and README use **friend**. |
| F-1-5 | Fixed | Live copy and README use **audio loop**. |
| F-1-6 | Fixed | Limits h2 names vibration, browser, and device. |
| F-1-7 | Fixed | Demo exit says **Create a real room**. |
| F-1-8 | Fixed | Privacy h1 names temporary-room data handling. |
| F-1-9 | Fixed | Terms h1 names the terms page. |
| F-1-10 | Fixed | 404 h1 is **Page not found**. |
| F-1-11 | Fixed | Old 25-word suite sentence is absent. |
| F-1-12 | Fixed | Old clean-entry guarantee is absent. |
| F-1-13 | Fixed | Old destructive-scope sentence is absent. |
| F-1-14 | Fixed | Old rate-limit sentence is absent. |
| F-1-15 | Fixed | Old singleton explanation is absent. |
| F-1-16 | Fixed | Old scale warning is absent. |
| F-1-17 | Fixed | README has no overlong deployment-gate sentence. |
| F-1-18 | Fixed | Stability-window sentence is absent. |
| F-1-19 | Fixed | No README sentence exceeds 22 words; average remains below 14. |
| F-1-20 | Fixed | **Unaccelerated browser flow** is absent. |
| F-1-21 | Fixed | **Deployed relay boundary** is absent. |
| F-1-22 | Fixed | Delayed-frame/peer test jargon is absent from README. |
| F-1-23 | Fixed | HTTP-ingress/replica explanation is absent from README prose. |
| F-1-24 | Fixed | **Forwarded client identities** is absent. |
| F-1-25 | Fixed | Stream/match/music exclusion sentence is absent. |
| F-1-26 | Fixed | Runtime-version promise is absent. |
| F-1-27 | Fixed | Default-port/no-environment promise is absent. |
| F-1-28 | Fixed | Vite proxy promise is absent. |
| F-1-29 | Fixed | README no longer enumerates `npm test` internals. |
| F-1-30 | Fixed | Universal clean-entry guarantee is absent. |
| F-1-31 | Fixed | Destructive file-scope guarantee is absent. |
| F-1-32 | **Half-fixed → F-3-4** | Initial status changed, but failed-loop status still promises a running click. |
| F-1-33 | Fixed | Privacy copy is narrowed to accounts and third-party requests. |
| F-1-34 | Fixed | Non-root promise is absent from public docs. |
| F-1-35 | Fixed | Factory build-input promise is absent. |
| F-1-36 | Fixed | Combined-serving promise is absent. |
| F-1-37 | Fixed | Source-of-truth deployment sentence is absent. |
| F-1-38 | Fixed | No-volume/no-database claim is absent. |
| F-1-39 | Fixed | Deployment refusal cases are absent. |
| F-1-40 | Fixed | Deployment-action compound claim is absent. |
| F-1-41 | Fixed | Release stability-window promise is absent. |

### Review 2

| Earlier ID | Status | Independent check |
|---|---|---|
| F-2-1 | **Regressed → F-3-1** | Exact topology command fails again. |
| F-2-2 | Fixed | Overlong deployment-gate prose is absent. |
| F-2-3 | Fixed | Reconnect failure-test jargon is absent. |
| F-2-4 | Fixed | Unexplained infrastructure prose is absent. |
| F-2-5 | Fixed | Unlisted deployment-command promise is absent. |
| F-2-6 | **Half-fixed → F-3-4** | Another live status still promises the built-in click. |
| F-2-7 | Fixed | Privacy absence sentence matches listed account/request claims. |
| F-2-8 | Fixed | Audience sentence names phone vibration and a timing score. |
| F-2-9 | Fixed | Rollout/VFS note is absent. |
| F-2-10 | Fixed | Test-runtime statement is absent. |
| F-2-11 | Fixed | Protocol vocabulary is absent from public README prose. |
| F-2-12 | Fixed | Hosting vocabulary is absent from public README prose. |
| F-2-13 | Fixed | Demo, Join, and Privacy are visible at 390 px. |
| F-2-14 | Fixed | Landing now states only tested two-hour expiry. |
| F-2-15 | Fixed | Host says **Opening a room**, not **private room**. |
| F-2-16 | Fixed | Copied join URL and blocked fallback have a listed test. |
| F-2-17 | Fixed | 104 BPM has a measured claim test; **realistic** is absent. |
| F-2-18 | Fixed | Unproved stored-data inventory is absent. |
| F-2-19 | Fixed | Network-address retention sentence is absent. |
| F-2-20 | Fixed | Database fallback has a listed temp-directory test. |
| F-2-21 | Fixed | Environment-variable behavior is listed and tested. |
| F-2-22 | Fixed | Rate-limit storage statement is absent. |
| F-2-23 | Fixed | Generic-rollout causal warning is absent. |
| F-2-24 | Fixed | Space shortcut has a joined-room claim test. |
| F-2-25 | Fixed | Health test asserts an exact known 40-character SHA. |

## Structure, accessibility, and visual identity

- `/`, `/demo`, `/?demo=1`, `/host`, `/join`, `/privacy`, and `/terms`
  return 200. `/404` and an unknown route return the designed page with 404.
- Every route has one h1, one main landmark, a route-specific title under 60
  characters, a description, canonical URL, OG/Twitter metadata, header, and
  footer. The social image is 1200 × 630; the Apple icon is 180 × 180.
- `robots.txt`, `sitemap.xml`, favicon, service worker, and security headers
  are present. CSP is a response header and produces no error on 200 routes.
- The link crawl found no dead navigational link. The Param Factory external
  link returned 200; the privacy mail address is a valid `mailto:` target.
- Deep links load the correct route. Link navigation and back navigation focus
  the new h1; after smooth scrolling settles, new routes start at the top and
  Back restores the prior scroll position.
- The worker `verify-url.sh` passed in 588 ms with no console error. Playwright
  Axe found no serious or critical issue on every route at 390 px. Routes had
  no horizontal overflow at normal or 200% text size, and the full suite checks
  44 px touch targets.
- The midnight rehearsal clearing, clipped signal controls, amber/cyan states,
  condensed poster type, and pulse rail remain product-specific. This is not a
  generic SaaS card template. Reduced-motion CSS removes smooth scrolling and
  collapses animation/transition duration.

The intended top-document 404 produces Chromium's normal failed-resource
console line. No script, CSP, or application error appeared on a 200 route.

## Other verification

- `npm run build`: PASS. Initial JS is 8.72 KB gzip; CSS is 4.58 KB gzip.
- `npm test` on the reviewed base: **FAIL** at `test:handoff-contract`; see
  F-3-5. After the required review handoff replaced the stale release handoff,
  the final documentation-only review tree passed the complete command.
- Separate remaining stages: Rust 16/16 PASS; clean-entry check PASS;
  Playwright 40 PASS with six intentional project skips.
- Live relay: 30/30 fresh API rooms and 30/30 reconnecting paired rounds PASS.
- Live rate limit: all five clients received exactly 40 successes followed by
  five `429` responses with `Retry-After: 1`.

## Missed leverage

No AI, import/export, or additional sync feature is clearly implied. This is a
short-lived two-device relay, and the room link already supplies the useful
sync. An AI step would add cost and network disclosure without helping the
beat-and-tap job.

## What would make this perfect

Close all eight findings. Put the seeded desktop score and taps in the first
900 px, restore all three landing facts to that same viewport, cover audible
output and every public statement in `claims.json`, and keep the guarded deploy
command in the handoff. Then deploy the final repaired commit and rerun all 20
claim commands, `npm test`, both cold viewports, demo request/storage logging,
the all-route Axe scan, link crawl, and both history matrices from that exact
clean clone. A perfect round has zero findings and no weaker test than its
claim.
