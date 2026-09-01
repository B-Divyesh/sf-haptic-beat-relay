# Adversarial first-read review 2

- Product: Haptic Beat Relay
- Live URL: <https://haptic-beat-relay.sociobot.in>
- Reviewed: 2026-09-01 UTC
- Repository base: `110943a99f1b6b00e29dbf4271357b0fee5ed153`
- Live build reported by `/health`: `635cf01c74b8b712e70634e4094a9f61d3befd1b`
- Viewports: 390 × 844 and 1440 × 900, each in a fresh Chromium context

## Verdict: FAIL

There are 7 blocking findings and 18 minor findings. Fifteen of the 16
declared claim commands pass from a clean clone. The deployment-topology claim
fails because the live image does not match this review base. Several findings
closed after review 1 have also returned.

## First screen, before scrolling

The cold-read answers were the same on phone and desktop:

- What does it do? It sends a beat from one device to a friend and scores the
  friend's returned taps.
- For whom? Friends and rhythm-game makers who want vibration cues and shared
  timing without an account.
- What should I click first? **Try it with sample data**.

The exact text supplying those answers was **“Send every beat to a friend,”**
**“For friends and rhythm-game makers who need tactile cues and shared timing
without an account,”** and **“Try it with sample data.”** All three appear
before scrolling. At 390 px, the sample action ends at y=492 and all three
facts end at y=667. At desktop, the action ends at y=705 and the facts end at
y=884. This mandatory clarity gate passes, subject to the wording issue in
F-2-8.

Evidence: `evidence/review-2/landing-mobile.png`,
`evidence/review-2/landing-desktop.png`, and
`evidence/review-2/live-audit.json`.

## Findings

### Blocking

#### F-2-1 / F-1-1 regression — the declared deployment claim fails

- Location: `.factory/claims.json`, `singleton-deployment`.
- Exact claim: **“The live relay uses durable SQLite under /data and exactly
  one Container App replica for WebSocket delivery.”**
- Required command: `npm run test:live-topology`.
- Observed: exit 1 from the clean clone. The command expected image
  `...:110943a99f1b6b00e29dbf4271357b0fee5ed153`; Azure and `/health` report
  `...:635cf01c74b8b712e70634e4094a9f61d3befd1b`.
- Why this blocks: any failing listed claim command is blocking. This is the
  same immutable-identity failure as F-1-1.
- Concrete fix: deploy the final repaired commit with the guarded product
  command, then run `RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run
  test:live-topology` from a clean clone.

#### F-2-2 / F-1-17 regression — an overlong deployment-gate sentence returned

- Location: `README.md:94-97`.
- Exact text, 24 words: **“It reads deploy/containerapp.json, mounts durable
  storage at /data, pins HTTP ingress and one ready replica, and checks the live
  room relay before it returns.”**
- Why this blocks: F-1-17 was marked fixed by removing an overlong deployment
  sentence. The same problem has returned, so the history rule makes it
  blocking.
- Concrete rewrite: **“It reads `deploy/containerapp.json` and mounts `/data`.
  It keeps one server copy and checks the live relay before returning.”**

#### F-2-3 / F-1-22 regression — unexplained failure-test jargon returned

- Location: `README.md:62-63`.
- Exact text: **“The 30-round relay check reconnects both devices, drops one
  delayed score frame, and requires persisted score state on both peers.”**
- Why this blocks: **“score frame,” “persisted score state,”** and **“peers”**
  again make the public README depend on internal test vocabulary. F-1-22 was
  closed by removing this kind of stacked failure jargon.
- Concrete rewrite: **“The 30-round check reconnects both devices. It confirms
  that both screens recover the same score after one delayed update.”**

#### F-2-4 / F-1-23 regression — infrastructure terms returned without explanation

- Location: `README.md:94-97`.
- Exact text: **“pins HTTP ingress and one ready replica.”**
- Why this blocks: **“HTTP ingress”** and **“ready replica”** are again used in
  public prose without explanation. This regresses F-1-23.
