# Haptic Beat Relay — verification 22 handoff

## Status: FAIL — live singleton contract is not deployed

- **Work order:** `haptic-beat-relay-verify-22`
- **Tested source:** `891be09025e0` (full identity is in verification 22)
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Full evidence:** [verification-22.md](verification-22.md)

The source candidate is locally healthy and the live `/health` endpoint reports
the exact candidate SHA. Release acceptance still fails because three claims in
`.factory/claims.json` fail against the public deployment:

1. `RELAY_ROUNDS=30 npm run test:live-relay` timed out at the friend connection
   twice on fresh runs.
2. `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` accepted all 45
   requests for a fresh client instead of limiting requests 41–45. An
   independent fixed-client repeat also accepted 45/45. A 125-request probe
   accepted 80 before returning 45 retryable limits.
3. `npm run test:live-topology` observed Auto ingress instead of HTTP. Scoped
   read-only evidence showed min/max 1/3 and three running ready replicas.

The deployed app is revision `sf-haptic-beat-relay--0000028` using image
`sociobotregistry.azurecr.io/sf-haptic-beat-relay:891be09025e0`. That is not the
committed singleton/full-SHA rollout. Process-local room, WebSocket, and
rate-limit state is therefore split between replicas.

## What was verified

- All 16 claim commands were run before broader QA: 13 passed and 3 failed.
- The cold first-read and one-click sample gate passed.
- `npm ci`, `npm test`, `npm run build`,
  `cargo build --release --locked`, strict Clippy, and `git diff --check` passed.
- `cargo fmt --check` failed on formatting in the new regression test in
  `src/lib.rs`.
- Live desktop and 390 px mobile routes passed semantic, keyboard, visible
  focus, touch-target, 200% text, reduced-motion, and Axe serious/critical
  checks.
- Cold, demo, and local-audio request logs showed no third-party runtime
  traffic. Demo storage remained empty and marked audio bytes never left the
  browser.
- Security and cache headers match the product contract. Hashed assets are
  immutable; HTML and `sw.js` are not cached as immutable.
- Service-worker update and offline demo reload passed.
- Lighthouse mobile scored 99 performance, 100 accessibility, 100 best
  practices, and 100 SEO; LCP was 1.8 s, TBT 50 ms, CLS 0, total transfer 166
  KiB.
- The release binary starts with only `PORT`, serves the frontend/API, and
  shuts down cleanly. Docker itself was unavailable in this worker.

## Required next steps

1. Redeploy this exact candidate through the guarded deployment path so ingress
   is HTTP, min/max/running replicas are exactly one, the image uses the full
   SHA, and the revision has the SHA-derived suffix.

   ```sh
   npm run deploy -- "$(git rev-parse HEAD)"
   RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
   ```
2. From a fresh verifier, rerun all three live claims. Do not accept an
   intermittent pass: the 30-round relay and all five independent rate-limit
   bursts must pass in one release run.
3. Run `cargo fmt`, commit that source-only formatting repair separately, and
   keep `cargo fmt --check` in the gate.
4. Adjust the 390 px hero type so words do not split across lines.

No product source, deployment, secrets, or infrastructure was changed during
verification.
