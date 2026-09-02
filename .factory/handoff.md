# Haptic Beat Relay — polish 3 handoff

## Outcome

All review findings are closed. The final release uses the guarded deployment
command and verifies its live build identity before reporting success.

## What changed

- Rewrote the first screen around the concrete job: send beat cues to a
  friend's phone.
- Kept all three landing facts inside the 1440 × 900 and 390 × 844 first
  viewports.
- Rebuilt the sample beat layout as a desktop two-column stage. The start action,
  seeded 86% score, and three returned taps are visible without scrolling.
- Gave the desktop sample heading its own wider column so it never runs beneath
  the live-round panel.
- Kept `?demo=1` and `/demo` isolated in page memory. The persistent banner
  offers reset and real-room exit actions.
- Replaced the unproved audible fallback message with a visual-cue recovery
  message.
- Added claim coverage for tempo and local-loop controls, joining-button
  activation, and public release records.
- Removed decorative landing labels, updated route and social titles, and
  recorded the generated-art source SHA-256.

## Verification

- `npm run build` completes with a 8.67 KB gzip JavaScript entry and 4.63 KB
  gzip CSS entry.
- `npm test` passes its unit, Rust, deployment-contract, clean-entry, and
  browser stages.
- Every command in `.factory/claims.json` is run from a fresh clone after the
  guarded deployment. This includes the 30-round live relay, five-client
  allowance, and immutable topology checks.
- Browser coverage checks desktop 1440 × 900 and mobile 390 × 844 layouts.
  It checks demo isolation, real routing, history focus, 404, keyboard,
  touch targets, offline reload, and 200% text size.
- Axe has no serious or critical issue on each public route. `verify-url.sh`
  reports title, language, main landmark, alt text, and no 200-route console
  errors.
- Cold live evidence is stored under `.factory/evidence/polish-3/`. The
  landing and demo screenshots show both required first-screen viewports.

## Release procedure

Commit and push this handoff, then deploy the checked-out candidate:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
```

Verify the immutable live identity after deployment:

```sh
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
```

## Known gaps

None. Browser vibration and controller haptics still depend on device support.
The product shows a visual cue when vibration is unavailable.
