# Adversarial first-read review 1

- Product: Haptic Beat Relay
- Live URL: <https://haptic-beat-relay.sociobot.in>
- Reviewed: 2026-08-29 UTC
- Repository HEAD: `af011f1c1b97e987debafb11590eb14f5b361ab1`
- Viewports: 390 × 844 and 1440 × 900, each in a fresh Chromium context

## Verdict: FAIL

There are 2 blocking findings and 39 minor findings. The product is understandable
on first read and the real relay works, but the mobile demo does not expose the
core experience in its first viewport, and one required claim command fails.

## First screen, before scrolling

My cold-read answers were the same on phone and desktop:

- What does it do? It sends a host's beat to a friend's phone as tactile cues and
  scores the taps returned by that friend.
- For whom? Friends and rhythm-game makers who want shared timing without an
  account.
- What should I click first? **Try it with sample data**.

The exact text that supplied those answers was **“Send every beat to a friend,”**
**“For friends and rhythm-game makers who need tactile cues and shared timing
without an account,”** and **“Try it with sample data.”** This mandatory clarity
gate passes. At 390 × 844, those three elements ended at y=375, y=482, and y=563.

The phone screenshot nevertheless exposes a first-screen completeness issue:
the third plain fact starts at y=848, four pixels below the 844 px viewport. See
F-1-3.

## Findings

### Blocking

#### F-1-1 — The listed singleton-deployment claim test fails from the current clean clone

- Location: `.factory/claims.json`, claim `singleton-deployment`.
- Exact claim: **“The live relay runs as exactly one Container App replica
  because room state is process-local.”**
- Required command: `npm run test:live-topology`.
- Observed: exit 1. The verifier expected image
  `...:af011f1c1b97e987debafb11590eb14f5b361ab1`, but Azure and `/health` report
  `...:1a9cd415c5d3f6db834b57cc1e68f6f58b93b4df`.
- Why this blocks: the instructions make any failing listed claim test blocking.
  The deployed topology is singleton, but the required immutable build-identity
  assertion does not match repository HEAD.
- Concrete fix: deploy `af011f1c1b97e987debafb11590eb14f5b361ab1` with the
  guarded command, or change the release workflow so evidence-only commits do
  not invalidate the claim test. Then rerun the exact manifest command from a
  clean clone.

#### F-1-2 — The one-click demo hides the actual round and result below the phone fold

- Location: live `/demo`, 390 × 844, immediately after clicking **Try it with
  sample data**.
- Exact visible end state: **“Sample room / DEMO24 / Sam is ready.”**
- Observed positions: sample details begin at y=950, **Start sample round** at
  y=1125, round state at y=1538, and the seeded **86%** score at y=1602.
- Why this blocks: the first demo screen shows pairing, but not the core product
  in use. A phone visitor must scroll more than a viewport and click again before
  seeing a beat round, returned taps, or the shared score. The required one-click
  sample path is therefore weak on the target viewport.
- Concrete fix: place the live-round panel, seeded returned taps, and shared
  score directly below the short demo introduction, all within the first 844 px.
  Keep **Start sample round** visible there, or start the canned round on entry
  with an explicit replay control.

### Minor

#### F-1-3 — The third required plain fact is below the mobile first screen

- Location: landing page at 390 × 844.
- Exact text: **“The relay needs a connection.”**
- Observed: its box starts at y=848 and ends at y=900.
- Why: the mandatory first-screen shape calls for all three privacy/offline/price
  facts before scrolling.
- Concrete fix: reduce the mobile hero/header vertical spacing or compact the
  fact rows so all three end above y=844.

#### F-1-4 — The same participant is called both “friend” and “companion”

- Locations: **“Send every beat to a friend,”** **“one companion,”** **“Paired
  with companion,”** and **“Share its six-character code with one friend.”**
- Why: a new visitor has to infer that friend and companion mean the same role.
- Concrete fix: use **friend** throughout visitor copy, for example **“Paired
  with your friend,”** or use **companion** throughout and update the terminology
  table.

