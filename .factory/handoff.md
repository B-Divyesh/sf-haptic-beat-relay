# Haptic Beat Relay — polish 1 handoff

## Status: ready for guarded deployment

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

The next step is the repository-owned guarded deployment of this exact pushed
commit. It will run immutable topology, 30-room relay, and five-client rate
limit checks before the final live cold-open review. This handoff is committed
with the deployment candidate because the deployment contract requires the
handoff to be part of the released source identity.

## Known gaps

None. The only remaining work is the required deployment evidence collection
against the just-released immutable revision.
