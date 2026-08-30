# Independent verification 20 — FAIL

- **Candidate/source commit:** `cc3cfc785f371a2e17672d5b00833e13d4b10226`
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Verification date:** 2026-08-30 UTC

## Decision

**FAIL.** The deployed build reports the candidate SHA but fails the smallest useful product in fresh browser evidence: a host and a fresh 390 px companion do not reliably establish the live relay. The deployment has three ready process-local replicas, invalidating the required room, WebSocket, and rate-limit topology.

## Mandatory preliminary checks

### Claims manifest and commands

`.factory/claims.json` exists with 16 claims. After `npm ci` in this checkout (59 packages, 0 audit vulnerabilities), every manifest command was run exactly as declared. Browser commands build and start the local production demo entry point.

| Claim | Exact command | Result |
| --- | --- | --- |
| `demo-sandbox` | `npm run test:browser -- --grep @claim:demo-sandbox` | PASS — desktop and mobile seeded sample starts, completes, resets, and writes no storage/API data. |
| `sample-duration` | `npm run test:browser -- --grep @claim:sample-duration` | PASS — 12-second sample measured on both projects. |
| `local-audio` | `npm run test:browser -- --grep @claim:local-audio` | PASS — marked local audio bytes were not sent. |
| `no-third-party` | `npm run test:browser -- --grep @claim:no-third-party` | PASS — same-origin requests only. |
| `no-account` | `npm run test:browser -- --grep @claim:no-account` | PASS — no sign-in step. |
| `free-use` | `npm run test:browser -- --grep @claim:free-use` | PASS — no payment gate. |
| `shared-score` | `npm run test:browser -- --grep @claim:shared-score` | PASS locally — host/companion relay a cue, return one tap, and equalize score. |
| `live-relay` | `RELAY_ROUNDS=30 npm run test:live-relay` | **FAIL** — 10 s timeout waiting for a companion to connect (`verify-live-relay.mjs:72`). |
| `ephemeral-rooms` | `cargo test claim_ephemeral_rooms_evict_after_the_configured_ttl_and_on_restart` | PASS — TTL eviction and fresh-process boundary. |
| `rate-limit` | `RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit` | PASS — each identity 40 × 200 then 5 × 429; `Retry-After: 1`. |
| `health` | `npm run test:browser -- --grep @claim:health` | PASS — health returns build identity. |
| `connection-required` | `npm run test:browser -- --grep @claim:connection-required` | PASS — offline recovery guidance. |
| `visual-cue` | `npm run test:browser -- --grep @claim:visual-cue` | PASS — fallback visual cue. |
| `haptic-output` | `npm run test:browser -- --grep @claim:haptic-output` | PASS — `vibrate(45)` and dual-rumble stub observed. |
| `real-round-duration` | `npm run test:browser -- --grep @claim:real-round-duration` | PASS — browser result recorded passed after active-at-59s/completion-at-60s assertion. |
| `singleton-deployment` | `npm run test:live-topology` | **FAIL** — expected `http` ingress, observed `auto`. |

Any failed manifest claim is release-blocking. The two failed live claims independently require a FAIL.

### First-read test — PASS

A cold 1440 × 900 live visit presents **“Send every beat to a friend”**, says it is for **“friends and rhythm-game makers”** needing tactile cues and shared timing, and shows **“Try it with sample data”** with **“A paired sample round opens now.”** One click opens the sample and its persistent **“Demo — sample data, nothing is saved”** banner with Reset demo and Create a real room. The 390 × 844 landing view has no horizontal overflow and retains the headline, audience, primary action, and three facts in its first viewport.

## Local quality and functional evidence

- `npm test`: PASS — 3 Vitest tests; release/deployment contract tests; 10 Rust tests; clean-entry test; 38 Playwright tests (including expected project skips).
- `npm run build`: PASS — TypeScript check plus Vite production output. Built JS is 24,303 bytes raw / 8,170 bytes gzip and CSS 17,418 / 4,560; both are below budget.
- `cargo fmt --all -- --check`, `cargo clippy --all-targets --all-features --locked -- -D warnings`, and `cargo build --release`: PASS.
- API boundary coverage passed locally in the suite: normal create/join, exact 40-request allowance, malformed code, expired/restarted process state, role/message validation, and isolated-process regression. A live invalid join returned 400 with “The code needs six letters and numbers”; unopened `ZZZZZZ` returned a recoverable 404.
- Docker is unavailable in this verifier image (`docker: command not found`), so container execution was not possible. The release binary built and the live backend was independently checked.

## Live deployment, privacy, PWA, accessibility, and HTTP

`GET /health` returned the candidate identity exactly:

```json
{"build_sha":"cc3cfc785f371a2e17672d5b00833e13d4b10226","status":"ok"}
```

Read-only Azure queries found one active generic revision, but `minReplicas: 1`, `maxReplicas: 3`, ingress `Auto`, and **three** Running/Ready replicas. Its image is `sociobotregistry.azurecr.io/sf-haptic-beat-relay:cc3cfc785f37`, not the required full candidate tag; revision is `sf-haptic-beat-relay--0000026`, not SHA-derived. This is sufficient to split the intentionally process-local room map.

A fresh live demo request log contained only the live origin’s document, self-hosted hashed JS/CSS, and favicon. There were no third-party or API calls during demo start, no console/page errors, and Axe returned zero serious/critical findings. Response headers include self-only CSP with `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`; HTML/SW are `no-cache`, hashed assets are immutable for one year, and the 720px mobile hero is 26,186 bytes.

The PWA registered and controlled after reload; offline reload of `?demo=1` succeeded and `registration.update()` completed with no waiting/installing worker. There is no sign-in, so Entra tenant checking does not apply.

## Defects by severity

| Severity | Finding | Evidence and required resolution |
| --- | --- | --- |
| P0 | Core live host-to-friend relay is unreliable. | The exact 30-round manifest test times out waiting for companion connection. Restore a topology where every room operation and WebSocket upgrade hits the same state holder, then rerun the exact live claim. |
| P0 | Deployment violates singleton/process-local state contract. | Live ingress is Auto, max replicas is 3, and three replicas are ready; full immutable image/revision provenance also differs. Deploy the final commit using the guarded release path or an equivalent configuration enforcing HTTP ingress and exactly one replica, then rerun topology and relay checks. |
| P2 | Container image execution was not independently exercised. | Docker is absent in the verifier environment. Run the documented Docker build/run gate in an environment with Docker before release, after resolving the P0s. |

No product code was modified during verification.