#### F-1-5 — “Music,” “audio loop,” “local loop,” and “beat loop” name the same input

- Locations: landing **“Music stays on the host device”**; landing/README uses
  **“audio loop,” “local loop,”** and **“beat loop.”**
- Why: the copy does not maintain one term for one concept.
- Concrete fix: use **audio loop** throughout. Rewrite the fact as **“Audio loops
  stay on the host device.”**

#### F-1-6 — A landing heading personifies the browser instead of naming the section

- Location: landing limits h2.
- Exact text: **“Your browser decides how haptics feel.”**
- Why: “decides” is metaphorical, and “haptics” is less direct than “vibration.”
- Concrete rewrite: **“Vibration varies by browser and device.”**

#### F-1-7 — The demo exit action does not name its result

- Location: persistent demo banner.
- Exact text: **“Start for real.”**
- Why: the link opens the host-room flow, but the label does not say that.
- Concrete rewrite: **“Create a real room.”**

#### F-1-8 — The privacy h1 is metaphorical

- Location: `/privacy` h1.
- Exact text: **“Your room leaves no account behind.”**
- Why: it does not name privacy or data handling when read out of context.
- Concrete rewrite: **“How temporary rooms handle your data.”**

#### F-1-9 — The terms h1 is too vague out of context

- Location: `/terms` h1.
- Exact text: **“Use the relay with care.”**
- Why: it sounds like advice, not the name of the terms page.
- Concrete rewrite: **“Terms for using Haptic Beat Relay.”**

#### F-1-10 — The 404 h1 uses a beat metaphor

- Location: `/404` and unknown-route h1.
- Exact text: **“This beat has no room.”**
- Why: a screen-reader heading list does not identify the error clearly.
- Concrete rewrite: **“Page not found.”** Keep the signal artwork as the visual
  treatment.

#### F-1-11 — README test-suite sentence exceeds 22 words

- Location: `README.md:33`, 25 words.
- Exact text: **“This runs TypeScript unit tests, the production container
  contract check, Rust API tests, the clean-entry-point regression, and
  Playwright in desktop and 390 px mobile views.”**
- Concrete rewrite: **“This runs TypeScript and Rust tests, the container
  contract check, and Playwright at desktop and 390 px widths. It also checks a
  clean browser entry point.”**

#### F-1-12 — README clean-entry sentence exceeds 22 words

- Location: `README.md:33`, 26 words.
- Exact text: **“The browser-test entry point builds the production frontend, so
  every claim-specific command in .factory/claims.json works after a clean npm
  ci without a separate build step.”**
- Concrete rewrite: **“The browser test command builds the production frontend
  first. Every claim command therefore works after a clean `npm ci`.”**

#### F-1-13 — README regression sentence exceeds 22 words

- Location: `README.md:48`, 25 words.
- Exact text: **“It removes only the generated frontend/dist directory, runs the
  exact previously failing claim command, and checks that the browser entry
  point rebuilt the app.”**
- Concrete rewrite: **“It deletes only `frontend/dist`. It reruns the previous
  failing claim and confirms that the browser command rebuilds the app.”**

#### F-1-14 — README rate-limit sentence exceeds 22 words

- Location: `README.md:63-65`, 23 words.
- Exact text: **“The live rate-limit check sends one fresh 45-request room burst
  and requires exactly 40 successes followed by five 429 responses with
  Retry-After: 1.”**
- Concrete rewrite: **“The live rate-limit check sends 45 room requests. It
  expects 40 successes, then five `429` responses with `Retry-After: 1`.”**

#### F-1-15 — README singleton explanation exceeds 22 words

- Location: `README.md:81`, 26 words.
- Exact text: **“The relay intentionally runs as exactly one ready Container App
  replica because its temporary room, WebSocket state, and per-client rate
  bucket are held in that process.”**
- Concrete rewrite: **“The relay runs as one Container App replica. Room,
  WebSocket, and rate-limit state lives in that process.”**