- Concrete rewrite: **“keeps one running server copy available for web
  traffic.”** Put Azure field names in an operator-only note if needed.

#### F-2-5 / F-1-40 regression — the deployment command makes an unlisted compound claim

- Location: `README.md:94-97`; no matching entry in `.factory/claims.json`.
- Exact text: the full 24-word sentence quoted in F-2-2.
- Why this blocks: the listed topology test does not prove that the deployment
  command performs every stated action or checks the live relay before it
  returns. This is the same unlisted deployment-behaviour issue as F-1-40.
- Concrete fix: add a `deployment-command` claim whose test runs the deployment
  script against fixtures and verifies each promised action, or remove the
  behavioural sentence from the public README.

#### F-2-6 / F-1-32 regression — audible output is still promised without a claim test

- Location: live `/host`; `frontend/src/main.ts:192`.
- Exact text: **“Built-in click is ready.”**
- Why this blocks: F-1-32 was closed by removing the README playback promise,
  but the live product still tells the host that audible output is ready.
  `local-audio` proves only that uploaded bytes are not sent. No listed test
  proves that the click sounds or that a selected loop plays.
- Concrete fix: add an `audio-output` claim that observes the oscillator and a
  selected fixture reaching the audio output path, or change the status to the
  non-promissory **“No audio loop selected.”**

#### F-2-7 / F-1-33 regression — the compound service-absence claim remains partly untested

- Location: live `/privacy`; `frontend/src/main.ts:276`.
- Exact text: **“There are no accounts, advertising trackers, or analytics
  scripts.”**
- Why this blocks: `no-account` covers accounts, and `no-third-party` covers
  third-party requests. That request-origin test does not prove the absence of
  a same-origin analytics script. F-1-33 was the same partly listed compound
  absence problem.
- Concrete fix: rewrite to the covered claims: **“There are no accounts or
  third-party advertising requests.”** Otherwise add a source/build scan claim
  that proves there is no analytics code.

### Minor

#### F-2-8 — the audience sentence uses vague product jargon

- Location: landing first screen.
- Exact text: **“For friends and rhythm-game makers who need tactile cues and
  shared timing without an account.”**
- Why: **“tactile cues”** and **“shared timing”** require interpretation on a
  phone. The product actually provides phone vibration and a score.
- Concrete rewrite: **“For friends and rhythm-game makers who need phone
  vibration cues and a shared timing score without an account.”**

#### F-2-9 — the local deployment note is over 22 words, jargon-heavy, and unlisted

- Location: `README.md:32-34`, 23 words.
- Exact text: **“The release command stops the previous singleton revision
  before starting the next one because the Azure Files database uses SQLite's
  no-lock Unix VFS.”**
- Why: **“singleton revision”** and **“no-lock Unix VFS”** are unexplained. No
  claim entry proves the stop-before-start behaviour.
- Concrete rewrite: **“The release command stops the previous app version
  first. This protects the SQLite file stored on Azure Files.”** Add a claim
  test if this remains a behavioural guarantee.

#### F-2-10 — a quantitative test-runtime claim is unlisted and uses jargon

- Location: `README.md:48`.
- Exact text: **“The real connected-round check takes about one minute.”**
- Why: **“connected-round”** is internal vocabulary, and the runtime statement
  is not listed or measured as a claim.
- Concrete rewrite: **“The 60-second round test runs in real time.”** Add a
  timeout assertion only if an execution-time promise is useful.

#### F-2-11 — the README exposes protocol vocabulary instead of the result

- Location: `README.md:69`.
- Exact text: **“A WebSocket relays beat, tap, presence, score, and score
  acknowledgement messages.”**
- Why: **“WebSocket,” “presence,”** and **“score acknowledgement”** do not help a
  first-time reader understand the product.
- Concrete rewrite: **“A live connection sends beats, returned taps, and the
  shared score between both devices.”**

#### F-2-12 — the README uses unexplained hosting terms

- Location: `README.md:75-76`.
- Exact text: **“The live relay uses one Container App replica because
  WebSocket delivery is process-local.”**
