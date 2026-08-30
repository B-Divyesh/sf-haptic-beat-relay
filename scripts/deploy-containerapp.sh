#!/usr/bin/env sh
# Deploy the relay with durable SQLite and the one-process contract required
# by its live WebSocket broadcast channels. The post-deploy checks are
# deliberate: a desired setting in source does not make the public runtime
# coherent unless Azure has applied it to the live revision.
set -eu

config_file="deploy/containerapp.json"
if [ ! -f "$config_file" ]; then
  echo "Missing relay deployment configuration: $config_file" >&2
  exit 2
fi

# The generic container helper can restore Auto ingress, a 1–3 replica range,
# and no data mount. Read the committed product configuration here so the only
# supported deploy command has one source of truth for topology and storage.
config_values="$(node -e '
const fs = require("node:fs");
const config = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const values = [
  config.resourceGroup,
  config.containerApp,
  config.registry,
  config.imageRepository,
  config.activeRevisionsMode,
  config.ingress && config.ingress.transport,
  config.scale && config.scale.minReplicas,
  config.scale && config.scale.maxReplicas,
  config.dataDir,
  config.storage && config.storage.volumeName,
  config.storage && config.storage.storageName,
  config.storage && config.storage.storageType,
  config.storage && config.storage.mountPath,
];
if (values.some((value) => !["string", "number"].includes(typeof value))) process.exit(2);
process.stdout.write(values.join("\n"));
' "$config_file")" || {
  echo "Could not read a complete relay deployment configuration from $config_file" >&2
  exit 2
}

{
  IFS= read -r resource_group
  IFS= read -r container_app
  IFS= read -r registry
  IFS= read -r image_repository
  IFS= read -r active_revisions_mode
  IFS= read -r ingress_transport
  IFS= read -r min_replicas
  IFS= read -r max_replicas
  IFS= read -r data_dir
  IFS= read -r volume_name
  IFS= read -r storage_name
  IFS= read -r storage_type
  IFS= read -r mount_path
} <<EOF
$config_values
EOF

if [ "$active_revisions_mode" != "Single" ] || [ "$ingress_transport" != "http" ] || [ "$min_replicas" != "1" ] || [ "$max_replicas" != "1" ] || [ "$data_dir" != "/data" ] || [ "$mount_path" != "$data_dir" ] || [ "$storage_type" != "AzureFile" ]; then
  echo "Relay deployment configuration must require Single revisions, HTTP ingress, exactly one replica, and its Azure Files volume at /data." >&2
  exit 2
fi

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
  --registry "$registry" \
  --image "$image_repository:$revision" \
  --build-arg "BUILD_SHA=$revision" \
  .

# SQLite keeps temporary rooms and rate buckets on durable storage. WebSocket
# subscribers still live in one process, so make the singleton boundary
# explicit before creating the revision.
az containerapp revision set-mode \
  --resource-group "$resource_group" \
  --name "$container_app" \
  --mode single

deployment_temp="$(mktemp -d)"
trap 'rm -rf "$deployment_temp"' EXIT HUP INT TERM
current_app="$deployment_temp/current-app.json"
rendered_app="$deployment_temp/rendered-app.json"

az containerapp show \
  --resource-group "$resource_group" \
  --name "$container_app" \
  --output json > "$current_app"

node -e '
const fs = require("node:fs");
const [input, output, appName, image, suffix, min, max, volumeName, storageName, storageType, mountPath] = process.argv.slice(1);
const app = JSON.parse(fs.readFileSync(input, "utf8"));
if (app.name !== appName || !app.properties?.template?.containers || app.properties.template.containers.length !== 1) process.exit(2);
const template = app.properties.template;
const container = template.containers[0];
container.image = image;
container.volumeMounts = (container.volumeMounts || []).filter((mount) => mount.volumeName !== volumeName && mount.mountPath !== mountPath);
container.volumeMounts.push({ volumeName, mountPath });
template.volumes = (template.volumes || []).filter((volume) => volume.name !== volumeName);
template.volumes.push({ name: volumeName, storageName, storageType });
template.scale = { ...(template.scale || {}), minReplicas: Number(min), maxReplicas: Number(max) };
template.revisionSuffix = suffix;
fs.writeFileSync(output, JSON.stringify(app));
' "$current_app" "$rendered_app" "$container_app" "$registry.azurecr.io/$image_repository:$revision" "r$short_revision" "$min_replicas" "$max_replicas" "$volume_name" "$storage_name" "$storage_type" "$mount_path"

az containerapp update \
  --resource-group "$resource_group" \
  --name "$container_app" \
  --yaml "$rendered_app"

# `containerapp update` creates the revision and can restore the platform
# ingress default. Apply HTTP *after* that rollout so the configuration that
# routes the new revision is the one we subsequently inspect. This matters for
# this relay because a WebSocket upgrade and its room API calls must reach the
# same single process.
az containerapp ingress update \
  --resource-group "$resource_group" \
  --name "$container_app" \
  --transport "$ingress_transport"