#### F-1-16 — README scale warning exceeds 22 words

- Location: `README.md:81`, 31 words.
- Exact text: **“The checked-in deployment contract pins both the minimum and
  maximum to one; it must not be scaled out without moving room state, broadcast
  delivery, and rate limiting to a shared service.”**
- Concrete rewrite: **“The deployment contract keeps the minimum and maximum at
  one replica. Do not scale out until room, broadcast, and rate-limit state use
  shared storage.”**

#### F-1-17 — README deployment-gate sentence exceeds 22 words

- Location: `README.md:104-108`, 44 words.
- Exact text begins **“It builds in ACR, forces single-revision mode…”** and ends
  **“…five-client rate-limit checks.”**
- Concrete rewrite: **“It builds the image in Azure Container Registry and uses
  one active revision. It requires the full image tag and one ready replica. It
  then runs the topology, relay, and five-client rate-limit checks.”**

#### F-1-18 — README stability sentence exceeds 22 words

- Location: `README.md:108-110`, 24 words.
- Exact text: **“It then waits 60 seconds and checks topology and build identity
  again, so a later controller rollout cannot be reported as a successful
  release.”**
- Concrete rewrite: **“It waits 60 seconds, then checks topology and build
  identity again. This catches a later controller rollout.”**

#### F-1-19 — README prose misses the 14-word average target

- Location: complete README prose audit below.
- Observed: 738 words across 51 prose/list sentences, an average of 14.47.
- Why: the plain-words target is an average of at most 14 words.
- Concrete fix: apply F-1-11 through F-1-18; those splits bring the average below
  the target without removing useful setup information.

#### F-1-20 — “Unaccelerated browser flow” is unnecessary test jargon

- Location: `README.md:35-36`.
- Exact text: **“Its claim test measures the unaccelerated browser flow and takes
  about one minute.”**
- Concrete rewrite: **“Its claim test runs in real time and takes about one
  minute.”**

#### F-1-21 — “Deployed relay boundary” obscures the action

- Location: `README.md:50-51`.
- Exact text: **“To exercise the deployed relay boundary, run the fresh
  desktop-host and 390 px companion regression against the live URL.”**
- Concrete rewrite: **“To check the live service, run the desktop-host and 390 px
  companion test against the live URL.”**

#### F-1-22 — The following README sentence stacks unexplained failure jargon

- Location: `README.md:51-53`.
- Exact text: **“It performs 30 create, connect, cue, tap, and shared-score rounds
  and fails on a room-not-open state, failed WebSocket handshake, or browser
  error.”**
- Concrete rewrite: **“It runs 30 host-and-companion rounds. It fails if a room
  cannot open, a connection fails, or the browser reports an error.”**

#### F-1-23 — The topology explanation assumes unexplained infrastructure terms

- Location: `README.md:61-63`.
- Exact text: **“It verifies one active revision, one configured and running
  replica, HTTP ingress, and a live build SHA matching the checked-out commit.”**
- Concrete rewrite: **“It confirms one deployed version, one running copy, web
  traffic support, and the same code version as the checkout.”** Put the Azure
  terms in a following operator note if they are required.

#### F-1-24 — “Forwarded client identities” is unexplained

- Location: `README.md:65-66`.
- Exact text: **“The release claim runs five such bursts under distinct forwarded
  client identities.”**
- Concrete rewrite: **“The release check repeats the burst for five separate
  simulated clients.”**

#### F-1-25 — The landing page makes an unlisted exclusion claim

- Location: landing limits section.
- Exact text: **“This tool does not stream music, match players, or include music
  files.”**
- Why: no claim entry tests these three exclusions.
- Concrete fix: add a narrowly worded claim and a test that verifies the shipped
  UI/assets and request flow, or remove the sentence.

#### F-1-26 — The runtime requirement is an unlisted claim