- Why: the sentence is accurate operator detail, but **“replica”** and
  **“process-local”** are not plain words.
- Concrete rewrite: **“The live relay runs on one server copy because each live
  connection stays in that process.”**

#### F-2-13 — the mobile header removes the Demo link

- Location: every route at 390 px; `frontend/src/styles.css:210` hides the
  first navigation link.
- Exact visible navigation: **“Join”** and **“Privacy.”**
- Why: the standard header calls for a direct Demo route. A mobile visitor on
  Privacy, Terms, Join, or 404 must return home before finding the sample.
- Concrete fix: keep **Demo**, **Join**, and **Privacy** visible at 390 px.

#### F-2-14 — the landing page makes an unlisted data-minimisation claim

- Location: landing limits section.
- Exact text: **“Rooms hold only live relay messages.”**
- Why: `ephemeral-rooms` tests expiry and restart persistence, not the complete
  set of data stored in a room.
- Concrete fix: add a claim that inspects the SQLite schema and request flow,
  or replace this with the specifically tested two-hour expiry sentence.

#### F-2-15 — the host calls a room private without a privacy claim

- Location: live `/host`; `frontend/src/main.ts:184`.
- Exact text: **“Opening a private room…”**
- Why: **“private”** implies a security property that no claim entry defines or
  tests.
- Concrete rewrite: **“Opening a room…”** Or add a narrowly defined access
  control claim and adversarial token tests.

#### F-2-16 — the copy-room action has no listed outcome test

- Location: live `/host`.
- Exact button: **“Copy room link.”**
- Why: the button names a useful result, but no claim test verifies the copied
  URL or the fallback when clipboard access is blocked.
- Concrete fix: add a `copy-room-link` claim that reads the clipboard and opens
  the resulting join URL in a fresh context.

#### F-2-17 — the sample makes an unlisted number claim and uses a subjective adjective

- Location: live demo introduction.
- Exact text: **“This sample uses a 104 BPM practice loop and realistic returned
  taps.”**
- Why: no claim test measures 104 BPM. **“Realistic”** is subjective and cannot
  be verified.
- Concrete rewrite: **“This sample sends cues at 104 BPM and shows Sam's
  returned taps.”** Add a `sample-tempo` test that measures the cue interval.

#### F-2-18 — the privacy page's stored-data inventory is unlisted

- Location: live `/privacy`.
- Exact text: **“The server holds a room code, two random access tokens, and live
  timing messages.”**
- Why: no claim test verifies that this list is complete.
- Concrete fix: add a schema/request-body privacy claim, or label the list as a
  non-exhaustive implementation note and avoid **“holds”** as a complete
  inventory.

#### F-2-19 — network-address retention is an unlisted privacy claim

- Location: live `/privacy`.
- Exact text: **“The server keeps a client network address briefly to enforce
  request limits.”**
- Why: `rate-limit` proves the 40-request outcome. It does not verify deletion
  or define **“briefly.”**
- Concrete fix: state the exact one-second retention and add a test that the
  SQLite rate-limit row is removed after that interval.

#### F-2-20 — the local database fallback is an unlisted operational claim

- Location: `README.md:30-32`.
- Exact text: **“A local run uses /data when present, then falls back beside the
  executable.”**
- Why: no manifest entry tests both filesystem branches.
- Concrete fix: add a temp-directory configuration test or present explicit
  setup instructions without promising automatic fallback.

#### F-2-21 — the environment-variable condition is unlisted

- Location: `README.md:32`.
- Exact text: **“Set RELAY_DATABASE_PATH only when a different local test path
  is needed.”**
- Why: the sentence promises that no other situation needs the variable, but
  no claim test covers that condition.
- Concrete rewrite: **“Set `RELAY_DATABASE_PATH` to choose a different local
  database path.”**

#### F-2-22 — storage of rate-limit records is not covered by the room-persistence claim

- Location: `README.md:74-75`.
- Exact text: **“SQLite stores temporary room, round, score, and rate-limit
  records under /data, so active rooms survive a restart.”**
