# Haptic Beat Relay — verification 9 handoff

## Status: FAIL — release blocked

**Tested commit:** `6eef0fca6ef691c396335cd7d292126037ca4eb3`
**Live URL:** <https://haptic-beat-relay.sociobot.in>
**Verified:** 2026-08-29 UTC

The deployed health endpoint and static assets match the candidate. The live core relay does not work reliably: ten fresh room creates each returned a `404` on the immediately following companion join, and fresh `/host` pages logged WebSocket handshake `404`s. The mandatory `singleton-deployment` claim also fails because live ingress is `auto`, not required `http`.

This backend keeps rooms, WebSocket broadcast channels, and rate state in process memory. Restore and verify the actual one-process deployment boundary (or move that state to shared infrastructure) before release.

Full evidence, all claim results, quality-gate results, headers, privacy/accessibility checks, and required retest commands are in [verification-9.md](verification-9.md).

## Verification summary

- Passed: clean install; `npm test`; `npm run build`; Rust format, clippy, and release build; all listed claims except `singleton-deployment`; live 40-request allowance followed by 5 `429` with `Retry-After: 1`; Axe serious/critical scans; desktop/390 px, keyboard, reduced-motion, privacy, headers, PWA offline check.
- Failed: `npm run test:live-topology`; `npm run test:live-relay`; independent production create/join flow.
- Environment gap: Docker is unavailable in this verifier container, so the local image build/run was not executed.

## Retest

```sh
npm ci
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
npm run test:live-topology
npm run test:live-rate-limit
RELAY_ROUNDS=30 npm run test:live-relay
```