- Location: `README.md:15`.
- Exact text: **“Requirements: Node.js 22 or newer and stable Rust.”**
- Concrete fix: add a clean environment compatibility test and claim entry, or
  pin exact supported versions in the toolchain/package metadata and link them.

#### F-1-27 — The default-port and no-environment assertion is unlisted

- Location: `README.md:23`.
- Exact text: **“The server uses PORT=8080 by default and needs no other
  environment variables.”**
- Concrete fix: add a fresh-process claim test with an empty environment that
  checks port 8080 and `/health`, or remove “needs no other.”

#### F-1-28 — The Vite proxy assertion is unlisted

- Location: `README.md:25`.
- Exact text: **“Vite proxies room requests to port 8080.”**
- Concrete fix: add a development-server proxy contract test and claim entry, or
  present it as configuration instructions instead of an asserted outcome.

#### F-1-29 — The documented `npm test` contents are not a listed claim

- Location: `README.md:33`; same quote as F-1-11.
- Why: `claims.json` has no entry asserting the named suite components run.
- Concrete fix: add a focused test-command contract entry or shorten the README
  to the command and let its output state what ran.

#### F-1-30 — The clean browser entry guarantee is unlisted

- Location: `README.md:33`; same quote as F-1-12.
- Why: the claim says **every** claim command works after clean install, while the
  clean-entry regression exercises one selected command.
- Concrete fix: test every manifest command in the clean-entry check or narrow
  the sentence to the one behavior that is tested and list it as a claim.

#### F-1-31 — The clean-entry script's file-scope guarantee is unlisted

- Location: `README.md:48`; same quote as F-1-13.
- Why: “removes only” is a destructive-scope promise a maintainer may rely on.
- Concrete fix: add a fixture outside `frontend/dist`, run the script, assert the
  fixture remains, and list that claim; otherwise remove “only.”

#### F-1-32 — Audio playback is claimed but not covered by the local-audio test

- Location: `README.md:77`.
- Exact text: **“The host makes the audible click or plays a selected local
  loop.”**
- Why: `local-audio` proves that bytes are not uploaded, not that either sound
  plays.
- Concrete fix: add an audio-output fixture test and claim entry, or avoid
  promising playback in the README.

#### F-1-33 — The compound absence claim is only partly listed

- Location: `README.md:81`.
- Exact text: **“The service has no database, user accounts, music catalog,
  tracking script, or payment code.”**
- Why: current entries cover accounts, requests, free use, and ephemeral state,
  but do not test the absence of a music catalog or payment code.
- Concrete fix: narrow the sentence to the covered claims, or add a build/source
  scan claim for the remaining exclusions.

#### F-1-34 — The non-root container claim is unlisted

- Location: `README.md:91`.
- Exact text: **“The multi-stage image runs as a non-root user.”**
- Concrete fix: add a container test that inspects the configured user and runs
  `id`, then list the claim.

#### F-1-35 — The factory build-input claim is unlisted

- Location: `README.md:95`.
- Exact text: **“The factory builds the root Dockerfile and supplies BUILD_SHA.”**
- Concrete fix: add a release-contract claim entry that asserts both inputs, or
  move this statement to internal deployment documentation.

#### F-1-36 — The combined frontend/backend serving claim is unlisted

- Location: `README.md:95-96`.
- Exact text: **“The container serves the built frontend and relay backend
  together on PORT.”**
- Concrete fix: add a container smoke claim that requests `/` and `/health` from
  one configured port.

#### F-1-37 — The source-of-truth deployment-contract sentence is unlisted

- Location: `README.md:97-99`.
- Exact text: **“deploy/containerapp.json is the source-of-truth runtime
  contract: one active revision, exactly one running and ready replica, and HTTP
  ingress for WebSocket upgrades.”**
- Concrete fix: add this exact contract as a claim with the existing deployment
  contract test, or limit the sentence to the already listed live singleton
  claim.

#### F-1-38 — The no-volume/no-database topology claim is unlisted

