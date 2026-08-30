# Haptic Beat Relay — repair handoff

## Status: ready for the guarded container release

- **Work order:** `haptic-beat-relay-repair-19`
- **Release class:** web with backend; Rust/axum serves the Vite build on
  `PORT` (default `8080`).
- **Live URL:** <https://haptic-beat-relay.sociobot.in>
- **Deployment configuration:** [deploy/containerapp.json](../deploy/containerapp.json)

## Repair

Independent verification 20 found the live app running the factory's generic
container settings: Auto ingress and one to three replicas. The relay keeps
rooms, WebSocket broadcasts, and rate-limit buckets in deliberately ephemeral
process memory, so a host and friend could reach different processes.

The guarded deploy path now reads the committed deployment configuration rather
than duplicating its values. It refuses any configuration other than Single
revision mode, HTTP ingress, and exactly one replica. It builds an immutable
full-SHA image, applies a SHA-derived revision suffix, waits for one running
and ready replica, then proves the live identity, topology, 30 fresh
create/join/WebSocket/tap/score pairs, and five independent rate-limit bursts.
It repeats the topology/identity check after a reconciliation window.

This is the required release command; do not use a generic container rollout:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
```

## Regression coverage

- `scripts/verify-release-contract.mjs` proves the deploy command consumes
  `deploy/containerapp.json`, cannot drift to a hard-coded app target, requires
  the immutable image/revision provenance, and has two live topology gates.
- `scripts/verify-deploy-containerapp.mjs` runs the deploy script against a
  fake Azure CLI. It covers configuration-driven singleton rollout, Auto/three
  replica rejection, an unready replica, stale/unpushed/dirty candidates, and
  a late generic replacement after the functional gates.
- `scripts/verify-live-topology.mjs` reads the same deployment configuration
  and rejects Auto ingress, non-single scale, a non-SHA image, a generic
  revision suffix, additional active revisions, or anything other than one
  ready replica.
- `scripts/verify-live-relay.mjs` is the verifier's exact P0 check: 30 fresh
  API create→join pairs and 30 fresh desktop-host/390 px companion WebSocket
  rounds with a returned tap and shared score.

## Verification

Clean-install baseline in this worker:

```text
npm ci                                      PASS (59 packages, 0 vulnerabilities)
npm test                                    PASS
  3 Vitest, release/deployment contracts, 10 Rust tests,
  clean browser entrypoint, and 38 Playwright tests
```

The repair-specific checks also pass:

```text
sh -n scripts/deploy-containerapp.sh        PASS
node scripts/verify-release-contract.mjs    PASS
node scripts/verify-deploy-containerapp.mjs PASS
git diff --check                            PASS
```

The final release command above is deliberately also the container execution
gate: ACR builds the Dockerfile and Azure starts the immutable image before
the live topology, relay, and rate-limit checks run. Docker/Podman is not
installed in this worker, so a local `docker run` cannot be performed here.

Browser coverage includes desktop Chromium and a 390 px mobile viewport,
keyboard navigation, 200% text, no-overflow checks, offline demo reload,
privacy request logging, service-worker update, and Axe serious/critical
scans. The product has no account flow, payment flow, or external identity
integration.

## Known limits

- Phone and controller vibration depend on browser and hardware support; the
  visual cue remains available.
- Rooms and rate-limit state intentionally disappear when the singleton
  process restarts or after two hours. That is the documented privacy model.
