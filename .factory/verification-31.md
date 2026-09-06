# Send beat cues to a friend's phone — verification 31

## Verdict: PASS

- **Implementation candidate reviewed:** `eaa617649adcaf745ef3aac9e7740a85fc24ff94`
- **Deployment-record documentation SHA:** `48f512029a30bb300a8b59d4c79f1942124eb69a`
- **Final release-report documentation SHA:** `41f4443b9905e641cee6d096df042b9375879cf7`
- **Clean verification checkout:** `41f4443b9905e641cee6d096df042b9375879cf7`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verified:** 2026-09-06 UTC
- **Findings:** 0 at every severity
- **Untested public claims:** 0

The deployed `/health` response, active revision, immutable image, and post-restart topology all identify implementation `eaa617649…`. The later documentation commits do not change the product runtime.

## Job, audience, and first action

Before scrolling, fresh 1440 × 900 desktop and 390 × 844 phone browsers show:

- **Job:** Send beat cues to a friend's phone.
- **Audience:** Friends and rhythm-game makers who need phone vibration cues and a shared timing score without an account.
- **First action:** **Try it with sample data**. It says a paired sample round opens now.

Both screens show the three facts: free to use, audio loops stay on the host device, and the relay needs a connection. Each had one main landmark, no console error, and the required content fit in its first viewport.

## Sample, normal, invalid, boundary, and recovery paths

The one-click phone sample showed Sam, an 86% shared score, three returned taps, and the persistent **Demo — sample data, nothing is saved** label. The label remained while the round was active. **Reset demo** restored 86% and three taps. The sample made no `/api/` or external request and left local and session storage empty, so it did not change a real room.

A fresh live host created a room; a fresh phone friend joined it. A programmatic click left the host locked. A real **Enable vibration** tap enabled the host start button. Chromium accepted the activation pulse and the first relayed vibration (`true` for 30 ms and 45 ms) with no console error. This verifies the repair for review 5 F-5-1. Physical motor movement remains dependent on the phone and browser.

The API returned 400 for a malformed code, 404 for an unknown room, 200 for a room creation and first friend join, and 409 for a second friend. The offline, invalid-code focus recovery, visual-cue fallback, Space tap, reconnect, and 60-second round paths passed their declared browser tests. After a restart, room `LHJRTN` remained joinable and a new room write succeeded.

## Declared claims

I ran `npm ci` in a separate clean clone at `41f4443…`, then ran every command from `.factory/claims.json` exactly as declared. All 22 exited zero.

| Claim | Result |
| --- | --- |
| `demo-sandbox`, `sample-duration`, `sample-tempo` | PASS — one-click seeded round, private reset, 12 seconds, 104 BPM |
| `tempo-and-loop-controls`, `local-audio` | PASS — 180 BPM and local audio; fixture bytes not sent |
| `no-third-party`, `no-account`, `free-use` | PASS — product-origin only; no sign-in or payment gate |
| `copy-room-link`, `shared-score`, `visual-cue`, `space-key-tap` | PASS — usable link/fallback, score, visual cue, and keyboard tap |
| `live-relay` | PASS — 30/30 API create→join and 30/30 reconnecting desktop/phone rounds |
| `ephemeral-rooms`, `database-path` | PASS — SQLite restart/expiry and all documented path choices |
| `rate-limit` | PASS — five live clients each received 40 accepts, then five 429s with `Retry-After: 1` |
| `health`, `connection-required`, `haptic-output`, `real-round-duration` | PASS — build identity, offline recovery, trusted native vibration, and measured 60 seconds |
| `singleton-deployment`, `public-records` | PASS — one ready `/data` replica and public version/license/art records |

## Quality, accessibility, privacy, and routes

- `npm test`: PASS from the clean clone: four Vitest tests, three release identity tests, Rust format and strict Clippy, contracts, 18 Rust tests, clean entrypoint, and 42 Playwright tests. The Playwright result was `passed`; intentional project skips remain skips.
- `npm run build`: PASS. It produced 27.99 KB JavaScript (9.25 KB gzip) and 18.40 KB CSS (4.76 KB gzip).
- Fresh live Axe scans covered `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`, `/404`, and an unknown route at desktop and phone widths: 16 scans, zero serious or critical violations, one h1 and one main per route, no horizontal overflow, and correct route titles after SPA navigation.
- Keyboard verification found the skip link first, a 3 px focus outline, and correct `#main` navigation. Reduced motion reported `scroll-behavior: auto` and `0.00001s` transitions.
- The complete local browser suite passed service-worker offline reload and update behavior, 200% text, touch targets, form labels/errors, legal routes, all rendered links, and security/privacy checks. The demo had no analytics, third-party runtime request, account, payment, or real-data write.
- `/404` and an unknown route deliberately return HTTP 404 with the designed page. Chromium logs that expected failed navigation response; it is not a broken page or a product console defect.

## Backend, persistence, and live identity

- `/health` returned `{ "build_sha": "eaa617649…", "status": "ok" }`.
- Topology before and after restart found one active revision `sf-haptic-beat-relay--reaa617649a`, one running/ready replica, HTTP transport, min/max one, `/data`, and image `sociobotregistry.azurecr.io/sf-haptic-beat-relay:eaa617649adcaf745ef3aac9e7740a85fc24ff94`.
- The restart command replaced replica `…-rc2rl` with `…-lgb7x`, retained the room, and completed a new write. A subsequent 30-round live relay proof passed.
- The five-client rate proof returned exactly 40 successes and five 429 responses with `Retry-After: 1` for every client.

## Earlier findings disposition

All earlier review and verification finding groups were inspected. Reviews 1–3 plain-language, demo, routes, claims, accessibility, privacy, and release identity fixes remain covered by the clean suite and live scans. Verification 2–28 expiry, offline, touch target, 404, invalid-file, Docker, clean-start, replica, persistence, score, and formatting fixes remain covered by the same checks. Review 4 F-4-1 remains fixed because the default topology command uses the recorded implementation SHA. Review 5 F-5-1 is fixed by the fresh trusted-tap native-vibration proof above.

## Final result

**PASS.** There are zero findings of every severity and zero untested public claims. No product code was changed during this verification.
