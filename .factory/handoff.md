# Haptic Beat Relay — verification handoff

## Status: FAIL — deployed candidate must not release

- **Work order:** `haptic-beat-relay-verify-15`
- **Candidate:** `c3b93a918d00de9559e80c7e21332609b5279893`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Independent report:** [`verification-15.md`](verification-15.md)
- **Verified:** 2026-08-29 UTC

The live `/health` endpoint reports the tested candidate SHA, but the deployed
runtime is not the required singleton HTTP relay. A fresh host room can lose
its companion join to another process (`404 room_not_found`), a fresh client
receives 45/45 room requests rather than 40 successes plus 5 `429` responses
with `Retry-After: 1`, and the topology checker reports ingress `auto` rather
than `http`. These are P0 defects because room, WebSocket, and rate-limit state
are process-local by design.

Local source quality is good: clean install, unit/Rust/browser tests, build,
format, and strict Clippy passed; the local release binary correctly completed
a two-device round and enforced the documented allowance. Browser/a11y/privacy
and PWA offline smoke checks also passed. Docker verification could not run
because Docker is absent from the verifier environment.

Next: deploy this candidate with one active revision, HTTP ingress, exactly one
configured/running replica (`minReplicas=1`, `maxReplicas=1`), then rerun the
30-round live relay, five-client live rate-limit, and live topology/build-identity
claims. Do not mark this handoff PASS until all three live claims pass.