- Why: existing claims prove room persistence, live score recovery, and the
  live request limit. None asserts that rate-limit records are stored under
  `/data`.
- Concrete fix: remove **“rate-limit”** from this sentence or add a persistence
  test for those rows.

#### F-2-23 — the generic-rollout warning is an unlisted causal claim

- Location: `README.md:97-98`.
- Exact text: **“Its Auto ingress and 1–3 replica defaults split live WebSocket
  delivery.”**
- Why: this uses unexplained Azure terms and claims a specific failure mode
  without a manifest entry.
- Concrete rewrite: **“Use the checked-in deployment command so both devices
  reach the same relay process.”** Keep the Azure diagnosis in operator notes
  with a regression test.

#### F-2-24 — the keyboard shortcut is an unlisted claim

- Location: the joined friend view; `frontend/src/main.ts:223`.
- Exact text: **“Space key also works.”**
- Why: the general keyboard test does not enter a live joined room and prove
  that Space returns a tap.
- Concrete fix: add a `space-key-tap` claim using two browser contexts, or
  remove the shortcut promise.

#### F-2-25 — the health claim test accepts any string as a build SHA

- Location: `tests/browser/product.spec.ts:150-153`.
- Exact assertion: `build_sha: expect.any(String)`.
- Why: an empty string, `dev`, or an unrelated identifier passes. The claim
  **“The health endpoint reports the build SHA”** is not proved by this test.
- Concrete fix: build with a known 40-character SHA and assert exact equality.
  Keep the separate live topology equality check.

## Copy audit

Counts use visible word tokens; punctuation-only separators are excluded.
Repeated header/footer labels are listed once. Commands in fenced blocks are
excluded. No banned marketing word appears. All action buttons name a result.

### Landing page

| Copy | Words | Type / flag |
|---|---:|---|
| Skip to main content | 4 | link |
| Haptic Beat Relay | 3 | wordmark |
| Demo | 1 | nav; hidden at 390 px, F-2-13 |
| Join | 1 | nav |
| Privacy | 1 | nav |
| One host · one friend · one beat | 6 | factual label |
| Send every beat to a friend | 6 | h1 |
| For friends and rhythm-game makers who need tactile cues and shared timing without an account. | 15 | jargon/vague, F-2-8 |
| Try it with sample data | 5 | result-naming action |
| A paired sample round opens now. | 6 | covered by `demo-sandbox` |
| Create a real room | 4 | result-naming action |
| Free to use | 3 | covered by `free-use` |
| Audio loops stay on the host device | 7 | covered by `local-audio` |
| The relay needs a connection | 5 | covered by `connection-required` |
| Two glowing signal posts relay amber beats across a misty night clearing. | 12 | image alt |
| One device sends the pulse. | 5 | sentence |
| The other taps it back. | 5 | sentence |
| The shared view | 3 | section label |
| See the same round on both devices | 7 | h2 |
| The host sets the pace. | 5 | sentence |
| Your friend feels each cue and taps the beat back. | 10 | covered by `shared-score` and `haptic-output` |
| Paired with your friend | 4 | preview status |
| Shared accuracy | 2 | label |
| How it works | 3 | section label |
| Run a round in three steps | 6 | h2 |
| Create a room. | 3 | step heading |
| Share its six-character code with one friend. | 7 | sentence |
| Set the beat. | 3 | step heading |
| Choose the tempo or load an audio loop from your device. | 11 | sentence |
| Tap it back. | 3 | step heading |
| Your friend feels each cue and builds a shared score. | 10 | covered by `shared-score` |
| Clear limits | 2 | section label |
| Vibration varies by browser and device | 6 | h2 |
| Phone vibration and controller vibration vary by browser and device. | 10 | covered by `haptic-output` |
| The screen still flashes each cue when vibration is unavailable. | 10 | covered by `visual-cue` |
| Rooms hold only live relay messages. | 6 | unlisted claim, F-2-14 |
| Room records expire automatically after two hours. | 7 | covered by `ephemeral-rooms` |
| Send tactile beat cues between two devices. | 7 | footer sentence |
| Terms | 1 | footer link |
| Built by Param Factory | 4 | external footer link |
| Version 1.0 · Original generated environment art | 6 | footer note |

