# Send beat cues to a friend's phone — verification 30

## Verdict: PASS

- **Implementation candidate reviewed:** `1964c68a15d95639acddeaf011e778d479bc4895`
- **Release-record documentation SHA:** `f1441e4893d4c6f30bbf4d18262594c5b3fd7023`
- **Verification checkout:** `3976ed04a7b47b5d0db3b7808ca6c47b49145e27`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-09-05 UTC
- **Findings:** 0 at every severity
- **Untested public claims:** 0

The later commits repair and document release verification. They do not change
the deployed product runtime. The live health response, image tag, revision,
and built frontend bytes all identify implementation `1964c68…`.

## Job, audience, and first action

Before scrolling, fresh 1440 × 900 desktop and 390 × 844 phone browsers show:

- **Job:** “Send beat cues to a friend's phone.”
- **Audience:** friends and rhythm-game makers who need phone vibration cues
  and a shared timing score without an account.
- **First action:** **Try it with sample data**, followed by “A paired sample
  round opens now.”

Both first screens also show the three facts: free to use, audio loops stay on
the host device, and the relay needs a connection. Evidence is in
`.factory/evidence/verification-30/live-desktop-first-screen.png` and
`.factory/evidence/verification-30/live-phone-first-screen.png`.

## Sample and real room

One click opened the populated sample. It showed Sam, an 86% score, three
returned taps, the 104 BPM setup, and the persistent **Demo — sample data,
nothing is saved** label. The label remained during the round. **Reset demo**
restored 86% and three taps.

The sample made zero `/api/` requests and wrote zero local or session storage
keys. It therefore could not read or change a real room. A separate fresh
desktop host and 390 px phone friend joined room `XGASFP`. The friend pressed
Space, and both screens showed the same non-zero 40% score and one returned
tap, with no console or page error.

Recovery and boundary checks passed. `A2` produced a clear six-character
validation message and returned focus to the input. An unopened code produced
the room-not-open message. API checks returned 400 for malformed input, 404 for
an unknown room, 200 for the first friend, and 409 for a second friend.

## Declared claims

I cloned remote `main` into a new directory, confirmed checkout `3976ed0…`,
and ran `npm ci`. I then ran every command from `.factory/claims.json` exactly
as declared and in manifest order. All 22 commands exited zero.

| Claim | Command | Result |
| --- | --- | --- |
| `demo-sandbox` | `npm run test:browser -- --grep @claim:demo-sandbox` | PASS — populated sample, reset, no API or storage writes |
| `sample-duration` | `npm run test:browser -- --grep @claim:sample-duration` | PASS — measured 12-second finish |
| `sample-tempo` | `npm run test:browser -- --grep @claim:sample-tempo` | PASS — measured 104 BPM cue intervals |
| `tempo-and-loop-controls` | `npm run test:browser -- --grep @claim:tempo-and-loop-controls` | PASS — 180 BPM and local audio selection |
| `local-audio` | `npm run test:browser -- --grep @claim:local-audio` | PASS — marked fixture bytes were not sent |
| `no-third-party` | `npm run test:browser -- --grep @claim:no-third-party` | PASS — only product-origin requests |
| `no-account` | `npm run test:browser -- --grep @claim:no-account` | PASS — room created without sign-in |
| `free-use` | `npm run test:browser -- --grep @claim:free-use` | PASS — no payment gate |
| `copy-room-link` | `npm run test:browser -- --grep @claim:copy-room-link` | PASS — usable URL and blocked-copy guidance |
| `shared-score` | `npm run test:browser -- --grep @claim:shared-score` | PASS — cue, tap, and equal score |
| `live-relay` | `RELAY_ROUNDS=30 npm run test:live-relay` | PASS — 30 API rooms and 30 reconnecting browser pairs |
| `ephemeral-rooms` | `cargo test claim_ephemeral_rooms_persist_across_restart_until_the_configured_ttl` | PASS — restart survival and expiry |
| `rate-limit` | `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` | PASS — each client received 40 accepts, then five 429s with `Retry-After: 1` |
| `health` | `npm run test:browser -- --grep @claim:health` | PASS — build identity present |
| `connection-required` | `npm run test:browser -- --grep @claim:connection-required` | PASS — offline room recovery message |
| `visual-cue` | `npm run test:browser -- --grep @claim:visual-cue` | PASS — visual cue without vibration |
| `space-key-tap` | `npm run test:browser -- --grep @claim:space-key-tap` | PASS — Space returned one tap |
| `haptic-output` | `npm run test:browser -- --grep @claim:haptic-output` | PASS — phone vibration and controller rumble calls |
| `real-round-duration` | `npm run test:browser -- --grep @claim:real-round-duration` | PASS — active at 59 seconds, complete at 60 |
| `singleton-deployment` | `npm run test:live-topology` | PASS — exact default command used `1964c68…` |
| `database-path` | `cargo test claim_database_path_uses_an_explicit_path_then_data_or_the_executable_directory` | PASS — all documented path choices |
| `public-records` | `npm run test:browser -- --grep @claim:public-records` | PASS — version, MIT license, and art record |

The landing page, live room pages, Privacy, Terms, README, and footer were
cross-checked against the manifest. No public claim is missing or untested.
The brief does not imply an AI, import, export, or account feature for this
short-lived two-device relay.

## Quality, accessibility, privacy, and site structure

- `npm test`: PASS. This included four Vitest tests, three release-identity
  tests, Rust format and strict Clippy, release/deployment/handoff checks, 18
  Rust tests, clean browser startup, and 42 passing Playwright tests with eight
  deliberate project skips.
