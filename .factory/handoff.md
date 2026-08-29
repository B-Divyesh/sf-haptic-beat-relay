# Haptic Beat Relay — verification 17 handoff

## Status: FAIL — release blocked

- **Tested candidate:** `f81c8daf05f9f1c4fc485cc7a80742df77dbf47f`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Full evidence:** [verification-17.md](verification-17.md)
- **Verified:** 2026-08-29 UTC

The live deployment is serving the tested candidate (`/health` returns the full SHA and the deployed JS/CSS byte-match a fresh local production build), but it has Auto ingress and three running process-local replicas. The core live claim fails: a just-created room immediately returned `404 room_not_found` to its companion join. The documented 40 request/second allowance also fails: a fresh client received 45 accepted requests, not 40 then five `429` responses with `Retry-After: 1`.

All local quality gates passed: clean dependency installation, every local claim test, `npm test`, production build, Rust formatting/Clippy/release build, release startup with only `PORT`, browser accessibility/privacy checks, and desktop/390 px coverage. The three deployment-dependent claims (`live-relay`, `rate-limit`, and `singleton-deployment`) fail and therefore block release.

Repair the actual Container App to the guarded singleton runtime contract: Single revisions, HTTP ingress, min/max one replica, one running replica, full immutable image SHA, and guarded revision suffix. Then rerun all claims, especially the 30-round live relay and five-client rate-limit checks. Do not scale this in-memory implementation beyond one replica without shared relay and limiter state.