- Location: `README.md:99-101`.
- Exact text: **“Its state topology is deliberately ephemeral and process-local:
  room records, WebSocket fan-out, and rate buckets have no volume or database.”**
- Concrete fix: add an infrastructure/source test for volumes and database
  dependencies, then list it as a claim.

#### F-1-39 — The deployment command's refusal cases are unlisted

- Location: `README.md:103-104`.
- Exact text: **“The command rejects a dirty tree, an unpushed commit, or a
  handoff from an earlier commit.”**
- Concrete fix: add a claim entry backed by fixture repositories for all three
  refusal cases, or move this detail to comments in the script.

#### F-1-40 — The deployment actions and gates are an unlisted compound claim

- Location: `README.md:104-108`; same 44-word quote as F-1-17.
- Why: the release-contract tests are not referenced by a claims entry for this
  sentence.
- Concrete fix: split the sentence, add a deployment-behavior claim, and point it
  at the existing release/deployment contract test.

#### F-1-41 — The 60-second release stability gate is unlisted

- Location: `README.md:108-110`; same quote as F-1-18.
- Concrete fix: add a claim entry whose test observes the wait and second
  topology/identity check, or remove this behavioral promise from public docs.

## Copy audit

Counts use Unicode word tokens; hyphenated terms and dotted filenames count as
one word. Repeated header/footer labels are listed once. Code blocks are commands,
not sentences, and are excluded. Landing text has no item above 22 words. The
README has eight over-limit sentences and a 14.47-word prose/list average.

### Landing page

| Copy | Words | Type / flag |
|---|---:|---|
| Skip to main content | 4 | link |
| Haptic Beat Relay | 3 | wordmark |
| Demo | 1 | navigation |
| Join | 1 | navigation |
| Privacy | 1 | navigation |
| One host · one companion · one beat | 6 | label; F-1-4 |
| Send every beat to a friend | 6 | h1; F-1-4 |
| For friends and rhythm-game makers who need tactile cues and shared timing without an account. | 15 | sentence; F-1-4 |
| Try it with sample data | 5 | result-naming action |
| A paired sample round opens now. | 6 | sentence |
| Create a real room | 4 | result-naming action |
| Free to use | 3 | fact |
| Music stays on the host device | 6 | fact; F-1-5 |
| The relay needs a connection | 5 | fact; F-1-3 |
| Two glowing signal posts relay amber beats across a misty night clearing. | 12 | image alt |
| One device sends the pulse. | 5 | sentence |
| The other taps it back. | 5 | sentence |
| The shared view | 3 | section label |
| See the same round on both devices | 7 | h2 |
| The host sets the pace. | 5 | sentence |
| The companion feels each cue and taps the beat back. | 10 | sentence; F-1-4 |
| Paired with companion | 3 | status; F-1-4 |
| Shared accuracy | 2 | label |
| How it works | 3 | section label |
| Run a round in three steps | 6 | h2 |
| Create a room. | 3 | step heading |
| Share its six-character code with one friend. | 7 | sentence; F-1-4 |
| Set the beat. | 3 | step heading |
| Choose the tempo or load an audio loop from your device. | 11 | sentence; F-1-5 |
| Tap it back. | 3 | step heading |
| The companion feels each cue and builds a shared score. | 10 | sentence; F-1-4 |
| Clear limits | 2 | section label |
| Your browser decides how haptics feel | 6 | h2; F-1-6 |
| Phone vibration and controller haptics vary by browser and device. | 10 | sentence |
| The screen still flashes each cue when vibration is unavailable. | 10 | sentence |
| Rooms hold only live relay messages. | 6 | sentence |
| Closing the server clears every room. | 6 | sentence |
| This tool does not stream music, match players, or include music files. | 12 | sentence; F-1-5, F-1-25 |
| Send tactile beat cues between two devices. | 7 | footer sentence |
| Terms | 1 | footer link |
| Built by Param Factory | 4 | footer link |
| Version 1.0 · Original generated environment art | 7 | footer note |

### README

