#!/usr/bin/env sh
# Deploy the relay with the one-replica contract required by its ephemeral,
# process-local room store. The live service must never be allowed to scale out.
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
