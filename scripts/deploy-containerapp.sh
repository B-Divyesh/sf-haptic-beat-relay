#!/usr/bin/env sh
# Deploy the relay with the one-process contract required by its ephemeral,
# process-local room store. The post-deploy checks are deliberate: a desired
# setting in source does not make separately routed HTTP and WebSocket traffic
# coherent unless Azure has applied it to the live revision.
set -eu

revision="${1:-$(git rev-parse --verify HEAD)}"
case "$revision" in
  *[!0123456789abcdef]* | '')
    echo "Expected a lowercase hexadecimal Git revision, got: $revision" >&2
    exit 2
    ;;
esac

az acr build \
  --registry sociobotregistry \
  --image "sf-haptic-beat-relay:$revision" \
  --build-arg "BUILD_SHA=$revision" \
  .

az containerapp update \
  --resource-group sociobot \
  --name sf-haptic-beat-relay \
  --image "sociobotregistry.azurecr.io/sf-haptic-beat-relay:$revision" \
  --min-replicas 1 \
  --max-replicas 1

# WebSocket upgrades use HTTP/1.1. Pinning the ingress transport avoids an
# implicit protocol choice while the single process owns the room map.
az containerapp ingress update \
  --resource-group sociobot \
  --name sf-haptic-beat-relay \
  --transport http

actual_mode="$(az containerapp show --resource-group sociobot --name sf-haptic-beat-relay --query 'properties.configuration.activeRevisionsMode' --output tsv)"
actual_min="$(az containerapp show --resource-group sociobot --name sf-haptic-beat-relay --query 'properties.template.scale.minReplicas' --output tsv)"
actual_max="$(az containerapp show --resource-group sociobot --name sf-haptic-beat-relay --query 'properties.template.scale.maxReplicas' --output tsv)"
actual_transport="$(az containerapp show --resource-group sociobot --name sf-haptic-beat-relay --query 'properties.configuration.ingress.transport' --output tsv | tr '[:upper:]' '[:lower:]')"
active_revisions=0
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
  active_revisions="$(az containerapp revision list --resource-group sociobot --name sf-haptic-beat-relay --query 'length([?properties.active])' --output tsv)"
  [ "$active_revisions" = "1" ] && break
  sleep 5
done

if [ "$actual_mode" != "Single" ] || [ "$actual_min" != "1" ] || [ "$actual_max" != "1" ] || [ "$actual_transport" != "http" ] || [ "$active_revisions" != "1" ]; then
  echo "Relay deployment contract was not applied: mode=$actual_mode min=$actual_min max=$actual_max transport=$actual_transport active_revisions=$active_revisions" >&2
  exit 1
fi

echo "Relay deployment contract verified: one active revision, one replica, HTTP ingress."
