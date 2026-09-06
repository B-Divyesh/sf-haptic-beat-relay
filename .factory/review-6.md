# Send beat cues to a friend's phone — review 6

## Verdict: PASS

**PASS.** There are **zero findings** at every severity and **zero untested public claims**.

- **Implementation candidate reviewed:** `eaa617649adcaf745ef3aac9e7740a85fc24ff94`
- **Documentation checkout reviewed:** `626eebda3715e4d96d4481b8eb5ee0f3eddabc02`
- **Clean checkout used for commands:** `626eebda3715e4d96d4481b8eb5ee0f3eddabc02`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Reviewed:** 2026-09-06 UTC

The live health response, full immutable image tag, and active revision identify the implementation candidate. The later checkout contains verification reports only and does not change the deployed product.

## Job, audience, and first action

Before scrolling, fresh 1440 × 900 desktop and 390 × 844 phone browsers show:

- **Job:** Send beat cues to a friend's phone.
- **Audience:** Friends and rhythm-game makers who need phone vibration cues and a shared timing score without an account.
- **First action:** **Try it with sample data**. It says that a paired sample round opens now.

Both first screens also show the required three facts: free to use, audio loops stay on the host device, and the relay needs a connection. The phone has no horizontal overflow. Both loads had no product console errors.

## Sample and user paths

The phone sample opened directly at `/?demo=1` and showed Sam, 86% shared accuracy, and three returned taps. Its persistent **Demo — sample data, nothing is saved** label remained present after **Start sample round** changed the state to “Listen for the pulse.” **Reset demo** restored 86% and three returned taps. The fresh demo made zero `/api/` requests and left local and session storage empty, so it did not read or write a real room.

The complete clean browser suite passed normal room creation and joining, invalid-code recovery, unknown and second-friend responses, offline recovery, visual-cue fallback, Space tap, copied join link and blocked-clipboard recovery, local-audio rejection, reconnect, and a measured 60-second round. It also passed the service-worker offline reload and update coverage.

The haptic path passed in both the full suite and its exact declared command. A programmatic attempt cannot ready the friend. A trusted **Enable vibration** tap permits the host to start, uses Chromium's native vibration API, and covers controller rumble. Physical motor movement remains browser- and device-dependent, as the product says.

## Claims and clean quality gates

I ran `npm ci` in a new clone at `626eebd…`, then ran every command in `.factory/claims.json` exactly as declared. An early manifest loop left a stale local test server while moving between browser commands; I did not treat that interruption as evidence. I reran the interrupted `space-key-tap` and `haptic-output` exact commands in an isolated session, and then ran the full suite. All 22 declared claims have passing observable coverage and none is untested.

| Claim group | Result |
| --- | --- |
| Sample, tempo, local audio, privacy, account, and free use | PASS |
| Copy link, shared score, visual cue, and Space tap | PASS |
| Ephemeral rooms, database path, health, and real duration | PASS |
| Haptic activation and output | PASS |
| Live relay, rate limit, and singleton deployment | PASS |
| Public records | PASS |

`npm test` passed: four Vitest tests, three release-identity tests, Rust format and strict Clippy, all release/deployment/handoff contracts, 18 Rust tests, the clean-entrypoint check, and 42 Playwright tests (eight intentional project skips). `npm run build` passed and produced 27.99 KB JavaScript (9.25 KB gzip) and 18.40 KB CSS (4.76 KB gzip).

## Live backend checks

- The 30-round live relay check passed: 30/30 fresh API create→join checks and 30/30 reconnecting desktop-host/390 px friend rounds agreed on the score.
- Five distinct forwarded identities each received exactly 40 room API accepts, then five `429` responses with `Retry-After: 1`.
- The topology check found one active revision, one configured/running/ready replica, HTTP transport, `/data` mounted from the product data volume, and image and health SHA `eaa617649adcaf745ef3aac9e7740a85fc24ff94`.
- The restart-persistence check replaced the replica, kept room `SLJZHU` joinable, and wrote a new room after restart.

## Accessibility, privacy, routes, and legal pages

Fresh Axe scans of `/`, `/demo`, `/host`, `/join`, `/privacy`, `/terms`, `/404`, and an unknown route at both desktop and phone widths found zero serious or critical violations. Each scan had one `h1`, one `main`, a route-specific plain-language title, no horizontal overflow, and no product console error. `/404` and the unknown URL deliberately return HTTP 404 with the designed recovery page; that is expected behavior, not a defect.

The full clean browser suite also passed the skip-link/focus route flow, labels and errors, 44 px visible targets, 200% text, reduced motion, rendered links, security headers, third-party-request restrictions, and legal pages.

## Earlier findings disposition

I inspected every earlier review and verification record, including the minor findings. All remain closed:

| Earlier finding groups | Current proof |
| --- | --- |
| Review 1 F-1-1–F-1-41; review 2 F-2-1–F-2-25; review 3 F-3-1–F-3-8 | Clean suite/build, copy audit, first-screen checks, exact claim coverage, and live route scans pass. The original wording, first-fold, demo, navigation, unlisted-claim, and release-identity issues do not recur. |
| Review 4 F-4-1 | `npm run test:live-topology` passed from the later documentation checkout because it uses the recorded implementation SHA. |
| Review 5 F-5-1 | The trusted native-vibration proof and exact `haptic-output` command pass; the host remains locked before the friend's trusted activation. |
| Verifications 2–28 | The clean and live checks cover expiry, offline/update behavior, targets, invalid file and 404 behavior, Docker/release contracts, clean startup, replica topology, persistence, score replay, timing, and formatting. |
| Verifications 29–31 | Their conclusions remain confirmed by this fresh clean checkout, fresh viewports, live routes, 30-round relay, five-client allowance, and restart check. |

## Evidence

- Phone first screen: `/work/.evidence/review-6-live-phone.png`
- Desktop first screen: `/work/.evidence/review-6-live-desktop.png`
- This report and the machine result: `/work/.evidence/qa-report.md` and `/work/.evidence/qa-result.json`

No product code changed during this review.