actual_mode="$(az containerapp show --resource-group "$resource_group" --name "$container_app" --query 'properties.configuration.activeRevisionsMode' --output tsv)"
actual_min="$(az containerapp show --resource-group "$resource_group" --name "$container_app" --query 'properties.template.scale.minReplicas' --output tsv)"
actual_max="$(az containerapp show --resource-group "$resource_group" --name "$container_app" --query 'properties.template.scale.maxReplicas' --output tsv)"
actual_transport="$(az containerapp show --resource-group "$resource_group" --name "$container_app" --query 'properties.configuration.ingress.transport' --output tsv | tr '[:upper:]' '[:lower:]')"
actual_volume="$(az containerapp show --resource-group "$resource_group" --name "$container_app" --query "properties.template.volumes[?name == '$volume_name' && storageName == '$storage_name' && storageType == '$storage_type'] | length(@)" --output tsv)"
actual_mount="$(az containerapp show --resource-group "$resource_group" --name "$container_app" --query "properties.template.containers[0].volumeMounts[?volumeName == '$volume_name' && mountPath == '$mount_path'] | length(@)" --output tsv)"
active_revisions=0
active_revision=""
running_replicas=0
ready_replicas=0
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24; do
  active_revisions="$(az containerapp revision list --resource-group "$resource_group" --name "$container_app" --query 'length([?properties.active])' --output tsv)"
  active_revision="$(az containerapp revision list --resource-group "$resource_group" --name "$container_app" --query '[?properties.active && properties.trafficWeight == `100`].name | [0]' --output tsv)"
  if [ "$active_revisions" = "1" ] && [ -n "$active_revision" ]; then
    running_replicas="$(az containerapp replica list --resource-group "$resource_group" --name "$container_app" --revision "$active_revision" --query 'length([?properties.runningState == `Running`])' --output tsv)"
    ready_replicas="$(az containerapp replica list --resource-group "$resource_group" --name "$container_app" --revision "$active_revision" --query 'length([?properties.runningState == `Running` && properties.containers[0].ready == `true`])' --output tsv)"
    [ "$running_replicas" = "1" ] && [ "$ready_replicas" = "1" ] && break
  fi
  sleep 5
done

active_min="$(az containerapp revision show --resource-group "$resource_group" --name "$container_app" --revision "$active_revision" --query 'properties.template.scale.minReplicas' --output tsv)"
active_max="$(az containerapp revision show --resource-group "$resource_group" --name "$container_app" --revision "$active_revision" --query 'properties.template.scale.maxReplicas' --output tsv)"
active_volume="$(az containerapp revision show --resource-group "$resource_group" --name "$container_app" --revision "$active_revision" --query "properties.template.volumes[?name == '$volume_name' && storageName == '$storage_name' && storageType == '$storage_type'] | length(@)" --output tsv)"
active_mount="$(az containerapp revision show --resource-group "$resource_group" --name "$container_app" --revision "$active_revision" --query "properties.template.containers[0].volumeMounts[?volumeName == '$volume_name' && mountPath == '$mount_path'] | length(@)" --output tsv)"

if [ "$actual_mode" != "$active_revisions_mode" ] || [ "$actual_min" != "$min_replicas" ] || [ "$actual_max" != "$max_replicas" ] || [ "$actual_transport" != "$ingress_transport" ] || [ "$actual_volume" != "1" ] || [ "$actual_mount" != "1" ] || [ "$active_revisions" != "1" ] || [ -z "$active_revision" ] || [ "$active_min" != "$min_replicas" ] || [ "$active_max" != "$max_replicas" ] || [ "$active_volume" != "1" ] || [ "$active_mount" != "1" ] || [ "$running_replicas" != "1" ] || [ "$ready_replicas" != "1" ]; then
  echo "Relay deployment contract was not applied: mode=$actual_mode min=$actual_min max=$actual_max transport=$actual_transport data_volume=$actual_volume data_mount=$actual_mount active_revisions=$active_revisions active_revision=${active_revision:-none} active_min=${active_min:-none} active_max=${active_max:-none} active_volume=$active_volume active_mount=$active_mount running_replicas=$running_replicas ready_replicas=$ready_replicas" >&2
  exit 1
fi

echo "Relay deployment contract verified: revision=$active_revision, one active, running, and ready replica, HTTP ingress, and durable /data mount."

# Azure's resource view proves the topology. The live checks then prove that
# independently routed HTTP create/join calls and WebSocket upgrades actually
# share that one process before this deployment is accepted.
RELAY_EXPECTED_SHA="$revision" npm run test:live-topology
RELAY_ROUNDS="${RELAY_ROUNDS:-30}" npm run test:live-relay
RELAY_RATE_REPETITIONS="${RELAY_RATE_REPETITIONS:-5}" npm run test:live-rate-limit

# A release is not stable if another controller replaces the guarded revision
# as soon as the functional checks finish. Verification 18 found exactly that:
# the prior release passed here, then a generic work-order rollout restored
# Auto ingress and a 1-3 replica range. Leave a short reconciliation window and
# make topology plus immutable build identity the final success gate.
stability_seconds="${RELAY_DEPLOY_STABILITY_SECONDS:-60}"
case "$stability_seconds" in
  *[!0-9]* | '')
    echo "RELAY_DEPLOY_STABILITY_SECONDS must be a non-negative integer, got: $stability_seconds" >&2
    exit 2
    ;;
esac
if [ "$stability_seconds" -gt 0 ]; then
  echo "Waiting ${stability_seconds}s before the final deployment stability check."
  sleep "$stability_seconds"
fi
RELAY_EXPECTED_SHA="$revision" npm run test:live-topology