### README

There are 41 prose/list sentences with 390 words, an average of 9.51 words.
Two sentences exceed 22 words.

| Copy | Words | Type / flag |
|---|---:|---|
| Haptic Beat Relay | 3 | heading |
| Haptic Beat Relay sends a host's beat to one friend's device. | 11 | sentence |
| Your friend feels each cue, taps back, and builds a shared accuracy score. | 13 | covered by `shared-score` |
| It is for friends, music practice, and small rhythm-game prototypes. | 10 | sentence |
| No account is needed. | 4 | covered by `no-account` |
| It is free to use. | 5 | covered by `free-use` |
| Audio loops stay in the host browser. | 7 | covered by `local-audio` |
| The server relays temporary room and timing messages. | 8 | sentence |
| Live site: https://haptic-beat-relay.sociobot.in | 3 | label |
| Try the sample | 3 | heading |
| Open http://localhost:8080/?demo=1 after starting the app. | 6 | instruction |
| The paired sample shows Sam's returned taps and shared score immediately. | 11 | covered by `demo-sandbox` |
| Start the 12-second sample round, reset it, or create a real room. | 12 | covered by `sample-duration` and `demo-sandbox` |
| Sample state stays in page memory and is discarded on reset. | 11 | covered by `demo-sandbox` |
| Run locally | 2 | heading |
| Open http://localhost:8080. | 2 | instruction |
| For frontend work, run npm run dev while the backend runs in another terminal. | 14 | instruction |
| The container stores SQLite at /data/relay.sqlite3. | 6 | covered in part by `singleton-deployment` |
| A local run uses /data when present, then falls back beside the executable. | 13 | unlisted claim, F-2-20 |
| Set RELAY_DATABASE_PATH only when a different local test path is needed. | 11 | unlisted condition, F-2-21 |
| The release command stops the previous singleton revision before starting the next one because the Azure Files database uses SQLite's no-lock Unix VFS. | 23 | over cap, jargon, unlisted, F-2-9 |
| Test | 1 | heading |
| Run every public claim from the manifest after a clean install: | 11 | instruction |
| The real connected-round check takes about one minute: | 8 | jargon/unlisted number, F-2-10 |
| Check the live service with: | 5 | instruction |
| The 30-round relay check reconnects both devices, drops one delayed score frame, and requires persisted score state on both peers. | 20 | jargon regression, F-2-3 |
| How it works | 3 | heading |
| The host opens a room and gets a six-character code. | 10 | covered by relay claims |
| One friend joins with that code. | 6 | covered by `shared-score` |
| A WebSocket relays beat, tap, presence, score, and score acknowledgement messages. | 11 | jargon, F-2-11 |
| Both devices reconnect automatically and restore the active round and score. | 11 | covered by `live-relay` |
| The friend receives phone and controller vibration when supported. | 9 | covered by `haptic-output` |
| The screen flashes each cue when vibration is unavailable. | 9 | covered by `visual-cue` |
| Rooms expire after two hours. | 5 | covered by `ephemeral-rooms` |
| SQLite stores temporary room, round, score, and rate-limit records under /data, so active rooms survive a restart. | 17 | partly unlisted, F-2-22 |
| The live relay uses one Container App replica because WebSocket delivery is process-local. | 13 | jargon, F-2-12; covered by `singleton-deployment` |
| Container | 1 | heading |
| Deploy | 1 | heading |
| Finish the handoff, commit it, push it, then run: | 9 | instruction |
| This command is required for this product. | 7 | instruction |
| It reads deploy/containerapp.json, mounts durable storage at /data, pins HTTP ingress and one ready replica, and checks the live room relay before it returns. | 24 | over cap, jargon, unlisted regression, F-2-2/F-2-4/F-2-5 |
| Do not use a generic rollout. | 6 | instruction |
| Its Auto ingress and 1–3 replica defaults split live WebSocket delivery. | 11 | jargon/unlisted claim, F-2-23 |
| Project records | 2 | heading |
| .factory/design.md — visual system and art provenance | 7 | list item |
| .factory/demo.md — sample sandbox contract | 5 | list item |
| .factory/claims.json — public claims and proof commands | 7 | list item |
| .factory/handoff.md — verification record | 4 | list item |
| Licensed under the MIT License. | 5 | sentence |