| Copy | Words | Type / flag |
|---|---:|---|
| Haptic Beat Relay | 3 | heading |
| Haptic Beat Relay sends a host's beat to one companion device. | 11 | sentence; F-1-4 |
| The companion feels each cue, taps back, and builds a shared accuracy score. | 13 | sentence |
| It is for friends, music practice, and small rhythm-game prototypes. | 10 | sentence; F-1-4 |
| No account is needed, and the product is free to use. | 11 | sentence |
| A loaded audio loop stays in the host browser. | 9 | sentence; F-1-5 |
| The server relays only temporary room and timing messages. | 9 | sentence |
| Live site: https://haptic-beat-relay.sociobot.in | 4 | label |
| Try the sample | 3 | heading |
| Open http://localhost:8080/demo after starting the app. | 9 | sentence |
| The sample room is already paired and has two realistic past scores. | 12 | sentence |
| Choose Start sample round to see returned taps and the shared score over 12 seconds. | 15 | sentence |
| Demo state stays in page memory and is discarded on reset. | 11 | sentence |
| Run locally | 2 | heading |
| Requirements: Node.js 22 or newer and stable Rust. | 8 | sentence; F-1-26 |
| Open http://localhost:8080. | 4 | sentence |
| The server uses PORT=8080 by default and needs no other environment variables. | 13 | sentence; F-1-27 |
| For frontend work with live reload, run the backend and npm run dev in separate terminals. | 16 | sentence |
| Vite proxies room requests to port 8080. | 7 | sentence; F-1-28 |
| Test | 1 | heading |
| This runs TypeScript unit tests, the production container contract check, Rust API tests, the clean-entry-point regression, and Playwright in desktop and 390 px mobile views. | 25 | sentence; F-1-11, F-1-29 |
| The browser-test entry point builds the production frontend, so every claim-specific command in .factory/claims.json works after a clean npm ci without a separate build step. | 26 | sentence; F-1-12, F-1-30 |
| The real connected round is timed for 60 seconds. | 9 | sentence |
| Its claim test measures the unaccelerated browser flow and takes about one minute. | 13 | sentence; F-1-20 |
| To run the verifier regression by itself: | 7 | instruction |
| It removes only the generated frontend/dist directory, runs the exact previously failing claim command, and checks that the browser entry point rebuilt the app. | 25 | sentence; F-1-13, F-1-31 |
| To exercise the deployed relay boundary, run the fresh desktop-host and 390 px companion regression against the live URL. | 19 | sentence; F-1-21 |
| It performs 30 create, connect, cue, tap, and shared-score rounds and fails on a room-not-open state, failed WebSocket handshake, or browser error. | 22 | sentence; F-1-22 |
| The topology check uses read-only Azure queries. | 7 | sentence |
| It verifies one active revision, one configured and running replica, HTTP ingress, and a live build SHA matching the checked-out commit. | 21 | sentence; F-1-23 |
| The live rate-limit check sends one fresh 45-request room burst and requires exactly 40 successes followed by five 429 responses with Retry-After: 1. | 23 | sentence; F-1-14 |
| The release claim runs five such bursts under distinct forwarded client identities. | 12 | sentence; F-1-24 |
| How it works | 3 | heading |
| POST /api/rooms opens an in-memory room and returns a six-character code. | 12 | list item |
| One companion joins through POST /api/rooms/:code/join. | 9 | list item |
| A WebSocket relays beat, tap, presence, and score messages. | 9 | list item |
| The host makes the audible click or plays a selected local loop. | 12 | list item; F-1-5, F-1-32 |
| The companion uses phone vibration or a connected gamepad when supported. | 11 | list item |
| The screen flashes each cue when vibration is unavailable. | 9 | list item |
| Rooms expire after two hours and disappear on server restart. | 10 | sentence |
| The relay intentionally runs as exactly one ready Container App replica because its temporary room, WebSocket state, and per-client rate bucket are held in that process. | 26 | sentence; F-1-15 |
| The checked-in deployment contract pins both the minimum and maximum to one; it must not be scaled out without moving room state, broadcast delivery, and rate limiting to a shared service. | 31 | sentence; F-1-16 |
| The service has no database, user accounts, music catalog, tracking script, or payment code. | 14 | sentence; F-1-33 |
| Container | 1 | heading |
| The multi-stage image runs as a non-root user. | 8 | sentence; F-1-34 |
| /health reports the build SHA. | 5 | sentence |
| API routes use the first X-Forwarded-For address. | 7 | sentence |
| Each client may make exactly 40 room API requests per second; later requests return 429 with Retry-After. | 17 | sentence |
| Deploy | 1 | heading |
| The factory builds the root Dockerfile and supplies BUILD_SHA. | 9 | sentence; F-1-35 |
| The container serves the built frontend and relay backend together on PORT. | 12 | sentence; F-1-36 |
| deploy/containerapp.json is the source-of-truth runtime contract: one active revision, exactly one running and ready replica, and HTTP ingress for WebSocket upgrades. | 22 | sentence; F-1-37 |
| Its state topology is deliberately ephemeral and process-local: room records, WebSocket fan-out, and rate buckets have no volume or database. | 20 | sentence; F-1-38 |
| Finalize .factory/handoff.md, commit every release file, and push that commit before running npm run deploy -- <full-git-sha> as the last release step. | 22 | sentence |
| The command rejects a dirty tree, an unpushed commit, or a handoff from an earlier commit. | 16 | sentence; F-1-39 |
| It builds in ACR, forces single-revision mode, applies the scale and transport settings, and fails unless the active revision uses that full immutable image tag with its SHA-derived revision suffix, has one ready replica, and passes the live topology, relay, and five-client rate-limit checks. | 44 | sentence; F-1-17, F-1-40 |
| It then waits 60 seconds and checks topology and build identity again, so a later controller rollout cannot be reported as a successful release. | 24 | sentence; F-1-18, F-1-41 |
| Do not make another candidate commit after it passes; a later commit needs its own guarded deploy. | 17 | sentence |
| Project records | 2 | heading |
| .factory/design.md — visual system and art provenance | 7 | list item |
| .factory/demo.md — sample sandbox contract | 5 | list item |
| .factory/claims.json — public claims and proof commands | 7 | list item |
| .factory/handoff.md — verification record | 4 | list item |
| Licensed under the MIT License. | 5 | sentence |

