#!/usr/bin/env sh
# Deploy the relay with the one-process contract required by its ephemeral,
# process-local room store. The post-deploy checks are deliberate: a desired
# setting in source does not make separately routed HTTP and WebSocket traffic
# coherent unless Azure has applied it to the live revision.
set -eu

checked_out_revision="$(git rev-parse --verify HEAD)"
revision="${1:-$checked_out_revision}"
case "$revision" in
  *[!0123456789abcdef]* | '')
    echo "Expected a lowercase hexadecimal Git revision, got: $revision" >&2
    exit 2
    ;;
esac

# The build argument is also the identity asserted by /health. Refusing a
# different value keeps a mistyped or stale caller-provided SHA from producing
# an otherwise healthy deployment that can never satisfy the live identity
# gate.
if [ "$revision" != "$checked_out_revision" ]; then
  echo "Refusing to deploy $revision: it does not match checked-out HEAD $checked_out_revision" >&2
  exit 2
fi

# Deployment is the terminal release step. Verification 15 was caused by
# deploying an implementation commit, committing the handoff afterwards, and
# then sending that later candidate through the factory's generic 1-3 replica
# rollout. Require the final handoff, clean tree, and pushed upstream identity
# before Azure can be changed so the nominated commit is the guarded commit.
if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
  echo "Refusing to deploy a dirty worktree. Commit the final handoff and all release files first." >&2
  exit 2
fi

upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)"
if [ -z "$upstream" ]; then
  echo "Refusing to deploy without an upstream branch. Push the final release commit first." >&2
  exit 2
fi

upstream_revision="$(git rev-parse --verify '@{upstream}')"
if [ "$upstream_revision" != "$checked_out_revision" ]; then
  echo "Refusing to deploy unpushed HEAD $checked_out_revision: $upstream is at $upstream_revision" >&2
  exit 2
fi

handoff_revision="$(git log -1 --format=%H -- .factory/handoff.md)"
if [ "$handoff_revision" != "$checked_out_revision" ]; then
  echo "Refusing to deploy before .factory/handoff.md is finalized in HEAD." >&2
  exit 2
fi

short_revision="$(printf %.10s "$revision")"

az acr build \
  --registry sociobotregistry \
  --image "sf-haptic-beat-relay:$revision" \
  --build-arg "BUILD_SHA=$revision" \
  .

# This product intentionally keeps ephemeral rooms, authenticated WebSocket
# sessions, and the per-client limiter in one process. Make that runtime
# boundary explicit before creating the revision; source JSON alone cannot
# protect a deployment made through a different CLI path.
az containerapp revision set-mode \
  --resource-group sociobot \
  --name sf-haptic-beat-relay \
  --mode single

az containerapp update \
  --resource-group sociobot \
  --name sf-haptic-beat-relay \
  --image "sociobotregistry.azurecr.io/sf-haptic-beat-relay:$revision" \
  --revision-suffix "r$short_revision" \
  --min-replicas 1 \
  --max-replicas 1

# `containerapp update` creates the revision and can restore the platform
# ingress default. Apply HTTP *after* that rollout so the configuration that
# routes the new revision is the one we subsequently inspect. This matters for
# this relay because a WebSocket upgrade and its room API calls must reach the
# same single process.
az containerapp ingress update \
  --resource-group sociobot \
  --name sf-haptic-beat-relay \
  --transport http

actual_mode="$(az containerapp show --resource-group sociobot --name sf-haptic-beat-relay --query 'properties.configuration.activeRevisionsMode' --output tsv)"
actual_min="$(az containerapp show --resource-group sociobot --name sf-haptic-beat-relay --query 'properties.template.scale.minReplicas' --output tsv)"
actual_max="$(az containerapp show --resource-group sociobot --name sf-haptic-beat-relay --query 'properties.template.scale.maxReplicas' --output tsv)"
actual_transport="$(az containerapp show --resource-group sociobot --name sf-haptic-beat-relay --query 'properties.configuration.ingress.transport' --output tsv | tr '[:upper:]' '[:lower:]')"
active_revisions=0
active_revision=""
running_replicas=0
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24; do
  active_revisions="$(az containerapp revision list --resource-group sociobot --name sf-haptic-beat-relay --query 'length([?properties.active])' --output tsv)"
  active_revision="$(az containerapp revision list --resource-group sociobot --name sf-haptic-beat-relay --query '[?properties.active && properties.trafficWeight == `100`].name | [0]' --output tsv)"
  if [ "$active_revisions" = "1" ] && [ -n "$active_revision" ]; then
    running_replicas="$(az containerapp replica list --resource-group sociobot --name sf-haptic-beat-relay --revision "$active_revision" --query 'length([?properties.runningState == `Running`])' --output tsv)"
    [ "$running_replicas" = "1" ] && break
  fi
  sleep 5
done

active_min="$(az containerapp revision show --resource-group sociobot --name sf-haptic-beat-relay --revision "$active_revision" --query 'properties.template.scale.minReplicas' --output tsv)"
active_max="$(az containerapp revision show --resource-group sociobot --name sf-haptic-beat-relay --revision "$active_revision" --query 'properties.template.scale.maxReplicas' --output tsv)"

if [ "$actual_mode" != "Single" ] || [ "$actual_min" != "1" ] || [ "$actual_max" != "1" ] || [ "$actual_transport" != "http" ] || [ "$active_revisions" != "1" ] || [ -z "$active_revision" ] || [ "$active_min" != "1" ] || [ "$active_max" != "1" ] || [ "$running_replicas" != "1" ]; then
  echo "Relay deployment contract was not applied: mode=$actual_mode min=$actual_min max=$actual_max transport=$actual_transport active_revisions=$active_revisions active_revision=${active_revision:-none} active_min=${active_min:-none} active_max=${active_max:-none} running_replicas=$running_replicas" >&2
  exit 1
fi

echo "Relay deployment contract verified: revision=$active_revision, one active/running replica, HTTP ingress."

# Azure's resource view proves the topology. The live checks then prove that
# independently routed HTTP create/join calls and WebSocket upgrades actually
# share that one process before this deployment is accepted.
RELAY_EXPECTED_SHA="$revision" npm run test:live-topology
RELAY_ROUNDS="${RELAY_ROUNDS:-30}" npm run test:live-relay
RELAY_RATE_REPETITIONS="${RELAY_RATE_REPETITIONS:-5}" npm run test:live-rate-limit