- `npm run build`: PASS. Output is 26,101-byte JavaScript and 17,673-byte CSS.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100,
  and SEO 100. LCP was 1.5 s, total blocking time 20 ms, CLS 0, and total
  transfer 168 KiB.
- `/opt/fleet/lib/verify-url.sh`: PASS in 595 ms with title, `lang=en`, one
  h1, one main, complete image text, labeled controls, and no console errors.
- Fresh Axe scans covered eight routes at desktop and phone sizes: 16 scans,
  zero serious or critical violations. Normal routes had no console or page
  errors and no horizontal overflow.
- Every phone control on seven routes met 44 px. All seven routes kept their
  content at 200% text size without horizontal overflow.
- Keyboard checks passed the first-focus skip link, its 3 px focus outline,
  Enter activation, route focus, Space tap, and invalid-form focus recovery.
- Reduced motion matched the media query, reduced beat animation to
  `0.00001s`, and disabled smooth scrolling.
- The service worker was active, accepted an update check, controlled the
  page, and reloaded the complete demo after browser cache was cleared and the
  context went offline.
- All rendered links resolved. The privacy email is an explicit `mailto:`.
  `/404` and an unknown path returned deliberate HTTP 404 responses with the
  designed page and route home; they are expected behavior.
- Privacy and terms pages are present. The demo request log was product-origin
  only, with no API, analytics, font, script, account, or payment request.
- HTML is `no-cache`; hashed assets are immutable for one year. The response
  has a self-only CSP, `frame-ancestors 'none'`, `nosniff`, and strict referrer
  policy. `robots.txt`, `sitemap.xml`, canonical links, route titles, social
  metadata, favicon, and app icon are present.

## Backend and implementation identity

- `/health` returned status `ok` and build
  `1964c68a15d95639acddeaf011e778d479bc4895`.
- The default topology command found one active revision
  `sf-haptic-beat-relay--r1964c68a15`, one running and ready replica, min/max
  one, HTTP ingress, `/data`, and `sf-haptic-beat-relay-data`.
- The full-SHA live image is
  `sociobotregistry.azurecr.io/sf-haptic-beat-relay:1964c68a15d95639acddeaf011e778d479bc4895`.
- Live JavaScript and CSS SHA-256 values exactly matched the clean local build.
  Runtime source files are unchanged between implementation `1964c68…` and
  verification checkout `3976ed0…`.
- `npm run test:live-persistence` restarted only this product revision. Room
  `GZ43CF` remained joinable, a new room write succeeded, and the replacement
  replica kept the implementation identity.
- After restart, topology passed again, a three-round reconnecting relay passed,
  and five more clients each received exactly 40 accepts and five 429 responses
  with `Retry-After: 1`.
- A 100-request concurrent smoke test with separate client identities returned
  100 HTTP 200 responses.

## Earlier findings disposition

| Earlier findings | Current disposition and fresh proof |
| --- | --- |
| Initial verification clean-checkout blank page; verification 28 cold-start timeout | Fixed. The first claim in a clean clone built Rust from an empty cache and passed. The clean-entry regression and full suite passed. |
| Verification 2 expiry, offline reload, touch target, real 404, and invalid-file findings | Fixed. The matching Rust and browser tests passed. Fresh offline, 44 px, 200% text, and designed-404 checks also passed. |
| Verification 3 Docker Rust tag | Fixed. The release contract accepted `rust:1-slim`; strict Clippy and the locked native build passed. |
| Verifications 4–18 and 20–22 split replicas, stale topology, broken joins, and unstable allowance | Fixed. One ready HTTP replica uses `/data`; 30/30 reconnecting rounds and both five-client exact allowance runs passed. |
| Verifications 23–24 missing or zero acknowledged scores | Fixed. The 30-round delayed-score test and fresh live room both produced equal, non-zero scores. |
| Verification 27 nondeterministic browser gate and rustfmt | Fixed. `npm test`, Rust format, and the 30-round local regression passed. |
| Review 1 F-1-1; review 2 F-2-1; review 3 F-3-1 | Fixed. Live image, revision, health, and topology all match implementation `1964c68…`. |
| Review 1 F-1-2–F-1-10; review 2 F-2-8, F-2-13; review 3 F-3-2, F-3-3, F-3-8 | Fixed. Fresh phone and desktop first screens show the job, audience, action, facts, and populated demo. Route headings use plain names. |
| Review 1 F-1-11–F-1-24; review 2 F-2-2–F-2-4 and F-2-9–F-2-12 | Fixed. The copy audit has no sentence over 22 words, no banned word, and consistent visitor terms. The current README was manually rechecked. |
| Review 1 F-1-25–F-1-41; review 2 F-2-5–F-2-7 and F-2-14–F-2-25; review 3 F-3-4 and F-3-6–F-3-7 | Fixed. All current promises map to 22 passing claim commands, including audio failure, copy fallback, Space, records, paths, haptics, and deployment outcomes. |
| Review 3 F-3-5 handoff gate | Fixed. The handoff contract passed and records separate implementation and documentation identities. |
| Review 4 F-4-1 release-identity regression | Fixed. The exact default `npm run test:live-topology` passed from checkout `3976ed0…` against implementation `1964c68…`; all three identity regression tests passed. |

## Final result

**PASS.** There are zero findings of every severity and zero untested claims.
No product code was changed during this verification.
