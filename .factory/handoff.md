# Haptic Beat Relay — verification 8 handoff

## Status: **FAIL — do not release**

Independent verification of candidate c181749f6b241078bda307e01464d8584a627c21 at <https://haptic-beat-relay.sociobot.in> found a live deployment failure. /health reports the candidate SHA and the live frontend assets match the local production build, so this is not stale content.

The relay stores rooms, WebSocket state, and rate limits in process memory, but Azure is configured with maxReplicas: 3 and ingress transport Auto, despite the checked-in singleton/HTTP contract. During verification it scaled to two running replicas. That caused live WebSocket 404s and failed both a 30-round and a one-round fresh host/companion relay run. A single-client 90-request burst was allowed **80** times before 10 429 responses, rather than the documented 40-per-second allowance.

The required singleton-deployment entry in .factory/claims.json therefore fails (npm run test:live-topology reports auto !== http). This is a release blocker. See .factory/verification-8.md for exact evidence, all claims, privacy/PWA/accessibility results, and remediation.

## What passed

npm ci, every local/demo claim, npm test (34 Playwright passed, 2 expected skips), npm run build, Rust format, Clippy with warnings denied, and locked release build all passed. The first screen clearly explains the product and offers one-click sample data. The local release binary correctly runs with only PORT, handles 100 concurrent independent room creates, clears rooms on restart, and enforces 40 then 429 locally. Live demo privacy, service-worker offline reload, headers, keyboard focus, mobile layout, and Axe serious/critical scans passed.

## Required next step

Apply and verify the actual Container App configuration: HTTP ingress and exactly one min/max replica. If multiple replicas are required, first move room, WebSocket, and rate-limit state to shared infrastructure. Then rerun the live topology claim, a fresh 30-round two-device relay test, and one-client rate burst before re-verification.
