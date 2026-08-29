# Haptic Beat Relay — polish 1 handoff

## Status: verified and released

- **Work order:** `haptic-beat-relay-polish-1`
- **Repair base:** `1a9cd415c5d3f6db834b57cc1e68f6f58b93b4df`
- **Review repaired:** [review-1.md](review-1.md)
- **Finding map:** [polish-1.md](polish-1.md)
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Date:** 2026-08-29 UTC

## Delivered repair

- Added direct isolated sample entry at `?demo=1`, with its persistent banner,
  reset control, and explicit **Create a real room** exit.
- Redesigned the phone demo so the live paired round, seeded returned taps,
  shared score, and start action fit in the 390 × 844 first viewport.
- Rewrote the landing, legal headings, docs, and terminology in plain words.
- Removed every unlisted or unproved README promise; retained public claims in
  [claims.json](claims.json), each with exactly one tagged observable test.
- Added route-specific metadata updates and test coverage for title,
  description, canonical, Open Graph, and Twitter values.
- Updated the catalog sentence, demo guide, copy audit, screenshots, and
  review-to-repair mapping without changing the midnight rehearsal visual system.

## Local evidence

| Check | Result |
|---|---|
| Clean dependency install | `npm ci` passed; 59 packages, 0 vulnerabilities. |
| Full quality suite | `npm test` passed: 3 Vitest tests, release and deployment contracts, 10 Rust tests, clean-entry check, and 38 Playwright tests (2 expected project skips). |
| Production build | `npm run build` passed. JS: 24.30 kB raw / 8.17 kB gzip. CSS: 17.42 kB raw / 4.56 kB gzip. |
| Focused route/mobile suite | 5 passed, 1 expected desktop-only skip: metadata, one-h1, 200% text, overflow, 44 px controls, and both first-viewports. |
| Local URL smoke | `verify-url.sh http://127.0.0.1:8080` passed: title, `lang=en`, one h1/main, image alt, button names, and no console errors. |
| Local mobile evidence | [landing-mobile.png](evidence/polish-1/landing-mobile.png) and [demo-mobile.png](evidence/polish-1/demo-mobile.png) show the 390 × 844 first screens. |

## Deployment and live recheck

The guarded deployment of
`ffabc807c1c2488efb85f79c74d089956a32dfb4` completed through ACR. The release
script passed its initial and final topology checks around its 60-second
stability hold, its 30 fresh relay rounds, and its five-client rate-limit gate.
The observed live topology was:

```json
{
  "revision": "sf-haptic-beat-relay--rffabc807c1",
  "activeRevisions": 1,
  "minReplicas": 1,
  "maxReplicas": 1,
  "runningReplicas": 1,
  "readyReplicas": 1,
  "transport": "Http",
  "image": "sociobotregistry.azurecr.io/sf-haptic-beat-relay:ffabc807c1c2488efb85f79c74d089956a32dfb4",
  "buildSha": "ffabc807c1c2488efb85f79c74d089956a32dfb4"
}
```

Cold live checks passed:

- `verify-url.sh` returned HTTPS 200 with no console errors, `lang=en`, one
  h1/main, usable title, image alt text, and button names.
- Playwright Axe found zero serious or critical violations on `/`, `/?demo=1`,
  `/privacy`, `/terms`, and `/404`.
- [live demo screenshot](evidence/polish-1/live/demo-mobile.png) confirms the
  390 × 844 first viewport includes the paired sample, returned taps, score,
  and start control. [Live landing screenshot](evidence/polish-1/live/landing-mobile.png)
  confirms all three plain facts are visible.
- `RELAY_EXPECTED_SHA=ffabc807c1c2488efb85f79c74d089956a32dfb4 npm run
  test:live-topology` passed after deployment.

## Known gaps

None.