Terminology is otherwise consistent: **friend** is the second participant,
**audio loop** is the local sound, **room** is the temporary relay, **shared
accuracy** is the returned timing measure, and **sample** is the demo data.

## Demo and sandbox

The one-click demo passes its core behaviour check. Clicking **Try it with
sample data** opens `/?demo=1`. At 390 px, the first demo screen contains the
persistent banner, **Start sample round**, Sam's three returned taps, and an
86% score before y=779. Starting the round changes the score and tap count.
**Reset demo** restores 86%, three taps, and the seeded last-round text.

The complete request log contains only same-origin static requests and no
`/api/` request. `localStorage` and `sessionStorage` remain empty. Source review
confirms demo state is held in function-local variables and discarded on
reset/navigation. No real room storage is read or written.

## Claim command results

The repository was cloned locally into a new temporary directory at base
`110943a…`, followed by `npm ci`. Every exact `test` string in
`.factory/claims.json` was run separately.

| Claim | Result | Evidence |
|---|---|---|
| `demo-sandbox` | PASS | Desktop and mobile; seeded state, reset, no API/storage |
| `sample-duration` | PASS | Desktop and mobile; completes after 12 seconds |
| `local-audio` | PASS | Desktop and mobile fixture bytes not sent |
| `no-third-party` | PASS | Desktop and mobile request-origin assertion |
| `no-account` | PASS | Room opens without sign-in |
| `free-use` | PASS | No purchase gate |
| `shared-score` | PASS | Two contexts agree on returned score |
| `live-relay` | PASS | 30/30 API and 30/30 reconnect rounds |
| `ephemeral-rooms` | PASS | SQLite restart/expiry Rust test |
| `rate-limit` | PASS | Five clients: 40 accepted, five 429 each |
| `health` | PASS, insufficient assertion | See F-2-25 |
| `connection-required` | PASS | Offline room creation shows recovery text |
| `visual-cue` | PASS | Cue state and animation observed |
| `haptic-output` | PASS | `vibrate(45)` and controller rumble observed |
| `real-round-duration` | PASS | Active at 59 seconds; completes at 60 |
| `singleton-deployment` | **FAIL** | Image SHA mismatch; see F-2-1 |

## Earlier finding verification

Every finding in `review-1.md` was checked against the live site and current
source. “Fixed” below means the exact old issue is absent, not merely marked
fixed in `polish-1.md`.