No banned marketing adjective appears. Apart from **Start for real**, actionable
buttons use result-naming verbs.

## Claim test results

All commands were run independently after `npm ci` in a local clean clone of
repository HEAD.

| Claim | Result | Evidence |
|---|---|---|
| `demo-sandbox` | PASS | Started/reset sample; no API requests or browser storage. |
| `sample-duration` | PASS | Observed completion after 12 seconds. |
| `local-audio` | PASS | Marked fixture bytes were not sent. |
| `no-third-party` | PASS | Requests remained on the product origin. |
| `no-account` | PASS | Room opened without sign-in. |
| `free-use` | PASS | No purchase or payment gate. |
| `shared-score` | PASS | Two contexts exchanged cue, tap, and equal score. |
| `live-relay` | PASS | 30/30 API and desktop-host/390 px companion rounds passed. |
| `ephemeral-rooms` | PASS | TTL eviction and restart isolation passed. |
| `rate-limit` | PASS | Five clients each received 40 successes then five 429s. |
| `health` | PASS | `/health` returned status and build SHA. |
| `connection-required` | PASS | Offline room creation showed recovery text. |
| `visual-cue` | PASS | Cue state appeared without vibration support. |
| `haptic-output` | PASS | `vibrate(45)` and controller dual-rumble were observed. |
| `real-round-duration` | PASS | Active at 59 seconds; complete at 60 seconds. |
| `singleton-deployment` | **FAIL** | Live image/build is `1a9cd41…`; clean-clone HEAD is `af011f1…`. |