| Earlier ID | Status in this review | Independent check |
|---|---|---|
| F-1-1 | **Regressed → F-2-1** | Exact topology command fails on image identity. |
| F-1-2 | Fixed | Score, taps, and sample start fit the 390 px demo viewport. |
| F-1-3 | Fixed | All three facts end at y=667 on the phone. |
| F-1-4 | Fixed | Visitor copy and README use **friend**. |
| F-1-5 | Fixed | Visitor copy and README use **audio loop**. |
| F-1-6 | Fixed | Limits h2 names browser/device vibration. |
| F-1-7 | Fixed | Demo exit says **Create a real room**. |
| F-1-8 | Fixed | Privacy h1 names room data handling. |
| F-1-9 | Fixed | Terms h1 names the terms page. |
| F-1-10 | Fixed | 404 h1 is **Page not found**. |
| F-1-11 | Fixed | The old 25-word suite sentence is gone. |
| F-1-12 | Fixed | The old clean-entry guarantee is gone. |
| F-1-13 | Fixed | The old destructive-scope sentence is gone. |
| F-1-14 | Fixed | The old 23-word rate-limit sentence is gone. |
| F-1-15 | Fixed | Singleton wording is now 13 words. |
| F-1-16 | Fixed | The scale-out warning is gone. |
| F-1-17 | **Regressed → F-2-2** | A new 24-word deployment-gate sentence appears. |
| F-1-18 | Fixed | The 60-second stability-gate promise is gone. |
| F-1-19 | Fixed | Current README prose/list average is 9.51 words. |
| F-1-20 | Fixed | **Unaccelerated browser flow** is gone. |
| F-1-21 | Fixed | **Deployed relay boundary** is gone. |
| F-1-22 | **Regressed → F-2-3** | Delayed-frame/persisted-peer jargon returned. |
| F-1-23 | **Regressed → F-2-4** | HTTP-ingress/ready-replica jargon returned. |
| F-1-24 | Fixed | **Forwarded client identities** is absent from public copy. |
| F-1-25 | Fixed | The untested stream/match/music exclusion is gone. |
| F-1-26 | Fixed | The runtime-version promise is gone. |
| F-1-27 | Fixed | The default-port/no-environment promise is gone. |
| F-1-28 | Fixed | The Vite proxy promise is gone. |
| F-1-29 | Fixed | The README no longer enumerates `npm test` internals. |
| F-1-30 | Fixed | The universal clean-browser guarantee is gone. |
| F-1-31 | Fixed | The destructive file-scope guarantee is gone. |
| F-1-32 | **Half-fixed → F-2-6** | README text is gone, but `/host` still promises a ready click. |
| F-1-33 | **Half-fixed → F-2-7** | Privacy still has a partly untested compound absence claim. |
| F-1-34 | Fixed | The non-root promise is absent from public docs. |
| F-1-35 | Fixed | The factory build-input promise is absent. |
| F-1-36 | Fixed | The combined-serving promise is absent. |
| F-1-37 | Fixed | The source-of-truth deployment sentence is absent. |
| F-1-38 | Fixed | The no-volume/no-database claim is absent. |
| F-1-39 | Fixed | Deployment refusal cases are absent from public docs. |
| F-1-40 | **Regressed → F-2-5** | Deployment actions are again promised without a claim entry. |
| F-1-41 | Fixed | The stability-window promise is absent. |

## Structure, accessibility, and visual identity

- `/`, `/demo`, `/host`, `/join`, `/privacy`, and `/terms` return 200. `/404`
  and an unknown route return the designed 404 with status 404.
- Every checked route has one h1, one main landmark, a route-specific title,
  description, canonical URL, Open Graph title, and the consistent footer.
- `robots.txt`, `sitemap.xml`, SVG favicon, 180 px Apple icon, and the real
  1200 × 630 social image are present.
- Back/forward navigation restores the route and focuses its h1. The live link
  crawl found no dead link; the external Param Factory link returns 200.
- Axe found no serious or critical issue on any route at 390 px. The worker
  URL verifier found no console/page error on the landing page, one h1, `lang`,
  main, and complete image alt text. No route had horizontal overflow.
- The midnight rehearsal clearing, clipped signal controls, amber/cyan relay
  states, condensed poster type, and pulse rail are product-specific. The site
  does not look like a generic SaaS card template. Reduced-motion CSS removes
  continuous transitions and replaces the beat travel with an immediate state.

The browser reports the expected failed-resource console entry when the
top-level document itself returns 404. No script, CSP, or application console
error appeared on 200 routes.

## Missed leverage

No additional AI, import/export, or sync feature is implied strongly enough to
add. The job is a short-lived two-device relay, and accountless room links
already provide the necessary sync. An AI step would add network and privacy
cost without improving the core beat-and-tap loop.

## What would make this perfect

All 25 findings must be closed. The final repaired commit must be the deployed
immutable image, and every claim command plus `npm test` must pass from that
same clean clone. Re-run the two viewport first-read, demo storage/request log,
all-route Axe scan, link crawl, prior-finding matrix, and full copy audit. A
perfect round has zero remaining finding, zero unlisted claim, and no claim
whose test accepts a weaker result than the sentence promises.