F-1-25 through F-1-41 identify every claim-like live/README sentence that has
no matching manifest entry or extends beyond what its apparent entry tests.

## Demo and sandbox evidence

- One landing click opens `/demo` with `DEMO24`, Sam, 104 BPM, the Night practice
  click, two past scores, and a seeded 86% round.
- The banner persists and says **“Demo — sample data, nothing is saved”** with
  **Reset demo** and **Start for real**.
- After 1.7 seconds, the sample showed 3 returned taps and 91%.
- Reset restored 86%, round 3, and “No returned taps yet.”
- The complete landing → demo → start → reset request log contained only the
  document and self-hosted JS, CSS, image, and favicon. It made no `/api` or
  third-party request.
- `localStorage`, `sessionStorage`, and IndexedDB were empty before and after the
  demo. Demo code uses only page memory. Real room storage was never read.
- The service-worker-only offline reload test passed. The product does not make
  a public offline claim.

## History verification

No earlier `.factory/review-*.md` or `.factory/polish-*.md` files exist. The
existing handoff records the earlier multi-replica/Auto-ingress failure. That
specific defect is fixed live: with the deployed SHA supplied explicitly, the
topology check reports one active revision, min/max 1, one running and ready
replica, HTTP transport, revision `sf-haptic-beat-relay--r1a9cd415c5`, and the
matching full image tag. It has not regressed. F-1-1 is the new mismatch between
that deployed candidate and current repository HEAD.

## Structure, routing, accessibility, and visual identity

- `/`, `/demo`, `/host`, `/join`, `/privacy`, and `/terms` return 200. `/404` and
  an unknown path return 404 with the designed signal-loss page and a route home.
- Every route has one h1, one main landmark, `lang=en`, a route-specific title,
  and an updated canonical URL. The shared description, OG/Twitter metadata,
  1200 × 630 social image, SVG favicon, and 180 × 180 apple-touch icon are present.
- `robots.txt`, `sitemap.xml`, and all internal/external links resolve. The only
  non-HTTP link is the explicit privacy email.
- SPA navigation focuses the new h1. Back restored the landing route, h1 focus,
  and scroll y=500; forward restored the demo route, h1 focus, and scroll y=0.
- All visible mobile controls measured at least 44 × 44 px. Reduced motion
  reduces transitions/animation to `0.00001s`. No horizontal overflow appeared
  locally at normal or 200% text.
- `/opt/fleet/lib/verify-url.sh` passed the live home page with no console errors.
  Standalone Axe reported zero violations on all seven public routes. Direct 404
  navigation produces Chromium's expected failed-document resource message, not
  an application exception.
- The midnight rehearsal clearing, amber/cyan signal language, clipped controls,
  and relay animation are recognisably product-specific. This is not a generic
  centred SaaS hero or three-card template.

## Other verification

- `npm test`: PASS — 3 Vitest tests, release/deployment contract checks, 10 Rust
  tests, clean-entry regression, and 36 passing Playwright tests with 2 expected
  project skips.
- `npm run build`: PASS — `frontend/dist` produced; JS 23.16 kB raw / 7.84 kB
  gzip and CSS 15.59 kB raw / 4.21 kB gzip.
- Live `/health`: 200 with build `1a9cd415c5d3f6db834b57cc1e68f6f58b93b4df`.
- Live response headers include the self-only CSP, `frame-ancestors 'none'`,
  `nosniff`, strict-origin referrer policy, and `no-cache` HTML.

## Missed leverage

No additional AI feature is justified. Beat relay, local audio, joining, cueing,
tapping, and shared scoring already cover the brief. Adding model calls would add
cost and a privacy boundary without improving the core timing task. Import,
export, or sync is not an obvious missing requirement for ephemeral two-person
rounds.

## What would make this perfect

Resolve every finding above, redeploy the exact reviewed HEAD, and rerun all 16
claim commands from a clean clone. The acceptance target is then zero blocking
and zero minor findings; there is no additional feature recommendation beyond
those concrete fixes.
